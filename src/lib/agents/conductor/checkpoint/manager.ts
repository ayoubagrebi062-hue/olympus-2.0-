/**
 * Checkpoint Manager
 *
 * High-level API for creating, managing, and restoring checkpoints.
 * Provides the main interface for checkpoint operations in CONDUCTOR.
 *
 * @AUTHORITY_CHECK - Database operations require authorization verification
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Checkpoint,
  CheckpointState,
  CheckpointProgress,
  CheckpointTiming,
  CheckpointCosts,
  ICheckpointStore,
  ResumeOptions,
  ResumeResult,
  PreparedResume,
  ReconstructedContext,
  CheckpointQuery,
  CheckpointSummary,
  CheckpointStats,
  CanResumeResult,
  CheckpointConfig,
  CheckpointEvent,
  CheckpointEventType,
  SerializedBuildContext,
  SerializedAgentOutput,
  QualityScoreSnapshot,
  Decision,
} from './types';
import { DEFAULT_CHECKPOINT_CONFIG } from './types';

// ============================================================================
// CHECKPOINT MANAGER
// ============================================================================

/**
 * Manages checkpoint lifecycle: creation, loading, resume, and cleanup
 */
export class CheckpointManager {
  private store: ICheckpointStore;
  private config: CheckpointConfig;
  private eventListeners: Set<(event: CheckpointEvent) => void> = new Set();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(store: ICheckpointStore, config: Partial<CheckpointConfig> = {}) {
    this.store = store;
    this.config = { ...DEFAULT_CHECKPOINT_CONFIG, ...config };

    // Start cleanup timer if enabled
    if (this.config.enabled && this.config.cleanupIntervalMs > 0) {
      this.startCleanupTimer();
    }
  }

  // ============================================================================
  // CHECKPOINT CREATION
  // ============================================================================

  /**
   * Create a checkpoint after an agent completes
   */
  async createCheckpoint(
    buildId: string,
    tenantId: string,
    agentId: string,
    phase: string,
    sequence: number,
    buildContext: SerializedBuildContext,
    agentOutputs: Map<string, SerializedAgentOutput>,
    qualityScores: Map<string, QualityScoreSnapshot>,
    decisions: Decision[],
    timing: CheckpointTiming,
    costs: CheckpointCosts,
    additionalData?: {
      knowledge?: Record<string, unknown>;
      failedAgents?: string[];
      skippedAgents?: string[];
      pendingAgents?: string[];
      totalAgents?: number;
    }
  ): Promise<Checkpoint> {
    if (!this.config.enabled) {
      throw new Error('Checkpoint system is disabled');
    }

    // Build progress state
    const completedAgents = Array.from(agentOutputs.keys());
    const progress: CheckpointProgress = {
      completedAgents,
      pendingAgents: additionalData?.pendingAgents || [],
      failedAgents: additionalData?.failedAgents || [],
      skippedAgents: additionalData?.skippedAgents || [],
      currentPhase: phase,
      totalAgents: additionalData?.totalAgents || 35,
      completedCount: completedAgents.length,
    };

    // Create checkpoint state
    const state: CheckpointState = {
      buildContext,
      agentOutputs: new Map(agentOutputs),
      qualityScores: new Map(qualityScores),
      decisions: [...decisions],
      knowledge: additionalData?.knowledge || {},
      progress,
      timing: { ...timing },
      costs: {
        ...costs,
        costByAgent: new Map(costs.costByAgent),
      },
    };

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.config.defaultExpirationDays);

    // Create checkpoint
    const checkpoint: Checkpoint = {
      id: uuidv4(),
      buildId,
      tenantId,
      sequence,
      agentId,
      phase,
      state,
      createdAt: new Date(),
      expiresAt,
      sizeBytes: 0, // Will be set by store
      compressed: false, // Will be set by store
    };

    // Save to store
    await this.store.save(checkpoint);

    // Enforce max checkpoints per build
    await this.enforceMaxCheckpoints(buildId);

    // Emit event
    this.emit({
      type: 'checkpoint:created',
      timestamp: new Date(),
      data: { checkpoint },
    });

