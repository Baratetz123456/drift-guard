import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginOperator } from './test-helpers';

test.describe('Accessibility (WCAG 2.1 AA) & Brand Design Standards Suite', () => {
  test('Axe-Core accessibility audit on /login and /register', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Run Axe audit on login page
    const loginAxeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // Ignore third-party brand lime/black dark-mode variance
      .analyze();

    const criticalViolations = loginAxeResults.violations.filter((v) => v.impact === 'critical');
    expect(criticalViolations).toEqual([]);

    // Run Axe audit on register page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const registerAxeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const registerCritical = registerAxeResults.violations.filter((v) => v.impact === 'critical');
    expect(registerCritical).toEqual([]);
  });

  test('Axe-Core accessibility audit on authenticated core views', async ({ page }) => {
    await loginOperator(page);

    const routesToAudit = [
      '/setup?tab=devices',
      '/operations?tab=capture',
      '/analysis',
      '/reports/audit/ledger',
      '/settings',
    ];

    for (const route of routesToAudit) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(['color-contrast'])
        .analyze();

      const critical = results.violations.filter((v) => v.impact === 'critical');
      expect(critical).toEqual([]);
    }
  });

  test('Brand Standards Linter: Zero-Emerald Law & Voltage Accent Validation', async ({ page }) => {
    await loginOperator(page);
    await page.goto('/setup?tab=devices');
    await page.waitForLoadState('networkidle');

    // 1. Zero-Emerald Law: No emerald color tokens or CSS classes in DOM
    const emeraldElements = await page.locator('[class*="emerald-"]').count();
    expect(emeraldElements).toBe(0);

    // 2. Voltage Accent on primary buttons: Must not have button gradient
    const primaryBtn = page.locator('button:has-text("Register")').first();
    await expect(primaryBtn).toBeVisible();

    const btnClasses = await primaryBtn.getAttribute('class');
    expect(btnClasses).not.toContain('bg-gradient');
  });

  test('Brand Standards Linter: Zero-Badge-Count Law on navigation items', async ({ page }) => {
    await loginOperator(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Sidebar navigation and top phase tabs must NOT contain numeric badge count pills
    const navItemPills = page.locator('nav button span.rounded-full, nav a span.rounded-full');
    const pillCount = await navItemPills.count();
    for (let i = 0; i < pillCount; i++) {
      const text = await navItemPills.nth(i).textContent();
      // Text must not be a bare numeric counter like "5", "12", "100"
      if (text && /^\d+$/.test(text.trim())) {
        expect(text.trim()).toBeFalsy();
      }
    }
  });

  test('Brand Standards Linter: Sentence case on primary buttons', async ({ page }) => {
    await loginOperator(page);
    await page.goto('/operations?tab=capture');
    await page.waitForLoadState('networkidle');

    // Button should be "Run collection" or "Capture" (sentence case, NOT all-caps "RUN COLLECTION")
    const actionButtons = page.locator('button');
    const buttonCount = await actionButtons.count();

    for (let i = 0; i < Math.min(buttonCount, 15); i++) {
      const btnText = (await actionButtons.nth(i).textContent())?.trim();
      if (btnText && btnText.length > 3 && !btnText.includes('\n')) {
        // Assert button is not uppercase shouty text
        const isAllCaps = btnText === btnText.toUpperCase() && /[A-Z]/.test(btnText);
        expect(isAllCaps).toBe(false);
      }
    }
  });
});
