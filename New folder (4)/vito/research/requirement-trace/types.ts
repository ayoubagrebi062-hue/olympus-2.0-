/**
 * Requirement Trace - Type Definitions
 *
 * READ-ONLY DIAGNOSTIC TYPES
 * No inference, no synthesis, no assumptions
 */

// ============================================================================
// AGENT IDENTIFIERS
// ============================================================================

export type TracedAgentId =
  | 'strategos'
  | 'scope'
  | 'cartographer'
  | 'blocks'
  | 'wire'
  | 'pixel';

export type HandoffId = 'H1' | 'H2' | 'H3' | 'H4' | 'H5';

// ============================================================================
// FILTER CAPABILITY SHAPE
// ============================================================================

/**
 * Structural shape representing a filter capability.
 * Each attribute is optional because we track WHAT IS MISSING.
 */
export interface FilterCapabilityShape {
  // IDENTITY - What is being filtered
  target_entity?: string;           // e.g., "tasks", "orders", "items"

  // MECHANISM - How filtering works
  filter_attribute?: string;        // e.g., "status"
  filter_values?: string[];         // e.g., ["all", "active", "completed"]
  filter_type?: 'discrete' | 'range' | 'search';

  // INTERACTION - How user triggers filter
  ui_control?: 'tabs' | 'dropdown' | 'buttons' | 'chips' | string;
  default_value?: string;           // e.g., "all"

  // STATE - Where filter state lives
  state_location?: 'url' | 'local' | 'global' | string;

  // BEHAVIOR - What happens on filter
  triggers_refetch?: boolean;
  client_side_only?: boolean;

  // CODE ARTIFACTS (for wire/pixel)
  state_hook?: string;              // e.g., "useState", "useFilter"
  event_handler?: string;           // e.g., "onClick", "onChange"
}

export type ShapeAttribute = keyof FilterCapabilityShape;

export const ALL_SHAPE_ATTRIBUTES: ShapeAttribute[] = [
  'target_entity',
  'filter_attribute',
  'filter_values',
  'filter_type',
  'ui_control',
  'default_value',
  'state_location',
  'triggers_refetch',
  'client_side_only',
  'state_hook',
  'event_handler'
];

// ============================================================================
// EXTRACTION RESULT
// ============================================================================

/**
 * Result of extracting a shape from an agent output.
 * MUST include evidence paths for every attribute.
 */
export interface ExtractionResult {
  agent_id: TracedAgentId;
  timestamp: string;

  // The extracted shape (null if L0_TOTAL_OMISSION)
  shape: FilterCapabilityShape | null;

  // Evidence for each extracted attribute
  attribute_evidence: AttributeEvidence[];

  // Raw source location
  source_file: string;
  source_type: 'agent_output' | 'context_summary' | 'dependency_summary' | 'code_file';

  // Extraction status
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  extraction_errors: string[];
}

export interface AttributeEvidence {
  attribute: ShapeAttribute;
  found: boolean;
  value: unknown;
  json_path: string;           // e.g., "mvp_features[2].acceptance_criteria[0]"
  raw_text?: string;           // Original text if applicable
  confidence: number;          // 0.0 - 1.0 based on structural match
}

// ============================================================================
// LOSS CLASSIFICATION
// ============================================================================

export type LossClass =
  | 'L0_TOTAL_OMISSION'
  | 'L1_PARTIAL_CAPTURE'
  | 'L2_SEMANTIC_DRIFT'
  | 'L3_SPECIFICITY_LOSS'
  | 'L4_CONTEXT_TRUNCATION'
  | 'L5_DEPENDENCY_SKIP'
  | 'L6_SUMMARY_COLLAPSE'
  | 'L7_SCHEMA_MISMATCH';

export type LossSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const LOSS_SEVERITY: Record<LossClass, LossSeverity> = {
  'L0_TOTAL_OMISSION': 'CRITICAL',
  'L1_PARTIAL_CAPTURE': 'HIGH',
  'L2_SEMANTIC_DRIFT': 'HIGH',
  'L3_SPECIFICITY_LOSS': 'MEDIUM',
  'L4_CONTEXT_TRUNCATION': 'HIGH',
  'L5_DEPENDENCY_SKIP': 'CRITICAL',
  'L6_SUMMARY_COLLAPSE': 'HIGH',
  'L7_SCHEMA_MISMATCH': 'MEDIUM'
};

