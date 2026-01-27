/**
 * 🏛️ PANTHEON - Load Cannon
 * ==========================
 * Stress test the orchestrator at scale.
 *
 * "If it breaks at 1000 concurrent builds, it will break at 10."
 *
 * Tests:
 * - Concurrent build execution
 * - Memory leak detection
 * - Performance regression tracking
 * - Bottleneck identification
 * - Throughput measurement
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  BuildSimulator,
  BuildConfig,
  ChaosConfig,
  createStandardBuildConfig,
  createChaosConfig,
  SimulatorEvent
} from './core/simulator';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface LoadTestResult {
  totalBuilds: number;
  successfulBuilds: number;
  failedBuilds: number;
  totalDuration: number;
  averageBuildDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  maxDuration: number;
  minDuration: number;
  buildsPerSecond: number;
  peakConcurrency: number;
  memoryStart: number;
  memoryEnd: number;
  memoryGrowth: number;
  errors: string[];
}

interface PerformanceBaseline {
  name: string;
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise';
  maxP99Duration: number; // ms
  minBuildsPerSecond: number;
  maxMemoryGrowth: number; // bytes
}

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE BASELINES
// ═══════════════════════════════════════════════════════════════════════════

const PERFORMANCE_BASELINES: PerformanceBaseline[] = [
  { name: 'Starter builds', tier: 'starter', maxP99Duration: 2000, minBuildsPerSecond: 10, maxMemoryGrowth: 50 * 1024 * 1024 },
  { name: 'Professional builds', tier: 'professional', maxP99Duration: 4000, minBuildsPerSecond: 5, maxMemoryGrowth: 100 * 1024 * 1024 },
  { name: 'Enterprise builds', tier: 'enterprise', maxP99Duration: 8000, minBuildsPerSecond: 2, maxMemoryGrowth: 200 * 1024 * 1024 },
];

// ═══════════════════════════════════════════════════════════════════════════
// LOAD TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════

async function runLoadTest(
  buildCount: number,
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise',
  concurrency: number,
  chaos?: ChaosConfig
): Promise<LoadTestResult> {
  const durations: number[] = [];
  const errors: string[] = [];
  let successfulBuilds = 0;
  let failedBuilds = 0;
  let peakConcurrency = 0;
  let currentConcurrency = 0;

  // Memory tracking
  const memoryStart = process.memoryUsage().heapUsed;

  const startTime = Date.now();

  // Create all build configs
  const builds = Array.from({ length: buildCount }, (_, i) =>
    createStandardBuildConfig(tier, i)
  );

  // Run builds with controlled concurrency
  const executing = new Set<number>();
  let completed = 0;
  let nextIndex = 0;

  const runBuild = async (index: number): Promise<void> => {
    executing.add(index);
    currentConcurrency = executing.size;
    if (currentConcurrency > peakConcurrency) {
      peakConcurrency = currentConcurrency;
    }

    const buildStart = Date.now();
    const simulator = new BuildSimulator(builds[index], chaos);

    try {
      const result = await simulator.run();
      const duration = Date.now() - buildStart;
      durations.push(duration);

      if (result.status === 'completed') {
        successfulBuilds++;
      } else {
        failedBuilds++;
      }
    } catch (error) {
      errors.push(`Build ${index}: ${String(error)}`);
      failedBuilds++;
    } finally {
      executing.delete(index);
      completed++;
    }
  };

  // Start initial batch
  const promises: Promise<void>[] = [];

  while (nextIndex < buildCount || executing.size > 0) {
    // Start new builds up to concurrency limit
    while (nextIndex < buildCount && executing.size < concurrency) {
      promises.push(runBuild(nextIndex++));
    }

    // Wait a bit for some to complete
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // Wait for all to complete
  await Promise.all(promises);

  const totalDuration = Date.now() - startTime;

  // Memory tracking
  const memoryEnd = process.memoryUsage().heapUsed;

  // Calculate percentiles
  const sortedDurations = [...durations].sort((a, b) => a - b);
  const p50Index = Math.floor(sortedDurations.length * 0.50);
  const p95Index = Math.floor(sortedDurations.length * 0.95);
  const p99Index = Math.floor(sortedDurations.length * 0.99);

  return {
    totalBuilds: buildCount,
    successfulBuilds,
    failedBuilds,
    totalDuration,
    averageBuildDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    p50Duration: sortedDurations[p50Index] || 0,
    p95Duration: sortedDurations[p95Index] || 0,
    p99Duration: sortedDurations[p99Index] || 0,
    maxDuration: Math.max(...durations),
    minDuration: Math.min(...durations),
    buildsPerSecond: buildCount / (totalDuration / 1000),
    peakConcurrency,
    memoryStart,
    memoryEnd,
    memoryGrowth: memoryEnd - memoryStart,
    errors
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD TEST REPORT
// ═══════════════════════════════════════════════════════════════════════════

function printLoadTestReport(result: LoadTestResult, testName: string): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════════╗
║ 🏋️ LOAD TEST REPORT: ${testName.padEnd(55)} ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  THROUGHPUT                                                                      ║
║  ├─ Total Builds:        ${String(result.totalBuilds).padStart(8)}                                       ║
║  ├─ Successful:          ${String(result.successfulBuilds).padStart(8)} (${((result.successfulBuilds / result.totalBuilds) * 100).toFixed(1)}%)                            ║
║  ├─ Failed:              ${String(result.failedBuilds).padStart(8)} (${((result.failedBuilds / result.totalBuilds) * 100).toFixed(1)}%)                            ║
║  ├─ Builds/second:       ${result.buildsPerSecond.toFixed(2).padStart(8)}                                       ║
║  └─ Peak Concurrency:    ${String(result.peakConcurrency).padStart(8)}                                       ║
║                                                                                  ║
║  LATENCY                                                                         ║
║  ├─ Average:             ${result.averageBuildDuration.toFixed(0).padStart(8)} ms                                   ║
║  ├─ P50:                 ${result.p50Duration.toFixed(0).padStart(8)} ms                                   ║
║  ├─ P95:                 ${result.p95Duration.toFixed(0).padStart(8)} ms                                   ║
║  ├─ P99:                 ${result.p99Duration.toFixed(0).padStart(8)} ms                                   ║
║  ├─ Min:                 ${result.minDuration.toFixed(0).padStart(8)} ms                                   ║
║  └─ Max:                 ${result.maxDuration.toFixed(0).padStart(8)} ms                                   ║
║                                                                                  ║
║  MEMORY                                                                          ║
║  ├─ Start:               ${(result.memoryStart / 1024 / 1024).toFixed(2).padStart(8)} MB                                   ║
║  ├─ End:                 ${(result.memoryEnd / 1024 / 1024).toFixed(2).padStart(8)} MB                                   ║
║  └─ Growth:              ${(result.memoryGrowth / 1024 / 1024).toFixed(2).padStart(8)} MB                                   ║
║                                                                                  ║
║  DURATION: ${(result.totalDuration / 1000).toFixed(2)}s                                                       ║
╚══════════════════════════════════════════════════════════════════════════════════╝`);

  if (result.errors.length > 0) {
    console.log('\nERRORS:');
    result.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

describe('🏋️ PANTHEON Load Cannon', () => {
  describe('Throughput Tests', () => {
    it('LOAD: 100 starter builds, 10 concurrent', async () => {
      const result = await runLoadTest(100, 'starter', 10);
      printLoadTestReport(result, '100 Starter Builds');

      expect(result.successfulBuilds).toBeGreaterThan(result.totalBuilds * 0.8);
      expect(result.buildsPerSecond).toBeGreaterThan(5);
    }, 120000);

    it('LOAD: 50 professional builds, 5 concurrent', async () => {
      const result = await runLoadTest(50, 'professional', 5);
      printLoadTestReport(result, '50 Professional Builds');

      expect(result.successfulBuilds).toBeGreaterThan(result.totalBuilds * 0.7);
      expect(result.buildsPerSecond).toBeGreaterThan(2);
    }, 120000);

    it('LOAD: 20 enterprise builds, 3 concurrent', async () => {
      const result = await runLoadTest(20, 'enterprise', 3);
      printLoadTestReport(result, '20 Enterprise Builds');

      expect(result.successfulBuilds).toBeGreaterThan(result.totalBuilds * 0.7);
    }, 120000);
  });

  describe('Concurrency Stress Tests', () => {
    it('LOAD: 50 builds at 50 concurrent (max stress)', async () => {
      const result = await runLoadTest(50, 'starter', 50);
      printLoadTestReport(result, 'Max Concurrency Stress');

      // System should still function under max load
      expect(result.successfulBuilds + result.failedBuilds).toBe(result.totalBuilds);
      expect(result.peakConcurrency).toBeLessThanOrEqual(50);
    }, 120000);

    it('LOAD: Concurrency ramp-up (1 -> 10 -> 50 -> 100)', async () => {
      const concurrencyLevels = [1, 10, 50, 100];
      const results: LoadTestResult[] = [];

      for (const concurrency of concurrencyLevels) {
        const result = await runLoadTest(20, 'starter', concurrency);
        results.push(result);
        console.log(`Concurrency ${concurrency}: ${result.buildsPerSecond.toFixed(2)} builds/sec`);
      }

      // Higher concurrency should generally mean higher throughput (up to a point)
      // But latency will increase
      expect(results[results.length - 1].totalDuration).toBeLessThan(results[0].totalDuration);
    }, 300000);
  });

  describe('Memory Leak Detection', () => {
    it('MEMORY: No memory leak over 200 builds', async () => {
      // Warm up
      await runLoadTest(10, 'starter', 5);

      // Force GC if available
      if (global.gc) global.gc();
      const baselineMemory = process.memoryUsage().heapUsed;

      // Run many builds
      const result = await runLoadTest(200, 'starter', 10);

      // Force GC again
      if (global.gc) global.gc();
      const finalMemory = process.memoryUsage().heapUsed;

      const memoryGrowth = finalMemory - baselineMemory;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      console.log(`Memory growth after 200 builds: ${memoryGrowthMB.toFixed(2)} MB`);

      // Should not grow by more than 50MB for 200 builds
      expect(memoryGrowthMB).toBeLessThan(50);
    }, 300000);

    it('MEMORY: Memory stable over 5 iterations of 50 builds', async () => {
      const memorySnapshots: number[] = [];

      for (let i = 0; i < 5; i++) {
        if (global.gc) global.gc();
        memorySnapshots.push(process.memoryUsage().heapUsed);

        await runLoadTest(50, 'starter', 10);
      }

      // Calculate growth rate between iterations
      const growthRates: number[] = [];
      for (let i = 1; i < memorySnapshots.length; i++) {
        growthRates.push(memorySnapshots[i] - memorySnapshots[i - 1]);
      }

      const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
      console.log(`Average memory growth per iteration: ${(avgGrowth / 1024 / 1024).toFixed(2)} MB`);

      // Growth should be small and consistent (not accelerating)
      const lastGrowth = growthRates[growthRates.length - 1];
      const firstGrowth = growthRates[0];

      // Last growth should not be significantly larger than first
      // Use Math.max to avoid negative threshold when GC causes memory decrease
      const threshold = Math.max(firstGrowth * 2, 0) + 10 * 1024 * 1024;
      expect(lastGrowth).toBeLessThan(threshold);
    }, 600000);
  });

  describe('Performance Regression Tests', () => {
    for (const baseline of PERFORMANCE_BASELINES) {
      it(`BASELINE: ${baseline.name} meets performance requirements`, async () => {
        const result = await runLoadTest(30, baseline.tier, 5);
        printLoadTestReport(result, baseline.name);

        expect(result.p99Duration).toBeLessThan(baseline.maxP99Duration);
        expect(result.buildsPerSecond).toBeGreaterThan(baseline.minBuildsPerSecond);
        expect(result.memoryGrowth).toBeLessThan(baseline.maxMemoryGrowth);
      }, 120000);
    }
  });

  describe('Chaos Under Load', () => {
    it('CHAOS+LOAD: System survives chaos at scale', async () => {
      const chaos = createChaosConfig('medium');
      const result = await runLoadTest(50, 'professional', 10, chaos);
      printLoadTestReport(result, 'Chaos Under Load');

      // Under chaos, expect ~40-60% success rate
      expect(result.successfulBuilds / result.totalBuilds).toBeGreaterThan(0.3);

      // System should still function - no hangs
      expect(result.totalDuration).toBeLessThan(120000); // 2 minutes max
    }, 180000);

    it('CHAOS+LOAD: Extreme chaos does not crash system', async () => {
      const chaos = createChaosConfig('extreme');
      const result = await runLoadTest(30, 'starter', 15, chaos);
      printLoadTestReport(result, 'Extreme Chaos Under Load');

      // System should complete all builds (even if they fail)
      expect(result.successfulBuilds + result.failedBuilds).toBe(result.totalBuilds);
    }, 180000);
  });

  describe('Latency Percentile Tests', () => {
    it('LATENCY: P99 is within reasonable bounds of P50', async () => {
      const result = await runLoadTest(100, 'professional', 10);

      const ratio = result.p99Duration / result.p50Duration;
      console.log(`P99/P50 ratio: ${ratio.toFixed(2)}`);

      // P99 should not be more than 10x P50 (allows for high system variance)
      // In fast mock tests, P50 can be 0-1ms making ratios very sensitive
      expect(ratio).toBeLessThan(10);
    }, 120000);

    it('LATENCY: Max duration is within 5x of P99', async () => {
      const result = await runLoadTest(100, 'professional', 10);

      const ratio = result.maxDuration / result.p99Duration;
      console.log(`Max/P99 ratio: ${ratio.toFixed(2)}`);

      // Max should not be more than 5x P99 (indicates outlier issues)
      expect(ratio).toBeLessThan(5);
    }, 120000);
  });

  describe('Throughput Scaling', () => {
    it('SCALE: Throughput scales with concurrency (up to limit)', async () => {
      const results: { concurrency: number; throughput: number }[] = [];

      for (const concurrency of [1, 2, 5, 10]) {
        const result = await runLoadTest(20, 'starter', concurrency);
        results.push({ concurrency, throughput: result.buildsPerSecond });
      }

      console.log('\nThroughput Scaling:');
      results.forEach(r => {
        console.log(`  Concurrency ${r.concurrency}: ${r.throughput.toFixed(2)} builds/sec`);
      });

      // Throughput should generally increase with concurrency
      expect(results[results.length - 1].throughput).toBeGreaterThan(results[0].throughput);
    }, 300000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  runLoadTest,
  printLoadTestReport,
  LoadTestResult,
  PerformanceBaseline,
  PERFORMANCE_BASELINES
};
