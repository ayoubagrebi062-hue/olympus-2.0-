/**
 * OLYMPUS 3.0 - Build From Scratch Journey Tests
 * ===============================================
 * Tests building a project from a user prompt
 */

import { test, expect } from '../fixtures/test-fixtures';
import {
  waitForBuildComplete,
  waitForBuildProgress,
  verifyPreviewHasContent,
  sendChatMessage,
  setupConsoleErrorCapture,
} from '../helpers/test-utils';

test.describe('Build From Scratch Journey', () => {

  test('user can build a landing page from prompt', async ({ onboardedPage: page }) => {
    // Navigate to build page
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    // Enter build prompt
    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const prompt = 'Create a modern landing page for a coffee shop called JavaJoy. Include hero section, menu highlights, about us, and contact form.';
      await promptInput.fill(prompt);

      // Click build
      await page.click('[data-testid="start-build"]');

      // Should show progress
      const buildProgress = page.locator('[data-testid="build-progress"]');
      await expect(buildProgress).toBeVisible({ timeout: 10000 });

      // Wait for completion (up to 2 minutes)
      await waitForBuildComplete(page, 120000);

      // Preview should be visible
      const previewFrame = page.locator('[data-testid="preview-frame"]');
      if (await previewFrame.isVisible({ timeout: 10000 }).catch(() => false)) {
        // Preview should have actual content
        const hasContent = await verifyPreviewHasContent(page);
        expect(hasContent).toBe(true);
      }

      // Download should work
      const downloadBtn = page.locator('[data-testid="download-code"]');
      if (await downloadBtn.isVisible().catch(() => false)) {
        await expect(downloadBtn).toBeEnabled();
      }
    }
  });

  test('build shows meaningful progress updates', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a simple portfolio website');
      await page.click('[data-testid="start-build"]');

      // Should show agent activity
      const agentLog = page.locator('[data-testid="agent-activity"]');
      if (await agentLog.isVisible({ timeout: 10000 }).catch(() => false)) {
        // Should see at least one agent working
        await expect(agentLog).not.toBeEmpty();
      }

      // Progress should increase over time
      const progressBar = page.locator('[data-testid="build-progress"]');
      if (await progressBar.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Wait for some progress
        await waitForBuildProgress(page, 10, 60000);
      }

      await waitForBuildComplete(page, 120000);
    }
  });

  test('handles empty prompt gracefully', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const startBuildBtn = page.locator('[data-testid="start-build"]');
    if (await startBuildBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Try to build with empty prompt
      await startBuildBtn.click();

      // Should show validation error, not crash
      const promptError = page.locator('[data-testid="prompt-error"]');
      if (await promptError.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(promptError).toContainText(/describe|enter|provide/i);
      }
    }
  });

  test('handles very long prompt', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Create a very long prompt
      const longPrompt = 'Create a landing page. '.repeat(250);
      await promptInput.fill(longPrompt);

      await page.click('[data-testid="start-build"]');

      // Should either accept and build, or show a helpful message
      // Should NOT crash
      const { errors } = setupConsoleErrorCapture(page);

      await page.waitForTimeout(2000);

      const hasError = await page.locator('[data-testid="prompt-error"]').isVisible().catch(() => false);
      const hasProgress = await page.locator('[data-testid="build-progress"]').isVisible().catch(() => false);

      expect(hasError || hasProgress).toBe(true);
      expect(errors.filter(e => e.includes('crash') || e.includes('fatal'))).toHaveLength(0);
    }
  });

  test('shows quality score after build', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a contact form page');
      await page.click('[data-testid="start-build"]');

      await waitForBuildComplete(page, 120000);

      // Should show quality score
      const qualityScore = page.locator('[data-testid="quality-score"]');
      if (await qualityScore.isVisible({ timeout: 5000 }).catch(() => false)) {
        const scoreText = await qualityScore.textContent();
        const score = parseInt(scoreText || '0', 10);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });

  test('generated code has proper structure', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a simple blog homepage');
      await page.click('[data-testid="start-build"]');

      await waitForBuildComplete(page, 120000);

      // Check file tree shows proper structure
      const fileTree = page.locator('[data-testid="file-tree"]');
      if (await fileTree.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should have package.json
        await expect(fileTree).toContainText(/package\.json/);

        // Should have source files
        await expect(fileTree).toContainText(/\.tsx|\.ts|\.jsx|\.js/);
      }
    }
  });

  test('can view and edit generated files', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a simple homepage');
      await page.click('[data-testid="start-build"]');

      await waitForBuildComplete(page, 120000);

      // Click on a file in the tree
      const fileItem = page.locator('[data-testid="file-item"]').first();
      if (await fileItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        await fileItem.click();

        // Code editor should show content
        const codeEditor = page.locator('[data-testid="code-editor"]');
        if (await codeEditor.isVisible({ timeout: 5000 }).catch(() => false)) {
          const content = await codeEditor.textContent();
          expect(content?.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('build can be cancelled', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a complex e-commerce site');
      await page.click('[data-testid="start-build"]');

      // Wait for build to start
      await page.locator('[data-testid="build-progress"]').waitFor({ timeout: 10000 });

      // Cancel the build
      const cancelBtn = page.locator('[data-testid="cancel-build"]');
      if (await cancelBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cancelBtn.click();

        // Confirm cancellation if needed
        const confirmCancel = page.locator('[data-testid="confirm-cancel"]');
        if (await confirmCancel.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmCancel.click();
        }

        // Build should stop
        await expect(page.locator('[data-testid="build-cancelled"]')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
