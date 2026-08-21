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

test('Project: Create -> DPR -> Measurement -> RA Bill -> Reconciliation-gated Closure', async ({ page }) => {
  await login(page, 'projectmanager@test.com');
  await page.getByRole('link', { name: 'Projects' }).click();
  await page.getByRole('button', { name: 'New Project' }).click();
  await page.getByLabel('Project Name *').fill('Sugar Mill Civil Foundation');
  await page.getByLabel('Client Name *').fill('VMG Sugar Client');
  await page.getByLabel('Project Value (₹)').fill('500000');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Sugar Mill Civil Foundation')).toBeVisible();

  await page.locator('.ag-center-cols-container .ag-row').first().getByRole('button').click();
  await expect(page).toHaveURL(/\/projects\/\d+/);

  // Closing should be disabled before any reconciliation
  await expect(page.getByRole('button', { name: 'Close Project' })).toBeDisabled();
  const url = page.url();
  await logout(page);

  // Site Engineer logs a DPR and a measurement
  await login(page, 'siteengineer@test.com');
  await page.goto(url);
  await page.getByRole('button', { name: 'Log DPR' }).click();
  await page.getByLabel('Work Done *').fill('Excavation and footing layout completed');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Excavation and footing layout completed')).toBeVisible();

  await page.getByRole('button', { name: 'Add Measurement' }).click();
  await page.getByLabel('Description *').fill('Excavation Work');
  await page.getByLabel('Quantity *').fill('120');
  await page.getByLabel('Rate (₹)').fill('400');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Excavation Work')).toBeVisible();
  await logout(page);

  // Accounts raises an RA bill traced to that measurement entry
  await login(page, 'accounts@test.com');
  await page.goto(url);
  await page.getByRole('button', { name: 'Raise RA Bill' }).click();
  await page.getByLabel('Measurement Entry *').click();
  await page.getByRole('option', { name: /Excavation Work/ }).click();
  await page.getByLabel('Party Name *').fill('VMG Sugar Client');
  await page.getByLabel('Amount (₹) *').fill('48000');
  await page.getByRole('button', { name: 'Raise Bill' }).click();
  await expect(page.getByText('VMG Sugar Client').last()).toBeVisible();
  await logout(page);

  // Project Manager completes reconciliation and closes the project
  await login(page, 'projectmanager@test.com');
  await page.goto(url);
  await page.getByLabel('Material Reconciliation Complete').check();
  await page.getByLabel('Cost Reconciliation Complete').check();
  await page.getByRole('button', { name: 'Save Reconciliation' }).click();
  await expect(page.getByRole('button', { name: 'Close Project' })).toBeEnabled();

  await page.getByRole('button', { name: 'Close Project' }).click();
  await expect(page.getByText('CLOSED')).toBeVisible();
});
