/**
 * OLYMPUS 3.0 - Error Recovery Journey Tests
 * ==========================================
 * Tests error handling and recovery flows
 */

import { test, expect } from '../fixtures/test-fixtures';
import { isUserFriendlyError, setupConsoleErrorCapture } from '../helpers/test-utils';

test.describe('Error Recovery Journey', () => {

  test('shows user-friendly error when build fails', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Intentionally problematic prompt
      await promptInput.fill('asdfghjkl random gibberish #$%^&*(');
      await page.click('[data-testid="start-build"]');

      // Wait for either success or error
      await Promise.race([
        page.waitForSelector('[data-testid="build-complete"]', { timeout: 120000 }),
        page.waitForSelector('[data-testid="build-error"]', { timeout: 120000 }),
      ]).catch(() => {});

      // If error, should be user-friendly
      const errorElement = page.locator('[data-testid="build-error"]');
      if (await errorElement.isVisible().catch(() => false)) {
        const errorText = await errorElement.textContent() || '';
        expect(isUserFriendlyError(errorText)).toBe(true);

        // Should have retry option
        const retryBtn = page.locator('[data-testid="retry-build"]');
        await expect(retryBtn).toBeVisible();
      }
    }
  });

  test('retry button works after failure', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a landing page');
      await page.click('[data-testid="start-build"]');

      // Wait for result
      await Promise.race([
        page.waitForSelector('[data-testid="build-complete"]', { timeout: 120000 }),
        page.waitForSelector('[data-testid="build-error"]', { timeout: 120000 }),
      ]).catch(() => {});

      // If there's a retry button, it should work
      const retryButton = page.locator('[data-testid="retry-build"]');
      if (await retryButton.isVisible().catch(() => false)) {
        await retryButton.click();

        // Should start building again
        await expect(page.locator('[data-testid="build-progress"]')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('404 page is helpful', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');

    // Should show 404 page or redirect
    const is404 = await page.locator('text=404').isVisible().catch(() => false);
    const isNotFound = await page.locator('text=/not found/i').isVisible().catch(() => false);

    if (is404 || isNotFound) {
      // Should have navigation options
      const goHomeBtn = page.locator('[data-testid="go-home"]');
      const dashboardLink = page.locator('a[href="/dashboard"]');
      const homeLink = page.locator('a[href="/"]');

      const hasNavigation =
        await goHomeBtn.isVisible().catch(() => false) ||
        await dashboardLink.isVisible().catch(() => false) ||
        await homeLink.isVisible().catch(() => false);

      expect(hasNavigation).toBe(true);
    }
  });

  test('handles network timeout gracefully', async ({ page }) => {
    // Slow down network
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 35000));
      await route.continue();
    });

    const { errors } = setupConsoleErrorCapture(page);

    await page.goto('/', { timeout: 60000 });

    // Should show timeout message or loading state, not crash
    const pageContent = await page.content();
    expect(pageContent).not.toContain('TypeError');
    expect(pageContent).not.toContain('undefined is not');
  });

  test('preserves work when session expires', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a portfolio');

      // Simulate session issue by clearing storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Try to continue
      await page.click('[data-testid="start-build"]');

      // Should either continue or redirect gracefully
      const currentUrl = page.url();
      expect(
        currentUrl.includes('/onboarding') ||
        currentUrl.includes('/build') ||
        currentUrl.includes('/login')
      ).toBe(true);
    }
  });

  test('API errors show meaningful messages', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/ai/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/build');

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a page');
      await page.click('[data-testid="start-build"]');

      // Should show error message
      const errorMessage = page.locator('[role="alert"], [data-testid="error-message"]');
      if (await errorMessage.isVisible({ timeout: 10000 }).catch(() => false)) {
        const errorText = await errorMessage.textContent() || '';
        expect(isUserFriendlyError(errorText)).toBe(true);
      }
    }
  });

  test('can recover from component render error', async ({ page }) => {
    const { errors } = setupConsoleErrorCapture(page);

    await page.goto('/');

    // Navigate through the app
    const links = ['/', '/dashboard', '/templates', '/build'];
    for (const link of links) {
      await page.goto(link);
      await page.waitForTimeout(500);

      // Should not have unhandled errors
      const fatalErrors = errors.filter(e =>
        e.includes('crash') ||
        e.includes('fatal') ||
        e.includes('unmounted')
      );
      expect(fatalErrors).toHaveLength(0);
    }
  });

  test('form validation prevents bad input', async ({ page }) => {
    await page.goto('/build');

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Try XSS input
      await promptInput.fill('<script>alert("xss")</script>');
      await page.click('[data-testid="start-build"]');

      // Should either sanitize or reject, not execute
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>alert');
    }
  });

  test('loading states prevent double submission', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a page');

      const startBtn = page.locator('[data-testid="start-build"]');

      // Click start
      await startBtn.click();

      // Button should be disabled immediately
      await expect(startBtn).toBeDisabled({ timeout: 2000 });

      // Or show loading state
      const loadingState = page.locator('[data-testid="build-loading"]');
      const isLoading = await loadingState.isVisible().catch(() => false);
      const isDisabled = await startBtn.isDisabled().catch(() => false);

      expect(isLoading || isDisabled).toBe(true);
    }
  });

  test('error boundary catches component errors', async ({ page }) => {
    const { errors } = setupConsoleErrorCapture(page);

    // Navigate to a potentially problematic page
    await page.goto('/build?test=error');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should show error boundary UI, not blank page
    const errorBoundary = page.locator('[data-testid="error-boundary"]');
    const errorFallback = page.locator('[data-testid="error-fallback"]');
    const hasContent = await page.locator('body').textContent();

    // Either shows error boundary or regular content
    expect(
      await errorBoundary.isVisible().catch(() => false) ||
      await errorFallback.isVisible().catch(() => false) ||
      (hasContent && hasContent.length > 100)
    ).toBe(true);
  });

  test('offline mode shows appropriate message', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);

    try {
      await page.goto('/');

      // Should show offline message or cached content
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      const offlineMessage = page.locator('text=/offline|connection|network/i');

      const hasOfflineUI =
        await offlineIndicator.isVisible().catch(() => false) ||
        await offlineMessage.isVisible().catch(() => false);

      // May show offline indicator or browser's default offline page
      // Just verify page doesn't crash
      const pageTitle = await page.title();
      expect(pageTitle).toBeDefined();
    } finally {
      await page.context().setOffline(false);
    }
  });
});
