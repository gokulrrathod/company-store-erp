import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  productionPlanSchema, scheduleSchema, scheduleStatusSchema, stageInspectionSchema, reworkRejectionSchema,
} from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';

const router = Router();
router.use(requireAuth);

// ===== Weekly Production Plans =====

router.get('/plans', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM production_plans ORDER BY created_at DESC`);
  res.json(rows);
});

router.get('/plans/:id', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM production_plans WHERE id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Plan not found' });
  const { rows: schedules } = await pool.query(
    `SELECT * FROM production_schedules WHERE plan_id = $1 ORDER BY created_at`,
    [req.params.id]
  );
  res.json({ ...rows[0], schedules });
});

router.post('/plans', requireRole(ROLES.PRODUCTION, ROLES.PRODUCTION_HEAD, ROLES.ADMIN), validate(productionPlanSchema), async (req, res) => {
  const { project_reference, week_number, start_date, end_date, planned_quantity, planned_completion_date, production_engineer } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO production_plans (project_reference, week_number, start_date, end_date, planned_quantity, planned_completion_date, production_engineer)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [project_reference, week_number, start_date, end_date, planned_quantity, planned_completion_date || null, production_engineer]
  );
  res.status(201).json(rows[0]);
});

// A plan is not active until Production Head Approval is recorded (Requirements-Production.md §3, AC2)
router.patch('/plans/:id/approve', requireRole(ROLES.PRODUCTION_HEAD, ROLES.ADMIN), async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE production_plans SET status = 'APPROVED', approved_by = $1, approved_at = now()
     WHERE id = $2 AND status = 'DRAFT' RETURNING *`,
    [req.user.name, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Plan not found or already approved' });
  res.json(rows[0]);
});

// ===== Production Schedules (shop-floor activities) — only against an approved plan =====

router.post('/plans/:id/schedules', requireRole(ROLES.PRODUCTION, ROLES.SHOP_FLOOR_ENGINEER, ROLES.ADMIN), validate(scheduleSchema), async (req, res) => {
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
});

router.get('/schedules/:id', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM production_schedules WHERE id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Schedule not found' });
  const { rows: inspections } = await pool.query(
    `SELECT * FROM stage_inspections WHERE schedule_id = $1 ORDER BY created_at DESC`, [req.params.id]
  );
  const { rows: reworks } = await pool.query(
    `SELECT * FROM rework_rejections WHERE schedule_id = $1 ORDER BY created_at DESC`, [req.params.id]
  );
  res.json({ ...rows[0], inspections, reworks });
});

router.patch('/schedules/:id/status', requireRole(ROLES.PRODUCTION, ROLES.SHOP_FLOOR_ENGINEER, ROLES.ADMIN), validate(scheduleStatusSchema), async (req, res) => {
  const { status, delay_reason, actual_start_date, actual_end_date } = req.body;
  const { rows } = await pool.query(
    `UPDATE production_schedules
     SET status = $1, delay_reason = $2, actual_start_date = COALESCE($3, actual_start_date), actual_end_date = COALESCE($4, actual_end_date)
     WHERE id = $5 RETURNING *`,
    [status, status === 'DELAYED' ? delay_reason : null, actual_start_date || null, actual_end_date || null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Schedule not found' });
  res.json(rows[0]);
});

// ===== Stage Inspection (in-process shop-floor QC — distinct from Store's GRN Inspection) =====

router.post('/schedules/:id/stage-inspections', requireRole(ROLES.QUALITY, ROLES.SHOP_FLOOR_ENGINEER, ROLES.ADMIN), validate(stageInspectionSchema), async (req, res) => {
  const { inspection_stage, inspector_name, status, remarks } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO stage_inspections (schedule_id, inspection_stage, inspector_name, status, remarks)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.params.id, inspection_stage, inspector_name, status, remarks || null]
  );
  res.status(201).json(rows[0]);
});

// ===== Rework & Rejection (rolls up into the NCR Report) =====

router.post('/schedules/:id/rework-rejections', requireRole(ROLES.PRODUCTION, ROLES.SHOP_FLOOR_ENGINEER, ROLES.ADMIN), validate(reworkRejectionSchema), async (req, res) => {
  const { part_name, quantity_produced, rework_qty, rejection_qty, reason, corrective_action, responsible_engineer } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO rework_rejections (schedule_id, part_name, quantity_produced, rework_qty, rejection_qty, reason, corrective_action, responsible_engineer)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.params.id, part_name, quantity_produced, rework_qty, rejection_qty, reason, corrective_action || null, responsible_engineer]
  );
  res.status(201).json(rows[0]);
});

export default router;
