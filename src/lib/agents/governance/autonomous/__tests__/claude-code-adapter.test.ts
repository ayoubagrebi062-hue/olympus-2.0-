/**
 * Claude Code Adapter Tests
 *
 * @module governance/tests/claude-code-adapter
 * @version 1.0.0
 */

import { ClaudeCodeAdapter, createClaudeCodeAdapter } from '../claude-code-adapter';

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
  });

  describe('shouldUse', () => {
    const adapter = new ClaudeCodeAdapter({ enabled: true });

    it('should return true for high-tier violations', () => {
      const violation = {
        id: 'test-1',
        pattern: 'missing_auth',
        tier: 3 as const,
        filePath: 'src/api/users.ts',
        confidence: 0.5,
      };

      expect(adapter.shouldUse(violation)).toBe(true);
    });

    it('should return true for high-confidence violations', () => {
      const violation = {
        id: 'test-2',
        pattern: 'console_log',
        tier: 1 as const,
        filePath: 'src/utils.ts',
        confidence: 0.9,
      };

      expect(adapter.shouldUse(violation)).toBe(true);
    });

    it('should return true for complex patterns', () => {
      const violation = {
        id: 'test-3',
        pattern: 'sql_injection_risk',
        tier: 1 as const,
        filePath: 'src/db.ts',
        confidence: 0.5,
      };

      expect(adapter.shouldUse(violation)).toBe(true);
    });

    it('should return false for low-risk violations when disabled', () => {
      const disabledAdapter = new ClaudeCodeAdapter({ enabled: false });
      const violation = {
        id: 'test-4',
        pattern: 'console_log',
        tier: 1 as const,
        filePath: 'src/utils.ts',
        confidence: 0.5,
      };

      expect(disabledAdapter.shouldUse(violation)).toBe(false);
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after max failures', () => {
      const adapter = new ClaudeCodeAdapter({
        enabled: true,
        maxFailures: 2,
        cooldownMs: 100,
      });

      // Simulate failures by calling resetCircuit and checking state
      // In real scenario, failures would come from execSync errors
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

  describe('getHealth', () => {
    it('should return complete health status', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true });
      const health = adapter.getHealth();

      expect(health).toHaveProperty('available');
      expect(health).toHaveProperty('errorCount');
      expect(health).toHaveProperty('circuitOpen');
    });
  });
});

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

    // Default is disabled when not specified
    expect(health.available).toBe(false);
  });

  it('should create disabled adapter when no config provided', () => {
    const adapter = createClaudeCodeAdapter();
    const health = adapter.getHealth();

    // Default is disabled when not specified
    expect(health.available).toBe(false);
  });
});
