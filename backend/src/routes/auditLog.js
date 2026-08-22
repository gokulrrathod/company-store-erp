import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole(ROLES.ADMIN));

router.get('/', asyncHandler(async (req, res) => {
  const { table_name, record_id } = req.query;
  const conditions = [];
  const params = [];
  if (table_name) {
    params.push(table_name);
    conditions.push(`table_name = $${params.length}`);
  }
  if (record_id) {
    params.push(record_id);
    conditions.push(`record_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM audit_log ${where} ORDER BY changed_at DESC LIMIT 1000`,
    params
  );
  res.json(rows);
}));

router.get('/tables', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT DISTINCT table_name FROM audit_log ORDER BY table_name`);
  res.json(rows.map((r) => r.table_name));
}));

export default router;
