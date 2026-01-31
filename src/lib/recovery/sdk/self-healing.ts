/**
 * SelfHealing - World-Class Recovery SDK
 *
 * A fluent, type-safe API for building resilient operations.
 *
 * @example
 * ```typescript
 * // Quick start
 * const result = await SelfHealing.execute(() => fetchData());
 *
 * // Full configuration
 * const resilient = SelfHealing.create<UserData>()
 *   .withStrategy('exponential')
 *   .withCircuitBreaker({ threshold: 5, resetTimeout: 30000 })
 *   .withTimeout(10000)
 *   .withFallback(() => getCachedUser())
 *   .onRetry((attempt, error) => {
 *     console.log(`Retry ${attempt}: ${error.message}`);
 *   })
 *   .build();
 *
 * const result = await resilient.execute(() => fetchUserFromApi());
 *
 * if (result.ok) {
 *   console.log(`Got ${result.value.value.name} in ${result.value.elapsed}ms`);
 * } else {
 *   console.error(`Failed: ${result.error.code}`);
 * }
 * ```
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { Result, Ok, Err, isOk } from './result';
import {
  type SelfHealingConfig,
  type SelfHealingBuilder,
  type SelfHealingExecutor,
  type RetryStrategy,
  type CircuitBreakerConfig,
  type CircuitState,
  type MutableCircuitState,
  type RecoveryResult,
  type RecoveryError,
  type RecoveryEvent,
  type RecoveryEventHandler,
  type ExecutionStats,
  type MutableExecutionStats,
  type Operation,
  type Milliseconds,
  RecoveryErrorCode,
  createRecoveryError,
  Milliseconds as ms,
} from './types';
import { metrics, getOperationName, generateTraceId } from './metrics';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default configuration values */
const DEFAULTS = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 30000,
  AGGRESSIVE_BASE_DELAY_MS: 500,
  AGGRESSIVE_MAX_DELAY_MS: 60000,
  AGGRESSIVE_MIN_ATTEMPTS: 5,
  CIRCUIT_SUCCESS_THRESHOLD: 2,
} as const;

/**
 * Jitter prevents thundering herd by adding ±25% variance.
 * If 1000 clients retry at exactly 1000ms, they'll all hit at once.
 * With jitter, they spread across 750ms-1250ms.
 */
const JITTER = {
  MIN_FACTOR: 0.75,
  RANGE: 0.5,
} as const;

/** Safety limits */
const LIMITS = {
  MAX_DELAY_MS: 5 * 60 * 1000, // 5 minutes
  MAX_ERROR_LENGTH: 10000,
} as const;

// ============================================================================
// INPUT VALIDATION
// ============================================================================

function validateOperation<T>(operation: unknown): asserts operation is Operation<T> {
  if (operation === null || operation === undefined) {
    throw new TypeError(
      `SelfHealing.execute: operation cannot be ${operation}. ` +
        `Expected a function that returns T or Promise<T>.`
    );
  }
  if (typeof operation !== 'function') {
    throw new TypeError(
      `SelfHealing.execute: operation must be a function. Got ${typeof operation}.`
    );
  }
}

function sanitizeDelay(delay: number, defaultValue: number): number {
  if (typeof delay !== 'number' || isNaN(delay) || delay < 0 || !isFinite(delay)) {
    return defaultValue;
  }
  return Math.min(delay, LIMITS.MAX_DELAY_MS);
}

function truncateMessage(message: string): string {
  if (message.length <= LIMITS.MAX_ERROR_LENGTH) return message;
  return message.slice(0, LIMITS.MAX_ERROR_LENGTH) + `... [truncated]`;
}

// ============================================================================
// SELF HEALING CLASS
// ============================================================================

/**
 * Entry point for the Self-Healing SDK.
 *
 * Use `SelfHealing.create()` for the builder pattern,
 * or `SelfHealing.execute()` for quick one-off operations.
 */
export class SelfHealing {
  private constructor() {
    // Private constructor - use static methods
  }

