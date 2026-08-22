import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

// Stock Ledger: every inward/outward movement, most recent first
router.get('/stock-ledger', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.id, m.type, m.quantity, m.reference, m.remarks, m.created_at,
            i.code AS item_code, i.name AS item_name, i.unit
     FROM stock_movements m JOIN items i ON i.id = m.item_id
     ORDER BY m.created_at DESC`
  );
  res.json(rows);
}));

// FIFO Report: accepted batches per item, oldest first (first-in-first-out order)
router.get('/fifo', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT rl.id, i.code AS item_code, i.name AS item_name, rl.batch_number, rl.expiry_date,
            rl.quantity_received, rl.unit, r.grn_number, r.created_at AS received_at
     FROM receipt_lines rl
     JOIN material_receipts r ON r.id = rl.receipt_id
     JOIN items i ON i.id = rl.item_id
     WHERE rl.inspection_status IN ('ACCEPTED', 'PARTIALLY_ACCEPTED') AND r.status = 'APPROVED'
     ORDER BY i.name, r.created_at ASC`
  );
  res.json(rows);
}));

// Batch-wise Stock Report: total received quantity grouped by item + batch
router.get('/batch-wise', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.code AS item_code, i.name AS item_name, rl.batch_number, rl.expiry_date,
            SUM(rl.quantity_received) AS total_received, rl.unit,
            MIN(r.created_at) AS first_received_at
     FROM receipt_lines rl
     JOIN material_receipts r ON r.id = rl.receipt_id
     JOIN items i ON i.id = rl.item_id
     WHERE rl.inspection_status IN ('ACCEPTED', 'PARTIALLY_ACCEPTED') AND r.status = 'APPROVED'
     GROUP BY i.code, i.name, rl.batch_number, rl.expiry_date, rl.unit
     ORDER BY i.name, rl.batch_number`
  );
  res.json(rows);
}));

// Supplier-wise Receipt Report: GRN count + total quantity received per supplier
router.get('/supplier-wise-receipts', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.name AS supplier_name,
            COUNT(DISTINCT r.id) AS grn_count,
            COALESCE(SUM(rl.quantity_received), 0) AS total_quantity_received,
            MAX(r.created_at) AS last_receipt_at
     FROM suppliers s
     LEFT JOIN material_receipts r ON r.supplier_id = s.id
     LEFT JOIN receipt_lines rl ON rl.receipt_id = r.id
     GROUP BY s.name
     ORDER BY s.name`
  );
  res.json(rows);
}));

// Department-wise Consumption Report: approved requisitions and quantity issued per department
router.get('/department-wise-consumption', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT department,
            COUNT(*) AS requisition_count,
            COALESCE(SUM(quantity_issued), 0) AS total_quantity_issued
     FROM material_requests
     WHERE status = 'APPROVED'
     GROUP BY department
     ORDER BY department`
  );
  res.json(rows);
}));

// Vendor Performance Report (Requirements-Purchase.md §7): PO volume/value and on-time delivery
// rate per supplier, derived from expected_delivery_date vs actual_delivery_date — not a manual score
router.get('/vendor-performance', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.id AS supplier_id, s.name AS supplier_name, s.vendor_rating, s.vendor_status,
            COUNT(po.id) AS total_pos,
            COALESCE(SUM(po.total_value), 0) AS total_value,
            COUNT(po.id) FILTER (WHERE po.actual_delivery_date IS NOT NULL) AS delivered_count,
            COUNT(po.id) FILTER (
              WHERE po.actual_delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL
                AND po.actual_delivery_date <= po.expected_delivery_date
            ) AS on_time_count,
            COUNT(po.id) FILTER (
              WHERE po.actual_delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL
                AND po.actual_delivery_date > po.expected_delivery_date
            ) AS late_count,
            ROUND(AVG(
              CASE WHEN po.actual_delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL
                THEN (po.actual_delivery_date - po.expected_delivery_date) END
            )::numeric, 1) AS avg_delay_days
     FROM suppliers s
     LEFT JOIN purchase_orders po ON po.supplier_id = s.id
     GROUP BY s.id, s.name, s.vendor_rating, s.vendor_status
     ORDER BY s.name`
  );
  res.json(rows);
}));

// Delivery Delay Report (Requirements-Purchase.md §7): POs delivered late, or still outstanding
// past their expected date — days_delayed is computed, never a manually entered field
router.get('/delivery-delay', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT po.id, po.po_number, s.name AS supplier_name, po.department, po.project_id,
            po.expected_delivery_date, po.actual_delivery_date, po.status,
            CASE
              WHEN po.actual_delivery_date IS NOT NULL AND po.actual_delivery_date > po.expected_delivery_date
                THEN (po.actual_delivery_date - po.expected_delivery_date)
              WHEN po.actual_delivery_date IS NULL AND po.expected_delivery_date < CURRENT_DATE
                THEN (CURRENT_DATE - po.expected_delivery_date)
            END AS days_delayed
     FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.expected_delivery_date IS NOT NULL
       AND (
         (po.actual_delivery_date IS NOT NULL AND po.actual_delivery_date > po.expected_delivery_date)
         OR (po.actual_delivery_date IS NULL AND po.expected_delivery_date < CURRENT_DATE)
       )
     ORDER BY days_delayed DESC`
  );
  res.json(rows);
}));

export default router;
