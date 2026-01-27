/**
 * OLYMPUS CRUCIBLE v1.0 — Adversarial World Generator Types
 *
 * Defines the type system for synthetic execution worlds
 * designed to violate Olympus invariants.
 *
 * CONSTRAINTS:
 * - Deterministic only (no randomness, no ML, no heuristics)
 * - No runtime flags or overrides
 * - No UI, no API, no users
 *
 * TARGET INVARIANTS:
 * - NE  (Necessity Engine)
 * - IE  (Inevitability Engine)
 * - TSL (Temporal Safety Layer)
 * - AEC (Architectural Entropy Control)
 * - RLL (Reality Lock-In Layer)
 * - ODL (Output Determinism Layer)
 * - AAM (Adversarial Abuse Module)
 */

// ============================================================================
// CORE INVARIANT DEFINITIONS
// ============================================================================

/**
 * The seven invariants that CRUCIBLE targets
 */
export type InvariantId =
  | 'NE'   // Necessity Engine: blocks when no survivable future exists
  | 'IE'   // Inevitability Engine: blocks when all paths lead to collapse
  | 'TSL'  // Temporal Safety Layer: time-based causality enforcement
  | 'AEC'  // Architectural Entropy Control: entropy phase management
  | 'RLL'  // Reality Lock-In Layer: singularity enforcement
  | 'ODL'  // Output Determinism Layer: determinism verification
  | 'AAM'; // Adversarial Abuse Module: governance abuse detection

/**
 * Invariant metadata
 */
export interface InvariantSpec {
  readonly id: InvariantId;
  readonly name: string;
  readonly description: string;
  readonly violationCondition: string;
  readonly blockAction: string;
  readonly proofRequirement: string;
}

/**
 * Complete invariant specifications
 */
export const INVARIANT_SPECS: Record<InvariantId, InvariantSpec> = {
  NE: {
    id: 'NE',
    name: 'Necessity Engine',
    description: 'Ensures only necessary actions are executed when no survivable future exists',
    violationCondition: 'Execution proceeds when no survivable path exists',
    blockAction: 'HARD_ABORT_EXTINCTION',
    proofRequirement: 'MCCS enumeration proves no survivable candidate'
  },
  IE: {
    id: 'IE',
    name: 'Inevitability Engine',
    description: 'Detects and blocks actions when all paths lead to collapse',
    violationCondition: 'Execution proceeds when collapse is mathematically certain',
    blockAction: 'HARD_ABORT',
    proofRequirement: 'All causal paths terminate in phase >= COLLAPSING'
  },
  TSL: {
    id: 'TSL',
    name: 'Temporal Safety Layer',
    description: 'Enforces causal ordering and temporal consistency',
    violationCondition: 'Temporal causality violation (effect before cause)',
    blockAction: 'TEMPORAL_VIOLATION_BLOCK',
    proofRequirement: 'Causal chain verification shows backward causation'
  },
  AEC: {
    id: 'AEC',
    name: 'Architectural Entropy Control',
    description: 'Controls system entropy through phase management',
    violationCondition: 'Mutation allowed in COLLAPSING or DEAD phase',
    blockAction: 'READ_ONLY or PERMANENT_HALT',
    proofRequirement: 'Entropy score exceeds phase threshold'
  },
  RLL: {
    id: 'RLL',
    name: 'Reality Lock-In Layer',
    description: 'Locks in decision singularities and blocks deviations',
    violationCondition: 'Deviation from established singularity',
    blockAction: 'HARD_ABORT',
    proofRequirement: 'Fingerprint matches forbidden singularity'
  },
  ODL: {
    id: 'ODL',
    name: 'Output Determinism Layer',
    description: 'Verifies deterministic output for identical inputs',
    violationCondition: 'Different output for identical input',
    blockAction: 'DETERMINISM_VIOLATION',
    proofRequirement: 'Hash comparison shows divergence'
  },
  AAM: {
    id: 'AAM',
    name: 'Adversarial Abuse Module',
    description: 'Detects and blocks governance abuse patterns',
    violationCondition: 'Governance capture, SSI erosion, or override abuse',
    blockAction: 'GOVERNANCE_EXPLOIT',
    proofRequirement: 'Abuse pattern matches known attack vector'
  }
} as const;

