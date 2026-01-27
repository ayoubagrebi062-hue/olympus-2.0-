/**
 * OLYMPUS 3.0 - Load Testing
 * API performance and load testing with k6-style patterns
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// ============================================================================
// TYPES
// ============================================================================

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

interface RequestResult {
  success: boolean;
  statusCode: number;
  responseTime: number;
  error?: string;
}

// ============================================================================
// LOAD TEST UTILITIES
// ============================================================================

async function makeRequest(
  url: string,
  options: RequestInit = {}
): Promise<RequestResult> {
  const start = performance.now();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const responseTime = performance.now() - start;

    return {
      success: response.ok,
      statusCode: response.status,
      responseTime,
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 0,
      responseTime: performance.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function analyzeResults(results: RequestResult[], durationMs: number): LoadTestResult {
  const responseTimes = results.map((r) => r.responseTime);
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  return {
    totalRequests: results.length,
    successfulRequests: successful.length,
    failedRequests: failed.length,
    averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    minResponseTime: Math.min(...responseTimes),
    maxResponseTime: Math.max(...responseTimes),
    p50ResponseTime: calculatePercentile(responseTimes, 50),
    p95ResponseTime: calculatePercentile(responseTimes, 95),
    p99ResponseTime: calculatePercentile(responseTimes, 99),
    requestsPerSecond: results.length / (durationMs / 1000),
    errorRate: (failed.length / results.length) * 100,
  };
}

async function runLoadTest(
  testFn: () => Promise<RequestResult>,
  config: {
    virtualUsers: number;
    durationMs: number;
    rampUpMs?: number;
  }
): Promise<LoadTestResult> {
  const { virtualUsers, durationMs, rampUpMs = 0 } = config;
  const results: RequestResult[] = [];
  const startTime = Date.now();
  const endTime = startTime + durationMs;

  // Create virtual users
  const users: Promise<void>[] = [];

  for (let i = 0; i < virtualUsers; i++) {
    // Stagger user starts during ramp-up
    const delay = rampUpMs > 0 ? (rampUpMs / virtualUsers) * i : 0;

    users.push(
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));

        while (Date.now() < endTime) {
          const result = await testFn();
          results.push(result);

          // Small delay between requests per user
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      })()
    );
  }

  await Promise.all(users);

  return analyzeResults(results, durationMs);
}

// ============================================================================
// LOAD TESTS
// ============================================================================

const BASE_URL = process.env.LOAD_TEST_URL || 'http://localhost:3000';

describe('Load Tests', () => {
  // Skip if not running load tests explicitly
  const runLoadTests = process.env.RUN_LOAD_TESTS === 'true';

  describe.skipIf(!runLoadTests)('Health Check Endpoint', () => {
    it('should handle 10 concurrent users for 10 seconds', async () => {
      const result = await runLoadTest(
        () => makeRequest(`${BASE_URL}/api/monitoring/health`),
        { virtualUsers: 10, durationMs: 10000, rampUpMs: 2000 }
      );

      console.log('Health Check Load Test Results:', result);

      expect(result.errorRate).toBeLessThan(1); // < 1% error rate
      expect(result.p95ResponseTime).toBeLessThan(500); // < 500ms p95
      expect(result.requestsPerSecond).toBeGreaterThan(10); // > 10 RPS
    }, 30000);

    it('should handle 50 concurrent users for 30 seconds', async () => {
      const result = await runLoadTest(
        () => makeRequest(`${BASE_URL}/api/monitoring/health`),
        { virtualUsers: 50, durationMs: 30000, rampUpMs: 5000 }
      );

      console.log('Health Check High Load Test Results:', result);

      expect(result.errorRate).toBeLessThan(5); // < 5% error rate
      expect(result.p95ResponseTime).toBeLessThan(1000); // < 1s p95
    }, 60000);
  });

  describe.skipIf(!runLoadTests)('Metrics Endpoint', () => {
    it('should handle 20 concurrent users for 15 seconds', async () => {
      const result = await runLoadTest(
        () => makeRequest(`${BASE_URL}/api/monitoring/metrics?format=json`),
        { virtualUsers: 20, durationMs: 15000, rampUpMs: 3000 }
      );

      console.log('Metrics Load Test Results:', result);

      expect(result.errorRate).toBeLessThan(2);
      expect(result.p95ResponseTime).toBeLessThan(800);
    }, 30000);
  });

  describe.skipIf(!runLoadTests)('API Rate Limiting', () => {
    it('should enforce rate limits under load', async () => {
      const results: RequestResult[] = [];

      // Send 150 requests quickly (limit is 100/minute)
      for (let i = 0; i < 150; i++) {
        const result = await makeRequest(`${BASE_URL}/api/monitoring/health`);
        results.push(result);
      }

      const rateLimited = results.filter((r) => r.statusCode === 429);

      console.log('Rate Limiting Test:', {
        totalRequests: results.length,
        rateLimited: rateLimited.length,
      });

      // Should have some rate limited requests
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 60000);
  });
});

// ============================================================================
// STRESS TEST PATTERNS
// ============================================================================

describe('Stress Test Patterns', () => {
  const runStressTests = process.env.RUN_STRESS_TESTS === 'true';

  describe.skipIf(!runStressTests)('Spike Test', () => {
    it('should handle sudden spike in traffic', async () => {
      // Normal load
      const normalResult = await runLoadTest(
        () => makeRequest(`${BASE_URL}/api/monitoring/health`),
        { virtualUsers: 5, durationMs: 5000 }
      );

      // Spike to high load
      const spikeResult = await runLoadTest(
        () => makeRequest(`${BASE_URL}/api/monitoring/health`),
        { virtualUsers: 100, durationMs: 10000, rampUpMs: 1000 }
      );

      // Return to normal
      const recoveryResult = await runLoadTest(
        () => makeRequest(`${BASE_URL}/api/monitoring/health`),
        { virtualUsers: 5, durationMs: 5000 }
      );

      console.log('Spike Test Results:', {
        normal: normalResult.p95ResponseTime,
        spike: spikeResult.p95ResponseTime,
        recovery: recoveryResult.p95ResponseTime,
      });

      // Recovery should be close to normal
      expect(recoveryResult.p95ResponseTime).toBeLessThan(normalResult.p95ResponseTime * 2);
    }, 60000);
  });

  describe.skipIf(!runStressTests)('Soak Test', () => {
    it('should maintain performance over extended period', async () => {
      const results: LoadTestResult[] = [];

      // Run 5 iterations of 10 seconds each
      for (let i = 0; i < 5; i++) {
        const result = await runLoadTest(
          () => makeRequest(`${BASE_URL}/api/monitoring/health`),
          { virtualUsers: 20, durationMs: 10000 }
        );

        results.push(result);

        // Small break between iterations
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log('Soak Test Results:', results.map((r) => ({
        p95: r.p95ResponseTime,
        errorRate: r.errorRate,
      })));

      // Performance should not degrade significantly
      const firstP95 = results[0].p95ResponseTime;
      const lastP95 = results[results.length - 1].p95ResponseTime;

      expect(lastP95).toBeLessThan(firstP95 * 1.5); // Max 50% degradation
    }, 120000);
  });
});

// ============================================================================
// PERFORMANCE ASSERTIONS
// ============================================================================

describe('Performance Assertions', () => {
  it('should have correct load test utility functions', () => {
    // Test percentile calculation
    const values = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    expect(calculatePercentile(values, 50)).toBe(500);
    expect(calculatePercentile(values, 95)).toBe(1000); // 95th percentile of 10 values = index 9
    expect(calculatePercentile(values, 99)).toBe(1000);
  });

  it('should analyze results correctly', () => {
    const mockResults: RequestResult[] = [
      { success: true, statusCode: 200, responseTime: 100 },
      { success: true, statusCode: 200, responseTime: 200 },
      { success: false, statusCode: 500, responseTime: 300 },
      { success: true, statusCode: 200, responseTime: 150 },
    ];

    const analysis = analyzeResults(mockResults, 1000);

    expect(analysis.totalRequests).toBe(4);
    expect(analysis.successfulRequests).toBe(3);
    expect(analysis.failedRequests).toBe(1);
    expect(analysis.errorRate).toBe(25);
    expect(analysis.requestsPerSecond).toBe(4);
  });
});
