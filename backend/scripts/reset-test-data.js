// Resets the database to a clean baseline for a fresh walkthrough/test.
//
// Run from the "backend" directory (so it can use the already-installed
// `pg` package) via Railway, which injects DATABASE_URL for you:
//
//   railway run --service backend node scripts/reset-test-data.js
//
// What it does:
//   1. Wipes every table (all transactional data AND master data) in one
//      transaction, restarting every id sequence from 1.
//   2. Re-inserts the baseline master data from db/seed.sql (item catalog,
//      demo users, suppliers, budgets, one sample PO, etc.)
//   3. Re-creates the "OPENING" item_batches rows the FIFO/FEFO issuance
//      logic depends on (normally created once by backend migration 003,
//      which won't re-run since it's already marked applied).
//
// Safe to run: everything happens inside a single BEGIN/COMMIT. If
// anything fails partway through, Postgres rolls back automatically and
// the database is left exactly as it was before you ran this.
//
// It does NOT touch schema_migrations, so the backend's own migration
// history is untouched and nothing re-runs or breaks on next deploy.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbDir = join(__dirname, '..', '..', 'db');

const truncateSql = `
  TRUNCATE TABLE
    categories, items, users, suppliers, budgets,
    stock_movements, material_requests, purchase_orders, po_lines,
    material_receipts, receipt_lines, item_batches, rejected_materials,
    housekeeping_logs, safety_logs, enquiries, sales_orders,
    drawings, design_input_sheets, design_calculations, bom_lines,
    engineering_change_notices, ecn_affected_drawings, drawing_revisions,
    production_plans, production_schedules, stage_inspections, rework_rejections,
    daily_production_entries, machines, labour, machine_allocations,
    manpower_allocations, space_allocations, projects, daily_progress_reports,
    measurement_book_entries, ra_bills, reconciliations, rate_charts,
    civil_executions, boq_lines, quantity_sheet_lines, rate_analysis_lines,
    vehicles, insurance_records, invoices, payments, invoice_lines, attachments,
    audit_log
  RESTART IDENTITY CASCADE;
`;

const openingBatchesSql = `
  INSERT INTO item_batches (item_id, batch_number, expiry_date, quantity_received, quantity_remaining, source, received_at)
  SELECT id, 'OPENING', NULL, quantity, quantity, 'OPENING', created_at
  FROM items
  WHERE quantity > 0;
`;

async function main() {
  const seedSql = readFileSync(join(dbDir, 'seed.sql'), 'utf8');

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(truncateSql);
    await client.query(seedSql);
    await client.query(openingBatchesSql);
    await client.query('COMMIT');
    console.log('Database reset to clean baseline — ready for a fresh test.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reset failed, rolled back. No changes were made.');
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
