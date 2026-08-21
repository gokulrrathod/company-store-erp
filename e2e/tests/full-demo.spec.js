import { test, expect } from '@playwright/test';

const PASSWORD = 'Password@123';
const USERS = {
  storeManager: 'storemanager@test.com',
  storeExec: 'storeexec@test.com',
  purchase: 'purchase@test.com',
  quality: 'quality@test.com',
  production: 'production@test.com',
  sales: 'sales@test.com',
  accounts: 'accounts@test.com',
  dispatch: 'dispatch@test.com',
  finance: 'finance@test.com',
  management: 'management@test.com',
  designEngineer: 'designengineer@test.com',
  checker: 'checker@test.com',
  designHead: 'designhead@test.com',
  productionHead: 'productionhead@test.com',
  shopFloor: 'shopfloor@test.com',
  projectManager: 'projectmanager@test.com',
  siteEngineer: 'siteengineer@test.com',
  transport: 'transport@test.com',
};

const PAUSE = 900; // ms — lets a viewer actually read each screen
const CLICK_PAUSE = 500;

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('banner').getByText('VMG Industries')).toBeVisible();
  await page.waitForTimeout(PAUSE);
}

async function logout(page) {
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.waitForTimeout(600);
}

function gridCell(page, rowIndex, colId) {
  return page.locator('.ag-center-cols-container .ag-row').nth(rowIndex).locator(`[col-id="${colId}"]`);
}

test.setTimeout(15 * 60 * 1000);