  /**
   * Create a new SelfHealing builder with full configuration options.
   *
   * @returns A builder for configuring recovery behavior
   *
   * @example
   * ```typescript
   * const executor = SelfHealing.create<ApiResponse>()
   *   .withStrategy('exponential')
   *   .withTimeout(5000)
   *   .build();
   * ```
   */
  static create<T>(): SelfHealingBuilder<T> {
    return new SelfHealingBuilderImpl<T>();
  }

  /**
   * Execute an operation with default retry settings.
   * Convenience method for simple use cases.
   *
   * @param operation - The operation to execute
   * @param options - Optional configuration overrides
   * @returns The result of the operation
   *
   * @example
   * ```typescript
   * const result = await SelfHealing.execute(() => fetch('/api'));
   * ```
   */
  static async execute<T>(
    operation: Operation<T>,
    options: {
      maxAttempts?: number;
      timeout?: number;
      fallback?: () => T | Promise<T>;
    } = {}
  ): Promise<RecoveryResult<T>> {
    const builder = new SelfHealingBuilderImpl<T>().withStrategy('exponential', {
      maxAttempts: options.maxAttempts ?? 3,
    });

    if (options.timeout) {
      builder.withTimeout(options.timeout);
    }

    if (options.fallback) {
      builder.withFallback(options.fallback);
    }

    return builder.build().execute(operation);
  }
}

// ============================================================================
// BUILDER IMPLEMENTATION
// ============================================================================

class SelfHealingBuilderImpl<T> implements SelfHealingBuilder<T> {
  private config: SelfHealingConfig<T> = {};
  private eventHandlers: RecoveryEventHandler[] = [];
  private operationName = 'anonymous';

  /** Set operation name for metrics labeling */
  withName(name: string): this {
    this.operationName = name;
    return this;
  }

  withRetry(strategy: RetryStrategy): this {
    this.config = { ...this.config, retry: strategy };
    return this;
  }

  withStrategy(
    name: 'none' | 'immediate' | 'fixed' | 'exponential' | 'aggressive',
    options: { maxAttempts?: number; baseDelay?: number; maxDelay?: number } = {}
  ): this {
    const {
      maxAttempts = DEFAULTS.MAX_ATTEMPTS,
      baseDelay = DEFAULTS.BASE_DELAY_MS,
      maxDelay = DEFAULTS.MAX_DELAY_MS,
    } = options;

    const strategies: Record<string, RetryStrategy> = {
      none: { type: 'immediate', maxAttempts: 1 },
      immediate: { type: 'immediate', maxAttempts },
      fixed: { type: 'fixed-delay', maxAttempts, delay: ms(baseDelay) },
      exponential: {
        type: 'exponential-backoff',
        maxAttempts,
        baseDelay: ms(baseDelay),
        maxDelay: ms(maxDelay),
        jitter: true,
      },
      aggressive: {
        type: 'exponential-backoff',
        maxAttempts: Math.max(maxAttempts, DEFAULTS.AGGRESSIVE_MIN_ATTEMPTS),
        baseDelay: ms(DEFAULTS.AGGRESSIVE_BASE_DELAY_MS),
        maxDelay: ms(DEFAULTS.AGGRESSIVE_MAX_DELAY_MS),
        jitter: true,
      },
    };

    this.config = { ...this.config, retry: strategies[name] };
    return this;
  }

  withCircuitBreaker(config: CircuitBreakerConfig): this {
    this.config = { ...this.config, circuitBreaker: config };
    return this;
  }

  withTimeout(milliseconds: number): this {
    this.config = { ...this.config, timeout: ms(milliseconds) };
    return this;
  }

  withFallback(fn: () => T | Promise<T>): this {
    this.config = { ...this.config, fallback: fn };
    return this;
  }

  onRetry(fn: (attempt: number, error: Error, delay: Milliseconds) => void): this {
    this.config = { ...this.config, onRetry: fn };
    return this;
  }

  onEvent(fn: RecoveryEventHandler): this {
    this.eventHandlers.push(fn);
    return this;
  }

  retryIf(fn: (error: Error) => boolean): this {
    this.config = { ...this.config, shouldRetry: fn };
    return this;
  }

