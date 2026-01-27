/**
 * OLYMPUS 10X - Observability
 *
 * Unified tracing, metrics, and logging.
 * Integrates with existing request-context.ts.
 */

import {
  createContext as createRequestContext,
  runWithContextAsync,
  getContext,
  startSpan,
  endSpan,
  trace as traceAsync,
  type RequestContext,
  type Span,
} from '@/lib/tracing/request-context';
import { EVENT_TYPES } from './constants';
import type { RequestId, TraceId, SpanId, EventCallback, Unsubscribe } from './types';
import { createRequestId, createTraceId, createSpanId } from './types';

// ============================================================================
// METRICS TYPES
// ============================================================================

export interface Metric {
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'bytes' | 'percent';
  tags: Record<string, string>;
  timestamp: Date;
}

export interface MetricAggregation {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

// ============================================================================
// LOG TYPES
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  requestId?: RequestId;
  traceId?: TraceId;
  spanId?: SpanId;
  context?: Record<string, unknown>;
  error?: Error;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface ObservabilityEvent {
  type: string;
  timestamp: Date;
  requestId?: RequestId;
  traceId?: TraceId;
  data: Record<string, unknown>;
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

class MetricsCollector {
  private metrics: Metric[] = [];
  private maxSize = 10000;

  record(metric: Omit<Metric, 'timestamp'>): void {
    this.metrics.push({
      ...metric,
      timestamp: new Date(),
    });

    // Prevent memory leak
    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize / 2);
    }
  }

  recordDuration(name: string, durationMs: number, tags: Record<string, string> = {}): void {
    this.record({
      name,
      value: durationMs,
      unit: 'ms',
      tags,
    });
  }

  recordCount(name: string, count: number = 1, tags: Record<string, string> = {}): void {
    this.record({
      name,
      value: count,
      unit: 'count',
      tags,
    });
  }

  recordBytes(name: string, bytes: number, tags: Record<string, string> = {}): void {
    this.record({
      name,
      value: bytes,
      unit: 'bytes',
      tags,
    });
  }

  getMetrics(name?: string, since?: Date): Metric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }

    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }

    return filtered;
  }

  aggregate(name: string, since?: Date): MetricAggregation | null {
    const metrics = this.getMetrics(name, since);
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      name,
      count: values.length,
      sum,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

// ============================================================================
// LOGGER
// ============================================================================

class Logger {
  private minLevel: LogLevel = 'info';
  private entries: LogEntry[] = [];
  private maxSize = 1000;
  private listeners: Set<(entry: LogEntry) => void> = new Set();

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;

    const requestContext = getContext();

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      requestId: requestContext?.requestId as RequestId | undefined,
      traceId: requestContext?.traceId as TraceId | undefined,
      spanId: requestContext?.spanId as SpanId | undefined,
      context,
      error,
    };

    this.entries.push(entry);

    // Prevent memory leak
    if (this.entries.length > this.maxSize) {
      this.entries = this.entries.slice(-this.maxSize / 2);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch {
        // Ignore listener errors
      }
    });

    // Console output
    const prefix = `[${entry.timestamp.toISOString()}] [${level.toUpperCase()}]`;
    const traceInfo = entry.traceId ? ` [trace:${entry.traceId.slice(0, 8)}]` : '';
    const formatted = `${prefix}${traceInfo} ${message}`;

    switch (level) {
      case 'debug':
        console.debug(formatted, context || '');
        break;
      case 'info':
        console.info(formatted, context || '');
        break;
      case 'warn':
        console.warn(formatted, context || '');
        break;
      case 'error':
        console.error(formatted, context || '', error || '');
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
  }

  subscribe(callback: (entry: LogEntry) => void): Unsubscribe {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getEntries(level?: LogLevel, since?: Date): LogEntry[] {
    let filtered = this.entries;

    if (level) {
      filtered = filtered.filter(e => e.level === level);
    }

    if (since) {
      filtered = filtered.filter(e => e.timestamp >= since);
    }

    return filtered;
  }

  clear(): void {
    this.entries = [];
  }
}

