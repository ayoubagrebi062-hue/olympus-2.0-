/**
 * Type Definitions for Self-Healing SDK
 *
 * Features:
 * - Branded types for compile-time safety
 * - Discriminated unions for exhaustive matching
 * - Strict error codes (not just strings)
 */

import type { Result } from './result';

// ============================================================================
// BRANDED TYPES (Compile-time safety)
// ============================================================================

/**
 * A branded type is a type that has a unique symbol attached,
 * preventing accidental mixing of different ID types.
 */
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

/** Unique identifier for a recovery attempt */
export type RecoveryId = Brand<string, 'RecoveryId'>;

/** Unique identifier for a strategy */
export type StrategyId = Brand<string, 'StrategyId'>;

/** Milliseconds (for explicit time units) */
export type Milliseconds = Brand<number, 'Milliseconds'>;

/** Factory functions for branded types */
export const RecoveryId = (id: string): RecoveryId => id as RecoveryId;
export const StrategyId = (id: string): StrategyId => id as StrategyId;
export const Milliseconds = (ms: number): Milliseconds => ms as Milliseconds;

// ============================================================================
// ERROR CODES (Exhaustive, not just strings)
// ============================================================================

/**
 * All possible error codes from the recovery system.
 * Using a const object + typeof pattern for exhaustive checking.
 */
export const RecoveryErrorCode = {
  /** Operation timed out */
  TIMEOUT: 'TIMEOUT',
  /** Maximum retry attempts exceeded */
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED',
  /** Circuit breaker is open */
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  /** Fallback also failed */
  FALLBACK_FAILED: 'FALLBACK_FAILED',
  /** Operation was cancelled */
  CANCELLED: 'CANCELLED',
  /** Invalid configuration */
  INVALID_CONFIG: 'INVALID_CONFIG',
  /** Unknown error */
  UNKNOWN: 'UNKNOWN',
} as const;

export type RecoveryErrorCode = (typeof RecoveryErrorCode)[keyof typeof RecoveryErrorCode];

/**
 * Structured error type with full context.
 * This is what gets returned in Err results.
 */
export interface RecoveryError {
  /** The error code (for programmatic handling) */
  readonly code: RecoveryErrorCode;
  /** Human-readable message */
  readonly message: string;
  /** The original error that caused this (if any) */
  readonly cause?: Error;
  /** Number of attempts made before failing */
  readonly attempts: number;
  /** Total time spent trying (ms) */
  readonly elapsed: Milliseconds;
  /** Additional context */
  readonly context?: Record<string, unknown>;
}

/**
 * Factory for creating RecoveryError instances
 */
export function createRecoveryError(
  code: RecoveryErrorCode,
  message: string,
  options: {
    cause?: Error;
    attempts?: number;
    elapsed?: number;
    context?: Record<string, unknown>;
  } = {}
): RecoveryError {
  return {
    code,
    message,
    cause: options.cause,
    attempts: options.attempts ?? 0,
    elapsed: Milliseconds(options.elapsed ?? 0),
    context: options.context,
  };
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Retry strategy configuration.
 * Supports multiple patterns with full type safety.
 */
export type RetryStrategy =
  | { readonly type: 'immediate'; readonly maxAttempts: number }
  | { readonly type: 'fixed-delay'; readonly maxAttempts: number; readonly delay: Milliseconds }
  | {
      readonly type: 'exponential-backoff';
      readonly maxAttempts: number;
      readonly baseDelay: Milliseconds;
      readonly maxDelay: Milliseconds;
      readonly jitter: boolean;
    }
  | {
      readonly type: 'linear-backoff';
      readonly maxAttempts: number;
      readonly initialDelay: Milliseconds;
      readonly increment: Milliseconds;
    }
  | {
      readonly type: 'custom';
      readonly maxAttempts: number;
      readonly getDelay: (attempt: number) => Milliseconds;
    };

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  readonly threshold: number;
  /** Time to wait before trying again (half-open state) */
  readonly resetTimeout: Milliseconds;
  /** Number of successes in half-open to close circuit */
  readonly successThreshold?: number;
}

/**
 * Full configuration for SelfHealing
 */
export interface SelfHealingConfig<T> {
  /** Retry strategy */
  readonly retry?: RetryStrategy;
  /** Circuit breaker settings */
  readonly circuitBreaker?: CircuitBreakerConfig;
  /** Overall timeout for the operation */
  readonly timeout?: Milliseconds;
  /** Fallback function if all retries fail */
  readonly fallback?: () => T | Promise<T>;
  /** Called before each retry attempt */
  readonly onRetry?: (attempt: number, error: Error, delay: Milliseconds) => void;
  /** Called when circuit breaker state changes */
  readonly onCircuitStateChange?: (state: CircuitState) => void;
  /** Should this error trigger a retry? Default: all errors */
  readonly shouldRetry?: (error: Error) => boolean;
  /** Abort signal for cancellation */
  readonly signal?: AbortSignal;
}

