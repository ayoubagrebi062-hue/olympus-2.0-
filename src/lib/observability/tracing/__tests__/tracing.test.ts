import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initTracing,
  shutdownTracing,
  isTracingEnabled,
  withSpan,
  withSpanSync,
  startSpan,
  addSpanEvent,
  setSpanAttributes,
  getCurrentTraceId,
  getCurrentSpanId,
  traceBuild,
  tracePhase,
  traceAgent,
  traceProviderCall,
  traceCheckpoint,
  traceRetry,
  traceValidation,
  traceHandoff,
  traceSession,
  recordAgentTokens,
  recordProviderResponse,
  recordCircuitBreakerState,
  recordValidationFailure,
  recordBuildMetrics,
} from '../index';

describe('OpenTelemetry Tracing', () => {
  beforeEach(() => {
    // Initialize with no-op exporter for testing
    initTracing({
      enabled: true,
      exporter: 'none',
      samplingRatio: 1.0,
    });
  });

  afterEach(async () => {
    await shutdownTracing();
  });

  describe('Initialization', () => {
    it('should initialize tracing', () => {
      expect(isTracingEnabled()).toBe(true);
    });

    it('should handle double initialization gracefully', () => {
      // Should not throw
      initTracing({ enabled: true, exporter: 'none' });
      expect(isTracingEnabled()).toBe(true);
    });
  });

  describe('Basic Span Operations', () => {
    it('should create and complete an async span', async () => {
      const result = await withSpan('test-span', 'agent', async span => {
        expect(span).toBeDefined();
        return 'completed';
      });

      expect(result).toBe('completed');
    });

    it('should create and complete a sync span', () => {
      const result = withSpanSync('test-sync-span', 'agent', span => {
        expect(span).toBeDefined();
        return 42;
      });

      expect(result).toBe(42);
    });

    it('should propagate errors through spans', async () => {
      await expect(
        withSpan('error-span', 'agent', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });

    it('should propagate sync errors through spans', () => {
      expect(() =>
        withSpanSync('error-sync-span', 'agent', () => {
          throw new Error('Sync test error');
        })
      ).toThrow('Sync test error');
    });

    it('should start and end a span manually', () => {
      const span = startSpan('manual-span', 'tool');
      expect(span).toBeDefined();
      span.end();
    });
  });

  describe('Trace Context', () => {
    it('should propagate trace context through nested spans', async () => {
      let outerTraceId: string | undefined;
      let innerTraceId: string | undefined;

      await withSpan('outer', 'build', async () => {
        outerTraceId = getCurrentTraceId();

        await withSpan('inner', 'phase', async () => {
          innerTraceId = getCurrentTraceId();
        });
      });

      expect(outerTraceId).toBeDefined();
      expect(innerTraceId).toBe(outerTraceId); // Same trace
    });

    it('should have different span IDs for nested spans', async () => {
      let outerSpanId: string | undefined;
      let innerSpanId: string | undefined;

      await withSpan('outer', 'build', async () => {
        outerSpanId = getCurrentSpanId();

        await withSpan('inner', 'phase', async () => {
          innerSpanId = getCurrentSpanId();
        });
      });

      expect(outerSpanId).toBeDefined();
      expect(innerSpanId).toBeDefined();
      expect(innerSpanId).not.toBe(outerSpanId); // Different spans
    });
  });

  describe('Span Events and Attributes', () => {
    it('should add events to current span', async () => {
      await withSpan('event-span', 'agent', async () => {
        // Should not throw
        addSpanEvent('test.event', {
          key: 'value',
          count: 42,
        });
      });
    });

    it('should set attributes on current span', async () => {
      await withSpan('attribute-span', 'agent', async () => {
        // Should not throw
        setSpanAttributes({
          'olympus.agent.id': 'oracle',
          'olympus.agent.tier': 'opus',
        });
      });
    });
  });

  describe('OLYMPUS Tracers', () => {
    describe('traceBuild', () => {
      it('should trace a complete build', async () => {
        const result = await traceBuild(
          'build-123',
          'Test Build',
          'user-456',
          'professional',
          async span => {
            expect(span).toBeDefined();
            return { success: true, files: 10 };
          }
        );

        expect(result.success).toBe(true);
        expect(result.files).toBe(10);
      });

      it('should record build metrics', async () => {
        await traceBuild('build-123', 'Test', 'user', 'pro', async () => {
          recordBuildMetrics(5000, 10000, 0.5, 5);
        });
      });
    });

    describe('tracePhase', () => {
      it('should trace a phase within a build', async () => {
        await traceBuild('build-123', 'Test', 'user', 'pro', async () => {
          await tracePhase('discovery', 0, 5, 'build-123', async span => {
            expect(span).toBeDefined();
          });
        });
      });

      it('should trace multiple phases', async () => {
        const phases: string[] = [];

        await traceBuild('build-123', 'Test', 'user', 'pro', async () => {
          await tracePhase('discovery', 0, 3, 'build-123', async () => {
            phases.push('discovery');
          });
          await tracePhase('planning', 1, 3, 'build-123', async () => {
            phases.push('planning');
          });
          await tracePhase('execution', 2, 3, 'build-123', async () => {
            phases.push('execution');
          });
        });

        expect(phases).toEqual(['discovery', 'planning', 'execution']);
      });
    });

    describe('traceAgent', () => {
      it('should trace agent execution', async () => {
        await traceAgent('oracle', 'opus', 'build-123', [], async span => {
          expect(span).toBeDefined();
          recordAgentTokens(1000, 500, 0.05);
        });
      });

      it('should trace agent with dependencies', async () => {
        await traceAgent('archon', 'opus', 'build-123', ['oracle', 'requirements'], async () => {
          // Agent execution
        });
      });
    });

    describe('traceProviderCall', () => {
      it('should trace provider API call', async () => {
        const response = await traceProviderCall('anthropic', 'claude-sonnet', async span => {
          expect(span).toBeDefined();
          recordProviderResponse(1000, 500, 0.02, 1500);
          return { content: 'Hello from Claude' };
        });

        expect(response.content).toBe('Hello from Claude');
      });
    });

    describe('traceCheckpoint', () => {
      it('should trace checkpoint save', async () => {
        await traceCheckpoint('save', 'build-123', async () => {
          // Save checkpoint
        });
      });

      it('should trace checkpoint load', async () => {
        await traceCheckpoint('load', 'build-123', async () => {
          // Load checkpoint
          return { state: 'loaded' };
        });
      });

      it('should trace checkpoint verify', async () => {
        await traceCheckpoint('verify', 'build-123', async () => {
          // Verify checkpoint
          return true;
        });
      });
    });

    describe('traceRetry', () => {
      it('should trace retry attempts', async () => {
        let attempts = 0;

        const result = await traceRetry(1, 3, 'timeout', async () => {
          attempts++;
          return 'success';
        });

        expect(result).toBe('success');
        expect(attempts).toBe(1);
      });

      it('should record circuit breaker state', async () => {
        await withSpan('cb-test', 'agent', async () => {
          recordCircuitBreakerState('closed', 'openai-provider');
          recordCircuitBreakerState('open', 'openai-provider');
          recordCircuitBreakerState('half-open', 'openai-provider');
        });
      });
    });

    describe('traceValidation', () => {
      it('should trace validation', async () => {
        await traceValidation('input', 'BuildConfigSchema', async () => {
          // Validation logic
          return { valid: true };
        });
      });

      it('should record validation failure', async () => {
        await withSpan('validation-test', 'validation', async () => {
          recordValidationFailure('input', 'BuildConfigSchema', [
            'name is required',
            'tier must be valid',
          ]);
        });
      });
    });

    describe('traceHandoff', () => {
      it('should trace agent handoff', async () => {
        await traceHandoff('oracle', 'archon', 'build-123', async () => {
          // Handoff logic
          return { handedOff: true };
        });
      });
    });

    describe('traceSession', () => {
      it('should trace session operations', async () => {
        await traceSession('get', 'user-123', async () => {
          return { expertise: 'expert' };
        });

        await traceSession('learn', 'user-123', async () => {
          // Learning logic
        });

        await traceSession('predict', 'user-123', async () => {
          return { predictions: [] };
        });
      });
    });
  });

  describe('Nested Tracing (Full Build Flow)', () => {
    it('should create proper parent-child span hierarchy', async () => {
      const spans: string[] = [];

      await traceBuild('b1', 'Full Build', 'u1', 'pro', async () => {
        spans.push('build');

        await tracePhase('discovery', 0, 3, 'b1', async () => {
          spans.push('phase:discovery');

          await traceAgent('oracle', 'opus', 'b1', [], async () => {
            spans.push('agent:oracle');

            await traceProviderCall('anthropic', 'sonnet', async () => {
              spans.push('provider:anthropic');
              recordProviderResponse(1000, 500, 0.02, 1000);
            });
          });
        });

        await traceCheckpoint('save', 'b1', async () => {
          spans.push('checkpoint:save');
        });

        await tracePhase('planning', 1, 3, 'b1', async () => {
          spans.push('phase:planning');

          await traceAgent('archon', 'opus', 'b1', ['oracle'], async () => {
            spans.push('agent:archon');
            recordAgentTokens(2000, 1000, 0.08);
          });
        });
      });

      expect(spans).toEqual([
        'build',
        'phase:discovery',
        'agent:oracle',
        'provider:anthropic',
        'checkpoint:save',
        'phase:planning',
        'agent:archon',
      ]);
    });

    it('should handle errors in nested spans', async () => {
      await expect(
        traceBuild('b1', 'Error Build', 'u1', 'pro', async () => {
          await tracePhase('discovery', 0, 1, 'b1', async () => {
            await traceAgent('oracle', 'opus', 'b1', [], async () => {
              throw new Error('Agent failed');
            });
          });
        })
      ).rejects.toThrow('Agent failed');
    });
  });
});

describe('Tracing Disabled', () => {
  beforeEach(() => {
    initTracing({
      enabled: false,
    });
  });

  afterEach(async () => {
    await shutdownTracing();
  });

  it('should work when tracing is disabled', async () => {
    expect(isTracingEnabled()).toBe(false);

    // Should still execute functions, just without tracing
    const result = await traceBuild('b1', 'Test', 'u1', 'pro', async () => {
      return { success: true };
    });

    expect(result.success).toBe(true);
  });
});
