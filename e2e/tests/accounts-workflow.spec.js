import { test, expect } from '@playwright/test';

const PASSWORD = 'Password@123';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('banner').getByText('VMG Industries')).toBeVisible();
}

async function logout(page) {
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);
}

test('Accounts: Purchase Invoice blocked until GRN Approved (three-way match), then payment', async ({ page }) => {
  const poNumber = `PO-ACC-${Date.now()}`;

  // Purchase creates a PO
  await login(page, 'purchase@test.com');
  await page.getByRole('link', { name: 'Purchase Orders' }).click();
  await page.getByRole('button', { name: 'New Purchase Order' }).click();
  await page.getByLabel('PO Number *').fill(poNumber);
  await page.getByLabel('Supplier *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Department *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Item *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Quantity *').fill('50');
  await page.getByRole('button', { name: 'Create Purchase Order' }).click();
  await expect(page.getByText(poNumber)).toBeVisible();
  await logout(page);

  // Store Executive receives goods against the PO — GRN starts Pending Inspection
  await login(page, 'storeexec@test.com');
  await page.getByRole('link', { name: 'Goods Receipt' }).click();
  await page.getByRole('button', { name: 'New Receipt' }).click();
  await page.getByLabel('Purchase Order (optional)').click();
  await page.getByRole('option', { name: new RegExp(poNumber) }).click();
  await page.getByLabel('Supplier *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Invoice Number').fill('SUPP-INV-ACC-001');
  await page.getByLabel('Item *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Batch Number').fill('BATCH-ACC-1');
  await page.getByLabel('Qty Received *').fill('50');
  await page.getByRole('button', { name: 'Save Receipt' }).click();
  await expect(page).toHaveURL(/\/goods-receipt$/);
  await logout(page);

  // Accounts cannot yet see this GRN in the eligible list — Invoice booking requires an Approved GRN
  await login(page, 'accounts@test.com');
  await page.getByRole('link', { name: 'Invoices & Payments' }).click();
  await page.getByRole('button', { name: 'Purchase Invoice' }).click();
  await page.getByLabel('Invoice Number *').fill(`INV-ACC-${Date.now()}`);
  await page.getByLabel('Party (Vendor) Name *').fill('Test Vendor');
  await page.getByLabel('Purchase Order *').click();
  await page.getByRole('option', { name: new RegExp(poNumber) }).click();
  await page.getByLabel('Taxable Amount (₹) *').fill('10000');
  await page.getByRole('button', { name: 'Book Invoice' }).click();
  await expect(page.getByText(/select a grn/i)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await logout(page);

  // Quality inspects and accepts, then Store Manager approves the GRN
  await login(page, 'quality@test.com');
  await page.getByRole('link', { name: 'Goods Receipt' }).click();
  const grnRow = page.locator('.ag-center-cols-container .ag-row').first();
  await grnRow.getByRole('button').click();
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByText('ACCEPTED')).toBeVisible();
  await logout(page);

  await login(page, 'storemanager@test.com');
  await page.getByRole('link', { name: 'Goods Receipt' }).click();
  await page.locator('.ag-center-cols-container .ag-row').first().getByRole('button').click();
  await page.getByRole('button', { name: 'Approve & Update Inventory' }).click();
  await expect(page.getByText('APPROVED', { exact: true })).toBeVisible();
  await logout(page);

  // Accounts can now book the Purchase Invoice against the Approved GRN
  await login(page, 'accounts@test.com');
  await page.getByRole('link', { name: 'Invoices & Payments' }).click();
  await page.getByRole('button', { name: 'Purchase Invoice' }).click();
  const invoiceNumber = `INV-ACC-${Date.now()}`;
  await page.getByLabel('Invoice Number *').fill(invoiceNumber);
  await page.getByLabel('Party (Vendor) Name *').fill('Test Vendor');
  await page.getByLabel('Purchase Order *').click();
  await page.getByRole('option', { name: new RegExp(poNumber) }).click();
  await page.getByLabel('GRN (Approved only) *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Taxable Amount (₹) *').fill('10000');
  await page.getByRole('button', { name: 'Book Invoice' }).click();
  await expect(page.getByText(invoiceNumber)).toBeVisible();

  const row = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: invoiceNumber }).first();
  await row.getByRole('button').click();
  await expect(page).toHaveURL(/\/invoices\/\d+/);

  // Overpayment is rejected
  await page.getByLabel('Amount (₹) *').fill('99999');
  await page.getByRole('button', { name: 'Record Payment' }).click();
  await expect(page.getByText(/exceeds outstanding balance/i)).toBeVisible();

  // Correct partial payment succeeds
  await page.getByLabel('Amount (₹) *').fill('5000');
  await page.getByRole('button', { name: 'Record Payment' }).click();
  await expect(page.getByText('PARTIAL', { exact: true })).toBeVisible();
});
