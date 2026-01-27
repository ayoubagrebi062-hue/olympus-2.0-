/**
 * OLYMPUS 2.0 - Intent Gradient Descent Engine (IGDE)
 *
 * Guarantees monotonic improvement of W-ISS-D across builds.
 *
 * Core Principles:
 * - Deterministic
 * - One intent repaired per build
 * - No full re-generation
 * - No retries beyond one attempt
 * - If improvement is impossible → hard fail with proof
 */

import * as fs from 'fs';
import * as path from 'path';
import { IntentCausalChain, IntentSpec, WISSReport } from './intent-graph';

// ============================================
// AXIS DOMINANCE WEIGHTS
// ============================================

/**
 * Axis weights determine the relative importance of each causal axis.
 * Outcome is most critical because without visible effect, nothing else matters.
 */
export const AXIS_DOMINANCE_WEIGHTS = {
  outcome: 2.5,  // Most critical - no outcome = invisible action
  trigger: 2.0,  // Second - no trigger = no entry point
  effect: 1.5,   // Third - no effect = broken chain
  state: 1.0,    // Base - state management
} as const;

/**
 * Priority multipliers for intent criticality
 */
export const PRIORITY_MULTIPLIERS = {
  critical: 4.0,
  high: 2.0,
  medium: 1.0,
  low: 0.5,
} as const;

// ============================================
// EFFECTIVE CRITICALITY CALCULATION
// ============================================

export interface EffectiveCriticality {
  intentId: string;
  requirement: string;
  priority: IntentSpec['priority'];

  // Axis scores (0.0 - 1.0)
  axisScores: {
    trigger: number;
    state: number;
    effect: number;
    outcome: number;
  };

  // Missing axes (score < 1.0)
  missingAxes: Array<'trigger' | 'state' | 'effect' | 'outcome'>;
  missingAxisCount: number;

  // Weighted severity
  axisWeightSum: number;           // Sum of weights for missing axes
  priorityMultiplier: number;      // From PRIORITY_MULTIPLIERS
  effectiveCriticality: number;    // Final computed severity

  // Special flags
  missingOutcome: boolean;         // ALWAYS critical if true
  forcesCritical: boolean;         // Elevated to critical status
}

/**
 * Calculate effective criticality for an intent chain
 */
export function calculateEffectiveCriticality(chain: IntentCausalChain): EffectiveCriticality {
  const { intent, axisScores } = chain;

  // Identify missing axes (score < 1.0)
  const missingAxes: EffectiveCriticality['missingAxes'] = [];
  if (axisScores.trigger < 1.0) missingAxes.push('trigger');
  if (axisScores.state < 1.0) missingAxes.push('state');
  if (axisScores.effect < 1.0) missingAxes.push('effect');
  if (axisScores.outcome < 1.0) missingAxes.push('outcome');

  // Calculate weighted sum of missing axes
  let axisWeightSum = 0;
  for (const axis of missingAxes) {
    axisWeightSum += AXIS_DOMINANCE_WEIGHTS[axis];
  }

  // Get priority multiplier
  const priorityMultiplier = PRIORITY_MULTIPLIERS[intent.priority];

  // Check for missing outcome (always critical)
  const missingOutcome = axisScores.outcome < 1.0;
  const forcesCritical = missingOutcome;

  // Calculate effective criticality
  // Formula: intentPriority × axisWeight × missingAxisCount
  const effectiveCriticality = priorityMultiplier * axisWeightSum * missingAxes.length;

  return {
    intentId: intent.id,
    requirement: intent.requirement,
    priority: intent.priority,
    axisScores,
    missingAxes,
    missingAxisCount: missingAxes.length,
    axisWeightSum,
    priorityMultiplier,
    effectiveCriticality,
    missingOutcome,
    forcesCritical,
  };
}

// ============================================
// WORST-INTENT SELECTOR
// ============================================

export interface WorstIntentSelection {
  selected: EffectiveCriticality | null;
  reason: string;
  allCriticalities: EffectiveCriticality[];
  selectionRank: number;
}

/**
 * Deterministically select the worst intent (highest effectiveCriticality)
 * Tiebreaker: alphabetical by intentId for determinism
 */
export function selectWorstIntent(chains: IntentCausalChain[]): WorstIntentSelection {
  // Calculate criticality for all chains
  const criticalities = chains.map(c => calculateEffectiveCriticality(c));

  // Filter to only those with missing axes
  const withMissingAxes = criticalities.filter(c => c.missingAxisCount > 0);

  if (withMissingAxes.length === 0) {
    return {
      selected: null,
      reason: 'All intents fully satisfied',
      allCriticalities: criticalities,
      selectionRank: 0,
    };
  }

  // Sort by:
  // 1. forcesCritical (missing outcome) first
  // 2. effectiveCriticality descending
  // 3. intentId alphabetically (deterministic tiebreaker)
  const sorted = withMissingAxes.sort((a, b) => {
    // Missing outcome always wins
    if (a.forcesCritical && !b.forcesCritical) return -1;
    if (!a.forcesCritical && b.forcesCritical) return 1;

    // Higher criticality wins
    if (a.effectiveCriticality !== b.effectiveCriticality) {
      return b.effectiveCriticality - a.effectiveCriticality;
    }

    // Deterministic tiebreaker
    return a.intentId.localeCompare(b.intentId);
  });

  const selected = sorted[0];
  const reason = selected.forcesCritical
    ? `Missing OUTCOME (forced critical) - ${selected.requirement.slice(0, 40)}...`
    : `Highest criticality (${selected.effectiveCriticality.toFixed(2)}) - ${selected.requirement.slice(0, 40)}...`;

  return {
    selected,
    reason,
    allCriticalities: criticalities,
    selectionRank: sorted.indexOf(selected) + 1,
  };
}

