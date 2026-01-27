/**
 * OLYMPUS 3.0 - Global Test Setup
 * ================================
 * Runs before all tests to set up the test environment
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🧪 OLYMPUS E2E Test Setup Starting...');

  const { baseURL } = config.projects[0].use;

  // Check if the dev server is running
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the server to be ready
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      try {
        const response = await page.goto(baseURL || 'http://localhost:3000', {
          timeout: 5000,
        });

        if (response && response.ok()) {
          console.log('✅ Dev server is ready');
          break;
        }
      } catch {
        attempts++;
        console.log(`⏳ Waiting for dev server... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Dev server did not start in time');
    }

    // Set up test environment
    console.log('📦 Setting up test environment...');

    // Clear any existing test data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Create screenshots directory if needed
    console.log('📸 Screenshots will be saved to tests/e2e/screenshots/');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ OLYMPUS E2E Test Setup Complete');
}

export default globalSetup;
