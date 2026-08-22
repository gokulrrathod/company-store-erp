import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', asyncHandler(async (req, res) => {
  const [
    stockVal, skuCount, lowStock, rejected, pendingInspection, pendingRequests, recentReceipts,
    dailyMovements, monthlyConsumption, expiringMaterials, accuracy, warehouseUtilization,
  ] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(quantity * unit_rate), 0) AS total FROM items`),
    pool.query(`SELECT COUNT(*) AS total FROM items`),
    pool.query(`SELECT COUNT(*) AS total FROM items WHERE quantity <= reorder_level`),
    pool.query(`SELECT COUNT(*) AS total FROM rejected_materials`),
    pool.query(`SELECT COUNT(*) AS total FROM material_receipts WHERE status = 'PENDING_INSPECTION'`),
    pool.query(`SELECT COUNT(*) AS total FROM material_requests WHERE status = 'PENDING'`),
    pool.query(
      `SELECT r.grn_number, r.status, r.created_at, s.name AS supplier_name
       FROM material_receipts r JOIN suppliers s ON s.id = r.supplier_id
       ORDER BY r.created_at DESC LIMIT 5`
    ),
    // Daily Inward/Outward: today's stock movement quantity, split by direction
    pool.query(
      `SELECT
         COALESCE(SUM(quantity) FILTER (WHERE type = 'IN'), 0) AS inward,
         COALESCE(SUM(quantity) FILTER (WHERE type = 'OUT'), 0) AS outward
       FROM stock_movements WHERE created_at::date = CURRENT_DATE`
    ),
    // Monthly Consumption: OUT-direction movements so far this calendar month
    pool.query(
      `SELECT COALESCE(SUM(quantity), 0) AS total FROM stock_movements
       WHERE type = 'OUT' AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`
    ),
    // Expiring Materials: tracked batches with remaining stock expiring within 30 days
    pool.query(
      `SELECT COUNT(*) AS total FROM item_batches
       WHERE quantity_remaining > 0 AND expiry_date IS NOT NULL
         AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'`
    ),
    // Inventory Accuracy: % of the catalog where the negative-stock rule the app enforces
    // (Requirements-Store.md §3) actually holds — a system-integrity check, not a physical
    // stock-take reconciliation (no cycle-count entity exists in this schema)
    pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE quantity - reserved_stock - damaged_stock - rejected_stock >= 0) AS clean
       FROM items`
    ),
    // Warehouse Utilization: % of the catalog with a warehouse location actually assigned
    // (location-tracking coverage — no capacity/space model exists to measure physical fill %)
    pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE warehouse IS NOT NULL AND warehouse != '') AS located
       FROM items`
    ),
  ]);

  const accuracyTotal = Number(accuracy.rows[0].total);
  const warehouseTotal = Number(warehouseUtilization.rows[0].total);

  res.json({
    total_stock_value: Number(stockVal.rows[0].total),
    total_skus: Number(skuCount.rows[0].total),
    low_stock_count: Number(lowStock.rows[0].total),
    rejected_count: Number(rejected.rows[0].total),
    pending_inspection_count: Number(pendingInspection.rows[0].total),
    pending_requests_count: Number(pendingRequests.rows[0].total),
    recent_receipts: recentReceipts.rows,
    daily_inward_qty: Number(dailyMovements.rows[0].inward),
    daily_outward_qty: Number(dailyMovements.rows[0].outward),
    monthly_consumption_qty: Number(monthlyConsumption.rows[0].total),
    expiring_materials_count: Number(expiringMaterials.rows[0].total),
    inventory_accuracy_percent: accuracyTotal ? Math.round((Number(accuracy.rows[0].clean) / accuracyTotal) * 1000) / 10 : 100,
    warehouse_utilization_percent: warehouseTotal ? Math.round((Number(warehouseUtilization.rows[0].located) / warehouseTotal) * 1000) / 10 : 0,
  });
}));

export default router;
