-- Store POC schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
    reserved_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
    damaged_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
    rejected_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
    minimum_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
    maximum_stock NUMERIC(12,2),
    reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0,
    warehouse VARCHAR(100),
    rack_number VARCHAR(50),
    bin_number VARCHAR(50),
    storage_location VARCHAR(200),
    unit_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id),
    type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    reference VARCHAR(200),
    remarks VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_requests (
    id SERIAL PRIMARY KEY,
    requisition_number VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items(id),
    requested_by VARCHAR(100) NOT NULL,
    quantity_requested NUMERIC(12,2) NOT NULL CHECK (quantity_requested > 0),
    quantity_issued NUMERIC(12,2),
    balance_stock NUMERIC(12,2),
    purpose VARCHAR(200),
    issue_date TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN
        ('PENDING', 'APPROVED', 'REJECTED', 'FORWARDED_TO_PURCHASE', 'PO_RAISED')),
    remarks VARCHAR(500),
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_item ON material_requests(item_id);

-- ===== User Roles (SOP Module 8) =====
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN
        ('ADMIN', 'STORE_MANAGER', 'STORE_EXECUTIVE', 'PURCHASE', 'QUALITY', 'PRODUCTION',
         'SALES', 'ACCOUNTS', 'DISPATCH', 'MANAGEMENT', 'FINANCE',
         'DESIGN_ENGINEER', 'CHECKER', 'DESIGN_HEAD',
         'PRODUCTION_HEAD', 'SHOP_FLOOR_ENGINEER',
         'PROJECT_MANAGER', 'SITE_ENGINEER', 'TRANSPORT')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Vendor Master (shared, per Recommended Decision #2) — feeds SOP Module 1 & 9, Purchase §1 =====
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(30),
    email VARCHAR(150),
    vendor_type VARCHAR(20) NOT NULL DEFAULT 'MATERIAL_SUPPLIER' CHECK (vendor_type IN ('MATERIAL_SUPPLIER', 'SUBCONTRACTOR')),
    vendor_category VARCHAR(100),
    gst_number VARCHAR(20) UNIQUE,
    pan_number VARCHAR(15) UNIQUE,
    bank_account_details VARCHAR(300),
    vendor_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (vendor_status IN
        ('PENDING_VERIFICATION', 'PENDING_FINANCE_VERIFICATION', 'PENDING_MANAGEMENT_APPROVAL',
         'ACTIVE', 'REJECTED', 'INACTIVE', 'BLACKLISTED')),
    vendor_rating NUMERIC(3,2),
    purchase_verified_by VARCHAR(100),
    finance_verified_by VARCHAR(100),
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Budget (shared master, consumed by Civil/Project later) — Purchase §1 =====
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    department VARCHAR(100) NOT NULL UNIQUE,
    allocated_amount NUMERIC(14,2) NOT NULL CHECK (allocated_amount >= 0),
    utilized_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    department VARCHAR(100),
    total_value NUMERIC(14,2) NOT NULL DEFAULT 0,
    budget_status VARCHAR(30) NOT NULL DEFAULT 'WITHIN_BUDGET' CHECK (budget_status IN
        ('WITHIN_BUDGET', 'PENDING_FINANCE_APPROVAL', 'FINANCE_APPROVED')),
    finance_approved_by VARCHAR(100),
    finance_approved_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIALLY_RECEIVED', 'CLOSED', 'AMENDED')),
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    amendment_reason VARCHAR(500),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS po_lines (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id),
    quantity_ordered NUMERIC(12,2) NOT NULL CHECK (quantity_ordered > 0),
    mr_id INTEGER REFERENCES material_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_po_lines_mr ON po_lines(mr_id);

-- ===== Material Receiving & Inspection (SOP Module 1) =====
CREATE TABLE IF NOT EXISTS material_receipts (
    id SERIAL PRIMARY KEY,
    grn_number VARCHAR(50) NOT NULL UNIQUE,
    po_id INTEGER REFERENCES purchase_orders(id),
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    invoice_number VARCHAR(100),
    receiver_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_INSPECTION' CHECK (status IN
        ('PENDING_INSPECTION', 'INSPECTED', 'APPROVED', 'REJECTED')),
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipt_lines (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL REFERENCES material_receipts(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id),
    batch_number VARCHAR(100),
    expiry_date DATE,
    quantity_ordered NUMERIC(12,2),
    quantity_received NUMERIC(12,2) NOT NULL CHECK (quantity_received > 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    inspection_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (inspection_status IN
        ('PENDING', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED')),
    quality_remarks VARCHAR(500),
    damage_details VARCHAR(500),
    qc_inspector VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_po_lines_po ON po_lines(po_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_receipt ON receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS idx_material_receipts_po ON material_receipts(po_id);

-- Per-batch stock ledger driving FIFO/FEFO issuance (Requirements-Store.md §2, AC3)
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

-- ===== Rejected Material (SOP Module 5) =====
CREATE TABLE IF NOT EXISTS rejected_materials (
    id SERIAL PRIMARY KEY,
    rejection_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id INTEGER REFERENCES suppliers(id),
    item_id INTEGER NOT NULL REFERENCES items(id),
    batch_number VARCHAR(100),
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    reason VARCHAR(500) NOT NULL,
    qc_remarks VARCHAR(500),
    action_taken VARCHAR(30) NOT NULL CHECK (action_taken IN
        ('RETURN_TO_SUPPLIER', 'SCRAP', 'REWORK', 'REPLACEMENT')),
    approval VARCHAR(100),
    disposal_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Store Housekeeping (SOP Module 6) =====
CREATE TABLE IF NOT EXISTS housekeeping_logs (
    id SERIAL PRIMARY KEY,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    activity VARCHAR(200) NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    verified_by VARCHAR(100),
    remarks VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Safety & Compliance (SOP Module 7) =====
CREATE TABLE IF NOT EXISTS safety_logs (
    id SERIAL PRIMARY KEY,
    incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(100) NOT NULL,
    zone VARCHAR(150),
    reported_by VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    action_taken VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rejected_materials_item ON rejected_materials(item_id);

-- =====================================================================
-- SALES DEPARTMENT (per Requirements-Sales.md / 3 Sales Department SOP)
-- =====================================================================

CREATE TABLE IF NOT EXISTS enquiries (
    id SERIAL PRIMARY KEY,
    enquiry_number VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(200) NOT NULL,
    mobile_number VARCHAR(30) NOT NULL,
    company_name VARCHAR(200),
    site_address VARCHAR(500),
    product_requirement VARCHAR(500) NOT NULL,
    enquiry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sales_representative VARCHAR(100) NOT NULL,
    quotation_amount NUMERIC(14,2),
    quotation_date DATE,
    negotiated_price NUMERIC(14,2),
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount_reason VARCHAR(300),
    management_approval_status VARCHAR(20) CHECK (management_approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    management_approved_by VARCHAR(100),
    management_approved_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'NEW_ENQUIRY' CHECK (status IN
        ('NEW_ENQUIRY', 'QUOTATION_SENT', 'WAITING_FOR_CUSTOMER', 'UNDER_NEGOTIATION',
         'PRICE_APPROVED', 'ORDER_CONFIRMED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales Order is the shared entity Accounts/Production/Dispatch all read directly (Recommended Decision #4)
CREATE TABLE IF NOT EXISTS sales_orders (
    id SERIAL PRIMARY KEY,
    so_number VARCHAR(50) NOT NULL UNIQUE,
    enquiry_id INTEGER NOT NULL REFERENCES enquiries(id),
    dc_number VARCHAR(50) UNIQUE,
    approved_price NUMERIC(14,2) NOT NULL,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount_reason VARCHAR(300),
    management_approval_status VARCHAR(20) CHECK (management_approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    management_approved_by VARCHAR(100),
    management_approved_at TIMESTAMPTZ,
    payment_terms VARCHAR(20) NOT NULL CHECK (payment_terms IN ('ADVANCE_50', 'FULL_100')),
    advance_payment NUMERIC(14,2) NOT NULL DEFAULT 0,
    balance_amount NUMERIC(14,2) NOT NULL,
    expected_dispatch_date DATE,
    customer_notes VARCHAR(500),
    production_status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED' CHECK (production_status IN
        ('NOT_STARTED', 'STARTED', 'IN_PROGRESS', 'COMPLETED')),
    material_measured BOOLEAN NOT NULL DEFAULT FALSE,
    quality_checked BOOLEAN NOT NULL DEFAULT FALSE,
    vehicle_number VARCHAR(30),
    driver_name VARCHAR(100),
    loading_person VARCHAR(100),
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'ORDER_CONFIRMED' CHECK (status IN
        ('ORDER_CONFIRMED', 'IN_PRODUCTION', 'PRODUCTION_COMPLETED', 'READY_FOR_DISPATCH',
         'DISPATCHED', 'DELIVERED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_enquiry ON sales_orders(enquiry_id);

-- =====================================================================
-- DESIGN DEPARTMENT (per Requirements-Design.md / 5 Design Department SOP)
-- Reference implementation of the Approval Engine's "sequential, blocking
-- sign-off" pattern: Design Engineer -> Checker -> Design Head -> Customer -> Released.
-- =====================================================================

CREATE TABLE IF NOT EXISTS drawings (
    id SERIAL PRIMARY KEY,
    drawing_number VARCHAR(50) NOT NULL UNIQUE,
    drawing_title VARCHAR(200) NOT NULL,
    project_reference VARCHAR(200),
    equipment_name VARCHAR(200) NOT NULL,
    revision VARCHAR(20) NOT NULL DEFAULT 'A',
    scale VARCHAR(30),
    material VARCHAR(100),
    weight NUMERIC(10,2),
    requires_customer_approval BOOLEAN NOT NULL DEFAULT FALSE,
    prepared_by VARCHAR(100) NOT NULL,
    checker VARCHAR(100),
    design_head VARCHAR(100),
    checklist JSONB NOT NULL DEFAULT '{}',
    checker_remarks VARCHAR(500),
    customer_approved_by VARCHAR(100),
    customer_approved_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN
        ('DRAFT', 'UNDER_CHECKING', 'REWORK', 'CHECKER_APPROVED', 'DESIGN_HEAD_APPROVED',
         'AWAITING_CUSTOMER_APPROVAL', 'CUSTOMER_APPROVED', 'RELEASED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Design Input Sheet: the documented basis (customer spec, standards, process
-- data) a Design Calculation must trace back to (Requirements-Design.md §1/§3)
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

-- Design Calculation: multiple numbered calc records per drawing, gated on a
-- Completed Design Input Sheet (Requirements-Design.md §3 step 4)
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

-- BOM lines feed Production's BOM consumption and Store's MR chain (shared entity, read cross-module)
CREATE TABLE IF NOT EXISTS bom_lines (
    id SERIAL PRIMARY KEY,
    drawing_id INTEGER NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    item_no VARCHAR(50) NOT NULL,
    part_number VARCHAR(100),
    description VARCHAR(300) NOT NULL,
    material VARCHAR(100),
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    weight NUMERIC(10,2)
);

-- Engineering Change Notices — revisions are append-only, never overwrite a prior one
-- Affected Drawings is a list (Requirements-Design.md §1: "Affected Drawings | FK[] -> Drawing"),
-- so previous/new revision live per-drawing in ecn_affected_drawings below, not on this header.
CREATE TABLE IF NOT EXISTS engineering_change_notices (
    id SERIAL PRIMARY KEY,
    ecn_number VARCHAR(50) NOT NULL UNIQUE,
    reason_for_change VARCHAR(500) NOT NULL,
    requested_by VARCHAR(100) NOT NULL,
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    remarks VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ecn_affected_drawings (
    id SERIAL PRIMARY KEY,
    ecn_id INTEGER NOT NULL REFERENCES engineering_change_notices(id),
    drawing_id INTEGER NOT NULL REFERENCES drawings(id),
    previous_revision VARCHAR(20) NOT NULL,
    new_revision VARCHAR(20) NOT NULL,
    UNIQUE (ecn_id, drawing_id)
);

CREATE INDEX IF NOT EXISTS idx_bom_lines_drawing ON bom_lines(drawing_id);
CREATE INDEX IF NOT EXISTS idx_ecn_affected_drawings_ecn ON ecn_affected_drawings(ecn_id);
CREATE INDEX IF NOT EXISTS idx_ecn_affected_drawings_drawing ON ecn_affected_drawings(drawing_id);

-- Document Control (§5): one row per revision, append-only - a new ECN creates a
-- new row here rather than overwriting drawings.revision's history
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

-- =====================================================================
-- PRODUCTION DEPARTMENT (per Requirements-Production.md / 7 Production Department SOP)
-- MRS reuses the canonical material_requests entity (Department = 'Production') — no separate table.
-- =====================================================================

CREATE TABLE IF NOT EXISTS production_plans (
    id SERIAL PRIMARY KEY,
    project_reference VARCHAR(200) NOT NULL,
    week_number VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    planned_quantity NUMERIC(12,2) NOT NULL CHECK (planned_quantity > 0),
    planned_completion_date DATE,
    production_engineer VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED')),
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shop-floor activity schedule under an approved plan
CREATE TABLE IF NOT EXISTS production_schedules (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
    equipment_name VARCHAR(200) NOT NULL,
    activity VARCHAR(100) NOT NULL,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    responsible_engineer VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN
        ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED')),
    delay_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Distinct from Store's GRN Inspection — this is in-process shop-floor QC, not goods receipt (see Requirements-Production.md §1 note)
CREATE TABLE IF NOT EXISTS stage_inspections (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES production_schedules(id) ON DELETE CASCADE,
    inspection_stage VARCHAR(30) NOT NULL CHECK (inspection_stage IN
        ('GAS_CUTTING', 'GRINDING', 'ROLLING', 'BENDING', 'FIT_UP', 'WELDING', 'FINISHING',
         'TRIAL_ASSEMBLY', 'BLASTING', 'PAINTING', 'FINAL_INSPECTION')),
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    inspector_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('OK', 'HOLD', 'REJECT')),
    remarks VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rework/Rejection entries roll up into the NCR Report
CREATE TABLE IF NOT EXISTS rework_rejections (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES production_schedules(id) ON DELETE CASCADE,
    part_name VARCHAR(200) NOT NULL,
    quantity_produced NUMERIC(12,2) NOT NULL DEFAULT 0,
    rework_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
    rejection_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
    reason VARCHAR(500) NOT NULL,
    corrective_action VARCHAR(500),
    responsible_engineer VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily Production Entry (Requirements-Production.md §1) — date/shift-level output against an activity
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

CREATE INDEX IF NOT EXISTS idx_production_schedules_plan ON production_schedules(plan_id);
CREATE INDEX IF NOT EXISTS idx_stage_inspections_schedule ON stage_inspections(schedule_id);
CREATE INDEX IF NOT EXISTS idx_rework_rejections_schedule ON rework_rejections(schedule_id);
CREATE INDEX IF NOT EXISTS idx_daily_production_entries_schedule ON daily_production_entries(schedule_id);

-- Resource Allocation (Requirements-Production.md §1) — Machinery/Labour are shared masters
-- (Recommended Decision #6), Space is a fixed set of bays so no separate master is needed
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

-- =====================================================================
-- PROJECT / CIVIL (merged module, per Recommended Decision #1)
-- Source: Requirements-ProjectCivil.md / 2 Civil Work SOP + 8 Project Department SOP
-- Company field separates VMG Baramati vs VMG Sugar LLP reporting without separate modules.
-- =====================================================================

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(200) NOT NULL,
    client_name VARCHAR(200) NOT NULL,
    site_location VARCHAR(300),
    company VARCHAR(50) NOT NULL DEFAULT 'VMG_BARAMATI' CHECK (company IN ('VMG_BARAMATI', 'VMG_SUGAR_LLP')),
    project_type VARCHAR(100),
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    project_value NUMERIC(14,2) NOT NULL DEFAULT 0,
    project_manager VARCHAR(100) NOT NULL,
    site_engineer VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNING' CHECK (status IN
        ('PLANNING', 'RUNNING', 'HOLD', 'COMPLETED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project dimension on MR/Budget/PO (Requirements-Purchase.md §1) — added here via ALTER since these
-- tables are defined earlier in this file, before the Project table exists
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'));
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS required_date DATE;
CREATE INDEX IF NOT EXISTS idx_material_requests_project ON material_requests(project_id);

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_department_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_department_only ON budgets(department) WHERE project_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_department_project ON budgets(department, project_id) WHERE project_id IS NOT NULL;

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project ON purchase_orders(project_id);

-- Daily Progress Report — plain web form for the demo (mobile offline sync is a real-ERP-only item, Recommended Decision #10)
CREATE TABLE IF NOT EXISTS daily_progress_reports (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    work_done VARCHAR(1000) NOT NULL,
    labour_count INTEGER NOT NULL DEFAULT 0,
    material_used VARCHAR(500),
    machinery_used VARCHAR(500),
    issues VARCHAR(500),
    submitted_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Measurement Book — RA Billing must trace back to an entry here, no free-standing bills (§5, AC3)
CREATE TABLE IF NOT EXISTS measurement_book_entries (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    description VARCHAR(300) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'unit',
    rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    measured_by VARCHAR(100) NOT NULL,
    measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ra_bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(50) NOT NULL UNIQUE,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    measurement_entry_id INTEGER NOT NULL REFERENCES measurement_book_entries(id),
    bill_type VARCHAR(20) NOT NULL CHECK (bill_type IN ('VENDOR', 'CLIENT')),
    party_name VARCHAR(200) NOT NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project cannot Close without both flags set (§5, AC5)
CREATE TABLE IF NOT EXISTS reconciliations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id),
    material_reconciliation_complete BOOLEAN NOT NULL DEFAULT FALSE,
    cost_reconciliation_complete BOOLEAN NOT NULL DEFAULT FALSE,
    material_return_note VARCHAR(500),
    remarks VARCHAR(500),
    completed_by VARCHAR(100),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dpr_project ON daily_progress_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_mb_entries_project ON measurement_book_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_ra_bills_project ON ra_bills(project_id);

-- Civil Execution (Requirements-ProjectCivil.md §1) — extension of Project, not a separate Project entity
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

-- =====================================================================
-- TRANSPORT DEPARTMENT (per Requirements-Transport.md / 8 Transport SOP)
-- Shared Vehicle Master consumed by Sales dispatch (AC4) so the vehicle
-- field there is a lookup, not free text.
-- =====================================================================

CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_name VARCHAR(150) NOT NULL,
    vehicle_type VARCHAR(30) NOT NULL CHECK (vehicle_type IN
        ('TATA', 'CARRY', 'TRAILER', 'ASHOK_LEYLAND', 'OTHER')),
    vehicle_number VARCHAR(30) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- History retained: renewal creates a NEW row linked to the same vehicle, never overwritten.
CREATE TABLE IF NOT EXISTS insurance_records (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    insurance_company_name VARCHAR(150) NOT NULL,
    policy_number VARCHAR(60) NOT NULL,
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    premium_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    document_name VARCHAR(255),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (expiry_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_insurance_vehicle ON insurance_records(vehicle_id);

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(id);

-- =====================================================================
-- ACCOUNTS DEPARTMENT (per Requirements-Accounts.md / 9 Accounts SOP)
-- Unified Invoice entity for both Purchase and Sales sides (Recommended
-- Decision: single canonical entity, not duplicated per department).
-- Purchase invoices are gated by a three-way match: PO <-> GRN <-> Invoice.
-- =====================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_type VARCHAR(20) NOT NULL CHECK (invoice_type IN ('PURCHASE', 'SALES')),
    party_name VARCHAR(200) NOT NULL,
    gstin VARCHAR(20),
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    material_receipt_id INTEGER REFERENCES material_receipts(id),
    sales_order_id INTEGER REFERENCES sales_orders(id),
    taxable_amount NUMERIC(14,2) NOT NULL CHECK (taxable_amount >= 0),
    gst_percent NUMERIC(5,2) NOT NULL DEFAULT 18,
    gst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL,
    due_date DATE,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN
        ('PENDING', 'PARTIAL', 'PAID')),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (invoice_type = 'PURCHASE' AND purchase_order_id IS NOT NULL AND material_receipt_id IS NOT NULL AND sales_order_id IS NULL)
        OR
        (invoice_type = 'SALES' AND sales_order_id IS NOT NULL AND purchase_order_id IS NULL AND material_receipt_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('NEFT', 'RTGS', 'CHEQUE', 'CASH', 'UPI')),
    reference_number VARCHAR(80),
    amount_paid NUMERIC(14,2) NOT NULL CHECK (amount_paid > 0),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE INDEX IF NOT EXISTS idx_invoices_po ON invoices(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_so ON invoices(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- =====================================================================
-- SHARED ATTACHMENTS (system-wide file upload capability)
-- Generic entity_type/entity_id pattern so every module reuses one table
-- instead of a per-module file column.
-- =====================================================================

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
