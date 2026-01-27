/**
 * OLYMPUS 3.0 - Auth Setup for E2E Tests
 * Creates authenticated state for tests
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Skip if no test credentials
  if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
    console.log('No test credentials provided. Skipping auth setup.');
    // Create empty auth state
    await page.context().storageState({ path: authFile });
    return;
  }

  // Go to login page
  await page.goto('/login');

  // Fill login form
  await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL);
  await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD);

  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for successful login
  await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

  // Save auth state
  await page.context().storageState({ path: authFile });
});

setup('create auth directory', async () => {
  const fs = await import('fs/promises');
  const dir = path.join(__dirname, '.auth');

  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory exists
  }
});
