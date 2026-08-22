import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { purchaseOrderSchema } from '../validation/schemas.js';
import { ROLES } from '../config/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

async function nextPoNumber(client) {
  const year = new Date().getFullYear();
  const { rows } = await client.query(
    `SELECT po_number FROM purchase_orders WHERE po_number LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`PO-${year}-%`]
  );
  const lastSeq = rows.length ? Number(rows[0].po_number.split('-').pop()) : 0;
  return `PO-${year}-${String(lastSeq + 1).padStart(4, '0')}`;
}

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT po.*, s.name AS supplier_name
     FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
     ORDER BY po.created_at DESC`
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows: poRows } = await pool.query(
    `SELECT po.*, s.name AS supplier_name FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id WHERE po.id = $1`,
    [req.params.id]
  );
  if (!poRows.length) return res.status(404).json({ error: 'Purchase order not found' });

  const { rows: lines } = await pool.query(
    `SELECT pl.*, i.code AS item_code, i.name AS item_name, mr.requisition_number
     FROM po_lines pl
     JOIN items i ON i.id = pl.item_id
     LEFT JOIN material_requests mr ON mr.id = pl.mr_id
     WHERE pl.po_id = $1`,
    [req.params.id]
  );
  res.json({ ...poRows[0], lines });
}));

// Budget must be verified before/at PO creation; exceeding it escalates to Finance rather than blocking
// (Requirements-Purchase.md §1 Budget rule, §11 AC2)
router.post('/', requireRole(ROLES.PURCHASE, ROLES.ADMIN), validate(purchaseOrderSchema), asyncHandler(async (req, res) => {
  const { supplier_id, department, lines } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const po_number = await nextPoNumber(client);
    let total_value = 0;
    for (const line of lines) {
      const { rows: itemRows } = await client.query(`SELECT unit_rate FROM items WHERE id = $1`, [line.item_id]);
      if (!itemRows.length) throw new Error('Item not found');
      total_value += Number(itemRows[0].unit_rate) * Number(line.quantity_ordered);

      if (line.mr_id) {
        const { rows: mrRows } = await client.query(
          `SELECT status FROM material_requests WHERE id = $1 FOR UPDATE`,
          [line.mr_id]
        );
        if (!mrRows.length) throw new Error('Linked material request not found');
        if (mrRows[0].status !== 'FORWARDED_TO_PURCHASE') {
          throw new Error('Linked material request is not awaiting purchase');
        }
      }
    }

    const { rows: budgetRows } = await client.query(
      `SELECT * FROM budgets WHERE department = $1 FOR UPDATE`,
      [department]
    );
    let budget_status = 'WITHIN_BUDGET';
    if (budgetRows.length) {
      const budget = budgetRows[0];
      const wouldExceed = Number(budget.utilized_amount) + total_value > Number(budget.allocated_amount);
      if (wouldExceed) {
        budget_status = 'PENDING_FINANCE_APPROVAL';
      } else {
        await client.query(`UPDATE budgets SET utilized_amount = utilized_amount + $1 WHERE department = $2`, [total_value, department]);
      }
    }

    const { rows } = await client.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, department, total_value, budget_status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [po_number, supplier_id, department, total_value, budget_status, req.user.name]
    );
    const po = rows[0];
    for (const line of lines) {
      await client.query(
        `INSERT INTO po_lines (po_id, item_id, quantity_ordered, mr_id) VALUES ($1, $2, $3, $4)`,
        [po.id, line.item_id, line.quantity_ordered, line.mr_id || null]
      );
      if (line.mr_id) {
        await client.query(`UPDATE material_requests SET status = 'PO_RAISED' WHERE id = $1`, [line.mr_id]);
      }
    }
    await client.query('COMMIT');
    res.status(201).json(po);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(400).json({ error: 'PO number already exists', fieldErrors: { po_number: 'This PO number is already in use' } });
    }
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

// Finance Head approves a PO that exceeded its department's budget
router.patch('/:id/finance-approve', requireRole(ROLES.FINANCE, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: poRows } = await client.query(`SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE`, [req.params.id]);
    if (!poRows.length) throw new Error('Purchase order not found');
    const po = poRows[0];
    if (po.budget_status !== 'PENDING_FINANCE_APPROVAL') throw new Error('This PO is not pending finance approval');

    if (po.department) {
      await client.query(`UPDATE budgets SET utilized_amount = utilized_amount + $1 WHERE department = $2`, [po.total_value, po.department]);
    }
    const { rows } = await client.query(
      `UPDATE purchase_orders SET budget_status = 'FINANCE_APPROVED', finance_approved_by = $1, finance_approved_at = now()
       WHERE id = $2 RETURNING *`,
      [req.user.name, req.params.id]
    );
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}));

export default router;
