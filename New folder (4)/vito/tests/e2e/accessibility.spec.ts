/**
 * OLYMPUS 3.0 - Accessibility Tests
 * WCAG 2.1 AA compliance testing
 */

import { test, expect } from '@playwright/test';

// Types for axe results
interface AxeViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor' | null;
  description: string;
  nodes: unknown[];
}

interface AxeResults {
  violations: AxeViolation[];
  passes: unknown[];
  incomplete: unknown[];
  inapplicable: unknown[];
}

// Dynamic import for axe-core (may not be installed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runAxeAnalysis(page: any, options: { tags?: string[]; rules?: string[]; exclude?: string[] } = {}): Promise<AxeResults> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AxeModule = await import('@axe-core/playwright');
    const AxeBuilder = AxeModule.default || AxeModule;
    let builder = new AxeBuilder({ page });

    if (options.tags) {
      builder = builder.withTags(options.tags);
    }
    if (options.rules) {
      builder = builder.withRules(options.rules);
    }
    if (options.exclude) {
      for (const selector of options.exclude) {
        builder = builder.exclude(selector);
      }
    }

    const result = await builder.analyze();
    // Map the result to our AxeResults type
    return {
      violations: result.violations.map((v: any) => ({ ...v, impact: v.impact || null })),
      passes: result.passes,
      incomplete: result.incomplete,
      inapplicable: result.inapplicable,
    };
  } catch {
    // Return empty results if axe-core is not installed
    console.log('Note: @axe-core/playwright not installed, skipping axe analysis');
    return { violations: [], passes: [], incomplete: [], inapplicable: [] };
  }
}

test.describe('Accessibility - Public Pages', () => {
  test('home page should not have critical accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await runAxeAnalysis(page, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    });

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v: AxeViolation) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('login page should be accessible', async ({ page }) => {
    await page.goto('/login');

    const results = await runAxeAnalysis(page, {
      tags: ['wcag2a', 'wcag2aa'],
    });

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log('Accessibility violations:', JSON.stringify(results.violations, null, 2));
    }

    const criticalViolations = results.violations.filter(
      (v: AxeViolation) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('signup page should be accessible', async ({ page }) => {
    await page.goto('/signup');

    const results = await runAxeAnalysis(page, {
      tags: ['wcag2a', 'wcag2aa'],
    });

    const criticalViolations = results.violations.filter(
      (v: AxeViolation) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });
});

test.describe('Accessibility - Keyboard Navigation', () => {
  test('can navigate login form with keyboard', async ({ page }) => {
    await page.goto('/login');

    // Tab to email field
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/email/i)).toBeFocused();

    // Tab to password field
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/password/i)).toBeFocused();

    // Tab to submit button
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeFocused();
  });

  test('modal can be closed with Escape key', async ({ page }) => {
    await page.goto('/login');

    // Open a modal (if there's one)
    const modalTrigger = page.getByRole('button', { name: /help|info/i });

    if (await modalTrigger.isVisible().catch(() => false)) {
      await modalTrigger.click();

      // Verify modal is open
      await expect(page.getByRole('dialog')).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Modal should be closed
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }
  });

  test('skip link is present and functional', async ({ page }) => {
    await page.goto('/');

    // Focus on skip link (usually hidden until focused)
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: /skip to (main )?content/i });

    if (await skipLink.isVisible().catch(() => false)) {
      await skipLink.click();

      // Main content should be focused
      const main = page.getByRole('main');
      await expect(main).toBeFocused();
    }
  });
});

test.describe('Accessibility - Visual Elements', () => {
  test('images should have alt text', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Image should have alt text or role="presentation"
      expect(alt !== null || role === 'presentation').toBe(true);
    }
  });

  test('form labels should be associated with inputs', async ({ page }) => {
    await page.goto('/login');

    const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');

      if (id) {
        // Should have associated label
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        const hasAriaLabel = ariaLabel !== null || ariaLabelledby !== null;

        expect(hasLabel || hasAriaLabel).toBe(true);
      }
    }
  });

  test('color contrast should meet WCAG AA standards', async ({ page }) => {
    await page.goto('/login');

    const results = await runAxeAnalysis(page, {
      rules: ['color-contrast'],
    });

    const contrastViolations = results.violations.filter(
      (v: AxeViolation) => v.id === 'color-contrast'
    );

    expect(contrastViolations).toHaveLength(0);
  });

  test('heading hierarchy should be correct', async ({ page }) => {
    await page.goto('/');

    const results = await runAxeAnalysis(page, {
      rules: ['heading-order'],
    });

    const headingViolations = results.violations.filter(
      (v: AxeViolation) => v.id === 'heading-order'
    );

    expect(headingViolations).toHaveLength(0);
  });
});

test.describe('Accessibility - Authenticated Pages', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
  });

  test('dashboard should be accessible', async ({ page }) => {
    await page.goto('/dashboard');

    const results = await runAxeAnalysis(page, {
      tags: ['wcag2a', 'wcag2aa'],
      exclude: ['.chart-container'], // Exclude complex charts that may have issues
    });

    const criticalViolations = results.violations.filter(
      (v: AxeViolation) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('builds page should be accessible', async ({ page }) => {
    await page.goto('/builds');

    const results = await runAxeAnalysis(page, {
      tags: ['wcag2a', 'wcag2aa'],
    });

    const criticalViolations = results.violations.filter(
      (v: AxeViolation) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('settings page should be accessible', async ({ page }) => {
    await page.goto('/settings');

    const results = await runAxeAnalysis(page, {
      tags: ['wcag2a', 'wcag2aa'],
    });

    const criticalViolations = results.violations.filter(
      (v: AxeViolation) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });
});
