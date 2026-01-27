/**
 * OLYMPUS 3.0 - Chaos Testing Utilities
 * ======================================
 */

/**
 * Simulate network latency
 */
export async function simulateLatency(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Randomly fail with given probability
 */
export function randomFail(probability: number): void {
  if (Math.random() < probability) {
    throw new Error('Random failure occurred');
  }
}

/**
 * Create a flaky function that fails intermittently
 */
export function createFlakyFunction<T>(
  fn: () => T | Promise<T>,
  failureProbability: number = 0.5
): () => Promise<T> {
  return async () => {
    randomFail(failureProbability);
    return fn();
  };
}

/**
 * Simulate memory pressure
 */
export function simulateMemoryPressure(): void {
  // In a real test, this might allocate memory to trigger GC
  console.warn('Simulating memory pressure...');
}

/**
 * Simulate CPU spike
 */
export function simulateCPUSpike(durationMs: number): void {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    // Busy wait
    Math.random();
  }
}

/**
 * Create a rate limiter for testing
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests: number[] = [];

  return {
    check: (): boolean => {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Remove old requests
      while (requests.length > 0 && requests[0] < windowStart) {
        requests.shift();
      }

      if (requests.length >= maxRequests) {
        return false;
      }

      requests.push(now);
      return true;
    },
    reset: () => {
      requests.length = 0;
    },
  };
}

/**
 * Simulate partial response (truncated data)
 */
export function simulateTruncatedResponse<T>(data: T, truncateAt: number): Partial<T> {
  if (typeof data === 'string') {
    return data.slice(0, truncateAt) as unknown as Partial<T>;
  }
  if (Array.isArray(data)) {
    return data.slice(0, truncateAt) as unknown as Partial<T>;
  }
  return data;
}

/**
 * Create a circuit breaker for testing
 */
export function createCircuitBreaker(failureThreshold: number, resetTimeout: number) {
  let failures = 0;
  let state: 'closed' | 'open' | 'half-open' = 'closed';
  let lastFailure: number | null = null;

  return {
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      if (state === 'open') {
        if (lastFailure && Date.now() - lastFailure > resetTimeout) {
          state = 'half-open';
        } else {
          throw new Error('Circuit breaker is open');
        }
      }

      try {
        const result = await fn();
        if (state === 'half-open') {
          state = 'closed';
          failures = 0;
        }
        return result;
      } catch (error) {
        failures++;
        lastFailure = Date.now();

        if (failures >= failureThreshold) {
          state = 'open';
        }

        throw error;
      }
    },
    getState: () => state,
    reset: () => {
      failures = 0;
      state = 'closed';
      lastFailure = null;
    },
  };
}
