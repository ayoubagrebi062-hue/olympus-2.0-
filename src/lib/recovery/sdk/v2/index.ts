/**
 * Self-Healing SDK v2.0 - World-Class Resilience
 *
 * The most comprehensive resilience SDK ever built.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔥 THE DREAM API - Zero Config, Maximum Resilience
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Zero Config (95% of use cases)
 * ```typescript
 * import { resilient } from '@olympus/recovery/v2';
 *
 * // Just works - smart defaults handle everything
 * const user = await resilient(() => fetchUser(id));
 * ```
 *
 * @example Presets for Common Patterns
 * ```typescript
 * // Payment processing - more retries, longer timeout, bulkhead isolation
 * const payment = await resilient.critical(() => processPayment(order));
 *
 * // Search/autocomplete - fast fail, hedging for tail latency
 * const results = await resilient.fast(() => searchProducts(query));
 *
 * // Analytics/logging - many retries, silent failures OK
 * await resilient.background(() => trackEvent(data));
 *
 * // WebSocket/streaming - fast reconnection, adaptive backoff
 * const conn = await resilient.realtime(() => connectWebSocket());
 *
 * // Database operations - connection-aware, deadlock handling
 * const rows = await resilient.database(() => db.query(sql));
 * ```
 *
 * @example With Options
 * ```typescript
 * const data = await resilient(() => fetchData(), {
 *   timeout: 5000,
 *   fallback: cachedData,
 * });
 * ```
 *
 * @example Dashboard
 * ```typescript
 * resilient.dashboard.print();  // Console dashboard
 * resilient.dashboard.stats();  // Get stats object
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔧 ADVANCED API - Full Control When You Need It
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Builder Pattern
 * ```typescript
 * import { Resilience } from '@olympus/recovery/v2';
 *
 * const fetchUser = Resilience.create('user-api')
 *   .withRetry({ adaptive: true })
 *   .withHedging({ delay: 100 })
 *   .withBulkhead({ maxConcurrent: 10 })
 *   .withFallback(() => cache.get())
 *   .withPrediction()
 *   .build();
 *
 * const user = await fetchUser.execute(() => api.getUser(id));
 * ```
 */

// ============================================================================
// 🔥 THE DREAM API - Primary Export
// ============================================================================
export { resilient, PRESETS } from './presets';
export type { PresetName } from './presets';

// ============================================================================
// Advanced Modules
// ============================================================================
export {
  AdaptiveBackoff,
  getAdaptiveBackoff,
  parseRetryAfter,
  clearBackoffRegistry,
} from './adaptive-backoff';
export type { BackoffConfig } from './adaptive-backoff';

export { hedge, hedgeAcross, clearLatencyTrackers } from './hedging';
export type { HedgeConfig, HedgeResult } from './hedging';

export { Bulkhead, getBulkhead, getAllBulkheadStats, clearBulkheadRegistry } from './bulkhead';
export type { BulkheadConfig, BulkheadStats, ExecuteOptions } from './bulkhead';

export { FallbackChain, withCacheFallback, withGracefulDegradation } from './fallback-chain';
export type {
  FallbackOptions,
  FallbackHealth,
  ChainResult,
  ChainHealthReport,
} from './fallback-chain';

export { chaos, withChaos, chaosify, ChaosErrors } from './chaos';
export type { ChaosConfig, ChaosEvent, ChaosEventHandler } from './chaos';

export {
  RequestCoalescer,
  getCoalescer,
  getAllCoalescerStats,
  clearCoalescerRegistry,
  createApiCoalescer,
  createDbCoalescer,
} from './coalescing';
export type { CoalescerConfig, CoalescerStats } from './coalescing';

export {
  PredictiveCircuit,
  getPredictiveCircuit,
  getAllPredictorStats,
  clearPredictorRegistry,
} from './predictive';
export type { MetricSample, PredictiveConfig, Prediction, PredictorStats } from './predictive';

// Re-export v1 essentials
export { Ok, Err, isOk, isErr } from '../result';
export type { Result } from '../result';
export {
  metrics,
  ConsoleExporter,
  PrometheusExporter,
  OpenTelemetryExporter,
  named,
  generateTraceId,
} from '../metrics';
export type {
  MetricsExporter,
  RetryMetricData,
  SuccessMetricData,
  FailureMetricData,
  CircuitMetricData,
} from '../metrics';

