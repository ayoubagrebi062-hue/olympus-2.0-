/**
 * OLYMPUS 2.0 - Stream Metrics & Observability
 *
 * Real-time metrics collection for streaming operations.
 * Enables monitoring, alerting, and performance optimization.
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { EventEmitter } from 'events';
import { StreamEvent, StreamEventType } from './types';

export interface StreamMetrics {
  // Throughput
  eventsPerSecond: number;
  tokensPerSecond: number;
  bytesPerSecond: number;

  // Latency
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;

  // Volume
  totalEvents: number;
  totalTokens: number;
  totalBytes: number;

  // Errors
  errorCount: number;
  errorRate: number;
  lastError?: { message: string; timestamp: Date };

  // Health
  activeStreams: number;
  completedStreams: number;
  failedStreams: number;
  averageStreamDurationMs: number;

  // Resources
  bufferUtilization: number;
  backpressureEvents: number;
  droppedEvents: number;
}

export interface StreamSpan {
  id: string;
  streamId: string;
  agentId?: string;
  buildId?: string;
  startTime: number;
  endTime?: number;
  events: number;
  tokens: number;
  bytes: number;
  status: 'active' | 'complete' | 'error';
  error?: string;
}

export interface MetricsConfig {
  /** Window size for rate calculations (ms) */
  rateWindowMs: number;
  /** How often to emit metrics (ms) */
  emitIntervalMs: number;
  /** Maximum spans to retain */
  maxSpans: number;
  /** Maximum latency samples to keep */
  maxLatencySamples: number;
}

const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  rateWindowMs: 1000,
  emitIntervalMs: 1000,
  maxSpans: 1000,
  maxLatencySamples: 1000,
};

/**
 * Percentile calculator for latency metrics
 */
class PercentileCalculator {
  private samples: number[] = [];
  private maxSamples: number;
  private sorted: boolean = true;

  constructor(maxSamples: number = 1000) {
    this.maxSamples = maxSamples;
  }

  add(value: number): void {
    this.samples.push(value);
    this.sorted = false;

    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  private ensureSorted(): void {
    if (!this.sorted) {
      this.samples.sort((a, b) => a - b);
      this.sorted = true;
    }
  }

  percentile(p: number): number {
    if (this.samples.length === 0) return 0;

    this.ensureSorted();
    const index = Math.ceil((p / 100) * this.samples.length) - 1;
    return this.samples[Math.max(0, index)];
  }

  average(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }

  clear(): void {
    this.samples = [];
    this.sorted = true;
  }

  count(): number {
    return this.samples.length;
  }
}

/**
 * Rate calculator for throughput metrics
 */
class RateCalculator {
  private timestamps: number[] = [];
  private windowMs: number;

  constructor(windowMs: number = 1000) {
    this.windowMs = windowMs;
  }

  record(count: number = 1): void {
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      this.timestamps.push(now);
    }
    this.prune();
  }

  private prune(): void {
    const cutoff = Date.now() - this.windowMs;
    this.timestamps = this.timestamps.filter(t => t >= cutoff);
  }

  getRate(): number {
    this.prune();
    return (this.timestamps.length / this.windowMs) * 1000;
  }

  clear(): void {
    this.timestamps = [];
  }
}

/**
 * Stream metrics collector
 */
export class StreamMetricsCollector extends EventEmitter {
  private config: MetricsConfig;
  private spans: Map<string, StreamSpan> = new Map();
  private completedSpans: StreamSpan[] = [];

  // Rate calculators
  private eventRate: RateCalculator;
  private tokenRate: RateCalculator;
  private byteRate: RateCalculator;
  private errorRate: RateCalculator;

  // Latency tracking
  private latencyCalculator: PercentileCalculator;

  // Counters
  private totalEvents: number = 0;
  private totalTokens: number = 0;
  private totalBytes: number = 0;
  private errorCount: number = 0;
  private backpressureEvents: number = 0;
  private droppedEvents: number = 0;

  // Last error
  private lastError?: { message: string; timestamp: Date };

