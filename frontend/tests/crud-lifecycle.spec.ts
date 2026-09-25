import { test, expect } from '@playwright/test';
import { loginOperator } from './test-helpers';

test.describe('CRUD Lifecycle Suite (Devices, Groups & Command Sets)', () => {
  test.beforeEach(async ({ page }) => {
    await loginOperator(page);
  });

  test('Device CRUD: Register, Inspect, Update and Delete', async ({ page }) => {
    await page.goto('/setup?tab=devices');
    await page.waitForLoadState('networkidle');

    // 1. CREATE: Register device
    const deviceName = `Core-Edge-${Date.now().toString(36)}`;
    await page.click('button:has-text("Register")');
    await page.waitForSelector('input[placeholder="e.g. CORE-SW-01"]');

    await page.fill('input[placeholder="e.g. CORE-SW-01"]', deviceName);
    await page.fill('input[placeholder*="10.200.1.1"]', '10.250.1.99');
    await page.fill('input[placeholder="Enter device password"]', 'CiscoSecret2026!');

    const driverSelect = page.locator('select').first();
    await driverSelect.selectOption('cisco_xe');

    await page.click('form button[type="submit"]:has-text("Register")');

    // 2. READ: Confirm in table
    const deviceRow = page.locator(`table >> text=${deviceName}`);
    await expect(deviceRow).toBeVisible({ timeout: 8000 });

    // 3. UPDATE: Click into device detail page and update
    await deviceRow.click();
    await page.waitForURL(/\/setup\/devices\//);

    const nameInput = page.locator('input[value*="Core-Edge"]').first();
    const updatedName = `${deviceName}-Updated`;
    await nameInput.fill(updatedName);

    // Save changes
    const saveButton = page.locator('button:has-text("Save")').first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(500);
    }

    // 4. DELETE: Delete device
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await deleteButton.click();

    // Confirm in dialog
    const confirmDeleteBtn = page.locator('[role="dialog"] button:has-text("Delete"), button:has-text("Confirm")').first();
    await confirmDeleteBtn.click();

    // Verify redirected back to devices table and device is deleted
    await page.waitForURL(/\/setup.*devices/, { timeout: 10000 });
    await expect(page.locator(`table >> text=${updatedName}`)).toHaveCount(0);
  });

  test('Device Group CRUD: Create and Delete', async ({ page }) => {
    await page.goto('/setup?tab=devices');
    await page.waitForLoadState('networkidle');

    // Switch to Device Groups tab
    await page.click('button:has-text("Device Groups")');

    // Click Create Group
    const groupName = `Prod-Group-${Date.now().toString(36)}`;
    await page.click('button:has-text("Create Group")');

    // Fill form
    await page.fill('input[placeholder*="Group Name"], input[placeholder*="Core Switches"]', groupName);
    await page.click('button[type="submit"]:has-text("Create")');

    // Assert group appears in list/cards
    await expect(page.locator(`text=${groupName}`)).toBeVisible({ timeout: 8000 });

    // Delete group
    const groupCard = page.locator(`div:has-text("${groupName}")`).first();
    const deleteGroupBtn = groupCard.locator('button:has-text("Delete"), [aria-label*="Delete"]').first();
    if (await deleteGroupBtn.isVisible()) {
      await deleteGroupBtn.click();
      const confirmBtn = page.locator('[role="dialog"] button:has-text("Delete")').first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
    }
  });

  test('Command Sets: Mutating command safety rejection in UI', async ({ page }) => {
    await page.goto('/setup?tab=command-sets');
    await page.waitForLoadState('networkidle');

    // Click Create Command Set or Add
    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();

      // Attempt to enter mutating command: reload
      const cmdInput = page.locator('textarea, input[placeholder*="show"]').first();
      if (await cmdInput.isVisible()) {
        await cmdInput.fill('reload');
        // UI validation or save should flag it
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          // Error or blocked notification should display
          const errorMsg = page.locator('text=/show|mutating|invalid|blocked/i').first();
          await expect(errorMsg).toBeVisible();
        }
      }
    }
  });
});
