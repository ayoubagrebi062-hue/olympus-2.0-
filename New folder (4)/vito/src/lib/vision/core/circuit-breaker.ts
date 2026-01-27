/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   CIRCUIT BREAKER - Fail Fast, Recover Gracefully                             ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║   State Machine:                                                              ║
 * ║                                                                               ║
 * ║                 success                                                       ║
 * ║              ┌──────────┐                                                     ║
 * ║              │          │                                                     ║
 * ║              ▼          │                                                     ║
 * ║   ┌────────────────┐    │    ┌────────────────┐    ┌────────────────┐        ║
 * ║   │    CLOSED      │────┴───▶│     OPEN       │───▶│   HALF_OPEN    │        ║
 * ║   │  (normal flow) │ failure │  (instant fail)│ timeout  (test)    │        ║
 * ║   └────────────────┘ threshold└────────────────┘    └───────┬────────┘        ║
 * ║          ▲                                                  │                 ║
 * ║          │                          success                 │                 ║
 * ║          └──────────────────────────────────────────────────┘                 ║
 * ║                                     failure → back to OPEN                    ║
 * ║                                                                               ║
 * ║   Why this matters:                                                           ║
 * ║   - Don't waste API calls on a down service                                  ║
 * ║   - Prevent cascading failures                                               ║
 * ║   - Give services time to recover                                            ║
 * ║   - Automatic recovery when service comes back                               ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { Result, Ok, Err, createError, VisionError, VisionErrorCode, isOk, isErr } from './result';
