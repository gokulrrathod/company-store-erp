import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { labourSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

// Labour shared master (Recommended Decision #6) — consumed by Production's Resource Allocation
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM labour ORDER BY employee_name');
  res.json(rows);
}));

router.post('/', requireRole(ROLES.PRODUCTION, ROLES.PRODUCTION_HEAD, ROLES.ADMIN), validate(labourSchema), asyncHandler(async (req, res) => {
  const { employee_name, department, skill } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO labour (employee_name, department, skill) VALUES ($1, $2, $3) RETURNING *`,
    [employee_name, department, skill || null]
  );
  res.status(201).json(rows[0]);
}));

export default router;
