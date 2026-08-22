import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { drawingSchema, checklistSchema, bomLineSchema, ecnSchema, ecnApprovalSchema, designInputSheetSchema, designInputSheetStatusSchema, designCalculationSchema } from '../validation/schemas.js';
import { CHECKLIST_ITEMS } from '../config/designChecklist.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

async function nextNumber(client, table, column, prefix) {
  const { rows } = await client.query(`SELECT ${column} FROM ${table} ORDER BY id DESC LIMIT 1`);
  const lastSeq = rows.length ? Number(rows[0][column].split('-').pop()) : 0;
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(lastSeq + 1).padStart(4, '0')}`;
}

// Design team sees every status including drafts; everyone else (Purchase, Production, etc.)
// only sees Released drawings/BOMs (Requirements-Design.md §11 AC5)
const DESIGN_TEAM_ROLES = [ROLES.DESIGN_ENGINEER, ROLES.CHECKER, ROLES.DESIGN_HEAD, ROLES.ADMIN];

router.get('/', asyncHandler(async (req, res) => {
  const restricted = !DESIGN_TEAM_ROLES.includes(req.user.role);
  const { rows } = await pool.query(
    restricted
      ? `SELECT * FROM drawings WHERE status = 'RELEASED' ORDER BY created_at DESC`
      : `SELECT * FROM drawings ORDER BY created_at DESC`
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const restricted = !DESIGN_TEAM_ROLES.includes(req.user.role);
  const { rows } = await pool.query(`SELECT * FROM drawings WHERE id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Drawing not found' });
  if (restricted && rows[0].status !== 'RELEASED') return res.status(404).json({ error: 'Drawing not found' });

  const { rows: bomLines } = await pool.query(`SELECT * FROM bom_lines WHERE drawing_id = $1 ORDER BY item_no`, [req.params.id]);
  const { rows: ecns } = await pool.query(`SELECT * FROM engineering_change_notices WHERE drawing_id = $1 ORDER BY created_at DESC`, [req.params.id]);
  const { rows: inputSheetRows } = await pool.query(
    `SELECT dis.*, d.drawing_number AS previous_reference_drawing_number
     FROM design_input_sheets dis
     LEFT JOIN drawings d ON d.id = dis.previous_reference_drawing_id
     WHERE dis.drawing_id = $1`,
    [req.params.id]
  );
  const { rows: calculations } = await pool.query(
    `SELECT * FROM design_calculations WHERE drawing_id = $1 ORDER BY created_at DESC`,
    [req.params.id]
  );
  const { rows: revisions } = await pool.query(
    `SELECT * FROM drawing_revisions WHERE drawing_id = $1 ORDER BY id`,
    [req.params.id]
  );
  res.json({ ...rows[0], bom_lines: bomLines, ecns, input_sheet: inputSheetRows[0] || null, calculations, revisions });
}));

// Step 3 of the Design pipeline (Requirements-Design.md §3) - the documented basis
// downstream Design Calculations must trace back to. One per drawing.
router.post('/:id/input-sheet', requireRole(ROLES.DESIGN_ENGINEER, ROLES.ADMIN), validate(designInputSheetSchema), asyncHandler(async (req, res) => {
  const { rows: drawingRows } = await pool.query(`SELECT id FROM drawings WHERE id = $1`, [req.params.id]);
  if (!drawingRows.length) return res.status(404).json({ error: 'Drawing not found' });

  const {
    customer_specification, process_data, applicable_standards, material_specification,
    corrosion_allowance, design_pressure, previous_reference_drawing_id, design_notes,
  } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO design_input_sheets
         (drawing_id, customer_specification, process_data, applicable_standards, material_specification,
          corrosion_allowance, design_pressure, previous_reference_drawing_id, design_notes, prepared_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.params.id, customer_specification || null, process_data || null, applicable_standards || null,
        material_specification || null, corrosion_allowance ?? null, design_pressure ?? null,
        previous_reference_drawing_id || null, design_notes || null, req.user.name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'This drawing already has a Design Input Sheet' });
    throw err;
  }
}));

