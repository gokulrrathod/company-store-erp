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
  {
    name: '004_audit_trail',
    sql: `
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        record_id VARCHAR(50) NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_by VARCHAR(100) NOT NULL DEFAULT 'system',
        changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);

      CREATE OR REPLACE FUNCTION audit_log_row_changes() RETURNS TRIGGER AS $body$
      DECLARE
        old_data jsonb := to_jsonb(OLD);
        new_data jsonb := to_jsonb(NEW);
        key text;
        old_val text;
        new_val text;
        actor text := NULLIF(current_setting('app.current_user_name', true), '');
      BEGIN
        FOR key IN SELECT jsonb_object_keys(new_data) LOOP
          old_val := old_data ->> key;
          new_val := new_data ->> key;
          IF old_val IS DISTINCT FROM new_val THEN
            INSERT INTO audit_log (table_name, record_id, field_name, old_value, new_value, changed_by)
            VALUES (TG_TABLE_NAME, NEW.id::text, key, old_val, new_val, COALESCE(actor, 'system'));
          END IF;
        END LOOP;
        RETURN NEW;
      END;
      $body$ LANGUAGE plpgsql;

      DO $trig$
      DECLARE
        t text;
      BEGIN
        FOREACH t IN ARRAY ARRAY[
          'items', 'item_batches', 'suppliers', 'purchase_orders', 'receipt_lines',
          'material_receipts', 'material_requests', 'enquiries', 'sales_orders',
          'drawings', 'engineering_change_notices', 'production_plans',
          'production_schedules', 'projects', 'reconciliations', 'vehicles', 'invoices'
        ]
        LOOP
          EXECUTE format(
            'DROP TRIGGER IF EXISTS audit_%1$s ON %1$s; CREATE TRIGGER audit_%1$s AFTER UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION audit_log_row_changes();',
            t
          );
        END LOOP;
      END;
      $trig$;
    `,
  },
  {
    name: '005_itemize_invoices',
    sql: `
      CREATE TABLE IF NOT EXISTS invoice_lines (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES items(id),
        description VARCHAR(300) NOT NULL,
        hsn_sac_code VARCHAR(20),
        quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
        rate NUMERIC(12,2) NOT NULL CHECK (rate >= 0),
        amount NUMERIC(14,2) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);

      INSERT INTO invoice_lines (invoice_id, description, quantity, rate, amount)
      SELECT id, 'Migrated invoice (booked before line-item tracking)', 1, taxable_amount, taxable_amount
      FROM invoices
      WHERE NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_lines.invoice_id = invoices.id);

      DROP TRIGGER IF EXISTS audit_invoice_lines ON invoice_lines;
      CREATE TRIGGER audit_invoice_lines AFTER UPDATE ON invoice_lines FOR EACH ROW EXECUTE FUNCTION audit_log_row_changes();
    `,
  },
  {
    name: '006_attachments',
    sql: `
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(150) NOT NULL,
        size_bytes INTEGER NOT NULL,
        file_data BYTEA NOT NULL,
        uploaded_by VARCHAR(100) NOT NULL,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
    `,
  },
  {
    name: '007_design_input_sheet',
    sql: `
      CREATE TABLE IF NOT EXISTS design_input_sheets (
        id SERIAL PRIMARY KEY,
        drawing_id INTEGER NOT NULL UNIQUE REFERENCES drawings(id),
        customer_specification TEXT,
        process_data TEXT,
        applicable_standards TEXT,
        material_specification TEXT,
        corrosion_allowance NUMERIC(10,2),
        design_pressure NUMERIC(10,2),
        previous_reference_drawing_id INTEGER REFERENCES drawings(id),
        design_notes TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'COMPLETED')),
        prepared_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_design_input_sheets_drawing ON design_input_sheets(drawing_id);

      DROP TRIGGER IF EXISTS audit_design_input_sheets ON design_input_sheets;
      CREATE TRIGGER audit_design_input_sheets AFTER UPDATE ON design_input_sheets FOR EACH ROW EXECUTE FUNCTION audit_log_row_changes();
    `,
  },
  {
    name: '008_design_calculations',
    sql: `
      CREATE TABLE IF NOT EXISTS design_calculations (
        id SERIAL PRIMARY KEY,
        calculation_number VARCHAR(50) NOT NULL UNIQUE,
        drawing_id INTEGER NOT NULL REFERENCES drawings(id),
        design_engineer VARCHAR(100) NOT NULL,
        calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
        formula_reference VARCHAR(300),
        safety_factor NUMERIC(6,2),
        load_calculation TEXT,
        shaft_calculation TEXT,
        bearing_calculation TEXT,
        motor_calculation TEXT,
        gearbox_calculation TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_design_calculations_drawing ON design_calculations(drawing_id);
    `,
  },
  {
    name: '009_drawing_revisions',
    sql: `
      CREATE TABLE IF NOT EXISTS drawing_revisions (
        id SERIAL PRIMARY KEY,
        drawing_id INTEGER NOT NULL REFERENCES drawings(id),
        revision_number VARCHAR(20) NOT NULL,
        revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
        revision_description TEXT,
        prepared_by VARCHAR(100),
        checked_by VARCHAR(100),
        approved_by VARCHAR(100),
        ecn_id INTEGER REFERENCES engineering_change_notices(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_drawing_revisions_drawing ON drawing_revisions(drawing_id);

      INSERT INTO drawing_revisions (drawing_id, revision_number, revision_date, revision_description, prepared_by, checked_by, approved_by)
      SELECT id, revision, created_at::date, 'Backfilled - existing revision at time of document-control rollout',
             prepared_by,
             CASE WHEN status NOT IN ('DRAFT', 'UNDER_CHECKING', 'REWORK') THEN checker ELSE NULL END,
             CASE WHEN status IN ('DESIGN_HEAD_APPROVED', 'AWAITING_CUSTOMER_APPROVAL', 'CUSTOMER_APPROVED', 'RELEASED') THEN design_head ELSE NULL END
      FROM drawings
      WHERE NOT EXISTS (SELECT 1 FROM drawing_revisions WHERE drawing_revisions.drawing_id = drawings.id);
    `,
  },
  {
    name: '010_daily_production_entries',
    sql: `
      CREATE TABLE IF NOT EXISTS daily_production_entries (
        id SERIAL PRIMARY KEY,
        schedule_id INTEGER NOT NULL REFERENCES production_schedules(id),
        entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
        shift VARCHAR(50) NOT NULL,
        engineer VARCHAR(100) NOT NULL,
        planned_qty NUMERIC(12,2) NOT NULL CHECK (planned_qty > 0),
        actual_qty NUMERIC(12,2) NOT NULL CHECK (actual_qty >= 0),
        balance_qty NUMERIC(12,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_daily_production_entries_schedule ON daily_production_entries(schedule_id);
    `,
  },
  {
    name: '011_resource_allocation',
    sql: `
      CREATE TABLE IF NOT EXISTS machines (
        id SERIAL PRIMARY KEY,
        machine_name VARCHAR(200) NOT NULL,
        machine_number VARCHAR(50) NOT NULL UNIQUE,
        machine_type VARCHAR(100),
        availability_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'ALLOCATED', 'MAINTENANCE')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS labour (
        id SERIAL PRIMARY KEY,
        employee_name VARCHAR(200) NOT NULL,
        department VARCHAR(100) NOT NULL,
        skill VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS machine_allocations (
        id SERIAL PRIMARY KEY,
        machine_id INTEGER NOT NULL REFERENCES machines(id),
        project_reference VARCHAR(200) NOT NULL,
        allocated_from DATE NOT NULL,
        allocated_to DATE,
        allocated_by VARCHAR(100) NOT NULL,
        released_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS manpower_allocations (
        id SERIAL PRIMARY KEY,
        labour_id INTEGER NOT NULL REFERENCES labour(id),
        project_reference VARCHAR(200) NOT NULL,
        shift VARCHAR(50) NOT NULL,
        assigned_job VARCHAR(200) NOT NULL,
        allocated_from DATE NOT NULL,
        allocated_to DATE,
        allocated_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS space_allocations (
        id SERIAL PRIMARY KEY,
        space_name VARCHAR(30) NOT NULL CHECK (space_name IN ('FABRICATION_BAY', 'PAINTING_BAY', 'ASSEMBLY_AREA')),
        project_reference VARCHAR(200) NOT NULL,
        allocated_from DATE NOT NULL,
        allocated_to DATE,
        allocated_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_machine_allocations_machine ON machine_allocations(machine_id);
      CREATE INDEX IF NOT EXISTS idx_manpower_allocations_labour ON manpower_allocations(labour_id);

      DROP TRIGGER IF EXISTS audit_machines ON machines;
      CREATE TRIGGER audit_machines AFTER UPDATE ON machines FOR EACH ROW EXECUTE FUNCTION audit_log_row_changes();
    `,
  },
  {
    name: '012_civil_execution',
    sql: `
      CREATE TABLE IF NOT EXISTS rate_charts (
        id SERIAL PRIMARY KEY,
        work_description VARCHAR(300) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        standard_rate NUMERIC(12,2) NOT NULL CHECK (standard_rate > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS civil_executions (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id),
        estimated_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS boq_lines (
        id SERIAL PRIMARY KEY,
        civil_execution_id INTEGER NOT NULL REFERENCES civil_executions(id),
        item_no VARCHAR(20) NOT NULL,
        description VARCHAR(300) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
        rate_chart_id INTEGER REFERENCES rate_charts(id),
        rate NUMERIC(12,2) NOT NULL CHECK (rate > 0),
        amount NUMERIC(14,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS quantity_sheet_lines (
        id SERIAL PRIMARY KEY,
        civil_execution_id INTEGER NOT NULL REFERENCES civil_executions(id),
        description VARCHAR(300) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
        remarks VARCHAR(500),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS rate_analysis_lines (
        id SERIAL PRIMARY KEY,
        civil_execution_id INTEGER NOT NULL REFERENCES civil_executions(id),
        work_item VARCHAR(300) NOT NULL,
        material_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
        labour_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
        machinery_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
        overhead_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
        computed_rate NUMERIC(12,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_boq_lines_civil_execution ON boq_lines(civil_execution_id);
      CREATE INDEX IF NOT EXISTS idx_quantity_sheet_lines_civil_execution ON quantity_sheet_lines(civil_execution_id);
      CREATE INDEX IF NOT EXISTS idx_rate_analysis_lines_civil_execution ON rate_analysis_lines(civil_execution_id);
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
