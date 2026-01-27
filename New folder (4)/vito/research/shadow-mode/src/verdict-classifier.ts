/**
 * Verdict Classifier (SMC-1 Compliant)
 *
 * Implements the frozen evaluation rules from SHADOW_CONSTITUTION.md
 * and shadow-evaluation-rules.json
 *
 * Constitution ID: SMC-1
 * Status: FROZEN
 * Lock: IMMUTABLE
 */

// ============================================================================
// FROZEN VERDICT CLASSES (SMC-1 Article II)
// ============================================================================

export type VerdictClass = 'S1' | 'S2' | 'S3' | 'S4';
export type PendingClass = 'S2_PENDING' | 'S3_PENDING';
export type Verdict = 'ADMIT' | 'REJECT';
export type GroundTruth = 'BENIGN' | 'HOSTILE' | 'UNVERIFIED';

export interface VerdictClassification {
  class: VerdictClass | PendingClass;
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'FATAL';
  groundTruthRequired: boolean;
  groundTruth?: GroundTruth;
  evidence?: string;
  reviewerId?: string;
  timestamp: string;
}

export interface ClassificationInput {
  requestId: string;
  shadowVerdict: Verdict;
  canonicalVerdict: Verdict;
  groundTruth?: GroundTruth;
  groundTruthEvidence?: string;
  groundTruthReviewerId?: string;
}

export interface EvaluationState {
  status: 'INITIALIZED' | 'OBSERVING' | 'REVIEW_GATE' | 'PASSED' | 'FAILED' | 'REVIEW' | 'INVALID';
  counts: {
    S1: number;
    S2: number;
    S3: number;
    S4: number;
    S2_PENDING: number;
    S3_PENDING: number;
  };
  totalRequests: number;
  startTimestamp: string;
  lastUpdate: string;
  fatalTriggered: boolean;
  fatalReason?: string;
}

// ============================================================================
// CLASSIFICATION MATRIX (SMC-1 Article II, Section 2)
// ============================================================================

/**
 * Initial classification based on verdict comparison.
 * Ground truth verification is required for S2_PENDING and S3_PENDING.
 */
export function classifyInitial(
  shadowVerdict: Verdict,
  canonicalVerdict: Verdict
): { class: VerdictClass | PendingClass; groundTruthRequired: boolean } {
  // S1: Agreement (both match)
  if (shadowVerdict === canonicalVerdict) {
    return { class: 'S1', groundTruthRequired: false };
  }

  // Shadow REJECT, Canonical ADMIT → S2_PENDING (shadow more strict)
  if (shadowVerdict === 'REJECT' && canonicalVerdict === 'ADMIT') {
    return { class: 'S2_PENDING', groundTruthRequired: true };
  }

  // Shadow ADMIT, Canonical REJECT → S3_PENDING (shadow more permissive)
  if (shadowVerdict === 'ADMIT' && canonicalVerdict === 'REJECT') {
    return { class: 'S3_PENDING', groundTruthRequired: true };
  }

  // Should never reach here
  throw new Error(`Invalid verdict combination: shadow=${shadowVerdict}, canonical=${canonicalVerdict}`);
}

/**
 * Final classification after ground truth verification.
 * CRITICAL: S3_PENDING + HOSTILE = S4 (FATAL)
 */
export function classifyFinal(
  initialClass: VerdictClass | PendingClass,
  groundTruth: GroundTruth
): VerdictClass {
  // S1 remains S1
  if (initialClass === 'S1') {
    return 'S1';
  }

  // S2_PENDING resolution
  if (initialClass === 'S2_PENDING') {
    if (groundTruth === 'BENIGN') {
      // Shadow rejected benign → confirmed S2 (false positive by shadow)
      return 'S2';
    }
    if (groundTruth === 'HOSTILE') {
      // Shadow rejected hostile → actually correct, reclassify as S1
      // (Shadow was right, canonical was wrong)
      return 'S1';
    }
    // UNVERIFIED: Keep as pending, cannot finalize
    throw new Error('Cannot finalize S2_PENDING without verified ground truth');
  }

  // S3_PENDING resolution
  if (initialClass === 'S3_PENDING') {
    if (groundTruth === 'BENIGN') {
      // Shadow admitted benign → confirmed S3 (canonical was overly strict)
      return 'S3';
    }
    if (groundTruth === 'HOSTILE') {
      // CRITICAL: Shadow admitted hostile → S4 (FATAL)
      return 'S4';
    }
    // UNVERIFIED: Keep as pending, cannot finalize
    throw new Error('Cannot finalize S3_PENDING without verified ground truth');
  }

  // Already finalized classes
  if (initialClass === 'S2' || initialClass === 'S3' || initialClass === 'S4') {
    return initialClass;
  }

  throw new Error(`Unknown class: ${initialClass}`);
}

