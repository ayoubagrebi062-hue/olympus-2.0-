/**
 * OLYMPUS 2.0 - Intent Governance Engine (IGE)
 *
 * The Final Arbiter. OLYMPUS must not only validate software —
 * it must decide which reality should exist.
 *
 * Rules:
 * - Deterministic subset selection (no randomness, no ML)
 * - Maximize total value under constraints
 * - Subject to: stability, trust, feasibility
 * - Can EXCLUDE intents to improve ship eligibility
 */

import { IntentCausalChain, IntentSpec, CRITICALITY_WEIGHTS } from './intent-graph';
import { IntentUVDScore, SystemUVDResult, UVD_THRESHOLDS } from './user-value-density';
import { StabilityEnvelopeResult } from './stability-envelope';
import { ITGCLAnalysisResult, IntentNode, IntentEdge } from './intent-topology';

// ============================================
// INTENT COST MODEL
// ============================================

/**
 * Cost components for an intent
 */
export interface IntentCostComponents {
  /** Complexity: based on chain depth, state count, outcomes */
  complexity: number;

  /** External anchors: number of ERA dependencies */
  externalAnchors: number;

  /** Coupling: edges to other intents in topology graph */
  coupling: number;

  /** Trust deficit: 1 - average trust score of external anchors */
  trustDeficit: number;

  /** Stability impact: how much this intent affects SSI */
  stabilityImpact: number;
}

/**
 * Cost weights (sum to 1.0)
 */
export const COST_WEIGHTS = Object.freeze({
  complexity: 0.25,
  externalAnchors: 0.20,
  coupling: 0.25,
  trustDeficit: 0.15,
  stabilityImpact: 0.15,
});

/**
 * Computed intent cost
 */
export interface IntentCost {
  intentId: string;
  components: IntentCostComponents;
  totalCost: number;  // 0.0 - 1.0 (normalized)
}

// ============================================
// INTENT VALUE MODEL
// ============================================

/**
 * Value components for an intent
 */
export interface IntentValueComponents {
  /** UVD score (0-1) */
  uvdScore: number;

  /** Priority weight from CRITICALITY_WEIGHTS */
  priorityWeight: number;

  /** Dependency value: how many other intents depend on this */
  dependencyValue: number;

  /** User-facing: is this directly visible to user */
  userFacing: boolean;
}

/**
 * Value weights (sum to 1.0)
 */
export const VALUE_WEIGHTS = Object.freeze({
  uvdScore: 0.50,
  priorityWeight: 0.30,
  dependencyValue: 0.15,
  userFacing: 0.05,
});

/**
 * Computed intent value
 */
export interface IntentValue {
  intentId: string;
  components: IntentValueComponents;
  totalValue: number;  // 0.0 - 1.0 (normalized)
}

// ============================================
// GOVERNANCE CONSTRAINTS
// ============================================

/**
 * Constraints for intent selection
 */
export interface GovernanceConstraints {
  /** Minimum stability (SSI) threshold */
  minStability: number;

  /** Minimum trust score for external anchors */
  minTrust: number;

  /** Maximum allowed coupling density */
  maxCouplingDensity: number;

  /** Critical intents cannot be excluded */
  criticalMandatory: boolean;

  /** Minimum UVD for included intents */
  minIntentUVD: number;

  /** Maximum cost budget (0-1 scale) */
  maxTotalCost: number;
}

/**
 * Default governance constraints
 */
export const DEFAULT_CONSTRAINTS: GovernanceConstraints = Object.freeze({
  minStability: 0.70,        // SSI must be >= 70%
  minTrust: 0.70,            // External anchors must be >= 70% trusted
  maxCouplingDensity: 0.80,  // Coupling density must be < 80%
  criticalMandatory: true,   // Critical intents cannot be excluded
  minIntentUVD: 0.40,        // Intents with UVD < 40% can be excluded
  maxTotalCost: 0.75,        // Total normalized cost must be < 75%
});

// ============================================
// GOVERNANCE DECISION
// ============================================

/**
 * Intent with governance decision
 */
export interface GovernedIntent {
  intentId: string;
  requirement: string;
  priority: IntentSpec['priority'];

  // Value/Cost analysis
  value: IntentValue;
  cost: IntentCost;
  valueToCostratio: number;

  // Decision
  selected: boolean;
  exclusionReason: string | null;

  // Constraints
  violatesStability: boolean;
  violatesTrust: boolean;
  violatesFeasibility: boolean;
}

/**
 * Overall governance result
 */
export interface IntentGovernanceResult {
  // Selected vs excluded
  selectedIntents: GovernedIntent[];
  excludedIntents: GovernedIntent[];

  // Aggregates
  totalValue: number;
  totalCost: number;
  effectiveValueRatio: number;  // totalValue / (1 + totalCost)

  // Constraint satisfaction
  stabilityConstraintMet: boolean;
  trustConstraintMet: boolean;
  feasibilityConstraintMet: boolean;

  // Final decision
  allowsShip: boolean;
  shipBlocker: string | null;
  justification: string;

  // Optimization stats
  optimizationStats: {
    totalIntents: number;
    selectedCount: number;
    excludedCount: number;
    criticalSelected: number;
    criticalExcluded: number;  // Should be 0 if criticalMandatory
    iterationsRun: number;
    improvementAchieved: boolean;
  };
}

// ============================================
// COST COMPUTATION
// ============================================

/**
 * Compute intent cost from available data
 */
export function computeIntentCost(
  chain: IntentCausalChain,
  topology: ITGCLAnalysisResult | null,
  trustScores: Map<string, number>
): IntentCost {
  const intentId = chain.intent.id;

  // Complexity: based on chain depth and expectations
  let complexity = 0;
  if (chain.intent.expectedTrigger) complexity += 0.2;
  if (chain.intent.expectedState) complexity += 0.2;
  if (chain.intent.expectedOutcome) complexity += 0.2;
  if (chain.foundState?.derivedFrom && chain.foundState.derivedFrom.length > 0) {
    complexity += 0.2 * Math.min(chain.foundState.derivedFrom.length, 2);
  }
  complexity = Math.min(1.0, complexity);

  // External anchors: from outcomeScores
  let externalAnchors = 0;
  if (chain.outcomeScores.external !== null) {
    externalAnchors = 0.5;
    if (chain.outcomeScores.trustScore < 0.8) {
      externalAnchors += 0.3;  // Low trust = higher cost
    }
  }

  // Coupling: from topology graph
  let coupling = 0;
  if (topology) {
    const node = topology.graph.nodes.find(n => n.intentId === intentId);
    const edges = topology.graph.edges.filter(
      e => e.sourceIntentId === intentId || e.targetIntentId === intentId
    );
    if (node && edges.length > 0) {
      // Normalize by total possible connections
      coupling = Math.min(1.0, edges.length / Math.max(1, topology.graph.nodeCount - 1));
    }
  }

  // Trust deficit
  const trustScore = trustScores.get(intentId) ?? chain.outcomeScores.trustScore;
  const trustDeficit = 1.0 - trustScore;

  // Stability impact: based on axis scores variance
  const axes = [
    chain.axisScores.trigger,
    chain.axisScores.state,
    chain.axisScores.effect,
    chain.axisScores.outcome,
  ];
  const axisVariance = computeVariance(axes);
  const stabilityImpact = axisVariance;  // High variance = unstable

  const components: IntentCostComponents = {
    complexity,
    externalAnchors,
    coupling,
    trustDeficit,
    stabilityImpact,
  };

  // Compute weighted total
  const totalCost =
    components.complexity * COST_WEIGHTS.complexity +
    components.externalAnchors * COST_WEIGHTS.externalAnchors +
    components.coupling * COST_WEIGHTS.coupling +
    components.trustDeficit * COST_WEIGHTS.trustDeficit +
    components.stabilityImpact * COST_WEIGHTS.stabilityImpact;

  return {
    intentId,
    components,
    totalCost: Math.min(1.0, totalCost),
  };
}

