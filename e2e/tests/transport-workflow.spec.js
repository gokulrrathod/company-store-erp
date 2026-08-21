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

test('Transport: Vehicle Master + Insurance history, duplicate number rejected, expiry validation', async ({ page }) => {
  await login(page, 'transport@test.com');
  await page.getByRole('link', { name: 'Vehicles' }).click();

  const vehicleNumber = `MH12-E2E-${Date.now() % 100000}`;
  await page.getByRole('button', { name: 'New Vehicle' }).click();
  await page.getByLabel('Vehicle Name *').fill('E2E Test Truck');
  await page.getByLabel('Vehicle Number *').fill(vehicleNumber);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('E2E Test Truck').first()).toBeVisible();

  // Duplicate vehicle number is rejected
  await page.getByRole('button', { name: 'New Vehicle' }).click();
  await page.getByLabel('Vehicle Name *').fill('Duplicate Truck');
  await page.getByLabel('Vehicle Number *').fill(vehicleNumber);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText(/already registered/i)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  const row = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: 'E2E Test Truck' }).first();
  await row.getByRole('button').click();
  await expect(page).toHaveURL(/\/vehicles\/\d+/);

  // Expiry before start date is rejected
  await page.getByRole('button', { name: 'Add Insurance Record' }).click();
  await page.getByLabel('Insurance Company *').fill('National Insurance Co');
  await page.getByLabel('Policy Number *').fill('POL-E2E-001');
  await page.getByLabel('Start Date *').fill('2026-06-01');
  await page.getByLabel('Expiry Date *').fill('2026-01-01');
  await page.getByLabel('Premium Amount (₹)').fill('15000');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText(/after start date/i)).toBeVisible();

  await page.getByLabel('Expiry Date *').fill('2027-06-01');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('National Insurance Co').first()).toBeVisible();
  await expect(page.getByText('ACTIVE', { exact: true }).last()).toBeVisible();
  await logout(page);

  // Management has read-only access
  await login(page, 'management@test.com');
  await page.getByRole('link', { name: 'Vehicles' }).click();
  await expect(page.getByRole('button', { name: 'New Vehicle' })).toHaveCount(0);
});
