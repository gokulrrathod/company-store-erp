import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { purchaseInvoiceSchema, salesInvoiceSchema, invoicePaymentSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { streamPdf, pdfTitle, pdfField } from '../utils/pdf.js';

const router = Router();
router.use(requireAuth);

async function nextInvoiceNumber(client, invoiceType, prefix) {
  const year = new Date().getFullYear();
  const { rows } = await client.query(
    `SELECT invoice_number FROM invoices WHERE invoice_type = $1 AND invoice_number LIKE $2 ORDER BY id DESC LIMIT 1`,
    [invoiceType, `${prefix}-${year}-%`]
  );
  const lastSeq = rows.length ? Number(rows[0].invoice_number.split('-').pop()) : 0;
  return `${prefix}-${year}-${String(lastSeq + 1).padStart(4, '0')}`;
}

async function nextVoucherNumber(client) {
  const year = new Date().getFullYear();
  const { rows } = await client.query(
    `SELECT voucher_number FROM payments WHERE voucher_number LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`PV-${year}-%`]
  );
  const lastSeq = rows.length ? Number(rows[0].voucher_number.split('-').pop()) : 0;
  return `PV-${year}-${String(lastSeq + 1).padStart(4, '0')}`;
}

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
  const { rows: lines } = await pool.query(
    `SELECT il.*, i.code AS item_code FROM invoice_lines il LEFT JOIN items i ON i.id = il.item_id
     WHERE il.invoice_id = $1 ORDER BY il.id`,
    [req.params.id]
  );
  res.json({ ...withBal, payments, lines });
}));

// Eligible GRNs for a given PO: APPROVED status only (three-way match gate).
router.get('/eligible-grns/:poId', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, grn_number, status FROM material_receipts WHERE po_id = $1 AND status = 'APPROVED' ORDER BY created_at DESC`,
    [req.params.poId]
  );
  res.json(rows);
}));

