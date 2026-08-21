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

test('Design: Draft -> Checklist -> Design Head -> Customer -> Released -> ECN', async ({ page }) => {
  const drawingNumber = `DWG-${Date.now()}`;

  // Design Engineer creates the drawing
  await login(page, 'designengineer@test.com');
  await page.getByRole('link', { name: 'Drawings' }).click();
  await page.getByRole('button', { name: 'New Drawing' }).click();
  await page.getByLabel('Drawing Number *').fill(drawingNumber);
  await page.getByLabel('Drawing Title *').fill('Pressure Vessel GA');
  await page.getByLabel('Equipment Name *').fill('Vessel V-101');
  await page.getByLabel('Requires Customer Approval before release').check();
  await page.getByRole('button', { name: 'Create Drawing' }).click();
  await expect(page).toHaveURL(/\/drawings\/\d+/);

  // Add a BOM line
  await page.getByRole('button', { name: 'Add BOM Line' }).click();
  await page.getByLabel('Item No. *').fill('1');
  await page.getByLabel('Description *').fill('Shell Plate');
  await page.getByLabel('Quantity *').fill('4');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Shell Plate')).toBeVisible();

  // Submit for checking
  await page.getByRole('button', { name: 'Submit for Checking' }).click();
  await expect(page.getByText('UNDER CHECKING')).toBeVisible();
  const url = page.url();
  await logout(page);

  // Checker completes the checklist and approves
  await login(page, 'checker@test.com');
  await page.goto(url);
  // Approve should be disabled until all 13 checked
  await expect(page.getByRole('button', { name: 'Approve' })).toBeDisabled();
  const CHECKLIST_LABELS = [
    'Dimensions', 'Tolerances', 'Material Grade', 'Welding Details', 'Shaft Design',
    'Bearing Selection', 'Gearbox Selection', 'Structural Load', 'Corrosion Allowance',
    'Interface Matching', 'Manufacturability', 'Drawing Standard', 'BOM Accuracy',
  ];
  for (const label of CHECKLIST_LABELS) {
    await page.getByLabel(label, { exact: true }).check();
  }
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('CHECKER APPROVED')).toBeVisible();
  await logout(page);

  // Design Head approves -> routes to customer approval since flagged
  await login(page, 'designhead@test.com');
  await page.goto(url);
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('AWAITING CUSTOMER APPROVAL')).toBeVisible();

  await page.getByRole('button', { name: 'Record Customer Approval' }).click();
  await expect(page.getByText('CUSTOMER APPROVED')).toBeVisible();

  await page.getByRole('button', { name: 'Release Drawing' }).click();
  await expect(page.getByText('RELEASED', { exact: true })).toBeVisible();

  // Raise and approve an ECN against the released drawing
  await page.getByRole('button', { name: 'Raise ECN' }).click();
  await page.getByLabel('Reason for Change *').fill('Customer requested thicker shell');
  await page.getByLabel('Requested By *').fill('Design Head');
  await page.getByLabel('New Revision *').fill('B');
  await page.getByRole('button', { name: 'Raise ECN' }).click();
  await expect(page.getByText('Customer requested thicker shell')).toBeVisible();

  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('DWG')).toBeVisible();
});
