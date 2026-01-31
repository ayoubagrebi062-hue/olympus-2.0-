/**
 * EVOLUTION MODULE Type Definitions
 * Phase 7 of OLYMPUS 50X - CRITICAL for Level 5 (AUTONOMOUS)
 *
 * Types for:
 * - Performance analysis
 * - Prompt improvements
 * - Agent proposals
 * - Meta-learning patterns
 * - Evolution actions
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

// ============================================================================
// PERFORMANCE ANALYSIS TYPES
// ============================================================================

/**
 * Performance analysis for an agent over a time period
 */
export interface AgentPerformanceAnalysis {
  agentId: string;
  period: {
    start: Date;
    end: Date;
    buildCount: number;
  };

  /** Quality metrics */
  quality: {
    averageScore: number;
    scoreDistribution: Record<string, number>; // "1-3": 5, "4-6": 20, "7-9": 75
    trend: 'improving' | 'stable' | 'declining';
    volatility: number; // Score variance (standard deviation)
  };

  /** Efficiency metrics */
  efficiency: {
    averageTokens: number;
    averageLatency: number;
    retryRate: number;
    failureRate: number;
  };

  /** Comparison against benchmarks */
  comparison: {
    vsHistoricalAvg: number; // +/- percentage
    vsBestPromptVersion: number;
    ranking: number; // 1 = best agent
  };

  /** Issues detected during analysis */
  issues: PerformanceIssue[];
}

/**
 * A detected performance issue
 */
export interface PerformanceIssue {
  type: 'quality' | 'efficiency' | 'reliability' | 'consistency';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  evidence: string[];
  suggestedFix: string;
}

// ============================================================================
// PROMPT IMPROVEMENT TYPES
// ============================================================================

/**
 * A suggested improvement for a prompt
 */
export interface PromptImprovement {
  agentId: string;
  currentPromptId: string;
  currentVersion: number;

  /** The improvement details */
  improvement: {
    type: 'refine' | 'restructure' | 'expand' | 'simplify' | 'specialize';
    targetArea: string; // Which part of prompt to improve
    rationale: string;
    expectedImpact: number; // 1-10
  };

  /** Generated variant */
  variant: {
    promptText: string;
    changes: PromptChange[];
    confidence: number; // 0-1
  };

  /** Testing plan */
  testPlan: {
    experimentId?: string;
    trafficSplit: number; // % traffic to variant
    minSampleSize: number;
    successCriteria: SuccessCriteria;
  };
}

/**
 * A specific change made to a prompt
 */
export interface PromptChange {
  section: string;
  before: string;
  after: string;
  reason: string;
}

/**
 * Success criteria for prompt experiments
 */
export interface SuccessCriteria {
  minQualityImprovement: number; // e.g., 0.5 points
  maxTokenIncrease: number; // e.g., 0.15 = 15%
  minSampleSize: number;
  confidenceLevel: number; // e.g., 0.95
}

// ============================================================================
// AGENT PROPOSAL TYPES
// ============================================================================

/**
 * Proposal for a new agent
 */
export interface AgentProposal {
  id: string;

  /** Identity of the proposed agent */
  identity: {
    name: string;
    description: string;
    phase: string;
    tier: 'opus' | 'sonnet' | 'haiku';
  };

  /** Justification for creating this agent */
  justification: {
    gapDetected: string;
    userRequests: string[]; // Requests that couldn't be handled
    relatedAgents: string[]; // Existing agents this relates to
    expectedValue: string;
  };

  /** Agent definition */
  definition: {
    systemPrompt: string;
    outputSchema: Record<string, unknown>;
    dependencies: string[];
    capabilities: string[];
  };

  /** Testing configuration */
  testing: {
    testCases: TestCase[];
    benchmarkAgents: string[]; // Compare against these
    successCriteria: AgentSuccessCriteria;
  };

  status: 'proposed' | 'testing' | 'approved' | 'rejected' | 'deployed';
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A test case for validating an agent
 */
export interface TestCase {
  input: string;
  expectedOutputPattern: string;
  qualityThreshold: number;
}

/**
 * Success criteria for new agent validation
 */
export interface AgentSuccessCriteria {
  minQualityScore: number;
  maxFailureRate: number;
  uniqueValueDemonstrated: boolean;
}

// ============================================================================
// EVOLUTION ACTION TYPES
// ============================================================================

/**
 * An action taken by the evolution engine
 */
export interface EvolutionAction {
  id: string;
  type: 'optimize_prompt' | 'create_agent' | 'deprecate_agent' | 'merge_agents' | 'split_agent';
  target: string; // agentId or promptId

  /** Details of the action */
  details: PromptImprovement | AgentProposal | Record<string, unknown>;

  /** Approval workflow */
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: Date;

  /** Execution status */
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled_back';
  executedAt?: Date;
  result?: EvolutionResult;

