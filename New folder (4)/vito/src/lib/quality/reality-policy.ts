/**
 * OLYMPUS 2.0 - Reality Governance Layer (RGL)
 *
 * Makes external validation trustworthy, deterministic,
 * and resistant to flakiness or manipulation.
 *
 * This layer governs reality itself.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// REALITY POLICY TYPES
// ============================================

/**
 * Execution mode for reality anchors
 * - live: Execute anchor in real-time
 * - cached: Use cached result if available
 * - quorum: Execute multiple samples and aggregate
 */
export type RealityMode = 'live' | 'cached' | 'quorum';

/**
 * Policy definition for a reality anchor
 */
export interface RealityPolicy {
  id: string;
  anchorId: string;

  // Execution mode
  mode: RealityMode;

  // Sampling configuration
  samples: number;           // Number of samples to execute (default 3)
  successThreshold: number;  // Success rate required (0-1, default 0.67 = 2/3)

  // Timing
  timeoutMs: number;         // Timeout per sample (default 5000)
  retryBackoff: number;      // Backoff between retries in ms (default 1000)

  // Trust requirements
  minTrustScore: number;     // Minimum trust score to pass (default 0.7)
  varianceThreshold: number; // Max allowed variance (default 0.1)

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Result of a single sample execution
 */
export interface SampleResult {
  sampleIndex: number;
  executedAt: Date;
  durationMs: number;
  success: boolean;
  payload: any;
  payloadHash: string;  // For determinism checking
  error: string | null;
  timedOut: boolean;
}

/**
 * Aggregated result from quorum execution
 */
export interface QuorumResult {
  anchorId: string;
  policy: RealityPolicy;

  // Execution summary
  samplesRequested: number;
  samplesExecuted: number;
  samplesSucceeded: number;
  samplesFailed: number;
  samplesTimedOut: number;

  // Rates
  successRate: number;       // samplesSucceeded / samplesExecuted
  timeoutRate: number;       // samplesTimedOut / samplesExecuted

  // Determinism
  payloadVariance: number;   // 0 = all same, 1 = all different
  uniquePayloads: number;
  isDeterministic: boolean;

  // Final verdict
  finalVerdict: boolean;     // successRate >= threshold && trustScore >= minTrustScore
  verdictReason: string;

  // Trust
  trustScore: number;        // 0-1, penalized for issues
  trustPenalties: TrustPenalty[];

  // Raw observations
  samples: SampleResult[];

  // Timing
  totalDurationMs: number;
  executedAt: Date;
}

/**
 * Trust penalty record
 */
export interface TrustPenalty {
  type: 'timeout' | 'inconsistent_response' | 'non_deterministic' | 'low_samples' | 'high_variance';
  amount: number;  // Penalty amount (0-1)
  reason: string;
}

/**
 * Governance failure types
 */
export type GovernanceFailureType =
  | 'FLAKY_REALITY'           // Non-zero variance in results
  | 'UNTRUSTWORTHY_REALITY'   // Trust score < 0.7
  | 'INSUFFICIENT_EVIDENCE';  // Samples < required

/**
 * Governance failure record
 */
export interface GovernanceFailure {
  type: GovernanceFailureType;
  anchorId: string;
  intentId: string;
  message: string;
  details: {
    trustScore?: number;
    variance?: number;
    samplesExecuted?: number;
    samplesRequired?: number;
    successRate?: number;
  };
  critical: boolean;
}

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_POLICY: Omit<RealityPolicy, 'id' | 'anchorId' | 'createdAt' | 'updatedAt'> = {
  mode: 'live',
  samples: 3,
  successThreshold: 0.67,  // 2/3 majority
  timeoutMs: 5000,
  retryBackoff: 1000,
  minTrustScore: 0.7,
  varianceThreshold: 0.1,
};

export const QUORUM_POLICY: Omit<RealityPolicy, 'id' | 'anchorId' | 'createdAt' | 'updatedAt'> = {
  mode: 'quorum',
  samples: 5,
  successThreshold: 0.8,   // 4/5 required
  timeoutMs: 5000,
  retryBackoff: 500,
  minTrustScore: 0.8,
  varianceThreshold: 0.05,
};

// Trust penalties
const TRUST_PENALTIES = {
  TIMEOUT_PER_SAMPLE: 0.1,        // -10% per timeout
  INCONSISTENT_RESPONSE: 0.15,    // -15% for any inconsistency
  NON_DETERMINISTIC: 0.25,        // -25% for non-deterministic payloads
  LOW_SAMPLES: 0.2,               // -20% if fewer samples than required
  HIGH_VARIANCE: 0.2,             // -20% if variance exceeds threshold
};

// ============================================
// POLICY REGISTRY
// ============================================

const POLICY_FILE = 'reality-policies.json';

interface PersistedPolicies {
  version: number;
  lastUpdated: Date;
  policies: Record<string, RealityPolicy>;
}

/**
 * Manages reality policies for anchors
 */
export class RealityPolicyRegistry {
  private basePath: string;
  private policies: Map<string, RealityPolicy> = new Map();

