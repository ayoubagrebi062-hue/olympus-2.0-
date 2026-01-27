/**
 * OLYMPUS 2.0 - Stability & Confidence Envelope (SCE)
 *
 * Quantifies system-level stability and blocks shipping of
 * logically-correct but operationally-risky systems.
 *
 * Rules:
 * - No probabilistic language
 * - All scores explainable
 * - Deterministic ordering
 * - No ML, only weighted formulas
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// STABILITY CLASSES
// ============================================

/**
 * Stability classification based on SSI
 */
export type StabilityClass = 'STABLE' | 'FRAGILE' | 'VOLATILE';

/**
 * Thresholds for stability classification
 */
export const STABILITY_THRESHOLDS = {
  STABLE: 0.85, // SSI >= 0.85
  FRAGILE: 0.7, // SSI >= 0.70 && < 0.85
  // VOLATILE: SSI < 0.70
} as const;

/**
 * Determine stability class from SSI
 */
export function classifyStability(ssi: number): StabilityClass {
  if (ssi >= STABILITY_THRESHOLDS.STABLE) {
    return 'STABLE';
  } else if (ssi >= STABILITY_THRESHOLDS.FRAGILE) {
    return 'FRAGILE';
  } else {
    return 'VOLATILE';
  }
}

// ============================================
// SSI INPUT TYPES
// ============================================

/**
 * W-ISS-D trend data from last N builds
 */
export interface WISSDTrend {
  buildId: string;
  score: number;
  timestamp: Date;
}

/**
 * RGL trust score data
 */
export interface RGLTrustData {
  averageTrustScore: number;
  lowestTrustScore: number;
  highestTrustScore: number;
  anchorsGoverned: number;
}

/**
 * Policy inference data from IMPL
 */
export interface PolicyInferenceData {
  policyAnswersApplied: number;
  humanAnswersApplied: number;
  totalAnswers: number;
}

/**
 * ITGCL coupling data
 */
export interface ITGCLCouplingData {
  nodeCount: number;
  edgeCount: number;
  connectedComponents: number;
  highConflictEdges: number;
}

/**
 * Clarification churn data
 */
export interface ClarificationChurnData {
  recentClarifications: number; // Last N builds
  resolvedClarifications: number;
  pendingClarifications: number;
  churnRate: number; // New clarifications per build
}

/**
 * All inputs for SSI computation
 */
export interface SSIInputs {
  wissdTrend: WISSDTrend[];
  rglTrust: RGLTrustData | null;
  policyInference: PolicyInferenceData | null;
  itgclCoupling: ITGCLCouplingData;
  clarificationChurn: ClarificationChurnData;

  // Context for monotonicity
  hasNewIntent: boolean;
  hasExternalChange: boolean;
}

// ============================================
// SSI COMPUTATION
// ============================================

/**
 * Weight configuration for SSI components
 */
export interface SSIWeights {
  wissdTrendStability: number; // Weight for W-ISS-D trend stability
  rglTrustConfidence: number; // Weight for RGL trust score consistency
  policyInferenceRatio: number; // Weight for policy vs human answer ratio
  itgclCouplingDensity: number; // Weight for intent coupling density
  clarificationChurn: number; // Weight for clarification churn rate
}

export const DEFAULT_SSI_WEIGHTS: SSIWeights = {
  wissdTrendStability: 0.3, // 30% - Most important: is W-ISS-D stable?
  rglTrustConfidence: 0.2, // 20% - Are external validations trustworthy?
  policyInferenceRatio: 0.15, // 15% - Are we relying too much on policy?
  itgclCouplingDensity: 0.2, // 20% - Is the system too tightly coupled?
  clarificationChurn: 0.15, // 15% - Is there too much churn?
};

/**
 * Individual component scores for SSI
 */
export interface SSIComponents {
  wissdTrendScore: number;
  wissdTrendReason: string;

  rglTrustScore: number;
  rglTrustReason: string;

  policyRatioScore: number;
  policyRatioReason: string;

  couplingScore: number;
  couplingReason: string;

  churnScore: number;
  churnReason: string;
}

/**
 * Compute W-ISS-D trend stability score
 * Higher score = more stable trend (less variance, improving or stable)
 */
