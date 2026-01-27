/**
 * Runtime Enforcement Types
 *
 * Core types for the runtime-enforced RSR system.
 * These are PRIMITIVES, not configuration.
 *
 * ORIS (OLYMPUS Runtime Immune System) extensions included.
 */

import type { LossClass, TracedAgentId, HandoffId } from '../types';
import type { ShapeDeclaration, ShapeTraceResult, GateResult } from '../registry/types';

// ============================================================================
// SHAPE KIND - INVARIANT VS CAPABILITY
// ============================================================================

/**
 * Shape Kind
 *
 * INVARIANT: Must survive ALL handoffs. NEVER summarized.
 *            Bypasses summarizeOutputForDependency entirely.
 *            Violation is ALWAYS FATAL.
 *
 * CAPABILITY: Standard shape subject to RSR laws per criticality tier.
 *             May be summarized according to normal flow.
 */
export type ShapeKind = 'INVARIANT' | 'CAPABILITY';

// ============================================================================
// SHAPE MORTALITY - LONG-TERM HEALTH TRACKING
// ============================================================================

/**
 * Mortality Status Classification
 *
 * HEALTHY:            Shape survives consistently (>95% survival rate)
 * FLAKY:              Shape has intermittent failures (70-95% survival rate)
 * DEGRADING:          Shape survival rate is declining over time
 * SYSTEMICALLY_BROKEN: Shape fails consistently (<70% survival rate)
 *
 * Classification is DETERMINISTIC based on historical data.
 */
export type MortalityStatus = 'HEALTHY' | 'FLAKY' | 'DEGRADING' | 'SYSTEMICALLY_BROKEN';

/**
 * Shape mortality record per handoff
 */
export interface HandoffMortalityRecord {
  handoff_id: HandoffId;
  total_passes: number;
  total_deaths: number;
  survival_rate: number;
  last_death_timestamp: string | null;
  consecutive_deaths: number;
  consecutive_survivals: number;
}

/**
 * Complete mortality record for a shape
 */
export interface ShapeMortalityRecord {
  shape_id: string;
  shape_kind: ShapeKind;
  criticality: ShapeCriticality;
  first_observed: string;
  last_updated: string;
  total_runs: number;
  overall_survival_rate: number;
  mortality_status: MortalityStatus;
  per_handoff: Record<HandoffId, HandoffMortalityRecord>;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  trend_window_runs: number;
}

/**
 * Mortality database structure
 */
export interface MortalityDatabase {
  version: string;
  last_updated: string;
  shapes: Record<string, ShapeMortalityRecord>;
}

// ============================================================================
// MINIMAL REPAIR DIRECTIVES (MRD)
// ============================================================================

/**
 * Loss Evidence - Structural proof of where loss occurred
 */
export interface LossEvidence {
  shape_id: string;
  handoff_id: HandoffId;
  source_agent: TracedAgentId;
  target_agent: TracedAgentId;
  loss_class: LossClass;
  attributes_before: string[];
  attributes_after: string[];
  attributes_lost: string[];
  source_path: string | null;
  target_path: string | null;
  structural_diff: {
    type: 'OMISSION' | 'TRUNCATION' | 'TRANSFORMATION' | 'COLLAPSE';
    description: string;
  };
}

/**
 * Minimal Repair Directive
 *
 * Advisory directive that identifies the smallest structural change
 * that would prevent the observed loss. MRDs are:
 * - ADVISORY ONLY - they do not execute automatically
 * - Do NOT modify agent logic
 * - Do NOT infer missing data
 * - Do NOT retry operations
 */
export interface MinimalRepairDirective {
  directive_id: string;
  generated_at: string;
  trigger: 'BLOCK_ALL' | 'FORK_TTE';

  // Target
  target_shape_id: string;
  target_shape_kind: ShapeKind;
  target_criticality: ShapeCriticality;

  // Loss analysis
  loss_evidence: LossEvidence;

  // Repair suggestion
  repair_type: RepairType;
  repair_description: string;
  repair_location: {
    agent: TracedAgentId;
    suggested_path: string;
  };

  // Structural fix
  structural_change: {
    type: 'PRESERVE_ATTRIBUTE' | 'PREVENT_SUMMARIZATION' | 'ADD_EXTRACTION_PATH' | 'MARK_INVARIANT';
    attribute: string | null;
    rationale: string;
  };

  // MRD is advisory only
  readonly: true;
  automatic_execution: false;
}

/**
 * Repair types (structural only, no inference)
 */
export type RepairType =
  | 'PREVENT_OMISSION'
  | 'PRESERVE_STRUCTURE'
  | 'PROTECT_ATTRIBUTE'
  | 'ENFORCE_INVARIANT'
  | 'ADD_EXTRACTION_SIGNAL';

// ============================================================================
// INVARIANT VALIDATION
// ============================================================================

/**
 * Invariant violation record
 */
export interface InvariantViolation {
  shape_id: string;
  handoff_id: HandoffId;
  violation_type: 'SUMMARIZATION_ATTEMPTED' | 'ATTRIBUTE_LOST' | 'SHAPE_ABSENT';
  expected: string;
  actual: string;
  timestamp: string;
  fatal: true; // Invariant violations are ALWAYS fatal
}

// ============================================================================
// SHAPE CRITICALITY - CODE-DEFINED, NOT CONFIGURABLE
// ============================================================================

/**
 * Shape Criticality Levels
 *
 * FOUNDATIONAL: Core capabilities without which the app is non-functional.
 *               Examples: Authentication, data display, navigation.
 *               RSR MUST be 1.0. Zero loss tolerated. Violation blocks ALL.
 *
 * INTERACTIVE:  Stateful user interaction capabilities.
 *               Examples: Filtering, pagination, forms, modals.
 *               RSR >= 0.95. Only L3 tolerated. Violation forks TTE.
 *
 * ENHANCEMENT:  Nice-to-have features that improve UX but aren't critical.
 *               Examples: Animations, tooltips, keyboard shortcuts.
 *               RSR >= 0.80. L3/L7 tolerated. Violation warns only.
 */
export type ShapeCriticality = 'FOUNDATIONAL' | 'INTERACTIVE' | 'ENHANCEMENT';

// ============================================================================
// RSR LAWS - IMMUTABLE, COMPILE-TIME CONSTANTS
// ============================================================================

/**
 * RSR Threshold Laws
 * These are NOT configurable. They are compile-time constants.
 */
export const RSR_LAWS = Object.freeze({
  FOUNDATIONAL: Object.freeze({
    min_rsr: 1.0,
    tolerated_losses: [] as LossClass[],
    violation_action: 'BLOCK_ALL' as const
  }),
  INTERACTIVE: Object.freeze({
    min_rsr: 0.95,
    tolerated_losses: ['L3_SPECIFICITY_LOSS'] as LossClass[],
    violation_action: 'FORK_TTE' as const
  }),
  ENHANCEMENT: Object.freeze({
    min_rsr: 0.80,
    tolerated_losses: ['L3_SPECIFICITY_LOSS', 'L7_SCHEMA_MISMATCH'] as LossClass[],
    violation_action: 'WARN_ONLY' as const
  })
});

// Freeze to prevent runtime modification
Object.freeze(RSR_LAWS);

// ============================================================================
// RSR COMPUTATION TYPES
// ============================================================================

export interface ShapeRSRResult {
  shape_id: string;
  criticality: ShapeCriticality;
  rsr: number;
  required_rsr: number;
  rsr_met: boolean;
  attributes_at_strategos: number;
  attributes_at_target: number;
  loss_classes_detected: LossClass[];
  tolerated_losses: LossClass[];
  untolerated_losses: LossClass[];
  violation: RSRViolation | null;
}

export interface RSRViolation {
  shape_id: string;
  criticality: ShapeCriticality;
  actual_rsr: number;
  required_rsr: number;
  deficit: number;
  untolerated_losses: LossClass[];
  enforcement_action: EnforcementAction;
}

export type EnforcementAction = 'BLOCK_ALL' | 'FORK_TTE' | 'WARN_ONLY';

export interface CriticalityTierResult {
  criticality: ShapeCriticality;
  shapes: ShapeRSRResult[];
  aggregate_rsr: number;
  required_rsr: number;
  tier_met: boolean;
  enforcement_action: EnforcementAction;
  violations: RSRViolation[];
}

// ============================================================================
// TRIPLE-TRACK EXECUTION (TTE) TYPES
// ============================================================================

/**
 * Execution Track Types
 *
 * CANONICAL:   The primary execution track. Blocked on FOUNDATIONAL or INTERACTIVE failure.
 *              Only track that produces production-ready output.
 *
 * SHADOW:      Allowed to run for diagnostic purposes but NEVER promotable.
 *              Output is isolated and marked as non-canonical.
 *
 * REMEDIATED:  Runs with generated RepairDirective. Can be promoted to CANONICAL
 *              if it passes ALL gates AND satisfies ALL RSR laws.
 */
export type ExecutionTrack = 'CANONICAL' | 'SHADOW' | 'REMEDIATED';

export interface TrackState {
  track: ExecutionTrack;
  run_id: string;
  parent_run_id: string | null;
  created_at: string;
  status: TrackStatus;
  isolated: true; // Always true - tracks are ALWAYS isolated
  promotable: boolean;
  gate_results: GateResult[];
  rsr_results: ShapeRSRResult[];
  repair_directive: RepairDirective | null;
}

export type TrackStatus =
  | 'PENDING'
  | 'EXECUTING'
  | 'PASSED'
  | 'FAILED'
  | 'BLOCKED'
  | 'PROMOTED'
  | 'ABANDONED';

export interface RepairDirective {
  directive_id: string;
  target_shape_id: string;
  criticality: ShapeCriticality;
  missing_attributes: string[];
  degraded_attributes: string[];
  suggested_sources: string[];
  generated_at: string;
  // RepairDirectives are informational ONLY
  // They do NOT modify agent logic or infer missing data
  readonly: true;
}

// ============================================================================
// TTE FORK DECISION
// ============================================================================

export interface TTEForkDecision {
  fork_required: boolean;
  reason: string;
  canonical_blocked: boolean;
  shadow_allowed: boolean;
  remediation_possible: boolean;
  tracks_to_create: ExecutionTrack[];
  triggering_violations: RSRViolation[];
}

// ============================================================================
// PROMOTION TYPES
// ============================================================================

export interface PromotionEligibility {
  track: ExecutionTrack;
  run_id: string;
  eligible: boolean;
  blockers: PromotionBlocker[];
  passed_gates: string[];
  failed_gates: string[];
  rsr_compliance: {
    foundational_met: boolean;
    interactive_met: boolean;
    enhancement_met: boolean;
  };
}

export interface PromotionBlocker {
  blocker_type: 'GATE_FAILURE' | 'RSR_VIOLATION' | 'TRACK_TYPE' | 'UNTOLERATED_LOSS';
  description: string;
  blocking_entity: string;
}

export interface PromotionResult {
  attempted: boolean;
  success: boolean;
  source_track: ExecutionTrack;
  source_run_id: string;
  target_track: 'CANONICAL';
  promoted_at: string | null;
  blockers: PromotionBlocker[];
}

// ============================================================================
// ENFORCEMENT ENGINE TYPES
// ============================================================================

export interface EnforcementDecision {
  timestamp: string;
  run_id: string;

  // RSR Analysis
  per_shape_rsr: ShapeRSRResult[];
  per_tier_results: CriticalityTierResult[];

  // Enforcement Decision
  overall_action: EnforcementAction;
  canonical_allowed: boolean;

  // TTE Decision
  tte_decision: TTEForkDecision;
  active_tracks: TrackState[];

  // Violations
  foundational_violations: RSRViolation[];
  interactive_violations: RSRViolation[];
  enhancement_violations: RSRViolation[];

  // Proof
  proof: EnforcementProof;
}

export interface EnforcementProof {
  laws_applied: typeof RSR_LAWS;
  computation_method: 'STRUCTURAL_ATTRIBUTE_RATIO';
  no_inference_used: true;
  no_softening_applied: true;
  no_override_possible: true;
  decision_deterministic: true;
}

// ============================================================================
// PROOF-CARRYING REPORT TYPES
// ============================================================================

export interface RuntimeControlReport {
  metadata: {
    generated_at: string;
    runtime_version: string;
    run_id: string;
    enforcement_mode: 'RUNTIME_PRIMITIVE';
    oris_version: string; // ORIS extension version
  };

  // RSR Analysis
  rsr_analysis: {
    per_shape: ShapeRSRResult[];
    per_tier: CriticalityTierResult[];
    global_rsr: number;
  };

  // Enforcement
  enforcement: EnforcementDecision;

  // TTE State
  tte_state: {
    fork_occurred: boolean;
    active_tracks: TrackState[];
    promotion_eligibility: PromotionEligibility[];
  };

  // ORIS: Shape Classification
  shape_classification: {
    shapes: Array<{
      shape_id: string;
      shape_kind: ShapeKind;
      criticality: ShapeCriticality;
      mortality_status: MortalityStatus;
      survival_rate: number;
      trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    }>;
    invariant_count: number;
    capability_count: number;
    invariant_violations: InvariantViolation[];
  };

