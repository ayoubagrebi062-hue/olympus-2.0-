/**
 * CHECKPOINT SYSTEM Type Definitions
 *
 * Enables build resilience through state checkpointing and resume:
 * - Save state after each agent completion
 * - Resume from any checkpoint after failure
 * - Skip already-completed agents on resume
 * - Recover gracefully from crashes, timeouts, API failures
 */

import type { ProjectType, ProjectComplexity } from '../types';

// ============================================================================
// CORE CHECKPOINT TYPES
// ============================================================================

/**
 * Checkpoint represents a saved state at a point in the build
 */
export interface Checkpoint {
  id: string;
  buildId: string;
  tenantId: string;

  // Position in build
  sequence: number; // Order in the build (1, 2, 3...)
  agentId: string; // Agent that just completed
  phase: string; // Phase name

  // State snapshot
  state: CheckpointState;

  // Metadata
  createdAt: Date;
  expiresAt: Date; // Auto-cleanup old checkpoints
  sizeBytes: number; // For monitoring
  compressed: boolean; // If state is compressed
}

/**
 * The actual state saved at checkpoint
 */
export interface CheckpointState {
  // Build context at this point
  buildContext: SerializedBuildContext;

  // All agent outputs so far
  agentOutputs: Map<string, SerializedAgentOutput>;

  // Quality scores so far
  qualityScores: Map<string, QualityScoreSnapshot>;

  // Decisions made
  decisions: Decision[];

  // Accumulated knowledge
  knowledge: Record<string, unknown>;

  // Execution progress
  progress: CheckpointProgress;

  // Timing
  timing: CheckpointTiming;

  // Cost tracking
  costs: CheckpointCosts;
}

/**
 * Progress tracking within checkpoint
 */
export interface CheckpointProgress {
  completedAgents: string[];
  pendingAgents: string[];
  failedAgents: string[];
  skippedAgents: string[];
  currentPhase: string;
  totalAgents: number;
  completedCount: number;
}

/**
 * Timing information in checkpoint
 */
export interface CheckpointTiming {
  buildStartedAt: Date;
  lastAgentDuration?: number;
  totalElapsedMs?: number;
  estimatedRemainingMs?: number;
  checkpointCreatedAt?: Date;
  totalDurationMs?: number;
  agentDurations?: Map<string, number>;
}

/**
 * Cost tracking in checkpoint
 */
export interface CheckpointCosts {
  tokensUsed: number;
  estimatedCost: number;
  costByAgent: Map<string, number>;
}

// ============================================================================
// SERIALIZED TYPES (for storage)
// ============================================================================

/**
 * Serializable version of BuildContext
 */
export interface SerializedBuildContext {
  buildId: string;
  projectId: string;
  tenantId: string;
  tier: string;
  description: string;
  projectType: string;
  complexity: string;
  iteration: number;
  userFeedback: string[];
  focusAreas: string[];
  retryHints?: Record<string, unknown>;
  criticalDecisions?: Record<string, unknown>;
  buildPlan?: SerializedBuildPlan;
}

/**
 * Serializable build plan
 */
export interface SerializedBuildPlan {
  buildId?: string;
  tier?: string;
  phases: SerializedPhase[];
  totalAgents: number;
  estimatedTokens: number;
  estimatedCost: number;
}

/**
 * Serializable phase
 */
export interface SerializedPhase {
  name: string;
  agents: string[];
  estimatedTokens: number;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
}

/**
 * Serializable version of AgentOutput
 */
export interface SerializedAgentOutput {
  agentId: string;
  data?: unknown;
  output?: Record<string, unknown>;
  timestamp?: string;
  completedAt?: Date;
  duration?: number;
  tokensUsed?: number;
  qualityScore?: number;
  phase?: string;
}

/**
 * Quality score snapshot
 */
export interface QualityScoreSnapshot {
  overall: number;
  dimensions: QualityDimensions;
  confidence: number;
}

/**
 * Quality dimensions
 */
export interface QualityDimensions {
  completeness: number;
  correctness: number;
  accuracy?: number;
  consistency: number;
  creativity: number;
  clarity: number;
  relevance?: number;
}

/**
 * Decision record
 */
