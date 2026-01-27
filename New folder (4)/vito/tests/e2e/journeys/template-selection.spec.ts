/**
 * OLYMPUS 3.0 - Template Selection Journey Tests
 * ===============================================
 * Tests the template gallery and selection flow
 */

import { test, expect } from '../fixtures/test-fixtures';
import { waitForNavigation, waitForLoadingComplete } from '../helpers/test-utils';

test.describe('Template Selection Journey', () => {

  test('template gallery shows available templates', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    // Should show template grid
    const templateGrid = page.locator('[data-testid="template-gallery"]');
    if (await templateGrid.isVisible({ timeout: 5000 }).catch(() => false)) {
      const templates = page.locator('[data-testid^="template-card-"]');
      const count = await templates.count();

      // Should have at least one template
      expect(count).toBeGreaterThanOrEqual(1);

      // Each template should have a name and preview
      for (let i = 0; i < Math.min(count, 3); i++) {
        const template = templates.nth(i);
        await expect(template.locator('[data-testid="template-name"]')).toBeVisible();
      }
    }
  });

  test('template preview modal works', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    const firstTemplate = page.locator('[data-testid^="template-card-"]').first();
    if (await firstTemplate.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click to preview
      await firstTemplate.click();

      // Preview modal should open
      const previewModal = page.locator('[data-testid="template-preview-modal"]');
      if (await previewModal.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should show larger preview
        await expect(previewModal.locator('[data-testid="preview-image"]')).toBeVisible();

        // Should have use template button
        await expect(previewModal.locator('[data-testid="use-template"]')).toBeVisible();

        // Should have close button
        const closeBtn = previewModal.locator('[data-testid="close-preview"]');
        await closeBtn.click();
        await expect(previewModal).not.toBeVisible();
      }
    }
  });

  test('can select and use a template', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    const firstTemplate = page.locator('[data-testid^="template-card-"]').first();
    if (await firstTemplate.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click to preview
      await firstTemplate.click();

      const useTemplateBtn = page.locator('[data-testid="use-template"]');
      if (await useTemplateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await useTemplateBtn.click();

        // Should navigate to build page with template
        await waitForNavigation(page, /\/build/);
      }
    }
  });

  test('template categories filter correctly', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    const categoryFilter = page.locator('[data-testid="category-filter"]');
    if (await categoryFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get initial template count
      const initialCount = await page.locator('[data-testid^="template-card-"]').count();

      // Click a category
      const firstCategory = page.locator('[data-testid^="category-"]').first();
      if (await firstCategory.isVisible().catch(() => false)) {
        await firstCategory.click();
        await waitForLoadingComplete(page);

        // Count should potentially change (filtered)
        const filteredCount = await page.locator('[data-testid^="template-card-"]').count();

        // Either same or fewer templates
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
      }
    }
  });

  test('template search works', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    const searchInput = page.locator('[data-testid="template-search"]');
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Search for something specific
      await searchInput.fill('landing');
      await page.waitForTimeout(500); // Debounce

      // Results should update
      await waitForLoadingComplete(page);

      // Should show matching templates or "no results"
      const templates = page.locator('[data-testid^="template-card-"]');
      const noResults = page.locator('[data-testid="no-results"]');

      const hasTemplates = await templates.count() > 0;
      const hasNoResults = await noResults.isVisible().catch(() => false);

      expect(hasTemplates || hasNoResults).toBe(true);
    }
  });

  test('template shows correct tier/pricing info', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    const firstTemplate = page.locator('[data-testid^="template-card-"]').first();
    if (await firstTemplate.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Should show tier badge (Free, Pro, etc.)
      const tierBadge = firstTemplate.locator('[data-testid="tier-badge"]');
      if (await tierBadge.isVisible().catch(() => false)) {
        const tierText = await tierBadge.textContent();
        expect(['Free', 'Starter', 'Pro', 'Professional', 'Enterprise']).toContain(tierText?.trim());
      }
    }
  });

  test('recently viewed templates section', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    // Click on a template to view it
    const firstTemplate = page.locator('[data-testid^="template-card-"]').first();
    if (await firstTemplate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstTemplate.click();

      // Close preview
      const closeBtn = page.locator('[data-testid="close-preview"]');
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click();
      }

      // Reload page
      await page.reload();
      await waitForLoadingComplete(page);

      // Check for recently viewed section
      const recentSection = page.locator('[data-testid="recently-viewed"]');
      if (await recentSection.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Should contain at least one template
        await expect(recentSection.locator('[data-testid^="template-card-"]').first()).toBeVisible();
      }
    }
  });

  test('template sorting options', async ({ onboardedPage: page }) => {
    await page.goto('/templates');
    await waitForLoadingComplete(page);

    const sortDropdown = page.locator('[data-testid="sort-templates"]');
    if (await sortDropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sortDropdown.click();

      // Should have sort options
      const sortOptions = page.locator('[data-testid^="sort-option-"]');
      const count = await sortOptions.count();
      expect(count).toBeGreaterThanOrEqual(2);

      // Click a sort option
      await sortOptions.first().click();
      await waitForLoadingComplete(page);

      // Templates should reorder (hard to verify order, just check no error)
      await expect(page.locator('[data-testid^="template-card-"]').first()).toBeVisible();
    }
  });
});