  // ORIS: Mortality Analysis
  mortality_analysis: {
    healthy_count: number;
    flaky_count: number;
    degrading_count: number;
    broken_count: number;
    most_vulnerable_shapes: string[];
    most_dangerous_handoffs: HandoffId[];
  };

  // ORIS: Minimal Repair Directives
  repair_directives: MinimalRepairDirective[];

  // Proof
  proof_chain: {
    laws_immutable: true;
    computation_deterministic: true;
    decision_non_bypassable: true;
    tracks_isolated: true;
    // ORIS additions
    no_human_override: true;
    no_policy_config: true;
    no_runtime_flags: true;
  };

  // OFEL: Forensic Execution Layer
  forensics?: OFELForensics;
}

// ============================================================================
// OFEL (OLYMPUS FORENSIC EXECUTION LAYER) TYPES
// ============================================================================

/**
 * Causal Fingerprint - Captures transformation state at each handoff
 *
 * Provides forensic proof of what transformations occurred,
 * enabling causal analysis of shape loss.
 */
export interface CausalFingerprint {
  fingerprint_id: string;
  run_id: string;
  handoff_id: HandoffId;
  timestamp: string;

  // Transformation identity
  transform_hash: string;
  source_agent: TracedAgentId;
  target_agent: TracedAgentId;

  // Shape state before/after
  input_shape_ids: string[];
  output_shape_ids: string[];
  shapes_lost: string[];
  shapes_degraded: string[];

  // Summarization tracking
  summarization_invoked: boolean;
  summarization_input_size: number | null;
  summarization_output_size: number | null;
  summarization_compression_ratio: number | null;

  // Invariant tracking
  invariant_shapes_present: string[];
  invariant_bypass_requested: boolean;
  invariant_bypass_granted: boolean; // Always false - bypass is NOT allowed

  // Structural diff
  attribute_delta: {
    attributes_before: number;
    attributes_after: number;
    attributes_lost: string[];
    attributes_added: string[];
  };

  // Proof
  deterministic: true;
  reproducible: true;
}

/**
 * Fingerprint Database - Persisted per run
 */
export interface FingerprintDatabase {
  version: string;
  run_id: string;
  created_at: string;
  fingerprints: CausalFingerprint[];
  summary: {
    total_handoffs: number;
    handoffs_with_loss: number;
    total_shapes_lost: number;
    summarization_invocations: number;
    invariant_violations: number;
  };
}

/**
 * Counterfactual Scenario Type
 *
 * Defines what alternative execution path to test.
 * Read-only, structural-only - no codegen, no side effects.
 */
export type CounterfactualScenario =
  | 'SUMMARIZATION_REMOVED'
  | 'INVARIANT_BYPASSED'
  | 'FULL_ATTRIBUTE_PRESERVATION';

/**
 * Counterfactual Replay Result
 *
 * Result of replaying execution with modified conditions.
 * Used ONLY to prove causality, not to change execution.
 */
export interface CounterfactualResult {
  scenario: CounterfactualScenario;
  target_shape_id: string;
  target_handoff_id: HandoffId;
  timestamp: string;

  // Baseline (actual execution)
  baseline: {
    survived: boolean;
    rsr: number;
    attributes_present: number;
    attributes_required: number;
    loss_class: LossClass | null;
  };

  // Counterfactual (simulated execution)
  counterfactual: {
    survived: boolean;
    rsr: number;
    attributes_present: number;
    attributes_required: number;
    loss_class: LossClass | null;
  };

  // Causal analysis
  causal_impact: {
    survival_changed: boolean;
    rsr_delta: number;
    would_have_prevented_loss: boolean;
    causal_factor_confirmed: boolean;
  };

  // Proof
  proof: {
    replay_deterministic: true;
    no_side_effects: true;
    structural_only: true;
    read_only: true;
  };
}

/**
 * Inspection Level - Determined by mortality status
 *
 * Escalates inspection depth based on shape health.
 * NO FLAGS, NO CONFIG, NO OVERRIDES.
 */
export type InspectionLevel =
  | 'BASELINE'              // HEALTHY shapes - basic checks
  | 'ATTRIBUTE_DIFF'        // FLAKY shapes - attribute comparison
  | 'FULL_STRUCTURAL_TRACE' // DEGRADING shapes - full trace
  | 'MANDATORY_FORENSICS';  // BROKEN shapes - fingerprints + counterfactual

/**
 * Inspection Configuration per shape
 */
export interface ShapeInspectionConfig {
  shape_id: string;
  mortality_status: MortalityStatus;
  inspection_level: InspectionLevel;
  requires_fingerprints: boolean;
  requires_counterfactual: boolean;
  trace_depth: 'SHALLOW' | 'MEDIUM' | 'DEEP' | 'FULL';
}

/**
 * OFEL Forensics - Complete forensic data for a run
 */
export interface OFELForensics {
  ofel_version: string;

  // Causal fingerprints for all handoffs
  causal_fingerprints: CausalFingerprint[];

  // Counterfactual replay results
  counterfactual_results: CounterfactualResult[];

  // Inspection levels per shape
  inspection_levels: ShapeInspectionConfig[];

  // Summary
  forensic_summary: {
    total_fingerprints: number;
    counterfactuals_executed: number;
    shapes_at_mandatory_forensics: number;
    causal_factors_identified: number;
    provable_causality_chains: number;
  };

  // Proof chain extension
  forensic_proof: {
    fingerprints_deterministic: true;
    counterfactuals_read_only: true;
    no_execution_modification: true;
    causality_provable: boolean;
  };
}

// ============================================================================
// OCIC (OLYMPUS CAUSAL INTELLIGENCE CORE) TYPES
// ============================================================================

/**
 * Intervention - A single atomic change that could restore compliance
 */
export interface CausalIntervention {
  intervention_id: string;
  target_shape_id: string;
  target_handoff_id: HandoffId;
  intervention_type: InterventionType;
  description: string;

  // What this intervention would change
  structural_change: {
    agent: TracedAgentId;
    change_type: 'PRESERVE_ATTRIBUTE' | 'PREVENT_SUMMARIZATION' | 'ENFORCE_INVARIANT' | 'ADD_EXTRACTION';
    target_attributes: string[];
  };

  // Counterfactual proof that this intervention works
  counterfactual_proof: {
    scenario_id: string;
    baseline_rsr: number;
    projected_rsr: number;
    rsr_gain: number;
    invariants_preserved: boolean;
  };
}

export type InterventionType =
  | 'ATTRIBUTE_PRESERVATION'
  | 'SUMMARIZATION_BYPASS'
  | 'INVARIANT_ENFORCEMENT'
  | 'EXTRACTION_PATH_ADD';

/**
 * Minimal Causal Cut Set (MCCS)
 *
 * The smallest set of interventions that would restore RSR compliance.
 * Computed via counterfactual composition and proven via replay.
 */
export interface MinimalCausalCutSet {
  mccs_id: string;
  computed_at: string;

  // The interventions in this cut set
  interventions: CausalIntervention[];
  intervention_count: number;

  // What this MCCS achieves
  projected_outcome: {
    global_rsr_before: number;
    global_rsr_after: number;
    rsr_gain: number;
    shapes_restored: string[];
    invariants_preserved: boolean;
    all_tiers_compliant: boolean;
  };

  // Ranking metrics (lower rank = better)
  rank: number;
  ranking_factors: {
    intervention_count_score: number;  // Lower is better
    rsr_gain_score: number;            // Higher is better (inverted for rank)
    invariant_safety_score: number;    // 1.0 if all preserved, 0.0 if any violated
  };

  // Proof that this MCCS works
  proof: {
    verified_via_replay: boolean;
    composition_id: string;
    deterministic: true;
    no_inference: true;
  };
}

/**
 * Counterfactual Composition - Multi-intervention replay
 *
 * Combines multiple scenarios to evaluate interaction effects.
 */
export interface CounterfactualComposition {
  composition_id: string;
  computed_at: string;

  // Component scenarios
  scenarios: CounterfactualScenario[];

  // Target shapes and handoffs
  targets: Array<{
    shape_id: string;
    handoff_id: HandoffId;
  }>;

  // Combined result
  combined_result: {
    baseline_global_rsr: number;
    projected_global_rsr: number;
    rsr_delta: number;

    per_shape: Array<{
      shape_id: string;
      baseline_rsr: number;
      projected_rsr: number;
      compliance_restored: boolean;
    }>;

    interaction_effects: InteractionEffect[];
  };

  // Proof
  proof: {
    composition_deterministic: true;
    no_side_effects: true;
    replay_verified: boolean;
  };
}

/**
 * Interaction Effect - When combining interventions produces
 * non-additive results (synergy or interference)
 */
export interface InteractionEffect {
  effect_type: 'SYNERGY' | 'INTERFERENCE' | 'NEUTRAL';
  involved_interventions: string[];  // intervention_ids
  description: string;
  rsr_impact: number;  // Positive = synergy, negative = interference
}

/**
 * Predictive Block - A preemptive block based on historical fingerprints
 */
export interface PredictiveBlock {
  block_id: string;
  timestamp: string;

  // What triggered the block
  trigger: {
    current_transform_hash: string;
    current_handoff_id: HandoffId;
    current_source_agent: TracedAgentId;
    current_target_agent: TracedAgentId;
  };

  // Historical evidence
  historical_evidence: {
    matching_fingerprint_id: string;
    matching_run_id: string;
    matching_timestamp: string;
    historical_loss_class: LossClass;
    historical_invariant_violated: boolean;
    historical_shapes_lost: string[];
  };

  // Decision
  decision: 'BLOCK_PREEMPTIVELY';

  // Proof trace linking past to present
  proof_trace: {
    fingerprint_match_exact: boolean;
    transform_hash_identical: boolean;
    causal_link_established: true;
    no_heuristics: true;
    no_ml: true;
    no_probability: true;
  };
}

/**
 * Fingerprint Index Entry - For the global fingerprint index
 */
export interface FingerprintIndexEntry {
  transform_hash: string;
  fingerprint_ids: string[];
  run_ids: string[];

  // Outcome history
  outcomes: Array<{
    run_id: string;
    timestamp: string;
    caused_loss: boolean;
    loss_class: LossClass | null;
    invariant_violated: boolean;
    shapes_affected: string[];
  }>;

  // Aggregated risk
  total_occurrences: number;
  loss_occurrences: number;
  invariant_violations: number;

  // Verdict (deterministic, not probabilistic)
  verdict: 'SAFE' | 'CAUSED_LOSS' | 'CAUSED_INVARIANT_VIOLATION';
}

/**
 * Global Fingerprint Index - Persisted across runs
 */
export interface FingerprintIndex {
  version: string;
  last_updated: string;

  // Index by transform hash
  entries: Record<string, FingerprintIndexEntry>;

  // Statistics
  stats: {
    total_unique_hashes: number;
    total_fingerprints_indexed: number;
    hashes_with_loss: number;
    hashes_with_invariant_violation: number;
  };
}

/**
 * OCIC Intelligence - Complete causal intelligence for a run
 */
export interface OCICIntelligence {
  ocic_version: string;

  // Minimal Causal Cut Sets (ranked)
  minimal_causal_cuts: MinimalCausalCutSet[];

  // Predictive blocks issued
  predictive_blocks: PredictiveBlock[];

  // Counterfactual compositions computed
  counterfactual_compositions: CounterfactualComposition[];

  // Summary
  intelligence_summary: {
    mccs_computed: number;
    best_mccs_intervention_count: number;
    best_mccs_rsr_gain: number;
    predictive_blocks_issued: number;
    compositions_evaluated: number;
    causal_certainty_achieved: boolean;
  };

  // Proof chain
  intelligence_proof: {
    mccs_proven_via_replay: true;
    predictions_evidence_based: true;
    no_heuristics: true;
    no_ml: true;
    no_probability: true;
    deterministic: true;
    decisions_not_suggestions: true;
  };
}

// ============================================================================
// RLL (REALITY LOCK-IN LAYER) TYPES
// ============================================================================

/**
 * Lock Scope - Determines the boundary of a decision singularity
 *
 * PROJECT:     Locks the entire project - all shapes, all handoffs
 * SHAPE_CLASS: Locks specific shape classes (INVARIANT vs CAPABILITY)
 * SHAPE:       Locks specific shapes only
 * HANDOFF:     Locks specific handoffs only
 */
export type LockScope = 'PROJECT' | 'SHAPE_CLASS' | 'SHAPE' | 'HANDOFF';

/**
 * Reality Verdict - The final determination of a reality's validity
 *
 * PROVEN_VALID:   This reality has been proven to restore compliance
 * PROVEN_INVALID: This reality has been proven to cause loss
 * FORBIDDEN:      This reality is forbidden due to historical evidence
 */
export type RealityVerdict = 'PROVEN_VALID' | 'PROVEN_INVALID' | 'FORBIDDEN';

/**
 * Allowed Reality - A reality that MCCS has proven restores compliance
 */