import { RequestContext } from './context';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** How many failures before opening circuit */
  failureThreshold?: number;

  /** How many successes in HALF_OPEN before closing */
  successThreshold?: number;

  /** How long to wait before trying again (ms) */
  resetTimeoutMs?: number;

  /** Time window to count failures (ms) */
  failureWindowMs?: number;

  /** Should this error count as a failure? */
  isFailure?: (error: VisionError) => boolean;

  /** Called on state transitions */
  onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
}

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveSuccesses: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  openedAt?: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER
// ════════════════════════════════════════════════════════════════════════════════

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: { timestamp: number }[] = [];
  private consecutiveSuccesses = 0;
  private openedAt?: number;
  private stats: CircuitStats;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly failureWindowMs: number;
  private readonly isFailure: (error: VisionError) => boolean;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000; // 30 seconds
    this.failureWindowMs = options.failureWindowMs ?? 60000; // 1 minute
    this.isFailure = options.isFailure ?? defaultIsFailure;
    this.onStateChange = options.onStateChange;

    this.stats = {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      consecutiveSuccesses: 0,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    };
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(
    fn: () => Promise<Result<T, VisionError>>,
    ctx?: RequestContext
  ): Promise<Result<T, VisionError>> {
    this.stats.totalRequests++;

    // Check if circuit allows request
    const allowed = this.allowRequest();
    if (isErr(allowed)) {
      return Err(allowed.error);
    }

    try {
      const result = await fn();

      if (isOk(result)) {
        this.recordSuccess();
      } else {
        const error = result.error;
        if (this.isFailure(error)) {
          this.recordFailure();
        }
      }

      return result;
    } catch (error) {
      // Unexpected throw - record as failure
      this.recordFailure();

      return Err(createError(
        VisionErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error',
        {
          source: this.name,
          cause: error instanceof Error ? error : undefined,
          traceId: ctx?.traceId,
        }
      ));
    }
  }

  /**
   * Check if circuit allows a request (without executing)
   */
  allowRequest(): Result<void, VisionError> {
    this.pruneOldFailures();
    this.checkReset();

    switch (this.state) {
      case 'CLOSED':
        return Ok(undefined);

      case 'OPEN':
        return Err(createError(
          VisionErrorCode.CIRCUIT_OPEN,
          `Circuit breaker "${this.name}" is open - service unavailable`,
          {
            source: this.name,
            retryAfterMs: this.timeUntilReset(),
            context: {
              state: this.state,
              openedAt: this.openedAt,
              resetAt: this.openedAt ? this.openedAt + this.resetTimeoutMs : undefined,
            },
          }
        ));

      case 'HALF_OPEN':
        // Allow limited requests in half-open state
        return Ok(undefined);
    }
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.stats.totalSuccesses++;
    this.stats.successes++;
    this.stats.lastSuccessTime = Date.now();
    this.consecutiveSuccesses++;

    if (this.state === 'HALF_OPEN' && this.consecutiveSuccesses >= this.successThreshold) {
      this.transitionTo('CLOSED');
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(): void {
    this.stats.totalFailures++;
    this.stats.failures++;
    this.stats.lastFailureTime = Date.now();
    this.consecutiveSuccesses = 0;

    this.failures.push({ timestamp: Date.now() });

    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open goes back to open
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      this.pruneOldFailures();
      if (this.failures.length >= this.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.transitionTo('CLOSED');
    this.failures = [];
    this.consecutiveSuccesses = 0;
    this.openedAt = undefined;
  }

  /**
   * Get current state and statistics
   */
  getStats(): CircuitStats {
    return {
      ...this.stats,
      state: this.state,
      failures: this.failures.length,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Is the circuit currently allowing requests?
   */
  isAvailable(): boolean {
    this.pruneOldFailures();
    this.checkReset();
    return this.state !== 'OPEN';
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────────

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;
    this.stats.state = newState;

    if (newState === 'OPEN') {
      this.openedAt = Date.now();
    } else if (newState === 'CLOSED') {
      this.openedAt = undefined;
      this.failures = [];
    }

    this.onStateChange?.(oldState, newState, this.name);
  }

  private checkReset(): void {
    if (this.state === 'OPEN' && this.openedAt) {
      if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
        this.consecutiveSuccesses = 0;
      }
    }
  }

  private pruneOldFailures(): void {
    const cutoff = Date.now() - this.failureWindowMs;
    this.failures = this.failures.filter(f => f.timestamp > cutoff);
  }

  private timeUntilReset(): number {
    if (!this.openedAt) return 0;
    return Math.max(0, this.resetTimeoutMs - (Date.now() - this.openedAt));
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER REGISTRY
// ════════════════════════════════════════════════════════════════════════════════

const breakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker by name
 */
export function getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  let breaker = breakers.get(name);
  if (!breaker) {
    breaker = new CircuitBreaker(name, options);
    breakers.set(name, breaker);
  }
  return breaker;
}

/**
 * Get all circuit breakers and their states
 */
export function getAllCircuitBreakers(): Map<string, CircuitBreaker> {
  return new Map(breakers);
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  for (const breaker of Array.from(breakers.values())) {
    breaker.reset();
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Determines if an error should count toward circuit breaker failure threshold.
 *
 * Client errors (bad input, auth issues) are NOT counted because:
 * - They indicate a problem with the request, not the service
 * - The service is still healthy and accepting other requests
 * - Counting them would open the circuit for unrelated requests
 *
 * Server errors (timeouts, provider issues) ARE counted because:
 * - They indicate the service may be having problems
 * - Continuing to send requests may make things worse
 * - Other requests are likely to fail too
 */
function defaultIsFailure(error: VisionError): boolean {
  switch (error.code) {
    // Client errors - request was bad, service is fine
    case VisionErrorCode.INVALID_REQUEST:
    case VisionErrorCode.INVALID_PROMPT:
    case VisionErrorCode.PROMPT_TOO_LONG:
    case VisionErrorCode.MISSING_API_KEY:
    case VisionErrorCode.INVALID_API_KEY:
    case VisionErrorCode.CONTENT_POLICY_VIOLATION:
    case VisionErrorCode.CANCELLED:
      return false;

    // Server/transient errors - count toward circuit breaker
    default:
      return true;
  }
}

/**
 * Decorator to wrap a function with circuit breaker
 */
export function withCircuitBreaker<T, Args extends unknown[]>(
  name: string,
  fn: (...args: Args) => Promise<Result<T, VisionError>>,
  options?: CircuitBreakerOptions
): (...args: Args) => Promise<Result<T, VisionError>> {
  const breaker = getCircuitBreaker(name, options);

  return async (...args: Args) => {
    return breaker.execute(() => fn(...args));
  };
}
