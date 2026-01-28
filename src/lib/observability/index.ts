/**
 * OLYMPUS 2.1 - 10X UPGRADE: Observability Module
 *
 * Production-ready observability including:
 * - Structured logging with correlation IDs
 * - Health checks with circuit breaker awareness
 * - Metrics collection (Prometheus-compatible)
 * - Performance timing utilities
 */

// Logging
export { logger, createBuildLogger, runWithRequestContext, getRequestContext } from './logger';
export type { LogLevel } from './logger';

// Health Checks
export {
  registerHealthCheck,
  unregisterHealthCheck,
  getSystemHealth,
  isAlive,
  isReady,
  createDatabaseHealthCheck,
  createRedisHealthCheck,
  createApiHealthCheck,
  createMemoryHealthCheck,
} from './health';
export type { HealthStatus, ComponentHealth, SystemHealth, HealthCheck } from './health';

// Metrics
export {
  registerCounter,
  registerGauge,
  registerHistogram,
  incCounter,
  setGauge,
  observeHistogram,
  timeAsync,
  timeSync,
  recordBuildStarted,
  recordBuildCompleted,
  recordAgentExecution,
  getPrometheusMetrics,
  getMetricsJson,
  resetMetrics,
} from './metrics';
export type { MetricType, MetricLabel } from './metrics';

// Tracing (OpenTelemetry)
export {
  // Initialization
  initOlympusTracing,
  shutdownOlympusTracing,
  isOlympusTracingInitialized,
  getRecommendedConfig,
  initTracing,
  shutdownTracing,
  isTracingEnabled,

  // OLYMPUS-specific tracers
  traceBuild,
  tracePhase,
  traceAgent,
  traceProviderCall,
  traceCheckpoint,
  traceRetry,
  traceValidation,
  traceHandoff,
  traceSession,

  // Recording helpers
  recordBuildMetrics,
  recordAgentTokens,
  recordProviderResponse,
  recordCircuitBreakerState,
  recordValidationSuccess,
  recordValidationFailure,
  recordSessionExpertise,

  // Low-level utilities
  withSpan,
  withSpanSync,
  startSpan,
  addSpanEvent,
  setSpanAttributes,
  setSpanAttribute,
  recordSpanError,
  getCurrentTraceId,
  getCurrentSpanId,
  extractTraceContext,
  injectTraceContext,
} from './tracing';
export type {
  TracingConfig,
  OlympusSpanAttributes,
  OlympusSpanKind,
  TraceContext,
} from './tracing';
