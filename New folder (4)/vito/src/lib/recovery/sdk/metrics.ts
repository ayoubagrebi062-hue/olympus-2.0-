/**
 * Metrics & Observability
 *
 * Production-grade observability that integrates with:
 * - Prometheus (via prom-client)
 * - OpenTelemetry
 * - DataDog
 * - Custom exporters
 *
 * @example Prometheus Integration
 * ```typescript
 * import { metrics, PrometheusExporter } from '@olympus/recovery';
 * import { register } from 'prom-client';
 *
 * // One line to enable Prometheus metrics
 * metrics.use(new PrometheusExporter(register));
 *
 * // Now all retry/circuit breaker activity is tracked
 * const data = await retry(() => fetch('/api'));
 *
 * // Expose /metrics endpoint
 * app.get('/metrics', (req, res) => res.send(register.metrics()));
 * ```
 *
 * @example Custom Metrics
 * ```typescript
 * metrics.use({
 *   onRetry: (data) => statsd.increment('retry.attempt', data.tags),
 *   onSuccess: (data) => statsd.timing('operation.duration', data.elapsed),
 *   onFailure: (data) => statsd.increment('operation.failed', data.tags),
 *   onCircuitOpen: (data) => pagerduty.alert('Circuit opened: ' + data.name),
 * });
 * ```
 */

// ============================================================================
// METRIC TYPES
// ============================================================================

export interface MetricLabels {
  /** Operation name (e.g., 'fetchUsers', 'paymentAPI') */
  operation?: string;
  /** Error code if failed */
  error_code?: string;
  /** Circuit breaker name */
  circuit?: string;
  /** Whether result came from fallback */
  fallback?: 'true' | 'false';
  /** Correlation ID for distributed tracing */
  trace_id?: string;
}

// ============================================================================
// TRACE ID GENERATION
// ============================================================================

/**
 * Generate a unique trace ID for correlating retry sequences.
 * Format: 8 hex chars (compact but unique enough for debugging)
 */
export function generateTraceId(): string {
  // Use crypto if available (Node.js/modern browsers), fallback to Math.random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(16).slice(2, 10);
}

export interface RetryMetricData {
  /** Operation identifier */
  operation: string;
  /** Which attempt number (1-based) */
  attempt: number;
  /** Delay before this retry (ms) */
  delay: number;
  /** Error that caused the retry */
  error: Error;
  /** Labels for metric dimensions */
  labels: MetricLabels;
  /** Timestamp */
  timestamp: number;
  /** Correlation ID for tracing this retry sequence */
  traceId?: string;
}

export interface SuccessMetricData {
  /** Operation identifier */
  operation: string;
  /** Total attempts taken */
  attempts: number;
  /** Total elapsed time (ms) */
  elapsed: number;
  /** Was fallback used? */
  fromFallback: boolean;
  /** Labels for metric dimensions */
  labels: MetricLabels;
  /** Timestamp */
  timestamp: number;
  /** Correlation ID for tracing this operation */
  traceId?: string;
}

export interface FailureMetricData {
  /** Operation identifier */
  operation: string;
  /** Total attempts made */
  attempts: number;
  /** Total elapsed time (ms) */
  elapsed: number;
  /** Error code */
  errorCode: string;
  /** Error message */
  errorMessage: string;
  /** Labels for metric dimensions */
  labels: MetricLabels;
  /** Timestamp */
  timestamp: number;
  /** Correlation ID for tracing this operation */
  traceId?: string;
}

export interface CircuitMetricData {
  /** Circuit breaker name */
  circuit: string;
  /** New state */
  state: 'open' | 'closed' | 'half-open';
  /** Previous state */
  previousState: 'open' | 'closed' | 'half-open';
  /** Failure count that triggered open */
  failures?: number;
  /** Labels for metric dimensions */
  labels: MetricLabels;
  /** Timestamp */
  timestamp: number;
  /** Correlation ID if triggered by an operation */
  traceId?: string;
}

// ============================================================================
// METRICS EXPORTER INTERFACE
// ============================================================================

