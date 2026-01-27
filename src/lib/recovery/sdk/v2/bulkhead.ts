/**
 * Bulkhead Pattern - Isolation & Concurrency Control
 *
 * Prevents cascade failures by isolating operations into "compartments."
 * If one API is slow/failing, it can't consume all your connections.
 *
 * Named after ship bulkheads that contain flooding to one compartment.
 *
 * Features:
 * - Max concurrent executions per operation
 * - Queue with timeout for overflow
 * - Fair scheduling (FIFO by default)
 * - Priority lanes for critical operations
 * - Real-time stats and monitoring
 *
 * @example
 * ```typescript
 * const bulkhead = new Bulkhead('payment-api', {
 *   maxConcurrent: 10,    // Max 10 simultaneous requests
 *   maxQueued: 100,       // Queue up to 100 more
 *   queueTimeout: 5000,   // Wait max 5s in queue
 * });
 *
 * // All payment calls go through bulkhead
 * const result = await bulkhead.execute(() => processPayment(order));
 *
 * // Check if overloaded before attempting
 * if (bulkhead.isOverloaded()) {
 *   return fallbackResponse();
 * }
 * ```
 */

import { Result, Ok, Err } from '../result';
import { Milliseconds, Milliseconds as ms, RecoveryErrorCode, createRecoveryError } from '../types';
import { metrics, generateTraceId } from '../metrics';
import {
  sanitizeName,
  validateBulkheadConfig,
  checkRegistrySize,
  safeErrorMessage,
  LIMITS,
} from './validation';

// ============================================================================
// TYPES
// ============================================================================

export interface BulkheadConfig {
  /** Maximum concurrent executions. Default: 10 */
  maxConcurrent?: number;
  /** Maximum queued requests. Default: 100 */
  maxQueued?: number;
  /** Queue timeout in ms. Default: 30000 */
  queueTimeout?: number;
  /** Enable priority lanes. Default: false */
  enablePriority?: boolean;
  /** Name for metrics/logging */
  name?: string;
}

export interface BulkheadStats {
  /** Name of this bulkhead */
  name: string;
  /** Current concurrent executions */
  active: number;
  /** Current queue depth */
  queued: number;
  /** Max concurrent allowed */
  maxConcurrent: number;
  /** Max queued allowed */
  maxQueued: number;
  /** Available slots (maxConcurrent - active) */
  available: number;
  /** Total executions since creation */
  totalExecutions: number;
  /** Total rejections due to overload */
  totalRejections: number;
  /** Total queue timeouts */
  totalQueueTimeouts: number;
  /** Average queue wait time (ms) */
  avgQueueTime: number;
  /** Is currently overloaded */
  isOverloaded: boolean;
}

export interface ExecuteOptions {
  /** Priority (higher = more important). Default: 0 */
  priority?: number;
  /** Custom queue timeout for this request */
  queueTimeout?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

interface QueuedRequest<T> {
  operation: () => T | Promise<T>;
  priority: number;
  enqueueTime: number;
  timeout: number;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  signal?: AbortSignal;
  traceId: string;
}

// ============================================================================
// BULKHEAD IMPLEMENTATION
// ============================================================================

export class Bulkhead {
  private readonly name: string;
  private readonly maxConcurrent: number;
  private readonly maxQueued: number;
  private readonly defaultQueueTimeout: number;
  private readonly enablePriority: boolean;

  private active = 0;
  private queue: QueuedRequest<unknown>[] = [];
  private stats = {
    totalExecutions: 0,
    totalRejections: 0,
    totalQueueTimeouts: 0,
    totalQueueTime: 0,
    queuedCount: 0,
  };

  constructor(name: string, config: BulkheadConfig = {}) {
    // Validate all config through security layer
    const validated = validateBulkheadConfig(name, config as Record<string, unknown>);

    this.name = validated.name;
    this.maxConcurrent = validated.maxConcurrent;
    this.maxQueued = validated.maxQueued;
    this.defaultQueueTimeout = validated.queueTimeout;
    this.enablePriority = validated.enablePriority;
  }

  /**
   * Execute an operation within the bulkhead's concurrency limits.
   */
  async execute<T>(
    operation: () => T | Promise<T>,
    options: ExecuteOptions = {}
  ): Promise<Result<T, Error>> {
    const traceId = generateTraceId();
    const { priority = 0, queueTimeout = this.defaultQueueTimeout, signal } = options;

    // Check for abort before starting
    if (signal?.aborted) {
      return Err(new Error('Operation aborted'));
    }

    // Can execute immediately?
    if (this.active < this.maxConcurrent) {
      return this.executeNow(operation, traceId);
    }

    // Queue is full?
    if (this.queue.length >= this.maxQueued) {
      this.stats.totalRejections++;

      metrics.emitFailure({
        operation: this.name,
        attempts: 0,
        elapsed: 0,
        errorCode: RecoveryErrorCode.CIRCUIT_OPEN,
        errorMessage: `Bulkhead ${this.name} overloaded: ${this.active} active, ${this.queue.length} queued`,
        labels: { operation: this.name, error_code: 'BULKHEAD_FULL', trace_id: traceId },
        timestamp: Date.now(),
        traceId,
      });

      return Err(
        new Error(
          `Bulkhead ${this.name} is overloaded. ` +
            `Active: ${this.active}/${this.maxConcurrent}, Queued: ${this.queue.length}/${this.maxQueued}`
        )
      );
    }

    // Add to queue and wait
    return this.queueAndWait(operation, priority, queueTimeout, signal, traceId);
  }

  /**
   * Check if bulkhead is overloaded (would reject new requests).
   */
  isOverloaded(): boolean {
    return this.active >= this.maxConcurrent && this.queue.length >= this.maxQueued;
  }

