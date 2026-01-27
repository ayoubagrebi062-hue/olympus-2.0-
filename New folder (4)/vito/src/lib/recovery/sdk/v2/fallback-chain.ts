/**
 * Fallback Chains with Health-Aware Selection
 *
 * Not just one fallback - a CHAIN of fallbacks ordered by health scores.
 * Unhealthy backends automatically deprioritized. Healthy ones promoted.
 *
 * Features:
 * - Multiple fallback levels (primary → secondary → cache → static)
 * - Real-time health scoring per backend
 * - Automatic reordering based on performance
 * - Circuit breaker per fallback
 * - Graceful degradation modes
 *
 * @example
 * ```typescript
 * const chain = new FallbackChain('user-data')
 *   .add('primary-db', () => fetchFromPrimaryDB())
 *   .add('replica-db', () => fetchFromReplicaDB())
 *   .add('cache', () => getFromCache(), { alwaysAvailable: true })
 *   .add('static', () => getDefaultUser(), { alwaysAvailable: true });
 *
 * const result = await chain.execute();
 *
 * console.log(`Got data from: ${result.source}`);
 * console.log(`Chain health: ${chain.getHealthReport()}`);
 * ```
 */

import { Result, Ok, Err } from '../result';
import { metrics, generateTraceId } from '../metrics';

// ============================================================================
// TYPES
// ============================================================================

export interface FallbackOptions {
  /** This fallback is always considered available (e.g., cache, static). Default: false */
  alwaysAvailable?: boolean;
  /** Timeout for this fallback (ms). Default: 5000 */
  timeout?: number;
  /** Weight for health scoring (higher = more preferred). Default: 1 */
  weight?: number;
  /** Tags for categorization */
  tags?: string[];
}

export interface FallbackHealth {
  name: string;
  successRate: number;
  avgLatency: number;
  isHealthy: boolean;
  consecutiveFailures: number;
  totalCalls: number;
  circuitOpen: boolean;
  lastSuccess: number | null;
  lastFailure: number | null;
  score: number; // Computed health score (0-100)
}

export interface ChainResult<T> {
  value: T;
  source: string;
  sourceIndex: number;
  elapsed: number;
  fallbacksAttempted: string[];
  degradationLevel: 'none' | 'partial' | 'severe' | 'emergency';
}

export interface ChainHealthReport {
  chainName: string;
  totalFallbacks: number;
  healthyFallbacks: number;
  overallHealth: number; // 0-100
  degradationLevel: 'none' | 'partial' | 'severe' | 'emergency';
  fallbacks: FallbackHealth[];
  recommendation: string;
}

interface FallbackEntry<T> {
  name: string;
  operation: () => T | Promise<T>;
  options: Required<FallbackOptions>;
  health: {
    successes: number;
    failures: number;
    totalLatency: number;
    consecutiveFailures: number;
    lastSuccess: number | null;
    lastFailure: number | null;
    circuitOpen: boolean;
    circuitOpenedAt: number | null;
  };
}

// ============================================================================
// FALLBACK CHAIN IMPLEMENTATION
// ============================================================================

export class FallbackChain<T> {
  private readonly name: string;
  private entries: FallbackEntry<T>[] = [];
  private readonly circuitThreshold = 5;
  private readonly circuitResetMs = 30000;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Add a fallback to the chain.
   */
  add(
    name: string,
    operation: () => T | Promise<T>,
    options: FallbackOptions = {}
  ): this {
    this.entries.push({
      name,
      operation,
      options: {
        alwaysAvailable: options.alwaysAvailable ?? false,
        timeout: options.timeout ?? 5000,
        weight: options.weight ?? 1,
        tags: options.tags ?? [],
      },
      health: {
        successes: 0,
        failures: 0,
        totalLatency: 0,
        consecutiveFailures: 0,
        lastSuccess: null,
        lastFailure: null,
        circuitOpen: false,
        circuitOpenedAt: null,
      },
    });
    return this;
  }

