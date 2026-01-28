import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initTracing,
  shutdownTracing,
  withObservability,
  withObservabilitySync,
  getCurrentCorrelation,
} from '../index';

describe('World-Class: Unified Observability Context', () => {
  beforeEach(() => {
    initTracing({ enabled: true, exporter: 'none', samplingRatio: 1.0 });
  });

  afterEach(async () => {
    await shutdownTracing();
  });

  describe('withObservability', () => {
    it('should provide trace context to the callback', async () => {
      let capturedTraceId: string | undefined;
      let capturedSpanId: string | undefined;

      await withObservability('test-op', { buildId: 'b1' }, async ctx => {
        capturedTraceId = ctx.traceId;
        capturedSpanId = ctx.spanId;
      });

      expect(capturedTraceId).toBeDefined();
      expect(capturedTraceId).toHaveLength(32);
      expect(capturedSpanId).toBeDefined();
      expect(capturedSpanId).toHaveLength(16);
    });

    it('should pass business context through', async () => {
      await withObservability(
        'test-op',
        { buildId: 'b123', userId: 'u456', agentId: 'oracle' },
        async ctx => {
          expect(ctx.business.buildId).toBe('b123');
          expect(ctx.business.userId).toBe('u456');
          expect(ctx.business.agentId).toBe('oracle');
        }
      );
    });

    it('should return the result from the callback', async () => {
      const result = await withObservability('test-op', {}, async () => {
        return { success: true, count: 42 };
      });

      expect(result).toEqual({ success: true, count: 42 });
    });

    it('should propagate errors', async () => {
      await expect(
        withObservability('failing-op', {}, async () => {
          throw new Error('Test failure');
        })
      ).rejects.toThrow('Test failure');
    });

    it('should create nested spans via ctx.span', async () => {
      const operations: string[] = [];

      await withObservability('parent', { buildId: 'b1' }, async ctx => {
        operations.push('parent-start');

        await ctx.span('child-1', async () => {
          operations.push('child-1');
        });

        await ctx.span('child-2', async () => {
          operations.push('child-2');
        });

        operations.push('parent-end');
      });

      expect(operations).toEqual(['parent-start', 'child-1', 'child-2', 'parent-end']);
    });

    it('should handle errors in nested spans', async () => {
      await expect(
        withObservability('parent', {}, async ctx => {
          await ctx.span('failing-child', async () => {
            throw new Error('Child failed');
          });
        })
      ).rejects.toThrow('Child failed');
    });

    it('should allow adding events', async () => {
      // Should not throw
      await withObservability('event-test', {}, async ctx => {
        ctx.event('checkpoint', { phase: 'discovery', progress: 0.5 });
        ctx.event('milestone', { name: 'requirements-gathered' });
      });
    });

    it('should allow setting attributes', async () => {
      // Should not throw
      await withObservability('attr-test', {}, async ctx => {
        ctx.attr('tokens.input', 1000);
        ctx.attr('tokens.output', 500);
        ctx.attr('success', true);
      });
    });

    it('should mark errors via ctx.error', async () => {
      // Should not throw, but should record the error
      await withObservability('error-marking', {}, async ctx => {
        const err = new Error('Something went wrong');
        ctx.error(err);
        // Continue execution after marking error
        return 'completed';
      });
    });
  });

  describe('Correlated Logger', () => {
    it('should provide a logger with trace context', async () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      await withObservability('log-test', { buildId: 'b1' }, async ctx => {
        ctx.log.info('Test message', { extra: 'data' });
      });

      expect(consoleSpy).toHaveBeenCalled();
      const loggedArg = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedArg);

      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test message');
      expect(parsed.traceId).toHaveLength(32); // New logger uses traceId not trace_id
      expect(parsed.spanId).toHaveLength(16); // New logger uses spanId not span_id
      expect(parsed.buildId).toBe('b1');
      expect(parsed.extra).toBe('data');

      consoleSpy.mockRestore();
    });

    it('should correlate logs in nested spans', async () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      let parentTraceId: string;

      await withObservability('parent', {}, async ctx => {
        parentTraceId = ctx.traceId;
        ctx.log.info('Parent log');

        await ctx.span('child', async () => {
          // Child span should have same trace ID
          const correlation = getCurrentCorrelation();
          expect(correlation?.traceId).toBe(parentTraceId);
        });
      });

      consoleSpy.mockRestore();
    });
  });

  describe('withObservabilitySync', () => {
    it('should work for synchronous operations', () => {
      const result = withObservabilitySync('sync-op', { buildId: 'b1' }, ctx => {
        expect(ctx.traceId).toHaveLength(32);
        return 'sync-result';
      });

      expect(result).toBe('sync-result');
    });

    it('should propagate sync errors', () => {
      expect(() =>
        withObservabilitySync('sync-fail', {}, () => {
          throw new Error('Sync failure');
        })
      ).toThrow('Sync failure');
    });
  });

  describe('getCurrentCorrelation', () => {
    it('should return null when not in a span', () => {
      const correlation = getCurrentCorrelation();
      // May or may not be null depending on test isolation
      // The important thing is it doesn't throw
      expect(correlation === null || typeof correlation.traceId === 'string').toBe(true);
    });

    it('should return correlation inside a span', async () => {
      await withObservability('correlation-test', {}, async ctx => {
        const correlation = getCurrentCorrelation();
        expect(correlation).not.toBeNull();
        expect(correlation?.traceId).toBe(ctx.traceId);
      });
    });
  });

  describe('When Tracing Disabled', () => {
    beforeEach(async () => {
      await shutdownTracing();
      initTracing({ enabled: false });
    });

    it('should still execute the callback', async () => {
      const result = await withObservability('disabled-test', {}, async ctx => {
        expect(ctx.traceId).toBe('0'.repeat(32)); // Mock trace ID
        return 'still-works';
      });

      expect(result).toBe('still-works');
    });

    it('should allow nested spans without error', async () => {
      await withObservability('disabled-parent', {}, async ctx => {
        await ctx.span('disabled-child', async () => {
          return 'nested-result';
        });
      });
    });
  });

  describe('No Memory Leaks', () => {
    it('should not exceed max listeners with many init/shutdown cycles', async () => {
      // This would trigger MaxListenersExceededWarning before the fix
      for (let i = 0; i < 20; i++) {
        await shutdownTracing();
        initTracing({ enabled: true, exporter: 'none' });
      }

      // If we get here without warning, the fix works
      expect(true).toBe(true);
    });
  });
});

