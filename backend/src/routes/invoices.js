import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { purchaseInvoiceSchema, salesInvoiceSchema, invoicePaymentSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

async function withBalance(rows) {
  const ids = rows.map((r) => r.id);
  if (!ids.length) return rows;
  const { rows: paid } = await pool.query(
    `SELECT invoice_id, COALESCE(SUM(amount_paid), 0) AS paid FROM payments WHERE invoice_id = ANY($1::int[]) GROUP BY invoice_id`,
    [ids]
  );
  const paidMap = Object.fromEntries(paid.map((p) => [p.invoice_id, Number(p.paid)]));
  return rows.map((r) => ({ ...r, amount_paid: paidMap[r.id] || 0, balance: Number(r.total_amount) - (paidMap[r.id] || 0) }));
}

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.*, po.po_number, so.so_number
     FROM invoices i
     LEFT JOIN purchase_orders po ON po.id = i.purchase_order_id
     LEFT JOIN sales_orders so ON so.id = i.sales_order_id
     ORDER BY i.created_at DESC`
  );
  res.json(await withBalance(rows));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.*, po.po_number, so.so_number
     FROM invoices i
     LEFT JOIN purchase_orders po ON po.id = i.purchase_order_id
     LEFT JOIN sales_orders so ON so.id = i.sales_order_id
     WHERE i.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
  const [withBal] = await withBalance(rows);
  const { rows: payments } = await pool.query(`SELECT * FROM payments WHERE invoice_id = $1 ORDER BY created_at DESC`, [req.params.id]);
  res.json({ ...withBal, payments });
}));

// Eligible GRNs for a given PO: APPROVED status only (three-way match gate).
router.get('/eligible-grns/:poId', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, grn_number, status FROM material_receipts WHERE po_id = $1 AND status = 'APPROVED' ORDER BY created_at DESC`,
    [req.params.poId]
  );
  res.json(rows);
}));

router.post('/purchase', requireRole(ROLES.ACCOUNTS, ROLES.ADMIN), validate(purchaseInvoiceSchema), asyncHandler(async (req, res) => {
  const { invoice_number, party_name, gstin, purchase_order_id, material_receipt_id, taxable_amount, gst_percent, due_date } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: poRows } = await client.query(`SELECT * FROM purchase_orders WHERE id = $1`, [purchase_order_id]);
    if (!poRows.length) throw new Error('Purchase order not found');

    const { rows: grnRows } = await client.query(`SELECT * FROM material_receipts WHERE id = $1 AND po_id = $2`, [material_receipt_id, purchase_order_id]);
    if (!grnRows.length) throw new Error('GRN does not belong to the selected purchase order');
    if (grnRows[0].status !== 'APPROVED') throw new Error('GRN must be Approved (post-inspection) before invoice booking — three-way match required');

    const gst_amount = Number(taxable_amount) * (Number(gst_percent) / 100);
    const total_amount = Number(taxable_amount) + gst_amount;

    const { rows } = await client.query(
      `INSERT INTO invoices
         (invoice_number, invoice_type, party_name, gstin, purchase_order_id, material_receipt_id,
          taxable_amount, gst_percent, gst_amount, total_amount, due_date, created_by)
       VALUES ($1, 'PURCHASE', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [invoice_number, party_name, gstin || null, purchase_order_id, material_receipt_id,
        taxable_amount, gst_percent, gst_amount, total_amount, due_date || null, req.user.name]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ error: 'Invoice number already exists', fieldErrors: { invoice_number: 'This invoice number already exists' } });
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

router.post('/sales', requireRole(ROLES.ACCOUNTS, ROLES.ADMIN), validate(salesInvoiceSchema), asyncHandler(async (req, res) => {
  const { invoice_number, sales_order_id, gstin, taxable_amount, gst_percent, due_date } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: soRows } = await client.query(
      `SELECT so.*, e.customer_name FROM sales_orders so JOIN enquiries e ON e.id = so.enquiry_id WHERE so.id = $1`,
      [sales_order_id]
    );
    if (!soRows.length) throw new Error('Sales order not found');
    if (!soRows[0].dc_number) throw new Error('Sales order has no Delivery Challan number');

    const gst_amount = Number(taxable_amount) * (Number(gst_percent) / 100);
    const total_amount = Number(taxable_amount) + gst_amount;

    const { rows } = await client.query(
      `INSERT INTO invoices
         (invoice_number, invoice_type, party_name, gstin, sales_order_id,
          taxable_amount, gst_percent, gst_amount, total_amount, due_date, created_by)
       VALUES ($1, 'SALES', $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [invoice_number, soRows[0].customer_name, gstin || null, sales_order_id,
        taxable_amount, gst_percent, gst_amount, total_amount, due_date || null, req.user.name]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ error: 'Invoice number already exists', fieldErrors: { invoice_number: 'This invoice number already exists' } });
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

router.post('/:id/payments', requireRole(ROLES.ACCOUNTS, ROLES.ADMIN), validate(invoicePaymentSchema), asyncHandler(async (req, res) => {
  const { payment_date, mode, reference_number, amount_paid } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: invRows } = await client.query(`SELECT * FROM invoices WHERE id = $1 FOR UPDATE`, [req.params.id]);
    if (!invRows.length) throw new Error('Invoice not found');
    const invoice = invRows[0];

    const { rows: paidRows } = await client.query(`SELECT COALESCE(SUM(amount_paid), 0) AS paid FROM payments WHERE invoice_id = $1`, [req.params.id]);
    const alreadyPaid = Number(paidRows[0].paid);
    const balance = Number(invoice.total_amount) - alreadyPaid;
    if (Number(amount_paid) > balance) throw new Error(`Payment amount exceeds outstanding balance of ₹ ${balance.toFixed(2)}`);

    await client.query(
      `INSERT INTO payments (invoice_id, payment_date, mode, reference_number, amount_paid, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.params.id, payment_date || new Date(), mode, reference_number || null, amount_paid, req.user.name]
    );

    const newPaid = alreadyPaid + Number(amount_paid);
    const newStatus = newPaid >= Number(invoice.total_amount) ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING';
    const { rows } = await client.query(`UPDATE invoices SET payment_status = $1 WHERE id = $2 RETURNING *`, [newStatus, req.params.id]);

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

export default router;