// ============================================================================
// STATE TYPES
// ============================================================================

/**
 * Circuit breaker states (discriminated union)
 */
export type CircuitState =
  | { readonly state: 'closed'; readonly failures: number }
  | { readonly state: 'open'; readonly openedAt: number; readonly failures: number }
  | { readonly state: 'half-open'; readonly testAttempts: number };

/**
 * The result of a recovery operation
 */
export type RecoveryResult<T> = Result<
  {
    /** The successful value */
    readonly value: T;
    /** Number of attempts it took */
    readonly attempts: number;
    /** Total time elapsed (ms) */
    readonly elapsed: Milliseconds;
    /** Was this from the fallback? */
    readonly fromFallback: boolean;
  },
  RecoveryError
>;

// ============================================================================
// CALLBACK TYPES
// ============================================================================

/**
 * The operation to be executed with recovery
 */
export type Operation<T> = () => T | Promise<T>;

/**
 * Event types emitted during recovery
 */
export type RecoveryEvent =
  | { type: 'attempt_start'; attempt: number; timestamp: number }
  | { type: 'attempt_success'; attempt: number; elapsed: Milliseconds; timestamp: number }
  | { type: 'attempt_failure'; attempt: number; error: Error; timestamp: number }
  | { type: 'retry_scheduled'; attempt: number; delay: Milliseconds; timestamp: number }
  | { type: 'fallback_start'; timestamp: number }
  | { type: 'fallback_success'; elapsed: Milliseconds; timestamp: number }
  | { type: 'fallback_failure'; error: Error; timestamp: number }
  | { type: 'circuit_state_change'; from: CircuitState; to: CircuitState; timestamp: number }
  | { type: 'timeout'; elapsed: Milliseconds; timestamp: number }
  | { type: 'cancelled'; timestamp: number };

export type RecoveryEventHandler = (event: RecoveryEvent) => void;

// ============================================================================
// BUILDER TYPES
// ============================================================================

/**
 * Fluent builder interface for SelfHealing configuration.
 * Each method returns `this` for chaining.
 */
export interface SelfHealingBuilder<T> {
  /** Set operation name for metrics labeling */
  withName(name: string): this;

  /** Configure retry strategy */
  withRetry(strategy: RetryStrategy): this;

  /** Configure with named preset */
  withStrategy(
    name: 'none' | 'immediate' | 'fixed' | 'exponential' | 'aggressive',
    options?: Partial<{ maxAttempts: number; baseDelay: number; maxDelay: number }>
  ): this;

  /** Add circuit breaker */
  withCircuitBreaker(config: CircuitBreakerConfig): this;

  /** Set timeout */
  withTimeout(ms: number): this;

  /** Set fallback */
  withFallback(fn: () => T | Promise<T>): this;

  /** Add retry callback */
  onRetry(fn: (attempt: number, error: Error, delay: Milliseconds) => void): this;

  /** Add event listener */
  onEvent(fn: RecoveryEventHandler): this;

  /** Custom retry condition */
  retryIf(fn: (error: Error) => boolean): this;

  /** Build the executor */
  build(): SelfHealingExecutor<T>;
}

/**
 * The built executor that runs operations with recovery
 */
export interface SelfHealingExecutor<T> {
  /** Execute an operation with the configured recovery settings */
  execute(operation: Operation<T>): Promise<RecoveryResult<T>>;

  /** Get current circuit breaker state */
  getCircuitState(): CircuitState | null;

  /** Manually reset circuit breaker */
  resetCircuit(): void;

  /** Get execution statistics */
  getStats(): ExecutionStats;
}

/**
 * Statistics about executions (public interface is readonly)
 */
export interface ExecutionStats {
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly totalRetries: number;
  readonly fallbacksUsed: number;
  readonly averageAttempts: number;
  readonly averageElapsed: Milliseconds;
  readonly circuitOpens: number;
}

/**
 * Mutable version for internal use
 * @internal
 */
export interface MutableExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalRetries: number;
  fallbacksUsed: number;
  averageAttempts: number;
  averageElapsed: Milliseconds;
  circuitOpens: number;
}

/**
 * Mutable circuit state for internal use
 * @internal
 */
export type MutableCircuitState =
  | { state: 'closed'; failures: number }
  | { state: 'open'; openedAt: number; failures: number }
  | { state: 'half-open'; testAttempts: number };