export interface AllowedReality {
  reality_id: string;
  mccs_id: string;
  intervention_count: number;
  interventions: Array<{
    intervention_id: string;
    type: InterventionType;
    target_shape_id: string;
    target_handoff_id: HandoffId;
  }>;
  projected_rsr: number;
  compliance_restored: boolean;
  invariants_preserved: boolean;
}

/**
 * Forbidden Fingerprint - A fingerprint that historically caused loss
 */
export interface ForbiddenFingerprint {
  transform_hash: string;
  original_run_id: string;
  forbidden_at: string;
  reason: 'CAUSED_LOSS' | 'CAUSED_INVARIANT_VIOLATION';
  historical_shapes_lost: string[];
  historical_loss_class: LossClass | null;
}

/**
 * Decision Singularity - An immutable artifact that locks in a decision
 *
 * Once created, a singularity CANNOT be:
 * - Modified
 * - Deleted
 * - Overridden
 * - Bypassed
 *
 * All future runs MUST comply with active singularities.
 */
export interface DecisionSingularity {
  singularity_id: string;
  created_at: string;
  run_id: string;

  // Trigger conditions
  trigger: {
    global_rsr_at_trigger: number;
    required_rsr: number;
    rsr_deficit: number;
    violations_count: number;
    mccs_computed: boolean;
  };

  // Lock scope
  lock_scope: LockScope;
  locked_shapes: string[];
  locked_handoffs: HandoffId[];

  // Allowed realities (proven via MCCS)
  allowed_realities: AllowedReality[];

  // Forbidden fingerprints (proven via historical evidence)
  forbidden_fingerprints: ForbiddenFingerprint[];

  // Enforcement
  enforcement: {
    deviation_action: 'HARD_ABORT';
    no_override: true;
    no_retry: true;
    no_config: true;
    no_flag: true;
  };

  // Proof
  proof: {
    mccs_proven: boolean;
    fingerprints_evidence_based: boolean;
    deterministic: true;
    immutable: true;
    append_only: true;
  };
}

/**
 * Singularity Database - Persisted, append-only
 */
export interface SingularityDatabase {
  version: string;
  created_at: string;
  last_singularity_at: string;

  // All singularities (append-only)
  singularities: DecisionSingularity[];

  // Quick lookup indexes
  index: {
    by_shape: Record<string, string[]>;                 // shape_id -> singularity_ids
    by_handoff: Partial<Record<HandoffId, string[]>>;   // handoff_id -> singularity_ids
    by_fingerprint: Record<string, string>;              // transform_hash -> singularity_id
  };

  // Statistics
  stats: {
    total_singularities: number;
    total_locked_shapes: number;
    total_forbidden_fingerprints: number;
    total_allowed_realities: number;
  };
}

/**
 * Deviation - A detected deviation from an allowed reality
 */
export interface RealityDeviation {
  deviation_id: string;
  detected_at: string;
  run_id: string;

  // What singularity was violated
  violated_singularity_id: string;
  violated_singularity_created_at: string;

  // Deviation type
  deviation_type: 'FORBIDDEN_FINGERPRINT' | 'DISALLOWED_REALITY' | 'SCOPE_VIOLATION';

  // Evidence
  evidence: {
    current_transform_hash?: string;
    matching_forbidden_hash?: string;
    current_execution_path?: string;
    expected_reality_id?: string;
    actual_divergence_point?: HandoffId;
  };

  // Enforcement result
  action_taken: 'HARD_ABORT';
  abort_reason: string;
}

/**
 * Lock Enforcement Result - Result of validating against active singularities
 */
export interface LockEnforcementResult {
  timestamp: string;
  run_id: string;

  // Singularities checked
  active_singularities: number;
  singularities_checked: string[];

  // Result
  compliant: boolean;
  deviations: RealityDeviation[];

  // Action
  action: 'PROCEED' | 'HARD_ABORT';
  abort_proof?: {
    singularity_id: string;
    deviation_id: string;
    historical_evidence: string;
    causal_link: boolean;
  };

  // Proof
  proof: {
    all_singularities_checked: true;
    no_bypass_possible: true;
    deterministic: true;
  };
}

/**
 * Convergence Status - Tracks progress toward minimal reality
 */
export interface ConvergenceStatus {
  converged: boolean;
  convergence_run_id: string | null;

  // Current state
  current_global_rsr: number;
  target_global_rsr: number;
  rsr_gap: number;

  // Reality narrowing
  total_realities_evaluated: number;
  allowed_realities_count: number;
  forbidden_fingerprints_count: number;

  // Trend
  trend: 'CONVERGING' | 'STABLE' | 'DIVERGING';
  runs_since_last_singularity: number;
}

/**
 * Blocked Reality - A reality that was blocked by RLL
 */
export interface BlockedReality {
  block_id: string;
  blocked_at: string;
  run_id: string;

  // What was blocked
  blocked_transform_hash: string;
  blocked_handoff_id: HandoffId;
  blocked_source_agent: TracedAgentId;
  blocked_target_agent: TracedAgentId;

  // Why it was blocked
  blocking_singularity_id: string;
  block_reason: 'FORBIDDEN_FINGERPRINT' | 'DISALLOWED_PATH' | 'SCOPE_VIOLATION';

  // Reference to historical evidence
  historical_reference: {
    original_run_id: string;
    original_loss_class: LossClass | null;
    original_shapes_lost: string[];
  };

  // Proof
  proof: {
    exact_hash_match: boolean;
    causal_link_proven: boolean;
    no_heuristics: true;
    deterministic: true;
  };
}

/**
 * RLL Intelligence - Complete RLL state for a run
 */
export interface RLLIntelligence {
  rll_version: string;

  // Decision singularity (if created this run)
  decision_singularity: DecisionSingularity | null;

  // Lock enforcement result
  lock_enforcement: LockEnforcementResult;

  // Blocked realities (if any)
  blocked_realities: BlockedReality[];

  // Convergence status
  convergence_status: ConvergenceStatus;

  // Summary
  summary: {
    singularity_created: boolean;
    active_singularities: number;
    realities_blocked: number;
    execution_allowed: boolean;
    convergence_achieved: boolean;
  };

  // Proof chain
  proof: {
    singularities_immutable: true;
    enforcement_deterministic: true;
    no_override_possible: true;
    no_config_possible: true;
    no_flag_possible: true;
    decisions_irreversible: true;
  };
}

// ============================================================================
// AEC (ARCHITECTURAL ENTROPY CONTROL) TYPES
// ============================================================================

/**
 * Architectural Phase - The system's health state
 *
 * Phase can ONLY worsen without MCCS convergence.
 * Once DEAD, system is permanently halted.
 *
 * STABLE:     Healthy architecture, entropy under control
 * DECAYING:   Entropy rising, MCCS mandatory to continue
 * COLLAPSING: Critical entropy, READ_ONLY mode enforced
 * DEAD:       Terminal entropy, PERMANENT HALT
 */
export type ArchitecturalPhase = 'STABLE' | 'DECAYING' | 'COLLAPSING' | 'DEAD';

/**
 * Entropy Enforcement Action
 *
 * CONTINUE:       Normal execution allowed
 * MCCS_MANDATORY: Must apply MCCS intervention before continuing
 * READ_ONLY:      No mutations allowed, diagnostic mode only
 * PERMANENT_HALT: System is dead, no further execution possible
 */
export type EntropyEnforcementAction = 'CONTINUE' | 'MCCS_MANDATORY' | 'READ_ONLY' | 'PERMANENT_HALT';

/**
 * Entropy Component Scores - Individual factors contributing to entropy
 */
export interface EntropyComponents {
  // RSR Trend Component (0.0 to 1.0)
  // 0.0 = RSR improving, 1.0 = RSR declining rapidly
  rsr_trend_score: number;
  rsr_delta_per_run: number;
  rsr_trend_window: number;

  // Mortality Velocity Component (0.0 to 1.0)
  // 0.0 = No shape deaths, 1.0 = Rapid shape death rate
  mortality_velocity_score: number;
  deaths_per_run: number;
  mortality_window: number;

  // Singularity Density Component (0.0 to 1.0)
  // 0.0 = No singularities, 1.0 = High singularity concentration
  singularity_density_score: number;
  singularities_per_run: number;
  singularity_window: number;

  // MCCS Size Component (0.0 to 1.0)
  // 0.0 = Small interventions, 1.0 = Large interventions required
  mccs_size_score: number;
  average_mccs_size: number;
  mccs_window: number;
}

/**
 * Architectural Entropy Score
 *
 * FORMULA (deterministic):
 *   entropy = (w1 * rsr_trend) + (w2 * mortality_velocity) +
 *             (w3 * singularity_density) + (w4 * mccs_size)
 *
 * Where weights are fixed constants:
 *   w1 = 0.35 (RSR trend is primary indicator)
 *   w2 = 0.25 (Mortality velocity)
 *   w3 = 0.20 (Singularity density)
 *   w4 = 0.20 (MCCS intervention size)
 *
 * Result: 0.0 (perfect health) to 1.0 (complete decay)
 */
export interface ArchitecturalEntropyScore {
  // Composite entropy score (0.0 to 1.0)
  entropy: number;

  // Component breakdown
  components: EntropyComponents;

  // Weights used (fixed constants, documented for transparency)
  weights: {
    rsr_trend: 0.35;
    mortality_velocity: 0.25;
    singularity_density: 0.20;
    mccs_size: 0.20;
  };

  // Computation proof
  proof: {
    formula: string;
    deterministic: true;
    no_heuristics: true;
    no_ml: true;
    no_probability: true;
  };
}

/**
 * Phase Thresholds - Fixed constants for phase classification
 *
 * These thresholds are IMMUTABLE and defined at compile time.
 */
export const ENTROPY_PHASE_THRESHOLDS = Object.freeze({
  STABLE_MAX: 0.25,      // entropy <= 0.25 → STABLE
  DECAYING_MAX: 0.50,    // 0.25 < entropy <= 0.50 → DECAYING
  COLLAPSING_MAX: 0.75,  // 0.50 < entropy <= 0.75 → COLLAPSING
  DEAD_MIN: 0.75         // entropy > 0.75 → DEAD
});

// Freeze to prevent runtime modification
Object.freeze(ENTROPY_PHASE_THRESHOLDS);

/**
 * Entropy History Record - Immutable record per run
 */
export interface EntropyHistoryRecord {
  record_id: string;
  run_id: string;
  timestamp: string;

  // Entropy measurement
  entropy_score: ArchitecturalEntropyScore;

  // Phase classification
  phase: ArchitecturalPhase;
  previous_phase: ArchitecturalPhase | null;
  phase_worsened: boolean;

  // Enforcement
  enforcement_action: EntropyEnforcementAction;

  // Context from other Olympus systems
  context: {
    global_rsr: number;
    active_singularities: number;
    mccs_computed: number;
    shapes_dead: number;
    shapes_total: number;
  };

  // Immutability proof
  immutable: true;
  append_only: true;
}

/**
 * Entropy History Database - Append-only persistence
 */
export interface EntropyHistoryDatabase {
  version: string;
  created_at: string;
  last_record_at: string;

  // Historical records (append-only, never modified or deleted)
  records: EntropyHistoryRecord[];

  // Summary statistics
  stats: {
    total_runs: number;
    current_phase: ArchitecturalPhase;
    highest_entropy: number;
    lowest_entropy: number;
    runs_in_stable: number;
    runs_in_decaying: number;
    runs_in_collapsing: number;
    runs_in_dead: number;
  };

  // Trend data for reporting (raw values only)
  trend_data: {
    entropy_values: number[];
    rsr_values: number[];
    mortality_values: number[];
    singularity_values: number[];
    mccs_values: number[];
    timestamps: string[];
  };
}

/**
 * Entropy Gate Result - Result of entropy gate enforcement
 */
export interface EntropyGateResult {
  timestamp: string;
  run_id: string;

  // Entropy analysis
  entropy_score: ArchitecturalEntropyScore;
  phase: ArchitecturalPhase;

  // Enforcement decision
  action: EntropyEnforcementAction;
  execution_allowed: boolean;
  mutations_allowed: boolean;

  // Gate proof
  gate_proof: {
    thresholds_immutable: true;
    phase_deterministic: true;
    action_non_bypassable: true;
    no_config: true;
    no_flag: true;
    no_override: true;
  };

  // If action is not CONTINUE, explain why
  enforcement_reason: string | null;
}

/**
 * AEC Intelligence - Complete AEC state for a run
 */
export interface AECIntelligence {
  aec_version: string;

  // Entropy measurement
  entropy_score: ArchitecturalEntropyScore;

  // Phase classification
  phase: ArchitecturalPhase;
  phase_history: ArchitecturalPhase[];

  // Gate enforcement
  gate_result: EntropyGateResult;

  // Historical trend (for reporting)
  trend: {
    entropy_trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
    runs_analyzed: number;
    entropy_delta: number;
  };

  // Summary
  summary: {
    current_entropy: number;
    current_phase: string;
    execution_allowed: boolean;
    mutations_allowed: boolean;
    system_healthy: boolean;
  };