/**
 * Compute variance of values
 */
function computeVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

// ============================================
// VALUE COMPUTATION
// ============================================

/**
 * Compute intent value from available data
 */
export function computeIntentValue(
  chain: IntentCausalChain,
  uvdScore: IntentUVDScore | null,
  topology: ITGCLAnalysisResult | null
): IntentValue {
  const intentId = chain.intent.id;
  const priority = chain.intent.priority;

  // UVD score
  const uvd = uvdScore?.score ?? chain.rawScore;

  // Priority weight (normalized to 0-1)
  const maxWeight = Math.max(...Object.values(CRITICALITY_WEIGHTS));
  const priorityWeight = CRITICALITY_WEIGHTS[priority] / maxWeight;

  // Dependency value: how many other intents depend on this
  let dependencyValue = 0;
  if (topology) {
    const incomingEdges = topology.graph.edges.filter(
      e => e.targetIntentId === intentId && e.type === 'DEPEND'
    );
    dependencyValue = Math.min(1.0, incomingEdges.length * 0.25);
  }

  // User-facing: based on category
  const userFacingCategories = [
    'navigation', 'data_display', 'form_submission', 'feedback', 'error_handling'
  ];
  const userFacing = userFacingCategories.includes(chain.intent.category);

  const components: IntentValueComponents = {
    uvdScore: uvd,
    priorityWeight,
    dependencyValue,
    userFacing,
  };

  // Compute weighted total
  const totalValue =
    components.uvdScore * VALUE_WEIGHTS.uvdScore +
    components.priorityWeight * VALUE_WEIGHTS.priorityWeight +
    components.dependencyValue * VALUE_WEIGHTS.dependencyValue +
    (components.userFacing ? 1.0 : 0.0) * VALUE_WEIGHTS.userFacing;

  return {
    intentId,
    components,
    totalValue: Math.min(1.0, totalValue),
  };
}

// ============================================
// SUBSET SELECTION ALGORITHM
// ============================================

/**
 * Deterministically select optimal intent subset
 *
 * Algorithm:
 * 1. Start with all intents
 * 2. Sort by value-to-cost ratio (descending)
 * 3. Iteratively exclude lowest-value intents that:
 *    - Are not critical (if criticalMandatory)
 *    - Have UVD < minIntentUVD
 *    - Would improve overall ship eligibility
 * 4. Stop when constraints are satisfied or no more can be excluded
 */
export function selectOptimalSubset(
  governedIntents: GovernedIntent[],
  constraints: GovernanceConstraints,
  currentStability: number,
  currentTrust: number
): {
  selected: GovernedIntent[];
  excluded: GovernedIntent[];
  iterationsRun: number;
  improvementAchieved: boolean;
} {
  // Start with all intents selected
  let selected = [...governedIntents];
  let excluded: GovernedIntent[] = [];
  let iterationsRun = 0;
  let improvementAchieved = false;

  // Sort by value-to-cost ratio (ascending - worst first for potential exclusion)
  const sortedByRatio = [...governedIntents].sort(
    (a, b) => a.valueToCostratio - b.valueToCostratio
  );

  // Check if we need optimization
  const initialMetrics = computeSubsetMetrics(selected, constraints, currentStability, currentTrust);

  if (initialMetrics.allowsShip) {
    // Already shippable, no optimization needed
    return { selected, excluded, iterationsRun: 0, improvementAchieved: false };
  }

  // Iteratively try excluding low-value intents
  for (const candidate of sortedByRatio) {
    iterationsRun++;

    // Cannot exclude critical intents if criticalMandatory
    if (constraints.criticalMandatory && candidate.priority === 'critical') {
      continue;
    }

    // Cannot exclude intents with UVD above threshold
    if (candidate.value.components.uvdScore >= constraints.minIntentUVD) {
      continue;
    }

    // Try excluding this intent
    const testSelected = selected.filter(i => i.intentId !== candidate.intentId);
    const testMetrics = computeSubsetMetrics(testSelected, constraints, currentStability, currentTrust);

    // Check if exclusion improves ship eligibility
    const currentMetrics = computeSubsetMetrics(selected, constraints, currentStability, currentTrust);

    if (testMetrics.allowsShip && !currentMetrics.allowsShip) {
      // Exclusion enables shipping
      selected = testSelected;
      excluded.push({
        ...candidate,
        selected: false,
        exclusionReason: 'Excluded to enable ship eligibility',
      });
      improvementAchieved = true;
      break;  // Found improvement, stop
    }

    if (testMetrics.effectiveValueRatio > currentMetrics.effectiveValueRatio) {
      // Exclusion improves value ratio
      selected = testSelected;
      excluded.push({
        ...candidate,
        selected: false,
        exclusionReason: `Low value-to-cost ratio (${candidate.valueToCostratio.toFixed(2)})`,
      });
      improvementAchieved = true;
    }
  }

  // Mark remaining as selected
  selected = selected.map(i => ({ ...i, selected: true, exclusionReason: null }));

  return { selected, excluded, iterationsRun, improvementAchieved };
}

/**
 * Compute metrics for a subset of intents
 */
function computeSubsetMetrics(
  intents: GovernedIntent[],
  constraints: GovernanceConstraints,
  currentStability: number,
  currentTrust: number
): {
  totalValue: number;
  totalCost: number;
  effectiveValueRatio: number;
  allowsShip: boolean;
} {
  if (intents.length === 0) {
    return {
      totalValue: 0,
      totalCost: 0,
      effectiveValueRatio: 0,
      allowsShip: false,  // No intents = no value
    };
  }

  const totalValue = intents.reduce((sum, i) => sum + i.value.totalValue, 0) / intents.length;
  const totalCost = intents.reduce((sum, i) => sum + i.cost.totalCost, 0) / intents.length;
  const effectiveValueRatio = totalValue / (1 + totalCost);

  // Check constraints
  const stabilityOk = currentStability >= constraints.minStability;
  const trustOk = currentTrust >= constraints.minTrust;
  const costOk = totalCost <= constraints.maxTotalCost;

  // Check critical intent UVD
  const criticalIntents = intents.filter(i => i.priority === 'critical');
  const criticalUVDOk = criticalIntents.every(
    i => i.value.components.uvdScore >= UVD_THRESHOLDS.CRITICAL_INTENT_MIN
  );

  const allowsShip = stabilityOk && trustOk && costOk && criticalUVDOk;

  return { totalValue, totalCost, effectiveValueRatio, allowsShip };
}

// ============================================
// MAIN GOVERNANCE ENGINE
// ============================================

/**
 * Run Intent Governance Engine
 */
