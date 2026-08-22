import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { machineSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

// Machinery shared master (Recommended Decision #6) — consumed by Production's Resource Allocation
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM machines ORDER BY machine_name');
  res.json(rows);
}));

router.post('/', requireRole(ROLES.PRODUCTION, ROLES.PRODUCTION_HEAD, ROLES.ADMIN), validate(machineSchema), asyncHandler(async (req, res, next) => {
  const { machine_name, machine_number, machine_type } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO machines (machine_name, machine_number, machine_type) VALUES ($1, $2, $3) RETURNING *`,
      [machine_name, machine_number, machine_type || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Machine number already exists', fieldErrors: { machine_number: 'Already in use' } });
    }
    next(err);
  }
}));

export default router;
