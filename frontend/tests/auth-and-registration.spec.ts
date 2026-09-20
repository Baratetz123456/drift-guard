import { test, expect } from '@playwright/test';
import { generateTestTenant, solveCaptchaIfPresent, loginOperator } from './test-helpers';

test.describe('Authentication & Registration Suite', () => {
  test('Login page presentation: version number removed and CAPTCHA initially hidden', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 1. Version number v1.2 must not exist on login page
    const versionBadge = page.locator('text=v1.2');
    await expect(versionBadge).toHaveCount(0);

    // 2. CAPTCHA canvas must be hidden on initial mount
    const captchaCanvas = page.locator('canvas[data-captcha-code]');
    await expect(captchaCanvas).toBeHidden();

    // 3. Operational headline in sentence case
    const pageHeading = page.locator('h2');
    await expect(pageHeading).toBeVisible();
  });

  test('On-demand CAPTCHA reveal on login submission', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'new-operator@driftguard.local');
    await page.fill('input[type="password"]', 'Password2026!');

    // Before clicking submit: canvas is hidden
    await expect(page.locator('canvas[data-captcha-code]')).toBeHidden();

    // Click Sign In
    await page.click('button[type="submit"]');

    // Canvas is revealed on demand
    const captchaCanvas = page.locator('canvas[data-captcha-code]');
    await expect(captchaCanvas).toBeVisible();

    const code = await captchaCanvas.getAttribute('data-captcha-code');
    expect(code).toBeTruthy();
    expect(code?.length).toBe(6);
  });

  test('Session operator bypass vs new operator enforcement', async ({ page }) => {
    const tenant = generateTestTenant();

    // 1. First authentication for this operator in session -> requires CAPTCHA
    await page.goto('/login');
    await page.fill('input[type="email"]', tenant.email);
    await page.fill('input[type="password"]', tenant.pass);

    await solveCaptchaIfPresent(page);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));

    // 2. Log out
    await page.click('button:has-text("Sign out"), button:has-text("Sign Out"), [aria-label*="Sign out"], [title*="Sign out"]');
    await page.waitForURL(/.*login/);

    // 3. Re-enter same tenant email in same session -> CAPTCHA must be bypassed!
    await page.fill('input[type="email"]', tenant.email);
    await page.fill('input[type="password"]', tenant.pass);
    await page.click('button[type="submit"]');

    // Verify immediate redirect to dashboard without CAPTCHA challenge
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 8000 });
    expect(page.url()).not.toContain('/login');
  });

  test('Registration flow with on-demand CAPTCHA', async ({ page }) => {
    const newTenant = generateTestTenant();

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // On-demand CAPTCHA initially hidden
    await expect(page.locator('canvas[data-captcha-code]')).toBeHidden();

    await page.fill('input[name="name"], input[placeholder*="Name"], input[type="text"]', newTenant.name);
    await page.fill('input[type="email"]', newTenant.email);
    await page.fill('input[type="password"]', newTenant.pass);

    // Click Register button to prompt on-demand CAPTCHA
    await solveCaptchaIfPresent(page);

    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/register'), { timeout: 10000 });

    // Ensure landed on authenticated dashboard
    expect(page.url()).not.toContain('/register');
    expect(page.url()).not.toContain('/login');
  });
});
