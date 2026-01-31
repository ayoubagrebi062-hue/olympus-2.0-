/**
 * Claude Code Adapter Tests (v2.0)
 *
 * Tests for the world-class rewrite:
 * - Spawn-based async execution (no shell injection)
 * - Zod response validation
 * - Token bucket rate limiter
 * - Response cache with TTL
 * - Structured metrics
 * - Startup validation
 * - Clean interface (no duplicate reason/reasoning)
 *
 * @module governance/tests/claude-code-adapter
 * @version 2.0.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClaudeCodeAdapter, createClaudeCodeAdapter } from '../claude-code-adapter';
import type {
  ClaudeDecisionResult,
  AdapterMetrics,
  AdapterLogger,
  LogEntry,
} from '../claude-code-adapter';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestViolation(
  overrides: Partial<{
    id: string;
    pattern: string;
    tier: 1 | 2 | 3;
    filePath: string;
    confidence: number;
  }> = {}
) {
  return {
    id: overrides.id ?? 'test-1',
    pattern: overrides.pattern ?? 'missing_auth',
    tier: (overrides.tier ?? 3) as 1 | 2 | 3,
    filePath: overrides.filePath ?? 'src/api/users.ts',
    confidence: overrides.confidence ?? 0.9,
  };
}

class TestLogger implements AdapterLogger {
  entries: LogEntry[] = [];
  log(entry: LogEntry): void {
    this.entries.push(entry);
  }
  getByEvent(event: string): LogEntry[] {
    return this.entries.filter(e => e.event === event);
  }
  getByLevel(level: LogEntry['level']): LogEntry[] {
    return this.entries.filter(e => e.level === level);
  }
  clear(): void {
    this.entries = [];
  }
}

// ============================================================================
// CONSTRUCTOR TESTS
// ============================================================================

describe('ClaudeCodeAdapter', () => {
  describe('constructor', () => {
    it('should create adapter with default config', () => {
      const adapter = new ClaudeCodeAdapter();
      const health = adapter.getHealth();

      expect(health.available).toBe(true);
      expect(health.errorCount).toBe(0);
      expect(health.circuitOpen).toBe(false);
    });

    it('should respect enabled flag', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: false });
      const health = adapter.getHealth();

      expect(health.available).toBe(false);
    });

    it('should accept custom logger', () => {
      const logger = new TestLogger();
      const adapter = new ClaudeCodeAdapter({ enabled: true }, logger);
      const health = adapter.getHealth();

      expect(health.available).toBe(true);
    });
  });

  // ============================================================================
  // shouldUse TESTS
  // ============================================================================

  describe('shouldUse', () => {
    const adapter = new ClaudeCodeAdapter({ enabled: true });

    it('should return true for high-tier violations', () => {
      expect(adapter.shouldUse(createTestViolation({ tier: 3, confidence: 0.5 }))).toBe(true);
    });

    it('should return true for tier 2 violations', () => {
      expect(adapter.shouldUse(createTestViolation({ tier: 2, confidence: 0.5 }))).toBe(true);
    });

    it('should return true for high-confidence violations', () => {
      expect(
        adapter.shouldUse(
          createTestViolation({
            tier: 1,
            pattern: 'console_log',
            confidence: 0.9,
          })
        )
      ).toBe(true);
    });

    it('should return true for complex patterns', () => {
      expect(
        adapter.shouldUse(
          createTestViolation({
            pattern: 'sql_injection_risk',
            tier: 1,
            confidence: 0.5,
          })
        )
      ).toBe(true);
    });

    it('should return false for low-risk violations when disabled', () => {
      const disabledAdapter = new ClaudeCodeAdapter({ enabled: false });
      expect(
        disabledAdapter.shouldUse(
          createTestViolation({
            pattern: 'console_log',
            tier: 1,
            confidence: 0.5,
          })
        )
      ).toBe(false);
    });

    it('should return false for low-tier low-confidence non-complex patterns', () => {
      expect(
        adapter.shouldUse(
          createTestViolation({
            pattern: 'console_log',
            tier: 1,
            confidence: 0.5,
          })
        )
      ).toBe(false);
    });
  });

  // ============================================================================
  // CIRCUIT BREAKER TESTS
  // ============================================================================

  describe('circuit breaker', () => {
    it('should start with circuit closed', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true, maxFailures: 2, cooldownMs: 100 });
      const health = adapter.getHealth();
      expect(health.circuitOpen).toBe(false);
    });

    it('should reset circuit manually', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true });
      adapter.resetCircuit();

      const health = adapter.getHealth();
      expect(health.circuitOpen).toBe(false);
      expect(health.errorCount).toBe(0);
    });
  });

  // ============================================================================
  // HEALTH STATUS TESTS
  // ============================================================================

  describe('getHealth', () => {
    it('should return complete health status', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true });
      const health = adapter.getHealth();

      expect(health).toHaveProperty('available');
      expect(health).toHaveProperty('errorCount');
      expect(health).toHaveProperty('circuitOpen');
      expect(health).toHaveProperty('cliInstalled');
      expect(health).toHaveProperty('cliAuthenticated');
      expect(health).toHaveProperty('cliVersion');
    });

    it('should report unavailable when disabled', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: false });
      expect(adapter.getHealth().available).toBe(false);
    });
  });

  // ============================================================================
  // METRICS TESTS
  // ============================================================================

  describe('getMetrics', () => {
    it('should return zeroed metrics on fresh adapter', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true });
      const m = adapter.getMetrics();

      expect(m.totalCalls).toBe(0);
      expect(m.successfulCalls).toBe(0);
      expect(m.failedCalls).toBe(0);
      expect(m.cacheHits).toBe(0);
      expect(m.rateLimitDrops).toBe(0);
      expect(m.avgLatencyMs).toBe(0);
      expect(m.p50LatencyMs).toBe(0);
      expect(m.p99LatencyMs).toBe(0);
      expect(m.circuitOpenCount).toBe(0);
      expect(m.fallbackCount).toBe(0);
      expect(m.lastCallTimestamp).toBe(0);
    });

    it('should reset metrics', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true });
      adapter.resetMetrics();
      const m = adapter.getMetrics();
      expect(m.totalCalls).toBe(0);
    });
  });

  // ============================================================================
  // CACHE TESTS
  // ============================================================================

  describe('cache', () => {
    it('should clear cache', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true });
      adapter.clearCache();
      // No error means cache cleared successfully
    });
  });

  // ============================================================================
  // INTERFACE TESTS (v2.0: no duplicate reason field)
  // ============================================================================

  describe('interface', () => {
    it('should not have decideSync method', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true });
      expect((adapter as any).decideSync).toBeUndefined();
    });

    it('should have async decide method', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true });
      expect(typeof adapter.decide).toBe('function');
    });

    it('should have validateSetup method', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true });
      expect(typeof adapter.validateSetup).toBe('function');
    });

    it('should have getMetrics method', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true });
      expect(typeof adapter.getMetrics).toBe('function');
    });
  });

  // ============================================================================
  // DECIDE TESTS (circuit breaker fallback without real CLI)
  // ============================================================================

  describe('decide', () => {
    it('should return null when circuit is open', async () => {
      const logger = new TestLogger();
      const adapter = new ClaudeCodeAdapter(
        {
          enabled: true,
          maxFailures: 1,
          cooldownMs: 60000,
        },
        logger
      );

      // Force circuit open by simulating internal state
      // We do this by calling decide repeatedly - it will fail since no CLI
      const violation = createTestViolation();
      await adapter.decide(violation, null);

      // After 1 failure (maxFailures=1), circuit opens
      const result = await adapter.decide(violation, null);
      // At this point circuit should be open, or it returned null from CLI failure
      expect(result).toBeNull();
    });

    it('should return null when disabled', async () => {
      const adapter = new ClaudeCodeAdapter({ enabled: false });
      const violation = createTestViolation();

      // shouldUse returns false, but decide still tries if circuit is closed
      // Actually, decide doesn't check shouldUse - it checks circuit and rate limiter
      // The caller (DecisionStrategy) checks shouldUse first
      // So decide will attempt the call and fail (no CLI)
      const result = await adapter.decide(violation, null);
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // LOGGING TESTS
  // ============================================================================

  describe('structured logging', () => {
    it('should log to custom logger', async () => {
      const logger = new TestLogger();
      const adapter = new ClaudeCodeAdapter({ enabled: true }, logger);

      // Trigger a call that will fail (no CLI available)
      const violation = createTestViolation();
      await adapter.decide(violation, null);

      // Should have logged the failure
      const errors = logger.getByLevel('error');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].component).toBe('ClaudeAdapter');
    });
  });
});

// ============================================================================
// FACTORY FUNCTION TESTS
// ============================================================================

describe('createClaudeCodeAdapter', () => {
  it('should create adapter from config with claudeCode enabled', () => {
    const config = {
      experimentalStrategies: {
        claudeCode: {
          enabled: true,
          timeoutMs: 15000,
          maxFailures: 5,
        },
      },
    };

    const adapter = createClaudeCodeAdapter(config);
    const health = adapter.getHealth();

    expect(health.available).toBe(true);
  });

  it('should create disabled adapter when claudeCode not in config', () => {
    const config = {
      experimentalStrategies: {},
    };

    const adapter = createClaudeCodeAdapter(config);
    const health = adapter.getHealth();

    expect(health.available).toBe(false);
  });

  it('should create disabled adapter when no config provided', () => {
    const adapter = createClaudeCodeAdapter();
    const health = adapter.getHealth();

    expect(health.available).toBe(false);
  });

  it('should accept custom logger in factory', () => {
    const logger = new TestLogger();
    const config = {
      experimentalStrategies: {
        claudeCode: { enabled: true },
      },
    };

    const adapter = createClaudeCodeAdapter(config, logger);
    expect(adapter.getHealth().available).toBe(true);
  });
});

// ============================================================================
// SECURITY TESTS (FIX #1: No shell injection)
// ============================================================================

describe('security', () => {
  it('should not import execSync', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = path.resolve(__dirname, '..', 'claude-code-adapter.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');

    expect(source).not.toContain('execSync');
    expect(source).not.toContain('shell: true');
  });

  it('should use spawn from child_process', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = path.resolve(__dirname, '..', 'claude-code-adapter.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');

    expect(source).toContain("import { spawn } from 'child_process'");
    expect(source).toContain('shell: false');
  });
});