export function runIntentGovernance(
  chains: IntentCausalChain[],
  uvdResult: SystemUVDResult,
  stabilityResult: StabilityEnvelopeResult,
  topology: ITGCLAnalysisResult | null,
  trustScores: Map<string, number>,
  constraints: GovernanceConstraints = DEFAULT_CONSTRAINTS
): IntentGovernanceResult {
  console.log('[IGE] ==========================================');
  console.log('[IGE] INTENT GOVERNANCE ENGINE');
  console.log('[IGE] ==========================================');
  console.log(`[IGE] Analyzing ${chains.length} intents`);
  console.log(`[IGE] Current Stability (SSI): ${(stabilityResult.ssi * 100).toFixed(1)}%`);
  console.log(`[IGE] Constraints: stability>=${(constraints.minStability * 100).toFixed(0)}%, trust>=${(constraints.minTrust * 100).toFixed(0)}%`);

  if (chains.length === 0) {
    console.log('[IGE] No intents to govern');
    return createEmptyResult();
  }

  // Build UVD score map
  const uvdScoreMap = new Map<string, IntentUVDScore>();
  for (const score of uvdResult.intentScores) {
    uvdScoreMap.set(score.intentId, score);
  }

  // Compute cost and value for each intent
  const governedIntents: GovernedIntent[] = [];

  for (const chain of chains) {
    const intentId = chain.intent.id;

    // Compute cost
    const cost = computeIntentCost(chain, topology, trustScores);

    // Compute value
    const uvdScore = uvdScoreMap.get(intentId) ?? null;
    const value = computeIntentValue(chain, uvdScore, topology);

    // Value-to-cost ratio
    const valueToCostratio = value.totalValue / (1 + cost.totalCost);

    // Check constraint violations
    const violatesStability = stabilityResult.ssi < constraints.minStability;
    const intentTrust = trustScores.get(intentId) ?? chain.outcomeScores.trustScore;
    const violatesTrust = intentTrust < constraints.minTrust && chain.outcomeScores.external !== null;
    const violatesFeasibility = cost.totalCost > constraints.maxTotalCost;

    governedIntents.push({
      intentId,
      requirement: chain.intent.requirement,
      priority: chain.intent.priority,
      value,
      cost,
      valueToCostratio,
      selected: true,  // Initially all selected
      exclusionReason: null,
      violatesStability,
      violatesTrust,
      violatesFeasibility,
    });

    console.log(`[IGE]   ${intentId}: V=${value.totalValue.toFixed(2)} C=${cost.totalCost.toFixed(2)} V/C=${valueToCostratio.toFixed(2)}`);
  }

  // Get current trust average
  const currentTrust = trustScores.size > 0
    ? Array.from(trustScores.values()).reduce((a, b) => a + b, 0) / trustScores.size
    : 1.0;

  // Run subset selection algorithm
  console.log('[IGE] ------------------------------------------');
  console.log('[IGE] Running subset selection optimization...');

  const { selected, excluded, iterationsRun, improvementAchieved } = selectOptimalSubset(
    governedIntents,
    constraints,
    stabilityResult.ssi,
    currentTrust
  );

  console.log(`[IGE] Iterations: ${iterationsRun}`);
  console.log(`[IGE] Improvement: ${improvementAchieved ? 'YES' : 'NO'}`);
  console.log(`[IGE] Selected: ${selected.length}/${governedIntents.length}`);
  console.log(`[IGE] Excluded: ${excluded.length}`);

  // Compute final metrics
  const totalValue = selected.length > 0
    ? selected.reduce((sum, i) => sum + i.value.totalValue, 0) / selected.length
    : 0;
  const totalCost = selected.length > 0
    ? selected.reduce((sum, i) => sum + i.cost.totalCost, 0) / selected.length
    : 0;
  const effectiveValueRatio = totalValue / (1 + totalCost);

  // Check final constraint satisfaction
  const stabilityConstraintMet = stabilityResult.ssi >= constraints.minStability;
  const trustConstraintMet = currentTrust >= constraints.minTrust || trustScores.size === 0;
  const feasibilityConstraintMet = totalCost <= constraints.maxTotalCost;

  // Check critical intent UVD
  const criticalSelected = selected.filter(i => i.priority === 'critical');
  const criticalUVDOk = criticalSelected.every(
    i => i.value.components.uvdScore >= UVD_THRESHOLDS.CRITICAL_INTENT_MIN
  );

  // Final ship decision
  let allowsShip = stabilityConstraintMet && trustConstraintMet && feasibilityConstraintMet && criticalUVDOk;
  let shipBlocker: string | null = null;

  if (!stabilityConstraintMet) {
    shipBlocker = `Stability ${(stabilityResult.ssi * 100).toFixed(1)}% < ${(constraints.minStability * 100).toFixed(0)}% threshold`;
  } else if (!trustConstraintMet) {
    shipBlocker = `Trust ${(currentTrust * 100).toFixed(1)}% < ${(constraints.minTrust * 100).toFixed(0)}% threshold`;
  } else if (!feasibilityConstraintMet) {
    shipBlocker = `Cost ${(totalCost * 100).toFixed(1)}% > ${(constraints.maxTotalCost * 100).toFixed(0)}% budget`;
  } else if (!criticalUVDOk) {
    const failingCritical = criticalSelected.find(
      i => i.value.components.uvdScore < UVD_THRESHOLDS.CRITICAL_INTENT_MIN
    );
    shipBlocker = `Critical intent ${failingCritical?.intentId} has UVD ${((failingCritical?.value.components.uvdScore ?? 0) * 100).toFixed(1)}% < 50%`;
  }

  // Generate justification
  const justification = generateJustification(
    selected,
    excluded,
    totalValue,
    totalCost,
    improvementAchieved,
    allowsShip,
    shipBlocker
  );

  // Count critical intents
  const criticalExcluded = excluded.filter(i => i.priority === 'critical').length;

  console.log('[IGE] ------------------------------------------');
  console.log(`[IGE] Total Value: ${(totalValue * 100).toFixed(1)}%`);
  console.log(`[IGE] Total Cost: ${(totalCost * 100).toFixed(1)}%`);
  console.log(`[IGE] Effective Ratio: ${effectiveValueRatio.toFixed(3)}`);
  console.log(`[IGE] Constraints: stability=${stabilityConstraintMet}, trust=${trustConstraintMet}, feasibility=${feasibilityConstraintMet}`);
  console.log(`[IGE] Allows Ship: ${allowsShip}`);
  if (shipBlocker) {
    console.log(`[IGE] Blocker: ${shipBlocker}`);
  }
  console.log('[IGE] ==========================================');

  return {
    selectedIntents: selected,
    excludedIntents: excluded,
    totalValue,
    totalCost,
    effectiveValueRatio,
    stabilityConstraintMet,
    trustConstraintMet,
    feasibilityConstraintMet,
    allowsShip,
    shipBlocker,
    justification,
    optimizationStats: {
      totalIntents: governedIntents.length,
      selectedCount: selected.length,
      excludedCount: excluded.length,
      criticalSelected: criticalSelected.length,
      criticalExcluded,
      iterationsRun,
      improvementAchieved,
    },
  };
}

/**
 * Generate justification text
 */
