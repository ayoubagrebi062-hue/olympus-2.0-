#!/usr/bin/env npx tsx
/**
 * OLYMPUS 2.0 - End-to-End Build Verification
 *
 * Verifies the entire build pipeline works:
 * 1. Creates a build via buildService
 * 2. Waits for completion
 * 3. Compiles generated TypeScript
 * 4. Runs generated tests
 * 5. Runs smoke tests
 *
 * Usage:
 *   npm run build:verify
 *   npx tsx scripts/verify-build.ts
 *   npx tsx scripts/verify-build.ts --timeout=600000 --description="Custom app"
 *
 * Exit codes:
 *   0 - All verifications passed
 *   1 - Build failed
 *   2 - Compilation failed
 *   3 - Tests failed
 *   4 - Smoke tests failed
 *   5 - Timeout
 */

import { spawn, exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

// Import build service
import { buildService } from '../src/lib/agents/services/build-service';
import { runSmokeTests } from '../src/lib/quality/smoke-tester';

const exec = promisify(execCallback);

// =============================================================================
// CONFIGURATION
// =============================================================================

interface VerifyConfig {
  description: string;
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise';
  timeout: number;          // Max wait time for build (ms)
  pollInterval: number;     // Progress poll interval (ms)
  outputDir: string;        // Where generated code goes
  skipTests: boolean;       // Skip test execution
  skipSmoke: boolean;       // Skip smoke tests
  keepOutput: boolean;      // Keep generated files after verification
  verbose: boolean;         // Verbose logging
}

const DEFAULT_CONFIG: VerifyConfig = {
  description: 'Simple todo app with add, delete, and complete functionality. Include a clean UI with task list, input field, and action buttons.',
  tier: 'starter',
  timeout: 300000,          // 5 minutes
  pollInterval: 3000,       // 3 seconds
  outputDir: path.join(process.cwd(), '.verify-output'),
  skipTests: false,
  skipSmoke: false,
  keepOutput: false,
  verbose: false,
};

// =============================================================================
// UTILITIES
// =============================================================================

function log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const icons = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  };
  console.log(`${icons[level]} ${message}`);
}

function parseArgs(): Partial<VerifyConfig> {
  const args: Partial<VerifyConfig> = {};

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--timeout=')) {
      args.timeout = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--description=')) {
      args.description = arg.split('=')[1];
    } else if (arg.startsWith('--tier=')) {
      args.tier = arg.split('=')[1] as VerifyConfig['tier'];
    } else if (arg === '--skip-tests') {
      args.skipTests = true;
    } else if (arg === '--skip-smoke') {
      args.skipSmoke = true;
    } else if (arg === '--keep-output') {
      args.keepOutput = true;
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`
OLYMPUS Build Verification Script

Usage: npx tsx scripts/verify-build.ts [options]

Options:
  --timeout=<ms>        Max wait time for build (default: 300000)
  --description=<text>  Build description (default: todo app)
  --tier=<tier>         Build tier: starter|professional|ultimate|enterprise
  --skip-tests          Skip running generated tests
  --skip-smoke          Skip smoke tests
  --keep-output         Keep generated files after verification
  --verbose, -v         Verbose logging
  --help, -h            Show this help

Examples:
  npx tsx scripts/verify-build.ts
  npx tsx scripts/verify-build.ts --timeout=600000
  npx tsx scripts/verify-build.ts --description="Blog with posts and comments"
  npx tsx scripts/verify-build.ts --skip-smoke --keep-output
`);
}

// =============================================================================
// BUILD HELPERS
// =============================================================================

interface BuildResult {
  success: boolean;
  buildId: string;
  outputDir: string;
  duration: number;
  phases: string[];
  error?: string;
}

