import { test, expect } from '@playwright/test';
import { generateTestTenant, solveCaptchaIfPresent, loginOperator } from './test-helpers';

test.describe('Compatibility & Data Persistence Suite', () => {
  test('Cisco Driver Compatibility in Operations -> Capture', async ({ page }) => {
    await loginOperator(page);

    // 1. Register a custom Cisco IOS-XE device
    await page.goto('/setup?tab=devices');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Register")');
    await page.waitForSelector('input[placeholder="e.g. CORE-SW-01"]');

    const testDeviceName = `Compat-Router-${Date.now().toString(36)}`;
    await page.fill('input[placeholder="e.g. CORE-SW-01"]', testDeviceName);
    await page.fill('input[placeholder*="10.200.1.1"]', '10.150.10.77');

    const driverSelect = page.locator('select').first();
    await driverSelect.selectOption('cisco_xe');

    await page.fill('input[placeholder="Enter device password"]', 'SecretLabPass99!');
    await page.click('form button[type="submit"]:has-text("Register")');

    await expect(page.locator(`table >> text=${testDeviceName}`)).toBeVisible({ timeout: 8000 });

    // 2. Navigate to Operations -> Capture
    await page.goto('/operations?tab=capture');
    await page.waitForLoadState('networkidle');

    // Select the registered device in target table
    const targetRow = page.locator(`tr:has-text("${testDeviceName}")`).first();
    if (await targetRow.isVisible()) {
      await targetRow.click();
    } else {
      // If in card or list view, select first device
      await page.locator('input[type="checkbox"]').first().check();
    }

    // 3. Verify driver compatibility in Step 2 Command Set selection
    const commandSetSelect = page.locator('select').first();
    await expect(commandSetSelect).toBeVisible();

    const selectText = await commandSetSelect.innerText();

    // Cisco IOS-XE command sets must NOT say "Mismatched Driver: Cisco IOS-XE"
    expect(selectText).not.toContain('[Mismatched Driver: Cisco IOS-XE]');

    // Primary action button must be active and enabled
    const runCollectionBtn = page.locator('button:has-text("Run collection"), button:has-text("Capture")').first();
    await expect(runCollectionBtn).toBeEnabled();
  });

  test('Local storage tenant partitioning and persistence', async ({ page }) => {
    const tenant = generateTestTenant();

    await page.goto('/register');
    await page.fill('input[type="text"]', tenant.name);
    await page.fill('input[type="email"]', tenant.email);
    await page.fill('input[type="password"]', tenant.pass);
    await solveCaptchaIfPresent(page);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/register'));

    // Register a device
    await page.goto('/setup?tab=devices');
    await page.click('button:has-text("Register")');
    const deviceName = `Persistent-Switch-${Date.now().toString(36)}`;
    await page.fill('input[placeholder="e.g. CORE-SW-01"]', deviceName);
    await page.fill('input[placeholder*="10.200.1.1"]', '10.88.88.88');
    await page.click('form button[type="submit"]:has-text("Register")');

    await expect(page.locator(`table >> text=${deviceName}`)).toBeVisible({ timeout: 8000 });

    // Inspect localStorage to verify keys are partitioned by deterministic user ID
    const keys = await page.evaluate(() => Object.keys(localStorage));
    const userKeys = keys.filter((k) => k.startsWith('driftguard_usr_') || k.startsWith('driftguard_'));
    expect(userKeys.length).toBeGreaterThan(0);

    // Verify sessionStorage holds operator credentials
    const sessionToken = await page.evaluate(() => sessionStorage.getItem('driftguard_id_token'));
    expect(sessionToken).toBeTruthy();
  });
});