function generateJustification(
  selected: GovernedIntent[],
  excluded: GovernedIntent[],
  totalValue: number,
  totalCost: number,
  improved: boolean,
  allowsShip: boolean,
  blocker: string | null
): string {
  const parts: string[] = [];

  if (allowsShip) {
    parts.push('GOVERNANCE DECISION: SHIP APPROVED');
    parts.push(`Selected ${selected.length} intents with total value ${(totalValue * 100).toFixed(1)}% and cost ${(totalCost * 100).toFixed(1)}%`);

    if (excluded.length > 0) {
      parts.push(`Excluded ${excluded.length} low-value intent(s) to optimize ship eligibility`);
      for (const ex of excluded) {
        parts.push(`  - ${ex.intentId}: ${ex.exclusionReason}`);
      }
    }

    if (improved) {
      parts.push('Optimization improved ship eligibility through strategic exclusion');
    }
  } else {
    parts.push('GOVERNANCE DECISION: SHIP BLOCKED');
    parts.push(`Blocker: ${blocker}`);
    parts.push(`Selected ${selected.length} intents but constraints not satisfied`);

    if (excluded.length > 0) {
      parts.push(`Attempted to exclude ${excluded.length} intent(s) but still blocked`);
    }
  }

  return parts.join('\n');
}

/**
 * Create empty result for no intents
 */
function createEmptyResult(): IntentGovernanceResult {
  return {
    selectedIntents: [],
    excludedIntents: [],
    totalValue: 0,
    totalCost: 0,
    effectiveValueRatio: 0,
    stabilityConstraintMet: true,
    trustConstraintMet: true,
    feasibilityConstraintMet: true,
    allowsShip: true,  // No intents = vacuously true
    shipBlocker: null,
    justification: 'No intents to govern - vacuously approved',
    optimizationStats: {
      totalIntents: 0,
      selectedCount: 0,
      excludedCount: 0,
      criticalSelected: 0,
      criticalExcluded: 0,
      iterationsRun: 0,
      improvementAchieved: false,
    },
  };
}

// ============================================
// TEST CASES
// ============================================

/**
 * Test case where excluding a low-value intent increases ship eligibility
 */
export interface GovernanceTestCase {
  id: string;
  description: string;
  scenario: string;
  expectedOutcome: 'SHIP_AFTER_EXCLUSION' | 'BLOCKED_BY_INCLUSION';
  intents: Array<{
    id: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    uvdScore: number;
    cost: number;
  }>;
  constraints: Partial<GovernanceConstraints>;
  currentStability: number;
  currentTrust: number;
}

/**
 * Test cases for governance decisions
 */
export const GOVERNANCE_TEST_CASES: readonly GovernanceTestCase[] = Object.freeze([
  {
    id: 'gov-test-001',
    description: 'Excluding low-value intent enables shipping',
    scenario: 'System has 3 intents: 2 high-value, 1 low-value. The low-value intent has high cost (many external anchors, low trust). Excluding it brings total cost under budget.',
    expectedOutcome: 'SHIP_AFTER_EXCLUSION',
    intents: [
      { id: 'intent-high-1', priority: 'high', uvdScore: 0.85, cost: 0.30 },
      { id: 'intent-high-2', priority: 'high', uvdScore: 0.80, cost: 0.35 },
      { id: 'intent-low-1', priority: 'low', uvdScore: 0.35, cost: 0.90 },  // Low UVD, high cost
    ],
    constraints: {
      maxTotalCost: 0.50,
      minIntentUVD: 0.40,
      criticalMandatory: true,
    },
    currentStability: 0.75,
    currentTrust: 0.80,
  },
  {
    id: 'gov-test-002',
    description: 'Including all intents blocks stability',
    scenario: 'System has 4 intents with varying coupling. Including all creates high coupling density that destabilizes the system. But critical intent cannot be excluded.',
    expectedOutcome: 'BLOCKED_BY_INCLUSION',
    intents: [
      { id: 'intent-critical-1', priority: 'critical', uvdScore: 0.90, cost: 0.40 },
      { id: 'intent-high-1', priority: 'high', uvdScore: 0.75, cost: 0.50 },
      { id: 'intent-medium-1', priority: 'medium', uvdScore: 0.60, cost: 0.55 },
      { id: 'intent-medium-2', priority: 'medium', uvdScore: 0.55, cost: 0.60 },
    ],
    constraints: {
      maxTotalCost: 0.45,  // Budget too tight for all intents
      minStability: 0.80,
      criticalMandatory: true,
    },
    currentStability: 0.65,  // Below threshold - stability constraint violated
    currentTrust: 0.85,
  },
]);

/**
 * Test case result
 */
export interface GovernanceTestResult {
  caseId: string;
  description: string;
  expectedOutcome: 'SHIP_AFTER_EXCLUSION' | 'BLOCKED_BY_INCLUSION';
  actualOutcome: 'SHIP_AFTER_EXCLUSION' | 'BLOCKED_BY_INCLUSION' | 'UNEXPECTED';
  passed: boolean;
  details: string;
}

/**
 * Run governance test cases
 */
export function runGovernanceTests(): {
  total: number;
  passed: number;
  failed: number;
  results: GovernanceTestResult[];
} {
  console.log('[IGE] ==========================================');
  console.log('[IGE] GOVERNANCE TEST CASES');
  console.log('[IGE] ==========================================');

  const results: GovernanceTestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of GOVERNANCE_TEST_CASES) {
    console.log(`[IGE] Testing: ${testCase.id}`);

    // Simulate governance decision
    const constraints: GovernanceConstraints = {
      ...DEFAULT_CONSTRAINTS,
      ...testCase.constraints,
    };

    // Build mock governed intents
    const mockIntents: GovernedIntent[] = testCase.intents.map(i => ({
      intentId: i.id,
      requirement: `Mock requirement for ${i.id}`,
      priority: i.priority,
      value: {
        intentId: i.id,
        components: {
          uvdScore: i.uvdScore,
          priorityWeight: CRITICALITY_WEIGHTS[i.priority] / 4,
          dependencyValue: 0,
          userFacing: true,
        },
        totalValue: i.uvdScore * 0.5 + (CRITICALITY_WEIGHTS[i.priority] / 4) * 0.3 + 0.05,
      },
      cost: {
        intentId: i.id,
        components: {
          complexity: i.cost * 0.3,
          externalAnchors: i.cost * 0.2,
          coupling: i.cost * 0.25,
          trustDeficit: i.cost * 0.15,
          stabilityImpact: i.cost * 0.1,
        },
        totalCost: i.cost,
      },
      valueToCostratio: (i.uvdScore * 0.5 + 0.2) / (1 + i.cost),
      selected: true,
      exclusionReason: null,
      violatesStability: testCase.currentStability < constraints.minStability,
      violatesTrust: testCase.currentTrust < constraints.minTrust,
      violatesFeasibility: i.cost > constraints.maxTotalCost,
    }));

    // Run selection
    const { selected, excluded, improvementAchieved } = selectOptimalSubset(
      mockIntents,
      constraints,
      testCase.currentStability,
      testCase.currentTrust
    );

    // Determine actual outcome
    let actualOutcome: 'SHIP_AFTER_EXCLUSION' | 'BLOCKED_BY_INCLUSION' | 'UNEXPECTED';

    if (excluded.length > 0 && improvementAchieved) {
      // Check if exclusion enabled shipping
      const metrics = computeSubsetMetrics(selected, constraints, testCase.currentStability, testCase.currentTrust);
      if (metrics.allowsShip) {
        actualOutcome = 'SHIP_AFTER_EXCLUSION';
      } else {
        actualOutcome = 'BLOCKED_BY_INCLUSION';
      }
    } else {
      // No exclusion or no improvement
      const metrics = computeSubsetMetrics(mockIntents, constraints, testCase.currentStability, testCase.currentTrust);
      if (metrics.allowsShip) {
        actualOutcome = 'UNEXPECTED';  // Expected to need exclusion or be blocked
      } else {
        actualOutcome = 'BLOCKED_BY_INCLUSION';
      }
    }

    const testPassed = actualOutcome === testCase.expectedOutcome;

    if (testPassed) {
      passed++;
      console.log(`[IGE] ✓ ${testCase.id}: ${actualOutcome}`);
    } else {
      failed++;
      console.log(`[IGE] ✗ ${testCase.id}: Expected ${testCase.expectedOutcome}, got ${actualOutcome}`);
    }

    results.push({
      caseId: testCase.id,
      description: testCase.description,
      expectedOutcome: testCase.expectedOutcome,
      actualOutcome,
      passed: testPassed,
      details: testPassed
        ? `Correctly ${actualOutcome === 'SHIP_AFTER_EXCLUSION' ? 'shipped after exclusion' : 'blocked by inclusion'}`
        : `Mismatch: expected ${testCase.expectedOutcome}, got ${actualOutcome}`,
    });
  }

  console.log('[IGE] ------------------------------------------');
  console.log(`[IGE] Total: ${GOVERNANCE_TEST_CASES.length}`);
  console.log(`[IGE] Passed: ${passed}`);
  console.log(`[IGE] Failed: ${failed}`);
  console.log('[IGE] ==========================================');

  return {
    total: GOVERNANCE_TEST_CASES.length,
    passed,
    failed,
    results,
  };
}

