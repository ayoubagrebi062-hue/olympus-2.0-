/**
 * OLYMPUS 2.0 - Stream Multiplexer
 *
 * Combines multiple agent streams into a single SSE connection.
 * Reduces connection overhead and enables coordinated streaming.
 */

import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import { StreamEvent, StreamEventType, AgentProgressEvent, AgentCompleteEvent, BuildProgressEvent } from './types';
import { StreamController } from './stream-controller';
import { PriorityBackpressureController } from './backpressure';
import { SSEEncoder } from './sse-encoder';

export interface MultiplexedEvent extends StreamEvent {
  /** Source stream/channel ID */
  channelId: string;
  /** Channel name (e.g., agent name) */
  channelName?: string;
}

export interface ChannelConfig {
  /** Channel ID */
  id: string;
  /** Channel name */
  name: string;
  /** Priority (higher = more important) */
  priority: number;
  /** Maximum events per second for this channel */
  maxEventsPerSecond?: number;
}

export interface MultiplexerMetrics {
  activeChannels: number;
  totalEvents: number;
  eventsByChannel: Record<string, number>;
  eventsPerSecond: number;
  backpressureActive: boolean;
}

/**
 * Stream multiplexer for combining multiple streams
 */
export class StreamMultiplexer extends EventEmitter {
  private id: string;
  private channels: Map<string, {
    config: ChannelConfig;
    controller: StreamController;
    eventCount: number;
    lastEventTime: number;
  }> = new Map();
  private backpressure: PriorityBackpressureController;
  private encoder: SSEEncoder;
  private totalEvents: number = 0;
  private eventTimestamps: number[] = [];
  private isRunning: boolean = false;
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    this.id = uuid();
    this.backpressure = new PriorityBackpressureController();
    this.encoder = new SSEEncoder();

