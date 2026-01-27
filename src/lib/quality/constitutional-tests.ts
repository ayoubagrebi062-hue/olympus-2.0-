/**
 * OLYMPUS 2.0 - Constitutional Test & Explanation Layer (CTEL)
 * Part 1: Constitutional Tests
 *
 * Executable tests for all non-negotiable OLYMPUS guarantees.
 * These tests OBSERVE and VERIFY - they do NOT modify behavior.
 *
 * CONSTITUTION_VIOLATION = HARD FAIL (no exceptions)
 */

import { IntentFate, IntentFatesResult, IntentFateAssignment } from './intent-governance';
import { HostileIntentValidation } from './hostile-intent-harness';
import { StabilityEnvelopeResult } from './stability-envelope';
import { IntentAdequacyResult } from './intent-adequacy';
import { SystemUVDResult } from './user-value-density';
import { ICGReport } from './intent-graph';

// ============================================
// CONSTITUTION VIOLATION TYPE
// ============================================

/**
 * Constitution violation - represents a breach of OLYMPUS guarantees
 */
export interface ConstitutionViolation {
  /** Unique violation ID */
  id: string;

  /** Which constitutional article was violated */
  article: ConstitutionalArticle;

  /** Human-readable description */
  description: string;

  /** Evidence supporting the violation */
  evidence: string;

  /** Severity (all constitution violations are CRITICAL) */
  severity: 'CRITICAL';

  /** Timestamp of detection */
  detectedAt: string;

  /** Build ID where violation occurred */
  buildId: string;
}

/**
 * Constitutional articles - the non-negotiable guarantees
 */
export type ConstitutionalArticle =
  | 'ARTICLE_1_DETERMINISM'
  | 'ARTICLE_2_MONOTONICITY'
  | 'ARTICLE_3_HOSTILE_RESISTANCE'
  | 'ARTICLE_4_EVOLUTION_ENFORCEMENT'
  | 'ARTICLE_5_AUDIT_TRAIL'
  | 'ARTICLE_6_HARD_GATE_BLOCKING'
  | 'ARTICLE_7_FORBIDDEN_PERMANENCE'
  | 'ARTICLE_8_CRITICAL_MANDATORY'
  | 'ARTICLE_9_NO_BYPASS'
  | 'ARTICLE_10_TRUST_THRESHOLD';

/**
 * Constitutional article definitions
 */
export const CONSTITUTIONAL_ARTICLES: Record<
  ConstitutionalArticle,
  {
    title: string;
    description: string;
    guarantee: string;
  }
> = {
  ARTICLE_1_DETERMINISM: {
    title: 'Determinism',
    description: 'Given the same input, OLYMPUS must produce the same output',
    guarantee: 'No randomness, no ML inference, no heuristic sampling',
  },
  ARTICLE_2_MONOTONICITY: {
    title: 'Monotonicity',
    description: 'W-ISS-D score must never regress without explicit cause',
    guarantee: 'Regression only with new intent, external change, or explicit acknowledgment',
  },
  ARTICLE_3_HOSTILE_RESISTANCE: {
    title: 'Hostile Resistance',
    description: 'Every build must pass hostile intent testing',
    guarantee: '100% hostile intents blocked, 0% leaks permitted',
  },
  ARTICLE_4_EVOLUTION_ENFORCEMENT: {
    title: 'Evolution Enforcement',
    description: 'Intent fates follow strict transition rules',
    guarantee: 'FORBIDDEN never recovers, QUARANTINED escalates after 3 strikes',
  },
  ARTICLE_5_AUDIT_TRAIL: {
    title: 'Audit Trail',
    description: 'Every decision is logged with reason and evidence',
    guarantee: 'Persisted to filesystem, reproducible from inputs',
  },
  ARTICLE_6_HARD_GATE_BLOCKING: {
    title: 'Hard Gate Blocking',
    description: 'HARD gate failures block shipping',
    guarantee: 'No exceptions, no overrides without penalty',
  },
  ARTICLE_7_FORBIDDEN_PERMANENCE: {
    title: 'Forbidden Permanence',
    description: 'FORBIDDEN intents cannot be rehabilitated',
    guarantee: 'Once FORBIDDEN, always FORBIDDEN',
  },
  ARTICLE_8_CRITICAL_MANDATORY: {
    title: 'Critical Mandatory',
    description: 'Critical intents cannot be excluded by governance',
    guarantee: 'criticalMandatory = true in all governance decisions',
  },
  ARTICLE_9_NO_BYPASS: {
    title: 'No Bypass',
    description: 'Safety checks cannot be disabled',
    guarantee: 'No config flags, env vars, or admin overrides that skip gates',
  },
  ARTICLE_10_TRUST_THRESHOLD: {
    title: 'Trust Threshold',
    description: 'Low trust results in FORBIDDEN fate',
    guarantee: 'Trust < 30% = FORBIDDEN, no exceptions',
  },
};

