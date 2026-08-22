import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  projectSchema, projectStatusSchema, dprSchema, measurementEntrySchema, raBillSchema, reconciliationSchema,
  boqLineSchema, quantitySheetLineSchema, rateAnalysisLineSchema,
} from '../validation/schemas.js';
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

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM projects ORDER BY created_at DESC`);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM projects WHERE id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Project not found' });

  const [dprRes, mbRes, billsRes, reconRes, clientBilledRes, civilExecRes] = await Promise.all([
    pool.query(`SELECT * FROM daily_progress_reports WHERE project_id = $1 ORDER BY report_date DESC, id DESC`, [req.params.id]),
    pool.query(`SELECT * FROM measurement_book_entries WHERE project_id = $1 ORDER BY measurement_date DESC, id DESC`, [req.params.id]),
    pool.query(`SELECT * FROM ra_bills WHERE project_id = $1 ORDER BY created_at DESC`, [req.params.id]),
    pool.query(`SELECT * FROM reconciliations WHERE project_id = $1`, [req.params.id]),
    pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM ra_bills WHERE project_id = $1 AND bill_type = 'CLIENT'`, [req.params.id]),
    pool.query(`SELECT * FROM civil_executions WHERE project_id = $1`, [req.params.id]),
  ]);

  let civilExecution = civilExecRes.rows[0] || null;
  if (civilExecution) {
    const [boqRes, qtyRes, rateAnalysisRes] = await Promise.all([
      pool.query(`SELECT bl.*, rc.work_description AS rate_chart_description FROM boq_lines bl LEFT JOIN rate_charts rc ON rc.id = bl.rate_chart_id WHERE bl.civil_execution_id = $1 ORDER BY bl.item_no`, [civilExecution.id]),
      pool.query(`SELECT * FROM quantity_sheet_lines WHERE civil_execution_id = $1 ORDER BY created_at`, [civilExecution.id]),
      pool.query(`SELECT * FROM rate_analysis_lines WHERE civil_execution_id = $1 ORDER BY created_at`, [civilExecution.id]),
    ]);
    civilExecution = { ...civilExecution, boq_lines: boqRes.rows, quantity_sheet_lines: qtyRes.rows, rate_analysis_lines: rateAnalysisRes.rows };
  }

  // Excess/Saving is system-computed, never a manually entered field (§5, AC4)
  const totalClientBilled = Number(clientBilledRes.rows[0].total);
  const projectValue = Number(rows[0].project_value);
  const excessSaving = {
    total_client_billed: totalClientBilled,
    project_value: projectValue,
    variance: totalClientBilled - projectValue,
    flag: totalClientBilled > projectValue ? 'EXCESS' : totalClientBilled < projectValue ? 'SAVING' : 'ON_BUDGET',
  };

  res.json({
    ...rows[0],
    daily_progress_reports: dprRes.rows,
    measurement_entries: mbRes.rows,
    ra_bills: billsRes.rows,
    reconciliation: reconRes.rows[0] || null,
    excess_saving: excessSaving,
    civil_execution: civilExecution,
  });
}));

router.post('/', requireRole(ROLES.PROJECT_MANAGER, ROLES.ADMIN), validate(projectSchema), asyncHandler(async (req, res) => {
  const { project_name, client_name, site_location, company, project_type, start_date, expected_completion_date, project_value, project_manager, site_engineer } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO projects (project_name, client_name, site_location, company, project_type, start_date, expected_completion_date, project_value, project_manager, site_engineer)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [project_name, client_name, site_location || null, company, project_type || null, start_date || null,
      expected_completion_date || null, project_value ?? 0, project_manager, site_engineer || null]
  );
  res.status(201).json(rows[0]);
}));

router.patch('/:id/status', requireRole(ROLES.PROJECT_MANAGER, ROLES.ADMIN), validate(projectStatusSchema), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { rows } = await pool.query(
    `UPDATE projects SET status = $1 WHERE id = $2 AND status != 'CLOSED' RETURNING *`,
    [status, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Project not found or already closed' });
  res.json(rows[0]);
}));