  createdAt?: Date;
}

/**
 * Result of an evolution action
 */
export interface EvolutionResult {
  success: boolean;
  metrics: {
    before: { quality: number; efficiency: number };
    after: { quality: number; efficiency: number };
    improvement: number;
  };
  rollbackAvailable: boolean;
  error?: string;
}

// ============================================================================
// META-LEARNING TYPES
// ============================================================================

/**
 * A learned pattern from successful improvements
 */
export interface MetaPattern {
  id: string;
  name: string;
  description: string;

  /** When to apply this pattern */
  trigger: {
    issueType: string;
    conditions: string[];
  };

  /** What action to take */
  action: {
    promptModification: string;
    examples: string[];
  };

  /** Track record of this pattern */
  performance: {
    timesApplied: number;
    successRate: number;
    averageImprovement: number;
  };

  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Evolution engine configuration
 */
export interface EvolutionConfig {
  enabled: boolean;

  /** Automation levels */
  automation: {
    autoAnalyze: boolean; // Auto-run performance analysis
    autoSuggest: boolean; // Auto-generate improvements
    autoTest: boolean; // Auto-run A/B tests
    autoPromote: boolean; // Auto-promote winning variants
    autoCreateAgents: boolean; // Auto-create new agents (DANGEROUS)
  };

  /** Thresholds for triggering actions */
  thresholds: {
    minBuildsSample: number; // Min builds before analyzing
    qualityDrop: number; // Alert if quality drops by this much
    improvementTarget: number; // Target improvement per optimization
    underperformerThreshold: number; // Score below which agent needs help
  };

  /** Safety settings */
  safety: {
    maxConcurrentExperiments: number;
    maxPromptChangesPerDay: number;
    requireApprovalFor: ('create_agent' | 'deprecate_agent' | 'major_prompt_change')[];
    rollbackOnRegression: boolean;
  };

  /** Analysis settings */
  analysis: {
    defaultPeriodDays: number;
    minSamplesForTrend: number;
    volatilityThreshold: number;
  };
}

/**
 * Default evolution configuration
 */
export const DEFAULT_EVOLUTION_CONFIG: EvolutionConfig = {
  enabled: true,
  automation: {
    autoAnalyze: true,
    autoSuggest: true,
    autoTest: false, // Requires approval
    autoPromote: false, // Requires approval
    autoCreateAgents: false, // Requires approval
  },
  thresholds: {
    minBuildsSample: 10,
    qualityDrop: 0.5,
    improvementTarget: 0.3,
    underperformerThreshold: 6.5,
  },
  safety: {
    maxConcurrentExperiments: 3,
    maxPromptChangesPerDay: 5,
    requireApprovalFor: ['create_agent', 'deprecate_agent', 'major_prompt_change'],
    rollbackOnRegression: true,
  },
  analysis: {
    defaultPeriodDays: 7,
    minSamplesForTrend: 4,
    volatilityThreshold: 2,
  },
};

// ============================================================================
// REPORT TYPES
// ============================================================================

/**
 * Report from an evolution cycle
 */
export interface EvolutionReport {
  status: 'completed' | 'disabled' | 'error';
  startedAt: Date;
  completedAt: Date;
  duration: number;

  /** Actions taken or proposed */
  actions: EvolutionAction[];

  /** Agent analyses */
  analyses?: AgentPerformanceAnalysis[];

  /** New patterns learned */
  patterns?: MetaPattern[];

  /** Capability gaps detected */
  gaps?: string[];

  /** Errors encountered */
  error?: string;

  /** Summary statistics */
  summary?: {
    agentsAnalyzed: number;
    underperformersFound: number;
    improvementsSuggested: number;
    experimentsStarted: number;
    patternsLearned: number;
  };
}

/**
 * Test result for agent validation
 */
export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  qualityScore: number;
  output: string | null;
  error: string | null;
  latencyMs: number;
}

// ============================================================================
// DATABASE SCHEMA TYPES (for Supabase)
// ============================================================================

/**
 * Evolution action record for database
 */
export interface EvolutionActionRecord {
  id: string;
  type: EvolutionAction['type'];
  target: string;
  details: Record<string, unknown>;
  approval_required: boolean;
  approved_by: string | null;
  approved_at: string | null;
  status: EvolutionAction['status'];
  executed_at: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Meta pattern record for database
 */
export interface MetaPatternRecord {
  id: string;
  name: string;
  description: string;
  trigger: Record<string, unknown>;
  action: Record<string, unknown>;
  times_applied: number;
  success_rate: number;
  average_improvement: number;
  created_at: string;
  updated_at: string;
}

/**
 * Agent proposal record for database
 */
export interface AgentProposalRecord {
  id: string;
  identity: Record<string, unknown>;
  justification: Record<string, unknown>;
  definition: Record<string, unknown>;
  testing: Record<string, unknown>;
  status: AgentProposal['status'];
  created_at: string;
  updated_at: string;
}
