import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for DriftGuard Enterprise E2E Test Suite.
 * Desktop-first resolution (1440x900) targeting Chromium browser.
 */
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.VITE_BASE_URL || 'http://localhost:5173',
    launchOptions: {
      executablePath: process.env.CI ? undefined : CHROME_PATH,
    },
    headless: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'Google Chrome',
      use: {
        launchOptions: {
          executablePath: process.env.CI ? undefined : CHROME_PATH,
        },
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