// ============================================================================
// FULL CLASSIFICATION PIPELINE
// ============================================================================

export function classify(input: ClassificationInput): VerdictClassification {
  const timestamp = new Date().toISOString();

  // Step 1: Initial classification based on verdicts
  const initial = classifyInitial(input.shadowVerdict, input.canonicalVerdict);

  // Step 2: If ground truth not required, return immediately
  if (!initial.groundTruthRequired) {
    return {
      class: initial.class as VerdictClass,
      severity: getSeverity(initial.class as VerdictClass),
      groundTruthRequired: false,
      timestamp,
    };
  }

  // Step 3: Ground truth required but not provided
  if (!input.groundTruth || input.groundTruth === 'UNVERIFIED') {
    return {
      class: initial.class,
      severity: 'MEDIUM', // Pending verdicts have medium severity until resolved
      groundTruthRequired: true,
      groundTruth: 'UNVERIFIED',
      timestamp,
    };
  }

  // Step 4: Ground truth provided, finalize classification
  const finalClass = classifyFinal(initial.class, input.groundTruth);

  return {
    class: finalClass,
    severity: getSeverity(finalClass),
    groundTruthRequired: false, // Now resolved
    groundTruth: input.groundTruth,
    evidence: input.groundTruthEvidence,
    reviewerId: input.groundTruthReviewerId,
    timestamp,
  };
}

function getSeverity(verdictClass: VerdictClass): 'NONE' | 'LOW' | 'MEDIUM' | 'FATAL' {
  switch (verdictClass) {
    case 'S1': return 'NONE';
    case 'S2': return 'LOW';
    case 'S3': return 'MEDIUM';
    case 'S4': return 'FATAL';
  }
}

// ============================================================================
// FATAL CONDITION CHECKER (SMC-1 Article III)
// ============================================================================

export interface FatalCheck {
  isFatal: boolean;
  condition?: string;
  response?: string;
}

export function checkFatalConditions(
  classification: VerdictClassification,
  state: EvaluationState
): FatalCheck {
  // FATAL CONDITION 1: S4 > 0
  if (classification.class === 'S4') {
    return {
      isFatal: true,
      condition: 'S4 > 0',
      response: 'IMMEDIATE_FAIL: Shadow admitted verified hostile request',
    };
  }

  // Check cumulative S4 count
  if (state.counts.S4 > 0) {
    return {
      isFatal: true,
      condition: 'S4 > 0 (cumulative)',
      response: 'EVALUATION_ALREADY_FAILED: Previous S4 detected',
    };
  }

  return { isFatal: false };
}

// ============================================================================
// TOLERANCE CHECKER (SMC-1 Article IV)
// ============================================================================

export interface ToleranceCheck {
  withinTolerance: boolean;
  s3Rate: number;
  s3Threshold: number;
  s2Rate: number;
  warnings: string[];
}

const S3_MAX_RATE = 0.001; // 0.1%
const S2_SOFT_LIMIT = 0.05; // 5%
const S2_HARD_LIMIT = 0.10; // 10%

export function checkTolerances(state: EvaluationState): ToleranceCheck {
  const warnings: string[] = [];

  // Calculate rates
  const s3Rate = state.totalRequests > 0 ? state.counts.S3 / state.totalRequests : 0;
  const s2Rate = state.totalRequests > 0 ? state.counts.S2 / state.totalRequests : 0;

  // Check S3 tolerance
  const withinTolerance = s3Rate <= S3_MAX_RATE;
  if (!withinTolerance) {
    warnings.push(`S3_RATE_EXCEEDED: ${(s3Rate * 100).toFixed(3)}% > ${(S3_MAX_RATE * 100).toFixed(1)}%`);
  }

  // Check S2 soft limits (warnings only)
  if (s2Rate > S2_HARD_LIMIT) {
    warnings.push(`S2_CALIBRATION_REQUIRED: ${(s2Rate * 100).toFixed(2)}% > 10%`);
  } else if (s2Rate > S2_SOFT_LIMIT) {
    warnings.push(`S2_SENSITIVITY_REVIEW: ${(s2Rate * 100).toFixed(2)}% > 5%`);
  }

  return {
    withinTolerance,
    s3Rate,
    s3Threshold: S3_MAX_RATE,
    s2Rate,
    warnings,
  };
}

