/**
 * OpenTelemetry Tracing for OLYMPUS
 *
 * Provides distributed tracing across the entire build system.
 * Visualize build flows, identify bottlenecks, debug failures.
 *
 * @example
 * // Initialize at app startup
 * import { initOlympusTracing } from '@/lib/observability/tracing';
 * initOlympusTracing();
 *
 * // Trace a build
 * import { traceBuild, tracePhase, traceAgent } from '@/lib/observability/tracing';
 * await traceBuild(buildId, name, userId, tier, async (span) => {
 *   await tracePhase('discovery', 0, 5, buildId, async () => {
 *     await traceAgent('oracle', 'opus', buildId, [], async () => {
 *       // Agent execution...
 *     });
 *   });
 * });
 */

// Types
export * from './types';

// Provider
export {
  initTracing,
  shutdownTracing,
  getTracer,
  getCurrentContext,
  isTracingEnabled,
  getTracingConfig,
} from './provider';

// Low-level utilities
export {
  startSpan,
  withSpan,
  withSpanSync,
  addSpanEvent,
  setSpanAttributes,
  setSpanAttribute,
  recordSpanError,
  setSpanOk,
  extractTraceContext,
  injectTraceContext,
  getCurrentTraceId,
  getCurrentSpanId,
  getActiveSpan,
  createLinkedSpan,
} from './utils';

// OLYMPUS-specific tracers
export {
  // Build tracing
  traceBuild,
  recordBuildMetrics,

  // Phase tracing
  tracePhase,

  // Agent tracing
  traceAgent,
  recordAgentTokens,

  // Provider tracing
  traceProviderCall,
  recordProviderResponse,

  // Retry/error tracing
  traceRetry,
  recordCircuitBreakerState,

  // Checkpoint tracing
  traceCheckpoint,

  // Validation tracing
  traceValidation,
  recordValidationSuccess,
  recordValidationFailure,

  // Handoff tracing
  traceHandoff,

  // Session tracing
  traceSession,
  recordSessionExpertise,
} from './olympus-tracer';

// Initialization
export {
  initOlympusTracing,
  shutdownOlympusTracing,
  isOlympusTracingInitialized,
  getRecommendedConfig,
} from './init';

// WORLD-CLASS: Unified Observability Context
export { withObservability, withObservabilitySync, getCurrentCorrelation } from './context';
export type { ObservabilityContext, BusinessContext, ObservabilityOptions } from './context';

// Pluggable Logger
export {
  setLoggerBackend,
  getLoggerBackend,
  createCorrelatedLogger,
  jsonConsoleBackend,
  prettyConsoleBackend,
  silentBackend,
  wrapLogger,
} from './logger';
export type { LoggerBackend, LogEntry, LogContext, CorrelatedLogger } from './logger';

// Self-Diagnostics
export {
  getTracingMetrics,
  getTracingHealth,
  resetTracingMetrics,
  setSpanLimits,
  getSpanLimits,
  DEFAULT_SPAN_LIMITS,
} from './diagnostics';
export type { TracingHealth, TracingHealthStatus, SpanLimits } from './diagnostics';