test('VMG ERP Demo — Full Walkthrough: Store, Sales, Purchase, Design, Production, Project, Transport, Accounts', async ({ page }) => {
  const poNumber = `PO-DEMO-${Date.now()}`;

  // =====================================================================
  // MODULE 1: STORE — PO -> GRN -> Inspection -> Approval -> Inventory
  // =====================================================================
  await login(page, USERS.purchase);
  await page.getByRole('link', { name: 'Purchase Orders' }).click();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'New Purchase Order' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('PO Number *').fill(poNumber);
  await page.getByLabel('Supplier *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Department *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Item *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Quantity *').fill('500');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Create Purchase Order' }).click();
  await expect(page.getByText(poNumber)).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.storeExec);
  await page.getByRole('link', { name: 'Goods Receipt' }).click();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'New Receipt' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Purchase Order (optional)').click();
  await page.getByRole('option', { name: new RegExp(poNumber) }).click();
  await page.getByLabel('Supplier *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Invoice Number').fill('INV-DEMO-001');
  await page.getByLabel('Item *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Batch Number').fill('BATCH-DEMO-1');
  await page.getByLabel('Qty Received *').fill('100');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Save Receipt' }).click();
  await expect(page.getByText('PENDING_INSPECTION').first()).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.quality);
  await page.getByRole('link', { name: 'Goods Receipt' }).click();
  await page.waitForTimeout(PAUSE);
  await page.locator('.ag-center-cols-container .ag-row').first().getByRole('button').click();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByText('ACCEPTED')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.storeManager);
  await page.getByRole('link', { name: 'Goods Receipt' }).click();
  await page.waitForTimeout(PAUSE);
  await page.locator('.ag-center-cols-container .ag-row').first().getByRole('button').click();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Approve & Update Inventory' }).click();
  await expect(page.getByText('APPROVED', { exact: true })).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('link', { name: 'Inventory' }).click();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  // =====================================================================
  // MODULE 2: SALES — Enquiry -> Quotation -> Negotiation -> Confirm ->
  //   Production -> Payment -> Dispatch (vehicle lookup) -> Delivered
  // =====================================================================
  await login(page, USERS.sales);
  await page.getByRole('link', { name: 'Enquiries' }).click();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'New Enquiry' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Customer Name *').fill('Demo Customer Pvt Ltd');
  await page.getByLabel('Mobile Number *').fill('9876543210');
  await page.getByLabel('Company Name').fill('Demo Customer Pvt Ltd');
  await page.getByLabel('Product Requirement *').fill('Roof Sheets 26 gauge, 500 sqm');
  await page.getByLabel('Sales Representative *').fill('Sales User');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Demo Customer Pvt Ltd').first()).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await page.locator('.ag-center-cols-container .ag-row').filter({ hasText: 'Demo Customer Pvt Ltd' }).first().getByRole('button').click();
  await expect(page).toHaveURL(/\/enquiries\/\d+/);
  await page.waitForTimeout(PAUSE);

  await page.getByLabel('Quotation Amount (₹) *').fill('100000');
  await page.getByLabel('Quotation Date *').fill('2026-08-20');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Send Quotation' }).click();
  await expect(page.getByText('QUOTATION SENT')).toBeVisible();
  await page.waitForTimeout(PAUSE);

  await page.getByLabel('Negotiated Price (₹) *').fill('98000');
  await page.getByLabel('Discount %').fill('2');
  await page.getByLabel('Discount Reason').fill('Bulk order discount');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Record Negotiation' }).click();
  await expect(page.getByText('PRICE APPROVED')).toBeVisible();
  await page.waitForTimeout(PAUSE);

  await page.getByLabel('Advance Payment (₹) *').fill('49000');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Confirm Order' }).click();
  await expect(page).toHaveURL(/\/sales-orders\/\d+/);
  const soUrl = page.url();
  const soId = soUrl.match(/sales-orders\/(\d+)/)[1];
  await expect(page.getByText('ORDER CONFIRMED')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.production);
  await page.goto(`/sales-orders/${soId}`);
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('IN PRODUCTION')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Mark Completed' }).click();
  await expect(page.getByText('PRODUCTION COMPLETED')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.sales);
  await page.goto(`/sales-orders/${soId}`);
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Ready for Dispatch' }).click();
  await expect(page.getByText('READY FOR DISPATCH')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.accounts);
  await page.goto(`/sales-orders/${soId}`);
  await page.waitForTimeout(PAUSE);
  await page.getByLabel('Payment Amount (₹) *').fill('49000');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Record Payment' }).click();
  await expect(page.getByText('₹ 0')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.dispatch);
  await page.goto(`/sales-orders/${soId}`);
  await page.waitForTimeout(PAUSE);
  await page.getByLabel('Vehicle *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Driver Name *').fill('Ramesh Driver');
  await page.getByLabel('Loading Person *').fill('Suresh Loader');
  await page.getByLabel('Material Measured').check();
  await page.getByLabel('Quality Checked').check();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Dispatch' }).click();
  await expect(page.getByText('DISPATCHED', { exact: true })).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Mark Delivered' }).click();
  await expect(page.getByText('DELIVERED', { exact: true })).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  // =====================================================================
  // MODULE 3: PURCHASE — Vendor registration approval chain
  // =====================================================================
  await login(page, USERS.purchase);
  await page.getByRole('link', { name: 'Vendors' }).click();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Register Vendor' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  const vendorName = `Demo Steel Vendor ${Date.now() % 10000}`;
  await page.getByLabel('Vendor Name *').fill(vendorName);
  await page.getByLabel('GST Number *').fill('27ZZZZZ9999Z1Z5');
  await page.getByLabel('PAN Number *').fill('ZZZZZ9999Z');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText(vendorName).first()).toBeVisible();
  await page.waitForTimeout(PAUSE);
  const vendorRow = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: vendorName }).first();
  await vendorRow.getByRole('button', { name: 'Purchase Verify' }).click();
  await expect(vendorRow.getByText('PENDING FINANCE VERIFICATION')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.finance);
  await page.getByRole('link', { name: 'Vendors' }).click();
  await page.waitForTimeout(PAUSE);
  const vendorRow2 = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: vendorName }).first();
  await vendorRow2.getByRole('button', { name: 'Finance Verify' }).click();
  await expect(vendorRow2.getByText('PENDING MANAGEMENT APPROVAL')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.management);
  await page.getByRole('link', { name: 'Vendors' }).click();
  await page.waitForTimeout(PAUSE);
  const vendorRow3 = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: vendorName }).first();
  await vendorRow3.getByRole('button', { name: 'Approve' }).click();
  await expect(vendorRow3.getByText('ACTIVE', { exact: true })).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  // =====================================================================
  // MODULE 4: DESIGN — Draft -> Checklist -> Design Head -> Customer ->
  //   Released -> ECN
  // =====================================================================
  const drawingNumber = `DWG-DEMO-${Date.now()}`;
  await login(page, USERS.designEngineer);
  await page.getByRole('link', { name: 'Drawings' }).click();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'New Drawing' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Drawing Number *').fill(drawingNumber);
  await page.getByLabel('Drawing Title *').fill('Pressure Vessel GA');
  await page.getByLabel('Equipment Name *').fill('Vessel V-101');
  await page.getByLabel('Requires Customer Approval before release').check();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Create Drawing' }).click();
  await expect(page).toHaveURL(/\/drawings\/\d+/);
  await page.waitForTimeout(PAUSE);

  await page.getByRole('button', { name: 'Add BOM Line' }).click();
  await page.getByLabel('Item No. *').fill('1');
  await page.getByLabel('Description *').fill('Shell Plate');
  await page.getByLabel('Quantity *').fill('4');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Shell Plate')).toBeVisible();
  await page.waitForTimeout(PAUSE);

  await page.getByRole('button', { name: 'Submit for Checking' }).click();
  await expect(page.getByText('UNDER CHECKING')).toBeVisible();
  const drawingUrl = page.url();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.checker);
  await page.goto(drawingUrl);
  await page.waitForTimeout(PAUSE);
  const CHECKLIST_LABELS = [
    'Dimensions', 'Tolerances', 'Material Grade', 'Welding Details', 'Shaft Design',
    'Bearing Selection', 'Gearbox Selection', 'Structural Load', 'Corrosion Allowance',
    'Interface Matching', 'Manufacturability', 'Drawing Standard', 'BOM Accuracy',
  ];
  for (const label of CHECKLIST_LABELS) {
    await page.getByLabel(label, { exact: true }).check();
  }
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('CHECKER APPROVED')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.designHead);
  await page.goto(drawingUrl);
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('AWAITING CUSTOMER APPROVAL')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Record Customer Approval' }).click();
  await expect(page.getByText('CUSTOMER APPROVED')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Release Drawing' }).click();
  await expect(page.getByText('RELEASED', { exact: true })).toBeVisible();
  await page.waitForTimeout(PAUSE);

  await page.getByRole('button', { name: 'Raise ECN' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Reason for Change *').fill('Customer requested thicker shell');
  await page.getByLabel('Requested By *').fill('Design Head');
  await page.getByLabel('New Revision *').fill('B');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Raise ECN' }).click();
  await expect(page.getByText('Customer requested thicker shell')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('DWG')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  // =====================================================================
  // MODULE 5: PRODUCTION — Plan -> Head Approval -> Activity -> Status ->
  //   Stage Inspection -> Rework
  // =====================================================================
  await login(page, USERS.production);
  await page.getByRole('link', { name: 'Production Plans' }).click();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'New Plan' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Project Reference *').fill('Vessel V-101 Fabrication');
  await page.getByLabel('Week Number *').fill('W34');
  await page.getByLabel('Start Date *').fill('2026-08-18');
  await page.getByLabel('End Date *').fill('2026-08-24');
  await page.getByLabel('Planned Quantity *').fill('10');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Vessel V-101 Fabrication')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  const planRow = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: 'Vessel V-101 Fabrication' }).first();
  await planRow.getByRole('button').click();
  await expect(page).toHaveURL(/\/production-plans\/\d+/);
  const planUrl = page.url();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.productionHead);
  await page.goto(planUrl);
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Approve Plan' }).click();
  await expect(page.getByText('APPROVED', { exact: true })).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.shopFloor);
  await page.goto(planUrl);
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Add Activity' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Equipment Name *').fill('Vessel V-101');
  await page.getByLabel('Activity *').fill('Welding');
  await page.getByLabel('Responsible Engineer *').fill('Shop Floor Engineer');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Welding')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await page.locator('.ag-center-cols-container .ag-row').first().getByRole('button').click();
  await expect(page).toHaveURL(/\/production-schedules\/\d+/);
  await page.waitForTimeout(PAUSE);

  await page.getByLabel('Status *').click();
  await page.getByRole('option', { name: 'In Progress' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Save Status' }).click();
  await expect(page.getByText('IN PROGRESS', { exact: true })).toBeVisible();
  await page.waitForTimeout(PAUSE);

  await page.getByRole('button', { name: 'Log Stage Inspection' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Inspection Stage *').click();
  await page.getByRole('option', { name: 'WELDING' }).click();
  await page.getByLabel('Inspector Name *').fill('Quality User');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Quality User')).toBeVisible();
  await page.waitForTimeout(PAUSE);

  await page.getByRole('button', { name: 'Log Rework / Rejection' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Part Name *').fill('Shell Plate Seam');
  await page.getByLabel('Quantity Produced *').fill('10');
  await page.getByLabel('Reason *').fill('Porosity found in weld seam');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Shell Plate Seam')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  // =====================================================================
  // MODULE 6: PROJECT / CIVIL — Create -> DPR -> Measurement -> RA Bill ->
  //   Reconciliation-gated Closure
  // =====================================================================
  await login(page, USERS.projectManager);
  await page.getByRole('link', { name: 'Projects' }).click();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'New Project' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Project Name *').fill('Sugar Mill Civil Foundation');
  await page.getByLabel('Client Name *').fill('VMG Sugar Client');
  await page.getByLabel('Project Value (₹)').fill('500000');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Sugar Mill Civil Foundation')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await page.locator('.ag-center-cols-container .ag-row').first().getByRole('button').click();
  await expect(page).toHaveURL(/\/projects\/\d+/);
  const projectUrl = page.url();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.siteEngineer);
  await page.goto(projectUrl);
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Log DPR' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Work Done *').fill('Excavation and footing layout completed');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Excavation and footing layout completed')).toBeVisible();
  await page.waitForTimeout(PAUSE);

  await page.getByRole('button', { name: 'Add Measurement' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Description *').fill('Excavation Work');
  await page.getByLabel('Quantity *').fill('120');
  await page.getByLabel('Rate (₹)').fill('400');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Excavation Work')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.accounts);
  await page.goto(projectUrl);
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Raise RA Bill' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Measurement Entry *').click();
  await page.getByRole('option', { name: /Excavation Work/ }).click();
  await page.getByLabel('Party Name *').fill('VMG Sugar Client');
  await page.getByLabel('Amount (₹) *').fill('48000');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Raise Bill' }).click();
  await expect(page.getByText('VMG Sugar Client').last()).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  await login(page, USERS.projectManager);
  await page.goto(projectUrl);
  await page.waitForTimeout(PAUSE);
  await page.getByLabel('Material Reconciliation Complete').check();
  await page.getByLabel('Cost Reconciliation Complete').check();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Save Reconciliation' }).click();
  await expect(page.getByRole('button', { name: 'Close Project' })).toBeEnabled();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Close Project' }).click();
  await expect(page.getByText('CLOSED')).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  // =====================================================================
  // MODULE 7: TRANSPORT — Vehicle Master + Insurance history
  // =====================================================================
  await login(page, USERS.transport);
  await page.getByRole('link', { name: 'Vehicles' }).click();
  await page.waitForTimeout(PAUSE);
  const vehicleNumber = `MH12-DEMO-${Date.now() % 100000}`;
  await page.getByRole('button', { name: 'New Vehicle' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Vehicle Name *').fill('Demo Delivery Truck');
  await page.getByLabel('Vehicle Number *').fill(vehicleNumber);
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Demo Delivery Truck').first()).toBeVisible();
  await page.waitForTimeout(PAUSE);
  const vehicleRow = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: 'Demo Delivery Truck' }).first();
  await vehicleRow.getByRole('button').click();
  await expect(page).toHaveURL(/\/vehicles\/\d+/);
  await page.waitForTimeout(PAUSE);

  await page.getByRole('button', { name: 'Add Insurance Record' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByLabel('Insurance Company *').fill('National Insurance Co');
  await page.getByLabel('Policy Number *').fill('POL-DEMO-001');
  await page.getByLabel('Start Date *').fill('2026-01-01');
  await page.getByLabel('Expiry Date *').fill('2027-01-01');
  await page.getByLabel('Premium Amount (₹)').fill('15000');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('National Insurance Co').first()).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await logout(page);

  // =====================================================================
  // MODULE 8: ACCOUNTS — Purchase Invoice (three-way match) + Payment
  // =====================================================================
  await login(page, USERS.accounts);
  await page.getByRole('link', { name: 'Invoices & Payments' }).click();
  await page.waitForTimeout(PAUSE);
  await page.getByRole('button', { name: 'Purchase Invoice' }).click();
  await page.waitForTimeout(CLICK_PAUSE);
  const invoiceNumber = `INV-DEMO-${Date.now()}`;
  await page.getByLabel('Invoice Number *').fill(invoiceNumber);
  await page.getByLabel('Party (Vendor) Name *').fill(vendorName);
  await page.getByLabel('Purchase Order *').click();
  await page.getByRole('option', { name: new RegExp(poNumber) }).click();
  await page.getByLabel('GRN (Approved only) *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Taxable Amount (₹) *').fill('10000');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Book Invoice' }).click();
  await expect(page.getByText(invoiceNumber)).toBeVisible();
  await page.waitForTimeout(PAUSE);

  const invoiceRow = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: invoiceNumber }).first();
  await invoiceRow.getByRole('button').click();
  await expect(page).toHaveURL(/\/invoices\/\d+/);
  await page.waitForTimeout(PAUSE);

  await page.getByLabel('Amount (₹) *').fill('5000');
  await page.waitForTimeout(CLICK_PAUSE);
  await page.getByRole('button', { name: 'Record Payment' }).click();
  await expect(page.getByText('PARTIAL', { exact: true })).toBeVisible();
  await page.waitForTimeout(PAUSE * 2);
});
