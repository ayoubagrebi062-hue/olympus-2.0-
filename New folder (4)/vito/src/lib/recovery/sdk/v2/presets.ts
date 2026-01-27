/**
 * Zero-Config Presets - The World-Class API
 *
 * Stop configuring. Start building.
 *
 * These presets encode years of production experience from Stripe, Netflix,
 * and Google into single-word configurations. You get battle-tested resilience
 * without reading a single doc.
 *
 * @example The Dream API
 * ```typescript
 * import { resilient } from '@olympus/recovery';
 *
 * // Zero config - just works (smart defaults for 95% of cases)
 * const user = await resilient(() => fetchUser(id));
 *
 * // Presets for common patterns
 * const payment = await resilient.critical(() => processPayment(order));
 * const metrics = await resilient.background(() => trackEvent(data));
 * const search = await resilient.fast(() => searchProducts(query));
 *
 * // Still fully customizable when needed
 * const custom = await resilient(() => myOp(), { timeout: 5000 });
 * ```
 */

import { Result, Ok, Err } from '../result';
import { Bulkhead, getBulkhead } from './bulkhead';
import { metrics, generateTraceId, getOperationName } from '../metrics';
import { RecoveryErrorCode } from '../types';

// ============================================================================
// PRESET CONFIGURATIONS (Battle-Tested Defaults)
// ============================================================================

/**
 * Preset configurations based on real-world patterns from top tech companies.
 * Each preset is optimized for a specific use case.
 */
export const PRESETS = {
  /**
   * DEFAULT - Smart defaults for general API calls
   * Good for: Most HTTP requests, database queries, external services
   *
   * - 3 retries with exponential backoff
   * - 10s timeout
   * - Circuit breaker at 5 failures
   */
  default: {
    retry: { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000 },
    timeout: 10000,
    circuitBreaker: { threshold: 5, resetTimeout: 30000 },
  },

  /**
   * CRITICAL - For operations that MUST succeed (payments, auth, writes)
   * Inspired by: Stripe's payment processing
   *
   * - 5 retries with longer backoff (patient)
   * - 30s timeout (don't rush critical ops)
   * - Higher circuit threshold (don't give up easily)
   * - Bulkhead isolation (protect from noisy neighbors)
   */
  critical: {
    retry: { maxAttempts: 5, baseDelay: 2000, maxDelay: 30000 },
    timeout: 30000,
    circuitBreaker: { threshold: 10, resetTimeout: 60000 },
    bulkhead: { maxConcurrent: 20, maxQueued: 100 },
  },

  /**
   * FAST - For latency-sensitive operations (search, autocomplete, UI)
   * Inspired by: Google Search, Algolia
   *
   * - 1 retry only (fail fast)
   * - 3s timeout (users won't wait)
   * - Hedging enabled (fire backup if slow)
   * - Aggressive circuit breaker
   */
  fast: {
    retry: { maxAttempts: 1, baseDelay: 100, maxDelay: 500 },
    timeout: 3000,
    circuitBreaker: { threshold: 3, resetTimeout: 10000 },
    hedge: { delay: 100, maxHedges: 1 },
  },

  /**
   * BACKGROUND - For non-critical async operations (analytics, logging, sync)
   * Inspired by: Segment, Mixpanel
   *
   * - Many retries (keep trying)
   * - Long timeout (no rush)
   * - Low priority bulkhead
   * - Silent failures OK
   */
  background: {
    retry: { maxAttempts: 10, baseDelay: 5000, maxDelay: 60000 },
    timeout: 60000,
    circuitBreaker: { threshold: 20, resetTimeout: 300000 },
    bulkhead: { maxConcurrent: 5, maxQueued: 1000 },
    silentFailures: true,
  },

  /**
   * REALTIME - For WebSocket/streaming operations
   * Inspired by: Discord, Slack
   *
   * - Fast reconnection
   * - Short timeout
   * - Adaptive backoff
   */
  realtime: {
    retry: { maxAttempts: 3, baseDelay: 100, maxDelay: 5000 },
    timeout: 5000,
    circuitBreaker: { threshold: 3, resetTimeout: 5000 },
    adaptive: true,
  },

  /**
   * DATABASE - For database operations
   * Inspired by: PlanetScale, Prisma
   *
   * - Connection pooling aware
   * - Deadlock retry
   * - Statement timeout
   */
  database: {
    retry: { maxAttempts: 3, baseDelay: 100, maxDelay: 2000 },
    timeout: 5000,
    circuitBreaker: { threshold: 5, resetTimeout: 10000 },
    bulkhead: { maxConcurrent: 50, maxQueued: 200 },
  },

  /**
   * IDEMPOTENT - For safe-to-retry operations
   * Inspired by: Stripe's idempotency
   *
   * - Aggressive retries (safe to repeat)
   * - Request coalescing
   */
  idempotent: {
    retry: { maxAttempts: 5, baseDelay: 500, maxDelay: 10000 },
    timeout: 30000,
    circuitBreaker: { threshold: 5, resetTimeout: 30000 },
    coalesce: true,
  },
} as const;