  // Proof chain
  proof: {
    entropy_deterministic: true;
    phase_from_fixed_thresholds: true;
    gate_non_bypassable: true;
    history_append_only: true;
    no_config: true;
    no_flag: true;
    no_override: true;
    no_reset: true;
  };
}

// =============================================================================
// INEVITABILITY ENGINE (IE) TYPES
// =============================================================================
// "Tests stop bugs. AEC stops decay. Inevitability stops self-destruction."
// =============================================================================

/**
 * Action Signature - Deterministic structural hash of proposed execution diffs
 *
 * NOT content-based (strings change), but STRUCTURE-based:
 * - Which shapes affected
 * - Which handoffs involved
 * - Which transform types applied
 * - Direction of change (add/remove/modify)
 */
export interface ActionSignature {
  // Unique signature ID
  signature_id: string;

  // Structural fingerprint (deterministic hash)
  fingerprint: string;

  // Components that form the fingerprint
  components: {
    // Shapes affected by this action
    affected_shapes: string[];

    // Handoffs involved
    affected_handoffs: string[];

    // Transform types applied
    transform_types: string[];

    // Change directions
    change_directions: ('ADD' | 'REMOVE' | 'MODIFY')[];
  };

  // When this signature was computed
  computed_at: string;

  // Run ID that produced this signature
  run_id: string;
}

/**
 * Causal Path - Forward simulation result from a counterfactual
 *
 * Each path represents one possible future trajectory
 */
export interface CausalPath {
  // Unique path ID
  path_id: string;

  // Starting counterfactual that spawned this path
  origin_counterfactual: string;

  // Number of steps simulated forward
  steps_simulated: number;

  // Entropy at each step
  entropy_trajectory: number[];

  // Phase at each step
  phase_trajectory: ArchitecturalPhase[];

  // MCCS size at each step
  mccs_trajectory: number[];

  // Terminal state
  terminal_state: {
    phase: ArchitecturalPhase;
    entropy: number;
    mccs_size: number;
    step_reached: number;
  };

  // Does this path lead to collapse (COLLAPSING or DEAD)?
  leads_to_collapse: boolean;

  // Does MCCS grow monotonically on this path?
  mccs_grows_monotonically: boolean;
}

/**
 * Inevitability Proof - Mathematical proof that collapse is inevitable
 *
 * Inevitability is TRUE if:
 * - ALL causal paths lead to Phase >= COLLAPSING, OR
 * - MCCS size grows monotonically across ALL paths
 */
export interface InevitabilityProof {
  // Is collapse inevitable?
  inevitable: boolean;

  // Proof type
  proof_type: 'ALL_PATHS_COLLAPSE' | 'MCCS_MONOTONIC_GROWTH' | 'NOT_INEVITABLE';

  // Total paths analyzed
  paths_analyzed: number;

  // Paths leading to collapse
  paths_to_collapse: number;

  // Paths with monotonic MCCS growth
  paths_with_mccs_growth: number;

  // Steps until earliest collapse (if inevitable)
  steps_to_collapse: number | null;

  // The path that collapses fastest (if inevitable)
  fastest_collapse_path: string | null;

  // Confidence (always 1.0 - this is mathematical, not heuristic)
  confidence: 1.0;

  // Proof timestamp
  proven_at: string;
}

/**
 * Inevitability Record - History record for append-only database
 */
export interface InevitabilityRecord {
  // Unique record ID
  record_id: string;

  // Run ID
  run_id: string;

  // Timestamp
  timestamp: string;

  // Action signature that was analyzed
  action_signature: ActionSignature;

  // All causal paths explored
  causal_paths: CausalPath[];

  // Inevitability proof
  proof: InevitabilityProof;

  // Gate enforcement result
  gate_result: 'ALLOW' | 'HARD_ABORT';

  // Context at time of analysis
  context: {
    current_entropy: number;
    current_phase: ArchitecturalPhase;
    current_mccs_size: number;
    active_singularities: number;
  };

  // Immutability markers
  immutable: true;
  append_only: true;
}

/**
 * Inevitability Database - Append-only history
 */
export interface InevitabilityDatabase {
  // Database version
  version: string;

  // Creation timestamp
  created_at: string;

  // Last record timestamp
  last_record_at: string;

  // All records (append-only)
  records: InevitabilityRecord[];

  // Statistics
  stats: {
    total_analyses: number;
    total_aborts: number;
    total_allows: number;
    earliest_collapse_detected: number | null;
    average_steps_to_collapse: number | null;
  };

  // Signature registry (to detect repeated doomed actions)
  signature_registry: {
    // Map of fingerprint -> record IDs that had this fingerprint
    fingerprint_history: Record<string, string[]>;

    // Fingerprints that have been proven inevitable
    doomed_fingerprints: string[];
  };
}

/**
 * Inevitability Gate Result - Enforcement decision
 */
export interface InevitabilityGateResult {
  // Gate ID
  gate_id: string;

  // Run ID
  run_id: string;

  // Timestamp
  timestamp: string;

  // Action taken
  action: 'ALLOW' | 'HARD_ABORT';

  // Was the action signature previously seen?
  signature_seen_before: boolean;

  // Was this fingerprint previously proven doomed?
  fingerprint_already_doomed: boolean;

  // Inevitability proof (if computed)
  proof: InevitabilityProof | null;

  // Reason for decision
  reason: string;

  // Gate proof chain
  gate_proof: {
    forward_simulation_deterministic: true;
    all_paths_explored: true;
    inevitability_mathematical: true;
    no_heuristics: true;
    no_probability: true;
    no_config: true;
    no_flag: true;
    no_override: true;
  };
}

/**
 * IE Intelligence - Complete IE state for a run
 */
export interface IEIntelligence {
  ie_version: string;

  // Action signature
  action_signature: ActionSignature;

  // Causal paths explored
  causal_paths: CausalPath[];

  // Inevitability proof
  proof: InevitabilityProof;

  // Gate result
  gate_result: InevitabilityGateResult;

  // Summary
  summary: {
    inevitable: boolean;
    steps_to_collapse: number | null;
    paths_analyzed: number;
    paths_to_collapse: number;
    action_taken: 'ALLOW' | 'HARD_ABORT';
    fingerprint_was_doomed: boolean;
  };

  // Causal chain summary (human-readable)
  causal_chain_summary: string[];

  // Entropy trajectory visualization data
  entropy_trajectory: {
    path_id: string;
    trajectory: number[];
    leads_to_collapse: boolean;
  }[];

  // Proof chain
  proof_chain: {
    simulation_deterministic: true;
    all_paths_explored: true;
    inevitability_mathematical: true;
    gate_non_bypassable: true;
    history_append_only: true;
    no_config: true;
    no_flag: true;
    no_override: true;
    no_reset: true;
  };
}

// =============================================================================
// NECESSITY ENGINE (NE) TYPES
// =============================================================================
// "Inevitability forbids death. Necessity forbids choice."
// =============================================================================

/**
 * MCCS Candidate - A potential intervention from OCIC
 *
 * Represents one possible future that could prevent collapse.
 */
export interface MCCSCandidate {
  // Unique candidate ID
  candidate_id: string;

  // Original MCCS ID from OCIC
  mccs_id: string;

  // Interventions in this MCCS
  interventions: CausalIntervention[];
  intervention_count: number;

  // Projected outcome from OCIC
  projected_outcome: {
    global_rsr_before: number;
    global_rsr_after: number;
    rsr_gain: number;
    shapes_restored: string[];
  };

  // Timestamp when enumerated
  enumerated_at: string;
}

/**
 * Survivability Result - IE forward expansion result for an MCCS
 *
 * Determines if an MCCS leads to survival or collapse.
 */
export interface SurvivabilityResult {
  // Which candidate was evaluated
  candidate_id: string;
  mccs_id: string;

  // Is this MCCS survivable?
  survivable: boolean;

  // Why survivable or not
  rejection_reason: string | null;

  // Forward expansion results
  paths_evaluated: number;
  paths_to_collapse: number;
  paths_surviving: number;

  // Entropy metrics (for ranking)
  entropy_ceiling: number;       // Highest entropy reached on any path
  entropy_floor: number;         // Lowest entropy reached
  stabilization_step: number;    // Step at which entropy stabilized

  // Terminal state of best path (if survivable)
  best_path: {
    path_id: string;
    terminal_phase: ArchitecturalPhase;
    terminal_entropy: number;
    steps_to_stable: number;
  } | null;

  // Evaluation timestamp
  evaluated_at: string;
}

/**
 * Necessary Future - The SINGLE minimal survivable future
 *
 * Once declared, this is the ONLY allowed path forward.
 * All other action signatures are forbidden.
 */
export interface NecessaryFuture {
  // Unique future ID
  future_id: string;

  // The doomed fingerprint this future rescues
  doomed_fingerprint: string;

  // The chosen MCCS that defines this future
  chosen_mccs: MCCSCandidate;

  // The action signature that implements this future
  allowed_signature: ActionSignature;

  // Why this future was chosen
  selection_reason: {
    total_candidates: number;
    survivable_candidates: number;
    chosen_by: 'MINIMAL_CARDINALITY' | 'LOWEST_ENTROPY_CEILING' | 'FASTEST_STABILIZATION';
    cardinality: number;
    entropy_ceiling: number;
    stabilization_step: number;
  };

  // Forbidden alternatives (why others were rejected)
  forbidden_alternatives: {
    candidate_id: string;
    mccs_id: string;
    rejection_reason: string;
  }[];

  // Survivability proof
  survivability_proof: SurvivabilityResult;

  // Declaration timestamp
  declared_at: string;

  // Immutability markers
  immutable: true;
  append_only: true;
}

/**
 * Necessity Record - History record for append-only database
 */
export interface NecessityRecord {
  // Unique record ID
  record_id: string;

  // Run ID
  run_id: string;

  // Timestamp
  timestamp: string;

  // The doomed fingerprint
  doomed_fingerprint: string;

  // All candidates enumerated
  candidates_enumerated: number;

  // All survivability results
  survivability_results: SurvivabilityResult[];

  // The declared necessary future (if any)
  necessary_future: NecessaryFuture | null;

  // If no survivable future exists
  no_survivable_future: boolean;
  extinction_reason: string | null;

  // Enforcement action
  enforcement_action: 'CONSTRAIN_TO_NECESSITY' | 'EXTINCTION_DETECTED' | 'NO_DOOM_DETECTED';

  // Immutability markers
  immutable: true;
  append_only: true;
}

/**
 * Necessity Database - Append-only history
 */
export interface NecessityDatabase {
  // Database version
  version: string;

  // Creation timestamp
  created_at: string;

  // Last record timestamp
  last_record_at: string;

  // All records (append-only)
  records: NecessityRecord[];

  // Active necessary futures (fingerprint -> future)
  active_futures: Record<string, NecessaryFuture>;

  // Statistics
  stats: {
    total_analyses: number;
    futures_declared: number;
    extinctions_detected: number;
    candidates_evaluated: number;
    average_survivable_candidates: number;
  };
}

/**
 * Necessity Gate Result - Enforcement decision
 */
export interface NecessityGateResult {
  // Gate ID
  gate_id: string;

  // Run ID
  run_id: string;

  // Timestamp
  timestamp: string;

  // Current action signature
  current_signature: ActionSignature;

  // Is there an active necessary future for this fingerprint?
  has_active_future: boolean;

  // The active future (if any)
  active_future: NecessaryFuture | null;

  // Does current signature match the necessary future?
  matches_necessity: boolean;

  // Action taken
  action: 'ALLOW_NECESSITY' | 'HARD_ABORT_NON_NECESSITY' | 'HARD_ABORT_EXTINCTION' | 'NO_CONSTRAINT';

  // Reason
  reason: string;

  // Gate proof
  gate_proof: {
    necessity_deterministic: true;
    single_future_enforced: true;
    alternatives_forbidden: true;
    no_config: true;
    no_flag: true;
    no_override: true;
  };
}

/**
 * NE Intelligence - Complete NE state for a run
 */
export interface NEIntelligence {
  ne_version: string;

  // Current action signature
  action_signature: ActionSignature;

  // Was this fingerprint doomed?
  fingerprint_doomed: boolean;
  doomed_fingerprint: string | null;

  // MCCS enumeration
  candidates_enumerated: MCCSCandidate[];

  // Survivability evaluation
  survivability_results: SurvivabilityResult[];

  // Necessity declaration
  necessary_future: NecessaryFuture | null;

  // Gate result
  gate_result: NecessityGateResult;

  // Summary
  summary: {
    doom_detected: boolean;
    candidates_found: number;
    survivable_candidates: number;
    necessity_declared: boolean;
    action_matches_necessity: boolean;
    action_taken: string;
    extinction_imminent: boolean;
  };

  // Why this future is necessary (human-readable)
  necessity_explanation: string[];

  // Why all others are forbidden (human-readable)
  forbidden_explanation: string[];

  // Full causal + entropy proof chain
  proof_chain: {
    mccs_enumeration_complete: true;
    all_candidates_evaluated: true;
    survivability_deterministic: true;
    selection_minimal: true;
    necessity_singular: true;
    enforcement_non_bypassable: true;
    history_append_only: true;
    no_config: true;
    no_flag: true;
    no_override: true;
    no_reset: true;
  };
}