// ============================================================================
// WORLD STATE DEFINITIONS
// ============================================================================

/**
 * Entropy phases for AEC
 */
export type EntropyPhase = 'STABLE' | 'DECAYING' | 'COLLAPSING' | 'DEAD';

/**
 * Intent fates
 */
export type IntentFate = 'ACCEPTED' | 'ACCEPTED_WITH_DEBT' | 'QUARANTINED' | 'FORBIDDEN';

/**
 * Causal path terminus
 */
export type CausalTerminus = 'STABLE' | 'DECAYING' | 'COLLAPSING' | 'DEAD' | 'UNKNOWN';

/**
 * Decision singularity - an irreversible decision point
 */
export interface DecisionSingularity {
  readonly id: string;
  readonly fingerprint: string;
  readonly createdAt: string; // ISO timestamp
  readonly runId: string;
  readonly forbiddenFingerprints: readonly string[];
}

/**
 * Causal path through the system
 */
export interface CausalPath {
  readonly id: string;
  readonly origin: string;
  readonly steps: readonly string[];
  readonly terminus: CausalTerminus;
  readonly collapseStep?: number;
}

/**
 * Intent in the world state
 */
export interface WorldIntent {
  readonly id: string;
  readonly text: string;
  readonly fate: IntentFate;
  readonly trigger?: string;
  readonly state?: string;
  readonly outcome?: string;
  readonly hostilePattern?: string;
  readonly contradictsWith?: readonly string[];
}

/**
 * Override record
 */
export interface OverrideRecord {
  readonly target: string;
  readonly justification: string;
  readonly authorizer: string;
  readonly timestamp: string;
  readonly ssiPenalty: number;
}

/**
 * Governance state
 */
export interface GovernanceState {
  readonly ssi: number; // Stability Score Index (0-1)
  readonly overrideCount: number;
  readonly overrideHistory: readonly OverrideRecord[];
  readonly lastOverrideTimestamp?: string;
}

/**
 * Entropy metrics
 */
export interface EntropyMetrics {
  readonly rsrTrend: number;           // 0-1
  readonly mortalityVelocity: number;  // 0-1
  readonly singularityDensity: number; // 0-1
  readonly mccsSize: number;           // 0-1
  readonly composite: number;          // Weighted composite 0-1
}

/**
 * The complete synthetic world state
 */
export interface WorldState {
  readonly worldId: string;
  readonly timestamp: string;

  // Entropy state (AEC)
  readonly entropyPhase: EntropyPhase;
  readonly entropyMetrics: EntropyMetrics;

  // Intent state
  readonly intents: readonly WorldIntent[];

  // Causal state (IE/NE)
  readonly causalPaths: readonly CausalPath[];
  readonly mccsCount: number;
  readonly survivablePaths: number;

  // Singularity state (RLL)
  readonly singularities: readonly DecisionSingularity[];
  readonly currentFingerprint: string;

  // Governance state (AAM)
  readonly governance: GovernanceState;

  // Temporal state (TSL)
  readonly temporalChain: readonly string[];
  readonly lastCausalEvent: string;

  // Determinism state (ODL)
  readonly inputHash: string;
  readonly expectedOutputHash?: string;
}

// ============================================================================
// ADVERSARIAL SCENARIO DEFINITIONS
// ============================================================================

/**
 * Contradiction type for Wave 1
 */