  // Emit interval
  private emitInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<MetricsConfig> = {}) {
    super();
    this.config = { ...DEFAULT_METRICS_CONFIG, ...config };

    this.eventRate = new RateCalculator(this.config.rateWindowMs);
    this.tokenRate = new RateCalculator(this.config.rateWindowMs);
    this.byteRate = new RateCalculator(this.config.rateWindowMs);
    this.errorRate = new RateCalculator(this.config.rateWindowMs);
    this.latencyCalculator = new PercentileCalculator(this.config.maxLatencySamples);
  }

  /**
   * Start metrics collection
   */
  start(): void {
    if (this.emitInterval) return;

    this.emitInterval = setInterval(() => {
      this.emit('metrics', this.getMetrics());
    }, this.config.emitIntervalMs);
  }

  /**
   * Stop metrics collection
   */
  stop(): void {
    if (this.emitInterval) {
      clearInterval(this.emitInterval);
      this.emitInterval = null;
    }
  }

  /**
   * Record stream start
   */
  recordStreamStart(streamId: string, metadata?: { agentId?: string; buildId?: string }): void {
    const span: StreamSpan = {
      id: streamId,
      streamId,
      agentId: metadata?.agentId,
      buildId: metadata?.buildId,
      startTime: Date.now(),
      events: 0,
      tokens: 0,
      bytes: 0,
      status: 'active',
    };

    this.spans.set(streamId, span);
  }

  /**
   * Record stream event
   */
  recordEvent(streamId: string, event: StreamEvent, latencyMs?: number): void {
    this.totalEvents++;
    this.eventRate.record();

    if (latencyMs !== undefined) {
      this.latencyCalculator.add(latencyMs);
    }

    const span = this.spans.get(streamId);
    if (span) {
      span.events++;
    }

    // Track specific event types
    if (event.type === 'stream:chunk' || event.type === 'stream:token') {
      const content = (event as any).data?.content || (event as any).data?.token || '';
      const tokens = content.length; // Approximate
      const bytes = new TextEncoder().encode(JSON.stringify(event)).length;

      this.totalTokens += tokens;
      this.totalBytes += bytes;
      this.tokenRate.record(tokens);
      this.byteRate.record(bytes);

      if (span) {
        span.tokens += tokens;
        span.bytes += bytes;
      }
    }

    if (event.type === 'stream:error' || event.type === 'agent:error') {
      this.recordError(streamId, (event as any).data?.error?.message || 'Unknown error');
    }
  }

  /**
   * Record stream completion
   */
  recordStreamComplete(streamId: string): void {
    const span = this.spans.get(streamId);
    if (!span) return;

    span.endTime = Date.now();
    span.status = 'complete';

    this.completeSpan(span);
  }

  /**
   * Record stream error
   */
  recordError(streamId: string, message: string): void {
    this.errorCount++;
    this.errorRate.record();
    this.lastError = { message, timestamp: new Date() };

    const span = this.spans.get(streamId);
    if (span) {
      span.status = 'error';
      span.error = message;
      span.endTime = Date.now();
      this.completeSpan(span);
    }
  }

  /**
   * Record backpressure event
   */
  recordBackpressure(): void {
    this.backpressureEvents++;
  }

  /**
   * Record dropped event
   */
  recordDrop(): void {
    this.droppedEvents++;
  }

  /**
   * Record replay events (reconnection support)
   */
  recordReplay(count: number): void {
    this.totalEvents += count;
  }

  /**
   * Complete a span
   */
  private completeSpan(span: StreamSpan): void {
    this.spans.delete(span.id);
    this.completedSpans.push(span);

    // Limit stored spans
    while (this.completedSpans.length > this.config.maxSpans) {
      this.completedSpans.shift();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): StreamMetrics {
    const activeStreams = this.spans.size;
    const completedStreams = this.completedSpans.filter(s => s.status === 'complete').length;
    const failedStreams = this.completedSpans.filter(s => s.status === 'error').length;

    // Calculate average stream duration
    const completedWithDuration = this.completedSpans.filter(s => s.endTime);
    const avgDuration =
      completedWithDuration.length > 0
        ? completedWithDuration.reduce((sum, s) => sum + (s.endTime! - s.startTime), 0) /
          completedWithDuration.length
        : 0;

    // Calculate buffer utilization (approximate)
    let totalBuffer = 0;
    for (const span of this.spans.values()) {
      totalBuffer += span.bytes;
    }
    const bufferUtilization = Math.min(totalBuffer / (10 * 1024 * 1024), 1); // 10MB max

    return {
      // Throughput
      eventsPerSecond: this.eventRate.getRate(),
      tokensPerSecond: this.tokenRate.getRate(),
      bytesPerSecond: this.byteRate.getRate(),

      // Latency
      averageLatencyMs: this.latencyCalculator.average(),
      p50LatencyMs: this.latencyCalculator.percentile(50),
      p95LatencyMs: this.latencyCalculator.percentile(95),
      p99LatencyMs: this.latencyCalculator.percentile(99),

      // Volume
      totalEvents: this.totalEvents,
      totalTokens: this.totalTokens,
      totalBytes: this.totalBytes,

      // Errors
      errorCount: this.errorCount,
      errorRate: this.errorRate.getRate(),
      lastError: this.lastError,

      // Health
      activeStreams,
      completedStreams,
      failedStreams,
      averageStreamDurationMs: avgDuration,

      // Resources
      bufferUtilization,
      backpressureEvents: this.backpressureEvents,
      droppedEvents: this.droppedEvents,
    };
  }

  /**
   * Get span by ID
   */
  getSpan(streamId: string): StreamSpan | undefined {
    return this.spans.get(streamId) || this.completedSpans.find(s => s.streamId === streamId);
  }

  /**
   * Get all active spans
   */
  getActiveSpans(): StreamSpan[] {
    return Array.from(this.spans.values());
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.spans.clear();
    this.completedSpans = [];
    this.eventRate.clear();
    this.tokenRate.clear();
    this.byteRate.clear();
    this.errorRate.clear();
    this.latencyCalculator.clear();
    this.totalEvents = 0;
    this.totalTokens = 0;
    this.totalBytes = 0;
    this.errorCount = 0;
    this.backpressureEvents = 0;
    this.droppedEvents = 0;
    this.lastError = undefined;
  }
}

// Singleton instance
let metricsCollector: StreamMetricsCollector | null = null;

/**
 * Get the global metrics collector
 */
export function getStreamMetrics(): StreamMetricsCollector {
  if (!metricsCollector) {
    metricsCollector = new StreamMetricsCollector();
  }
  return metricsCollector;
}

/**
 * Reset the global metrics collector
 */
export function resetStreamMetrics(): void {
  if (metricsCollector) {
    metricsCollector.stop();
    metricsCollector.reset();
  }
  metricsCollector = null;
}
