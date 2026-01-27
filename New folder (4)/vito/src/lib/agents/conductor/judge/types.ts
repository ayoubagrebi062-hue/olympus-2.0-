/**
 * JUDGE MODULE Type Definitions
 *
 * Quality control brain for CONDUCTOR - scores, validates, and improves agent outputs.
 */

// ============================================================================
// QUALITY SCORING TYPES
// ============================================================================

/**
 * Quality score for an agent output
 */
export interface QualityScore {
  /** Overall composite score (1-10) */
  overall: number;
  /** Individual dimension scores */
  dimensions: QualityDimensions;
  /** Confidence in the scoring (0-1) */
  confidence: number;
  /** When the scoring was done */
  timestamp: Date;
  /** Optional reasoning for the score */
  reasoning?: string;
}

/**
 * Quality dimensions for scoring
 */
export interface QualityDimensions {
  /** Did it include everything required? (1-10) */
  completeness: number;
  /** Is it technically accurate? (1-10) */
  correctness: number;
  /** Does it match previous outputs? (1-10) */
  consistency: number;
  /** Is it innovative or just basic? (1-10) */
  creativity: number;
  /** Is the output clear and well-structured? (1-10) */
  clarity: number;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation result for schema checking
 */
export interface ValidationResult {
  /** Whether the output is valid overall */
  valid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
  /** List of validation warnings */
  warnings: ValidationWarning[];
  /** Percentage of required fields present (0-100) */
  coverage: number;
}

/**
 * A validation error
 */
export interface ValidationError {
  /** Field that has the error */
  field: string;
  /** Error message */
  message: string;
  /** Severity level */
  severity: 'critical' | 'major' | 'minor';
  /** Path to the field in nested structure */
  path: string[];
}

/**
 * A validation warning
 */
export interface ValidationWarning {
  /** Field with the warning */
  field: string;
  /** Warning message */
  message: string;
  /** Suggested fix */
  suggestion: string;
}

// ============================================================================
// IMPROVEMENT TYPES
// ============================================================================

/**
 * Improvement suggestion
 */
export interface ImprovementSuggestion {
  /** What aspect to improve */
  aspect: string;
  /** Current state/problem */
  currentState: string;
  /** How to fix it */
  suggestedFix: string;
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Estimated impact if fixed (1-10) */
  estimatedImpact: number;
}

/**
 * Retry strategy when quality is low
 */
export interface RetryStrategy {
  /** Type of retry approach */
  type: 'same' | 'simplified' | 'alternative' | 'decomposed';
  /** Modified prompt for the retry */
  modifiedPrompt?: string;
  /** Areas to focus on in retry */
  focusAreas?: string[];
  /** Maximum allowed retries */
  maxRetries: number;
  /** Current retry count */
  currentRetry: number;
}

// ============================================================================
// JUDGE DECISION TYPES
// ============================================================================

/**
 * Judge decision after scoring
 */
export interface JudgeDecision {
  /** Action to take based on quality */
  action: JudgeAction;
  /** Quality score */
  score: QualityScore;
  /** Validation result */
  validation: ValidationResult;
  /** Improvement suggestions */
  suggestions: ImprovementSuggestion[];
  /** Retry strategy if action is 'retry' */
  retryStrategy?: RetryStrategy;
}

/**
 * Possible actions after judging
 */
export type JudgeAction = 'accept' | 'retry' | 'enhance' | 'fail';

// ============================================================================
// THRESHOLD TYPES
// ============================================================================

/**
 * Quality threshold configuration per agent
 */
export interface QualityThreshold {
  /** Agent ID this threshold applies to */
  agentId: string;
  /** Minimum acceptable overall score */
  minOverallScore: number;
  /** Minimum scores per dimension */
  minDimensionScores: QualityDimensions;
  /** Fields that MUST be present */
  criticalFields: string[];
  /** Maximum allowed retries */
  maxRetries: number;
}

// ============================================================================
// METRICS TYPES
// ============================================================================

/**
 * Quality metrics tracked over time
 */
export interface QualityMetrics {
  /** Agent being tracked */
  agentId: string;
  /** Most recent build ID */
  buildId: string;
  /** Historical scores */
  scores: QualityScore[];
  /** Average score across all tracked runs */
  averageScore: number;
  /** Trend direction */
  trend: 'improving' | 'stable' | 'declining';
  /** Last update timestamp */
  lastUpdated: Date;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Judge module configuration
 */
export interface JudgeConfig {
  /** Whether judging is enabled */
  enabled: boolean;
  /** Fail on any validation error? */
  strictMode: boolean;
  /** Automatically retry low scores? */
  autoRetry: boolean;
  /** Quality thresholds per agent */
  thresholds: Map<string, QualityThreshold>;
  /** Which model does the judging? */
  scoringModel: 'opus' | 'sonnet' | 'haiku';
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Context for judging an agent's output
 */
export interface JudgeContext {
  /** Build ID */
  buildId: string;
  /** Role/description of the agent */
  agentRole: string;
  /** Expected output type */
  expectedOutputType: string;
  /** Summaries of previous agent outputs for consistency checking */
  previousOutputs: Array<{ agentId: string; summary: unknown }>;
  /** Current retry attempt (0-indexed) */
  currentRetry: number;
}

/**
 * Context for scoring
 */
export interface ScoringContext {
  /** Role/description of the agent */
  agentRole: string;
  /** Expected output type */
  expectedOutputType: string;
  /** Summaries of previous agent outputs */
  previousOutputs: Array<{ agentId: string; summary: unknown }>;
}

// ============================================================================
// AGENT OUTPUT TYPES (for judge)
// ============================================================================

/**
 * Simplified agent output for judge module
 */
export interface AgentOutputForJudge {
  /** Agent ID that produced this */
  agentId: string;
  /** Output data */
  data: Record<string, unknown> | null;
  /** Optional quality score if already judged */
  qualityScore?: QualityScore;
  /** Optional suggestions from judge */
  suggestions?: ImprovementSuggestion[];
  /** Warning message if any */
  warning?: string;
}

/**
 * Agent definition for validation
 */
export interface AgentDefinitionForJudge {
  /** Agent ID */
  id: string;
  /** Agent description */
  description?: string;
  /** Output schema for validation */
  outputSchema?: {
    title?: string;
    type?: string;
    required?: string[];
    properties?: Record<string, unknown>;
  };
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Judge-related events
 */
export type JudgeEventType =
  | 'judge:scoring_started'
  | 'judge:scoring_completed'
  | 'judge:validation_failed'
  | 'judge:retry_triggered'
  | 'judge:quality_accepted'
  | 'judge:quality_failed';

/**
 * Judge event
 */
export interface JudgeEvent {
  /** Event type */
  type: JudgeEventType;
  /** Agent being judged */
  agentId: string;
  /** Build ID */
  buildId: string;
  /** Timestamp */
  timestamp: Date;
  /** Event-specific data */
  data: Record<string, unknown>;
}