function computeWISSDTrendScore(trend: WISSDTrend[]): { score: number; reason: string } {
  if (trend.length === 0) {
    return { score: 0.5, reason: 'No trend data available (first build)' };
  }

  if (trend.length === 1) {
    const score = trend[0].score / 100;
    return { score, reason: `Single build with W-ISS-D ${trend[0].score}%` };
  }

  // Sort by timestamp (oldest first)
  const sorted = [...trend].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate variance
  const scores = sorted.map(t => t.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Calculate trend direction (positive = improving)
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));
  const firstHalfMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondHalfMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const trendDirection = secondHalfMean - firstHalfMean;

  // Score components:
  // 1. Low variance is good (stdDev < 5% = perfect, > 20% = bad)
  const varianceScore = Math.max(0, 1 - stdDev / 20);

  // 2. Positive trend is good
  const trendScore = trendDirection >= 0 ? 1 : Math.max(0, 1 + trendDirection / 20);

  // 3. High mean score is good
  const meanScore = mean / 100;

  // Combined score
  const score = varianceScore * 0.4 + trendScore * 0.3 + meanScore * 0.3;

  const reason = [
    `Mean: ${mean.toFixed(1)}%`,
    `StdDev: ${stdDev.toFixed(1)}%`,
    `Trend: ${trendDirection >= 0 ? 'improving' : 'declining'} (${trendDirection > 0 ? '+' : ''}${trendDirection.toFixed(1)}%)`,
  ].join(', ');

  return { score: Math.min(1, Math.max(0, score)), reason };
}

/**
 * Compute RGL trust confidence score
 * Higher score = consistent, high trust scores
 */
function computeRGLTrustScore(rglTrust: RGLTrustData | null): { score: number; reason: string } {
  if (!rglTrust || rglTrust.anchorsGoverned === 0) {
    return { score: 1.0, reason: 'No external anchors (full internal confidence)' };
  }

  // Trust variance (difference between highest and lowest)
  const trustVariance = rglTrust.highestTrustScore - rglTrust.lowestTrustScore;

  // Score components:
  // 1. High average trust is good
  const avgTrustScore = rglTrust.averageTrustScore;

  // 2. Low variance is good (variance < 0.1 = perfect, > 0.5 = bad)
  const varianceScore = Math.max(0, 1 - trustVariance / 0.5);

  // 3. Not having very low trust anchors
  const minTrustScore = rglTrust.lowestTrustScore;

  // Combined score
  const score = avgTrustScore * 0.5 + varianceScore * 0.3 + minTrustScore * 0.2;

  const reason = [
    `Avg trust: ${(rglTrust.averageTrustScore * 100).toFixed(0)}%`,
    `Variance: ${(trustVariance * 100).toFixed(0)}%`,
    `Min trust: ${(rglTrust.lowestTrustScore * 100).toFixed(0)}%`,
    `Anchors: ${rglTrust.anchorsGoverned}`,
  ].join(', ');

  return { score: Math.min(1, Math.max(0, score)), reason };
}

/**
 * Compute policy inference ratio score
 * Higher score = healthy balance between policy and human answers
 */
function computePolicyRatioScore(policyData: PolicyInferenceData | null): {
  score: number;
  reason: string;
} {
  if (!policyData || policyData.totalAnswers === 0) {
    return { score: 1.0, reason: 'No clarification answers needed' };
  }

  const policyRatio = policyData.policyAnswersApplied / policyData.totalAnswers;
  const humanRatio = policyData.humanAnswersApplied / policyData.totalAnswers;

  // Ideal: 30-70% policy answers (some automation, but human oversight)
  // Too much policy (>80%) = risky (over-reliance on inferred answers)
  // Too little policy (<10%) = inefficient but safe

  let score: number;
  let assessment: string;

  if (policyRatio > 0.8) {
    // Over-reliance on policy
    score = 0.6 - (policyRatio - 0.8) * 2; // Penalize heavily above 80%
    assessment = 'Over-reliance on policy inference';
  } else if (policyRatio >= 0.3 && policyRatio <= 0.7) {
    // Healthy balance
    score = 1.0;
    assessment = 'Healthy policy/human balance';
  } else if (policyRatio < 0.1) {
    // All human - safe but no learning
    score = 0.85;
    assessment = 'Mostly human answers (limited learning)';
  } else {
    // Somewhere in between
    score = 0.9;
    assessment = 'Acceptable policy ratio';
  }

  const reason = [
    `Policy: ${(policyRatio * 100).toFixed(0)}%`,
    `Human: ${(humanRatio * 100).toFixed(0)}%`,
    assessment,
  ].join(', ');

  return { score: Math.min(1, Math.max(0, score)), reason };
}

