/**
 * Recovery Primitives
 *
 * Small, composable functions that can be used standalone or combined.
 * Each primitive does ONE thing well.
 *
 * @example
 * ```typescript
 * // Use individually
 * const data = await withRetry(() => fetchData(), { maxAttempts: 3 });
 *
 * // Compose together
 * const resilientFetch = async (url: string) => {
 *   return withTimeout(
 *     () => withRetry(() => fetch(url), { maxAttempts: 3 }),
 *     5000
 *   );
 * };
 * ```
 */

import { Result, Ok, Err, isOk } from './result';
import {
  type RecoveryError,
  type Milliseconds,
  RecoveryErrorCode,
  createRecoveryError,
  Milliseconds as ms,
} from './types';
import { metrics, getOperationName, generateTraceId } from './metrics';

// ============================================================================
// CONSTANTS (No magic numbers)
// ============================================================================

/** Default retry configuration */
const DEFAULTS = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 30000,
  BACKOFF_MULTIPLIER: 2,
  CIRCUIT_THRESHOLD: 5,
  CIRCUIT_RESET_MS: 30000,
  CIRCUIT_SUCCESS_THRESHOLD: 2,
} as const;

/**
 * Jitter adds randomness to prevent thundering herd problem.
 * Range: [0.75, 1.25] means ±25% variance around the base delay.
 */
const JITTER = {
  MIN_FACTOR: 0.75,
  RANGE: 0.5, // 0.75 + (0 to 0.5) = 0.75 to 1.25
} as const;

/** Tolerance for timeout detection (accounts for timer imprecision) */
const TIMEOUT_TOLERANCE_MS = 10;

/** Maximum delay to prevent infinite hangs */
const MAX_SAFE_DELAY_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum error message length to prevent memory issues */
const MAX_ERROR_MESSAGE_LENGTH = 10000;

// ============================================================================
// INPUT VALIDATION (Fail fast with helpful messages)
// ============================================================================

/**
 * Validate and sanitize inputs. Fail fast with helpful error messages.
 * This is the first line of defense against garbage data.
 */
function validateOperation<T>(operation: unknown, functionName: string): asserts operation is () => T | Promise<T> {
  if (operation === null || operation === undefined) {
    throw new TypeError(
      `${functionName}: operation cannot be ${operation}. ` +
      `Expected a function, got ${operation === null ? 'null' : 'undefined'}. ` +
      `Example: ${functionName}(() => fetch('/api'))`
    );
  }
  if (typeof operation !== 'function') {
    throw new TypeError(
      `${functionName}: operation must be a function. ` +
      `Expected () => T | Promise<T>, got ${typeof operation}. ` +
      `Example: ${functionName}(() => fetch('/api'))`
    );
  }
}

function validatePositiveNumber(value: number, name: string, defaultValue: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    return defaultValue;
  }
  if (value <= 0) {
    return defaultValue;
  }
  if (!isFinite(value)) {
    return defaultValue;
  }
  return value;
}

function sanitizeDelay(delay: number): number {
  if (typeof delay !== 'number' || isNaN(delay) || delay < 0) {
    return DEFAULTS.BASE_DELAY_MS;
  }
  if (!isFinite(delay) || delay > MAX_SAFE_DELAY_MS) {
    return MAX_SAFE_DELAY_MS; // Cap at 5 minutes
  }
  return delay;
}

function truncateErrorMessage(message: string): string {
  if (message.length <= MAX_ERROR_MESSAGE_LENGTH) {
    return message;
  }
  return message.slice(0, MAX_ERROR_MESSAGE_LENGTH) + `... [truncated, original length: ${message.length}]`;
}

// ============================================================================
// SIMPLE API (For users who just want it to work)
// ============================================================================

