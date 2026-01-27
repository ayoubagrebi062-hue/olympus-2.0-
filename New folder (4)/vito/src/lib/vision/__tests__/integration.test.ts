/**
 * INTEGRATION TESTS - Proves the system works together
 *
 * No mocks. Real behavior. Run: npx jest integration.test.ts
 */

import {
  Ok, Err, isOk, isErr, createError, VisionErrorCode,
  withRetry, collect, partition,
} from '../core/result';
import { createContext, checkContext, isDone } from '../core/context';
import { CircuitBreaker } from '../core/circuit-breaker';
import { RateLimiter } from '../core/rate-limiter';
import { RequestDeduplicator } from '../core/dedup';

describe('Full Pipeline Integration', () => {

  test('complete request flow: rate limit → validate → dedup → circuit → execute', async () => {
    // Simulate a complete request pipeline
    const rateLimiter = new RateLimiter({ maxTokens: 10, refillRate: 1 });
    const circuit = new CircuitBreaker('test-provider', { failureThreshold: 3 });
    const dedup = new RequestDeduplicator<string>();

    let apiCallCount = 0;

    const executeRequest = async (prompt: string) => {
      // Step 1: Rate limit
      const rateResult = rateLimiter.acquire();
      if (isErr(rateResult)) return rateResult;

      // Step 2: Create context
      const ctx = createContext({ timeoutMs: 5000 });

      // Step 3: Dedup
      return dedup.execute(async () => {
        // Step 4: Circuit breaker
        return circuit.execute(async () => {
          // Step 5: "API call"
          apiCallCount++;
          await new Promise(r => setTimeout(r, 10));
          return Ok(`Generated: ${prompt}`);
        }, ctx);
      }, ctx, prompt);
    };

    // Fire 5 identical requests simultaneously
    const results = await Promise.all([
      executeRequest('build a form'),
      executeRequest('build a form'),
      executeRequest('build a form'),
      executeRequest('build a form'),
      executeRequest('build a form'),
    ]);

    // All should succeed
    expect(results.every(isOk)).toBe(true);

    // But only ONE API call should have been made (dedup)
    expect(apiCallCount).toBe(1);

    // Circuit should still be closed
    expect(circuit.getState()).toBe('CLOSED');

    // Rate limiter should show 5 requests consumed
    expect(rateLimiter.getStats().totalAllowed).toBe(5);

    // Dedup should show 4 deduplicated
    expect(dedup.getStats().deduplicatedRequests).toBe(4);
  });

  test('circuit breaker protects after failures', async () => {
    const circuit = new CircuitBreaker('flaky-service', {
      failureThreshold: 2,
      resetTimeoutMs: 100,
    });

    const flakyCall = async (shouldFail: boolean) => {
      return circuit.execute(async () => {
        if (shouldFail) {
          return Err(createError(VisionErrorCode.PROVIDER_ERROR, 'Service down'));
        }
        return Ok('success');
      });
    };

    // First failure
    await flakyCall(true);
    expect(circuit.getState()).toBe('CLOSED');

    // Second failure - should open
    await flakyCall(true);
    expect(circuit.getState()).toBe('OPEN');

    // Next call should be rejected immediately (not even attempted)
    const blocked = await flakyCall(false);
    expect(isErr(blocked)).toBe(true);
    if (isErr(blocked)) {
      expect(blocked.error.code).toBe('CIRCUIT_OPEN');
    }

    // Wait for reset timeout
    await new Promise(r => setTimeout(r, 150));

    // Check availability to trigger state transition
    circuit.isAvailable();

    // Should be half-open now, allowing one test request
    expect(circuit.getState()).toBe('HALF_OPEN');

    // Successful call should close circuit
    const recovered = await flakyCall(false);
    expect(isOk(recovered)).toBe(true);
  });

  test('retry with exponential backoff actually backs off', async () => {
    const callTimes: number[] = [];
    let attempts = 0;

    const fn = async () => {
      callTimes.push(Date.now());
      attempts++;
      if (attempts < 3) {
        return Err(createError(VisionErrorCode.RATE_LIMITED, 'retry', { retryAfterMs: 50 }));
      }
      return Ok('finally');
    };

    const start = Date.now();
    const result = await withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 50,
      maxDelayMs: 1000,
    });
    const totalTime = Date.now() - start;

    expect(isOk(result)).toBe(true);
    expect(attempts).toBe(3);

    // Should have waited between retries (at least 50ms + 100ms = 150ms)
    expect(totalTime).toBeGreaterThan(100);

    // Verify exponential increase (with tolerance for system timing variance)
    const delay1 = callTimes[1] - callTimes[0];
    const delay2 = callTimes[2] - callTimes[1];
    expect(delay2).toBeGreaterThan(delay1 * 1.2); // Exponential (1.2x allows for timing jitter)
  });

  test('context deadline actually cancels', async () => {
    const ctx = createContext({ timeoutMs: 50 });

    // Start a "long" operation
    const longOperation = async () => {
      for (let i = 0; i < 10; i++) {
        if (isDone(ctx)) {
          return Err(createError(VisionErrorCode.DEADLINE_EXCEEDED, 'Timeout'));
        }
        await new Promise(r => setTimeout(r, 20));
      }
      return Ok('completed');
    };

    const result = await longOperation();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('DEADLINE_EXCEEDED');
    }
  });

  test('partition correctly separates successes and failures', () => {
    const results = [
      Ok('a'),
      Err(createError(VisionErrorCode.RATE_LIMITED, 'limit')),
      Ok('b'),
      Ok('c'),
      Err(createError(VisionErrorCode.TIMEOUT, 'slow')),
    ];

    const { successes, failures } = partition(results);

    expect(successes).toEqual(['a', 'b', 'c']);
    expect(failures.length).toBe(2);
    expect(failures[0].code).toBe('RATE_LIMITED');
    expect(failures[1].code).toBe('TIMEOUT');
  });

  test('rate limiter refills over time', async () => {
    const limiter = new RateLimiter({
      maxTokens: 2,
      refillRate: 20, // 20 tokens per second = 1 token per 50ms
    });

    // Exhaust tokens
    limiter.acquire();
    limiter.acquire();
    expect(isErr(limiter.acquire())).toBe(true);

    // Wait for refill
    await new Promise(r => setTimeout(r, 60));

    // Should have ~1 token now
    expect(isOk(limiter.acquire())).toBe(true);
  });

  test('dedup handles errors correctly', async () => {
    const dedup = new RequestDeduplicator<string>();
    let callCount = 0;

    const failingFn = async () => {
      callCount++;
      await new Promise(r => setTimeout(r, 20));
      return Err(createError(VisionErrorCode.PROVIDER_ERROR, 'API down'));
    };

    // 3 concurrent requests to failing function
    const results = await Promise.all([
      dedup.execute(failingFn, undefined, 'key'),
      dedup.execute(failingFn, undefined, 'key'),
      dedup.execute(failingFn, undefined, 'key'),
    ]);

    // Only called once
    expect(callCount).toBe(1);

    // All get the same error
    expect(results.every(isErr)).toBe(true);
    results.forEach(r => {
      if (isErr(r)) {
        expect(r.error.code).toBe('PROVIDER_ERROR');
      }
    });
  });
});

