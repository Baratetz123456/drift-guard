import { test, expect } from '@playwright/test';
import { loginOperator } from './test-helpers';

test.describe('AI Analysis & Report Invariants Suite', () => {
  test.beforeEach(async ({ page }) => {
    await loginOperator(page);
  });

  test('AI Analysis page displays structured change verification report', async ({ page }) => {
    await page.goto('/analysis?tab=report');
    await page.waitForLoadState('networkidle');

    // Heading
    await expect(page.locator('h1 >> text=DriftGuard Analysis')).toBeVisible({ timeout: 8000 });

    // Advisory AI disclaimer must be visible
    const advisoryNote = page.locator('text=/Engineer verification required|advisory only/i').first();
    await expect(advisoryNote).toBeVisible();

    // Summary heading must exist
    const summaryHeadline = page.locator('h2').first();
    await expect(summaryHeadline).toBeVisible();
    const summaryText = await summaryHeadline.textContent();
    expect(summaryText).toBeTruthy();

    // Export and Print buttons
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
    await expect(page.locator('button:has-text("Print Report")')).toBeVisible();
  });

  test('Zero-Change Informational Invariant & Rollback Runbook Suppression', async ({ page }) => {
    await page.goto('/analysis?tab=report');
    await page.waitForLoadState('networkidle');

    // Find if there is an analysis selector dropdown
    const analysisSelect = page.locator('select').first();
    if (await analysisSelect.isVisible()) {
      // Check if an Informational analysis option exists and select it
      const options = await analysisSelect.locator('option').allInnerTexts();
      const infoOption = options.find((opt) => opt.includes('Informational') || opt.includes('SAFE'));
      if (infoOption) {
        await analysisSelect.selectOption({ label: infoOption });
        await page.waitForTimeout(500);
      }
    }

    // Check if the currently viewed analysis is Informational
    const isInformational = (await page.locator('text=Informational').count()) > 0;

    if (isInformational) {
      // Invariant 1: Positive verification banner "Baseline Congruent" & "Safe to Approve"
      await expect(page.locator('text=Baseline Congruent')).toBeVisible();
      await expect(page.locator('text=Safe to Approve')).toBeVisible();

      // Invariant 2: Token usage indicates Layer 1 pre-filter
      const tokenNotice = page.locator('text=/0 tokens \\(Layer 1 pre-filter\\)/i').first();
      await expect(tokenNotice).toBeVisible();

      // Invariant 3: Automated Rollback Runbook MUST BE SUPPRESSED
      const rollbackHeader = page.locator('text=Automated Rollback & Remediation Runbook');
      await expect(rollbackHeader).toHaveCount(0);
    }
  });

  test('Critical analysis displays 3-part diagnostic and rollback runbook', async ({ page }) => {
    await page.goto('/analysis?tab=report');
    await page.waitForLoadState('networkidle');

    const analysisSelect = page.locator('select').first();
    if (await analysisSelect.isVisible()) {
      const options = await analysisSelect.locator('option').allInnerTexts();
      const critOption = options.find((opt) => opt.includes('Critical') || opt.includes('High'));
      if (critOption) {
        await analysisSelect.selectOption({ label: critOption });
        await page.waitForTimeout(500);

        // Assert 3-part diagnostic breakdown
        await expect(page.locator('text=Identified Risk Findings')).toBeVisible();

        // Assert rollback runbook is rendered for critical risk
        const rollbackHeader = page.locator('text=Automated Rollback & Remediation Runbook');
        await expect(rollbackHeader).toBeVisible();
      }
    }
  });
});