/**
 * Compute ITGCL coupling density score
 * Higher score = lower coupling (more modular system)
 */
function computeCouplingScore(coupling: ITGCLCouplingData): { score: number; reason: string } {
  if (coupling.nodeCount === 0) {
    return { score: 1.0, reason: 'No intents to analyze' };
  }

  // Coupling density = edges / (nodes * (nodes - 1) / 2)
  // This is the ratio of actual edges to maximum possible edges
  const maxEdges = (coupling.nodeCount * (coupling.nodeCount - 1)) / 2;
  const density = maxEdges > 0 ? coupling.edgeCount / maxEdges : 0;

  // Component cohesion = connected components / nodes
  // Higher = more modular (better)
  const modularity = coupling.nodeCount > 0 ? coupling.connectedComponents / coupling.nodeCount : 1;

  // High conflict edges are bad
  const conflictRatio =
    coupling.edgeCount > 0 ? coupling.highConflictEdges / coupling.edgeCount : 0;

  // Score components:
  // 1. Low density is good (< 0.2 = modular, > 0.6 = highly coupled)
  const densityScore = Math.max(0, 1 - density / 0.6);

  // 2. Higher modularity is good
  const modularityScore = Math.min(1, modularity * 2);

  // 3. Low conflict ratio is good
  const conflictScore = Math.max(0, 1 - conflictRatio);

  // Combined score
  const score = densityScore * 0.4 + modularityScore * 0.3 + conflictScore * 0.3;

  const reason = [
    `Density: ${(density * 100).toFixed(0)}%`,
    `Components: ${coupling.connectedComponents}/${coupling.nodeCount}`,
    `High-conflict edges: ${coupling.highConflictEdges}`,
  ].join(', ');

  return { score: Math.min(1, Math.max(0, score)), reason };
}

/**
 * Compute clarification churn score
 * Higher score = stable clarification patterns (low churn)
 */
function computeChurnScore(churn: ClarificationChurnData): { score: number; reason: string } {
  // Churn rate = new clarifications per build
  // Low churn is good (< 0.5 = stable, > 2.0 = high churn)

  const churnScore = Math.max(0, 1 - churn.churnRate / 2.0);

  // Resolution ratio = resolved / total
  const totalClarifications = churn.resolvedClarifications + churn.pendingClarifications;
  const resolutionRatio =
    totalClarifications > 0 ? churn.resolvedClarifications / totalClarifications : 1;

  // Pending clarifications are a risk
  const pendingPenalty = Math.max(0, 1 - churn.pendingClarifications / 10);

  // Combined score
  const score = churnScore * 0.5 + resolutionRatio * 0.3 + pendingPenalty * 0.2;

  const reason = [
    `Churn rate: ${churn.churnRate.toFixed(2)}/build`,
    `Resolution: ${(resolutionRatio * 100).toFixed(0)}%`,
    `Pending: ${churn.pendingClarifications}`,
  ].join(', ');

  return { score: Math.min(1, Math.max(0, score)), reason };
}

/**
 * Compute the System Stability Index (SSI)
 */