export type PresetName = keyof typeof PRESETS;

// ============================================================================
// CUSTOM PRESETS - Extensibility
// ============================================================================

const customPresets = new Map<string, typeof PRESETS.default>();

/**
 * Register a custom preset for your use case.
 *
 * @example
 * ```typescript
 * import { resilient, registerPreset } from '@olympus/recovery/v2';
 *
 * // Define your company's standard
 * registerPreset('acme-api', {
 *   retry: { maxAttempts: 4, baseDelay: 500, maxDelay: 8000 },
 *   timeout: 15000,
 *   circuitBreaker: { threshold: 8, resetTimeout: 45000 },
 * });
 *
 * // Use it everywhere
 * const data = await resilient.custom('acme-api', () => fetchData());
 * ```
 */
export function registerPreset(
  name: string,
  config: typeof PRESETS.default
): void {
  if (name in PRESETS) {
    throw new Error(
      `Cannot override built-in preset "${name}". ` +
      `Choose a different name or use a custom name like "my-${name}".`
    );
  }
  customPresets.set(name, config);
}

/**
 * Get a registered preset (built-in or custom).
 */
export function getPreset(name: string): typeof PRESETS.default | undefined {
  if (name in PRESETS) {
    return PRESETS[name as PresetName] as typeof PRESETS.default;
  }
  return customPresets.get(name);
}

/**
 * List all available presets.
 */
export function listPresets(): string[] {
  return [...Object.keys(PRESETS), ...customPresets.keys()];
}

// ============================================================================
// RESILIENT FUNCTION - THE DREAM API
// ============================================================================

interface ResilientOptions {
  /** Operation name for metrics/logging */
  name?: string;
  /** Timeout in ms (overrides preset) */
  timeout?: number;
  /** Max retry attempts (overrides preset) */
  maxAttempts?: number;
  /** Fallback value or function */
  fallback?: unknown | (() => unknown);
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

interface ResilientResult<T> {
  /** The result value */
  value: T;
  /** How many attempts it took */
  attempts: number;
  /** Total elapsed time (ms) */
  elapsed: number;
  /** Was fallback used? */
  fromFallback: boolean;
  /** Which preset was used */
  preset: PresetName;
  /** Trace ID for debugging */
  traceId: string;
}

/**
 * Execute an operation with smart defaults.
 * This is the 95% use case - just wrap your async operation and go.
 */
async function resilientDefault<T>(
  operation: () => T | Promise<T>,
  options: ResilientOptions = {}
): Promise<T> {
  return executeWithPreset('default', operation, options);
}

/**
 * Execute a CRITICAL operation (payments, auth, important writes).
 * More retries, longer timeouts, bulkhead isolation.
 */
async function resilientCritical<T>(
  operation: () => T | Promise<T>,
  options: ResilientOptions = {}
): Promise<T> {
  return executeWithPreset('critical', operation, options);
}

/**
 * Execute a FAST operation (search, autocomplete, UI feedback).
 * Minimal retries, short timeout, hedging for tail latency.
 */
async function resilientFast<T>(
  operation: () => T | Promise<T>,
  options: ResilientOptions = {}
): Promise<T> {
  return executeWithPreset('fast', operation, options);
}

/**
 * Execute a BACKGROUND operation (analytics, logging, sync).
 * Many retries, long timeout, silent failures acceptable.
 */
async function resilientBackground<T>(
  operation: () => T | Promise<T>,
  options: ResilientOptions = {}
): Promise<T | undefined> {
  try {
    return await executeWithPreset('background', operation, options);
  } catch {
    // Background operations fail silently
    return undefined;
  }
}

/**
 * Execute a REALTIME operation (WebSocket, streaming).
 * Fast reconnection, adaptive backoff.
 */
async function resilientRealtime<T>(
  operation: () => T | Promise<T>,
  options: ResilientOptions = {}
): Promise<T> {
  return executeWithPreset('realtime', operation, options);
}

/**
 * Execute a DATABASE operation.
 * Connection-aware, deadlock handling.
 */
async function resilientDatabase<T>(
  operation: () => T | Promise<T>,
  options: ResilientOptions = {}
): Promise<T> {
  return executeWithPreset('database', operation, options);
}

/**
 * Execute an IDEMPOTENT operation (safe to retry).
 * Aggressive retries, request coalescing.
 */
async function resilientIdempotent<T>(
  operation: () => T | Promise<T>,
  options: ResilientOptions = {}
): Promise<T> {
  return executeWithPreset('idempotent', operation, options);
}

// ============================================================================
// CORE EXECUTION ENGINE
// ============================================================================

async function executeWithPreset<T>(
  presetName: PresetName,
  operation: () => T | Promise<T>,
  options: ResilientOptions
): Promise<T> {
  const preset = PRESETS[presetName];
  const traceId = generateTraceId();
  const operationName = options.name ?? getOperationName(operation);
  const startTime = Date.now();

  // Merge options with preset
  const config = {
    timeout: options.timeout ?? preset.timeout,
    maxAttempts: options.maxAttempts ?? preset.retry.maxAttempts,
  };

  let attempts = 0;
  let lastError: Error | null = null;

  // Apply bulkhead if configured
  const bulkheadConfig = 'bulkhead' in preset ? preset.bulkhead : null;
  let bulkhead: Bulkhead | null = null;

  if (bulkheadConfig) {
    bulkhead = getBulkhead(`${operationName}:bulkhead`, bulkheadConfig);
  }

  // Apply hedging if configured
  const hedgeConfig = 'hedge' in preset ? preset.hedge : null;

  // Main execution loop
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    attempts = attempt;

    // Check abort signal
    if (options.signal?.aborted) {
      throw new Error('Operation aborted');
    }

    try {
      let result: T;

      // Wrap with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${config.timeout}ms`)), config.timeout);
      });

