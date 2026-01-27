/**
 * PROMPT MANAGEMENT Type Definitions
 * Phase 5 of OLYMPUS 50X - CRITICAL for Level 5 (EVOLUTION MODULE)
 *
 * Provides type definitions for:
 * - Prompt records and CRUD operations
 * - A/B testing experiments
 * - Performance tracking
 * - Service configuration
 */

import type { AgentId, BuildPhase } from '../../types';
import type { OutputSchema } from '../../types/definition';

// ============================================================================
// PROMPT RECORDS
// ============================================================================

/**
 * Prompt record from database
 */
export interface PromptRecord {
  id: string;
  agentId: string;
  version: number;
  name?: string;

  // Content
  systemPrompt: string;
  outputSchema?: Record<string, unknown> | OutputSchema;
  examples?: PromptExample[];

  // Status
  status: PromptStatus;
  isDefault: boolean;

  // A/B Testing
  experimentId?: string;
  trafficPercentage: number;

  // Performance metrics (updated by JUDGE module)
  usageCount: number;
  avgQualityScore?: number;
  successRate?: number;
  avgTokensUsed?: number;
  avgLatencyMs?: number;

  // Metadata
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  archivedAt?: Date;
  changeNotes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Prompt status values
 */
export type PromptStatus = 'draft' | 'active' | 'testing' | 'archived';

/**
 * Few-shot example for prompts
 */
export interface PromptExample {
  input: string;
  output: string;
  explanation?: string;
}

// ============================================================================
// CRUD INPUTS
// ============================================================================

/**
 * Input for creating new prompts
 */
export interface CreatePromptInput {
  agentId: string;
  systemPrompt: string;
  name?: string;
  outputSchema?: Record<string, unknown> | OutputSchema;
  examples?: PromptExample[];
  changeNotes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating prompts
 */
export interface UpdatePromptInput {
  systemPrompt?: string;
  name?: string;
  outputSchema?: Record<string, unknown> | OutputSchema;
  examples?: PromptExample[];
  status?: PromptStatus;
  changeNotes?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// LOADED PROMPT (Runtime)
// ============================================================================

/**
 * Loaded prompt - what agents actually use at runtime
 */
export interface LoadedPrompt {
  promptId: string;
  agentId: string;
  version: number;
  systemPrompt: string;
  outputSchema?: Record<string, unknown> | OutputSchema;
  examples?: PromptExample[];
  experimentId?: string;
}

// ============================================================================
// A/B TESTING
// ============================================================================

/**
 * A/B Test Experiment
 */
export interface PromptExperiment {
  id: string;
  agentId: string;
  name: string;
  description?: string;

  // Variants
  controlPromptId: string;
  variantPromptIds: string[];

  // Configuration
  trafficSplit: Record<string, number>; // { "control": 50, "variant_1": 50 }
  minSampleSize: number;

  // Status
  status: ExperimentStatus;
  startedAt?: Date;
  endedAt?: Date;

  // Results
  winnerPromptId?: string;
  results?: ExperimentResults;

  createdBy?: string;
  createdAt: Date;
}

export interface PromptVariant {
  promptId: string;
  name?: string;
  trafficPercentage?: number;
}

/**
 * Experiment status values
 */
export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'cancelled';

/**
 * Experiment results summary
 */
export interface ExperimentResults {
  variants: ExperimentVariantResult[];
  winner?: string;
  confidence: number;
  recommendation: string;
}

/**
 * Results for a single variant in an experiment
 */
export interface ExperimentVariantResult {
  promptId: string;
  name: string;
  sampleSize: number;
  avgQualityScore: number;
  successRate: number;
  avgLatencyMs: number;
  confidenceInterval: [number, number];
}

export type ExperimentPerformance = ExperimentVariantResult;

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

/**
 * Performance record for a single prompt execution
 */
export interface PromptPerformance {
  id: string;
  promptId: string;
  buildId: string;
  qualityScore: number;
  tokensUsed: number;
  latencyMs: number;
  passedValidation: boolean;
  retryCount: number;
  createdAt: Date;
}

/**
 * Input for recording performance (without auto-generated fields)
 */
export interface RecordPerformanceInput {
  promptId: string;
  buildId: string;
  qualityScore: number;
  tokensUsed: number;
  latencyMs: number;
  passedValidation: boolean;
  retryCount: number;
}

/**
 * Aggregated performance statistics for a prompt
 */
export interface PromptStats {
  promptId: string;
  usageCount: number;
  avgQualityScore: number;
  successRate: number;
  avgTokensUsed: number;
  avgLatencyMs: number;
  lastUsedAt?: Date;
}

export type PerformanceStats = PromptStats;

// ============================================================================
// CACHING
// ============================================================================

/**
 * Cached prompt entry
 */
export interface CachedPrompt {
  prompt: LoadedPrompt;
  cachedAt: Date;
  expiresAt: Date;
}

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

/**
 * Prompt service configuration
 */
export interface PromptServiceConfig {
  // Cache settings
  cacheEnabled: boolean;
  cacheTtlMs: number; // Time to live in cache (default: 5 minutes)