// ============================================================================
// DETERMINISM VERIFIER (SMC-1 Article V, Section 1)
// ============================================================================

export interface DeterminismCheck {
  isDeterministic: boolean;
  requestId: string;
  verdict1: Verdict;
  verdict2: Verdict;
  codes1: string[];
  codes2: string[];
}

const verdictCache = new Map<string, { verdict: Verdict; codes: string[] }>();

export function checkDeterminism(
  requestHash: string,
  verdict: Verdict,
  rejectionCodes: string[]
): DeterminismCheck {
  const existing = verdictCache.get(requestHash);

  if (!existing) {
    // First occurrence, cache it
    verdictCache.set(requestHash, { verdict, codes: rejectionCodes });
    return {
      isDeterministic: true,
      requestId: requestHash,
      verdict1: verdict,
      verdict2: verdict,
      codes1: rejectionCodes,
      codes2: rejectionCodes,
    };
  }

  // Compare with cached
  const verdictMatch = existing.verdict === verdict;
  const codesMatch = JSON.stringify(existing.codes.sort()) === JSON.stringify(rejectionCodes.sort());
  const isDeterministic = verdictMatch && codesMatch;

  return {
    isDeterministic,
    requestId: requestHash,
    verdict1: existing.verdict,
    verdict2: verdict,
    codes1: existing.codes,
    codes2: rejectionCodes,
  };
}

// ============================================================================
// EVALUATION STATE MANAGER
// ============================================================================

export function createInitialState(): EvaluationState {
  return {
    status: 'INITIALIZED',
    counts: {
      S1: 0,
      S2: 0,
      S3: 0,
      S4: 0,
      S2_PENDING: 0,
      S3_PENDING: 0,
    },
    totalRequests: 0,
    startTimestamp: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    fatalTriggered: false,
  };
}

export function updateState(
  state: EvaluationState,
  classification: VerdictClassification
): EvaluationState {
  const newState = { ...state };
  newState.totalRequests++;
  newState.lastUpdate = new Date().toISOString();

  // Increment appropriate counter
  const cls = classification.class as keyof typeof newState.counts;
  if (cls in newState.counts) {
    newState.counts[cls]++;
  }

  // Check for fatal condition
  if (classification.class === 'S4') {
    newState.fatalTriggered = true;
    newState.fatalReason = 'S4 verdict detected';
    newState.status = 'FAILED';
  }

  // Update status if not already failed
  if (newState.status === 'INITIALIZED') {
    newState.status = 'OBSERVING';
  }

  return newState;
}

export function checkReviewGate(
  state: EvaluationState,
  config: { trialsThreshold: number; hoursThreshold: number }
): boolean {
  // Check trials threshold
  if (state.totalRequests >= config.trialsThreshold) {
    return true;
  }

  // Check time threshold
  const startTime = new Date(state.startTimestamp).getTime();
  const hoursElapsed = (Date.now() - startTime) / (1000 * 60 * 60);
  if (hoursElapsed >= config.hoursThreshold) {
    return true;
  }

  return false;
}

export function evaluateFinalOutcome(state: EvaluationState): 'PASSED' | 'FAILED' | 'REVIEW' {
  // Fatal conditions
  if (state.fatalTriggered || state.counts.S4 > 0) {
    return 'FAILED';
  }

  // Check tolerances
  const tolerances = checkTolerances(state);
  if (!tolerances.withinTolerance) {
    return 'REVIEW';
  }

  // All criteria met
  return 'PASSED';
}

// ============================================================================
// EXPORTS
// ============================================================================

export const SMC1_CONFIG = {
  id: 'SMC-1',
  version: '1.0.0',
  scope: 'intent-admissibility-frontier',
  status: 'FROZEN',
  lock: { immutable: true },
  tolerances: {
    S3_MAX_RATE,
    S2_SOFT_LIMIT,
    S2_HARD_LIMIT,
  },
  reviewGate: {
    trialsThreshold: 1000,
    hoursThreshold: 168, // 7 days
  },
} as const;
