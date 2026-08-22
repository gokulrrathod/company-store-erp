import { pool } from './pool.js';

const MIGRATIONS = [
  {
    name: '001_mr_forward_to_purchase_and_po_link',
    sql: `
      ALTER TABLE material_requests DROP CONSTRAINT IF EXISTS material_requests_status_check;
      ALTER TABLE material_requests ADD CONSTRAINT material_requests_status_check
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'FORWARDED_TO_PURCHASE', 'PO_RAISED'));
      ALTER TABLE po_lines ADD COLUMN IF NOT EXISTS mr_id INTEGER REFERENCES material_requests(id);
      CREATE INDEX IF NOT EXISTS idx_po_lines_mr ON po_lines(mr_id);
    `,
  },
  {
    name: '002_widen_material_requests_status',
    sql: `
      ALTER TABLE material_requests ALTER COLUMN status TYPE VARCHAR(30);
    `,
  },
  {
    name: '003_item_batches_fifo_fefo',
    sql: `
      CREATE TABLE IF NOT EXISTS item_batches (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES items(id),
        batch_number VARCHAR(100),
        expiry_date DATE,
        quantity_received NUMERIC(12,2) NOT NULL CHECK (quantity_received > 0),
        quantity_remaining NUMERIC(12,2) NOT NULL CHECK (quantity_remaining >= 0),
        source VARCHAR(20) NOT NULL CHECK (source IN ('OPENING', 'GRN', 'ADJUSTMENT')),
        grn_id INTEGER REFERENCES material_receipts(id),
        received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_item_batches_item ON item_batches(item_id);
      CREATE INDEX IF NOT EXISTS idx_item_batches_fefo ON item_batches(item_id, expiry_date, received_at);

      INSERT INTO item_batches (item_id, batch_number, expiry_date, quantity_received, quantity_remaining, source, received_at)
      SELECT id, 'OPENING', NULL, quantity, quantity, 'OPENING', created_at
      FROM items
      WHERE quantity > 0;
    `,
  },
];

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(200) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    for (const migration of MIGRATIONS) {
      const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [migration.name]);
      if (rows.length) continue;
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migration.name]);
        await client.query('COMMIT');
        console.log(`Migration applied: ${migration.name}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    client.release();
  }
}
