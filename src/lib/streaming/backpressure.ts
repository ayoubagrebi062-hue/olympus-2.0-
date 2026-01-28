/**
 * OLYMPUS 2.0 - Backpressure Controller
 *
 * Prevents overwhelming slow clients with adaptive flow control.
 * Tracks client consumption rate and throttles production accordingly.
 */

import { EventEmitter } from 'events';

export interface BackpressureConfig {
  /** High water mark - pause production when buffer exceeds this */
  highWaterMark: number;
  /** Low water mark - resume production when buffer drops below this */
  lowWaterMark: number;
  /** Window size for rate calculation (ms) */
  rateWindowMs: number;
  /** Minimum events per second before throttling */
  minEventsPerSecond: number;
  /** Maximum queue size before dropping old events */
  maxQueueSize: number;
}

export const DEFAULT_BACKPRESSURE_CONFIG: BackpressureConfig = {
  highWaterMark: 100,
  lowWaterMark: 25,
  rateWindowMs: 1000,
  minEventsPerSecond: 10,
  maxQueueSize: 1000,
};

export interface BackpressureMetrics {
  queueSize: number;
  eventsPerSecond: number;
  isPaused: boolean;
  droppedEvents: number;
  totalEvents: number;
  averageLatencyMs: number;
}

/**
 * Backpressure controller with adaptive flow control
 */
export class BackpressureController extends EventEmitter {
  private config: BackpressureConfig;
  private queue: Array<{ event: unknown; timestamp: number }> = [];
  private isPaused: boolean = false;
  private droppedEvents: number = 0;
  private totalEvents: number = 0;
  private consumptionTimestamps: number[] = [];
  private latencies: number[] = [];

  constructor(config: Partial<BackpressureConfig> = {}) {
    super();
    this.config = { ...DEFAULT_BACKPRESSURE_CONFIG, ...config };
  }

  /**
   * Push an event into the queue
   * Returns false if event was dropped due to backpressure
   */
  push(event: unknown): boolean {
    this.totalEvents++;

    // Check if we need to drop events
    if (this.queue.length >= this.config.maxQueueSize) {
      // Drop oldest event (FIFO with priority preservation)
      const dropped = this.queue.shift();
      this.droppedEvents++;
      this.emit('drop', dropped?.event);
    }

    this.queue.push({ event, timestamp: Date.now() });

    // Check high water mark
    if (!this.isPaused && this.queue.length >= this.config.highWaterMark) {
      this.isPaused = true;
      this.emit('pause');
    }

    return true;
  }

  /**
   * Pull an event from the queue
   * Returns null if queue is empty
   */
  pull(): unknown | null {
    const item = this.queue.shift();
    if (!item) return null;

    // Track consumption rate
    const now = Date.now();
    this.consumptionTimestamps.push(now);
    this.consumptionTimestamps = this.consumptionTimestamps.filter(
      t => now - t < this.config.rateWindowMs
    );

    // Track latency
    const latency = now - item.timestamp;
    this.latencies.push(latency);
    if (this.latencies.length > 100) {
      this.latencies.shift();
    }

    // Check low water mark
    if (this.isPaused && this.queue.length <= this.config.lowWaterMark) {
      this.isPaused = false;
      this.emit('resume');
    }

    return item.event;
  }

  /**
   * Get current consumption rate (events per second)
   */
  getConsumptionRate(): number {
    const now = Date.now();
    const recentTimestamps = this.consumptionTimestamps.filter(
      t => now - t < this.config.rateWindowMs
    );
    return (recentTimestamps.length / this.config.rateWindowMs) * 1000;
  }

  /**
   * Check if production should be throttled
   */
  shouldThrottle(): boolean {
    return this.isPaused || this.getConsumptionRate() < this.config.minEventsPerSecond;
  }

  /**
   * Get recommended delay between events (ms)
   */
  getRecommendedDelay(): number {
    const rate = this.getConsumptionRate();
    if (rate === 0) return 100; // Default delay
    if (rate < this.config.minEventsPerSecond) {
      // Slow down production to match consumption
      return Math.min(1000 / rate, 500);
    }
    return 0;
  }

  /**
   * Get current metrics
   */
  getMetrics(): BackpressureMetrics {
    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;

    return {
      queueSize: this.queue.length,
      eventsPerSecond: this.getConsumptionRate(),
      isPaused: this.isPaused,
      droppedEvents: this.droppedEvents,
      totalEvents: this.totalEvents,
      averageLatencyMs: avgLatency,
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.isPaused = false;
  }

  /**
   * Check if queue has events
   */
  hasEvents(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }
}

/**
 * Priority-aware backpressure controller
 * Critical events (errors, complete) bypass normal queue
 */
export class PriorityBackpressureController extends BackpressureController {
  private priorityQueue: Array<{ event: unknown; timestamp: number }> = [];

  /**
   * Push a priority event (bypasses backpressure)
   */
  pushPriority(event: unknown): void {
    this.priorityQueue.push({ event, timestamp: Date.now() });
    this.emit('priority', event);
  }

  /**
   * Pull next event (priority first, then normal)
   */
  override pull(): unknown | null {
    // Priority events always come first
    if (this.priorityQueue.length > 0) {
      return this.priorityQueue.shift()?.event ?? null;
    }
    return super.pull();
  }

  /**
   * Check if any events available
   */
  override hasEvents(): boolean {
    return this.priorityQueue.length > 0 || super.hasEvents();
  }

  /**
   * Get total queue size
   */
  override size(): number {
    return this.priorityQueue.length + super.size();
  }
}
