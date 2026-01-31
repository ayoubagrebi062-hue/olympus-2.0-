/**
 * ============================================================================
 * SELF-HEALING ENGINE - AUTONOMOUS RECOVERY
 * ============================================================================
 *
 * "The best system is one that fixes itself before you notice it's broken."
 *
 * This module implements autonomous recovery capabilities:
 * - Circuit breakers to prevent cascade failures
 * - Intelligent retry with exponential backoff + jitter
 * - Automatic fallback to alternative agents
 * - Health monitoring with predictive failure detection
 * - Self-organizing recovery workflows
 *
 * Inspired by: Netflix Hystrix, Resilience4j, AWS Step Functions
 * ============================================================================
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { EventEmitter } from 'events';
import { EventStore, BuildEventType } from './event-sourcing';

// ============================================================================
// CIRCUIT BREAKER - Prevent cascade failures
// ============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Failures before opening (default: 5)
  successThreshold: number; // Successes in HALF_OPEN to close (default: 3)
  timeout: number; // Time in OPEN before trying HALF_OPEN (default: 30000ms)
  halfOpenRequests: number; // Requests allowed in HALF_OPEN (default: 3)
  monitoringWindow: number; // Window for failure rate calculation (default: 60000ms)
  minimumRequests: number; // Minimum requests before evaluating (default: 10)
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  failureRate: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  lastStateChange: Date;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private consecutiveSuccesses: number = 0;
  private consecutiveFailures: number = 0;
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;
  private lastStateChange: Date = new Date();
  private halfOpenRequests: number = 0;
  private requestHistory: Array<{ timestamp: Date; success: boolean }> = [];
  private config: CircuitBreakerConfig;
  private resetTimeout: NodeJS.Timeout | null = null;

  constructor(
    public readonly name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    super();
    this.config = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
      halfOpenRequests: 3,
      monitoringWindow: 60000,
      minimumRequests: 10,
      ...config,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      const error = new CircuitOpenError(`Circuit ${this.name} is OPEN`, this.getStats());
      this.emit('rejected', { error, stats: this.getStats() });
      throw error;
    }

    const startTime = Date.now();

    try {
      const result = await fn();
      this.onSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.onFailure(error as Error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Check if execution is allowed
   */
  canExecute(): boolean {
    switch (this.state) {
      case 'CLOSED':
        return true;
      case 'OPEN':
        // Check if timeout has passed
        if (Date.now() - this.lastStateChange.getTime() >= this.config.timeout) {
          this.transitionTo('HALF_OPEN');
          return true;
        }
        return false;
      case 'HALF_OPEN':
        return this.halfOpenRequests < this.config.halfOpenRequests;
    }
  }

  /**
   * Record successful execution
   */
  onSuccess(duration: number): void {
    this.successes++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccess = new Date();

    this.recordRequest(true);

    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests++;
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }

    this.emit('success', { duration, stats: this.getStats() });
  }

  /**
   * Record failed execution
   */
  onFailure(error: Error, duration: number): void {
    this.failures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailure = new Date();

    this.recordRequest(false);

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      const failureRate = this.calculateFailureRate();
      if (
        this.requestHistory.length >= this.config.minimumRequests &&
        (failureRate >= 0.5 || this.consecutiveFailures >= this.config.failureThreshold)
      ) {
        this.transitionTo('OPEN');
      }
    }

    this.emit('failure', { error, duration, stats: this.getStats() });
  }

  /**
   * Force circuit to specific state (for testing/admin)
   */
  forceState(state: CircuitState): void {
    this.transitionTo(state);
    this.emit('forced', { state, stats: this.getStats() });
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.failures + this.successes,
      failureRate: this.calculateFailureRate(),
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      lastStateChange: this.lastStateChange,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
    this.halfOpenRequests = 0;
    this.requestHistory = [];
    this.transitionTo('CLOSED');
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date();

    if (newState === 'HALF_OPEN') {
      this.halfOpenRequests = 0;
      this.consecutiveSuccesses = 0;
    }

    if (newState === 'CLOSED') {
      this.consecutiveFailures = 0;
      this.requestHistory = [];
    }

    if (newState === 'OPEN') {
      // Set timeout to transition to HALF_OPEN
      if (this.resetTimeout) clearTimeout(this.resetTimeout);
      this.resetTimeout = setTimeout(() => {
        if (this.state === 'OPEN') {
          this.transitionTo('HALF_OPEN');
        }
      }, this.config.timeout);
    }

    this.emit('state_change', {
      from: oldState,
      to: newState,
      stats: this.getStats(),
    });
  }

  private recordRequest(success: boolean): void {
    const now = new Date();
    this.requestHistory.push({ timestamp: now, success });

    // Clean old entries
    const windowStart = new Date(now.getTime() - this.config.monitoringWindow);
    this.requestHistory = this.requestHistory.filter(r => r.timestamp >= windowStart);
  }

  private calculateFailureRate(): number {
    if (this.requestHistory.length === 0) return 0;
    const failures = this.requestHistory.filter(r => !r.success).length;
    return failures / this.requestHistory.length;
  }
}

