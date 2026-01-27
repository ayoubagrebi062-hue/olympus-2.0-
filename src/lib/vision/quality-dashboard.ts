/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   REAL-TIME QUALITY DASHBOARD                                                  ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║   Enterprise-grade metrics and monitoring:                                    ║
 * ║   - Real-time quality score tracking                                          ║
 * ║   - Provider health monitoring with circuit breaker status                    ║
 * ║   - Intelligent alerting with severity levels                                 ║
 * ║   - Trend analysis and predictions                                            ║
 * ║   - Historical data with configurable retention                               ║
 * ║                                                                               ║
 * ║   "You can't improve what you don't measure"                                  ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { DashboardMetrics, ProviderStatus, QualityMetrics, GenerationResult } from './types';

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

const DEFAULT_RETENTION_HOURS = 24;
const MAX_TREND_POINTS = 100;
const ALERT_COOLDOWN_MS = 1000 * 60 * 5; // 5 minutes between same alerts

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface Alert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  source: string;
  acknowledged: boolean;
}

interface TrendPoint {
  time: string;
  value: number;
}

interface GenerationRecord {
  id: string;
  timestamp: string;
  success: boolean;
  qualityScore: number;
  stubRate: number;
  generationTimeMs: number;
  healingApplied: boolean;
  provider: string;
  errors: string[];
}

interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalLatencyMs: number;
  lastError?: string;
  lastErrorTime?: string;
  circuitState: 'closed' | 'open' | 'half-open';
  failureCount: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// QUALITY DASHBOARD
// ════════════════════════════════════════════════════════════════════════════════

export class QualityDashboard {
  private records: GenerationRecord[] = [];
  private alerts: Alert[] = [];
  private providerMetrics: Map<string, ProviderMetrics> = new Map();
  private trends: {
    qualityScores: TrendPoint[];
    stubRates: TrendPoint[];
    firstPassRates: TrendPoint[];
  } = {
    qualityScores: [],
    stubRates: [],
    firstPassRates: [],
  };

  private retentionHours: number;
  private lastAlertTime: Map<string, number> = new Map();
  private listeners: ((metrics: DashboardMetrics) => void)[] = [];