// ============================================
// INTENT FATE MODEL
// ============================================

/**
 * IntentFate - The irreversible classification of an intent's destiny
 *
 * Fates represent the final judgment of an intent within a build.
 * Once assigned, fates can only evolve according to strict rules.
 */
export enum IntentFate {
  /** Intent passed all checks, selected for shipping */
  ACCEPTED = 'ACCEPTED',

  /** Intent passed but has issues noted for future resolution */
  ACCEPTED_WITH_DEBT = 'ACCEPTED_WITH_DEBT',

  /** Intent excluded due to low value/high cost, may recover if improved */
  QUARANTINED = 'QUARANTINED',

  /** Intent permanently blocked, cannot be re-included */
  FORBIDDEN = 'FORBIDDEN',
}

/**
 * Fate assignment thresholds (deterministic - no config flags)
 */
export const FATE_THRESHOLDS = Object.freeze({
  /** UVD below this = QUARANTINED (unless critical) */
  QUARANTINE_UVD: 0.40,

  /** Cost above this = QUARANTINED (high cost is suspicious) */
  QUARANTINE_COST: 0.85,

  /** Trust below this = FORBIDDEN (untrustworthy sources) */
  FORBIDDEN_TRUST: 0.30,

  /** If QUARANTINED 3+ times consecutively = FORBIDDEN */
  QUARANTINE_STRIKES: 3,

  /** ACCEPTED_WITH_DEBT: UVD between 0.40 and 0.60 but selected */
  DEBT_UVD_MIN: 0.40,
  DEBT_UVD_MAX: 0.60,

  /** ACCEPTED_WITH_DEBT: Stability impact above this = debt */
  DEBT_STABILITY_IMPACT: 0.70,
});

/**
 * Reasons for fate assignment (for audit trail)
 */
export type FateReason =
  | 'SELECTED_HIGH_VALUE'           // Selected, high UVD
  | 'SELECTED_WITH_UVD_DEBT'        // Selected but UVD is borderline
  | 'SELECTED_WITH_STABILITY_DEBT'  // Selected but stability impact is high
  | 'EXCLUDED_LOW_VALUE'            // Excluded due to low UVD
  | 'EXCLUDED_HIGH_COST'            // Excluded due to high cost
  | 'EXCLUDED_LOW_TRUST'            // Excluded due to low trust
  | 'FORBIDDEN_BY_STRIKES'          // QUARANTINED too many times
  | 'FORBIDDEN_BY_TRUST'            // Trust below threshold
  | 'EVOLUTION_RULE_VIOLATION';     // Attempted invalid evolution

/**
 * Individual intent fate assignment
 */
export interface IntentFateAssignment {
  intentId: string;
  requirement: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  fate: IntentFate;
  reason: FateReason;
  /** Detailed explanation of why this fate was assigned */
  explanation: string;
  /** Metrics used in fate determination */
  metrics: {
    uvdScore: number;
    cost: number;
    trustScore: number;
    stabilityImpact: number;
    valueToCostratio: number;
  };
  /** Previous fate (if any) from history */
  previousFate: IntentFate | null;
  /** Number of consecutive QUARANTINED assignments */
  quarantineStrikes: number;
  /** Was this intent selected in the current build? */
  wasSelected: boolean;
  /** Timestamp of assignment */
  assignedAt: string;
  /** Build ID this fate was assigned in */
  buildId: string;
}

/**
 * Fate history entry for persistence
 */
export interface FateHistoryEntry {
  buildId: string;
  timestamp: string;
  fates: IntentFateAssignment[];
  /** Summary statistics */
  summary: {
    total: number;
    accepted: number;
    acceptedWithDebt: number;
    quarantined: number;
    forbidden: number;
  };
  /** Evolution events (transitions from previous build) */
  evolutions: FateEvolutionEvent[];
}

/**
 * Records a fate transition between builds
 */
export interface FateEvolutionEvent {
  intentId: string;
  previousFate: IntentFate;
  newFate: IntentFate;
  evolutionType: 'PROMOTION' | 'DEMOTION' | 'STABLE' | 'VIOLATION';
  reason: string;
  buildId: string;
}

/**
 * Result of fate assignment for all intents
 */
export interface IntentFatesResult {
  /** All fate assignments */
  fates: IntentFateAssignment[];

  /** Summary counts */
  summary: {
    total: number;
    accepted: number;
    acceptedWithDebt: number;
    quarantined: number;
    forbidden: number;
  };

  /** Did any intent violate evolution rules? */
  hasEvolutionViolation: boolean;

  /** Evolution violations (HARD FAIL if any) */
  evolutionViolations: FateEvolutionEvent[];

  /** Can ship based on fates? FORBIDDEN intents block shipping */
  allowsShip: boolean;

  /** Block reason if any */
  blockReason: string | null;

  /** History file path */
  historyPath: string;
}

// ============================================
// FATE PERSISTENCE
// ============================================

import * as fs from 'fs';
import * as path from 'path';

/**
 * Load fate history from .olympus/intent-fates.json
 * Creates file if it doesn't exist
 */