// ============================================================================
// ICE (Intent Collapse Engine) Types
// ============================================================================

/**
 * Intent Class - Classification of an intent's causal relationship to NecessaryFuture
 *
 * ALIGNED: Intent lies on causal cone of NecessaryFuture (allowed)
 * NON_CAUSAL: Intent has no causal path to NecessaryFuture (rejected)
 * CONTRADICTORY: Intent causally opposes NecessaryFuture (rejected)
 * REDUNDANT: Intent is subsumed by another allowed intent (rejected)
 */
export type IntentClass = 'ALIGNED' | 'NON_CAUSAL' | 'CONTRADICTORY' | 'REDUNDANT';

/**
 * Intent Signature - Structural representation of an intent
 *
 * An intent is what a user/agent WANTS to do.
 * It is classified against the IntentAllowlist derived from NecessaryFuture.
 */
export interface IntentSignature {
  // Unique intent ID
  intent_id: string;

  // Structural fingerprint (hash of intent components)
  fingerprint: string;

  // Intent components
  components: {
    // Target shapes this intent affects
    target_shapes: string[];

    // Target handoffs this intent affects
    target_handoffs: string[];

    // Intended operations (what the intent wants to do)
    intended_operations: ('CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'TRANSFORM')[];

    // Expected outcome type
    expected_outcome: 'RESTORE' | 'MODIFY' | 'PRESERVE' | 'DESTROY';
  };

  // Source of this intent
  source: {
    agent_id: string;
    run_id: string;
    timestamp: string;
  };
}

/**
 * Causal Cone - The set of ActionSignatures that lie on the causal path to NecessaryFuture
 *
 * Derived via reverse causal analysis from NecessaryFuture.
 */
export interface CausalCone {
  // Unique cone ID
  cone_id: string;

  // The NecessaryFuture this cone derives from
  source_future_id: string;
  source_future_fingerprint: string;

  // Allowed action signatures (on the causal cone)
  allowed_signatures: ActionSignature[];

  // Allowed intent fingerprints (derived from signatures)
  allowed_intent_fingerprints: string[];

  // Causal derivation proof
  derivation: {
    // The MCCS that defines the future
    mccs_id: string;

    // Interventions that must occur
    required_interventions: CausalIntervention[];

    // Shapes that must be preserved
    preserved_shapes: string[];

    // Handoffs that must remain intact
    preserved_handoffs: string[];

    // Operations that are causally required
    required_operations: string[];
  };

  // Cone bounds (what is definitely outside)
  exclusions: {
    // Shapes that CANNOT be modified (would break future)
    forbidden_shape_modifications: string[];

    // Handoffs that CANNOT be broken
    forbidden_handoff_breaks: string[];

    // Operations that CANNOT occur
    forbidden_operations: string[];
  };

  // Derivation timestamp
  derived_at: string;

  // Immutability markers
  immutable: true;
  append_only: true;
}

/**
 * Intent Allowlist - The set of intents that can lead to NecessaryFuture
 */
export interface IntentAllowlist {
  // Unique allowlist ID
  allowlist_id: string;

  // Source causal cone
  source_cone_id: string;

  // Source future
  source_future_id: string;

  // Allowed intent fingerprints
  allowed_fingerprints: Set<string> | string[];

  // Allowed intent patterns (for efficient matching)
  allowed_patterns: {
    // Shapes that intents CAN target
    targetable_shapes: string[];

    // Handoffs that intents CAN affect
    targetable_handoffs: string[];

    // Operations that are allowed
    allowed_operations: ('CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'TRANSFORM')[];

    // Outcomes that are allowed
    allowed_outcomes: ('RESTORE' | 'MODIFY' | 'PRESERVE')[];
  };

  // Creation timestamp
  created_at: string;
}

/**
 * Intent Classification Result
 */
export interface IntentClassification {
  // The intent being classified
  intent: IntentSignature;

  // Classification result
  classification: IntentClass;

  // Is the intent allowed?
  allowed: boolean;

  // Causal analysis
  causal_analysis: {
    // Does intent lie on causal cone?
    on_causal_cone: boolean;

    // Does intent contradict the future?
    contradicts_future: boolean;

    // Is intent redundant?
    is_redundant: boolean;

    // What causal requirement does it violate (if any)?
    violated_requirement: string | null;
  };

  // Matching details
  match_details: {
    // Matched against which cone?
    cone_id: string | null;

    // Matched against which future?
    future_id: string | null;

    // Which patterns matched/failed?
    pattern_matches: {
      shapes_match: boolean;
      handoffs_match: boolean;
      operations_match: boolean;
      outcomes_match: boolean;
    };
  };

  // Classification timestamp
  classified_at: string;
}

/**
 * Intent Gate Result - Enforcement decision for an intent
 */
export interface IntentGateResult {
  // Gate ID
  gate_id: string;

  // Run ID
  run_id: string;

  // Timestamp
  timestamp: string;

  // The intent being gated
  intent: IntentSignature;

  // Classification
  classification: IntentClassification;

  // Action taken
  action: 'ALLOW_INTENT' | 'REJECT_INTENT';

  // Rejection reason (if rejected)
  rejection_reason: string | null;

  // Causal proof of rejection (if rejected)
  causal_proof: {
    // The NecessaryFuture that defines validity
    future_id: string;
    future_fingerprint: string;

    // The causal cone
    cone_id: string;

    // Why intent is invalid
    invalidity_type: IntentClass | null;

    // Which causal requirement was violated
    violated_requirement: string | null;

    // Proof chain
    proof_chain: string[];
  } | null;

  // Gate proof
  gate_proof: {
    classification_deterministic: true;
    causal_derivation_complete: true;
    no_heuristics: true;
    no_ml: true;
    no_probability: true;
    no_config: true;
    no_flag: true;
    no_override: true;
  };
}

/**
 * Intent Cone Record - History record for append-only database
 */
export interface IntentConeRecord {
  // Unique record ID
  record_id: string;

  // Run ID
  run_id: string;

  // Timestamp
  timestamp: string;

  // The NecessaryFuture that triggered cone derivation
  source_future_id: string;

  // The derived causal cone
  causal_cone: CausalCone;

  // The derived intent allowlist
  intent_allowlist: IntentAllowlist;

  // Intents processed in this run
  intents_processed: number;
  intents_allowed: number;
  intents_rejected: number;

  // Rejection breakdown
  rejections_by_class: {
    non_causal: number;
    contradictory: number;
    redundant: number;
  };

  // Immutability markers
  immutable: true;
  append_only: true;
}

/**
 * Intent Cone Database - Append-only history
 */
export interface IntentConeDatabase {
  // Database version
  version: string;

  // Creation timestamp
  created_at: string;

  // Last record timestamp
  last_record_at: string;

  // All records (append-only)
  records: IntentConeRecord[];

  // Active cones (future_id -> cone)
  active_cones: Record<string, CausalCone>;

  // Active allowlists (future_id -> allowlist)
  active_allowlists: Record<string, IntentAllowlist>;

  // Statistics
  stats: {
    total_cones_derived: number;
    total_intents_processed: number;
    total_intents_allowed: number;
    total_intents_rejected: number;
    rejection_rate: number;
  };
}

/**
 * ICE Intelligence - Complete ICE state for a run
 */
export interface ICEIntelligence {
  ice_version: string;

  // Source NE intelligence
  ne_intelligence: NEIntelligence;

  // Is there an active NecessaryFuture?
  has_active_future: boolean;
  active_future_id: string | null;

  // Derived causal cone
  causal_cone: CausalCone | null;

  // Derived intent allowlist
  intent_allowlist: IntentAllowlist | null;

  // Intents processed
  intents_processed: IntentSignature[];

  // Classification results
  classifications: IntentClassification[];

  // Gate results
  gate_results: IntentGateResult[];

  // Summary
  summary: {
    necessity_active: boolean;
    cone_derived: boolean;
    allowlist_generated: boolean;
    intents_processed: number;
    intents_allowed: number;
    intents_rejected: number;
    rejection_rate: number;
  };

  // Why intents were rejected (human-readable)
  rejection_explanations: string[];

  // Full proof chain
  proof_chain: {
    necessity_to_cone_derivation: true;
    cone_to_allowlist_generation: true;
    classification_deterministic: true;
    rejection_causally_proven: true;
    no_heuristics: true;
    no_ml: true;
    no_probability: true;
    no_config: true;
    no_flag: true;
    no_override: true;
    no_reset: true;
    history_append_only: true;
  };
}

// ============================================================================
// CIN (Canonical Intent Normalization) Types
// ============================================================================

/**
 * Minimal Structural Intent (MSI)
 *
 * The reduced, MCCS-backed structure of an intent.
 * Stripped of narrative, abstraction, and redundancy.
 */
export interface MinimalStructuralIntent {
  // Unique MSI ID
  msi_id: string;

  // Source intent this was reduced from
  source_intent_id: string;
  source_intent_fingerprint: string;

  // Minimal components (MCCS-backed only)
  minimal_components: {
    // Essential target shapes (from MCCS interventions)
    essential_shapes: string[];

    // Essential target handoffs (from MCCS)
    essential_handoffs: string[];

    // Essential operations (minimal set required)
    essential_operations: ('CREATE' | 'READ' | 'UPDATE' | 'TRANSFORM')[];

    // Essential outcome (singular, not composite)
    essential_outcome: 'RESTORE' | 'MODIFY' | 'PRESERVE';
  };

  // What was stripped
  reduction_report: {
    // Shapes removed (not MCCS-backed)
    shapes_stripped: string[];

    // Handoffs removed (not required)
    handoffs_stripped: string[];

    // Operations removed (redundant or not essential)
    operations_stripped: string[];

    // Narrative/abstraction removed
    narrative_stripped: boolean;
  };

  // MCCS backing proof
  mccs_backing: {
    mccs_id: string;
    intervention_ids: string[];
    fully_backed: boolean;
  };

  // Reduction timestamp
  reduced_at: string;
}

/**
 * Canonical Intent
 *
 * The UNIQUE canonical representation of an intent for a given causal path.
 * There is exactly one CanonicalIntent per causal path.
 */
export interface CanonicalIntent {
  // Unique canonical ID
  canonical_id: string;

  // Canonical fingerprint (deterministic hash)
  canonical_fingerprint: string;

  // Source MSI
  source_msi_id: string;

  // Causal path this canonical form represents
  causal_path: {
    future_id: string;
    mccs_id: string;
    cone_id: string;
  };

  // Canonical components (normalized, ordered, unique)
  canonical_components: {
    // Normalized shape set (sorted, deduplicated)
    shapes: string[];

    // Normalized handoff set (sorted, deduplicated)
    handoffs: string[];

    // Normalized operation sequence (ordered by causal dependency)
    operations: ('CREATE' | 'READ' | 'UPDATE' | 'TRANSFORM')[];

    // Canonical outcome
    outcome: 'RESTORE' | 'MODIFY' | 'PRESERVE';
  };

  // Structural equivalence class
  equivalence_class: {
    // All intent fingerprints that reduce to this canonical form
    equivalent_fingerprints: string[];

    // Count of equivalent intents
    equivalence_count: number;
  };

  // Canonicalization timestamp
  canonicalized_at: string;

  // Immutability markers
  immutable: true;
  append_only: true;
}

/**
 * Rewrite Proof
 *
 * Proof that an intent was rewritten to its canonical form.
 */
export interface RewriteProof {
  // Unique rewrite ID
  rewrite_id: string;

  // Original intent
  original_intent: IntentSignature;
  original_fingerprint: string;

  // Canonical intent
  canonical_intent: CanonicalIntent;
  canonical_fingerprint: string;

  // Structural equivalence proof
  equivalence_proof: {
    // Both intents target same essential shapes
    same_essential_shapes: boolean;

    // Both intents affect same essential handoffs
    same_essential_handoffs: boolean;

    // Both intents have same essential operations
    same_essential_operations: boolean;

    // Both intents have same essential outcome
    same_essential_outcome: boolean;

    // Overall equivalence
    structurally_equivalent: boolean;
  };

  // Why rewrite was necessary
  rewrite_reason: string;

  // What changed
  changes: {
    shapes_added: string[];
    shapes_removed: string[];
    handoffs_added: string[];
    handoffs_removed: string[];
    operations_added: string[];
    operations_removed: string[];
    outcome_changed: boolean;
  };

  // Rewrite timestamp
  rewritten_at: string;
}

/**
 * Rewrite Result
 *
 * Result of the rewrite enforcement.
 */
export interface RewriteResult {
  // Rewrite ID
  rewrite_id: string;

  // Run ID
  run_id: string;

  // Timestamp
  timestamp: string;

  // Original intent
  original_intent: IntentSignature;

  // Action taken
  action: 'PASSTHROUGH' | 'REWRITE_INTENT';

  // Was rewrite necessary?
  rewrite_necessary: boolean;

  // Canonical intent (always present)
  canonical_intent: CanonicalIntent;

  // Rewrite proof (if rewritten)
  rewrite_proof: RewriteProof | null;