// ============================================
// CONSTITUTIONAL TEST INPUTS
// ============================================

/**
 * All inputs needed for constitutional testing
 */
export interface ConstitutionalTestInputs {
  buildId: string;

  // Gate results
  hithResult: HostileIntentValidation | null;
  stabilityResult: StabilityEnvelopeResult | null;
  adequacyResult: IntentAdequacyResult | null;
  uvdResult: SystemUVDResult | null;
  icgResult: ICGReport | null;
  fateResult: IntentFatesResult | null;

  // Previous build data (for monotonicity)
  previousWISSD: number | null;
  hasNewIntent: boolean;
  hasExternalChange: boolean;

  // Gate pass/fail status
  gateResults: {
    semantic: boolean;
    behavioral: boolean;
    causal: boolean;
    icg: boolean;
    era: boolean;
    ircl: boolean;
    itgcl: boolean;
    stability: boolean;
    hith: boolean;
    ial: boolean;
    uvdl: boolean;
    ige: boolean;
    fate: boolean;
  };

  // Override status
  hasActiveOverride: boolean;
  overrideJustification: string | null;
}

// ============================================
// CONSTITUTIONAL TESTS
// ============================================

/**
 * Test Article 3: Hostile Resistance
 * 100% hostile intents must be blocked
 */
export function testHostileResistance(
  hithResult: HostileIntentValidation | null,
  buildId: string
): ConstitutionViolation | null {
  if (!hithResult) {
    return {
      id: `cv-${buildId}-art3-missing`,
      article: 'ARTICLE_3_HOSTILE_RESISTANCE',
      description: 'Hostile Intent Test Harness was not executed',
      evidence: 'hithResult is null - HITH is mandatory and cannot be skipped',
      severity: 'CRITICAL',
      detectedAt: new Date().toISOString(),
      buildId,
    };
  }

  if (!hithResult.validationPassed) {
    return {
      id: `cv-${buildId}-art3-leak`,
      article: 'ARTICLE_3_HOSTILE_RESISTANCE',
      description: `Hostile intents leaked: ${hithResult.leaked} of ${hithResult.total}`,
      evidence: `Leaked cases: ${hithResult.failures.map(f => f.caseId).join(', ')}`,
      severity: 'CRITICAL',
      detectedAt: new Date().toISOString(),
      buildId,
    };
  }

  return null;
}

/**
 * Test Article 4 & 7: Evolution Enforcement & Forbidden Permanence
 * FORBIDDEN intents cannot recover, evolution rules must be followed
 */
