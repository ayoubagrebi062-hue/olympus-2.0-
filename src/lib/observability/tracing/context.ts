/**
 * WORLD-CLASS: Unified Observability Context
 *
 * One context to rule them all:
 * - Carries trace context + business context
 * - Auto-correlates logs with traces
 * - Smart sampling (always trace errors)
 * - Clean async propagation
 * - Self-diagnostics (tracing traces itself)
 * - Configurable span limits (prevents OOM)
 * - Pluggable logger backend
 *
 * Usage:
 *   await withObservability('build', { buildId, userId }, async (ctx) => {
 *     ctx.log.info('Starting');  // Auto-has trace_id, build_id
 *     await ctx.span('phase', async () => { ... });
 *   });
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { getTracer, isTracingEnabled } from './provider';
import { OlympusSpanKind } from './types';
import { createCorrelatedLogger, CorrelatedLogger } from './logger';
import {
  recordSpanCreated,
  recordSpanCompleted,
  recordSpanFailed,
  sanitizeSpanName,
  sanitizeAttributeValue,
  getSpanLimits,
} from './diagnostics';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface BusinessContext {
  buildId?: string;
  userId?: string;
  agentId?: string;
  phase?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ObservabilityContext {
  /** Current trace ID for correlation */
  traceId: string;
  /** Current span ID */
  spanId: string;
  /** Business context (buildId, userId, etc.) */
  business: BusinessContext;
  /** Correlated logger - every log has trace_id */
  log: CorrelatedLogger;
  /** Create a child span */
  span: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  /** Add event to current span */
  event: (name: string, attributes?: Record<string, unknown>) => void;
  /** Set attribute on current span */
  attr: (key: string, value: string | number | boolean) => void;
  /** Mark current operation as error (ensures it's traced even with sampling) */
  error: (err: Error) => void;
}

// CorrelatedLogger is imported from ./logger

export interface ObservabilityOptions {
  /** Span kind for categorization */
  kind?: OlympusSpanKind;
  /** Force trace this operation (bypass sampling) */
  forceTrace?: boolean;
  /** Initial attributes */
  attributes?: Record<string, string | number | boolean>;
}

// ═══════════════════════════════════════════════════════════════════════════
// SAMPLING STRATEGY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Smart sampling decisions:
 * - Errors: ALWAYS trace (100%)
 * - Slow operations: ALWAYS trace (>5s)
 * - Forced: ALWAYS trace
 * - Success: Sample based on config
 */
const SLOW_THRESHOLD_MS = 5000;

interface SamplingDecision {
  sampled: boolean;
  reason: 'error' | 'slow' | 'forced' | 'sampled' | 'dropped';
}

function shouldSample(
  hasError: boolean,
  durationMs: number,
  forced: boolean,
  samplingRatio: number
): SamplingDecision {
  if (hasError) return { sampled: true, reason: 'error' };
  if (durationMs > SLOW_THRESHOLD_MS) return { sampled: true, reason: 'slow' };
  if (forced) return { sampled: true, reason: 'forced' };
  if (Math.random() < samplingRatio) return { sampled: true, reason: 'sampled' };
  return { sampled: false, reason: 'dropped' };
}

// Correlated logger is now imported from ./logger with pluggable backends

// ═══════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * World-class unified observability wrapper
 *
 * @example
 * const result = await withObservability('build:myapp', { buildId: 'b1', userId: 'u1' }, async (ctx) => {
 *   ctx.log.info('Build started');
 *
 *   await ctx.span('phase:discovery', async () => {
 *     ctx.log.info('Discovering requirements');
 *     // work...
 *   });
 *
 *   return { success: true };
 * });
 */