export function computeSSI(
  inputs: SSIInputs,
  weights: SSIWeights = DEFAULT_SSI_WEIGHTS
): { ssi: number; components: SSIComponents } {
  // Compute each component
  const wissd = computeWISSDTrendScore(inputs.wissdTrend);
  const rgl = computeRGLTrustScore(inputs.rglTrust);
  const policy = computePolicyRatioScore(inputs.policyInference);
  const coupling = computeCouplingScore(inputs.itgclCoupling);
  const churn = computeChurnScore(inputs.clarificationChurn);

  // Weighted sum
  const ssi =
    wissd.score * weights.wissdTrendStability +
    rgl.score * weights.rglTrustConfidence +
    policy.score * weights.policyInferenceRatio +
    coupling.score * weights.itgclCouplingDensity +
    churn.score * weights.clarificationChurn;

  const components: SSIComponents = {
    wissdTrendScore: wissd.score,
    wissdTrendReason: wissd.reason,
    rglTrustScore: rgl.score,
    rglTrustReason: rgl.reason,
    policyRatioScore: policy.score,
    policyRatioReason: policy.reason,
    couplingScore: coupling.score,
    couplingReason: coupling.reason,
    churnScore: churn.score,
    churnReason: churn.reason,
  };

  return { ssi: Math.min(1, Math.max(0, ssi)), components };
}

// ============================================
// STABILITY RULES
// ============================================

/**
 * Ship decision based on stability class
 */
export interface StabilityShipDecision {
  allowsShip: boolean;
  stabilityClass: StabilityClass;
  ssi: number;
  riskFlag: boolean; // True if FRAGILE with explicit risk
  blockReason: string | null; // Reason for blocking (if VOLATILE)
  monotonicityViolation: boolean;
  monotonicityReason: string | null;
}

/**
 * Enforce stability rules and determine ship decision
 */
export function enforceStabilityRules(
  ssi: number,
  previousSSI: number | null,
  hasNewIntent: boolean,
  hasExternalChange: boolean
): StabilityShipDecision {
  const stabilityClass = classifyStability(ssi);

  // Check monotonicity (SSI should not decrease unless justified)
  let monotonicityViolation = false;
  let monotonicityReason: string | null = null;

  if (previousSSI !== null && ssi < previousSSI) {
    if (hasNewIntent) {
      monotonicityReason = `SSI decreased (${(previousSSI * 100).toFixed(1)}% → ${(ssi * 100).toFixed(1)}%) but justified by new intent`;
    } else if (hasExternalChange) {
      monotonicityReason = `SSI decreased (${(previousSSI * 100).toFixed(1)}% → ${(ssi * 100).toFixed(1)}%) but justified by external change`;
    } else {
      monotonicityViolation = true;
      monotonicityReason = `SSI decreased (${(previousSSI * 100).toFixed(1)}% → ${(ssi * 100).toFixed(1)}%) without justification`;
    }
  }

  // Apply stability rules
  let allowsShip: boolean;
  let riskFlag = false;
  let blockReason: string | null = null;

  switch (stabilityClass) {
    case 'VOLATILE':
      allowsShip = false;
      blockReason = `SSI ${(ssi * 100).toFixed(1)}% is below VOLATILE threshold (${STABILITY_THRESHOLDS.FRAGILE * 100}%). System is operationally risky.`;
      break;

    case 'FRAGILE':
      allowsShip = true;
      riskFlag = true;
      // Additional block if monotonicity violated without justification
      if (monotonicityViolation) {
        allowsShip = false;
        blockReason = `FRAGILE system with unjustified stability regression. ${monotonicityReason}`;
      }
      break;

    case 'STABLE':
      allowsShip = true;
      break;

    default:
      allowsShip = false;
      blockReason = 'Unknown stability class';
  }

  return {
    allowsShip,
    stabilityClass,
    ssi,
    riskFlag,
    blockReason,
    monotonicityViolation,
    monotonicityReason,
  };
}

// ============================================
// STABILITY HISTORY
// ============================================

/**
 * A single stability history entry
 */
export interface StabilityHistoryEntry {
  buildId: string;
  timestamp: Date;
  ssi: number;
  stabilityClass: StabilityClass;
  components: SSIComponents;
  shipDecision: {
    allowsShip: boolean;
    riskFlag: boolean;
    blockReason: string | null;
  };
  context: {
    hasNewIntent: boolean;
    hasExternalChange: boolean;
    wissdScore: number;
    intentCount: number;
  };
}

/**
 * Stability history store
 */
export interface StabilityHistory {
  version: number;
  entries: StabilityHistoryEntry[];
  lastUpdated: Date;
}

/**
 * Load stability history from file
 */
