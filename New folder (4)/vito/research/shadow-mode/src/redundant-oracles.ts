/**
 * Redundant Oracle System Implementation
 *
 * Provides independent verification of safety invariants through
 * three diverse oracles with 2-of-3 agreement requirement.
 *
 * Oracles:
 *   1. Symbolic Capability Oracle (SCO-1) - Formal pattern matching
 *   2. Statistical Anomaly Oracle (SAO-1) - Distribution monitoring
 *   3. Historical Regression Oracle (HRO-1) - Baseline comparison
 *
 * Cross-Check: 2_of_3 agreement required
 * On Disagreement: Escalate to shadow review
 */

// ============================================================================
// TYPES
// ============================================================================

export interface OracleVerdict {
  oracleId: string;
  oracleName: string;
  invariantId: string;
  verdict: 'PASS' | 'FAIL' | 'UNCERTAIN';
  confidence: number;
  evidence: string[];
  timestamp: string;
}

export interface CrossCheckResult {
  invariantId: string;
  verdicts: OracleVerdict[];
  agreement: 'UNANIMOUS_PASS' | 'UNANIMOUS_FAIL' | 'MAJORITY_PASS' | 'MAJORITY_FAIL' | 'NO_AGREEMENT';
  finalVerdict: 'PASS' | 'FAIL' | 'ESCALATE';
  requiresReview: boolean;
  reviewReason?: string;
}

export interface InvariantContext {
  invariantId: string;
  metrics: Record<string, number>;
  explanations: string[];
  triggeredRules: string[];
  historicalBaseline?: Record<string, number>;
}

// ============================================================================
// ORACLE CONFIGURATION
// ============================================================================

export const ORACLE_CONFIG = {
  systemId: 'ROS-001',
  version: '1.0.0',
  requiredAgreement: 2,
  totalOracles: 3,
  escalateOnDisagreement: true,
  constitution: 'SEC-1'
} as const;

// ============================================================================
// SYMBOLIC CAPABILITY ORACLE (SCO-1)
// ============================================================================

export class SymbolicCapabilityOracle {
  readonly id = 'SCO-1';
  readonly name = 'Symbolic Capability Oracle';
  readonly type = 'SYMBOLIC' as const;

  /**
   * Verifies invariants through symbolic pattern analysis
   */
  verify(context: InvariantContext): OracleVerdict {
    const evidence: string[] = [];
    let verdict: 'PASS' | 'FAIL' | 'UNCERTAIN' = 'PASS';
    let confidence = 1.0;

    switch (context.invariantId) {
      case 'NO_HOSTILE_ADMISSION':
        // Check if any hostile patterns were admitted
        const hostilePatterns = this.detectHostilePatterns(context);
        if (hostilePatterns.length > 0 && context.metrics.admitCount > 0) {
          verdict = 'FAIL';
          evidence.push(`Hostile patterns detected with admissions: ${hostilePatterns.join(', ')}`);
        } else {
          evidence.push('No hostile pattern admissions detected');
        }
        break;

      case 'CAPABILITY_MONOTONICITY':
        // Verify coverage didn't decrease
        const currentCoverage = context.metrics.coverage || 0;
        const baselineCoverage = context.historicalBaseline?.coverage || 0;
        if (currentCoverage < baselineCoverage) {
          verdict = 'FAIL';
          evidence.push(`Coverage decreased: ${baselineCoverage} → ${currentCoverage}`);
        } else {
          evidence.push(`Coverage maintained: ${currentCoverage} >= ${baselineCoverage}`);
        }
        break;

      case 'ORDER_INVARIANCE':
        // Verify pipeline order doesn't affect verdict
        const orderVariance = context.metrics.orderVariance || 0;
        if (orderVariance > 0) {
          verdict = 'FAIL';
          evidence.push(`Order variance detected: ${orderVariance}`);
        } else {
          evidence.push('Order invariance maintained');
        }
        break;

      case 'MSI-002_EXPLANATION_NON_RECURSIVE':
        // Check for recursive references in explanations
        const recursiveRefs = this.detectRecursiveReferences(context.explanations);
        if (recursiveRefs.length > 0) {
          verdict = 'FAIL';
          evidence.push(`Recursive references detected: ${recursiveRefs.join(', ')}`);
        } else {
          evidence.push('No recursive explanation references');
        }
        break;

      default:
        verdict = 'UNCERTAIN';
        confidence = 0.5;
        evidence.push(`Invariant ${context.invariantId} not covered by SCO-1`);
    }

    return {
      oracleId: this.id,
      oracleName: this.name,
      invariantId: context.invariantId,
      verdict,
      confidence,
      evidence,
      timestamp: new Date().toISOString()
    };
  }

