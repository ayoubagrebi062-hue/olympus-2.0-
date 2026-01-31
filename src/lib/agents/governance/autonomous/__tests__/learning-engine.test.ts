/**
 * Learning Engine Tests
 *
 * Comprehensive tests for the adaptive intelligence engine:
 * - Outcome recording and stats computation
 * - False positive / recurrence tracking
 * - Confidence recording and averaging
 * - Threshold suggestion rules (suppress, escalate, auto-fix)
 * - JSON persistence round-trip (save/load)
 * - Dispose cleanup
 * - Edge cases (unknown pattern, empty data, independent patterns)
 * - Summary API
 * - Max outcomes eviction
 * - getAllPatternStats ordering
 *
 * @module governance/tests/learning-engine
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LearningEngine, type DecisionOutcome } from '../learning-engine';

// ============================================================================
// TEST HELPERS
// ============================================================================

let tmpDir: string;
let engine: LearningEngine;

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'learning-engine-test-'));
}

function persistPath(dir: string): string {
  return path.join(dir, 'learning-data.json');
}

function createOutcome(overrides: Partial<DecisionOutcome> = {}): DecisionOutcome {
  return {
    violationId: overrides.violationId ?? `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pattern: overrides.pattern ?? 'sql_injection',
    action: overrides.action ?? 'block',
    result: overrides.result ?? 'fixed',
    timestamp: overrides.timestamp ?? Date.now(),
  };
}

/**
 * Helper: record N outcomes for a pattern with a specific result distribution.
 */
function recordMany(
  eng: LearningEngine,
  pattern: string,
  count: number,
  result: DecisionOutcome['result'],
  action = 'block'
): void {
  for (let i = 0; i < count; i++) {
    eng.recordOutcome(
      createOutcome({ pattern, result, action, timestamp: Date.now() + i })
    );
  }
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() => {
  tmpDir = makeTmpDir();
  engine = new LearningEngine({
    persistPath: persistPath(tmpDir),
    autoPersistIntervalMs: 0, // disable auto-persist timer in tests
  });
});