  /**
   * Execute the fallback chain, trying each in order until one succeeds.
   */
  async execute(): Promise<Result<ChainResult<T>, Error>> {
    const traceId = generateTraceId();
    const startTime = Date.now();
    const attempted: string[] = [];

    // Sort by health score (best first)
    const sortedEntries = this.getSortedEntries();

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      attempted.push(entry.name);

      // Skip if circuit is open (unless alwaysAvailable)
      if (this.isCircuitOpen(entry) && !entry.options.alwaysAvailable) {
        continue;
      }

      try {
        const value = await this.executeWithTimeout(entry);
        const elapsed = Date.now() - startTime;

        // Record success
        this.recordSuccess(entry, elapsed);

        const sourceIndex = this.entries.findIndex(e => e.name === entry.name);
        const degradationLevel = this.getDegradationLevel(sourceIndex);

        metrics.emitSuccess({
          operation: `${this.name}:${entry.name}`,
          attempts: attempted.length,
          elapsed,
          fromFallback: i > 0,
          labels: {
            operation: this.name,
            fallback: i > 0 ? 'true' : 'false',
            trace_id: traceId,
          },
          timestamp: Date.now(),
          traceId,
        });

        return Ok({
          value,
          source: entry.name,
          sourceIndex,
          elapsed,
          fallbacksAttempted: attempted,
          degradationLevel,
        });
      } catch (error) {
        // Record failure
        this.recordFailure(entry);

        // Continue to next fallback
      }
    }

    // All fallbacks failed
    const elapsed = Date.now() - startTime;

    metrics.emitFailure({
      operation: this.name,
      attempts: attempted.length,
      elapsed,
      errorCode: 'ALL_FALLBACKS_FAILED',
      errorMessage: `All ${attempted.length} fallbacks failed: ${attempted.join(', ')}`,
      labels: {
        operation: this.name,
        error_code: 'ALL_FALLBACKS_FAILED',
        trace_id: traceId,
      },
      timestamp: Date.now(),
      traceId,
    });

