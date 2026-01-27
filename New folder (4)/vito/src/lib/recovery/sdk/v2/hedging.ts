/**
 * Request Hedging (Speculative Execution)
 *
 * For latency-sensitive operations, waiting for timeouts is unacceptable.
 * Hedging fires a backup request after a delay and takes the FIRST response.
 *
 * Used by: Netflix, Google, Amazon for tail latency reduction
 *
 * Trade-off: More requests = more load, but p99 latency drops dramatically
 *
 * @example
 * ```typescript
 * // If primary doesn't respond in 100ms, fire backup
 * const result = await hedge(
 *   () => fetchFromPrimary(),
 *   { hedgeDelay: 100, maxHedges: 2 }
 * );
 *
 * // Or with different endpoints
 * const result = await hedgeAcross([
 *   () => fetchFromRegion('us-east'),
 *   () => fetchFromRegion('us-west'),
 *   () => fetchFromRegion('eu-central'),
 * ], { hedgeDelay: 50 });
 * ```
 */

import { Result, Ok, Err } from '../result';
import { Milliseconds, Milliseconds as ms, RecoveryErrorCode, createRecoveryError } from '../types';
import { metrics, generateTraceId } from '../metrics';
import { sanitizeName, validateHedgeConfig, checkRegistrySize, LIMITS } from './validation';

// ============================================================================
// TYPES
// ============================================================================

export interface HedgeConfig {
  /** Delay before firing hedge request (ms). Default: 100 */
  hedgeDelay?: number;
  /** Maximum number of hedge requests. Default: 1 */
  maxHedges?: number;
  /** Cancel in-flight hedges when one succeeds. Default: true */
  cancelOnSuccess?: boolean;
  /** Only hedge if primary request looks slow (percentile-based). Default: false */
  adaptiveHedging?: boolean;
  /** Percentile threshold for adaptive hedging (0-1). Default: 0.95 */
  percentileThreshold?: number;
}

export interface HedgeResult<T> {
  value: T;
  /** Which request won (0 = primary, 1+ = hedge) */
  winnerIndex: number;
  /** Total time to get result */
  elapsed: number;
  /** How many requests were fired */
  requestsFired: number;
  /** Was adaptive hedging triggered */
  adaptiveTriggered?: boolean;
}

interface RaceEntry<T> {
  index: number;
  promise: Promise<T>;
  abortController?: AbortController;
}

// ============================================================================
// LATENCY TRACKING FOR ADAPTIVE HEDGING
// ============================================================================

class LatencyTracker {
  private samples: number[] = [];
  private readonly maxSamples = 100;