  // Fallback settings
  fallbackToHardcoded: boolean; // If DB fails, use hardcoded prompts

  // A/B Testing
  abTestingEnabled: boolean;

  // Performance tracking
  trackPerformance: boolean;
}

/**
 * Default service configuration
 */
export const DEFAULT_PROMPT_SERVICE_CONFIG: PromptServiceConfig = {
  cacheEnabled: true,
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes
  fallbackToHardcoded: true,
  abTestingEnabled: true,
  trackPerformance: true,
};

// ============================================================================
// PROMPT HISTORY
// ============================================================================

/**
 * Prompt change history entry
 */
export interface PromptHistoryEntry {
  id: string;
  promptId: string;
  action: PromptHistoryAction;
  previousContent?: string;
  newContent?: string;
  changedBy?: string;
  changedAt: Date;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export type PromptHistoryRecord = PromptHistoryEntry;

/**
 * Actions recorded in prompt history
 */
export type PromptHistoryAction = 'created' | 'updated' | 'activated' | 'archived';

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Prompt-related event types
 */
export type PromptEventType =
  | 'prompt:loaded'
  | 'prompt:created'
  | 'prompt:updated'
  | 'prompt:activated'
  | 'prompt:archived'
  | 'prompt:cache_hit'
  | 'prompt:cache_miss'
  | 'prompt:fallback_used'
  | 'experiment:started'
  | 'experiment:ended'
  | 'experiment:variant_selected';

/**
 * Prompt event payload
 */
export interface PromptEvent {
  type: PromptEventType;
  agentId: string;
  promptId?: string;
  experimentId?: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

// ============================================================================
// DATABASE ROW TYPES (for mapping)
// ============================================================================

/**
 * Raw database row for agent_prompts table
 */
export interface AgentPromptRow {
  id: string;
  agent_id: string;
  version: number;
  name: string | null;
  system_prompt: string;
  output_schema: Record<string, unknown> | null;
  examples: PromptExample[] | null;
  status: string;
  is_default: boolean;
  experiment_id: string | null;
  traffic_percentage: number | null;
  usage_count: number | null;
  avg_quality_score: number | null;
  success_rate: number | null;
  avg_tokens_used: number | null;
  avg_latency_ms: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  archived_at: string | null;
  change_notes: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Raw database row for prompt_experiments table
 */
export interface PromptExperimentRow {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  control_prompt_id: string;
  variant_prompt_ids: string[] | null;
  traffic_split: Record<string, number>;
  min_sample_size: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  winner_prompt_id: string | null;
  results: ExperimentResults | null;
  created_by: string | null;
  created_at: string;
}

/**
 * Raw database row for prompt_performance table
 */
export interface PromptPerformanceRow {
  id: string;
  prompt_id: string;
  build_id: string;
  quality_score: number | null;
  tokens_used: number | null;
  latency_ms: number | null;
  passed_validation: boolean | null;
  retry_count: number | null;
  created_at: string;
}

/**
 * Raw database row for prompt_history table
 */
export interface PromptHistoryRow {
  id: string;
  prompt_id: string;
  action: string;
  previous_content: string | null;
  new_content: string | null;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
}