/**
 * **THE SIMPLE WAY** - Just retry and get your data. That's it.
 *
 * Returns your data directly on success, throws on final failure.
 * No Result types to learn. No .ok checking. Just works.
 *
 * @example
 * ```typescript
 * // This is all you need:
 * const users = await retry(() => fetch('/api/users'));
 *
 * // With options:
 * const data = await retry(() => fetchData(), { attempts: 5, delay: 1000 });
 *
 * // Combine with async/await naturally:
 * try {
 *   const user = await retry(() => getUser(id));
 *   const posts = await retry(() => getPosts(user.id));
 * } catch (err) {
 *   console.error('Failed after retries:', err.message);
 * }
 * ```
 */
export async function retry<T>(
  fn: () => T | Promise<T>,
  options: { attempts?: number; delay?: number } = {}
): Promise<T> {
  const { attempts = 3, delay = 1000 } = options;

  const result = await withRetry(fn, {
    maxAttempts: attempts,
    delay,
    jitter: true,
  });

  if (isOk(result)) {
    return result.value;
  }

  // Throw a normal Error that users expect
  const err = new Error(result.error.message);
  (err as any).cause = result.error.cause;
  (err as any).code = result.error.code;
  (err as any).attempts = result.error.attempts;
  throw err;
}

/**
 * **THE SIMPLE WAY** - Add a timeout. Returns data or throws.
 *
 * @example
 * ```typescript
 * const data = await timeout(() => slowOperation(), 5000);
 * ```
 */
export async function timeout<T>(
  fn: () => T | Promise<T>,
  ms: number
): Promise<T> {
  const result = await withTimeout(fn, ms);

  if (isOk(result)) {
    return result.value;
  }

  throw new Error(result.error.message);
}

/**
 * **THE SIMPLE WAY** - Try primary, fall back to secondary.
 *
 * @example
 * ```typescript
 * const data = await fallback(
 *   () => fetchFromAPI(),
 *   () => fetchFromCache()
 * );
 * ```
 */
export async function fallback<T>(
  primary: () => T | Promise<T>,
  secondary: (() => T | Promise<T>) | T
): Promise<T> {
  const result = await withFallback(primary, secondary);

  if (isOk(result)) {
    return result.value;
  }

  throw new Error(result.error.message);
}

// ============================================================================
// RETRY (Advanced API with Result types)
// ============================================================================

export interface RetryOptions {
  /** Maximum number of attempts (including the first one) */
  maxAttempts?: number;
  /** Delay between attempts (ms) */
  delay?: number;
  /** Exponential backoff multiplier */
  backoffMultiplier?: number;
  /** Maximum delay (ms) */
  maxDelay?: number;
  /** Add random jitter to delays */
  jitter?: boolean;
  /** Custom delay function */
  getDelay?: (attempt: number) => number;
  /** Should this error trigger a retry? */
  shouldRetry?: (error: Error) => boolean;
  /** Called before each retry */
  onRetry?: (attempt: number, error: Error) => void;
  /** Abort signal */
  signal?: AbortSignal;
}

/**
 * Retry an operation with configurable backoff.
 *
 * @param operation - The async operation to retry
 * @param options - Retry configuration
 * @returns Result containing the value or error details
 *
 * @example
 * ```typescript
 * // Simple retry
 * const result = await withRetry(() => fetch('/api'), { maxAttempts: 3 });
 *
 * // With exponential backoff
 * const result = await withRetry(
 *   () => fetchWithAuth(),
 *   {
 *     maxAttempts: 5,
 *     delay: 1000,
 *     backoffMultiplier: 2,
 *     maxDelay: 30000,
 *     jitter: true,
 *   }
 * );
 *
 * if (isOk(result)) {
 *   console.log(result.value);
 * }
 * ```
 */