export class CircuitOpenError extends Error {
  constructor(
    message: string,
    public readonly stats: CircuitStats
  ) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

// ============================================================================
// RETRY STRATEGY - Intelligent retry with backoff
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterFactor: number; // 0-1, adds randomness to prevent thundering herd
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

export interface RetryContext {
  attempt: number;
  totalDelay: number;
  lastError: Error | null;
  startTime: Date;
}

export class RetryStrategy {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.2,
      retryableErrors: ['TIMEOUT', 'RATE_LIMITED', 'SERVICE_UNAVAILABLE', 'NETWORK_ERROR'],
      nonRetryableErrors: ['INVALID_INPUT', 'AUTHENTICATION_FAILED', 'NOT_FOUND'],
      ...config,
    };
  }

  /**
   * Execute with retry
   */
  async execute<T>(fn: () => Promise<T>, onRetry?: (context: RetryContext) => void): Promise<T> {
    const context: RetryContext = {
      attempt: 0,
      totalDelay: 0,
      lastError: null,
      startTime: new Date(),
    };

    while (context.attempt < this.config.maxAttempts) {
      context.attempt++;

      try {
        return await fn();
      } catch (error) {
        context.lastError = error as Error;

        if (!this.shouldRetry(error as Error, context)) {
          throw error;
        }

        if (context.attempt >= this.config.maxAttempts) {
          throw new MaxRetriesExceededError(
            `Max retries (${this.config.maxAttempts}) exceeded`,
            context
          );
        }

        const delay = this.calculateDelay(context.attempt);
        context.totalDelay += delay;

        if (onRetry) onRetry(context);

        await this.sleep(delay);
      }
    }

    throw new MaxRetriesExceededError('Max retries exceeded', context);
  }

  /**
   * Check if error should trigger retry
   */
  shouldRetry(error: Error, context: RetryContext): boolean {
    // Check non-retryable first
    for (const pattern of this.config.nonRetryableErrors) {
      if (error.message.includes(pattern) || error.name.includes(pattern)) {
        return false;
      }
    }

    // Check retryable
    for (const pattern of this.config.retryableErrors) {
      if (error.message.includes(pattern) || error.name.includes(pattern)) {
        return true;
      }
    }

    // Default: retry unknown errors up to limit
    return context.attempt < this.config.maxAttempts;
  }

  /**
   * Calculate delay with exponential backoff + jitter
   */
  calculateDelay(attempt: number): number {
    const exponentialDelay =
      this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);

    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * this.config.jitterFactor * (Math.random() * 2 - 1);

    return Math.max(0, cappedDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class MaxRetriesExceededError extends Error {
  constructor(
    message: string,
    public readonly context: RetryContext
  ) {
    super(message);
    this.name = 'MaxRetriesExceededError';
  }
}

// ============================================================================
// FALLBACK REGISTRY - Alternative agents
// ============================================================================

export interface FallbackConfig {
  primary: string;
  fallbacks: Array<{
    agentId: string;
    priority: number;
    conditions?: {
      errorCodes?: string[];
      minFailures?: number;
    };
  }>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
}

export class FallbackRegistry {
  private fallbacks: Map<string, FallbackConfig> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private failureCounts: Map<string, number> = new Map();

  /**
   * Register fallback chain for an agent
   */
  register(config: FallbackConfig): void {
    this.fallbacks.set(config.primary, config);

    // Create circuit breaker for primary
    const cb = new CircuitBreaker(config.primary, config.circuitBreakerConfig);
    this.circuitBreakers.set(config.primary, cb);

    // Create circuit breakers for fallbacks
    for (const fallback of config.fallbacks) {
      if (!this.circuitBreakers.has(fallback.agentId)) {
        this.circuitBreakers.set(
          fallback.agentId,
          new CircuitBreaker(fallback.agentId, config.circuitBreakerConfig)
        );
      }
    }
  }

  /**
   * Get next available agent (primary or fallback)
   */
  getAvailableAgent(primaryAgentId: string, errorCode?: string): string | null {
    const config = this.fallbacks.get(primaryAgentId);
    if (!config) return primaryAgentId;

    // Check primary circuit
    const primaryCb = this.circuitBreakers.get(primaryAgentId);
    if (primaryCb?.canExecute()) {
      return primaryAgentId;
    }

    // Try fallbacks in priority order
    const sortedFallbacks = [...config.fallbacks].sort((a, b) => a.priority - b.priority);

    for (const fallback of sortedFallbacks) {
      const cb = this.circuitBreakers.get(fallback.agentId);
      if (!cb?.canExecute()) continue;

      // Check conditions
      if (fallback.conditions) {
        if (
          fallback.conditions.errorCodes &&
          errorCode &&
          !fallback.conditions.errorCodes.includes(errorCode)
        ) {
          continue;
        }

        if (fallback.conditions.minFailures) {
          const failures = this.failureCounts.get(primaryAgentId) || 0;
          if (failures < fallback.conditions.minFailures) {
            continue;
          }
        }
      }

      return fallback.agentId;
    }

    return null;
  }

  /**
   * Record agent failure
   */
  recordFailure(agentId: string, error: Error): void {
    const count = (this.failureCounts.get(agentId) || 0) + 1;
    this.failureCounts.set(agentId, count);

    const cb = this.circuitBreakers.get(agentId);
    if (cb) {
      cb.onFailure(error, 0);
    }
  }

  /**
   * Record agent success
   */
  recordSuccess(agentId: string, duration: number): void {
    this.failureCounts.set(agentId, 0);

    const cb = this.circuitBreakers.get(agentId);
    if (cb) {
      cb.onSuccess(duration);
    }
  }

  /**
   * Get all circuit breaker stats
   */
  getAllStats(): Map<string, CircuitStats> {
    const stats = new Map<string, CircuitStats>();
    for (const [id, cb] of this.circuitBreakers) {
      stats.set(id, cb.getStats());
    }
    return stats;
  }
}

// ============================================================================
// HEALTH MONITOR - Predictive failure detection
// ============================================================================

export interface HealthMetrics {
  agentId: string;
  successRate: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  throughput: number; // requests per minute
  healthScore: number; // 0-100
  trend: 'improving' | 'stable' | 'degrading' | 'critical';
  predictions: {
    failureProbability: number;
    estimatedTimeToFailure: number | null;
    recommendedAction: string | null;
  };
}

export interface HealthAlert {
  id: string;
  agentId: string;
  severity: 'info' | 'warning' | 'critical';
  type:
    | 'high_latency'
    | 'high_error_rate'
    | 'circuit_open'
    | 'degrading_trend'
    | 'predicted_failure';
  message: string;
  timestamp: Date;
  metrics: Partial<HealthMetrics>;
  suggestedAction: string;
}

export class HealthMonitor extends EventEmitter {
  private metrics: Map<string, HealthMetrics> = new Map();
  private latencyHistory: Map<string, number[]> = new Map();
  private successHistory: Map<string, boolean[]> = new Map();
  private alerts: HealthAlert[] = [];
  private checkInterval: NodeJS.Timeout | null = null;

  private thresholds = {
    warningLatencyMs: 5000,
    criticalLatencyMs: 15000,
    warningErrorRate: 0.1,
    criticalErrorRate: 0.3,
    warningHealthScore: 70,
    criticalHealthScore: 40,
    historySize: 100,
  };

  constructor() {
    super();
  }

  /**
   * Start monitoring
   */
  start(intervalMs: number = 10000): void {
    this.checkInterval = setInterval(() => this.evaluate(), intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Record a request
   */
  record(agentId: string, success: boolean, latencyMs: number): void {
    // Record latency
    const latencies = this.latencyHistory.get(agentId) || [];
    latencies.push(latencyMs);
    if (latencies.length > this.thresholds.historySize) {
      latencies.shift();
    }
    this.latencyHistory.set(agentId, latencies);

    // Record success/failure
    const successes = this.successHistory.get(agentId) || [];
    successes.push(success);
    if (successes.length > this.thresholds.historySize) {
      successes.shift();
    }
    this.successHistory.set(agentId, successes);

    // Update metrics
    this.updateMetrics(agentId);
  }

  /**
   * Get health metrics for an agent
   */
  getMetrics(agentId: string): HealthMetrics | null {
    return this.metrics.get(agentId) || null;
  }

  /**
   * Get all health metrics
   */
  getAllMetrics(): Map<string, HealthMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 50): HealthAlert[] {
    return this.alerts.slice(-limit);
  }

  private updateMetrics(agentId: string): void {
    const latencies = this.latencyHistory.get(agentId) || [];
    const successes = this.successHistory.get(agentId) || [];

    if (latencies.length === 0) return;

    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const successCount = successes.filter(s => s).length;

    const metrics: HealthMetrics = {
      agentId,
      successRate: successes.length > 0 ? successCount / successes.length : 1,
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p95Latency: this.percentile(sortedLatencies, 95),
      p99Latency: this.percentile(sortedLatencies, 99),
      errorRate: successes.length > 0 ? 1 - successCount / successes.length : 0,
      throughput: latencies.length, // Simplified - requests in history
      healthScore: 0,
      trend: 'stable',
      predictions: {
        failureProbability: 0,
        estimatedTimeToFailure: null,
        recommendedAction: null,
      },
    };

    // Calculate health score (0-100)
    metrics.healthScore = this.calculateHealthScore(metrics);

    // Determine trend
    metrics.trend = this.determineTrend(agentId, metrics);

    // Make predictions
    metrics.predictions = this.makePredictions(metrics);

    this.metrics.set(agentId, metrics);
    this.emit('metrics_updated', metrics);
  }

  private calculateHealthScore(metrics: HealthMetrics): number {
    let score = 100;

    // Deduct for error rate
    score -= metrics.errorRate * 50;

    // Deduct for high latency
    if (metrics.p95Latency > this.thresholds.criticalLatencyMs) {
      score -= 30;
    } else if (metrics.p95Latency > this.thresholds.warningLatencyMs) {
      score -= 15;
    }

    // Deduct for low success rate
    score -= (1 - metrics.successRate) * 30;

    return Math.max(0, Math.min(100, score));
  }

  private determineTrend(
    agentId: string,
    current: HealthMetrics
  ): 'improving' | 'stable' | 'degrading' | 'critical' {
    const previous = this.metrics.get(agentId);
    if (!previous) return 'stable';

    const scoreDiff = current.healthScore - previous.healthScore;

    if (current.healthScore < this.thresholds.criticalHealthScore) {
      return 'critical';
    }
    if (scoreDiff < -10) return 'degrading';
    if (scoreDiff > 10) return 'improving';
    return 'stable';
  }

  private makePredictions(metrics: HealthMetrics): HealthMetrics['predictions'] {
    const predictions: HealthMetrics['predictions'] = {
      failureProbability: 0,
      estimatedTimeToFailure: null,
      recommendedAction: null,
    };

    // Simple prediction based on current metrics
    if (metrics.trend === 'critical') {
      predictions.failureProbability = 0.9;
      predictions.estimatedTimeToFailure = 60000; // 1 minute
      predictions.recommendedAction = 'Activate fallback immediately';
    } else if (metrics.trend === 'degrading') {
      predictions.failureProbability = 0.5;
      predictions.estimatedTimeToFailure = 300000; // 5 minutes
      predictions.recommendedAction = 'Prepare fallback and investigate';
    } else if (metrics.errorRate > this.thresholds.warningErrorRate) {
      predictions.failureProbability = 0.3;
      predictions.recommendedAction = 'Monitor closely';
    }

    return predictions;
  }

  private evaluate(): void {
    for (const [agentId, metrics] of this.metrics) {
      // Check for alerts
      if (metrics.healthScore < this.thresholds.criticalHealthScore) {
        this.createAlert(agentId, 'critical', 'predicted_failure', metrics);
      } else if (metrics.trend === 'degrading') {
        this.createAlert(agentId, 'warning', 'degrading_trend', metrics);
      } else if (metrics.errorRate > this.thresholds.criticalErrorRate) {
        this.createAlert(agentId, 'critical', 'high_error_rate', metrics);
      } else if (metrics.p95Latency > this.thresholds.criticalLatencyMs) {
        this.createAlert(agentId, 'warning', 'high_latency', metrics);
      }
    }
  }

  private createAlert(
    agentId: string,
    severity: HealthAlert['severity'],
    type: HealthAlert['type'],
    metrics: HealthMetrics
  ): void {
    const alert: HealthAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      severity,
      type,
      message: this.getAlertMessage(type, metrics),
      timestamp: new Date(),
      metrics: { ...metrics },
      suggestedAction: metrics.predictions.recommendedAction || 'Investigate',
    };

    this.alerts.push(alert);
    if (this.alerts.length > 1000) {
      this.alerts.shift();
    }

    this.emit('alert', alert);
  }

  private getAlertMessage(type: HealthAlert['type'], metrics: HealthMetrics): string {
    switch (type) {
      case 'high_latency':
        return `High latency detected: P95=${metrics.p95Latency}ms`;
      case 'high_error_rate':
        return `High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`;
      case 'circuit_open':
        return 'Circuit breaker opened due to repeated failures';
      case 'degrading_trend':
        return `Health degrading: score dropped to ${metrics.healthScore}`;
      case 'predicted_failure':
        return `Failure predicted with ${(metrics.predictions.failureProbability * 100).toFixed(0)}% probability`;
      default:
        return 'Health issue detected';
    }
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

// ============================================================================
// SELF-HEALING ORCHESTRATOR - Puts it all together
// ============================================================================

export interface SelfHealingConfig {
  circuitBreaker: Partial<CircuitBreakerConfig>;
  retry: Partial<RetryConfig>;
  healthMonitor: {
    enabled: boolean;
    checkIntervalMs: number;
  };
  autoFallback: boolean;
  autoRecover: boolean;
}

export class SelfHealingOrchestrator extends EventEmitter {
  private eventStore: EventStore;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryStrategies: Map<string, RetryStrategy> = new Map();
  private fallbackRegistry: FallbackRegistry;
  private healthMonitor: HealthMonitor;
  private config: SelfHealingConfig;

  constructor(eventStore: EventStore, config: Partial<SelfHealingConfig> = {}) {
    super();
    this.eventStore = eventStore;
    this.fallbackRegistry = new FallbackRegistry();
    this.healthMonitor = new HealthMonitor();

    this.config = {
      circuitBreaker: {},
      retry: {},
      healthMonitor: { enabled: true, checkIntervalMs: 10000 },
      autoFallback: true,
      autoRecover: true,
      ...config,
    };

    this.setupHealthMonitorListeners();

    if (this.config.healthMonitor.enabled) {
      this.healthMonitor.start(this.config.healthMonitor.checkIntervalMs);
    }
  }

  /**
   * Execute an agent with full self-healing capabilities
   */
  async executeAgent<T>(
    buildId: string,
    agentId: string,
    execute: () => Promise<T>
  ): Promise<{ result: T; usedFallback: boolean; executedAgent: string }> {
    const correlationId = `exec-${buildId}-${agentId}-${Date.now()}`;
    let executedAgent = agentId;
    let usedFallback = false;

    // Get or create circuit breaker
    let circuitBreaker = this.circuitBreakers.get(agentId);
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(agentId, this.config.circuitBreaker);
      this.circuitBreakers.set(agentId, circuitBreaker);
    }

    // Get or create retry strategy
    let retryStrategy = this.retryStrategies.get(agentId);
    if (!retryStrategy) {
      retryStrategy = new RetryStrategy(this.config.retry);
      this.retryStrategies.set(agentId, retryStrategy);
    }

    const startTime = Date.now();

    try {
      // Try with circuit breaker and retry
      const result = await circuitBreaker.execute(async () => {
        return await retryStrategy!.execute(execute, ctx => {
          this.eventStore.append(
            buildId,
            'AGENT_RETRIED',
            {
              agentId,
              attempt: ctx.attempt,
              lastError: ctx.lastError?.message,
            },
            { correlationId }
          );
        });
      });

      const duration = Date.now() - startTime;
      this.healthMonitor.record(agentId, true, duration);
      this.fallbackRegistry.recordSuccess(agentId, duration);

      return { result, usedFallback, executedAgent };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.healthMonitor.record(agentId, false, duration);
      this.fallbackRegistry.recordFailure(agentId, error as Error);

      // Try fallback if enabled
      if (this.config.autoFallback) {
        const fallbackAgentId = this.fallbackRegistry.getAvailableAgent(
          agentId,
          (error as Error).name
        );

        if (fallbackAgentId && fallbackAgentId !== agentId) {
          usedFallback = true;
          executedAgent = fallbackAgentId;

          await this.eventStore.append(
            buildId,
            'AGENT_CIRCUIT_OPENED',
            {
              agentId,
              fallbackTo: fallbackAgentId,
              reason: (error as Error).message,
            },
            { correlationId }
          );

          // Recursively try with fallback
          // Note: In real implementation, execute would be parameterized by agentId
          this.emit('fallback_activated', {
            originalAgent: agentId,
            fallbackAgent: fallbackAgentId,
            error,
          });

          // For now, re-throw - caller should handle fallback execution
          throw new FallbackRequiredError(
            `Primary agent ${agentId} failed, fallback to ${fallbackAgentId}`,
            agentId,
            fallbackAgentId,
            error as Error
          );
        }
      }

      throw error;
    }
  }

  /**
   * Register fallback for an agent
   */
  registerFallback(config: FallbackConfig): void {
    this.fallbackRegistry.register(config);
  }

  /**
   * Get health metrics
   */
  getHealth(): {
    agents: Map<string, HealthMetrics>;
    circuits: Map<string, CircuitStats>;
    alerts: HealthAlert[];
  } {
    return {
      agents: this.healthMonitor.getAllMetrics(),
      circuits: this.fallbackRegistry.getAllStats(),
      alerts: this.healthMonitor.getAlerts(),
    };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    this.healthMonitor.stop();
  }

  private setupHealthMonitorListeners(): void {
    this.healthMonitor.on('alert', (alert: HealthAlert) => {
      this.emit('health_alert', alert);

      if (alert.severity === 'critical' && this.config.autoRecover) {
        this.attemptAutoRecovery(alert);
      }
    });
  }

  private async attemptAutoRecovery(alert: HealthAlert): Promise<void> {
    this.emit('auto_recovery_started', alert);

    try {
      // Reset circuit breaker after cooldown
      const cb = this.circuitBreakers.get(alert.agentId);
      if (cb && cb.getStats().state === 'OPEN') {
        // Wait and try half-open
        setTimeout(() => {
          cb.forceState('HALF_OPEN');
          this.emit('auto_recovery_attempted', {
            agentId: alert.agentId,
            action: 'circuit_half_opened',
          });
        }, 30000);
      }
    } catch (error) {
      this.emit('auto_recovery_failed', { alert, error });
    }
  }
}

export class FallbackRequiredError extends Error {
  constructor(
    message: string,
    public readonly originalAgent: string,
    public readonly fallbackAgent: string,
    public readonly cause: Error
  ) {
    super(message);
    this.name = 'FallbackRequiredError';
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return new CircuitBreaker(name, config);
}

export function createRetryStrategy(config?: Partial<RetryConfig>): RetryStrategy {
  return new RetryStrategy(config);
}

export function createHealthMonitor(): HealthMonitor {
  return new HealthMonitor();
}

export function createSelfHealingOrchestrator(
  eventStore: EventStore,
  config?: Partial<SelfHealingConfig>
): SelfHealingOrchestrator {
  return new SelfHealingOrchestrator(eventStore, config);
}
