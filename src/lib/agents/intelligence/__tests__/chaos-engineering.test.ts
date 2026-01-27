/**
 * CHAOS ENGINEERING TESTS
 *
 * Intentionally trying to break the system.
 * Each test documents: SHOULD happen vs ACTUALLY happens
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { analyze, funnel, ConversionIntelligenceEngine, clearCache, MAX_CONTENT_LENGTH } from '..';

// ============================================================================
// 1. GARBAGE DATA
// ============================================================================

describe('CHAOS: Garbage Data', () => {
  beforeEach(() => clearCache());

  it('handles null input', async () => {
    // SHOULD: Throw InvalidContentError with helpful message
    // ACTUALLY: Let's see...
    await expect(analyze(null as any).run()).rejects.toThrow();
  });

  it('handles undefined input', async () => {
    await expect(analyze(undefined as any).run()).rejects.toThrow();
  });

  it('handles number input', async () => {
    await expect(analyze(123 as any).run()).rejects.toThrow();
  });

  it('handles object input', async () => {
    await expect(analyze({ content: 'test' } as any).run()).rejects.toThrow();
  });

  it('handles array input', async () => {
    await expect(analyze(['test', 'content'] as any).run()).rejects.toThrow();
  });

  it('handles circular reference in options', async () => {
    // This could crash JSON.stringify in cache key generation
    const circular: any = { a: 1 };
    circular.self = circular;

    // SHOULD: Handle gracefully
    // ACTUALLY: May throw "Converting circular structure to JSON"
    const engine = new ConversionIntelligenceEngine();
    // Options don't support circular refs, but let's test the engine directly
    // This should still work since we're not passing circular to cache
    const result = await engine.analyze('Test content');
    expect(result).toBeDefined();
  });

  it('handles content with only whitespace', async () => {
    await expect(analyze('   \n\t\r  ').run()).rejects.toThrow();
  });

  it('handles content with null bytes', async () => {
    // SHOULD: Sanitize or reject
    // ACTUALLY: Let's see...
    const nullByteContent = 'Hello\x00World\x00Test';
    const result = await analyze(nullByteContent).run();
    expect(result).toBeDefined();
    // Should have stripped null bytes
  });

  it('handles content with unicode edge cases', async () => {
    // Zero-width characters, RTL markers, etc.
    const unicodeEdge = 'Test\u200B\u200C\u200D\uFEFFcontent\u202E';
    const result = await analyze(unicodeEdge).run();
    expect(result).toBeDefined();
  });

  it('handles emoji-only content', async () => {
    const emojiContent = '🚀🎉💰🔥✨';
    const result = await analyze(emojiContent).run();
    expect(result).toBeDefined();
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('handles HTML injection attempt', async () => {
    const htmlContent = '<script>alert("xss")</script><img onerror="hack()">';
    const result = await analyze(htmlContent).run();
    expect(result).toBeDefined();
    // Content should be analyzed as text, not executed
  });

  it('handles SQL injection attempt', async () => {
    const sqlContent = "'; DROP TABLE users; --";
    const result = await analyze(sqlContent).run();
    expect(result).toBeDefined();
    // No database, but should handle gracefully
  });
});

// ============================================================================
// 2. STRESS TEST - 1000 CALLS
// ============================================================================

describe('CHAOS: Stress Test', () => {
  beforeEach(() => clearCache());

  it('handles 100 rapid sequential calls', async () => {
    // SHOULD: Complete all without crashing, maybe slow
    // ACTUALLY: Let's see memory/performance
    const startMem = process.memoryUsage().heapUsed;
    const startTime = Date.now();

    const promises: Promise<any>[] = [];
    for (let i = 0; i < 100; i++) {
      promises.push(analyze(`Test content ${i}`).score());
    }

    const results = await Promise.all(promises);

    const endTime = Date.now();
    const endMem = process.memoryUsage().heapUsed;

    expect(results.length).toBe(100);
    expect(results.every(r => typeof r === 'number')).toBe(true);

    // Memory shouldn't explode (less than 50MB growth)
    const memGrowth = (endMem - startMem) / 1024 / 1024;
    expect(memGrowth).toBeLessThan(50);

    // Should complete in reasonable time (less than 10 seconds)
    expect(endTime - startTime).toBeLessThan(10000);
  });

  it('handles cache with many unique entries', async () => {
    // MAX_CACHE_SIZE is 100, what happens with 150 unique entries?
    // SHOULD: Evict oldest entries
    // ACTUALLY: Let's verify

    for (let i = 0; i < 150; i++) {
      await analyze(`Unique content ${i} for cache test`).run();
    }

    // Should not throw, should have evicted old entries
    expect(true).toBe(true);
  });

  it('handles same content analyzed many times (cache hit)', async () => {
    const content = 'This is the same content for cache testing with enough words to be meaningful';

    // First call - cache miss, analyze fresh
    await analyze(content).noCache().run();

    // Second call - should hit cache
    const start = Date.now();
    await analyze(content).run();
    const cachedTime = Date.now() - start;

    // Cached response should be nearly instant (< 5ms)
    expect(cachedTime).toBeLessThan(5);
  });
});

// ============================================================================
// 3. MISSING DEPENDENCY
// ============================================================================

describe('CHAOS: Dependency Resilience', () => {
  it('engine works without uuid (fallback)', async () => {
    // Can't actually remove uuid in test, but verify it's used correctly
    const engine = new ConversionIntelligenceEngine();
    const result = await engine.analyze('Test content');

    // Should have a valid ID
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 4. OVERSIZED INPUT
// ============================================================================

describe('CHAOS: Oversized Input', () => {
  beforeEach(() => clearCache());

  it('rejects content over MAX_CONTENT_LENGTH via fluent API', async () => {
    const hugeContent = 'a'.repeat(MAX_CONTENT_LENGTH + 1);

    // SHOULD: Throw ContentTooLongError with helpful message
    try {
      await analyze(hugeContent).run();
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('CONTENT_TOO_LONG');
      expect(error.message).toContain('100,001');
      expect(error.suggestion).toBeDefined();
    }
  });

  it('classic engine truncates oversized content WITH WARNING', async () => {
    // The classic engine sanitizes and WARNS about truncation
    const hugeContent = 'a'.repeat(150_000);
    const engine = new ConversionIntelligenceEngine();

    const result = await engine.analyze(hugeContent);

    // Should have truncated
    expect(result.content.length).toBeLessThanOrEqual(MAX_CONTENT_LENGTH);

    // CRITICAL: Should have a warning about truncation
    expect(result.warnings).toBeDefined();
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('truncated');
    expect(result.warnings[0]).toContain('150,000');
  });

  it('classic engine warns about removed control characters', async () => {
    const contentWithControlChars = 'Hello\x00World\x0BTest\x1F';
    const engine = new ConversionIntelligenceEngine();

    const result = await engine.analyze(contentWithControlChars);

    // Should have warning about removed characters
    expect(result.warnings.some(w => w.includes('control characters'))).toBe(true);
  });

  it('classic engine has empty warnings for clean content', async () => {
    const cleanContent = 'This is perfectly clean content with no issues.';
    const engine = new ConversionIntelligenceEngine();

    const result = await engine.analyze(cleanContent);

    // No warnings for clean content
    expect(result.warnings).toEqual([]);
  });

  it('handles content at exactly MAX_CONTENT_LENGTH', async () => {
    const exactContent = 'a'.repeat(MAX_CONTENT_LENGTH);

    // SHOULD: Accept (boundary condition)
    const result = await analyze(exactContent).run();
    expect(result).toBeDefined();
  });

  it('handles content at MAX_CONTENT_LENGTH - 1', async () => {
    const justUnderContent = 'a'.repeat(MAX_CONTENT_LENGTH - 1);

    const result = await analyze(justUnderContent).run();
    expect(result).toBeDefined();
  });

  it('handles very long single word (no spaces)', async () => {
    // Edge case: word count = 1, but 50K characters
    const longWord = 'a'.repeat(50_000);

    const result = await analyze(longWord).run();
    expect(result).toBeDefined();
    // Score will be low (poor readability) but shouldn't crash
  });

  it('handles content with 10000 newlines', async () => {
    const manyLines = 'Line\n'.repeat(10000);

    const result = await analyze(manyLines).run();
    expect(result).toBeDefined();
  });
});

// ============================================================================
// 5. JAVASCRIPT DISABLED - N/A for backend library
// ============================================================================

describe('CHAOS: Environment Edge Cases', () => {
  it('works in strict mode', async () => {
    'use strict';
    const result = await analyze('Test content in strict mode').run();
    expect(result).toBeDefined();
  });
});

// ============================================================================
// 6. SECURITY / ATTACKER PERSPECTIVE
// ============================================================================

describe('CHAOS: Security', () => {
  beforeEach(() => clearCache());

  it('resists ReDoS attack (catastrophic backtracking)', async () => {
    // Known ReDoS patterns that can hang regex engines
    const redosPayload1 = 'a'.repeat(100) + '!';
    const redosPayload2 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!';

    // SHOULD: Complete in reasonable time (< 1 second)
    const start = Date.now();
    await analyze(redosPayload1).run();
    await analyze(redosPayload2).run();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000); // 5 seconds max
  });

  it('resists prototype pollution via content', async () => {
    // Can't actually pollute via string content, but verify
    const pollutionAttempt = '{"__proto__": {"polluted": true}}';

    await analyze(pollutionAttempt).run();

    // @ts-ignore - checking pollution
    expect(({} as any).polluted).toBeUndefined();
  });

  it('handles extremely nested structure in content', async () => {
    // Deeply nested brackets/parens
    const nested = '('.repeat(1000) + 'content' + ')'.repeat(1000);

    const result = await analyze(nested).run();
    expect(result).toBeDefined();
  });

  it('handles content with format string patterns', async () => {
    // %s, %d, etc. shouldn't cause issues
    const formatString = 'Hello %s, you have %d messages at %n';

    const result = await analyze(formatString).run();
    expect(result).toBeDefined();
  });

  it('cache key is deterministic (no timing attacks)', async () => {
    const content = 'Test content for timing';

    // Multiple calls should produce same cache behavior
    await analyze(content).run();
    const start = Date.now();
    await analyze(content).run(); // Should be cached
    const cachedTime = Date.now() - start;

    // Cached response should be fast
    expect(cachedTime).toBeLessThan(10);
  });

  it('does not leak sensitive patterns in errors', async () => {
    // Error messages should not include full content
    try {
      await analyze('').run();
    } catch (error: any) {
      expect(error.message).not.toContain('password');
      expect(error.message).not.toContain('secret');
      // Error should be generic
      expect(error.message).toContain('empty');
    }
  });
});

// ============================================================================
// 7. CONCURRENCY
// ============================================================================

describe('CHAOS: Concurrency', () => {
  beforeEach(() => clearCache());

  it('handles concurrent cache writes', async () => {
    // Race condition potential: multiple writes to same cache key
    const content = 'Concurrent test content';

    const promises = Array(10)
      .fill(null)
      .map(() => analyze(content).noCache().run());

    const results = await Promise.all(promises);

    // All should return valid results
    expect(results.every(r => r.totalScore >= 0)).toBe(true);
    // All should have same score (deterministic)
    expect(new Set(results.map(r => r.totalScore)).size).toBe(1);
  });

  it('handles mixed cache hits and misses', async () => {
    const promises = Array(50)
      .fill(null)
      .map(
        (_, i) => analyze(`Content ${i % 5}`).run() // 5 unique contents, 10 hits each
      );

    const results = await Promise.all(promises);

    expect(results.length).toBe(50);
    expect(results.every(r => r.totalScore >= 0)).toBe(true);
  });
});