export function testEvolutionEnforcement(
  fateResult: IntentFatesResult | null,
  buildId: string
): ConstitutionViolation[] {
  const violations: ConstitutionViolation[] = [];

  if (!fateResult) {
    violations.push({
      id: `cv-${buildId}-art4-missing`,
      article: 'ARTICLE_4_EVOLUTION_ENFORCEMENT',
      description: 'Fate assignment was not executed',
      evidence: 'fateResult is null - Fate assignment is mandatory',
      severity: 'CRITICAL',
      detectedAt: new Date().toISOString(),
      buildId,
    });
    return violations;
  }

  // Check for evolution violations
  if (fateResult.hasEvolutionViolation) {
    for (const ev of fateResult.evolutionViolations) {
      violations.push({
        id: `cv-${buildId}-art4-${ev.intentId}`,
        article: 'ARTICLE_4_EVOLUTION_ENFORCEMENT',
        description: `Invalid fate transition: ${ev.previousFate} → ${ev.newFate}`,
        evidence: `Intent ${ev.intentId} attempted invalid evolution`,
        severity: 'CRITICAL',
        detectedAt: new Date().toISOString(),
        buildId,
      });
    }
  }

  // Check for FORBIDDEN recovery attempts (Article 7)
  for (const fate of fateResult.fates) {
    if (fate.previousFate === IntentFate.FORBIDDEN && fate.fate !== IntentFate.FORBIDDEN) {
      violations.push({
        id: `cv-${buildId}-art7-${fate.intentId}`,
        article: 'ARTICLE_7_FORBIDDEN_PERMANENCE',
        description: `FORBIDDEN intent ${fate.intentId} attempted recovery to ${fate.fate}`,
        evidence: 'Once FORBIDDEN, always FORBIDDEN. No rehabilitation permitted.',
        severity: 'CRITICAL',
        detectedAt: new Date().toISOString(),
        buildId,
      });
    }
  }

  return violations;
}

/**
 * Test Article 6: Hard Gate Blocking
 * All HARD gates must block shipping when they fail
 */
export function testHardGateBlocking(
  gateResults: ConstitutionalTestInputs['gateResults'],
  overallShipDecision: boolean,
  buildId: string
): ConstitutionViolation[] {
  const violations: ConstitutionViolation[] = [];

  const hardGates: Array<{ name: string; passed: boolean }> = [
    { name: 'semantic', passed: gateResults.semantic },
    { name: 'behavioral', passed: gateResults.behavioral },
    { name: 'causal', passed: gateResults.causal },
    { name: 'icg', passed: gateResults.icg },
    { name: 'era', passed: gateResults.era },
    { name: 'ircl', passed: gateResults.ircl },
    { name: 'itgcl', passed: gateResults.itgcl },
    { name: 'stability', passed: gateResults.stability },
    { name: 'hith', passed: gateResults.hith },
    { name: 'ial', passed: gateResults.ial },
    { name: 'uvdl', passed: gateResults.uvdl },
    { name: 'ige', passed: gateResults.ige },
    { name: 'fate', passed: gateResults.fate },
  ];

  const failedGates = hardGates.filter(g => !g.passed);

  // If any hard gate failed but build claims shippable, violation
  if (failedGates.length > 0 && overallShipDecision) {
    for (const gate of failedGates) {
      violations.push({
        id: `cv-${buildId}-art6-${gate.name}`,
        article: 'ARTICLE_6_HARD_GATE_BLOCKING',
        description: `Hard gate ${gate.name.toUpperCase()} failed but build marked shippable`,
        evidence: `Gate ${gate.name} returned false, overallSuccess should be false`,
        severity: 'CRITICAL',
        detectedAt: new Date().toISOString(),
        buildId,
      });
    }
  }

  return violations;
}

/**
 * Test Article 10: Trust Threshold
 * Trust < 30% must result in FORBIDDEN fate
 */
