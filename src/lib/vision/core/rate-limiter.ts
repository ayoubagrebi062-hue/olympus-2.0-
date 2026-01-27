/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   RATE LIMITER - Token Bucket Algorithm                                       ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║   Why Token Bucket?                                                           ║
 * ║   - Allows bursts (user can do 5 quick requests)                             ║
 * ║   - Smooths over time (refills at steady rate)                               ║
 * ║   - Simple to implement and reason about                                      ║
 * ║                                                                               ║
 * ║   Visualization:                                                              ║
 * ║                                                                               ║
 * ║   Bucket (capacity: 10)          Refill: 1 token/second                      ║
 * ║   ┌─────────────────┐            ┌─────────────────┐                         ║
 * ║   │ ● ● ● ● ● ● ●   │  ◀─────────│  + 1 token/sec  │                         ║
 * ║   │ tokens: 7       │            └─────────────────┘                         ║
 * ║   └─────────────────┘                                                        ║
 * ║          │                                                                    ║
 * ║          ▼ request takes 1 token                                             ║
 * ║   ┌─────────────────┐                                                        ║
 * ║   │ ● ● ● ● ● ●     │                                                        ║
 * ║   │ tokens: 6       │                                                        ║
 * ║   └─────────────────┘                                                        ║
 * ║                                                                               ║
 * ║   If bucket empty → REJECT (don't hammer the API)                            ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { Result, Ok, Err, VisionError, VisionErrorCode, createError, isErr } from './result';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface RateLimiterOptions {
  /** Maximum tokens in bucket */
  maxTokens: number;

  /** Tokens added per second */
  refillRate: number;

  /** Tokens consumed per request (default: 1) */
  tokensPerRequest?: number;

  /** Optional name for logging */
  name?: string;
}

export interface RateLimiterStats {
  /** Current tokens available */
  currentTokens: number;

  /** Maximum capacity */
  maxTokens: number;

  /** Tokens per second refill */
  refillRate: number;

  /** Total requests allowed */
  totalAllowed: number;

  /** Total requests rejected */
  totalRejected: number;

  /** Rejection rate (0-1) */
  rejectionRate: number;

  /** Time until next token (ms) */
  msUntilNextToken: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// TOKEN BUCKET RATE LIMITER
// ════════════════════════════════════════════════════════════════════════════════

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private totalAllowed = 0;
  private totalRejected = 0;

  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly tokensPerRequest: number;
  private readonly name: string;

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.maxTokens;
    this.refillRate = options.refillRate;
    this.tokensPerRequest = options.tokensPerRequest ?? 1;
    this.name = options.name ?? 'rate-limiter';

    // Start with full bucket
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Try to acquire tokens for a request.
   * Returns Ok if allowed, Err if rate limited.
   */
  acquire(tokens: number = this.tokensPerRequest): Result<void, VisionError> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      this.totalAllowed++;
      return Ok(undefined);
    }

    this.totalRejected++;

    const msUntilAvailable = this.msUntilTokens(tokens);

    return Err(
      createError(
        VisionErrorCode.RATE_LIMITED,
        `Rate limit exceeded. Try again in ${Math.ceil(msUntilAvailable / 1000)} seconds.`,
        {
          retryable: true,
          retryAfterMs: msUntilAvailable,
          source: this.name,
          context: {
            currentTokens: Math.floor(this.tokens * 100) / 100,
            neededTokens: tokens,
            maxTokens: this.maxTokens,
            refillRate: this.refillRate,
          },
        }
      )
    );
  }

  /**
   * Check if request would be allowed (without consuming tokens)
   */
  canAcquire(tokens: number = this.tokensPerRequest): boolean {
    this.refill();
    return this.tokens >= tokens;
  }

  /**
   * Get current statistics
   */
  getStats(): RateLimiterStats {
    this.refill();

    const total = this.totalAllowed + this.totalRejected;

    return {
      currentTokens: Math.floor(this.tokens * 100) / 100,
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
      totalAllowed: this.totalAllowed,
      totalRejected: this.totalRejected,
      rejectionRate: total > 0 ? this.totalRejected / total : 0,
      msUntilNextToken: this.tokens >= this.maxTokens ? 0 : Math.ceil((1 / this.refillRate) * 1000),
    };
  }

  /**
   * Reset the rate limiter (refill bucket, clear stats)
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.totalAllowed = 0;
    this.totalRejected = 0;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────────

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds

    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private msUntilTokens(needed: number): number {
    if (this.tokens >= needed) return 0;

    const tokensNeeded = needed - this.tokens;
    const secondsNeeded = tokensNeeded / this.refillRate;

    return Math.ceil(secondsNeeded * 1000);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SLIDING WINDOW RATE LIMITER (For per-client limiting)
// ════════════════════════════════════════════════════════════════════════════════

export interface SlidingWindowOptions {
  /** Window size in milliseconds */
  windowMs: number;

  /** Max requests per window */
  maxRequests: number;

  /** Name for logging */
  name?: string;
}

