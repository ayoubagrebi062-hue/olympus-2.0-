/**
 * OLYMPUS 2.0 - Graceful Degradation
 *
 * Fallback mechanisms when SSE isn't available or fails.
 * Provides seamless degradation to long-polling or WebSocket alternatives.
 */

import { EventEmitter } from 'events';
import { StreamEvent } from './types';

export type TransportType = 'sse' | 'websocket' | 'long-polling' | 'polling';

export interface TransportCapabilities {
  sse: boolean;
  websocket: boolean;
  longPolling: boolean;
  polling: boolean;
}

export interface DegradationConfig {
  /** Primary transport preference order */
  preferredTransports: TransportType[];
  /** Maximum connection attempts before degrading */
  maxAttemptsBeforeDegradation: number;
  /** Timeout for each transport attempt (ms) */
  transportTimeoutMs: number;
  /** Polling interval for fallback (ms) */
  pollingIntervalMs: number;
  /** Long-polling timeout (ms) */
  longPollingTimeoutMs: number;
}

export const DEFAULT_DEGRADATION_CONFIG: DegradationConfig = {
  preferredTransports: ['sse', 'websocket', 'long-polling', 'polling'],
  maxAttemptsBeforeDegradation: 3,
  transportTimeoutMs: 5000,
  pollingIntervalMs: 1000,
  longPollingTimeoutMs: 30000,
};

export interface TransportMetrics {
  currentTransport: TransportType;
  degradations: number;
  attempts: Record<TransportType, number>;
  lastError?: { transport: TransportType; message: string; timestamp: Date };
}

/**
 * Detect client capabilities
 */
export function detectCapabilities(): TransportCapabilities {
  const isBrowser = typeof window !== 'undefined';

  return {
    sse: isBrowser && typeof EventSource !== 'undefined',
    websocket: isBrowser && typeof WebSocket !== 'undefined',
    longPolling: true, // Always available
    polling: true, // Always available
  };
}

/**
 * Abstract transport interface
 */
export interface StreamTransport extends EventEmitter {
  connect(url: string, options?: Record<string, unknown>): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  getType(): TransportType;
}

/**
 * SSE Transport
 */
export class SSETransport extends EventEmitter implements StreamTransport {
  private eventSource: EventSource | null = null;
  private connected: boolean = false;

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(url);

        this.eventSource.onopen = () => {
          this.connected = true;
          this.emit('connected');
          resolve();
        };

        this.eventSource.onerror = (error) => {
          if (!this.connected) {
            reject(new Error('SSE connection failed'));
          } else {
            this.emit('error', error);
          }
        };

        this.eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            this.emit('event', parsed);
          } catch {
            this.emit('event', { type: 'raw', data: event.data });
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connected = false;
    this.emit('disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getType(): TransportType {
    return 'sse';
  }
}

/**
 * WebSocket Transport
 */
export class WebSocketTransport extends EventEmitter implements StreamTransport {
  private ws: WebSocket | null = null;
  private connected: boolean = false;

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Convert HTTP URL to WebSocket URL
        const wsUrl = url.replace(/^http/, 'ws');
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.connected = true;
          this.emit('connected');
          resolve();
        };

        this.ws.onerror = (error) => {
          if (!this.connected) {
            reject(new Error('WebSocket connection failed'));
          } else {
            this.emit('error', error);
          }
        };

        this.ws.onclose = () => {
          this.connected = false;
          this.emit('disconnected');
        };

        this.ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            this.emit('event', parsed);
          } catch {
            this.emit('event', { type: 'raw', data: event.data });
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getType(): TransportType {
    return 'websocket';
  }
}

/**
 * Long-Polling Transport
 */
export class LongPollingTransport extends EventEmitter implements StreamTransport {
  private connected: boolean = false;
  private abortController: AbortController | null = null;
  private url: string = '';
  private lastEventId: string = '';
  private timeoutMs: number;

  constructor(timeoutMs: number = 30000) {
    super();
    this.timeoutMs = timeoutMs;
  }

  async connect(url: string): Promise<void> {
    this.url = url;
    this.connected = true;
    this.abortController = new AbortController();
    this.emit('connected');
    this.poll();
  }

