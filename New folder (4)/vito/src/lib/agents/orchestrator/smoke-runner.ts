/**
 * Smoke Runner - Wraps SmokeTester for orchestrator integration
 *
 * Provides a clean interface for running smoke tests during the build
 * pipeline, specifically after the frontend phase completes.
 */

import { runSmokeTests, quickSmokeTest, discoverRoutes } from '@/lib/quality/smoke-tester';
import type { GateResult, GateIssue } from '@/lib/quality/types';

export interface SmokeRunResult {
  passed: boolean;
  summary: string;
  routesTested: number;
  routesPassed: number;
  issues: SmokeIssue[];
  duration: number;
}

export interface SmokeIssue {
  route: string;
  type: 'http_error' | 'hydration_error' | 'console_error' | 'timeout';
  message: string;
}

/**
 * Run full smoke tests on the built application
 *
 * @param buildDir - The directory containing the built Next.js app
 * @param port - Port to use for dev server (default 3099)
 */
export async function runBuildSmokeTests(
  buildDir: string,
  port: number = 3099
): Promise<SmokeRunResult> {
  const startTime = Date.now();

  try {
    // Run the full smoke test suite
    const result: GateResult = await runSmokeTests(buildDir, {
      port,
      timeout: 30000,
      retries: 2,
    });

    return convertGateResult(result, Date.now() - startTime);
  } catch (error) {
    return {
      passed: false,
      summary: `Smoke test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      routesTested: 0,
      routesPassed: 0,
      issues: [{
        route: '/',
        type: 'timeout',
        message: error instanceof Error ? error.message : 'Unknown error',
      }],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Run quick smoke test - just checks if app starts
 *
 * @param buildDir - The directory containing the built Next.js app
 * @param criticalRoutes - Routes that must work (not used in quick test)
 */
export async function runQuickSmokeTest(
  buildDir: string,
  criticalRoutes: string[] = ['/']
): Promise<SmokeRunResult> {
  const startTime = Date.now();

  try {
    // quickSmokeTest returns boolean - just checks if app starts
    const passed = await quickSmokeTest(buildDir);

    return {
      passed,
      summary: passed ? 'Quick smoke test passed' : 'Quick smoke test failed - app did not start',
      routesTested: criticalRoutes.length,
      routesPassed: passed ? criticalRoutes.length : 0,
      issues: passed ? [] : [{
        route: '/',
        type: 'http_error',
        message: 'Application failed to start or respond',
      }],
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      passed: false,
      summary: `Quick smoke test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      routesTested: criticalRoutes.length,
      routesPassed: 0,
      issues: criticalRoutes.map(route => ({
        route,
        type: 'timeout' as const,
        message: error instanceof Error ? error.message : 'Unknown error',
      })),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Discover all routes in a Next.js app
 */
export async function discoverAppRoutes(buildDir: string): Promise<string[]> {
  try {
    const routes = discoverRoutes(buildDir);
    return routes.map(r => r.path);
  } catch {
    return ['/'];
  }
}

/**
 * Check if a running app responds to requests
 */
export async function checkAppHealth(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(baseUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'OLYMPUS-HealthCheck/1.0' },
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Convert GateResult from smoke-tester to SmokeRunResult
 */
function convertGateResult(gateResult: GateResult, duration: number): SmokeRunResult {
  const issues: SmokeIssue[] = (gateResult.issues || []).map((issue: GateIssue) => ({
    route: issue.file || '/',
    type: categorizeIssue(issue),
    message: issue.message,
  }));

  // Count routes from issues
  const routeSet = new Set(issues.map(i => i.route));
  const failedRoutes = routeSet.size;

  // Estimate total routes tested from metrics
  const routesTested = gateResult.metrics?.filesChecked || Math.max(failedRoutes, 1);
  const routesPassed = routesTested - failedRoutes;

  // Build summary from gate status
  const statusSummary = gateResult.passed
    ? `Smoke tests passed (${routesTested} routes tested)`
    : `Smoke tests failed: ${issues.length} issue(s) found`;

  return {
    passed: gateResult.passed,
    summary: statusSummary,
    routesTested,
    routesPassed,
    issues,
    duration,
  };
}

/**
 * Categorize a gate issue into a smoke issue type
 */
function categorizeIssue(issue: GateIssue): SmokeIssue['type'] {
  const msg = issue.message.toLowerCase();

  if (msg.includes('hydration') || msg.includes('hydrate')) {
    return 'hydration_error';
  }
  if (msg.includes('console') || msg.includes('error:')) {
    return 'console_error';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'timeout';
  }
  if (msg.includes('404') || msg.includes('500') || msg.includes('status')) {
    return 'http_error';
  }

  return 'http_error';
}
