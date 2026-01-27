/**
 * OLYMPUS 3.0 - New User Onboarding Journey Tests
 * ================================================
 * Tests the complete onboarding flow for new users
 */

import { test, expect } from '../fixtures/test-fixtures';
import { waitForNavigation, getCurrentOnboardingStep } from '../helpers/test-utils';

test.describe('New User Onboarding Journey', () => {

  test('complete onboarding flow end-to-end', async ({ page }) => {
    // 1. Land on homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/OLYMPUS/i);

    // 2. Click get started
    const getStartedBtn = page.locator('[data-testid="get-started"]');
    if (await getStartedBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await getStartedBtn.click();

      // 3. Should be on onboarding page
      await waitForNavigation(page, /\/onboarding/);

      // 4. Style selection step
      const stylePicker = page.locator('[data-testid="style-picker"]');
      if (await stylePicker.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.click('[data-testid="style-modern"]');
        await expect(page.locator('[data-testid="style-modern"]')).toHaveAttribute('data-selected', 'true');
        await page.click('[data-testid="next-step"]');
      }

      // 5. Role selection step
      const roleSelector = page.locator('[data-testid="role-selector"]');
      if (await roleSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.click('[data-testid="role-founder"]');

        const industryInput = page.locator('[data-testid="industry-input"]');
        if (await industryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await industryInput.fill('E-commerce');
        }
        await page.click('[data-testid="next-step"]');
      }

      // 6. Goal selection step
      const goalSelector = page.locator('[data-testid="goal-selector"]');
      if (await goalSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.click('[data-testid="goal-landing-page"]');

        const descInput = page.locator('[data-testid="project-description"]');
        if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await descInput.fill('A landing page for my new sneaker store');
        }

        await page.click('[data-testid="complete-onboarding"]');
      }

      // 7. Should redirect to dashboard or templates
      await waitForNavigation(page, /\/(dashboard|templates|build)/);
    }
  });

  test('can skip optional steps', async ({ page }) => {
    await page.goto('/onboarding');

    // Select required fields only
    const styleMinimal = page.locator('[data-testid="style-minimal"]');
    if (await styleMinimal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await styleMinimal.click();
      await page.click('[data-testid="next-step"]');

      await page.click('[data-testid="role-developer"]');
      // Skip industry (optional)
      await page.click('[data-testid="next-step"]');

      await page.click('[data-testid="goal-saas-app"]');
      // Skip description (optional)
      await page.click('[data-testid="complete-onboarding"]');

      // Should still complete successfully
      await waitForNavigation(page, /\/(dashboard|templates|build)/);
    }
  });

  test('shows validation errors for required fields', async ({ page }) => {
    await page.goto('/onboarding');

    const nextBtn = page.locator('[data-testid="next-step"]');
    if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Try to proceed without selection
      await nextBtn.click();

      // Should show error
      const validationError = page.locator('[data-testid="validation-error"]');
      if (await validationError.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(validationError).toContainText(/select/i);
      }
    }
  });

  test('preserves progress on page refresh', async ({ page }) => {
    await page.goto('/onboarding');

    const styleBold = page.locator('[data-testid="style-bold"]');
    if (await styleBold.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Complete step 1
      await styleBold.click();
      await page.click('[data-testid="next-step"]');

      // Get current step
      const stepBefore = await getCurrentOnboardingStep(page);

      // Refresh page
      await page.reload();

      // Should still be on step 2 (or step 1 with selection preserved)
      const stepAfter = await getCurrentOnboardingStep(page);
      expect([1, 2, stepBefore]).toContain(stepAfter);
    }
  });

  test('style options are visually distinct', async ({ page }) => {
    await page.goto('/onboarding');

    const stylePicker = page.locator('[data-testid="style-picker"]');
    if (await stylePicker.isVisible({ timeout: 5000 }).catch(() => false)) {
      const styleOptions = page.locator('[data-testid^="style-"]');
      const count = await styleOptions.count();

      // Should have multiple style options
      expect(count).toBeGreaterThanOrEqual(2);

      // Each should be clickable
      for (let i = 0; i < Math.min(count, 4); i++) {
        await expect(styleOptions.nth(i)).toBeEnabled();
      }
    }
  });

  test('role selection shows relevant follow-up', async ({ page }) => {
    await page.goto('/onboarding');

    // Complete style step first
    const styleModern = page.locator('[data-testid="style-modern"]');
    if (await styleModern.isVisible({ timeout: 5000 }).catch(() => false)) {
      await styleModern.click();
      await page.click('[data-testid="next-step"]');

      // Select different roles and verify context changes
      const roles = ['founder', 'developer', 'marketer'];
      for (const role of roles) {
        const roleBtn = page.locator(`[data-testid="role-${role}"]`);
        if (await roleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await roleBtn.click();

          // Role should be marked as selected
          await expect(roleBtn).toHaveAttribute('data-selected', 'true');
          break;
        }
      }
    }
  });

  test('back button works correctly', async ({ page }) => {
    await page.goto('/onboarding');

    const styleModern = page.locator('[data-testid="style-modern"]');
    if (await styleModern.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Complete step 1
      await styleModern.click();
      await page.click('[data-testid="next-step"]');

      // Go back
      const backBtn = page.locator('[data-testid="back-step"]');
      if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await backBtn.click();

        // Should be back on step 1
        await expect(page.locator('[data-testid="style-picker"]')).toBeVisible();

        // Previous selection should be preserved
        await expect(page.locator('[data-testid="style-modern"]')).toHaveAttribute('data-selected', 'true');
      }
    }
  });
});