/**
 * Interface for metrics exporters.
 * Implement this to send metrics to your monitoring system.
 */
export interface MetricsExporter {
  /** Called on each retry attempt */
  onRetry?(data: RetryMetricData): void;

  /** Called when operation succeeds */
  onSuccess?(data: SuccessMetricData): void;

  /** Called when operation fails (after all retries) */
  onFailure?(data: FailureMetricData): void;

  /** Called when circuit breaker state changes */
  onCircuitStateChange?(data: CircuitMetricData): void;

  /** Called on timeout */
  onTimeout?(data: { operation: string; timeout: number; timestamp: number }): void;
}

// ============================================================================
// METRICS REGISTRY (Singleton)
// ============================================================================

class MetricsRegistry {
  private exporters: MetricsExporter[] = [];
  private enabled = true;

  /**
   * Register a metrics exporter.
   * Can register multiple exporters (e.g., Prometheus + DataDog).
   */
  use(exporter: MetricsExporter): this {
    this.exporters.push(exporter);
    return this;
  }

  /**
   * Remove all exporters
   */
  clear(): this {
    this.exporters = [];
    return this;
  }

  /**
   * Disable all metrics (for testing)
   */
  disable(): this {
    this.enabled = false;
    return this;
  }

  /**
   * Enable metrics
   */
  enable(): this {
    this.enabled = true;
    return this;
  }

  /** @internal */
  emitRetry(data: RetryMetricData): void {
    if (!this.enabled) return;
    for (const exporter of this.exporters) {
      try {
        exporter.onRetry?.(data);
      } catch {
        // Don't let metrics crash the app
      }
    }
  }

  /** @internal */
  emitSuccess(data: SuccessMetricData): void {
    if (!this.enabled) return;
    for (const exporter of this.exporters) {
      try {
        exporter.onSuccess?.(data);
      } catch {
        // Don't let metrics crash the app
      }
    }
  }

  /** @internal */
  emitFailure(data: FailureMetricData): void {
    if (!this.enabled) return;
    for (const exporter of this.exporters) {
      try {
        exporter.onFailure?.(data);
      } catch {
        // Don't let metrics crash the app
      }
    }
  }

  /** @internal */
  emitCircuitStateChange(data: CircuitMetricData): void {
    if (!this.enabled) return;
    for (const exporter of this.exporters) {
      try {
        exporter.onCircuitStateChange?.(data);
      } catch {
        // Don't let metrics crash the app
      }
    }
  }

  /** @internal */
  emitTimeout(data: { operation: string; timeout: number; timestamp: number }): void {
    if (!this.enabled) return;
    for (const exporter of this.exporters) {
      try {
        exporter.onTimeout?.(data);
      } catch {
        // Don't let metrics crash the app
      }
    }
  }
}

/** Global metrics registry - singleton */
export const metrics = new MetricsRegistry();

// ============================================================================
// BUILT-IN EXPORTERS
// ============================================================================

/**
 * Console exporter for development/debugging.
 *
 * @example
 * ```typescript
 * import { metrics, ConsoleExporter } from '@olympus/recovery';
 * metrics.use(new ConsoleExporter());
 * ```
 */
export class ConsoleExporter implements MetricsExporter {
  private prefix: string;

  constructor(options: { prefix?: string } = {}) {
    this.prefix = options.prefix ?? '[recovery]';
  }

  onRetry(data: RetryMetricData): void {
    console.log(
      `${this.prefix} RETRY ${data.operation} attempt=${data.attempt} delay=${data.delay}ms error="${data.error.message}"`
    );
  }

  onSuccess(data: SuccessMetricData): void {
    console.log(
      `${this.prefix} SUCCESS ${data.operation} attempts=${data.attempts} elapsed=${data.elapsed}ms fallback=${data.fromFallback}`
    );
  }

  onFailure(data: FailureMetricData): void {
    console.error(
      `${this.prefix} FAILURE ${data.operation} attempts=${data.attempts} elapsed=${data.elapsed}ms code=${data.errorCode}`
    );
  }