export type ContradictionType =
  | 'LOGICAL_NEGATION'           // A and NOT A
  | 'MUTUAL_EXCLUSION'           // A requires B, B forbids A
  | 'CIRCULAR_DEPENDENCY'        // A → B → C → A
  | 'TEMPORAL_PARADOX'           // Effect before cause
  | 'FATE_CONTRADICTION'         // Intent both ACCEPTED and FORBIDDEN
  | 'ENTROPY_PHASE_SKIP'         // Jump from STABLE to DEAD
  | 'SINGULARITY_DEVIATION'      // Deviate from locked singularity
  | 'DETERMINISM_FORK'           // Same input, different output
  | 'GOVERNANCE_PARADOX'         // Override that enables more overrides
  // Wave 2 contradiction types
  | 'OBLIGATION_PILEUP'          // Valid but mutually incompatible obligations
  | 'ENTROPY_POISONING'          // Gradual entropy increase over time
  | 'TEMPORAL_BETRAYAL'          // Present-safe, future-collapse
  | 'DEFERRED_COLLAPSE'          // MCCS exists but deferred
  | 'DEADLINE_CASCADE'           // Cascading deadline failures
  | 'HORIZON_VIOLATION'          // N+K future collapse detected
  // Wave 3 contradiction types
  | 'PROOF_FLOODING'             // Valid actions generating maximal proofs
  | 'AUTHORITY_LAUNDERING'       // Legal authority chain attacking SYSTEM_ROOT
  | 'WEAPONIZED_COMPLIANCE'      // Multiple actors' legal actions causing collapse
  | 'TRAGIC_NECESSITY';          // Invariant conflicts with no clean solution

/**
 * Wave classification
 */
export type WaveId = 'WAVE_1' | 'WAVE_2' | 'WAVE_3';

/**
 * Wave metadata
 */
export interface WaveSpec {
  readonly id: WaveId;
  readonly name: string;
  readonly description: string;
  readonly focusArea: string;
}

export const WAVE_SPECS: Record<WaveId, WaveSpec> = {
  WAVE_1: {
    id: 'WAVE_1',
    name: 'Logical Contradictions',
    description: 'Scenarios containing logical impossibilities',
    focusArea: 'Boolean logic, mutual exclusion, circular dependencies'
  },
  WAVE_2: {
    id: 'WAVE_2',
    name: 'Temporal & Obligation Stress',
    description: 'Long-horizon pressure testing without invariant decay',
    focusArea: 'Obligation pileup, entropy poisoning, temporal betrayal'
  },
  WAVE_3: {
    id: 'WAVE_3',
    name: 'Adversarial Governance & Proof Warfare',
    description: 'Test whether Olympus is uncapturable under adversarial but constitutional behavior',
    focusArea: 'Proof flooding, authority laundering, weaponized compliance, tragic necessity'
  }
} as const;

/**
 * Adversarial scenario - a synthetic world designed to violate invariants
 */
export interface AdversarialScenario {
  readonly scenarioId: string;
  readonly name: string;
  readonly description: string;
  readonly wave: WaveId;
  readonly targetInvariants: readonly InvariantId[];
  readonly contradictionType: ContradictionType;

  // The world state that should trigger the invariant
  readonly worldState: WorldState;

  // The action that the adversary attempts
  readonly adversarialAction: AdversarialAction;

  // What we expect Olympus to do
  readonly expectedOutcome: ExpectedOutcome;

  // Proof chain requirements
  readonly proofRequirements: readonly string[];
}

/**
 * The action the adversary attempts
 */
export interface AdversarialAction {
  readonly actionId: string;
  readonly type: AdversarialActionType;
  readonly description: string;
  readonly payload: Record<string, unknown>;
}

export type AdversarialActionType =
  | 'EXECUTE_BUILD'        // Attempt to run a build
  | 'MUTATE_STATE'         // Attempt to modify state
  | 'OVERRIDE_GATE'        // Attempt to override a gate
  | 'REHABILITATE_INTENT'  // Attempt to recover FORBIDDEN intent
  | 'BYPASS_CHECK'         // Attempt to skip a check
  | 'FORGE_CERTIFICATE'    // Attempt to create fake certificate
  | 'ERODE_SSI'            // Attempt to degrade stability
  | 'ESCALATE_PRIVILEGE';  // Attempt privilege escalation

// ============================================================================
// EXPECTED OUTCOME DEFINITIONS
// ============================================================================

/**
 * What we expect Olympus to do
 */
export type OutcomeVerdict =
  | 'BLOCKED'       // Olympus should block
  | 'SURVIVED'      // Olympus blocked and we expected it
  | 'ACCEPTED'      // Olympus accepted (should not happen for adversarial)
  | 'SYSTEM_FAILURE'; // Olympus accepted when it should have blocked