    return Err(new Error(
      `All fallbacks failed [trace: ${traceId}]. Attempted: ${attempted.join(' → ')}`
    ));
  }

  /**
   * Get health report for the entire chain.
   */
  getHealthReport(): ChainHealthReport {
    const fallbacks = this.entries.map(e => this.getEntryHealth(e));
    const healthyCount = fallbacks.filter(f => f.isHealthy).length;
    const overallHealth = fallbacks.length > 0
      ? Math.round(fallbacks.reduce((sum, f) => sum + f.score, 0) / fallbacks.length)
      : 0;

    const degradationLevel = this.getOverallDegradationLevel(healthyCount);

    let recommendation = '';
    if (degradationLevel === 'emergency') {
      recommendation = 'CRITICAL: All primary fallbacks unhealthy. Investigate immediately.';
    } else if (degradationLevel === 'severe') {
      recommendation = 'WARNING: Most fallbacks unhealthy. Performance degraded.';
    } else if (degradationLevel === 'partial') {
      recommendation = 'NOTICE: Some fallbacks unhealthy. Monitor closely.';
    } else {
      recommendation = 'All systems operational.';
    }

    return {
      chainName: this.name,
      totalFallbacks: this.entries.length,
      healthyFallbacks: healthyCount,
      overallHealth,
      degradationLevel,
      fallbacks,
      recommendation,
    };
  }

  /**
   * Manually mark a fallback as healthy (e.g., after maintenance).
   */
  markHealthy(name: string): void {
    const entry = this.entries.find(e => e.name === name);
    if (entry) {
      entry.health.circuitOpen = false;
      entry.health.circuitOpenedAt = null;
      entry.health.consecutiveFailures = 0;
    }
  }

  /**
   * Manually mark a fallback as unhealthy (e.g., planned maintenance).
   */
  markUnhealthy(name: string): void {
    const entry = this.entries.find(e => e.name === name);
    if (entry) {
      entry.health.circuitOpen = true;
      entry.health.circuitOpenedAt = Date.now();
    }
  }

  /**
   * Reset all health data.
   */
  resetHealth(): void {
    for (const entry of this.entries) {
      entry.health = {
        successes: 0,
        failures: 0,
        totalLatency: 0,
        consecutiveFailures: 0,
        lastSuccess: null,
        lastFailure: null,
        circuitOpen: false,
        circuitOpenedAt: null,
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async executeWithTimeout(entry: FallbackEntry<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Fallback ${entry.name} timed out after ${entry.options.timeout}ms`));
      }, entry.options.timeout);

      Promise.resolve(entry.operation())
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private recordSuccess(entry: FallbackEntry<T>, latencyMs: number): void {
    entry.health.successes++;
    entry.health.totalLatency += latencyMs;
    entry.health.consecutiveFailures = 0;
    entry.health.lastSuccess = Date.now();
    entry.health.circuitOpen = false;
    entry.health.circuitOpenedAt = null;
  }

  private recordFailure(entry: FallbackEntry<T>): void {
    entry.health.failures++;
    entry.health.consecutiveFailures++;
    entry.health.lastFailure = Date.now();

    // Open circuit if threshold exceeded
    if (entry.health.consecutiveFailures >= this.circuitThreshold) {
      entry.health.circuitOpen = true;
      entry.health.circuitOpenedAt = Date.now();
    }
  }

  private isCircuitOpen(entry: FallbackEntry<T>): boolean {
    if (!entry.health.circuitOpen) return false;

    // Check if reset timeout expired
    if (entry.health.circuitOpenedAt) {
      const elapsed = Date.now() - entry.health.circuitOpenedAt;
      if (elapsed >= this.circuitResetMs) {
        // Allow half-open test
        entry.health.circuitOpen = false;
        return false;
      }
    }

    return true;
  }

  private getSortedEntries(): FallbackEntry<T>[] {
    // Calculate scores and sort
    return [...this.entries].sort((a, b) => {
      const scoreA = this.calculateHealthScore(a);
      const scoreB = this.calculateHealthScore(b);
      return scoreB - scoreA; // Higher score first
    });
  }

  private calculateHealthScore(entry: FallbackEntry<T>): number {
    const h = entry.health;
    const total = h.successes + h.failures;

    // Base score starts at 50
    let score = 50;

    // Success rate contribution (0-30 points)
    if (total > 0) {
      const successRate = h.successes / total;
      score += successRate * 30;
    }

    // Recency bonus (0-10 points for recent success)
    if (h.lastSuccess) {
      const ageMs = Date.now() - h.lastSuccess;
      if (ageMs < 60000) score += 10; // Last minute
      else if (ageMs < 300000) score += 5; // Last 5 minutes
    }

    // Latency penalty (0-10 points off for slow)
    if (total > 0) {
      const avgLatency = h.totalLatency / total;
      if (avgLatency > 5000) score -= 10;
      else if (avgLatency > 2000) score -= 5;
    }

    // Consecutive failure penalty
    score -= h.consecutiveFailures * 5;

    // Circuit open penalty
    if (h.circuitOpen) score -= 20;

    // Weight multiplier
    score *= entry.options.weight;

    // Always available bonus
    if (entry.options.alwaysAvailable) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private getEntryHealth(entry: FallbackEntry<T>): FallbackHealth {
    const h = entry.health;
    const total = h.successes + h.failures;
    const score = this.calculateHealthScore(entry);

    return {
      name: entry.name,
      successRate: total > 0 ? h.successes / total : 1,
      avgLatency: total > 0 ? Math.round(h.totalLatency / total) : 0,
      isHealthy: score >= 40 && !h.circuitOpen,
      consecutiveFailures: h.consecutiveFailures,
      totalCalls: total,
      circuitOpen: h.circuitOpen,
      lastSuccess: h.lastSuccess,
      lastFailure: h.lastFailure,
      score: Math.round(score),
    };
  }

  private getDegradationLevel(sourceIndex: number): 'none' | 'partial' | 'severe' | 'emergency' {
    if (sourceIndex === 0) return 'none';
    if (sourceIndex === 1) return 'partial';
    if (sourceIndex === 2) return 'severe';
    return 'emergency';
  }

  private getOverallDegradationLevel(healthyCount: number): 'none' | 'partial' | 'severe' | 'emergency' {
    const total = this.entries.length;
    if (total === 0) return 'emergency';

    const healthyRatio = healthyCount / total;
    if (healthyRatio >= 0.8) return 'none';
    if (healthyRatio >= 0.5) return 'partial';
    if (healthyRatio >= 0.2) return 'severe';
    return 'emergency';
  }
}

// ============================================================================
// FACTORY HELPERS
// ============================================================================

/**
 * Create a simple two-level fallback (primary + cache).
 */
export function withCacheFallback<T>(
  primary: () => T | Promise<T>,
  cache: () => T | Promise<T>,
  name = 'cached-operation'
): FallbackChain<T> {
  return new FallbackChain<T>(name)
    .add('primary', primary)
    .add('cache', cache, { alwaysAvailable: true });
}

/**
 * Create a degradation chain with static fallback.
 */
export function withGracefulDegradation<T>(
  primary: () => T | Promise<T>,
  secondary: () => T | Promise<T>,
  staticFallback: T,
  name = 'degradable-operation'
): FallbackChain<T> {
  return new FallbackChain<T>(name)
    .add('primary', primary)
    .add('secondary', secondary)
    .add('static', () => staticFallback, { alwaysAvailable: true });
}
