/**
 * OLYMPUS 50X - Stream Manager
 *
 * Server-Sent Events (SSE) streaming for real-time generation updates.
 * Provides live progress, token streaming, and status updates.
 */

import { v4 as uuid } from 'uuid';

// ============================================
// TYPES
// ============================================

export type StreamEventType =
  | 'start' // Generation started
  | 'agent_start' // Agent started working
  | 'agent_progress' // Agent progress update
  | 'agent_complete' // Agent finished
  | 'token' // Single token streamed
  | 'chunk' // Code chunk streamed
  | 'iteration' // Iteration update
  | 'score' // Quality score update
  | 'vision' // Vision validation update
  | 'error' // Error occurred
  | 'complete'; // Generation complete

export interface StreamEvent {
  id: string;
  type: StreamEventType;
  timestamp: number;
  data: StreamEventData;
}

export interface StreamEventData {
  requestId?: string;
  agentId?: string;
  message?: string;
  token?: string;
  chunk?: string;
  progress?: number; // 0-100
  score?: number;
  iteration?: number;
  totalIterations?: number;
  code?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface StreamSubscriber {
  id: string;
  requestId: string;
  callback: (event: StreamEvent) => void;
  filters?: StreamEventType[];
}

export interface StreamSession {
  id: string;
  requestId: string;
  startedAt: Date;
  status: 'active' | 'completed' | 'error';
  events: StreamEvent[];
  subscribers: Set<string>;
}

// ============================================
// STREAM MANAGER CLASS
// ============================================

export class StreamManager {
  private sessions: Map<string, StreamSession> = new Map();
  private subscribers: Map<string, StreamSubscriber> = new Map();
  private maxEventsPerSession = 1000;

  /**
   * Create a new streaming session
   */
  createSession(requestId: string): StreamSession {
    const session: StreamSession = {
      id: uuid(),
      requestId,
      startedAt: new Date(),
      status: 'active',
      events: [],
      subscribers: new Set(),
    };

    this.sessions.set(requestId, session);
    return session;
  }

  /**
   * Get or create session
   */
  getSession(requestId: string): StreamSession | undefined {
    return this.sessions.get(requestId);
  }

  /**
   * Subscribe to stream events
   */
  subscribe(
    requestId: string,
    callback: (event: StreamEvent) => void,
    filters?: StreamEventType[]
  ): string {
    const subscriberId = uuid();

    const subscriber: StreamSubscriber = {
      id: subscriberId,
      requestId,
      callback,
      filters,
    };

    this.subscribers.set(subscriberId, subscriber);

    // Add to session subscribers
    const session = this.sessions.get(requestId);
    if (session) {
      session.subscribers.add(subscriberId);

      // Send buffered events to new subscriber
      for (const event of session.events) {
        if (!filters || filters.includes(event.type)) {
          try {
            callback(event);
          } catch (error) {
            console.error('[StreamManager] Error sending buffered event:', error);
          }
        }
      }
    }

    return subscriberId;
  }

  /**
   * Unsubscribe from stream
   */
  unsubscribe(subscriberId: string): void {
    const subscriber = this.subscribers.get(subscriberId);
    if (subscriber) {
      const session = this.sessions.get(subscriber.requestId);
      if (session) {
        session.subscribers.delete(subscriberId);
      }
      this.subscribers.delete(subscriberId);
    }
  }

  /**
   * Emit event to all subscribers
   */
  emit(requestId: string, type: StreamEventType, data: StreamEventData): void {
    const session = this.sessions.get(requestId);
    if (!session) {
      console.warn(`[StreamManager] No session found for request: ${requestId}`);
      return;
    }

    const event: StreamEvent = {
      id: uuid(),
      type,
      timestamp: Date.now(),
      data: { requestId, ...data },
    };

    // Store event (with limit)
    if (session.events.length >= this.maxEventsPerSession) {
      session.events.shift();
    }
    session.events.push(event);

    // Update session status
    if (type === 'complete') {
      session.status = 'completed';
    } else if (type === 'error') {
      session.status = 'error';
    }

    // Notify subscribers
    for (const subscriberId of session.subscribers) {
      const subscriber = this.subscribers.get(subscriberId);
      if (subscriber) {
        if (!subscriber.filters || subscriber.filters.includes(type)) {
          try {
            subscriber.callback(event);
          } catch (error) {
            console.error(`[StreamManager] Subscriber ${subscriberId} error:`, error);
          }
        }
      }
    }
  }

  /**
   * Convenience methods for common events
   */
  emitStart(requestId: string, message: string = 'Generation started'): void {
    this.emit(requestId, 'start', { message, progress: 0 });
  }

  emitAgentStart(requestId: string, agentId: string): void {
    this.emit(requestId, 'agent_start', {
      agentId,
      message: `Agent ${agentId.toUpperCase()} started`,
    });
  }

