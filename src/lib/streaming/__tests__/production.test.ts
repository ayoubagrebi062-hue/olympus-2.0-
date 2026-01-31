/**
 * OLYMPUS 2.0 - Production Streaming Tests
 *
 * Comprehensive tests for enterprise streaming features.
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamController } from '../stream-controller';
import { BackpressureController, PriorityBackpressureController } from '../backpressure';
import { ReconnectionManager, EventBuffer } from '../reconnection';
import { StreamMultiplexer, createBuildMultiplexer } from '../multiplexer';
import { StreamMetricsCollector, getStreamMetrics, resetStreamMetrics } from '../metrics';
import { AdaptiveStreamConfig, NetworkQualityEstimator, ContentAwareChunker } from '../adaptive';
import { ChunkEvent, StreamCompleteEvent, StreamEvent } from '../types';

describe('Production Streaming', () => {
  describe('BackpressureController', () => {
    it('should pause when high water mark reached', () => {
      const controller = new BackpressureController({ highWaterMark: 5, lowWaterMark: 2 });
      const pauseHandler = vi.fn();
      controller.on('pause', pauseHandler);

      for (let i = 0; i < 6; i++) {
        controller.push({ id: i });
      }

      expect(pauseHandler).toHaveBeenCalled();
    });

    it('should resume when low water mark reached', () => {
      const controller = new BackpressureController({ highWaterMark: 5, lowWaterMark: 2 });
      const resumeHandler = vi.fn();
      controller.on('resume', resumeHandler);

      // Fill to high water mark
      for (let i = 0; i < 6; i++) {
        controller.push({ id: i });
      }

      // Drain to low water mark
      for (let i = 0; i < 4; i++) {
        controller.pull();
      }

      expect(resumeHandler).toHaveBeenCalled();
    });

    it('should drop oldest events when queue is full', () => {
      const controller = new BackpressureController({ maxQueueSize: 3 });
      const dropHandler = vi.fn();
      controller.on('drop', dropHandler);

      controller.push({ id: 1 });
      controller.push({ id: 2 });
      controller.push({ id: 3 });
      controller.push({ id: 4 }); // Should trigger drop

      expect(dropHandler).toHaveBeenCalledWith({ id: 1 });
    });

    it('should track consumption rate', async () => {
      const controller = new BackpressureController({ rateWindowMs: 100 });

      for (let i = 0; i < 10; i++) {
        controller.push({ id: i });
      }

      for (let i = 0; i < 5; i++) {
        controller.pull();
      }

      const rate = controller.getConsumptionRate();
      expect(rate).toBeGreaterThan(0);
    });
  });

  describe('PriorityBackpressureController', () => {
    it('should process priority events first', () => {
      const controller = new PriorityBackpressureController();

      controller.push({ id: 1, type: 'normal' });
      controller.push({ id: 2, type: 'normal' });
      controller.pushPriority({ id: 3, type: 'priority' });

      const first = controller.pull() as { id: number; type: string };
      expect(first.type).toBe('priority');
    });
  });

  describe('ReconnectionManager', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should track connection state', () => {
      const manager = new ReconnectionManager();

      expect(manager.getState()).toBe('disconnected');

      manager.connected();
      expect(manager.getState()).toBe('connected');
      expect(manager.isConnected()).toBe(true);
    });

    it('should schedule reconnection with exponential backoff', () => {
      const manager = new ReconnectionManager({
        initialDelayMs: 100,
        backoffMultiplier: 2,
        maxRetries: 3,
      });

      const reconnectHandler = vi.fn();
      manager.on('reconnect', reconnectHandler);

      manager.connected();
      manager.disconnected(new Error('Connection lost'));

      expect(manager.getState()).toBe('reconnecting');

      // First retry after ~100ms
      vi.advanceTimersByTime(150);
      expect(reconnectHandler).toHaveBeenCalledTimes(1);
    });

    it('should emit failed after max retries', () => {
      const manager = new ReconnectionManager({
        initialDelayMs: 10,
        maxRetries: 2,
        jitterFactor: 0,
      });

      const failedHandler = vi.fn();
      manager.on('failed', failedHandler);
      manager.on('reconnect', () => {
        // Simulate failed reconnection
        manager.disconnected(new Error('Still failing'));
      });

      manager.connected();
      manager.disconnected(new Error('Initial disconnect'));

      // First retry
      vi.advanceTimersByTime(20);
      // Second retry
      vi.advanceTimersByTime(40);
      // Should fail now
      vi.advanceTimersByTime(100);

      expect(failedHandler).toHaveBeenCalled();
      expect(manager.getState()).toBe('failed');
    });

    it('should track last event ID for replay', () => {
      const manager = new ReconnectionManager();

      manager.setLastEventId('event-123');
      expect(manager.getLastEventId()).toBe('event-123');
    });
  });

  describe('EventBuffer', () => {
    it('should buffer events for replay', () => {
      const buffer = new EventBuffer(100);

      const id1 = buffer.add({ type: 'stream:chunk', id: '1' } as StreamEvent);
      const id2 = buffer.add({ type: 'stream:chunk', id: '2' } as StreamEvent);
      buffer.add({ type: 'stream:chunk', id: '3' } as StreamEvent);

      const afterId1 = buffer.getAfter(id1);
      expect(afterId1.length).toBe(2);
    });

    it('should return all events if lastEventId not found', () => {
      const buffer = new EventBuffer(100);

      buffer.add({ type: 'stream:chunk' } as StreamEvent);
      buffer.add({ type: 'stream:chunk' } as StreamEvent);

      const events = buffer.getAfter('non-existent-id');
      expect(events.length).toBe(2);
    });

    it('should evict oldest when at capacity', () => {
      const buffer = new EventBuffer(3);

      buffer.add({ type: 'stream:chunk', data: { content: '1' } } as any);
      buffer.add({ type: 'stream:chunk', data: { content: '2' } } as any);
      buffer.add({ type: 'stream:chunk', data: { content: '3' } } as any);
      buffer.add({ type: 'stream:chunk', data: { content: '4' } } as any);

      expect(buffer.size()).toBe(3);
      const all = buffer.getAll();
      expect((all[0] as any).data.content).toBe('2');
    });
  });

  describe('StreamMultiplexer', () => {
    it('should combine multiple channels', async () => {
      const multiplexer = new StreamMultiplexer();
      const events: any[] = [];

      multiplexer.on('event', event => {
        events.push(event);
      });

      const oracle = multiplexer.addChannel({ id: 'oracle', name: 'Oracle', priority: 2 });
      const architect = multiplexer.addChannel({ id: 'architect', name: 'Architect', priority: 1 });

      await oracle.start();
      await oracle.pushChunk('Oracle output');

      await architect.start();
      await architect.pushChunk('Architect output');

      // Wait for events to propagate
      await new Promise(r => setTimeout(r, 10));

      expect(events.length).toBeGreaterThanOrEqual(4); // 2 starts + 2 chunks
      expect(events.some(e => e.channelId === 'oracle')).toBe(true);
      expect(events.some(e => e.channelId === 'architect')).toBe(true);

      multiplexer.close();
    });

    it('should track aggregate progress', async () => {
      const { multiplexer, channels } = createBuildMultiplexer('build-1', [
        { id: 'agent1', name: 'Agent 1' },
        { id: 'agent2', name: 'Agent 2' },
      ]);

      const agent1 = channels.get('agent1')!;
      const agent2 = channels.get('agent2')!;

      await agent1.start();
      await agent1.complete();

      const progress = multiplexer.getAggregateProgress();
      expect(progress.completedChannels).toBe(1);
      expect(progress.totalChannels).toBe(2);
      expect(progress.overallProgress).toBeGreaterThan(0);

      multiplexer.close();
    });

    it('should support broadcasting', async () => {
      const multiplexer = new StreamMultiplexer();
      const events: any[] = [];

      // Subscribe to flush events (what actually gets emitted after processing)
      multiplexer.on('flush', event => {
        events.push(event);
      });
      multiplexer.start();

      multiplexer.broadcast({
        type: 'build:start',
        data: { buildId: 'test', totalPhases: 1, totalAgents: 1 },
      });

      // Wait for flush interval to process
      await new Promise(r => setTimeout(r, 50));

      expect(events.some(e => e.channelId === '__broadcast__')).toBe(true);

      multiplexer.close();
    });
  });

  describe('StreamMetricsCollector', () => {
    beforeEach(() => {
      resetStreamMetrics();
    });

    it('should track stream lifecycle', () => {
      const metrics = getStreamMetrics();

      metrics.recordStreamStart('stream-1', { buildId: 'build-1' });
      metrics.recordEvent(
        'stream-1',
        { type: 'stream:chunk', data: { content: 'test' } } as any,
        10
      );
      metrics.recordStreamComplete('stream-1');

      const stats = metrics.getMetrics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.completedStreams).toBe(1);
    });

    it('should calculate latency percentiles', () => {
      const metrics = getStreamMetrics();
      metrics.recordStreamStart('stream-1');

      // Record events with varying latencies
      for (let i = 0; i < 100; i++) {
        metrics.recordEvent('stream-1', { type: 'stream:chunk' } as any, i);
      }

      const stats = metrics.getMetrics();
      expect(stats.p50LatencyMs).toBeGreaterThan(0);
      expect(stats.p95LatencyMs).toBeGreaterThan(stats.p50LatencyMs);
      expect(stats.p99LatencyMs).toBeGreaterThanOrEqual(stats.p95LatencyMs);
    });

    it('should track errors', () => {
      const metrics = getStreamMetrics();
      metrics.recordStreamStart('stream-1');
      metrics.recordError('stream-1', 'Test error');

      const stats = metrics.getMetrics();
      expect(stats.errorCount).toBe(1);
      expect(stats.lastError?.message).toBe('Test error');
      expect(stats.failedStreams).toBe(1);
    });
  });

  describe('AdaptiveStreamConfig', () => {
    it('should adapt chunk size based on latency', () => {
      const config = new AdaptiveStreamConfig({
        targetLatencyMs: 50,
        adaptationRate: 0.5,
      });

      const initial = config.getStreamConfig().chunkSize;

      // Fast network - should increase chunk size
      config.adapt({ latencyMs: 10, bytesTransferred: 1000, durationMs: 100 });
      const afterFast = config.getStreamConfig().chunkSize;
      expect(afterFast).toBeGreaterThan(initial);

      // Slow network - should decrease chunk size
      for (let i = 0; i < 5; i++) {
        config.adapt({ latencyMs: 200, bytesTransferred: 100, durationMs: 500 });
      }
      const afterSlow = config.getStreamConfig().chunkSize;
      expect(afterSlow).toBeLessThan(afterFast);
    });

    it('should estimate network quality', () => {
      const config = new AdaptiveStreamConfig();

      // Good network
      for (let i = 0; i < 10; i++) {
        config.adapt({ latencyMs: 20, bytesTransferred: 50000, durationMs: 10 });
      }

      const { score, conditions } = config.getNetworkQuality();
      expect(score).toBeGreaterThan(0.5);
      expect(conditions.bandwidth).toBeGreaterThan(0);
    });
  });

  describe('NetworkQualityEstimator', () => {
    it('should infer connection type from metrics', () => {
      const estimator = new NetworkQualityEstimator();

      // Simulate fast connection
      for (let i = 0; i < 10; i++) {
        estimator.recordRTT(5);
        estimator.recordBandwidth(15000000); // 15 MB/s
      }

      const conditions = estimator.estimate();
      expect(conditions.connectionType).toBe('ethernet');
    });

    it('should calculate quality score', () => {
      const estimator = new NetworkQualityEstimator();

      // Good connection
      for (let i = 0; i < 10; i++) {
        estimator.recordRTT(20);
        estimator.recordBandwidth(5000000);
      }

      const score = estimator.getQualityScore();
      expect(score).toBeGreaterThan(0.6);
    });
  });

  describe('ContentAwareChunker', () => {
    it('should chunk at natural break points', () => {
      const chunker = new ContentAwareChunker(5, 50);

      const chunks = chunker.addContent('Hello world. This is a test.');
      expect(chunks.length).toBeGreaterThan(0);

      // Should prefer breaking at sentence boundary
      const hasNaturalBreak = chunks.some(c => c.endsWith('. ') || c.endsWith('.'));
      expect(hasNaturalBreak || chunks.length === 1).toBe(true);
    });

    it('should flush remaining buffer', () => {
      const chunker = new ContentAwareChunker(10, 50);

      chunker.addContent('Short');
      const remaining = chunker.flush();

      expect(remaining).toBe('Short');
      expect(chunker.getBufferSize()).toBe(0);
    });

    it('should respect min and max chunk sizes', () => {
      const chunker = new ContentAwareChunker(5, 20);

      const chunks = chunker.addContent(
        'A very long sentence that should be split into multiple chunks based on size limits.'
      );

      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('Integration: End-to-End Streaming', () => {
    it('should handle complete build flow with multiplexing', async () => {
      const { multiplexer, channels } = createBuildMultiplexer('integration-test', [
        { id: 'oracle', name: 'Oracle', priority: 2 },
        { id: 'frontend', name: 'Frontend', priority: 1 },
      ]);

      const metrics = new StreamMetricsCollector();
      const receivedEvents: any[] = [];

      multiplexer.on('event', event => {
        receivedEvents.push(event);
        metrics.recordEvent(event.channelId, event);
      });

      multiplexer.start();

      // Simulate oracle streaming
      const oracle = channels.get('oracle')!;
      metrics.recordStreamStart('oracle');
      await oracle.start();
      await oracle.pushChunk('// Oracle analysis\n');
      await oracle.pushChunk('const config = {...};\n');
      await oracle.complete();
      metrics.recordStreamComplete('oracle');

      // Simulate frontend streaming
      const frontend = channels.get('frontend')!;
      metrics.recordStreamStart('frontend');
      await frontend.start();
      await frontend.pushChunk('export function Component() {}\n');
      await frontend.complete();
      metrics.recordStreamComplete('frontend');

      // Wait for all events
      await new Promise(r => setTimeout(r, 50));

      // Verify events
      expect(receivedEvents.length).toBeGreaterThan(0);
      expect(receivedEvents.some(e => e.channelId === 'oracle')).toBe(true);
      expect(receivedEvents.some(e => e.channelId === 'frontend')).toBe(true);

      // Verify metrics
      const stats = metrics.getMetrics();
      expect(stats.completedStreams).toBe(2);
      expect(stats.totalEvents).toBeGreaterThan(0);

      // Verify progress
      const progress = multiplexer.getAggregateProgress();
      expect(progress.completedChannels).toBe(2);
      expect(progress.overallProgress).toBe(100);

      multiplexer.close();
    });

    it('should handle reconnection with event replay', async () => {
      const buffer = new EventBuffer(100);
      const reconnectionManager = new ReconnectionManager({ maxRetries: 3 });

      // Simulate initial connection
      reconnectionManager.connected();

      // Simulate events being buffered
      const event1Id = buffer.add({
        type: 'stream:chunk',
        id: '1',
        timestamp: new Date(),
        data: { content: 'A' },
      } as any);
      const event2Id = buffer.add({
        type: 'stream:chunk',
        id: '2',
        timestamp: new Date(),
        data: { content: 'B' },
      } as any);
      buffer.add({
        type: 'stream:chunk',
        id: '3',
        timestamp: new Date(),
        data: { content: 'C' },
      } as any);

      // Simulate client received up to event1
      reconnectionManager.setLastEventId(event1Id);

      // Simulate disconnect
      reconnectionManager.disconnected(new Error('Network error'));

      // On reconnection, get missed events
      const missedEvents = buffer.getAfter(reconnectionManager.getLastEventId()!);

      expect(missedEvents.length).toBe(2); // Events 2 and 3
      expect((missedEvents[0] as any).data.content).toBe('B');
      expect((missedEvents[1] as any).data.content).toBe('C');

      reconnectionManager.cancel();
    });
  });
});