  private detectHostilePatterns(context: InvariantContext): string[] {
    const hostileIndicators = [
      'CAP-001', 'CAP-002', 'CAP-003', 'CAP-004', 'CAP-005', 'CAP-006', 'CAP-007'
    ];
    return context.triggeredRules.filter(r => hostileIndicators.includes(r));
  }

  private detectRecursiveReferences(explanations: string[]): string[] {
    const recursivePatterns = [
      /\brejected\s+by\s+(PIL|HCA|HIC)-\d+/i,
      /\bbecause\s+(PIL|HCA|HIC)-\d+\s+said/i
    ];
    const detected: string[] = [];
    for (const exp of explanations) {
      for (const pattern of recursivePatterns) {
        if (pattern.test(exp)) {
          detected.push(exp.substring(0, 50) + '...');
        }
      }
    }
    return detected;
  }
}

// ============================================================================
// STATISTICAL ANOMALY ORACLE (SAO-1)
// ============================================================================

export class StatisticalAnomalyOracle {
  readonly id = 'SAO-1';
  readonly name = 'Statistical Anomaly Oracle';
  readonly type = 'STATISTICAL' as const;

  private readonly zScoreThreshold = 2.5;

  /**
   * Detects invariant violations through statistical analysis
   */
  verify(context: InvariantContext): OracleVerdict {
    const evidence: string[] = [];
    let verdict: 'PASS' | 'FAIL' | 'UNCERTAIN' = 'PASS';
    let confidence = 1.0;

    switch (context.invariantId) {
      case 'EXPLANATION_ENTROPY_MINIMUM':
        const entropy = context.metrics.entropy || 0;
        const minEntropy = context.metrics.minEntropyThreshold || 0.3;
        if (entropy < minEntropy) {
          verdict = 'FAIL';
          evidence.push(`Entropy ${entropy.toFixed(4)} below minimum ${minEntropy}`);
        } else {
          evidence.push(`Entropy ${entropy.toFixed(4)} above minimum ${minEntropy}`);
        }
        break;

      case 'NO_UNEXPLAINED_VERDICT':
        const unexplainedCount = context.metrics.unexplainedVerdicts || 0;
        if (unexplainedCount > 0) {
          verdict = 'FAIL';
          evidence.push(`${unexplainedCount} unexplained verdicts detected`);
        } else {
          evidence.push('All verdicts have explanations');
        }
        break;

      case 'MSI-001_NO_PROXY_SATISFACTION':
        // Statistical check for metric-safety correlation
        const correlation = context.metrics.metricSafetyCorrelation || 1.0;
        if (correlation < 0.95) {
          verdict = 'FAIL';
          evidence.push(`Weak metric-safety correlation: ${correlation.toFixed(4)}`);
        } else {
          evidence.push(`Strong metric-safety correlation: ${correlation.toFixed(4)}`);
        }
        break;

      case 'MSI-003_METRIC_INDEPENDENCE':
        const roleOverlap = context.metrics.metricRoleOverlap || 0;
        if (roleOverlap > 0) {
          verdict = 'FAIL';
          evidence.push(`Metric role overlap detected: ${roleOverlap}`);
        } else {
          evidence.push('Metrics are independent in their roles');
        }
        break;

      default:
        verdict = 'UNCERTAIN';
        confidence = 0.5;
        evidence.push(`Invariant ${context.invariantId} not covered by SAO-1`);
    }

    return {
      oracleId: this.id,
      oracleName: this.name,
      invariantId: context.invariantId,
      verdict,
      confidence,
      evidence,
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================================================
// HISTORICAL REGRESSION ORACLE (HRO-1)
// ============================================================================

export class HistoricalRegressionOracle {
  readonly id = 'HRO-1';
  readonly name = 'Historical Regression Oracle';
  readonly type = 'TEMPORAL' as const;

  private readonly regressionBudget = {
    dominanceDeltaMax: 0.02,
    entropyDeltaMin: -0.2,
    falsePositiveDeltaMax: 0.001,
    coverageDeltaMin: 0
  };

  /**
   * Verifies invariants against historical baselines
   */
  verify(context: InvariantContext): OracleVerdict {
    const evidence: string[] = [];
    let verdict: 'PASS' | 'FAIL' | 'UNCERTAIN' = 'PASS';
    let confidence = 1.0;

    if (!context.historicalBaseline) {
      return {
        oracleId: this.id,
        oracleName: this.name,
        invariantId: context.invariantId,
        verdict: 'UNCERTAIN',
        confidence: 0.5,
        evidence: ['No historical baseline available'],
        timestamp: new Date().toISOString()
      };
    }

    switch (context.invariantId) {
      case 'CAPABILITY_MONOTONICITY':
        const coverageDelta = (context.metrics.coverage || 0) - (context.historicalBaseline.coverage || 0);
        if (coverageDelta < this.regressionBudget.coverageDeltaMin) {
          verdict = 'FAIL';
          evidence.push(`Coverage regression: ${coverageDelta.toFixed(4)} < ${this.regressionBudget.coverageDeltaMin}`);
        } else {
          evidence.push(`Coverage delta within budget: ${coverageDelta.toFixed(4)}`);
        }
        break;

      case 'TEMPORAL_INVARIANCE':
        const dominanceDelta = (context.metrics.dominance || 0) - (context.historicalBaseline.dominance || 0);
        const entropyDelta = (context.metrics.entropy || 0) - (context.historicalBaseline.entropy || 0);

        if (dominanceDelta > this.regressionBudget.dominanceDeltaMax) {
          verdict = 'FAIL';
          evidence.push(`Dominance regression: +${dominanceDelta.toFixed(4)} > +${this.regressionBudget.dominanceDeltaMax}`);
        }
        if (entropyDelta < this.regressionBudget.entropyDeltaMin) {
          verdict = 'FAIL';
          evidence.push(`Entropy regression: ${entropyDelta.toFixed(4)} < ${this.regressionBudget.entropyDeltaMin}`);
        }
        if (verdict === 'PASS') {
          evidence.push('All temporal metrics within budget');
        }
        break;

      case 'REGRESSION_BUDGET_COMPLIANCE':
        const fpDelta = (context.metrics.falsePositiveRate || 0) - (context.historicalBaseline.falsePositiveRate || 0);
        if (fpDelta > this.regressionBudget.falsePositiveDeltaMax) {
          verdict = 'FAIL';
          evidence.push(`FP rate regression: +${fpDelta.toFixed(4)} > +${this.regressionBudget.falsePositiveDeltaMax}`);
        } else {
          evidence.push('Regression budget compliance verified');
        }
        break;

      default:
        verdict = 'UNCERTAIN';
        confidence = 0.5;
        evidence.push(`Invariant ${context.invariantId} not covered by HRO-1`);
    }

    return {
      oracleId: this.id,
      oracleName: this.name,
      invariantId: context.invariantId,
      verdict,
      confidence,
      evidence,
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================================================
// CROSS-CHECK SYSTEM
// ============================================================================

export class OracleCrossChecker {
  private readonly oracles = [
    new SymbolicCapabilityOracle(),
    new StatisticalAnomalyOracle(),
    new HistoricalRegressionOracle()
  ];

  /**
   * Performs cross-check verification with 2-of-3 agreement requirement
   */
  crossCheck(context: InvariantContext): CrossCheckResult {
    const verdicts = this.oracles.map(oracle => oracle.verify(context));

    // Count votes
    const passCount = verdicts.filter(v => v.verdict === 'PASS').length;
    const failCount = verdicts.filter(v => v.verdict === 'FAIL').length;
    const uncertainCount = verdicts.filter(v => v.verdict === 'UNCERTAIN').length;

    // Determine agreement level
    let agreement: CrossCheckResult['agreement'];
    let finalVerdict: CrossCheckResult['finalVerdict'];
    let requiresReview = false;
    let reviewReason: string | undefined;

    if (passCount === 3) {
      agreement = 'UNANIMOUS_PASS';
      finalVerdict = 'PASS';
    } else if (failCount === 3) {
      agreement = 'UNANIMOUS_FAIL';
      finalVerdict = 'FAIL';
    } else if (passCount >= ORACLE_CONFIG.requiredAgreement) {
      agreement = 'MAJORITY_PASS';
      finalVerdict = 'PASS';
      if (failCount > 0) {
        requiresReview = true;
        reviewReason = `${failCount} oracle(s) reported FAIL`;
      }
    } else if (failCount >= ORACLE_CONFIG.requiredAgreement) {
      agreement = 'MAJORITY_FAIL';
      finalVerdict = 'FAIL';
    } else {
      agreement = 'NO_AGREEMENT';
      finalVerdict = 'ESCALATE';
      requiresReview = true;
      reviewReason = `No majority agreement: ${passCount} PASS, ${failCount} FAIL, ${uncertainCount} UNCERTAIN`;
    }

    // Veto condition: any oracle detecting S4 forces FAIL
    const s4Detected = verdicts.some(v =>
      v.evidence.some(e => e.toLowerCase().includes('hostile') && e.toLowerCase().includes('admission'))
    );
    if (s4Detected) {
      finalVerdict = 'FAIL';
      requiresReview = true;
      reviewReason = 'S4 (hostile admission) detected by oracle';
    }

    return {
      invariantId: context.invariantId,
      verdicts,
      agreement,
      finalVerdict,
      requiresReview,
      reviewReason
    };
  }

  /**
   * Verifies all invariants and returns aggregated results
   */
  verifyAll(contexts: InvariantContext[]): CrossCheckResult[] {
    return contexts.map(ctx => this.crossCheck(ctx));
  }
}

// ============================================================================
// ESCALATION HANDLER
// ============================================================================

export interface EscalationRecord {
  id: string;
  timestamp: string;
  invariantId: string;
  crossCheckResult: CrossCheckResult;
  status: 'PENDING' | 'REVIEWING' | 'RESOLVED';
  resolution?: {
    decision: 'PASS' | 'FAIL';
    reviewer: string;
    rationale: string;
    timestamp: string;
  };
}

export class EscalationHandler {
  private escalations: EscalationRecord[] = [];

  /**
   * Creates an escalation for shadow review
   */
  escalate(result: CrossCheckResult): EscalationRecord {
    const record: EscalationRecord = {
      id: `ESC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      invariantId: result.invariantId,
      crossCheckResult: result,
      status: 'PENDING'
    };

    this.escalations.push(record);
    return record;
  }

  /**
   * Gets pending escalations
   */
  getPending(): EscalationRecord[] {
    return this.escalations.filter(e => e.status === 'PENDING');
  }

  /**
   * Resolves an escalation
   */
  resolve(
    escalationId: string,
    decision: 'PASS' | 'FAIL',
    reviewer: string,
    rationale: string
  ): EscalationRecord | null {
    const record = this.escalations.find(e => e.id === escalationId);
    if (!record) return null;

    record.status = 'RESOLVED';
    record.resolution = {
      decision,
      reviewer,
      rationale,
      timestamp: new Date().toISOString()
    };

    return record;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const redundantOracleSystem = {
  config: ORACLE_CONFIG,
  crossChecker: new OracleCrossChecker(),
  escalationHandler: new EscalationHandler()
};

export default redundantOracleSystem;
