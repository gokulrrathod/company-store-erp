import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { confirmOrderSchema, productionStatusSchema, dispatchSchema, paymentSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';

const router = Router();
router.use(requireAuth);

async function nextNumber(client, table, column, prefix) {
  const { rows } = await client.query(`SELECT ${column} FROM ${table} ORDER BY id DESC LIMIT 1`);
  const lastSeq = rows.length ? Number(rows[0][column].split('-').pop()) : 0;
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(lastSeq + 1).padStart(4, '0')}`;
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT so.*, e.customer_name, e.enquiry_number
     FROM sales_orders so JOIN enquiries e ON e.id = so.enquiry_id
     ORDER BY so.created_at DESC`
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT so.*, e.customer_name, e.mobile_number, e.company_name, e.site_address, e.enquiry_number
     FROM sales_orders so JOIN enquiries e ON e.id = so.enquiry_id WHERE so.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Sales order not found' });
  res.json(rows[0]);
});

// Convert a Price-Approved enquiry into a confirmed Sales Order
router.post('/from-enquiry/:enquiryId', requireRole(ROLES.SALES, ROLES.ADMIN), validate(confirmOrderSchema), async (req, res) => {
  const { payment_terms, advance_payment, expected_dispatch_date, customer_notes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: enqRows } = await client.query(
      `SELECT * FROM enquiries WHERE id = $1 FOR UPDATE`,
      [req.params.enquiryId]
    );
    if (!enqRows.length) throw new Error('Enquiry not found');
    const enquiry = enqRows[0];
    if (enquiry.status !== 'PRICE_APPROVED') throw new Error('Enquiry must be Price Approved before order confirmation');
    if (enquiry.discount_percent > 2 && enquiry.management_approval_status !== 'APPROVED') {
      throw new Error('Discount above 2% requires Management approval before confirmation');
    }

    const approved_price = Number(enquiry.negotiated_price);
    if (advance_payment > approved_price) throw new Error('Advance payment cannot exceed the approved price');
    if (payment_terms === 'FULL_100' && advance_payment < approved_price) {
      throw new Error('Full payment terms requires the advance payment to equal the approved price');
    }

    const so_number = await nextNumber(client, 'sales_orders', 'so_number', 'SO');
    const dc_number = await nextNumber(client, 'sales_orders', 'dc_number', 'DC');
    const balance_amount = approved_price - advance_payment;

    const { rows } = await client.query(
      `INSERT INTO sales_orders
         (so_number, enquiry_id, dc_number, approved_price, discount_percent, discount_reason,
          payment_terms, advance_payment, balance_amount, expected_dispatch_date, customer_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [so_number, enquiry.id, dc_number, approved_price, enquiry.discount_percent, enquiry.discount_reason,
        payment_terms, advance_payment, balance_amount, expected_dispatch_date || null, customer_notes || null]
    );

    await client.query(`UPDATE enquiries SET status = 'ORDER_CONFIRMED' WHERE id = $1`, [enquiry.id]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Production updates its own progress against the Sales Order (shared entity, no separate copy)
router.patch('/:id/production-status', requireRole(ROLES.PRODUCTION, ROLES.ADMIN), validate(productionStatusSchema), async (req, res) => {
  const { production_status } = req.body;
  const overallStatus = production_status === 'COMPLETED' ? 'PRODUCTION_COMPLETED' : 'IN_PRODUCTION';
  const { rows } = await pool.query(
    `UPDATE sales_orders SET production_status = $1, status = $2
     WHERE id = $3 AND status IN ('ORDER_CONFIRMED', 'IN_PRODUCTION') RETURNING *`,
    [production_status, overallStatus, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Sales order not found or not in production' });
  res.json(rows[0]);
});

// Sales notifies customer that material is ready
router.patch('/:id/ready-for-dispatch', requireRole(ROLES.SALES, ROLES.ADMIN), async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE sales_orders SET status = 'READY_FOR_DISPATCH'
     WHERE id = $1 AND status = 'PRODUCTION_COMPLETED' RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Sales order must be Production Completed first' });
  res.json(rows[0]);
});

// Accounts records a payment against the order's balance
router.patch('/:id/payment', requireRole(ROLES.ACCOUNTS, ROLES.ADMIN), validate(paymentSchema), async (req, res) => {
  const { amount } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: soRows } = await client.query(`SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE`, [req.params.id]);
    if (!soRows.length) throw new Error('Sales order not found');
    if (amount > Number(soRows[0].balance_amount)) throw new Error('Payment exceeds the outstanding balance');
    const { rows } = await client.query(
      `UPDATE sales_orders SET balance_amount = balance_amount - $1 WHERE id = $2 RETURNING *`,
      [amount, req.params.id]
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

// Dispatch: hard-gated on the payment balance and the checklist (SOP Module 6)
router.post('/:id/dispatch', requireRole(ROLES.DISPATCH, ROLES.ADMIN), validate(dispatchSchema), async (req, res) => {
  const { vehicle_id, driver_name, loading_person, material_measured, quality_checked } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: soRows } = await client.query(`SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE`, [req.params.id]);
    if (!soRows.length) throw new Error('Sales order not found');
    const so = soRows[0];
    if (so.status !== 'READY_FOR_DISPATCH') throw new Error('Sales order is not Ready for Dispatch');
    if (Number(so.balance_amount) > 0) throw new Error('Pending payment must be cleared before dispatch');

    const { rows: vehicleRows } = await client.query(`SELECT * FROM vehicles WHERE id = $1`, [vehicle_id]);
    if (!vehicleRows.length) throw new Error('Vehicle not found');
    if (vehicleRows[0].status !== 'ACTIVE') throw new Error('Selected vehicle is not Active');

    const { rows } = await client.query(
      `UPDATE sales_orders
       SET vehicle_id = $1, vehicle_number = $2, driver_name = $3, loading_person = $4,
           material_measured = $5, quality_checked = $6, status = 'DISPATCHED', dispatched_at = now()
       WHERE id = $7 RETURNING *`,
      [vehicle_id, vehicleRows[0].vehicle_number, driver_name, loading_person, material_measured, quality_checked, req.params.id]
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

router.patch('/:id/deliver', requireRole(ROLES.DISPATCH, ROLES.ADMIN), async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE sales_orders SET status = 'DELIVERED', delivered_at = now()
     WHERE id = $1 AND status = 'DISPATCHED' RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Sales order must be Dispatched first' });
  res.json(rows[0]);
});

export default router;
