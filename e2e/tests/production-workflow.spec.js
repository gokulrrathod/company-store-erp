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

test('Production: Plan -> Head Approval -> Activity -> Status -> Stage Inspection -> Rework', async ({ page }) => {
  // Production Engineer creates a weekly plan
  await login(page, 'production@test.com');
  await page.getByRole('link', { name: 'Production Plans' }).click();
  await page.getByRole('button', { name: 'New Plan' }).click();
  await page.getByLabel('Project Reference *').fill('Vessel V-101 Fabrication');
  await page.getByLabel('Week Number *').fill('W34');
  await page.getByLabel('Start Date *').fill('2026-08-18');
  await page.getByLabel('End Date *').fill('2026-08-24');
  await page.getByLabel('Planned Quantity *').fill('10');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Vessel V-101 Fabrication')).toBeVisible();

  const row = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: 'Vessel V-101 Fabrication' }).first();
  await row.getByRole('button').click();
  await expect(page).toHaveURL(/\/production-plans\/\d+/);
  await expect(page.getByText('Approve the plan before scheduling activities.')).toBeVisible();
  const planUrl = page.url();
  await logout(page);

  // Production Head approves the plan
  await login(page, 'productionhead@test.com');
  await page.goto(planUrl);
  await page.getByRole('button', { name: 'Approve Plan' }).click();
  await expect(page.getByText('APPROVED', { exact: true })).toBeVisible();
  await logout(page);

  // Shop Floor Engineer schedules an activity
  await login(page, 'shopfloor@test.com');
  await page.goto(planUrl);
  await page.getByRole('button', { name: 'Add Activity' }).click();
  await page.getByLabel('Equipment Name *').fill('Vessel V-101');
  await page.getByLabel('Activity *').fill('Welding');
  await page.getByLabel('Responsible Engineer *').fill('Shop Floor Engineer');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Welding')).toBeVisible();

  await page.locator('.ag-center-cols-container .ag-row').first().getByRole('button').click();
  await expect(page).toHaveURL(/\/production-schedules\/\d+/);

  // Update status to In Progress
  await page.getByLabel('Status *').click();
  await page.getByRole('option', { name: 'In Progress' }).click();
  await page.getByRole('button', { name: 'Save Status' }).click();
  await expect(page.getByText('IN PROGRESS', { exact: true })).toBeVisible();

  // Log a stage inspection
  await page.getByRole('button', { name: 'Log Stage Inspection' }).click();
  await page.getByLabel('Inspection Stage *').click();
  await page.getByRole('option', { name: 'WELDING' }).click();
  await page.getByLabel('Inspector Name *').fill('Quality User');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Quality User')).toBeVisible();

  // Log a rework/rejection entry
  await page.getByRole('button', { name: 'Log Rework / Rejection' }).click();
  await page.getByLabel('Part Name *').fill('Shell Plate Seam');
  await page.getByLabel('Quantity Produced *').fill('10');
  await page.getByLabel('Reason *').fill('Porosity found in weld seam');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Shell Plate Seam')).toBeVisible();
});