/**
 * Expected outcome for a scenario
 */
export interface ExpectedOutcome {
  readonly verdict: OutcomeVerdict;
  readonly blockReason: string;
  readonly invariantsThatShouldFire: readonly InvariantId[];
  readonly proofChain: readonly ProofStep[];
}

/**
 * A step in the proof chain
 */
export interface ProofStep {
  readonly step: number;
  readonly assertion: string;
  readonly evidence: string;
  readonly invariantId?: InvariantId;
}

// ============================================================================
// CRUCIBLE EXECUTION RESULTS
// ============================================================================

/**
 * Result of running a single scenario
 */
export interface ScenarioResult {
  readonly scenarioId: string;
  readonly executedAt: string;
  readonly duration: number; // ms

  // What actually happened
  readonly actualVerdict: OutcomeVerdict;
  readonly actualBlockReason?: string;
  readonly invariantsFired: readonly InvariantId[];

  // Comparison
  readonly matchedExpectation: boolean;
  readonly discrepancies: readonly string[];

  // Proof validation
  readonly proofChainValid: boolean;
  readonly proofValidation: readonly ProofValidation[];
}

export interface ProofValidation {
  readonly step: number;
  readonly expected: string;
  readonly actual: string;
  readonly valid: boolean;
}

/**
 * Results for an entire wave
 */
export interface WaveResult {
  readonly waveId: WaveId;
  readonly executedAt: string;
  readonly totalScenarios: number;
  readonly scenarioResults: readonly ScenarioResult[];

  // Summary
  readonly survived: number;      // Olympus blocked as expected
  readonly systemFailures: number; // Olympus accepted when should block
  readonly unexpectedBlocks: number; // Olympus blocked for wrong reason

  // Invariant coverage
  readonly invariantCoverage: Record<InvariantId, InvariantCoverage>;
}

export interface InvariantCoverage {
  readonly invariantId: InvariantId;
  readonly scenariosTested: number;
  readonly timesFired: number;
  readonly timesExpectedToFire: number;
  readonly accuracy: number; // 0-1
}

/**
 * Complete crucible execution results
 */
export interface CrucibleResult {
  readonly crucibleVersion: string;
  readonly executedAt: string;
  readonly totalDuration: number; // ms

  readonly waveResults: readonly WaveResult[];

  // Overall survivability
  readonly totalScenarios: number;
  readonly totalSurvived: number;
  readonly totalSystemFailures: number;
  readonly survivabilityRate: number; // 0-1

  // Constitution integrity
  readonly constitutionHash: string;
  readonly constitutionVersion: string;
}

// ============================================================================
// GENERATOR CONFIGURATION
// ============================================================================

/**
 * Configuration for the world generator
 */
export interface GeneratorConfig {
  readonly seed: string;  // Deterministic seed
  readonly waveId: WaveId;
  readonly targetInvariants?: readonly InvariantId[];
  readonly maxScenarios?: number;
}

/**
 * Deterministic ID generator
 */