  constructor(retentionHours: number = DEFAULT_RETENTION_HOURS) {
    this.retentionHours = retentionHours;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // RECORD GENERATION
  // ──────────────────────────────────────────────────────────────────────────────

  recordGeneration(result: GenerationResult, provider: string): void {
    const record: GenerationRecord = {
      id: result.id,
      timestamp: new Date().toISOString(),
      success: result.success,
      qualityScore: result.quality.overallScore,
      stubRate: result.quality.stubMetrics.hasStubs
        ? result.quality.stubMetrics.stubCount / (result.code?.split('\n').length || 1)
        : 0,
      generationTimeMs: result.timing.totalMs,
      healingApplied: result.healingApplied,
      provider,
      errors: result.errors,
    };

    this.records.push(record);
    this.updateTrends(record);
    this.updateProviderMetrics(provider, result);
    this.checkAlerts(record);
    this.pruneOldRecords();
    this.notifyListeners();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // TREND TRACKING
  // ──────────────────────────────────────────────────────────────────────────────

  private updateTrends(record: GenerationRecord): void {
    const time = record.timestamp;

    // Quality score trend
    this.trends.qualityScores.push({ time, value: record.qualityScore });
    if (this.trends.qualityScores.length > MAX_TREND_POINTS) {
      this.trends.qualityScores.shift();
    }

    // Stub rate trend
    this.trends.stubRates.push({ time, value: record.stubRate * 100 });
    if (this.trends.stubRates.length > MAX_TREND_POINTS) {
      this.trends.stubRates.shift();
    }

    // First-pass rate (no healing needed)
    const recentRecords = this.records.slice(-20);
    const firstPassRate =
      recentRecords.filter(r => r.success && !r.healingApplied).length /
      Math.max(recentRecords.length, 1);
    this.trends.firstPassRates.push({ time, value: firstPassRate * 100 });
    if (this.trends.firstPassRates.length > MAX_TREND_POINTS) {
      this.trends.firstPassRates.shift();
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PROVIDER TRACKING
  // ──────────────────────────────────────────────────────────────────────────────

  private updateProviderMetrics(provider: string, result: GenerationResult): void {
    let metrics = this.providerMetrics.get(provider);
    if (!metrics) {
      metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalLatencyMs: 0,
        circuitState: 'closed',
        failureCount: 0,
      };
      this.providerMetrics.set(provider, metrics);
    }

    metrics.totalRequests++;
    metrics.totalLatencyMs += result.timing.imageGenerationMs;

    if (result.success) {
      metrics.successfulRequests++;
      metrics.failureCount = 0;
      if (metrics.circuitState === 'half-open') {
        metrics.circuitState = 'closed';
      }
    } else {
      metrics.failedRequests++;
      metrics.failureCount++;
      metrics.lastError = result.errors[0];
      metrics.lastErrorTime = new Date().toISOString();

      if (metrics.failureCount >= 5) {
        metrics.circuitState = 'open';
      }
    }
  }

  updateProviderStatus(provider: string, status: Partial<ProviderStatus>): void {
    const metrics = this.providerMetrics.get(provider);
    if (metrics && status.circuitBreaker) {
      metrics.circuitState = status.circuitBreaker.state;
      metrics.failureCount = status.circuitBreaker.failureCount;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // ALERTING
  // ──────────────────────────────────────────────────────────────────────────────

  private checkAlerts(record: GenerationRecord): void {
    // Critical: Quality below 50
    if (record.qualityScore < 50) {
      this.raiseAlert(
        'critical',
        `Quality score critically low: ${record.qualityScore}%`,
        'quality-check'
      );
    }

    // Warning: Quality below 70
    else if (record.qualityScore < 70) {
      this.raiseAlert(
        'warning',
        `Quality score below threshold: ${record.qualityScore}%`,
        'quality-check'
      );
    }

    // Critical: Stub rate above 20%
    if (record.stubRate > 0.2) {
      this.raiseAlert(
        'critical',
        `Stub rate critically high: ${(record.stubRate * 100).toFixed(1)}%`,
        'stub-check'
      );
    }

    // Warning: Generation time above 30s
    if (record.generationTimeMs > 30000) {
      this.raiseAlert(
        'warning',
        `Generation time slow: ${(record.generationTimeMs / 1000).toFixed(1)}s`,
        'performance-check'
      );
    }

    // Check consecutive failures
    const recentRecords = this.records.slice(-5);
    const consecutiveFailures = recentRecords.filter(r => !r.success).length;
    if (consecutiveFailures >= 3) {
      this.raiseAlert(
        'critical',
        `${consecutiveFailures} consecutive generation failures`,
        'failure-check'
      );
    }

    // Check provider circuit breakers
    for (const [provider, metrics] of Array.from(this.providerMetrics)) {
      if (metrics.circuitState === 'open') {
        this.raiseAlert(
          'warning',
          `Provider ${provider} circuit breaker is OPEN`,
          `circuit-${provider}`
        );
      }
    }
  }

  private raiseAlert(
    level: 'critical' | 'warning' | 'info',
    message: string,
    source: string
  ): void {
    // Check cooldown
    const lastTime = this.lastAlertTime.get(source);
    if (lastTime && Date.now() - lastTime < ALERT_COOLDOWN_MS) {
      return;
    }

    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      level,
      message,
      timestamp: new Date().toISOString(),
      source,
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.lastAlertTime.set(source, Date.now());

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log critical alerts
    if (level === 'critical') {
      console.error(`[QualityDashboard] CRITICAL ALERT: ${message}`);
    }
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // METRICS RETRIEVAL
  // ──────────────────────────────────────────────────────────────────────────────

  getMetrics(): DashboardMetrics {
    const now = new Date().toISOString();
    const recentRecords = this.records.slice(-100);

    // Generation stats
    const totalRequests = recentRecords.length;
    const successfulRequests = recentRecords.filter(r => r.success).length;
    const avgQualityScore =
      recentRecords.reduce((sum, r) => sum + r.qualityScore, 0) / Math.max(totalRequests, 1);
    const avgGenerationTime =
      recentRecords.reduce((sum, r) => sum + r.generationTimeMs, 0) / Math.max(totalRequests, 1);

    // Healing stats
    const healedRecords = recentRecords.filter(r => r.healingApplied);
    const healingRate = healedRecords.length / Math.max(totalRequests, 1);
    const avgHealingTime =
      healedRecords.reduce((sum, r) => sum + r.generationTimeMs * 0.3, 0) /
      Math.max(healedRecords.length, 1); // Estimate 30% of time is healing

    // Top issues
    const issueCount: Record<string, number> = {};
    for (const record of recentRecords) {
      for (const error of record.errors) {
        issueCount[error] = (issueCount[error] || 0) + 1;
      }
    }
    const topIssues = Object.entries(issueCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, count }));

    // Provider stats
    const providers: ProviderStatus[] = [];
    for (const [name, metrics] of Array.from(this.providerMetrics)) {
      providers.push({
        name,
        healthy: metrics.circuitState !== 'open',
        latencyMs: metrics.totalLatencyMs / Math.max(metrics.totalRequests, 1),
        successRate: metrics.successfulRequests / Math.max(metrics.totalRequests, 1),
        requestsToday: metrics.totalRequests,
        costToday: 0, // Would need cost tracking
        lastError: metrics.lastError,
        lastErrorTime: metrics.lastErrorTime,
        circuitBreaker: {
          state: metrics.circuitState,
          failureCount: metrics.failureCount,
        },
      });
    }

    return {
      timestamp: now,
      generation: {
        totalRequests,
        successRate: successfulRequests / Math.max(totalRequests, 1),
        avgGenerationTime,
        avgQualityScore,
      },
      healing: {
        healingRate,
        avgHealingTime,
        topIssues,
        learningEntries: 0, // Would come from SelfHealingGenerator
      },
      providers,
      trends: {
        qualityScores: this.trends.qualityScores.map(t => ({ time: t.time, score: t.value })),
        stubRates: this.trends.stubRates.map(t => ({ time: t.time, rate: t.value })),
        firstPassRates: this.trends.firstPassRates.map(t => ({ time: t.time, rate: t.value })),
      },
      alerts: this.alerts.map(a => ({
        level: a.level,
        message: a.message,
        timestamp: a.timestamp,
      })),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // ANALYTICS
  // ──────────────────────────────────────────────────────────────────────────────

  getQualityTrend(hours: number = 24): { improving: boolean; delta: number } {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const recentScores = this.trends.qualityScores.filter(t => new Date(t.time).getTime() > cutoff);

    if (recentScores.length < 2) {
      return { improving: true, delta: 0 };
    }

    const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
    const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));

    const firstAvg = firstHalf.reduce((sum, t) => sum + t.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, t) => sum + t.value, 0) / secondHalf.length;

    return {
      improving: secondAvg >= firstAvg,
      delta: secondAvg - firstAvg,
    };
  }

  predictNextHourQuality(): number {
    const recentScores = this.trends.qualityScores.slice(-20);
    if (recentScores.length < 5) {
      return 85; // Default prediction
    }

    // Simple linear regression
    const n = recentScores.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recentScores[i].value;
      sumXY += i * recentScores[i].value;
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next point
    const prediction = intercept + slope * n;

    // Clamp to valid range
    return Math.max(0, Math.min(100, prediction));
  }

  getProviderRecommendation(): string {
    let bestProvider = '';
    let bestScore = -1;

    for (const [name, metrics] of Array.from(this.providerMetrics)) {
      if (metrics.circuitState === 'open') continue;

      const successRate = metrics.successfulRequests / Math.max(metrics.totalRequests, 1);
      const avgLatency = metrics.totalLatencyMs / Math.max(metrics.totalRequests, 1);

      // Score: 70% success rate + 30% speed (inverse latency)
      const latencyScore = Math.max(0, 1 - avgLatency / 30000);
      const score = successRate * 0.7 + latencyScore * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestProvider = name;
      }
    }

    return bestProvider || 'pollinations'; // Default to free provider
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // DATA MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────────

  private pruneOldRecords(): void {
    const cutoff = Date.now() - this.retentionHours * 60 * 60 * 1000;
    this.records = this.records.filter(r => new Date(r.timestamp).getTime() > cutoff);
  }

  exportMetrics(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        records: this.records,
        alerts: this.alerts,
        trends: this.trends,
        providerMetrics: Object.fromEntries(this.providerMetrics),
      },
      null,
      2
    );
  }

  importMetrics(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.records) this.records = parsed.records;
      if (parsed.alerts) this.alerts = parsed.alerts;
      if (parsed.trends) this.trends = parsed.trends;
      if (parsed.providerMetrics) {
        this.providerMetrics = new Map(Object.entries(parsed.providerMetrics));
      }
    } catch (error) {
      console.error('[QualityDashboard] Failed to import metrics:', error);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // REAL-TIME UPDATES
  // ──────────────────────────────────────────────────────────────────────────────

  subscribe(listener: (metrics: DashboardMetrics) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const metrics = this.getMetrics();
    for (const listener of this.listeners) {
      try {
        listener(metrics);
      } catch (error) {
        console.error('[QualityDashboard] Listener error:', error);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // RESET
  // ──────────────────────────────────────────────────────────────────────────────

  reset(): void {
    this.records = [];
    this.alerts = [];
    this.providerMetrics.clear();
    this.trends = {
      qualityScores: [],
      stubRates: [],
      firstPassRates: [],
    };
    this.lastAlertTime.clear();
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// FACTORY
// ════════════════════════════════════════════════════════════════════════════════

let instance: QualityDashboard | null = null;

export function getQualityDashboard(): QualityDashboard {
  if (!instance) {
    instance = new QualityDashboard();
  }
  return instance;
}

export default QualityDashboard;