// ============================================
// INTENT DEBT SYSTEM
// ============================================

export interface IntentDebtEntry {
  intentId: string;
  requirement: string;
  missingAxes: string[];
  attempts: number;
  lastAttempt: Date;
  lastWISSDelta: number;
  debtWeight: number;        // Increases on repeated failure
  firstSeen: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface IntentDebtLedger {
  version: number;
  lastUpdated: Date;
  totalDebt: number;         // Sum of all debtWeights
  entries: IntentDebtEntry[];
  history: Array<{
    timestamp: Date;
    action: 'added' | 'updated' | 'resolved';
    intentId: string;
    delta: number;
  }>;
}

const DEBT_FILE = 'intent-debt.json';
const DEBT_WEIGHT_INCREMENT = 1.5; // Multiply weight on each failure

/**
 * Intent Debt Manager - tracks repair attempts across builds
 */
export class IntentDebtManager {
  private ledger: IntentDebtLedger;
  private basePath: string;

  constructor(buildDir: string) {
    this.basePath = path.join(buildDir, '.olympus');
    fs.mkdirSync(this.basePath, { recursive: true });
    this.ledger = this.load();
  }

  /**
   * Load or create the debt ledger
   */
  private load(): IntentDebtLedger {
    const filePath = path.join(this.basePath, DEBT_FILE);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
    return {
      version: 1,
      lastUpdated: new Date(),
      totalDebt: 0,
      entries: [],
      history: [],
    };
  }

  /**
   * Save the debt ledger
   */
  save(): void {
    this.ledger.lastUpdated = new Date();
    this.ledger.totalDebt = this.ledger.entries
      .filter(e => !e.resolved)
      .reduce((sum, e) => sum + e.debtWeight, 0);

    const filePath = path.join(this.basePath, DEBT_FILE);
    fs.writeFileSync(filePath, JSON.stringify(this.ledger, null, 2));
  }

  /**
   * Record a repair attempt
   */
  recordAttempt(
    intentId: string,
    requirement: string,
    missingAxes: string[],
    wissDelta: number
  ): IntentDebtEntry {
    let entry = this.ledger.entries.find(e => e.intentId === intentId);

    if (!entry) {
      // New debt entry
      entry = {
        intentId,
        requirement,
        missingAxes,
        attempts: 1,
        lastAttempt: new Date(),
        lastWISSDelta: wissDelta,
        debtWeight: 1.0,
        firstSeen: new Date(),
        resolved: false,
      };
      this.ledger.entries.push(entry);
      this.ledger.history.push({
        timestamp: new Date(),
        action: 'added',
        intentId,
        delta: 1.0,
      });
    } else {
      // Update existing entry
      entry.attempts++;
      entry.lastAttempt = new Date();
      entry.lastWISSDelta = wissDelta;
      entry.missingAxes = missingAxes;

      // Increase debt weight on repeated failure
      if (wissDelta <= 0) {
        entry.debtWeight *= DEBT_WEIGHT_INCREMENT;
      }

      this.ledger.history.push({
        timestamp: new Date(),
        action: 'updated',
        intentId,
        delta: wissDelta,
      });
    }

    this.save();
    return entry;
  }

  /**
   * Mark an intent as resolved (fully satisfied)
   */
  resolveIntent(intentId: string): void {
    const entry = this.ledger.entries.find(e => e.intentId === intentId);
    if (entry && !entry.resolved) {
      entry.resolved = true;
      entry.resolvedAt = new Date();
      this.ledger.history.push({
        timestamp: new Date(),
        action: 'resolved',
        intentId,
        delta: -entry.debtWeight,
      });
      this.save();
    }
  }

  /**
   * Get unresolved debt entries sorted by weight
   */
  getUnresolvedDebt(): IntentDebtEntry[] {
    return this.ledger.entries
      .filter(e => !e.resolved)
      .sort((a, b) => b.debtWeight - a.debtWeight);
  }

  /**
   * Get debt weight for a specific intent (for repair prioritization)
   */
  getDebtWeight(intentId: string): number {
    const entry = this.ledger.entries.find(e => e.intentId === intentId);
    return entry?.debtWeight || 1.0;
  }

  /**
   * Get the full ledger
   */
  getLedger(): IntentDebtLedger {
    return this.ledger;
  }

  /**
   * Check if an intent has been attempted before
   */
  hasBeenAttempted(intentId: string): boolean {
    const entry = this.ledger.entries.find(e => e.intentId === intentId);
    return entry ? entry.attempts > 0 : false;
  }

