import { test, expect } from '@playwright/test';
import { generateTestTenant, solveCaptchaIfPresent } from './test-helpers';

test.describe('Security, Route Protection & Tenant Isolation Suite', () => {
  test('Unauthenticated access to protected routes strictly redirects to /login', async ({ page }) => {
    const protectedRoutes = [
      '/',
      '/setup?tab=devices',
      '/setup/devices/dev-test',
      '/operations?tab=capture',
      '/analysis',
      '/reports/audit/ledger',
      '/settings',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL(/.*login/, { timeout: 8000 });
      expect(page.url()).toContain('/login');
    }
  });

  test('Multi-Tenant Data Quarantine: Tenant B cannot see Tenant A devices', async ({ browser }) => {
    const tenantA = generateTestTenant();
    const tenantB = generateTestTenant();

    // 1. Tenant A registers and adds private device
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    await pageA.goto('/register');
    await pageA.fill('input[type="text"]', tenantA.name);
    await pageA.fill('input[type="email"]', tenantA.email);
    await pageA.fill('input[type="password"]', tenantA.pass);
    await solveCaptchaIfPresent(pageA);
    await pageA.click('button[type="submit"]');
    await pageA.waitForURL((url) => !url.pathname.includes('/register'));

    // Register private device for Tenant A
    await pageA.goto('/setup?tab=devices');
    await pageA.click('button:has-text("Register")');
    const privateDeviceName = `TenantA-SecretRtr-${Date.now().toString(36)}`;
    await pageA.fill('input[placeholder="e.g. CORE-SW-01"]', privateDeviceName);
    await pageA.fill('input[placeholder*="10.200.1.1"]', '10.99.99.1');
    await pageA.click('form button[type="submit"]:has-text("Register")');
    await expect(pageA.locator(`table >> text=${privateDeviceName}`)).toBeVisible({ timeout: 8000 });

    await contextA.close();

    // 2. Tenant B registers and inspects inventory
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    await pageB.goto('/register');
    await pageB.fill('input[type="text"]', tenantB.name);
    await pageB.fill('input[type="email"]', tenantB.email);
    await pageB.fill('input[type="password"]', tenantB.pass);
    await solveCaptchaIfPresent(pageB);
    await pageB.click('button[type="submit"]');
    await pageB.waitForURL((url) => !url.pathname.includes('/register'));

    await pageB.goto('/setup?tab=devices');
    await pageB.waitForLoadState('networkidle');

    // Assert Tenant A's private device NEVER appears in Tenant B's inventory!
    const leakedDeviceCount = await pageB.locator(`table >> text=${privateDeviceName}`).count();
    expect(leakedDeviceCount).toBe(0);

    await contextB.close();
  });
});