describe('Error Recovery Scenarios', () => {

  test('graceful degradation: partial success', async () => {
    // Simulate: code generation succeeds, image generation fails
    const generateCode = async () => Ok('const Button = () => <button>Click</button>');
    const generateImages = async () => Err(createError(VisionErrorCode.PROVIDER_ERROR, 'Image API down'));

    const [codeResult, imageResult] = await Promise.all([
      generateCode(),
      generateImages(),
    ]);

    // Can still return useful result
    const response = {
      code: isOk(codeResult) ? codeResult.value : null,
      images: isOk(imageResult) ? imageResult.value : [],
      warnings: isErr(imageResult) ? [imageResult.error.message] : [],
    };

    expect(response.code).not.toBeNull();
    expect(response.warnings.length).toBe(1);
  });

  test('cascading circuit breakers isolate failures', async () => {
    const anthropicCircuit = new CircuitBreaker('anthropic', { failureThreshold: 2 });
    const openaiCircuit = new CircuitBreaker('openai', { failureThreshold: 2 });

    // Anthropic fails
    anthropicCircuit.recordFailure();
    anthropicCircuit.recordFailure();
    expect(anthropicCircuit.getState()).toBe('OPEN');

    // OpenAI still available
    expect(openaiCircuit.getState()).toBe('CLOSED');
    expect(openaiCircuit.isAvailable()).toBe(true);

    // Fallback works
    const tryGenerate = async () => {
      if (anthropicCircuit.isAvailable()) {
        return anthropicCircuit.execute(async () => Ok('anthropic'));
      }
      if (openaiCircuit.isAvailable()) {
        return openaiCircuit.execute(async () => Ok('openai-fallback'));
      }
      return Err(createError(VisionErrorCode.PROVIDER_UNAVAILABLE, 'All providers down'));
    };

    const result = await tryGenerate();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe('openai-fallback');
    }
  });
});
