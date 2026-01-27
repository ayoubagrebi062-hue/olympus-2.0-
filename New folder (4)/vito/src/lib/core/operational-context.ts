/**
 * OLYMPUS 10X - Operational Context
 *
 * Higher-level context that wraps RequestContext and adds:
 * - Idempotency support
 * - Graceful degradation
 * - Baggage propagation
 * - Child context creation
 */

import {
  createContext as createRequestContext,
  runWithContextAsync,
  getContext as getRequestContext,
  type RequestContext,
} from '@/lib/tracing/request-context';
import { LIMITS, TIMEOUTS, EVENT_TYPES } from './constants';
import { BaggageTooLargeError, ContextNotFoundError, IdempotencyConflictError } from './errors';
import { log, metrics, events, traceOperation } from './observability';
import {
  createRequestId,
  createTraceId,
  createSpanId,
  type RequestId,
  type TraceId,
  type SpanId,
  type TenantId,
  type BuildId,
  type IdempotencyKey,
  type DegradationLevel,
  type DegradationStrategy,
  type OperationalContextOptions,
  type IdempotencyCheckResult,
} from './types';

// ============================================================================
// IDEMPOTENCY CACHE (In-Memory - Replace with Redis in production)
// ============================================================================

interface CachedResult {
  result: unknown;
  cachedAt: Date;
  expiresAt: Date;
}

const idempotencyCache = new Map<string, CachedResult>();

// Periodic cleanup
setInterval(() => {
  const now = new Date();
  for (const [key, value] of idempotencyCache) {
    if (value.expiresAt < now) {
      idempotencyCache.delete(key);
    }
  }
}, 60_000); // Every minute

// ============================================================================
// OPERATIONAL CONTEXT CLASS
// ============================================================================

export class OperationalContext {
  /** Unique request identifier */
  readonly requestId: RequestId;

  /** Distributed trace identifier */
  readonly traceId: TraceId;

  /** Current span identifier */
  readonly spanId: SpanId;

  /** Parent span identifier (if child context) */
  readonly parentSpanId?: SpanId;

  /** User identifier */
  readonly userId?: string;

  /** Tenant identifier */
  readonly tenantId?: TenantId;

  /** Build identifier */
  readonly buildId?: BuildId;

  /** Idempotency key for deduplication */
  readonly idempotencyKey?: IdempotencyKey;

  /** Request start time */
  readonly startTime: number;

  /** Current degradation level */
  private _degradationLevel: DegradationLevel = 'none';

  /** Baggage - context propagated across services */
  private _baggage: Map<string, unknown>;

  /** Metadata for logging/tracing */
  private _metadata: Record<string, string>;

  /** Underlying request context */
  private _requestContext: RequestContext;

