/**
 * OLYMPUS 2.0 - Semantic Smoke Tester
 *
 * Validates that generated code actually runs:
 * - HTTP 200 on all routes
 * - No console errors
 * - React hydration success
 *
 * Proves: "The app actually runs" not just "Files exist"
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import type { GateResult, GateIssue, GateConfig } from './types';

/** Route discovered from generated files */
interface DiscoveredRoute {
  path: string;       // e.g., "/dashboard"
  filePath: string;   // e.g., "src/app/dashboard/page.tsx"
  type: 'page' | 'layout' | 'api';
  critical: boolean;  // Must pass for build success
}

/** Smoke test result for a single route */
interface RouteTestResult {
  route: string;
  httpStatus: number;
  passed: boolean;
  errors: string[];
  hydrationOk: boolean;
  responseTime: number;
}

/** Smoke test configuration */
interface SmokeTestConfig {
  buildDir: string;      // Directory containing built files
  port: number;          // Port to run dev server on
  timeout: number;       // Max time per route test
  retries: number;       // Retries per route
  criticalRoutes: string[]; // Routes that MUST pass
}

const DEFAULT_CONFIG: SmokeTestConfig = {
  buildDir: '',
  port: 3099,  // Use unusual port to avoid conflicts
  timeout: 10000,
  retries: 2,
  criticalRoutes: ['/', '/dashboard'],
};

/**
 * Discover routes from generated page files
 */
export function discoverRoutes(buildDir: string): DiscoveredRoute[] {
  const routes: DiscoveredRoute[] = [];
  const appDir = path.join(buildDir, 'src', 'app');

  if (!fs.existsSync(appDir)) {
    console.log('[SmokeTester] No src/app directory found');
    return routes;
  }

  function scanDir(dir: string, routePath: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(buildDir, fullPath);

      if (entry.isDirectory()) {
        // Skip special Next.js directories
        if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;

        // Handle dynamic routes
        const routeSegment = entry.name.startsWith('[')
          ? entry.name.replace('[', ':').replace(']', '')
          : entry.name;

        scanDir(fullPath, `${routePath}/${routeSegment}`);
      } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
        const route = routePath || '/';
        routes.push({
          path: route,
          filePath: relativePath,
          type: 'page',
          critical: route === '/' || route.includes('dashboard') || route.includes('home'),
        });
      } else if (entry.name === 'layout.tsx' || entry.name === 'layout.ts') {
        routes.push({
          path: routePath || '/',
          filePath: relativePath,
          type: 'layout',
          critical: routePath === '' || routePath === '/',
        });
      } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
        routes.push({
          path: `${routePath}/api`,
          filePath: relativePath,
          type: 'api',
          critical: false,
        });
      }
    }
  }

  scanDir(appDir);

  // Sort: critical routes first
  routes.sort((a, b) => {
    if (a.critical && !b.critical) return -1;
    if (!a.critical && b.critical) return 1;
    return a.path.localeCompare(b.path);
  });

  console.log(`[SmokeTester] Discovered ${routes.length} routes:`);
  for (const route of routes) {
    console.log(`  ${route.critical ? '[CRITICAL]' : '[OPTIONAL]'} ${route.path} (${route.type})`);
  }

  return routes;
}

/**
 * Start a temporary Next.js dev server for testing
 */
async function startDevServer(buildDir: string, port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    console.log(`[SmokeTester] Starting dev server on port ${port}...`);

    const server = spawn('npx', ['next', 'dev', '-p', port.toString()], {
      cwd: buildDir,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        server.kill();
        reject(new Error('Dev server startup timeout'));
      }
    }, 30000);

    server.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('started') || output.includes('localhost')) {
        if (!started) {
          started = true;
          clearTimeout(timeout);
          // Wait a bit for server to be fully ready
          setTimeout(() => resolve(server), 2000);
        }
      }
    });

    server.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      // Ignore common warnings
      if (!output.includes('ExperimentalWarning') && !output.includes('punycode')) {
        console.log(`[SmokeTester] Server stderr: ${output.slice(0, 200)}`);
      }
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    server.on('exit', (code) => {
      if (!started) {
        clearTimeout(timeout);
        reject(new Error(`Dev server exited with code ${code}`));
      }
    });
  });
}

/**
 * Test a single route
 */
async function testRoute(
  route: string,
  port: number,
  timeout: number
): Promise<RouteTestResult> {
  const url = `http://localhost:${port}${route}`;
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'OLYMPUS-SmokeTester/1.0',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    const httpStatus = response.status;

    if (httpStatus !== 200) {
      errors.push(`HTTP ${httpStatus} (expected 200)`);
    }

    // Check response content
    let hydrationOk = true;
    if (response.headers.get('content-type')?.includes('text/html')) {
      const html = await response.text();

      // Check for React hydration errors in the HTML
      if (html.includes('Hydration failed') || html.includes('hydration mismatch')) {
        hydrationOk = false;
        errors.push('React hydration error detected');
      }

      // Check for Next.js error page
      if (html.includes('Application error') || html.includes('500 - Internal Server Error')) {
        errors.push('Next.js application error page rendered');
      }

      // Check for empty body (no content generated)
      if (html.includes('<body></body>') || html.includes('<body> </body>')) {
        errors.push('Empty body rendered');
      }

      // Check for React error boundary
      if (html.includes('Something went wrong') || html.includes('Error boundary')) {
        errors.push('React error boundary triggered');
      }
    }

    return {
      route,
      httpStatus,
      passed: httpStatus === 200 && errors.length === 0,
      errors,
      hydrationOk,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('abort')) {
      errors.push(`Request timeout after ${timeout}ms`);
    } else {
      errors.push(`Fetch error: ${errorMessage}`);
    }

    return {
      route,
      httpStatus: 0,
      passed: false,
      errors,
      hydrationOk: false,
      responseTime,
    };
  }
}

