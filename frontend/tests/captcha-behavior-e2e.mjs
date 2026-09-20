import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:5173';

async function runCaptchaBehaviorTests() {
  console.log('=================================================================');
  console.log('  TESTING ON-DEMAND CAPTCHA, SESSION ISOLATION & VERSION REMOVAL  ');
  console.log('=================================================================');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Initial Page Load State & Version Removal
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Navigating to /login and checking initial presentation...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Verify version badge v1.2 is NOT rendered
    const versionBadge = page.locator('text=v1.2');
    const isVersionVisible = await versionBadge.isVisible().catch(() => false);
    assert.equal(isVersionVisible, false, 'Version number "v1.2" must be completely removed from the login page');
    console.log('✓ Verified: Version number "v1.2" is removed from the showcase.');

    // Verify CAPTCHA is NOT rendered initially
    const initialCaptchaCanvas = page.locator('canvas[data-captcha-code]');
    assert.equal(await initialCaptchaCanvas.count(), 0, 'CAPTCHA canvas must NOT be rendered on initial page load');
    console.log('✓ Verified: CAPTCHA is hidden on initial page load.');

    // -------------------------------------------------------------------------
    // TEST 2: On-Demand Reveal upon clicking Sign In for a New User
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Submitting credentials for new user in session...');
    const user1Email = `engineer.alpha.${Date.now()}@driftguard.local`;
    await page.fill('input[type="email"]', user1Email);
    await page.fill('input[type="password"]', 'SecurePassword2026!');

    // Click "Sign in"
    await page.click('button[type="submit"]:has-text("Sign in")');
    await page.waitForTimeout(300);

    // Verify CAPTCHA is now revealed
    await page.waitForSelector('canvas[data-captcha-code]', { state: 'visible', timeout: 5000 });
    const captchaText1 = await page.getAttribute('canvas[data-captcha-code]', 'data-captcha-code');
    assert.ok(captchaText1 && captchaText1.length === 6, 'CAPTCHA must be revealed with a 6-character code');
    console.log(`✓ Verified: CAPTCHA revealed on-demand for new operator. Code: ${captchaText1}`);

    // Solve the CAPTCHA and submit
    await page.fill('input[data-testid="captcha-input"]', captchaText1);
    await page.waitForTimeout(600); // Respect relaxed 500ms timing
    await page.click('button[type="submit"]:has-text("Sign in")');

    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
    console.log('✓ Verified: Operator authenticated successfully and landed on dashboard.');

    // -------------------------------------------------------------------------
    // TEST 3: Session Bypass for the Same Returning Operator
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Testing session bypass for the same returning operator...');
    // Clear session auth token to simulate logging out or returning to /login in the same session
    await page.evaluate(() => sessionStorage.removeItem('auth_token'));
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Enter the same email
    await page.fill('input[type="email"]', user1Email);
    await page.fill('input[type="password"]', 'SecurePassword2026!');

    // Verify CAPTCHA is NOT shown initially
    assert.equal(await page.locator('canvas[data-captcha-code]').count(), 0);

    // Click "Sign in"
    await page.click('button[type="submit"]:has-text("Sign in")');

    // It should log in immediately without revealing CAPTCHA
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
    const isCaptchaStillHidden = (await page.locator('canvas[data-captcha-code]').count()) === 0;
    assert.equal(isCaptchaStillHidden, true, 'Same operator in session must not be prompted for CAPTCHA');
    console.log('✓ Verified: Same operator in session successfully bypassed CAPTCHA directly into dashboard!');

    // -------------------------------------------------------------------------
    // TEST 4: New/Different User in the Same Session Triggers CAPTCHA
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Testing new user detection in the same session...');
    await page.evaluate(() => sessionStorage.removeItem('auth_token'));
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    const user2Email = `operator.beta.${Date.now()}@driftguard.local`;
    await page.fill('input[type="email"]', user2Email);
    await page.fill('input[type="password"]', 'AnotherPassword2026!');

    // Click "Sign in"
    await page.click('button[type="submit"]:has-text("Sign in")');
    await page.waitForTimeout(300);

    // Verify CAPTCHA is required and revealed for this new user!
    await page.waitForSelector('canvas[data-captcha-code]', { state: 'visible', timeout: 5000 });
    const captchaText2 = await page.getAttribute('canvas[data-captcha-code]', 'data-captcha-code');
    assert.ok(captchaText2, 'New operator in session must be prompted with CAPTCHA challenge');
    console.log(`✓ Verified: New operator properly prompted with CAPTCHA (Code: ${captchaText2})`);

    // -------------------------------------------------------------------------
    // TEST 5: Registration Page On-Demand CAPTCHA
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Navigating to /register and checking on-demand reveal...');
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');

    // Verify CAPTCHA is NOT shown on initial register page
    assert.equal(await page.locator('canvas[data-captcha-code]').count(), 0, 'CAPTCHA must be hidden on register page load');

    const regEmail = `new.operator.${Date.now()}@driftguard.local`;
    await page.fill('input[placeholder="e.g. Alex Rivera"]', 'Alex Rivera');
    await page.fill('input[type="email"]', regEmail);
    await page.fill('input[type="password"]', 'RegisterPassword2026!');
    await page.check('input#terms-agreement');

    // Click Register
    await page.click('button[type="submit"]');
    await page.waitForTimeout(300);

    // Verify CAPTCHA is revealed on demand
    await page.waitForSelector('canvas[data-captcha-code]', { state: 'visible', timeout: 5000 });
    const regCaptcha = await page.getAttribute('canvas[data-captcha-code]', 'data-captcha-code');
    assert.ok(regCaptcha, 'Registration must prompt with CAPTCHA on submit');
    console.log(`✓ Verified: Registration properly revealed CAPTCHA on demand (Code: ${regCaptcha})`);

    // Solve CAPTCHA and complete registration
    await page.fill('input[data-testid="captcha-input"]', regCaptcha);
    await page.waitForTimeout(600);
    await page.click('button[type="submit"]');

    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
    console.log('✓ Verified: Registration completed and operator landed on dashboard.');

    console.log('\n=================================================================');
    console.log('🎉 ALL CAPTCHA BEHAVIOR, TIMING & SESSION TESTS PASSED!');
    console.log('=================================================================\n');
  } finally {
    await browser.close();
  }
}

runCaptchaBehaviorTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