export const LOSS_PRIORITY: LossClass[] = [
  'L0_TOTAL_OMISSION',      // Most severe - check first
  'L5_DEPENDENCY_SKIP',
  'L4_CONTEXT_TRUNCATION',
  'L6_SUMMARY_COLLAPSE',
  'L1_PARTIAL_CAPTURE',
  'L2_SEMANTIC_DRIFT',
  'L7_SCHEMA_MISMATCH',
  'L3_SPECIFICITY_LOSS'     // Least severe - check last
];

export interface LossClassification {
  loss_class: LossClass;
  severity: LossSeverity;
  triggering_condition: string;
  evidence: LossEvidence;
}

export interface LossEvidence {
  source_path: string;
  target_path: string;
  source_value: unknown;
  target_value: unknown;
  explanation: string;
}

// ============================================================================
// ATTRIBUTE DIFF
// ============================================================================

export type DiffStatus =
  | 'PRESERVED'       // Value identical
  | 'TRANSFORMED'     // Value changed but semantically equivalent
  | 'DEGRADED'        // Value lost specificity
  | 'MISSING'         // Present in source, absent in target
  | 'ADDED'           // Absent in source, present in target
  | 'INCOMPATIBLE';   // Type mismatch

export interface AttributeDiff {
  attribute: ShapeAttribute;

  source_value: unknown | undefined;
  target_value: unknown | undefined;

  status: DiffStatus;
  similarity_score: number;  // 0.0 - 1.0

  source_path: string;       // JSON path in source
  target_path: string;       // JSON path in target or "NOT_FOUND"

  notes: string;
}

// ============================================================================
// HANDOFF
// ============================================================================

export interface Handoff {
  id: HandoffId;
  source_agent: TracedAgentId;
  target_agent: TracedAgentId;

  // What source produced
  source_output: {
    extraction: ExtractionResult;
    raw_output_path: string;
  };

  // What target received
  target_input: {
    context_extraction: ExtractionResult | null;
    dependency_extraction: ExtractionResult | null;
    raw_context_path: string;
  };

  // Attribute-level diff
  attribute_diffs: AttributeDiff[];

  // Summary metrics
  attributes_preserved: number;
  attributes_lost: number;
  attributes_degraded: number;

  // Loss classification (null if no loss detected)
  loss: LossClassification | null;
}

// ============================================================================
// TRACE REPORT
// ============================================================================

export interface TraceReport {
  metadata: {
    generated_at: string;
    tool_version: string;
    target_shape: string;
    agents_traced: TracedAgentId[];
  };

  // Per-agent extraction results
  extractions: Record<TracedAgentId, ExtractionResult>;

  // Per-handoff analysis
  handoffs: Record<HandoffId, Handoff>;

  // The identified loss point (if any)
  loss_point: {
    identified: boolean;
    handoff_id: HandoffId | null;
    loss_class: LossClass | null;
    evidence: LossEvidence | null;
    summary: string;
  };

  // Full trace chain
  trace_chain: TraceChainLink[];
}

export interface TraceChainLink {
  agent: TracedAgentId;
  shape_present: boolean;
  attributes_present: ShapeAttribute[];
  attributes_missing: ShapeAttribute[];
  loss_from_previous: LossClass | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface TraceConfig {
  diagnostic: {
    name: string;
    version: string;
    created: string;
  };
  target_shape: {
    name: string;
    description: string;
  };
  agent_sequence: TracedAgentId[];
  handoffs: Array<{
    id: HandoffId;
    source: TracedAgentId;
    target: TracedAgentId;
  }>;
  required_attributes_by_stage: Record<TracedAgentId, ShapeAttribute[]>;
  schema_paths: Record<TracedAgentId, Record<string, string>>;
  loss_classes: Record<string, { name: string; severity: string }>;
  data_sources: {
    agent_outputs_dir: string;
    build_outputs_pattern: string;
    summarizer_path: string;
  };
}