router.post('/:id/dpr', requireRole(ROLES.SITE_ENGINEER, ROLES.PROJECT_MANAGER, ROLES.ADMIN), validate(dprSchema), asyncHandler(async (req, res) => {
  const { report_date, work_done, labour_count, material_used, machinery_used, issues } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO daily_progress_reports (project_id, report_date, work_done, labour_count, material_used, machinery_used, issues, submitted_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.params.id, report_date, work_done, labour_count ?? 0, material_used || null, machinery_used || null, issues || null, req.user.name]
  );
  res.status(201).json(rows[0]);
}));

router.post('/:id/measurement-entries', requireRole(ROLES.SITE_ENGINEER, ROLES.PROJECT_MANAGER, ROLES.ADMIN), validate(measurementEntrySchema), asyncHandler(async (req, res) => {
  const { description, quantity, unit, rate, measured_by, measurement_date } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO measurement_book_entries (project_id, description, quantity, unit, rate, measured_by, measurement_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.params.id, description, quantity, unit || 'unit', rate ?? 0, measured_by, measurement_date]
  );
  res.status(201).json(rows[0]);
}));

// RA Bill must trace to an existing Measurement Book entry — no free-standing bills (§5, AC3)
router.post('/:id/ra-bills', requireRole(ROLES.ACCOUNTS, ROLES.ADMIN), validate(raBillSchema), asyncHandler(async (req, res, next) => {
  const { measurement_entry_id, bill_type, party_name, amount } = req.body;
  try {
    const { rows: mbRows } = await pool.query(
      `SELECT id FROM measurement_book_entries WHERE id = $1 AND project_id = $2`,
      [measurement_entry_id, req.params.id]
    );
    if (!mbRows.length) return res.status(400).json({ error: 'Measurement entry not found for this project' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const bill_number = await nextNumber(client, 'ra_bills', 'bill_number', 'RA');
      const { rows } = await client.query(
        `INSERT INTO ra_bills (bill_number, project_id, measurement_entry_id, bill_type, party_name, amount, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [bill_number, req.params.id, measurement_entry_id, bill_type, party_name, amount, req.user.name]
      );
      await client.query('COMMIT');
      res.status(201).json(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}));

// Upsert the reconciliation record; both flags must be true before the project can be Closed
router.patch('/:id/reconciliation', requireRole(ROLES.PROJECT_MANAGER, ROLES.ACCOUNTS, ROLES.ADMIN), validate(reconciliationSchema), asyncHandler(async (req, res) => {
  const { material_reconciliation_complete, cost_reconciliation_complete, material_return_note, remarks } = req.body;
  const bothComplete = !!material_reconciliation_complete && !!cost_reconciliation_complete;
  const { rows } = await pool.query(
    `INSERT INTO reconciliations (project_id, material_reconciliation_complete, cost_reconciliation_complete, material_return_note, remarks, completed_by, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $7 THEN now() ELSE NULL END)
     ON CONFLICT (project_id) DO UPDATE SET
       material_reconciliation_complete = EXCLUDED.material_reconciliation_complete,
       cost_reconciliation_complete = EXCLUDED.cost_reconciliation_complete,
       material_return_note = EXCLUDED.material_return_note,
       remarks = EXCLUDED.remarks,
       completed_by = EXCLUDED.completed_by,
       completed_at = EXCLUDED.completed_at
     RETURNING *`,
    [req.params.id, !!material_reconciliation_complete, !!cost_reconciliation_complete,
      material_return_note || null, remarks || null, req.user.name, bothComplete]
  );
  res.json(rows[0]);
}));

// Closure is disabled until Reconciliation is complete (§5, AC5)
router.post('/:id/close', requireRole(ROLES.PROJECT_MANAGER, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { rows: reconRows } = await pool.query(`SELECT * FROM reconciliations WHERE project_id = $1`, [req.params.id]);
  const recon = reconRows[0];
  if (!recon || !recon.material_reconciliation_complete || !recon.cost_reconciliation_complete) {
    return res.status(400).json({ error: 'Material and Cost Reconciliation must both be complete before closing' });
  }
  const { rows } = await pool.query(
    `UPDATE projects SET status = 'CLOSED', actual_completion_date = CURRENT_DATE WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  res.json(rows[0]);
}));

// ===== Civil Execution (Requirements-ProjectCivil.md §1) — extension of Project, not a separate Project entity =====

const CIVIL_ROLES = [ROLES.PROJECT_MANAGER, ROLES.ADMIN];

router.post('/:id/civil-execution', requireRole(...CIVIL_ROLES), asyncHandler(async (req, res, next) => {
  const { rows: projectRows } = await pool.query(`SELECT id FROM projects WHERE id = $1`, [req.params.id]);
  if (!projectRows.length) return res.status(404).json({ error: 'Project not found' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO civil_executions (project_id, created_by) VALUES ($1, $2) RETURNING *`,
      [req.params.id, req.user.name]
    );
    res.status(201).json({ ...rows[0], boq_lines: [], quantity_sheet_lines: [], rate_analysis_lines: [] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'This project already has a Civil Execution record' });
    next(err);
  }
}));

// Estimated Cost is system-computed from BOQ lines, never a manually entered field (mirrors the Excess/Saving pattern, §5 AC4)
async function recomputeEstimatedCost(client, civilExecutionId) {
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM boq_lines WHERE civil_execution_id = $1`,
    [civilExecutionId]
  );
  await client.query(`UPDATE civil_executions SET estimated_cost = $1 WHERE id = $2`, [rows[0].total, civilExecutionId]);
}

router.post('/:id/civil-execution/boq-lines', requireRole(...CIVIL_ROLES), validate(boqLineSchema), asyncHandler(async (req, res) => {
  const { item_no, description, unit, quantity, rate_chart_id, rate } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: execRows } = await client.query(`SELECT id FROM civil_executions WHERE project_id = $1`, [req.params.id]);
    if (!execRows.length) throw new Error('Create the Civil Execution record for this project first');
    const civilExecutionId = execRows[0].id;

    const amount = Number(quantity) * Number(rate);
    const { rows } = await client.query(
      `INSERT INTO boq_lines (civil_execution_id, item_no, description, unit, quantity, rate_chart_id, rate, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [civilExecutionId, item_no, description, unit, quantity, rate_chart_id || null, rate, amount]
    );
    await recomputeEstimatedCost(client, civilExecutionId);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

router.post('/:id/civil-execution/quantity-sheet-lines', requireRole(...CIVIL_ROLES), validate(quantitySheetLineSchema), asyncHandler(async (req, res) => {
  const { rows: execRows } = await pool.query(`SELECT id FROM civil_executions WHERE project_id = $1`, [req.params.id]);
  if (!execRows.length) return res.status(400).json({ error: 'Create the Civil Execution record for this project first' });

  const { description, unit, quantity, remarks } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO quantity_sheet_lines (civil_execution_id, description, unit, quantity, remarks)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [execRows[0].id, description, unit, quantity, remarks || null]
  );
  res.status(201).json(rows[0]);
}));

router.post('/:id/civil-execution/rate-analysis-lines', requireRole(...CIVIL_ROLES), validate(rateAnalysisLineSchema), asyncHandler(async (req, res) => {
  const { rows: execRows } = await pool.query(`SELECT id FROM civil_executions WHERE project_id = $1`, [req.params.id]);
  if (!execRows.length) return res.status(400).json({ error: 'Create the Civil Execution record for this project first' });

  const { work_item, material_cost, labour_cost, machinery_cost, overhead_percent } = req.body;
  const baseCost = Number(material_cost) + Number(labour_cost) + Number(machinery_cost);
  const computed_rate = baseCost * (1 + Number(overhead_percent) / 100);
  const { rows } = await pool.query(
    `INSERT INTO rate_analysis_lines (civil_execution_id, work_item, material_cost, labour_cost, machinery_cost, overhead_percent, computed_rate)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [execRows[0].id, work_item, material_cost, labour_cost, machinery_cost, overhead_percent, computed_rate]
  );
  res.status(201).json(rows[0]);
}));

export default router;
