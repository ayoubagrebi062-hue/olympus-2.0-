/**
 * OLYMPUS Self-Healing SDK
 *
 * ## 30-Second Quick Start (Copy & Paste)
 *
 * ```typescript
 * import { retry } from '@olympus/recovery';
 *
 * // That's it. This retries 3 times with exponential backoff:
 * const users = await retry(() => fetch('/api/users'));
 *
 * // With options:
 * const data = await retry(() => fetchData(), { attempts: 5, delay: 1000 });
 *
 * // Combine naturally:
 * const user = await retry(() => getUser(id));
 * const posts = await retry(() => getPosts(user.id));
 * ```
 *
 * ## Need More Control?
 *
 * ```typescript
 * import { SelfHealing } from '@olympus/recovery';
 *
 * const resilient = SelfHealing.create<Response>()
 *   .withStrategy('exponential')
 *   .withTimeout(5000)
 *   .withCircuitBreaker({ threshold: 5 })
 *   .build();
 *
 * const result = await resilient.execute(() => fetch('/api'));
 * if (result.ok) {
 *   console.log(result.value.value);      // Your data
 *   console.log(result.value.attempts);   // How many tries
 * }
 * ```
 *
 * @see ./sdk/ARCHITECTURE.md for full documentation
 * @packageDocumentation
 */

// =============================================================================
// SIMPLE API (Start here - just works)
// =============================================================================
export { retry, timeout, fallback } from './sdk/primitives';

// =============================================================================
// OBSERVABILITY (Production-grade metrics)
// =============================================================================
export {
  metrics,
  named,
  ConsoleExporter,
  PrometheusExporter,
  OpenTelemetryExporter,
} from './sdk/metrics';
export type { MetricsExporter, MetricLabels } from './sdk/metrics';

// =============================================================================
// ADVANCED API (When you need more control)
// =============================================================================
export { SelfHealing } from './sdk/self-healing';
export { withRetry, withFallback, withTimeout, withCircuitBreaker } from './sdk/primitives';
export { Ok, Err, isOk, isErr } from './sdk/result';
export type { Result } from './sdk/result';
export { Milliseconds } from './sdk/types';
export type {
  SelfHealingConfig,
  RetryStrategy,
  CircuitBreakerConfig,
  RecoveryResult,
  RecoveryError,
  RecoveryErrorCode,
} from './sdk/types';

// Re-export legacy engine for backwards compatibility
export { SelfHealingEngine, selfHealingEngine } from './self-healing-engine';
