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

test('Discount above 2% requires Management approval before order confirmation', async ({ page }) => {
  await login(page, 'sales@test.com');
  await page.getByRole('link', { name: 'Enquiries' }).click();
  await page.getByRole('button', { name: 'New Enquiry' }).click();
  await page.getByLabel('Customer Name *').fill('Big Discount Customer');
  await page.getByLabel('Mobile Number *').fill('9998887770');
  await page.getByLabel('Product Requirement *').fill('Large roofing order');
  await page.getByLabel('Sales Representative *').fill('Sales User');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Big Discount Customer').first()).toBeVisible();
  await page.locator('.ag-center-cols-container .ag-row').filter({ hasText: 'Big Discount Customer' }).first().getByRole('button').click();

  await page.getByLabel('Quotation Amount (₹) *').fill('200000');
  await page.getByLabel('Quotation Date *').fill('2026-08-20');
  await page.getByRole('button', { name: 'Send Quotation' }).click();

  // 5% discount — above the 2% cap
  await page.getByLabel('Negotiated Price (₹) *').fill('190000');
  await page.getByLabel('Discount %').fill('5');
  await page.getByLabel('Discount Reason').fill('Large volume, competitor pricing');
  await page.getByRole('button', { name: 'Record Negotiation' }).click();

  // Should show pending approval, not let Sales confirm directly
  await expect(page.getByText('Discount Approval Required')).toBeVisible();
  await expect(page.getByText('Awaiting Management approval.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm Order' })).toHaveCount(0);
  const url = page.url();
  await logout(page);

  // Management approves
  await login(page, 'management@test.com');
  await page.goto(url);
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('PRICE APPROVED')).toBeVisible();
  await logout(page);

  // Sales can now confirm
  await login(page, 'sales@test.com');
  await page.goto(url);
  await expect(page.getByRole('button', { name: 'Confirm Order' })).toBeVisible();
});
