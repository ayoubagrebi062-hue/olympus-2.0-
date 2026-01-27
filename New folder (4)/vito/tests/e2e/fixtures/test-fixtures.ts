/**
 * OLYMPUS 3.0 - Test Fixtures
 * ===========================
 * Custom Playwright fixtures for OLYMPUS testing
 */

import { test as base, Page, expect } from '@playwright/test';

// Custom fixtures for OLYMPUS testing
interface OlympusFixtures {
  onboardedPage: Page;
  authenticatedPage: Page;
  dashboardPage: Page;
}

export const test = base.extend<OlympusFixtures>({
  // Page with completed onboarding
  onboardedPage: async ({ page }, use) => {
    await page.goto('/');

    // Check if onboarding is needed
    const getStarted = page.locator('[data-testid="get-started"]');
    if (await getStarted.isVisible({ timeout: 3000 }).catch(() => false)) {
      await getStarted.click();

      // Style selection
      const styleOption = page.locator('[data-testid="style-modern"]');
      if (await styleOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await styleOption.click();
        await page.click('[data-testid="next-step"]');
      }

      // Role selection
      const roleOption = page.locator('[data-testid="role-founder"]');
      if (await roleOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await roleOption.click();
        const industryInput = page.locator('[data-testid="industry-input"]');
        if (await industryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await industryInput.fill('Technology');
        }
        await page.click('[data-testid="next-step"]');
      }

      // Goal selection
      const goalOption = page.locator('[data-testid="goal-landing-page"]');
      if (await goalOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await goalOption.click();
        await page.click('[data-testid="complete-onboarding"]');
      }

      // Wait for dashboard
      await page.waitForURL(/\/(dashboard|templates|build)/, { timeout: 10000 }).catch(() => {});
    }

    await use(page);
  },

  // Authenticated page (if auth is added later)
  authenticatedPage: async ({ page }, use) => {
    // For now, same as regular page
    // Will be updated when auth is added
    await use(page);
  },

  // Dashboard page
  dashboardPage: async ({ page }, use) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await use(page);
  },
});

export { expect } from '@playwright/test';