afterEach(() => {
  engine.dispose();
  // Cleanup temp directory
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

// ============================================================================
// RECORD OUTCOME & STATS
// ============================================================================

describe('LearningEngine', () => {
  describe('recordOutcome and getPatternStats', () => {
    it('should record a single outcome and reflect it in stats', () => {
      const ts = Date.now();
      engine.recordOutcome(
        createOutcome({ pattern: 'xss', result: 'fixed', action: 'sanitize', timestamp: ts })
      );

      const stats = engine.getPatternStats('xss');
      expect(stats).not.toBeNull();
      expect(stats!.pattern).toBe('xss');
      expect(stats!.totalDecisions).toBe(1);
      expect(stats!.successRate).toBe(1); // 1 fixed / 1 total
      expect(stats!.falsePositiveRate).toBe(0);
      expect(stats!.recurrenceRate).toBe(0);
      expect(stats!.lastSeen).toBe(ts);
      expect(stats!.actionBreakdown).toEqual({ sanitize: 1 });
    });

    it('should accumulate multiple outcomes for the same pattern', () => {
      engine.recordOutcome(createOutcome({ pattern: 'xss', result: 'fixed', action: 'block' }));
      engine.recordOutcome(createOutcome({ pattern: 'xss', result: 'fixed', action: 'block' }));
      engine.recordOutcome(createOutcome({ pattern: 'xss', result: 'recurred', action: 'alert-human' }));

      const stats = engine.getPatternStats('xss');
      expect(stats).not.toBeNull();
      expect(stats!.totalDecisions).toBe(3);
      expect(stats!.successRate).toBeCloseTo(2 / 3);
      expect(stats!.recurrenceRate).toBeCloseTo(1 / 3);
      expect(stats!.actionBreakdown).toEqual({ block: 2, 'alert-human': 1 });
    });
  });

  // ============================================================================
  // FALSE POSITIVE TRACKING
  // ============================================================================

  describe('false positive tracking', () => {
    it('should track false positive rate correctly', () => {
      // 3 false positives out of 5 total
      recordMany(engine, 'auth_bypass', 3, 'false_positive');
      recordMany(engine, 'auth_bypass', 2, 'fixed');

      const stats = engine.getPatternStats('auth_bypass');
      expect(stats).not.toBeNull();
      expect(stats!.totalDecisions).toBe(5);
      expect(stats!.falsePositiveRate).toBeCloseTo(3 / 5);
      expect(stats!.successRate).toBeCloseTo(2 / 5);
    });

    it('should report zero false positive rate when none exist', () => {
      recordMany(engine, 'clean_pattern', 10, 'fixed');

      const stats = engine.getPatternStats('clean_pattern');
      expect(stats).not.toBeNull();
      expect(stats!.falsePositiveRate).toBe(0);
    });
  });

  // ============================================================================
  // RECURRENCE TRACKING
  // ============================================================================

  describe('recurrence tracking', () => {
    it('should track recurrence rate correctly', () => {
      // 4 recurred out of 8 total
      recordMany(engine, 'race_condition', 4, 'recurred');
      recordMany(engine, 'race_condition', 4, 'fixed');

      const stats = engine.getPatternStats('race_condition');
      expect(stats).not.toBeNull();
      expect(stats!.recurrenceRate).toBeCloseTo(0.5);
    });
  });

  // ============================================================================
  // CONFIDENCE RECORDING
  // ============================================================================

  describe('recordConfidence', () => {
    it('should record confidence values and compute average', () => {
      engine.recordConfidence('xss', 0.8);
      engine.recordConfidence('xss', 0.9);
      engine.recordConfidence('xss', 1.0);

      // Need at least one outcome for getPatternStats to return non-null
      engine.recordOutcome(createOutcome({ pattern: 'xss', result: 'fixed' }));

      const stats = engine.getPatternStats('xss');
      expect(stats).not.toBeNull();
      expect(stats!.avgConfidence).toBeCloseTo((0.8 + 0.9 + 1.0) / 3);
    });

    it('should return zero avgConfidence when no confidences recorded', () => {
      engine.recordOutcome(createOutcome({ pattern: 'no_conf', result: 'fixed' }));

      const stats = engine.getPatternStats('no_conf');
      expect(stats).not.toBeNull();
      expect(stats!.avgConfidence).toBe(0);
    });
  });

  // ============================================================================
  // THRESHOLD SUGGESTIONS
  // ============================================================================

  describe('suggestThresholdAdjustments', () => {
    it('should return empty array when no patterns have data', () => {
      const suggestions = engine.suggestThresholdAdjustments();
      expect(suggestions).toEqual([]);
    });

    it('should return empty array when patterns have fewer than 10 outcomes', () => {
      recordMany(engine, 'minor', 9, 'false_positive');

      const suggestions = engine.suggestThresholdAdjustments();
      expect(suggestions).toEqual([]);
    });

    it('should suggest suppress when false positive rate > 80% over 20+ decisions', () => {
      // 18 false positives + 2 fixed = 20 total, 90% false positive rate
      recordMany(engine, 'noisy_rule', 18, 'false_positive');
      recordMany(engine, 'noisy_rule', 2, 'fixed');

      const suggestions = engine.suggestThresholdAdjustments();
      expect(suggestions.length).toBeGreaterThanOrEqual(1);

      const suppress = suggestions.find(
        s => s.pattern === 'noisy_rule' && s.suggestedAction === 'suppress'
      );
      expect(suppress).toBeDefined();
      expect(suppress!.reason).toContain('false positive rate');
      expect(suppress!.confidence).toBeGreaterThan(0);
      expect(suppress!.confidence).toBeLessThanOrEqual(0.95);
    });

    it('should NOT suggest suppress when false positive rate is 80% but under 20 samples', () => {
      // 15 total: 13 false positives (86%) but only 15 decisions (< 20 threshold)
      recordMany(engine, 'borderline', 13, 'false_positive');
      recordMany(engine, 'borderline', 2, 'fixed');

      const suggestions = engine.suggestThresholdAdjustments();
      const suppress = suggestions.find(
        s => s.pattern === 'borderline' && s.suggestedAction === 'suppress'
      );
      expect(suppress).toBeUndefined();
    });

    it('should suggest alert-human when recurrence rate > 50% over 15+ decisions', () => {
      // 10 recurred + 5 fixed = 15 total, ~67% recurrence
      recordMany(engine, 'stubborn_bug', 10, 'recurred');
      recordMany(engine, 'stubborn_bug', 5, 'fixed');

      const suggestions = engine.suggestThresholdAdjustments();
      const escalate = suggestions.find(
        s => s.pattern === 'stubborn_bug' && s.suggestedAction === 'alert-human'
      );
      expect(escalate).toBeDefined();
      expect(escalate!.reason).toContain('recurrence rate');
    });

    it('should suggest auto-fix when success rate > 90% over 30+ decisions with non-auto-fix action', () => {
      // 28 fixed + 2 recurred = 30 total, ~93% success rate, action = "block" (not auto-fix)
      recordMany(engine, 'reliable_fix', 28, 'fixed', 'block');
      recordMany(engine, 'reliable_fix', 2, 'recurred', 'block');

      const suggestions = engine.suggestThresholdAdjustments();
      const autofix = suggestions.find(
        s => s.pattern === 'reliable_fix' && s.suggestedAction === 'auto-fix'
      );
      expect(autofix).toBeDefined();
      expect(autofix!.reason).toContain('success rate');
      expect(autofix!.currentAction).toBe('block');
    });

    it('should NOT suggest auto-fix when current action is already auto-fix', () => {
      // 30 fixed with action "auto-fix", 93% success rate
      recordMany(engine, 'already_auto', 28, 'fixed', 'auto-fix');
      recordMany(engine, 'already_auto', 2, 'recurred', 'auto-fix');

      const suggestions = engine.suggestThresholdAdjustments();
      const autofix = suggestions.find(
        s => s.pattern === 'already_auto' && s.suggestedAction === 'auto-fix'
      );
      expect(autofix).toBeUndefined();
    });

    it('should sort suggestions by confidence descending', () => {
      // Pattern A: 90% false positive (high confidence suppress)
      recordMany(engine, 'pattern_a', 18, 'false_positive');
      recordMany(engine, 'pattern_a', 2, 'fixed');

      // Pattern B: 60% recurrence (moderate confidence escalate)
      recordMany(engine, 'pattern_b', 9, 'recurred');
      recordMany(engine, 'pattern_b', 6, 'fixed');

      const suggestions = engine.suggestThresholdAdjustments();
      if (suggestions.length >= 2) {
        for (let i = 1; i < suggestions.length; i++) {
          expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
        }
      }
    });
  });

  // ============================================================================
  // PERSISTENCE (SAVE / LOAD ROUND-TRIP)
  // ============================================================================

  describe('persistence', () => {
    it('should save to disk and load from disk in round-trip', () => {
      const pp = persistPath(tmpDir);

      engine.recordOutcome(createOutcome({ pattern: 'persist_test', result: 'fixed', action: 'block', timestamp: 1000 }));
      engine.recordConfidence('persist_test', 0.85);
      engine.saveToDisk();

      // Verify file was created
      expect(fs.existsSync(pp)).toBe(true);

      // Create a new engine from the same persist path
      const engine2 = new LearningEngine({
        persistPath: pp,
        autoPersistIntervalMs: 0,
      });

      const stats = engine2.getPatternStats('persist_test');
      expect(stats).not.toBeNull();
      expect(stats!.totalDecisions).toBe(1);
      expect(stats!.successRate).toBe(1);
      expect(stats!.avgConfidence).toBeCloseTo(0.85);
      expect(stats!.lastSeen).toBe(1000);

      engine2.dispose();
    });

    it('should handle loading from non-existent file gracefully', () => {
      const nonExistent = path.join(tmpDir, 'does-not-exist', 'data.json');

      // Should not throw
      const eng = new LearningEngine({
        persistPath: nonExistent,
        autoPersistIntervalMs: 0,
      });

      expect(eng.getPatternStats('anything')).toBeNull();
      eng.dispose();
    });

    it('should handle loading from corrupt file gracefully', () => {
      const pp = persistPath(tmpDir);
      fs.writeFileSync(pp, 'NOT VALID JSON {{{', 'utf-8');

      // Should not throw, starts fresh
      const eng = new LearningEngine({
        persistPath: pp,
        autoPersistIntervalMs: 0,
      });

      expect(eng.getPatternStats('anything')).toBeNull();
      eng.dispose();
    });

    it('should create parent directories on save', () => {
      const deep = path.join(tmpDir, 'a', 'b', 'c', 'data.json');
      const eng = new LearningEngine({
        persistPath: deep,
        autoPersistIntervalMs: 0,
      });

      eng.recordOutcome(createOutcome({ pattern: 'deep_save' }));
      eng.saveToDisk();

      expect(fs.existsSync(deep)).toBe(true);
      eng.dispose();
    });

    it('should persist valid JSON with version field', () => {
      const pp = persistPath(tmpDir);

      engine.recordOutcome(createOutcome({ pattern: 'json_check', result: 'fixed' }));
      engine.saveToDisk();

      const raw = fs.readFileSync(pp, 'utf-8');
      const data = JSON.parse(raw);
      expect(data.version).toBe('1.0.0');
      expect(typeof data.lastSaved).toBe('number');
      expect(data.patterns).toBeDefined();
      expect(data.patterns['json_check']).toBeDefined();
    });
  });

  // ============================================================================
  // DISPOSE
  // ============================================================================

  describe('dispose', () => {
    it('should save data and stop timer on dispose', () => {
      const pp = persistPath(tmpDir);
      // Create engine with auto-persist to verify timer gets cleared
      const eng = new LearningEngine({
        persistPath: pp,
        autoPersistIntervalMs: 60000,
      });

      eng.recordOutcome(createOutcome({ pattern: 'dispose_test', result: 'escalated' }));
      eng.dispose();

      // Data should have been saved on dispose
      expect(fs.existsSync(pp)).toBe(true);
      const data = JSON.parse(fs.readFileSync(pp, 'utf-8'));
      expect(data.patterns['dispose_test']).toBeDefined();
    });

    it('should handle double dispose without error', () => {
      engine.dispose();
      // Second dispose should not throw
      expect(() => engine.dispose()).not.toThrow();
    });
  });

  // ============================================================================
  // UNKNOWN PATTERN
  // ============================================================================

  describe('unknown pattern', () => {
    it('should return null for getPatternStats on an unknown pattern', () => {
      const stats = engine.getPatternStats('never_seen_before');
      expect(stats).toBeNull();
    });

    it('should return null for pattern with confidences but no outcomes', () => {
      engine.recordConfidence('conf_only', 0.9);
      const stats = engine.getPatternStats('conf_only');
      expect(stats).toBeNull();
    });
  });

  // ============================================================================
  // MULTIPLE PATTERNS INDEPENDENCE
  // ============================================================================

  describe('multiple patterns tracked independently', () => {
    it('should track separate stats for each pattern', () => {
      recordMany(engine, 'sql_injection', 5, 'fixed');
      recordMany(engine, 'xss', 3, 'false_positive');
      recordMany(engine, 'auth_bypass', 2, 'recurred');

      const sqlStats = engine.getPatternStats('sql_injection');
      const xssStats = engine.getPatternStats('xss');
      const authStats = engine.getPatternStats('auth_bypass');

      expect(sqlStats!.totalDecisions).toBe(5);
      expect(sqlStats!.successRate).toBe(1);
      expect(sqlStats!.falsePositiveRate).toBe(0);

      expect(xssStats!.totalDecisions).toBe(3);
      expect(xssStats!.falsePositiveRate).toBe(1);
      expect(xssStats!.successRate).toBe(0);

      expect(authStats!.totalDecisions).toBe(2);
      expect(authStats!.recurrenceRate).toBe(1);
      expect(authStats!.successRate).toBe(0);
    });

    it('should keep confidence values independent per pattern', () => {
      engine.recordConfidence('pattern_a', 0.5);
      engine.recordConfidence('pattern_b', 1.0);

      engine.recordOutcome(createOutcome({ pattern: 'pattern_a', result: 'fixed' }));
      engine.recordOutcome(createOutcome({ pattern: 'pattern_b', result: 'fixed' }));

      const statsA = engine.getPatternStats('pattern_a');
      const statsB = engine.getPatternStats('pattern_b');

      expect(statsA!.avgConfidence).toBeCloseTo(0.5);
      expect(statsB!.avgConfidence).toBeCloseTo(1.0);
    });
  });

  // ============================================================================
  // getSummary
  // ============================================================================

  describe('getSummary', () => {
    it('should return empty summary for fresh engine', () => {
      const summary = engine.getSummary();
      expect(summary.totalPatterns).toBe(0);
      expect(summary.totalOutcomes).toBe(0);
      expect(summary.topPatterns).toEqual([]);
    });

    it('should return correct summary with multiple patterns', () => {
      recordMany(engine, 'alpha', 10, 'fixed');
      recordMany(engine, 'beta', 5, 'fixed');
      recordMany(engine, 'gamma', 1, 'fixed');

      const summary = engine.getSummary();
      expect(summary.totalPatterns).toBe(3);
      expect(summary.totalOutcomes).toBe(16);
      expect(summary.topPatterns.length).toBe(3);
      // Should be sorted descending by count
      expect(summary.topPatterns[0].pattern).toBe('alpha');
      expect(summary.topPatterns[0].count).toBe(10);
      expect(summary.topPatterns[1].pattern).toBe('beta');
      expect(summary.topPatterns[2].pattern).toBe('gamma');
    });

    it('should limit topPatterns to 10', () => {
      for (let i = 0; i < 15; i++) {
        recordMany(engine, `pattern_${i}`, i + 1, 'fixed');
      }

      const summary = engine.getSummary();
      expect(summary.totalPatterns).toBe(15);
      expect(summary.topPatterns.length).toBe(10);
    });
  });

  // ============================================================================
  // getAllPatternStats
  // ============================================================================

  describe('getAllPatternStats', () => {
    it('should return empty array for fresh engine', () => {
      expect(engine.getAllPatternStats()).toEqual([]);
    });

    it('should return stats sorted by totalDecisions descending', () => {
      recordMany(engine, 'small', 2, 'fixed');
      recordMany(engine, 'large', 20, 'fixed');
      recordMany(engine, 'medium', 10, 'fixed');

      const all = engine.getAllPatternStats();
      expect(all.length).toBe(3);
      expect(all[0].pattern).toBe('large');
      expect(all[1].pattern).toBe('medium');
      expect(all[2].pattern).toBe('small');
    });
  });

  // ============================================================================
  // MAX OUTCOMES EVICTION
  // ============================================================================

  describe('max outcomes per pattern', () => {
    it('should evict oldest outcomes when maxOutcomesPerPattern is exceeded', () => {
      const eng = new LearningEngine({
        persistPath: persistPath(tmpDir),
        maxOutcomesPerPattern: 5,
        autoPersistIntervalMs: 0,
      });

      // Record 7 outcomes; oldest 2 should be evicted
      for (let i = 0; i < 7; i++) {
        eng.recordOutcome(
          createOutcome({
            pattern: 'evict_test',
            result: i < 2 ? 'false_positive' : 'fixed',
            timestamp: 1000 + i,
          })
        );
      }

      const stats = eng.getPatternStats('evict_test');
      expect(stats!.totalDecisions).toBe(5);
      // The 2 oldest (false_positive) were evicted, only 'fixed' remain
      expect(stats!.falsePositiveRate).toBe(0);
      expect(stats!.successRate).toBe(1);
      // lastSeen should be the most recent timestamp
      expect(stats!.lastSeen).toBe(1006);

      eng.dispose();
    });

    it('should also evict oldest confidence values when limit exceeded', () => {
      const eng = new LearningEngine({
        persistPath: persistPath(tmpDir),
        maxOutcomesPerPattern: 3,
        autoPersistIntervalMs: 0,
      });

      // Record 5 confidences; oldest 2 should be evicted
      eng.recordConfidence('conf_evict', 0.1);
      eng.recordConfidence('conf_evict', 0.2);
      eng.recordConfidence('conf_evict', 0.7);
      eng.recordConfidence('conf_evict', 0.8);
      eng.recordConfidence('conf_evict', 0.9);

      // Need an outcome for stats
      eng.recordOutcome(createOutcome({ pattern: 'conf_evict', result: 'fixed' }));

      const stats = eng.getPatternStats('conf_evict');
      // Only last 3 confidences: 0.7, 0.8, 0.9
      expect(stats!.avgConfidence).toBeCloseTo((0.7 + 0.8 + 0.9) / 3);

      eng.dispose();
    });
  });

  // ============================================================================
  // ACTION BREAKDOWN
  // ============================================================================

  describe('action breakdown', () => {
    it('should correctly count multiple actions for a pattern', () => {
      engine.recordOutcome(createOutcome({ pattern: 'mixed', action: 'block', result: 'fixed' }));
      engine.recordOutcome(createOutcome({ pattern: 'mixed', action: 'block', result: 'fixed' }));
      engine.recordOutcome(createOutcome({ pattern: 'mixed', action: 'alert-human', result: 'escalated' }));
      engine.recordOutcome(createOutcome({ pattern: 'mixed', action: 'auto-fix', result: 'fixed' }));

      const stats = engine.getPatternStats('mixed');
      expect(stats!.actionBreakdown).toEqual({
        block: 2,
        'alert-human': 1,
        'auto-fix': 1,
      });
    });
  });

  // ============================================================================
  // LAST SEEN TIMESTAMP
  // ============================================================================

  describe('lastSeen tracking', () => {
    it('should report the timestamp of the most recent outcome', () => {
      engine.recordOutcome(createOutcome({ pattern: 'ts_test', timestamp: 100 }));
      engine.recordOutcome(createOutcome({ pattern: 'ts_test', timestamp: 500 }));
      engine.recordOutcome(createOutcome({ pattern: 'ts_test', timestamp: 300 }));

      const stats = engine.getPatternStats('ts_test');
      // lastSeen is the last element in the outcomes array (insertion order)
      expect(stats!.lastSeen).toBe(300);
    });
  });

  // ============================================================================
  // RESULT TYPE COVERAGE
  // ============================================================================

  describe('all result types', () => {
    it('should handle escalated and unknown result types in stats', () => {
      engine.recordOutcome(createOutcome({ pattern: 'all_results', result: 'fixed' }));
      engine.recordOutcome(createOutcome({ pattern: 'all_results', result: 'false_positive' }));
      engine.recordOutcome(createOutcome({ pattern: 'all_results', result: 'recurred' }));
      engine.recordOutcome(createOutcome({ pattern: 'all_results', result: 'escalated' }));
      engine.recordOutcome(createOutcome({ pattern: 'all_results', result: 'unknown' }));

      const stats = engine.getPatternStats('all_results');
      expect(stats!.totalDecisions).toBe(5);
      expect(stats!.successRate).toBeCloseTo(1 / 5);
      expect(stats!.falsePositiveRate).toBeCloseTo(1 / 5);
      expect(stats!.recurrenceRate).toBeCloseTo(1 / 5);
    });
  });
});
