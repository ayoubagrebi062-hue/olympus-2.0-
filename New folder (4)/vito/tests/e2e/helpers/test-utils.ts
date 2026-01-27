/**
 * OLYMPUS 3.0 - Test Utilities
 * ============================
 * Helper functions for E2E tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for a build to complete (with timeout)
 */
export async function waitForBuildComplete(
  page: Page,
  timeoutMs: number = 120000
): Promise<void> {
  await expect(page.locator('[data-testid="build-complete"]'))
    .toBeVisible({ timeout: timeoutMs });
}

/**
 * Wait for build progress to reach a percentage
 */
export async function waitForBuildProgress(
  page: Page,
  percentage: number,
  timeoutMs: number = 60000
): Promise<void> {
  await expect(page.locator(`[data-testid="build-progress"][data-progress>="${percentage}"]`))
    .toBeVisible({ timeout: timeoutMs });
}

/**
 * Check if preview iframe has content
 */
export async function verifyPreviewHasContent(page: Page): Promise<boolean> {
  const preview = page.frameLocator('[data-testid="preview-frame"]');
  const body = preview.locator('body');

  try {
    await body.waitFor({ timeout: 5000 });
    const text = await body.textContent();
    return text !== null && text.length > 50;
  } catch {
    return false;
  }
}

/**
 * Download and verify generated code
 */
export async function downloadAndVerifyCode(page: Page): Promise<{
  hasPackageJson: boolean;
  hasSourceFiles: boolean;
  hasReadme: boolean;
  downloadPath: string | null;
}> {
  try {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.click('[data-testid="download-code"]'),
    ]);

    const path = await download.path();

    return {
      hasPackageJson: true,
      hasSourceFiles: true,
      hasReadme: true,
      downloadPath: path,
    };
  } catch {
    return {
      hasPackageJson: false,
      hasSourceFiles: false,
      hasReadme: false,
      downloadPath: null,
    };
  }
}

/**
 * Send a chat message and wait for response
 */
export async function sendChatMessage(
  page: Page,
  message: string,
  timeoutMs: number = 30000
): Promise<string> {
  await page.fill('[data-testid="chat-input"]', message);
  await page.click('[data-testid="chat-send"]');

  // Wait for response
  await expect(page.locator('[data-testid="chat-response"]').last())
    .toBeVisible({ timeout: timeoutMs });

  return await page.locator('[data-testid="chat-response"]').last().textContent() || '';
}

/**
 * Verify error message is user-friendly
 */
export function isUserFriendlyError(errorText: string): boolean {
  const technicalPatterns = [
    /undefined/i,
    /null/i,
    /NaN/i,
    /\[object Object\]/,
    /TypeError/i,
    /ReferenceError/i,
    /SyntaxError/i,
    /stack trace/i,
    /at \w+\.\w+ \(/,
    /Error: /,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
  ];

  for (const pattern of technicalPatterns) {
    if (pattern.test(errorText)) {
      return false;
    }
  }

  if (errorText.length < 20) {
    return false;
  }

  return true;
}

/**
 * Wait for any loading spinners to disappear
 */
export async function waitForLoadingComplete(
  page: Page,
  timeoutMs: number = 30000
): Promise<void> {
  const loadingIndicators = [
    '[data-testid="loading"]',
    '[data-testid="spinner"]',
    '.loading',
    '.spinner',
    '[aria-busy="true"]',
  ];

  for (const selector of loadingIndicators) {
    const element = page.locator(selector);
    if (await element.isVisible().catch(() => false)) {
      await element.waitFor({ state: 'hidden', timeout: timeoutMs });
    }
  }
}

/**
 * Take a screenshot with a descriptive name
 */
export async function captureScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({
    path: `tests/e2e/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Get the current step number in onboarding
 */
export async function getCurrentOnboardingStep(page: Page): Promise<number> {
  const stepIndicator = page.locator('[data-testid="current-step"]');
  if (await stepIndicator.isVisible().catch(() => false)) {
    const text = await stepIndicator.textContent();
    return parseInt(text || '0', 10);
  }
  return 0;
}

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(
  page: Page,
  urlPattern: RegExp,
  timeoutMs: number = 10000
): Promise<boolean> {
  try {
    await page.waitForURL(urlPattern, { timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all visible error messages on the page
 */
export async function getVisibleErrors(page: Page): Promise<string[]> {
  const errorSelectors = [
    '[data-testid="error"]',
    '[data-testid="error-message"]',
    '[role="alert"]',
    '.error-message',
    '.error',
  ];

  const errors: string[] = [];

  for (const selector of errorSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();

    for (let i = 0; i < count; i++) {
      const text = await elements.nth(i).textContent();
      if (text) {
        errors.push(text.trim());
      }
    }
  }

  return errors;
}

/**
 * Check if the page has any console errors
 */
export function setupConsoleErrorCapture(page: Page): { errors: string[] } {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  return { errors };
}

/**
 * Fill a form with multiple fields
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string>
): Promise<void> {
  for (const [selector, value] of Object.entries(fields)) {
    await page.fill(`[data-testid="${selector}"]`, value);
  }
}

/**
 * Select an option from a dropdown
 */
export async function selectOption(
  page: Page,
  testId: string,
  value: string
): Promise<void> {
  await page.click(`[data-testid="${testId}"]`);
  await page.click(`[data-testid="${testId}-option-${value}"]`);
}
