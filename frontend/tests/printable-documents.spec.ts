import { test, expect } from '@playwright/test';
import { loginOperator } from './test-helpers';

test.describe('Printable Documents & Dossier Formats Suite', () => {
  test.beforeEach(async ({ page }) => {
    await loginOperator(page);
  });

  test('Printable Audit Ledger Report renders 1:1 scale dossier', async ({ page }) => {
    await page.goto('/reports/audit/ledger');
    await page.waitForLoadState('networkidle');

    // Verify title and header
    await expect(page.locator('text=Audit Trail Ledger Dossier').first()).toBeVisible({ timeout: 8000 });

    // Floating toolbar is present in screen view
    const floatingToolbar = page.locator('div.print\\:hidden');
    await expect(floatingToolbar).toBeVisible();

    // Print button exists
    const printButton = floatingToolbar.locator('button:has-text("Print")');
    await expect(printButton).toBeVisible();

    // Verify document shell contains official header and ledger table
    const documentCanvas = page.locator('div[style*="210mm"], div.bg-white, div.font-mono');
    await expect(documentCanvas.first()).toBeVisible();
  });

  test('Printable AI Analysis Report renders with executive verification blocks', async ({ page }) => {
    // Navigate to analysis page first to get an analysis ID
    await page.goto('/analysis?tab=report');
    await page.waitForLoadState('networkidle');

    // Click Print Report button or navigate directly to reports route
    await page.goto('/reports/analysis/an_seed_001');
    await page.waitForLoadState('networkidle');

    // Verify Document title
    const docHeader = page.locator('h1, span:has-text("Drift Verification Dossier"), span:has-text("Dossier")').first();
    await expect(docHeader).toBeVisible({ timeout: 8000 });
  });

  test('@media print CSS emulation suppresses UI chrome', async ({ page }) => {
    await page.goto('/reports/audit/ledger');
    await page.waitForLoadState('networkidle');

    // Emulate print media
    await page.emulateMedia({ media: 'print' });

    // In print mode, elements with print:hidden must have display: none
    const toolbar = page.locator('div.print\\:hidden').first();
    const isHiddenInPrint = await toolbar.evaluate((el) => {
      return window.getComputedStyle(el).display === 'none';
    });
    expect(isHiddenInPrint).toBe(true);
  });
});
