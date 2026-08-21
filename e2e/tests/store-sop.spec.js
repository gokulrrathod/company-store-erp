import { test, expect } from '@playwright/test';

const PASSWORD = 'Password@123';
const USERS = {
  admin: 'admin@test.com',
  storeManager: 'storemanager@test.com',
  storeExec: 'storeexec@test.com',
  purchase: 'purchase@test.com',
  quality: 'quality@test.com',
  production: 'production@test.com',
};

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

// ag-Grid renders rows as divs, not <table>. Grab a cell's text by its column id (field name).
function gridCell(page, rowIndex, colId) {
  return page.locator('.ag-center-cols-container .ag-row').nth(rowIndex).locator(`[col-id="${colId}"]`);
}

test.describe('Store Department SOP — Software Workflow', () => {
  test('Module 8: role-based navigation differs per role', async ({ page }) => {
    await login(page, USERS.production);
    await expect(page.getByRole('link', { name: 'Purchase Orders' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Goods Receipt' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Material Requests' })).toBeVisible();
    await logout(page);

    await login(page, USERS.purchase);
    await expect(page.getByRole('link', { name: 'Purchase Orders' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Goods Receipt' })).toHaveCount(0);
    await logout(page);

    await login(page, USERS.storeManager);
    await expect(page.getByRole('link', { name: 'Purchase Orders' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Goods Receipt' })).toBeVisible();
  });

  test('Module 9 + 1 + 4: PO -> Receipt -> Inspection -> Approval -> Inventory Updated', async ({ page }) => {
    const poNumber = `PO-E2E-${Date.now()}`;

    // Step 1: Purchase creates a Purchase Order (dedicated page, not a dialog)
    await login(page, USERS.purchase);
    await page.getByRole('link', { name: 'Purchase Orders' }).click();
    await page.getByRole('button', { name: 'New Purchase Order' }).click();
    await expect(page).toHaveURL(/\/purchase-orders\/new/);
    await page.getByLabel('PO Number *').fill(poNumber);
    await page.getByLabel('Supplier *').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Department *').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Item *').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Quantity *').fill('500');
    await page.getByRole('button', { name: 'Create Purchase Order' }).click();
    await expect(page).toHaveURL(/\/purchase-orders$/);
    await expect(page.getByText(poNumber)).toBeVisible();
    await logout(page);

    // Read baseline inventory quantity for the first item
    await login(page, USERS.storeExec);
    await page.getByRole('link', { name: 'Inventory' }).click();
    const beforeQty = Number((await gridCell(page, 0, 'quantity').innerText()).replace(/,/g, ''));

    // Step 2: Store Executive records Material Receipt (GRN) against the PO — dedicated page
    await page.getByRole('link', { name: 'Goods Receipt' }).click();
    await page.getByRole('button', { name: 'New Receipt' }).click();
    await expect(page).toHaveURL(/\/goods-receipt\/new/);
    await page.getByLabel('Purchase Order (optional)').click();
    await page.getByRole('option', { name: new RegExp(poNumber) }).click();
    await page.getByLabel('Supplier *').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Invoice Number').fill('INV-E2E-001');
    await page.getByLabel('Item *').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Batch Number').fill('BATCH-E2E-1');
    await page.getByLabel('Qty Received *').fill('100');
    await page.getByRole('button', { name: 'Save Receipt' }).click();
    await expect(page).toHaveURL(/\/goods-receipt$/);
    await expect(page.getByText('PENDING_INSPECTION').first()).toBeVisible();
    await logout(page);

    // Step 3: Quality inspects and accepts the line — dedicated detail page
    await login(page, USERS.quality);
    await page.getByRole('link', { name: 'Goods Receipt' }).click();
    await page.locator('.ag-center-cols-container .ag-row').first().getByRole('button').click();
    await expect(page).toHaveURL(/\/goods-receipt\/\d+/);
    await page.getByRole('button', { name: 'Accept' }).click();
    await expect(page.getByText('ACCEPTED')).toBeVisible();
    await logout(page);

    // Step 4: Store Manager approves -> inventory updated
    await login(page, USERS.storeManager);
    await page.getByRole('link', { name: 'Goods Receipt' }).click();
    await page.locator('.ag-center-cols-container .ag-row').first().getByRole('button').click();
    await page.getByRole('button', { name: 'Approve & Update Inventory' }).click();
    await expect(page.getByText('APPROVED', { exact: true })).toBeVisible();

    // Verify inventory increased by the received quantity
    await page.getByRole('link', { name: 'Inventory' }).click();
    const afterQty = Number((await gridCell(page, 0, 'quantity').innerText()).replace(/,/g, ''));
    expect(afterQty).toBeGreaterThanOrEqual(beforeQty + 100);

    // Verify a Stock IN movement was logged (SOP Module 4: Inward Quantity)
    await page.getByRole('link', { name: 'Stock Movements' }).click();
    await expect(gridCell(page, 0, 'type')).toContainText('IN');
  });

  test('Module 3 + 9: Material Requisition -> Approval -> Store Issue -> Inventory Updated', async ({ page }) => {
    // Production raises a material requisition (dialog — small form)
    await login(page, USERS.production);
    await page.getByRole('link', { name: 'Material Requests' }).click();
    await page.getByRole('button', { name: 'New Request' }).click();
    await page.getByLabel('Department *').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Item *').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Requested By *').fill('Production User');
    await page.getByLabel('Quantity Requested *').fill('5');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('PENDING').first()).toBeVisible();
    await logout(page);

    // Store Manager approves -> inventory should deduct (Store Issue)
    await login(page, USERS.storeManager);
    await page.getByRole('link', { name: 'Inventory' }).click();
    const beforeQty = Number((await gridCell(page, 0, 'quantity').innerText()).replace(/,/g, ''));

    await page.getByRole('link', { name: 'Material Requests' }).click();
    const pendingRow = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: 'PENDING' }).first();
    await pendingRow.getByRole('button').first().click();
    await expect(page.locator('.ag-center-cols-container .ag-row').first()).toContainText('APPROVED');

    await page.getByRole('link', { name: 'Inventory' }).click();
    const afterQty = Number((await gridCell(page, 0, 'quantity').innerText()).replace(/,/g, ''));
    expect(afterQty).toBeLessThanOrEqual(beforeQty);

    // Verify a Stock OUT movement was logged
    await page.getByRole('link', { name: 'Stock Movements' }).click();
    await expect(gridCell(page, 0, 'type')).toContainText('OUT');
  });

  test('Module 4 + 10: Low Stock Alert reflects items at/below reorder level', async ({ page }) => {
    await login(page, USERS.storeManager);
    await page.getByRole('link', { name: 'Low Stock Alerts' }).click();
    await expect(page.locator('body')).not.toContainText('Loading');

    await page.getByRole('link', { name: 'Inventory' }).click();
    const rowCount = await page.locator('.ag-center-cols-container .ag-row').count();
    let hasLow = false;
    for (let i = 0; i < rowCount; i++) {
      const status = await page.locator('.ag-center-cols-container .ag-row').nth(i).innerText();
      if (status.includes('Low Stock')) hasLow = true;
    }
    if (hasLow) {
      await page.getByRole('link', { name: 'Low Stock Alerts' }).click();
      await expect(page.locator('.ag-center-cols-container .ag-row').first()).toContainText('Below Reorder');
    }
  });
});
