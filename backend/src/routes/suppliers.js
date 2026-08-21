import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { vendorSchema, vendorApprovalSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM suppliers ORDER BY name');
  res.json(rows);
}));

router.post('/', requireRole(ROLES.PURCHASE, ROLES.ADMIN), validate(vendorSchema), asyncHandler(async (req, res, next) => {
  const { name, contact_person, phone, email, vendor_type, vendor_category, gst_number, pan_number, bank_account_details } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO suppliers (name, contact_person, phone, email, vendor_type, vendor_category, gst_number, pan_number, bank_account_details, vendor_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING_VERIFICATION') RETURNING *`,
      [name, contact_person || null, phone || null, email || null, vendor_type, vendor_category || null, gst_number, pan_number, bank_account_details || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'GST or PAN number already registered', fieldErrors: { gst_number: 'Already registered' } });
    }
    next(err);
  }
}));

// Purchase Executive verifies the vendor's documents
router.patch('/:id/purchase-verify', requireRole(ROLES.PURCHASE, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE suppliers SET vendor_status = 'PENDING_FINANCE_VERIFICATION', purchase_verified_by = $1
     WHERE id = $2 AND vendor_status = 'PENDING_VERIFICATION' RETURNING *`,
    [req.user.name, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Vendor not found or not pending verification' });
  res.json(rows[0]);
}));

// Finance verification is optional — Management can approve straight from either pending state
router.patch('/:id/finance-verify', requireRole(ROLES.FINANCE, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE suppliers SET vendor_status = 'PENDING_MANAGEMENT_APPROVAL', finance_verified_by = $1
     WHERE id = $2 AND vendor_status = 'PENDING_FINANCE_VERIFICATION' RETURNING *`,
    [req.user.name, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Vendor not found or not pending finance verification' });
  res.json(rows[0]);
}));

router.patch('/:id/approve', requireRole(ROLES.MANAGEMENT, ROLES.ADMIN), validate(vendorApprovalSchema), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { rows } = await pool.query(
    `UPDATE suppliers
     SET vendor_status = CASE WHEN $1::varchar = 'APPROVED' THEN 'ACTIVE' ELSE 'REJECTED' END,
         approved_by = $2, approved_at = now()
     WHERE id = $3 AND vendor_status IN ('PENDING_FINANCE_VERIFICATION', 'PENDING_MANAGEMENT_APPROVAL') RETURNING *`,
    [status, req.user.name, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Vendor not found or not awaiting approval' });
  res.json(rows[0]);
}));

export default router;