    return checkpoint;
  }

  /**
   * Determine if a checkpoint should be created based on config
   */
  shouldCreateCheckpoint(agentIndex: number): boolean {
    if (!this.config.enabled || !this.config.autoCheckpoint) {
      return false;
    }
    return (agentIndex + 1) % this.config.checkpointInterval === 0;
  }

  // ============================================================================
  // CHECKPOINT LOADING
  // ============================================================================

  /**
   * Load a checkpoint by ID
   */
  async loadCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
    const checkpoint = await this.store.load(checkpointId);

    if (checkpoint) {
      this.emit({
        type: 'checkpoint:loaded',
        timestamp: new Date(),
        data: { checkpoint },
      });
    }

    return checkpoint;
  }

  /**
   * Load the latest checkpoint for a build
   */
  async loadLatestCheckpoint(buildId: string): Promise<Checkpoint | null> {
    return this.store.loadLatest(buildId);
  }

  /**
   * List checkpoints for a build
   */
  async listCheckpoints(query: CheckpointQuery): Promise<Checkpoint[]> {
    return this.store.list(query);
  }

  /**
   * Get checkpoint summaries for listing (lighter than full checkpoints)
   */
  async getCheckpointSummaries(buildId: string): Promise<CheckpointSummary[]> {
    const checkpoints = await this.store.list({ buildId });

    return checkpoints.map(cp => ({
      id: cp.id,
      sequence: cp.sequence,
      agentId: cp.agentId,
      phase: cp.phase,
      completedAgents: cp.state.progress.completedCount,
      totalAgents: cp.state.progress.totalAgents,
      createdAt: cp.createdAt,
      sizeBytes: cp.sizeBytes,
      compressed: cp.compressed,
    }));
  }

  // ============================================================================
  // RESUME OPERATIONS
  // ============================================================================

  /**
   * Check if a build can be resumed
   */
  async canResume(buildId: string): Promise<CanResumeResult> {
    const checkpoint = await this.store.loadLatest(buildId);

    if (!checkpoint) {
      return {
        canResume: false,
        reason: 'No checkpoints found for this build',
      };
    }

    // Check if expired
    if (checkpoint.expiresAt < new Date()) {
      return {
        canResume: false,
        latestCheckpoint: checkpoint,
        reason: 'Checkpoint has expired',
      };
    }

    // Check if build already completed
    const { completedCount, totalAgents } = checkpoint.state.progress;
    if (completedCount >= totalAgents) {
      return {
        canResume: false,
        latestCheckpoint: checkpoint,
        reason: 'Build already completed',
      };
    }

    return {
      canResume: true,
      latestCheckpoint: checkpoint,
      checkpoint: {
        id: checkpoint.id,
        completedAgents: completedCount,
        totalAgents,
        lastAgent: checkpoint.agentId,
        createdAt: checkpoint.createdAt,
        phase: checkpoint.phase,
      },
    };
  }

  /**
   * Prepare for resuming a build from checkpoint
   */
  async prepareResume(buildId: string, options: ResumeOptions = {}): Promise<PreparedResume> {
    // Load checkpoint
    let checkpoint: Checkpoint | null;

    if (options.fromCheckpoint === 'latest' || !options.fromCheckpoint) {
      checkpoint = await this.store.loadLatest(buildId);
    } else {
      checkpoint = await this.store.load(options.fromCheckpoint);
    }

    if (!checkpoint) {
      throw new Error(`No checkpoint found for build ${buildId}`);
    }

    // Emit resume started
    this.emit({
      type: 'checkpoint:resume_started',
      timestamp: new Date(),
      data: { buildId, fromCheckpoint: checkpoint.id },
    });

    // Reconstruct context from checkpoint
    const context = this.reconstructContext(checkpoint, options);

    // Determine which agents to skip
    const completedAgents = new Set(checkpoint.state.progress.completedAgents);
    const skipAgents = new Set([...completedAgents, ...(options.skipAgents || [])]);

    // If not retrying failed, add them to skip
    if (options.retryFailed === false) {
      checkpoint.state.progress.failedAgents.forEach(a => skipAgents.add(a));
    }

    // Calculate remaining agents
    const allAgents = this.getAllAgentsFromContext(context);
    const remainingAgents = allAgents.filter(a => !skipAgents.has(a));

    // Find starting agent
    const startFromAgent = remainingAgents[0] || checkpoint.agentId;

    return {
      checkpoint,
      context,
      skipAgents: Array.from(skipAgents),
      startFromAgent,
      remainingAgents,
    };
  }

  /**
   * Mark resume as completed
   */
  async completeResume(buildId: string, result: ResumeResult): Promise<void> {
    this.emit({
      type: result.success ? 'checkpoint:resume_completed' : 'checkpoint:resume_failed',
      timestamp: new Date(),
      data: { buildId, result },
    });

    // If completed successfully, optionally clean up old checkpoints
    if (result.finalStatus === 'completed') {
      await this.pruneOldCheckpoints(buildId, 3); // Keep last 3
    }
  }

  // ============================================================================
  // DELETION & CLEANUP
  // ============================================================================

  /**
   * Delete a specific checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    await this.store.delete(checkpointId);

    this.emit({
      type: 'checkpoint:deleted',
      timestamp: new Date(),
      data: { checkpointId },
    });
  }

  /**
   * Delete all checkpoints for a build
   */
  async deleteCheckpointsForBuild(buildId: string): Promise<void> {
    await this.store.deleteForBuild(buildId);
  }

  /**
   * Cleanup expired checkpoints
   */
  async cleanup(): Promise<number> {
    const deletedCount = await this.store.cleanup(new Date());

    if (deletedCount > 0) {
      this.emit({
        type: 'checkpoint:cleanup',
        timestamp: new Date(),
        data: { deletedCount },
      });
    }

    return deletedCount;
  }

  /**
   * Prune old checkpoints, keeping only the most recent N
   */
  async pruneOldCheckpoints(buildId: string, keepCount: number): Promise<number> {
    const checkpoints = await this.store.list({
      buildId,
      orderBy: 'sequence',
      orderDirection: 'desc',
    });

    if (checkpoints.length <= keepCount) {
      return 0;
    }

    const toDelete = checkpoints.slice(keepCount);
    let deletedCount = 0;

    for (const cp of toDelete) {
      await this.store.delete(cp.id);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * Enforce maximum checkpoints per build
   */
  private async enforceMaxCheckpoints(buildId: string): Promise<void> {
    const checkpoints = await this.store.list({ buildId });

    if (checkpoints.length > this.config.maxCheckpointsPerBuild) {
      const toDelete = checkpoints.slice(
        0,
        checkpoints.length - this.config.maxCheckpointsPerBuild
      );
      for (const cp of toDelete) {
        await this.store.delete(cp.id);
      }
    }
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get checkpoint statistics for a build
   */
  async getStats(buildId: string): Promise<CheckpointStats> {
    return this.store.getStats(buildId);
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  /**
   * Subscribe to checkpoint events
   */
  onEvent(listener: (event: CheckpointEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  /**
   * Emit an event
   */
  private emit(event: CheckpointEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[CheckpointManager] Event listener error:', error);
      }
    }
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get current configuration
   */
  getConfig(): CheckpointConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CheckpointConfig>): void {
    this.config = { ...this.config, ...updates };

    // Restart cleanup timer if interval changed
    if (updates.cleanupIntervalMs !== undefined) {
      this.stopCleanupTimer();
      if (this.config.enabled && this.config.cleanupIntervalMs > 0) {
        this.startCleanupTimer();
      }
    }
  }

  /**
   * Enable/disable checkpoint system
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(
      () => this.cleanup().catch(console.error),
      this.config.cleanupIntervalMs
    );
  }

  /**
   * Stop automatic cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Shutdown the manager
   */
  shutdown(): void {
    this.stopCleanupTimer();
    this.eventListeners.clear();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Reconstruct build context from checkpoint
   */
  private reconstructContext(checkpoint: Checkpoint, options: ResumeOptions): ReconstructedContext {
    const { buildContext } = checkpoint.state;

    const context: ReconstructedContext = {
      buildId: buildContext.buildId,
      projectId: buildContext.projectId,
      tenantId: buildContext.tenantId,
      tier: buildContext.tier,
      description: buildContext.description,
      projectType: buildContext.projectType,
      complexity: buildContext.complexity,
      iteration: buildContext.iteration,
      userFeedback: [...buildContext.userFeedback],
      focusAreas: [...buildContext.focusAreas],
      retryHints: buildContext.retryHints ? { ...buildContext.retryHints } : undefined,
      criticalDecisions: buildContext.criticalDecisions
        ? { ...buildContext.criticalDecisions }
        : undefined,
      buildPlan: buildContext.buildPlan,
      agentOutputs: new Map(checkpoint.state.agentOutputs),
      qualityScores: new Map(checkpoint.state.qualityScores),
      decisions: [...checkpoint.state.decisions],
      knowledge: { ...checkpoint.state.knowledge },
      startedAt: checkpoint.state.timing.buildStartedAt,
      tokensUsed: checkpoint.state.costs.tokensUsed,
      estimatedCost: checkpoint.state.costs.estimatedCost,
      costByAgent: new Map(checkpoint.state.costs.costByAgent),
      failedAgents: [...checkpoint.state.progress.failedAgents],
      skippedAgents: [...checkpoint.state.progress.skippedAgents],
      totalAgents: checkpoint.state.progress.totalAgents,
    };

    // Apply modifications if provided
    if (options.modifyContext) {
      Object.assign(context, options.modifyContext);
    }

    return context;
  }

  /**
   * Extract all agents from build plan
   */
  private getAllAgentsFromContext(context: ReconstructedContext): string[] {
    if (context.buildPlan?.phases) {
      return context.buildPlan.phases.flatMap(p => p.agents);
    }

    // Fallback to default agent list
    return [
      // Discovery
      'oracle',
      'empathy',
      'venture',
      'strategos',
      'scope',
      // Design
      'palette',
      'grid',
      'blocks',
      'cartographer',
      'flow',
      'polish',
      // Architecture
      'archon',
      'datum',
      'nexus',
      'forge',
      'sentinel',
      'atlas',
      // Frontend
      'pixel',
      'wire',
      // Backend
      'engine',
      'gateway',
      'keeper',
      'cron',
      // Integration
      'bridge',
      'sync',
      'notify',
      'search',
      // Testing
      'junit',
      'cypress',
      'load',
      'a11y',
      // Deployment
      'docker',
      'pipeline',
      'monitor',
      'scale',
    ];
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a checkpoint manager with default or custom configuration
 */
export function createCheckpointManager(
  store: ICheckpointStore,
  config?: Partial<CheckpointConfig>
): CheckpointManager {
  return new CheckpointManager(store, config);
}
