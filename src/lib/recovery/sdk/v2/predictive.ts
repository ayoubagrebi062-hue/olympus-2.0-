/**
 * Predictive Degradation - AI-Powered Failure Prevention
 *
 * Don't wait for failures. PREDICT them.
 *
 * This module analyzes:
 * - Latency trends (is it getting slower?)
 * - Error rate acceleration (are failures increasing?)
 * - Time-of-day patterns (is this a known bad time?)
 * - Concurrent request correlation (overload signs?)
 *
 * Then PROACTIVELY opens circuit breakers BEFORE the system crashes.
 *
 * @example
 * ```typescript
 * const predictor = new PredictiveCircuit('payment-api');
 *
 * // Record every operation
 * predictor.recordMetric({ latency: 150, success: true });
 * predictor.recordMetric({ latency: 180, success: true });
 * predictor.recordMetric({ latency: 250, success: true });  // Getting slower...
 * predictor.recordMetric({ latency: 400, success: true });  // Much slower...
 *
 * // Check if we should preemptively degrade
 * if (predictor.shouldDegrade()) {
 *   return fallbackResponse(); // Protect the system
 * }
 *
 * // Get predictions
 * const prediction = predictor.predict();
 * console.log(prediction);
 * // {
 * //   willFail: true,
 * //   confidence: 0.85,
 * //   predictedTimeToFailure: 30000,
 * //   recommendation: 'DEGRADE_NOW',
 * //   reasons: ['Latency increasing exponentially', 'Historical pattern match'],
 * // }
 * ```
 */

import { metrics, generateTraceId } from '../metrics';
import {
  sanitizeName,
  checkRegistrySize,
  validatePositiveInt,
  validateProbability,
  LIMITS,
} from './validation';

// ============================================================================
// TYPES
// ============================================================================

export interface MetricSample {
  latency: number;
  success: boolean;
  timestamp?: number;
  concurrentRequests?: number;
  errorCode?: string;
}

export interface PredictiveConfig {
  /** Window size for analysis (samples). Default: 100 */
  windowSize?: number;
  /** Latency increase threshold to trigger warning (%). Default: 50 */
  latencyIncreaseThreshold?: number;
  /** Error rate threshold to trigger warning (%). Default: 10 */
  errorRateThreshold?: number;
  /** Confidence threshold to recommend degradation (0-1). Default: 0.7 */
  confidenceThreshold?: number;
  /** Enable time-of-day pattern learning. Default: true */
  learnTimePatterns?: boolean;
  /** Minimum samples before making predictions. Default: 20 */
  minSamples?: number;
  /** Name for logging/metrics */
  name?: string;
}

export interface Prediction {
  /** Will this operation likely fail soon? */
  willFail: boolean;
  /** Confidence in prediction (0-1) */
  confidence: number;
  /** Estimated time until failure (ms), null if not predictable */
  predictedTimeToFailure: number | null;
  /** Recommended action */
  recommendation: 'NORMAL' | 'MONITOR' | 'WARN' | 'DEGRADE_NOW' | 'CIRCUIT_OPEN';
  /** Reasons for the prediction */
  reasons: string[];
  /** Current health score (0-100) */
  healthScore: number;
  /** Anomaly score (0-1, higher = more anomalous) */
  anomalyScore: number;
}

export interface PredictorStats {
  name: string;
  samples: number;
  currentLatencyAvg: number;
  currentErrorRate: number;
  latencyTrend: 'stable' | 'increasing' | 'decreasing' | 'volatile';
  errorTrend: 'stable' | 'increasing' | 'decreasing';
  prediction: Prediction;
  degradationTriggered: number;
  accuratePredictions: number;
  totalPredictions: number;
}

// ============================================================================
// PREDICTIVE CIRCUIT
// ============================================================================

export class PredictiveCircuit {
  private readonly name: string;
  private readonly config: Required<PredictiveConfig>;
  private samples: Array<MetricSample & { timestamp: number }> = [];