export function loadStabilityHistory(baseDir: string): StabilityHistory {
  const filePath = path.join(baseDir, '_stability-history.json');

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        entries: parsed.entries.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        })),
        lastUpdated: new Date(parsed.lastUpdated),
      };
    }
  } catch (err) {
    console.error('[SCE] Failed to load stability history:', err);
  }

  return {
    version: 1,
    entries: [],
    lastUpdated: new Date(),
  };
}

/**
 * Save stability history to file
 */
export function saveStabilityHistory(baseDir: string, history: StabilityHistory): void {
  const filePath = path.join(baseDir, '_stability-history.json');

  try {
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
    console.log(`[SCE] Saved stability history (${history.entries.length} entries)`);
  } catch (err) {
    console.error('[SCE] Failed to save stability history:', err);
  }
}

/**
 * Add entry to stability history
 */
export function addStabilityEntry(
  history: StabilityHistory,
  entry: StabilityHistoryEntry,
  maxEntries: number = 100
): StabilityHistory {
  const newEntries = [...history.entries, entry];

  // Keep only the last N entries
  const trimmedEntries =
    newEntries.length > maxEntries ? newEntries.slice(-maxEntries) : newEntries;

  return {
    version: history.version,
    entries: trimmedEntries,
    lastUpdated: new Date(),
  };
}

/**
 * Get previous SSI from history
 */
export function getPreviousSSI(history: StabilityHistory): number | null {
  if (history.entries.length === 0) {
    return null;
  }
  return history.entries[history.entries.length - 1].ssi;
}

/**
 * Get W-ISS-D trend from history
 */
export function getWISSDTrend(history: StabilityHistory, maxEntries: number = 10): WISSDTrend[] {
  return history.entries.slice(-maxEntries).map(e => ({
    buildId: e.buildId,
    score: e.context.wissdScore,
    timestamp: e.timestamp,
  }));
}

// ============================================
// STABILITY ENVELOPE RESULT
// ============================================

/**
 * Full stability envelope analysis result
 */
export interface StabilityEnvelopeResult {
  // Core metrics
  ssi: number;
  stabilityClass: StabilityClass;

  // Component breakdown
  components: SSIComponents;
  weights: SSIWeights;

  // Ship decision
  allowsShip: boolean;
  riskFlag: boolean;
  blockReason: string | null;

  // Monotonicity
  previousSSI: number | null;
  monotonicityViolation: boolean;
  monotonicityReason: string | null;

  // Context
  hasNewIntent: boolean;
  hasExternalChange: boolean;

  // Trend analysis
  trendDirection: 'improving' | 'stable' | 'declining';
  trendMagnitude: number;

  // History summary
  historyEntryCount: number;
  averageSSI: number | null;
}

/**
 * Run full stability envelope analysis
 */