  build(): SelfHealingExecutor<T> {
    return new SelfHealingExecutorImpl<T>(this.config, this.eventHandlers, this.operationName);
  }
}

// ============================================================================
// EXECUTOR IMPLEMENTATION
// ============================================================================

class SelfHealingExecutorImpl<T> implements SelfHealingExecutor<T> {
  private config: SelfHealingConfig<T>;
  private eventHandlers: RecoveryEventHandler[];
  private operationName: string;
  private circuitState: MutableCircuitState = { state: 'closed', failures: 0 };
  private stats: MutableExecutionStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalRetries: 0,
    fallbacksUsed: 0,
    averageAttempts: 0,
    averageElapsed: ms(0),
    circuitOpens: 0,
  };

  /**
   * RACE CONDITION FIX: Only one request can test the half-open circuit at a time.
   * Other requests get rejected while test is in progress.
   */
  private halfOpenTestInProgress = false;

  constructor(
    config: SelfHealingConfig<T>,
    eventHandlers: RecoveryEventHandler[],
    operationName: string
  ) {
    this.config = config;
    this.eventHandlers = eventHandlers;
    this.operationName = operationName;
  }

  async execute(operation: Operation<T>): Promise<RecoveryResult<T>> {
    // VALIDATION: Fail fast with helpful message
    validateOperation<T>(operation);

    const startTime = Date.now();
    const traceId = generateTraceId(); // Correlation ID for this execution
    this.stats.totalExecutions++;

    // Check circuit breaker
    const circuitStatus = this.isCircuitOpen();
    if (circuitStatus === true) {
      return this.handleCircuitOpen(startTime, operation, traceId);
    }
    if (circuitStatus === 'half-open-testing') {
      // RACE CONDITION FIX: Another request is testing the circuit
      // Reject with a specific error instead of letting all requests through
      return Err(
        createRecoveryError(
          RecoveryErrorCode.CIRCUIT_OPEN,
          `Circuit breaker testing in progress [trace: ${traceId}]. Please retry.`,
          {
            elapsed: Date.now() - startTime,
            attempts: 0,
            context: { traceId, halfOpenTesting: true },
          }
        )
      );
    }

    // Get retry configuration
    const retry = this.config.retry ?? { type: 'immediate' as const, maxAttempts: 1 };
    const maxAttempts = retry.maxAttempts;

    let lastError: Error | undefined;
    let attempt = 0;

    // Main retry loop
    for (attempt = 1; attempt <= maxAttempts; attempt++) {
      // Check for cancellation
      if (this.config.signal?.aborted) {
        return this.createError(
          RecoveryErrorCode.CANCELLED,
          'Operation cancelled',
          startTime,
          attempt - 1
        );
      }

      // Emit attempt start event
      this.emit({ type: 'attempt_start', attempt, timestamp: Date.now() });

      try {
        // Execute with optional timeout
        const value = await this.executeWithTimeout(operation);

        // Success!
        const elapsed = Date.now() - startTime;
        this.recordSuccess();
        this.emit({
          type: 'attempt_success',
          attempt,
          elapsed: ms(elapsed),
          timestamp: Date.now(),
        });

        // METRICS: Emit success
        const opName = this.getOperationName(operation);
        metrics.emitSuccess({
          operation: opName,
          attempts: attempt,
          elapsed,
          fromFallback: false,
          labels: { operation: opName, fallback: 'false', trace_id: traceId },
          timestamp: Date.now(),
          traceId,
        });

        this.updateStats(true, attempt, elapsed, false);

        return Ok({
          value,
          attempts: attempt,
          elapsed: ms(elapsed),
          fromFallback: false,
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Truncate to prevent memory issues with huge error messages
        lastError.message = truncateMessage(lastError.message);

        this.emit({
          type: 'attempt_failure',
          attempt,
          error: lastError,
          timestamp: Date.now(),
        });

        // Check if we should retry this error
        if (this.config.shouldRetry && !this.config.shouldRetry(lastError)) {
          break;
        }

        // Record failure for circuit breaker
        this.recordFailure();

        // If not last attempt, wait before retry
        if (attempt < maxAttempts) {
          const delay = this.calculateDelay(retry, attempt);
          this.config.onRetry?.(attempt, lastError, delay);
          this.stats.totalRetries++;

          this.emit({
            type: 'retry_scheduled',
            attempt,
            delay,
            timestamp: Date.now(),
          });

          // METRICS: Emit retry
          metrics.emitRetry({
            operation: this.getOperationName(operation),
            attempt,
            delay: delay as number,
            error: lastError,
            labels: { operation: this.getOperationName(operation), trace_id: traceId },
            timestamp: Date.now(),
            traceId,
          });

          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted - try fallback
    if (this.config.fallback) {
      return this.executeFallback(startTime, attempt, lastError, operation, traceId);
    }

    // No fallback - return error
    const elapsed = Date.now() - startTime;
    this.updateStats(false, attempt, elapsed, false);

    // METRICS: Emit failure
    metrics.emitFailure({
      operation: this.getOperationName(operation),
      attempts: attempt,
      elapsed,
      errorCode: RecoveryErrorCode.MAX_RETRIES_EXCEEDED,
      errorMessage: lastError?.message || 'Unknown error',
      labels: {
        operation: this.getOperationName(operation),
        error_code: RecoveryErrorCode.MAX_RETRIES_EXCEEDED,
        trace_id: traceId,
      },
      timestamp: Date.now(),
      traceId,
    });

    return this.createError(
      RecoveryErrorCode.MAX_RETRIES_EXCEEDED,
      `Failed after ${attempt} attempts [trace: ${traceId}]: ${lastError?.message}`,
      startTime,
      attempt,
      lastError,
      { traceId }
    );
  }

  getCircuitState(): CircuitState | null {
    if (!this.config.circuitBreaker) return null;
    return { ...this.circuitState };
  }

  resetCircuit(): void {
    const oldState = this.circuitState;
    this.circuitState = { state: 'closed', failures: 0 };
    // RACE CONDITION FIX: Also release lock on manual reset
    this.halfOpenTestInProgress = false;

    this.emit({
      type: 'circuit_state_change',
      from: oldState,
      to: this.circuitState,
      timestamp: Date.now(),
    });
  }

  getStats(): ExecutionStats {
    return { ...this.stats };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /** Wrap operation with timeout if configured, otherwise execute directly */
  private async executeWithTimeout(operation: Operation<T>): Promise<T> {
    if (!this.config.timeout) {
      return operation();
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.emit({ type: 'timeout', elapsed: this.config.timeout!, timestamp: Date.now() });
        reject(new Error(`Timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      Promise.resolve(operation())
        .then(value => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async executeFallback(
    startTime: number,
    attempts: number,
    lastError?: Error,
    operation?: Operation<T>,
    traceId?: string
  ): Promise<RecoveryResult<T>> {
    this.emit({ type: 'fallback_start', timestamp: Date.now() });
    const opName = operation ? this.getOperationName(operation) : this.operationName;

    try {
      const value = await this.config.fallback!();
      const elapsed = Date.now() - startTime;
      this.stats.fallbacksUsed++;

      this.emit({
        type: 'fallback_success',
        elapsed: ms(elapsed),
        timestamp: Date.now(),
      });

      // METRICS: Emit success from fallback
      metrics.emitSuccess({
        operation: opName,
        attempts,
        elapsed,
        fromFallback: true,
        labels: { operation: opName, fallback: 'true', trace_id: traceId },
        timestamp: Date.now(),
        traceId,
      });

      this.updateStats(true, attempts, elapsed, true);

      return Ok({
        value,
        attempts,
        elapsed: ms(elapsed),
        fromFallback: true,
      });
    } catch (fallbackError) {
      const elapsed = Date.now() - startTime;
      this.emit({
        type: 'fallback_failure',
        error: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
        timestamp: Date.now(),
      });

      // METRICS: Emit failure (fallback also failed)
      metrics.emitFailure({
        operation: opName,
        attempts,
        elapsed,
        errorCode: RecoveryErrorCode.FALLBACK_FAILED,
        errorMessage: 'Both operation and fallback failed',
        labels: {
          operation: opName,
          error_code: RecoveryErrorCode.FALLBACK_FAILED,
          trace_id: traceId,
        },
        timestamp: Date.now(),
        traceId,
      });

      this.updateStats(false, attempts, elapsed, false);

      return this.createError(
        RecoveryErrorCode.FALLBACK_FAILED,
        `Both operation and fallback failed [trace: ${traceId}]`,
        startTime,
        attempts,
        lastError,
        {
          fallbackError:
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          traceId,
        }
      );
    }
  }

  /**
   * Check if circuit breaker is open and should block execution.
   * Also handles transition from open → half-open when reset timeout expires.
   *
   * RACE CONDITION FIX: Returns 'half-open-testing' when another request is
   * already testing the circuit. Caller should wait or reject.
   */
  private isCircuitOpen(): boolean | 'half-open-testing' {
    if (!this.config.circuitBreaker) return false;

    // If half-open test is in progress, don't allow more requests
    if (this.circuitState.state === 'half-open' && this.halfOpenTestInProgress) {
      return 'half-open-testing';
    }

    if (this.circuitState.state === 'open') {
      const openedAt = (this.circuitState as { state: 'open'; openedAt: number }).openedAt;
      const elapsed = Date.now() - openedAt;

      if (elapsed >= this.config.circuitBreaker.resetTimeout) {
        // RACE CONDITION FIX: Acquire lock before transitioning to half-open
        if (this.halfOpenTestInProgress) {
          return 'half-open-testing'; // Another request beat us
        }
        this.halfOpenTestInProgress = true;

        // Transition to half-open
        this.transitionCircuit({ state: 'half-open', testAttempts: 0 });
        return false;
      }

      return true;
    }

    return false;
  }

  private handleCircuitOpen(
    startTime: number,
    operation?: Operation<T>,
    traceId?: string
  ): RecoveryResult<T> {
    const openState = this.circuitState as { state: 'open'; openedAt: number; failures: number };
    const resetTimeout = this.config.circuitBreaker!.resetTimeout;
    const remaining = Math.ceil((resetTimeout - (Date.now() - openState.openedAt)) / 1000);
    const opName = operation ? this.getOperationName(operation) : this.operationName;

    // METRICS: Emit failure due to circuit open
    metrics.emitFailure({
      operation: opName,
      attempts: 0,
      elapsed: Date.now() - startTime,
      errorCode: RecoveryErrorCode.CIRCUIT_OPEN,
      errorMessage: `Circuit breaker open. Retry in ${remaining}s`,
      labels: { operation: opName, error_code: RecoveryErrorCode.CIRCUIT_OPEN, trace_id: traceId },
      timestamp: Date.now(),
      traceId,
    });

    return Err(
      createRecoveryError(
        RecoveryErrorCode.CIRCUIT_OPEN,
        `Circuit breaker open [trace: ${traceId}]. Retry in ${remaining}s`,
        {
          elapsed: Date.now() - startTime,
          attempts: 0,
          context: {
            failures: openState.failures,
            resetIn: remaining,
            traceId,
          },
        }
      )
    );
  }

  private recordSuccess(): void {
    if (!this.config.circuitBreaker) return;

    if (this.circuitState.state === 'half-open') {
      const halfOpen = this.circuitState as { state: 'half-open'; testAttempts: number };
      halfOpen.testAttempts++;

      if (
        halfOpen.testAttempts >=
        (this.config.circuitBreaker.successThreshold ?? DEFAULTS.CIRCUIT_SUCCESS_THRESHOLD)
      ) {
        // RACE CONDITION FIX: Release the lock when test succeeds
        this.halfOpenTestInProgress = false;
        this.transitionCircuit({ state: 'closed', failures: 0 });
      }
    } else {
      this.circuitState = { state: 'closed', failures: 0 };
    }
  }

  private recordFailure(): void {
    if (!this.config.circuitBreaker) return;

    if (this.circuitState.state === 'closed') {
      const closed = this.circuitState as { state: 'closed'; failures: number };
      closed.failures++;

      if (closed.failures >= this.config.circuitBreaker.threshold) {
        this.transitionCircuit({ state: 'open', openedAt: Date.now(), failures: closed.failures });
        this.stats.circuitOpens++;
      }
    } else if (this.circuitState.state === 'half-open') {
      // RACE CONDITION FIX: Release the lock when test fails
      this.halfOpenTestInProgress = false;
      // Failed during half-open - go back to open
      // In half-open state, we don't track failures, so use threshold as the count
      this.transitionCircuit({
        state: 'open',
        openedAt: Date.now(),
        failures: this.config.circuitBreaker.threshold,
      });
    }
  }

  private transitionCircuit(newState: MutableCircuitState): void {
    const oldState = this.circuitState;
    this.circuitState = newState;

    this.config.onCircuitStateChange?.(newState);
    this.emit({
      type: 'circuit_state_change',
      from: oldState,
      to: newState,
      timestamp: Date.now(),
    });

    // METRICS: Emit circuit state change
    metrics.emitCircuitStateChange({
      circuit: this.operationName,
      state: newState.state,
      previousState: oldState.state,
      failures: 'failures' in newState ? newState.failures : undefined,
      labels: { circuit: this.operationName },
      timestamp: Date.now(),
    });
  }

  /** Get operation name for metrics, falling back to function name or 'anonymous' */
  private getOperationName(operation: Operation<T>): string {
    // Priority: 1) Builder-configured name, 2) named() wrapper, 3) function name, 4) anonymous
    if (this.operationName !== 'anonymous') {
      return this.operationName;
    }
    return getOperationName(operation);
  }

  /**
   * Calculate delay before next retry attempt based on strategy.
   * Supports: immediate (0ms), fixed, exponential backoff, linear, custom.
   */
  private calculateDelay(retry: RetryStrategy, attempt: number): Milliseconds {
    switch (retry.type) {
      case 'immediate':
        return ms(0);

      case 'fixed-delay':
        return retry.delay;

      case 'exponential-backoff': {
        // Calculate exponential delay: baseDelay * 2^(attempt-1)
        let delayMs = retry.baseDelay * Math.pow(2, attempt - 1);
        delayMs = Math.min(delayMs, retry.maxDelay);

        // Add jitter to prevent thundering herd (±25% variance)
        if (retry.jitter) {
          const jitterFactor = JITTER.MIN_FACTOR + Math.random() * JITTER.RANGE;
          delayMs = delayMs * jitterFactor;
        }
        return ms(Math.floor(delayMs));
      }

      case 'linear-backoff':
        return ms(retry.initialDelay + retry.increment * (attempt - 1));

      case 'custom':
        return retry.getDelay(attempt);
    }
  }

  /**
   * Update execution statistics with running averages.
   * Uses incremental mean formula: newMean = oldMean + (newValue - oldMean) / n
   */
  private updateStats(
    success: boolean,
    attempts: number,
    elapsedMs: number,
    _fromFallback: boolean
  ): void {
    if (success) {
      this.stats.successfulExecutions++;
    } else {
      this.stats.failedExecutions++;
    }

    // Update running averages using incremental mean formula
    const totalExecutions = this.stats.totalExecutions;
    this.stats.averageAttempts =
      (this.stats.averageAttempts * (totalExecutions - 1) + attempts) / totalExecutions;
    this.stats.averageElapsed = ms(
      ((this.stats.averageElapsed as number) * (totalExecutions - 1) + elapsedMs) / totalExecutions
    );
  }

  private createError(
    code: RecoveryErrorCode,
    message: string,
    startTime: number,
    attempts: number,
    cause?: Error,
    context?: Record<string, unknown>
  ): RecoveryResult<T> {
    return Err(
      createRecoveryError(code, message, {
        cause,
        attempts,
        elapsed: Date.now() - startTime,
        context,
      })
    );
  }

  private emit(event: RecoveryEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow errors in event handlers
      }
    }
  }

  private sleep(duration: Milliseconds): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.config.signal?.aborted) {
        reject(new Error('Cancelled'));
        return;
      }

      const timer = setTimeout(resolve, duration as number);

      this.config.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new Error('Cancelled'));
        },
        { once: true }
      );
    });
  }
}