async function waitForBuild(
  buildId: string,
  timeout: number,
  pollInterval: number,
  verbose: boolean
): Promise<BuildResult> {
  const startTime = Date.now();
  const phases: string[] = [];
  let lastPhase = '';

  while (Date.now() - startTime < timeout) {
    const progress = await buildService.getProgress(buildId);

    if (!progress.success) {
      return {
        success: false,
        buildId,
        outputDir: '',
        duration: Date.now() - startTime,
        phases,
        error: progress.error?.message || 'Failed to get progress',
      };
    }

    const data = progress.data!;

    // Track phases
    if (data.currentPhase && data.currentPhase !== lastPhase) {
      phases.push(data.currentPhase);
      lastPhase = data.currentPhase;
      if (verbose) {
        log(`Phase: ${data.currentPhase} (${data.progress || 0}%)`, 'info');
      }
    }

    // Check status
    if (data.status === 'completed') {
      return {
        success: true,
        buildId,
        outputDir: process.cwd(), // Generated code goes to CWD
        duration: Date.now() - startTime,
        phases,
      };
    }

    if (data.status === 'failed') {
      return {
        success: false,
        buildId,
        outputDir: '',
        duration: Date.now() - startTime,
        phases,
        error: 'Build failed',
      };
    }

    if (data.status === 'canceled') {
      return {
        success: false,
        buildId,
        outputDir: '',
        duration: Date.now() - startTime,
        phases,
        error: 'Build was canceled',
      };
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout
  return {
    success: false,
    buildId,
    outputDir: '',
    duration: Date.now() - startTime,
    phases,
    error: `Build timed out after ${timeout}ms`,
  };
}

// =============================================================================
// VERIFICATION STEPS
// =============================================================================

async function step1_CreateBuild(config: VerifyConfig): Promise<{ buildId: string }> {
  log('Step 1: Creating build...', 'info');

  const createResult = await buildService.create({
    projectId: `verify_${Date.now()}`,
    tenantId: 'verification',
    userId: 'verify-script',
    tier: config.tier,
    description: config.description,
    useConductor: true,
  });

  if (!createResult.success || !createResult.data) {
    throw new Error(`Failed to create build: ${createResult.error?.message || 'Unknown error'}`);
  }

  log(`Build created: ${createResult.data.buildId}`, 'success');

  if (config.verbose) {
    log(`Plan: ${createResult.data.plan.totalAgents} agents, ${createResult.data.plan.phases.length} phases`, 'info');
  }

  return { buildId: createResult.data.buildId };
}

async function step2_StartAndWait(
  buildId: string,
  config: VerifyConfig
): Promise<BuildResult> {
  log('Step 2: Starting build and waiting for completion...', 'info');

  const startResult = await buildService.start(buildId);

  if (!startResult.success) {
    throw new Error(`Failed to start build: ${startResult.error?.message || 'Unknown error'}`);
  }

  log('Build started, waiting for completion...', 'info');

  const result = await waitForBuild(buildId, config.timeout, config.pollInterval, config.verbose);

  if (!result.success) {
    throw new Error(result.error || 'Build failed');
  }

  log(`Build completed in ${(result.duration / 1000).toFixed(1)}s`, 'success');
  log(`Phases completed: ${result.phases.join(' → ')}`, 'info');

  return result;
}

async function step3_CompileCode(outputDir: string, verbose: boolean): Promise<void> {
  log('Step 3: Compiling generated code...', 'info');

  try {
    // Check if tsconfig exists
    const tsconfigPath = path.join(outputDir, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      log('No tsconfig.json found, skipping TypeScript compilation', 'warn');
      return;
    }

    const { stdout, stderr } = await exec('npx tsc --noEmit', {
      cwd: outputDir,
      timeout: 60000,
    });

    if (verbose && stdout) {
      console.log(stdout);
    }

    log('TypeScript compilation passed', 'success');
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    if (verbose && err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    throw new Error(`Compilation failed: ${err.message || 'Unknown error'}`);
  }
}

async function step4_RunTests(outputDir: string, verbose: boolean): Promise<void> {
  log('Step 4: Running generated tests...', 'info');

  // Check if tests exist
  const testPatterns = ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'];
  const srcDir = path.join(outputDir, 'src');

  if (!fs.existsSync(srcDir)) {
    log('No src directory found, skipping tests', 'warn');
    return;
  }

  // Check for vitest config
  const hasVitest = fs.existsSync(path.join(outputDir, 'vitest.config.ts')) ||
                    fs.existsSync(path.join(outputDir, 'vitest.config.js'));

  if (!hasVitest) {
    log('No vitest config found, skipping tests', 'warn');
    return;
  }

  try {
    const { stdout, stderr } = await exec('npx vitest run --reporter=verbose', {
      cwd: outputDir,
      timeout: 120000,
      env: { ...process.env, CI: 'true' },
    });

    if (verbose && stdout) {
      console.log(stdout);
    }

    log('All tests passed', 'success');
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    if (verbose && err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    throw new Error(`Tests failed: ${err.message || 'Unknown error'}`);
  }
}

async function step5_SmokeTest(outputDir: string, verbose: boolean): Promise<void> {
  log('Step 5: Running smoke tests...', 'info');

  // Check if package.json exists
  if (!fs.existsSync(path.join(outputDir, 'package.json'))) {
    log('No package.json found, skipping smoke tests', 'warn');
    return;
  }

  try {
    const result = await runSmokeTests(outputDir, {
      port: 3098,
      timeout: 30000,
      retries: 2,
    });

    if (verbose) {
      log(`Smoke test result: ${result.status}`, 'info');
      if (result.issues.length > 0) {
        log(`Issues found: ${result.issues.length}`, 'warn');
        result.issues.forEach(issue => {
          console.log(`  - [${issue.severity}] ${issue.message}`);
        });
      }
    }

    if (!result.passed) {
      const criticalIssues = result.issues.filter(i => i.severity === 'error');
      throw new Error(`Smoke tests failed: ${criticalIssues.length} critical issues`);
    }

    log('Smoke tests passed', 'success');
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(`Smoke tests failed: ${err.message || 'Unknown error'}`);
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function verifyBuild() {
  console.log('\n🚀 OLYMPUS Build Verification\n');
  console.log('═'.repeat(50));

  const config: VerifyConfig = {
    ...DEFAULT_CONFIG,
    ...parseArgs(),
  };

  log(`Description: ${config.description.substring(0, 60)}...`, 'info');
  log(`Tier: ${config.tier}`, 'info');
  log(`Timeout: ${config.timeout / 1000}s`, 'info');
  console.log('');

  let buildId = '';
  let outputDir = '';

  try {
    // Step 1: Create build
    const createResult = await step1_CreateBuild(config);
    buildId = createResult.buildId;

    // Step 2: Start and wait
    const buildResult = await step2_StartAndWait(buildId, config);
    outputDir = buildResult.outputDir;

    // Step 3: Compile
    await step3_CompileCode(outputDir, config.verbose);

    // Step 4: Run tests (unless skipped)
    if (!config.skipTests) {
      await step4_RunTests(outputDir, config.verbose);
    } else {
      log('Step 4: Skipping tests (--skip-tests)', 'warn');
    }

    // Step 5: Smoke test (unless skipped)
    if (!config.skipSmoke) {
      await step5_SmokeTest(outputDir, config.verbose);
    } else {
      log('Step 5: Skipping smoke tests (--skip-smoke)', 'warn');
    }

    // Success!
    console.log('\n' + '═'.repeat(50));
    log('BUILD VERIFICATION PASSED!', 'success');
    console.log('═'.repeat(50) + '\n');

    if (!config.keepOutput && outputDir) {
      // Cleanup would go here if we had a separate output dir
      // For now, generated code stays in CWD
    }

    process.exit(0);

  } catch (error: unknown) {
    const err = error as { message?: string };
    console.log('\n' + '═'.repeat(50));
    log(`BUILD VERIFICATION FAILED: ${err.message}`, 'error');
    console.log('═'.repeat(50) + '\n');

    // Determine exit code based on failure
    const message = err.message?.toLowerCase() || '';
    if (message.includes('timeout')) {
      process.exit(5);
    } else if (message.includes('smoke')) {
      process.exit(4);
    } else if (message.includes('test')) {
      process.exit(3);
    } else if (message.includes('compil')) {
      process.exit(2);
    } else {
      process.exit(1);
    }
  }
}

// Run
verifyBuild().catch(err => {
  log(`Unexpected error: ${err.message}`, 'error');
  process.exit(1);
});