/**
 * Sliding window rate limiter - tracks requests per time window.
 * Better for strict "X requests per Y seconds" limits.
 */
export class SlidingWindowRateLimiter {
  private requests: number[] = [];
  private totalAllowed = 0;
  private totalRejected = 0;

  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly name: string;

  constructor(options: SlidingWindowOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.name = options.name ?? 'sliding-window';
  }

  /**
   * Try to record a request. Returns Ok if allowed, Err if rate limited.
   */
  acquire(): Result<void, VisionError> {
    this.pruneOldRequests();

    if (this.requests.length < this.maxRequests) {
      this.requests.push(Date.now());
      this.totalAllowed++;
      return Ok(undefined);
    }

    this.totalRejected++;

    // Calculate when oldest request will fall out of window
    const oldestRequest = this.requests[0];
    const msUntilSlot = oldestRequest + this.windowMs - Date.now();

    return Err(
      createError(
        VisionErrorCode.RATE_LIMITED,
        `Rate limit exceeded (${this.maxRequests} requests per ${this.windowMs / 1000}s). Try again in ${Math.ceil(msUntilSlot / 1000)} seconds.`,
        {
          retryable: true,
          retryAfterMs: Math.max(0, msUntilSlot),
          source: this.name,
          context: {
            currentRequests: this.requests.length,
            maxRequests: this.maxRequests,
            windowMs: this.windowMs,
          },
        }
      )
    );
  }

  /**
   * Get current statistics
   */
  getStats(): {
    currentRequests: number;
    maxRequests: number;
    windowMs: number;
    totalAllowed: number;
    totalRejected: number;
    rejectionRate: number;
  } {
    this.pruneOldRequests();

    const total = this.totalAllowed + this.totalRejected;

    return {
      currentRequests: this.requests.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      totalAllowed: this.totalAllowed,
      totalRejected: this.totalRejected,
      rejectionRate: total > 0 ? this.totalRejected / total : 0,
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
    this.totalAllowed = 0;
    this.totalRejected = 0;
  }

  private pruneOldRequests(): void {
    const cutoff = Date.now() - this.windowMs;
    this.requests = this.requests.filter(t => t > cutoff);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// COMPOSITE RATE LIMITER (Multiple limits)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Combines multiple rate limiters.
 * Request must pass ALL limiters to proceed.
 *
 * Example: 10 requests/second AND 1000 requests/hour
 */
export class CompositeRateLimiter {
  private limiters: Array<RateLimiter | SlidingWindowRateLimiter>;

  constructor(limiters: Array<RateLimiter | SlidingWindowRateLimiter>) {
    this.limiters = limiters;
  }

  acquire(): Result<void, VisionError> {
    // Check all limiters first (don't consume if any will reject)
    for (const limiter of this.limiters) {
      if (limiter instanceof RateLimiter) {
        if (!limiter.canAcquire()) {
          return limiter.acquire(); // Get the error
        }
      }
    }

    // All can acquire - now actually acquire
    for (const limiter of this.limiters) {
      const result = limiter.acquire();
      if (!result.ok) {
        return result;
      }
    }

    return Ok(undefined);
  }

  reset(): void {
    for (const limiter of this.limiters) {
      limiter.reset();
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// GLOBAL RATE LIMITER REGISTRY
// ════════════════════════════════════════════════════════════════════════════════

const limiters = new Map<string, RateLimiter>();

/**
 * Get or create a rate limiter by name
 */
export function getRateLimiter(name: string, options?: RateLimiterOptions): RateLimiter {
  let limiter = limiters.get(name);

  if (!limiter) {
    limiter = new RateLimiter(
      options ?? {
        maxTokens: 10,
        refillRate: 1,
        name,
      }
    );
    limiters.set(name, limiter);
  }

  return limiter;
}

/**
 * Get all rate limiter stats
 */
export function getAllRateLimiterStats(): Map<string, RateLimiterStats> {
  const stats = new Map<string, RateLimiterStats>();
  for (const [name, limiter] of Array.from(limiters)) {
    stats.set(name, limiter.getStats());
  }
  return stats;
}

// ════════════════════════════════════════════════════════════════════════════════
// DECORATOR
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Decorator to add rate limiting to a function
 */
export function withRateLimit<T, Args extends unknown[]>(
  name: string,
  fn: (...args: Args) => Promise<Result<T, VisionError>>,
  options?: RateLimiterOptions
): (...args: Args) => Promise<Result<T, VisionError>> {
  const limiter = getRateLimiter(name, options);

  return async (...args: Args) => {
    const acquired = limiter.acquire();
    if (isErr(acquired)) {
      return Err(acquired.error);
    }

    return fn(...args);
  };
}