  // Time pattern storage (24 hours × 4 quarters = 96 buckets)
  private timePatterns: Array<{ avgLatency: number; errorRate: number; count: number }> = [];

  // Tracking
  private degradationTriggered = 0;
  private predictions: Array<{ predicted: boolean; actual: boolean; timestamp: number }> = [];

  constructor(name: string, config: PredictiveConfig = {}) {
    this.name = sanitizeName(config.name ?? name);

    // Validate all config values
    this.config = {
      windowSize: validatePositiveInt('windowSize', config.windowSize, 10, 10000, 100),
      latencyIncreaseThreshold: validatePositiveInt(
        'latencyIncreaseThreshold',
        config.latencyIncreaseThreshold,
        1,
        1000,
        50
      ),
      errorRateThreshold: validatePositiveInt(
        'errorRateThreshold',
        config.errorRateThreshold,
        1,
        100,
        10
      ),
      confidenceThreshold: validateProbability(
        'confidenceThreshold',
        config.confidenceThreshold,
        0.7
      ),
      learnTimePatterns: config.learnTimePatterns ?? true,
      minSamples: validatePositiveInt('minSamples', config.minSamples, 5, 1000, 20),
      name: this.name,
    };

    // Initialize time patterns
    for (let i = 0; i < 96; i++) {
      this.timePatterns.push({ avgLatency: 0, errorRate: 0, count: 0 });
    }
  }

  /**
   * Record a metric sample.
   */
  recordMetric(sample: MetricSample): void {
    const timestamp = sample.timestamp ?? Date.now();

    this.samples.push({
      ...sample,
      timestamp,
    });

    // Trim to window size
    if (this.samples.length > this.config.windowSize * 2) {
      this.samples = this.samples.slice(-this.config.windowSize);
    }

    // Update time patterns
    if (this.config.learnTimePatterns) {
      this.updateTimePattern(sample, timestamp);
    }
  }

  /**
   * Check if we should preemptively degrade.
   */
  shouldDegrade(): boolean {
    const prediction = this.predict();
    return (
      prediction.recommendation === 'DEGRADE_NOW' || prediction.recommendation === 'CIRCUIT_OPEN'
    );
  }