  constructor(options: OperationalContextOptions = {}) {
    this.requestId = options.requestId || createRequestId();
    this.traceId = options.traceId || createTraceId();
    this.spanId = options.spanId || createSpanId();
    this.parentSpanId = options.parentSpanId;
    this.userId = options.userId;
    this.tenantId = options.tenantId;
    this.buildId = options.buildId;
    this.idempotencyKey = options.idempotencyKey;
    this.startTime = Date.now();
    this._baggage = options.baggage || new Map();
    this._metadata = options.metadata || {};

    // Create underlying request context
    this._requestContext = createRequestContext({
      requestId: this.requestId as string,
      traceId: this.traceId as string,
      spanId: this.spanId as string,
      parentSpanId: this.parentSpanId as string | undefined,
      userId: this.userId,
      tenantId: this.tenantId as string | undefined,
      buildId: this.buildId as string | undefined,
      metadata: this._metadata,
    });

    // Emit context created event
    events.emit(EVENT_TYPES.CONTEXT_CREATED, {
      requestId: this.requestId,
      traceId: this.traceId,
      tenantId: this.tenantId,
    });

    log.debug('OperationalContext created', {
      requestId: this.requestId,
      traceId: this.traceId,
    });
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  get degradationLevel(): DegradationLevel {
    return this._degradationLevel;
  }

  get requestContext(): RequestContext {
    return this._requestContext;
  }

  get duration(): number {
    return Date.now() - this.startTime;
  }

  // ==========================================================================
  // BAGGAGE MANAGEMENT
  // ==========================================================================

  /**
   * Set a baggage value.
   * @throws BaggageTooLargeError if baggage exceeds size limit
   */
  setBaggage(key: string, value: unknown): void {
    this._baggage.set(key, value);

    // Check size limit
    const size = this.calculateBaggageSize();
    if (size > LIMITS.MAX_BAGGAGE_SIZE_BYTES) {
      this._baggage.delete(key);
      throw new BaggageTooLargeError(size, LIMITS.MAX_BAGGAGE_SIZE_BYTES);
    }
  }

  /**
   * Get a baggage value.
   */
  getBaggage<T = unknown>(key: string): T | undefined {
    return this._baggage.get(key) as T | undefined;
  }

  /**
   * Delete a baggage value.
   */
  deleteBaggage(key: string): boolean {
    return this._baggage.delete(key);
  }

  /**
   * Get all baggage.
   */
  getAllBaggage(): Map<string, unknown> {
    return new Map(this._baggage);
  }

  private calculateBaggageSize(): number {
    try {
      return JSON.stringify(Array.from(this._baggage.entries())).length;
    } catch {
      return 0;
    }
  }

  // ==========================================================================
  // METADATA MANAGEMENT
  // ==========================================================================

  /**
   * Set metadata value.
   */
  setMetadata(key: string, value: string): void {
    this._metadata[key] = value;
  }

  /**
   * Get metadata value.
   */
  getMetadata(key: string): string | undefined {
    return this._metadata[key];
  }

  /**
   * Get all metadata.
   */
  getAllMetadata(): Record<string, string> {
    return { ...this._metadata };
  }

  // ==========================================================================
  // IDEMPOTENCY
  // ==========================================================================

  /**
   * Check if this request has a cached result.
   */
  async checkIdempotency(): Promise<IdempotencyCheckResult> {
    if (!this.idempotencyKey) {
      return { cached: false };
    }

    const cached = idempotencyCache.get(this.idempotencyKey);
    if (!cached || cached.expiresAt < new Date()) {
      return { cached: false };
    }

    log.info('Idempotency cache hit', { key: this.idempotencyKey });
    metrics.count('idempotency.cache_hit', 1, { tenantId: this.tenantId as string || 'unknown' });

    return {
      cached: true,
      result: cached.result,
      cachedAt: cached.cachedAt,
    };
  }

  /**
   * Save result for idempotency.
   */
  async saveForIdempotency(result: unknown): Promise<void> {
    if (!this.idempotencyKey) return;

    const now = new Date();
    idempotencyCache.set(this.idempotencyKey, {
      result,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + TIMEOUTS.IDEMPOTENCY_TTL_MS),
    });

    log.debug('Saved for idempotency', { key: this.idempotencyKey });
  }

  // ==========================================================================
  // GRACEFUL DEGRADATION
  // ==========================================================================

  /**
   * Execute with graceful degradation support.
   */
  async executeWithDegradation<T>(
    primaryAction: () => Promise<T>,
    strategies: DegradationStrategy[]
  ): Promise<T> {
    try {
      return await primaryAction();
    } catch (error) {
      // Find applicable strategy
      for (const strategy of strategies) {
        if (strategy.triggeredBy(error)) {
          this._degradationLevel = strategy.degradationLevel;

          log.warn('Degradation triggered', {
            level: strategy.degradationLevel,
            error: error instanceof Error ? error.message : String(error),
          });

          events.emit(EVENT_TYPES.CONTEXT_DEGRADED, {
            requestId: this.requestId,
            level: strategy.degradationLevel,
          });

          metrics.count('degradation.triggered', 1, {
            level: strategy.degradationLevel,
            tenantId: this.tenantId as string || 'unknown',
          });

          return strategy.fallbackAction() as Promise<T>;
        }
      }

      // No strategy matched, rethrow
      throw error;
    }
  }

  /**
   * Check if operating in degraded mode.
   */
  isDegraded(): boolean {
    return this._degradationLevel !== 'none';
  }

  // ==========================================================================
  // CHILD CONTEXT
  // ==========================================================================

  /**
   * Create a child context for nested operations.
   * Preserves trace ID, creates new span ID.
   */
  createChildContext(operation: string): OperationalContext {
    const childContext = new OperationalContext({
      traceId: this.traceId,
      parentSpanId: this.spanId,
      userId: this.userId,
      tenantId: this.tenantId,
      buildId: this.buildId,
      baggage: new Map(this._baggage),
      metadata: {
        ...this._metadata,
        parentOperation: operation,
      },
    });

    log.debug('Child context created', {
      parentRequestId: this.requestId,
      childRequestId: childContext.requestId,
      operation,
    });

    return childContext;
  }

