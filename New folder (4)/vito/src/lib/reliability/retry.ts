/**
 * OLYMPUS 2.1 - 10X UPGRADE: Retry with Exponential Backoff
 *
 * Production-ready retry logic with:
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Configurable retry conditions
 * - Timeout handling
 * - Metrics collection
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay cap in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier (default: 2 for exponential) */
  backoffMultiplier: number;
  /** Add randomness to prevent thundering herd */
  jitter: boolean;
  /** Timeout for each attempt in milliseconds */
  timeoutMs?: number;
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Called before each retry */
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Default retryable errors: network errors, 5xx, rate limits
 */
function defaultIsRetryable(error: unknown): boolean {
  if (!error) return false;

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // HTTP errors
  if (typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    // Retry 5xx (server errors) and 429 (rate limit)
    return status >= 500 || status === 429;
  }

  // Generic error messages that suggest transient issues
  const message = String(error).toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('temporarily unavailable')
  );
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const baseDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(baseDelay, config.maxDelayMs);

  if (config.jitter) {
    // Add up to 25% jitter to prevent thundering herd
    const jitterFactor = 1 + (Math.random() - 0.5) * 0.5;
    return Math.round(cappedDelay * jitterFactor);
  }

  return cappedDelay;
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation '${operation}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// ============================================================================
// MAIN RETRY FUNCTION
// ============================================================================

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: unknown;
  attempts: number;
  totalDuration: number;
}

/**
 * Execute a function with automatic retry on failure
 *
 * @example
 * const result = await retry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxAttempts: 5, initialDelayMs: 500 }
 * );
 */
export async function retry<T>(
  fn: () => Promise<T>,
  userConfig: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const config: RetryConfig = { ...DEFAULT_CONFIG, ...userConfig };
  const isRetryable = config.isRetryable || defaultIsRetryable;

  const startTime = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      let result: T;

      if (config.timeoutMs) {
        result = await withTimeout(fn(), config.timeoutMs, `attempt ${attempt}`);
      } else {
        result = await fn();
      }

      return {
        success: true,
        result,
        attempts: attempt,
        totalDuration: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = attempt < config.maxAttempts && isRetryable(error);

      if (!shouldRetry) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, config);

      // Notify before retry
      config.onRetry?.(attempt, error, delay);

      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: config.maxAttempts,
    totalDuration: Date.now() - startTime,
  };
}

/**
 * Simpler API that throws on failure
 */
export async function retryOrThrow<T>(
  fn: () => Promise<T>,
  userConfig: Partial<RetryConfig> = {}
): Promise<T> {
  const result = await retry(fn, userConfig);

  if (!result.success) {
    throw result.error;
  }

  return result.result!;
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms to wait before trying again (half-open state) */
  resetTimeout: number;
  /** Number of successes in half-open to fully close */
  successThreshold: number;
}

type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailure: Date | null = null;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 2,
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from open to half-open
    if (this.state === 'open') {
      const timeSinceFailure = Date.now() - (this.lastFailure?.getTime() || 0);
      if (timeSinceFailure >= this.config.resetTimeout) {
        this.state = 'half-open';
        this.successes = 0;
      } else {
        throw new Error(`Circuit breaker '${this.name}' is OPEN. Try again in ${Math.ceil((this.config.resetTimeout - timeSinceFailure) / 1000)}s`);
      }
    }

    try {
      const result = await fn();

      // Success handling
      if (this.state === 'half-open') {
        this.successes++;
        if (this.successes >= this.config.successThreshold) {
          this.state = 'closed';
          this.failures = 0;
        }
      } else {
        this.failures = 0; // Reset failures on success
      }

      return result;
    } catch (error) {
      // Failure handling
      this.failures++;
      this.lastFailure = new Date();

      if (this.state === 'half-open' || this.failures >= this.config.failureThreshold) {
        this.state = 'open';
      }

      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
    };
  }

  reset() {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
  }
}

// ============================================================================
// AGENT EXECUTION HELPER
// ============================================================================

/**
 * Retry configuration optimized for AI agent execution
 */
export const AGENT_RETRY_CONFIG: Partial<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 2000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
  timeoutMs: 120000, // 2 minute timeout per attempt
  isRetryable: (error) => {
    // Always retry rate limits
    const message = String(error).toLowerCase();
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }

    // Retry overloaded errors
    if (message.includes('overloaded') || message.includes('503')) {
      return true;
    }

    // Retry transient network errors
    return defaultIsRetryable(error);
  },
};

export default { retry, retryOrThrow, CircuitBreaker, AGENT_RETRY_CONFIG };
