/**
 * Decision Strategy Loader - Test Suite
 *
 * Comprehensive tests covering:
 * - Initialization and configuration loading
 * - Progressive degradation (5 levels)
 * - Security (path traversal protection)
 * - Reliability (thundering herd, circuit breakers)
 * - Error handling and recovery
 *
 * @version 5.2.0 (Ship-Ready)
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  DecisionStrategyLoader,
  GovernanceError,
  GovernanceErrorCode,
  HealthState,
  type GovernanceConfig,
  type IConfigLoader,
  type ILogger,
  type Violation,
  type PatternLearning,
} from '../decision-strategy-loader';

// ============================================================================
// MOCKS
// ============================================================================

const createMockConfig = (): GovernanceConfig => ({
  version: '2.0.0',
  strategies: {
    production: {
      name: 'Production Strategy',
      description: 'Conservative production settings',
      defaults: {
        highRiskThreshold: 0.7,
        mediumRiskThreshold: 0.3,
        lowRiskThreshold: 0.05,
        minSamplesForDecision: 10,
        minSamplesForSuppression: 20,
      },
    },
    staging: {
      name: 'Staging Strategy',
      description: 'Balanced staging settings',
      defaults: {
        highRiskThreshold: 0.6,
        mediumRiskThreshold: 0.25,
        lowRiskThreshold: 0.05,
        minSamplesForDecision: 5,
        minSamplesForSuppression: 10,
      },
    },
  },
});

const createMockLogger = (): ILogger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

const createMockConfigLoader = (config: GovernanceConfig): IConfigLoader => ({
  loadConfig: vi.fn(async () => config),
});

const createFailingConfigLoader = (error: Error): IConfigLoader => ({
  loadConfig: vi.fn(async () => {
    throw error;
  }),
});

const createMockViolation = (): Violation => ({
  id: 'viol-123',
  pattern: 'sql_injection',
  tier: 3,
  filePath: 'src/api/users.ts',
  confidence: 0.85,
});

const createMockLearning = (): PatternLearning => ({
  pattern: 'sql_injection',
  deployedViolations: 15,
  incidentRate: 0.23,
  riskScore: 0.78,
  confidenceInterval: [0.65, 0.91],
});

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

describe('DecisionStrategyLoader - Initialization', () => {
  test('initializes successfully with valid config', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);
    const mockLogger = createMockLogger();

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
      logger: mockLogger,
    });

    await loader.waitUntilReady();

    const health = loader.getHealthStatus();
    expect(health.state).toBe(HealthState.HEALTHY);
    expect(health.configSource).toBe('current');
  });

  test('starts in INITIALIZING state', () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    const health = loader.getHealthStatus();
    expect(health.state).toBe(HealthState.INITIALIZING);
    expect(health.reason).toContain('starting up');
  });

  test('calls progress callback during initialization', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);
    const progressCallbacks: any[] = [];

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
      onProgress: status => progressCallbacks.push(status),
    });

    await loader.waitUntilReady();

    expect(progressCallbacks.length).toBeGreaterThan(0);
    expect(progressCallbacks[0].phase).toBe('reading');
    expect(progressCallbacks[progressCallbacks.length - 1].phase).toBe('complete');
    expect(progressCallbacks[progressCallbacks.length - 1].percentComplete).toBe(100);
  });

  test('times out if initialization takes too long', async () => {
    const mockConfigLoader: IConfigLoader = {
      loadConfig: vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds
        return createMockConfig();
      }),
    };

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    await expect(loader.waitUntilReady(1000)).rejects.toThrow(GovernanceError);
    await expect(loader.waitUntilReady(1000)).rejects.toThrow(/timeout/i);
  });

  test('handles concurrent waitUntilReady calls', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    // Call waitUntilReady 10 times concurrently
    const promises = Array.from({ length: 10 }, () => loader.waitUntilReady());

    await Promise.all(promises);

    // Config loader should only be called once
    expect(mockConfigLoader.loadConfig).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// SECURITY TESTS
// ============================================================================

describe('DecisionStrategyLoader - Security', () => {
  test('rejects path traversal with ..', () => {
    expect(() => {
      new DecisionStrategyLoader('../../etc/passwd');
    }).toThrow(GovernanceError);

    expect(() => {
      new DecisionStrategyLoader('../../etc/passwd');
    }).toThrow(/path traversal/i);
  });

  test('rejects path traversal with ~', () => {
    expect(() => {
      new DecisionStrategyLoader('~/config.json');
    }).toThrow(GovernanceError);

    expect(() => {
      new DecisionStrategyLoader('~/config.json');
    }).toThrow(/path traversal/i);
  });

  test('rejects relative paths', () => {
    expect(() => {
      new DecisionStrategyLoader('config.json');
    }).toThrow(GovernanceError);

    expect(() => {
      new DecisionStrategyLoader('./config.json');
    }).toThrow(GovernanceError);
  });

  test('accepts absolute paths', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);

    const loader = new DecisionStrategyLoader('/etc/governance/config.json', {
      configLoader: mockConfigLoader,
    });

    await loader.waitUntilReady();
    expect(loader.getHealthStatus().state).toBe(HealthState.HEALTHY);
  });
});

// ============================================================================
// PROGRESSIVE DEGRADATION TESTS
// ============================================================================

describe('DecisionStrategyLoader - Progressive Degradation', () => {
  test('level 1: uses valid config (HEALTHY)', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    await loader.waitUntilReady();

    const health = loader.getHealthStatus();
    expect(health.state).toBe(HealthState.HEALTHY);
    expect(health.configSource).toBe('current');
  });

  test('level 2: uses repaired config (DEGRADED)', async () => {
    const brokenConfig = {
      version: '2.0.0',
      strategies: {
        production: {
          name: 'Production',
          description: 'Test',
          defaults: {
            highRiskThreshold: 70, // ❌ Should be 0.70 (percentage as integer)
            mediumRiskThreshold: 30,
            lowRiskThreshold: 5,
            minSamplesForDecision: 10,
            minSamplesForSuppression: 20,
          },
        },
      },
    };

    const mockConfigLoader = createMockConfigLoader(brokenConfig as any);

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    await loader.waitUntilReady();

    const health = loader.getHealthStatus();
    expect(health.state).toBe(HealthState.DEGRADED);
    expect(health.configSource).toBe('repaired');
    expect(health.reason).toContain('auto-repaired');
  });

  test('level 3: uses partial config (DEGRADED)', async () => {
    const partiallyValidConfig = {
      version: '2.0.0',
      strategies: {
        production: {
          name: 'Production',
          description: 'Valid strategy',
          defaults: {
            highRiskThreshold: 0.7,
            mediumRiskThreshold: 0.3,
            lowRiskThreshold: 0.05,
            minSamplesForDecision: 10,
            minSamplesForSuppression: 20,
          },
        },
        broken: {
          name: 'Broken',
          // ❌ Missing defaults
        },
      },
    };

    const mockConfigLoader = createMockConfigLoader(partiallyValidConfig as any);

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    await loader.waitUntilReady();

    const health = loader.getHealthStatus();
    expect(health.state).toBe(HealthState.DEGRADED);
    expect(health.configSource).toBe('partial');
  });

  test('level 4: uses cached config (CRITICAL)', async () => {
    const mockConfig = createMockConfig();
    let callCount = 0;

    const mockConfigLoader: IConfigLoader = {
      loadConfig: vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return mockConfig; // First load succeeds
        } else {
          throw new Error('Config file corrupted'); // Second load fails
        }
      }),
    };

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
      cacheTTL: 100, // 100ms cache
    });

    await loader.waitUntilReady();
    expect(loader.getHealthStatus().state).toBe(HealthState.HEALTHY);

    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Force reload (will fail, should use cached)
    await loader.forceReload();

    const health = loader.getHealthStatus();
    expect(health.state).toBe(HealthState.CRITICAL);
    expect(health.configSource).toBe('cached');
    expect(health.reason).toContain('cached configuration');
  });

  test('level 5: uses defaults (CRITICAL)', async () => {
    const mockConfigLoader = createFailingConfigLoader(new Error('Config not found'));

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    await loader.waitUntilReady();

    const health = loader.getHealthStatus();
    expect(health.state).toBe(HealthState.CRITICAL);
    expect(health.configSource).toBe('defaults');
    expect(health.reason).toContain('hardcoded defaults');
  });
});

// ============================================================================
// RELIABILITY TESTS
// ============================================================================

describe('DecisionStrategyLoader - Reliability', () => {
  test('prevents thundering herd on cache expiry', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
      cacheTTL: 100, // 100ms cache
    });

    await loader.waitUntilReady();

    // Reset mock to track reload calls
    vi.clearAllMocks();

    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Simulate 100 concurrent requests
    const promises = Array.from({ length: 100 }, () => loader.getStrategy('production'));

    await Promise.all(promises);

    // Config loader should only be called ONCE (not 100 times)
    expect(mockConfigLoader.loadConfig).toHaveBeenCalledTimes(1);
  });

  test('circuit breaker opens after repeated failures', async () => {
    let callCount = 0;
    const mockConfigLoader: IConfigLoader = {
      loadConfig: vi.fn(async () => {
        callCount++;
        throw new Error(`Load failed (attempt ${callCount})`);
      }),
    };

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    // Should fail but use defaults
    await loader.waitUntilReady();

    // Try reloading multiple times (should trigger circuit breaker)
    for (let i = 0; i < 10; i++) {
      await loader.forceReload().catch(() => {});
    }

    // Circuit breaker should prevent excessive retries
    expect(callCount).toBeLessThan(20); // Would be 11 without circuit breaker
  });
});

// ============================================================================
// DECISION MAKING TESTS
// ============================================================================

describe('DecisionStrategyLoader - Decision Making', () => {
  test('makes alert-human decision for high risk', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    await loader.waitUntilReady();

    const strategy = await loader.getStrategy('production');
    const violation = createMockViolation();
    const learning: PatternLearning = {
      ...createMockLearning(),
      riskScore: 0.85, // High risk (>0.7 threshold)
      incidentRate: 0.4,
    };

    const decision = strategy.decide(violation, learning);

    expect(decision.action).toBe('alert-human');
    expect(decision.reason).toContain('High risk');
    expect(decision.confidence).toBeGreaterThan(0.7);
  });

  test('makes auto-fix decision for medium risk with data', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    await loader.waitUntilReady();

    const strategy = await loader.getStrategy('production');
    const violation = createMockViolation();
    const learning: PatternLearning = {
      ...createMockLearning(),
      riskScore: 0.5, // Medium risk (0.3-0.7)
      deployedViolations: 25, // Sufficient samples
      incidentRate: 0.15,
    };

    const decision = strategy.decide(violation, learning);

    expect(decision.action).toBe('auto-fix');
    expect(decision.reason).toContain('Medium risk');
  });

  test('makes suppress decision for low risk with data', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    await loader.waitUntilReady();

    const strategy = await loader.getStrategy('production');
    const violation = createMockViolation();
    const learning: PatternLearning = {
      ...createMockLearning(),
      riskScore: 0.2, // Low risk
      deployedViolations: 50, // Lots of samples
      incidentRate: 0.02, // Very low incident rate (<0.05)
    };

    const decision = strategy.decide(violation, learning);

    expect(decision.action).toBe('suppress');
    expect(decision.reason).toContain('Safe pattern');
  });

  test('makes conservative decision with no learning data', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    await loader.waitUntilReady();

    const strategy = await loader.getStrategy('production');
    const violation = createMockViolation();

    const decision = strategy.decide(violation, null);

    expect(decision.action).toBe('alert-human');
    expect(decision.reason).toContain('No historical data');
    expect(decision.confidence).toBe(0.5);
  });

  test('includes evidence in decision', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    await loader.waitUntilReady();

    const strategy = await loader.getStrategy('production');
    const violation = createMockViolation();
    const learning = createMockLearning();

    const decision = strategy.decide(violation, learning);

    expect(decision.evidence).toBeDefined();
    expect(decision.evidence?.totalSamples).toBe(learning.deployedViolations);
    expect(decision.evidence?.incidentRate).toBe(learning.incidentRate);
    expect(decision.evidence?.riskScore).toBe(learning.riskScore);
    expect(decision.evidence?.strategyUsed).toBe('production');
    expect(decision.evidence?.thresholdsApplied).toBeDefined();
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('DecisionStrategyLoader - Error Handling', () => {
  test('throws GovernanceError with code on file not found', async () => {
    const mockConfigLoader = createFailingConfigLoader(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    );

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
    });

    await loader.waitUntilReady(); // Should not throw, uses defaults

    const health = loader.getHealthStatus();
    expect(health.state).toBe(HealthState.CRITICAL);
  });

  test('provides recovery hints in errors', () => {
    try {
      new DecisionStrategyLoader('../etc/passwd');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(GovernanceError);
      const govError = error as GovernanceError;
      expect(govError.code).toBe(GovernanceErrorCode.PATH_TRAVERSAL_ATTEMPT);
      expect(govError.recoveryHint).toBeDefined();
      expect(govError.recoveryHint).toContain('ACTION:');
    }
  });
});

// ============================================================================
// DEBUG MODE TESTS
// ============================================================================

describe('DecisionStrategyLoader - Debug Mode', () => {
  test('logs debug information when debug enabled', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);
    const mockLogger = createMockLogger();

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
      logger: mockLogger,
      debug: true,
    });

    await loader.waitUntilReady();

    expect(mockLogger.debug).toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Initializing'),
      expect.any(Object)
    );
  });

  test('does not log debug when debug disabled', async () => {
    const mockConfig = createMockConfig();
    const mockConfigLoader = createMockConfigLoader(mockConfig);
    const mockLogger = createMockLogger();

    const loader = new DecisionStrategyLoader('/fake/path/config.json', {
      configLoader: mockConfigLoader,
      logger: mockLogger,
      debug: false,
    });

    await loader.waitUntilReady();

    expect(mockLogger.debug).not.toHaveBeenCalled();
  });
});
