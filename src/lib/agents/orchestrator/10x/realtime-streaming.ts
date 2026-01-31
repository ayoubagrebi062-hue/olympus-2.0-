/**
 * ============================================================================
 * REAL-TIME STREAMING - LIVE BUILD PROGRESS
 * ============================================================================
 *
 * "Watching your build is like watching a symphony - every note matters."
 *
 * This module implements real-time streaming for builds:
 * - Server-Sent Events (SSE) for browser clients
 * - WebSocket support for bi-directional communication
 * - Event aggregation for bandwidth efficiency
 * - Client connection management
 * - Backpressure handling
 *
 * Inspired by: GitHub Actions, Vercel Deployments, Railway Logs
 * ============================================================================
 */

import { EventEmitter } from 'events';
import { EventStore, BuildEvent, BuildEventType } from './event-sourcing';
import { ProjectedBuildState, StateProjector } from './event-sourcing';

// ============================================================================
// TYPES
// ============================================================================

export interface StreamClient {
  id: string;
  buildId: string;
  type: 'sse' | 'websocket';
  connectedAt: Date;
  lastEventId: number;
  filters: StreamFilters;
  controller?: ReadableStreamDefaultController;
  socket?: WebSocket;
}

export interface StreamFilters {
  eventTypes?: BuildEventType[];
  minSeverity?: 'debug' | 'info' | 'warning' | 'error';
  includeHeartbeat?: boolean;
  aggregationWindowMs?: number;
}

export interface StreamMessage {
  id: string;
  type: 'event' | 'state' | 'heartbeat' | 'progress' | 'error';
  timestamp: Date;
  data: unknown;
}

export interface ProgressUpdate {
  buildId: string;
  status: string;
  currentPhase: string | null;
  currentAgent: string | null;
  progress: {
    phases: { completed: number; total: number };
    agents: { completed: number; running: number; pending: number; failed: number; total: number };
    percent: number;
  };
  metrics: {
    duration: number;
    tokensUsed: number;
    estimatedRemaining: number | null;
  };
  timeline: {
    type: string;
    description: string;
    timestamp: Date;
  }[];
}

// ============================================================================
// STREAM MANAGER
// ============================================================================

export class StreamManager extends EventEmitter {
  private eventStore: EventStore;
  private projector: StateProjector;
  private clients: Map<string, StreamClient> = new Map();
  private buildSubscriptions: Map<string, Set<string>> = new Map(); // buildId -> clientIds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private aggregationBuffers: Map<string, BuildEvent[]> = new Map();
  private unsubscribes: Map<string, () => void> = new Map();

  constructor(eventStore: EventStore) {
    super();
    this.eventStore = eventStore;
    this.projector = new StateProjector();
    this.startHeartbeat();
    this.setupEventSubscription();
  }

