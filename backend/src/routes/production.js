import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  productionPlanSchema, scheduleSchema, scheduleStatusSchema, stageInspectionSchema, reworkRejectionSchema,
  dailyProductionEntrySchema, machineAllocationSchema, manpowerAllocationSchema, spaceAllocationSchema,
} from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

// ===== Weekly Production Plans =====

router.get('/plans', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM production_plans ORDER BY created_at DESC`);
  res.json(rows);
}));

router.get('/plans/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM production_plans WHERE id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Plan not found' });
  const { rows: schedules } = await pool.query(
    `SELECT * FROM production_schedules WHERE plan_id = $1 ORDER BY created_at`,
    [req.params.id]
  );
  res.json({ ...rows[0], schedules });
}));

router.post('/plans', requireRole(ROLES.PRODUCTION, ROLES.PRODUCTION_HEAD, ROLES.ADMIN), validate(productionPlanSchema), asyncHandler(async (req, res) => {
  const { project_reference, week_number, start_date, end_date, planned_quantity, planned_completion_date, production_engineer } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO production_plans (project_reference, week_number, start_date, end_date, planned_quantity, planned_completion_date, production_engineer)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [project_reference, week_number, start_date, end_date, planned_quantity, planned_completion_date || null, production_engineer]
  );
  res.status(201).json(rows[0]);
}));

// A plan is not active until Production Head Approval is recorded (Requirements-Production.md §3, AC2)
router.patch('/plans/:id/approve', requireRole(ROLES.PRODUCTION_HEAD, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE production_plans SET status = 'APPROVED', approved_by = $1, approved_at = now()
     WHERE id = $2 AND status = 'DRAFT' RETURNING *`,
    [req.user.name, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Plan not found or already approved' });
  res.json(rows[0]);
}));

// ===== Production Schedules (shop-floor activities) — only against an approved plan =====

router.post('/plans/:id/schedules', requireRole(ROLES.PRODUCTION, ROLES.SHOP_FLOOR_ENGINEER, ROLES.ADMIN), validate(scheduleSchema), asyncHandler(async (req, res) => {
  const { rows: planRows } = await pool.query(`SELECT status FROM production_plans WHERE id = $1`, [req.params.id]);
  if (!planRows.length) return res.status(404).json({ error: 'Plan not found' });
  if (planRows[0].status !== 'APPROVED') return res.status(400).json({ error: 'Activities cannot be scheduled against a Draft plan' });

  const { equipment_name, activity, planned_start_date, planned_end_date, responsible_engineer } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO production_schedules (plan_id, equipment_name, activity, planned_start_date, planned_end_date, responsible_engineer)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.params.id, equipment_name, activity, planned_start_date || null, planned_end_date || null, responsible_engineer]
  );
  res.status(201).json(rows[0]);
}));

router.get('/schedules/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM production_schedules WHERE id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Schedule not found' });
  const { rows: inspections } = await pool.query(
    `SELECT * FROM stage_inspections WHERE schedule_id = $1 ORDER BY created_at DESC`, [req.params.id]
  );
  const { rows: reworks } = await pool.query(
    `SELECT * FROM rework_rejections WHERE schedule_id = $1 ORDER BY created_at DESC`, [req.params.id]
  );
  const { rows: dailyEntries } = await pool.query(
    `SELECT * FROM daily_production_entries WHERE schedule_id = $1 ORDER BY entry_date DESC, created_at DESC`, [req.params.id]
  );
  res.json({ ...rows[0], inspections, reworks, daily_entries: dailyEntries });
}));

router.patch('/schedules/:id/status', requireRole(ROLES.PRODUCTION, ROLES.SHOP_FLOOR_ENGINEER, ROLES.ADMIN), validate(scheduleStatusSchema), asyncHandler(async (req, res) => {
  const { status, delay_reason, actual_start_date, actual_end_date } = req.body;
  const { rows } = await pool.query(
    `UPDATE production_schedules
     SET status = $1, delay_reason = $2, actual_start_date = COALESCE($3, actual_start_date), actual_end_date = COALESCE($4, actual_end_date)
     WHERE id = $5 RETURNING *`,
    [status, status === 'DELAYED' ? delay_reason : null, actual_start_date || null, actual_end_date || null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Schedule not found' });
  res.json(rows[0]);
}));

// ===== Stage Inspection (in-process shop-floor QC — distinct from Store's GRN Inspection) =====

router.post('/schedules/:id/stage-inspections', requireRole(ROLES.QUALITY, ROLES.SHOP_FLOOR_ENGINEER, ROLES.ADMIN), validate(stageInspectionSchema), asyncHandler(async (req, res) => {
  const { inspection_stage, inspector_name, status, remarks } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO stage_inspections (schedule_id, inspection_stage, inspector_name, status, remarks)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.params.id, inspection_stage, inspector_name, status, remarks || null]
  );
  res.status(201).json(rows[0]);
}));

// ===== Rework & Rejection (rolls up into the NCR Report) =====

