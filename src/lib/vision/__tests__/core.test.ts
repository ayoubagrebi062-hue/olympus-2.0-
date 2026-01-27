/**
 * Vision System Core Tests
 *
 * Proves the foundation works. Run with: npx vitest run core.test.ts
 */

import { describe, test, expect, vi } from 'vitest';
import {
  Ok,
  Err,
  isOk,
  isErr,
  createError,
  VisionErrorCode,
  withRetry,
  Result,
  VisionError,
} from '../core/result';

import { RateLimiter } from '../core/rate-limiter';
import { CircuitBreaker } from '../core/circuit-breaker';
import { RequestDeduplicator } from '../core/dedup';
import { createContext, checkContext, remainingTime } from '../core/context';

// ════════════════════════════════════════════════════════════════════════════════
// RESULT TYPE TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('Result Type', () => {
  test('Ok wraps successful values', () => {
    const result = Ok(42);
    expect(result.ok).toBe(true);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });

  test('Err wraps errors', () => {
    const error = createError(VisionErrorCode.INVALID_REQUEST, 'Bad input');
    const result = Err(error);
    expect(result.ok).toBe(false);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_REQUEST');
    }
  });

  test('createError includes defaults', () => {
    const error = createError(VisionErrorCode.RATE_LIMITED, 'Too fast');
    expect(error.code).toBe('RATE_LIMITED');
    expect(error.message).toBe('Too fast');
    expect(error.retryable).toBe(true);
    expect(error.retryAfterMs).toBeDefined();
    expect(error.timestamp).toBeGreaterThan(0);
  });

  test('non-retryable errors marked correctly', () => {
    const error = createError(VisionErrorCode.INVALID_API_KEY, 'Bad key');
    expect(error.retryable).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// RATE LIMITER TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('RateLimiter', () => {
  test('allows requests within limit', () => {
    const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1 });

    for (let i = 0; i < 5; i++) {
      const result = limiter.acquire();
      expect(isOk(result)).toBe(true);
    }
  });

  test('rejects requests over limit', () => {
    const limiter = new RateLimiter({ maxTokens: 2, refillRate: 0.1 });

    limiter.acquire(); // 1
    limiter.acquire(); // 2
    const third = limiter.acquire(); // Should fail

    expect(isErr(third)).toBe(true);
    if (isErr(third)) {
      expect(third.error.code).toBe('RATE_LIMITED');
      expect(third.error.retryAfterMs).toBeGreaterThan(0);
    }
  });

  test('tracks statistics', () => {
    const limiter = new RateLimiter({ maxTokens: 2, refillRate: 0.1 });

    limiter.acquire();
    limiter.acquire();
    limiter.acquire(); // Rejected

    const stats = limiter.getStats();
    expect(stats.totalAllowed).toBe(2);
    expect(stats.totalRejected).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('CircuitBreaker', () => {
  test('starts closed', () => {
    const breaker = new CircuitBreaker('test', { failureThreshold: 3 });
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.isAvailable()).toBe(true);
  });

  test('opens after failure threshold', () => {
    const breaker = new CircuitBreaker('test', {
      failureThreshold: 3,
      failureWindowMs: 60000,
    });

    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');

    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.isAvailable()).toBe(false);
  });

  test('rejects when open', () => {
    const breaker = new CircuitBreaker('test', { failureThreshold: 1 });
    breaker.recordFailure();

    const result = breaker.allowRequest();
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('CIRCUIT_OPEN');
    }
  });

  test('successes in HALF_OPEN close circuit', async () => {
    const breaker = new CircuitBreaker('test', {
      failureThreshold: 2,
      successThreshold: 1,
      resetTimeoutMs: 50,
    });

    // Open the circuit
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');

    // Wait for reset timeout
    await new Promise(r => setTimeout(r, 60));

    // Check isAvailable() to trigger state check - this transitions to HALF_OPEN
    breaker.isAvailable();
    expect(breaker.getState()).toBe('HALF_OPEN');

    // Success in HALF_OPEN should close it
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('CLOSED');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// REQUEST DEDUPLICATION TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('RequestDeduplicator', () => {
  test('deduplicates identical concurrent requests', async () => {
    const dedup = new RequestDeduplicator<string>();
    let callCount = 0;

    const fn = async (): Promise<Result<string, VisionError>> => {
      callCount++;
      await new Promise(r => setTimeout(r, 50));
      return Ok('result');
    };

    // Fire 3 identical requests concurrently
    const [r1, r2, r3] = await Promise.all([
      dedup.execute(fn, undefined, 'same-key'),
      dedup.execute(fn, undefined, 'same-key'),
      dedup.execute(fn, undefined, 'same-key'),
    ]);

    // Function should only be called once
    expect(callCount).toBe(1);

    // All should get the same result
    expect(isOk(r1) && r1.value).toBe('result');
    expect(isOk(r2) && r2.value).toBe('result');
    expect(isOk(r3) && r3.value).toBe('result');
  });

  test('tracks dedup statistics', async () => {
    const dedup = new RequestDeduplicator<string>();

    const fn = async (): Promise<Result<string, VisionError>> => {
      await new Promise(r => setTimeout(r, 20));
      return Ok('done');
    };

    await Promise.all([dedup.execute(fn, undefined, 'key'), dedup.execute(fn, undefined, 'key')]);

    const stats = dedup.getStats();
    expect(stats.totalRequests).toBe(2);
    expect(stats.deduplicatedRequests).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// CONTEXT TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('RequestContext', () => {
  test('creates context with trace ID', () => {
    const ctx = createContext({ timeoutMs: 5000 });
    expect(ctx.traceId).toMatch(/^vis_/);
    expect(ctx.deadline).toBeDefined();
  });

  test('checkContext returns null when valid', () => {
    const ctx = createContext({ timeoutMs: 5000 });
    const error = checkContext(ctx);
    expect(error).toBeNull();
  });

  test('checkContext returns error when deadline passed', async () => {
    const ctx = createContext({ timeoutMs: 10 }); // 10ms timeout
    await new Promise(r => setTimeout(r, 20)); // Wait 20ms

    const error = checkContext(ctx);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('DEADLINE_EXCEEDED');
  });

  test('remainingTime calculates correctly', () => {
    const ctx = createContext({ timeoutMs: 1000 });
    const remaining = remainingTime(ctx);
    expect(remaining).toBeGreaterThan(900);
    expect(remaining).toBeLessThanOrEqual(1000);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// RETRY TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('withRetry', () => {
  test('succeeds on first try', async () => {
    const fn = vi.fn().mockResolvedValue(Ok('success'));

    const result = await withRetry(fn, { maxAttempts: 3 });

    expect(isOk(result) && result.value).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries on retryable error', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(Err(createError(VisionErrorCode.RATE_LIMITED, 'retry')))
      .mockResolvedValueOnce(Err(createError(VisionErrorCode.RATE_LIMITED, 'retry')))
      .mockResolvedValueOnce(Ok('finally'));

    const result = await withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 10,
    });

    expect(isOk(result) && result.value).toBe('finally');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('does not retry non-retryable errors', async () => {
    const fn = vi
      .fn()
      .mockResolvedValue(Err(createError(VisionErrorCode.INVALID_API_KEY, 'bad key')));

    const result = await withRetry(fn, { maxAttempts: 3 });

    expect(isErr(result)).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