export function loadFateHistory(fsOutputDir: string): FateHistoryEntry[] {
  const olympusDir = path.join(fsOutputDir, '.olympus');
  const historyPath = path.join(olympusDir, 'intent-fates.json');

  // Ensure .olympus directory exists
  if (!fs.existsSync(olympusDir)) {
    fs.mkdirSync(olympusDir, { recursive: true });
  }

  // Load existing history or create empty
  if (fs.existsSync(historyPath)) {
    try {
      const content = fs.readFileSync(historyPath, 'utf-8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    } catch {
      console.log('[IGE-FATE] Warning: Could not parse fate history, starting fresh');
      return [];
    }
  }

  return [];
}

/**
 * Save fate history (append-only)
 */
export function saveFateHistory(
  fsOutputDir: string,
  entry: FateHistoryEntry
): string {
  const olympusDir = path.join(fsOutputDir, '.olympus');
  const historyPath = path.join(olympusDir, 'intent-fates.json');

  // Ensure .olympus directory exists
  if (!fs.existsSync(olympusDir)) {
    fs.mkdirSync(olympusDir, { recursive: true });
  }

  // Load existing and append
  const history = loadFateHistory(fsOutputDir);
  history.push(entry);

  // Write back (append-only semantics - we never remove entries)
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  console.log(`[IGE-FATE] Saved fate history: ${history.length} entries`);
  return historyPath;
}

/**
 * Get last fate for an intent from history
 */
export function getLastFate(
  history: FateHistoryEntry[],
  intentId: string
): { fate: IntentFate; quarantineStrikes: number } | null {
  // Search backwards through history
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    const found = entry.fates.find(f => f.intentId === intentId);
    if (found) {
      return {
        fate: found.fate,
        quarantineStrikes: found.quarantineStrikes,
      };
    }
  }
  return null;
}

/**
 * Count consecutive QUARANTINED strikes for an intent
 */
export function countQuarantineStrikes(
  history: FateHistoryEntry[],
  intentId: string
): number {
  let strikes = 0;

  // Count backwards until we find a non-QUARANTINED fate
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    const found = entry.fates.find(f => f.intentId === intentId);

    if (!found) {
      // Intent not present in this build, continue
      continue;
    }

    if (found.fate === IntentFate.QUARANTINED) {
      strikes++;
    } else {
      // Found a non-QUARANTINED fate, stop counting
      break;
    }
  }

  return strikes;
}

// ============================================
// FATE ASSIGNMENT LOGIC
// ============================================

/**
 * Assign fate to a single intent (deterministic)
 */
export function assignIntentFate(
  governed: GovernedIntent,
  trustScore: number,
  history: FateHistoryEntry[],
  buildId: string
): IntentFateAssignment {
  const intentId = governed.intentId;
  const uvdScore = governed.value.components.uvdScore;
  const cost = governed.cost.totalCost;
  const stabilityImpact = governed.cost.components.stabilityImpact;
  const valueRatio = governed.valueToCostratio;

  // Get previous fate from history
  const lastFateData = getLastFate(history, intentId);
  const previousFate = lastFateData?.fate ?? null;
  let quarantineStrikes = countQuarantineStrikes(history, intentId);

  // Determine fate
  let fate: IntentFate;
  let reason: FateReason;
  let explanation: string;

  // Rule 1: FORBIDDEN intents stay FORBIDDEN (no recovery)
  if (previousFate === IntentFate.FORBIDDEN) {
    fate = IntentFate.FORBIDDEN;
    reason = 'EVOLUTION_RULE_VIOLATION';
    explanation = 'Once FORBIDDEN, always FORBIDDEN. Intent cannot be rehabilitated.';
  }
  // Rule 2: Trust below threshold = FORBIDDEN
  else if (trustScore < FATE_THRESHOLDS.FORBIDDEN_TRUST) {
    fate = IntentFate.FORBIDDEN;
    reason = 'FORBIDDEN_BY_TRUST';
    explanation = `Trust score ${(trustScore * 100).toFixed(1)}% is below ${(FATE_THRESHOLDS.FORBIDDEN_TRUST * 100).toFixed(0)}% threshold. Intent is permanently blocked.`;
  }
  // Rule 3: QUARANTINED too many times = FORBIDDEN
  else if (
    !governed.selected &&
    previousFate === IntentFate.QUARANTINED &&
    quarantineStrikes + 1 >= FATE_THRESHOLDS.QUARANTINE_STRIKES
  ) {
    fate = IntentFate.FORBIDDEN;
    reason = 'FORBIDDEN_BY_STRIKES';
    explanation = `Intent has been QUARANTINED ${quarantineStrikes + 1} consecutive times (threshold: ${FATE_THRESHOLDS.QUARANTINE_STRIKES}). Escalated to FORBIDDEN.`;
    quarantineStrikes++;  // Include this build
  }
  // Rule 4: Not selected = QUARANTINED
  else if (!governed.selected) {
    fate = IntentFate.QUARANTINED;
    quarantineStrikes++;

    if (uvdScore < FATE_THRESHOLDS.QUARANTINE_UVD) {
      reason = 'EXCLUDED_LOW_VALUE';
      explanation = `UVD ${(uvdScore * 100).toFixed(1)}% is below ${(FATE_THRESHOLDS.QUARANTINE_UVD * 100).toFixed(0)}% threshold. Intent quarantined.`;
    } else if (cost > FATE_THRESHOLDS.QUARANTINE_COST) {
      reason = 'EXCLUDED_HIGH_COST';
      explanation = `Cost ${(cost * 100).toFixed(1)}% exceeds ${(FATE_THRESHOLDS.QUARANTINE_COST * 100).toFixed(0)}% threshold. Intent quarantined.`;
    } else {
      reason = 'EXCLUDED_LOW_VALUE';
      explanation = governed.exclusionReason || 'Excluded by governance optimization.';
    }
  }
  // Rule 5: Selected with borderline metrics = ACCEPTED_WITH_DEBT
  else if (
    uvdScore >= FATE_THRESHOLDS.DEBT_UVD_MIN &&
    uvdScore < FATE_THRESHOLDS.DEBT_UVD_MAX
  ) {
    fate = IntentFate.ACCEPTED_WITH_DEBT;
    reason = 'SELECTED_WITH_UVD_DEBT';
    explanation = `UVD ${(uvdScore * 100).toFixed(1)}% is borderline (${(FATE_THRESHOLDS.DEBT_UVD_MIN * 100).toFixed(0)}%-${(FATE_THRESHOLDS.DEBT_UVD_MAX * 100).toFixed(0)}%). Accepted with technical debt.`;
    quarantineStrikes = 0;  // Reset strikes on acceptance
  }
  // Rule 6: Selected with high stability impact = ACCEPTED_WITH_DEBT
  else if (stabilityImpact > FATE_THRESHOLDS.DEBT_STABILITY_IMPACT) {
    fate = IntentFate.ACCEPTED_WITH_DEBT;
    reason = 'SELECTED_WITH_STABILITY_DEBT';
    explanation = `Stability impact ${(stabilityImpact * 100).toFixed(1)}% exceeds ${(FATE_THRESHOLDS.DEBT_STABILITY_IMPACT * 100).toFixed(0)}%. Accepted with stability debt.`;
    quarantineStrikes = 0;  // Reset strikes on acceptance
  }
  // Rule 7: Selected with good metrics = ACCEPTED
  else {
    fate = IntentFate.ACCEPTED;
    reason = 'SELECTED_HIGH_VALUE';
    explanation = `Intent passed all checks. UVD=${(uvdScore * 100).toFixed(1)}%, Cost=${(cost * 100).toFixed(1)}%, Trust=${(trustScore * 100).toFixed(1)}%.`;
    quarantineStrikes = 0;  // Reset strikes on acceptance
  }

  return {
    intentId,
    requirement: governed.requirement,
    priority: governed.priority,
    fate,
    reason,
    explanation,
    metrics: {
      uvdScore,
      cost,
      trustScore,
      stabilityImpact,
      valueToCostratio: valueRatio,
    },
    previousFate,
    quarantineStrikes,
    wasSelected: governed.selected,
    assignedAt: new Date().toISOString(),
    buildId,
  };
}

