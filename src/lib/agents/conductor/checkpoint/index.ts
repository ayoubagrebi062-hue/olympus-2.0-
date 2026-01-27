/**
 * CHECKPOINT MODULE
 *
 * Provides build resilience through state checkpointing and resume.
 *
 * Features:
 * - Save state after each agent completion
 * - Resume from any checkpoint after failure
 * - Skip already-completed agents on resume
 * - Recover gracefully from crashes, timeouts, API failures
 * - Auto-cleanup of expired checkpoints
 * - Compression for large state snapshots
 *
 * Usage:
 * ```typescript
 * import {
 *   CheckpointManager,
 *   createCheckpointStore,
 *   type Checkpoint,
 *   type ResumeOptions,
 * } from './checkpoint';
 *
 * // Create store and manager
 * const store = createCheckpointStore({ type: 'memory' });
 * const manager = new CheckpointManager(store);
 *
 * // Create checkpoint after agent completes
 * await manager.createCheckpoint(
 *   buildId,
 *   tenantId,
 *   agentId,
 *   phase,
 *   sequence,
 *   buildContext,
 *   agentOutputs,
 *   qualityScores,
 *   decisions,
 *   timing,
 *   costs
 * );
 *
 * // Check if build can be resumed
 * const canResume = await manager.canResume(buildId);
 *
 * // Prepare for resume
 * const { checkpoint, context, skipAgents } = await manager.prepareResume(buildId);
 *
 * // After resume completes
 * await manager.completeResume(buildId, result);
 * ```
 */

// ============================================================================
// EXPORTS
// ============================================================================

// Manager
export { CheckpointManager, createCheckpointManager } from './manager';

// Stores
export { InMemoryCheckpointStore, SupabaseCheckpointStore, createCheckpointStore } from './store';

// Compression
export {
  compress,
  decompress,
  compressSync,
  decompressSync,
  estimateCompressionRatio,
  shouldCompress,
  getStringByteSize,
  validateCompression,
  validateCompressionSync,
} from './compression';

// Types
export type {
  // Core types
  Checkpoint,
  CheckpointState,
  CheckpointProgress,
  CheckpointTiming,
  CheckpointCosts,

  // Serialized types
  SerializedBuildContext,
  SerializedBuildPlan,
  SerializedPhase,
  SerializedAgentOutput,
  QualityScoreSnapshot,
  QualityDimensions,
  Decision,

  // Resume types
  ResumeOptions,
  ResumeResult,
  PreparedResume,
  ReconstructedContext,

  // Query types
  CheckpointQuery,
  CheckpointSummary,
  CheckpointStats,

  // Store interface
  ICheckpointStore,

  // Event types
  CheckpointEvent,
  CheckpointEventType,
  CheckpointEventData,

  // Configuration
  CheckpointConfig,

  // Utility types
  CanResumeResult,
  CheckpointValidation,
  SerializationOptions,
} from './types';

// Constants
export { DEFAULT_CHECKPOINT_CONFIG, DEFAULT_SERIALIZATION_OPTIONS } from './types';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { CheckpointManager } from './manager';
import { createCheckpointStore } from './store';
import type { CheckpointConfig, ICheckpointStore } from './types';

/**
 * Create a fully configured checkpoint system
 */
export function createCheckpointSystem(
  config?: Partial<CheckpointConfig> & {
    storeType?: 'memory' | 'supabase';
    supabaseUrl?: string;
    supabaseKey?: string;
  }
): {
  manager: CheckpointManager;
  store: ICheckpointStore;
} {
  const store = createCheckpointStore({
    type: config?.storeType,
    supabaseUrl: config?.supabaseUrl,
    supabaseKey: config?.supabaseKey,
    compressionThreshold: config?.compressionThreshold,
    defaultExpirationDays: config?.defaultExpirationDays,
  });

  const manager = new CheckpointManager(store, config);

  return { manager, store };
}

/**
 * Agent phase mapping for checkpoint organization
 */
export const AGENT_PHASE_MAP: Record<string, string> = {
  // Discovery
  oracle: 'discovery',
  empathy: 'discovery',
  venture: 'discovery',
  strategos: 'discovery',
  scope: 'discovery',

  // Design
  palette: 'design',
  grid: 'design',
  blocks: 'design',
  cartographer: 'design',
  flow: 'design',
  polish: 'design',

  // Architecture
  archon: 'architecture',
  datum: 'architecture',
  nexus: 'architecture',
  forge: 'architecture',
  sentinel: 'architecture',
  atlas: 'architecture',

  // Frontend
  pixel: 'frontend',
  wire: 'frontend',

  // Backend
  engine: 'backend',
  gateway: 'backend',
  keeper: 'backend',
  cron: 'backend',

  // Integration
  bridge: 'integration',
  sync: 'integration',
  notify: 'integration',
  search: 'integration',

  // Testing
  junit: 'testing',
  cypress: 'testing',
  load: 'testing',
  a11y: 'testing',

  // Deployment
  docker: 'deployment',
  pipeline: 'deployment',
  monitor: 'deployment',
  scale: 'deployment',
};

/**
 * Get phase for an agent
 */
export function getAgentPhase(agentId: string): string {
  return AGENT_PHASE_MAP[agentId] || 'unknown';
}

/**
 * Get all agents for a phase
 */
export function getAgentsForPhase(phase: string): string[] {
  return Object.entries(AGENT_PHASE_MAP)
    .filter(([_, p]) => p === phase)
    .map(([agent]) => agent);
}

/**
 * Get ordered list of all agents
 */
export function getAllAgentsOrdered(): string[] {
  const phases = [
    'discovery',
    'design',
    'architecture',
    'frontend',
    'backend',
    'integration',
    'testing',
    'deployment',
  ];
  return phases.flatMap(phase => getAgentsForPhase(phase));
}
