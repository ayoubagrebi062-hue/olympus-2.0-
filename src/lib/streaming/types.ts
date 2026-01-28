import { z } from 'zod';

/**
 * Stream event types
 */
export type StreamEventType =
  | 'stream:start'
  | 'stream:token'
  | 'stream:chunk'
  | 'stream:complete'
  | 'stream:error'
  | 'agent:start'
  | 'agent:progress'
  | 'agent:complete'
  | 'agent:error'
  | 'build:start'
  | 'build:phase'
  | 'build:progress'
  | 'build:complete'
  | 'build:error';

/**
 * Base stream event
 */
export interface BaseStreamEvent {
  id: string;
  type: StreamEventType;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Token stream event (individual token)
 */
export interface TokenEvent extends BaseStreamEvent {
  type: 'stream:token';
  data: {
    token: string;
    index: number;
  };
}

/**
 * Chunk stream event (group of tokens)
 */
export interface ChunkEvent extends BaseStreamEvent {
  type: 'stream:chunk';
  data: {
    content: string;
    isPartial: boolean;
  };
}

/**
 * Stream start event
 */
export interface StreamStartEvent extends BaseStreamEvent {
  type: 'stream:start';
  data: {
    streamId: string;
    agentId?: string;
    buildId?: string;
    model?: string;
    estimatedTokens?: number;
  };
}

/**
 * Stream complete event
 */
export interface StreamCompleteEvent extends BaseStreamEvent {
  type: 'stream:complete';
  data: {
    streamId: string;
    totalTokens: number;
    totalChunks: number;
    durationMs: number;
    content: string;
  };
}

/**
 * Stream error event
 */
export interface StreamErrorEvent extends BaseStreamEvent {
  type: 'stream:error';
  data: {
    streamId: string;
    error: {
      code: string;
      message: string;
      recoverable: boolean;
    };
    partialContent?: string;
  };
}

/**
 * Agent start event
 */
export interface AgentStartEvent extends BaseStreamEvent {
  type: 'agent:start';
  data: {
    agentId: string;
    agentName: string;
    buildId: string;
    phase: string;
    dependencies: string[];
  };
}

/**
 * Agent progress event
 */
export interface AgentProgressEvent extends BaseStreamEvent {
  type: 'agent:progress';
  data: {
    agentId: string;
    buildId: string;
    progress: number; // 0-100
    message?: string;
    tokensUsed?: number;
  };
}

/**
 * Agent complete event
 */
export interface AgentCompleteEvent extends BaseStreamEvent {
  type: 'agent:complete';
  data: {
    agentId: string;
    buildId: string;
    success: boolean;
    durationMs: number;
    tokensUsed: number;
    outputPreview?: string;
  };
}

/**
 * Build phase event
 */
export interface BuildPhaseEvent extends BaseStreamEvent {
  type: 'build:phase';
  data: {
    buildId: string;
    phase: string;
    phaseIndex: number;
    totalPhases: number;
    agents: string[];
  };
}

/**
 * Build progress event
 */
export interface BuildProgressEvent extends BaseStreamEvent {
  type: 'build:progress';
  data: {
    buildId: string;
    progress: number; // 0-100
    currentPhase: string;
    currentAgent?: string;
    completedAgents: number;
    totalAgents: number;
    estimatedTimeRemainingMs?: number;
  };
}

/**
 * Union type of all stream events
 */
export type StreamEvent =
  | TokenEvent
  | ChunkEvent
  | StreamStartEvent
  | StreamCompleteEvent
  | StreamErrorEvent
  | AgentStartEvent
  | AgentProgressEvent
  | AgentCompleteEvent
  | BuildPhaseEvent
  | BuildProgressEvent;

/**
 * Stream configuration
 */
export interface StreamConfig {
  /** Chunk size for batching tokens */
  chunkSize: number;

  /** Debounce time for progress updates (ms) */
  progressDebounceMs: number;

  /** Whether to include token-level events */
  tokenLevel: boolean;

  /** Maximum buffer size before forcing flush */
  maxBufferSize: number;

  /** Heartbeat interval (ms) */
  heartbeatMs: number;
}

/**
 * Default stream config
 */
export const DEFAULT_STREAM_CONFIG: StreamConfig = {
  chunkSize: 10, // tokens per chunk
  progressDebounceMs: 100,
  tokenLevel: false, // chunks by default
  maxBufferSize: 1000,
  heartbeatMs: 30000, // 30 seconds
};

/**
 * Stream state
 */
export interface StreamState {
  id: string;
  status: 'pending' | 'streaming' | 'paused' | 'complete' | 'error';
  startedAt: Date;
  completedAt?: Date;
  tokensStreamed: number;
  chunksStreamed: number;
  buffer: string;
  error?: Error;
}