export async function withRetry<T>(
  operation: () => T | Promise<T>,
  options: RetryOptions = {}
): Promise<Result<T, RecoveryError>> {
  // VALIDATION: Fail fast with helpful messages
  validateOperation<T>(operation, 'withRetry');

  const {
    maxAttempts: rawMaxAttempts = DEFAULTS.MAX_ATTEMPTS,
    delay: rawDelay = DEFAULTS.BASE_DELAY_MS,
    backoffMultiplier: rawMultiplier = DEFAULTS.BACKOFF_MULTIPLIER,
    maxDelay: rawMaxDelay = DEFAULTS.MAX_DELAY_MS,
    jitter = true,
    getDelay,
    shouldRetry = () => true,
    onRetry,
    signal,
  } = options;

  // SANITIZATION: Convert garbage to safe defaults
  const maxAttempts = validatePositiveNumber(rawMaxAttempts, 'maxAttempts', DEFAULTS.MAX_ATTEMPTS);
  const delay = sanitizeDelay(rawDelay);
  const backoffMultiplier = validatePositiveNumber(rawMultiplier, 'backoffMultiplier', DEFAULTS.BACKOFF_MULTIPLIER);
  const maxDelay = sanitizeDelay(rawMaxDelay);

  const startTime = Date.now();
  const operationName = getOperationName(operation);
  const traceId = generateTraceId(); // Correlation ID for this execution
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Check for cancellation
    if (signal?.aborted) {
      const elapsed = Date.now() - startTime;
      metrics.emitFailure({
        operation: operationName,
        attempts: attempt - 1,
        elapsed,
        errorCode: RecoveryErrorCode.CANCELLED,
        errorMessage: 'Operation was cancelled',
        labels: { operation: operationName, error_code: RecoveryErrorCode.CANCELLED, trace_id: traceId },
        timestamp: Date.now(),
        traceId,
      });
      return Err(createRecoveryError(
        RecoveryErrorCode.CANCELLED,
        `Operation was cancelled [trace: ${traceId}]`,
        { attempts: attempt - 1, elapsed, context: { traceId } }
      ));
    }

    try {
      const value = await operation();
      // SUCCESS: Emit metrics
      const elapsed = Date.now() - startTime;
      metrics.emitSuccess({
        operation: operationName,
        attempts: attempt,
        elapsed,
        fromFallback: false,
        labels: { operation: operationName, fallback: 'false', trace_id: traceId },
        timestamp: Date.now(),
        traceId,
      });
      return Ok(value);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Truncate error message to prevent memory issues with huge errors
      lastError.message = truncateErrorMessage(lastError.message);

      // Check if we should retry this error
      if (!shouldRetry(lastError)) {
        return Err(createRecoveryError(
          RecoveryErrorCode.UNKNOWN,
          truncateErrorMessage(`Non-retryable error: ${lastError.message}`),
          { cause: lastError, attempts: attempt, elapsed: Date.now() - startTime }
        ));
      }

      // If this was the last attempt, don't wait
      if (attempt === maxAttempts) {
        break;
      }

      // Calculate delay
      let currentDelay: number;
      if (getDelay) {
        currentDelay = getDelay(attempt);
      } else {
        currentDelay = Math.min(delay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
      }

      // Add jitter to prevent thundering herd (±25% variance)
      if (jitter) {
        const jitterFactor = JITTER.MIN_FACTOR + Math.random() * JITTER.RANGE;
        currentDelay = Math.floor(currentDelay * jitterFactor);
      }

      // RETRY: Emit metrics
      metrics.emitRetry({
        operation: operationName,
        attempt,
        delay: currentDelay,
        error: lastError,
        labels: { operation: operationName, trace_id: traceId },
        timestamp: Date.now(),
        traceId,
      });

      // Notify callback
      onRetry?.(attempt, lastError);

      // Wait before retry
      await sleep(currentDelay, signal);
    }
  }

  // FINAL FAILURE: Emit metrics
  const elapsed = Date.now() - startTime;
  metrics.emitFailure({
    operation: operationName,
    attempts: maxAttempts,
    elapsed,
    errorCode: RecoveryErrorCode.MAX_RETRIES_EXCEEDED,
    errorMessage: lastError?.message || 'Unknown error',
    labels: { operation: operationName, error_code: RecoveryErrorCode.MAX_RETRIES_EXCEEDED, trace_id: traceId },
    timestamp: Date.now(),
    traceId,
  });

  return Err(createRecoveryError(
    RecoveryErrorCode.MAX_RETRIES_EXCEEDED,
    `Failed after ${maxAttempts} attempts [trace: ${traceId}]: ${lastError?.message || 'Unknown error'}`,
    { cause: lastError, attempts: maxAttempts, elapsed, context: { traceId } }
  ));
}

