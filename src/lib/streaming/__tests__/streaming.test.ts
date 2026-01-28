import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamController } from '../stream-controller';
import { SSEEncoder, SSEDecoder } from '../sse-encoder';
import { ChunkEvent, StreamCompleteEvent, StreamErrorEvent, StreamEvent, StreamStartEvent, TokenEvent } from '../types';

describe('Streaming System', () => {
  describe('StreamController', () => {
    it('should emit start event', async () => {
      const controller = new StreamController();
      const events: StreamEvent[] = [];

      controller.subscribe(event => { events.push(event); });

      await controller.start({ agentId: 'oracle', buildId: 'build-123' });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('stream:start');
      expect((events[0] as StreamStartEvent).data.agentId).toBe('oracle');
    });

    it('should emit chunk events', async () => {
      const controller = new StreamController();
      const events: StreamEvent[] = [];

      controller.subscribe(event => { events.push(event); });

      await controller.start();
      await controller.pushChunk('Hello ');
      await controller.pushChunk('World');

      expect(events.filter(e => e.type === 'stream:chunk').length).toBe(2);
    });

    it('should buffer tokens and emit as chunks', async () => {
      const controller = new StreamController({ chunkSize: 5 });
      const events: StreamEvent[] = [];

      controller.subscribe(event => { events.push(event); });

      await controller.start();

      // Push 7 tokens (should emit 1 chunk of 5, leave 2 in buffer)
      for (const char of 'Hello W') {
        await controller.pushToken(char);
      }

      const chunks = events.filter(e => e.type === 'stream:chunk') as ChunkEvent[];
      expect(chunks.length).toBe(1);
      expect(chunks[0].data.content).toBe('Hello');
    });

    it('should emit complete event with full content', async () => {
      const controller = new StreamController();
      let completeEvent: StreamCompleteEvent | null = null;

      controller.subscribe(event => {
        if (event.type === 'stream:complete') {
          completeEvent = event as StreamCompleteEvent;
        }
      });

      await controller.start();
      await controller.pushChunk('Hello World');
      await controller.complete();

      expect(completeEvent).not.toBeNull();
      expect(completeEvent!.data.content).toBe('Hello World');
    });

    it('should emit error event', async () => {
      const controller = new StreamController();
      let errorEvent: StreamErrorEvent | null = null;

      controller.subscribe(event => {
        if (event.type === 'stream:error') {
          errorEvent = event as StreamErrorEvent;
        }
      });

      await controller.start();
      await controller.pushChunk('Partial');
      await controller.error(new Error('Test error'), true);

      expect(errorEvent).not.toBeNull();
      expect(errorEvent!.data.error.message).toBe('Test error');
      expect(errorEvent!.data.error.recoverable).toBe(true);
      expect(errorEvent!.data.partialContent).toBe('Partial');
    });

    it('should support abort', async () => {
      const controller = new StreamController();

      await controller.start();
      controller.abort();

      expect(controller.getState().status).toBe('error');
      expect(controller.getSignal().aborted).toBe(true);
    });

    it('should track state correctly', async () => {
      const controller = new StreamController();

      expect(controller.getState().status).toBe('pending');

      await controller.start();
      expect(controller.getState().status).toBe('streaming');

      await controller.complete();
      expect(controller.getState().status).toBe('complete');
    });

    it('should support pause and resume', async () => {
      const controller = new StreamController();

      await controller.start();
      expect(controller.getState().status).toBe('streaming');

      controller.pause();
      expect(controller.getState().status).toBe('paused');

      controller.resume();
      expect(controller.getState().status).toBe('streaming');
    });

    it('should emit token-level events when configured', async () => {
      const controller = new StreamController({ tokenLevel: true, chunkSize: 100 });
      const tokenEvents: TokenEvent[] = [];

      controller.subscribe(event => {
        if (event.type === 'stream:token') {
          tokenEvents.push(event as TokenEvent);
        }
      });

      await controller.start();
      await controller.pushToken('H');
      await controller.pushToken('i');

      expect(tokenEvents.length).toBe(2);
      expect(tokenEvents[0].data.token).toBe('H');
      expect(tokenEvents[0].data.index).toBe(0);
      expect(tokenEvents[1].data.token).toBe('i');
      expect(tokenEvents[1].data.index).toBe(1);
    });

    it('should throw when pushing to non-streaming state', async () => {
      const controller = new StreamController();

      // Not started yet
      await expect(controller.pushChunk('test')).rejects.toThrow('Cannot push to stream in pending state');

      await controller.start();
      await controller.complete();

      // Already completed
      await expect(controller.pushChunk('test')).rejects.toThrow('Cannot push to stream in complete state');
    });
  });

  describe('SSE Encoder/Decoder', () => {
    it('should encode events correctly', () => {
      const encoder = new SSEEncoder();

      const event: ChunkEvent = {
        id: 'test-123',
        type: 'stream:chunk',
        timestamp: new Date('2024-01-01'),
        data: { content: 'Hello', isPartial: true },
      };

      const encoded = encoder.encode(event);
      const text = new TextDecoder().decode(encoded);

      expect(text).toContain('event: stream:chunk');
      expect(text).toContain('id: test-123');
      expect(text).toContain('data: {');
    });

    it('should encode comments', () => {
      const encoder = new SSEEncoder();
      const encoded = encoder.encodeComment('keepalive');
      const text = new TextDecoder().decode(encoded);

      expect(text).toBe(': keepalive\n\n');
    });

    it('should encode retry directive', () => {
      const encoder = new SSEEncoder();
      const encoded = encoder.encodeRetry(5000);
      const text = new TextDecoder().decode(encoded);

      expect(text).toBe('retry: 5000\n\n');
    });

    it('should decode events correctly', () => {
      const decoder = new SSEDecoder();

      const raw = `event: stream:chunk
id: test-123
data: {"type":"stream:chunk","timestamp":"2024-01-01T00:00:00.000Z","data":{"content":"Hello"}}

`;

      const events = decoder.decode(raw);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('stream:chunk');
    });

    it('should handle partial chunks', () => {
      const decoder = new SSEDecoder();

      // First partial chunk
      let events = decoder.decode('event: stream:chunk\nid: 1\n');
      expect(events.length).toBe(0);

      // Complete the event
      events = decoder.decode('data: {"type":"stream:chunk","timestamp":"2024-01-01T00:00:00.000Z"}\n\n');
      expect(events.length).toBe(1);
    });

    it('should reset state correctly', () => {
      const decoder = new SSEDecoder();

      // Add partial data
      decoder.decode('event: stream:chunk\n');

      // Reset
      decoder.reset();

      // Should start fresh
      const events = decoder.decode('event: stream:chunk\nid: 1\ndata: {"type":"stream:chunk","timestamp":"2024-01-01T00:00:00.000Z"}\n\n');
      expect(events.length).toBe(1);
    });

    it('should provide correct SSE headers', () => {
      const headers = SSEEncoder.getHeaders() as Record<string, string>;

      expect(headers['Content-Type']).toBe('text/event-stream');
      expect(headers['Cache-Control']).toBe('no-cache, no-transform');
      expect(headers['Connection']).toBe('keep-alive');
      expect(headers['X-Accel-Buffering']).toBe('no');
    });
  });

  describe('Integration', () => {
    it('should work end-to-end', async () => {
      const encoder = new SSEEncoder();
      const decoder = new SSEDecoder();
      const controller = new StreamController();

      const receivedChunks: string[] = [];

      // Simulate server sending events
      controller.subscribe(event => {
        const encoded = encoder.encode(event);
        const text = new TextDecoder().decode(encoded);
        const decoded = decoder.decode(text);

        for (const e of decoded) {
          if (e.type === 'stream:chunk') {
            receivedChunks.push((e as ChunkEvent).data.content);
          }
        }
      });

      await controller.start();
      await controller.pushChunk('Hello ');
      await controller.pushChunk('World');
      await controller.complete();

      expect(receivedChunks).toEqual(['Hello ', 'World']);
    });

    it('should handle multiple subscribers', async () => {
      const controller = new StreamController();
      const events1: StreamEvent[] = [];
      const events2: StreamEvent[] = [];

      controller.subscribe(event => { events1.push(event); });
      controller.subscribe(event => { events2.push(event); });

      await controller.start();
      await controller.pushChunk('Test');
      await controller.complete();

      expect(events1.length).toBe(3); // start, chunk, complete
      expect(events2.length).toBe(3);
    });

    it('should allow unsubscribe', async () => {
      const controller = new StreamController();
      const events: StreamEvent[] = [];

      const unsubscribe = controller.subscribe(event => { events.push(event); });

      await controller.start();
      unsubscribe();
      await controller.pushChunk('Test');
      await controller.complete();

      expect(events.length).toBe(1); // Only start event
    });

    it('should calculate duration correctly', async () => {
      const controller = new StreamController();
      let completeEvent: StreamCompleteEvent | null = null;

      controller.subscribe(event => {
        if (event.type === 'stream:complete') {
          completeEvent = event as StreamCompleteEvent;
        }
      });

      await controller.start();
      await new Promise(resolve => setTimeout(resolve, 50)); // Wait 50ms
      await controller.complete();

      expect(completeEvent).not.toBeNull();
      expect(completeEvent!.data.durationMs).toBeGreaterThanOrEqual(50);
    });
  });
});
