/**
 * OpenTelemetry Tracing Utilities
 *
 * Low-level utilities for creating and managing spans.
 * Use olympus-tracer.ts for OLYMPUS-specific tracing.
 */

import {
  trace,
  context,
  Span,
  SpanKind,
  SpanStatusCode,
  Context,
  propagation,
  Attributes,
} from '@opentelemetry/api';
import { OlympusSpanAttributes, OlympusSpanKind } from './types';
import { getTracer, isTracingEnabled } from './provider';

/**
 * Map OLYMPUS span kinds to OpenTelemetry span kinds
 */
function mapSpanKind(kind: OlympusSpanKind): SpanKind {
  switch (kind) {
    case 'provider':
      return SpanKind.CLIENT; // External service call
    case 'build':
    case 'phase':
    case 'agent':
    case 'tool':
    case 'checkpoint':
    case 'validation':
    case 'retry':
    case 'handoff':
    case 'session':
    default:
      return SpanKind.INTERNAL;
  }
}

/**
 * Start a new span
 */
export function startSpan(
  name: string,
  kind: OlympusSpanKind,
  attributes?: OlympusSpanAttributes,
  parentContext?: Context
): Span {
  const tracer = getTracer();
  const ctx = parentContext || context.active();

  const span = tracer.startSpan(
    name,
    {
      kind: mapSpanKind(kind),
      attributes: attributes as Attributes,
    },
    ctx
  );

  return span;
}

/**
 * Execute an async function within a span
 */
export async function withSpan<T>(
  name: string,
  kind: OlympusSpanKind,
  fn: (span: Span) => Promise<T>,
  attributes?: OlympusSpanAttributes
): Promise<T> {
  // Fast path if tracing disabled
  if (!isTracingEnabled()) {
    const noopSpan = trace.getTracer('noop').startSpan('noop');
    try {
      return await fn(noopSpan);
    } finally {
      noopSpan.end();
    }
  }

  const span = startSpan(name, kind, attributes);

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Execute a sync function within a span
 */
export function withSpanSync<T>(
  name: string,
  kind: OlympusSpanKind,
  fn: (span: Span) => T,
  attributes?: OlympusSpanAttributes
): T {
  // Fast path if tracing disabled
  if (!isTracingEnabled()) {
    const noopSpan = trace.getTracer('noop').startSpan('noop');
    try {
      return fn(noopSpan);
    } finally {
      noopSpan.end();
    }
  }

  const span = startSpan(name, kind, attributes);

  try {
    const result = fn(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add event to current span
 */
export function addSpanEvent(
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Set attributes on current span
 */
export function setSpanAttributes(attributes: OlympusSpanAttributes): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes as Attributes);
  }
}

/**
 * Set a single attribute on current span
 */
export function setSpanAttribute(key: string, value: string | number | boolean): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute(key, value);
  }
}

/**
 * Record an error on current span
 */
export function recordSpanError(error: Error, attributes?: Record<string, string>): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    if (attributes) {
      span.setAttributes(attributes);
    }
  }
}

/**
 * Mark current span as OK
 */
export function setSpanOk(message?: string): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setStatus({ code: SpanStatusCode.OK, message });
  }
}

/**
 * Extract trace context for propagation (e.g., to external services)
 */
export function extractTraceContext(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

/**
 * Inject trace context from headers (e.g., from incoming request)
 */
export function injectTraceContext(carrier: Record<string, string>): Context {
  return propagation.extract(context.active(), carrier);
}

/**
 * Get current trace ID
 */
export function getCurrentTraceId(): string | undefined {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId;
  // Return undefined if it's all zeros (no active trace)
  return traceId && traceId !== '00000000000000000000000000000000' ? traceId : undefined;
}

/**
 * Get current span ID
 */
export function getCurrentSpanId(): string | undefined {
  const span = trace.getActiveSpan();
  const spanId = span?.spanContext().spanId;
  return spanId && spanId !== '0000000000000000' ? spanId : undefined;
}

/**
 * Get current span (if any)
 */
export function getActiveSpan(): Span | undefined {
  return trace.getActiveSpan();
}

/**
 * Create a linked span (for async relationships)
 */
export function createLinkedSpan(
  name: string,
  kind: OlympusSpanKind,
  linkedSpanContext: { traceId: string; spanId: string },
  attributes?: OlympusSpanAttributes
): Span {
  const tracer = getTracer();

  return tracer.startSpan(name, {
    kind: mapSpanKind(kind),
    attributes: attributes as Attributes,
    links: [
      {
        context: {
          traceId: linkedSpanContext.traceId,
          spanId: linkedSpanContext.spanId,
          traceFlags: 1, // Sampled
        },
      },
    ],
  });
}