// ============================================================================
// EVENT EMITTER
// ============================================================================

class EventEmitter {
  private listeners: Map<string, Set<EventCallback<ObservabilityEvent>>> = new Map();

  emit(type: string, data: Record<string, unknown>): void {
    const requestContext = getContext();

    const event: ObservabilityEvent = {
      type,
      timestamp: new Date(),
      requestId: requestContext?.requestId as RequestId | undefined,
      traceId: requestContext?.traceId as TraceId | undefined,
      data,
    };

    // Notify specific listeners
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event);
        } catch {
          // Ignore listener errors
        }
      });
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => {
        try {
          listener(event);
        } catch {
          // Ignore listener errors
        }
      });
    }
  }

  on(type: string, callback: EventCallback<ObservabilityEvent>): Unsubscribe {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  off(type: string, callback: EventCallback<ObservabilityEvent>): void {
    this.listeners.get(type)?.delete(callback);
  }

  clear(): void {
    this.listeners.clear();
  }
}

// ============================================================================
// TRACING HELPERS
// ============================================================================

export interface TraceOptions {
  name: string;
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Create a child span within the current trace.
 */
export function createSpan(options: TraceOptions): Span {
  return startSpan(options.name, options.attributes);
}

/**
 * End a span with optional status.
 */
export function finishSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
  endSpan(span, status);
}

/**
 * Trace an async function execution.
 */
export async function traceOperation<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return traceAsync(name, fn, attributes);
}

/**
 * Run a function with a new trace context.
 */
export async function withTrace<T>(
  options: {
    requestId?: RequestId;
    traceId?: TraceId;
    userId?: string;
    tenantId?: string;
    buildId?: string;
  },
  fn: () => Promise<T>
): Promise<T> {
  const context = createRequestContext({
    requestId: options.requestId as string,
    traceId: options.traceId as string,
    userId: options.userId,
    tenantId: options.tenantId,
    buildId: options.buildId,
  });

  return runWithContextAsync(context, fn);
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

let metricsInstance: MetricsCollector | null = null;
let loggerInstance: Logger | null = null;
let eventsInstance: EventEmitter | null = null;

export function getMetrics(): MetricsCollector {
  if (!metricsInstance) {
    metricsInstance = new MetricsCollector();
  }
  return metricsInstance;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

export function getEvents(): EventEmitter {
  if (!eventsInstance) {
    eventsInstance = new EventEmitter();
  }
  return eventsInstance;
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/** Quick access to metrics */
export const metrics = {
  duration: (name: string, ms: number, tags?: Record<string, string>) =>
    getMetrics().recordDuration(name, ms, tags),
  count: (name: string, count?: number, tags?: Record<string, string>) =>
    getMetrics().recordCount(name, count, tags),
  bytes: (name: string, bytes: number, tags?: Record<string, string>) =>
    getMetrics().recordBytes(name, bytes, tags),
  aggregate: (name: string, since?: Date) => getMetrics().aggregate(name, since),
};

/** Quick access to logger */
export const log = {
  debug: (msg: string, ctx?: Record<string, unknown>) => getLogger().debug(msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => getLogger().info(msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => getLogger().warn(msg, ctx),
  error: (msg: string, err?: Error, ctx?: Record<string, unknown>) =>
    getLogger().error(msg, err, ctx),
  setLevel: (level: LogLevel) => getLogger().setLevel(level),
};

/** Quick access to events */
export const events = {
  emit: (type: string, data: Record<string, unknown>) => getEvents().emit(type, data),
  on: (type: string, cb: EventCallback<ObservabilityEvent>) => getEvents().on(type, cb),
  off: (type: string, cb: EventCallback<ObservabilityEvent>) => getEvents().off(type, cb),
};

// ============================================================================
// RESET (FOR TESTING)
// ============================================================================

export function resetObservability(): void {
  metricsInstance?.clear();
  loggerInstance?.clear();
  eventsInstance?.clear();
  metricsInstance = null;
  loggerInstance = null;
  eventsInstance = null;
}
