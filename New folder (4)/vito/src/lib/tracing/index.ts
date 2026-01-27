/**
 * OLYMPUS 2.1 - 10X UPGRADE: Tracing Module
 *
 * Request context and distributed tracing support
 */

export {
  createContext,
  runWithContext,
  runWithContextAsync,
  getContext,
  getRequestId,
  getTraceId,
  updateContext,
  startSpan,
  endSpan,
  addSpanEvent,
  trace,
  getSpans,
  extractContextFromHeaders,
  createContextHeaders,
  createContextFromRequest,
  generateRequestId,
  generateTraceId,
  generateSpanId,
} from './request-context';

export type {
  RequestContext,
  Span,
} from './request-context';
