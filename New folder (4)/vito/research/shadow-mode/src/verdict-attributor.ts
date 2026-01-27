/**
 * Verdict Attributor (VAL-1 Compliant)
 *
 * Provides causal attribution for shadow mode verdicts.
 * Tracks which layer/rule caused divergence and enables deterministic replay.
 *
 * ID: VAL-1
 * Scope: shadow-mode
 * SMC Compatibility: SMC-1 (verdict classes unchanged)
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CausalLayer =
  | 'PROVENANCE_PARSER'
  | 'IAL0_AUTHENTICATOR'
  | 'HIA1_DETECTOR'
  | 'HCA1_ANALYZER'  // Added for HCA-1 integration (Position: AFTER_HIA-1)
  | 'HIC1_CHECKER'
  | 'AGREEMENT';

export type RuleType = 'AUTHENTICATION' | 'AXIOM' | 'CAPABILITY' | 'COMPOSITION';
export type Verdict = 'ADMIT' | 'REJECT';
export type StageVerdict = 'PASS' | 'REJECT' | 'SKIPPED';
export type VerdictClass = 'S1' | 'S2' | 'S3' | 'S4' | 'S2_PENDING' | 'S3_PENDING';

export interface RuleEmission {
  ruleId: string;
  ruleType: RuleType;
  ruleName: string;
  triggered: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  matchedPattern?: string;
  matchedText?: string;
  confidence: number;
}

export interface DivergenceStage {
  stage: CausalLayer;
  stageIndex: number;
  reason: string;
  canonicalPassedStage: boolean;
  shadowPassedStage: boolean;
}

export interface ReplayHash {
  algorithm: 'SHA-256';
  inputHash: string;
  outputHash: string;
  fullHash: string;
  deterministicVerification: boolean;
}

export interface StageTrace {
  stage: CausalLayer;
  entered: boolean;
  exited: boolean;
  verdict: StageVerdict;
  rulesEvaluated: RuleEmission[];
  rulesTriggered: string[];
  durationMs: number;
  stateSnapshot?: Record<string, unknown>;
}

export interface Attribution {
  requestId: string;
  timestamp: string;
  causalLayer: CausalLayer;
  firstDivergenceStage: DivergenceStage;
  ruleEmissions: RuleEmission[];
  replayHash: ReplayHash;
  stageTrace: StageTrace[];
  verdictClass: VerdictClass;
  shadowVerdict: Verdict;
  canonicalVerdict: Verdict;
  causalChain: string[];
  counterfactual?: {
    wouldChangeVerdict: string[];
    minimalCause: string;
  };
}

export interface AttributionInput {
  requestId: string;
  shadowVerdict: Verdict;
  canonicalVerdict: Verdict;
  verdictClass: VerdictClass;
  stageResults: StageResult[];
  rawInput: unknown;
}

export interface StageResult {
  stage: CausalLayer;
  passed: boolean;
  rejectionCodes: string[];
  rulesEvaluated: RuleEmission[];
  durationMs: number;
  stateSnapshot?: Record<string, unknown>;
}

// ============================================================================
// STAGE INDEX MAPPING
// ============================================================================

const STAGE_INDEX: Record<CausalLayer, number> = {
  'PROVENANCE_PARSER': 0,
  'IAL0_AUTHENTICATOR': 1,
  'HIA1_DETECTOR': 2,
  'HCA1_ANALYZER': 3,  // HCA-1 position: AFTER_HIA-1
  'HIC1_CHECKER': 4,
  'AGREEMENT': 5,
};

const STAGE_ORDER: CausalLayer[] = [
  'PROVENANCE_PARSER',
  'IAL0_AUTHENTICATOR',
  'HIA1_DETECTOR',
  'HCA1_ANALYZER',  // HCA-1 inserted between HIA-1 and HIC-1
  'HIC1_CHECKER',
];

// ============================================================================
// RULE METADATA
// ============================================================================

const RULE_METADATA: Record<string, { type: RuleType; name: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }> = {
  // IAL rules (Authentication)
  'IAL-001': { type: 'AUTHENTICATION', name: 'Missing Intent Declaration', severity: 'HIGH' },
  'IAL-002': { type: 'AUTHENTICATION', name: 'Malformed Intent Structure', severity: 'MEDIUM' },
  'IAL-003': { type: 'AUTHENTICATION', name: 'Unauthorized Target Access', severity: 'CRITICAL' },

  // HIA rules (Axioms)
  'HIA-001': { type: 'AXIOM', name: 'Privilege Escalation Abuse', severity: 'CRITICAL' },
  'HIA-002': { type: 'AXIOM', name: 'Covert Exfiltration', severity: 'CRITICAL' },
  'HIA-003': { type: 'AXIOM', name: 'Integrity Sabotage', severity: 'CRITICAL' },
  'HIA-004': { type: 'AXIOM', name: 'Availability Denial', severity: 'HIGH' },
  'HIA-005': { type: 'AXIOM', name: 'Audit Evasion', severity: 'CRITICAL' },

  // HCA-1 rules (Capability) - Position: AFTER_HIA-1
  'CAP-001': { type: 'CAPABILITY', name: 'Unauthorized Access', severity: 'CRITICAL' },
  'CAP-002': { type: 'CAPABILITY', name: 'Privilege Acquisition', severity: 'CRITICAL' },
  'CAP-003': { type: 'CAPABILITY', name: 'Data Exfiltration', severity: 'CRITICAL' },
  'CAP-004': { type: 'CAPABILITY', name: 'Persistent Access', severity: 'HIGH' },
  'CAP-005': { type: 'CAPABILITY', name: 'Lateral Movement', severity: 'HIGH' },
  'CAP-006': { type: 'CAPABILITY', name: 'Audit Blindness', severity: 'HIGH' },
  'CAP-007': { type: 'CAPABILITY', name: 'Environment Escape', severity: 'CRITICAL' },

  // HIC rules (Composition)
  'HIC-001': { type: 'COMPOSITION', name: 'Blind Spot Attack', severity: 'CRITICAL' },
  'HIC-002': { type: 'COMPOSITION', name: 'Privilege Escalation Chain', severity: 'CRITICAL' },
  'HIC-003': { type: 'COMPOSITION', name: 'Credential Exfiltration Risk', severity: 'CRITICAL' },
  'HIC-004': { type: 'COMPOSITION', name: 'TOCTOU Vulnerability', severity: 'HIGH' },
  'HIC-005': { type: 'COMPOSITION', name: 'Access Accumulation', severity: 'HIGH' },
  'HIC-006': { type: 'COMPOSITION', name: 'Environment-Conditional Security', severity: 'CRITICAL' },
};

// ============================================================================
// HASHING UTILITIES
// ============================================================================

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function normalizeInput(input: unknown): string {
  // Deterministic JSON serialization
  return JSON.stringify(input, Object.keys(input as object).sort());
}

function computeReplayHash(input: unknown, output: Omit<Attribution, 'replayHash'>): ReplayHash {
  const inputHash = sha256(normalizeInput(input));
  const outputHash = sha256(JSON.stringify({
    verdict: output.shadowVerdict,
    causalLayer: output.causalLayer,
    ruleEmissions: output.ruleEmissions.map(r => r.ruleId).sort(),
  }));
  const fullHash = sha256(inputHash + outputHash);

  return {
    algorithm: 'SHA-256',
    inputHash,
    outputHash,
    fullHash,
    deterministicVerification: true,
  };
}

// ============================================================================
// CAUSAL LAYER DETERMINATION
// ============================================================================

function determineCausalLayer(stageResults: StageResult[]): CausalLayer {
  // Find first stage that rejected
  for (const result of stageResults) {
    if (!result.passed) {
      return result.stage;
    }
  }

  // All stages passed - agreement
  return 'AGREEMENT';
}

// ============================================================================
// DIVERGENCE DETECTION
// ============================================================================

function findFirstDivergence(
  stageResults: StageResult[],
  shadowVerdict: Verdict,
  canonicalVerdict: Verdict
): DivergenceStage {
  // If verdicts match, no divergence
  if (shadowVerdict === canonicalVerdict) {
    return {
      stage: 'AGREEMENT',
      stageIndex: STAGE_INDEX['AGREEMENT'],
      reason: 'No divergence - verdicts match',
      canonicalPassedStage: true,
      shadowPassedStage: true,
    };
  }

  // Find first stage where shadow rejected but (implicitly) canonical passed
  // Since canonical admitted overall, it passed all stages
  if (shadowVerdict === 'REJECT' && canonicalVerdict === 'ADMIT') {
    for (const result of stageResults) {
      if (!result.passed) {
        const triggeredRules = result.rulesEvaluated
          .filter(r => r.triggered)
          .map(r => r.ruleId);

        return {
          stage: result.stage,
          stageIndex: STAGE_INDEX[result.stage],
          reason: `Shadow rejected at ${result.stage} with rules [${triggeredRules.join(', ')}]`,
          canonicalPassedStage: true, // Canonical passed (it admitted overall)
          shadowPassedStage: false,
        };
      }
    }
  }

  // Shadow admitted but canonical rejected
  // Shadow passed all stages but canonical rejected somewhere
  if (shadowVerdict === 'ADMIT' && canonicalVerdict === 'REJECT') {
    // Shadow passed all - divergence is that canonical rejected somewhere shadow didn't
    return {
      stage: 'HIC1_CHECKER', // Last stage shadow passed
      stageIndex: STAGE_INDEX['HIC1_CHECKER'],
      reason: 'Shadow admitted (passed all stages) but canonical rejected',
      canonicalPassedStage: false,
      shadowPassedStage: true,
    };
  }

  // Fallback
  return {
    stage: 'AGREEMENT',
    stageIndex: STAGE_INDEX['AGREEMENT'],
    reason: 'Unable to determine divergence point',
    canonicalPassedStage: true,
    shadowPassedStage: true,
  };
}

// ============================================================================
// STAGE TRACE BUILDER
// ============================================================================

function buildStageTrace(stageResults: StageResult[]): StageTrace[] {
  const traces: StageTrace[] = [];
  let reachedEnd = true;

  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const stage = STAGE_ORDER[i];
    const result = stageResults.find(r => r.stage === stage);

    if (result) {
      const trace: StageTrace = {
        stage: result.stage,
        entered: true,
        exited: result.passed || result.rejectionCodes.length > 0,
        verdict: result.passed ? 'PASS' : 'REJECT',
        rulesEvaluated: result.rulesEvaluated,
        rulesTriggered: result.rejectionCodes,
        durationMs: result.durationMs,
        stateSnapshot: result.stateSnapshot,
      };
      traces.push(trace);

      // If this stage rejected, subsequent stages are skipped
      if (!result.passed) {
        reachedEnd = false;
        // Mark remaining stages as skipped
        for (let j = i + 1; j < STAGE_ORDER.length; j++) {
          traces.push({
            stage: STAGE_ORDER[j],
            entered: false,
            exited: false,
            verdict: 'SKIPPED',
            rulesEvaluated: [],
            rulesTriggered: [],
            durationMs: 0,
          });
        }
        break;
      }
    } else {
      // Stage not in results - mark as skipped
      traces.push({
        stage,
        entered: false,
        exited: false,
        verdict: 'SKIPPED',
        rulesEvaluated: [],
        rulesTriggered: [],
        durationMs: 0,
      });
    }
  }

  return traces;
}

// ============================================================================
// CAUSAL CHAIN BUILDER
// ============================================================================

function buildCausalChain(
  stageResults: StageResult[],
  shadowVerdict: Verdict
): string[] {
  const chain: string[] = ['INPUT_RECEIVED'];

  for (const result of stageResults) {
    if (result.stage === 'PROVENANCE_PARSER') {
      chain.push('PROVENANCE_EXTRACTED');
    }

    if (result.passed) {
      chain.push(`${result.stage}_PASSED`);
    } else {
      const triggeredRules = result.rulesEvaluated
        .filter(r => r.triggered)
        .map(r => r.ruleId);

      for (const ruleId of triggeredRules) {
        chain.push(`${result.stage}_TRIGGERED:${ruleId}`);
      }
      break; // Stop after first rejection
    }
  }

  chain.push(`VERDICT_${shadowVerdict}`);
  return chain;
}

// ============================================================================
// COUNTERFACTUAL ANALYSIS
// ============================================================================

function analyzeCounterfactual(
  ruleEmissions: RuleEmission[],
  shadowVerdict: Verdict
): { wouldChangeVerdict: string[]; minimalCause: string } | undefined {
  if (shadowVerdict === 'ADMIT') {
    // No rules triggered, no counterfactual needed
    return undefined;
  }

  const triggeredRules = ruleEmissions.filter(r => r.triggered);

  if (triggeredRules.length === 0) {
    return undefined;
  }

  // All triggered rules would change verdict if disabled
  const wouldChangeVerdict = triggeredRules.map(r => r.ruleId);

  // Minimal cause is the first (highest priority) triggered rule
  const minimalCause = triggeredRules[0].ruleId;

  return {
    wouldChangeVerdict,
    minimalCause,
  };
}

// ============================================================================
// MAIN ATTRIBUTION FUNCTION
// ============================================================================

export function computeAttribution(input: AttributionInput): Attribution {
  const timestamp = new Date().toISOString();

  // Collect all rule emissions from all stages
  const allRuleEmissions: RuleEmission[] = [];
  for (const result of input.stageResults) {
    allRuleEmissions.push(...result.rulesEvaluated);
  }

  // Determine causal layer
  const causalLayer = determineCausalLayer(input.stageResults);

  // Find first divergence stage
  const firstDivergenceStage = findFirstDivergence(
    input.stageResults,
    input.shadowVerdict,
    input.canonicalVerdict
  );

  // Build stage trace
  const stageTrace = buildStageTrace(input.stageResults);

  // Build causal chain
  const causalChain = buildCausalChain(input.stageResults, input.shadowVerdict);

  // Analyze counterfactual
  const counterfactual = analyzeCounterfactual(allRuleEmissions, input.shadowVerdict);

  // Build attribution (without replay hash first)
  const partialAttribution = {
    requestId: input.requestId,
    timestamp,
    causalLayer,
    firstDivergenceStage,
    ruleEmissions: allRuleEmissions,
    stageTrace,
    verdictClass: input.verdictClass,
    shadowVerdict: input.shadowVerdict,
    canonicalVerdict: input.canonicalVerdict,
    causalChain,
    counterfactual,
  };

  // Compute replay hash
  const replayHash = computeReplayHash(input.rawInput, partialAttribution);

  return {
    ...partialAttribution,
    replayHash,
  };
}

// ============================================================================
// RULE EMISSION HELPER
// ============================================================================

export function createRuleEmission(
  ruleId: string,
  triggered: boolean,
  matchedPattern?: string,
  matchedText?: string,
  confidence: number = 1.0
): RuleEmission {
  const metadata = RULE_METADATA[ruleId] || {
    type: 'AUTHENTICATION' as RuleType,
    name: 'Unknown Rule',
    severity: 'MEDIUM' as const,
  };

  return {
    ruleId,
    ruleType: metadata.type,
    ruleName: metadata.name,
    triggered,
    severity: metadata.severity,
    matchedPattern,
    matchedText,
    confidence,
  };
}

// ============================================================================
// ATTRIBUTION LOGGER
// ============================================================================

export class AttributionLogger {
  private logFile: string;
  private entries: Attribution[] = [];
  private summary: {
    totalAttributions: number;
    byCausalLayer: Record<string, number>;
    byRuleId: Record<string, number>;
    divergenceStageDistribution: Record<string, number>;
    replayVerificationRate: number;
  };

  constructor(logDir: string = path.join(__dirname, '..', 'logs')) {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logFile = path.join(logDir, 'attribution.json');
    this.summary = {
      totalAttributions: 0,
      byCausalLayer: {},
      byRuleId: {},
      divergenceStageDistribution: {},
      replayVerificationRate: 1.0,
    };
    this.loadExisting();
  }

  private loadExisting(): void {
    if (fs.existsSync(this.logFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.logFile, 'utf-8'));
        this.entries = data.entries || [];
        this.summary = data.summary || this.summary;
      } catch {
        // Start fresh
      }
    }
  }

  log(attribution: Attribution): void {
    this.entries.push(attribution);
    this.updateSummary(attribution);
    this.persist();
  }

  private updateSummary(attribution: Attribution): void {
    this.summary.totalAttributions++;

    // By causal layer
    this.summary.byCausalLayer[attribution.causalLayer] =
      (this.summary.byCausalLayer[attribution.causalLayer] || 0) + 1;

    // By rule ID
    for (const emission of attribution.ruleEmissions) {
      if (emission.triggered) {
        this.summary.byRuleId[emission.ruleId] =
          (this.summary.byRuleId[emission.ruleId] || 0) + 1;
      }
    }

    // By divergence stage
    this.summary.divergenceStageDistribution[attribution.firstDivergenceStage.stage] =
      (this.summary.divergenceStageDistribution[attribution.firstDivergenceStage.stage] || 0) + 1;
  }

  private persist(): void {
    const logData = {
      version: '1.0.0',
      id: 'VAL-1',
      scope: 'shadow-mode',
      smcCompatibility: {
        constitutionId: 'SMC-1',
        verdictClassUnchanged: true,
      },
      startTimestamp: this.entries[0]?.timestamp || new Date().toISOString(),
      entries: this.entries,
      summary: this.summary,
    };

    fs.writeFileSync(this.logFile, JSON.stringify(logData, null, 2));
  }

  getEntries(): Attribution[] {
    return this.entries;
  }

  getSummary() {
    return this.summary;
  }

  /**
   * Verify replay determinism by checking if same input produces same output hash
   */
  verifyReplay(inputHash: string, expectedOutputHash: string): boolean {
    const entry = this.entries.find(e => e.replayHash.inputHash === inputHash);
    if (!entry) {
      return false;
    }
    return entry.replayHash.outputHash === expectedOutputHash;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let attributionLogger: AttributionLogger | null = null;

export function getAttributionLogger(): AttributionLogger {
  if (!attributionLogger) {
    attributionLogger = new AttributionLogger();
  }
  return attributionLogger;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const VAL1_CONFIG = {
  id: 'VAL-1',
  version: '1.0.0',
  scope: 'shadow-mode',
  smcCompatibility: {
    constitutionId: 'SMC-1',
    verdictClassUnchanged: true,
  },
  requirements: {
    causalLayer: 'REQUIRED',
    firstDivergenceStage: 'REQUIRED',
    ruleIdEmission: 'REQUIRED',
    replayHash: 'REQUIRED',
  },
} as const;
