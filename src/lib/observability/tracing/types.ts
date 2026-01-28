/**
 * OpenTelemetry Tracing Types for OLYMPUS
 *
 * Defines trace context, span attributes, and configuration
 * for distributed tracing across the build system.
 */

/**
 * Trace context passed through the system
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
}

/**
 * Span attributes for OLYMPUS operations
 */
export interface OlympusSpanAttributes {
  // Build context
  'olympus.build.id'?: string;
  'olympus.build.name'?: string;
  'olympus.build.tier'?: string;
  'olympus.build.user_id'?: string;

  // Phase context
  'olympus.phase.name'?: string;
  'olympus.phase.index'?: number;
  'olympus.phase.total'?: number;

  // Agent context
  'olympus.agent.id'?: string;
  'olympus.agent.tier'?: string;
  'olympus.agent.dependencies'?: string;

  // AI Provider context
  'olympus.provider.name'?: string;
  'olympus.provider.model'?: string;
  'olympus.provider.tokens.input'?: number;
  'olympus.provider.tokens.output'?: number;
  'olympus.provider.cost'?: number;
  'olympus.provider.latency_ms'?: number;

  // Execution context
  'olympus.execution.retries'?: number;
  'olympus.execution.circuit_breaker'?: string;
  'olympus.execution.timeout_ms'?: number;

  // Error context
  'olympus.error.type'?: string;
  'olympus.error.message'?: string;
  'olympus.error.recoverable'?: boolean;

  // Session context
  'olympus.session.user_id'?: string;
  'olympus.session.expertise'?: string;
}

/**
 * Span kinds for OLYMPUS operations
 */
export type OlympusSpanKind =
  | 'build' // Root span for entire build
  | 'phase' // Span for a build phase
  | 'agent' // Span for agent execution
  | 'provider' // Span for AI provider call
  | 'tool' // Span for tool execution
  | 'checkpoint' // Span for checkpoint operations
  | 'validation' // Span for input/output validation
  | 'retry' // Span for retry attempts
  | 'handoff' // Span for agent handoffs
  | 'session'; // Span for session operations

/**
 * Exporter configuration
 */
export interface TracingConfig {
  /** Enable/disable tracing */
  enabled: boolean;

  /** Service name for traces */
  serviceName: string;

  /** Service version */
  serviceVersion: string;

  /** Deployment environment */
  environment: 'development' | 'staging' | 'production';

  /** Exporter type */
  exporter: 'console' | 'otlp' | 'none';

  /** Exporter endpoint (for OTLP) */
  exporterEndpoint?: string;

  /** Sampling ratio (0-1, 1 = trace everything) */
  samplingRatio: number;

  /** Add cognitive session data to spans */
  enrichWithCognitive: boolean;

  /** Batch span processor config */
  batchConfig?: {
    maxQueueSize?: number;
    maxExportBatchSize?: number;
    scheduledDelayMillis?: number;
  };
}

/**
 * Default configuration
 */
export const DEFAULT_TRACING_CONFIG: TracingConfig = {
  enabled: process.env.TRACING_ENABLED === 'true',
  serviceName: 'olympus',
  serviceVersion: process.env.npm_package_version || '2.0.0',
  environment: (process.env.NODE_ENV as TracingConfig['environment']) || 'development',
  exporter: (process.env.TRACING_EXPORTER as TracingConfig['exporter']) || 'console',
  exporterEndpoint: process.env.TRACING_ENDPOINT || 'http://localhost:4318/v1/traces',
  samplingRatio: parseFloat(process.env.TRACING_SAMPLE_RATIO || '1.0'),
  enrichWithCognitive: process.env.TRACING_COGNITIVE === 'true',
  batchConfig: {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
  },
};

/**
 * Span event names used in OLYMPUS
 */
export const SPAN_EVENTS = {
  // Build events
  BUILD_STARTED: 'build.started',
  BUILD_COMPLETED: 'build.completed',
  BUILD_FAILED: 'build.failed',

  // Phase events
  PHASE_STARTED: 'phase.started',
  PHASE_COMPLETED: 'phase.completed',
  PHASE_FAILED: 'phase.failed',

  // Agent events
  AGENT_STARTED: 'agent.started',
  AGENT_COMPLETED: 'agent.completed',
  AGENT_FAILED: 'agent.failed',
  AGENT_TOKENS: 'agent.tokens',

  // Provider events
  PROVIDER_REQUEST: 'provider.request',
  PROVIDER_RESPONSE: 'provider.response',
  PROVIDER_ERROR: 'provider.error',
  PROVIDER_METRICS: 'provider.metrics',

  // Checkpoint events
  CHECKPOINT_SAVE: 'checkpoint.save',
  CHECKPOINT_LOAD: 'checkpoint.load',
  CHECKPOINT_VERIFY: 'checkpoint.verify',

  // Validation events
  VALIDATION_PASSED: 'validation.passed',
  VALIDATION_FAILED: 'validation.failed',

  // Circuit breaker events
  CIRCUIT_BREAKER_STATE: 'circuit_breaker.state',

  // Retry events
  RETRY_STARTED: 'retry.started',
  RETRY_SUCCEEDED: 'retry.succeeded',
  RETRY_EXHAUSTED: 'retry.exhausted',
} as const;