// ============================================================================
// UNIFIED RESILIENCE BUILDER
// ============================================================================

import { Result, Ok, Err, isErr } from '../result';
import { metrics, generateTraceId } from '../metrics';
import { AdaptiveBackoff, getAdaptiveBackoff, parseRetryAfter } from './adaptive-backoff';
import { hedge, HedgeConfig } from './hedging';
import { Bulkhead, getBulkhead, BulkheadConfig } from './bulkhead';
import { FallbackChain, FallbackOptions } from './fallback-chain';
import { chaos, ChaosConfig } from './chaos';
import { RequestCoalescer, getCoalescer, CoalescerConfig } from './coalescing';
import {
  PredictiveCircuit,
  getPredictiveCircuit,
  PredictiveConfig,
  Prediction,
} from './predictive';

export interface ResilienceConfig {
  retry?: {
    enabled?: boolean;
    maxAttempts?: number;
    adaptive?: boolean;
  };
  hedging?: {
    enabled?: boolean;
    delay?: number;
    maxHedges?: number;
  };
  bulkhead?: {
    enabled?: boolean;
    maxConcurrent?: number;
    maxQueued?: number;
  };
  fallbacks?: Array<{
    name: string;
    operation: () => unknown;
    options?: FallbackOptions;
  }>;
  coalescing?: {
    enabled?: boolean;
    cacheTtl?: number;
  };
  prediction?: {
    enabled?: boolean;
    config?: PredictiveConfig;
  };
  timeout?: number;
}

export interface ResilienceResult<T> {
  value: T;
  source: 'primary' | 'fallback' | 'cache' | 'hedge';
  elapsed: number;
  attempts: number;
  prediction?: Prediction;
  coalesced?: boolean;
  hedgeWinner?: number;
  traceId: string;
}

class ResilienceBuilder<T> {
  private name: string;
  private config: ResilienceConfig = {};
  private fallbackChain: FallbackChain<T> | null = null;

  constructor(name: string) {
    this.name = name;
  }

  withRetry(config: ResilienceConfig['retry'] = {}): this {
    this.config.retry = { enabled: true, maxAttempts: 3, adaptive: true, ...config };
    return this;
  }

  withHedging(config: Omit<ResilienceConfig['hedging'], 'enabled'> = {}): this {
    this.config.hedging = { enabled: true, delay: 100, maxHedges: 1, ...config };
    return this;
  }

  withBulkhead(config: Omit<ResilienceConfig['bulkhead'], 'enabled'> = {}): this {
    this.config.bulkhead = { enabled: true, maxConcurrent: 10, maxQueued: 100, ...config };
    return this;
  }

  withFallback(operation: () => T | Promise<T>, options?: FallbackOptions): this {
    if (!this.fallbackChain) {
      this.fallbackChain = new FallbackChain<T>(this.name);
    }
    this.fallbackChain.add(`fallback-${Date.now()}`, operation, options);
    return this;
  }

  withFallbackChain(chain: FallbackChain<T>): this {
    this.fallbackChain = chain;
    return this;
  }

  withCoalescing(config: Omit<ResilienceConfig['coalescing'], 'enabled'> = {}): this {
    this.config.coalescing = { enabled: true, cacheTtl: 5000, ...config };
    return this;
  }

  withPrediction(config?: PredictiveConfig): this {
    this.config.prediction = { enabled: true, config };
    return this;
  }

  withTimeout(ms: number): this {
    this.config.timeout = ms;
    return this;
  }

  build(): ResilienceExecutor<T> {
    return new ResilienceExecutor<T>(this.name, this.config, this.fallbackChain);
  }
}

class ResilienceExecutor<T> {
  private name: string;
  private config: ResilienceConfig;
  private fallbackChain: FallbackChain<T> | null;

  // Components (lazy initialized)
  private backoff?: AdaptiveBackoff;
  private bulkhead?: Bulkhead;
  private coalescer?: RequestCoalescer<T>;
  private predictor?: PredictiveCircuit;