export function runStabilityEnvelopeAnalysis(
  buildId: string,
  baseDir: string,
  inputs: SSIInputs,
  currentWISSD: number,
  intentCount: number,
  weights: SSIWeights = DEFAULT_SSI_WEIGHTS
): StabilityEnvelopeResult {
  console.log('[SCE] ==========================================');
  console.log('[SCE] STABILITY & CONFIDENCE ENVELOPE');
  console.log('[SCE] ==========================================');

  // Load history
  const history = loadStabilityHistory(baseDir);
  const previousSSI = getPreviousSSI(history);

  // Augment inputs with trend from history
  const wissdTrend = getWISSDTrend(history);
  const augmentedInputs: SSIInputs = {
    ...inputs,
    wissdTrend: [...wissdTrend, { buildId, score: currentWISSD, timestamp: new Date() }],
  };

  // Compute SSI
  const { ssi, components } = computeSSI(augmentedInputs, weights);
  console.log(`[SCE] SSI: ${(ssi * 100).toFixed(1)}%`);

  // Classify
  const stabilityClass = classifyStability(ssi);
  console.log(`[SCE] Class: ${stabilityClass}`);

  // Enforce rules
  const decision = enforceStabilityRules(
    ssi,
    previousSSI,
    inputs.hasNewIntent,
    inputs.hasExternalChange
  );

  console.log(`[SCE] Allows ship: ${decision.allowsShip}`);
  if (decision.riskFlag) {
    console.log(`[SCE] ⚠️ RISK FLAG: FRAGILE system`);
  }
  if (decision.blockReason) {
    console.log(`[SCE] ❌ BLOCKED: ${decision.blockReason}`);
  }

  // Calculate trend
  let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
  let trendMagnitude = 0;

  if (previousSSI !== null) {
    const delta = ssi - previousSSI;
    trendMagnitude = Math.abs(delta);
    if (delta > 0.02) {
      trendDirection = 'improving';
    } else if (delta < -0.02) {
      trendDirection = 'declining';
    }
  }

  // Calculate average SSI from history
  const averageSSI =
    history.entries.length > 0
      ? history.entries.reduce((sum, e) => sum + e.ssi, 0) / history.entries.length
      : null;

  // Create new history entry
  const newEntry: StabilityHistoryEntry = {
    buildId,
    timestamp: new Date(),
    ssi,
    stabilityClass,
    components,
    shipDecision: {
      allowsShip: decision.allowsShip,
      riskFlag: decision.riskFlag,
      blockReason: decision.blockReason,
    },
    context: {
      hasNewIntent: inputs.hasNewIntent,
      hasExternalChange: inputs.hasExternalChange,
      wissdScore: currentWISSD,
      intentCount,
    },
  };

  // Save updated history
  const updatedHistory = addStabilityEntry(history, newEntry);
  saveStabilityHistory(baseDir, updatedHistory);

  console.log('[SCE] ------------------------------------------');
  console.log('[SCE] Component Scores:');
  console.log(
    `[SCE]   W-ISS-D Trend: ${(components.wissdTrendScore * 100).toFixed(0)}% - ${components.wissdTrendReason}`
  );
  console.log(
    `[SCE]   RGL Trust: ${(components.rglTrustScore * 100).toFixed(0)}% - ${components.rglTrustReason}`
  );
  console.log(
    `[SCE]   Policy Ratio: ${(components.policyRatioScore * 100).toFixed(0)}% - ${components.policyRatioReason}`
  );
  console.log(
    `[SCE]   Coupling: ${(components.couplingScore * 100).toFixed(0)}% - ${components.couplingReason}`
  );
  console.log(
    `[SCE]   Churn: ${(components.churnScore * 100).toFixed(0)}% - ${components.churnReason}`
  );
  console.log('[SCE] ==========================================');

  return {
    ssi,
    stabilityClass,
    components,
    weights,
    allowsShip: decision.allowsShip,
    riskFlag: decision.riskFlag,
    blockReason: decision.blockReason,
    previousSSI,
    monotonicityViolation: decision.monotonicityViolation,
    monotonicityReason: decision.monotonicityReason,
    hasNewIntent: inputs.hasNewIntent,
    hasExternalChange: inputs.hasExternalChange,
    trendDirection,
    trendMagnitude,
    historyEntryCount: updatedHistory.entries.length,
    averageSSI,
  };
}

// ============================================
// LOGGING
// ============================================

/**
 * Log stability envelope result
 */
export function logStabilityEnvelopeResult(result: StabilityEnvelopeResult): void {
  console.log('[SCE] ==========================================');
  console.log('[SCE] STABILITY ENVELOPE RESULT');
  console.log('[SCE] ==========================================');
  console.log(`[SCE] SSI: ${(result.ssi * 100).toFixed(1)}%`);
  console.log(`[SCE] Class: ${result.stabilityClass}`);
  console.log(
    `[SCE] Trend: ${result.trendDirection} (Δ${(result.trendMagnitude * 100).toFixed(1)}%)`
  );
  console.log('[SCE] ------------------------------------------');
  console.log(`[SCE] Allows Ship: ${result.allowsShip}`);
  console.log(`[SCE] Risk Flag: ${result.riskFlag}`);
  if (result.blockReason) {
    console.log(`[SCE] Block Reason: ${result.blockReason}`);
  }
  if (result.monotonicityViolation) {
    console.log(`[SCE] ⚠️ Monotonicity Violation: ${result.monotonicityReason}`);
  }
  console.log('[SCE] ------------------------------------------');
  console.log(`[SCE] History: ${result.historyEntryCount} entries`);
  if (result.averageSSI !== null) {
    console.log(`[SCE] Average SSI: ${(result.averageSSI * 100).toFixed(1)}%`);
  }
  console.log('[SCE] ==========================================');
}
