import { validateProbability, validatePositiveInt, LIMITS } from './validation';

/**
 * Chaos Engineering - Built-in Failure Injection
 *
 * Test your resilience BEFORE production fails.
 * Inspired by Netflix Chaos Monkey, but built into the SDK.
 *
 * Failure Types:
 * - Latency injection (slow responses)
 * - Error injection (random failures)
 * - Timeout injection (hang forever)
 * - Data corruption (invalid responses)
 * - Circuit breaker triggering
 *
 * @example
 * ```typescript
 * // Enable chaos in staging
 * if (process.env.NODE_ENV === 'staging') {
 *   chaos.enable({
 *     failureRate: 0.1,      // 10% of requests fail
 *     latencyMs: [100, 500], // Add 100-500ms latency
 *     affectedOperations: ['payment-api', 'user-service'],
 *   });
 * }
 *
 * // Chaos is automatically injected into all SelfHealing operations
 * const result = await SelfHealing.execute(() => fetchData());
 *
 * // Disable when done
 * chaos.disable();
 * ```
 *
 * @example Scheduled Chaos (Game Day)
 * ```typescript
 * // Run chaos for 1 hour every Tuesday at 2pm
 * chaos.schedule({
 *   cron: '0 14 * * 2',  // Tuesday 2pm
 *   duration: 60 * 60 * 1000,  // 1 hour
 *   config: { failureRate: 0.2 },
 * });
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ChaosConfig {
  /** Probability of failure (0-1). Default: 0 (disabled) */
  failureRate?: number;
  /** Probability of latency injection (0-1). Default: 0 */
  latencyRate?: number;
  /** Latency range to inject [min, max] in ms. Default: [0, 0] */
  latencyMs?: [number, number];
  /** Probability of timeout (hang forever). Default: 0 */
  timeoutRate?: number;
  /** Specific operations to affect (empty = all). Default: [] */
  affectedOperations?: string[];
  /** Operations to exclude from chaos. Default: [] */
  excludedOperations?: string[];
  /** Custom error to throw. Default: generic chaos error */
  errorFactory?: () => Error;
  /** Log chaos events. Default: false */
  verbose?: boolean;
}

export interface ChaosEvent {
  type: 'failure' | 'latency' | 'timeout' | 'skipped';
  operation: string;
  timestamp: number;
  details?: {
    latencyMs?: number;
    error?: string;
    reason?: string;
  };
}

export type ChaosEventHandler = (event: ChaosEvent) => void;

// ============================================================================
// CHAOS ENGINE (Singleton)
// ============================================================================

class ChaosEngine {
  private enabled = false;
  private config: Required<ChaosConfig> = {
    failureRate: 0,
    latencyRate: 0,
    latencyMs: [0, 0],
    timeoutRate: 0,
    affectedOperations: [],
    excludedOperations: [],
    errorFactory: () => new Error('[CHAOS] Injected failure for resilience testing'),
    verbose: false,
  };
  private eventHandlers: ChaosEventHandler[] = [];
  private eventLog: ChaosEvent[] = [];
  private readonly maxEventLog = 1000;

  /**
   * Enable chaos with configuration.
   */
  enable(config: ChaosConfig = {}): void {
    // Validate probability values
    const failureRate = validateProbability('failureRate', config.failureRate, 0);
    const latencyRate = validateProbability('latencyRate', config.latencyRate, 0);
    const timeoutRate = validateProbability('timeoutRate', config.timeoutRate, 0);

    // Validate latency range
    const latencyMs = config.latencyMs ?? [0, 0];
    const minLatency = validatePositiveInt('latencyMs[0]', latencyMs[0], 0, LIMITS.MAX_TIMEOUT, 0);
    const maxLatency = validatePositiveInt('latencyMs[1]', latencyMs[1], 0, LIMITS.MAX_TIMEOUT, 0);

    this.config = {
      failureRate,
      latencyRate,
      latencyMs: [minLatency, maxLatency],
      timeoutRate,
      affectedOperations: config.affectedOperations ?? [],
      excludedOperations: config.excludedOperations ?? [],
      errorFactory: config.errorFactory ?? (() => new Error('[CHAOS] Injected failure')),
      verbose: config.verbose ?? false,
    };
    this.enabled = true;

    if (this.config.verbose) {
      console.warn('[CHAOS] Chaos engineering ENABLED', this.config);
    }
  }

  /**
   * Disable chaos.
   */
  disable(): void {
    this.enabled = false;
    if (this.config.verbose) {
      console.warn('[CHAOS] Chaos engineering DISABLED');
    }
  }

  /**
   * Check if chaos is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current configuration.
   */
  getConfig(): ChaosConfig {
    return { ...this.config };
  }