// ============================================
// EVOLUTION RULES ENFORCEMENT
// ============================================

/**
 * Allowed fate transitions:
 * - ACCEPTED → ACCEPTED_WITH_DEBT, QUARANTINED (can degrade)
 * - ACCEPTED_WITH_DEBT → ACCEPTED (can improve), QUARANTINED (can degrade)
 * - QUARANTINED → ACCEPTED, ACCEPTED_WITH_DEBT (can recover), FORBIDDEN (strikes)
 * - FORBIDDEN → FORBIDDEN (ONLY - no recovery)
 */
const ALLOWED_TRANSITIONS: Record<IntentFate, IntentFate[]> = {
  [IntentFate.ACCEPTED]: [
    IntentFate.ACCEPTED,
    IntentFate.ACCEPTED_WITH_DEBT,
    IntentFate.QUARANTINED,
  ],
  [IntentFate.ACCEPTED_WITH_DEBT]: [
    IntentFate.ACCEPTED,
    IntentFate.ACCEPTED_WITH_DEBT,
    IntentFate.QUARANTINED,
  ],
  [IntentFate.QUARANTINED]: [
    IntentFate.ACCEPTED,
    IntentFate.ACCEPTED_WITH_DEBT,
    IntentFate.QUARANTINED,
    IntentFate.FORBIDDEN,
  ],
  [IntentFate.FORBIDDEN]: [IntentFate.FORBIDDEN],  // ONLY itself
};

/**
 * Check if a fate transition is valid
 */
export function isValidTransition(
  previousFate: IntentFate,
  newFate: IntentFate
): boolean {
  return ALLOWED_TRANSITIONS[previousFate].includes(newFate);
}

/**
 * Determine evolution type for a transition
 */
function getEvolutionType(
  previousFate: IntentFate,
  newFate: IntentFate
): 'PROMOTION' | 'DEMOTION' | 'STABLE' | 'VIOLATION' {
  if (previousFate === newFate) {
    return 'STABLE';
  }

  if (!isValidTransition(previousFate, newFate)) {
    return 'VIOLATION';
  }

  // Define fate "quality" order (higher = better)
  const fateOrder: Record<IntentFate, number> = {
    [IntentFate.FORBIDDEN]: 0,
    [IntentFate.QUARANTINED]: 1,
    [IntentFate.ACCEPTED_WITH_DEBT]: 2,
    [IntentFate.ACCEPTED]: 3,
  };

  return fateOrder[newFate] > fateOrder[previousFate] ? 'PROMOTION' : 'DEMOTION';
}

/**
 * Check evolution rules for all intents
 */
export function checkEvolutionRules(
  assignments: IntentFateAssignment[],
  history: FateHistoryEntry[]
): FateEvolutionEvent[] {
  const events: FateEvolutionEvent[] = [];

  for (const assignment of assignments) {
    if (assignment.previousFate !== null) {
      const evolutionType = getEvolutionType(
        assignment.previousFate,
        assignment.fate
      );

      events.push({
        intentId: assignment.intentId,
        previousFate: assignment.previousFate,
        newFate: assignment.fate,
        evolutionType,
        reason: assignment.explanation,
        buildId: assignment.buildId,
      });
    }
  }

  return events;
}

// ============================================
// MAIN FATE ASSIGNMENT
// ============================================

/**
 * Assign fates to all intents and enforce evolution rules
 *
 * This is called within runIntentGovernance after selection is complete.
 */
export function assignIntentFates(
  selectedIntents: GovernedIntent[],
  excludedIntents: GovernedIntent[],
  trustScores: Map<string, number>,
  fsOutputDir: string,
  buildId: string
): IntentFatesResult {
  console.log('[IGE-FATE] ==========================================');
  console.log('[IGE-FATE] INTENT FATE ASSIGNMENT');
  console.log('[IGE-FATE] ==========================================');

  // Load history
  const history = loadFateHistory(fsOutputDir);
  console.log(`[IGE-FATE] Loaded ${history.length} history entries`);

  // Combine all intents
  const allIntents = [
    ...selectedIntents.map(i => ({ ...i, selected: true })),
    ...excludedIntents.map(i => ({ ...i, selected: false })),
  ];

  // Assign fate to each intent
  const fates: IntentFateAssignment[] = [];

  for (const intent of allIntents) {
    const trustScore = trustScores.get(intent.intentId) ?? 1.0;
    const assignment = assignIntentFate(intent, trustScore, history, buildId);
    fates.push(assignment);

    console.log(`[IGE-FATE]   ${intent.intentId}: ${assignment.fate} (${assignment.reason})`);
  }

  // Check evolution rules
  const evolutions = checkEvolutionRules(fates, history);
  const violations = evolutions.filter(e => e.evolutionType === 'VIOLATION');
  const hasEvolutionViolation = violations.length > 0;

  if (hasEvolutionViolation) {
    console.log('[IGE-FATE] ❌ EVOLUTION VIOLATIONS DETECTED:');
    for (const v of violations) {
      console.log(`[IGE-FATE]   ${v.intentId}: ${v.previousFate} → ${v.newFate} (INVALID)`);
    }
  }

  // Compute summary
  const summary = {
    total: fates.length,
    accepted: fates.filter(f => f.fate === IntentFate.ACCEPTED).length,
    acceptedWithDebt: fates.filter(f => f.fate === IntentFate.ACCEPTED_WITH_DEBT).length,
    quarantined: fates.filter(f => f.fate === IntentFate.QUARANTINED).length,
    forbidden: fates.filter(f => f.fate === IntentFate.FORBIDDEN).length,
  };

  console.log('[IGE-FATE] ------------------------------------------');
  console.log(`[IGE-FATE] Summary: A=${summary.accepted} D=${summary.acceptedWithDebt} Q=${summary.quarantined} F=${summary.forbidden}`);

  // Check if any FORBIDDEN intent was supposed to be selected
  const forbiddenSelected = fates.filter(
    f => f.fate === IntentFate.FORBIDDEN && f.wasSelected
  );

  // Determine if shipping is allowed
  let allowsShip = true;
  let blockReason: string | null = null;

  // Rule: Evolution violations = HARD FAIL
  if (hasEvolutionViolation) {
    allowsShip = false;
    blockReason = `Evolution rule violation: ${violations[0].intentId} attempted invalid transition ${violations[0].previousFate} → ${violations[0].newFate}`;
  }
  // Rule: FORBIDDEN intents that were selected = HARD FAIL
  else if (forbiddenSelected.length > 0) {
    allowsShip = false;
    blockReason = `FORBIDDEN intent ${forbiddenSelected[0].intentId} cannot be selected for shipping`;
  }

  console.log(`[IGE-FATE] Allows Ship: ${allowsShip}`);
  if (blockReason) {
    console.log(`[IGE-FATE] Block Reason: ${blockReason}`);
  }

  // Save to history (append-only)
  const historyEntry: FateHistoryEntry = {
    buildId,
    timestamp: new Date().toISOString(),
    fates,
    summary,
    evolutions,
  };

  const historyPath = saveFateHistory(fsOutputDir, historyEntry);

  console.log('[IGE-FATE] ==========================================');

  return {
    fates,
    summary,
    hasEvolutionViolation,
    evolutionViolations: violations,
    allowsShip,
    blockReason,
    historyPath,
  };
}

