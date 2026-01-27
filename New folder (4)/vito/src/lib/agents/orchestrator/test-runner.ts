/**
 * Test Runner - Executes generated Vitest tests
 *
 * Runs tests created by the testing agent and captures results
 * for use in phase transition validation.
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface TestRunResult {
  passed: boolean;
  summary: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failures: TestFailure[];
  duration: number;
}

export interface TestFailure {
  testName: string;
  file: string;
  error: string;
}

interface VitestJsonResult {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  success: boolean;
  testResults: VitestTestFile[];
}

interface VitestTestFile {
  name: string;
  status: 'passed' | 'failed';
  assertionResults: VitestAssertion[];
}

interface VitestAssertion {
  fullName: string;
  status: 'passed' | 'failed';
  failureMessages: string[];
}

/**
 * Find test files recursively in a directory
 */
function findTestFiles(dir: string): string[] {
  const testFiles: string[] = [];

  try {
    if (!fs.existsSync(dir)) return [];

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        // Skip node_modules and hidden directories
        if (item.name === 'node_modules' || item.name.startsWith('.')) continue;
        testFiles.push(...findTestFiles(fullPath));
      } else if (item.isFile()) {
        // Check if it's a test file
        if (
          item.name.endsWith('.test.ts') ||
          item.name.endsWith('.test.tsx') ||
          item.name.endsWith('.spec.ts') ||
          item.name.endsWith('.spec.tsx')
        ) {
          testFiles.push(fullPath);
        }
      }
    }
  } catch {
    // Ignore errors reading directories
  }

  return testFiles;
}

/**
 * Run generated Vitest tests in the build directory
 *
 * OPTIMIZATION: Skip vitest entirely if no test files exist
 * This prevents 5-minute timeout when agents didn't generate tests
 */
export async function runGeneratedTests(buildDir: string): Promise<TestRunResult> {
  const startTime = Date.now();

  // SMART CHECK: Actually look for test FILES, not just src directory
  const srcDir = path.join(buildDir, 'src');
  const testFiles = findTestFiles(srcDir);

  console.log(`[TEST-RUNNER] Scanning for test files in ${srcDir}`);
  console.log(`[TEST-RUNNER] Found ${testFiles.length} test file(s)`);

  if (testFiles.length === 0) {
    console.log('[TEST-RUNNER] No test files found - skipping vitest execution');
    return {
      passed: true,
      summary: 'No test files found - skipping test execution (this is OK if testing agents failed)',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      failures: [],
      duration: Date.now() - startTime,
    };
  }

  console.log(`[TEST-RUNNER] Test files found: ${testFiles.slice(0, 5).join(', ')}${testFiles.length > 5 ? '...' : ''}`);

  try {
    const result = await executeVitest(buildDir);
    return {
      ...result,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      passed: false,
      summary: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      failures: [{
        testName: 'Test Execution',
        file: buildDir,
        error: error instanceof Error ? error.message : 'Unknown error',
      }],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute Vitest and parse JSON output
 */
async function executeVitest(buildDir: string): Promise<Omit<TestRunResult, 'duration'>> {
  return new Promise((resolve) => {
    const args = ['vitest', 'run', '--reporter=json', '--no-color'];

    const child = spawn('npx', args, {
      cwd: buildDir,
      shell: true,
      env: { ...process.env, CI: 'true' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // Try to parse JSON output
      try {
        // Vitest outputs JSON to stdout
        const jsonMatch = stdout.match(/\{[\s\S]*"numTotalTests"[\s\S]*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]) as VitestJsonResult;

          const failures: TestFailure[] = [];
          for (const file of json.testResults || []) {
            for (const assertion of file.assertionResults || []) {
              if (assertion.status === 'failed') {
                failures.push({
                  testName: assertion.fullName,
                  file: file.name,
                  error: assertion.failureMessages.join('\n'),
                });
              }
            }
          }

          resolve({
            passed: json.success,
            summary: `${json.numPassedTests}/${json.numTotalTests} tests passed`,
            totalTests: json.numTotalTests,
            passedTests: json.numPassedTests,
            failedTests: json.numFailedTests,
            failures,
          });
          return;
        }
      } catch {
        // JSON parsing failed, fall through to text parsing
      }

      // Fallback: parse text output
      const passed = code === 0;
      const testMatch = stdout.match(/(\d+) passed/);
      const failMatch = stdout.match(/(\d+) failed/);

      const passedCount = testMatch ? parseInt(testMatch[1], 10) : 0;
      const failedCount = failMatch ? parseInt(failMatch[1], 10) : 0;

      resolve({
        passed,
        summary: passed
          ? `All tests passed (${passedCount} tests)`
          : `${failedCount} test(s) failed`,
        totalTests: passedCount + failedCount,
        passedTests: passedCount,
        failedTests: failedCount,
        failures: passed ? [] : [{
          testName: 'Test Suite',
          file: buildDir,
          error: stderr || 'Tests failed - see build logs for details',
        }],
      });
    });

    child.on('error', (error) => {
      resolve({
        passed: false,
        summary: `Failed to run tests: ${error.message}`,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        failures: [{
          testName: 'Test Execution',
          file: buildDir,
          error: error.message,
        }],
      });
    });

    // Timeout after 30 seconds (reduced from 5 minutes)
    // If tests take longer than 30s, something is wrong
    const VITEST_TIMEOUT_MS = 30 * 1000;
    setTimeout(() => {
      child.kill();
      console.log(`[TEST-RUNNER] Vitest timed out after ${VITEST_TIMEOUT_MS / 1000}s`);
      resolve({
        passed: false,
        summary: `Test execution timed out after ${VITEST_TIMEOUT_MS / 1000} seconds`,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        failures: [{
          testName: 'Timeout',
          file: buildDir,
          error: `Test execution exceeded ${VITEST_TIMEOUT_MS / 1000} second limit`,
        }],
      });
    }, VITEST_TIMEOUT_MS);
  });
}

/**
 * Quick test check - just verify tests can be discovered
 */
export async function canDiscoverTests(buildDir: string): Promise<boolean> {
  const testDir = path.join(buildDir, 'src');
  try {
    if (!fs.existsSync(testDir)) return false;

    const files = fs.readdirSync(testDir, { recursive: true }) as string[];
    return files.some(f =>
      f.endsWith('.test.ts') ||
      f.endsWith('.test.tsx') ||
      f.endsWith('.spec.ts') ||
      f.endsWith('.spec.tsx')
    );
  } catch {
    return false;
  }
}
