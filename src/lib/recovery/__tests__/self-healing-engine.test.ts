/**
 * SELF-HEALING ENGINE - Comprehensive Unit Tests
 * ===============================================
 * Tests for automatic failure recovery without human intervention.
 * Target: 80%+ coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SelfHealingEngine,
  createSelfHealingEngine,
  selfHealingEngine,
  withRecovery,
  checkpoint,
  isHealthy,
  type RecoveryContext,
  type RecoveryStrategy,
  type FailureType,
  type HealthCheck,
  type StateCheckpoint,
} from '../self-healing-engine';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('SelfHealingEngine', () => {
  let engine: SelfHealingEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = createSelfHealingEngine();
  });

  afterEach(() => {
    engine.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('initialization', () => {
    it('should create instance with default strategies', () => {
      expect(engine).toBeDefined();
    });

    it('should have default configuration', () => {
      // Engine should have auto-recovery enabled by default
      expect(engine.getHealth()).toBe(1);
    });

    it('should create singleton via selfHealingEngine', () => {
      expect(selfHealingEngine).toBeDefined();
      expect(selfHealingEngine).toBeInstanceOf(SelfHealingEngine);
    });

    it('should create new instance via factory', () => {
      const engine1 = createSelfHealingEngine();
      const engine2 = createSelfHealingEngine();
      expect(engine1).not.toBe(engine2);
      engine1.dispose();
      engine2.dispose();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FAILURE CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('failure classification', () => {
    it('should classify transient failures', async () => {
      const context = await engine.initiateRecovery({
        failedComponent: 'api',
        failedOperation: 'fetch',
        error: { type: 'NetworkError', message: 'ECONNRESET' },
      });
      expect(context.failureType).toBe('transient');
    });

    it('should classify rate limit failures', async () => {
      const context = await engine.initiateRecovery({
        failedComponent: 'api',
        failedOperation: 'call',
        error: { type: 'Error', message: 'Rate limit exceeded', code: 429 },
      });
      expect(context.failureType).toBe('rate_limit');
    });

    it('should classify timeout failures', async () => {
      const context = await engine.initiateRecovery({
        failedComponent: 'agent',
        failedOperation: 'execute',
        error: { type: 'Error', message: 'Operation timed out' },
      });
      expect(context.failureType).toBe('timeout');
    });

    it('should classify validation failures', async () => {
      const context = await engine.initiateRecovery({
        failedComponent: 'validator',
        failedOperation: 'validate',
        error: { type: 'ValidationError', message: 'Schema validation failed' },
      });
      expect(context.failureType).toBe('validation');
    });

    it('should classify resource exhaustion', async () => {
      const context = await engine.initiateRecovery({
        failedComponent: 'llm',
        failedOperation: 'generate',
        error: { type: 'Error', message: 'Token limit exceeded' },
      });
      expect(context.failureType).toBe('resource');
    });

    it('should classify dependency failures', async () => {
      const context = await engine.initiateRecovery({
        failedComponent: 'api',
        failedOperation: 'call',
        error: { type: 'Error', message: 'Service unavailable', code: 503 },
      });
      expect(context.failureType).toBe('dependency');
    });

    it('should classify corruption failures', async () => {
      const context = await engine.initiateRecovery({
        failedComponent: 'state',
        failedOperation: 'load',
        error: { type: 'Error', message: 'Invalid state detected, data corrupted' },
      });
      expect(context.failureType).toBe('corruption');
    });

    it('should default to unknown for unclassified errors', async () => {
      const context = await engine.initiateRecovery({
        failedComponent: 'unknown',
        failedOperation: 'something',
        error: { type: 'Error', message: 'Something weird happened' },
      });
      expect(context.failureType).toBe('unknown');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOVERY INITIATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('recovery initiation', () => {
    it('should create recovery context with all fields', async () => {
      const context = await engine.initiateRecovery({
        failedComponent: 'test-component',
        failedOperation: 'test-operation',
        error: { type: 'TestError', message: 'Test message', code: 500 },
        stateSnapshot: { foo: 'bar' },
        inputData: { input: true },
        outputSoFar: { partial: 'output' },
        buildId: 'build-123',
        agentId: 'agent-456',
        userId: 'user-789',
      });

      expect(context.id).toMatch(/^recovery-\d+/);
      expect(context.timestamp).toBeLessThanOrEqual(Date.now());
      expect(context.failedComponent).toBe('test-component');
      expect(context.failedOperation).toBe('test-operation');
      expect(context.error.type).toBe('TestError');
      expect(context.error.message).toBe('Test message');
      expect(context.error.code).toBe(500);
      expect(context.stateSnapshot).toEqual({ foo: 'bar' });
      expect(context.inputData).toEqual({ input: true });
      expect(context.outputSoFar).toEqual({ partial: 'output' });
      expect(context.buildId).toBe('build-123');
      expect(context.agentId).toBe('agent-456');
      expect(context.userId).toBe('user-789');
    });

    it('should emit recovery_started event', async () => {
      const startHandler = vi.fn();
      engine.on('recovery_started', startHandler);

      await engine.initiateRecovery({
        failedComponent: 'test',
        failedOperation: 'op',
        error: { type: 'Error', message: 'test' },
      });

      expect(startHandler).toHaveBeenCalled();
    });

    it('should auto-recover when enabled', async () => {
      engine.configure({ autoRecoveryEnabled: true });

      const context = await engine.initiateRecovery({
        failedComponent: 'api',
        failedOperation: 'fetch',
        error: { type: 'NetworkError', message: 'ECONNRESET' },
      });

      // Wait for recovery to complete
      await vi.runAllTimersAsync();

      expect(context.attempts.length).toBeGreaterThan(0);
    });

    it('should not auto-recover when disabled', async () => {
      engine.configure({ autoRecoveryEnabled: false });

      const context = await engine.initiateRecovery({
        failedComponent: 'api',
        failedOperation: 'fetch',
        error: { type: 'NetworkError', message: 'ECONNRESET' },
      });

      expect(context.attempts.length).toBe(0);
      expect(context.status).toBe('pending');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOVERY STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('recovery strategies', () => {
    it('should register custom strategy', () => {
      const customStrategy: RecoveryStrategy = {
        id: 'custom_test',
        name: 'Custom Test Strategy',
        type: 'retry',
        description: 'Test strategy',
        applicableFailureTypes: ['transient'],
        applicableComponents: 'all',
        config: { maxRetries: 1 },
        successProbability: 1.0,
        avgDuration: 100,
        sideEffects: [],
        totalAttempts: 0,
        successfulAttempts: 0,
      };

      engine.registerStrategy(customStrategy);

      // The strategy should be used for transient failures
      // (verified by checking recovery attempts use it)
    });

    it('should select strategies by failure type', async () => {
      const context = await engine.initiateRecovery({
        failedComponent: 'api',
        failedOperation: 'call',
        error: { type: 'Error', message: 'Rate limit' },
      });

      await vi.runAllTimersAsync();

      // Should attempt rate_limit_backoff strategy
      expect(context.attempts.length).toBeGreaterThan(0);
    });

    it('should limit recovery attempts', async () => {
      engine.configure({ maxRecoveryAttempts: 2 });

      const context = await engine.initiateRecovery({
        failedComponent: 'api',
        failedOperation: 'call',
        error: { type: 'Error', message: 'Persistent failure' },
      });

      await vi.runAllTimersAsync();

      expect(context.attempts.length).toBeLessThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE CHECKPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('state checkpoints', () => {
    it('should create checkpoint with state', () => {
      const state = { agents: ['a', 'b'], progress: 50 };
      const cp = engine.createCheckpoint('component-1', state);

      expect(cp.id).toMatch(/^checkpoint-/);
      expect(cp.componentId).toBe('component-1');
      expect(cp.state).toEqual(state);
      expect(cp.hash).toBeDefined();
      expect(cp.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should restore from checkpoint', () => {
      const state = { data: 'important' };
      const cp = engine.createCheckpoint('component-1', state);

      const restored = engine.restoreFromCheckpoint(cp.id);
      expect(restored).toEqual(state);
    });

    it('should return null for non-existent checkpoint', () => {
      const restored = engine.restoreFromCheckpoint('non-existent-id');
      expect(restored).toBeNull();
    });

    it('should deep clone state to prevent mutations', () => {
      const state = { nested: { value: 'original' } };
      const cp = engine.createCheckpoint('component-1', state);

      // Mutate original
      state.nested.value = 'mutated';

      const restored = engine.restoreFromCheckpoint(cp.id);
      expect((restored as typeof state).nested.value).toBe('original');
    });

    it('should handle circular references in state', () => {
      const state: Record<string, unknown> = { name: 'test' };
      state.self = state; // Circular reference

      // After fix: hash() now uses deepClone first, so circular refs are handled
      const cp = engine.createCheckpoint('component-1', state);
      expect(cp).toBeDefined();
      expect(cp.hash).toBeDefined();

      const restored = engine.restoreFromCheckpoint(cp.id) as Record<string, unknown>;
      expect(restored.name).toBe('test');
      expect(restored.self).toBe('[Circular Reference]');
    });

    it('should handle deeply nested objects', () => {
      const state = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      const cp = engine.createCheckpoint('component-1', state);
      expect(cp).toBeDefined();

      const restored = engine.restoreFromCheckpoint(cp.id) as typeof state;
      expect(restored.level1.level2.level3.value).toBe('deep');
    });

    it('should handle Date objects in state', () => {
      const date = new Date('2025-01-01');
      const state = { createdAt: date };

      const cp = engine.createCheckpoint('component-1', state);
      const restored = engine.restoreFromCheckpoint(cp.id) as typeof state;

      expect(restored.createdAt).toBeInstanceOf(Date);
      expect(restored.createdAt.getTime()).toBe(date.getTime());
    });

    it('should handle Map in state', () => {
      const state = { map: new Map([['key', 'value']]) };
      const cp = engine.createCheckpoint('component-1', state);
      const restored = engine.restoreFromCheckpoint(cp.id) as typeof state;

      expect(restored.map).toBeInstanceOf(Map);
      expect(restored.map.get('key')).toBe('value');
    });

    it('should handle Set in state', () => {
      const state = { set: new Set([1, 2, 3]) };
      const cp = engine.createCheckpoint('component-1', state);
      const restored = engine.restoreFromCheckpoint(cp.id) as typeof state;

      expect(restored.set).toBeInstanceOf(Set);
      expect(restored.set.has(2)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('health monitoring', () => {
    it('should register health check', () => {
      const check: HealthCheck = {
        id: 'test-check',
        name: 'Test Health Check',
        component: 'test-component',
        interval: 5000,
        check: vi.fn().mockResolvedValue({ healthy: true, status: 'healthy', latency: 10 }),
        consecutiveFailures: 0,
      };

      engine.registerHealthCheck(check);
      expect(check.check).toHaveBeenCalled();
    });

    it('should return default health of 1', () => {
      expect(engine.getHealth('unknown-component')).toBe(1);
    });

    it('should return system health', () => {
      const health = engine.getHealth();
      expect(health).toBeGreaterThanOrEqual(0);
      expect(health).toBeLessThanOrEqual(1);
    });

    it('should update health on failed checks', async () => {
      const check: HealthCheck = {
        id: 'failing-check',
        name: 'Failing Check',
        component: 'failing-component',
        interval: 1000,
        check: vi.fn().mockRejectedValue(new Error('Check failed')),
        consecutiveFailures: 0,
      };

      engine.registerHealthCheck(check);

      // Run multiple check cycles
      await vi.advanceTimersByTimeAsync(3000);

      // Health should decrease
      const health = engine.getHealth('failing-component');
      expect(health).toBeLessThan(1);
    });

    it('should emit unhealthy event on check failure', async () => {
      const unhealthyHandler = vi.fn();
      engine.on('component_unhealthy', unhealthyHandler);

      const check: HealthCheck = {
        id: 'unhealthy-check',
        name: 'Unhealthy Check',
        component: 'unhealthy-component',
        interval: 1000,
        check: vi
          .fn()
          .mockResolvedValue({ healthy: false, status: 'unhealthy', latency: 10, error: 'Down' }),
        consecutiveFailures: 0,
      };

      engine.registerHealthCheck(check);

      // Initial check runs immediately
      await vi.advanceTimersByTimeAsync(0);

      expect(unhealthyHandler).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS MODE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('chaos mode', () => {
    it('should block chaos mode in production without confirmation', () => {
      // Use environment option instead of modifying process.env
      const result = engine.enableChaosMode(0.1, { environment: 'production' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('blocked');
    });

    it('should allow chaos mode in development', () => {
      const result = engine.enableChaosMode(0.1, { environment: 'development' });
      expect(result.success).toBe(true);
      engine.disableChaosMode();
    });

    it('should allow chaos mode in test environment', () => {
      const result = engine.enableChaosMode(0.1, { environment: 'test' });
      expect(result.success).toBe(true);
      engine.disableChaosMode();
    });

    it('should allow chaos mode in production with explicit confirmation', () => {
      const result = engine.enableChaosMode(0.1, {
        environment: 'production',
        confirmProduction: true,
      });
      expect(result.success).toBe(true);
      engine.disableChaosMode();
    });

    it('should reject failure rate above 50%', () => {
      const result = engine.enableChaosMode(0.6, { environment: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('50%');
    });

    it('should auto-disable after max duration', async () => {
      const chaosDisabledHandler = vi.fn();
      engine.on('chaos_auto_disabled', chaosDisabledHandler);

      engine.enableChaosMode(0.1, {
        environment: 'test',
        maxDuration: 5000, // 5 seconds
      });

      // Advance past the duration
      await vi.advanceTimersByTimeAsync(6000);

      expect(chaosDisabledHandler).toHaveBeenCalled();
    });

    it('should emit chaos_enabled event', () => {
      const enabledHandler = vi.fn();
      engine.on('chaos_enabled', enabledHandler);

      engine.enableChaosMode(0.2, { environment: 'test' });

      expect(enabledHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          failureRate: 0.2,
          environment: 'test',
        })
      );

      engine.disableChaosMode();
    });

    it('should inject failures at configured rate', () => {
      // Note: Max failure rate is 50% (0.5) - higher rates are blocked for safety
      const result = engine.enableChaosMode(0.5, { environment: 'test' }); // Max allowed rate
      expect(result.success).toBe(true);

      // With 50% rate, we need multiple checks to statistically verify
      // At least some calls should return true
      let injectedCount = 0;
      for (let i = 0; i < 100; i++) {
        if (engine.shouldInjectFailure()) injectedCount++;
      }

      // With 50% rate over 100 calls, we expect roughly 50 injections
      // Allow for randomness: should be between 20-80
      expect(injectedCount).toBeGreaterThan(20);
      expect(injectedCount).toBeLessThan(80);

      engine.disableChaosMode();
    });

    it('should not inject failures when disabled', () => {
      expect(engine.shouldInjectFailure()).toBe(false);
    });

    it('should track chaos duration on disable', () => {
      const disabledHandler = vi.fn();
      engine.on('chaos_disabled', disabledHandler);

      engine.enableChaosMode(0.1, { environment: 'test' });
      vi.advanceTimersByTime(1000);
      engine.disableChaosMode();

      expect(disabledHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          totalDuration: expect.any(Number),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOVERY HISTORY & REPORTING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('recovery history and reporting', () => {
    it('should track active recoveries', async () => {
      engine.configure({ autoRecoveryEnabled: false });

      await engine.initiateRecovery({
        failedComponent: 'test',
        failedOperation: 'op',
        error: { type: 'Error', message: 'test' },
      });

      const active = engine.getActiveRecoveries();
      expect(active.length).toBe(1);
    });

    it('should get recovery history', async () => {
      engine.configure({ autoRecoveryEnabled: true, maxRecoveryAttempts: 1 });

      await engine.initiateRecovery({
        failedComponent: 'test',
        failedOperation: 'op',
        error: { type: 'Error', message: 'Unknown weird error' },
      });

      await vi.runAllTimersAsync();

      const history = engine.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit history retrieval', async () => {
      engine.configure({ autoRecoveryEnabled: true, maxRecoveryAttempts: 1 });

      // Create multiple recoveries
      for (let i = 0; i < 5; i++) {
        await engine.initiateRecovery({
          failedComponent: 'test',
          failedOperation: `op-${i}`,
          error: { type: 'Error', message: 'test' },
        });
        await vi.runAllTimersAsync();
      }

      const limited = engine.getHistory(2);
      expect(limited.length).toBe(2);
    });

    it('should generate recovery report', async () => {
      engine.configure({ autoRecoveryEnabled: true, maxRecoveryAttempts: 1 });

      await engine.initiateRecovery({
        failedComponent: 'api',
        failedOperation: 'fetch',
        error: { type: 'Error', message: 'timeout' },
      });

      await vi.runAllTimersAsync();

      const report = engine.generateReport();

      expect(report.id).toMatch(/^report-/);
      expect(report.timestamp).toBeLessThanOrEqual(Date.now());
      expect(report.totalRecoveries).toBeGreaterThanOrEqual(0);
      expect(report.byFailureType).toBeInstanceOf(Map);
      expect(report.byStrategy).toBeInstanceOf(Map);
      expect(report.byComponent).toBeInstanceOf(Map);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('configuration', () => {
    it('should update configuration', () => {
      engine.configure({
        maxRecoveryAttempts: 10,
        recoveryTimeout: 120000,
      });

      // Configuration is internal, but we can test its effect
      // by checking behavior changes
    });

    it('should dispose resources properly', () => {
      const check: HealthCheck = {
        id: 'dispose-check',
        name: 'Dispose Check',
        component: 'dispose-component',
        interval: 1000,
        check: vi.fn().mockResolvedValue({ healthy: true, status: 'healthy', latency: 10 }),
        consecutiveFailures: 0,
      };

      engine.registerHealthCheck(check);
      engine.dispose();

      // After dispose, check should not be called anymore
      vi.advanceTimersByTime(5000);

      // The initial call happened, but no more after dispose
      expect(check.check).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('events', () => {
    it('should emit recovery_succeeded on success', async () => {
      const successHandler = vi.fn();
      engine.on('recovery_succeeded', successHandler);

      engine.configure({ autoRecoveryEnabled: true });

      await engine.initiateRecovery({
        failedComponent: 'api',
        failedOperation: 'fetch',
        error: { type: 'NetworkError', message: 'ECONNRESET' },
      });

      await vi.runAllTimersAsync();

      expect(successHandler).toHaveBeenCalled();
    });

    it('should emit recovery_failed when all attempts fail', async () => {
      const failHandler = vi.fn();
      engine.on('recovery_failed', failHandler);

      engine.configure({
        autoRecoveryEnabled: true,
        maxRecoveryAttempts: 1,
      });

      await engine.initiateRecovery({
        failedComponent: 'unknown',
        failedOperation: 'unknown',
        error: { type: 'LogicError', message: 'Bug in code' },
      });

      await vi.runAllTimersAsync();

      expect(failHandler).toHaveBeenCalled();
    });

    it('should emit recovery_escalated when escalating to human', async () => {
      const escalateHandler = vi.fn();
      engine.on('recovery_escalated', escalateHandler);

      engine.configure({
        autoRecoveryEnabled: true,
        maxRecoveryAttempts: 1,
      });

      await engine.initiateRecovery({
        failedComponent: 'code',
        failedOperation: 'execute',
        error: { type: 'Error', message: 'Unknown unclassified error' },
      });

      await vi.runAllTimersAsync();

      expect(escalateHandler).toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('Convenience Functions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('withRecovery', () => {
    it('should return result on success', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRecovery('test', 'op', operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should initiate recovery on failure', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(withRecovery('test', 'op', operation)).rejects.toThrow();
    });

    it('should use fallback when provided', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));

      const result = await withRecovery('test', 'op', operation, {
        fallback: 'fallback-value',
      });

      expect(result).toBe('fallback-value');
    });
  });

  describe('checkpoint', () => {
    it('should create checkpoint using singleton', () => {
      const cp = checkpoint('component', { state: 'data' });

      expect(cp).toBeDefined();
      expect(cp.componentId).toBe('component');
    });
  });

  describe('isHealthy', () => {
    it('should return true for healthy component', () => {
      expect(isHealthy('unknown')).toBe(true); // Default health is 1
    });

    it('should respect threshold', () => {
      expect(isHealthy('unknown', 0.5)).toBe(true);
      expect(isHealthy('unknown', 1.0)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

describe('Integration Scenarios', () => {
  let engine: SelfHealingEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = createSelfHealingEngine();
  });

  afterEach(() => {
    engine.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should handle full recovery cycle for transient failure', async () => {
    const events: string[] = [];

    engine.on('recovery_started', () => events.push('started'));
    engine.on('recovery_succeeded', () => events.push('succeeded'));

    engine.configure({ autoRecoveryEnabled: true });

    await engine.initiateRecovery({
      failedComponent: 'api',
      failedOperation: 'fetch',
      error: { type: 'NetworkError', message: 'Connection temporarily unavailable' },
    });

    await vi.runAllTimersAsync();

    expect(events).toContain('started');
    expect(events).toContain('succeeded');
  });

  it('should handle checkpoint-based recovery for corruption', async () => {
    // Create checkpoint
    const state = { users: ['alice', 'bob'], count: 2 };
    const cp = engine.createCheckpoint('user-service', state);

    // Simulate corruption and recovery
    const context = await engine.initiateRecovery({
      failedComponent: 'user-service',
      failedOperation: 'update',
      error: { type: 'Error', message: 'State corruption detected' },
      stateSnapshot: { users: [], count: -1 }, // Corrupted state
    });

    await vi.runAllTimersAsync();

    // Verify checkpoint can be restored
    const restored = engine.restoreFromCheckpoint(cp.id);
    expect(restored).toEqual(state);
  });

  it('should generate useful recommendations', async () => {
    engine.configure({ autoRecoveryEnabled: true, maxRecoveryAttempts: 1 });

    // Generate multiple failures of same type
    for (let i = 0; i < 15; i++) {
      await engine.initiateRecovery({
        failedComponent: 'flaky-service',
        failedOperation: `op-${i}`,
        error: { type: 'Error', message: 'Random failure' },
      });
      await vi.runAllTimersAsync();
    }

    const report = engine.generateReport();

    // Should have recommendations for frequent failures
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('should handle concurrent failures without crashing', async () => {
    engine.configure({ autoRecoveryEnabled: true });

    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        engine.initiateRecovery({
          failedComponent: `component-${i}`,
          failedOperation: 'concurrent-op',
          error: { type: 'Error', message: 'Concurrent failure' },
        })
      );
    }

    await Promise.all(promises);
    await vi.runAllTimersAsync();

    // All should be processed without crash
    expect(engine.getHistory().length).toBeGreaterThan(0);
  });
});
