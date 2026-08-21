INSERT INTO categories (name) VALUES
    ('Raw Steel'), ('Fasteners'), ('Consumables'), ('Safety Gear')
ON CONFLICT DO NOTHING;

INSERT INTO items (code, name, category_id, unit, quantity, minimum_stock, maximum_stock, reorder_level, warehouse, rack_number, bin_number, storage_location, unit_rate) VALUES
    ('RS-001', 'MS Plate 10mm', 1, 'kg', 2500, 500, 5000, 500, 'Main Warehouse', 'R-01', 'B-01', 'Main Warehouse / R-01 / B-01', 62),
    ('RS-002', 'MS Angle 50x50x6', 1, 'kg', 800, 300, 3000, 300, 'Main Warehouse', 'R-01', 'B-02', 'Main Warehouse / R-01 / B-02', 58),
    ('FA-001', 'Hex Bolt M12x50', 2, 'pcs', 1200, 200, 5000, 200, 'Main Warehouse', 'R-02', 'B-01', 'Main Warehouse / R-02 / B-01', 8),
    ('FA-002', 'Anchor Bolt M16', 2, 'pcs', 90, 100, 2000, 100, 'Main Warehouse', 'R-02', 'B-02', 'Main Warehouse / R-02 / B-02', 15),
    ('CO-001', 'Welding Electrode 3.15mm', 3, 'kg', 150, 50, 1000, 50, 'Consumables Store', 'R-03', 'B-01', 'Consumables Store / R-03 / B-01', 220),
    ('CO-002', 'Grinding Wheel 4inch', 3, 'pcs', 40, 25, 500, 25, 'Consumables Store', 'R-03', 'B-02', 'Consumables Store / R-03 / B-02', 95),
    ('SG-001', 'Safety Helmet', 4, 'pcs', 30, 15, 200, 15, 'Safety Store', 'R-04', 'B-01', 'Safety Store / R-04 / B-01', 180),
    ('SG-002', 'Safety Gloves', 4, 'pair', 12, 20, 300, 20, 'Safety Store', 'R-04', 'B-02', 'Safety Store / R-04 / B-02', 45)
ON CONFLICT DO NOTHING;

-- Password for all seed users: Password@123
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Admin User', 'admin@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'ADMIN'),
    ('Store Manager', 'storemanager@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'STORE_MANAGER'),
    ('Store Executive', 'storeexec@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'STORE_EXECUTIVE'),
    ('Purchase User', 'purchase@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'PURCHASE'),
    ('Quality User', 'quality@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'QUALITY'),
    ('Production User', 'production@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'PRODUCTION'),
    ('Sales User', 'sales@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'SALES'),
    ('Accounts User', 'accounts@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'ACCOUNTS'),
    ('Dispatch User', 'dispatch@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'DISPATCH'),
    ('Management User', 'management@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'MANAGEMENT'),
    ('Finance User', 'finance@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'FINANCE'),
    ('Design Engineer', 'designengineer@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'DESIGN_ENGINEER'),
    ('Checker User', 'checker@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'CHECKER'),
    ('Design Head', 'designhead@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'DESIGN_HEAD'),
    ('Production Head', 'productionhead@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'PRODUCTION_HEAD'),
    ('Shop Floor Engineer', 'shopfloor@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'SHOP_FLOOR_ENGINEER'),
    ('Project Manager', 'projectmanager@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'PROJECT_MANAGER'),
    ('Site Engineer', 'siteengineer@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'SITE_ENGINEER'),
    ('Transport User', 'transport@test.com', '$2a$10$xoa5MuMKfW6OflKdA4U4D.4uAJBQkyObBCGNhOEG8ZWdXI/Gg0Sqm', 'TRANSPORT')
ON CONFLICT DO NOTHING;

INSERT INTO suppliers (name, contact_person, phone, email, vendor_type, gst_number, pan_number, vendor_status, vendor_rating, approved_by, approved_at) VALUES
    ('Test Supplier One', 'Supplier Contact 1', '9000000001', 'contact1@testsupplier.com', 'MATERIAL_SUPPLIER', '27AAAAA0000A1Z5', 'AAAAA0000A', 'ACTIVE', 4.5, 'Management User', now()),
    ('Test Supplier Two', 'Supplier Contact 2', '9000000002', 'contact2@testsupplier.com', 'MATERIAL_SUPPLIER', '27BBBBB0000B1Z5', 'BBBBB0000B', 'ACTIVE', 4.0, 'Management User', now())
ON CONFLICT DO NOTHING;

INSERT INTO budgets (department, allocated_amount, utilized_amount) VALUES
    ('Purchase', 500000, 0),
    ('Production', 300000, 0),
    ('Store', 200000, 0)
ON CONFLICT DO NOTHING;

INSERT INTO purchase_orders (po_number, supplier_id, department, status, created_by) VALUES
    ('PO-2026-001', 1, 'Purchase', 'OPEN', 'Purchase User')
ON CONFLICT DO NOTHING;

INSERT INTO po_lines (po_id, item_id, quantity_ordered) VALUES
    (1, 1, 1000),
    (1, 2, 400)
ON CONFLICT DO NOTHING;

INSERT INTO housekeeping_logs (log_date, activity, performed_by, verified_by, remarks, status) VALUES
    (CURRENT_DATE, 'Daily Store Aisle Cleaning & Bin Dusting', 'Store Executive', 'Store Manager', 'All aisles clear from obstruction. Waste segregated.', 'VERIFIED'),
    (CURRENT_DATE - 3, 'Fire Extinguisher & Safety Hydrant Inspection', 'Store Executive', 'Store Manager', 'Pressure gauge in green zone.', 'VERIFIED')
ON CONFLICT DO NOTHING;

INSERT INTO safety_logs (incident_date, category, zone, reported_by, severity, action_taken, status) VALUES
    (CURRENT_DATE - 1, 'PPE Non-Compliance', 'Unloading Dock 2', 'Quality User', 'LOW', 'Worker issued safety shoes and high-vis vest on spot.', 'CLOSED'),
    (CURRENT_DATE - 4, 'Chemical Spill Incident', 'Consumables Store', 'Store Executive', 'MEDIUM', 'Spill kit deployed immediately. Zero injuries.', 'CLOSED')
ON CONFLICT DO NOTHING;

INSERT INTO vehicles (vehicle_name, vehicle_type, vehicle_number, status, created_by) VALUES
    ('Delivery Truck 1', 'TATA', 'MH-12-AB-1234', 'ACTIVE', 'Transport User'),
    ('Site Trailer 1', 'TRAILER', 'MH-14-CD-5678', 'ACTIVE', 'Transport User')
ON CONFLICT DO NOTHING;

INSERT INTO insurance_records (vehicle_id, insurance_company_name, policy_number, start_date, expiry_date, premium_amount, created_by) VALUES
    (1, 'National Insurance Co', 'POL-2026-0001', '2026-01-01', '2027-01-01', 18000, 'Transport User')
ON CONFLICT DO NOTHING;