  emitAgentProgress(requestId: string, agentId: string, progress: number, message?: string): void {
    this.emit(requestId, 'agent_progress', {
      agentId,
      progress,
      message: message || `Agent ${agentId.toUpperCase()}: ${progress}%`,
    });
  }

  emitAgentComplete(requestId: string, agentId: string, metadata?: Record<string, unknown>): void {
    this.emit(requestId, 'agent_complete', {
      agentId,
      message: `Agent ${agentId.toUpperCase()} completed`,
      metadata,
    });
  }

  emitToken(requestId: string, token: string): void {
    this.emit(requestId, 'token', { token });
  }

  emitChunk(requestId: string, chunk: string): void {
    this.emit(requestId, 'chunk', { chunk });
  }

  emitIteration(
    requestId: string,
    iteration: number,
    totalIterations: number,
    score?: number
  ): void {
    this.emit(requestId, 'iteration', {
      iteration,
      totalIterations,
      score,
      message: `Iteration ${iteration}/${totalIterations}${score ? ` (Score: ${score})` : ''}`,
    });
  }

  emitScore(requestId: string, score: number, message?: string): void {
    this.emit(requestId, 'score', {
      score,
      message: message || `Quality score: ${score}/100`,
    });
  }

  emitVision(requestId: string, score: number, passed: boolean): void {
    this.emit(requestId, 'vision', {
      score,
      message: `Visual validation: ${score}/100 - ${passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}`,
      metadata: { passed },
    });
  }

  emitError(requestId: string, error: string): void {
    this.emit(requestId, 'error', { error, message: `Error: ${error}` });
  }

  emitComplete(requestId: string, code: string, score: number): void {
    this.emit(requestId, 'complete', {
      code,
      score,
      progress: 100,
      message: `Generation complete - Score: ${score}/100`,
    });
  }

  /**
   * Close session and cleanup
   */
  closeSession(requestId: string): void {
    const session = this.sessions.get(requestId);
    if (session) {
      // Unsubscribe all
      for (const subscriberId of session.subscribers) {
        this.subscribers.delete(subscriberId);
      }
      this.sessions.delete(requestId);
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): StreamSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  /**
   * Get session stats
   */
  getStats(): {
    activeSessions: number;
    totalSubscribers: number;
    totalEvents: number;
  } {
    let totalEvents = 0;
    for (const session of this.sessions.values()) {
      totalEvents += session.events.length;
    }

    return {
      activeSessions: this.getActiveSessions().length,
      totalSubscribers: this.subscribers.size,
      totalEvents,
    };
  }
}

// ============================================
// SSE ENCODER
// ============================================

/**
 * Encode event for SSE transmission
 */
export function encodeSSE(event: StreamEvent): string {
  const data = JSON.stringify(event);
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${data}\n\n`;
}

/**
 * Create SSE stream from events
 */
export function createSSEStream(
  requestId: string,
  manager: StreamManager
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      // Subscribe to events
      const subscriberId = manager.subscribe(requestId, event => {
        const sseData = encodeSSE(event);
        controller.enqueue(encoder.encode(sseData));

        // Close stream on complete or error
        if (event.type === 'complete' || event.type === 'error') {
          controller.close();
          manager.unsubscribe(subscriberId);
        }
      });
    },
  });
}

// ============================================
// PROGRESS CALCULATOR
// ============================================

/**
 * Calculate overall progress from pipeline state
 */
export function calculateProgress(state: {
  currentAgent?: string;
  agentProgress?: number;
  iteration?: number;
  maxIterations?: number;
  visionIteration?: number;
  maxVisionIterations?: number;
}): number {
  const AGENT_WEIGHTS = {
    planner: { start: 0, end: 10 },
    designer: { start: 10, end: 25 },
    coder: { start: 25, end: 60 },
    reviewer: { start: 60, end: 75 },
    fixer: { start: 75, end: 90 },
    vision: { start: 90, end: 100 },
  };

  const { currentAgent, agentProgress = 0, iteration = 1, maxIterations = 3 } = state;

  if (!currentAgent) return 0;

  const weights = AGENT_WEIGHTS[currentAgent as keyof typeof AGENT_WEIGHTS];
  if (!weights) return 50; // Unknown agent, estimate 50%

  // Calculate progress within agent range
  const agentRange = weights.end - weights.start;
  const withinAgentProgress = (agentProgress / 100) * agentRange;

  // Adjust for iteration (later iterations = closer to end)
  const iterationBonus = ((iteration - 1) / maxIterations) * 10;

  return Math.min(100, Math.round(weights.start + withinAgentProgress + iterationBonus));
}

// ============================================
// SINGLETON
// ============================================

let managerInstance: StreamManager | null = null;

/**
 * Get singleton stream manager
 */
export function getStreamManager(): StreamManager {
  if (!managerInstance) {
    managerInstance = new StreamManager();
  }
  return managerInstance;
}

export default StreamManager;