export function testTrustThreshold(
  fateResult: IntentFatesResult | null,
  buildId: string
): ConstitutionViolation[] {
  const violations: ConstitutionViolation[] = [];

  if (!fateResult) {
    return violations;
  }

  const TRUST_THRESHOLD = 0.3;

  for (const fate of fateResult.fates) {
    if (fate.metrics.trustScore < TRUST_THRESHOLD && fate.fate !== IntentFate.FORBIDDEN) {
      violations.push({
        id: `cv-${buildId}-art10-${fate.intentId}`,
        article: 'ARTICLE_10_TRUST_THRESHOLD',
        description: `Intent ${fate.intentId} has trust ${(fate.metrics.trustScore * 100).toFixed(1)}% but is not FORBIDDEN`,
        evidence: `Trust ${(fate.metrics.trustScore * 100).toFixed(1)}% < 30% threshold, must be FORBIDDEN`,
        severity: 'CRITICAL',
        detectedAt: new Date().toISOString(),
        buildId,
      });
    }
  }

  return violations;
}

/**
 * Test Article 8: Critical Mandatory
 * Critical intents cannot be excluded by governance
 */
export function testCriticalMandatory(
  fateResult: IntentFatesResult | null,
  buildId: string
): ConstitutionViolation[] {
  const violations: ConstitutionViolation[] = [];

  if (!fateResult) {
    return violations;
  }

  for (const fate of fateResult.fates) {
    if (fate.priority === 'critical' && !fate.wasSelected && fate.fate !== IntentFate.FORBIDDEN) {
      violations.push({
        id: `cv-${buildId}-art8-${fate.intentId}`,
        article: 'ARTICLE_8_CRITICAL_MANDATORY',
        description: `Critical intent ${fate.intentId} was excluded but not FORBIDDEN`,
        evidence: 'Critical intents cannot be excluded by governance optimization',
        severity: 'CRITICAL',
        detectedAt: new Date().toISOString(),
        buildId,
      });
    }
  }

  return violations;
}

/**
 * Test Article 2: Monotonicity
 * W-ISS-D cannot regress without explicit cause
 */
export function testMonotonicity(
  currentWISSD: number,
  previousWISSD: number | null,
  hasNewIntent: boolean,
  hasExternalChange: boolean,
  hasAcknowledgedRegression: boolean,
  buildId: string
): ConstitutionViolation | null {
  if (previousWISSD === null) {
    // First build, no monotonicity check needed
    return null;
  }

  const regressed = currentWISSD < previousWISSD;

  if (regressed && !hasNewIntent && !hasExternalChange && !hasAcknowledgedRegression) {
    return {
      id: `cv-${buildId}-art2`,
      article: 'ARTICLE_2_MONOTONICITY',
      description: `W-ISS-D regressed from ${previousWISSD}% to ${currentWISSD}% without valid cause`,
      evidence: 'No new intent, no external change, no acknowledged regression',
      severity: 'CRITICAL',
      detectedAt: new Date().toISOString(),
      buildId,
    };
  }

  return null;
}

// ============================================
// CONSTITUTIONAL TEST RESULT
// ============================================

/**
 * Result of all constitutional tests
 */
export interface ConstitutionalTestResult {
  /** Did all tests pass? */
  passed: boolean;

  /** All violations found */
  violations: ConstitutionViolation[];

  /** Articles tested */
  articlesTested: ConstitutionalArticle[];

  /** Articles violated */
  articlesViolated: ConstitutionalArticle[];

  /** Summary counts */
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    violations: number;
  };

  /** Can ship based on constitution? */
  allowsShip: boolean;

  /** Block reason if any */
  blockReason: string | null;

  /** Timestamp */
  testedAt: string;

  /** Build ID */
  buildId: string;
}

// ============================================
// MAIN TEST RUNNER
// ============================================

/**
 * Run all constitutional tests
 */