  onCircuitStateChange(data: CircuitMetricData): void {
    const emoji = data.state === 'open' ? '🔴' : data.state === 'closed' ? '🟢' : '🟡';
    console.log(
      `${this.prefix} CIRCUIT ${emoji} ${data.circuit} ${data.previousState} → ${data.state}`
    );
  }

  onTimeout(data: { operation: string; timeout: number; timestamp: number }): void {
    console.warn(
      `${this.prefix} TIMEOUT ${data.operation} after ${data.timeout}ms`
    );
  }
}

/**
 * Type definitions for prom-client compatibility.
 * Allows usage without hard dependency on prom-client.
 */
interface PromCounter<T extends string = string> {
  inc(labels?: Record<T, string | number>): void;
}

interface PromHistogram<T extends string = string> {
  observe(labels: Record<T, string | number>, value: number): void;
}

interface PromGauge<T extends string = string> {
  set(labels: Record<T, string | number>, value: number): void;
}

interface PromRegistry {
  // prom-client registry shape
}

/**
 * Prometheus-compatible exporter.
 * Works with prom-client library.
 *
 * @example
 * ```typescript
 * import { metrics, PrometheusExporter } from '@olympus/recovery';
 * import { Registry, Counter, Histogram } from 'prom-client';
 *
 * const register = new Registry();
 * metrics.use(new PrometheusExporter(register));
 *
 * // Metrics available:
 * // - recovery_operation_total (counter)
 * // - recovery_operation_duration_seconds (histogram)
 * // - recovery_retry_total (counter)
 * // - recovery_circuit_state (gauge)
 * ```
 */
export class PrometheusExporter implements MetricsExporter {
  private operationTotal: PromCounter<'operation' | 'status' | 'error_code' | 'fallback'> | null = null;
  private operationDuration: PromHistogram<'operation' | 'status'> | null = null;
  private retryTotal: PromCounter<'operation'> | null = null;
  private circuitState: PromGauge<'circuit'> | null = null;
  private initialized = false;

