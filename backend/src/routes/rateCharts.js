import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateChartSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

// Rate Chart Master (Requirements-ProjectCivil.md §2) — feeds BOQ line rates
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM rate_charts ORDER BY work_description');
  res.json(rows);
}));

router.post('/', requireRole(ROLES.PROJECT_MANAGER, ROLES.ADMIN), validate(rateChartSchema), asyncHandler(async (req, res) => {
  const { work_description, unit, standard_rate } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO rate_charts (work_description, unit, standard_rate) VALUES ($1, $2, $3) RETURNING *`,
    [work_description, unit, standard_rate]
  );
  res.status(201).json(rows[0]);
}));

export default router;
