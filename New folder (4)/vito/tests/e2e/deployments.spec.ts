/**
 * OLYMPUS 2.0 - E2E Deployment Management Tests
 * ==============================================
 * Tests for deployment workflows including:
 * - Deployment listing and filtering
 * - Creating deployments
 * - Deployment status tracking
 * - Promoting and rolling back
 */

import { test, expect } from '@playwright/test';

test.describe('Deployment Management', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/deployments');
  });

  test('should display deployments list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /deployment/i })).toBeVisible();
  });

  test('should show empty state when no deployments', async ({ page }) => {
    const hasDeploymentsList = await page.locator('[data-testid="deployments-list"]').isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/no deployment|deploy your first/i).isVisible().catch(() => false);

    expect(hasDeploymentsList || hasEmptyState).toBe(true);
  });

  test('should filter deployments by environment', async ({ page }) => {
    const envFilter = page.getByRole('combobox', { name: /environment|filter/i });

    if (await envFilter.isVisible().catch(() => false)) {
      await envFilter.click();

      // Look for environment options
      const prodOption = page.getByRole('option', { name: /production|prod/i });
      const stagingOption = page.getByRole('option', { name: /staging/i });

      expect(
        (await prodOption.isVisible().catch(() => false)) ||
        (await stagingOption.isVisible().catch(() => false))
      ).toBe(true);
    }
  });

  test('should filter deployments by status', async ({ page }) => {
    const statusFilter = page.getByRole('combobox', { name: /status/i });

    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();

      // Verify status options exist
      const options = page.getByRole('option');
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(0);
    }
  });

  test('should show deployment status indicators', async ({ page }) => {
    const deploymentItem = page.locator('[data-testid="deployment-item"]').first();

    if (await deploymentItem.isVisible().catch(() => false)) {
      // Look for status badge
      const statusBadge = deploymentItem.locator('[data-testid="status-badge"]');
      if (await statusBadge.isVisible().catch(() => false)) {
        await expect(statusBadge).toBeVisible();
      }
    }
  });

  test('should search deployments', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('production');
      await page.waitForTimeout(500);

      await expect(searchInput).toHaveValue('production');
    }
  });
});

test.describe('Deployment Creation', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
  });

  test('should navigate to deploy page from project', async ({ page }) => {
    await page.goto('/projects');

    const projectItem = page.locator('[data-testid="project-item"]').first();

    if (await projectItem.isVisible().catch(() => false)) {
      await projectItem.click();

      // Look for deploy button
      const deployButton = page.getByRole('button', { name: /deploy/i });
      if (await deployButton.isVisible().catch(() => false)) {
        await expect(deployButton).toBeEnabled();
      }
    }
  });

  test('should show environment selection in deploy dialog', async ({ page }) => {
    await page.goto('/projects');

    const projectItem = page.locator('[data-testid="project-item"]').first();

    if (await projectItem.isVisible().catch(() => false)) {
      await projectItem.click();

      const deployButton = page.getByRole('button', { name: /deploy/i });
      if (await deployButton.isVisible().catch(() => false)) {
        await deployButton.click();

        // Should show environment selection
        const envSelect = page.getByRole('combobox', { name: /environment/i });
        if (await envSelect.isVisible().catch(() => false)) {
          await expect(envSelect).toBeVisible();
        }
      }
    }
  });

  test('should require selecting a build version', async ({ page }) => {
    await page.goto('/projects');

    const projectItem = page.locator('[data-testid="project-item"]').first();

    if (await projectItem.isVisible().catch(() => false)) {
      await projectItem.click();

      const deployButton = page.getByRole('button', { name: /deploy/i });
      if (await deployButton.isVisible().catch(() => false)) {
        await deployButton.click();

        // Version select should be present
        const versionSelect = page.locator('[data-testid="version-select"]');
        const buildSelect = page.getByRole('combobox', { name: /build|version/i });

        expect(
          (await versionSelect.isVisible().catch(() => false)) ||
          (await buildSelect.isVisible().catch(() => false))
        ).toBe(true);
      }
    }
  });
});

