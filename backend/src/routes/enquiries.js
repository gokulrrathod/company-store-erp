import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { enquirySchema, quotationSchema, negotiateSchema, discountApprovalSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

async function nextEnquiryNumber(client) {
  const { rows } = await client.query(`SELECT enquiry_number FROM enquiries ORDER BY id DESC LIMIT 1`);
  const lastSeq = rows.length ? Number(rows[0].enquiry_number.split('-').pop()) : 0;
  const year = new Date().getFullYear();
  return `ENQ-${year}-${String(lastSeq + 1).padStart(4, '0')}`;
}

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM enquiries ORDER BY created_at DESC`);
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM enquiries WHERE id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Enquiry not found' });
  res.json(rows[0]);
}));

router.post('/', requireRole(ROLES.SALES, ROLES.ADMIN), validate(enquirySchema), asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enquiry_number = await nextEnquiryNumber(client);
    const { customer_name, mobile_number, company_name, site_address, product_requirement, sales_representative } = req.body;
    const { rows } = await client.query(
      `INSERT INTO enquiries (enquiry_number, customer_name, mobile_number, company_name, site_address, product_requirement, sales_representative)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [enquiry_number, customer_name, mobile_number, company_name || null, site_address || null, product_requirement, sales_representative]
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

// Sales Representative sends a quotation
router.patch('/:id/quotation', requireRole(ROLES.SALES, ROLES.ADMIN), validate(quotationSchema), asyncHandler(async (req, res) => {
  const { quotation_amount, quotation_date } = req.body;
  const { rows } = await pool.query(
    `UPDATE enquiries SET quotation_amount = $1, quotation_date = $2, status = 'QUOTATION_SENT'
     WHERE id = $3 AND status = 'NEW_ENQUIRY' RETURNING *`,
    [quotation_amount, quotation_date, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Enquiry not found or not in a state to be quoted' });
  res.json(rows[0]);
}));

// Sales Representative records negotiated price + discount; >2% discount routes to Management
router.patch('/:id/negotiate', requireRole(ROLES.SALES, ROLES.ADMIN), validate(negotiateSchema), asyncHandler(async (req, res) => {
  const { negotiated_price, discount_percent, discount_reason } = req.body;
  const needsApproval = discount_percent > 2;
  const { rows } = await pool.query(
    `UPDATE enquiries
     SET negotiated_price = $1, discount_percent = $2, discount_reason = $3,
         status = CASE WHEN $4 THEN 'UNDER_NEGOTIATION' ELSE 'PRICE_APPROVED' END,
         management_approval_status = CASE WHEN $4 THEN 'PENDING' ELSE NULL END
     WHERE id = $5 AND status IN ('QUOTATION_SENT', 'WAITING_FOR_CUSTOMER', 'UNDER_NEGOTIATION') RETURNING *`,
    [negotiated_price, discount_percent, discount_reason || null, needsApproval, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Enquiry not found or not in a negotiable state' });
  res.json(rows[0]);
}));

// Management approves/rejects a >2% discount request
router.patch('/:id/approve-discount', requireRole(ROLES.MANAGEMENT, ROLES.ADMIN), validate(discountApprovalSchema), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { rows } = await pool.query(
    `UPDATE enquiries
     SET management_approval_status = $1, management_approved_by = $2, management_approved_at = now(),
         status = CASE WHEN $1::varchar = 'APPROVED' THEN 'PRICE_APPROVED' ELSE 'UNDER_NEGOTIATION' END
     WHERE id = $3 AND management_approval_status = 'PENDING' RETURNING *`,
    [status, req.user.name, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'No pending discount approval for this enquiry' });
  res.json(rows[0]);
}));

export default router;
