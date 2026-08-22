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
