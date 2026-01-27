/**
 * OLYMPUS 2.0 - Pollinations Image Generation Quick Test
 *
 * Tests the Pollinations.ai integration (FREE, unlimited images).
 * Can test both direct URL generation and webhook-based generation.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import {
  createImageService,
  generateImageUrl,
  type PollinationsRequest,
} from '../../integrations/image-generation/pollinations-service';

// ════════════════════════════════════════════════════════════════════════════════
// TEST CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

const TEST_PROMPTS: PollinationsRequest[] = [
  {
    prompt: 'Modern tech dashboard with glowing data visualizations, dark theme, cyberpunk style',
    type: 'hero',
    style: 'cyberpunk',
    width: 1024,
    height: 576,
  },
  {
    prompt: 'Friendly robot mascot waving, minimal flat design, white background',
    type: 'illustration',
    style: 'minimalist',
    width: 512,
    height: 512,
  },
  {
    prompt: 'Abstract geometric pattern, subtle gradients, professional background',
    type: 'background',
    style: 'digital-art',
    width: 1920,
    height: 1080,
  },
];

// ════════════════════════════════════════════════════════════════════════════════
// DIRECT URL TEST (No webhook needed)
// ════════════════════════════════════════════════════════════════════════════════

async function testDirectUrls(): Promise<boolean> {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TEST 1: Direct URL Generation (No webhook needed)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  let passed = true;

  for (const request of TEST_PROMPTS) {
    try {
      const url = generateImageUrl(request.prompt, {
        width: request.width,
        height: request.height,
        model: 'flux',
        nologo: true,
      });

      console.log(`✅ ${request.type}: URL generated`);
      console.log(`   ${url.substring(0, 80)}...`);
      console.log('');
    } catch (error) {
      console.error(`❌ ${request.type}: Failed`);
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      passed = false;
    }
  }

  return passed;
}

// ════════════════════════════════════════════════════════════════════════════════
// WEBHOOK TEST (Requires n8n webhook)
// ════════════════════════════════════════════════════════════════════════════════

async function testWebhook(): Promise<boolean> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || process.env.POLLINATIONS_WEBHOOK_URL;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TEST 2: Webhook-based Generation');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (!webhookUrl) {
    console.log('⏭️  SKIPPED: N8N_WEBHOOK_URL not set');
    console.log('');
    console.log('   To test webhook generation, set:');
    console.log('   export N8N_WEBHOOK_URL="http://localhost:5678/webhook/olympus/generate-image"');
    console.log('');
    return true; // Skip is not a failure
  }

  console.log(`   Webhook URL: ${webhookUrl.substring(0, 50)}...`);
  console.log('');

  const service = createImageService(webhookUrl);
  let passed = true;

  // Test only one image via webhook (to save time)
  const request = TEST_PROMPTS[0];

  try {
    console.log(`   Generating: ${request.type}...`);
    console.log('   (This may take 10-30 seconds)');

    const result = await service.generateImage('test-webhook', request);

    if (result.url) {
      console.log('');
      console.log(`✅ Webhook generation succeeded!`);
      console.log(`   URL: ${result.url.substring(0, 80)}...`);
    } else {
      console.log('');
      console.log(`❌ Webhook generation failed: ${result.error}`);
      passed = false;
    }
  } catch (error) {
    console.error('');
    console.error(
      `❌ Webhook test failed: ${error instanceof Error ? error.message : String(error)}`
    );
    passed = false;
  }

  return passed;
}

// ════════════════════════════════════════════════════════════════════════════════
// FETCH TEST (Verify image actually loads)
// ════════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

const IMAGE_FETCH_TIMEOUT_MS = 30000; // 30 seconds max
const DEFAULT_IMAGE_WIDTH = 256;
const DEFAULT_IMAGE_HEIGHT = 256;

// ════════════════════════════════════════════════════════════════════════════════
// FETCH TEST (Verify image actually loads)
// ════════════════════════════════════════════════════════════════════════════════

async function testImageFetch(): Promise<boolean> {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TEST 3: Image Fetch Verification');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const testUrl = generateImageUrl('A simple red circle on white background, minimal', {
    width: DEFAULT_IMAGE_WIDTH,
    height: DEFAULT_IMAGE_HEIGHT,
    model: 'turbo', // Faster model
    nologo: true,
  });

  console.log('   Fetching test image from Pollinations...');
  console.log(`   (Timeout: ${IMAGE_FETCH_TIMEOUT_MS / 1000}s)`);

  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: { Accept: 'image/*' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');

      // Validate content-type is actually an image
      if (!contentType?.startsWith('image/')) {
        console.log('');
        console.log(`❌ Invalid content type: ${contentType} (expected image/*)`);
        return false;
      }

      console.log('');
      console.log('✅ Image fetched successfully!');
      console.log(`   Content-Type: ${contentType}`);
      console.log(
        `   Size: ${contentLength ? Math.round(parseInt(contentLength) / 1024) + ' KB' : 'Unknown'}`
      );
      return true;
    } else {
      console.log('');
      console.log(`❌ Image fetch failed: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('');

    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`❌ Image fetch timed out after ${IMAGE_FETCH_TIMEOUT_MS / 1000}s`);
    } else {
      console.error(
        `❌ Image fetch failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ════════════════════════════════════════════════════════════════════════════════

async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     POLLINATIONS.AI IMAGE GENERATION - QUICK TEST         ║');
  console.log('║                     (100% FREE!)                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results: { name: string; passed: boolean }[] = [];

  // Test 1: Direct URLs
  results.push({
    name: 'Direct URL Generation',
    passed: await testDirectUrls(),
  });

  // Test 2: Webhook (optional)
  results.push({
    name: 'Webhook Generation',
    passed: await testWebhook(),
  });

  // Test 3: Image Fetch
  results.push({
    name: 'Image Fetch',
    passed: await testImageFetch(),
  });

  // Summary
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS                           ║');
  console.log('╠════════════════════════════════════════════════════════════╣');

  let allPassed = true;
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`║ ${result.name.padEnd(35)} ${status.padEnd(20)}║`);
    if (!result.passed) allPassed = false;
  }

  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(
    `║ Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}${' '.repeat(allPassed ? 20 : 18)}║`
  );
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  if (!allPassed) {
    process.exit(1);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// CLI ENTRY
// ════════════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { runAllTests, testDirectUrls, testWebhook, testImageFetch };