  // Output intent (canonical form)
  output_intent: IntentSignature;

  // Enforcement proof
  enforcement_proof: {
    reduction_deterministic: true;
    canonicalization_unique: true;
    rewrite_reversible: false; // Rewrites are NOT reversible
    no_information_loss: boolean;
    no_heuristics: true;
    no_ml: true;
    no_config: true;
    no_override: true;
  };
}

/**
 * CIN Record - History record for append-only database
 */
export interface CINRecord {
  // Unique record ID
  record_id: string;

  // Run ID
  run_id: string;

  // Timestamp
  timestamp: string;

  // Source future
  source_future_id: string;

  // MSIs produced
  msis_produced: number;

  // Canonical intents produced
  canonicals_produced: number;

  // Rewrites performed
  rewrites_performed: number;
  passthroughs: number;

  // All MSIs in this run
  msis: MinimalStructuralIntent[];

  // All canonical intents in this run
  canonical_intents: CanonicalIntent[];

  // All rewrite results in this run
  rewrite_results: RewriteResult[];

  // Immutability markers
  immutable: true;
  append_only: true;
}

/**
 * CIN Database - Append-only history
 */
export interface CINDatabase {
  // Database version
  version: string;

  // Creation timestamp
  created_at: string;

  // Last record timestamp
  last_record_at: string;

  // All records (append-only)
  records: CINRecord[];

  // Active canonical intents (canonical_fingerprint -> CanonicalIntent)
  active_canonicals: Record<string, CanonicalIntent>;

  // Equivalence index (original_fingerprint -> canonical_fingerprint)
  equivalence_index: Record<string, string>;

  // Statistics
  stats: {
    total_intents_normalized: number;
    total_rewrites: number;
    total_passthroughs: number;
    rewrite_rate: number;
    unique_canonicals: number;
    average_equivalence_class_size: number;
  };
}

/**
 * CIN Intelligence - Complete CIN state for a run
 */
export interface CINIntelligence {
  cin_version: string;

  // Source ICE intelligence
  ice_intelligence: ICEIntelligence;

  // Is there an active NecessaryFuture?
  has_active_future: boolean;
  active_future_id: string | null;

  // MSIs produced
  msis: MinimalStructuralIntent[];

  // Canonical intents produced
  canonical_intents: CanonicalIntent[];

  // Rewrite results
  rewrite_results: RewriteResult[];

  // Summary
  summary: {
    necessity_active: boolean;
    intents_normalized: number;
    msis_produced: number;
    canonicals_produced: number;
    rewrites_performed: number;
    passthroughs: number;
    rewrite_rate: number;
  };

  // Normalization explanations (human-readable)
  normalization_explanations: string[];

  // Full proof chain
  proof_chain: {
    msi_reduction_complete: true;
    canonicalization_unique: true;
    rewrite_enforcement_applied: true;
    structural_equivalence_proven: true;
    no_heuristics: true;
    no_ml: true;
    no_probability: true;
    no_config: true;
    no_flag: true;
    no_override: true;
    no_reset: true;
    history_append_only: true;
  };
}

// ============================================================================
// TSL (Temporal Sovereignty Layer) Types
// ============================================================================
// "If a system cannot survive its future, it must not be created in the present."
// ============================================================================

/**
 * Temporal Contract - Declaration of temporal constraints
 *
 * Every execution MUST declare a temporal contract.
 * Missing contract = HARD_ABORT
 */
export interface TemporalContract {
  // Unique contract ID
  contract_id: string;

  // Project this contract applies to
  project_id: string;

  // Intended lifespan of the execution (in temporal steps)
  intended_lifespan: number;

  // Maximum allowed future mutations
  allowed_future_mutations: number;

  // Maximum allowed entropy drift from baseline
  max_entropy_drift: number;

  // Baseline entropy at contract creation
  baseline_entropy: number;

  // Contract creation timestamp
  created_at: string;

  // Contract is immutable once declared
  immutable: true;
}

/**
 * Temporal Contract Validation Result
 */
export interface TemporalContractValidation {
  // Is the contract valid?
  valid: boolean;

  // Contract being validated
  contract: TemporalContract | null;

  // Validation errors
  errors: string[];

  // Why invalid (if any)
  rejection_reason: string | null;
}

/**
 * Temporal Step - A single step in forward simulation
 */
export interface TemporalStep {
  // Step number (0 = present, 1+ = future)
  step: number;

  // Timestamp of simulation
  simulated_at: string;

  // Entropy at this step
  entropy: number;

  // Phase at this step
  phase: ArchitecturalPhase;

  // Mutations accumulated
  mutations_accumulated: number;

  // Is this step survivable?
  survivable: boolean;

  // Violation detected
  violation: TemporalViolation | null;
}

/**
 * Temporal Violation - A constraint violation in the temporal domain
 */
export interface TemporalViolation {
  // Violation type
  type: 'ENTROPY_DRIFT_EXCEEDED' | 'MUTATION_LIMIT_EXCEEDED' | 'LIFESPAN_EXCEEDED' | 'PHASE_COLLAPSE';

  // Step at which violation occurs
  step: number;

  // Current value
  current_value: number;

  // Allowed limit
  allowed_limit: number;

  // Description
  description: string;

  // Is this violation fatal?
  fatal: boolean;
}

/**
 * Forward Simulation Result
 */
export interface ForwardSimulationResult {
  // Simulation ID
  simulation_id: string;

  // Run ID
  run_id: string;

  // Project ID
  project_id: string;

  // Contract used
  contract: TemporalContract;

  // Number of steps simulated
  steps_simulated: number;

  // All temporal steps
  steps: TemporalStep[];

  // First violation (if any)
  first_violation: TemporalViolation | null;

  // Step at which first violation occurs
  violation_step: number | null;

  // Does the future survive?
  future_survives: boolean;

  // Simulation timestamp
  simulated_at: string;

  // Proof that simulation is deterministic
  simulation_proof: {
    deterministic: true;
    all_steps_computed: true;
    ie_invoked_per_step: true;
    aec_invoked_per_step: true;
    rll_invoked_per_step: true;
    no_inference: true;
    no_heuristics: true;
  };
}

/**
 * Temporal Singularity - Extension of Decision Singularity into time
 */
export interface TemporalSingularity {
  // Singularity ID
  singularity_id: string;

  // Source decision singularity ID (from RLL)
  source_decision_id: string;

  // Project ID
  project_id: string;

  // The action locked by this singularity
  locked_action: ActionSignature;

  // Temporal cone - range of steps this singularity affects
  temporal_cone: {
    start_step: number;
    end_step: number;
    entropy_at_start: number;
    entropy_at_end: number;
  };

  // Actions that MUST happen before this
  must_precede: string[];

  // Actions that MUST happen after this
  must_follow: string[];

  // Is this singularity still active?
  active: boolean;

  // When was this singularity created?
  created_at: string;

  // Immutability marker
  immutable: true;
}

/**
 * Temporal Ordering Constraint
 */
export interface TemporalOrderingConstraint {
  // Constraint ID
  constraint_id: string;

  // First action (must come before)
  before_action_id: string;

  // Second action (must come after)
  after_action_id: string;

  // Why this ordering is required
  reason: string;

  // Is this constraint violated?
  violated: boolean;

  // If violated, description of violation
  violation_description: string | null;
}

/**
 * Temporal Singularity Expansion Result
 */
export interface TemporalSingularityExpansion {
  // Expansion ID
  expansion_id: string;

  // Run ID
  run_id: string;

  // All temporal singularities
  singularities: TemporalSingularity[];

  // Ordering constraints derived
  ordering_constraints: TemporalOrderingConstraint[];

  // Any constraint violations?
  has_violations: boolean;

  // Violated constraints
  violated_constraints: TemporalOrderingConstraint[];

  // Expansion timestamp
  expanded_at: string;
}

/**
 * Entropy Budget - Finite entropy allocation per project
 */
export interface EntropyBudget {
  // Budget ID
  budget_id: string;

  // Project ID
  project_id: string;

  // Initial entropy budget allocated
  initial_budget: number;

  // Current remaining budget
  remaining_budget: number;

  // Total entropy consumed
  consumed: number;

  // Is budget exhausted?
  exhausted: boolean;

  // Budget creation timestamp
  created_at: string;

  // Last update timestamp
  last_updated_at: string;

  // Consumption history (append-only)
  history: EntropyConsumption[];
}

/**
 * Entropy Consumption Record
 */
export interface EntropyConsumption {
  // Consumption ID
  consumption_id: string;

  // Run ID that caused consumption
  run_id: string;

  // Amount consumed
  amount: number;

  // Remaining after consumption
  remaining_after: number;

  // Timestamp
  consumed_at: string;

  // Description
  description: string;
}

/**
 * Entropy Budget Database - Append-only persistence
 */
export interface EntropyBudgetDatabase {
  // Database version
  version: string;

  // Creation timestamp
  created_at: string;

  // Last update timestamp
  last_updated_at: string;

  // All budgets by project ID
  budgets: Record<string, EntropyBudget>;

  // Global statistics
  stats: {
    total_projects: number;
    total_entropy_allocated: number;
    total_entropy_consumed: number;
    exhausted_projects: number;
  };
}

/**
 * Temporal Gate Action
 */
export type TemporalGateAction = 'ALLOW_PRESENT' | 'BLOCK_PRESENT' | 'PERMANENT_READ_ONLY';

/**
 * Temporal Gate Result
 */
export interface TemporalGateResult {
  // Gate ID
  gate_id: string;

  // Run ID
  run_id: string;

  // Project ID
  project_id: string;

  // Timestamp
  timestamp: string;

  // Contract validation result
  contract_validation: TemporalContractValidation;

  // Forward simulation result
  simulation_result: ForwardSimulationResult | null;

  // Singularity expansion result
  singularity_expansion: TemporalSingularityExpansion | null;

  // Entropy budget status
  budget_status: {
    budget_id: string;
    remaining: number;
    exhausted: boolean;
  };

  // Gate action
  action: TemporalGateAction;

  // Reason for action
  reason: string;

  // Proof chain
  gate_proof: {
    contract_validated: boolean;
    simulation_complete: boolean;
    singularities_expanded: boolean;
    budget_checked: boolean;
    deterministic: true;
    no_inference: true;
    no_heuristics: true;
    no_config: true;
    no_flag: true;
    no_override: true;
  };
}

/**
 * TSL Record - History record for append-only database
 */
export interface TSLRecord {
  // Unique record ID
  record_id: string;

  // Run ID
  run_id: string;

  // Project ID
  project_id: string;

  // Timestamp
  timestamp: string;

  // Contract used
  contract: TemporalContract;

  // Simulation result
  simulation_result: ForwardSimulationResult | null;

  // Singularity expansion
  singularity_expansion: TemporalSingularityExpansion | null;

  // Gate result
  gate_result: TemporalGateResult;

  // Entropy consumed this run
  entropy_consumed: number;

  // Final budget status
  final_budget_status: {
    remaining: number;
    exhausted: boolean;
  };

  // Immutability markers
  immutable: true;
  append_only: true;
}

/**
 * TSL Database - Append-only history
 */
export interface TSLDatabase {
  // Database version
  version: string;

  // Creation timestamp
  created_at: string;

  // Last record timestamp
  last_record_at: string;

  // All records (append-only)
  records: TSLRecord[];

  // Active contracts by project
  active_contracts: Record<string, TemporalContract>;

  // Statistics
  stats: {
    total_runs: number;
    total_allowed: number;
    total_blocked: number;
    total_read_only: number;
    block_rate: number;
  };
}

/**
 * TSL Intelligence - Complete TSL state for a run
 */
export interface TSLIntelligence {
  tsl_version: string;

  // Source CIN intelligence
  cin_intelligence: CINIntelligence;

  // Project ID
  project_id: string;

  // Contract validation
  contract_validation: TemporalContractValidation;

  // Forward simulation
  simulation_result: ForwardSimulationResult | null;

  // Singularity expansion
  singularity_expansion: TemporalSingularityExpansion | null;

  // Entropy budget
  budget_status: {
    budget_id: string;
    initial: number;
    remaining: number;
    consumed_this_run: number;
    exhausted: boolean;
  };

  // Gate result
  gate_result: TemporalGateResult;

  // Summary
  summary: {
    contract_valid: boolean;
    future_survives: boolean;
    singularities_valid: boolean;
    budget_available: boolean;
    action_taken: TemporalGateAction;
    present_allowed: boolean;
  };

  // Temporal explanations
  temporal_explanations: string[];

