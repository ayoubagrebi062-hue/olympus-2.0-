/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   REQUEST CONTEXT - The Backbone of Observability                             ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║   Every request carries context that flows through the entire pipeline:       ║
 * ║                                                                               ║
 * ║   ┌─────────────────────────────────────────────────────────────────────┐    ║
 * ║   │  REQUEST CONTEXT                                                    │    ║
 * ║   │  ├── traceId: "req_abc123"     → Correlate logs across services    │    ║
 * ║   │  ├── deadline: 1706012345678   → Auto-timeout, no hanging          │    ║
 * ║   │  ├── signal: AbortSignal       → Cancellation propagates           │    ║
 * ║   │  ├── metadata: { userId: "x" } → Business context for logs         │    ║
 * ║   │  └── attempt: 1                → Which retry is this?              │    ║
 * ║   └─────────────────────────────────────────────────────────────────────┘    ║
 * ║                                                                               ║
 * ║   Inspired by: Go's context.Context, gRPC deadlines, OpenTelemetry           ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { createError, VisionError, VisionErrorCode } from './result';

// ════════════════════════════════════════════════════════════════════════════════
// CONTEXT INTERFACE
// ════════════════════════════════════════════════════════════════════════════════

export interface RequestContext {
  /** Unique ID for tracing this request through the system */
  readonly traceId: string;

  /** Parent trace ID if this is a child operation */
  readonly parentTraceId?: string;

  /** Unix timestamp (ms) when this request should be considered timed out */
  readonly deadline?: number;

  /** Signal for cancellation */
  readonly signal?: AbortSignal;

  /** Which attempt is this? (1 = first, 2 = first retry, etc.) */
  readonly attempt: number;

  /** Arbitrary metadata that flows through the request */
  readonly metadata: Readonly<Record<string, unknown>>;

  /** When this context was created */
  readonly createdAt: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ════════════════════════════════════════════════════════════════════════════════

export interface ContextOptions {
  traceId?: string;
  parentTraceId?: string;
  timeoutMs?: number;
  deadline?: number;
  signal?: AbortSignal;
  attempt?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Create a new request context
 */
export function createContext(options: ContextOptions = {}): RequestContext {
  const now = Date.now();

  // Generate trace ID if not provided
  const traceId = options.traceId ?? generateTraceId();

  // Calculate deadline from timeout or use provided deadline
  let deadline: number | undefined;
  if (options.deadline) {
    deadline = options.deadline;
  } else if (options.timeoutMs) {
    deadline = now + options.timeoutMs;
  }

  return {
    traceId,
    parentTraceId: options.parentTraceId,
    deadline,
    signal: options.signal,
    attempt: options.attempt ?? 1,
    metadata: Object.freeze({ ...options.metadata }),
    createdAt: now,
  };
}

/**
 * Create a child context for sub-operations
 */
export function childContext(
  parent: RequestContext,
  options: Partial<ContextOptions> = {}
): RequestContext {
  return createContext({
    parentTraceId: parent.traceId,
    // Inherit deadline from parent unless overridden
    deadline:
      (options.deadline ?? options.timeoutMs)
        ? (options.deadline ?? (options.timeoutMs ? Date.now() + options.timeoutMs : undefined))
        : parent.deadline,
    signal: options.signal ?? parent.signal,
    attempt: options.attempt ?? parent.attempt,
    metadata: { ...parent.metadata, ...options.metadata },
  });
}

/**
 * Create a context for a retry attempt
 */
export function retryContext(parent: RequestContext): RequestContext {
  return createContext({
    parentTraceId: parent.parentTraceId,
    traceId: parent.traceId, // Keep same trace ID for retry correlation
    deadline: parent.deadline, // Keep original deadline
    signal: parent.signal,
    attempt: parent.attempt + 1,
    metadata: parent.metadata,
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// CONTEXT CHECKS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Check if the context has been cancelled or deadline exceeded
 */
export function isDone(ctx: RequestContext): boolean {
  if (ctx.signal?.aborted) {
    return true;
  }
  if (ctx.deadline && Date.now() > ctx.deadline) {
    return true;
  }
  return false;
}

/**
 * Get remaining time until deadline (ms), or undefined if no deadline
 */
export function remainingTime(ctx: RequestContext): number | undefined {
  if (!ctx.deadline) {
    return undefined;
  }
  return Math.max(0, ctx.deadline - Date.now());
}

/**
 * Check context and return error if done
 */
export function checkContext(ctx: RequestContext): VisionError | null {
  if (ctx.signal?.aborted) {
    return createError(VisionErrorCode.CANCELLED, 'Request was cancelled', {
      traceId: ctx.traceId,
    });
  }

  if (ctx.deadline && Date.now() > ctx.deadline) {
    return createError(
      VisionErrorCode.DEADLINE_EXCEEDED,
      `Request exceeded deadline (${ctx.deadline - ctx.createdAt}ms timeout)`,
      { traceId: ctx.traceId }
    );
  }

  return null;
}

/**
 * Throw if context is done - use sparingly, prefer checkContext
 */
export function assertNotDone(ctx: RequestContext): void {
  const error = checkContext(ctx);
  if (error) {
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// CONTEXT-AWARE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Run a promise with context deadline
 */
export async function withDeadline<T>(ctx: RequestContext, promise: Promise<T>): Promise<T> {
  const remaining = remainingTime(ctx);

  if (remaining === 0) {
    throw createError(VisionErrorCode.DEADLINE_EXCEEDED, 'Deadline already exceeded', {
      traceId: ctx.traceId,
    });
  }

  if (remaining === undefined) {
    // No deadline, just run the promise
    return promise;
  }

  // Race against timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(
        createError(
          VisionErrorCode.DEADLINE_EXCEEDED,
          `Request exceeded deadline (${ctx.deadline! - ctx.createdAt}ms timeout)`,
          { traceId: ctx.traceId }
        )
      );
    }, remaining);

    // Clean up timer if promise resolves first
    promise.finally(() => clearTimeout(timer));
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Create an AbortSignal that fires when context deadline is reached
 */
export function deadlineSignal(ctx: RequestContext): AbortSignal | undefined {
  const remaining = remainingTime(ctx);

  if (remaining === undefined) {
    return ctx.signal;
  }

  if (remaining === 0) {
    const controller = new AbortController();
    controller.abort();
    return controller.signal;
  }

  const controller = new AbortController();

  // Abort on timeout
  const timer = setTimeout(() => controller.abort(), remaining);

  // Also abort if parent signal aborts
  if (ctx.signal) {
    ctx.signal.addEventListener('abort', () => {
      clearTimeout(timer);
      controller.abort();
    });
  }

  // Return the combined signal
  return controller.signal;
}

// ════════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════════

let traceCounter = 0;

function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const counter = (traceCounter++).toString(36).padStart(4, '0');
  const random = Math.random().toString(36).substring(2, 8);
  return `vis_${timestamp}${counter}${random}`;
}

/**
 * Format context for logging
 */
export function formatContext(ctx: RequestContext): Record<string, unknown> {
  return {
    traceId: ctx.traceId,
    parentTraceId: ctx.parentTraceId,
    attempt: ctx.attempt,
    deadline: ctx.deadline,
    remainingMs: remainingTime(ctx),
    cancelled: ctx.signal?.aborted ?? false,
    ...ctx.metadata,
  };
}