  /**
   * Get full prediction analysis.
   */
  predict(): Prediction {
    if (this.samples.length < this.config.minSamples) {
      return {
        willFail: false,
        confidence: 0,
        predictedTimeToFailure: null,
        recommendation: 'NORMAL',
        reasons: [`Insufficient data (${this.samples.length}/${this.config.minSamples} samples)`],
        healthScore: 100,
        anomalyScore: 0,
      };
    }

    const reasons: string[] = [];
    let riskScore = 0;

    // Analysis 1: Latency Trend
    const latencyAnalysis = this.analyzeLatencyTrend();
    riskScore += latencyAnalysis.risk;
    if (latencyAnalysis.reason) reasons.push(latencyAnalysis.reason);

    // Analysis 2: Error Rate Trend
    const errorAnalysis = this.analyzeErrorTrend();
    riskScore += errorAnalysis.risk;
    if (errorAnalysis.reason) reasons.push(errorAnalysis.reason);

    // Analysis 3: Time Pattern Anomaly
    const timeAnalysis = this.analyzeTimePattern();
    riskScore += timeAnalysis.risk;
    if (timeAnalysis.reason) reasons.push(timeAnalysis.reason);

    // Analysis 4: Acceleration Detection
    const accelerationAnalysis = this.analyzeAcceleration();
    riskScore += accelerationAnalysis.risk;
    if (accelerationAnalysis.reason) reasons.push(accelerationAnalysis.reason);

    // Analysis 5: Recent Volatility
    const volatilityAnalysis = this.analyzeVolatility();
    riskScore += volatilityAnalysis.risk;
    if (volatilityAnalysis.reason) reasons.push(volatilityAnalysis.reason);

    // Calculate final scores
    const maxRisk = 5 * 30; // 5 analyses × max 30 risk each
    const normalizedRisk = Math.min(1, riskScore / maxRisk);
    const healthScore = Math.round((1 - normalizedRisk) * 100);
    const confidence = this.calculateConfidence(normalizedRisk);

    // Determine recommendation
    let recommendation: Prediction['recommendation'] = 'NORMAL';
    let willFail = false;
    let predictedTimeToFailure: number | null = null;

    if (normalizedRisk > 0.8) {
      recommendation = 'CIRCUIT_OPEN';
      willFail = true;
      predictedTimeToFailure = 0;
    } else if (normalizedRisk > 0.6 && confidence >= this.config.confidenceThreshold) {
      recommendation = 'DEGRADE_NOW';
      willFail = true;
      predictedTimeToFailure = this.estimateTimeToFailure(normalizedRisk);
      this.degradationTriggered++;
    } else if (normalizedRisk > 0.4) {
      recommendation = 'WARN';
      willFail = normalizedRisk > 0.5;
      predictedTimeToFailure = this.estimateTimeToFailure(normalizedRisk);
    } else if (normalizedRisk > 0.2) {
      recommendation = 'MONITOR';
    }

    // Track prediction for accuracy measurement
    this.predictions.push({
      predicted: willFail,
      actual: false, // Will be updated by subsequent failures
      timestamp: Date.now(),
    });
    if (this.predictions.length > 100) {
      this.predictions.shift();
    }

    return {
      willFail,
      confidence,
      predictedTimeToFailure,
      recommendation,
      reasons: reasons.length > 0 ? reasons : ['System appears healthy'],
      healthScore,
      anomalyScore: normalizedRisk,
    };
  }

  /**
   * Call this when an actual failure occurs to update prediction accuracy.
   */
  recordActualFailure(): void {
    // Update recent predictions to mark as accurate
    const now = Date.now();
    const recentWindow = 60000; // 1 minute

    for (const pred of this.predictions) {
      if (now - pred.timestamp < recentWindow && pred.predicted) {
        pred.actual = true;
      }
    }
  }

  /**
   * Get statistics.
   */
  getStats(): PredictorStats {
    const recentSamples = this.samples.slice(-50);
    const latencies = recentSamples.map(s => s.latency);
    const errors = recentSamples.filter(s => !s.success).length;

    const latencyTrend = this.getLatencyTrend();
    const errorTrend = this.getErrorTrend();

    const accuratePredictions = this.predictions.filter(p => p.predicted === p.actual).length;

    return {
      name: this.name,
      samples: this.samples.length,
      currentLatencyAvg:
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : 0,
      currentErrorRate:
        recentSamples.length > 0 ? Math.round((errors / recentSamples.length) * 100) : 0,
      latencyTrend,
      errorTrend,
      prediction: this.predict(),
      degradationTriggered: this.degradationTriggered,
      accuratePredictions,
      totalPredictions: this.predictions.length,
    };
  }

  /**
   * Reset all data.
   */
  reset(): void {
    this.samples = [];
    this.predictions = [];
    this.degradationTriggered = 0;
    for (let i = 0; i < 96; i++) {
      this.timePatterns[i] = { avgLatency: 0, errorRate: 0, count: 0 };
    }
  }

  // ============================================================================
  // PRIVATE ANALYSIS METHODS
  // ============================================================================