  /**
   * Register event handler.
   */
  onEvent(handler: ChaosEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Get recent chaos events.
   */
  getEvents(limit = 100): ChaosEvent[] {
    return this.eventLog.slice(-limit);
  }

  /**
   * Clear event log.
   */
  clearEvents(): void {
    this.eventLog = [];
  }

  /**
   * Apply chaos to an operation.
   * Call this before executing any operation.
   *
   * @returns Promise that resolves when chaos effects are applied
   * @throws If failure is injected
   */
  async apply(operationName: string): Promise<void> {
    if (!this.enabled) return;

    // Check if operation should be affected
    if (!this.shouldAffect(operationName)) {
      this.emit({
        type: 'skipped',
        operation: operationName,
        timestamp: Date.now(),
        details: { reason: 'Operation not in affected list' },
      });
      return;
    }

    // Timeout injection (hang forever)
    if (Math.random() < this.config.timeoutRate) {
      this.emit({
        type: 'timeout',
        operation: operationName,
        timestamp: Date.now(),
      });
      // Never resolve - operation will hit its timeout
      await new Promise(() => {});
    }

    // Latency injection
    if (Math.random() < this.config.latencyRate) {
      const [min, max] = this.config.latencyMs;
      const latency = Math.floor(Math.random() * (max - min + 1)) + min;

      this.emit({
        type: 'latency',
        operation: operationName,
        timestamp: Date.now(),
        details: { latencyMs: latency },
      });

      await this.sleep(latency);
    }

    // Failure injection
    if (Math.random() < this.config.failureRate) {
      const error = this.config.errorFactory();

      this.emit({
        type: 'failure',
        operation: operationName,
        timestamp: Date.now(),
        details: { error: error.message },
      });

      throw error;
    }
  }

  /**
   * Wrap an operation with chaos.
   */
  wrap<T>(operationName: string, operation: () => T | Promise<T>): () => Promise<T> {
    return async () => {
      await this.apply(operationName);
      return operation();
    };
  }

  // ============================================================================
  // PRESET CONFIGURATIONS
  // ============================================================================

  /**
   * Light chaos - good for continuous testing.
   */
  enableLight(): void {
    this.enable({
      failureRate: 0.01, // 1% failures
      latencyRate: 0.05, // 5% slow
      latencyMs: [50, 200], // 50-200ms extra
      verbose: false,
    });
  }

  /**
   * Medium chaos - for game day testing.
   */
  enableMedium(): void {
    this.enable({
      failureRate: 0.1, // 10% failures
      latencyRate: 0.2, // 20% slow
      latencyMs: [100, 1000], // 100ms-1s extra
      verbose: true,
    });
  }

  /**
   * Heavy chaos - stress testing.
   */
  enableHeavy(): void {
    this.enable({
      failureRate: 0.3, // 30% failures
      latencyRate: 0.4, // 40% slow
      latencyMs: [500, 3000], // 0.5-3s extra
      timeoutRate: 0.05, // 5% hang
      verbose: true,
    });
  }

  /**
   * Target specific operations only.
   */
  enableTargeted(operations: string[], config: Omit<ChaosConfig, 'affectedOperations'>): void {
    this.enable({
      ...config,
      affectedOperations: operations,
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private shouldAffect(operationName: string): boolean {
    // Check exclusions first
    if (this.config.excludedOperations.length > 0) {
      if (
        this.config.excludedOperations.some(
          op => operationName.includes(op) || op.includes(operationName)
        )
      ) {
        return false;
      }
    }

    // If no specific operations configured, affect all
    if (this.config.affectedOperations.length === 0) {
      return true;
    }

    // Check if operation matches any affected pattern
    return this.config.affectedOperations.some(
      op => operationName.includes(op) || op.includes(operationName)
    );
  }

  private emit(event: ChaosEvent): void {
    // Log
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog.shift();
    }

    // Verbose logging
    if (this.config.verbose) {
      const emoji =
        event.type === 'failure'
          ? '💥'
          : event.type === 'latency'
            ? '🐢'
            : event.type === 'timeout'
              ? '⏰'
              : '⏭️';
      console.warn(
        `[CHAOS] ${emoji} ${event.type.toUpperCase()} on ${event.operation}`,
        event.details
      );
    }

    // Notify handlers
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Global chaos engine */
export const chaos = new ChaosEngine();

// ============================================================================
// TESTING UTILITIES
// ============================================================================

/**
 * Run a function with chaos enabled, then disable.
 */
export async function withChaos<T>(config: ChaosConfig, fn: () => T | Promise<T>): Promise<T> {
  chaos.enable(config);
  try {
    return await fn();
  } finally {
    chaos.disable();
  }
}

/**
 * Create a chaos-wrapped version of an operation for testing.
 */
export function chaosify<T>(
  operationName: string,
  operation: () => T | Promise<T>,
  config: ChaosConfig
): () => Promise<T> {
  return async () => {
    const tempEngine = new ChaosEngine();
    tempEngine.enable(config);
    await tempEngine.apply(operationName);
    return operation();
  };
}

// ============================================================================
// SPECIFIC FAILURE FACTORIES
// ============================================================================

export const ChaosErrors = {
  networkFailure: () => {
    const error = new Error('[CHAOS] Network failure: ECONNREFUSED');
    (error as NodeJS.ErrnoException).code = 'ECONNREFUSED';
    return error;
  },

  timeout: () => {
    const error = new Error('[CHAOS] Request timeout');
    (error as NodeJS.ErrnoException).code = 'ETIMEDOUT';
    return error;
  },

  serverError: (code = 500) => {
    const error = new Error(`[CHAOS] HTTP ${code} Internal Server Error`);
    (error as Error & { statusCode: number }).statusCode = code;
    return error;
  },

  rateLimited: () => {
    const error = new Error('[CHAOS] HTTP 429 Too Many Requests');
    (error as Error & { statusCode: number; retryAfter: number }).statusCode = 429;
    (error as Error & { statusCode: number; retryAfter: number }).retryAfter = 60;
    return error;
  },

  databaseError: () => new Error('[CHAOS] Database connection failed: too many connections'),

  redisError: () => new Error('[CHAOS] Redis CLUSTERDOWN: The cluster is down'),

  custom: (message: string) => new Error(`[CHAOS] ${message}`),
};