  /**
   * Check if there's immediate capacity (no queue wait).
   */
  hasCapacity(): boolean {
    return this.active < this.maxConcurrent;
  }

  /**
   * Get current stats.
   */
  getStats(): BulkheadStats {
    return {
      name: this.name,
      active: this.active,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueued: this.maxQueued,
      available: Math.max(0, this.maxConcurrent - this.active),
      totalExecutions: this.stats.totalExecutions,
      totalRejections: this.stats.totalRejections,
      totalQueueTimeouts: this.stats.totalQueueTimeouts,
      avgQueueTime:
        this.stats.queuedCount > 0
          ? Math.round(this.stats.totalQueueTime / this.stats.queuedCount)
          : 0,
      isOverloaded: this.isOverloaded(),
    };
  }

  /**
   * Drain the queue (reject all waiting requests).
   */
  drain(): number {
    const count = this.queue.length;
    for (const request of this.queue) {
      request.reject(new Error('Bulkhead drained'));
    }
    this.queue = [];
    return count;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async executeNow<T>(
    operation: () => T | Promise<T>,
    traceId: string
  ): Promise<Result<T, Error>> {
    this.active++;
    this.stats.totalExecutions++;
    const startTime = Date.now();

    try {
      const value = await operation();
      const elapsed = Date.now() - startTime;

      metrics.emitSuccess({
        operation: this.name,
        attempts: 1,
        elapsed,
        fromFallback: false,
        labels: { operation: this.name, trace_id: traceId },
        timestamp: Date.now(),
        traceId,
      });

      return Ok(value);
    } catch (error) {
      const elapsed = Date.now() - startTime;

      metrics.emitFailure({
        operation: this.name,
        attempts: 1,
        elapsed,
        errorCode: RecoveryErrorCode.MAX_RETRIES_EXCEEDED,
        errorMessage: error instanceof Error ? error.message : String(error),
        labels: { operation: this.name, trace_id: traceId },
        timestamp: Date.now(),
        traceId,
      });

      return Err(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.active--;
      this.processQueue();
    }
  }

  private queueAndWait<T>(
    operation: () => T | Promise<T>,
    priority: number,
    timeout: number,
    signal: AbortSignal | undefined,
    traceId: string
  ): Promise<Result<T, Error>> {
    return new Promise(resolve => {
      const enqueueTime = Date.now();

      // Timeout handler
      const timer = setTimeout(() => {
        this.removeFromQueue(request as QueuedRequest<unknown>);
        this.stats.totalQueueTimeouts++;

        metrics.emitTimeout?.({
          operation: this.name,
          timeout,
          timestamp: Date.now(),
        });

        resolve(
          Err(
            new Error(
              `Bulkhead queue timeout after ${timeout}ms. Position was ${this.queue.indexOf(request as QueuedRequest<unknown>) + 1}/${this.queue.length}`
            )
          )
        );
      }, timeout);

      // Abort handler
      const abortHandler = () => {
        clearTimeout(timer);
        this.removeFromQueue(request as QueuedRequest<unknown>);
        resolve(Err(new Error('Operation aborted while queued')));
      };

      signal?.addEventListener('abort', abortHandler, { once: true });

      const request: QueuedRequest<T> = {
        operation,
        priority,
        enqueueTime,
        timeout,
        traceId,
        signal,
        resolve: async (value: T) => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', abortHandler);

          const queueTime = Date.now() - enqueueTime;
          this.stats.totalQueueTime += queueTime;
          this.stats.queuedCount++;

          // Now execute
          const result = await this.executeNow(() => value as T, traceId);
          resolve(result);
        },
        reject: (error: Error) => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', abortHandler);
          resolve(Err(error));
        },
      };

      // Insert with priority
      if (this.enablePriority) {
        const insertIndex = this.queue.findIndex(r => r.priority < priority);
        if (insertIndex === -1) {
          this.queue.push(request as QueuedRequest<unknown>);
        } else {
          this.queue.splice(insertIndex, 0, request as QueuedRequest<unknown>);
        }
      } else {
        this.queue.push(request as QueuedRequest<unknown>);
      }
    });
  }

  private removeFromQueue(request: QueuedRequest<unknown>): void {
    const index = this.queue.indexOf(request);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  private processQueue(): void {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        // Execute the queued operation
        this.active++;
        this.stats.totalExecutions++;

        Promise.resolve(request.operation())
          .then(value => {
            request.resolve(value);
          })
          .catch(error => {
            request.reject(error instanceof Error ? error : new Error(String(error)));
          })
          .finally(() => {
            this.active--;
            this.processQueue();
          });
      }
    }
  }
}

// ============================================================================
// BULKHEAD REGISTRY (Shared Bulkheads)
// ============================================================================

const bulkheadRegistry = new Map<string, Bulkhead>();

/**
 * Get or create a shared bulkhead.
 */
export function getBulkhead(name: string, config?: BulkheadConfig): Bulkhead {
  const sanitizedName = sanitizeName(name);
  let bulkhead = bulkheadRegistry.get(sanitizedName);
  if (!bulkhead) {
    // Prevent registry exhaustion attack
    checkRegistrySize(bulkheadRegistry, sanitizedName);
    bulkhead = new Bulkhead(sanitizedName, config);
    bulkheadRegistry.set(sanitizedName, bulkhead);
  }
  return bulkhead;
}

/**
 * Get all registered bulkheads and their stats.
 */
export function getAllBulkheadStats(): BulkheadStats[] {
  return Array.from(bulkheadRegistry.values()).map(b => b.getStats());
}

/**
 * Clear registry (for testing).
 */
export function clearBulkheadRegistry(): void {
  bulkheadRegistry.forEach(b => b.drain());
  bulkheadRegistry.clear();
}