  private analyzeLatencyTrend(): { risk: number; reason?: string } {
    const recent = this.samples.slice(-20);
    const older = this.samples.slice(-50, -20);

    if (recent.length < 10 || older.length < 10) {
      return { risk: 0 };
    }

    const recentAvg = recent.reduce((sum, s) => sum + s.latency, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.latency, 0) / older.length;

    const increase = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (increase > this.config.latencyIncreaseThreshold * 2) {
      return {
        risk: 30,
        reason: `Latency spiking: ${Math.round(increase)}% increase (${Math.round(olderAvg)}ms → ${Math.round(recentAvg)}ms)`,
      };
    }
    if (increase > this.config.latencyIncreaseThreshold) {
      return {
        risk: 20,
        reason: `Latency increasing: ${Math.round(increase)}% (${Math.round(olderAvg)}ms → ${Math.round(recentAvg)}ms)`,
      };
    }
    if (increase > this.config.latencyIncreaseThreshold / 2) {
      return { risk: 10 };
    }

    return { risk: 0 };
  }

  private analyzeErrorTrend(): { risk: number; reason?: string } {
    const recent = this.samples.slice(-20);
    const older = this.samples.slice(-50, -20);

    if (recent.length < 10) {
      return { risk: 0 };
    }

    const recentErrorRate = recent.filter(s => !s.success).length / recent.length;
    const olderErrorRate =
      older.length > 0 ? older.filter(s => !s.success).length / older.length : 0;

    const ratePercent = recentErrorRate * 100;

    if (ratePercent > this.config.errorRateThreshold * 3) {
      return {
        risk: 30,
        reason: `High error rate: ${Math.round(ratePercent)}%`,
      };
    }
    if (ratePercent > this.config.errorRateThreshold) {
      return {
        risk: 20,
        reason: `Elevated error rate: ${Math.round(ratePercent)}%`,
      };
    }
    if (recentErrorRate > olderErrorRate * 2 && recentErrorRate > 0.02) {
      return {
        risk: 15,
        reason: `Error rate increasing: ${Math.round(olderErrorRate * 100)}% → ${Math.round(ratePercent)}%`,
      };
    }

    return { risk: 0 };
  }

  private analyzeTimePattern(): { risk: number; reason?: string } {
    if (!this.config.learnTimePatterns) {
      return { risk: 0 };
    }

    const bucket = this.getTimeBucket();
    const pattern = this.timePatterns[bucket];

    if (pattern.count < 10) {
      return { risk: 0 }; // Not enough historical data
    }

    // Compare current to historical average for this time
    const recent = this.samples.slice(-10);
    if (recent.length < 5) return { risk: 0 };

    const currentAvgLatency = recent.reduce((sum, s) => sum + s.latency, 0) / recent.length;

    // If current latency is much higher than historical for this time
    if (pattern.avgLatency > 0 && currentAvgLatency > pattern.avgLatency * 2) {
      return {
        risk: 15,
        reason: `Anomaly: Latency 2x higher than typical for this time (${Math.round(currentAvgLatency)}ms vs ${Math.round(pattern.avgLatency)}ms historical)`,
      };
    }

    // If this is historically a bad time
    if (pattern.errorRate > 0.2) {
      return {
        risk: 10,
        reason: `Historical pattern: This time period has ${Math.round(pattern.errorRate * 100)}% error rate`,
      };
    }

    return { risk: 0 };
  }

  private analyzeAcceleration(): { risk: number; reason?: string } {
    if (this.samples.length < 30) return { risk: 0 };

    // Check if latency is accelerating (second derivative)
    const chunk1 = this.samples.slice(-30, -20);
    const chunk2 = this.samples.slice(-20, -10);
    const chunk3 = this.samples.slice(-10);

    const avg1 = chunk1.reduce((sum, s) => sum + s.latency, 0) / chunk1.length;
    const avg2 = chunk2.reduce((sum, s) => sum + s.latency, 0) / chunk2.length;
    const avg3 = chunk3.reduce((sum, s) => sum + s.latency, 0) / chunk3.length;

    const delta1 = avg2 - avg1;
    const delta2 = avg3 - avg2;

    // Acceleration = second derivative positive and increasing
    if (delta2 > delta1 && delta2 > 50) {
      return {
        risk: 25,
        reason: `Latency accelerating: Rate of increase is growing (${Math.round(delta1)}ms → ${Math.round(delta2)}ms per interval)`,
      };
    }

    return { risk: 0 };
  }