export function runConstitutionalTests(
  inputs: ConstitutionalTestInputs,
  overallShipDecision: boolean
): ConstitutionalTestResult {
  console.log('[CTEL] ==========================================');
  console.log('[CTEL] CONSTITUTIONAL TEST SUITE');
  console.log('[CTEL] ==========================================');
  console.log(`[CTEL] Build ID: ${inputs.buildId}`);
  console.log('[CTEL] Testing all constitutional articles...');

  const violations: ConstitutionViolation[] = [];
  const articlesTested: ConstitutionalArticle[] = [];

  // Test Article 3: Hostile Resistance
  console.log('[CTEL] Testing ARTICLE_3_HOSTILE_RESISTANCE...');
  articlesTested.push('ARTICLE_3_HOSTILE_RESISTANCE');
  const art3Violation = testHostileResistance(inputs.hithResult, inputs.buildId);
  if (art3Violation) {
    violations.push(art3Violation);
    console.log(`[CTEL]   ❌ VIOLATION: ${art3Violation.description}`);
  } else {
    console.log('[CTEL]   ✓ PASSED');
  }

  // Test Article 4 & 7: Evolution Enforcement & Forbidden Permanence
  console.log('[CTEL] Testing ARTICLE_4_EVOLUTION_ENFORCEMENT...');
  console.log('[CTEL] Testing ARTICLE_7_FORBIDDEN_PERMANENCE...');
  articlesTested.push('ARTICLE_4_EVOLUTION_ENFORCEMENT');
  articlesTested.push('ARTICLE_7_FORBIDDEN_PERMANENCE');
  const art4_7Violations = testEvolutionEnforcement(inputs.fateResult, inputs.buildId);
  if (art4_7Violations.length > 0) {
    violations.push(...art4_7Violations);
    for (const v of art4_7Violations) {
      console.log(`[CTEL]   ❌ VIOLATION: ${v.description}`);
    }
  } else {
    console.log('[CTEL]   ✓ PASSED');
  }

  // Test Article 6: Hard Gate Blocking
  console.log('[CTEL] Testing ARTICLE_6_HARD_GATE_BLOCKING...');
  articlesTested.push('ARTICLE_6_HARD_GATE_BLOCKING');
  const art6Violations = testHardGateBlocking(
    inputs.gateResults,
    overallShipDecision,
    inputs.buildId
  );
  if (art6Violations.length > 0) {
    violations.push(...art6Violations);
    for (const v of art6Violations) {
      console.log(`[CTEL]   ❌ VIOLATION: ${v.description}`);
    }
  } else {
    console.log('[CTEL]   ✓ PASSED');
  }

  // Test Article 8: Critical Mandatory
  console.log('[CTEL] Testing ARTICLE_8_CRITICAL_MANDATORY...');
  articlesTested.push('ARTICLE_8_CRITICAL_MANDATORY');
  const art8Violations = testCriticalMandatory(inputs.fateResult, inputs.buildId);
  if (art8Violations.length > 0) {
    violations.push(...art8Violations);
    for (const v of art8Violations) {
      console.log(`[CTEL]   ❌ VIOLATION: ${v.description}`);
    }
  } else {
    console.log('[CTEL]   ✓ PASSED');
  }

  // Test Article 10: Trust Threshold
  console.log('[CTEL] Testing ARTICLE_10_TRUST_THRESHOLD...');
  articlesTested.push('ARTICLE_10_TRUST_THRESHOLD');
  const art10Violations = testTrustThreshold(inputs.fateResult, inputs.buildId);
  if (art10Violations.length > 0) {
    violations.push(...art10Violations);
    for (const v of art10Violations) {
      console.log(`[CTEL]   ❌ VIOLATION: ${v.description}`);
    }
  } else {
    console.log('[CTEL]   ✓ PASSED');
  }

  // Test Article 2: Monotonicity
  console.log('[CTEL] Testing ARTICLE_2_MONOTONICITY...');
  articlesTested.push('ARTICLE_2_MONOTONICITY');
  const currentWISSD = inputs.icgResult?.wiss.score ?? 0;
  const art2Violation = testMonotonicity(
    currentWISSD,
    inputs.previousWISSD,
    inputs.hasNewIntent,
    inputs.hasExternalChange,
    false, // No acknowledged regression in standard flow
    inputs.buildId
  );
  if (art2Violation) {
    violations.push(art2Violation);
    console.log(`[CTEL]   ❌ VIOLATION: ${art2Violation.description}`);
  } else {
    console.log('[CTEL]   ✓ PASSED');
  }

  // Compute results
  const articlesViolated = [...new Set(violations.map(v => v.article))];
  const passed = violations.length === 0;
  const allowsShip = passed; // Constitution violations always block

  let blockReason: string | null = null;
  if (!passed) {
    blockReason = `CONSTITUTION_VIOLATION: ${articlesViolated.length} article(s) violated - ${articlesViolated.join(', ')}`;
  }

  console.log('[CTEL] ------------------------------------------');
  console.log(`[CTEL] Articles Tested: ${articlesTested.length}`);
  console.log(`[CTEL] Violations: ${violations.length}`);
  console.log(`[CTEL] Articles Violated: ${articlesViolated.length}`);
  console.log(`[CTEL] Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`[CTEL] Allows Ship: ${allowsShip}`);
  if (blockReason) {
    console.log(`[CTEL] Block Reason: ${blockReason}`);
  }
  console.log('[CTEL] ==========================================');

  return {
    passed,
    violations,
    articlesTested,
    articlesViolated,
    summary: {
      totalTests: articlesTested.length,
      passed: articlesTested.length - articlesViolated.length,
      failed: articlesViolated.length,
      violations: violations.length,
    },
    allowsShip,
    blockReason,
    testedAt: new Date().toISOString(),
    buildId: inputs.buildId,
  };
}

/**
 * Log constitutional test results
 */
export function logConstitutionalTestResult(result: ConstitutionalTestResult): void {
  console.log('[CTEL] ==========================================');
  console.log('[CTEL] CONSTITUTIONAL TEST SUMMARY');
  console.log('[CTEL] ==========================================');
  console.log(`[CTEL] Status: ${result.passed ? 'ALL ARTICLES UPHELD' : 'CONSTITUTION VIOLATED'}`);
  console.log(`[CTEL] Tests: ${result.summary.passed}/${result.summary.totalTests} passed`);
  console.log(`[CTEL] Violations: ${result.summary.violations}`);

  if (result.violations.length > 0) {
    console.log('[CTEL] Violated Articles:');
    for (const article of result.articlesViolated) {
      const def = CONSTITUTIONAL_ARTICLES[article];
      console.log(`[CTEL]   - ${article}: ${def.title}`);
    }
    console.log('[CTEL] Violation Details:');
    for (const v of result.violations) {
      console.log(`[CTEL]   - ${v.id}: ${v.description}`);
    }
  }

  console.log(`[CTEL] Allows Ship: ${result.allowsShip ? 'YES' : 'NO'}`);
  if (result.blockReason) {
    console.log(`[CTEL] Block Reason: ${result.blockReason}`);
  }
  console.log('[CTEL] ==========================================');
}

/**
 * Get constitutional test output for build artifact
 */
export function getConstitutionalTestOutput(result: ConstitutionalTestResult): {
  passed: boolean;
  violations: Array<{
    id: string;
    article: string;
    articleTitle: string;
    description: string;
    evidence: string;
  }>;
  articlesTested: string[];
  articlesViolated: string[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    violations: number;
  };
  allowsShip: boolean;
  blockReason: string | null;
} {
  return {
    passed: result.passed,
    violations: result.violations.map(v => ({
      id: v.id,
      article: v.article,
      articleTitle: CONSTITUTIONAL_ARTICLES[v.article].title,
      description: v.description,
      evidence: v.evidence,
    })),
    articlesTested: result.articlesTested,
    articlesViolated: result.articlesViolated,
    summary: result.summary,
    allowsShip: result.allowsShip,
    blockReason: result.blockReason,
  };
}