router.patch('/:id/input-sheet', requireRole(ROLES.DESIGN_ENGINEER, ROLES.ADMIN), validate(designInputSheetSchema), asyncHandler(async (req, res) => {
  const {
    customer_specification, process_data, applicable_standards, material_specification,
    corrosion_allowance, design_pressure, previous_reference_drawing_id, design_notes,
  } = req.body;
  const { rows } = await pool.query(
    `UPDATE design_input_sheets SET
       customer_specification = $1, process_data = $2, applicable_standards = $3, material_specification = $4,
       corrosion_allowance = $5, design_pressure = $6, previous_reference_drawing_id = $7, design_notes = $8
     WHERE drawing_id = $9 AND status = 'DRAFT' RETURNING *`,
    [customer_specification || null, process_data || null, applicable_standards || null, material_specification || null,
      corrosion_allowance ?? null, design_pressure ?? null, previous_reference_drawing_id || null, design_notes || null, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Design Input Sheet not found or already Completed' });
  res.json(rows[0]);
}));

// AC1: cannot be marked Completed without Customer Specification and Applicable Standards
router.patch('/:id/input-sheet/status', requireRole(ROLES.DESIGN_ENGINEER, ROLES.ADMIN), validate(designInputSheetStatusSchema), asyncHandler(async (req, res) => {
  const { rows: sheetRows } = await pool.query(`SELECT * FROM design_input_sheets WHERE drawing_id = $1`, [req.params.id]);
  if (!sheetRows.length) return res.status(404).json({ error: 'Design Input Sheet not found' });
  const sheet = sheetRows[0];

  if (req.body.status === 'COMPLETED') {
    if (!sheet.customer_specification?.trim() || !sheet.applicable_standards?.trim()) {
      return res.status(400).json({ error: 'Customer Specification and Applicable Standards are required before marking Completed' });
    }
  }
  const { rows } = await pool.query(
    `UPDATE design_input_sheets SET status = $1 WHERE drawing_id = $2 RETURNING *`,
    [req.body.status, req.params.id]
  );
  res.json(rows[0]);
}));

// Step 4 of the Design pipeline - gated on a Completed Design Input Sheet
// (Requirements-Design.md §3: calculations follow design input collection)
router.post('/:id/calculations', requireRole(ROLES.DESIGN_ENGINEER, ROLES.ADMIN), validate(designCalculationSchema), asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: sheetRows } = await client.query(`SELECT status FROM design_input_sheets WHERE drawing_id = $1`, [req.params.id]);
    if (!sheetRows.length || sheetRows[0].status !== 'COMPLETED') {
      throw new Error('Design Input Sheet must be Completed before adding a Design Calculation');
    }

    const {
      calculation_date, formula_reference, safety_factor,
      load_calculation, shaft_calculation, bearing_calculation, motor_calculation, gearbox_calculation, remarks,
    } = req.body;
    const calculation_number = await nextNumber(client, 'design_calculations', 'calculation_number', 'CALC');
    const { rows } = await client.query(
      `INSERT INTO design_calculations
         (calculation_number, drawing_id, design_engineer, calculation_date, formula_reference, safety_factor,
          load_calculation, shaft_calculation, bearing_calculation, motor_calculation, gearbox_calculation, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [calculation_number, req.params.id, req.user.name, calculation_date || new Date(), formula_reference || null, safety_factor ?? null,
        load_calculation || null, shaft_calculation || null, bearing_calculation || null, motor_calculation || null, gearbox_calculation || null, remarks || null]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

router.post('/', requireRole(ROLES.DESIGN_ENGINEER, ROLES.ADMIN), validate(drawingSchema), asyncHandler(async (req, res, next) => {
  const { drawing_number, drawing_title, project_reference, equipment_name, scale, material, weight, requires_customer_approval, checker, design_head } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO drawings (drawing_number, drawing_title, project_reference, equipment_name, scale, material, weight, requires_customer_approval, prepared_by, checker, design_head)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [drawing_number, drawing_title, project_reference || null, equipment_name, scale || null, material || null,
        weight ?? null, requires_customer_approval ?? false, req.user.name, checker || null, design_head || null]
    );
    await client.query(
      `INSERT INTO drawing_revisions (drawing_id, revision_number, revision_description, prepared_by)
       VALUES ($1, $2, $3, $4)`,
      [rows[0].id, rows[0].revision, 'Initial release', req.user.name]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Drawing number already exists', fieldErrors: { drawing_number: 'Already in use' } });
    }
    next(err);
  } finally {
    client.release();
  }
}));

// BOM lines can be added while the drawing is still editable (before release)
router.post('/:id/bom-lines', requireRole(ROLES.DESIGN_ENGINEER, ROLES.ADMIN), validate(bomLineSchema), asyncHandler(async (req, res) => {
  const { rows: drawingRows } = await pool.query(`SELECT status FROM drawings WHERE id = $1`, [req.params.id]);
  if (!drawingRows.length) return res.status(404).json({ error: 'Drawing not found' });
  if (drawingRows[0].status === 'RELEASED') return res.status(400).json({ error: 'Cannot edit BOM on a released drawing' });

  const { item_no, part_number, description, material, quantity, unit, weight } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO bom_lines (drawing_id, item_no, part_number, description, material, quantity, unit, weight)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.params.id, item_no, part_number || null, description, material || null, quantity, unit || 'pcs', weight ?? null]
  );
  res.status(201).json(rows[0]);
}));

// Design Engineer submits for checking — Draft/Rework -> Under Checking
router.patch('/:id/submit-for-checking', requireRole(ROLES.DESIGN_ENGINEER, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE drawings SET status = 'UNDER_CHECKING'
     WHERE id = $1 AND status IN ('DRAFT', 'REWORK') RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Drawing not found or not in a submittable state' });
  res.json(rows[0]);
}));

// Checker must complete all 13 checklist items before approving; partial completion only allows Rework
// (Requirements-Design.md §11 AC3)
router.patch('/:id/checklist', requireRole(ROLES.CHECKER, ROLES.ADMIN), validate(checklistSchema), asyncHandler(async (req, res) => {
  const { checklist, checker_remarks, decision } = req.body;
  const allChecked = CHECKLIST_ITEMS.every((item) => checklist[item.key] === true);
  if (decision === 'APPROVE' && !allChecked) {
    return res.status(400).json({ error: 'All 13 checklist items must be checked before approving' });
  }
  const newStatus = decision === 'APPROVE' ? 'CHECKER_APPROVED' : 'REWORK';
  const { rows } = await pool.query(
    `UPDATE drawings SET checklist = $1, checker_remarks = $2, checker = $3, status = $4
     WHERE id = $5 AND status = 'UNDER_CHECKING' RETURNING *`,
    [JSON.stringify(checklist), checker_remarks || null, req.user.name, newStatus, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Drawing not found or not under checking' });
  if (decision === 'APPROVE') {
    await pool.query(
      `UPDATE drawing_revisions SET checked_by = $1
       WHERE id = (SELECT id FROM drawing_revisions WHERE drawing_id = $2 ORDER BY id DESC LIMIT 1)`,
      [req.user.name, req.params.id]
    );
  }
  res.json(rows[0]);
}));

// Design Head approves — routes to Customer Approval if required, otherwise ready for release directly
router.patch('/:id/design-head-approve', requireRole(ROLES.DESIGN_HEAD, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { rows: drawingRows } = await pool.query(`SELECT * FROM drawings WHERE id = $1`, [req.params.id]);
  if (!drawingRows.length) return res.status(404).json({ error: 'Drawing not found' });
  const drawing = drawingRows[0];
  if (drawing.status !== 'CHECKER_APPROVED') return res.status(400).json({ error: 'Drawing must be Checker Approved first' });

  const newStatus = drawing.requires_customer_approval ? 'AWAITING_CUSTOMER_APPROVAL' : 'DESIGN_HEAD_APPROVED';
  const { rows } = await pool.query(
    `UPDATE drawings SET status = $1, design_head = $2 WHERE id = $3 RETURNING *`,
    [newStatus, req.user.name, req.params.id]
  );
  await pool.query(
    `UPDATE drawing_revisions SET approved_by = $1
     WHERE id = (SELECT id FROM drawing_revisions WHERE drawing_id = $2 ORDER BY id DESC LIMIT 1)`,
    [req.user.name, req.params.id]
  );
  res.json(rows[0]);
}));

// Records customer sign-off (no customer portal in this POC — Design Head records it on the customer's behalf)
router.patch('/:id/customer-approve', requireRole(ROLES.DESIGN_HEAD, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE drawings SET status = 'CUSTOMER_APPROVED', customer_approved_by = $1, customer_approved_at = now()
     WHERE id = $2 AND status = 'AWAITING_CUSTOMER_APPROVAL' RETURNING *`,
    [req.user.name, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Drawing is not awaiting customer approval' });
  res.json(rows[0]);
}));

// Blocks release while Customer Approval is still pending, when required (Requirements-Design.md §11 AC4)
router.patch('/:id/release', requireRole(ROLES.DESIGN_HEAD, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE drawings SET status = 'RELEASED'
     WHERE id = $1 AND status IN ('DESIGN_HEAD_APPROVED', 'CUSTOMER_APPROVED') RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Drawing is not ready for release' });
  res.json(rows[0]);
}));