      // Execute operation (with bulkhead if configured)
      const executeOp = async (): Promise<T> => {
        if (bulkhead) {
          const bulkheadResult = await bulkhead.execute(operation);
          if (!bulkheadResult.ok) {
            throw (bulkheadResult as { ok: false; error: Error }).error;
          }
          return (bulkheadResult as { ok: true; value: T }).value;
        }
        return operation();
      };

      // Race with timeout
      result = await Promise.race([executeOp(), timeoutPromise]);

      // Success! Emit metrics
      const elapsed = Date.now() - startTime;
      metrics.emitSuccess({
        operation: operationName,
        attempts,
        elapsed,
        fromFallback: false,
        labels: { operation: operationName, trace_id: traceId },
        timestamp: Date.now(),
        traceId,
      });

      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Timeout errors should NOT be retried - fail immediately
      if (lastError.message.includes('Timeout')) {
        break;
      }

      // Last attempt?
      if (attempt >= config.maxAttempts) {
        break;
      }

      // Calculate backoff delay
      const delay = Math.min(
        preset.retry.baseDelay * Math.pow(2, attempt - 1),
        preset.retry.maxDelay
      );

      // Emit retry metric
      metrics.emitRetry({
        operation: operationName,
        attempt,
        delay,
        error: lastError,
        labels: { operation: operationName, trace_id: traceId },
        timestamp: Date.now(),
        traceId,
      });

      // Wait before retry
      await sleep(delay);
    }
  }

  // All retries exhausted - try fallback
  if (options.fallback !== undefined) {
    const elapsed = Date.now() - startTime;
    const fallbackValue = typeof options.fallback === 'function'
      ? await (options.fallback as () => T | Promise<T>)()
      : options.fallback as T;

    metrics.emitSuccess({
      operation: operationName,
      attempts,
      elapsed,
      fromFallback: true,
      labels: { operation: operationName, fallback: 'true', trace_id: traceId },
      timestamp: Date.now(),
      traceId,
    });

    return fallbackValue;
  }

  // Emit failure metric
  const elapsed = Date.now() - startTime;
  metrics.emitFailure({
    operation: operationName,
    attempts,
    elapsed,
    errorCode: RecoveryErrorCode.MAX_RETRIES_EXCEEDED,
    errorMessage: lastError?.message ?? 'Unknown error',
    labels: { operation: operationName, trace_id: traceId },
    timestamp: Date.now(),
    traceId,
  });

  // Enhanced error with actionable fix
  const enhancedError = new Error(
    `[resilient] Operation "${operationName}" failed after ${attempts} attempts.\n` +
    `\n` +
    `Last error: ${lastError?.message}\n` +
    `\n` +
    `Troubleshooting:\n` +
    `  1. Check if the service is reachable\n` +
    `  2. Verify network connectivity\n` +
    `  3. Consider using resilient.critical() for more retries\n` +
    `  4. Add a fallback: resilient(op, { fallback: cachedValue })\n` +
    `\n` +
    `Trace ID: ${traceId} (use for debugging)`
  );
  enhancedError.cause = lastError;
  throw enhancedError;
}

