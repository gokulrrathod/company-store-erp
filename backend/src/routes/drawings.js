import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { drawingSchema, checklistSchema, bomLineSchema, ecnSchema, ecnApprovalSchema } from '../validation/schemas.js';
import { CHECKLIST_ITEMS } from '../config/designChecklist.js';
import { ROLES } from '../config/auth.js';

const router = Router();
router.use(requireAuth);

async function nextNumber(client, table, column, prefix) {
  const { rows } = await client.query(`SELECT ${column} FROM ${table} ORDER BY id DESC LIMIT 1`);
  const lastSeq = rows.length ? Number(rows[0][column].split('-').pop()) : 0;
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(lastSeq + 1).padStart(4, '0')}`;
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM drawings ORDER BY created_at DESC`);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM drawings WHERE id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Drawing not found' });

  const { rows: bomLines } = await pool.query(`SELECT * FROM bom_lines WHERE drawing_id = $1 ORDER BY item_no`, [req.params.id]);
  const { rows: ecns } = await pool.query(`SELECT * FROM engineering_change_notices WHERE drawing_id = $1 ORDER BY created_at DESC`, [req.params.id]);
  res.json({ ...rows[0], bom_lines: bomLines, ecns });
});

router.post('/', requireRole(ROLES.DESIGN_ENGINEER, ROLES.ADMIN), validate(drawingSchema), async (req, res, next) => {
  const { drawing_number, drawing_title, project_reference, equipment_name, scale, material, weight, requires_customer_approval, checker, design_head } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO drawings (drawing_number, drawing_title, project_reference, equipment_name, scale, material, weight, requires_customer_approval, prepared_by, checker, design_head)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [drawing_number, drawing_title, project_reference || null, equipment_name, scale || null, material || null,
        weight ?? null, requires_customer_approval ?? false, req.user.name, checker || null, design_head || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Drawing number already exists', fieldErrors: { drawing_number: 'Already in use' } });
    }
    next(err);
  }
});

// BOM lines can be added while the drawing is still editable (before release)
router.post('/:id/bom-lines', requireRole(ROLES.DESIGN_ENGINEER, ROLES.ADMIN), validate(bomLineSchema), async (req, res) => {
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
});

// Design Engineer submits for checking — Draft/Rework -> Under Checking
router.patch('/:id/submit-for-checking', requireRole(ROLES.DESIGN_ENGINEER, ROLES.ADMIN), async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE drawings SET status = 'UNDER_CHECKING'
     WHERE id = $1 AND status IN ('DRAFT', 'REWORK') RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Drawing not found or not in a submittable state' });
  res.json(rows[0]);
});

// Checker must complete all 13 checklist items before approving; partial completion only allows Rework
// (Requirements-Design.md §11 AC3)
router.patch('/:id/checklist', requireRole(ROLES.CHECKER, ROLES.ADMIN), validate(checklistSchema), async (req, res) => {
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
  res.json(rows[0]);
});

// Design Head approves — routes to Customer Approval if required, otherwise ready for release directly
router.patch('/:id/design-head-approve', requireRole(ROLES.DESIGN_HEAD, ROLES.ADMIN), async (req, res) => {
  const { rows: drawingRows } = await pool.query(`SELECT * FROM drawings WHERE id = $1`, [req.params.id]);
  if (!drawingRows.length) return res.status(404).json({ error: 'Drawing not found' });
  const drawing = drawingRows[0];
  if (drawing.status !== 'CHECKER_APPROVED') return res.status(400).json({ error: 'Drawing must be Checker Approved first' });

  const newStatus = drawing.requires_customer_approval ? 'AWAITING_CUSTOMER_APPROVAL' : 'DESIGN_HEAD_APPROVED';
  const { rows } = await pool.query(
    `UPDATE drawings SET status = $1, design_head = $2 WHERE id = $3 RETURNING *`,
    [newStatus, req.user.name, req.params.id]
  );
  res.json(rows[0]);
});

// Records customer sign-off (no customer portal in this POC — Design Head records it on the customer's behalf)
router.patch('/:id/customer-approve', requireRole(ROLES.DESIGN_HEAD, ROLES.ADMIN), async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE drawings SET status = 'CUSTOMER_APPROVED', customer_approved_by = $1, customer_approved_at = now()
     WHERE id = $2 AND status = 'AWAITING_CUSTOMER_APPROVAL' RETURNING *`,
    [req.user.name, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Drawing is not awaiting customer approval' });
  res.json(rows[0]);
});

// Blocks release while Customer Approval is still pending, when required (Requirements-Design.md §11 AC4)
router.patch('/:id/release', requireRole(ROLES.DESIGN_HEAD, ROLES.ADMIN), async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE drawings SET status = 'RELEASED'
     WHERE id = $1 AND status IN ('DESIGN_HEAD_APPROVED', 'CUSTOMER_APPROVED') RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Drawing is not ready for release' });
  res.json(rows[0]);
});

// ECN — can only be raised against an already-released drawing; approving creates a new revision (append-only)
router.post('/:id/ecns', requireRole(ROLES.DESIGN_HEAD, ROLES.ADMIN), validate(ecnSchema), async (req, res) => {
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
});

router.patch('/:id/ecns/:ecnId/approve', requireRole(ROLES.DESIGN_HEAD, ROLES.ADMIN), validate(ecnApprovalSchema), async (req, res) => {
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
    }
    await client.query('COMMIT');
    res.json(ecnRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
