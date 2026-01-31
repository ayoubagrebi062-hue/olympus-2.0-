/**
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTracingMetrics,
  getTracingHealth,
  resetTracingMetrics,
  setSpanLimits,
  getSpanLimits,
  DEFAULT_SPAN_LIMITS,
  recordSpanCreated,
  recordSpanCompleted,
  recordSpanFailed,
  recordSpanDropped,
  recordExportResult,
  sanitizeSpanName,
  sanitizeAttributeValue,
  canAddAttribute,
  canAddEvent,
} from '../diagnostics';

describe('Tracing Self-Diagnostics', () => {
  beforeEach(() => {
    resetTracingMetrics();
    setSpanLimits(DEFAULT_SPAN_LIMITS);
  });

  describe('Metrics', () => {
    it('should track span creation', () => {
      recordSpanCreated();
      recordSpanCreated();
      recordSpanCreated();

      const metrics = getTracingMetrics();
      expect(metrics.spansCreated).toBe(3);
    });

    it('should track span completion with duration', () => {
      recordSpanCompleted(100);
      recordSpanCompleted(200);
      recordSpanCompleted(300);

      const metrics = getTracingMetrics();
      expect(metrics.spansCompleted).toBe(3);
      expect(metrics.avgSpanDurationMs).toBe(200); // (100+200+300)/3
    });

    it('should track span failures', () => {
      recordSpanFailed();
      recordSpanFailed();

      const metrics = getTracingMetrics();
      expect(metrics.spansFailed).toBe(2);
    });

    it('should track dropped spans', () => {
      recordSpanDropped();

      const metrics = getTracingMetrics();
      expect(metrics.spansDropped).toBe(1);
    });

    it('should track export results', () => {
      recordExportResult(true);
      recordExportResult(true);
      recordExportResult(false);

      const metrics = getTracingMetrics();
      expect(metrics.exporterErrors).toBe(1);
      expect(metrics.lastExportSuccess).toBe(false);
      expect(metrics.lastExportTime).not.toBeNull();
    });

    it('should reset all metrics', () => {
      recordSpanCreated();
      recordSpanCompleted(100);
      recordSpanFailed();
      recordSpanDropped();
      recordExportResult(false);

      resetTracingMetrics();

      const metrics = getTracingMetrics();
      expect(metrics.spansCreated).toBe(0);
      expect(metrics.spansCompleted).toBe(0);
      expect(metrics.spansFailed).toBe(0);
      expect(metrics.spansDropped).toBe(0);
      expect(metrics.exporterErrors).toBe(0);
    });
  });

  describe('Health Check', () => {
    it('should report healthy when disabled', () => {
      const health = getTracingHealth(false);

      expect(health.status).toBe('healthy');
      expect(health.enabled).toBe(false);
      expect(health.issues).toContain('Tracing is disabled');
    });

    it('should report healthy with good metrics', () => {
      // Simulate healthy operation
      for (let i = 0; i < 200; i++) {
        recordSpanCreated();
        recordSpanCompleted(50);
      }
      recordExportResult(true);

      const health = getTracingHealth(true);

      expect(health.status).toBe('healthy');
      expect(health.enabled).toBe(true);
      expect(health.exporterHealthy).toBe(true);
      expect(health.issues).toHaveLength(0);
    });

    it('should report degraded when exporter fails', () => {
      recordExportResult(false);

      const health = getTracingHealth(true);

      expect(health.status).toBe('degraded');
      expect(health.exporterHealthy).toBe(false);
      expect(health.issues.some(i => i.includes('Exporter failing'))).toBe(true);
    });

    it('should report degraded with high drop rate', () => {
      // Create 200 spans, drop 40 (20%) - need >100 total for check to trigger
      for (let i = 0; i < 200; i++) {
        recordSpanCreated();
      }
      for (let i = 0; i < 40; i++) {
        recordSpanDropped();
      }
      recordExportResult(true);

      const health = getTracingHealth(true);

      expect(health.status).toBe('degraded');
      expect(health.issues.some(i => i.includes('drop rate'))).toBe(true);
    });

    it('should report unhealthy with very high drop rate', () => {
      // Create 200 spans, drop 120 (60%) - need >100 total for check to trigger
      for (let i = 0; i < 200; i++) {
        recordSpanCreated();
      }
      for (let i = 0; i < 120; i++) {
        recordSpanDropped();
      }
      recordExportResult(true);

      const health = getTracingHealth(true);

      expect(health.status).toBe('unhealthy');
    });
  });

  describe('Span Limits', () => {
    it('should have sensible defaults', () => {
      const limits = getSpanLimits();

      expect(limits.maxAttributesPerSpan).toBe(128);
      expect(limits.maxEventsPerSpan).toBe(128);
      expect(limits.maxAttributeValueLength).toBe(1024);
      expect(limits.maxSpanNameLength).toBe(256);
    });

    it('should allow customizing limits', () => {
      setSpanLimits({
        maxAttributesPerSpan: 50,
        maxEventsPerSpan: 50,
      });

      const limits = getSpanLimits();

      expect(limits.maxAttributesPerSpan).toBe(50);
      expect(limits.maxEventsPerSpan).toBe(50);
      expect(limits.maxAttributeValueLength).toBe(1024); // Unchanged
    });

    it('should truncate long span names', () => {
      setSpanLimits({ maxSpanNameLength: 20 });

      const longName = 'a'.repeat(50);
      const sanitized = sanitizeSpanName(longName);

      expect(sanitized.length).toBe(20);
      expect(sanitized.endsWith('...')).toBe(true);
    });

    it('should not truncate short span names', () => {
      const shortName = 'build:myapp';
      const sanitized = sanitizeSpanName(shortName);

      expect(sanitized).toBe(shortName);
    });

    it('should truncate long attribute values', () => {
      setSpanLimits({ maxAttributeValueLength: 20 });

      const longValue = 'value-' + 'x'.repeat(50);
      const sanitized = sanitizeAttributeValue(longValue);

      expect(typeof sanitized).toBe('string');
      expect((sanitized as string).length).toBe(20);
    });

    it('should not modify non-string attribute values', () => {
      expect(sanitizeAttributeValue(42)).toBe(42);
      expect(sanitizeAttributeValue(true)).toBe(true);
      expect(sanitizeAttributeValue(false)).toBe(false);
    });

    it('should enforce attribute limits', () => {
      setSpanLimits({ maxAttributesPerSpan: 2 });

      expect(canAddAttribute(0)).toBe(true);
      expect(canAddAttribute(1)).toBe(true);
      expect(canAddAttribute(2)).toBe(false);

      // Should record dropped
      const metrics = getTracingMetrics();
      expect(metrics.spansDropped).toBe(1);
    });

    it('should enforce event limits', () => {
      setSpanLimits({ maxEventsPerSpan: 3 });

      expect(canAddEvent(0)).toBe(true);
      expect(canAddEvent(2)).toBe(true);
      expect(canAddEvent(3)).toBe(false);
    });
  });
});

describe('Production Scenarios', () => {
  beforeEach(() => {
    resetTracingMetrics();
  });

  it('should handle high throughput gracefully', () => {
    // Simulate 10,000 spans
    for (let i = 0; i < 10000; i++) {
      recordSpanCreated();
      if (Math.random() > 0.01) {
        recordSpanCompleted(Math.random() * 100);
      } else {
        recordSpanFailed();
      }
    }

    const metrics = getTracingMetrics();
    const health = getTracingHealth(true);

    expect(metrics.spansCreated).toBe(10000);
    expect(metrics.spansCompleted + metrics.spansFailed).toBe(10000);
    expect(health.status).toBe('healthy'); // Low failure rate
  });

  it('should detect degradation under stress', () => {
    // Simulate problematic operation - need >100 spans for health check to trigger
    for (let i = 0; i < 200; i++) {
      recordSpanCreated();
      recordSpanDropped(); // Everything dropped!
    }

    const health = getTracingHealth(true);

    expect(health.status).toBe('unhealthy');
    expect(health.issues.length).toBeGreaterThan(0);
  });
});