export interface Decision {
  type?: string;
  agentId?: string;
  decision?: string;
  reason?: string;
  timestamp?: Date;
  key?: string;
  value?: unknown;
  madeBy?: string;
  madeAt?: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// RESUME TYPES
// ============================================================================

/**
 * Options for resuming a build
 */
export interface ResumeOptions {
  fromCheckpoint?: string; // Specific checkpoint ID, or 'latest'
  skipAgents?: string[]; // Agents to skip even if not completed
  retryFailed?: boolean; // Retry agents that failed (default: true)
  modifyContext?: Partial<SerializedBuildContext>; // Override context values
  maxRetries?: number; // Max retries per agent
  modifyStrategy?: {
    maxParallelAgents?: number;
    enableQualityChecks?: boolean;
  };
}

/**
 * Result of a resume operation
 */
export interface ResumeResult {
  success: boolean;
  resumedFromCheckpoint: string;
  skippedAgents: string[];
  retriedAgents: string[];
  newCheckpoints: string[];
  finalStatus: 'completed' | 'failed' | 'paused';
  error?: string;
  completedCount?: number;
  totalAgents?: number;
}

/**
 * Prepared resume data
 */
export interface PreparedResume {
  checkpoint: Checkpoint;
  context: ReconstructedContext;
  skipAgents: string[];
  startFromAgent: string;
  remainingAgents: string[];
}

/**
 * Reconstructed context from checkpoint
 */
export interface ReconstructedContext {
  buildId: string;
  projectId: string;
  tenantId: string;
  tier: string;
  description: string;
  projectType: string;
  complexity: string;
  iteration: number;
  userFeedback: string[];
  focusAreas: string[];
  retryHints?: Record<string, unknown>;
  criticalDecisions?: Record<string, unknown>;
  buildPlan?: SerializedBuildPlan;
  agentOutputs: Map<string, SerializedAgentOutput>;
  qualityScores: Map<string, QualityScoreSnapshot>;
  decisions: Decision[];
  knowledge: Record<string, unknown>;
  startedAt?: Date;
  tokensUsed?: number;
  estimatedCost?: number;
  costByAgent?: Map<string, number>;
  failedAgents?: string[];
  skippedAgents?: string[];
  totalAgents?: number;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

/**
 * Checkpoint query options
 */
export interface CheckpointQuery {
  buildId?: string;
  tenantId?: string;
  agentId?: string;
  phase?: string;
  limit?: number;
  offset?: number;
  includeExpired?: boolean;
  orderBy?: 'sequence' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Checkpoint summary for listing
 */
export interface CheckpointSummary {
  id: string;
  sequence: number;
  agentId: string;
  phase: string;
  completedAgents: number;
  totalAgents: number;
  createdAt: Date;
  sizeBytes: number;
  compressed: boolean;
}

/**
 * Checkpoint statistics
 */
export interface CheckpointStats {
  checkpointCount: number;
  totalSizeBytes: number;
  oldestCheckpoint: Date | null;
  latestCheckpoint: Date | null;
  completionPercent: number;
  averageSizeBytes: number;
  compressedCount: number;
}

// ============================================================================
// STORAGE INTERFACE
// ============================================================================

/**
 * Checkpoint storage interface (for different backends)
 */
export interface ICheckpointStore {
  save(checkpoint: Checkpoint): Promise<void>;
  load(checkpointId: string): Promise<Checkpoint | null>;
  loadLatest(buildId: string): Promise<Checkpoint | null>;
  list(query: CheckpointQuery): Promise<Checkpoint[]>;
  delete(checkpointId: string): Promise<void>;
  deleteForBuild(buildId: string): Promise<void>;
  cleanup(olderThan: Date): Promise<number>; // Returns count deleted
  getStats(buildId: string): Promise<CheckpointStats>;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Checkpoint event types
 */
export type CheckpointEventType =
  | 'checkpoint:created'
  | 'checkpoint:loaded'
  | 'checkpoint:resume_started'
  | 'checkpoint:resume_completed'
  | 'checkpoint:resume_failed'
  | 'checkpoint:expired'
  | 'checkpoint:deleted'
  | 'checkpoint:cleanup';

/**
 * Checkpoint event
 */
export interface CheckpointEvent {
  type: CheckpointEventType;
  timestamp: Date;
  data: CheckpointEventData;
}

/**
 * Checkpoint event data union
 */
export type CheckpointEventData =
  | { checkpoint: Checkpoint }
  | { checkpointId: string }
  | { buildId: string; fromCheckpoint: string }
  | { buildId: string; result: ResumeResult }
  | { deletedCount: number }
  | { error: string };

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Checkpoint manager configuration
 */
export interface CheckpointConfig {
  enabled: boolean;
  autoCheckpoint: boolean;
  checkpointInterval: number; // Create checkpoint every N agents
  compressionThreshold: number; // Bytes, compress if larger
  defaultExpirationDays: number; // Auto-expire after N days
  maxCheckpointsPerBuild: number; // Limit per build
  cleanupIntervalMs: number; // How often to run cleanup
}

/**
 * Default checkpoint configuration
 */
export const DEFAULT_CHECKPOINT_CONFIG: CheckpointConfig = {
  enabled: true,
  autoCheckpoint: true,
  checkpointInterval: 1, // Every agent
  compressionThreshold: 10 * 1024, // 10KB
  defaultExpirationDays: 7, // 7 days
  maxCheckpointsPerBuild: 50, // Max 50 per build
  cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Result of canResume check
 */
export interface CanResumeResult {
  canResume: boolean;
  latestCheckpoint?: Checkpoint;
  reason?: string;
  checkpoint?: {
    id: string;
    completedAgents: number;
    totalAgents: number;
    lastAgent: string;
    createdAt: Date;
    phase: string;
  };
}

/**
 * Checkpoint validation result
 */
export interface CheckpointValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Serialization options
 */
export interface SerializationOptions {
  compress: boolean;
  includeOutputData: boolean;
  maxOutputSize: number;
}

/**
 * Default serialization options
 */
export const DEFAULT_SERIALIZATION_OPTIONS: SerializationOptions = {
  compress: true,
  includeOutputData: true,
  maxOutputSize: 1024 * 1024, // 1MB max per output
};