  constructor(buildDir: string) {
    this.basePath = path.join(buildDir, '.olympus');
    fs.mkdirSync(this.basePath, { recursive: true });
    this.load();
  }

  /**
   * Load persisted policies
   */
  private load(): void {
    const filePath = path.join(this.basePath, POLICY_FILE);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data: PersistedPolicies = JSON.parse(content);
        for (const [id, policy] of Object.entries(data.policies)) {
          this.policies.set(id, policy);
        }
      } catch (err) {
        console.error('[RGL] Failed to load policies:', err);
      }
    }
  }

  /**
   * Save policies to disk
   */
  save(): void {
    const data: PersistedPolicies = {
      version: 1,
      lastUpdated: new Date(),
      policies: Object.fromEntries(this.policies),
    };

    const filePath = path.join(this.basePath, POLICY_FILE);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Create or update a policy for an anchor
   */
  setPolicy(
    anchorId: string,
    config: Partial<Omit<RealityPolicy, 'id' | 'anchorId' | 'createdAt' | 'updatedAt'>>
  ): RealityPolicy {
    const id = `policy-${anchorId}`;
    const existing = this.policies.get(id);

    const policy: RealityPolicy = {
      id,
      anchorId,
      mode: config.mode ?? existing?.mode ?? DEFAULT_POLICY.mode,
      samples: config.samples ?? existing?.samples ?? DEFAULT_POLICY.samples,
      successThreshold: config.successThreshold ?? existing?.successThreshold ?? DEFAULT_POLICY.successThreshold,
      timeoutMs: config.timeoutMs ?? existing?.timeoutMs ?? DEFAULT_POLICY.timeoutMs,
      retryBackoff: config.retryBackoff ?? existing?.retryBackoff ?? DEFAULT_POLICY.retryBackoff,
      minTrustScore: config.minTrustScore ?? existing?.minTrustScore ?? DEFAULT_POLICY.minTrustScore,
      varianceThreshold: config.varianceThreshold ?? existing?.varianceThreshold ?? DEFAULT_POLICY.varianceThreshold,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(id, policy);
    this.save();

    console.log(`[RGL] Policy set for anchor ${anchorId}: mode=${policy.mode}, samples=${policy.samples}`);
    return policy;
  }

  /**
   * Get policy for an anchor (creates default if not exists)
   */
  getPolicy(anchorId: string, isCritical: boolean = false): RealityPolicy {
    const id = `policy-${anchorId}`;
    let policy = this.policies.get(id);

    if (!policy) {
      // Create default policy based on criticality
      const defaults = isCritical ? QUORUM_POLICY : DEFAULT_POLICY;
      policy = this.setPolicy(anchorId, defaults);
    }

    // Enforce quorum for critical anchors
    if (isCritical && policy.mode !== 'quorum') {
      console.log(`[RGL] Upgrading critical anchor ${anchorId} to quorum mode`);
      policy = this.setPolicy(anchorId, { ...policy, mode: 'quorum' });
    }

    return policy;
  }

  /**
   * Get all policies
   */
  getAllPolicies(): RealityPolicy[] {
    return Array.from(this.policies.values());
  }
}

// ============================================
// TRUST SCORE CALCULATION
// ============================================

/**
 * Calculate trust score from sample results
 */
export function calculateTrustScore(
  samples: SampleResult[],
  policy: RealityPolicy
): { trustScore: number; penalties: TrustPenalty[] } {
  const penalties: TrustPenalty[] = [];
  let score = 1.0;

  if (samples.length === 0) {
    return {
      trustScore: 0,
      penalties: [{
        type: 'low_samples',
        amount: 1.0,
        reason: 'No samples executed',
      }],
    };
  }

  // Penalty for timeouts
  const timeoutCount = samples.filter(s => s.timedOut).length;
  if (timeoutCount > 0) {
    const penalty = Math.min(timeoutCount * TRUST_PENALTIES.TIMEOUT_PER_SAMPLE, 0.5);
    score -= penalty;
    penalties.push({
      type: 'timeout',
      amount: penalty,
      reason: `${timeoutCount}/${samples.length} samples timed out`,
    });
  }

  // Penalty for insufficient samples
  if (samples.length < policy.samples) {
    const penalty = TRUST_PENALTIES.LOW_SAMPLES;
    score -= penalty;
    penalties.push({
      type: 'low_samples',
      amount: penalty,
      reason: `${samples.length}/${policy.samples} samples executed`,
    });
  }

  // Calculate payload variance
  const successfulSamples = samples.filter(s => s.success && !s.timedOut);
  const uniqueHashes = new Set(successfulSamples.map(s => s.payloadHash));
  const variance = successfulSamples.length > 0
    ? (uniqueHashes.size - 1) / successfulSamples.length
    : 0;

  // Penalty for non-deterministic responses
  if (uniqueHashes.size > 1) {
    const penalty = TRUST_PENALTIES.NON_DETERMINISTIC;
    score -= penalty;
    penalties.push({
      type: 'non_deterministic',
      amount: penalty,
      reason: `${uniqueHashes.size} unique payloads in ${successfulSamples.length} samples`,
    });
  }

  // Penalty for high variance
  if (variance > policy.varianceThreshold) {
    const penalty = TRUST_PENALTIES.HIGH_VARIANCE;
    score -= penalty;
    penalties.push({
      type: 'high_variance',
      amount: penalty,
      reason: `Variance ${variance.toFixed(2)} exceeds threshold ${policy.varianceThreshold}`,
    });
  }

  // Penalty for inconsistent success/failure pattern
  const successCount = samples.filter(s => s.success).length;
  const failCount = samples.filter(s => !s.success && !s.timedOut).length;
  if (successCount > 0 && failCount > 0) {
    const penalty = TRUST_PENALTIES.INCONSISTENT_RESPONSE;
    score -= penalty;
    penalties.push({
      type: 'inconsistent_response',
      amount: penalty,
      reason: `${successCount} successes, ${failCount} failures - inconsistent`,
    });
  }

  return {
    trustScore: Math.max(0, Math.min(1, score)),
    penalties,
  };
}

/**
 * Calculate payload hash for determinism checking
 */
export function hashPayload(payload: any): string {
  const str = JSON.stringify(payload, Object.keys(payload || {}).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ============================================
// QUORUM AGGREGATION
// ============================================

/**
 * Aggregate sample results into quorum result
 */
export function aggregateQuorum(
  anchorId: string,
  samples: SampleResult[],
  policy: RealityPolicy,
  totalDurationMs: number
): QuorumResult {
  const samplesExecuted = samples.length;
  const samplesSucceeded = samples.filter(s => s.success && !s.timedOut).length;
  const samplesFailed = samples.filter(s => !s.success && !s.timedOut).length;
  const samplesTimedOut = samples.filter(s => s.timedOut).length;

  // Calculate rates
  const successRate = samplesExecuted > 0 ? samplesSucceeded / samplesExecuted : 0;
  const timeoutRate = samplesExecuted > 0 ? samplesTimedOut / samplesExecuted : 0;

  // Calculate variance
  const successfulSamples = samples.filter(s => s.success && !s.timedOut);
  const uniqueHashes = new Set(successfulSamples.map(s => s.payloadHash));
  const payloadVariance = successfulSamples.length > 1
    ? (uniqueHashes.size - 1) / (successfulSamples.length - 1)
    : 0;
  const isDeterministic = uniqueHashes.size <= 1;

  // Calculate trust score
  const { trustScore, penalties } = calculateTrustScore(samples, policy);

  // Determine final verdict
  const meetsSuccessThreshold = successRate >= policy.successThreshold;
  const meetsTrustThreshold = trustScore >= policy.minTrustScore;
  const hasSufficientSamples = samplesExecuted >= policy.samples;
  const finalVerdict = meetsSuccessThreshold && meetsTrustThreshold && hasSufficientSamples;

  // Generate verdict reason
  let verdictReason: string;
  if (finalVerdict) {
    verdictReason = `PASSED: ${(successRate * 100).toFixed(0)}% success, ${(trustScore * 100).toFixed(0)}% trust`;
  } else if (!meetsTrustThreshold) {
    verdictReason = `UNTRUSTWORTHY_REALITY: Trust ${(trustScore * 100).toFixed(0)}% < ${(policy.minTrustScore * 100).toFixed(0)}%`;
  } else if (!meetsSuccessThreshold) {
    verdictReason = `FAILED: Success ${(successRate * 100).toFixed(0)}% < ${(policy.successThreshold * 100).toFixed(0)}%`;
  } else {
    verdictReason = `INSUFFICIENT_EVIDENCE: ${samplesExecuted}/${policy.samples} samples`;
  }

  return {
    anchorId,
    policy,
    samplesRequested: policy.samples,
    samplesExecuted,
    samplesSucceeded,
    samplesFailed,
    samplesTimedOut,
    successRate,
    timeoutRate,
    payloadVariance,
    uniquePayloads: uniqueHashes.size,
    isDeterministic,
    finalVerdict,
    verdictReason,
    trustScore,
    trustPenalties: penalties,
    samples,
    totalDurationMs,
    executedAt: new Date(),
  };
}

// ============================================
// GOVERNANCE FAILURE DETECTION
// ============================================

/**
 * Detect governance failures from quorum result
 */
export function detectGovernanceFailures(
  quorum: QuorumResult,
  intentId: string,
  critical: boolean
): GovernanceFailure[] {
  const failures: GovernanceFailure[] = [];

  // FLAKY_REALITY: Non-zero variance
  if (quorum.payloadVariance > 0) {
    failures.push({
      type: 'FLAKY_REALITY',
      anchorId: quorum.anchorId,
      intentId,
      message: `Reality is flaky: ${quorum.uniquePayloads} different payloads observed`,
      details: {
        variance: quorum.payloadVariance,
        samplesExecuted: quorum.samplesExecuted,
      },
      critical: critical && quorum.payloadVariance > quorum.policy.varianceThreshold,
    });
  }

  // UNTRUSTWORTHY_REALITY: Trust score too low
  if (quorum.trustScore < quorum.policy.minTrustScore) {
    failures.push({
      type: 'UNTRUSTWORTHY_REALITY',
      anchorId: quorum.anchorId,
      intentId,
      message: `Reality is untrustworthy: ${(quorum.trustScore * 100).toFixed(0)}% < ${(quorum.policy.minTrustScore * 100).toFixed(0)}%`,
      details: {
        trustScore: quorum.trustScore,
        successRate: quorum.successRate,
      },
      critical,
    });
  }

  // INSUFFICIENT_EVIDENCE: Not enough samples
  if (quorum.samplesExecuted < quorum.policy.samples) {
    failures.push({
      type: 'INSUFFICIENT_EVIDENCE',
      anchorId: quorum.anchorId,
      intentId,
      message: `Insufficient evidence: ${quorum.samplesExecuted}/${quorum.policy.samples} samples`,
      details: {
        samplesExecuted: quorum.samplesExecuted,
        samplesRequired: quorum.policy.samples,
      },
      critical,
    });
  }

  return failures;
}

// ============================================
// GOVERNANCE REPORT
// ============================================

/**
 * Complete governance report for a build
 */
export interface GovernanceReport {
  buildId: string;
  executedAt: Date;
  totalDurationMs: number;

  // Anchor results
  quorumResults: QuorumResult[];

  // Summary
  anchorsGoverned: number;
  anchorsPassed: number;
  anchorsFailed: number;

  // Trust summary
  averageTrustScore: number;
  lowestTrustScore: number;
  highestTrustScore: number;

  // Governance failures
  failures: GovernanceFailure[];
  hasCriticalGovernanceFailure: boolean;

  // Overall
  governancePass: boolean;
  governanceBlocker: string | null;
}

/**
 * Generate governance report from quorum results
 */
export function generateGovernanceReport(
  buildId: string,
  quorumResults: QuorumResult[],
  intentIds: Record<string, string>,  // anchorId -> intentId
  criticalAnchors: Set<string>,
  totalDurationMs: number
): GovernanceReport {
  // Collect all failures
  const failures: GovernanceFailure[] = [];
  for (const quorum of quorumResults) {
    const intentId = intentIds[quorum.anchorId] || 'unknown';
    const isCritical = criticalAnchors.has(quorum.anchorId);
    failures.push(...detectGovernanceFailures(quorum, intentId, isCritical));
  }

  // Calculate summary
  const anchorsPassed = quorumResults.filter(q => q.finalVerdict).length;
  const anchorsFailed = quorumResults.length - anchorsPassed;

  const trustScores = quorumResults.map(q => q.trustScore);
  const averageTrustScore = trustScores.length > 0
    ? trustScores.reduce((a, b) => a + b, 0) / trustScores.length
    : 1.0;
  const lowestTrustScore = trustScores.length > 0 ? Math.min(...trustScores) : 1.0;
  const highestTrustScore = trustScores.length > 0 ? Math.max(...trustScores) : 1.0;

  // Check for critical governance failures
  const hasCriticalGovernanceFailure = failures.some(f => f.critical);

  // Determine overall pass
  const governancePass = !hasCriticalGovernanceFailure && anchorsFailed === 0;
  const governanceBlocker = !governancePass
    ? failures.find(f => f.critical)?.message || `${anchorsFailed} anchors failed governance`
    : null;

  return {
    buildId,
    executedAt: new Date(),
    totalDurationMs,
    quorumResults,
    anchorsGoverned: quorumResults.length,
    anchorsPassed,
    anchorsFailed,
    averageTrustScore,
    lowestTrustScore,
    highestTrustScore,
    failures,
    hasCriticalGovernanceFailure,
    governancePass,
    governanceBlocker,
  };
}

// ============================================
// LOGGING
// ============================================

export function logQuorumResult(quorum: QuorumResult): void {
  const icon = quorum.finalVerdict ? '✓' : '✗';
  console.log(`[RGL] ${icon} Anchor ${quorum.anchorId}`);
  console.log(`[RGL]   Mode: ${quorum.policy.mode}`);
  console.log(`[RGL]   Samples: ${quorum.samplesSucceeded}/${quorum.samplesExecuted} passed (${quorum.samplesTimedOut} timeouts)`);
  console.log(`[RGL]   Success Rate: ${(quorum.successRate * 100).toFixed(0)}% (threshold: ${(quorum.policy.successThreshold * 100).toFixed(0)}%)`);
  console.log(`[RGL]   Trust Score: ${(quorum.trustScore * 100).toFixed(0)}% (min: ${(quorum.policy.minTrustScore * 100).toFixed(0)}%)`);
  console.log(`[RGL]   Deterministic: ${quorum.isDeterministic ? 'Yes' : 'No'} (variance: ${quorum.payloadVariance.toFixed(3)})`);
  console.log(`[RGL]   Verdict: ${quorum.verdictReason}`);

  if (quorum.trustPenalties.length > 0) {
    console.log(`[RGL]   Penalties:`);
    for (const penalty of quorum.trustPenalties) {
      console.log(`[RGL]     -${(penalty.amount * 100).toFixed(0)}%: ${penalty.reason}`);
    }
  }
}

export function logGovernanceReport(report: GovernanceReport): void {
  console.log('[RGL] ==========================================');
  console.log('[RGL] REALITY GOVERNANCE REPORT');
  console.log('[RGL] ==========================================');
  console.log(`[RGL] Build: ${report.buildId}`);
  console.log(`[RGL] Anchors: ${report.anchorsPassed}/${report.anchorsGoverned} passed`);
  console.log(`[RGL] Trust: avg=${(report.averageTrustScore * 100).toFixed(0)}%, min=${(report.lowestTrustScore * 100).toFixed(0)}%, max=${(report.highestTrustScore * 100).toFixed(0)}%`);
  console.log(`[RGL] Governance: ${report.governancePass ? 'PASSED' : 'FAILED'}`);

  if (report.governanceBlocker) {
    console.log(`[RGL] Blocker: ${report.governanceBlocker}`);
  }

  if (report.failures.length > 0) {
    console.log(`[RGL] Failures (${report.failures.length}):`);
    for (const failure of report.failures) {
      const critical = failure.critical ? '[CRITICAL]' : '';
      console.log(`[RGL]   ${failure.type} ${critical}: ${failure.message}`);
    }
  }

  console.log('[RGL] ==========================================');
}