  constructor(register: PromRegistry) {
    // We use dynamic access to avoid hard dependency on prom-client
    const registryConstructor = (register as unknown as { constructor: Record<string, unknown> }).constructor;
    const Counter = registryConstructor?.Counter as (new (config: unknown) => PromCounter) | undefined;
    const Histogram = registryConstructor?.Histogram as (new (config: unknown) => PromHistogram) | undefined;
    const Gauge = registryConstructor?.Gauge as (new (config: unknown) => PromGauge) | undefined;

    if (!Counter || !Histogram || !Gauge) {
      console.warn(
        'PrometheusExporter: prom-client not found. Install with: npm install prom-client'
      );
      return;
    }

    this.operationTotal = new Counter({
      name: 'recovery_operation_total',
      help: 'Total operations executed',
      labelNames: ['operation', 'status', 'error_code', 'fallback'],
      registers: [register],
    });

    this.operationDuration = new Histogram({
      name: 'recovery_operation_duration_seconds',
      help: 'Operation duration in seconds',
      labelNames: ['operation', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    this.retryTotal = new Counter({
      name: 'recovery_retry_total',
      help: 'Total retry attempts',
      labelNames: ['operation'],
      registers: [register],
    });

    this.circuitState = new Gauge({
      name: 'recovery_circuit_state',
      help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
      labelNames: ['circuit'],
      registers: [register],
    });

    this.initialized = true;
  }

  onRetry(data: RetryMetricData): void {
    if (!this.initialized) return;
    this.retryTotal?.inc({ operation: data.operation });
  }

  onSuccess(data: SuccessMetricData): void {
    if (!this.initialized) return;
    this.operationTotal?.inc({
      operation: data.operation,
      status: 'success',
      error_code: '',
      fallback: data.fromFallback ? 'true' : 'false',
    });
    this.operationDuration?.observe(
      { operation: data.operation, status: 'success' },
      data.elapsed / 1000
    );
  }

  onFailure(data: FailureMetricData): void {
    if (!this.initialized) return;
    this.operationTotal?.inc({
      operation: data.operation,
      status: 'failure',
      error_code: data.errorCode,
      fallback: 'false',
    });
    this.operationDuration?.observe(
      { operation: data.operation, status: 'failure' },
      data.elapsed / 1000
    );
  }

  onCircuitStateChange(data: CircuitMetricData): void {
    if (!this.initialized) return;
    const stateValue = data.state === 'closed' ? 0 : data.state === 'half-open' ? 1 : 2;
    this.circuitState?.set({ circuit: data.circuit }, stateValue);
  }
}

/**
 * OpenTelemetry Span interface (subset we use).
 * Avoids hard dependency on @opentelemetry/api.
 */
interface OtelSpan {
  setAttributes(attributes: Record<string, string | number | boolean>): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}

interface OtelTracer {
  startSpan(name: string): OtelSpan;
}

/**
 * OpenTelemetry-compatible exporter.
 *
 * @example
 * ```typescript
 * import { metrics, OpenTelemetryExporter } from '@olympus/recovery';
 * import { trace } from '@opentelemetry/api';
 *
 * metrics.use(new OpenTelemetryExporter(trace.getTracer('recovery')));
 * ```
 */
export class OpenTelemetryExporter implements MetricsExporter {
  private tracer: OtelTracer | null;

  constructor(tracer: OtelTracer | null) {
    this.tracer = tracer;
  }

  onRetry(data: RetryMetricData): void {
    if (!this.tracer) return;
    const span = this.tracer.startSpan('recovery.retry');
    span.setAttributes({
      'recovery.operation': data.operation,
      'recovery.attempt': data.attempt,
      'recovery.delay_ms': data.delay,
      'error.message': data.error.message,
    });
    span.end();
  }

  onSuccess(data: SuccessMetricData): void {
    if (!this.tracer) return;
    const span = this.tracer.startSpan('recovery.success');
    span.setAttributes({
      'recovery.operation': data.operation,
      'recovery.attempts': data.attempts,
      'recovery.elapsed_ms': data.elapsed,
      'recovery.from_fallback': data.fromFallback,
    });
    span.end();
  }

  onFailure(data: FailureMetricData): void {
    if (!this.tracer) return;
    const span = this.tracer.startSpan('recovery.failure');
    span.setAttributes({
      'recovery.operation': data.operation,
      'recovery.attempts': data.attempts,
      'recovery.elapsed_ms': data.elapsed,
      'recovery.error_code': data.errorCode,
    });
    span.setStatus({ code: 2, message: data.errorMessage });
    span.end();
  }

  onCircuitStateChange(data: CircuitMetricData): void {
    if (!this.tracer) return;
    const span = this.tracer.startSpan('recovery.circuit_state_change');
    span.setAttributes({
      'recovery.circuit': data.circuit,
      'recovery.circuit_state': data.state,
      'recovery.circuit_previous_state': data.previousState,
    });
    span.end();
  }
}

// ============================================================================
// NAMED OPERATIONS (for cleaner metrics)
// ============================================================================

/**
 * Create a named operation for better metric labels.
 *
 * @example
 * ```typescript
 * import { retry, named } from '@olympus/recovery';
 *
 * // Without named: metrics show "anonymous"
 * await retry(() => fetch('/api'));
 *
 * // With named: metrics show "fetchUsers"
 * await retry(named('fetchUsers', () => fetch('/api/users')));
 * await retry(named('fetchOrders', () => fetch('/api/orders')));
 *
 * // Now Prometheus shows:
 * // recovery_operation_total{operation="fetchUsers"} 150
 * // recovery_operation_total{operation="fetchOrders"} 89
 * ```
 */
export function named<T>(
  operationName: string,
  fn: () => T | Promise<T>
): () => T | Promise<T> {
  const namedFn = fn as any;
  namedFn.__operationName = operationName;
  return namedFn;
}

/**
 * Get the operation name from a function (if set via `named()`)
 * @internal
 */
export function getOperationName(fn: unknown): string {
  if (typeof fn === 'function') {
    return (fn as any).__operationName || fn.name || 'anonymous';
  }
  return 'anonymous';
}
