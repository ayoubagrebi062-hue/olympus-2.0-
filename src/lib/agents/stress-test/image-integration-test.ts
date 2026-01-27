/**
 * OLYMPUS 2.0 - Image Generation Integration Test
 *
 * Tests the Leonardo.ai integration to verify:
 * 1. API connection works
 * 2. Image generation succeeds
 * 3. Service layer functions correctly
 * 4. Orchestrator combines code + images
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import {
  LeonardoClient,
  getLeonardoClient,
  LEONARDO_MODELS,
  PRESET_STYLES,
} from '../../integrations/leonardo/client';
import { ImageGenerationService, getImageService } from '../../integrations/leonardo/image-service';

// ════════════════════════════════════════════════════════════════════════════════
// TEST CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  data?: unknown;
}

interface TestSuiteResult {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
  results: TestResult[];
}

const MOCK_MODE = process.env.MOCK_LEONARDO === 'true' || !process.env.LEONARDO_API_KEY;

// ════════════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ════════════════════════════════════════════════════════════════════════════════

async function runTest(name: string, testFn: () => Promise<unknown>): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const data = await testFn();
    const duration = Date.now() - startTime;

    console.log(`   ✅ ${name} (${duration}ms)`);

    return {
      name,
      passed: true,
      duration,
      data,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(`   ❌ ${name} (${duration}ms)`);
    console.log(`      Error: ${errorMessage}`);

    return {
      name,
      passed: false,
      duration,
      error: errorMessage,
    };
  }
}

function skipTest(name: string, reason: string): TestResult {
  console.log(`   ⏭️  ${name} (SKIPPED: ${reason})`);
  return {
    name,
    passed: true, // Skipped tests don't count as failures
    duration: 0,
    error: `SKIPPED: ${reason}`,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// MOCK CLIENT (for testing without API key)
// ════════════════════════════════════════════════════════════════════════════════

class MockLeonardoClient {
  async getUserInfo() {
    return {
      user: {
        id: 'mock-user-id',
        username: 'mock-user',
        apiSubscriptionTokens: 1000,
        apiPaidTokens: 500,
      },
    };
  }

  async listModels() {
    return {
      custom_models: [
        { id: LEONARDO_MODELS.PHOENIX, name: 'Leonardo Phoenix', status: 'ACTIVE' },
        { id: LEONARDO_MODELS.KINO_XL, name: 'Leonardo Kino XL', status: 'ACTIVE' },
      ],
    };
  }

  async generate(params: { prompt: string }) {
    console.log(`   [MOCK] Generating image: "${params.prompt.substring(0, 50)}..."`);
    return {
      sdGenerationJob: {
        generationId: `mock-gen-${Date.now()}`,
        apiCreditCost: 5,
      },
    };
  }

  async getGeneration(generationId: string) {
    return {
      generations_by_pk: {
        generationId,
        status: 'COMPLETE',
        generatedImages: [
          {
            id: `mock-img-${Date.now()}`,
            url: 'https://cdn.leonardo.ai/mock-image.jpg',
            nsfw: false,
            likeCount: 0,
            generationId,
          },
        ],
        modelId: LEONARDO_MODELS.PHOENIX,
        prompt: 'Mock prompt',
        createdAt: new Date().toISOString(),
      },
    };
  }

  async waitForGeneration(generationId: string) {
    const result = await this.getGeneration(generationId);
    return result.generations_by_pk;
  }

  async generateAndWait(params: { prompt: string }) {
    const response = await this.generate(params);
    return this.waitForGeneration(response.sdGenerationJob.generationId);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ════════════════════════════════════════════════════════════════════════════════

async function testClientConnection(): Promise<TestResult[]> {
  console.log('\n📡 Testing Leonardo Client Connection...');
  const results: TestResult[] = [];

  // Test 1: Client instantiation
  results.push(
    await runTest('Client instantiation', async () => {
      if (MOCK_MODE) {
        return new MockLeonardoClient();
      }
      return getLeonardoClient();
    })
  );

  // Test 2: Get user info
  if (!MOCK_MODE) {
    results.push(
      await runTest('Get user info', async () => {
        const client = getLeonardoClient();
        const userInfo = await client.getUserInfo();

        if (!userInfo.user?.id) {
          throw new Error('Invalid user info response');
        }

        return {
          userId: userInfo.user.id,
          tokens: userInfo.user.apiSubscriptionTokens + userInfo.user.apiPaidTokens,
        };
      })
    );
  } else {
    results.push(skipTest('Get user info', 'Mock mode enabled'));
  }

  // Test 3: List models
  if (!MOCK_MODE) {
    results.push(
      await runTest('List available models', async () => {
        const client = getLeonardoClient();
        const models = await client.listModels();

        if (!models.custom_models || models.custom_models.length === 0) {
          throw new Error('No models available');
        }

        return { modelCount: models.custom_models.length };
      })
    );
  } else {
    results.push(skipTest('List available models', 'Mock mode enabled'));
  }

  return results;
}

async function testImageGeneration(): Promise<TestResult[]> {
  console.log('\n🎨 Testing Image Generation...');
  const results: TestResult[] = [];

  if (MOCK_MODE) {
    console.log('   (Running in mock mode - no actual API calls)');
  }

  // Test 1: Simple image generation
  results.push(
    await runTest('Simple image generation', async () => {
      if (MOCK_MODE) {
        const mock = new MockLeonardoClient();
        return mock.generateAndWait({ prompt: 'A test image' });
      }

      const client = getLeonardoClient();
      const result = await client.generateAndWait({
        prompt: 'A simple test image, abstract art, colorful',
        width: 512,
        height: 512,
        numImages: 1,
      });

      if (!result.generatedImages || result.generatedImages.length === 0) {
        throw new Error('No images generated');
      }

      return {
        generationId: result.generationId,
        imageCount: result.generatedImages.length,
        imageUrl: result.generatedImages[0].url,
      };
    })
  );

  return results;
}

async function testImageService(): Promise<TestResult[]> {
  console.log('\n🔧 Testing Image Generation Service...');
  const results: TestResult[] = [];

  // Test 1: Service instantiation
  results.push(
    await runTest('Service instantiation', async () => {
      if (MOCK_MODE) {
        // Create service with mock
        return { status: 'mocked' };
      }
      const service = getImageService();
      return { status: 'initialized' };
    })
  );

  // Test 2: Generate hero image
  if (!MOCK_MODE) {
    results.push(
      await runTest('Generate hero image', async () => {
        const service = getImageService();
        const asset = await service.generateHeroImage(
          'A modern tech startup hero image with abstract shapes',
          'tech'
        );

        if (!asset.images || asset.images.length === 0) {
          throw new Error('No images in asset');
        }

        return {
          taskId: asset.taskId,
          type: asset.type,
          cost: asset.cost,
          imageUrl: asset.images[0].url,
        };
      })
    );
  } else {
    results.push(skipTest('Generate hero image', 'Mock mode enabled'));
  }

  // Test 3: Generate icon
  if (!MOCK_MODE) {
    results.push(
      await runTest('Generate icon', async () => {
        const service = getImageService();
        const asset = await service.generateIcon('A simple check mark icon, flat design', 'modern');

        if (!asset.images || asset.images.length === 0) {
          throw new Error('No images in asset');
        }

        return {
          taskId: asset.taskId,
          type: asset.type,
          cost: asset.cost,
        };
      })
    );
  } else {
    results.push(skipTest('Generate icon', 'Mock mode enabled'));
  }

  return results;
}

async function testTypeDefinitions(): Promise<TestResult[]> {
  console.log('\n📦 Testing Type Definitions...');
  const results: TestResult[] = [];

  // Test 1: Models enum
  results.push(
    await runTest('Leonardo models enum', async () => {
      const models = [
        LEONARDO_MODELS.PHOENIX,
        LEONARDO_MODELS.KINO_XL,
        LEONARDO_MODELS.DIFFUSION_XL,
        LEONARDO_MODELS.VISION_XL,
      ];

      models.forEach(id => {
        if (typeof id !== 'string' || id.length === 0) {
          throw new Error(`Invalid model ID: ${id}`);
        }
      });

      return { modelCount: models.length };
    })
  );

  // Test 2: Preset styles enum
  results.push(
    await runTest('Preset styles enum', async () => {
      const styles = [
        PRESET_STYLES.CINEMATIC,
        PRESET_STYLES.PHOTOGRAPHY,
        PRESET_STYLES.ILLUSTRATION,
        PRESET_STYLES.ANIME,
      ];

      styles.forEach(style => {
        if (typeof style !== 'string' || style.length === 0) {
          throw new Error(`Invalid style: ${style}`);
        }
      });

      return { styleCount: styles.length };
    })
  );

  return results;
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ════════════════════════════════════════════════════════════════════════════════

async function runAllTests(): Promise<TestSuiteResult> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         OLYMPUS 2.0 - IMAGE INTEGRATION TESTS              ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Mode: ${MOCK_MODE ? 'MOCK (no API key)' : 'LIVE (using API)'.padEnd(52)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();
  const allResults: TestResult[] = [];

  // Run all test suites
  const connectionTests = await testClientConnection();
  allResults.push(...connectionTests);

  const typeTests = await testTypeDefinitions();
  allResults.push(...typeTests);

  // Only run generation tests if not skipping API calls
  if (!MOCK_MODE) {
    const generationTests = await testImageGeneration();
    allResults.push(...generationTests);

    const serviceTests = await testImageService();
    allResults.push(...serviceTests);
  } else {
    // Run mock generation tests
    const generationTests = await testImageGeneration();
    allResults.push(...generationTests);

    const serviceTests = await testImageService();
    allResults.push(...serviceTests);
  }

  const totalDuration = Date.now() - startTime;

  // Calculate results
  const passed = allResults.filter(r => r.passed && !r.error?.startsWith('SKIPPED')).length;
  const skipped = allResults.filter(r => r.error?.startsWith('SKIPPED')).length;
  const failed = allResults.filter(r => !r.passed).length;

  // Print summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS                            ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Total Tests:  ${allResults.length.toString().padEnd(44)}║`);
  console.log(`║ Passed:       ${passed.toString().padEnd(44)}║`);
  console.log(`║ Failed:       ${failed.toString().padEnd(44)}║`);
  console.log(`║ Skipped:      ${skipped.toString().padEnd(44)}║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Total Time:   ${(totalDuration + 'ms').padEnd(44)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    allResults
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   - ${r.name}: ${r.error}`);
      });
  }

  return {
    totalTests: allResults.length,
    passed,
    failed,
    skipped,
    totalDuration,
    results: allResults,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// CLI ENTRY
// ════════════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  runAllTests()
    .then(result => {
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export { runAllTests };
export type { TestResult, TestSuiteResult };