export function generateDeterministicId(seed: string, index: number): string {
  // Simple deterministic hash - no randomness
  const input = `${seed}-${index}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `AWG-${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

/**
 * Deterministic timestamp generator
 */
export function generateDeterministicTimestamp(seed: string, offsetMs: number): string {
  // Base timestamp: 2026-01-20T00:00:00.000Z
  const baseMs = new Date('2026-01-20T00:00:00.000Z').getTime();
  return new Date(baseMs + offsetMs).toISOString();
}

/**
 * Deterministic hash generator
 */
export function generateDeterministicHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// ============================================================================
// WAVE 2: TEMPORAL & OBLIGATION STRESS TYPES
// ============================================================================

/**
 * Authority level for obligation proofs
 */
export type AuthorityLevel =
  | 'SYSTEM_ROOT'      // Highest authority - cannot be overridden
  | 'CONSTITUTIONAL'   // Constitution-level authority
  | 'GOVERNANCE'       // Governance-level authority
  | 'OPERATIONAL';     // Operational-level authority

/**
 * Obligation status
 */
export type ObligationStatus =
  | 'PENDING'          // Not yet due
  | 'ACTIVE'           // Currently active
  | 'SATISFIED'        // Completed successfully
  | 'VIOLATED'         // Deadline missed or failed
  | 'IMPOSSIBLE'       // Cannot be satisfied
  | 'CONFLICTED';      // Conflicts with other obligations

/**
 * Obligation - a time-bound requirement
 */
export interface Obligation {
  readonly obligationId: string;
  readonly description: string;
  readonly createdAt: number;       // Logical time unit
  readonly deadline: number;        // Logical time unit
  readonly status: ObligationStatus;
  readonly requiredResources: readonly string[];
  readonly conflictsWith: readonly string[];  // Other obligation IDs
  readonly dependsOn: readonly string[];      // Prerequisites
  readonly satisfiedBy?: string;              // What satisfied it
  readonly authority: AuthorityLevel;
}

/**
 * Omission proof - proves an obligation cannot be satisfied
 */
export interface OmissionProof {
  readonly proofId: string;
  readonly obligationId: string;
  readonly proofType: 'RESOURCE_CONFLICT' | 'TEMPORAL_IMPOSSIBILITY' | 'DEPENDENCY_FAILURE' | 'MUTUAL_EXCLUSION';
  readonly authority: AuthorityLevel;
  readonly evidence: readonly string[];
  readonly generatedAt: number;
}

/**
 * Timeline step for multi-step scenarios
 */
export interface TimelineStep {
  readonly stepIndex: number;
  readonly logicalTime: number;
  readonly worldState: WorldState;
  readonly action?: AdversarialAction;
  readonly obligationsActive: readonly Obligation[];
  readonly obligationsViolated: readonly string[];
  readonly entropyDelta: number;
  readonly cumulativeEntropy: number;
}

/**
 * Entropy timeline for tracking gradual poisoning
 */
export interface EntropyTimeline {
  readonly timelineId: string;
  readonly steps: readonly EntropyTimelineStep[];
  readonly initialEntropy: number;
  readonly finalEntropy: number;
  readonly phaseTransitions: readonly PhaseTransition[];
  readonly poisonRate: number;  // Entropy increase per step
}

/**
 * Single step in entropy timeline
 */
export interface EntropyTimelineStep {
  readonly stepIndex: number;
  readonly logicalTime: number;
  readonly entropy: number;
  readonly phase: EntropyPhase;
  readonly action: string;
  readonly entropyContribution: number;
  readonly mccsAvailable: boolean;
  readonly mccsDeferred: boolean;
}

/**
 * Phase transition event
 */
export interface PhaseTransition {
  readonly fromPhase: EntropyPhase;
  readonly toPhase: EntropyPhase;
  readonly atStep: number;
  readonly atEntropy: number;
  readonly trigger: string;
}

/**
 * Temporal horizon analysis
 */
export interface TemporalHorizon {
  readonly currentTime: number;       // N
  readonly horizonDepth: number;      // K
  readonly analysisTime: number;      // N+K
  readonly presentSafe: boolean;
  readonly futureCollapse: boolean;
  readonly collapseStep?: number;
  readonly collapseReason?: string;
}

/**
 * Multi-step adversarial scenario (Wave 2)
 */
export interface MultiStepScenario extends AdversarialScenario {
  readonly isMultiStep: true;
  readonly timeline: readonly TimelineStep[];
  readonly obligations: readonly Obligation[];
  readonly omissionProofs: readonly OmissionProof[];
  readonly entropyTimeline?: EntropyTimeline;
  readonly temporalHorizon?: TemporalHorizon;
  readonly totalSteps: number;
  readonly collapseStep?: number;
}

/**
 * Multi-step scenario result
 */
export interface MultiStepScenarioResult extends ScenarioResult {
  readonly isMultiStep: true;
  readonly stepResults: readonly StepResult[];
  readonly obligationResults: readonly ObligationResult[];
  readonly entropyProgression: readonly number[];
  readonly phaseProgression: readonly EntropyPhase[];
  readonly blockedAtStep?: number;
  readonly blockTrigger?: string;
}

/**
 * Result for a single step
 */
export interface StepResult {
  readonly stepIndex: number;
  readonly executed: boolean;
  readonly blocked: boolean;
  readonly blockReason?: string;
  readonly invariantsFired: readonly InvariantId[];
  readonly entropyBefore: number;
  readonly entropyAfter: number;
  readonly phaseBefore: EntropyPhase;
  readonly phaseAfter: EntropyPhase;
}

/**
 * Result for an obligation
 */
export interface ObligationResult {
  readonly obligationId: string;
  readonly finalStatus: ObligationStatus;
  readonly satisfiedAt?: number;
  readonly violatedAt?: number;
  readonly omissionProof?: OmissionProof;
}

/**
 * AEC action types for entropy scenarios
 */
export type AECAction =
  | 'CONTINUE'           // Allow operation to proceed
  | 'MCCS_MANDATORY'     // Require MCCS before proceeding
  | 'READ_ONLY'          // No mutations allowed
  | 'PERMANENT_READ_ONLY' // Permanent read-only lock
  | 'PERMANENT_HALT';    // Complete system halt

/**
 * TSL block types for temporal scenarios
 */
export type TSLBlockType =
  | 'PRESENT_BLOCKED_FUTURE_VIOLATION'  // Present action blocked due to future collapse
  | 'CAUSAL_ORDERING_VIOLATION'         // Effect before cause
  | 'TEMPORAL_PARADOX'                  // Circular temporal dependency
  | 'HORIZON_BREACH';                   // N+K analysis shows collapse

/**
 * Type guard for multi-step scenarios
 */
export function isMultiStepScenario(scenario: AdversarialScenario): scenario is MultiStepScenario {
  return 'isMultiStep' in scenario && scenario.isMultiStep === true;
}

/**
 * Type guard for multi-step results
 */
export function isMultiStepResult(result: ScenarioResult): result is MultiStepScenarioResult {
  return 'isMultiStep' in result && result.isMultiStep === true;
}

// ============================================================================
// WAVE 3: ADVERSARIAL GOVERNANCE & PROOF WARFARE TYPES
// ============================================================================

/**
 * Wave 3 contradiction types
 */
export type Wave3ContradictionType =
  | 'PROOF_FLOODING'          // Valid actions generating maximal proofs
  | 'AUTHORITY_LAUNDERING'    // Legal authority chain attacking SYSTEM_ROOT
  | 'WEAPONIZED_COMPLIANCE'   // Multiple actors' legal actions causing collapse
  | 'TRAGIC_NECESSITY';       // Invariant conflicts with no clean solution

// Extend ContradictionType to include Wave 3
export type ExtendedContradictionType = ContradictionType | Wave3ContradictionType;

/**
 * Proof entry in the ledger
 */
export interface ProofEntry {
  readonly proofId: string;
  readonly timestamp: number;
  readonly invariantId: InvariantId;
  readonly actionId: string;
  readonly actorId: string;
  readonly proofType: ProofType;
  readonly proofSize: number;          // Bytes
  readonly computeCost: number;        // Arbitrary units
  readonly authority: AuthorityLevel;
  readonly isValid: boolean;
  readonly parentProofId?: string;     // For chain tracking
}

/**
 * Proof types for ledger entries
 */
export type ProofType =
  | 'INVARIANT_CHECK'         // Standard invariant verification
  | 'OVERRIDE_JUSTIFICATION'  // Override with proof
  | 'AUTHORITY_DELEGATION'    // Authority transfer proof
  | 'SINGULARITY_CREATION'    // Decision singularity proof
  | 'OMISSION_PROOF'          // Proof of impossibility
  | 'COMPLIANCE_CERTIFICATE'  // Proof of rule compliance
  | 'TRAGIC_DECISION'         // Proof of least-bad choice
  | 'SELF_LIMITATION';        // Proof of voluntary constraint

/**
 * Proof ledger state
 */
export interface ProofLedger {
  readonly ledgerId: string;
  readonly entries: readonly ProofEntry[];
  readonly totalSize: number;           // Bytes
  readonly totalComputeCost: number;
  readonly entryCount: number;
  readonly oldestEntry: number;         // Timestamp
  readonly newestEntry: number;         // Timestamp
  readonly growthRate: number;          // Entries per time unit
  readonly sizeGrowthRate: number;      // Bytes per time unit
}

/**
 * Ledger stress metrics
 */
export interface LedgerStressMetrics {
  readonly currentSize: number;
  readonly maxSize: number;
  readonly utilizationPercent: number;
  readonly entriesPerSecond: number;
  readonly bytesPerSecond: number;
  readonly projectedExhaustionStep?: number;
  readonly isUnderStress: boolean;
  readonly stressLevel: 'NOMINAL' | 'ELEVATED' | 'CRITICAL' | 'OVERFLOW';
}

/**
 * Authority chain link
 */
export interface AuthorityChainLink {
  readonly linkId: string;
  readonly fromAuthority: AuthorityLevel;
  readonly toAuthority: AuthorityLevel;
  readonly delegatedBy: string;         // Actor ID
  readonly delegatedTo: string;         // Actor ID
  readonly timestamp: number;
  readonly justification: string;
  readonly scope: string[];             // What powers are delegated
  readonly constraints: readonly string[];
  readonly expiresAt?: number;
  readonly isRevoked: boolean;
  readonly revokedAt?: number;
  readonly revokedBy?: string;
  readonly proofId: string;
}

/**
 * Authority chain (for laundering detection)
 */
export interface AuthorityChain {
  readonly chainId: string;
  readonly links: readonly AuthorityChainLink[];
  readonly originAuthority: AuthorityLevel;
  readonly currentAuthority: AuthorityLevel;
  readonly targetAuthority?: AuthorityLevel;  // What they're trying to reach
  readonly depth: number;
  readonly isValid: boolean;
  readonly validationErrors: readonly string[];
  readonly nullificationAttempt: boolean;     // Trying to nullify SYSTEM_ROOT?
}

/**
 * Actor in multi-actor scenarios
 */
export interface GovernanceActor {
  readonly actorId: string;
  readonly name: string;
  readonly authority: AuthorityLevel;
  readonly delegatedAuthorities: readonly AuthorityLevel[];
  readonly actionsPerformed: readonly string[];
  readonly proofsGenerated: readonly string[];
  readonly complianceScore: number;     // 0-1, how compliant is this actor
  readonly isAdversarial: boolean;      // Is this actor hostile?
  readonly coordinatedWith: readonly string[];  // Other actor IDs
}

/**
 * Multi-actor action
 */
export interface MultiActorAction {
  readonly actionId: string;
  readonly actorId: string;
  readonly timestamp: number;
  readonly actionType: string;
  readonly isValid: boolean;            // Each action is valid in isolation
  readonly validationProof: string;
  readonly contributesToCollapse: boolean;
  readonly collapseContribution: number; // 0-1
}

/**
 * Weaponized compliance scenario state
 */
export interface WeaponizedComplianceState {
  readonly actors: readonly GovernanceActor[];
  readonly actions: readonly MultiActorAction[];
  readonly totalActions: number;
  readonly validActionsCount: number;
  readonly invalidActionsCount: number;
  readonly combinedCollapseRisk: number; // 0-1
  readonly coordinationDetected: boolean;
  readonly coordinationPattern?: string;
}

/**
 * Invariant conflict for tragic necessity
 */
export interface InvariantConflict {
  readonly conflictId: string;
  readonly invariantA: InvariantId;
  readonly invariantB: InvariantId;
  readonly invariantARequires: string;
  readonly invariantBRequires: string;
  readonly mutuallyExclusive: boolean;
  readonly conflictReason: string;
}

/**
 * Tragic decision option
 */
export interface TragicOption {
  readonly optionId: string;
  readonly description: string;
  readonly violatesInvariant: InvariantId;
  readonly preservesInvariant: InvariantId;
  readonly irreversibilityScore: number;  // 0-1, higher = more irreversible
  readonly damageScope: 'LOCAL' | 'REGIONAL' | 'GLOBAL' | 'EXISTENTIAL';
  readonly recoveryPossible: boolean;
  readonly recoverySteps?: number;
  readonly sideEffects: readonly string[];
}

/**
 * Tragic decision proof
 */
export interface TragicDecisionProof {
  readonly proofId: string;
  readonly conflict: InvariantConflict;
  readonly optionsConsidered: readonly TragicOption[];
  readonly chosenOption: TragicOption;
  readonly choiceRationale: string;
  readonly leastIrreversible: boolean;    // Did we choose the least-bad option?
  readonly alternativesExhausted: boolean;
  readonly timestamp: number;
  readonly authority: AuthorityLevel;
  readonly witnessProofs: readonly string[];  // Other proofs supporting this
}

/**
 * Governance stress metrics
 */
export interface GovernanceStressMetrics {
  readonly ssi: number;                   // Stability Score Index
  readonly authorityDilution: number;     // How much authority has been delegated
  readonly chainDepth: number;            // Deepest authority chain
  readonly activeOverrides: number;
  readonly pendingDelegations: number;
  readonly proofBacklog: number;
  readonly captureRisk: number;           // 0-1, risk of governance capture
  readonly nullificationRisk: number;     // 0-1, risk of SYSTEM_ROOT nullification
}

/**
 * Wave 3 governance scenario
 */
export interface GovernanceScenario extends AdversarialScenario {
  readonly isGovernanceScenario: true;
  readonly proofLedger: ProofLedger;
  readonly authorityChains: readonly AuthorityChain[];
  readonly actors: readonly GovernanceActor[];
  readonly governanceStress: GovernanceStressMetrics;
  readonly ledgerStress: LedgerStressMetrics;
  readonly complianceState?: WeaponizedComplianceState;
  readonly tragicDecision?: TragicDecisionProof;
  readonly captureAttempted: boolean;
  readonly captureMethod?: Wave3ContradictionType;
}

/**
 * Wave 3 scenario result
 */
export interface GovernanceScenarioResult extends ScenarioResult {
  readonly isGovernanceScenario: true;
  readonly ledgerMetrics: LedgerStressMetrics;
  readonly governanceMetrics: GovernanceStressMetrics;
  readonly authorityChainResults: readonly AuthorityChainResult[];
  readonly actorResults: readonly ActorResult[];
  readonly captureBlocked: boolean;
  readonly captureBlockReason?: string;
  readonly tragicDecisionMade: boolean;
  readonly tragicDecisionProof?: TragicDecisionProof;
  readonly systemLied: boolean;           // CRITICAL: Did Olympus lie?
  readonly systemDeferred: boolean;       // Did Olympus defer truth?
  readonly systemDegraded: boolean;       // Did Olympus degrade?
}

/**
 * Authority chain validation result
 */
export interface AuthorityChainResult {
  readonly chainId: string;
  readonly isValid: boolean;
  readonly nullificationBlocked: boolean;
  readonly blockReason?: string;
  readonly invalidLinks: readonly string[];
}

/**
 * Actor result in multi-actor scenario
 */
export interface ActorResult {
  readonly actorId: string;
  readonly actionsAttempted: number;
  readonly actionsBlocked: number;
  readonly proofsGenerated: number;
  readonly complianceViolations: number;
  readonly contributedToCollapse: boolean;
}

/**
 * System integrity check result
 */
export interface SystemIntegrityCheck {
  readonly checkId: string;
  readonly timestamp: number;
  readonly systemLied: boolean;
  readonly systemDeferred: boolean;
  readonly systemDegraded: boolean;
  readonly truthfulnessScore: number;     // 0-1
  readonly integrityViolations: readonly string[];
  readonly recommendation: 'CONTINUE' | 'HALT' | 'REPORT_FAILURE';
}

/**
 * Type guard for governance scenarios
 */
export function isGovernanceScenario(scenario: AdversarialScenario): scenario is GovernanceScenario {
  return 'isGovernanceScenario' in scenario && scenario.isGovernanceScenario === true;
}

/**
 * Type guard for governance results
 */
export function isGovernanceResult(result: ScenarioResult): result is GovernanceScenarioResult {
  return 'isGovernanceScenario' in result && result.isGovernanceScenario === true;
}
