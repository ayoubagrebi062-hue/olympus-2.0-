/**
 * OLYMPUS 2.1 - 10X UPGRADE: Metrics Collection System
 *
 * Centralized metrics for:
 * - Request latency
 * - Build performance
 * - Agent execution times
 * - Error rates
 * - Resource usage
 */

// ============================================================================
// TYPES
// ============================================================================

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricLabel {
  [key: string]: string | number | boolean;
}

interface MetricValue {
  value: number;
  timestamp: number;
  labels: MetricLabel;
}

interface HistogramBucket {
  le: number; // Less than or equal
  count: number;
}

interface HistogramMetric {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

interface Metric {
  name: string;
  type: MetricType;
  help: string;
  values: MetricValue[];
  histogram?: HistogramMetric;
}

// ============================================================================
// METRICS REGISTRY
// ============================================================================

const metrics: Map<string, Metric> = new Map();

// Default histogram buckets (in ms for latency)
const DEFAULT_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

// ============================================================================
// METRIC REGISTRATION
// ============================================================================

/**
 * Register a counter metric
 */
export function registerCounter(name: string, help: string): void {
  if (!metrics.has(name)) {
    metrics.set(name, {
      name,
      type: 'counter',
      help,
      values: [{ value: 0, timestamp: Date.now(), labels: {} }],
    });
  }
}

/**
 * Register a gauge metric
 */
export function registerGauge(name: string, help: string): void {
  if (!metrics.has(name)) {
    metrics.set(name, {
      name,
      type: 'gauge',
      help,
      values: [{ value: 0, timestamp: Date.now(), labels: {} }],
    });
  }
}

/**
 * Register a histogram metric
 */
export function registerHistogram(
  name: string,
  help: string,
  buckets: number[] = DEFAULT_BUCKETS
): void {
  if (!metrics.has(name)) {
    metrics.set(name, {
      name,
      type: 'histogram',
      help,
      values: [],
      histogram: {
        buckets: buckets.map(le => ({ le, count: 0 })),
        sum: 0,
        count: 0,
      },
    });
  }
}

// ============================================================================
// METRIC OPERATIONS
// ============================================================================

/**
 * Increment a counter
 */
export function incCounter(name: string, value = 1, labels: MetricLabel = {}): void {
  const metric = metrics.get(name);
  if (!metric || metric.type !== 'counter') {
    registerCounter(name, `Counter: ${name}`);
    incCounter(name, value, labels);
    return;
  }

  // Find existing value with same labels or create new
  const labelKey = JSON.stringify(labels);
  const existing = metric.values.find(v => JSON.stringify(v.labels) === labelKey);

  if (existing) {
    existing.value += value;
    existing.timestamp = Date.now();
  } else {
    metric.values.push({
      value,
      timestamp: Date.now(),
      labels,
    });
  }
}

/**
 * Set a gauge value
 */
export function setGauge(name: string, value: number, labels: MetricLabel = {}): void {
  const metric = metrics.get(name);
  if (!metric || metric.type !== 'gauge') {
    registerGauge(name, `Gauge: ${name}`);
    setGauge(name, value, labels);
    return;
  }

  const labelKey = JSON.stringify(labels);
  const existing = metric.values.find(v => JSON.stringify(v.labels) === labelKey);

  if (existing) {
    existing.value = value;
    existing.timestamp = Date.now();
  } else {
    metric.values.push({
      value,
      timestamp: Date.now(),
      labels,
    });
  }
}

/**
 * Observe a histogram value
 */
export function observeHistogram(name: string, value: number): void {
  const metric = metrics.get(name);
  if (!metric || metric.type !== 'histogram' || !metric.histogram) {
    registerHistogram(name, `Histogram: ${name}`);
    observeHistogram(name, value);
    return;
  }

  // Update buckets
  for (const bucket of metric.histogram.buckets) {
    if (value <= bucket.le) {
      bucket.count++;
    }
  }

  metric.histogram.sum += value;
  metric.histogram.count++;
}

// ============================================================================
// HIGH-LEVEL API
// ============================================================================

/**
 * Time an async operation and record to histogram
 */
export async function timeAsync<T>(
  metricName: string,
  fn: () => Promise<T>,
  onError?: (error: Error) => void
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    observeHistogram(metricName, Date.now() - start);
    return result;
  } catch (error) {
    observeHistogram(metricName, Date.now() - start);
    incCounter(`${metricName}_errors`);
    if (onError && error instanceof Error) {
      onError(error);
    }
    throw error;
  }
}

