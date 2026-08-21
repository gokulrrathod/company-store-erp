import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { budgetSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT *, (allocated_amount - utilized_amount) AS balance FROM budgets ORDER BY department`
  );
  res.json(rows);
}));

router.post('/', requireRole(ROLES.FINANCE, ROLES.ADMIN), validate(budgetSchema), asyncHandler(async (req, res, next) => {
  const { department, allocated_amount } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO budgets (department, allocated_amount) VALUES ($1, $2) RETURNING *`,
      [department, allocated_amount]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A budget for this department already exists', fieldErrors: { department: 'Already allocated' } });
    }
    next(err);
  }
}));

export default router;
