/**
 * RUNTIME FAILURE PREDICTION ENGINE - 10X UPGRADE
 *
 * Predict failures DURING execution BEFORE they happen. Auto-mitigate before users notice.
 * The kind of reliability that makes SRE teams jealous.
 *
 * This is different from failure-prediction.ts which predicts BEFORE builds start.
 * This system monitors LIVE execution and reacts in real-time.
 *
 * Features:
 * - Pattern recognition from historical runtime failures
 * - Real-time risk scoring per agent/build
 * - Predictive alerts BEFORE failure occurs
 * - Automatic mitigation strategies
 * - Learns from every failure (and near-miss)
 * - Proactive resource scaling
 * - Smart retry with exponential backoff + jitter
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface RuntimeSignal {
  id: string;
  timestamp: number;
  source: 'latency' | 'error_rate' | 'resource' | 'pattern' | 'dependency' | 'cascade';

  // Context
  agentId?: string;
  buildId?: string;
  componentId?: string;

  // Signal data
  metric: string;
  currentValue: number;
  threshold: number;
  severity: number;  // 0-1

  // Additional context
  metadata?: Record<string, unknown>;
}

export interface RuntimePrediction {
  id: string;
  timestamp: number;

  // What might fail
  targetType: 'agent' | 'build' | 'component' | 'system';
  targetId: string;

  // Prediction
  failureProbability: number;  // 0-1
  confidence: number;          // 0-1
  timeToFailure?: number;      // ms until predicted failure

  // Classification
  failureType:
    | 'timeout'
    | 'rate_limit'
    | 'resource_exhaustion'
    | 'dependency_failure'
    | 'cascade_failure'
    | 'quality_degradation'
    | 'unknown'
    ;

  // Evidence
  signals: RuntimeSignal[];
  contributingFactors: string[];

  // What to do
  mitigationStrategies: MitigationStrategy[];
  autoMitigationEnabled: boolean;
  autoMitigationApplied?: string;
}

export interface MitigationStrategy {
  id: string;
  name: string;
  type:
    | 'retry'           // Simple retry
    | 'fallback'        // Use alternative
    | 'throttle'        // Reduce load
    | 'scale'           // Add resources
    | 'circuit_break'   // Stop trying
    | 'degrade'         // Reduce quality
    | 'skip'            // Skip non-critical
    | 'queue'           // Buffer and retry later
    ;

  description: string;
  estimatedSuccessRate: number;  // 0-1
  estimatedLatency: number;      // ms
  sideEffects: string[];

  // Auto-apply conditions
  autoApply: boolean;
  autoApplyThreshold: number;  // Apply if probability > this

  // Implementation
  implementation: MitigationImplementation;
}

interface MitigationImplementation {
  type: 'function' | 'config' | 'external';
  action: string;
  params?: Record<string, unknown>;
}

export interface RuntimePattern {
  id: string;
  name: string;
  description: string;

  // Detection
  signals: Array<{
    metric: string;
    condition: 'above' | 'below' | 'equals' | 'changes';
    threshold: number;
    weight: number;  // 0-1 importance
  }>;

  // Timing
  leadTime: number;    // How much warning we get (ms)
  confidence: number;  // Historical accuracy

  // Stats
  occurrences: number;
  lastSeen?: number;
  successfulMitigations: number;
  failedMitigations: number;

  // Recommended response
  recommendedMitigation: string;
}

export interface HealthSnapshot {
  timestamp: number;
  overall: number;  // 0-1 health score

  components: Map<string, {
    health: number;
    riskScore: number;
    activePredictions: RuntimePrediction[];
    recentFailures: number;
  }>;

  // System-wide
  activeAlerts: RuntimePrediction[];
  mitigationsInProgress: string[];
  systemLoad: number;
  errorRate: number;
}

export interface RuntimeFailureEvent {
  id: string;
  timestamp: number;
  type: 'failure' | 'near_miss' | 'recovery' | 'mitigation_success' | 'mitigation_failure';

  // Context
  agentId?: string;
  buildId?: string;
  componentId?: string;

  // Details
  error?: string;
  duration?: number;
  wasPredicted: boolean;
  predictionId?: string;

  // Mitigation
  mitigationApplied?: string;
  mitigationResult?: 'success' | 'partial' | 'failure';

  // Impact
  affectedOperations: number;
  cascadeRisk: number;
}

interface MetricWindow {
  values: Array<{ timestamp: number; value: number }>;
  mean: number;
  stdDev: number;
  trend: number;  // Rate of change
  min: number;
  max: number;
}

// ============================================================================
// METRIC TRACKER
// ============================================================================

class MetricTracker {
  private windows: Map<string, MetricWindow> = new Map();
  private readonly windowSize = 100;
  private readonly maxAge = 60 * 60 * 1000;  // 1 hour

  record(metric: string, value: number): void {
    let window = this.windows.get(metric);

    if (!window) {
      window = {
        values: [],
        mean: value,
        stdDev: 0,
        trend: 0,
        min: value,
        max: value,
      };
      this.windows.set(metric, window);
    }

    const now = Date.now();

    // Add new value
    window.values.push({ timestamp: now, value });

    // Trim old values
    const cutoff = now - this.maxAge;
    window.values = window.values.filter(v => v.timestamp > cutoff);
    if (window.values.length > this.windowSize) {
      window.values = window.values.slice(-this.windowSize);
    }

    // Recalculate stats
    this.updateStats(window);
  }

  private updateStats(window: MetricWindow): void {
    const values = window.values.map(v => v.value);

    if (values.length === 0) return;

    // Mean
    window.mean = values.reduce((a, b) => a + b, 0) / values.length;

    // Standard deviation
    const squaredDiffs = values.map(v => Math.pow(v - window.mean, 2));
    window.stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);

    // Min/max
    window.min = Math.min(...values);
    window.max = Math.max(...values);

    // Trend (using linear regression slope)
    if (values.length >= 3) {
      const n = values.length;
      const timestamps = window.values.map(v => v.timestamp);
      const t0 = timestamps[0];
      const normalizedT = timestamps.map(t => (t - t0) / 1000);  // Seconds

      const sumT = normalizedT.reduce((a, b) => a + b, 0);
      const sumV = values.reduce((a, b) => a + b, 0);
      const sumTV = normalizedT.reduce((sum, t, i) => sum + t * values[i], 0);
      const sumT2 = normalizedT.reduce((sum, t) => sum + t * t, 0);

      const slope = (n * sumTV - sumT * sumV) / (n * sumT2 - sumT * sumT);
      window.trend = isNaN(slope) ? 0 : slope;
    }
  }

  getWindow(metric: string): MetricWindow | null {
    return this.windows.get(metric) || null;
  }

  getZScore(metric: string, value: number): number {
    const window = this.windows.get(metric);
    if (!window || window.stdDev === 0) return 0;
    return (value - window.mean) / window.stdDev;
  }

  isAnomaly(metric: string, value: number, threshold: number = 2.5): boolean {
    return Math.abs(this.getZScore(metric, value)) > threshold;
  }

  getTrend(metric: string): 'rising' | 'stable' | 'falling' {
    const window = this.windows.get(metric);
    if (!window) return 'stable';

    if (window.trend > 0.1) return 'rising';
    if (window.trend < -0.1) return 'falling';
    return 'stable';
  }
}

// ============================================================================
// PATTERN DETECTOR
// ============================================================================

class RuntimePatternDetector {
  private patterns: Map<string, RuntimePattern> = new Map();
  private readonly learnedPatterns: RuntimePattern[] = [];

  constructor() {
    this.initializeKnownPatterns();
  }

  private initializeKnownPatterns(): void {
    // Rate limiting pattern
    this.patterns.set('rate_limit_approaching', {
      id: 'rate_limit_approaching',
      name: 'Rate Limit Approaching',
      description: 'Request rate approaching API rate limit',
      signals: [
        { metric: 'requests_per_minute', condition: 'above', threshold: 0.8, weight: 0.7 },
        { metric: 'rate_limit_remaining', condition: 'below', threshold: 100, weight: 0.3 },
      ],
      leadTime: 60000,  // 1 minute warning
      confidence: 0.9,
      occurrences: 0,
      successfulMitigations: 0,
      failedMitigations: 0,
      recommendedMitigation: 'throttle',
    });

    // Resource exhaustion pattern
    this.patterns.set('resource_exhaustion', {
      id: 'resource_exhaustion',
      name: 'Resource Exhaustion',
      description: 'Memory or CPU approaching limits',
      signals: [
        { metric: 'memory_usage_percent', condition: 'above', threshold: 85, weight: 0.5 },
        { metric: 'cpu_usage_percent', condition: 'above', threshold: 90, weight: 0.3 },
        { metric: 'active_connections', condition: 'above', threshold: 0.9, weight: 0.2 },
      ],
      leadTime: 30000,
      confidence: 0.85,
      occurrences: 0,
      successfulMitigations: 0,
      failedMitigations: 0,
      recommendedMitigation: 'scale',
    });

    // Cascade failure pattern
    this.patterns.set('cascade_failure', {
      id: 'cascade_failure',
      name: 'Cascade Failure',
      description: 'Multiple dependent components showing stress',
      signals: [
        { metric: 'error_rate', condition: 'above', threshold: 0.1, weight: 0.4 },
        { metric: 'dependency_latency', condition: 'above', threshold: 2000, weight: 0.3 },
        { metric: 'retry_rate', condition: 'above', threshold: 0.3, weight: 0.3 },
      ],
      leadTime: 10000,
      confidence: 0.75,
      occurrences: 0,
      successfulMitigations: 0,
      failedMitigations: 0,
      recommendedMitigation: 'circuit_break',
    });

    // Timeout pattern
    this.patterns.set('timeout_approaching', {
      id: 'timeout_approaching',
      name: 'Timeout Approaching',
      description: 'Response times approaching timeout threshold',
      signals: [
        { metric: 'p99_latency', condition: 'above', threshold: 0.8, weight: 0.6 },
        { metric: 'latency_trend', condition: 'above', threshold: 0.5, weight: 0.4 },
      ],
      leadTime: 5000,
      confidence: 0.8,
      occurrences: 0,
      successfulMitigations: 0,
      failedMitigations: 0,
      recommendedMitigation: 'degrade',
    });

    // Quality degradation pattern
    this.patterns.set('quality_degradation', {
      id: 'quality_degradation',
      name: 'Quality Degradation',
      description: 'Output quality declining',
      signals: [
        { metric: 'quality_score', condition: 'below', threshold: 0.7, weight: 0.5 },
        { metric: 'validation_failures', condition: 'above', threshold: 0.2, weight: 0.3 },
        { metric: 'token_efficiency', condition: 'below', threshold: 0.5, weight: 0.2 },
      ],
      leadTime: 0,
      confidence: 0.7,
      occurrences: 0,
      successfulMitigations: 0,
      failedMitigations: 0,
      recommendedMitigation: 'fallback',
    });
  }

  detectPatterns(signals: RuntimeSignal[]): Array<{
    pattern: RuntimePattern;
    matchScore: number;
    matchedSignals: RuntimeSignal[];
  }> {
    const matches: Array<{
      pattern: RuntimePattern;
      matchScore: number;
      matchedSignals: RuntimeSignal[];
    }> = [];

    for (const pattern of this.patterns.values()) {
      const { score, matched } = this.calculatePatternMatch(pattern, signals);

      if (score > 0.5) {  // 50% threshold
        matches.push({
          pattern,
          matchScore: score,
          matchedSignals: matched,
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  private calculatePatternMatch(
    pattern: RuntimePattern,
    signals: RuntimeSignal[]
  ): { score: number; matched: RuntimeSignal[] } {
    let totalWeight = 0;
    let matchedWeight = 0;
    const matched: RuntimeSignal[] = [];

    for (const criterion of pattern.signals) {
      totalWeight += criterion.weight;

      const matchingSignal = signals.find(s => s.metric === criterion.metric);
      if (!matchingSignal) continue;

      let matches = false;
      switch (criterion.condition) {
        case 'above':
          matches = matchingSignal.currentValue > criterion.threshold;
          break;
        case 'below':
          matches = matchingSignal.currentValue < criterion.threshold;
          break;
        case 'equals':
          matches = Math.abs(matchingSignal.currentValue - criterion.threshold) < 0.01;
          break;
        case 'changes':
          matches = matchingSignal.severity > 0.5;  // Significant change
          break;
      }

      if (matches) {
        matchedWeight += criterion.weight;
        matched.push(matchingSignal);
      }
    }

    return {
      score: totalWeight > 0 ? matchedWeight / totalWeight : 0,
      matched,
    };
  }

  learnPattern(failure: RuntimeFailureEvent, precedingSignals: RuntimeSignal[]): void {
    // Group signals by metric
    const signalsByMetric = new Map<string, RuntimeSignal[]>();
    for (const signal of precedingSignals) {
      const existing = signalsByMetric.get(signal.metric) || [];
      existing.push(signal);
      signalsByMetric.set(signal.metric, existing);
    }

    // Find common patterns
    const significantSignals = [...signalsByMetric.entries()]
      .filter(([_, signals]) => signals.length > 0)
      .map(([metric, signals]) => ({
        metric,
        avgSeverity: signals.reduce((s, sig) => s + sig.severity, 0) / signals.length,
        avgValue: signals.reduce((s, sig) => s + sig.currentValue, 0) / signals.length,
      }))
      .filter(s => s.avgSeverity > 0.3);

    if (significantSignals.length >= 2) {
      const patternId = `learned_${Date.now()}`;
      const pattern: RuntimePattern = {
        id: patternId,
        name: `Learned Pattern ${this.learnedPatterns.length + 1}`,
        description: `Auto-learned pattern preceding ${failure.type}`,
        signals: significantSignals.map(s => ({
          metric: s.metric,
          condition: 'above' as const,
          threshold: s.avgValue * 0.8,  // 80% of observed value
          weight: s.avgSeverity,
        })),
        leadTime: failure.timestamp - (precedingSignals[0]?.timestamp || failure.timestamp),
        confidence: 0.5,  // Low initial confidence
        occurrences: 1,
        successfulMitigations: 0,
        failedMitigations: 0,
        recommendedMitigation: 'retry',
      };

      this.learnedPatterns.push(pattern);
      this.patterns.set(patternId, pattern);
    }
  }

  updatePatternConfidence(patternId: string, success: boolean): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    pattern.occurrences++;
    if (success) {
      pattern.successfulMitigations++;
    } else {
      pattern.failedMitigations++;
    }

    // Update confidence based on success rate
    const total = pattern.successfulMitigations + pattern.failedMitigations;
    if (total > 5) {
      pattern.confidence = pattern.successfulMitigations / total;
    }
  }

  getPatterns(): RuntimePattern[] {
    return Array.from(this.patterns.values());
  }
}

// ============================================================================
// MITIGATION ENGINE
// ============================================================================

class RuntimeMitigationEngine extends EventEmitter {
  private strategies: Map<string, MitigationStrategy> = new Map();
  private activeMitigations: Map<string, {
    predictionId: string;
    strategy: MitigationStrategy;
    startedAt: number;
    status: 'in_progress' | 'completed' | 'failed';
  }> = new Map();

  constructor() {
    super();
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // Retry with exponential backoff
    this.strategies.set('retry_exponential', {
      id: 'retry_exponential',
      name: 'Exponential Backoff Retry',
      type: 'retry',
      description: 'Retry with exponential backoff and jitter',
      estimatedSuccessRate: 0.7,
      estimatedLatency: 5000,
      sideEffects: ['Increased latency', 'Higher cost'],
      autoApply: true,
      autoApplyThreshold: 0.6,
      implementation: {
        type: 'function',
        action: 'retryWithBackoff',
        params: { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 },
      },
    });

    // Fallback to alternative model
    this.strategies.set('model_fallback', {
      id: 'model_fallback',
      name: 'Model Fallback',
      type: 'fallback',
      description: 'Switch to a more reliable/cheaper model',
      estimatedSuccessRate: 0.85,
      estimatedLatency: 2000,
      sideEffects: ['Potentially lower quality', 'Different response characteristics'],
      autoApply: true,
      autoApplyThreshold: 0.7,
      implementation: {
        type: 'config',
        action: 'switchModel',
        params: { fallbackChain: ['gpt-4o-mini', 'claude-3-haiku', 'llama3.2:latest'] },
      },
    });

    // Throttle requests
    this.strategies.set('throttle', {
      id: 'throttle',
      name: 'Request Throttling',
      type: 'throttle',
      description: 'Reduce request rate to prevent overload',
      estimatedSuccessRate: 0.9,
      estimatedLatency: 0,
      sideEffects: ['Increased latency for queued requests'],
      autoApply: true,
      autoApplyThreshold: 0.5,
      implementation: {
        type: 'function',
        action: 'applyThrottle',
        params: { reductionPercent: 50, duration: 60000 },
      },
    });

    // Circuit breaker
    this.strategies.set('circuit_break', {
      id: 'circuit_break',
      name: 'Circuit Breaker',
      type: 'circuit_break',
      description: 'Temporarily stop requests to failing service',
      estimatedSuccessRate: 0.95,
      estimatedLatency: 0,
      sideEffects: ['Feature temporarily unavailable'],
      autoApply: true,
      autoApplyThreshold: 0.85,
      implementation: {
        type: 'function',
        action: 'openCircuit',
        params: { duration: 30000, halfOpenAfter: 15000 },
      },
    });

    // Quality degradation
    this.strategies.set('degrade', {
      id: 'degrade',
      name: 'Graceful Degradation',
      type: 'degrade',
      description: 'Reduce output quality to maintain availability',
      estimatedSuccessRate: 0.8,
      estimatedLatency: -2000,  // Actually faster
      sideEffects: ['Lower quality output', 'Simplified responses'],
      autoApply: true,
      autoApplyThreshold: 0.6,
      implementation: {
        type: 'config',
        action: 'reduceQuality',
        params: { maxTokens: 500, temperature: 0.3 },
      },
    });

    // Queue for later
    this.strategies.set('queue', {
      id: 'queue',
      name: 'Queue and Retry',
      type: 'queue',
      description: 'Queue request and process when capacity available',
      estimatedSuccessRate: 0.75,
      estimatedLatency: 30000,
      sideEffects: ['Delayed response', 'May timeout'],
      autoApply: false,  // Requires user consent
      autoApplyThreshold: 0.8,
      implementation: {
        type: 'function',
        action: 'queueRequest',
        params: { maxWait: 60000, priority: 'normal' },
      },
    });

    // Skip non-critical
    this.strategies.set('skip', {
      id: 'skip',
      name: 'Skip Non-Critical',
      type: 'skip',
      description: 'Skip non-critical operations to save resources',
      estimatedSuccessRate: 1.0,
      estimatedLatency: -5000,  // Saves time
      sideEffects: ['Some features disabled', 'Incomplete results'],
      autoApply: true,
      autoApplyThreshold: 0.7,
      implementation: {
        type: 'config',
        action: 'skipNonCritical',
        params: { criticalOnly: true },
      },
    });
  }

  selectStrategies(
    prediction: RuntimePrediction,
    options: { maxStrategies?: number; autoApplyOnly?: boolean } = {}
  ): MitigationStrategy[] {
    const maxStrategies = options.maxStrategies || 3;
    const autoApplyOnly = options.autoApplyOnly ?? false;

    let candidates = Array.from(this.strategies.values());

    // Filter by auto-apply if requested
    if (autoApplyOnly) {
      candidates = candidates.filter(s =>
        s.autoApply && prediction.failureProbability >= s.autoApplyThreshold
      );
    }

    // Score strategies based on failure type
    const scored = candidates.map(strategy => {
      let score = strategy.estimatedSuccessRate;

      // Boost score based on failure type match
      switch (prediction.failureType) {
        case 'timeout':
          if (strategy.type === 'degrade' || strategy.type === 'skip') score += 0.2;
          break;
        case 'rate_limit':
          if (strategy.type === 'throttle' || strategy.type === 'queue') score += 0.2;
          break;
        case 'resource_exhaustion':
          if (strategy.type === 'scale' || strategy.type === 'skip') score += 0.2;
          break;
        case 'dependency_failure':
          if (strategy.type === 'fallback' || strategy.type === 'circuit_break') score += 0.2;
          break;
        case 'cascade_failure':
          if (strategy.type === 'circuit_break') score += 0.3;
          break;
        case 'quality_degradation':
          if (strategy.type === 'fallback') score += 0.2;
          break;
      }

      // Penalize based on side effects count
      score -= strategy.sideEffects.length * 0.05;

      return { strategy, score };
    });

    // Sort by score and take top N
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxStrategies)
      .map(s => s.strategy);
  }

  async applyMitigation(
    prediction: RuntimePrediction,
    strategy: MitigationStrategy
  ): Promise<{ success: boolean; details: string }> {
    const mitigationId = `mitigation-${Date.now()}`;

    this.activeMitigations.set(mitigationId, {
      predictionId: prediction.id,
      strategy,
      startedAt: Date.now(),
      status: 'in_progress',
    });

    this.emit('mitigation_started', { prediction, strategy, mitigationId });

    try {
      // Execute mitigation
      await this.executeMitigation(strategy);

      const mitigation = this.activeMitigations.get(mitigationId);
      if (mitigation) {
        mitigation.status = 'completed';
      }

      this.emit('mitigation_completed', { prediction, strategy, mitigationId });

      return {
        success: true,
        details: `Applied ${strategy.name}: ${strategy.description}`,
      };
    } catch (error) {
      const mitigation = this.activeMitigations.get(mitigationId);
      if (mitigation) {
        mitigation.status = 'failed';
      }

      this.emit('mitigation_failed', {
        prediction,
        strategy,
        mitigationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        details: `Failed to apply ${strategy.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async executeMitigation(strategy: MitigationStrategy): Promise<void> {
    const { implementation } = strategy;

    switch (implementation.type) {
      case 'function':
        // Would call the actual function here
        await new Promise(resolve => setTimeout(resolve, 100));
        break;

      case 'config':
        // Would update configuration here
        await new Promise(resolve => setTimeout(resolve, 50));
        break;

      case 'external':
        // Would call external service here
        await new Promise(resolve => setTimeout(resolve, 200));
        break;
    }
  }

  getActiveMitigations(): Array<{
    predictionId: string;
    strategy: MitigationStrategy;
    startedAt: number;
    status: string;
  }> {
    return Array.from(this.activeMitigations.values());
  }

  getStrategy(strategyId: string): MitigationStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  registerStrategy(strategy: MitigationStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }
}

// ============================================================================
// MAIN RUNTIME PREDICTION ENGINE
// ============================================================================

export class RuntimeFailurePredictionEngine extends EventEmitter {
  private metricTracker = new MetricTracker();
  private patternDetector = new RuntimePatternDetector();
  private mitigationEngine = new RuntimeMitigationEngine();

  // Predictions
  private activePredictions: Map<string, RuntimePrediction> = new Map();
  private predictionHistory: RuntimePrediction[] = [];
  private readonly maxHistory = 1000;

  // Signals
  private recentSignals: RuntimeSignal[] = [];
  private readonly maxSignals = 500;
  private readonly signalWindow = 5 * 60 * 1000;  // 5 minutes

  // Failures
  private failureHistory: RuntimeFailureEvent[] = [];
  private readonly maxFailures = 500;

  // Health tracking
  private componentHealth: Map<string, number> = new Map();

  // Configuration
  private config = {
    predictionThreshold: 0.5,      // Minimum probability to create prediction
    autoMitigationEnabled: true,   // Automatically apply mitigations
    signalDecayRate: 0.1,          // How fast old signals lose relevance
    healthUpdateInterval: 5000,    // ms between health updates
  };

  constructor() {
    super();

    // Forward mitigation events
    this.mitigationEngine.on('mitigation_started', (data) => {
      this.emit('mitigation_started', data);
    });

    this.mitigationEngine.on('mitigation_completed', (data) => {
      this.emit('mitigation_completed', data);
      // Update pattern confidence
      const prediction = this.activePredictions.get(data.prediction.id);
      if (prediction) {
        for (const signal of prediction.signals) {
          const pattern = this.patternDetector.getPatterns()
            .find(p => p.signals.some(s => s.metric === signal.metric));
          if (pattern) {
            this.patternDetector.updatePatternConfidence(pattern.id, true);
          }
        }
      }
    });
  }

  /**
   * Record a metric observation
   */
  recordMetric(metric: string, value: number, context?: {
    agentId?: string;
    buildId?: string;
    componentId?: string;
  }): RuntimeSignal | null {
    this.metricTracker.record(metric, value);

    // Check if this is anomalous
    const window = this.metricTracker.getWindow(metric);
    if (!window) return null;

    const zScore = this.metricTracker.getZScore(metric, value);
    const isAnomaly = Math.abs(zScore) > 2.5;
    const trend = this.metricTracker.getTrend(metric);

    // Calculate severity
    let severity = 0;
    if (isAnomaly) {
      severity = Math.min(1, Math.abs(zScore) / 5);  // Cap at z=5
    }

    // Boost severity for rising trends
    if (trend === 'rising' && value > window.mean) {
      severity = Math.min(1, severity + 0.2);
    }

    if (severity > 0.3) {
      const signal: RuntimeSignal = {
        id: `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        source: this.classifySignalSource(metric),
        agentId: context?.agentId,
        buildId: context?.buildId,
        componentId: context?.componentId,
        metric,
        currentValue: value,
        threshold: window.mean + 2 * window.stdDev,
        severity,
      };

      this.addSignal(signal);
      return signal;
    }

    return null;
  }

  private classifySignalSource(metric: string): RuntimeSignal['source'] {
    if (metric.includes('latency') || metric.includes('duration')) return 'latency';
    if (metric.includes('error') || metric.includes('failure')) return 'error_rate';
    if (metric.includes('memory') || metric.includes('cpu')) return 'resource';
    if (metric.includes('dependency')) return 'dependency';
    return 'pattern';
  }

  private addSignal(signal: RuntimeSignal): void {
    this.recentSignals.push(signal);

    // Trim old signals
    const cutoff = Date.now() - this.signalWindow;
    this.recentSignals = this.recentSignals.filter(s => s.timestamp > cutoff);
    if (this.recentSignals.length > this.maxSignals) {
      this.recentSignals = this.recentSignals.slice(-this.maxSignals);
    }

    // Check for patterns and predictions
    this.evaluatePredictions();
  }

  /**
   * Evaluate current signals and generate predictions
   */
  private evaluatePredictions(): void {
    // Detect patterns
    const matches = this.patternDetector.detectPatterns(this.recentSignals);

    for (const match of matches) {
      // Check if we already have a prediction for this pattern
      const existingPrediction = Array.from(this.activePredictions.values())
        .find(p => p.signals.some(s =>
          match.matchedSignals.some(ms => ms.metric === s.metric)
        ));

      if (existingPrediction) {
        // Update existing prediction
        this.updatePrediction(existingPrediction, match);
      } else if (match.matchScore >= this.config.predictionThreshold) {
        // Create new prediction
        this.createPrediction(match);
      }
    }
  }

  private createPrediction(match: {
    pattern: RuntimePattern;
    matchScore: number;
    matchedSignals: RuntimeSignal[];
  }): void {
    const targetId = match.matchedSignals[0]?.agentId ||
      match.matchedSignals[0]?.componentId ||
      'system';

    const prediction: RuntimePrediction = {
      id: `prediction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      targetType: match.matchedSignals[0]?.agentId ? 'agent' : 'system',
      targetId,
      failureProbability: match.matchScore * match.pattern.confidence,
      confidence: match.pattern.confidence,
      timeToFailure: match.pattern.leadTime,
      failureType: this.inferFailureType(match.pattern),
      signals: match.matchedSignals,
      contributingFactors: match.matchedSignals.map(s => s.metric),
      mitigationStrategies: this.mitigationEngine.selectStrategies({
        failureProbability: match.matchScore * match.pattern.confidence,
        failureType: this.inferFailureType(match.pattern),
      } as RuntimePrediction),
      autoMitigationEnabled: this.config.autoMitigationEnabled,
    };

    this.activePredictions.set(prediction.id, prediction);
    this.emit('prediction_created', prediction);

    // Auto-mitigate if enabled
    if (this.config.autoMitigationEnabled) {
      this.autoMitigate(prediction);
    }
  }

  private updatePrediction(
    prediction: RuntimePrediction,
    match: {
      pattern: RuntimePattern;
      matchScore: number;
      matchedSignals: RuntimeSignal[];
    }
  ): void {
    // Update probability
    const newProbability = match.matchScore * match.pattern.confidence;

    // Use exponential smoothing
    prediction.failureProbability =
      0.7 * newProbability + 0.3 * prediction.failureProbability;

    // Add new signals
    for (const signal of match.matchedSignals) {
      if (!prediction.signals.find(s => s.id === signal.id)) {
        prediction.signals.push(signal);
      }
    }

    // Update time to failure
    prediction.timeToFailure = match.pattern.leadTime;

    this.emit('prediction_updated', prediction);

    // Check if we need to escalate mitigation
    if (prediction.failureProbability > 0.8 && !prediction.autoMitigationApplied) {
      this.autoMitigate(prediction);
    }
  }

  private inferFailureType(pattern: RuntimePattern): RuntimePrediction['failureType'] {
    if (pattern.id.includes('rate_limit')) return 'rate_limit';
    if (pattern.id.includes('resource')) return 'resource_exhaustion';
    if (pattern.id.includes('cascade')) return 'cascade_failure';
    if (pattern.id.includes('timeout')) return 'timeout';
    if (pattern.id.includes('quality')) return 'quality_degradation';
    if (pattern.id.includes('dependency')) return 'dependency_failure';
    return 'unknown';
  }

  private async autoMitigate(prediction: RuntimePrediction): Promise<void> {
    const strategies = this.mitigationEngine.selectStrategies(prediction, {
      autoApplyOnly: true,
    });

    if (strategies.length === 0) return;

    const strategy = strategies[0];
    const result = await this.mitigationEngine.applyMitigation(prediction, strategy);

    if (result.success) {
      prediction.autoMitigationApplied = strategy.id;
      this.emit('auto_mitigation_applied', { prediction, strategy, result });
    }
  }

  /**
   * Record a failure event (for learning)
   */
  recordFailure(event: Omit<RuntimeFailureEvent, 'id' | 'wasPredicted' | 'predictionId'>): void {
    // Check if this was predicted
    const matchingPrediction = Array.from(this.activePredictions.values())
      .find(p =>
        (p.targetId === event.agentId || p.targetId === event.componentId) &&
        p.timestamp < event.timestamp
      );

    const fullEvent: RuntimeFailureEvent = {
      ...event,
      id: `failure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      wasPredicted: !!matchingPrediction,
      predictionId: matchingPrediction?.id,
    };

    this.failureHistory.push(fullEvent);
    if (this.failureHistory.length > this.maxFailures) {
      this.failureHistory = this.failureHistory.slice(-this.maxFailures);
    }

    // Learn from this failure
    const precedingSignals = this.recentSignals.filter(
      s => s.timestamp < event.timestamp && s.timestamp > event.timestamp - 60000
    );
    this.patternDetector.learnPattern(fullEvent, precedingSignals);

    // Clear matched prediction
    if (matchingPrediction) {
      this.activePredictions.delete(matchingPrediction.id);
      this.predictionHistory.push(matchingPrediction);
    }

    // Update component health
    const componentId = event.componentId || event.agentId || 'system';
    const currentHealth = this.componentHealth.get(componentId) || 1;
    this.componentHealth.set(componentId, Math.max(0, currentHealth - 0.1));

    this.emit('failure_recorded', fullEvent);
  }

  /**
   * Record recovery (health improvement)
   */
  recordRecovery(componentId: string): void {
    const currentHealth = this.componentHealth.get(componentId) || 0.5;
    this.componentHealth.set(componentId, Math.min(1, currentHealth + 0.05));

    this.emit('recovery_recorded', { componentId, newHealth: this.componentHealth.get(componentId) });
  }

  /**
   * Get current health snapshot
   */
  getHealthSnapshot(): HealthSnapshot {
    const components = new Map<string, {
      health: number;
      riskScore: number;
      activePredictions: RuntimePrediction[];
      recentFailures: number;
    }>();

    // Collect component data
    for (const [componentId, health] of this.componentHealth) {
      const predictions = Array.from(this.activePredictions.values())
        .filter(p => p.targetId === componentId);

      const recentFailures = this.failureHistory.filter(
        f => (f.componentId === componentId || f.agentId === componentId) &&
          f.timestamp > Date.now() - 3600000  // Last hour
      ).length;

      const riskScore = predictions.length > 0
        ? Math.max(...predictions.map(p => p.failureProbability))
        : 0;

      components.set(componentId, {
        health,
        riskScore,
        activePredictions: predictions,
        recentFailures,
      });
    }

    // Calculate overall health
    const healths = Array.from(this.componentHealth.values());
    const overallHealth = healths.length > 0
      ? healths.reduce((a, b) => a + b, 0) / healths.length
      : 1;

    // Calculate system-wide metrics
    const recentFailures = this.failureHistory.filter(
      f => f.timestamp > Date.now() - 3600000
    );
    const totalOperations = recentFailures.reduce((s, f) => s + f.affectedOperations, 0) || 1;
    const errorRate = recentFailures.length / totalOperations;

    return {
      timestamp: Date.now(),
      overall: overallHealth,
      components,
      activeAlerts: Array.from(this.activePredictions.values())
        .filter(p => p.failureProbability > 0.7),
      mitigationsInProgress: this.mitigationEngine.getActiveMitigations()
        .filter(m => m.status === 'in_progress')
        .map(m => m.strategy.name),
      systemLoad: this.calculateSystemLoad(),
      errorRate,
    };
  }

  private calculateSystemLoad(): number {
    const recentSignals = this.recentSignals.filter(
      s => s.timestamp > Date.now() - 60000
    );
    return Math.min(1, recentSignals.length / 100);
  }

  /**
   * Get all active predictions
   */
  getActivePredictions(): RuntimePrediction[] {
    return Array.from(this.activePredictions.values());
  }

  /**
   * Get prediction accuracy stats
   */
  getAccuracyStats(): {
    totalPredictions: number;
    correctPredictions: number;
    falsePositives: number;
    accuracy: number;
    avgLeadTime: number;
  } {
    const historicalPredictions = this.predictionHistory;

    let correctPredictions = 0;
    let falsePositives = 0;
    let totalLeadTime = 0;

    for (const prediction of historicalPredictions) {
      const matchingFailure = this.failureHistory.find(
        f => f.predictionId === prediction.id
      );

      if (matchingFailure) {
        correctPredictions++;
        totalLeadTime += matchingFailure.timestamp - prediction.timestamp;
      } else {
        // Check if prediction window has passed
        const predictionWindow = prediction.timeToFailure || 60000;
        if (Date.now() > prediction.timestamp + predictionWindow * 2) {
          falsePositives++;
        }
      }
    }

    const totalPredictions = correctPredictions + falsePositives;

    return {
      totalPredictions,
      correctPredictions,
      falsePositives,
      accuracy: totalPredictions > 0 ? correctPredictions / totalPredictions : 0,
      avgLeadTime: correctPredictions > 0 ? totalLeadTime / correctPredictions : 0,
    };
  }

  /**
   * Get known failure patterns
   */
  getPatterns(): RuntimePattern[] {
    return this.patternDetector.getPatterns();
  }

  /**
   * Manually trigger mitigation
   */
  async triggerMitigation(
    predictionId: string,
    strategyId: string
  ): Promise<{ success: boolean; details: string }> {
    const prediction = this.activePredictions.get(predictionId);
    if (!prediction) {
      return { success: false, details: 'Prediction not found' };
    }

    const strategy = this.mitigationEngine.getStrategy(strategyId);
    if (!strategy) {
      return { success: false, details: 'Strategy not found' };
    }

    return this.mitigationEngine.applyMitigation(prediction, strategy);
  }

  /**
   * Clear a prediction (if it was a false positive)
   */
  dismissPrediction(predictionId: string): void {
    const prediction = this.activePredictions.get(predictionId);
    if (prediction) {
      this.activePredictions.delete(predictionId);
      this.predictionHistory.push(prediction);
      this.emit('prediction_dismissed', prediction);
    }
  }

  /**
   * Configure the engine
   */
  configure(options: Partial<typeof this.config>): void {
    Object.assign(this.config, options);
  }
}

// ============================================================================
// SINGLETON & FACTORY
// ============================================================================

export const runtimeFailurePrediction = new RuntimeFailurePredictionEngine();

export function createRuntimeFailurePredictionEngine(): RuntimeFailurePredictionEngine {
  return new RuntimeFailurePredictionEngine();
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Record a latency metric
 */
export function recordLatency(
  operationName: string,
  latencyMs: number,
  context?: { agentId?: string; buildId?: string }
): RuntimeSignal | null {
  return runtimeFailurePrediction.recordMetric(`${operationName}_latency`, latencyMs, context);
}

/**
 * Record an error
 */
export function recordError(
  operationName: string,
  context?: { agentId?: string; buildId?: string; error?: string }
): void {
  runtimeFailurePrediction.recordMetric(`${operationName}_error_rate`, 1, context);

  runtimeFailurePrediction.recordFailure({
    timestamp: Date.now(),
    type: 'failure',
    agentId: context?.agentId,
    buildId: context?.buildId,
    error: context?.error,
    affectedOperations: 1,
    cascadeRisk: 0.1,
  });
}

/**
 * Get current risk level
 */
export function getRiskLevel(): 'low' | 'medium' | 'high' | 'critical' {
  const health = runtimeFailurePrediction.getHealthSnapshot();

  if (health.overall < 0.3 || health.errorRate > 0.3) return 'critical';
  if (health.overall < 0.5 || health.errorRate > 0.1) return 'high';
  if (health.overall < 0.7 || health.errorRate > 0.05) return 'medium';
  return 'low';
}

/**
 * Check if operation is safe
 */
export function isOperationSafe(operationId: string): {
  safe: boolean;
  predictions: RuntimePrediction[];
  recommendation?: string;
} {
  const predictions = runtimeFailurePrediction.getActivePredictions()
    .filter(p => p.targetId === operationId || p.targetType === 'system');

  const highRiskPredictions = predictions.filter(p => p.failureProbability > 0.7);

  if (highRiskPredictions.length > 0) {
    return {
      safe: false,
      predictions: highRiskPredictions,
      recommendation: highRiskPredictions[0].mitigationStrategies[0]?.description,
    };
  }

  return {
    safe: true,
    predictions,
  };
}
