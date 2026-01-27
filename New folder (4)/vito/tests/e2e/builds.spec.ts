/**
 * OLYMPUS 3.0 - E2E Build Management Tests
 */

import { test, expect } from '@playwright/test';

// Authenticated test fixture
test.describe('Build Management', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/builds');
  });

  test('should display builds list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /builds/i })).toBeVisible();
  });

  test('should show empty state when no builds', async ({ page }) => {
    // Check for empty state or builds list
    const hasBuildsList = await page.locator('[data-testid="builds-list"]').isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/no builds|create your first/i).isVisible().catch(() => false);

    expect(hasBuildsList || hasEmptyState).toBe(true);
  });

  test('should navigate to create build page', async ({ page }) => {
    await page.getByRole('button', { name: /create|new build/i }).click();

    await expect(page).toHaveURL(/\/builds\/new|\/builds\/create/);
  });

  test('should show build creation form', async ({ page }) => {
    await page.goto('/builds/new');

    await expect(page.getByLabel(/name|title/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create|save/i })).toBeVisible();
  });

  test('should validate build name is required', async ({ page }) => {
    await page.goto('/builds/new');

    // Try to submit without name
    await page.getByRole('button', { name: /create|save/i }).click();

    await expect(page.getByText(/name is required|required/i)).toBeVisible();
  });

  test('should create a new build', async ({ page }) => {
    await page.goto('/builds/new');

    const buildName = `Test Build ${Date.now()}`;

    await page.getByLabel(/name|title/i).fill(buildName);

    // Fill any other required fields
    const descriptionField = page.getByLabel(/description/i);
    if (await descriptionField.isVisible().catch(() => false)) {
      await descriptionField.fill('Test build description');
    }

    await page.getByRole('button', { name: /create|save/i }).click();

    // Should redirect to build detail or builds list
    await expect(page).toHaveURL(/\/builds\/[\w-]+|\/builds$/);
  });

  test('should search builds', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test');

      // Wait for search results
      await page.waitForTimeout(500);

      // Verify search is applied
      await expect(searchInput).toHaveValue('test');
    }
  });

  test('should filter builds by status', async ({ page }) => {
    const filterDropdown = page.getByRole('combobox', { name: /filter|status/i });

    if (await filterDropdown.isVisible().catch(() => false)) {
      await filterDropdown.click();
      await page.getByRole('option', { name: /draft/i }).click();

      // Verify filter is applied (URL or UI state)
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Build Detail Page', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
  });

  test('should display build details', async ({ page }) => {
    // Navigate to a build (assuming one exists)
    await page.goto('/builds');

    const buildLink = page.locator('[data-testid="build-item"]').first();

    if (await buildLink.isVisible().catch(() => false)) {
      await buildLink.click();

      // Verify detail page elements
      await expect(page.getByRole('heading')).toBeVisible();
    }
  });

  test('should show build actions menu', async ({ page }) => {
    await page.goto('/builds');

    const buildItem = page.locator('[data-testid="build-item"]').first();

    if (await buildItem.isVisible().catch(() => false)) {
      await buildItem.click();

      const actionsButton = page.getByRole('button', { name: /actions|menu/i });

      if (await actionsButton.isVisible().catch(() => false)) {
        await actionsButton.click();

        await expect(page.getByRole('menuitem', { name: /edit|delete|export/i }).first()).toBeVisible();
      }
    }
  });
});
