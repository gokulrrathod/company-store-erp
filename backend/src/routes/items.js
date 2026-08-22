import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { itemCreateSchema, itemUpdateSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { addBatch } from '../services/stock.js';

const router = Router();
router.use(requireAuth);

const SELECT_ITEM_FIELDS = `
  i.*,
  c.name AS category_name,
  (i.quantity - i.reserved_stock - i.damaged_stock) AS available_stock,
  i.quantity AS closing_balance,
  (i.quantity * i.unit_rate) AS valuation
`;

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${SELECT_ITEM_FIELDS}
     FROM items i LEFT JOIN categories c ON c.id = i.category_id
     ORDER BY i.name`
  );
  res.json(rows);
}));

router.get('/low-stock', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${SELECT_ITEM_FIELDS}
     FROM items i LEFT JOIN categories c ON c.id = i.category_id
     WHERE i.quantity <= i.reorder_level
     ORDER BY i.quantity ASC`
  );
  res.json(rows);
}));

// FIFO/FEFO order — the same ordering consumeStock() draws from (Requirements-Store.md §2, AC3)
router.get('/:id/batches', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM item_batches WHERE item_id = $1 AND quantity_remaining > 0
     ORDER BY expiry_date ASC NULLS LAST, received_at ASC, id ASC`,
    [req.params.id]
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${SELECT_ITEM_FIELDS} FROM items i LEFT JOIN categories c ON c.id = i.category_id WHERE i.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Item not found' });
  res.json(rows[0]);
}));

router.post('/', requireRole(ROLES.STORE_MANAGER, ROLES.STORE_EXECUTIVE, ROLES.ADMIN), validate(itemCreateSchema), asyncHandler(async (req, res, next) => {
  const {
    code, name, category_id, unit, quantity, reorder_level,
    minimum_stock, maximum_stock, warehouse, rack_number, bin_number, storage_location, unit_rate,
  } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO items (code, name, category_id, unit, quantity, reorder_level,
         minimum_stock, maximum_stock, warehouse, rack_number, bin_number, storage_location, unit_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [code, name, category_id ?? null, unit, quantity ?? 0, reorder_level ?? 0,
        minimum_stock ?? 0, maximum_stock ?? null, warehouse ?? null, rack_number ?? null, bin_number ?? null, storage_location ?? null, unit_rate ?? 0]
    );
    if (Number(quantity) > 0) {
      await addBatch(client, { itemId: rows[0].id, batchNumber: 'OPENING', quantity, source: 'OPENING' });
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Item code already exists', fieldErrors: { code: 'This code is already in use' } });
    }
    next(err);
  } finally {
    client.release();
  }
}));

router.put('/:id', requireRole(ROLES.STORE_MANAGER, ROLES.STORE_EXECUTIVE, ROLES.ADMIN), validate(itemUpdateSchema), asyncHandler(async (req, res, next) => {
  const {
    code, name, category_id, unit, reorder_level,
    minimum_stock, maximum_stock, warehouse, rack_number, bin_number, storage_location, unit_rate,
  } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE items SET code = $1, name = $2, category_id = $3, unit = $4, reorder_level = $5,
         minimum_stock = $6, maximum_stock = $7, warehouse = $8, rack_number = $9,
         bin_number = $10, storage_location = $11, unit_rate = $12
       WHERE id = $13 RETURNING *`,
      [code, name, category_id ?? null, unit, reorder_level ?? 0,
        minimum_stock ?? 0, maximum_stock ?? null, warehouse ?? null, rack_number ?? null, bin_number ?? null, storage_location ?? null, unit_rate ?? 0,
        req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Item code already exists', fieldErrors: { code: 'This code is already in use' } });
    }
    next(err);
  }
}));

export default router;
