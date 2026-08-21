import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rejectedMaterialSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

async function nextRejectionNumber(client) {
  const { rows } = await client.query(
    `SELECT rejection_number FROM rejected_materials ORDER BY id DESC LIMIT 1`
  );
  const lastSeq = rows.length ? Number(rows[0].rejection_number.split('-').pop()) : 0;
  const year = new Date().getFullYear();
  return `REJ-${year}-${String(lastSeq + 1).padStart(4, '0')}`;
}

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.*, i.name AS item_name, i.code AS item_code, s.name AS supplier_name
     FROM rejected_materials r
     JOIN items i ON i.id = r.item_id
     LEFT JOIN suppliers s ON s.id = r.supplier_id
     ORDER BY r.created_at DESC`
  );
  res.json(rows);
}));

router.post('/', requireRole(ROLES.QUALITY, ROLES.STORE_MANAGER, ROLES.ADMIN), validate(rejectedMaterialSchema), asyncHandler(async (req, res) => {
  const { supplier_id, item_id, batch_number, quantity, reason, qc_remarks, action_taken, disposal_date } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rejection_number = await nextRejectionNumber(client);
    const { rows } = await client.query(
      `INSERT INTO rejected_materials
         (rejection_number, supplier_id, item_id, batch_number, quantity, reason, qc_remarks, action_taken, approval, disposal_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [rejection_number, supplier_id || null, item_id, batch_number || null, quantity, reason, qc_remarks || null, action_taken, req.user.name, disposal_date || null]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

export default router;
