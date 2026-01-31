/**
 * Learning Engine - Adaptive Intelligence for Governance Decisions
 *
 * Tracks decision outcomes (violation -> decision -> result) to learn:
 * - Which patterns are actually dangerous vs false positives
 * - Which actions succeed vs fail
 * - When to adjust thresholds automatically
 *
 * In-memory with periodic JSON file persistence (no external DB needed).
 *
 * @module governance/learning-engine
 * @version 1.0.0
 * @since 2026-01-31
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface DecisionOutcome {
  readonly violationId: string;
  readonly pattern: string;
  readonly action: string;
  readonly result: 'fixed' | 'false_positive' | 'recurred' | 'escalated' | 'unknown';
  readonly timestamp: number;
}

export interface PatternStats {
  readonly pattern: string;
  readonly totalDecisions: number;
  readonly successRate: number;
  readonly falsePositiveRate: number;
  readonly recurrenceRate: number;
  readonly avgConfidence: number;
  readonly lastSeen: number;
  readonly actionBreakdown: Readonly<Record<string, number>>;
}

export interface ThresholdSuggestion {
  readonly pattern: string;
  readonly currentAction: string;
  readonly suggestedAction: string;
  readonly reason: string;
  readonly confidence: number;
}

interface InternalPatternData {
  pattern: string;
  outcomes: DecisionOutcome[];
  confidences: number[];
}

interface PersistenceData {
  version: string;
  lastSaved: number;
  patterns: Record<string, InternalPatternData>;
}

// ============================================================================
// LEARNING ENGINE
// ============================================================================

export class LearningEngine {
  private patterns = new Map<string, InternalPatternData>();
  private readonly persistPath: string;
  private readonly maxOutcomesPerPattern: number;
  private persistTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    options: {
      persistPath?: string;
      maxOutcomesPerPattern?: number;
      autoPersistIntervalMs?: number;
    } = {}
  ) {
    this.persistPath =
      options.persistPath ?? path.join(process.cwd(), '.governance', 'learning-data.json');
    this.maxOutcomesPerPattern = options.maxOutcomesPerPattern ?? 500;

    // Load existing data
    this.loadFromDisk();

    // Auto-persist
    const interval = options.autoPersistIntervalMs ?? 5 * 60 * 1000; // 5 min
    if (interval > 0) {
      this.persistTimer = setInterval(() => this.saveToDisk(), interval);
      // Prevent timer from keeping process alive
      if (this.persistTimer.unref) {
        this.persistTimer.unref();
      }
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Record the outcome of a governance decision.
   */
  recordOutcome(outcome: DecisionOutcome): void {
    const data = this.getOrCreate(outcome.pattern);
    data.outcomes.push(outcome);

    // Trim old outcomes
    if (data.outcomes.length > this.maxOutcomesPerPattern) {
      data.outcomes = data.outcomes.slice(-this.maxOutcomesPerPattern);
    }
  }

  /**
   * Record the confidence of a detection for a pattern.
   */
  recordConfidence(pattern: string, confidence: number): void {
    const data = this.getOrCreate(pattern);
    data.confidences.push(confidence);

    if (data.confidences.length > this.maxOutcomesPerPattern) {
      data.confidences = data.confidences.slice(-this.maxOutcomesPerPattern);
    }
  }

  /**
   * Get statistics for a specific pattern.
   */
  getPatternStats(pattern: string): PatternStats | null {
    const data = this.patterns.get(pattern);
    if (!data || data.outcomes.length === 0) return null;

    const total = data.outcomes.length;
    const fixed = data.outcomes.filter(o => o.result === 'fixed').length;
    const falsePos = data.outcomes.filter(o => o.result === 'false_positive').length;
    const recurred = data.outcomes.filter(o => o.result === 'recurred').length;

    const actionBreakdown: Record<string, number> = {};
    for (const o of data.outcomes) {
      actionBreakdown[o.action] = (actionBreakdown[o.action] ?? 0) + 1;
    }

    const avgConf =
      data.confidences.length > 0
        ? data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length
        : 0;

    return {
      pattern,
      totalDecisions: total,
      successRate: total > 0 ? fixed / total : 0,
      falsePositiveRate: total > 0 ? falsePos / total : 0,
      recurrenceRate: total > 0 ? recurred / total : 0,
      avgConfidence: avgConf,
      lastSeen: data.outcomes[data.outcomes.length - 1]?.timestamp ?? 0,
      actionBreakdown,
    };
  }

  /**
   * Get stats for all tracked patterns.
   */
  getAllPatternStats(): PatternStats[] {
    const results: PatternStats[] = [];
    for (const pattern of this.patterns.keys()) {
      const stats = this.getPatternStats(pattern);
      if (stats) results.push(stats);
    }
    return results.sort((a, b) => b.totalDecisions - a.totalDecisions);
  }

  /**
   * Suggest threshold adjustments based on learned data.
   *
   * Rules:
   * - If false positive rate > 80% over 20+ samples: suggest suppress
   * - If recurrence rate > 50%: suggest escalate
   * - If success rate > 90% over 30+ samples: suggest auto-fix
   */
  suggestThresholdAdjustments(): ThresholdSuggestion[] {
    const suggestions: ThresholdSuggestion[] = [];

    for (const [pattern, data] of this.patterns) {
      const stats = this.getPatternStats(pattern);
      if (!stats || stats.totalDecisions < 10) continue;

      // High false positive rate -> suppress
      if (stats.falsePositiveRate > 0.8 && stats.totalDecisions >= 20) {
        suggestions.push({
          pattern,
          currentAction: this.mostCommonAction(data.outcomes),
          suggestedAction: 'suppress',
          reason: `${(stats.falsePositiveRate * 100).toFixed(0)}% false positive rate over ${stats.totalDecisions} decisions`,
          confidence: Math.min(0.95, stats.falsePositiveRate),
        });
      }

      // High recurrence -> escalate
      if (stats.recurrenceRate > 0.5 && stats.totalDecisions >= 15) {
        suggestions.push({
          pattern,
          currentAction: this.mostCommonAction(data.outcomes),
          suggestedAction: 'alert-human',
          reason: `${(stats.recurrenceRate * 100).toFixed(0)}% recurrence rate — automated fixes not holding`,
          confidence: Math.min(0.9, stats.recurrenceRate),
        });
      }

      // High success with auto-fix -> keep auto-fixing
      if (stats.successRate > 0.9 && stats.totalDecisions >= 30) {
        const currentAction = this.mostCommonAction(data.outcomes);
        if (currentAction !== 'auto-fix') {
          suggestions.push({
            pattern,
            currentAction,
            suggestedAction: 'auto-fix',
            reason: `${(stats.successRate * 100).toFixed(0)}% success rate over ${stats.totalDecisions} decisions — safe to auto-fix`,
            confidence: Math.min(0.95, stats.successRate),
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get summary of engine state.
   */
  getSummary(): {
    totalPatterns: number;
    totalOutcomes: number;
    topPatterns: Array<{ pattern: string; count: number }>;
  } {
    let totalOutcomes = 0;
    const patternCounts: Array<{ pattern: string; count: number }> = [];

    for (const [pattern, data] of this.patterns) {
      totalOutcomes += data.outcomes.length;
      patternCounts.push({ pattern, count: data.outcomes.length });
    }

    return {
      totalPatterns: this.patterns.size,
      totalOutcomes,
      topPatterns: patternCounts.sort((a, b) => b.count - a.count).slice(0, 10),
    };
  }

  /**
   * Force save to disk.
   */
  saveToDisk(): void {
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data: PersistenceData = {
        version: '1.0.0',
        lastSaved: Date.now(),
        patterns: Object.fromEntries(this.patterns),
      };

      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Non-critical: persistence failure doesn't stop the engine
    }
  }

  /**
   * Cleanup: stop auto-persist timer.
   */
  dispose(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
    this.saveToDisk();
  }

  // ============================================================================
  // PRIVATE
  // ============================================================================

  private getOrCreate(pattern: string): InternalPatternData {
    let data = this.patterns.get(pattern);
    if (!data) {
      data = { pattern, outcomes: [], confidences: [] };
      this.patterns.set(pattern, data);
    }
    return data;
  }

  private mostCommonAction(outcomes: DecisionOutcome[]): string {
    const counts: Record<string, number> = {};
    for (const o of outcomes) {
      counts[o.action] = (counts[o.action] ?? 0) + 1;
    }
    let max = 0;
    let best = 'alert-human';
    for (const [action, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        best = action;
      }
    }
    return best;
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.persistPath)) return;

      const raw = fs.readFileSync(this.persistPath, 'utf-8');
      const data = JSON.parse(raw) as PersistenceData;

      if (data.version && data.patterns) {
        for (const [pattern, pData] of Object.entries(data.patterns)) {
          this.patterns.set(pattern, pData);
        }
      }
    } catch {
      // Corrupt file: start fresh
    }
  }
}