  /**
   * Get attempt count for an intent
   */
  getAttemptCount(intentId: string): number {
    const entry = this.ledger.entries.find(e => e.intentId === intentId);
    return entry?.attempts || 0;
  }
}

// ============================================
// INTENT OPTIMIZATION RESULT
// ============================================

export interface IntentOptimizationResult {
  // Selection
  selectedIntent: string | null;
  selectedReason: string;

  // Score tracking
  previousScore: number;
  newScore: number;
  delta: number;

  // Status
  status: 'IMPROVED' | 'STALLED' | 'FAILED' | 'COMPLETE';
  statusReason: string;

  // Repair details
  repairAttempted: boolean;
  repairAxis: string | null;
  repairFile: string | null;

  // Monotonicity
  monotonicityViolation: boolean;
  violationDetails?: string;
}

// ============================================
// GRADIENT DESCENT SELECTOR
// ============================================

/**
 * Select the next intent to repair using gradient descent logic
 * Factors in both criticality and debt weight
 */
export function selectForGradientDescent(
  chains: IntentCausalChain[],
  debtManager: IntentDebtManager
): WorstIntentSelection {
  // Get base selection
  const baseSelection = selectWorstIntent(chains);

  if (!baseSelection.selected) {
    return baseSelection;
  }

  // Adjust criticalities by debt weight
  const adjustedCriticalities = baseSelection.allCriticalities.map(c => {
    const debtWeight = debtManager.getDebtWeight(c.intentId);
    return {
      ...c,
      effectiveCriticality: c.effectiveCriticality * debtWeight,
    };
  });

  // Re-sort with debt-adjusted criticalities
  const withMissingAxes = adjustedCriticalities.filter(c => c.missingAxisCount > 0);

  if (withMissingAxes.length === 0) {
    return baseSelection;
  }

  const sorted = withMissingAxes.sort((a, b) => {
    if (a.forcesCritical && !b.forcesCritical) return -1;
    if (!a.forcesCritical && b.forcesCritical) return 1;
    if (a.effectiveCriticality !== b.effectiveCriticality) {
      return b.effectiveCriticality - a.effectiveCriticality;
    }
    return a.intentId.localeCompare(b.intentId);
  });

  const selected = sorted[0];

  return {
    selected,
    reason: `Gradient descent: criticality=${selected.effectiveCriticality.toFixed(2)}, debt=${debtManager.getDebtWeight(selected.intentId).toFixed(2)}`,
    allCriticalities: adjustedCriticalities,
    selectionRank: 1,
  };
}

// ============================================
// MONOTONICITY ENFORCER
// ============================================

export interface MonotonicityCheck {
  passed: boolean;
  previousScore: number;
  currentScore: number;
  delta: number;
  violation?: string;
}

/**
 * Check if W-ISS-D improved (monotonicity guarantee)
 */
export function checkMonotonicity(
  previousScore: number,
  currentScore: number
): MonotonicityCheck {
  const delta = currentScore - previousScore;

  if (delta > 0) {
    return {
      passed: true,
      previousScore,
      currentScore,
      delta,
    };
  }

  if (delta === 0) {
    return {
      passed: false,
      previousScore,
      currentScore,
      delta,
      violation: `Non-monotonic intent repair — W-ISS-D stalled at ${currentScore}%`,
    };
  }

  return {
    passed: false,
    previousScore,
    currentScore,
    delta,
    violation: `Non-monotonic intent repair — convergence violated: ${previousScore}% → ${currentScore}% (Δ${delta}%)`,
  };
}

// ============================================
// LOGGING
// ============================================

export function logGradientDescentState(
  selection: WorstIntentSelection,
  debtManager: IntentDebtManager,
  previousWISS: number
): void {
  console.log('[IGDE] ==========================================');
  console.log('[IGDE] INTENT GRADIENT DESCENT ENGINE');
  console.log('[IGDE] ==========================================');
  console.log(`[IGDE] Previous W-ISS-D: ${previousWISS}%`);
  console.log(`[IGDE] Total debt entries: ${debtManager.getUnresolvedDebt().length}`);
  console.log(`[IGDE] Total debt weight: ${debtManager.getLedger().totalDebt.toFixed(2)}`);

  if (selection.selected) {
    const s = selection.selected;
    console.log(`[IGDE] Selected for repair:`);
    console.log(`[IGDE]   Intent: ${s.requirement.slice(0, 50)}...`);
    console.log(`[IGDE]   Priority: ${s.priority}`);
    console.log(`[IGDE]   Criticality: ${s.effectiveCriticality.toFixed(2)}`);
    console.log(`[IGDE]   Missing axes: [${s.missingAxes.join(', ')}]`);
    console.log(`[IGDE]   Debt weight: ${debtManager.getDebtWeight(s.intentId).toFixed(2)}`);
    console.log(`[IGDE]   Forces critical: ${s.forcesCritical}`);
  } else {
    console.log(`[IGDE] No intent selected: ${selection.reason}`);
  }

  console.log('[IGDE] ==========================================');
}
