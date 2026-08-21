import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { safetySchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM safety_logs ORDER BY incident_date DESC, id DESC`
  );
  res.json(rows);
}));

router.post('/', requireRole(ROLES.STORE_EXECUTIVE, ROLES.STORE_MANAGER, ROLES.QUALITY, ROLES.ADMIN), validate(safetySchema), asyncHandler(async (req, res) => {
  const { category, zone, reported_by, severity, action_taken } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO safety_logs (category, zone, reported_by, severity, action_taken)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [category, zone || null, reported_by, severity, action_taken || null]
  );
  res.status(201).json(rows[0]);
}));

router.patch('/:id/close', requireRole(ROLES.STORE_MANAGER, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE safety_logs SET status = 'CLOSED' WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  res.json(rows[0]);
}));

export default router;