// ECN — can only be raised against an already-released drawing; approving creates a new revision (append-only)
router.post('/:id/ecns', requireRole(ROLES.DESIGN_HEAD, ROLES.ADMIN), validate(ecnSchema), asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: drawingRows } = await client.query(`SELECT * FROM drawings WHERE id = $1 FOR UPDATE`, [req.params.id]);
    if (!drawingRows.length) throw new Error('Drawing not found');
    if (drawingRows[0].status !== 'RELEASED') throw new Error('ECN can only be raised against a released drawing');

    const ecn_number = await nextNumber(client, 'engineering_change_notices', 'ecn_number', 'ECN');
    const { reason_for_change, requested_by, new_revision, remarks } = req.body;
    const { rows } = await client.query(
      `INSERT INTO engineering_change_notices (ecn_number, drawing_id, reason_for_change, requested_by, previous_revision, new_revision, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [ecn_number, req.params.id, reason_for_change, requested_by, drawingRows[0].revision, new_revision, remarks || null]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

router.patch('/:id/ecns/:ecnId/approve', requireRole(ROLES.DESIGN_HEAD, ROLES.ADMIN), validate(ecnApprovalSchema), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: ecnRows } = await client.query(
      `UPDATE engineering_change_notices SET status = $1, approved_by = $2, approved_at = now()
       WHERE id = $3 AND drawing_id = $4 AND status = 'PENDING' RETURNING *`,
      [status, req.user.name, req.params.ecnId, req.params.id]
    );
    if (!ecnRows.length) throw new Error('ECN not found or already actioned');

    if (status === 'APPROVED') {
      await client.query(`UPDATE drawings SET revision = $1 WHERE id = $2`, [ecnRows[0].new_revision, req.params.id]);
      await client.query(
        `INSERT INTO drawing_revisions (drawing_id, revision_number, revision_description, prepared_by, approved_by, ecn_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.params.id, ecnRows[0].new_revision, ecnRows[0].reason_for_change, ecnRows[0].requested_by, req.user.name, ecnRows[0].id]
      );
    }
    await client.query('COMMIT');
    res.json(ecnRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

export default router;