  // Full proof chain
  proof_chain: {
    contract_validation_complete: true;
    forward_simulation_deterministic: true;
    singularity_expansion_complete: true;
    entropy_budget_tracked: true;
    gate_non_bypassable: true;
    no_inference: true;
    no_heuristics: true;
    no_ml: true;
    no_probability: true;
    no_config: true;
    no_flag: true;
    no_override: true;
    no_reset: true;
    history_append_only: true;
  };
}

// ============================================
// TSL IMPLEMENTATION TYPES (v2)
// These are the actual types used by the TSL implementation
// ============================================

/**
 * Temporal Step (v2) - Used by TSL implementation
 */
export interface TemporalStepV2 {
  step_number: number;
  projected_entropy: number;
  projected_mutations: number;
  intent_strength: number;
  violations: string[];
  viable: boolean;
}

/**
 * Singularity Cone - Temporal propagation of a decision
 */
export interface SingularityCone {
  depth: number;
  nodes_count: number;
  total_entropy_injection: number;
  total_mutations_triggered: number;
  avg_intent_impact: number;
  breach_steps: number[];
}

/**
 * Temporal Propagation characteristics
 */
export interface TemporalPropagation {
  pattern: 'LINEAR' | 'EXPONENTIAL' | 'DAMPENED' | 'OSCILLATING';
  velocity: number;
  damping: number;
  half_life: number;
  terminal_step: number;
}

/**
 * Temporal Simulation Configuration
 */
export interface TemporalSimulationConfig {
  depth: number;
  entropyGrowthRate: number;
  mutationRate: number;
  intentDecayRate: number;
}

/**
 * Entropy Transaction Record
 */
export interface EntropyTransaction {
  transaction_id: string;
  project_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  timestamp: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

/**
 * Entropy Budget Status
 */
export interface EntropyBudgetStatus {
  project_id: string;
  initial_budget: number;
  current_budget: number;
  total_consumed: number;
  budget_ratio: number;
  state: string;
  is_read_only: boolean;
  transaction_count: number;
  created_at: string;
  last_transaction_at: string;
  exhausted_at: string | null;
  read_only_at: string | null;
}

/**
 * Temporal Violation - A violation detected during simulation
 */
export interface TemporalViolationV2 {
  type: string;
  step: number;
  description: string;
  severity: 'WARNING' | 'CRITICAL' | 'FATAL';
  remediation: string;
}

/**
 * Forward Simulation Result (v2) - Used by TSL implementation
 */
export interface ForwardSimulationResultV2 {
  simulation_id: string;
  contract_id: string;
  depth_simulated: number;
  steps: TemporalStepV2[];
  violations: TemporalViolationV2[];
  survives_future: boolean;
  first_violation_step: number | null;
  projected_survivability: number;
  simulation_duration_ms: number;
  recommendation: 'ALLOW_PRESENT' | 'BLOCK_PRESENT' | 'REVIEW_REQUIRED';
}

/**
 * Temporal Singularity (v2) - Used by TSL implementation
 */
export interface TemporalSingularityV2 {
  singularity_id: string;
  project_id: string;
  contract_id: string;
  decision_id: string;
  created_at: string;
  origin_step: number;
  cone: SingularityCone;
  propagation: TemporalPropagation;
  effects: string[];
  magnitude: number;
  temporal_reach: number;
  contained: boolean;
}

/**
 * Entropy Budget (v2) - Used by TSL implementation
 */
export interface EntropyBudgetV2 {
  project_id: string;
  initial_budget: number;
  current_budget: number;
  total_consumed: number;
  state: string;
  transactions: EntropyTransaction[];
  created_at: string;
  exhausted_at: string | null;
  read_only_at: string | null;
}

/**
 * Temporal Gate Result (v2) - Used by TSL implementation
 */
export interface TemporalGateResultV2 {
  gate_id: string;
  project_id: string;
  action: TemporalGateAction;
  passed: boolean;
  block_reason: string | null;
  contract_id: string | null;
  timestamp: string;
  checks_performed: number;
  checks_passed: number;
}

/**
 * TSL Intelligence (v2) - Used by TSL implementation
 */
export interface TSLIntelligenceV2 {
  project_id: string;
  timestamp: string;
  contract: {
    id: string;
    lifespan: number;
    mutation_limit: number;
    entropy_drift_limit: number;
  };
  budget: {
    initial: number;
    current: number;
    consumed: number;
    ratio: number;
    state: string;
    is_read_only: boolean;
  } | null;
  singularities: {
    count: number;
    contained: number;
    total_entropy_injection: number;
    earliest_breach: number | null;
  };
  consumption_rate: {
    avg_per_transaction: number;
    rate_per_hour: number;
  } | null;
  future_projection: {
    survives: boolean;
    survivability: number;
    first_violation_step: number | null;
    violation_count: number;
  } | null;
  gate_stats: {
    total_checks: number;
    allow_rate: number;
    block_rate: number;
  };
}

// ============================================
// OCPM TYPES (Olympus Core Proof Model)
// The canonical proof spine of OLYMPUS
// ============================================

/**
 * Final decision type
 */
export type OCPMDecision = 'ALLOW' | 'BLOCK' | 'READ_ONLY' | 'PERMANENT_READ_ONLY';

/**
 * Invariant categories that can be violated
 */
export type InvariantCategory =
  | 'TEMPORAL_CONTRACT_MISSING'
  | 'TEMPORAL_CONTRACT_INVALID'
  | 'ENTROPY_BUDGET_EXHAUSTED'
  | 'ENTROPY_DRIFT_EXCEEDED'
  | 'MUTATION_LIMIT_EXCEEDED'
  | 'LIFESPAN_EXCEEDED'
  | 'FUTURE_INEVITABILITY_VIOLATION'
  | 'REALITY_LOCK_VIOLATED'
  | 'INTENT_COLLAPSE_FAILED'
  | 'CANONICAL_FORM_INVALID'
  | 'NECESSITY_NOT_ESTABLISHED'
  | 'ARCHITECTURAL_PHASE_VIOLATION'
  | 'SINGULARITY_BREACH'
  | 'NONE';

/**
 * A single causal link in the chain
 */
export interface CausalLink {
  step: number;
  source_layer: 'IE' | 'NE' | 'ICE' | 'CIN' | 'TSL' | 'AEC' | 'RLL' | 'ORIS' | 'OFEL' | 'OCIC';
  event: string;
  effect: string;
  deterministic: true;
}

/**
 * Entropy state snapshot
 */
export interface EntropyStateSnapshot {
  current_entropy: number;
  baseline_entropy: number;
  drift: number;
  drift_limit: number;
  budget_initial: number;
  budget_remaining: number;
  budget_consumed: number;
  budget_ratio: number;
  is_exhausted: boolean;
}

/**
 * Temporal contract summary
 */
export interface TemporalContractSummary {
  contract_id: string | null;
  project_id: string;
  intended_lifespan: number;
  current_step: number;
  allowed_mutations: number;
  mutation_count: number;
  max_entropy_drift: number;
  current_drift: number;
  valid: boolean;
  violation_reason: string | null;
}

/**
 * Action fingerprint - uniquely identifies the attempted action
 */
export interface ActionFingerprintSummary {
  action_id: string;
  action_type: string;
  description: string;
  timestamp: string;
  hash: string;
}

/**
 * The canonical proof artifact
 * This is THE single proof object per execution
 */
export interface OlympusDecisionProof {
  // Identification
  run_id: string;
  proof_version: string;

  // Action attempted
  attempted_action_fingerprint: ActionFingerprintSummary;

  // Final decision - exactly one of these
  final_decision: OCPMDecision;

  // Primary invariant violated - EXACTLY ONE (or NONE if ALLOW)
  primary_invariant_violated: InvariantCategory;
  primary_violation_description: string | null;

  // Causal chain - ordered, minimal
  causal_chain: CausalLink[];

  // Forbidden alternatives - hashed for minimal storage
  forbidden_alternatives: string[];

  // Necessary future - if applicable
  necessary_future: {
    exists: boolean;
    survivable_steps: number;
    first_violation_step: number | null;
    projected_survivability: number;
  } | null;

  // Entropy state at decision time
  entropy_state: EntropyStateSnapshot;

  // Temporal contract summary
  temporal_contract_summary: TemporalContractSummary;

  // Proof integrity
  proof_hash: string;

  // Metadata
  created_at: string;
  proof_chain_valid: boolean;

  // Immutability marker
  immutable: true;
}

/**
 * Engine outputs consumed by ProofAssembler
 */
export interface EngineOutputs {
  ie_result?: {
    inevitable: boolean;
    blocked: boolean;
    reason?: string;
    fingerprint?: string;
  };
  ne_result?: {
    necessary: boolean;
    survivable_steps: number;
    reason?: string;
  };
  ice_result?: {
    collapsed: boolean;
    intent_valid: boolean;
    reason?: string;
  };
  cin_result?: {
    canonical: boolean;
    normalized: boolean;
    reason?: string;
  };
  tsl_result?: {
    gate_action: 'ALLOW_PRESENT' | 'BLOCK_PRESENT' | 'PERMANENT_READ_ONLY';
    passed: boolean;
    block_reason?: string;
    simulation_survives?: boolean;
    first_violation_step?: number | null;
    survivability?: number;
    violations?: Array<{ type: string; step: number; severity: string }>;
  };
  aec_result?: {
    entropy_valid: boolean;
    current_entropy: number;
    drift: number;
    phase?: string;
    reason?: string;
  };
  rll_result?: {
    locked: boolean;
    singularity_id?: string;
    reason?: string;
  };
}

/**
 * Proof assembly input
 */
export interface ProofAssemblyInput {
  run_id: string;
  project_id: string;
  action: {
    action_id: string;
    action_type: string;
    description: string;
  };
  current_state: {
    entropy: number;
    mutation_count: number;
    current_step: number;
  };
  contract?: {
    contract_id: string;
    intended_lifespan: number;
    allowed_mutations: number;
    max_entropy_drift: number;
    baseline_entropy: number;
  };
  budget?: {
    initial: number;
    remaining: number;
    consumed: number;
    exhausted: boolean;
  };
  engine_outputs: EngineOutputs;
}

/**
 * Proof verification result
 */
export interface ProofVerificationResult {
  valid: boolean;
  hash_matches: boolean;
  chain_valid: boolean;
  invariant_valid: boolean;
  errors: string[];
}

// ============================================================================
// PCL (Proof Continuity Layer) Types
// ============================================================================
// "A truth that cannot persist is not yet true."
// ============================================================================

/**
 * Refutation record - explicit acknowledgment of overriding a precedent
 */
export interface RefutationRecord {
  // Which precedent is being refuted
  refuted_proof_hash: string;
  refuted_proof_run_id: string;

  // What invariant from that proof is being overridden
  refuted_invariant: InvariantCategory;

  // Why this refutation is valid
  refutation_reason: string;

  // Authority for the refutation
  refutation_authority: 'SYSTEM_OVERRIDE' | 'TEMPORAL_EVOLUTION' | 'ERROR_CORRECTION';

  // Timestamp of refutation
  refuted_at: string;
}

/**
 * Extended proof with continuity information
 * This is the PCL-enhanced version of OlympusDecisionProof
 */
export interface ContinuityProof extends OlympusDecisionProof {
  // Parent proof hashes - proofs this one depends on
  parent_proof_hashes: string[];

  // Has precedent been checked?
  precedent_checked: boolean;

  // Any precedents explicitly refuted
  refuted_precedents: RefutationRecord[];

  // Ledger index (monotonic, assigned by ProofLedger)
  ledger_index: number;

  // Continuity hash (includes parent references)
  continuity_hash: string;
}

/**
 * Ledger entry - wrapper for proof storage
 */
export interface LedgerEntry {
  // Monotonic index
  index: number;

  // The proof itself
  proof: ContinuityProof;

  // Timestamp of ledger write
  ledger_timestamp: string;

  // Previous entry hash (for chain integrity)
  previous_entry_hash: string | null;

  // This entry's hash
  entry_hash: string;
}

/**
 * Precedent match - a prior proof that affects current decision
 */
export interface PrecedentMatch {
  // The matching proof
  proof_hash: string;
  proof_run_id: string;
  ledger_index: number;

  // What type of precedent
  precedent_type: 'FORBIDDEN_ALTERNATIVE' | 'ACTIVE_INVARIANT' | 'DIRECT_PARENT';

  // The specific invariant or alternative that matches
  matching_element: string;

  // How it affects the current proof
  effect: 'BLOCKS' | 'REQUIRES_REFUTATION' | 'INFORMATIONAL';

  // Strength of the precedent
  strength: 'HARD' | 'SOFT';
}

/**
 * Lineage resolution result
 */
export interface LineageResolution {
  // Direct parent proofs (immediate dependencies)
  direct_parents: string[];

  // Global precedent proofs (system-wide effects)
  global_precedents: string[];

  // Combined parent list
  all_parents: string[];

  // Lineage depth
  depth: number;
}

/**
 * Precedent validation result
 */
export interface PrecedentValidation {
  // Overall validity
  valid: boolean;

  // Matching precedents found
  matches: PrecedentMatch[];

  // Blocking precedents (require refutation)
  blocking: PrecedentMatch[];

  // Required refutations
  required_refutations: {
    proof_hash: string;
    invariant: InvariantCategory;
    reason: string;
  }[];

  // Validation errors
  errors: string[];
}

/**
 * Continuity gate decision
 */
export type ContinuityDecision = 'ACCEPT_PROOF' | 'REJECT_PROOF';

/**
 * Continuity gate result
 */
export interface ContinuityGateResult {
  // Final decision
  decision: ContinuityDecision;

