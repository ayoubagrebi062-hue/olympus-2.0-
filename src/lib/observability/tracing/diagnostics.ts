/**
 * Tracing Self-Diagnostics
 *
 * The tracing system that traces itself.
 * Know if your observability is actually working.
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

// ═══════════════════════════════════════════════════════════════════════════
// METRICS (Tracing about tracing)
// ═══════════════════════════════════════════════════════════════════════════

interface TracingMetrics {
  spansCreated: number;
  spansCompleted: number;
  spansFailed: number;
  spansDropped: number;
  exporterErrors: number;
  lastExportTime: number | null;
  lastExportSuccess: boolean;
  avgSpanDurationMs: number;
  peakSpansPerSecond: number;
}

const metrics: TracingMetrics = {
  spansCreated: 0,
  spansCompleted: 0,
  spansFailed: 0,
  spansDropped: 0,
  exporterErrors: 0,
  lastExportTime: null,
  lastExportSuccess: true,
  avgSpanDurationMs: 0,
  peakSpansPerSecond: 0,
};

// Rolling window for spans/second calculation
const spanTimestamps: number[] = [];
const WINDOW_SIZE_MS = 60000; // 1 minute

/**
 * Record a span creation
 */
export function recordSpanCreated(): void {
  metrics.spansCreated++;

  const now = Date.now();
  spanTimestamps.push(now);

  // Clean old timestamps
  const cutoff = now - WINDOW_SIZE_MS;
  while (spanTimestamps.length > 0 && spanTimestamps[0] < cutoff) {
    spanTimestamps.shift();
  }

  // Calculate peak
  const currentRate = spanTimestamps.length / (WINDOW_SIZE_MS / 1000);
  if (currentRate > metrics.peakSpansPerSecond) {
    metrics.peakSpansPerSecond = currentRate;
  }
}

/**
 * Record a span completion
 */
export function recordSpanCompleted(durationMs: number): void {
  metrics.spansCompleted++;

  // Rolling average
  const totalDuration = metrics.avgSpanDurationMs * (metrics.spansCompleted - 1) + durationMs;
  metrics.avgSpanDurationMs = totalDuration / metrics.spansCompleted;
}

/**
 * Record a span failure
 */
export function recordSpanFailed(): void {
  metrics.spansFailed++;
}

/**
 * Record a dropped span (due to limits)
 */
export function recordSpanDropped(): void {
  metrics.spansDropped++;
}

/**
 * Record exporter result
 */
export function recordExportResult(success: boolean): void {
  metrics.lastExportTime = Date.now();
  metrics.lastExportSuccess = success;
  if (!success) {
    metrics.exporterErrors++;
  }
}

/**
 * Get current tracing metrics
 */
export function getTracingMetrics(): TracingMetrics {
  return { ...metrics };
}

/**
 * Reset metrics (for testing)
 */
export function resetTracingMetrics(): void {
  metrics.spansCreated = 0;
  metrics.spansCompleted = 0;
  metrics.spansFailed = 0;
  metrics.spansDropped = 0;
  metrics.exporterErrors = 0;
  metrics.lastExportTime = null;
  metrics.lastExportSuccess = true;
  metrics.avgSpanDurationMs = 0;
  metrics.peakSpansPerSecond = 0;
  spanTimestamps.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

export type TracingHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface TracingHealth {
  status: TracingHealthStatus;
  enabled: boolean;
  exporterHealthy: boolean;
  metrics: TracingMetrics;
  issues: string[];
}

/**
 * Get tracing health status
 * Use this for /health endpoints and monitoring
 */
export function getTracingHealth(isEnabled: boolean): TracingHealth {
  const issues: string[] = [];
  let status: TracingHealthStatus = 'healthy';

  // Check if enabled
  if (!isEnabled) {
    return {
      status: 'healthy', // Disabled is a valid state
      enabled: false,
      exporterHealthy: true,
      metrics: getTracingMetrics(),
      issues: ['Tracing is disabled'],
    };
  }

  // Check exporter health
  const exporterHealthy = metrics.lastExportSuccess;
  if (!exporterHealthy) {
    issues.push(`Exporter failing: ${metrics.exporterErrors} errors`);
    status = 'degraded';
  }

  // Check for high drop rate
  const totalSpans = metrics.spansCreated;
  if (totalSpans > 100) {
    const dropRate = metrics.spansDropped / totalSpans;
    if (dropRate > 0.1) {
      issues.push(`High drop rate: ${(dropRate * 100).toFixed(1)}%`);
      status = 'degraded';
    }
    if (dropRate > 0.5) {
      status = 'unhealthy';
    }
  }

  // Check for high failure rate
  if (totalSpans > 100) {
    const failRate = metrics.spansFailed / totalSpans;
    if (failRate > 0.1) {
      issues.push(`High failure rate: ${(failRate * 100).toFixed(1)}%`);
    }
  }

  // Check for stale exports
  if (metrics.lastExportTime) {
    const timeSinceExport = Date.now() - metrics.lastExportTime;
    if (timeSinceExport > 60000) {
      // 1 minute
      issues.push(`No exports in ${Math.round(timeSinceExport / 1000)}s`);
      status = 'degraded';
    }
  }

  return {
    status,
    enabled: true,
    exporterHealthy,
    metrics: getTracingMetrics(),
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SPAN LIMITS (Prevent OOM)
// ═══════════════════════════════════════════════════════════════════════════

export interface SpanLimits {
  maxAttributesPerSpan: number;
  maxEventsPerSpan: number;
  maxAttributeValueLength: number;
  maxSpanNameLength: number;
}

export const DEFAULT_SPAN_LIMITS: SpanLimits = {
  maxAttributesPerSpan: 128,
  maxEventsPerSpan: 128,
  maxAttributeValueLength: 1024,
  maxSpanNameLength: 256,
};

let currentLimits = { ...DEFAULT_SPAN_LIMITS };

/**
 * Configure span limits
 */
export function setSpanLimits(limits: Partial<SpanLimits>): void {
  currentLimits = { ...currentLimits, ...limits };
}

/**
 * Get current span limits
 */
export function getSpanLimits(): SpanLimits {
  return { ...currentLimits };
}

/**
 * Truncate string to limit
 */
export function truncateToLimit(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return value.substring(0, limit - 3) + '...';
}

/**
 * Sanitize span name
 */
export function sanitizeSpanName(name: string): string {
  return truncateToLimit(name, currentLimits.maxSpanNameLength);
}

/**
 * Sanitize attribute value
 */
export function sanitizeAttributeValue(
  value: string | number | boolean
): string | number | boolean {
  if (typeof value === 'string') {
    return truncateToLimit(value, currentLimits.maxAttributeValueLength);
  }
  return value;
}

/**
 * Check if we can add more attributes
 */
export function canAddAttribute(currentCount: number): boolean {
  if (currentCount >= currentLimits.maxAttributesPerSpan) {
    recordSpanDropped();
    return false;
  }
  return true;
}

/**
 * Check if we can add more events
 */
export function canAddEvent(currentCount: number): boolean {
  if (currentCount >= currentLimits.maxEventsPerSpan) {
    recordSpanDropped();
    return false;
  }
  return true;
}