async function insertLines(client, invoiceId, lines) {
  for (const line of lines) {
    const amount = Number(line.quantity) * Number(line.rate);
    await client.query(
      `INSERT INTO invoice_lines (invoice_id, item_id, description, hsn_sac_code, quantity, rate, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [invoiceId, line.item_id || null, line.description, line.hsn_sac_code || null, line.quantity, line.rate, amount]
    );
  }
}

router.post('/purchase', requireRole(ROLES.ACCOUNTS, ROLES.ADMIN), validate(purchaseInvoiceSchema), asyncHandler(async (req, res) => {
  const { party_name, gstin, purchase_order_id, material_receipt_id, gst_percent, due_date, lines } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: poRows } = await client.query(`SELECT * FROM purchase_orders WHERE id = $1`, [purchase_order_id]);
    if (!poRows.length) throw new Error('Purchase order not found');

    const { rows: grnRows } = await client.query(`SELECT * FROM material_receipts WHERE id = $1 AND po_id = $2`, [material_receipt_id, purchase_order_id]);
    if (!grnRows.length) throw new Error('GRN does not belong to the selected purchase order');
    if (grnRows[0].status !== 'APPROVED') throw new Error('GRN must be Approved (post-inspection) before invoice booking — three-way match required');

    const invoice_number = await nextInvoiceNumber(client, 'PURCHASE', 'PINV');
    const taxable_amount = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.rate), 0);
    const gst_amount = taxable_amount * (Number(gst_percent) / 100);
    const total_amount = taxable_amount + gst_amount;

    const { rows } = await client.query(
      `INSERT INTO invoices
         (invoice_number, invoice_type, party_name, gstin, purchase_order_id, material_receipt_id,
          taxable_amount, gst_percent, gst_amount, total_amount, due_date, created_by)
       VALUES ($1, 'PURCHASE', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [invoice_number, party_name, gstin || null, purchase_order_id, material_receipt_id,
        taxable_amount, gst_percent, gst_amount, total_amount, due_date || null, req.user.name]
    );
    await insertLines(client, rows[0].id, lines);
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
  const { sales_order_id, gstin, gst_percent, due_date, lines } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: soRows } = await client.query(
      `SELECT so.*, e.customer_name FROM sales_orders so JOIN enquiries e ON e.id = so.enquiry_id WHERE so.id = $1`,
      [sales_order_id]
    );
    if (!soRows.length) throw new Error('Sales order not found');
    if (!soRows[0].dc_number) throw new Error('Sales order has no Delivery Challan number');

    const invoice_number = await nextInvoiceNumber(client, 'SALES', 'SINV');
    const taxable_amount = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.rate), 0);
    const gst_amount = taxable_amount * (Number(gst_percent) / 100);
    const total_amount = taxable_amount + gst_amount;

    const { rows } = await client.query(
      `INSERT INTO invoices
         (invoice_number, invoice_type, party_name, gstin, sales_order_id,
          taxable_amount, gst_percent, gst_amount, total_amount, due_date, created_by)
       VALUES ($1, 'SALES', $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [invoice_number, soRows[0].customer_name, gstin || null, sales_order_id,
        taxable_amount, gst_percent, gst_amount, total_amount, due_date || null, req.user.name]
    );
    await insertLines(client, rows[0].id, lines);
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
  const { payment_date, mode, bank_name, utr_or_cheque_number, amount_paid } = req.body;
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

    const voucher_number = await nextVoucherNumber(client);
    const { rows: paymentRows } = await client.query(
      `INSERT INTO payments (invoice_id, voucher_number, payment_date, mode, bank_name, utr_or_cheque_number, amount_paid, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.params.id, voucher_number, payment_date || new Date(), mode, bank_name || null, utr_or_cheque_number || null, amount_paid, req.user.name]
    );

    const newPaid = alreadyPaid + Number(amount_paid);
    const newStatus = newPaid >= Number(invoice.total_amount) ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING';
    const { rows } = await client.query(`UPDATE invoices SET payment_status = $1 WHERE id = $2 RETURNING *`, [newStatus, req.params.id]);

    await client.query('COMMIT');
    res.json({ ...rows[0], payment: paymentRows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

// Payment Voucher — a real PDF document for each recorded payment (Requirements-Accounts.md §2)
router.get('/:id/payments/:paymentId/voucher-pdf', asyncHandler(async (req, res) => {
  const { rows: invRows } = await pool.query(`SELECT * FROM invoices WHERE id = $1`, [req.params.id]);
  if (!invRows.length) return res.status(404).json({ error: 'Invoice not found' });
  const invoice = invRows[0];

  const { rows: payRows } = await pool.query(
    `SELECT * FROM payments WHERE id = $1 AND invoice_id = $2`,
    [req.params.paymentId, req.params.id]
  );
  if (!payRows.length) return res.status(404).json({ error: 'Payment not found for this invoice' });
  const payment = payRows[0];

  await streamPdf(res, `${payment.voucher_number}.pdf`, (doc) => {
    pdfTitle(doc, invoice.invoice_type === 'PURCHASE' ? 'Payment Voucher' : 'Receipt Voucher');
    pdfField(doc, 'Voucher Number', payment.voucher_number); doc.moveDown(0.4);
    pdfField(doc, 'Date', new Date(payment.payment_date).toLocaleDateString()); doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text(invoice.invoice_type === 'PURCHASE' ? 'Paid To' : 'Received From'); doc.moveDown(0.3);
    pdfField(doc, 'Party Name', invoice.party_name); doc.moveDown(0.2);
    pdfField(doc, 'GSTIN', invoice.gstin); doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Payment Details'); doc.moveDown(0.3);
    pdfField(doc, 'Invoice Number', invoice.invoice_number); doc.moveDown(0.2);
    pdfField(doc, 'Mode', payment.mode); doc.moveDown(0.2);
    pdfField(doc, 'Bank', payment.bank_name); doc.moveDown(0.2);
    pdfField(doc, 'UTR / Cheque Number', payment.utr_or_cheque_number); doc.moveDown(0.2);
    pdfField(doc, 'Amount Paid', `Rs. ${Number(payment.amount_paid).toLocaleString('en-IN')}`); doc.moveDown(3);

    doc.fontSize(10).text('Prepared By: _______________________');
    doc.moveDown(1);
    doc.text('Authorized Signatory: _______________________');
  });
}));

export default router;