  /**
   * Create a Server-Sent Events stream for a build
   */
  createSSEStream(buildId: string, filters: StreamFilters = {}): ReadableStream<Uint8Array> {
    const clientId = `sse-${buildId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new ReadableStream<Uint8Array>({
      start: async controller => {
        const client: StreamClient = {
          id: clientId,
          buildId,
          type: 'sse',
          connectedAt: new Date(),
          lastEventId: 0,
          filters,
          controller,
        };

        this.registerClient(client);

        // Send initial state
        const initialState = await this.getInitialState(buildId);
        if (initialState) {
          this.sendToClient(client, {
            id: `init-${Date.now()}`,
            type: 'state',
            timestamp: new Date(),
            data: initialState,
          });
        }

        // Send connection confirmation
        this.sendToClient(client, {
          id: `connected-${Date.now()}`,
          type: 'event',
          timestamp: new Date(),
          data: { type: 'CONNECTED', clientId },
        });
      },
      cancel: () => {
        this.unregisterClient(clientId);
      },
    });
  }

  /**
   * Register a WebSocket client
   */
  registerWebSocket(buildId: string, socket: WebSocket, filters: StreamFilters = {}): string {
    const clientId = `ws-${buildId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const client: StreamClient = {
      id: clientId,
      buildId,
      type: 'websocket',
      connectedAt: new Date(),
      lastEventId: 0,
      filters,
      socket,
    };

    this.registerClient(client);

    // Handle incoming messages
    socket.addEventListener('message', event => {
      try {
        const message = JSON.parse(event.data);
        this.handleClientMessage(clientId, message);
      } catch {
        // Invalid JSON - ignore
      }
    });

    socket.addEventListener('close', () => {
      this.unregisterClient(clientId);
    });

    // Send initial state
    this.getInitialState(buildId).then(state => {
      if (state && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            id: `init-${Date.now()}`,
            type: 'state',
            timestamp: new Date().toISOString(),
            data: state,
          })
        );
      }
    });

    return clientId;
  }

  /**
   * Broadcast an event to all clients watching a build
   */
  broadcast(buildId: string, message: StreamMessage): void {
    const clientIds = this.buildSubscriptions.get(buildId);
    if (!clientIds) return;

    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendToClient(client, message);
      }
    }
  }

  /**
   * Get current progress for a build
   */
  async getProgress(buildId: string): Promise<ProgressUpdate | null> {
    const events = await this.eventStore.getEvents(buildId);
    if (events.length === 0) return null;

    const state = this.projector.project(events);
    return this.stateToProgress(buildId, state, events);
  }

  /**
   * Get connected client count for a build
   */
  getClientCount(buildId: string): number {
    return this.buildSubscriptions.get(buildId)?.size || 0;
  }

  /**
   * Close all client connections for a specific build
   */
  closeConnections(buildId: string): void {
    const clientIds = this.buildSubscriptions.get(buildId);
    if (clientIds) {
      for (const clientId of clientIds) {
        this.unregisterClient(clientId);
      }
      this.buildSubscriptions.delete(buildId);
    }
  }

  /**
   * Shutdown the stream manager
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    for (const [clientId, client] of this.clients) {
      if (client.type === 'sse' && client.controller) {
        client.controller.close();
      }
      if (client.type === 'websocket' && client.socket) {
        client.socket.close();
      }
    }

    this.clients.clear();
    this.buildSubscriptions.clear();

    // Unsubscribe from event store
    for (const unsub of this.unsubscribes.values()) {
      unsub();
    }
    this.unsubscribes.clear();
  }

  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================

  private registerClient(client: StreamClient): void {
    this.clients.set(client.id, client);

    // Add to build subscriptions
    let subs = this.buildSubscriptions.get(client.buildId);
    if (!subs) {
      subs = new Set();
      this.buildSubscriptions.set(client.buildId, subs);
    }
    subs.add(client.id);

    this.emit('client_connected', { clientId: client.id, buildId: client.buildId });
  }

  private unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from build subscriptions
    const subs = this.buildSubscriptions.get(client.buildId);
    if (subs) {
      subs.delete(clientId);
      if (subs.size === 0) {
        this.buildSubscriptions.delete(client.buildId);
      }
    }

    this.clients.delete(clientId);
    this.emit('client_disconnected', { clientId, buildId: client.buildId });
  }

  private sendToClient(client: StreamClient, message: StreamMessage): void {
    // Apply filters
    if (!this.passesFilters(client, message)) return;

    const serialized = this.serializeMessage(message, client.type);

    try {
      if (client.type === 'sse' && client.controller) {
        client.controller.enqueue(new TextEncoder().encode(serialized));
      } else if (client.type === 'websocket' && client.socket?.readyState === WebSocket.OPEN) {
        client.socket.send(serialized);
      }
    } catch (error) {
      // Client disconnected
      this.unregisterClient(client.id);
    }
  }

  private passesFilters(client: StreamClient, message: StreamMessage): boolean {
    const { filters } = client;

    // Filter by event types
    if (filters.eventTypes && message.type === 'event') {
      const eventType = (message.data as { type: string }).type as BuildEventType;
      if (!filters.eventTypes.includes(eventType)) {
        return false;
      }
    }

    // Filter heartbeats
    if (message.type === 'heartbeat' && !filters.includeHeartbeat) {
      return false;
    }

    return true;
  }

  private serializeMessage(message: StreamMessage, clientType: 'sse' | 'websocket'): string {
    if (clientType === 'sse') {
      // SSE format
      return `id: ${message.id}\nevent: ${message.type}\ndata: ${JSON.stringify(message.data)}\n\n`;
    } else {
      // WebSocket JSON
      return JSON.stringify({
        ...message,
        timestamp: message.timestamp.toISOString(),
      });
    }
  }

  private setupEventSubscription(): void {
    const unsub = this.eventStore.subscribe(event => {
      const buildId = event.buildId;

      // Check if anyone is watching this build
      if (!this.buildSubscriptions.has(buildId)) return;

      // Check for aggregation
      const clientIds = this.buildSubscriptions.get(buildId);
      if (!clientIds) return;

      const client = this.clients.get(Array.from(clientIds)[0]);
      const aggregationWindow = client?.filters.aggregationWindowMs || 0;

      if (aggregationWindow > 0) {
        // Buffer events for aggregation
        let buffer = this.aggregationBuffers.get(buildId);
        if (!buffer) {
          buffer = [];
          this.aggregationBuffers.set(buildId, buffer);

          // Set up flush timer
          setTimeout(() => {
            this.flushAggregationBuffer(buildId);
          }, aggregationWindow);
        }
        buffer.push(event);
      } else {
        // Send immediately
        this.broadcast(buildId, {
          id: event.id,
          type: 'event',
          timestamp: event.timestamp,
          data: event,
        });

        // Also send progress update
        this.sendProgressUpdate(buildId);
      }
    });

    this.unsubscribes.set('main', unsub);
  }

  private async flushAggregationBuffer(buildId: string): Promise<void> {
    const buffer = this.aggregationBuffers.get(buildId);
    if (!buffer || buffer.length === 0) return;

    this.aggregationBuffers.delete(buildId);

    // Send aggregated events
    this.broadcast(buildId, {
      id: `batch-${Date.now()}`,
      type: 'event',
      timestamp: new Date(),
      data: {
        type: 'BATCH',
        events: buffer,
        count: buffer.length,
      },
    });

    // Send progress update
    await this.sendProgressUpdate(buildId);
  }

  private async sendProgressUpdate(buildId: string): Promise<void> {
    const progress = await this.getProgress(buildId);
    if (progress) {
      this.broadcast(buildId, {
        id: `progress-${Date.now()}`,
        type: 'progress',
        timestamp: new Date(),
        data: progress,
      });
    }
  }

  private async getInitialState(buildId: string): Promise<ProgressUpdate | null> {
    return this.getProgress(buildId);
  }

  private stateToProgress(
    buildId: string,
    state: ProjectedBuildState,
    events: BuildEvent[]
  ): ProgressUpdate {
    const agents = Array.from(state.agents.values());
    const phases = Array.from(state.phases.values());

    return {
      buildId,
      status: state.status,
      currentPhase: state.currentPhase,
      currentAgent: state.currentAgent,
      progress: {
        phases: {
          completed: phases.filter(p => p.status === 'completed').length,
          total: phases.length,
        },
        agents: {
          completed: agents.filter(a => a.status === 'completed').length,
          running: agents.filter(a => a.status === 'running').length,
          pending: agents.filter(a => a.status === 'pending').length,
          failed: agents.filter(a => a.status === 'failed').length,
          total: agents.length,
        },
        percent:
          agents.length > 0
            ? Math.round(
                (agents.filter(a => ['completed', 'skipped'].includes(a.status)).length /
                  agents.length) *
                  100
              )
            : 0,
      },
      metrics: {
        duration: state.metrics.totalDuration,
        tokensUsed: state.metrics.totalTokens,
        estimatedRemaining: null, // Would come from predictive engine
      },
      timeline: state.timeline.slice(-10).map(t => ({
        type: t.type,
        description: t.description,
        timestamp: t.timestamp,
      })),
    };
  }

  private handleClientMessage(clientId: string, message: { type: string; data?: unknown }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'ping':
        this.sendToClient(client, {
          id: `pong-${Date.now()}`,
          type: 'heartbeat',
          timestamp: new Date(),
          data: { type: 'pong' },
        });
        break;

      case 'updateFilters':
        if (message.data) {
          client.filters = { ...client.filters, ...(message.data as StreamFilters) };
        }
        break;

      case 'requestState':
        this.getInitialState(client.buildId).then(state => {
          if (state) {
            this.sendToClient(client, {
              id: `state-${Date.now()}`,
              type: 'state',
              timestamp: new Date(),
              data: state,
            });
          }
        });
        break;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, client] of this.clients) {
        if (client.filters.includeHeartbeat !== false) {
          this.sendToClient(client, {
            id: `heartbeat-${Date.now()}`,
            type: 'heartbeat',
            timestamp: new Date(),
            data: { clientId, uptime: Date.now() - client.connectedAt.getTime() },
          });
        }
      }
    }, 30000);
  }
}

// ============================================================================
// SSE RESPONSE HELPER (for Next.js API routes)
// ============================================================================

export function createSSEResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

// ============================================================================
// FACTORY
// ============================================================================

export function createStreamManager(eventStore: EventStore): StreamManager {
  return new StreamManager(eventStore);
}
