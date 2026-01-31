/**
 * OLYMPUS 10X - Core Module
 *
 * Public exports for the core foundation.
 *
 * Usage:
 * ```typescript
 * import {
 *   OperationalContext,
 *   CONSTANTS,
 *   OlympusError,
 *   getConfig,
 *   log,
 *   metrics,
 *   events,
 * } from '@/lib/core';
 * ```
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export {
  CONSTANTS,
  TIMEOUTS,
  LIMITS,
  THRESHOLDS,
  RETRY,
  GUARDRAIL_PATTERNS,
  EVENT_TYPES,
  HTTP_STATUS,
  GUARDRAIL_LAYERS,
} from './constants';

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Branded types
  RequestId,
  TraceId,
  SpanId,
  AgentId,
  BuildId,
  TenantId,
  IdempotencyKey,

  // Guardrail types
  GuardrailAction,
  GuardrailLayer,
  GuardrailResult,
  GuardrailInput,
  TripwireConfig,

  // Handoff types
  HandoffConfig,
  HandoffCallbacks,
  HandoffContext,
  HandoffMessage,
  HandoffDecision,
  HandoffResult,
  HandoffError,

  // MCP types
  MCPTransport,
  MCPServerConfig,
  MCPTool,
  MCPToolResult,
  UnifiedTool,

  // Context types
  DegradationLevel,
  DegradationStrategy,
  OperationalContextOptions,
  IdempotencyCheckResult,

  // Common types
  Result,
  AsyncResult,
  EventCallback,
  Unsubscribe,
} from './types';

// Type creators
export {
  createRequestId,
  createTraceId,
  createSpanId,
  createAgentId,
  createBuildId,
  createTenantId,
  createIdempotencyKey,
} from './types';

// ============================================================================
// ERRORS
// ============================================================================

export {
  ERROR_CODES,
  OlympusError,

  // Guardrail errors
  GuardrailBlockedError,
  GuardrailSecurityError,
  GuardrailInputTooLargeError,
  GuardrailTimeoutError,

  // Handoff errors
  HandoffChainDepthError,
  HandoffCircuitOpenError,
  HandoffTargetUnavailableError,
  HandoffDecisionError,

  // MCP errors
  MCPConnectionError,
  MCPToolNotFoundError,
  MCPToolExecutionError,
  MCPTimeoutError,

  // Context errors
  ContextNotFoundError,
  IdempotencyConflictError,
  BaggageTooLargeError,

  // Utilities
  createOlympusError,
  isOlympusError,
  isRetryable,
  getErrorCode,
} from './errors';

export type { ErrorCode } from './errors';

// ============================================================================
// OBSERVABILITY
// ============================================================================

export {
  // Singletons
  getMetrics,
  getLogger,
  getEvents,

  // Quick access
  metrics,
  log,
  events,

  // Tracing
  createSpan,
  finishSpan,
  traceOperation,
  withTrace,

  // Reset (testing)
  resetObservability,
} from './observability';

export type {
  Metric,
  MetricAggregation,
  LogLevel,
  LogEntry,
  ObservabilityEvent,
  TraceOptions,
} from './observability';

// ============================================================================
// OPERATIONAL CONTEXT
// ============================================================================

export {
  OperationalContext,
  createContextFromHeaders,
  getCurrentContext,
} from './operational-context';

// ============================================================================
// CONFIGURATION
// ============================================================================

export {
  getConfig,
  setConfig,
  resetConfig,
  getGuardrailConfig,
  getHandoffConfig,
  getMCPConfig,
  getContextConfig,
  getObservabilityConfig,
  defaultConfig,
} from './config';

export type {
  OlympusConfig,
  GuardrailConfig,
  HandoffConfig as HandoffModuleConfig,
  MCPConfig,
  ContextConfig,
  ObservabilityConfig,
} from './config';

// ============================================================================
// SAFE JSON UTILITIES (FIX 3.2)
// ============================================================================

export {
  safeJsonParse,
  safeJsonParseResult,
  isValidJson,
  safeJsonStringify,
  DANGEROUS_KEYS,
} from './safe-json';