  // ==========================================================================
  // TRACING INTEGRATION
  // ==========================================================================

  /**
   * Trace an operation within this context.
   */
  async trace<T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await runWithContextAsync(this._requestContext, () =>
        traceOperation(name, fn, attributes)
      );

      metrics.duration(`trace.${name}`, Date.now() - startTime, {
        status: 'success',
        tenantId: this.tenantId as string || 'unknown',
      });

      return result;
    } catch (error) {
      metrics.duration(`trace.${name}`, Date.now() - startTime, {
        status: 'error',
        tenantId: this.tenantId as string || 'unknown',
      });
      throw error;
    }
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  /**
   * Mark context as complete. Records metrics.
   */
  complete(status: 'success' | 'error' | 'timeout' = 'success'): void {
    const duration = this.duration;

    events.emit(EVENT_TYPES.CONTEXT_COMPLETED, {
      requestId: this.requestId,
      traceId: this.traceId,
      status,
      duration,
      degradationLevel: this._degradationLevel,
    });

    metrics.duration('context.duration', duration, {
      status,
      degradationLevel: this._degradationLevel,
      tenantId: this.tenantId as string || 'unknown',
    });

    log.info('Context completed', {
      requestId: this.requestId,
      status,
      duration,
    });
  }

  // ==========================================================================
  // SERIALIZATION
  // ==========================================================================

  /**
   * Convert to JSON for logging/transmission.
   */
  toJSON(): Record<string, unknown> {
    return {
      requestId: this.requestId,
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      userId: this.userId,
      tenantId: this.tenantId,
      buildId: this.buildId,
      idempotencyKey: this.idempotencyKey,
      startTime: this.startTime,
      duration: this.duration,
      degradationLevel: this._degradationLevel,
      metadata: this._metadata,
      baggage: Object.fromEntries(this._baggage),
    };
  }

  /**
   * Create headers for HTTP propagation.
   */
  toHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'x-request-id': this.requestId,
    };

    if (this.traceId && this.spanId) {
      headers['traceparent'] = `00-${this.traceId}-${this.spanId}-01`;
    }

    if (this.userId) {
      headers['x-user-id'] = this.userId;
    }

    if (this.tenantId) {
      headers['x-tenant-id'] = this.tenantId;
    }

    if (this.idempotencyKey) {
      headers['idempotency-key'] = this.idempotencyKey;
    }

    return headers;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create context from HTTP headers.
 */
export function createContextFromHeaders(headers: Headers | Record<string, string>): OperationalContext {
  const get = (key: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(key);
    }
    return headers[key] || headers[key.toLowerCase()] || null;
  };

  const options: OperationalContextOptions = {};

  // Request ID
  const requestId = get('x-request-id') || get('x-correlation-id');
  if (requestId) options.requestId = createRequestId(requestId);

  // W3C Trace Context
  const traceparent = get('traceparent');
  if (traceparent) {
    const parts = traceparent.split('-');
    if (parts.length >= 3) {
      options.traceId = createTraceId(parts[1]);
      options.parentSpanId = createSpanId(parts[2]);
    }
  }

  // User/Tenant
  const userId = get('x-user-id');
  if (userId) options.userId = userId;

  const tenantId = get('x-tenant-id');
  if (tenantId) options.tenantId = tenantId as TenantId;

  // Idempotency
  const idempotencyKey = get('idempotency-key');
  if (idempotencyKey) options.idempotencyKey = idempotencyKey as IdempotencyKey;

  return new OperationalContext(options);
}

/**
 * Get current operational context (if in async context).
 */
export function getCurrentContext(): OperationalContext | null {
  const requestContext = getRequestContext();
  if (!requestContext) return null;

  // Reconstruct OperationalContext from RequestContext
  return new OperationalContext({
    requestId: createRequestId(requestContext.requestId),
    traceId: createTraceId(requestContext.traceId),
    spanId: createSpanId(requestContext.spanId),
    parentSpanId: requestContext.parentSpanId ? createSpanId(requestContext.parentSpanId) : undefined,
    userId: requestContext.userId,
    tenantId: requestContext.tenantId as TenantId | undefined,
    buildId: requestContext.buildId as BuildId | undefined,
    metadata: requestContext.metadata,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { OperationalContext as default };
