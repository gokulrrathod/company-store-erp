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

export default router;
