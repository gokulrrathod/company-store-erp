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
    lowStockByCategory, valueByCategory, grnStatusBreakdown, sevenDayTrend,
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
    // Chart: Low Stock by Category
    pool.query(
      `SELECT c.name AS category_name, COUNT(*) AS total
       FROM items i JOIN categories c ON c.id = i.category_id
       WHERE i.quantity <= i.reorder_level
       GROUP BY c.name ORDER BY total DESC`
    ),
    // Chart: Inventory Value by Category
    pool.query(
      `SELECT c.name AS category_name, COALESCE(SUM(i.quantity * i.unit_rate), 0) AS value
       FROM items i JOIN categories c ON c.id = i.category_id
       GROUP BY c.name ORDER BY value DESC`
    ),
    // Chart: GRN Status breakdown
    pool.query(
      `SELECT status, COUNT(*) AS total FROM material_receipts GROUP BY status`
    ),
    // Chart: Inward vs Outward, last 7 days (zero-filled)
    pool.query(
      `SELECT d::date AS day,
         COALESCE(SUM(sm.quantity) FILTER (WHERE sm.type = 'IN'), 0) AS inward,
         COALESCE(SUM(sm.quantity) FILTER (WHERE sm.type = 'OUT'), 0) AS outward
       FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d
       LEFT JOIN stock_movements sm ON sm.created_at::date = d::date
       GROUP BY d ORDER BY d`
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
    low_stock_by_category: lowStockByCategory.rows.map((r) => ({ category_name: r.category_name, count: Number(r.total) })),
    value_by_category: valueByCategory.rows.map((r) => ({ category_name: r.category_name, value: Number(r.value) })),
    grn_status_breakdown: grnStatusBreakdown.rows.map((r) => ({ status: r.status, count: Number(r.total) })),
    seven_day_trend: sevenDayTrend.rows.map((r) => ({ day: r.day, inward: Number(r.inward), outward: Number(r.outward) })),
  });
}));

router.get('/purchase-summary', asyncHandler(async (req, res) => {
  const [
    openPoCount, pendingBudgetApprovals, overdueDeliveries, openPoValue,
    poStatusBreakdown, budgetUtilization, topSuppliers, pendingVendorApprovals, recentPos,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM purchase_orders WHERE status != 'CLOSED'`),
    pool.query(`SELECT COUNT(*) AS total FROM purchase_orders WHERE budget_status = 'PENDING_FINANCE_APPROVAL'`),
    pool.query(
      `SELECT COUNT(*) AS total FROM purchase_orders
       WHERE status != 'CLOSED' AND actual_delivery_date IS NULL
         AND expected_delivery_date IS NOT NULL AND expected_delivery_date < CURRENT_DATE`
    ),
    pool.query(`SELECT COALESCE(SUM(total_value), 0) AS total FROM purchase_orders WHERE status != 'CLOSED'`),
    pool.query(`SELECT status, COUNT(*) AS total FROM purchase_orders GROUP BY status`),
    pool.query(
      `SELECT department, COALESCE(SUM(allocated_amount), 0) AS allocated, COALESCE(SUM(utilized_amount), 0) AS utilized
       FROM budgets GROUP BY department ORDER BY department`
    ),
    pool.query(
      `SELECT s.name AS supplier_name, COUNT(po.id) AS po_count, COALESCE(SUM(po.total_value), 0) AS total_value
       FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
       GROUP BY s.name ORDER BY total_value DESC LIMIT 5`
    ),
    pool.query(
      `SELECT COUNT(*) AS total FROM suppliers
       WHERE vendor_status IN ('PENDING_VERIFICATION', 'PENDING_FINANCE_VERIFICATION', 'PENDING_MANAGEMENT_APPROVAL')`
    ),
    pool.query(
      `SELECT po.po_number, po.status, po.total_value, po.created_at, s.name AS supplier_name
       FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
       ORDER BY po.created_at DESC LIMIT 5`
    ),
  ]);

  res.json({
    open_po_count: Number(openPoCount.rows[0].total),
    pending_budget_approvals_count: Number(pendingBudgetApprovals.rows[0].total),
    overdue_deliveries_count: Number(overdueDeliveries.rows[0].total),
    open_po_value: Number(openPoValue.rows[0].total),
    po_status_breakdown: poStatusBreakdown.rows.map((r) => ({ status: r.status, count: Number(r.total) })),
    budget_utilization: budgetUtilization.rows.map((r) => ({ department: r.department, allocated: Number(r.allocated), utilized: Number(r.utilized) })),
    top_suppliers: topSuppliers.rows.map((r) => ({ supplier_name: r.supplier_name, po_count: Number(r.po_count), total_value: Number(r.total_value) })),
    pending_vendor_approvals_count: Number(pendingVendorApprovals.rows[0].total),
    recent_purchase_orders: recentPos.rows,
  });
}));

router.get('/sales-summary', asyncHandler(async (req, res) => {
  const [
    openEnquiriesCount, pendingQuotationCount, confirmedThisMonth, openSoValue,
    enquiryPipeline, soStatusBreakdown, topCustomers, awaitingDispatch, recentEnquiries,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM enquiries WHERE status != 'ORDER_CONFIRMED'`),
    pool.query(`SELECT COUNT(*) AS total FROM enquiries WHERE status = 'NEW_ENQUIRY'`),
    pool.query(
      `SELECT COUNT(*) AS total FROM sales_orders
       WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`
    ),
    pool.query(`SELECT COALESCE(SUM(balance_amount), 0) AS total FROM sales_orders WHERE status != 'DELIVERED'`),
    pool.query(`SELECT status, COUNT(*) AS total FROM enquiries GROUP BY status`),
    pool.query(`SELECT status, COUNT(*) AS total FROM sales_orders GROUP BY status`),
    pool.query(
      `SELECT e.customer_name, COUNT(so.id) AS order_count, COALESCE(SUM(so.approved_price), 0) AS total_value
       FROM sales_orders so JOIN enquiries e ON e.id = so.enquiry_id
       GROUP BY e.customer_name ORDER BY total_value DESC LIMIT 5`
    ),
    pool.query(`SELECT COUNT(*) AS total FROM sales_orders WHERE status = 'READY_FOR_DISPATCH'`),
    pool.query(
      `SELECT enquiry_number, customer_name, status, created_at
       FROM enquiries ORDER BY created_at DESC LIMIT 5`
    ),
  ]);

  res.json({
    open_enquiries_count: Number(openEnquiriesCount.rows[0].total),
    pending_quotation_count: Number(pendingQuotationCount.rows[0].total),
    confirmed_orders_this_month: Number(confirmedThisMonth.rows[0].total),
    open_so_value: Number(openSoValue.rows[0].total),
    enquiry_pipeline: enquiryPipeline.rows.map((r) => ({ status: r.status, count: Number(r.total) })),
    so_status_breakdown: soStatusBreakdown.rows.map((r) => ({ status: r.status, count: Number(r.total) })),
    top_customers: topCustomers.rows.map((r) => ({ customer_name: r.customer_name, order_count: Number(r.order_count), total_value: Number(r.total_value) })),
    awaiting_dispatch_count: Number(awaitingDispatch.rows[0].total),
    recent_enquiries: recentEnquiries.rows,
  });
}));

export default router;