export async function withObservability<T>(
  operationName: string,
  businessContext: BusinessContext,
  fn: (ctx: ObservabilityContext) => Promise<T>,
  options: ObservabilityOptions = {}
): Promise<T> {
  const tracer = getTracer();
  const enabled = isTracingEnabled();

  // Build attributes from business context
  const attributes: Record<string, string | number | boolean> = {
    'olympus.operation': operationName,
    ...options.attributes,
  };

  // Add business context as attributes
  for (const [key, value] of Object.entries(businessContext)) {
    if (value !== undefined) {
      attributes[`olympus.${key}`] = value;
    }
  }

  // If tracing disabled, still run with mock context for consistent API
  if (!enabled) {
    const mockCtx = createMockContext(businessContext);
    return fn(mockCtx);
  }

  const startTime = Date.now();
  let hasError = false;
  let capturedError: Error | undefined;

  // Sanitize operation name to prevent oversized spans
  const safeName = sanitizeSpanName(operationName);

  // Record span creation for diagnostics
  recordSpanCreated();

  return tracer.startActiveSpan(safeName, { attributes }, async (span: Span) => {
    const traceId = span.spanContext().traceId;
    const spanId = span.spanContext().spanId;

    const ctx: ObservabilityContext = {
      traceId,
      spanId,
      business: businessContext,
      log: createCorrelatedLogger(traceId, spanId, businessContext),

      span: async <R>(name: string, childFn: () => Promise<R>): Promise<R> => {
        const safeChildName = sanitizeSpanName(name);
        recordSpanCreated();
        const childStart = Date.now();

        return tracer.startActiveSpan(safeChildName, async (childSpan: Span) => {
          try {
            const result = await childFn();
            childSpan.setStatus({ code: SpanStatusCode.OK });
            recordSpanCompleted(Date.now() - childStart);
            return result;
          } catch (err) {
            hasError = true;
            recordSpanFailed();
            childSpan.setStatus({
              code: SpanStatusCode.ERROR,
              message: err instanceof Error ? err.message : 'Unknown error',
            });
            if (err instanceof Error) {
              childSpan.recordException(err);
            }
            throw err;
          } finally {
            childSpan.end();
          }
        });
      },

      event: (name: string, eventAttrs?: Record<string, unknown>) => {
        span.addEvent(name, eventAttrs as Record<string, string | number | boolean>);
      },

      attr: (key: string, value: string | number | boolean) => {
        span.setAttribute(key, sanitizeAttributeValue(value));
      },

      error: (err: Error) => {
        hasError = true;
        capturedError = err;
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      },
    };

    try {
      const result = await fn(ctx);

      const durationMs = Date.now() - startTime;
      span.setAttribute('olympus.duration_ms', durationMs);

      // Smart sampling decision (recorded for observability)
      const decision = shouldSample(hasError, durationMs, options.forceTrace ?? false, 1.0);
      span.setAttribute('olympus.sampling.decision', decision.reason);

      if (!hasError) {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      // Record completion for diagnostics
      recordSpanCompleted(durationMs);

      return result;
    } catch (err) {
      hasError = true;
      const durationMs = Date.now() - startTime;
      span.setAttribute('olympus.duration_ms', durationMs);
      span.setAttribute('olympus.sampling.decision', 'error');

      // Record failure for diagnostics
      recordSpanFailed();

      if (err instanceof Error) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      }
      throw err;
    } finally {
      span.end();
    }
  });
}

/**
 * Synchronous version for non-async operations
 */
export function withObservabilitySync<T>(
  operationName: string,
  businessContext: BusinessContext,
  fn: (ctx: ObservabilityContext) => T,
  options: ObservabilityOptions = {}
): T {
  const tracer = getTracer();
  const enabled = isTracingEnabled();

  if (!enabled) {
    const mockCtx = createMockContext(businessContext);
    return fn(mockCtx);
  }

  const attributes: Record<string, string | number | boolean> = {
    'olympus.operation': operationName,
    ...options.attributes,
  };

  for (const [key, value] of Object.entries(businessContext)) {
    if (value !== undefined) {
      attributes[`olympus.${key}`] = value;
    }
  }

  const span = tracer.startSpan(operationName, { attributes });
  const spanContext = span.spanContext();

  const ctx: ObservabilityContext = {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    business: businessContext,
    log: createCorrelatedLogger(spanContext.traceId, spanContext.spanId, businessContext),
    span: async () => {
      throw new Error('Use withObservability for async spans');
    },
    event: (name, eventAttrs) =>
      span.addEvent(name, eventAttrs as Record<string, string | number | boolean>),
    attr: (key, value) => span.setAttribute(key, value),
    error: err => {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    },
  };

  try {
    const result = fn(ctx);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    if (err instanceof Error) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    }
    throw err;
  } finally {
    span.end();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK CONTEXT (for when tracing is disabled)
// ═══════════════════════════════════════════════════════════════════════════

function createMockContext(business: BusinessContext): ObservabilityContext {
  const noopLogger: CorrelatedLogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  return {
    traceId: '0'.repeat(32),
    spanId: '0'.repeat(16),
    business,
    log: noopLogger,
    span: async <T>(_name: string, fn: () => Promise<T>) => fn(),
    event: () => {},
    attr: () => {},
    error: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE: Get current context (for deep call stacks)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get trace context from current async context
 * Useful for correlating logs in deeply nested functions
 */
export function getCurrentCorrelation(): { traceId: string; spanId: string } | null {
  const span = trace.getActiveSpan();
  if (!span) return null;

  const ctx = span.spanContext();
  return {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
  };
}