    // Forward backpressure events
    this.backpressure.on('pause', () => this.emit('backpressure:pause'));
    this.backpressure.on('resume', () => this.emit('backpressure:resume'));
    this.backpressure.on('drop', (event) => this.emit('backpressure:drop', event));
  }

  /**
   * Get multiplexer ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Add a channel to the multiplexer
   */
  addChannel(config: ChannelConfig): StreamController {
    const controller = new StreamController();

    this.channels.set(config.id, {
      config,
      controller,
      eventCount: 0,
      lastEventTime: 0,
    });

    // Subscribe to channel events
    controller.subscribe((event) => {
      this.handleChannelEvent(config.id, event);
    });

    this.emit('channel:add', config);
    return controller;
  }

  /**
   * Remove a channel
   */
  removeChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    this.channels.delete(channelId);
    this.emit('channel:remove', channel.config);
    return true;
  }

  /**
   * Get a channel's controller
   */
  getChannel(channelId: string): StreamController | undefined {
    return this.channels.get(channelId)?.controller;
  }

  /**
   * Handle event from a channel
   */
  private handleChannelEvent(channelId: string, event: StreamEvent): void {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    // Rate limiting per channel
    if (channel.config.maxEventsPerSecond) {
      const now = Date.now();
      const timeSinceLastEvent = now - channel.lastEventTime;
      const minInterval = 1000 / channel.config.maxEventsPerSecond;

      if (timeSinceLastEvent < minInterval) {
        // Skip this event (rate limited)
        return;
      }
    }

    channel.eventCount++;
    channel.lastEventTime = Date.now();
    this.totalEvents++;
    this.eventTimestamps.push(Date.now());

    // Create multiplexed event
    const multiplexedEvent: MultiplexedEvent = {
      ...event,
      channelId,
      channelName: channel.config.name,
    };

    // Priority events bypass backpressure
    const isPriority = this.isPriorityEvent(event);
    if (isPriority) {
      this.backpressure.pushPriority(multiplexedEvent);
    } else {
      this.backpressure.push(multiplexedEvent);
    }

    this.emit('event', multiplexedEvent);
  }

  /**
   * Check if event is high priority
   */
  private isPriorityEvent(event: StreamEvent): boolean {
    return event.type === 'stream:error' ||
           event.type === 'stream:complete' ||
           event.type === 'agent:error' ||
           event.type === 'agent:complete' ||
           event.type === 'build:complete' ||
           event.type === 'build:error';
  }

  /**
   * Start the multiplexer (begins event flushing)
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Start flush loop
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 10); // 100 events per second max

    this.emit('start');
  }

  /**
   * Stop the multiplexer
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.emit('stop');
  }

  /**
   * Flush pending events
   */
  private flush(): void {
    while (this.backpressure.hasEvents()) {
      const event = this.backpressure.pull() as MultiplexedEvent | null;
      if (event) {
        this.emit('flush', event);
      }
    }
  }

  /**
   * Create a readable stream for SSE output
   */
  createReadableStream(): ReadableStream<Uint8Array> {
    const encoder = this.encoder;
    const self = this;

    return new ReadableStream({
      start(controller) {
        self.start();

        const handleFlush = (event: MultiplexedEvent) => {
          const encoded = encoder.encode(event);
          controller.enqueue(encoded);
        };

        const handleStop = () => {
          controller.close();
        };

        self.on('flush', handleFlush);
        self.on('stop', handleStop);
      },
      cancel() {
        self.stop();
      }
    });
  }

  /**
   * Get aggregate build progress across all channels
   */
  getAggregateProgress(): {
    overallProgress: number;
    channelProgress: Record<string, number>;
    completedChannels: number;
    totalChannels: number;
  } {
    const channelProgress: Record<string, number> = {};
    let totalProgress = 0;
    let completedChannels = 0;

    for (const [id, channel] of this.channels) {
      const state = channel.controller.getState();
      let progress = 0;

      if (state.status === 'complete') {
        progress = 100;
        completedChannels++;
      } else if (state.status === 'streaming') {
        // Estimate based on tokens (rough approximation)
        progress = Math.min(state.tokensStreamed / 10, 99);
      }

      channelProgress[id] = progress;
      totalProgress += progress;
    }

    const overallProgress = this.channels.size > 0
      ? totalProgress / this.channels.size
      : 0;

    return {
      overallProgress,
      channelProgress,
      completedChannels,
      totalChannels: this.channels.size,
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): MultiplexerMetrics {
    // Calculate events per second
    const now = Date.now();
    this.eventTimestamps = this.eventTimestamps.filter(t => now - t < 1000);

    const eventsByChannel: Record<string, number> = {};
    for (const [id, channel] of this.channels) {
      eventsByChannel[id] = channel.eventCount;
    }

    return {
      activeChannels: this.channels.size,
      totalEvents: this.totalEvents,
      eventsByChannel,
      eventsPerSecond: this.eventTimestamps.length,
      backpressureActive: this.backpressure.getMetrics().isPaused,
    };
  }

  /**
   * Broadcast an event to all subscribers
   */
  broadcast(event: Omit<StreamEvent, 'id' | 'timestamp'>): void {
    const fullEvent: StreamEvent = {
      ...event,
      id: uuid(),
      timestamp: new Date(),
    } as StreamEvent;

    this.backpressure.pushPriority({
      ...fullEvent,
      channelId: '__broadcast__',
      channelName: 'System',
    });
  }

  /**
   * Close all channels and cleanup
   */
  close(): void {
    this.stop();

    for (const [id, channel] of this.channels) {
      channel.controller.abort();
    }

    this.channels.clear();
    this.backpressure.clear();
    this.emit('close');
  }
}

/**
 * Create a multiplexed stream for a build with multiple agents
 */
export function createBuildMultiplexer(
  buildId: string,
  agents: Array<{ id: string; name: string; priority?: number }>
): {
  multiplexer: StreamMultiplexer;
  channels: Map<string, StreamController>;
} {
  const multiplexer = new StreamMultiplexer();
  const channels = new Map<string, StreamController>();

  for (const agent of agents) {
    const controller = multiplexer.addChannel({
      id: agent.id,
      name: agent.name,
      priority: agent.priority ?? 1,
    });
    channels.set(agent.id, controller);
  }

  return { multiplexer, channels };
}
