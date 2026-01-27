/**
 * Adaptive Backoff Engine
 *
 * Unlike dumb exponential backoff, this LEARNS:
 * - Respects Retry-After headers from servers
 * - Tracks historical success rates per operation
 * - Adjusts delays based on time-of-day patterns
 * - Backs off more aggressively for repeated failures
 *
 * @example
 * ```typescript
 * const backoff = new AdaptiveBackoff('payment-api');
 *
 * // Server said "Retry-After: 30"
 * backoff.recordServerHint(30000);
 *
 * // Next delay respects the hint
 * const delay = backoff.getDelay(attempt); // Returns ~30000ms
 *
 * // Over time, it learns optimal delays
 * backoff.recordOutcome(true, 1500); // Success after 1.5s
 * ```
 */

import { Milliseconds, Milliseconds as ms } from '../types';
import { sanitizeName, checkRegistrySize, validatePositiveInt, validateProbability, LIMITS } from './validation';

// ============================================================================
// TYPES
// ============================================================================

export interface BackoffConfig {
  /** Base delay in ms (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 60000) */
  maxDelay?: number;
  /** Minimum delay in ms (default: 100) */
  minDelay?: number;
  /** Enable jitter (default: true) */
  jitter?: boolean;
  /** Learning rate for adaptive adjustment (0-1, default: 0.1) */
  learningRate?: number;
  /** How many historical samples to keep (default: 100) */
  historySize?: number;
}

interface HistorySample {
  timestamp: number;
  delay: number;
  success: boolean;
  responseTime: number;
}

interface ServerHint {
  delay: number;
  expiresAt: number;
}

// ============================================================================
// ADAPTIVE BACKOFF ENGINE
// ============================================================================

export class AdaptiveBackoff {
  private readonly operationName: string;
  private readonly config: Required<BackoffConfig>;

  // Learning state
  private history: HistorySample[] = [];
  private serverHint: ServerHint | null = null;
  private consecutiveFailures = 0;
  private optimalDelay: number;

  // Time-of-day patterns (24 buckets for each hour)
  private hourlySuccessRates: number[] = new Array(24).fill(0.5);
  private hourlyAttempts: number[] = new Array(24).fill(0);

  constructor(operationName: string, config: BackoffConfig = {}) {
    this.operationName = sanitizeName(operationName);

    // Validate all config values
    this.config = {
      baseDelay: validatePositiveInt('baseDelay', config.baseDelay, LIMITS.MIN_TIMEOUT, LIMITS.MAX_TIMEOUT, 1000),
      maxDelay: validatePositiveInt('maxDelay', config.maxDelay, LIMITS.MIN_TIMEOUT, LIMITS.MAX_TIMEOUT, 60000),
      minDelay: validatePositiveInt('minDelay', config.minDelay, LIMITS.MIN_TIMEOUT, LIMITS.MAX_TIMEOUT, 100),
      jitter: config.jitter ?? true,
      learningRate: validateProbability('learningRate', config.learningRate, 0.1),
      historySize: validatePositiveInt('historySize', config.historySize, 1, 10000, 100),
    };
    this.optimalDelay = this.config.baseDelay;
  }

  /**
   * Get the next delay, incorporating all learning signals.
   */
  getDelay(attempt: number): Milliseconds {
    let delay: number;

    // Priority 1: Server hint (Retry-After header)
    if (this.serverHint && Date.now() < this.serverHint.expiresAt) {
      delay = this.serverHint.delay;
    }
    // Priority 2: Learned optimal delay adjusted for attempt
    else {
      delay = this.calculateAdaptiveDelay(attempt);
    }

    // Apply time-of-day adjustment
    delay = this.adjustForTimeOfDay(delay);

    // Apply consecutive failure penalty
    if (this.consecutiveFailures > 3) {
      const penalty = Math.pow(1.5, this.consecutiveFailures - 3);
      delay = Math.min(delay * penalty, this.config.maxDelay);
    }

    // Clamp to bounds
    delay = Math.max(this.config.minDelay, Math.min(delay, this.config.maxDelay));

    // Add jitter
    if (this.config.jitter) {
      delay = this.addJitter(delay);
    }

    return ms(Math.floor(delay));
  }

  /**
   * Record server hint from Retry-After header.
   * @param delayMs - The delay the server requested
   * @param ttlMs - How long to respect this hint (default: hint value * 2)
   */
  recordServerHint(delayMs: number, ttlMs?: number): void {
    this.serverHint = {
      delay: delayMs,
      expiresAt: Date.now() + (ttlMs ?? delayMs * 2),
    };
  }

  /**
   * Record the outcome of an attempt for learning.
   */
  recordOutcome(success: boolean, responseTimeMs: number, delayUsed: number): void {
    // Update consecutive failures
    if (success) {
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures++;
    }

    // Add to history
    const sample: HistorySample = {
      timestamp: Date.now(),
      delay: delayUsed,
      success,
      responseTime: responseTimeMs,
    };
    this.history.push(sample);

    // Trim history
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }

    // Update optimal delay using exponential moving average
    if (success) {
      // Successful - maybe we can be more aggressive
      const newOptimal = delayUsed * 0.9; // Try 10% faster next time
      this.optimalDelay = this.optimalDelay * (1 - this.config.learningRate) +
                          newOptimal * this.config.learningRate;
    } else {
      // Failed - back off more
      const newOptimal = delayUsed * 1.5; // 50% slower
      this.optimalDelay = this.optimalDelay * (1 - this.config.learningRate) +
                          newOptimal * this.config.learningRate;
    }

    // Clamp optimal delay
    this.optimalDelay = Math.max(
      this.config.minDelay,
      Math.min(this.optimalDelay, this.config.maxDelay)
    );

    // Update time-of-day patterns
    const hour = new Date().getHours();
    this.hourlyAttempts[hour]++;
    const rate = this.hourlySuccessRates[hour];
    this.hourlySuccessRates[hour] = rate * 0.95 + (success ? 0.05 : 0);
  }

  /**
   * Get statistics about the backoff engine's learning.
   */
  getStats(): {
    optimalDelay: number;
    consecutiveFailures: number;
    historySize: number;
    recentSuccessRate: number;
    serverHintActive: boolean;
    hourlyPattern: number[];
  } {
    const recentHistory = this.history.slice(-20);
    const recentSuccessRate = recentHistory.length > 0
      ? recentHistory.filter(s => s.success).length / recentHistory.length
      : 0.5;

    return {
      optimalDelay: Math.floor(this.optimalDelay),
      consecutiveFailures: this.consecutiveFailures,
      historySize: this.history.length,
      recentSuccessRate,
      serverHintActive: this.serverHint !== null && Date.now() < this.serverHint.expiresAt,
      hourlyPattern: [...this.hourlySuccessRates],
    };
  }

  /**
   * Reset all learning (useful for testing or when patterns change).
   */
  reset(): void {
    this.history = [];
    this.serverHint = null;
    this.consecutiveFailures = 0;
    this.optimalDelay = this.config.baseDelay;
    this.hourlySuccessRates = new Array(24).fill(0.5);
    this.hourlyAttempts = new Array(24).fill(0);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private calculateAdaptiveDelay(attempt: number): number {
    // Start with learned optimal delay
    let delay = this.optimalDelay;

    // Apply exponential growth for subsequent attempts
    if (attempt > 1) {
      delay = delay * Math.pow(2, attempt - 1);
    }

    return delay;
  }

  private adjustForTimeOfDay(delay: number): number {
    const hour = new Date().getHours();
    const successRate = this.hourlySuccessRates[hour];

    // If success rate is low at this hour, back off more
    if (successRate < 0.3) {
      return delay * 1.5; // 50% longer delays during bad hours
    }
    if (successRate > 0.8) {
      return delay * 0.8; // 20% shorter during good hours
    }

    return delay;
  }

  private addJitter(delay: number): number {
    // ±25% jitter
    const jitterFactor = 0.75 + Math.random() * 0.5;
    return delay * jitterFactor;
  }
}

// ============================================================================
// UTILITY: Parse Retry-After Header
// ============================================================================

/**
 * Parse a Retry-After header value.
 * Handles both seconds (integer) and HTTP-date formats.
 *
 * @example
 * ```typescript
 * parseRetryAfter('30'); // 30000 (30 seconds in ms)
 * parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT'); // ms until that time
 * ```
 */
export function parseRetryAfter(header: string | null | undefined): number | null {
  if (!header) return null;

  // Try parsing as integer (seconds)
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  // Try parsing as HTTP-date
  const date = new Date(header);
  if (!isNaN(date.getTime())) {
    const delay = date.getTime() - Date.now();
    return delay > 0 ? delay : null;
  }

  return null;
}

// ============================================================================
// GLOBAL BACKOFF REGISTRY
// ============================================================================

const backoffRegistry = new Map<string, AdaptiveBackoff>();

/**
 * Get or create an adaptive backoff engine for an operation.
 * Shared across all executors for the same operation name.
 */
export function getAdaptiveBackoff(operationName: string, config?: BackoffConfig): AdaptiveBackoff {
  const sanitizedName = sanitizeName(operationName);
  let backoff = backoffRegistry.get(sanitizedName);
  if (!backoff) {
    // Prevent registry exhaustion attack
    checkRegistrySize(backoffRegistry, sanitizedName);
    backoff = new AdaptiveBackoff(sanitizedName, config);
    backoffRegistry.set(sanitizedName, backoff);
  }
  return backoff;
}

/**
 * Clear all backoff engines (for testing).
 */
export function clearBackoffRegistry(): void {
  backoffRegistry.clear();
}
