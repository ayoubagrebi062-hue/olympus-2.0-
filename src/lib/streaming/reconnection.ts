/**
 * OLYMPUS 2.0 - Reconnection Manager
 *
 * Automatic SSE reconnection with exponential backoff,
 * event replay from last-event-id, and connection health monitoring.
 */

import { EventEmitter } from 'events';
import { StreamEvent } from './types';

export interface ReconnectionConfig {
  /** Initial retry delay (ms) */
  initialDelayMs: number;
  /** Maximum retry delay (ms) */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Maximum retry attempts (0 = infinite) */
  maxRetries: number;
  /** Jitter factor (0-1) to randomize delays */
  jitterFactor: number;
  /** Connection timeout (ms) */
  connectionTimeoutMs: number;
  /** Heartbeat interval for health checks (ms) */
  heartbeatIntervalMs: number;
  /** Max events to buffer for replay */
  maxEventBuffer: number;
}

export const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  maxRetries: 10,
  jitterFactor: 0.3,
  connectionTimeoutMs: 10000,
  heartbeatIntervalMs: 30000,
  maxEventBuffer: 1000,
};

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface ReconnectionMetrics {
  state: ConnectionState;
  reconnectAttempts: number;
  totalReconnects: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  uptime: number;
  eventsReplayed: number;
}

/**
 * Server-side event buffer for replay on reconnection
 */
export class EventBuffer {
  private events: Map<string, { event: StreamEvent; timestamp: number }> = new Map();
  private maxSize: number;
  private sequence: number = 0;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Add event to buffer
   */
  add(event: StreamEvent): string {
    const eventId = `${Date.now()}-${++this.sequence}`;

    // Evict oldest if at capacity
    if (this.events.size >= this.maxSize) {
      const oldestKey = this.events.keys().next().value;
      if (oldestKey) this.events.delete(oldestKey);
    }

    this.events.set(eventId, { event, timestamp: Date.now() });
    return eventId;
  }

  /**
   * Get events after a specific event ID
   */
  getAfter(lastEventId: string): StreamEvent[] {
    const result: StreamEvent[] = [];
    let found = false;

    for (const [id, { event }] of this.events) {
      if (found) {
        result.push(event);
      } else if (id === lastEventId) {
        found = true;
      }
    }

    // If lastEventId not found, return all events (client too far behind)
    if (!found && lastEventId) {
      return Array.from(this.events.values()).map(v => v.event);
    }

    return result;
  }

  /**
   * Get all buffered events
   */
  getAll(): StreamEvent[] {
    return Array.from(this.events.values()).map(v => v.event);
  }

  /**
   * Clear events older than maxAge (ms)
   */
  prune(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    let pruned = 0;

    for (const [id, { timestamp }] of this.events) {
      if (timestamp < cutoff) {
        this.events.delete(id);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.events.size;
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.events.clear();
  }
}

/**
 * Client-side reconnection manager
 */
export class ReconnectionManager extends EventEmitter {
  private config: ReconnectionConfig;
  private state: ConnectionState = 'disconnected';
  private retryCount: number = 0;
  private totalReconnects: number = 0;
  private lastEventId: string | null = null;
  private lastConnectedAt: Date | null = null;
  private lastDisconnectedAt: Date | null = null;
  private eventsReplayed: number = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeat: number = 0;
  private connectionStartTime: number = 0;

  constructor(config: Partial<ReconnectionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_RECONNECTION_CONFIG, ...config };
  }

  /**
   * Update last event ID for replay
   */
  setLastEventId(eventId: string): void {
    this.lastEventId = eventId;
  }

  /**
   * Get last event ID
   */
  getLastEventId(): string | null {
    return this.lastEventId;
  }

  /**
   * Mark connection as established
   */
  connected(): void {
    this.state = 'connected';
    this.retryCount = 0;
    this.lastConnectedAt = new Date();
    this.connectionStartTime = Date.now();
    this.startHeartbeatMonitor();
    this.emit('connected');
  }

  /**
   * Mark connection as lost, start reconnection
   */
  disconnected(error?: Error): void {
    const wasConnected = this.state === 'connected';
    this.state = 'reconnecting';
    this.lastDisconnectedAt = new Date();
    this.stopHeartbeatMonitor();

    if (wasConnected) {
      this.emit('disconnected', error);
    }

    this.scheduleReconnect();
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.config.maxRetries > 0 && this.retryCount >= this.config.maxRetries) {
      this.state = 'failed';
      this.emit('failed', new Error(`Max retries (${this.config.maxRetries}) exceeded`));
      return;
    }

    const delay = this.calculateDelay();
    this.retryCount++;

    this.emit('reconnecting', { attempt: this.retryCount, delayMs: delay });

    this.retryTimeout = setTimeout(() => {
      this.state = 'connecting';
      this.totalReconnects++;
      this.emit('reconnect', {
        attempt: this.retryCount,
        lastEventId: this.lastEventId
      });
    }, delay);
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(): number {
    const exponentialDelay = Math.min(
      this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, this.retryCount),
      this.config.maxDelayMs
    );

    // Add jitter
    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Record successful event replay
   */
  recordReplay(count: number): void {
    this.eventsReplayed += count;
    this.emit('replay', { count, total: this.eventsReplayed });
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitor(): void {
    this.lastHeartbeat = Date.now();

    this.heartbeatInterval = setInterval(() => {
      const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;

      if (timeSinceHeartbeat > this.config.heartbeatIntervalMs * 2) {
        // Connection seems dead
        this.emit('heartbeat:timeout', timeSinceHeartbeat);
        this.disconnected(new Error('Heartbeat timeout'));
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeatMonitor(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Record heartbeat received
   */
  heartbeat(): void {
    this.lastHeartbeat = Date.now();
    this.emit('heartbeat');
  }

  /**
   * Cancel pending reconnection
   */
  cancel(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.stopHeartbeatMonitor();
    this.state = 'disconnected';
  }

  /**
   * Reset manager state
   */
  reset(): void {
    this.cancel();
    this.retryCount = 0;
    this.lastEventId = null;
    this.eventsReplayed = 0;
  }

  /**
   * Get current metrics
   */
  getMetrics(): ReconnectionMetrics {
    const uptime = this.state === 'connected' && this.connectionStartTime
      ? Date.now() - this.connectionStartTime
      : 0;

    return {
      state: this.state,
      reconnectAttempts: this.retryCount,
      totalReconnects: this.totalReconnects,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      uptime,
      eventsReplayed: this.eventsReplayed,
    };
  }

  /**
   * Get current state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }
}
