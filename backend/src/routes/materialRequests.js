import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { materialRequestSchema, materialRequestStatusSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';

const router = Router();
router.use(requireAuth);

async function nextRequisitionNumber(client) {
  const { rows } = await client.query(
    `SELECT requisition_number FROM material_requests ORDER BY id DESC LIMIT 1`
  );
  const lastSeq = rows.length ? Number(rows[0].requisition_number.split('-').pop()) : 0;
  const year = new Date().getFullYear();
  return `MR-${year}-${String(lastSeq + 1).padStart(4, '0')}`;
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.*, i.name AS item_name, i.code AS item_code
     FROM material_requests r JOIN items i ON i.id = r.item_id
     ORDER BY r.created_at DESC`
  );
  res.json(rows);
});

router.post('/', validate(materialRequestSchema), async (req, res) => {
  const { department, item_id, requested_by, quantity_requested, purpose, remarks } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const requisition_number = await nextRequisitionNumber(client);
    const { rows } = await client.query(
      `INSERT INTO material_requests (requisition_number, department, item_id, requested_by, quantity_requested, purpose, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [requisition_number, department, item_id, requested_by, quantity_requested, purpose || null, remarks || null]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.patch('/:id/status', requireRole(ROLES.STORE_MANAGER, ROLES.ADMIN), validate(materialRequestStatusSchema), async (req, res) => {
  const { status } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: reqRows } = await client.query(
      `SELECT * FROM material_requests WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (!reqRows.length) throw new Error('Material request not found');
    const request = reqRows[0];
    if (request.status !== 'PENDING') throw new Error('Request already actioned');

    let quantity_issued = null;
    let balance_stock = null;

    if (status === 'APPROVED') {
      // Store Issue: deduct stock and log the movement (SOP Module 3)
      const { rows: itemRows } = await client.query(
        `UPDATE items SET quantity = quantity - $1 WHERE id = $2 RETURNING *`,
        [request.quantity_requested, request.item_id]
      );
      if (itemRows[0].quantity < 0) throw new Error('Insufficient stock to issue');
      quantity_issued = request.quantity_requested;
      balance_stock = itemRows[0].quantity;

      await client.query(
        `INSERT INTO stock_movements (item_id, type, quantity, reference, remarks)
         VALUES ($1, 'OUT', $2, $3, $4)`,
        [request.item_id, request.quantity_requested, request.requisition_number, `Issued to ${request.department} (${request.requested_by})`]
      );
    }

    const { rows } = await client.query(
      `UPDATE material_requests
       SET status = $1, approved_by = $2, approved_at = now(),
           quantity_issued = $3, balance_stock = $4,
           issue_date = CASE WHEN $1::varchar = 'APPROVED' THEN now() ELSE NULL END
       WHERE id = $5 RETURNING *`,
      [status, req.user.name, quantity_issued, balance_stock, req.params.id]
    );
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