router.post('/schedules/:id/rework-rejections', requireRole(ROLES.PRODUCTION, ROLES.SHOP_FLOOR_ENGINEER, ROLES.ADMIN), validate(reworkRejectionSchema), asyncHandler(async (req, res) => {
  const { part_name, quantity_produced, rework_qty, rejection_qty, reason, corrective_action, responsible_engineer } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO rework_rejections (schedule_id, part_name, quantity_produced, rework_qty, rejection_qty, reason, corrective_action, responsible_engineer)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.params.id, part_name, quantity_produced, rework_qty, rejection_qty, reason, corrective_action || null, responsible_engineer]
  );
  res.status(201).json(rows[0]);
}));

// ===== Daily Production Entry (Requirements-Production.md §1) — date/shift-level output against an activity =====

router.post('/schedules/:id/daily-entries', requireRole(ROLES.PRODUCTION, ROLES.SHOP_FLOOR_ENGINEER, ROLES.ADMIN), validate(dailyProductionEntrySchema), asyncHandler(async (req, res) => {
  const { rows: scheduleRows } = await pool.query(`SELECT id FROM production_schedules WHERE id = $1`, [req.params.id]);
  if (!scheduleRows.length) return res.status(404).json({ error: 'Schedule not found' });

  const { entry_date, shift, engineer, planned_qty, actual_qty } = req.body;
  const balance_qty = Number(planned_qty) - Number(actual_qty);
  const { rows } = await pool.query(
    `INSERT INTO daily_production_entries (schedule_id, entry_date, shift, engineer, planned_qty, actual_qty, balance_qty)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.params.id, entry_date, shift, engineer, planned_qty, actual_qty, balance_qty]
  );
  res.status(201).json(rows[0]);
}));

// ===== Resource Allocation (Requirements-Production.md §1) — Machine/Manpower reference the shared
// Machinery/Labour masters (Recommended Decision #6); Space is a fixed set of bays, no master needed =====

const ALLOCATION_ROLES = [ROLES.PRODUCTION, ROLES.PRODUCTION_HEAD, ROLES.ADMIN];

router.get('/resource-allocations', asyncHandler(async (req, res) => {
  const { rows: machineAllocations } = await pool.query(
    `SELECT ma.*, m.machine_name, m.machine_number
     FROM machine_allocations ma JOIN machines m ON m.id = ma.machine_id
     ORDER BY ma.created_at DESC`
  );
  const { rows: manpowerAllocations } = await pool.query(
    `SELECT pa.*, l.employee_name, l.department AS labour_department
     FROM manpower_allocations pa JOIN labour l ON l.id = pa.labour_id
     ORDER BY pa.created_at DESC`
  );
  const { rows: spaceAllocations } = await pool.query(
    `SELECT * FROM space_allocations ORDER BY created_at DESC`
  );
  res.json({ machine_allocations: machineAllocations, manpower_allocations: manpowerAllocations, space_allocations: spaceAllocations });
}));

router.post('/machine-allocations', requireRole(...ALLOCATION_ROLES), validate(machineAllocationSchema), asyncHandler(async (req, res) => {
  const { machine_id, project_reference, allocated_from, allocated_to } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: machineRows } = await client.query(`SELECT * FROM machines WHERE id = $1 FOR UPDATE`, [machine_id]);
    if (!machineRows.length) throw new Error('Machine not found');
    if (machineRows[0].availability_status !== 'AVAILABLE') throw new Error('Machine is not currently available');

    const { rows } = await client.query(
      `INSERT INTO machine_allocations (machine_id, project_reference, allocated_from, allocated_to, allocated_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [machine_id, project_reference, allocated_from, allocated_to || null, req.user.name]
    );
    await client.query(`UPDATE machines SET availability_status = 'ALLOCATED' WHERE id = $1`, [machine_id]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

router.patch('/machine-allocations/:id/release', requireRole(...ALLOCATION_ROLES), asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE machine_allocations SET released_at = now(), allocated_to = COALESCE(allocated_to, CURRENT_DATE)
       WHERE id = $1 AND released_at IS NULL RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) throw new Error('Allocation not found or already released');
    await client.query(`UPDATE machines SET availability_status = 'AVAILABLE' WHERE id = $1`, [rows[0].machine_id]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

router.post('/manpower-allocations', requireRole(...ALLOCATION_ROLES), validate(manpowerAllocationSchema), asyncHandler(async (req, res) => {
  const { labour_id, project_reference, shift, assigned_job, allocated_from, allocated_to } = req.body;
  const { rows: labourRows } = await pool.query(`SELECT id FROM labour WHERE id = $1`, [labour_id]);
  if (!labourRows.length) return res.status(400).json({ error: 'Employee not found' });

  const { rows } = await pool.query(
    `INSERT INTO manpower_allocations (labour_id, project_reference, shift, assigned_job, allocated_from, allocated_to, allocated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [labour_id, project_reference, shift, assigned_job, allocated_from, allocated_to || null, req.user.name]
  );
  res.status(201).json(rows[0]);
}));

router.post('/space-allocations', requireRole(...ALLOCATION_ROLES), validate(spaceAllocationSchema), asyncHandler(async (req, res) => {
  const { space_name, project_reference, allocated_from, allocated_to } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO space_allocations (space_name, project_reference, allocated_from, allocated_to, allocated_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [space_name, project_reference, allocated_from, allocated_to || null, req.user.name]
  );
  res.status(201).json(rows[0]);
}));

export default router;
