import { Page, expect } from '@playwright/test';

/**
 * Generate a unique per-test tenant identity for strict isolation.
 */
export function generateTestTenant(): { email: string; name: string; pass: string } {
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    email: `tenant-${Date.now()}-${rand}@driftguard.local`,
    name: `Network Engineer ${rand}`,
    pass: 'EnterprisePassword2026!',
  };
}

/**
 * Solve on-demand CAPTCHA challenge safely respecting the 500ms human time-gate.
 */
export async function solveCaptchaIfPresent(page: Page): Promise<void> {
  const canvas = page.locator('canvas[data-captcha-code]');
  
  // If canvas is not currently visible, click submit to prompt the challenge
  if (!(await canvas.isVisible())) {
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }
  }

  // If captcha appeared, fill code
  try {
    await canvas.waitFor({ state: 'visible', timeout: 3000 });
    const code = await canvas.getAttribute('data-captcha-code');
    if (code) {
      await page.fill('input[data-testid="captcha-input"]', code);
      // Natural human typing delay respecting the 500ms gate
      await page.waitForTimeout(600);
    }
  } catch {
    // Challenge not required (e.g. operator recognized in session)
  }
}

/**
 * Authenticate operator into dashboard.
 */
export async function loginOperator(
  page: Page,
  email = 'operator@driftguard.local',
  pass = '••••••••••••'
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);

  // Trigger on-demand CAPTCHA & solve
  await solveCaptchaIfPresent(page);

  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}
