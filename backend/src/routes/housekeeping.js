import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { housekeepingSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM housekeeping_logs ORDER BY log_date DESC, id DESC`
  );
  res.json(rows);
}));

router.post('/', requireRole(ROLES.STORE_EXECUTIVE, ROLES.STORE_MANAGER, ROLES.ADMIN), validate(housekeepingSchema), asyncHandler(async (req, res) => {
  const { activity, performed_by, verified_by, remarks } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO housekeeping_logs (activity, performed_by, verified_by, remarks, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [activity, performed_by, verified_by || null, remarks || null, verified_by ? 'VERIFIED' : 'PENDING']
  );
  res.status(201).json(rows[0]);
}));

export default router;
