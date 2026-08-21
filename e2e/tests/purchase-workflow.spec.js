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

test('Vendor registration workflow: Purchase -> Finance -> Management approval', async ({ page }) => {
  await login(page, 'purchase@test.com');
  await page.getByRole('link', { name: 'Vendors' }).click();
  await page.getByRole('button', { name: 'Register Vendor' }).click();
  await page.getByLabel('Vendor Name *').fill('New Steel Vendor Pvt Ltd');
  await page.getByLabel('GST Number *').fill('27ZZZZZ9999Z1Z5');
  await page.getByLabel('PAN Number *').fill('ZZZZZ9999Z');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('New Steel Vendor Pvt Ltd').first()).toBeVisible();

  const row = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: 'New Steel Vendor Pvt Ltd' }).first();
  await row.getByRole('button', { name: 'Purchase Verify' }).click();
  await expect(row.getByText('PENDING FINANCE VERIFICATION')).toBeVisible();
  await logout(page);

  await login(page, 'finance@test.com');
  await page.getByRole('link', { name: 'Vendors' }).click();
  const row2 = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: 'New Steel Vendor Pvt Ltd' }).first();
  await row2.getByRole('button', { name: 'Finance Verify' }).click();
  await expect(row2.getByText('PENDING MANAGEMENT APPROVAL')).toBeVisible();
  await logout(page);

  await login(page, 'management@test.com');
  await page.getByRole('link', { name: 'Vendors' }).click();
  const row3 = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: 'New Steel Vendor Pvt Ltd' }).first();
  await row3.getByRole('button', { name: 'Approve' }).click();
  await expect(row3.getByText('ACTIVE', { exact: true })).toBeVisible();
});

test('Budget allocation and PO within/over budget with Finance escalation', async ({ page }) => {
  // Finance allocates a small budget for a fresh department
  await login(page, 'finance@test.com');
  await page.getByRole('link', { name: 'Budgets' }).click();
  await page.getByRole('button', { name: 'Allocate Budget' }).click();
  await page.getByLabel('Department *').fill('Civil');
  await page.getByLabel('Allocated Amount (₹) *').fill('1000');
  await page.getByRole('button', { name: 'Allocate' }).click();
  await expect(page.getByRole('gridcell', { name: 'Civil', exact: true })).toBeVisible();
  await logout(page);

  // Purchase creates a PO for Civil that exceeds the ₹1000 budget (MS Plate @ ₹62/kg x 100 = ₹6200)
  await login(page, 'purchase@test.com');
  await page.getByRole('link', { name: 'Purchase Orders' }).click();
  await page.getByRole('button', { name: 'New Purchase Order' }).click();
  const poNumber = `PO-BUDGET-${Date.now()}`;
  await page.getByLabel('PO Number *').fill(poNumber);
  await page.getByLabel('Supplier *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Department *').click();
  await page.getByRole('option', { name: 'Civil' }).click();
  await page.getByLabel('Item *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Quantity *').fill('100');
  await page.getByRole('button', { name: 'Create Purchase Order' }).click();
  await expect(page).toHaveURL(/\/purchase-orders$/);

  const poRow = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: poNumber });
  await expect(poRow.getByText('PENDING FINANCE APPROVAL')).toBeVisible();
  await logout(page);

  // Finance approves the over-budget PO
  await login(page, 'finance@test.com');
  await page.getByRole('link', { name: 'Purchase Orders' }).click();
  const poRow2 = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: poNumber });
  await poRow2.getByRole('button', { name: 'Approve Budget' }).click();
  await expect(poRow2.getByText('FINANCE APPROVED')).toBeVisible();
});
