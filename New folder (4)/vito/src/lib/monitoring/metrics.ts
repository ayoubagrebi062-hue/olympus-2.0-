/**
 * OLYMPUS 3.0 - Performance Metrics Collection
 * Real-time metrics tracking for application performance
 */

// ============================================================================
// TYPES
// ============================================================================

interface MetricEntry {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

interface MetricStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

interface HistogramBucket {
  le: number; // less than or equal
  count: number;
}

// ============================================================================
// METRICS STORAGE
// ============================================================================

const metricsBuffer: MetricEntry[] = [];
const MAX_BUFFER_SIZE = 10000;
const counters: Map<string, number> = new Map();
const gauges: Map<string, number> = new Map();
const histograms: Map<string, number[]> = new Map();

// ============================================================================
// COUNTER METRICS
// ============================================================================

/**
 * Increment a counter metric
 */
export function incrementCounter(
  name: string,
  value: number = 1,
  tags: Record<string, string> = {}
): void {
  const key = buildMetricKey(name, tags);
  counters.set(key, (counters.get(key) || 0) + value);

  recordMetric(name, value, tags);
}

/**
 * Get counter value
 */
export function getCounter(name: string, tags: Record<string, string> = {}): number {
  const key = buildMetricKey(name, tags);
  return counters.get(key) || 0;
}

// ============================================================================
// GAUGE METRICS
// ============================================================================

/**
 * Set a gauge metric (point-in-time value)
 */
export function setGauge(
  name: string,
  value: number,
  tags: Record<string, string> = {}
): void {
  const key = buildMetricKey(name, tags);
  gauges.set(key, value);

  recordMetric(name, value, tags);
}

/**
 * Get gauge value
 */
export function getGauge(name: string, tags: Record<string, string> = {}): number {
  const key = buildMetricKey(name, tags);
  return gauges.get(key) || 0;
}

// ============================================================================
// HISTOGRAM METRICS
// ============================================================================

/**
 * Record a histogram observation
 */
export function recordHistogram(
  name: string,
  value: number,
  tags: Record<string, string> = {}
): void {
  const key = buildMetricKey(name, tags);

  if (!histograms.has(key)) {
    histograms.set(key, []);
  }

  const values = histograms.get(key)!;
  values.push(value);

  // Keep only last 1000 observations per histogram
  if (values.length > 1000) {
    values.shift();
  }

  recordMetric(name, value, tags);
}

/**
 * Get histogram statistics
 */
export function getHistogramStats(
  name: string,
  tags: Record<string, string> = {}
): MetricStats | null {
  const key = buildMetricKey(name, tags);
  const values = histograms.get(key);

  if (!values || values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    count,
    sum,
    min: sorted[0],
    max: sorted[count - 1],
    avg: sum / count,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

// ============================================================================
// TIMING HELPERS
// ============================================================================

/**
 * Time a function execution
 */
export async function timeAsync<T>(
  name: string,
  fn: () => Promise<T>,
  tags: Record<string, string> = {}
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    recordHistogram(`${name}_duration_ms`, duration, { ...tags, status: 'success' });
    incrementCounter(`${name}_total`, 1, { ...tags, status: 'success' });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    recordHistogram(`${name}_duration_ms`, duration, { ...tags, status: 'error' });
    incrementCounter(`${name}_total`, 1, { ...tags, status: 'error' });

    throw error;
  }
}

/**
 * Time a sync function execution
 */
export function timeSync<T>(
  name: string,
  fn: () => T,
  tags: Record<string, string> = {}
): T {
  const start = performance.now();

  try {
    const result = fn();
    const duration = performance.now() - start;

    recordHistogram(`${name}_duration_ms`, duration, { ...tags, status: 'success' });
    incrementCounter(`${name}_total`, 1, { ...tags, status: 'success' });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    recordHistogram(`${name}_duration_ms`, duration, { ...tags, status: 'error' });
    incrementCounter(`${name}_total`, 1, { ...tags, status: 'error' });

    throw error;
  }
}

/**
 * Create a timer that can be stopped later
 */
export function startTimer(name: string, tags: Record<string, string> = {}) {
  const start = performance.now();

  return {
    stop(additionalTags: Record<string, string> = {}) {
      const duration = performance.now() - start;
      recordHistogram(`${name}_duration_ms`, duration, { ...tags, ...additionalTags });
      return duration;
    },
  };
}

// ============================================================================
// WEB VITALS TRACKING
// ============================================================================

interface WebVitals {
  LCP?: number;  // Largest Contentful Paint
  FID?: number;  // First Input Delay
  CLS?: number;  // Cumulative Layout Shift
  FCP?: number;  // First Contentful Paint
  TTFB?: number; // Time to First Byte
  INP?: number;  // Interaction to Next Paint
}

const webVitals: WebVitals = {};

/**
 * Record a Web Vital metric
 */
export function recordWebVital(
  name: keyof WebVitals,
  value: number,
  tags: Record<string, string> = {}
): void {
  webVitals[name] = value;
  recordHistogram(`web_vital_${name}`, value, tags);
}

/**
 * Get current Web Vitals
 */
export function getWebVitals(): WebVitals {
  return { ...webVitals };
}

/**
 * Initialize Web Vitals collection (browser only)
 */
export function initWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Performance Observer for LCP
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        recordWebVital('LCP', lastEntry.startTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // FCP
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
        if (fcpEntry) {
          recordWebVital('FCP', fcpEntry.startTime);
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });

      // CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        recordWebVital('CLS', clsValue);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // FID
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const firstEntry = entries[0];
        if (firstEntry) {
          recordWebVital('FID', (firstEntry as any).processingStart - firstEntry.startTime);
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch {
      // PerformanceObserver not fully supported
    }
  }

  // TTFB
  if (typeof window !== 'undefined' && window.performance?.timing) {
    const timing = window.performance.timing;
    const ttfb = timing.responseStart - timing.requestStart;
    if (ttfb > 0) {
      recordWebVital('TTFB', ttfb);
    }
  }
}

// ============================================================================
// METRICS EXPORT
// ============================================================================

/**
 * Get all metrics in Prometheus format
 */
export function getPrometheusMetrics(): string {
  const lines: string[] = [];

  // Counters
  for (const [key, value] of counters.entries()) {
    const { name, tags } = parseMetricKey(key);
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name}${formatTags(tags)} ${value}`);
  }

  // Gauges
  for (const [key, value] of gauges.entries()) {
    const { name, tags } = parseMetricKey(key);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name}${formatTags(tags)} ${value}`);
  }

  // Histograms
  for (const [key, values] of histograms.entries()) {
    const { name, tags } = parseMetricKey(key);
    const stats = getHistogramStats(name, tags);

    if (stats) {
      lines.push(`# TYPE ${name} histogram`);
      lines.push(`${name}_count${formatTags(tags)} ${stats.count}`);
      lines.push(`${name}_sum${formatTags(tags)} ${stats.sum}`);
      lines.push(`${name}{le="0.5"${formatTagsSuffix(tags)}} ${stats.p50}`);
      lines.push(`${name}{le="0.95"${formatTagsSuffix(tags)}} ${stats.p95}`);
      lines.push(`${name}{le="0.99"${formatTagsSuffix(tags)}} ${stats.p99}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get metrics as JSON
 */
export function getMetricsJSON(): {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, MetricStats | null>;
  webVitals: WebVitals;
} {
  const histogramStats: Record<string, MetricStats | null> = {};

  for (const key of histograms.keys()) {
    const { name, tags } = parseMetricKey(key);
    histogramStats[key] = getHistogramStats(name, tags);
  }

  return {
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
    histograms: histogramStats,
    webVitals: getWebVitals(),
  };
}

/**
 * Reset all metrics
 */
export function resetMetrics(): void {
  counters.clear();
  gauges.clear();
  histograms.clear();
  metricsBuffer.length = 0;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildMetricKey(name: string, tags: Record<string, string>): string {
  const sortedTags = Object.keys(tags)
    .sort()
    .map((k) => `${k}=${tags[k]}`)
    .join(',');

  return sortedTags ? `${name}|${sortedTags}` : name;
}

function parseMetricKey(key: string): { name: string; tags: Record<string, string> } {
  const [name, tagsStr] = key.split('|');
  const tags: Record<string, string> = {};

  if (tagsStr) {
    for (const pair of tagsStr.split(',')) {
      const [k, v] = pair.split('=');
      tags[k] = v;
    }
  }

  return { name, tags };
}

function formatTags(tags: Record<string, string>): string {
  const pairs = Object.entries(tags).map(([k, v]) => `${k}="${v}"`);
  return pairs.length > 0 ? `{${pairs.join(',')}}` : '';
}

function formatTagsSuffix(tags: Record<string, string>): string {
  const pairs = Object.entries(tags).map(([k, v]) => `${k}="${v}"`);
  return pairs.length > 0 ? `,${pairs.join(',')}` : '';
}

function percentile(sortedValues: number[], p: number): number {
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

function recordMetric(
  name: string,
  value: number,
  tags: Record<string, string>
): void {
  metricsBuffer.push({
    name,
    value,
    timestamp: Date.now(),
    tags,
  });

  // Trim buffer if needed
  if (metricsBuffer.length > MAX_BUFFER_SIZE) {
    metricsBuffer.splice(0, metricsBuffer.length - MAX_BUFFER_SIZE);
  }
}