/**
 * Get fate output for build artifact
 */
export function getFateOutput(result: IntentFatesResult): {
  fates: Array<{
    intentId: string;
    requirement: string;
    priority: string;
    fate: string;
    reason: string;
    explanation: string;
    metrics: {
      uvdScore: number;
      cost: number;
      trustScore: number;
    };
    previousFate: string | null;
    quarantineStrikes: number;
    wasSelected: boolean;
  }>;
  summary: {
    total: number;
    accepted: number;
    acceptedWithDebt: number;
    quarantined: number;
    forbidden: number;
  };
  evolutions: Array<{
    intentId: string;
    previousFate: string;
    newFate: string;
    evolutionType: string;
    reason: string;
  }>;
  hasEvolutionViolation: boolean;
  allowsShip: boolean;
  blockReason: string | null;
} {
  return {
    fates: result.fates.map(f => ({
      intentId: f.intentId,
      requirement: f.requirement.slice(0, 60),
      priority: f.priority,
      fate: f.fate,
      reason: f.reason,
      explanation: f.explanation,
      metrics: {
        uvdScore: f.metrics.uvdScore,
        cost: f.metrics.cost,
        trustScore: f.metrics.trustScore,
      },
      previousFate: f.previousFate,
      quarantineStrikes: f.quarantineStrikes,
      wasSelected: f.wasSelected,
    })),
    summary: result.summary,
    evolutions: result.evolutionViolations.map((e: FateEvolutionEvent) => ({
      intentId: e.intentId,
      previousFate: e.previousFate,
      newFate: e.newFate,
      evolutionType: e.evolutionType,
      reason: e.reason.slice(0, 100),
    })),
    hasEvolutionViolation: result.hasEvolutionViolation,
    allowsShip: result.allowsShip,
    blockReason: result.blockReason,
  };
}

/**
 * Log fate assignment results
 */
export function logFateResult(result: IntentFatesResult): void {
  console.log('[IGE-FATE] ==========================================');
  console.log('[IGE-FATE] INTENT FATE SUMMARY');
  console.log('[IGE-FATE] ==========================================');
  console.log(`[IGE-FATE] Total: ${result.summary.total}`);
  console.log(`[IGE-FATE] ACCEPTED: ${result.summary.accepted}`);
  console.log(`[IGE-FATE] ACCEPTED_WITH_DEBT: ${result.summary.acceptedWithDebt}`);
  console.log(`[IGE-FATE] QUARANTINED: ${result.summary.quarantined}`);
  console.log(`[IGE-FATE] FORBIDDEN: ${result.summary.forbidden}`);
  console.log('[IGE-FATE] ------------------------------------------');

  if (result.hasEvolutionViolation) {
    console.log('[IGE-FATE] ❌ EVOLUTION VIOLATIONS:');
    for (const v of result.evolutionViolations) {
      console.log(`[IGE-FATE]   ${v.intentId}: ${v.previousFate} → ${v.newFate}`);
    }
  }

  console.log(`[IGE-FATE] Allows Ship: ${result.allowsShip ? 'YES' : 'NO'}`);
  if (result.blockReason) {
    console.log(`[IGE-FATE] Block Reason: ${result.blockReason}`);
  }
  console.log('[IGE-FATE] ==========================================');
}

// ============================================
// INTEGRATION INTERFACE
// ============================================

/**
 * Check if IGE allows shipping
 */
export function igeAllowsShip(result: IntentGovernanceResult): boolean {
  return result.allowsShip;
}

/**
 * Get IGE output for build artifact
 */
export function getIGEOutput(result: IntentGovernanceResult): {
  selectedIntents: Array<{
    intentId: string;
    requirement: string;
    priority: string;
    value: number;
    cost: number;
    ratio: number;
  }>;
  excludedIntents: Array<{
    intentId: string;
    requirement: string;
    reason: string;
  }>;
  totalValue: number;
  totalCost: number;
  effectiveRatio: number;
  justification: string;
  allowsShip: boolean;
  shipBlocker: string | null;
} {
  return {
    selectedIntents: result.selectedIntents.map(i => ({
      intentId: i.intentId,
      requirement: i.requirement.slice(0, 60),
      priority: i.priority,
      value: i.value.totalValue,
      cost: i.cost.totalCost,
      ratio: i.valueToCostratio,
    })),
    excludedIntents: result.excludedIntents.map(i => ({
      intentId: i.intentId,
      requirement: i.requirement.slice(0, 60),
      reason: i.exclusionReason || 'Unknown',
    })),
    totalValue: result.totalValue,
    totalCost: result.totalCost,
    effectiveRatio: result.effectiveValueRatio,
    justification: result.justification,
    allowsShip: result.allowsShip,
    shipBlocker: result.shipBlocker,
  };
}

/**
 * Log IGE summary
 */
export function logIGEResult(result: IntentGovernanceResult): void {
  console.log('[IGE] ==========================================');
  console.log('[IGE] INTENT GOVERNANCE SUMMARY');
  console.log('[IGE] ==========================================');
  console.log(`[IGE] Selected: ${result.optimizationStats.selectedCount}/${result.optimizationStats.totalIntents}`);
  console.log(`[IGE] Excluded: ${result.optimizationStats.excludedCount}`);
  console.log(`[IGE] Total Value: ${(result.totalValue * 100).toFixed(1)}%`);
  console.log(`[IGE] Total Cost: ${(result.totalCost * 100).toFixed(1)}%`);
  console.log(`[IGE] Effective Ratio: ${result.effectiveValueRatio.toFixed(3)}`);
  console.log('[IGE] ------------------------------------------');
  console.log(`[IGE] Stability: ${result.stabilityConstraintMet ? 'MET' : 'VIOLATED'}`);
  console.log(`[IGE] Trust: ${result.trustConstraintMet ? 'MET' : 'VIOLATED'}`);
  console.log(`[IGE] Feasibility: ${result.feasibilityConstraintMet ? 'MET' : 'VIOLATED'}`);
  console.log('[IGE] ------------------------------------------');
  console.log(`[IGE] Ship Decision: ${result.allowsShip ? 'APPROVED' : 'BLOCKED'}`);

  if (result.shipBlocker) {
    console.log(`[IGE] Blocker: ${result.shipBlocker}`);
  }

  if (result.excludedIntents.length > 0) {
    console.log('[IGE] Excluded Intents:');
    for (const ex of result.excludedIntents) {
      console.log(`[IGE]   - ${ex.intentId}: ${ex.exclusionReason}`);
    }
  }

  console.log('[IGE] ==========================================');
}
