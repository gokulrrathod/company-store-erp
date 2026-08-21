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

test('Sales: Enquiry -> Quotation -> Negotiation -> Confirm -> Production -> Payment -> Dispatch -> Delivered', async ({ page }) => {
  // Sales creates an enquiry
  await login(page, 'sales@test.com');
  await page.getByRole('link', { name: 'Enquiries' }).click();
  await page.getByRole('button', { name: 'New Enquiry' }).click();
  await page.getByLabel('Customer Name *').fill('Test Customer Pvt Ltd');
  await page.getByLabel('Mobile Number *').fill('9876543210');
  await page.getByLabel('Company Name').fill('Test Customer Pvt Ltd');
  await page.getByLabel('Product Requirement *').fill('Roof Sheets 26 gauge, 500 sqm');
  await page.getByLabel('Sales Representative *').fill('Sales User');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Test Customer Pvt Ltd').first()).toBeVisible();

  await page.locator('.ag-center-cols-container .ag-row').filter({ hasText: 'Test Customer Pvt Ltd' }).first().getByRole('button').click();
  await expect(page).toHaveURL(/\/enquiries\/\d+/);

  // Send quotation
  await page.getByLabel('Quotation Amount (₹) *').fill('100000');
  await page.getByLabel('Quotation Date *').fill('2026-08-20');
  await page.getByRole('button', { name: 'Send Quotation' }).click();
  await expect(page.getByText('QUOTATION SENT')).toBeVisible();

  // Negotiate with a small discount (<=2%, no approval needed)
  await page.getByLabel('Negotiated Price (₹) *').fill('98000');
  await page.getByLabel('Discount %').fill('2');
  await page.getByLabel('Discount Reason').fill('Bulk order discount');
  await page.getByRole('button', { name: 'Record Negotiation' }).click();
  await expect(page.getByText('PRICE APPROVED')).toBeVisible();

  // Confirm order
  await page.getByLabel('Advance Payment (₹) *').fill('49000');
  await page.getByRole('button', { name: 'Confirm Order' }).click();
  await expect(page).toHaveURL(/\/sales-orders\/\d+/);
  const url = page.url();
  const soId = url.match(/sales-orders\/(\d+)/)[1];
  await expect(page.getByText('ORDER CONFIRMED')).toBeVisible();
  await logout(page);

  // Production updates status
  await login(page, 'production@test.com');
  await page.goto(`/sales-orders/${soId}`);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('IN PRODUCTION')).toBeVisible();
  await page.getByRole('button', { name: 'Mark Completed' }).click();
  await expect(page.getByText('PRODUCTION COMPLETED')).toBeVisible();
  await logout(page);

  // Sales marks ready for dispatch
  await login(page, 'sales@test.com');
  await page.goto(`/sales-orders/${soId}`);
  await page.getByRole('button', { name: 'Ready for Dispatch' }).click();
  await expect(page.getByText('READY FOR DISPATCH')).toBeVisible();
  await logout(page);

  // Accounts records the remaining payment
  await login(page, 'accounts@test.com');
  await page.goto(`/sales-orders/${soId}`);
  await page.getByLabel('Payment Amount (₹) *').fill('49000');
  await page.getByRole('button', { name: 'Record Payment' }).click();
  await expect(page.getByText('₹ 0')).toBeVisible();
  await logout(page);

  // Dispatch completes the checklist
  await login(page, 'dispatch@test.com');
  await page.goto(`/sales-orders/${soId}`);
  await page.getByLabel('Vehicle *').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Driver Name *').fill('Ramesh Driver');
  await page.getByLabel('Loading Person *').fill('Suresh Loader');
  await page.getByLabel('Material Measured').check();
  await page.getByLabel('Quality Checked').check();
  await page.getByRole('button', { name: 'Dispatch' }).click();
  await expect(page.getByText('DISPATCHED', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Mark Delivered' }).click();
  await expect(page.getByText('DELIVERED', { exact: true })).toBeVisible();
});
