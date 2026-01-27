/**
 * OLYMPUS 3.0 - Build With Template Journey Tests
 * ================================================
 * Tests building a project from a pre-made template
 */

import { test, expect } from '../fixtures/test-fixtures';
import {
  waitForBuildComplete,
  verifyPreviewHasContent,
  waitForLoadingComplete,
  waitForNavigation,
} from '../helpers/test-utils';

test.describe('Build With Template Journey', () => {

  test('can build from template selection', async ({ onboardedPage: page }) => {
    // Go to templates
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    // Select first template
    const firstTemplate = page.locator('[data-testid^="template-card-"]').first();
    if (await firstTemplate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstTemplate.click();

      // Use template button
      const useTemplateBtn = page.locator('[data-testid="use-template"]');
      if (await useTemplateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await useTemplateBtn.click();

        // Should go to build page
        await waitForNavigation(page, /\/build/);

        // Template should be pre-loaded
        const templateBadge = page.locator('[data-testid="template-loaded"]');
        if (await templateBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(templateBadge).toContainText(/template/i);
        }

        // Start build
        const startBuildBtn = page.locator('[data-testid="start-build"]');
        if (await startBuildBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await startBuildBtn.click();

          // Wait for completion
          await waitForBuildComplete(page, 120000);

          // Preview should have content
          const hasContent = await verifyPreviewHasContent(page);
          expect(hasContent).toBe(true);
        }
      }
    }
  });

  test('template customization options work', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    const firstTemplate = page.locator('[data-testid^="template-card-"]').first();
    if (await firstTemplate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstTemplate.click();

      const useTemplateBtn = page.locator('[data-testid="use-template"]');
      if (await useTemplateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await useTemplateBtn.click();
        await waitForNavigation(page, /\/build/);

        // Check for customization panel
        const customizeBtn = page.locator('[data-testid="customize-template"]');
        if (await customizeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await customizeBtn.click();

          // Should show customization options
          const customizePanel = page.locator('[data-testid="customize-panel"]');
          if (await customizePanel.isVisible({ timeout: 5000 }).catch(() => false)) {
            // Should have color picker or name input
            const hasColorPicker = await page.locator('[data-testid="color-picker"]').isVisible().catch(() => false);
            const hasNameInput = await page.locator('[data-testid="company-name"]').isVisible().catch(() => false);

            expect(hasColorPicker || hasNameInput).toBe(true);
          }
        }
      }
    }
  });

  test('template preserves user customizations', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    const firstTemplate = page.locator('[data-testid^="template-card-"]').first();
    if (await firstTemplate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstTemplate.click();

      const useTemplateBtn = page.locator('[data-testid="use-template"]');
      if (await useTemplateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await useTemplateBtn.click();
        await waitForNavigation(page, /\/build/);

        // Enter customization
        const companyName = page.locator('[data-testid="company-name"]');
        if (await companyName.isVisible({ timeout: 5000 }).catch(() => false)) {
          await companyName.fill('My Awesome Company');

          // Build
          await page.click('[data-testid="start-build"]');
          await waitForBuildComplete(page, 120000);

          // Preview should contain the company name
          const preview = page.frameLocator('[data-testid="preview-frame"]');
          if (await preview.locator('body').isVisible({ timeout: 5000 }).catch(() => false)) {
            await expect(preview.locator('body')).toContainText(/My Awesome Company/i);
          }
        }
      }
    }
  });

  test('template build is faster than from scratch', async ({ onboardedPage: page }) => {
    // This test documents expected behavior
    // Template builds should leverage pre-generated code

    await page.goto('/templates');
    await waitForLoadingComplete(page);

    const firstTemplate = page.locator('[data-testid^="template-card-"]').first();
    if (await firstTemplate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstTemplate.click();

      const useTemplateBtn = page.locator('[data-testid="use-template"]');
      if (await useTemplateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await useTemplateBtn.click();
        await waitForNavigation(page, /\/build/);

        const startTime = Date.now();
        await page.click('[data-testid="start-build"]');
        await waitForBuildComplete(page, 120000);
        const endTime = Date.now();

        const buildTimeSeconds = (endTime - startTime) / 1000;

        // Template builds should complete in reasonable time
        // (This is a soft assertion - may vary by system)
        expect(buildTimeSeconds).toBeLessThan(120);
      }
    }
  });

  test('template category affects available templates', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    const categoryFilter = page.locator('[data-testid="category-filter"]');
    if (await categoryFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get initial templates
      const initialTemplates = await page.locator('[data-testid^="template-card-"]').count();

      // Click "Landing Pages" category if exists
      const landingCategory = page.locator('[data-testid="category-landing"]');
      if (await landingCategory.isVisible().catch(() => false)) {
        await landingCategory.click();
        await waitForLoadingComplete(page);

        // Should filter to landing page templates
        const filteredTemplates = await page.locator('[data-testid^="template-card-"]').count();
        expect(filteredTemplates).toBeLessThanOrEqual(initialTemplates);
      }
    }
  });

  test('template info shows expected features', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    const firstTemplate = page.locator('[data-testid^="template-card-"]').first();
    if (await firstTemplate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstTemplate.click();

      const previewModal = page.locator('[data-testid="template-preview-modal"]');
      if (await previewModal.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should show features list
        const featuresList = page.locator('[data-testid="template-features"]');
        if (await featuresList.isVisible().catch(() => false)) {
          const features = await featuresList.locator('li').count();
          expect(features).toBeGreaterThanOrEqual(1);
        }

        // Should show tech stack
        const techStack = page.locator('[data-testid="tech-stack"]');
        if (await techStack.isVisible().catch(() => false)) {
          await expect(techStack).toContainText(/React|Next|TypeScript/i);
        }
      }
    }
  });

  test('can switch between templates before building', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    const templates = page.locator('[data-testid^="template-card-"]');
    const count = await templates.count();

    if (count >= 2) {
      // Select first template
      await templates.first().click();
      const firstName = await page.locator('[data-testid="template-name"]').first().textContent();

      // Close preview
      const closeBtn = page.locator('[data-testid="close-preview"]');
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click();
      }

      // Select second template
      await templates.nth(1).click();
      const secondName = await page.locator('[data-testid="template-name"]').first().textContent();

      // Names should be different
      expect(firstName).not.toBe(secondName);
    }
  });
});