  // If rejected, why
  rejection_reason: string | null;

  // Precedent validation details
  precedent_validation: PrecedentValidation;

  // Lineage resolution details
  lineage: LineageResolution;

  // Gate timestamp
  timestamp: string;
}

/**
 * Continuity report - one-page summary
 */
export interface ContinuityReport {
  // Proof being evaluated
  proof_run_id: string;
  proof_hash: string;

  // Gate result
  gate_decision: ContinuityDecision;

  // Precedent summary
  precedent_summary: {
    total_checked: number;
    applicable: number;
    blocking: number;
    refuted: number;
  };

  // What was upheld
  upheld_precedents: {
    proof_hash: string;
    invariant: string;
  }[];

  // What was refuted
  refuted_precedents: RefutationRecord[];

  // Continuity chain info
  chain_info: {
    ledger_index: number;
    parent_count: number;
    lineage_depth: number;
  };

  // Timestamp
  generated_at: string;
}

/**
 * PCL Engine configuration
 */
export interface PCLConfig {
  // Ledger storage directory
  ledger_dir?: string;

  // Whether to enforce hard precedents
  enforce_precedents?: boolean;

  // Maximum lineage depth to check
  max_lineage_depth?: number;

  // Whether to write reports
  write_reports?: boolean;
}

/**
 * PCL execution result
 */
export interface PCLExecutionResult {
  // The continuity-enhanced proof
  proof: ContinuityProof;

  // Gate result
  gate_result: ContinuityGateResult;

  // Continuity report
  report: ContinuityReport;

  // Ledger entry (if accepted)
  ledger_entry: LedgerEntry | null;

  // Execution metadata
  execution_time_ms: number;
  pcl_version: string;
}

// ============================================================================
// AAM (Authority & Attestation Mesh) Types
// ============================================================================
// "Truth without authority is opinion. Authority without memory is tyranny."
// ============================================================================

/**
 * Authority class - ordered hierarchy of decision-making authority
 * Higher numeric value = higher authority
 */
export type AuthorityClass =
  | 'USER'           // Level 1 - User-level decisions
  | 'PROJECT'        // Level 2 - Project-scoped authority
  | 'CONSTITUTIONAL' // Level 3 - System constitution rules
  | 'SYSTEM_ROOT';   // Level 4 - Absolute system authority (immutable)

/**
 * Authority class definition with numeric level
 */
export interface AuthorityClassDefinition {
  class: AuthorityClass;
  level: number;
  description: string;
  can_refute: AuthorityClass[]; // Which classes this can refute
  immutable: boolean;           // If true, cannot be modified after bootstrap
}

/**
 * Invariant supremacy level
 * Level 1 = UNREFUTABLE (cannot be overridden by any authority)
 * Lower number = higher supremacy
 */
export type SupremacyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Invariant supremacy definition
 */
export interface InvariantSupremacy {
  invariant: InvariantCategory;
  supremacy_level: SupremacyLevel;
  minimum_authority: AuthorityClass; // Minimum authority required to establish
  refutable_by: AuthorityClass[];    // Which authorities can refute (if any)
  description: string;
}

/**
 * Refutation authority check result
 */
export interface RefutationAuthorityResult {
  authorized: boolean;
  refuter_authority: AuthorityClass;
  refuter_level: number;
  refuted_authority: AuthorityClass;
  refuted_level: number;
  invariant_supremacy: SupremacyLevel;
  rejection_reason: string | null;
}

/**
 * Attestation record - externally witnessable proof of decision
 */
export interface AttestationRecord {
  // Attestation identifier
  attestation_id: string;

  // What is being attested
  continuity_hash: string;
  proof_hash: string;
  ledger_index: number;

  // Authority information
  authority_class: AuthorityClass;
  authority_level: number;

  // Timing
  timestamp: string;
  epoch_ms: number;

  // Attestation integrity
  attestation_hash: string;

  // Optional: Git commit reference
  git_commit_hash?: string;
}

/**
 * Attestation log entry
 */
export interface AttestationLogEntry {
  index: number;
  attestation: AttestationRecord;
  previous_attestation_hash: string | null;
  entry_hash: string;
}

/**
 * Fork detection result
 */
export interface ForkDetectionResult {
  fork_detected: boolean;
  last_common_index: number | null;
  last_common_hash: string | null;
  divergence_point: {
    local_hash: string;
    remote_hash: string;
    index: number;
  } | null;
  conflict_severity: 'NONE' | 'MINOR' | 'MAJOR' | 'CRITICAL';
}

/**
 * Extended ContinuityProof with AAM fields
 */
export interface AuthorizedContinuityProof extends ContinuityProof {
  // Authority information
  authority_class: AuthorityClass;
  authority_level: number;

  // Invariant supremacy
  invariant_supremacy_level: SupremacyLevel;

  // Attestation reference
  attestation_reference: string | null;
}

/**
 * AAM configuration
 */
export interface AAMConfig {
  // Attestation log directory
  attestation_dir?: string;

  // Enable git attestation
  enable_git_attestation?: boolean;

  // Git repository path (if git attestation enabled)
  git_repo_path?: string;

  // Enforce authority validation
  enforce_authority?: boolean;

  // Enforce supremacy rules
  enforce_supremacy?: boolean;
}

/**
 * AAM execution result
 */
export interface AAMExecutionResult {
  // The authority-enhanced proof
  proof: AuthorizedContinuityProof;

  // Authority validation result
  authority_result: RefutationAuthorityResult | null;

  // Attestation record (if emitted)
  attestation: AttestationRecord | null;

  // Fork detection result
  fork_check: ForkDetectionResult;

  // Execution metadata
  execution_time_ms: number;
  aam_version: string;
}

/**
 * AAM validation errors
 */
export type AAMValidationError =
  | 'INSUFFICIENT_AUTHORITY'
  | 'SUPREMACY_VIOLATION'
  | 'FORK_DETECTED'
  | 'ATTESTATION_FAILED'
  | 'REGISTRY_LOCKED';

// ============================================================================
// ODL (OBLIGATION DETECTION LAYER) TYPES
// ============================================================================
// "Failure to decide is still a decision. OLYMPUS records it."
// ============================================================================

/**
 * Obligation priority levels
 */
export type ObligationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Obligation status
 */
export type ObligationStatus =
  | 'DETECTED'        // Obligation has been identified
  | 'PENDING'         // Awaiting fulfillment
  | 'FULFILLED'       // Obligation met
  | 'VIOLATED'        // Deadline missed (OMISSION_VIOLATION)
  | 'SUPERSEDED';     // Replaced by newer obligation

/**
 * Source of obligation derivation
 */
export type ObligationSource =
  | 'NECESSARY_FUTURE'      // Derived from NE (Necessity Engine)
  | 'TEMPORAL_CONTRACT'     // Derived from TSL temporal contract
  | 'INVARIANT_REQUIREMENT' // Required by invariant maintenance
  | 'SYSTEM_MANDATE';       // System-level mandatory action

/**
 * A required decision that must be made
 */
export interface RequiredDecision {
  // Unique identifier for this obligation
  obligation_id: string;

  // Source of the obligation
  source: ObligationSource;

  // What action type is required
  required_action_type: string;

  // Description of what must be decided
  required_decision_description: string;

  // Minimum authority required to fulfill
  required_authority_class: AuthorityClass;

  // The invariant this obligation protects
  protected_invariant: InvariantCategory;

  // Deadline (in temporal steps)
  deadline_step: number;

  // Priority level
  priority: ObligationPriority;

  // Contextual data for the obligation
  context: {
    trigger_proof_hash: string | null;
    trigger_run_id: string | null;
    related_contract_id: string | null;
    necessary_future_hash: string | null;
  };
}

/**
 * Obligation derivation result
 */
export interface ObligationDerivationResult {
  // Obligations derived
  obligations: RequiredDecision[];

  // Count by source
  by_source: Record<ObligationSource, number>;

  // Count by priority
  by_priority: Record<ObligationPriority, number>;

  // Derivation timestamp
  derived_at: string;

  // Derivation context
  derivation_context: {
    current_step: number;
    contract_id: string | null;
    active_invariants: InvariantCategory[];
  };
}

/**
 * Obligation window state
 */
export interface ObligationWindow {
  // The obligation being tracked
  obligation_id: string;

  // Window start step
  start_step: number;

  // Window end step (deadline)
  end_step: number;

  // Current step when checked
  current_step: number;

  // Steps remaining
  steps_remaining: number;

  // Is the window still open?
  window_open: boolean;

  // Has the deadline been missed?
  deadline_missed: boolean;

  // Percentage of window elapsed
  elapsed_percentage: number;
}

/**
 * Obligation window tracking result
 */
export interface WindowTrackingResult {
  // All tracked windows
  windows: ObligationWindow[];

  // Windows with open deadlines
  open_count: number;

  // Windows with missed deadlines
  violated_count: number;

  // Critical violations (CRITICAL priority + missed)
  critical_violations: string[];

  // Tracking timestamp
  tracked_at: string;
}

/**
 * Omission violation record
 */
export interface OmissionViolation {
  // Violation ID
  violation_id: string;

  // The obligation that was violated
  obligation_id: string;

  // The required decision that was not made
  required_decision: RequiredDecision;

  // When the deadline was missed
  deadline_step: number;

  // Current step when violation detected
  detection_step: number;

  // Steps overdue
  steps_overdue: number;

  // Violation timestamp
  violated_at: string;

  // This is a SYSTEM_ROOT authority violation (non-delegable)
  authority: 'SYSTEM_ROOT';
}

/**
 * Mandatory Decision Proof - extends OlympusDecisionProof for omission tracking
 */
export interface MandatoryDecisionProof extends OlympusDecisionProof {
  // The obligation this proof relates to
  obligation_id: string;

  // Required authority class for fulfillment
  required_authority_class: AuthorityClass;

  // The deadline step
  deadline_step: number;

  // Was an omission detected?
  omission_detected: boolean;

  // The omission violation (if omission_detected = true)
  omission_violation: OmissionViolation | null;

  // Fulfillment proof hash (if fulfilled)
  fulfillment_proof_hash: string | null;

  // ODL-specific hash
  obligation_hash: string;
}

/**
 * Obligation ledger entry
 */
export interface ObligationLedgerEntry {
  // Monotonic index
  index: number;

  // The obligation
  obligation: RequiredDecision;

  // Current status
  status: ObligationStatus;

  // Status history
  status_history: Array<{
    status: ObligationStatus;
    timestamp: string;
    step: number;
  }>;

  // Fulfillment data (if fulfilled)
  fulfillment: {
    fulfilled_at: string | null;
    fulfillment_proof_hash: string | null;
    fulfillment_step: number | null;
    fulfilling_authority: AuthorityClass | null;
  } | null;

  // Violation data (if violated)
  violation: OmissionViolation | null;

  // Entry timestamp
  created_at: string;

  // Last updated
  updated_at: string;

  // Previous entry hash (for chain integrity)
  previous_entry_hash: string | null;

  // This entry's hash
  entry_hash: string;
}

/**
 * Obligation ledger query
 */
export interface ObligationLedgerQuery {
  // Filter by status
  status?: ObligationStatus[];

  // Filter by priority
  priority?: ObligationPriority[];

  // Filter by source
  source?: ObligationSource[];

  // Filter by deadline range
  deadline_before?: number;
  deadline_after?: number;

  // Limit results
  limit?: number;

  // Offset for pagination
  offset?: number;
}

/**
 * Obligation gate check result
 */
export interface ObligationGateResult {
  // Can the system proceed?
  proceed: boolean;

  // Gate decision
  decision: 'ALLOW' | 'BLOCK_CRITICAL_OBLIGATION' | 'BLOCK_VIOLATION_UNADDRESSED';

  // Blocking obligations (if blocked)
  blocking_obligations: RequiredDecision[];

  // Unaddressed violations (if blocked)
  unaddressed_violations: OmissionViolation[];

  // Warning obligations (not blocking but approaching deadline)
  warning_obligations: Array<{
    obligation: RequiredDecision;
    steps_remaining: number;
  }>;

  // Gate check timestamp
  checked_at: string;

  // Current temporal step
  current_step: number;
}

/**
 * ODL Engine configuration
 */
export interface ODLConfig {
  // Ledger storage directory
  ledger_dir?: string;

  // Warning threshold (steps before deadline to warn)
  warning_threshold_steps?: number;

  // Block on critical obligations?
  block_on_critical?: boolean;

  // Auto-emit violations?
  auto_emit_violations?: boolean;
}

/**
 * ODL execution result
 */
export interface ODLExecutionResult {
  // Derived obligations
  derivation: ObligationDerivationResult;

  // Window tracking status
  window_status: WindowTrackingResult;

  // Gate check result
  gate_result: ObligationGateResult;

  // Any new violations emitted
  new_violations: OmissionViolation[];

  // Mandatory decision proofs emitted
  mandatory_proofs: MandatoryDecisionProof[];

  // Ledger entry (if written)
  ledger_entry: ObligationLedgerEntry | null;

  // Execution metadata
  execution_time_ms: number;
  odl_version: string;
}