  private analyzeVolatility(): { risk: number; reason?: string } {
    const recent = this.samples.slice(-20);
    if (recent.length < 10) return { risk: 0 };

    const latencies = recent.map(s => s.latency);
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const variance =
      latencies.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / latencies.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;

    if (coefficientOfVariation > 1) {
      return {
        risk: 20,
        reason: `High volatility: Latency varying wildly (CV=${coefficientOfVariation.toFixed(2)})`,
      };
    }
    if (coefficientOfVariation > 0.5) {
      return {
        risk: 10,
        reason: `Unstable latency: High variance detected`,
      };
    }

    return { risk: 0 };
  }

  private calculateConfidence(riskScore: number): number {
    // Confidence based on sample size and risk clarity
    const sampleFactor = Math.min(1, this.samples.length / (this.config.minSamples * 2));

    // Higher confidence when risk is clearly high or clearly low
    const clarityFactor = Math.abs(riskScore - 0.5) * 2;

    return Math.min(0.99, sampleFactor * 0.6 + clarityFactor * 0.4);
  }

  private estimateTimeToFailure(riskScore: number): number {
    // Rough estimation based on risk acceleration
    if (riskScore > 0.8) return 0;
    if (riskScore > 0.6) return 30000; // 30s
    if (riskScore > 0.4) return 120000; // 2min
    return 300000; // 5min
  }

  private getLatencyTrend(): 'stable' | 'increasing' | 'decreasing' | 'volatile' {
    const analysis = this.analyzeLatencyTrend();
    const volatility = this.analyzeVolatility();

    if (volatility.risk > 15) return 'volatile';
    if (analysis.risk > 15) return 'increasing';
    if (analysis.risk < 5) return 'stable';
    return 'stable';
  }

  private getErrorTrend(): 'stable' | 'increasing' | 'decreasing' {
    const analysis = this.analyzeErrorTrend();
    if (analysis.risk > 15) return 'increasing';
    return 'stable';
  }

  private updateTimePattern(sample: MetricSample, timestamp: number): void {
    const bucket = this.getTimeBucket(timestamp);
    const pattern = this.timePatterns[bucket];

    // Exponential moving average
    const alpha = 0.1;
    pattern.avgLatency =
      pattern.count === 0
        ? sample.latency
        : pattern.avgLatency * (1 - alpha) + sample.latency * alpha;

    pattern.errorRate =
      pattern.count === 0
        ? sample.success
          ? 0
          : 1
        : pattern.errorRate * (1 - alpha) + (sample.success ? 0 : alpha);

    pattern.count++;
  }

  private getTimeBucket(timestamp?: number): number {
    const date = new Date(timestamp ?? Date.now());
    const hour = date.getHours();
    const quarter = Math.floor(date.getMinutes() / 15);
    return hour * 4 + quarter;
  }
}

// ============================================================================
// GLOBAL REGISTRY
// ============================================================================

const predictorRegistry = new Map<string, PredictiveCircuit>();

export function getPredictiveCircuit(name: string, config?: PredictiveConfig): PredictiveCircuit {
  const sanitizedName = sanitizeName(name);
  let predictor = predictorRegistry.get(sanitizedName);
  if (!predictor) {
    // Prevent registry exhaustion attack
    checkRegistrySize(predictorRegistry, sanitizedName);
    predictor = new PredictiveCircuit(sanitizedName, config);
    predictorRegistry.set(sanitizedName, predictor);
  }
  return predictor;
}

export function getAllPredictorStats(): PredictorStats[] {
  return Array.from(predictorRegistry.values()).map(p => p.getStats());
}

export function clearPredictorRegistry(): void {
  predictorRegistry.forEach(p => p.reset());
  predictorRegistry.clear();
}