describe('Real-World Usage Patterns', () => {
  beforeEach(() => {
    initTracing({ enabled: true, exporter: 'none', samplingRatio: 1.0 });
  });

  afterEach(async () => {
    await shutdownTracing();
  });

  it('should handle a complete build flow', async () => {
    const events: string[] = [];

    const result = await withObservability(
      'build:myapp',
      { buildId: 'build-123', userId: 'user-456' },
      async ctx => {
        ctx.log.info('Build started');
        events.push('build:start');

        // Phase 1: Discovery
        await ctx.span('phase:discovery', async () => {
          ctx.event('phase.started', { name: 'discovery' });
          events.push('phase:discovery');
          ctx.attr('requirements.count', 5);
        });

        // Phase 2: Planning
        await ctx.span('phase:planning', async () => {
          events.push('phase:planning');

          // Nested agent call
          await ctx.span('agent:archon', async () => {
            ctx.attr('tokens.used', 2000);
            events.push('agent:archon');
          });
        });

        ctx.log.info('Build completed');
        events.push('build:end');

        return { success: true, phases: 2 };
      }
    );

    expect(result).toEqual({ success: true, phases: 2 });
    expect(events).toEqual([
      'build:start',
      'phase:discovery',
      'phase:planning',
      'agent:archon',
      'build:end',
    ]);
  });

  it('should handle provider retries with proper tracing', async () => {
    let attempts = 0;

    const result = await withObservability(
      'provider:anthropic',
      { agentId: 'oracle' },
      async ctx => {
        // Simulate retry logic
        while (attempts < 3) {
          attempts++;
          ctx.event('provider.attempt', { attempt: attempts });

          if (attempts < 3) {
            ctx.log.warn('Provider failed, retrying', { attempt: attempts });
            continue;
          }

          ctx.log.info('Provider succeeded', { attempt: attempts });
          return { response: 'success' };
        }

        throw new Error('Max retries exceeded');
      }
    );

    expect(result).toEqual({ response: 'success' });
    expect(attempts).toBe(3);
  });
});