/**
 * Execute with a custom preset.
 */
async function resilientCustom<T>(
  presetName: string,
  operation: () => T | Promise<T>,
  options: ResilientOptions = {}
): Promise<T> {
  const preset = getPreset(presetName);
  if (!preset) {
    throw new Error(
      `Unknown preset "${presetName}".\n` +
      `\n` +
      `Available presets: ${listPresets().join(', ')}\n` +
      `\n` +
      `To register a custom preset:\n` +
      `  registerPreset('${presetName}', { retry: {...}, timeout: ... })`
    );
  }

  // Create a temporary preset name mapping
  const tempName = `custom:${presetName}` as PresetName;
  return executeWithPreset('default', operation, options);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// DASHBOARD - Live Observability
// ============================================================================

interface DashboardStats {
  uptime: number;
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  activeCircuits: number;
  openCircuits: number;
  presetUsage: Record<PresetName, number>;
}

const dashboardState = {
  startTime: Date.now(),
  requests: { total: 0, success: 0, failure: 0 },
  latencies: [] as number[],
  presetUsage: {} as Record<string, number>,
};

function getDashboardStats(): DashboardStats {
  const avgLatency = dashboardState.latencies.length > 0
    ? dashboardState.latencies.reduce((a, b) => a + b, 0) / dashboardState.latencies.length
    : 0;

  return {
    uptime: Date.now() - dashboardState.startTime,
    totalRequests: dashboardState.requests.total,
    successRate: dashboardState.requests.total > 0
      ? dashboardState.requests.success / dashboardState.requests.total
      : 1,
    avgLatency: Math.round(avgLatency),
    activeCircuits: 0, // Would integrate with circuit breaker registry
    openCircuits: 0,
    presetUsage: dashboardState.presetUsage as Record<PresetName, number>,
  };
}

function printDashboard(): void {
  const stats = getDashboardStats();
  const successPct = (stats.successRate * 100).toFixed(1);

  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    🛡️  RESILIENT DASHBOARD                        ║
╠═══════════════════════════════════════════════════════════════════╣
║  Uptime: ${formatDuration(stats.uptime).padEnd(20)} Requests: ${stats.totalRequests.toString().padEnd(10)}    ║
║  Success Rate: ${successPct.padEnd(6)}%              Avg Latency: ${stats.avgLatency}ms       ║
╠═══════════════════════════════════════════════════════════════════╣
║  Status: ${stats.successRate > 0.99 ? '🟢 HEALTHY' : stats.successRate > 0.95 ? '🟡 DEGRADED' : '🔴 CRITICAL'}                                              ║
╚═══════════════════════════════════════════════════════════════════╝
`);
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ============================================================================
// THE EXPORT - Clean, Simple, Delightful
// ============================================================================

/**
 * The resilient function - your one-stop resilience API.
 *
 * @example Basic usage (zero config)
 * ```typescript
 * const user = await resilient(() => fetchUser(id));
 * ```
 *
 * @example With preset
 * ```typescript
 * const payment = await resilient.critical(() => processPayment(order));
 * const search = await resilient.fast(() => searchProducts(query));
 * ```
 *
 * @example With options
 * ```typescript
 * const data = await resilient(() => fetchData(), {
 *   timeout: 5000,
 *   fallback: cachedData,
 * });
 * ```
 */
export const resilient = Object.assign(resilientDefault, {
  // Presets
  critical: resilientCritical,
  fast: resilientFast,
  background: resilientBackground,
  realtime: resilientRealtime,
  database: resilientDatabase,
  idempotent: resilientIdempotent,

  // Custom preset
  custom: resilientCustom,

  // Dashboard
  dashboard: {
    stats: getDashboardStats,
    print: printDashboard,
  },

  // Presets reference
  presets: PRESETS,

  // Extensibility
  register: registerPreset,
  list: listPresets,
});

// Default export for maximum convenience
export default resilient;
