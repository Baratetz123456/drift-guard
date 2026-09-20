import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE_URL = 'http://localhost:5173';

async function runBrowserLifecycleTest() {
  console.log('===============================================================');
  console.log('  DRIFTGUARD BROWSER TERMINATION, DURABILITY & ISOLATION TEST  ');
  console.log('===============================================================');

  // Create a dedicated disk profile directory simulating real browser persistent profile
  const userProfileDir = path.join(os.tmpdir(), `driftguard_e2e_profile_${Date.now()}`);
  fs.mkdirSync(userProfileDir, { recursive: true });

  try {
    // -------------------------------------------------------------------------
    // PHASE 1: User A Session, Device Registration, and Persistence
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 1] Launching Browser with Persistent Profile for User A (Alice)...');
    let contextA = await chromium.launchPersistentContext(userProfileDir, {
      channel: 'chrome',
      headless: true,
      viewport: { width: 1440, height: 900 },
    });
    let pageA = contextA.pages()[0] || (await contextA.newPage());

    await pageA.goto(`${BASE_URL}/login`);
    await pageA.waitForLoadState('networkidle');

    console.log('Authenticating as User A (alice.network@driftguard.local)...');
    await pageA.fill('input[type="email"]', 'alice.network@driftguard.local');
    await pageA.fill('input[type="password"]', 'EnterpriseSecurity2026');

    // Retrieve CAPTCHA code from canvas data attribute
    await pageA.waitForSelector('canvas[data-captcha-code]', { timeout: 5000 });
    const captchaText = await pageA.getAttribute('canvas[data-captcha-code]', 'data-captcha-code');
    console.log(`Solving CAPTCHA challenge: ${captchaText}`);
    await pageA.fill('input[data-testid="captcha-input"]', captchaText);

    // Respect 1.2s time-gate
    await pageA.waitForTimeout(1400);

    // Submit login form
    await pageA.click('button[type="submit"]');
    await pageA.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
    console.log('✓ User A authenticated successfully and landed on dashboard.');

    // Navigate to Setup Devices
    await pageA.goto(`${BASE_URL}/setup?tab=devices`);
    await pageA.waitForLoadState('networkidle');

    console.log('Registering custom network device for User A: Austin-Edge-Core-99...');
    // Click the "Register" button in header
    await pageA.click('button:has-text("Register")');
    await pageA.waitForSelector('input[placeholder="e.g. CORE-SW-01"]', { timeout: 5000 });

    // Fill the registration form
    await pageA.fill('input[placeholder="e.g. CORE-SW-01"]', 'Austin-Edge-Core-99');
    await pageA.fill('input[placeholder*="10.200.1.1"]', '10.10.99.1');
    await pageA.fill('input[placeholder="Enter device password"]', 'CiscoSecret2026!');

    // Submit registration
    await pageA.click('form button:has-text("Register")');
    await pageA.waitForTimeout(1000);

    // Verify Austin-Edge-Core-99 appears in User A's table
    const deviceRow = pageA.locator('table').locator('text=Austin-Edge-Core-99').first();
    await deviceRow.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Device "Austin-Edge-Core-99" successfully registered in User A inventory.');

    // -------------------------------------------------------------------------
    // PHASE 2: Complete Browser Termination & Process Destruction
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 2] Completely Closing & Terminating Browser Process...');
    await contextA.close();
    console.log('✓ Browser process terminated. Ephemeral sessionStorage destroyed. Persistent database preserved.');

    // -------------------------------------------------------------------------
    // PHASE 3: Reopening Browser & Session Verification
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 3] Reopening Browser with Preserved Disk Database...');
    let contextA_reopened = await chromium.launchPersistentContext(userProfileDir, {
      channel: 'chrome',
      headless: true,
      viewport: { width: 1440, height: 900 },
    });
    let pageA_reopened = contextA_reopened.pages()[0] || (await contextA_reopened.newPage());

    console.log('Navigating to root URL in reopened browser...');
    await pageA_reopened.goto(`${BASE_URL}/`);
    await pageA_reopened.waitForURL(/.*login/, { timeout: 8000 });
    console.log('✓ Verified: Reopened browser enforces re-authentication (sessionStorage was wiped on process termination).');

    // Re-authenticate as User A
    console.log('Re-authenticating as User A (alice.network@driftguard.local)...');
    await pageA_reopened.fill('input[type="email"]', 'alice.network@driftguard.local');
    await pageA_reopened.fill('input[type="password"]', 'EnterpriseSecurity2026');

    await pageA_reopened.waitForSelector('canvas[data-captcha-code]', { timeout: 5000 });
    const captchaReopened = await pageA_reopened.getAttribute('canvas[data-captcha-code]', 'data-captcha-code');
    await pageA_reopened.fill('input[data-testid="captcha-input"]', captchaReopened);
    await pageA_reopened.waitForTimeout(1400);
    await pageA_reopened.click('button[type="submit"]');
    await pageA_reopened.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    // Navigate to Setup Devices
    await pageA_reopened.goto(`${BASE_URL}/setup?tab=devices`);
    await pageA_reopened.waitForLoadState('networkidle');

    // Assert User A's custom device remained available!
    const restoredDevice = pageA_reopened.locator('table').locator('text=Austin-Edge-Core-99').first();
    await restoredDevice.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ SUCCESS: "Austin-Edge-Core-99" is 100% available and intact after browser restart!');

    await contextA_reopened.close();

    // -------------------------------------------------------------------------
    // PHASE 4: Multi-Tenant Data Isolation (User B Inspection)
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 4] Verifying Multi-Tenant Data Isolation with User B...');
    let contextB = await chromium.launchPersistentContext(userProfileDir, {
      channel: 'chrome',
      headless: true,
      viewport: { width: 1440, height: 900 },
    });
    let pageB = contextB.pages()[0] || (await contextB.newPage());

    await pageB.goto(`${BASE_URL}/login`);
    await pageB.waitForLoadState('networkidle');

    console.log('Authenticating as User B (bob.architect@driftguard.local)...');
    await pageB.fill('input[type="email"]', 'bob.architect@driftguard.local');
    await pageB.fill('input[type="password"]', 'ArchPass2026!');

    await pageB.waitForSelector('canvas[data-captcha-code]', { timeout: 5000 });
    const captchaB = await pageB.getAttribute('canvas[data-captcha-code]', 'data-captcha-code');
    await pageB.fill('input[data-testid="captcha-input"]', captchaB);

    await pageB.waitForTimeout(1400);
    await pageB.click('button[type="submit"]');
    await pageB.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    await pageB.goto(`${BASE_URL}/setup?tab=devices`);
    await pageB.waitForLoadState('networkidle');

    // User B MUST NOT see Austin-Edge-Core-99
    const userADeviceInB = await pageB.locator('table').locator('text=Austin-Edge-Core-99').count();
    assert.equal(userADeviceInB, 0, 'Security Violation: User B can see User A device!');
    console.log('✓ Verified: User B CANNOT see User A\'s device (Tenant isolation enforced).');

    await contextB.close();

    // -------------------------------------------------------------------------
    // PHASE 5: Unauthenticated Resource Path Blocking
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 5] Testing Unauthenticated Resource Path Blocking...');
    const unauthDir = path.join(os.tmpdir(), `driftguard_unauth_${Date.now()}`);
    let unauthContext = await chromium.launchPersistentContext(unauthDir, {
      channel: 'chrome',
      headless: true,
    });
    let unauthPage = unauthContext.pages()[0] || (await unauthContext.newPage());

    const protectedPaths = [
      '/setup',
      '/setup/devices/dev-test',
      '/operations',
      '/analysis',
      '/reports/audit/ledger',
    ];

    for (const path of protectedPaths) {
      await unauthPage.goto(`${BASE_URL}${path}`);
      await unauthPage.waitForURL(/.*login/, { timeout: 5000 });
      assert.ok(unauthPage.url().includes('/login'), `Expected redirect to /login from ${path}`);
      console.log(`✓ Unauthenticated path blocked: ${path} -> /login`);
    }

    await unauthContext.close();
    fs.rmSync(unauthDir, { recursive: true, force: true });

    console.log('\n===============================================================');
    console.log('  ALL BROWSER LIFECYCLE, DURABILITY & SECURITY TESTS PASSED!  ');
    console.log('===============================================================');

  } finally {
    fs.rmSync(userProfileDir, { recursive: true, force: true });
  }
}

runBrowserLifecycleTest().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