// ============================================================================
// TIMEOUT
// ============================================================================

/**
 * Wrap an operation with a timeout.
 *
 * @param operation - The async operation
 * @param timeoutMs - Maximum time to wait (ms)
 * @returns Result containing the value or timeout error
 *
 * @example
 * ```typescript
 * const result = await withTimeout(() => slowOperation(), 5000);
 * if (isErr(result) && result.error.code === 'TIMEOUT') {
 *   console.log('Operation timed out');
 * }
 * ```
 */
export async function withTimeout<T>(
  operation: () => T | Promise<T>,
  timeoutMs: number
): Promise<Result<T, RecoveryError>> {
  // VALIDATION
  validateOperation<T>(operation, 'withTimeout');
  const safeTimeout = sanitizeDelay(timeoutMs);

  const startTime = Date.now();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${safeTimeout}ms`));
    }, safeTimeout);
  });

  try {
    const value = await Promise.race([
      Promise.resolve(operation()),
      timeoutPromise,
    ]);
    return Ok(value);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const isTimeout = elapsed >= safeTimeout - TIMEOUT_TOLERANCE_MS;

    if (isTimeout) {
      return Err(createRecoveryError(
        RecoveryErrorCode.TIMEOUT,
        `Operation exceeded ${safeTimeout}ms timeout. Consider increasing timeout or optimizing the operation.`,
        { elapsed, attempts: 1 }
      ));
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return Err(createRecoveryError(
      RecoveryErrorCode.UNKNOWN,
      `Operation failed: ${errorMessage}`,
      { cause: error instanceof Error ? error : undefined, elapsed, attempts: 1 }
    ));
  }
}

// ============================================================================
// FALLBACK
// ============================================================================

/**
 * Execute an operation with a fallback if it fails.
 *
 * @param operation - The primary operation
 * @param fallback - The fallback operation or value
 * @returns Result containing either the primary or fallback value
 *
 * @example
 * ```typescript
 * // With fallback function
 * const result = await withFallback(
 *   () => fetchFromApi(),
 *   () => fetchFromCache()
 * );
 *
 * // With fallback value
 * const result = await withFallback(
 *   () => fetchConfig(),
 *   { defaultValue: true }
 * );
 * ```
 */
export async function withFallback<T>(
  operation: () => T | Promise<T>,
  fallback: (() => T | Promise<T>) | T
): Promise<Result<T, RecoveryError>> {
  // VALIDATION
  validateOperation<T>(operation, 'withFallback');
  // Note: fallback can be a value or function, so we only validate operation

  const startTime = Date.now();

  try {
    const value = await operation();
    return Ok(value);
  } catch (primaryError) {
    try {
      const fallbackValue = typeof fallback === 'function'
        ? await (fallback as () => T | Promise<T>)()
        : fallback;
      return Ok(fallbackValue);
    } catch (fallbackError) {
      return Err(createRecoveryError(
        RecoveryErrorCode.FALLBACK_FAILED,
        'Both primary and fallback operations failed',
        {
          cause: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
          elapsed: Date.now() - startTime,
          attempts: 2,
          context: {
            primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
          },
        }
      ));
    }
  }
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  lastFailure: number;
  openedAt: number | null;
}

interface CircuitBreakerOptions {
  /** Failures before opening */
  threshold?: number;
  /** Time before trying again (ms) */
  resetTimeout?: number;
  /** Successes needed to close from half-open */
  successThreshold?: number;
  /** Called when state changes */
  onStateChange?: (state: 'closed' | 'open' | 'half-open') => void;
}

/**
 * Create a circuit breaker wrapper for an operation.
 *
 * @param options - Circuit breaker configuration
 * @returns A function that wraps operations with circuit breaker logic
 *
 * @example
 * ```typescript
 * const breaker = withCircuitBreaker({
 *   threshold: 5,
 *   resetTimeout: 30000,
 * });
 *
 * const result = await breaker(() => callExternalService());
 * ```
 */
export function withCircuitBreaker(
  options: CircuitBreakerOptions = {}
): <T>(operation: () => T | Promise<T>) => Promise<Result<T, RecoveryError>> {
  const {
    threshold = DEFAULTS.CIRCUIT_THRESHOLD,
    resetTimeout = DEFAULTS.CIRCUIT_RESET_MS,
    successThreshold = DEFAULTS.CIRCUIT_SUCCESS_THRESHOLD,
    onStateChange,
  } = options;

  const state: CircuitBreakerState = {
    state: 'closed',
    failures: 0,
    successes: 0,
    lastFailure: 0,
    openedAt: null,
  };

  const transition = (newState: 'closed' | 'open' | 'half-open') => {
    if (state.state !== newState) {
      state.state = newState;
      onStateChange?.(newState);
    }
  };

  return async function <T>(
    operation: () => T | Promise<T>
  ): Promise<Result<T, RecoveryError>> {
    const startTime = Date.now();

    // Check if circuit is open
    if (state.state === 'open') {
      const timeSinceOpen = Date.now() - (state.openedAt || 0);
      if (timeSinceOpen < resetTimeout) {
        return Err(createRecoveryError(
          RecoveryErrorCode.CIRCUIT_OPEN,
          `Circuit breaker is open. Try again in ${Math.ceil((resetTimeout - timeSinceOpen) / 1000)}s`,
          { elapsed: Date.now() - startTime, attempts: 0 }
        ));
      }
      // Transition to half-open
      transition('half-open');
      state.successes = 0;
    }

    try {
      const value = await operation();

      // Record success
      if (state.state === 'half-open') {
        state.successes++;
        if (state.successes >= successThreshold) {
          transition('closed');
          state.failures = 0;
        }
      } else {
        state.failures = 0;
      }

      return Ok(value);
    } catch (error) {
      state.failures++;
      state.lastFailure = Date.now();

      // Open circuit if threshold exceeded
      if (state.failures >= threshold) {
        transition('open');
        state.openedAt = Date.now();
      }

      // If half-open, go back to open
      if (state.state === 'half-open') {
        transition('open');
        state.openedAt = Date.now();
      }

      return Err(createRecoveryError(
        RecoveryErrorCode.UNKNOWN,
        error instanceof Error ? error.message : 'Unknown error',
        {
          cause: error instanceof Error ? error : undefined,
          elapsed: Date.now() - startTime,
          attempts: 1,
          context: { circuitState: state.state, failures: state.failures },
        }
      ));
    }
  };
}

// ============================================================================
// COMPOSITION HELPERS
// ============================================================================

/**
 * Compose multiple recovery primitives together.
 *
 * @param operation - The base operation
 * @param wrappers - Array of wrapper functions to apply
 * @returns The composed operation result
 *
 * @example
 * ```typescript
 * const result = await compose(
 *   () => fetch('/api'),
 *   (op) => withTimeout(op, 5000),
 *   (op) => withRetry(op, { maxAttempts: 3 }),
 * );
 * ```
 */
export async function compose<T>(
  operation: () => T | Promise<T>,
  ...wrappers: Array<(op: () => Promise<T>) => Promise<Result<T, RecoveryError>>>
): Promise<Result<T, RecoveryError>> {
  let currentOp: () => Promise<T> = () => Promise.resolve(operation()).then(v => v);

  for (const wrapper of wrappers.reverse()) {
    const prevOp = currentOp;
    currentOp = async () => {
      const result = await wrapper(prevOp);
      if (isOk(result)) {
        return result.value;
      }
      throw new Error(result.error.message);
    };
  }

  try {
    const value = await currentOp();
    return Ok(value);
  } catch (error) {
    return Err(createRecoveryError(
      RecoveryErrorCode.UNKNOWN,
      error instanceof Error ? error.message : 'Unknown error',
      { cause: error instanceof Error ? error : undefined, elapsed: 0, attempts: 1 }
    ));
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Sleep for a specified duration, respecting abort signals.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Aborted'));
    }, { once: true });
  });
}
