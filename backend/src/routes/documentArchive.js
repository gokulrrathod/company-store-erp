import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

// Document Archive (Requirements-Accounts.md §1) — searchable by document number, party, and date.
// Scoped to documents that genuinely exist in this schema: uploaded Invoice attachments (scans of the
// physical Purchase/Sales invoice) and generated Delivery Challan PDFs for dispatched Sales Orders.
// PO and Work Order aren't included — no PO document/PDF and no separate Work Order entity exist here
// (Work Order maps to Sales Order per Recommended Decision #4); adding those would mean inventing new
// documents rather than archiving real ones. "Folder, auto, month-wise" is a display grouping on the
// frontend (document_date's month) rather than a physical folder, since files live in Postgres BYTEA.
router.get('/', requireRole(ROLES.ACCOUNTS, ROLES.MANAGEMENT, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { search, document_type, month } = req.query;

  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT a.id AS attachment_id, NULL::integer AS sales_order_id,
              CASE WHEN i.invoice_type = 'PURCHASE' THEN 'Purchase Invoice' ELSE 'Sales Invoice' END AS document_type,
              i.invoice_number AS document_number, i.party_name, i.created_at::date AS document_date,
              a.file_name, a.uploaded_by, a.uploaded_at
       FROM attachments a
       JOIN invoices i ON i.id = a.entity_id
       WHERE a.entity_type = 'invoice'

       UNION ALL

       SELECT NULL::integer AS attachment_id, so.id AS sales_order_id,
              'Delivery Challan' AS document_type,
              so.dc_number AS document_number, e.customer_name AS party_name, so.dispatched_at::date AS document_date,
              so.dc_number || '.pdf' AS file_name, NULL AS uploaded_by, so.dispatched_at AS uploaded_at
       FROM sales_orders so
       JOIN enquiries e ON e.id = so.enquiry_id
       WHERE so.dispatched_at IS NOT NULL
     ) docs
     WHERE ($1::text IS NULL OR document_number ILIKE '%' || $1 || '%' OR party_name ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL OR document_type = $2)
       AND ($3::text IS NULL OR to_char(document_date, 'YYYY-MM') = $3)
     ORDER BY document_date DESC NULLS LAST`,
    [search || null, document_type || null, month || null]
  );
  res.json(rows);
}));

export default router;
