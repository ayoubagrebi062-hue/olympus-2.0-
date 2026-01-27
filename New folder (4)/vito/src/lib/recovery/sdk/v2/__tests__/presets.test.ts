/**
 * Tests for the World-Class Presets API
 *
 * These tests ensure the zero-config API works as expected
 * and that all presets behave correctly under various conditions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resilient, PRESETS } from '../presets';
import { metrics } from '../../metrics';

describe('resilient() - Zero Config API', () => {
  beforeEach(() => {
    metrics.disable();
  });

  afterEach(() => {
    metrics.enable();
    vi.restoreAllMocks();
  });

  describe('Basic Usage', () => {
    it('succeeds on first attempt with no config', async () => {
      const result = await resilient(() => 'hello');
      expect(result).toBe('hello');
    });

    it('works with async functions', async () => {
      const result = await resilient(async () => {
        await new Promise(r => setTimeout(r, 10));
        return 42;
      });
      expect(result).toBe(42);
    });

    it('retries on failure and succeeds', async () => {
      let attempts = 0;
      const result = await resilient(async () => {
        attempts++;
        if (attempts < 2) throw new Error('Fail');
        return 'success';
      });
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('throws after max retries', async () => {
      await expect(
        resilient(() => { throw new Error('Always fails'); })
      ).rejects.toThrow('Always fails');
    });

    it('uses fallback when all retries fail', async () => {
      const result = await resilient(
        () => { throw new Error('Fail'); },
        { fallback: 'fallback-value' }
      );
      expect(result).toBe('fallback-value');
    });

    it('uses fallback function when all retries fail', async () => {
      const result = await resilient(
        () => { throw new Error('Fail'); },
        { fallback: () => 'computed-fallback' }
      );
      expect(result).toBe('computed-fallback');
    });
  });

  describe('Presets', () => {
    describe('resilient.critical()', () => {
      it('succeeds on first attempt', async () => {
        const result = await resilient.critical(() => 'payment-processed');
        expect(result).toBe('payment-processed');
      });

      it('has more retries than default (5 vs 3)', async () => {
        expect(PRESETS.critical.retry.maxAttempts).toBe(5);
        expect(PRESETS.default.retry.maxAttempts).toBe(3);
      });

      it('has longer timeout than default', async () => {
        expect(PRESETS.critical.timeout).toBeGreaterThan(PRESETS.default.timeout);
      });

      it('retries more times before giving up', async () => {
        let attempts = 0;
        await expect(
          resilient.critical(async () => {
            attempts++;
            if (attempts < 4) throw new Error('Fail');
            return 'success';
          })
        ).resolves.toBe('success');
        expect(attempts).toBe(4); // Would fail with default (3 attempts)
      });
    });

    describe('resilient.fast()', () => {
      it('succeeds on first attempt', async () => {
        const result = await resilient.fast(() => 'search-results');
        expect(result).toBe('search-results');
      });

      it('has fewer retries than default (1 vs 3)', async () => {
        expect(PRESETS.fast.retry.maxAttempts).toBe(1);
      });

      it('has shorter timeout than default', async () => {
        expect(PRESETS.fast.timeout).toBeLessThan(PRESETS.default.timeout);
      });

      it('fails fast instead of retrying', async () => {
        let attempts = 0;
        await expect(
          resilient.fast(() => {
            attempts++;
            throw new Error('Fail');
          })
        ).rejects.toThrow('Fail');
        expect(attempts).toBe(1); // Only 1 attempt, no retries
      });
    });

    describe('resilient.background()', () => {
      it('succeeds on first attempt', async () => {
        const result = await resilient.background(() => 'tracked');
        expect(result).toBe('tracked');
      });

      it('returns undefined on failure (silent)', async () => {
        // Use maxAttempts: 1 to avoid long test time (background has 10 retries)
        const result = await resilient.background(
          () => { throw new Error('Analytics failed'); },
          { maxAttempts: 1 }
        );
        expect(result).toBeUndefined();
      });

      it('has many retries', async () => {
        expect(PRESETS.background.retry.maxAttempts).toBe(10);
      });
    });

    describe('resilient.realtime()', () => {
      it('succeeds on first attempt', async () => {
        const result = await resilient.realtime(() => 'connected');
        expect(result).toBe('connected');
      });

      it('has short timeout for fast reconnection', async () => {
        expect(PRESETS.realtime.timeout).toBeLessThanOrEqual(5000);
      });
    });

    describe('resilient.database()', () => {
      it('succeeds on first attempt', async () => {
        const result = await resilient.database(() => [{ id: 1 }]);
        expect(result).toEqual([{ id: 1 }]);
      });

      it('has bulkhead for connection pooling', async () => {
        expect(PRESETS.database.bulkhead).toBeDefined();
        expect(PRESETS.database.bulkhead!.maxConcurrent).toBeGreaterThan(10);
      });
    });

    describe('resilient.idempotent()', () => {
      it('succeeds on first attempt', async () => {
        const result = await resilient.idempotent(() => 'processed');
        expect(result).toBe('processed');
      });

      it('has aggressive retries (safe to repeat)', async () => {
        expect(PRESETS.idempotent.retry.maxAttempts).toBe(5);
      });
    });
  });

  describe('Options Override', () => {
    it('custom timeout overrides preset', async () => {
      const start = Date.now();
      await expect(
        resilient(
          () => new Promise(r => setTimeout(r, 5000)),
          { timeout: 50 }
        )
      ).rejects.toThrow('Timeout');
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(200);
    });

    it('custom maxAttempts overrides preset', async () => {
      let attempts = 0;
      await expect(
        resilient(
          () => { attempts++; throw new Error('Fail'); },
          { maxAttempts: 1 }
        )
      ).rejects.toThrow('Fail');
      expect(attempts).toBe(1);
    });

    it('custom name appears in errors', async () => {
      // This test just ensures the option is accepted
      await expect(
        resilient(
          () => { throw new Error('Fail'); },
          { name: 'my-operation', maxAttempts: 1 }
        )
      ).rejects.toThrow();
    });
  });

  describe('Dashboard', () => {
    it('stats() returns valid structure', () => {
      const stats = resilient.dashboard.stats();
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('avgLatency');
      expect(typeof stats.uptime).toBe('number');
      expect(typeof stats.successRate).toBe('number');
    });

    it('print() does not throw', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      expect(() => resilient.dashboard.print()).not.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('Presets Reference', () => {
    it('all presets are accessible', () => {
      expect(resilient.presets).toBe(PRESETS);
      expect(Object.keys(PRESETS)).toContain('default');
      expect(Object.keys(PRESETS)).toContain('critical');
      expect(Object.keys(PRESETS)).toContain('fast');
      expect(Object.keys(PRESETS)).toContain('background');
      expect(Object.keys(PRESETS)).toContain('realtime');
      expect(Object.keys(PRESETS)).toContain('database');
      expect(Object.keys(PRESETS)).toContain('idempotent');
    });

    it('all presets have required fields', () => {
      for (const [name, preset] of Object.entries(PRESETS)) {
        expect(preset.retry, `${name} missing retry`).toBeDefined();
        expect(preset.timeout, `${name} missing timeout`).toBeDefined();
        expect(preset.circuitBreaker, `${name} missing circuitBreaker`).toBeDefined();
      }
    });
  });
});

describe('PRESETS configuration', () => {
  it('default is balanced', () => {
    expect(PRESETS.default.retry.maxAttempts).toBe(3);
    expect(PRESETS.default.timeout).toBe(10000);
  });

  it('critical prioritizes success over speed', () => {
    expect(PRESETS.critical.retry.maxAttempts).toBeGreaterThan(PRESETS.default.retry.maxAttempts);
    expect(PRESETS.critical.timeout).toBeGreaterThan(PRESETS.default.timeout);
  });

  it('fast prioritizes speed over retries', () => {
    expect(PRESETS.fast.retry.maxAttempts).toBeLessThan(PRESETS.default.retry.maxAttempts);
    expect(PRESETS.fast.timeout).toBeLessThan(PRESETS.default.timeout);
  });

  it('background prioritizes eventual success', () => {
    expect(PRESETS.background.retry.maxAttempts).toBeGreaterThan(PRESETS.critical.retry.maxAttempts);
    expect(PRESETS.background.timeout).toBeGreaterThan(PRESETS.critical.timeout);
  });
});
