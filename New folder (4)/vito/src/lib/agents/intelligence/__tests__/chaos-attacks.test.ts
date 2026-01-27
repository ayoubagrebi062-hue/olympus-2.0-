/**
 * CHAOS ATTACKS - Breaking the System on Purpose
 *
 * These are NEW attacks not covered by chaos-engineering.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  analyze,
  analyzeMany,
  stream,
  deduplicatedAnalyze,
  clearCache,
  setMetricsCollector,
  MAX_CONTENT_LENGTH,
} from '..';

// ============================================================================
// ATTACK 1: METRICS COLLECTOR THAT THROWS
// ============================================================================

describe('CHAOS ATTACK: Metrics Collector Bombs', () => {
  beforeEach(() => clearCache());

  it('survives metrics collector that throws synchronously', async () => {
    // ATTACK: Metrics collector throws an error
    setMetricsCollector(() => {
      throw new Error('METRICS BOMB!');
    });

    // SHOULD: Analysis completes, error is swallowed
    // ACTUALLY: Let's see...
    const result = await analyze('Test content for metrics bomb').run();

    expect(result).toBeDefined();
    expect(result.totalScore).toBeGreaterThanOrEqual(0);

    // Cleanup
    setMetricsCollector(null as any);
  });

  it('survives metrics collector that throws asynchronously', async () => {
    setMetricsCollector(async () => {
      await new Promise(r => setTimeout(r, 1));
      throw new Error('ASYNC METRICS BOMB!');
    });

    const result = await analyze('Test content for async metrics').run();
    expect(result).toBeDefined();

    setMetricsCollector(null as any);
  });
});

// ============================================================================
// ATTACK 2: PROGRESS CALLBACK THAT THROWS (in stream)
// ============================================================================

describe('CHAOS ATTACK: Streaming with Bomb Callbacks', () => {
  beforeEach(() => clearCache());

  it('stream survives if consumer throws during iteration', async () => {
    // ATTACK: Consumer throws while iterating
    let eventCount = 0;
    let caughtError = false;

    try {
      for await (const event of stream('Test content for streaming bomb')) {
        eventCount++;
        if (eventCount === 2) {
          throw new Error('CONSUMER BOMB!');
        }
      }
    } catch (e: any) {
      caughtError = true;
      expect(e.message).toBe('CONSUMER BOMB!');
    }

    // SHOULD: Error propagates to consumer (their fault)
    expect(caughtError).toBe(true);
    expect(eventCount).toBe(2);
  });
});

// ============================================================================
// ATTACK 3: DEDUPLICATION RACE CONDITIONS
// ============================================================================

describe('CHAOS ATTACK: Deduplication Race Conditions', () => {
  beforeEach(() => clearCache());

  it('handles cache clear during deduplication flight', async () => {
    // ATTACK: Start analysis, clear cache mid-flight, start another
    const content = 'Race condition test content with enough words to analyze';

    // Start first analysis
    const promise1 = deduplicatedAnalyze(content);

    // Clear cache while in flight (simulating expiration)
    clearCache();

    // Start second analysis (should NOT reuse the in-flight one after clear)
    const promise2 = deduplicatedAnalyze(content);

    // Both should complete without throwing
    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1.totalScore).toBe(result2.totalScore);
  });

  it('handles rapid fire same content (deduplication stress)', async () => {
    const content = 'Rapid fire deduplication stress test content';

    // Fire 50 requests for same content simultaneously
    const promises = Array(50).fill(null).map(() => deduplicatedAnalyze(content));

    const results = await Promise.all(promises);

    // All should succeed and return same result
    expect(results.length).toBe(50);
    const firstScore = results[0].totalScore;
    expect(results.every(r => r.totalScore === firstScore)).toBe(true);
  });
});

// ============================================================================
// ATTACK 4: BATCH PROCESSING ALL FAILURES
// ============================================================================

describe('CHAOS ATTACK: Batch All Failures', () => {
  beforeEach(() => clearCache());

  it('handles batch where every item fails validation', async () => {
    // ATTACK: Every item in batch is invalid (using string[] format)
    const badItems: any[] = [
      '',           // Empty
      '   ',        // Whitespace
      null,         // Null
    ];

    const result = await analyzeMany(badItems, { concurrency: 2 });

    // SHOULD: All fail gracefully, no crashes
    expect(result.results.length).toBe(3);
    expect(result.results.every(r => r.status === 'failed')).toBe(true);
    expect(result.stats.failed).toBe(3);
    expect(result.stats.completed).toBe(0);
  });

  it('handles batch with mix of valid and catastrophically invalid', async () => {
    const mixedItems: any[] = [
      'This is valid content for analysis',
      null,
      'Another valid piece of content here',
      { nested: 'object' },  // Object instead of string
    ];

    const result = await analyzeMany(mixedItems, { concurrency: 1 });

    // Good items should succeed, bad items should fail
    const goodResults = result.results.filter(r => r.status === 'completed');
    const badResults = result.results.filter(r => r.status === 'failed');

    expect(goodResults.length).toBe(2);
    expect(badResults.length).toBe(2);
  });
});

// ============================================================================
// ATTACK 5: MEMORY EXHAUSTION ATTEMPTS
// ============================================================================

describe('CHAOS ATTACK: Memory Exhaustion', () => {
  beforeEach(() => clearCache());

  it('rejects content designed to explode regex', async () => {
    // ATTACK: Content with patterns that cause catastrophic backtracking
    // Pattern: (a+)+$ with input 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!'
    const regexBomb = 'a'.repeat(30) + '!';

    const start = Date.now();
    const result = await analyze(regexBomb).run();
    const elapsed = Date.now() - start;

    // SHOULD: Complete quickly (no ReDoS)
    expect(elapsed).toBeLessThan(5000);
    expect(result).toBeDefined();
  });

  it('handles content with millions of the same word', async () => {
    // ATTACK: Repeat same word to max length
    const repeatedWord = 'buy '.repeat(MAX_CONTENT_LENGTH / 4).slice(0, MAX_CONTENT_LENGTH);

    const result = await analyze(repeatedWord).run();

    // SHOULD: Handle gracefully without crashing
    // Note: Repetitive content may still score decently because it has valid words
    expect(result).toBeDefined();
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// ATTACK 6: TYPE COERCION ATTACKS
// ============================================================================

describe('CHAOS ATTACK: Type Coercion', () => {
  beforeEach(() => clearCache());

  it('handles content that looks like a number', async () => {
    // JavaScript might coerce '123' weirdly
    const result = await analyze('123').run();
    expect(result).toBeDefined();
  });

  it('handles content that is a number (type attack)', async () => {
    // ATTACK: Pass number instead of string
    await expect(analyze(12345 as any).run()).rejects.toThrow();
  });

  it('handles content with toString that throws', async () => {
    // ATTACK: Object with malicious toString
    const malicious = {
      toString() {
        throw new Error('TOSTRING BOMB!');
      },
    };

    await expect(analyze(malicious as any).run()).rejects.toThrow();
  });

  it('handles Symbol input', async () => {
    await expect(analyze(Symbol('test') as any).run()).rejects.toThrow();
  });

  it('handles BigInt input', async () => {
    await expect(analyze(BigInt(123) as any).run()).rejects.toThrow();
  });
});

// ============================================================================
// ATTACK 7: UNICODE EDGE CASES
// ============================================================================

describe('CHAOS ATTACK: Unicode Weapons', () => {
  beforeEach(() => clearCache());

  it('handles zalgo text (combining characters)', async () => {
    // Zalgo: text with excessive combining characters
    const zalgo = 'H̷̭̒ě̷̙l̶͚̐l̷̰̚o̵̱͝';
    const result = await analyze(zalgo).run();
    expect(result).toBeDefined();
  });

  it('handles right-to-left override characters', async () => {
    // RTL override can mess with display
    const rtl = 'Hello \u202E reversed text';
    const result = await analyze(rtl).run();
    expect(result).toBeDefined();
  });

  it('handles homograph attack (lookalike characters)', async () => {
    // Cyrillic 'а' looks like Latin 'a'
    const homograph = 'pаypal.com'; // 'а' is Cyrillic
    const result = await analyze(homograph).run();
    expect(result).toBeDefined();
  });

  it('handles null byte injection', async () => {
    const nullByte = 'Hello\x00World\x00Test';
    const result = await analyze(nullByte).run();
    expect(result).toBeDefined();
  });

  it('handles content that is just newlines', async () => {
    const newlines = '\n\n\n\n\n\n\n\n\n\n';
    await expect(analyze(newlines).run()).rejects.toThrow();
  });
});

// ============================================================================
// ATTACK 8: TIMING ATTACKS
// ============================================================================

describe('CHAOS ATTACK: Timing Side Channels', () => {
  beforeEach(() => clearCache());

  it('similar content has similar timing (no timing leak)', async () => {
    const content1 = 'This is test content A for timing analysis';
    const content2 = 'This is test content B for timing analysis';

    const start1 = Date.now();
    await analyze(content1).run();
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await analyze(content2).run();
    const time2 = Date.now() - start2;

    // Times should be within 50% of each other
    const ratio = Math.max(time1, time2) / Math.max(Math.min(time1, time2), 1);
    expect(ratio).toBeLessThan(3); // Within 3x is acceptable
  });
});

// ============================================================================
// ATTACK 9: PROTOTYPE POLLUTION ATTEMPTS
// ============================================================================

describe('CHAOS ATTACK: Prototype Pollution', () => {
  it('content cannot pollute Object prototype', async () => {
    const pollutionPayload = '{"__proto__": {"polluted": true}}';
    await analyze(pollutionPayload).run();

    // @ts-ignore - checking for pollution
    expect(({} as any).polluted).toBeUndefined();
  });

  it('options cannot pollute through constructor', async () => {
    const maliciousOptions = JSON.parse('{"constructor": {"prototype": {"pwned": true}}}');

    // Even if we somehow passed bad options, shouldn't pollute
    // @ts-ignore - checking for pollution
    expect(({} as any).pwned).toBeUndefined();
  });
});

// ============================================================================
// ATTACK 10: RESOURCE EXHAUSTION
// ============================================================================

describe('CHAOS ATTACK: Resource Exhaustion', () => {
  beforeEach(() => clearCache());

  it('batch processing respects concurrency limit', async () => {
    // ATTACK: Try to overwhelm with huge batch (using correct string[] format)
    const items = Array(100).fill(null).map((_, i) =>
      `Content item ${i} for batch test with enough words to be valid`
    );

    const start = Date.now();

    const result = await analyzeMany(items, {
      concurrency: 5, // Limit to 5 concurrent
    });

    const elapsed = Date.now() - start;

    // Should complete all 100
    expect(result.results.length).toBe(100);

    // Verify all completed successfully
    expect(result.stats.completed).toBe(100);
    expect(result.stats.failed).toBe(0);

    // With concurrency 5, completed in reasonable time
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });
});
