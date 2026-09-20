import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:5173';

async function runDriverCompatibilityVerification() {
  console.log('[Test] Launching headless browser to verify device driver compatibility...');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Authenticate
    console.log('[Step 1] Logging in as test engineer...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'engineer@driftguard.local');
    await page.fill('input[type="password"]', 'CorrectHorseBatteryStaple99!');
    
    // Auto-fill CAPTCHA
    await page.waitForSelector('canvas[data-captcha-code]', { timeout: 5000 });
    const captchaText = await page.getAttribute('canvas[data-captcha-code]', 'data-captcha-code');
    console.log(`Solving CAPTCHA challenge: ${captchaText}`);
    await page.fill('input[data-testid="captcha-input"]', captchaText);

    // Respect 1.2s time-gate
    await page.waitForTimeout(1400);

    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
    console.log('✓ Successfully authenticated and navigated to dashboard.');

    // 2. Navigate to Devices page and register Cisco IOS-XE device
    console.log('[Step 2] Registering custom Cisco IOS-XE device in Devices inventory...');
    await page.goto(`${BASE_URL}/devices`);
    await page.waitForLoadState('networkidle');

    // Click "Register"
    await page.click('button:has-text("Register")');
    await page.waitForSelector('input[placeholder="e.g. CORE-SW-01"]', { state: 'visible' });

    const testDeviceName = `Lab-Cat9300-${Date.now().toString(36)}`;
    await page.fill('input[placeholder="e.g. CORE-SW-01"]', testDeviceName);
    await page.fill('input[placeholder*="10.200.1.1"]', '10.150.10.99');
    
    // Explicitly verify the driver select is set to Cisco IOS-XE
    const driverSelect = page.locator('select').first();
    await driverSelect.selectOption('cisco_xe');

    await page.fill('input[placeholder="Enter device password"]', 'SecretLabPass99!');
    await page.click('form button[type="submit"]:has-text("Register")');

    // Wait for modal to close and device to appear in table
    await page.waitForSelector(`table >> text=${testDeviceName}`, { timeout: 10000 });
    console.log(`✓ Custom device registered successfully: ${testDeviceName} (driver: cisco_xe)`);

    // 3. Navigate to Operations -> Capture
    console.log('[Step 3] Navigating to Operations -> Capture...');
    await page.goto(`${BASE_URL}/operations?tab=capture`);
    await page.waitForLoadState('networkidle');

    // In Step 1 Target selection, search for the newly registered device
    const searchInput = page.locator('input[placeholder*="Filter by hostname"]').or(
      page.locator('input[placeholder*="Search"]')
    ).first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill(testDeviceName);
      await page.waitForTimeout(400);
    }

    // Select the newly registered device in the target table
    const targetRow = page.locator('table tbody tr', { hasText: testDeviceName });
    await targetRow.click();
    console.log(`✓ Selected ${testDeviceName} in target table.`);

    // 4. Verify Step 2: Command profile compatibility
    console.log('[Step 4] Checking command set profile compatibility in Step 2...');
    await page.waitForSelector('text=Configure Command Profile & Telemetry Parameters', { state: 'visible' });

    // Verify the command set select box does NOT contain "Mismatched Driver" for Cisco IOS-XE
    const selectEl = page.locator('select').first();
    const selectedText = await selectEl.innerText();
    console.log(`Select options preview: ${selectedText.slice(0, 150)}...`);

    // Assert that Standard Operational Health is marked as compatible
    assert.match(selectedText, /✓ Compatible/, 'Standard Operational Health command set must be marked ✓ Compatible');
    assert.doesNotMatch(selectedText, /\[Mismatched Driver: Cisco IOS-XE\]/, 'Must not show Mismatched Driver for Cisco IOS-XE');

    // Verify no red mismatch error message is shown under the select box
    const mismatchError = page.locator('text=Mismatched driver for target nodes');
    const isErrorVisible = await mismatchError.isVisible().catch(() => false);
    assert.equal(isErrorVisible, false, 'Error "Mismatched driver for target nodes" must NOT be visible');

    // Verify that the blocked alert banner is NOT shown
    const blockedBanner = page.locator('text=Driver Compatibility Mismatch — Blocked');
    const isBlocked = await blockedBanner.isVisible().catch(() => false);
    assert.equal(isBlocked, false, 'Driver Compatibility Mismatch banner must NOT be blocked');

    // Verify positive confirmation exists
    const positiveBadge = page.locator('text=Cisco IOS-XE');
    assert.equal(await positiveBadge.count() > 0, true, 'Target Driver badge for Cisco IOS-XE must be visible');

    // Click "Run collection" button or verify it is enabled
    const runBtn = page.locator('button:has-text("Run collection")');
    assert.equal(await runBtn.isEnabled(), true, 'Primary "Run collection" button must be enabled when drivers match');
    console.log('✓ Primary "Run collection" button is active and enabled (zero driver mismatch)!');

    console.log('\n======================================================');
    console.log('🎉 ALL DRIVER COMPATIBILITY VERIFICATIONS PASSED!');
    console.log('======================================================\n');
  } finally {
    await browser.close();
  }
}

runDriverCompatibilityVerification().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