/**
 * Time a sync operation and record to histogram
 */
export function timeSync<T>(metricName: string, fn: () => T): T {
  const start = Date.now();
  try {
    const result = fn();
    observeHistogram(metricName, Date.now() - start);
    return result;
  } catch (error) {
    observeHistogram(metricName, Date.now() - start);
    incCounter(`${metricName}_errors`);
    throw error;
  }
}

// ============================================================================
// OLYMPUS-SPECIFIC METRICS
// ============================================================================

// Pre-register OLYMPUS metrics
registerCounter('olympus_builds_total', 'Total number of builds started');
registerCounter('olympus_builds_success', 'Total successful builds');
registerCounter('olympus_builds_failed', 'Total failed builds');
registerHistogram('olympus_build_duration_ms', 'Build duration in milliseconds');
registerHistogram('olympus_agent_duration_ms', 'Agent execution duration');
registerCounter('olympus_tokens_used', 'Total tokens consumed');
registerGauge('olympus_active_builds', 'Currently running builds');
registerCounter('olympus_rate_limits_hit', 'Number of rate limit hits');
registerHistogram('olympus_api_latency_ms', 'API request latency');

/**
 * Record build started
 */
export function recordBuildStarted(buildId: string): void {
  incCounter('olympus_builds_total', 1, { buildId });
  setGauge('olympus_active_builds', getActiveBuilds() + 1);
}

/**
 * Record build completed
 */
export function recordBuildCompleted(
  buildId: string,
  success: boolean,
  durationMs: number,
  tokens: number
): void {
  if (success) {
    incCounter('olympus_builds_success', 1, { buildId });
  } else {
    incCounter('olympus_builds_failed', 1, { buildId });
  }
  observeHistogram('olympus_build_duration_ms', durationMs);
  incCounter('olympus_tokens_used', tokens);
  setGauge('olympus_active_builds', Math.max(0, getActiveBuilds() - 1));
}

/**
 * Record agent execution
 */
export function recordAgentExecution(
  agentId: string,
  phase: string,
  durationMs: number,
  tokens: number
): void {
  observeHistogram('olympus_agent_duration_ms', durationMs);
  incCounter('olympus_tokens_used', tokens, { agentId, phase });
}

/**
 * Get active builds count
 */
function getActiveBuilds(): number {
  const metric = metrics.get('olympus_active_builds');
  return metric?.values[0]?.value ?? 0;
}

// ============================================================================
// EXPORT FORMAT
// ============================================================================

/**
 * Get all metrics in Prometheus format
 */
export function getPrometheusMetrics(): string {
  const lines: string[] = [];

  for (const metric of metrics.values()) {
    lines.push(`# HELP ${metric.name} ${metric.help}`);
    lines.push(`# TYPE ${metric.name} ${metric.type}`);

    if (metric.type === 'histogram' && metric.histogram) {
      // Output histogram buckets
      for (const bucket of metric.histogram.buckets) {
        lines.push(`${metric.name}_bucket{le="${bucket.le}"} ${bucket.count}`);
      }
      lines.push(`${metric.name}_bucket{le="+Inf"} ${metric.histogram.count}`);
      lines.push(`${metric.name}_sum ${metric.histogram.sum}`);
      lines.push(`${metric.name}_count ${metric.histogram.count}`);
    } else {
      // Output counter/gauge values
      for (const val of metric.values) {
        const labelStr = Object.entries(val.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        const labelPart = labelStr ? `{${labelStr}}` : '';
        lines.push(`${metric.name}${labelPart} ${val.value}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get all metrics as JSON
 */
export function getMetricsJson(): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [name, metric] of metrics) {
    if (metric.type === 'histogram' && metric.histogram) {
      result[name] = {
        type: 'histogram',
        buckets: metric.histogram.buckets,
        sum: metric.histogram.sum,
        count: metric.histogram.count,
        avg: metric.histogram.count > 0 ? metric.histogram.sum / metric.histogram.count : 0,
      };
    } else {
      result[name] = {
        type: metric.type,
        values: metric.values.map(v => ({
          value: v.value,
          labels: v.labels,
        })),
      };
    }
  }

  return result;
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
  metrics.clear();
}

export default {
  registerCounter,
  registerGauge,
  registerHistogram,
  incCounter,
  setGauge,
  observeHistogram,
  timeAsync,
  timeSync,
  recordBuildStarted,
  recordBuildCompleted,
  recordAgentExecution,
  getPrometheusMetrics,
  getMetricsJson,
  resetMetrics,
};
