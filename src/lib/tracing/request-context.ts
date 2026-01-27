/**
 * OLYMPUS 2.1 - 10X UPGRADE: Request Context & Tracing
 *
 * Provides:
 * - Request correlation IDs
 * - Distributed tracing support
 * - Context propagation across async boundaries
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RequestContext {
  requestId: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  userId?: string;
  tenantId?: string;
  buildId?: string;
  startTime: number;
  metadata: Record<string, string>;
}

export interface Span {
  spanId: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error';
  attributes: Record<string, string | number | boolean>;
  events: Array<{ name: string; timestamp: number; attributes?: Record<string, unknown> }>;
}

// ============================================================================
// CONTEXT STORAGE (AsyncLocalStorage for Node.js)
// ============================================================================

type ContextStore = {
  context: RequestContext | null;
  spans: Span[];
};

let asyncLocalStorage: any = null;

// Initialize AsyncLocalStorage if available (Node.js 16+)
if (typeof window === 'undefined') {
  try {
    const { AsyncLocalStorage } = require('async_hooks');
    asyncLocalStorage = new AsyncLocalStorage();
  } catch {
    // Fallback for environments without async_hooks
  }
}

// Fallback for browsers or unsupported environments
let fallbackContext: ContextStore = { context: null, spans: [] };

// ============================================================================
// ID GENERATION
// ============================================================================

function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

export function generateRequestId(): string {
  return generateId('req');
}

export function generateTraceId(): string {
  // W3C Trace Context format: 32 hex characters
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

export function generateSpanId(): string {
  // W3C Trace Context format: 16 hex characters
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

// ============================================================================
// CONTEXT MANAGEMENT
// ============================================================================

function getStore(): ContextStore {
  if (asyncLocalStorage) {
    return asyncLocalStorage.getStore() || fallbackContext;
  }
  return fallbackContext;
}

/**
 * Create a new request context
 */
export function createContext(options?: Partial<RequestContext>): RequestContext {
  return {
    requestId: options?.requestId || generateRequestId(),
    traceId: options?.traceId || generateTraceId(),
    spanId: options?.spanId || generateSpanId(),
    parentSpanId: options?.parentSpanId,
    userId: options?.userId,
    tenantId: options?.tenantId,
    buildId: options?.buildId,
    startTime: options?.startTime || Date.now(),
    metadata: options?.metadata || {},
  };
}

/**
 * Run a function with a request context
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  const store: ContextStore = { context, spans: [] };

  if (asyncLocalStorage) {
    return asyncLocalStorage.run(store, fn);
  }

  // Fallback: set global context temporarily
  const previousContext = fallbackContext;
  fallbackContext = store;
  try {
    return fn();
  } finally {
    fallbackContext = previousContext;
  }
}

/**
 * Run an async function with a request context
 */
export async function runWithContextAsync<T>(
  context: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  const store: ContextStore = { context, spans: [] };

  if (asyncLocalStorage) {
    return asyncLocalStorage.run(store, fn);
  }

  // Fallback
  const previousContext = fallbackContext;
  fallbackContext = store;
  try {
    return await fn();
  } finally {
    fallbackContext = previousContext;
  }
}

/**
 * Get the current request context
 */
export function getContext(): RequestContext | null {
  return getStore().context;
}

/**
 * Get the current request ID
 */
export function getRequestId(): string | null {
  return getStore().context?.requestId || null;
}

/**
 * Get the current trace ID
 */
export function getTraceId(): string | null {
  return getStore().context?.traceId || null;
}

/**
 * Update the current context
 */
export function updateContext(updates: Partial<RequestContext>): void {
  const store = getStore();
  if (store.context) {
    Object.assign(store.context, updates);
  }
}

// ============================================================================
// SPAN MANAGEMENT (Basic Tracing)
// ============================================================================

/**
 * Start a new span
 */
export function startSpan(
  name: string,
  attributes?: Record<string, string | number | boolean>
): Span {
  const span: Span = {
    spanId: generateSpanId(),
    name,
    startTime: Date.now(),
    status: 'ok',
    attributes: attributes || {},
    events: [],
  };

  getStore().spans.push(span);
  return span;
}

/**
 * End a span
 */
export function endSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
  span.endTime = Date.now();
  span.duration = span.endTime - span.startTime;
  span.status = status;
}

/**
 * Add an event to a span
 */
export function addSpanEvent(span: Span, name: string, attributes?: Record<string, unknown>): void {
  span.events.push({
    name,
    timestamp: Date.now(),
    attributes,
  });
}

/**
 * Trace an async operation
 */
export async function trace<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const span = startSpan(name, attributes);
  try {
    const result = await fn();
    endSpan(span, 'ok');
    return result;
  } catch (error) {
    endSpan(span, 'error');
    throw error;
  }
}

/**
 * Get all spans for the current request
 */
export function getSpans(): Span[] {
  return [...getStore().spans];
}

// ============================================================================
// HTTP HEADER HELPERS
// ============================================================================

/**
 * Extract context from incoming HTTP headers
 */
export function extractContextFromHeaders(
  headers: Headers | Record<string, string>
): Partial<RequestContext> {
  const get = (key: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(key);
    }
    return headers[key] || headers[key.toLowerCase()] || null;
  };

  const context: Partial<RequestContext> = {};

  // Standard headers
  const requestId = get('x-request-id') || get('x-correlation-id');
  if (requestId) context.requestId = requestId;

  // W3C Trace Context
  const traceparent = get('traceparent');
  if (traceparent) {
    // Format: version-traceid-spanid-flags
    const parts = traceparent.split('-');
    if (parts.length >= 3) {
      context.traceId = parts[1];
      context.parentSpanId = parts[2];
    }
  }

  // Custom headers
  const userId = get('x-user-id');
  if (userId) context.userId = userId;

  const tenantId = get('x-tenant-id');
  if (tenantId) context.tenantId = tenantId;

  return context;
}

/**
 * Create headers for outgoing HTTP requests
 */
export function createContextHeaders(): Record<string, string> {
  const context = getContext();
  if (!context) return {};

  const headers: Record<string, string> = {
    'x-request-id': context.requestId,
  };

  if (context.traceId && context.spanId) {
    // W3C Trace Context format
    headers['traceparent'] = `00-${context.traceId}-${context.spanId}-01`;
  }

  if (context.userId) {
    headers['x-user-id'] = context.userId;
  }

  if (context.tenantId) {
    headers['x-tenant-id'] = context.tenantId;
  }

  return headers;
}

// ============================================================================
// MIDDLEWARE HELPER
// ============================================================================

/**
 * Create context from Next.js request
 */
export function createContextFromRequest(request: Request): RequestContext {
  const extracted = extractContextFromHeaders(request.headers);
  return createContext({
    ...extracted,
    metadata: {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent') || 'unknown',
    },
  });
}

export default {
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
};
