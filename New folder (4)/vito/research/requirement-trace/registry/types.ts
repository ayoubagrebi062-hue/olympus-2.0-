/**
 * RICP Registry Types
 *
 * Core type definitions for the Requirement Integrity Control Plane.
 */

import type { LossClass, TracedAgentId, HandoffId } from '../types';

// Shape Categories
export type ShapeCategory = 'STATEFUL' | 'STATELESS' | 'CONTROL';

// Shape Attribute (generic for any capability)
export type CapabilityAttribute = string;

// Shape Declaration
export interface ShapeDeclaration {
  id: string;
  name: string;
  category: ShapeCategory;

  attributes: {
    required: CapabilityAttribute[];
    optional: CapabilityAttribute[];
  };

  survival: {
    must_reach_stage: TracedAgentId;
    forbidden_loss_classes: LossClass[];
  };

  extraction: {
    root_paths: Record<TracedAgentId, string[]>;
    structural_signals: Record<string, unknown>;
  };
}

// Degradation Budget
export interface DegradationBudget {
  allowed: {
    max_attributes_degraded: number;
    tolerated_loss_classes: LossClass[];
  };
  fatal: {
    loss_classes: LossClass[];
    min_required_attributes: number;
  };
}

// Handoff Budget
export interface HandoffBudget {
  handoff_id: HandoffId;
  source: TracedAgentId;
  target: TracedAgentId;
  budgets: Record<ShapeCategory, DegradationBudget>;
}

// Shape Extraction Result
export interface ShapeExtractionResult {
  shape_id: string;
  agent_id: TracedAgentId;
  timestamp: string;
  present: boolean;
  attributes_found: CapabilityAttribute[];
  attributes_missing: CapabilityAttribute[];
  attribute_values: Record<string, unknown>;
  source_paths: Record<string, string>;
  confidence: number;
}

// Shape Trace Result (across all agents)
export interface ShapeTraceResult {
  shape_id: string;
  category: ShapeCategory;
  extractions: Record<TracedAgentId, ShapeExtractionResult>;
  handoff_losses: Record<HandoffId, HandoffLossResult>;
  survival_status: SurvivalStatus;
  rsr: number; // Requirement Survival Rate for this shape
}

export interface HandoffLossResult {
  handoff_id: HandoffId;
  source_agent: TracedAgentId;
  target_agent: TracedAgentId;
  loss_detected: boolean;
  loss_class: LossClass | null;
  attributes_lost: CapabilityAttribute[];
  attributes_degraded: CapabilityAttribute[];
  budget_status: 'WITHIN' | 'EXCEEDED' | 'FATAL';
}

export interface SurvivalStatus {
  survived_to_target: boolean;
  target_stage: TracedAgentId;
  actual_last_stage: TracedAgentId | null;
  failure_point: HandoffId | null;
  failure_class: LossClass | null;
}

// Gate Types
export interface GateValidation {
  shape_id: string;
  check_type: 'SURVIVAL' | 'BUDGET' | 'INTEGRITY';
  assertion: {
    shape_present: boolean;
    min_attributes: number;
    no_fatal_losses: boolean;
  };
}

export interface ShapeGateResult {
  shape_id: string;
  category: ShapeCategory;
  survived: boolean;
  attributes_present: number;
  attributes_required: number;
  budget_status: 'WITHIN' | 'EXCEEDED' | 'FATAL';
  degradations_used: number;
  degradations_allowed: number;
  loss_detected: LossClass | null;
  loss_is_fatal: boolean;
}

export interface FatalViolation {
  shape_id: string;
  violation_type: 'SHAPE_ABSENT' | 'FATAL_LOSS' | 'BUDGET_EXCEEDED' | 'SURVIVAL_FAILURE';
  handoff_id: HandoffId;
  loss_class: LossClass;
  evidence: {
    source_path: string;
    target_path: string;
    explanation: string;
  };
}

export interface GateResult {
  gate_id: string;
  timestamp: string;
  verdict: 'PASS' | 'FAIL' | 'WARN';
  shape_results: ShapeGateResult[];
  fatal_violations: FatalViolation[];
  block_downstream: boolean;
}

// Counterfactual Analysis
export interface CounterfactualAnalysis {
  shape_id: string;
  original_loss_class: LossClass;
  survival_possible: boolean;
  blocking_mechanism: LossClass;
  evidence: string;
  hypothetical_path: string;
}

// Execution Verdict
export type ExecutionVerdict =
  | 'SAFE_TO_EXECUTE'
  | 'EXECUTION_BLOCKED_REQUIREMENT_LOSS'
  | 'SYSTEMIC_FAILURE'
  | 'SELECTIVE_DESTRUCTION_CONFIRMED';

export interface VerdictDetails {
  verdict: ExecutionVerdict;
  blocking: boolean;
  reason_code: string;
  explanation: string;
  culpable_agents: TracedAgentId[];
  culpable_mechanisms: string[];
}

// Root Cause
export type RootCauseClass =
  | 'SUMMARIZER_COLLAPSE'
  | 'CONTEXT_TRUNCATION'
  | 'DEPENDENCY_SKIP'
  | 'SCHEMA_MISMATCH'
  | 'EXTRACTION_FAILURE'
  | 'PROPAGATION_FAILURE'
  | 'SELECTIVE_DESTRUCTION'
  | 'UNKNOWN';

export interface RootCause {
  class: RootCauseClass;
  mechanism: string;
  handoff: HandoffId;
  evidence: {
    source_path: string;
    target_path: string;
    explanation: string;
  };
  recommendation: string;
}

// RSR (Requirement Survival Rate)
export interface RSRMetrics {
  global_rsr: number;
  per_shape_rsr: Record<string, number>;
  per_category_rsr: Record<ShapeCategory, number>;
  timestamp: string;
  run_id: string;
}

export interface RSRHistoryEntry {
  timestamp: string;
  run_id: string;
  global_rsr: number;
  per_shape_rsr: Record<string, number>;
  verdict: ExecutionVerdict;
}

// Control Report
export interface ControlReport {
  metadata: {
    generated_at: string;
    ricp_version: string;
    shapes_traced: string[];
    gates_executed: string[];
    run_id: string;
  };

  registry: {
    shapes: ShapeDeclaration[];
    budgets: HandoffBudget[];
  };

  shape_traces: Record<string, ShapeTraceResult>;

  gate_results: GateResult[];

  rsr_metrics: RSRMetrics;

  comparative_analysis: {
    control_shapes_survived: string[];
    stateful_shapes_lost: string[];
    loss_is_selective: boolean;
    selectivity_evidence: string;
  };

  counterfactual_analysis: CounterfactualAnalysis[];

  root_cause: RootCause;

  verdict: VerdictDetails;

  execution_decision: {
    wire_blocked: boolean;
    pixel_blocked: boolean;
    blocked_event_emitted: boolean;
    reason: string;
  };
}

// Blocked Execution Event
export interface BlockedExecutionEvent {
  event_type: 'BLOCKED_EXECUTION';
  timestamp: string;
  run_id: string;
  gate_id: string;
  verdict: ExecutionVerdict;
  blocked_agents: TracedAgentId[];
  fatal_violations: FatalViolation[];
  reason: string;
}

// Security Violation Event
export interface SecurityViolationEvent {
  event_type: 'SECURITY_VIOLATION';
  timestamp: string;
  violation: 'GATE_BYPASS_ATTEMPTED';
  source: string;
  blocked: boolean;
}