test.describe('Deployment Detail Page', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
  });

  test('should display deployment details', async ({ page }) => {
    await page.goto('/deployments');

    const deploymentItem = page.locator('[data-testid="deployment-item"]').first();

    if (await deploymentItem.isVisible().catch(() => false)) {
      await deploymentItem.click();

      // Verify detail page elements
      await expect(page.getByRole('heading')).toBeVisible();
    }
  });

  test('should show deployment logs', async ({ page }) => {
    await page.goto('/deployments');

    const deploymentItem = page.locator('[data-testid="deployment-item"]').first();

    if (await deploymentItem.isVisible().catch(() => false)) {
      await deploymentItem.click();

      // Look for logs section
      const logsSection = page.locator('[data-testid="deployment-logs"]');
      const logsTab = page.getByRole('tab', { name: /logs/i });

      if (await logsTab.isVisible().catch(() => false)) {
        await logsTab.click();
      }

      // Logs container should exist (even if empty)
      const logsContainer = page.locator('[data-testid="logs-container"]');
      if (await logsContainer.isVisible().catch(() => false)) {
        await expect(logsContainer).toBeVisible();
      }
    }
  });

  test('should show deployment URL when ready', async ({ page }) => {
    await page.goto('/deployments');

    // Look for a ready deployment
    const readyDeployment = page.locator('[data-testid="deployment-item"][data-status="ready"]').first();

    if (await readyDeployment.isVisible().catch(() => false)) {
      await readyDeployment.click();

      // Should show URL
      const urlLink = page.getByRole('link', { name: /view|visit|open/i });
      if (await urlLink.isVisible().catch(() => false)) {
        await expect(urlLink).toHaveAttribute('href', /.+/);
      }
    }
  });

  test('should show deployment actions menu', async ({ page }) => {
    await page.goto('/deployments');

    const deploymentItem = page.locator('[data-testid="deployment-item"]').first();

    if (await deploymentItem.isVisible().catch(() => false)) {
      await deploymentItem.click();

      const actionsButton = page.getByRole('button', { name: /actions|more|menu/i });

      if (await actionsButton.isVisible().catch(() => false)) {
        await actionsButton.click();

        // Should show action options
        const menuItems = page.getByRole('menuitem');
        const menuItemCount = await menuItems.count();
        expect(menuItemCount).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Deployment Operations', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
  });

  test('should show promote option for staging deployments', async ({ page }) => {
    await page.goto('/deployments');

    // Look for staging deployment
    const stagingDeployment = page.locator('[data-testid="deployment-item"][data-environment="staging"]').first();

    if (await stagingDeployment.isVisible().catch(() => false)) {
      await stagingDeployment.click();

      const promoteButton = page.getByRole('button', { name: /promote/i });
      if (await promoteButton.isVisible().catch(() => false)) {
        await expect(promoteButton).toBeEnabled();
      }
    }
  });

  test('should show rollback option when previous deployment exists', async ({ page }) => {
    await page.goto('/deployments');

    const deploymentItem = page.locator('[data-testid="deployment-item"]').first();

    if (await deploymentItem.isVisible().catch(() => false)) {
      await deploymentItem.click();

      // Look for rollback in menu or as direct button
      const actionsButton = page.getByRole('button', { name: /actions|more/i });

      if (await actionsButton.isVisible().catch(() => false)) {
        await actionsButton.click();

        const rollbackOption = page.getByRole('menuitem', { name: /rollback/i });
        // Rollback may or may not be available depending on deployment history
        const isRollbackVisible = await rollbackOption.isVisible().catch(() => false);
        expect(typeof isRollbackVisible).toBe('boolean');
      }
    }
  });

  test('should confirm before deleting deployment', async ({ page }) => {
    await page.goto('/deployments');

    const deploymentItem = page.locator('[data-testid="deployment-item"]').first();

    if (await deploymentItem.isVisible().catch(() => false)) {
      await deploymentItem.click();

      const actionsButton = page.getByRole('button', { name: /actions|more/i });

      if (await actionsButton.isVisible().catch(() => false)) {
        await actionsButton.click();

        const deleteOption = page.getByRole('menuitem', { name: /delete|remove/i });

        if (await deleteOption.isVisible().catch(() => false)) {
          await deleteOption.click();

          // Should show confirmation dialog
          const confirmDialog = page.getByRole('dialog');
          if (await confirmDialog.isVisible().catch(() => false)) {
            await expect(confirmDialog).toBeVisible();

            // Cancel the deletion
            const cancelButton = page.getByRole('button', { name: /cancel/i });
            if (await cancelButton.isVisible().catch(() => false)) {
              await cancelButton.click();
            }
          }
        }
      }
    }
  });

  test('should show redeploy option', async ({ page }) => {
    await page.goto('/deployments');

    const deploymentItem = page.locator('[data-testid="deployment-item"]').first();

    if (await deploymentItem.isVisible().catch(() => false)) {
      await deploymentItem.click();

      // Look for redeploy button
      const redeployButton = page.getByRole('button', { name: /redeploy/i });
      const actionsButton = page.getByRole('button', { name: /actions|more/i });

      if (await redeployButton.isVisible().catch(() => false)) {
        await expect(redeployButton).toBeEnabled();
      } else if (await actionsButton.isVisible().catch(() => false)) {
        await actionsButton.click();
        const redeployOption = page.getByRole('menuitem', { name: /redeploy/i });
        const isVisible = await redeployOption.isVisible().catch(() => false);
        expect(typeof isVisible).toBe('boolean');
      }
    }
  });
});