  constructor(name: string, config: ResilienceConfig, fallbackChain: FallbackChain<T> | null) {
    this.name = name;
    this.config = config;
    this.fallbackChain = fallbackChain;

    // Initialize components
    if (config.retry?.adaptive) {
      this.backoff = getAdaptiveBackoff(name);
    }
    if (config.bulkhead?.enabled) {
      this.bulkhead = getBulkhead(name, {
        maxConcurrent: config.bulkhead.maxConcurrent,
        maxQueued: config.bulkhead.maxQueued,
      });
    }
    if (config.coalescing?.enabled) {
      this.coalescer = getCoalescer<T>(name, {
        cacheTtlMs: config.coalescing.cacheTtl,
      });
    }
    if (config.prediction?.enabled) {
      this.predictor = getPredictiveCircuit(name, config.prediction.config);
    }
  }

  async execute(
    operation: () => T | Promise<T>,
    options: { key?: string } = {}
  ): Promise<Result<ResilienceResult<T>, Error>> {
    const traceId = generateTraceId();
    const startTime = Date.now();

    // Check prediction first
    let prediction: Prediction | undefined;
    if (this.predictor) {
      prediction = this.predictor.predict();
      if (prediction.recommendation === 'CIRCUIT_OPEN') {
        return Err(
          new Error(
            `[${this.name}] Predictive circuit open [trace: ${traceId}]. Reasons: ${prediction.reasons.join(', ')}`
          )
        );
      }
    }

    // Apply chaos if enabled
    try {
      await chaos.apply(this.name);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }

    // Coalescing check
    if (this.coalescer && options.key) {
      const coalescedResult = await this.coalescer.execute(options.key, operation);
      if (coalescedResult.ok) {
        return Ok({
          value: coalescedResult.value,
          source: 'cache' as const,
          elapsed: Date.now() - startTime,
          attempts: 1,
          prediction,
          coalesced: true,
          traceId,
        });
      }
    }

    // Bulkhead check
    if (this.bulkhead) {
      if (this.bulkhead.isOverloaded()) {
        // Try fallback chain
        if (this.fallbackChain) {
          const fallbackResult = await this.fallbackChain.execute();
          if (fallbackResult.ok) {
            return Ok({
              value: fallbackResult.value.value,
              source: 'fallback' as const,
              elapsed: Date.now() - startTime,
              attempts: 1,
              prediction,
              traceId,
            });
          }
        }
        return Err(new Error(`[${this.name}] Bulkhead overloaded [trace: ${traceId}]`));
      }
    }

    // Main execution with retry
    const maxAttempts = this.config.retry?.maxAttempts ?? 1;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptStart = Date.now();

      try {
        let value: T;

        // Use hedging if configured
        if (this.config.hedging?.enabled) {
          const hedgeResult = await hedge(operation, {
            hedgeDelay: this.config.hedging.delay,
            maxHedges: this.config.hedging.maxHedges,
          });

          if (hedgeResult.ok) {
            const latency = Date.now() - attemptStart;

            // Record metrics for prediction
            if (this.predictor) {
              this.predictor.recordMetric({ latency, success: true });
            }
            if (this.backoff) {
              this.backoff.recordOutcome(true, latency, 0);
            }

            return Ok({
              value: hedgeResult.value.value,
              source: hedgeResult.value.winnerIndex > 0 ? ('hedge' as const) : ('primary' as const),
              elapsed: Date.now() - startTime,
              attempts: attempt,
              prediction,
              hedgeWinner: hedgeResult.value.winnerIndex,
              traceId,
            });
          }
          throw new Error('Hedge failed');
        }

        // Regular execution (with optional bulkhead)
        if (this.bulkhead) {
          const bulkheadResult = await this.bulkhead.execute(operation);
          if (!bulkheadResult.ok) {
            throw (bulkheadResult as { ok: false; error: Error }).error;
          }
          value = bulkheadResult.value;
        } else {
          // Apply timeout if configured
          if (this.config.timeout) {
            value = await this.withTimeout(operation, this.config.timeout);
          } else {
            value = await operation();
          }
        }

        const latency = Date.now() - attemptStart;

        // Record success
        if (this.predictor) {
          this.predictor.recordMetric({ latency, success: true });
        }
        if (this.backoff) {
          this.backoff.recordOutcome(true, latency, 0);
        }

        return Ok({
          value,
          source: 'primary' as const,
          elapsed: Date.now() - startTime,
          attempts: attempt,
          prediction,
          traceId,
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const latency = Date.now() - attemptStart;

        // Record failure
        if (this.predictor) {
          this.predictor.recordMetric({ latency, success: false });
        }
        if (this.backoff) {
          this.backoff.recordOutcome(false, latency, 0);
        }

        // Calculate delay for next attempt
        if (attempt < maxAttempts) {
          const delay = this.backoff?.getDelay(attempt) ?? 1000 * Math.pow(2, attempt - 1);
          await this.sleep(delay as number);
        }
      }
    }

    // All retries failed - try fallback chain
    if (this.fallbackChain) {
      const fallbackResult = await this.fallbackChain.execute();
      if (fallbackResult.ok) {
        return Ok({
          value: fallbackResult.value.value,
          source: 'fallback' as const,
          elapsed: Date.now() - startTime,
          attempts: maxAttempts,
          prediction,
          traceId,
        });
      }
    }

    return Err(
      new Error(
        `[${this.name}] All ${maxAttempts} attempts failed [trace: ${traceId}]: ${lastError?.message}`
      )
    );
  }

  private async withTimeout<R>(operation: () => R | Promise<R>, timeoutMs: number): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      Promise.resolve(operation())
        .then(value => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// DASHBOARD - Real-time System Health
// ============================================================================

export interface SystemHealth {
  timestamp: number;
  overall: 'healthy' | 'degraded' | 'critical';
  score: number; // 0-100
  components: {
    bulkheads: ReturnType<typeof getAllBulkheadStats>;
    coalescers: ReturnType<typeof getAllCoalescerStats>;
    predictors: ReturnType<typeof getAllPredictorStats>;
  };
  alerts: string[];
  recommendations: string[];
}

import { getAllBulkheadStats } from './bulkhead';
import { getAllCoalescerStats } from './coalescing';
import { getAllPredictorStats } from './predictive';

function getSystemHealth(): SystemHealth {
  const bulkheads = getAllBulkheadStats();
  const coalescers = getAllCoalescerStats();
  const predictors = getAllPredictorStats();

  const alerts: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check bulkheads
  for (const b of bulkheads) {
    if (b.isOverloaded) {
      alerts.push(`Bulkhead ${b.name} is OVERLOADED`);
      score -= 20;
    } else if (b.active > b.maxConcurrent * 0.8) {
      recommendations.push(`Bulkhead ${b.name} nearing capacity (${b.active}/${b.maxConcurrent})`);
      score -= 5;
    }
  }

  // Check predictors
  for (const p of predictors) {
    if (p.prediction.recommendation === 'CIRCUIT_OPEN') {
      alerts.push(`Predictor ${p.name}: CIRCUIT OPEN - ${p.prediction.reasons.join(', ')}`);
      score -= 30;
    } else if (p.prediction.recommendation === 'DEGRADE_NOW') {
      alerts.push(
        `Predictor ${p.name}: Degradation recommended - ${p.prediction.reasons.join(', ')}`
      );
      score -= 15;
    } else if (p.prediction.recommendation === 'WARN') {
      recommendations.push(`Predictor ${p.name}: Warning - ${p.prediction.reasons.join(', ')}`);
      score -= 5;
    }
  }

  // Check coalescers
  for (const c of coalescers) {
    if (c.dedupRatio > 0.5) {
      recommendations.push(
        `Coalescer ${c.name} has ${Math.round(c.dedupRatio * 100)}% dedup rate - consider caching`
      );
    }
  }

  score = Math.max(0, Math.min(100, score));

  let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (score < 50) overall = 'critical';
  else if (score < 80) overall = 'degraded';

  return {
    timestamp: Date.now(),
    overall,
    score,
    components: { bulkheads, coalescers, predictors },
    alerts,
    recommendations,
  };
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export const Resilience = {
  /**
   * Create a new resilience builder.
   */
  create<T>(name: string): ResilienceBuilder<T> {
    return new ResilienceBuilder<T>(name);
  },

  /**
   * Quick execute with default settings.
   */
  async execute<T>(
    name: string,
    operation: () => T | Promise<T>
  ): Promise<Result<ResilienceResult<T>, Error>> {
    return new ResilienceBuilder<T>(name)
      .withRetry({ adaptive: true })
      .withPrediction()
      .build()
      .execute(operation);
  },

  /**
   * Access to metrics system.
   */
  metrics,

  /**
   * Access to chaos engineering.
   */
  chaos,

  /**
   * System health dashboard.
   */
  dashboard: {
    getHealth: getSystemHealth,
  },
};

// Default export
export default Resilience;
