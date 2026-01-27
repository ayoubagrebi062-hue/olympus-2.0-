/**
 * OLYMPUS 3.0 - E2E Authentication Tests
 * Using Playwright for end-to-end testing
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: /sign up/i }).click();

    await expect(page).toHaveURL('/signup');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });

  test('should navigate to forgot password', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: /forgot password/i }).click();

    await expect(page).toHaveURL('/forgot-password');
  });

  test('should display signup page with all fields', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up|create account/i })).toBeVisible();
  });

  test('should validate password confirmation match', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/^password$/i).fill('Password123!');
    await page.getByLabel(/confirm password/i).fill('DifferentPassword!');
    await page.getByRole('button', { name: /sign up|create account/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing builds without auth', async ({ page }) => {
    await page.goto('/builds');

    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing settings without auth', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Session Management', () => {
  test('should persist session after page reload', async ({ page, context }) => {
    // This test requires authenticated state
    // Set up authentication storage state
    test.skip(!process.env.TEST_USER_EMAIL, 'Test user not configured');

    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

    // Reload page
    await page.reload();

    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL('/dashboard');
  });
});
