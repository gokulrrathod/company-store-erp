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
    `SELECT b.*, p.project_name, (b.allocated_amount - b.utilized_amount) AS balance
     FROM budgets b
     LEFT JOIN projects p ON p.id = b.project_id
     ORDER BY b.department, p.project_name NULLS FIRST`
  );
  res.json(rows);
}));

router.post('/', requireRole(ROLES.FINANCE, ROLES.ADMIN), validate(budgetSchema), asyncHandler(async (req, res, next) => {
  const { department, allocated_amount, project_id } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO budgets (department, allocated_amount, project_id) VALUES ($1, $2, $3) RETURNING *`,
      [department, allocated_amount, project_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({
        error: project_id ? 'A budget for this department and project already exists' : 'A department-wide budget for this department already exists',
        fieldErrors: { department: 'Already allocated' },
      });
    }
    next(err);
  }
}));

export default router;
