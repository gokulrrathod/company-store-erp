import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ROLES } from '../config/auth.js';
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

// ===== Store reports (Requirements-Store.md §6) =====

// Goods Receipt Register: every GRN with its PO/supplier and total quantity received
router.get('/goods-receipt-register', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.grn_number, po.po_number, s.name AS supplier_name, r.invoice_number,
            r.receiver_name, r.status, r.created_at, r.approved_at,
            COALESCE(SUM(rl.quantity_received), 0) AS total_quantity_received
     FROM material_receipts r
     JOIN suppliers s ON s.id = r.supplier_id
     LEFT JOIN purchase_orders po ON po.id = r.po_id
     LEFT JOIN receipt_lines rl ON rl.receipt_id = r.id
     GROUP BY r.id, r.grn_number, po.po_number, s.name, r.invoice_number, r.receiver_name, r.status, r.created_at, r.approved_at
     ORDER BY r.created_at DESC`
  );
  res.json(rows);
}));

// Material Issue Register: every approved (i.e. issued) Material Request
router.get('/material-issue-register', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.requisition_number, r.department, i.code AS item_code, i.name AS item_name,
            r.requested_by, r.approved_by, r.quantity_requested, r.quantity_issued, r.balance_stock,
            r.issue_date, r.purpose, r.remarks
     FROM material_requests r
     JOIN items i ON i.id = r.item_id
     WHERE r.status = 'APPROVED'
     ORDER BY r.issue_date DESC`
  );
  res.json(rows);
}));

// Inventory Summary: current stock position per item, including total stock value
router.get('/inventory-summary', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.id, i.code, i.name, c.name AS category_name, i.warehouse, i.unit,
            i.quantity, i.reserved_stock, i.damaged_stock, i.rejected_stock,
            (i.quantity - i.reserved_stock - i.damaged_stock - i.rejected_stock) AS available_stock,
            i.reorder_level, i.unit_rate,
            (i.quantity * i.unit_rate) AS total_value
     FROM items i
     LEFT JOIN categories c ON c.id = i.category_id
     ORDER BY i.name`
  );
  res.json(rows);
}));

// Rejected Material Report: full disposition history (Return to Supplier / Scrap / Rework / Replacement)
router.get('/rejected-material', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT rm.id, rm.rejection_number, i.code AS item_code, i.name AS item_name, s.name AS supplier_name,
            rm.batch_number, rm.quantity, rm.reason, rm.qc_remarks, rm.action_taken, rm.approval,
            rm.disposal_date, rm.created_at
     FROM rejected_materials rm
     JOIN items i ON i.id = rm.item_id
     LEFT JOIN suppliers s ON s.id = rm.supplier_id
     ORDER BY rm.created_at DESC`
  );
  res.json(rows);
}));

// Scrap Report: the subset of Rejected Material specifically dispositioned as Scrap
router.get('/scrap', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT rm.id, rm.rejection_number, i.code AS item_code, i.name AS item_name, s.name AS supplier_name,
            rm.batch_number, rm.quantity, rm.reason, rm.approval, rm.disposal_date, rm.created_at
     FROM rejected_materials rm
     JOIN items i ON i.id = rm.item_id
     LEFT JOIN suppliers s ON s.id = rm.supplier_id
     WHERE rm.action_taken = 'SCRAP'
     ORDER BY rm.created_at DESC`
  );
  res.json(rows);
}));

// Inventory Audit Report: the field-level audit trail for stock-affecting tables (items, item_batches) —
// reuses the system-wide audit_log rather than a separate manual stock-take entity
router.get('/inventory-audit', requireRole(ROLES.STORE_MANAGER, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT al.id, al.table_name, al.record_id, al.field_name, al.old_value, al.new_value,
            al.changed_by, al.changed_at,
            COALESCE(i1.code, i2.code) AS item_code, COALESCE(i1.name, i2.name) AS item_name
     FROM audit_log al
     LEFT JOIN items i1 ON al.table_name = 'items' AND i1.id::text = al.record_id
     LEFT JOIN item_batches ib ON al.table_name = 'item_batches' AND ib.id::text = al.record_id
     LEFT JOIN items i2 ON i2.id = ib.item_id
     WHERE al.table_name IN ('items', 'item_batches')
     ORDER BY al.changed_at DESC
     LIMIT 500`
  );
  res.json(rows);
}));

export default router;