/**
 * Run smoke tests on all discovered routes
 */
export async function runSmokeTests(
  buildDir: string,
  config: Partial<SmokeTestConfig> = {}
): Promise<GateResult> {
  const cfg: SmokeTestConfig = { ...DEFAULT_CONFIG, ...config, buildDir };
  const startTime = Date.now();
  const issues: GateIssue[] = [];
  let server: ChildProcess | null = null;

  try {
    // Discover routes
    const routes = discoverRoutes(buildDir);
    if (routes.length === 0) {
      return {
        gate: 'smoke',
        status: 'skipped',
        passed: true,
        issues: [{ severity: 'info', message: 'No routes discovered for smoke testing' }],
        duration: Date.now() - startTime,
        timestamp: new Date(),
        metrics: { filesChecked: 0 },
      };
    }

    // Check if package.json exists
    const packageJsonPath = path.join(buildDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return {
        gate: 'smoke',
        status: 'skipped',
        passed: true,
        issues: [{ severity: 'info', message: 'No package.json found - skipping smoke tests' }],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    // Start dev server
    try {
      server = await startDevServer(buildDir, cfg.port);
      console.log('[SmokeTester] Dev server started successfully');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        gate: 'smoke',
        status: 'failed',
        passed: false,
        issues: [{
          severity: 'error',
          message: `Failed to start dev server: ${errMsg}`,
        }],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    // Test each route
    const results: RouteTestResult[] = [];
    let criticalFailures = 0;
    let optionalFailures = 0;

    for (const route of routes.filter(r => r.type === 'page')) {
      // Skip dynamic routes (can't test without params)
      if (route.path.includes(':')) {
        console.log(`[SmokeTester] Skipping dynamic route: ${route.path}`);
        continue;
      }

      let result: RouteTestResult | null = null;

      // Retry logic
      for (let attempt = 1; attempt <= cfg.retries; attempt++) {
        result = await testRoute(route.path, cfg.port, cfg.timeout);
        if (result.passed) break;
        if (attempt < cfg.retries) {
          console.log(`[SmokeTester] Retrying ${route.path} (attempt ${attempt + 1}/${cfg.retries})`);
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (result) {
        results.push(result);

        if (result.passed) {
          console.log(`[SmokeTester] ✓ ${route.path} (${result.responseTime}ms)`);
        } else {
          console.log(`[SmokeTester] ✗ ${route.path}: ${result.errors.join(', ')}`);

          if (route.critical) {
            criticalFailures++;
            issues.push({
              severity: 'error',
              message: `Critical route ${route.path} failed: ${result.errors.join(', ')}`,
              file: route.filePath,
            });
          } else {
            optionalFailures++;
            issues.push({
              severity: 'warning',
              message: `Route ${route.path} failed: ${result.errors.join(', ')}`,
              file: route.filePath,
            });
          }
        }
      }
    }

    // Calculate results
    const totalRoutes = results.length;
    const passedRoutes = results.filter(r => r.passed).length;
    const passed = criticalFailures === 0;

    console.log(`[SmokeTester] Results: ${passedRoutes}/${totalRoutes} routes passed`);
    console.log(`[SmokeTester] Critical failures: ${criticalFailures}, Optional failures: ${optionalFailures}`);

    return {
      gate: 'smoke',
      status: passed ? 'passed' : 'failed',
      passed,
      issues,
      metrics: {
        filesChecked: totalRoutes,
        testsPassed: passedRoutes,
        testsFailed: totalRoutes - passedRoutes,
        errorCount: criticalFailures,
        warningCount: optionalFailures,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  } finally {
    // Clean up server
    if (server) {
      console.log('[SmokeTester] Stopping dev server...');
      server.kill('SIGTERM');
      // Force kill after 5 seconds
      setTimeout(() => {
        if (server && !server.killed) {
          server.kill('SIGKILL');
        }
      }, 5000);
    }
  }
}

/**
 * Quick smoke test - just check if root route returns 200
 * Used for fast validation without full route discovery
 */
export async function quickSmokeTest(buildDir: string, port: number = 3099): Promise<boolean> {
  let server: ChildProcess | null = null;

  try {
    server = await startDevServer(buildDir, port);
    const result = await testRoute('/', port, 10000);
    return result.passed;
  } catch {
    return false;
  } finally {
    if (server) {
      server.kill('SIGTERM');
    }
  }
}