  private async poll(): Promise<void> {
    while (this.connected) {
      try {
        const response = await fetch(this.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Last-Event-ID': this.lastEventId,
          },
          body: JSON.stringify({ lastEventId: this.lastEventId }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const events = await response.json();

        if (Array.isArray(events)) {
          for (const event of events) {
            if (event.id) {
              this.lastEventId = event.id;
            }
            this.emit('event', event);
          }
        }
      } catch (error) {
        if (this.connected) {
          this.emit('error', error);
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  disconnect(): void {
    this.connected = false;
    this.abortController?.abort();
    this.abortController = null;
    this.emit('disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getType(): TransportType {
    return 'long-polling';
  }
}

/**
 * Regular Polling Transport (fallback of last resort)
 */
export class PollingTransport extends EventEmitter implements StreamTransport {
  private connected: boolean = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private url: string = '';
  private lastEventId: string = '';
  private intervalMs: number;

  constructor(intervalMs: number = 1000) {
    super();
    this.intervalMs = intervalMs;
  }

  async connect(url: string): Promise<void> {
    this.url = url;
    this.connected = true;
    this.emit('connected');

    this.pollInterval = setInterval(() => this.poll(), this.intervalMs);
  }

  private async poll(): Promise<void> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Last-Event-ID': this.lastEventId,
        },
        body: JSON.stringify({ lastEventId: this.lastEventId, polling: true }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const events = await response.json();

      if (Array.isArray(events)) {
        for (const event of events) {
          if (event.id) {
            this.lastEventId = event.id;
          }
          this.emit('event', event);
        }
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  disconnect(): void {
    this.connected = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.emit('disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getType(): TransportType {
    return 'polling';
  }
}

/**
 * Transport manager with graceful degradation
 */
export class GracefulTransportManager extends EventEmitter {
  private config: DegradationConfig;
  private capabilities: TransportCapabilities;
  private currentTransport: StreamTransport | null = null;
  private attempts: Record<TransportType, number> = {
    'sse': 0,
    'websocket': 0,
    'long-polling': 0,
    'polling': 0,
  };
  private degradations: number = 0;
  private lastError?: { transport: TransportType; message: string; timestamp: Date };

  constructor(config: Partial<DegradationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_DEGRADATION_CONFIG, ...config };
    this.capabilities = detectCapabilities();
  }

  /**
   * Connect using best available transport
   */
  async connect(url: string): Promise<TransportType> {
    for (const transportType of this.config.preferredTransports) {
      if (!this.isTransportAvailable(transportType)) continue;

      try {
        await this.tryTransport(transportType, url);
        return transportType;
      } catch (error) {
        this.recordError(transportType, error);

        if (this.attempts[transportType] >= this.config.maxAttemptsBeforeDegradation) {
          this.degradations++;
          this.emit('degradation', { from: transportType, attempts: this.attempts[transportType] });
          continue; // Try next transport
        }
      }
    }

    throw new Error('All transports failed');
  }

  private isTransportAvailable(type: TransportType): boolean {
    switch (type) {
      case 'sse': return this.capabilities.sse;
      case 'websocket': return this.capabilities.websocket;
      case 'long-polling': return this.capabilities.longPolling;
      case 'polling': return this.capabilities.polling;
      default: return false;
    }
  }

  private async tryTransport(type: TransportType, url: string): Promise<void> {
    this.attempts[type]++;

    const transport = this.createTransport(type);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Transport timeout')), this.config.transportTimeoutMs);
    });

    await Promise.race([transport.connect(url), timeoutPromise]);

    this.currentTransport = transport;

    // Forward events
    transport.on('event', (event) => this.emit('event', event));
    transport.on('error', (error) => this.emit('error', error));
    transport.on('disconnected', () => this.emit('disconnected'));

    this.emit('connected', type);
  }

  private createTransport(type: TransportType): StreamTransport {
    switch (type) {
      case 'sse': return new SSETransport();
      case 'websocket': return new WebSocketTransport();
      case 'long-polling': return new LongPollingTransport(this.config.longPollingTimeoutMs);
      case 'polling': return new PollingTransport(this.config.pollingIntervalMs);
      default: throw new Error(`Unknown transport: ${type}`);
    }
  }

  private recordError(transport: TransportType, error: unknown): void {
    this.lastError = {
      transport,
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
    };
    this.emit('transport:error', this.lastError);
  }

  /**
   * Disconnect current transport
   */
  disconnect(): void {
    this.currentTransport?.disconnect();
    this.currentTransport = null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.currentTransport?.isConnected() ?? false;
  }

  /**
   * Get current transport type
   */
  getCurrentTransport(): TransportType | null {
    return this.currentTransport?.getType() ?? null;
  }

  /**
   * Get metrics
   */
  getMetrics(): TransportMetrics {
    return {
      currentTransport: this.currentTransport?.getType() ?? 'sse',
      degradations: this.degradations,
      attempts: { ...this.attempts },
      lastError: this.lastError,
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.disconnect();
    this.attempts = { 'sse': 0, 'websocket': 0, 'long-polling': 0, 'polling': 0 };
    this.degradations = 0;
    this.lastError = undefined;
  }
}
