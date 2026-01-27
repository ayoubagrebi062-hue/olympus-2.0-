/**
 * OLYMPUS 3.0 - Playwright Configuration
 * ======================================
 * E2E testing configuration for user journey tests
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './journeys',
  fullyParallel: false, // Run sequentially for user journeys
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // Start dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Global timeout for each test
  timeout: 120 * 1000, // 2 minutes per test (AI builds take time)

  // Expect timeout
  expect: {
    timeout: 10 * 1000,
  },
});
