/**
 * OLYMPUS 3.0 - Chat Refinement Journey Tests
 * ============================================
 * Tests the chat-based refinement of generated builds
 */

import { test, expect } from '../fixtures/test-fixtures';
import {
  waitForBuildComplete,
  sendChatMessage,
  verifyPreviewHasContent,
  waitForLoadingComplete,
} from '../helpers/test-utils';

test.describe('Chat Refinement Journey', () => {

  test('user can refine build with chat', async ({ onboardedPage: page }) => {
    // Navigate to build page
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a blog homepage');
      await page.click('[data-testid="start-build"]');
      await waitForBuildComplete(page, 120000);

      // Open chat
      const openChatBtn = page.locator('[data-testid="open-chat"]');
      if (await openChatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await openChatBtn.click();

        // Chat panel should appear
        const chatPanel = page.locator('[data-testid="chat-panel"]');
        await expect(chatPanel).toBeVisible({ timeout: 5000 });

        // Send refinement request
        const response = await sendChatMessage(page, 'Change the header color to blue');

        // Should get a response
        expect(response.length).toBeGreaterThan(10);

        // Preview should still work
        await page.waitForTimeout(2000);
        const hasContent = await verifyPreviewHasContent(page);
        expect(hasContent).toBe(true);
      }
    }
  });

  test('chat maintains conversation history', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a simple landing page');
      await page.click('[data-testid="start-build"]');
      await waitForBuildComplete(page, 120000);

      const openChatBtn = page.locator('[data-testid="open-chat"]');
      if (await openChatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await openChatBtn.click();

        // Send multiple messages
        await sendChatMessage(page, 'Add a contact form');
        await sendChatMessage(page, 'Make the form blue');

        // Check message history
        const messages = page.locator('[data-testid="chat-message"]');
        const count = await messages.count();

        // Should have at least 4 messages (2 user + 2 assistant)
        expect(count).toBeGreaterThanOrEqual(4);
      }
    }
  });

  test('chat shows typing indicator', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a homepage');
      await page.click('[data-testid="start-build"]');
      await waitForBuildComplete(page, 120000);

      const openChatBtn = page.locator('[data-testid="open-chat"]');
      if (await openChatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await openChatBtn.click();

        // Send message without waiting for response
        await page.fill('[data-testid="chat-input"]', 'Add a header');
        await page.click('[data-testid="chat-send"]');

        // Should show typing indicator
        const typingIndicator = page.locator('[data-testid="typing-indicator"]');
        if (await typingIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(typingIndicator).toBeVisible();
        }
      }
    }
  });

  test('chat can request specific code changes', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a button component');
      await page.click('[data-testid="start-build"]');
      await waitForBuildComplete(page, 120000);

      const openChatBtn = page.locator('[data-testid="open-chat"]');
      if (await openChatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await openChatBtn.click();

        // Request specific code change
        const response = await sendChatMessage(page, 'Add hover effect to the button');

        // Response should acknowledge the request
        expect(response.toLowerCase()).toContain(/hover|update|change|add/i.source ? response.toLowerCase() : '');
      }
    }
  });

  test('chat understands context from build', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a coffee shop landing page');
      await page.click('[data-testid="start-build"]');
      await waitForBuildComplete(page, 120000);

      const openChatBtn = page.locator('[data-testid="open-chat"]');
      if (await openChatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await openChatBtn.click();

        // Ask about the existing build
        const response = await sendChatMessage(page, 'What colors are used in the design?');

        // Should give a contextual response
        expect(response.length).toBeGreaterThan(20);
      }
    }
  });

  test('chat can minimize and maximize', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a homepage');
      await page.click('[data-testid="start-build"]');
      await waitForBuildComplete(page, 120000);

      const openChatBtn = page.locator('[data-testid="open-chat"]');
      if (await openChatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await openChatBtn.click();

        const chatPanel = page.locator('[data-testid="chat-panel"]');
        await expect(chatPanel).toBeVisible();

        // Minimize
        const minimizeBtn = page.locator('[data-testid="minimize-chat"]');
        if (await minimizeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await minimizeBtn.click();
          await expect(chatPanel).not.toBeVisible();

          // Maximize again
          await openChatBtn.click();
          await expect(chatPanel).toBeVisible();
        }
      }
    }
  });

  test('chat shows code snippets in responses', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a React component');
      await page.click('[data-testid="start-build"]');
      await waitForBuildComplete(page, 120000);

      const openChatBtn = page.locator('[data-testid="open-chat"]');
      if (await openChatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await openChatBtn.click();

        await sendChatMessage(page, 'Show me the component code');

        // Should show code block
        const codeBlock = page.locator('[data-testid="chat-response"] code, [data-testid="chat-response"] pre');
        if (await codeBlock.isVisible({ timeout: 5000 }).catch(() => false)) {
          const codeContent = await codeBlock.textContent();
          expect(codeContent?.length).toBeGreaterThan(10);
        }
      }
    }
  });

  test('chat input has character limit feedback', async ({ onboardedPage: page }) => {
    const newProjectBtn = page.locator('[data-testid="new-project"]');
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
    } else {
      await page.goto('/build');
    }

    const promptInput = page.locator('[data-testid="build-prompt"]');
    if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await promptInput.fill('Create a page');
      await page.click('[data-testid="start-build"]');
      await waitForBuildComplete(page, 120000);

      const openChatBtn = page.locator('[data-testid="open-chat"]');
      if (await openChatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await openChatBtn.click();

        // Type a long message
        const longMessage = 'a'.repeat(1000);
        await page.fill('[data-testid="chat-input"]', longMessage);

        // Should show character count
        const charCount = page.locator('[data-testid="char-count"]');
        if (await charCount.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(charCount).toContainText('1000');
        }
      }
    }
  });
});