  record(latencyMs: number): void {
    this.samples.push(latencyMs);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  getPercentile(p: number): number {
    if (this.samples.length === 0) return Infinity;

    const sorted = [...this.samples].sort((a, b) => a - b);
    const index = Math.ceil(p * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getSampleCount(): number {
    return this.samples.length;
  }
}

const latencyTrackers = new Map<string, LatencyTracker>();

function getLatencyTracker(operation: string): LatencyTracker {
  const sanitizedName = sanitizeName(operation);
  let tracker = latencyTrackers.get(sanitizedName);
  if (!tracker) {
    // Prevent registry exhaustion attack
    checkRegistrySize(latencyTrackers, sanitizedName);
    tracker = new LatencyTracker();
    latencyTrackers.set(sanitizedName, tracker);
  }
  return tracker;
}

// ============================================================================
// CORE HEDGING FUNCTION
// ============================================================================

/**
 * Execute an operation with hedging.
 * If primary doesn't complete in hedgeDelay, fires backup request.
 * Returns first successful result, cancels others.
 */
export async function hedge<T>(
  operation: () => T | Promise<T>,
  config: HedgeConfig = {}
): Promise<Result<HedgeResult<T>, Error>> {
  // Validate config through security layer
  const validated = validateHedgeConfig(config as Record<string, unknown>);
  const {
    hedgeDelay,
    maxHedges,
    cancelOnSuccess,
    adaptiveHedging,
    percentileThreshold,
  } = validated;

  const traceId = generateTraceId();
  const operationName = (operation as { __operationName?: string }).__operationName ?? 'hedge';
  const tracker = getLatencyTracker(operationName);
  const startTime = Date.now();

  // Determine if we should hedge based on adaptive threshold
  let shouldHedge = true;
  let adaptiveTriggered = false;

  if (adaptiveHedging && tracker.getSampleCount() >= 10) {
    const p95 = tracker.getPercentile(percentileThreshold);
    // Only hedge if this request takes longer than the threshold
    shouldHedge = false; // Will be set to true if primary is slow
    adaptiveTriggered = true;
  }

  const entries: RaceEntry<T>[] = [];
  const abortControllers: AbortController[] = [];

  // Create abort controllers for cancellation
  for (let i = 0; i <= maxHedges; i++) {
    abortControllers.push(new AbortController());
  }

  // Fire primary request immediately
  entries.push({
    index: 0,
    promise: executeWithAbort(operation, abortControllers[0].signal, 0),
    abortController: abortControllers[0],
  });

  // Schedule hedge requests
  const hedgePromises: Promise<void>[] = [];

  if (!adaptiveHedging || !adaptiveTriggered) {
    for (let i = 1; i <= maxHedges; i++) {
      const hedgeIndex = i;
      const delay = hedgeDelay * i;

      hedgePromises.push(
        new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            // Only fire if no result yet
            if (!abortControllers[0].signal.aborted) {
              entries.push({
                index: hedgeIndex,
                promise: executeWithAbort(operation, abortControllers[hedgeIndex].signal, hedgeIndex),
                abortController: abortControllers[hedgeIndex],
              });
            }
            resolve();
          }, delay);

          // Clean up timer if primary succeeds early
          abortControllers[0].signal.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve();
          });
        })
      );
    }
  }

  try {
    // Race all requests
    const result = await raceWithIndex(entries);

    const elapsed = Date.now() - startTime;
    tracker.record(elapsed);

    // Cancel other in-flight requests
    if (cancelOnSuccess) {
      for (let i = 0; i < abortControllers.length; i++) {
        if (i !== result.index) {
          abortControllers[i].abort();
        }
      }
    }

    // Emit metrics
    metrics.emitSuccess({
      operation: operationName,
      attempts: entries.length,
      elapsed,
      fromFallback: result.index > 0,
      labels: {
        operation: operationName,
        fallback: result.index > 0 ? 'true' : 'false',
        trace_id: traceId,
      },
      timestamp: Date.now(),
      traceId,
    });

    return Ok({
      value: result.value,
      winnerIndex: result.index,
      elapsed,
      requestsFired: entries.length,
      adaptiveTriggered,
    });
  } catch (error) {
    // All requests failed
    const elapsed = Date.now() - startTime;

    metrics.emitFailure({
      operation: operationName,
      attempts: entries.length,
      elapsed,
      errorCode: RecoveryErrorCode.MAX_RETRIES_EXCEEDED,
      errorMessage: error instanceof Error ? error.message : String(error),
      labels: {
        operation: operationName,
        error_code: RecoveryErrorCode.MAX_RETRIES_EXCEEDED,
        trace_id: traceId,
      },
      timestamp: Date.now(),
      traceId,
    });

    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Hedge across multiple different operations/endpoints.
 * Fires them in sequence with delays, returns first success.
 */
export async function hedgeAcross<T>(
  operations: Array<() => T | Promise<T>>,
  config: { hedgeDelay?: number; cancelOnSuccess?: boolean } = {}
): Promise<Result<HedgeResult<T>, Error>> {
  const { hedgeDelay = 50, cancelOnSuccess = true } = config;

  if (operations.length === 0) {
    return Err(new Error('hedgeAcross requires at least one operation'));
  }

  const traceId = generateTraceId();
  const startTime = Date.now();
  const abortControllers = operations.map(() => new AbortController());
  const entries: RaceEntry<T>[] = [];

  // Fire first immediately
  entries.push({
    index: 0,
    promise: executeWithAbort(operations[0], abortControllers[0].signal, 0),
    abortController: abortControllers[0],
  });

  // Schedule others with staggered delays
  for (let i = 1; i < operations.length; i++) {
    const index = i;
    setTimeout(() => {
      if (!entries.some(e => e.abortController?.signal.aborted === false)) {
        return; // All done
      }
      entries.push({
        index,
        promise: executeWithAbort(operations[index], abortControllers[index].signal, index),
        abortController: abortControllers[index],
      });
    }, hedgeDelay * i);
  }

  try {
    const result = await raceWithIndex(entries);
    const elapsed = Date.now() - startTime;

    if (cancelOnSuccess) {
      abortControllers.forEach((ac, i) => {
        if (i !== result.index) ac.abort();
      });
    }

    return Ok({
      value: result.value,
      winnerIndex: result.index,
      elapsed,
      requestsFired: entries.length,
    });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function executeWithAbort<T>(
  operation: () => T | Promise<T>,
  signal: AbortSignal,
  _index: number
): Promise<T> {
  if (signal.aborted) {
    throw new Error('Aborted');
  }

  return new Promise<T>((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });

    Promise.resolve(operation())
      .then(resolve)
      .catch(reject);
  });
}

async function raceWithIndex<T>(
  entries: RaceEntry<T>[]
): Promise<{ value: T; index: number }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let errorCount = 0;
    let lastError: Error | null = null;

    const tryResolve = (value: T, index: number) => {
      if (!settled) {
        settled = true;
        resolve({ value, index });
      }
    };

    const tryReject = (error: Error) => {
      if (settled) return;

      // Don't count aborts as errors
      if (error.message === 'Aborted') return;

      lastError = error;
      errorCount++;

      // All entries failed
      if (errorCount >= entries.length) {
        settled = true;
        reject(lastError);
      }
    };

    // Set up listeners for all current and future entries
    const processEntry = (entry: RaceEntry<T>) => {
      entry.promise
        .then((value) => tryResolve(value, entry.index))
        .catch(tryReject);
    };

    // Process initial entries
    entries.forEach(processEntry);

    // Watch for new entries (hedges added later)
    const originalPush = entries.push.bind(entries);
    entries.push = (...items: RaceEntry<T>[]) => {
      items.forEach(processEntry);
      return originalPush(...items);
    };
  });
}

// ============================================================================
// TESTING UTILITIES
// ============================================================================

/**
 * Clear latency tracking data (for testing).
 */
export function clearLatencyTrackers(): void {
  latencyTrackers.clear();
}
