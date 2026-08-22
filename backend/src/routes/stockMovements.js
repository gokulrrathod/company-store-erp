import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { stockMovementSchema } from '../validation/schemas.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { addBatch, consumeStock, describeConsumption } from '../services/stock.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.*, i.name AS item_name, i.code AS item_code
     FROM stock_movements m JOIN items i ON i.id = m.item_id
     ORDER BY m.created_at DESC LIMIT 100`
  );
  res.json(rows);
}));

router.post('/', validate(stockMovementSchema), asyncHandler(async (req, res) => {
  const { item_id, type, quantity, reference, remarks } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existingRows } = await client.query(`SELECT id FROM items WHERE id = $1 FOR UPDATE`, [item_id]);
    if (!existingRows.length) throw new Error('Item not found');

    let movementRemarks = remarks;
    if (type === 'IN') {
      await client.query(`UPDATE items SET quantity = quantity + $1 WHERE id = $2`, [quantity, item_id]);
      await addBatch(client, { itemId: item_id, batchNumber: reference || 'ADJUSTMENT', quantity, source: 'ADJUSTMENT' });
    } else {
      const consumed = await consumeStock(client, item_id, quantity);
      movementRemarks = `${remarks || ''}${remarks ? ' — ' : ''}${describeConsumption(consumed)}`.trim();
    }

    const { rows: itemRows } = await client.query(`SELECT * FROM items WHERE id = $1`, [item_id]);
    const { rows } = await client.query(
      `INSERT INTO stock_movements (item_id, type, quantity, reference, remarks)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [item_id, type, quantity, reference, movementRemarks]
    );
    await client.query('COMMIT');
    res.status(201).json({ movement: rows[0], item: itemRows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

export default router;
