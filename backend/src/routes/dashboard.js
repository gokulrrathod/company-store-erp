import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', async (req, res) => {
  const [stockVal, skuCount, lowStock, rejected, pendingInspection, pendingRequests, recentReceipts] = await Promise.all([
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
  ]);

  res.json({
    total_stock_value: Number(stockVal.rows[0].total),
    total_skus: Number(skuCount.rows[0].total),
    low_stock_count: Number(lowStock.rows[0].total),
    rejected_count: Number(rejected.rows[0].total),
    pending_inspection_count: Number(pendingInspection.rows[0].total),
    pending_requests_count: Number(pendingRequests.rows[0].total),
    recent_receipts: recentReceipts.rows,
  });
});

export default router;
