import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { materialReceiptSchema, inspectLineSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

async function nextGrnNumber(client) {
  const { rows } = await client.query(
    `SELECT grn_number FROM material_receipts ORDER BY id DESC LIMIT 1`
  );
  const lastSeq = rows.length ? Number(rows[0].grn_number.split('-').pop()) : 0;
  const year = new Date().getFullYear();
  return `GRN-${year}-${String(lastSeq + 1).padStart(4, '0')}`;
}

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.*, s.name AS supplier_name, po.po_number
     FROM material_receipts r
     JOIN suppliers s ON s.id = r.supplier_id
     LEFT JOIN purchase_orders po ON po.id = r.po_id
     ORDER BY r.created_at DESC`
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: recRows } = await pool.query(
    `SELECT r.*, s.name AS supplier_name, po.po_number
     FROM material_receipts r
     JOIN suppliers s ON s.id = r.supplier_id
     LEFT JOIN purchase_orders po ON po.id = r.po_id
     WHERE r.id = $1`,
    [req.params.id]
  );
  if (!recRows.length) return res.status(404).json({ error: 'Receipt not found' });

  const { rows: lines } = await pool.query(
    `SELECT rl.*, i.code AS item_code, i.name AS item_name
     FROM receipt_lines rl JOIN items i ON i.id = rl.item_id WHERE rl.receipt_id = $1`,
    [req.params.id]
  );
  res.json({ ...recRows[0], lines });
}));

// Step 1: Store Executive records incoming material (Material Receipt)
router.post('/', requireRole(ROLES.STORE_EXECUTIVE, ROLES.STORE_MANAGER, ROLES.ADMIN), validate(materialReceiptSchema), asyncHandler(async (req, res) => {
  const { po_id, supplier_id, invoice_number, lines } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const grn_number = await nextGrnNumber(client);
    const { rows } = await client.query(
      `INSERT INTO material_receipts (grn_number, po_id, supplier_id, invoice_number, receiver_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [grn_number, po_id || null, supplier_id, invoice_number, req.user.name]
    );
    const receipt = rows[0];
    for (const line of lines || []) {
      await client.query(
        `INSERT INTO receipt_lines (receipt_id, item_id, batch_number, expiry_date, quantity_ordered, quantity_received, unit)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [receipt.id, line.item_id, line.batch_number || null, line.expiry_date || null, line.quantity_ordered || null, line.quantity_received, line.unit || 'pcs']
      );
    }
    await client.query('COMMIT');
    res.status(201).json(receipt);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

// Step 2: Quality inspects each line (accept/partially accept/reject)
router.patch('/:id/lines/:lineId/inspect', requireRole(ROLES.QUALITY, ROLES.ADMIN), validate(inspectLineSchema), asyncHandler(async (req, res) => {
  const { inspection_status, quality_remarks, damage_details } = req.body;
  const { rows } = await pool.query(
    `UPDATE receipt_lines
     SET inspection_status = $1, quality_remarks = $2, damage_details = $3, qc_inspector = $4
     WHERE id = $5 AND receipt_id = $6 RETURNING *`,
    [inspection_status, quality_remarks, damage_details, req.user.name, req.params.lineId, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Receipt line not found' });

  await pool.query(
    `UPDATE material_receipts SET status = 'INSPECTED'
     WHERE id = $1 AND status = 'PENDING_INSPECTION'`,
    [req.params.id]
  );
  res.json(rows[0]);
}));

// Step 3: Store Manager approves -> inventory updated, PO status updated
router.post('/:id/approve', requireRole(ROLES.STORE_MANAGER, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: recRows } = await client.query(
      `SELECT * FROM material_receipts WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (!recRows.length) throw new Error('Receipt not found');
    const receipt = recRows[0];
    if (receipt.status === 'APPROVED') throw new Error('Receipt already approved');

    const { rows: lines } = await client.query(
      `SELECT * FROM receipt_lines WHERE receipt_id = $1`,
      [req.params.id]
    );
    if (lines.some((l) => l.inspection_status === 'PENDING')) {
      throw new Error('All lines must be inspected before approval');
    }

    for (const line of lines) {
      if (line.inspection_status === 'REJECTED') continue;
      await client.query(
        `UPDATE items SET quantity = quantity + $1 WHERE id = $2`,
        [line.quantity_received, line.item_id]
      );
      await client.query(
        `INSERT INTO stock_movements (item_id, type, quantity, reference, remarks)
         VALUES ($1, 'IN', $2, $3, $4)`,
        [line.item_id, line.quantity_received, receipt.grn_number, `Batch ${line.batch_number || 'N/A'}`]
      );
    }

    const { rows: updated } = await client.query(
      `UPDATE material_receipts SET status = 'APPROVED', approved_by = $1, approved_at = now()
       WHERE id = $2 RETURNING *`,
      [req.user.name, req.params.id]
    );

    if (receipt.po_id) {
      await client.query(
        `UPDATE purchase_orders SET status = 'PARTIALLY_RECEIVED' WHERE id = $1 AND status = 'OPEN'`,
        [receipt.po_id]
      );
    }

    await client.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

export default router;
