import { v4 as uuid } from 'uuid';
import {
  StreamEvent,
  StreamConfig,
  StreamState,
  DEFAULT_STREAM_CONFIG,
  StreamStartEvent,
  StreamCompleteEvent,
  StreamErrorEvent,
  ChunkEvent,
  TokenEvent,
} from './types';
import { SSEEncoder } from './sse-encoder';

/**
 * Stream event handler
 */
export type StreamEventHandler = (event: StreamEvent) => void | Promise<void>;

/**
 * Stream controller for managing a single stream
 */
export class StreamController {
  private id: string;
  private config: StreamConfig;
  private state: StreamState;
  private encoder: SSEEncoder;
  private handlers: Set<StreamEventHandler> = new Set();
  private buffer: string[] = [];
  private tokenCount: number = 0;
  private lastProgressUpdate: number = 0;
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private abortController: AbortController;

  constructor(config: Partial<StreamConfig> = {}) {
    this.id = uuid();
    this.config = { ...DEFAULT_STREAM_CONFIG, ...config };
    this.encoder = new SSEEncoder();
    this.abortController = new AbortController();

    this.state = {
      id: this.id,
      status: 'pending',
      startedAt: new Date(),
      tokensStreamed: 0,
      chunksStreamed: 0,
      buffer: '',
    };
  }

  /**
   * Get stream ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get abort signal
   */
  getSignal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * Subscribe to stream events
   */
  subscribe(handler: StreamEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Start the stream
   */
  async start(metadata?: {
    agentId?: string;
    buildId?: string;
    model?: string;
    estimatedTokens?: number;
  }): Promise<void> {
    this.state.status = 'streaming';

    const event: StreamStartEvent = {
      id: uuid(),
      type: 'stream:start',
      timestamp: new Date(),
      data: {
        streamId: this.id,
        ...metadata,
      },
    };

    await this.emit(event);
    this.startHeartbeat();
  }

  /**
   * Push a token to the stream
   */
  async pushToken(token: string): Promise<void> {
    if (this.state.status !== 'streaming') {
      throw new Error(`Cannot push to stream in ${this.state.status} state`);
    }

    this.tokenCount++;
    this.buffer.push(token);
    this.state.buffer += token;

    // Emit token-level event if configured
    if (this.config.tokenLevel) {
      const event: TokenEvent = {
        id: uuid(),
        type: 'stream:token',
        timestamp: new Date(),
        data: {
          token,
          index: this.tokenCount - 1,
        },
      };
      await this.emit(event);
    }

    // Flush buffer if chunk size reached
    if (this.buffer.length >= this.config.chunkSize) {
      await this.flushBuffer();
    }

    // Flush if buffer size limit reached
    if (this.state.buffer.length >= this.config.maxBufferSize) {
      await this.flushBuffer();
    }
  }

  /**
   * Push a chunk directly
   */
  async pushChunk(content: string, isPartial: boolean = true): Promise<void> {
    if (this.state.status !== 'streaming') {
      throw new Error(`Cannot push to stream in ${this.state.status} state`);
    }

    this.state.buffer += content;
    this.state.chunksStreamed++;

    const event: ChunkEvent = {
      id: uuid(),
      type: 'stream:chunk',
      timestamp: new Date(),
      data: {
        content,
        isPartial,
      },
    };

    await this.emit(event);
  }

  /**
   * Flush the token buffer as a chunk
   */
  async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const content = this.buffer.join('');
    this.buffer = [];
    this.state.chunksStreamed++;
    this.state.tokensStreamed += content.length;

    const event: ChunkEvent = {
      id: uuid(),
      type: 'stream:chunk',
      timestamp: new Date(),
      data: {
        content,
        isPartial: true,
      },
    };

    await this.emit(event);
  }

  /**
   * Complete the stream
   */
  async complete(): Promise<void> {
    // Flush any remaining buffer
    await this.flushBuffer();

    this.state.status = 'complete';
    this.state.completedAt = new Date();
    this.stopHeartbeat();

    const event: StreamCompleteEvent = {
      id: uuid(),
      type: 'stream:complete',
      timestamp: new Date(),
      data: {
        streamId: this.id,
        totalTokens: this.state.tokensStreamed,
        totalChunks: this.state.chunksStreamed,
        durationMs: this.state.completedAt.getTime() - this.state.startedAt.getTime(),
        content: this.state.buffer,
      },
    };

    await this.emit(event);
  }

  /**
   * Error the stream
   */
  async error(error: Error, recoverable: boolean = false): Promise<void> {
    this.state.status = 'error';
    this.state.error = error;
    this.state.completedAt = new Date();
    this.stopHeartbeat();

    const event: StreamErrorEvent = {
      id: uuid(),
      type: 'stream:error',
      timestamp: new Date(),
      data: {
        streamId: this.id,
        error: {
          code: 'STREAM_ERROR',
          message: error.message,
          recoverable,
        },
        partialContent: this.state.buffer || undefined,
      },
    };

    await this.emit(event);
  }

  /**
   * Abort the stream
   */
  abort(): void {
    this.abortController.abort();
    this.state.status = 'error';
    this.stopHeartbeat();
  }

  /**
   * Pause the stream
   */
  pause(): void {
    this.state.status = 'paused';
  }

  /**
   * Resume the stream
   */
  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'streaming';
    }
  }

  /**
   * Get current state
   */
  getState(): StreamState {
    return { ...this.state };
  }

  /**
   * Get accumulated content
   */
  getContent(): string {
    return this.state.buffer;
  }

  // Private methods

  private async emit(event: StreamEvent): Promise<void> {
    const promises = Array.from(this.handlers).map(handler => {
      try {
        return Promise.resolve(handler(event));
      } catch (error) {
        console.error('Stream handler error:', error);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  private startHeartbeat(): void {
    if (this.config.heartbeatMs > 0) {
      this.heartbeatInterval = setInterval(() => {
        // Heartbeat is handled by SSE comment in the response
      }, this.config.heartbeatMs);
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }
}