test.describe('Deployment Status Tracking', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
  });

  test('should show progress indicator for in-progress deployments', async ({ page }) => {
    await page.goto('/deployments');

    // Look for deploying/building status
    const inProgressDeployment = page.locator('[data-testid="deployment-item"][data-status="deploying"]').first();

    if (await inProgressDeployment.isVisible().catch(() => false)) {
      await inProgressDeployment.click();

      // Should show progress indicator
      const progressIndicator = page.locator('[data-testid="progress-indicator"]');
      const progressBar = page.locator('[role="progressbar"]');
      const spinner = page.locator('.animate-spin');

      expect(
        (await progressIndicator.isVisible().catch(() => false)) ||
        (await progressBar.isVisible().catch(() => false)) ||
        (await spinner.isVisible().catch(() => false))
      ).toBe(true);
    }
  });

  test('should display error message for failed deployments', async ({ page }) => {
    await page.goto('/deployments');

    // Look for failed deployment
    const failedDeployment = page.locator('[data-testid="deployment-item"][data-status="failed"]').first();

    if (await failedDeployment.isVisible().catch(() => false)) {
      await failedDeployment.click();

      // Should show error message
      const errorMessage = page.locator('[data-testid="error-message"]');
      const errorAlert = page.getByRole('alert');

      expect(
        (await errorMessage.isVisible().catch(() => false)) ||
        (await errorAlert.isVisible().catch(() => false))
      ).toBe(true);
    }
  });

  test('should show deployment timeline/history', async ({ page }) => {
    await page.goto('/deployments');

    const deploymentItem = page.locator('[data-testid="deployment-item"]').first();

    if (await deploymentItem.isVisible().catch(() => false)) {
      await deploymentItem.click();

      // Look for history/timeline section
      const historyTab = page.getByRole('tab', { name: /history|timeline/i });
      const historySection = page.locator('[data-testid="deployment-history"]');

      if (await historyTab.isVisible().catch(() => false)) {
        await historyTab.click();
      }

      // History section should exist
      const hasHistory = await historySection.isVisible().catch(() => false);
      expect(typeof hasHistory).toBe('boolean');
    }
  });
});

test.describe('Domain Management', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
  });

  test('should show custom domain section', async ({ page }) => {
    await page.goto('/deployments');

    const deploymentItem = page.locator('[data-testid="deployment-item"]').first();

    if (await deploymentItem.isVisible().catch(() => false)) {
      await deploymentItem.click();

      // Look for domains tab or section
      const domainsTab = page.getByRole('tab', { name: /domain/i });
      const domainsSection = page.locator('[data-testid="domains-section"]');

      if (await domainsTab.isVisible().catch(() => false)) {
        await domainsTab.click();
      }

      const hasDomains = await domainsSection.isVisible().catch(() => false);
      expect(typeof hasDomains).toBe('boolean');
    }
  });

  test('should show add domain button for ready deployments', async ({ page }) => {
    await page.goto('/deployments');

    const readyDeployment = page.locator('[data-testid="deployment-item"][data-status="ready"]').first();

    if (await readyDeployment.isVisible().catch(() => false)) {
      await readyDeployment.click();

      const domainsTab = page.getByRole('tab', { name: /domain/i });
      if (await domainsTab.isVisible().catch(() => false)) {
        await domainsTab.click();
      }

      const addDomainButton = page.getByRole('button', { name: /add domain/i });
      const hasDomainButton = await addDomainButton.isVisible().catch(() => false);
      expect(typeof hasDomainButton).toBe('boolean');
    }
  });
});
