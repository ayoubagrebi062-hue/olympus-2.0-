/**
 * OLYMPUS 2.1 - 10X UPGRADE: Build Checkpointing System
 *
 * NEVER LOSE PROGRESS AGAIN.
 *
 * What it does:
 * - Saves state after each phase completion
 * - Enables resume from any checkpoint
 * - Survives server restarts
 * - Enables rollback to previous states
 * - Tracks incremental changes for smart rebuilds
 */

import { logger } from '../observability/logger';
import { incCounter, setGauge } from '../observability/metrics';

// ============================================================================
// TYPES
// ============================================================================

export interface CheckpointData {
  /** Unique checkpoint ID */
  id: string;
  /** Build this checkpoint belongs to */
  buildId: string;
  /** Phase that was just completed */
  phaseId: string;
  /** Phase name for display */
  phaseName: string;
  /** Timestamp of checkpoint creation */
  timestamp: number;
  /** All outputs generated up to this point */
  outputs: Map<string, PhaseOutput>;
  /** Current build configuration */
  config: BuildConfig;
  /** Agent states at this checkpoint */
  agentStates: Map<string, AgentCheckpointState>;
  /** Quality scores accumulated */
  qualityScores: Map<string, number>;
  /** Tokens used up to this point */
  tokensUsed: number;
  /** Cost accrued up to this point */
  costAccrued: number;
  /** Time elapsed up to this point (ms) */
  elapsedTime: number;
  /** Hash of inputs that produced this state */
  inputHash: string;
  /** Parent checkpoint ID (for rollback chain) */
  parentCheckpointId?: string;
  /** Metadata for debugging */
  metadata: Record<string, unknown>;
}

export interface PhaseOutput {
  phaseId: string;
  artifacts: Artifact[];
  success: boolean;
  duration: number;
  tokensUsed: number;
  qualityScore?: number;
}

export interface Artifact {
  id: string;
  type: 'schema' | 'component' | 'api' | 'config' | 'test' | 'migration' | 'style';
  path: string;
  content: string;
  hash: string;
  agentId: string;
  dependencies: string[];
}

export interface BuildConfig {
  prompt: string;
  model: string;
  maxTokens: number;
  qualityThreshold: number;
  phases: string[];
  enabledAgents: string[];
}

export interface AgentCheckpointState {
  agentId: string;
  status: 'idle' | 'running' | 'complete' | 'failed';
  lastOutput?: string;
  tokensUsed: number;
  attempts: number;
  errors: string[];
}

export interface CheckpointStorage {
  save(checkpoint: CheckpointData): Promise<void>;
  load(checkpointId: string): Promise<CheckpointData | null>;
  loadLatest(buildId: string): Promise<CheckpointData | null>;
  list(buildId: string): Promise<CheckpointMetadata[]>;
  delete(checkpointId: string): Promise<void>;
  deleteAllForBuild(buildId: string): Promise<void>;
}

export interface CheckpointMetadata {
  id: string;
  buildId: string;
  phaseId: string;
  phaseName: string;
  timestamp: number;
  tokensUsed: number;
  costAccrued: number;
}

export interface ResumeOptions {
  /** Checkpoint to resume from */
  checkpointId: string;
  /** Override config for resumed build */
  configOverrides?: Partial<BuildConfig>;
  /** Skip phases that haven't changed */
  incrementalMode?: boolean;
  /** Force re-run of specific phases */
  forcePhases?: string[];
}

export interface ResumeResult {
  success: boolean;
  checkpoint: CheckpointData;
  skippedPhases: string[];
  remainingPhases: string[];
  estimatedTokensSaved: number;
  estimatedTimeSaved: number;
}

// ============================================================================
// IN-MEMORY STORAGE (Development) - WITH MEMORY LIMITS AND TTL
// ============================================================================

interface StorageConfig {
  /** Maximum number of checkpoints to keep */
  maxCheckpoints: number;
  /** Maximum total size in bytes (approximate) */
  maxSizeBytes: number;
  /** TTL for checkpoints in milliseconds (default: 24 hours) */
  ttlMs: number;
  /** Cleanup interval in milliseconds */
  cleanupIntervalMs: number;
}

interface StoredCheckpoint {
  data: CheckpointData;
  lastAccessed: number;
  sizeBytes: number;
}

class InMemoryCheckpointStorage implements CheckpointStorage {
  private checkpoints = new Map<string, StoredCheckpoint>();
  private buildIndex = new Map<string, string[]>(); // buildId -> checkpointIds
  private accessOrder: string[] = []; // LRU tracking
  private totalSizeBytes = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private config: StorageConfig = {
    maxCheckpoints: 100,
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    ttlMs: 24 * 60 * 60 * 1000, // 24 hours
    cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  };

  constructor(config?: Partial<StorageConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.startCleanupTimer();
  }

  async save(checkpoint: CheckpointData): Promise<void> {
    // Estimate size (rough approximation)
    const sizeBytes = this.estimateSize(checkpoint);

    // Evict if necessary before adding
    await this.evictIfNeeded(sizeBytes);

    // Serialize Maps for storage
    const serializable = this.serialize(checkpoint);

    // Remove old entry if exists (for size tracking)
    const existing = this.checkpoints.get(checkpoint.id);
    if (existing) {
      this.totalSizeBytes -= existing.sizeBytes;
      this.accessOrder = this.accessOrder.filter(id => id !== checkpoint.id);
    }

    // Store with metadata
    this.checkpoints.set(checkpoint.id, {
      data: serializable,
      lastAccessed: Date.now(),
      sizeBytes,
    });
    this.totalSizeBytes += sizeBytes;
    this.accessOrder.push(checkpoint.id);

    // Update build index
    const buildCheckpoints = this.buildIndex.get(checkpoint.buildId) || [];
    if (!buildCheckpoints.includes(checkpoint.id)) {
      buildCheckpoints.push(checkpoint.id);
      this.buildIndex.set(checkpoint.buildId, buildCheckpoints);
    }

    setGauge('olympus_checkpoint_count', this.checkpoints.size);
    setGauge('olympus_checkpoint_size_bytes', this.totalSizeBytes);

    logger.debug('Checkpoint saved to memory', {
      checkpointId: checkpoint.id,
      buildId: checkpoint.buildId,
      phaseId: checkpoint.phaseId,
      sizeBytes,
      totalCheckpoints: this.checkpoints.size,
      totalSizeBytes: this.totalSizeBytes,
    });
  }

  async load(checkpointId: string): Promise<CheckpointData | null> {
    const stored = this.checkpoints.get(checkpointId);
    if (!stored) return null;

    // Check TTL
    if (Date.now() - stored.lastAccessed > this.config.ttlMs) {
      await this.delete(checkpointId);
      return null;
    }

    // Update LRU
    stored.lastAccessed = Date.now();
    this.accessOrder = this.accessOrder.filter(id => id !== checkpointId);
    this.accessOrder.push(checkpointId);

    return this.deserialize(stored.data);
  }

  async loadLatest(buildId: string): Promise<CheckpointData | null> {
    const checkpointIds = this.buildIndex.get(buildId);
    if (!checkpointIds || checkpointIds.length === 0) return null;

    // Get most recent by timestamp (excluding expired)
    let latest: CheckpointData | null = null;
    const now = Date.now();

    for (const id of checkpointIds) {
      const stored = this.checkpoints.get(id);
      if (!stored) continue;

      // Skip expired
      if (now - stored.lastAccessed > this.config.ttlMs) continue;

      if (!latest || stored.data.timestamp > latest.timestamp) {
        latest = stored.data;
      }
    }

    return latest ? this.deserialize(latest) : null;
  }

  async list(buildId: string): Promise<CheckpointMetadata[]> {
    const checkpointIds = this.buildIndex.get(buildId) || [];
    const now = Date.now();

    return checkpointIds
      .map(id => {
        const stored = this.checkpoints.get(id);
        if (!stored) return null;

        // Skip expired
        if (now - stored.lastAccessed > this.config.ttlMs) return null;

        return {
          id: stored.data.id,
          buildId: stored.data.buildId,
          phaseId: stored.data.phaseId,
          phaseName: stored.data.phaseName,
          timestamp: stored.data.timestamp,
          tokensUsed: stored.data.tokensUsed,
          costAccrued: stored.data.costAccrued,
        };
      })
      .filter((m): m is CheckpointMetadata => m !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async delete(checkpointId: string): Promise<void> {
    const stored = this.checkpoints.get(checkpointId);
    if (stored) {
      this.totalSizeBytes -= stored.sizeBytes;
      this.checkpoints.delete(checkpointId);
      this.accessOrder = this.accessOrder.filter(id => id !== checkpointId);

      const buildId = stored.data.buildId;
      const existing = this.buildIndex.get(buildId) || [];
      this.buildIndex.set(
        buildId,
        existing.filter(id => id !== checkpointId)
      );

      setGauge('olympus_checkpoint_count', this.checkpoints.size);
      setGauge('olympus_checkpoint_size_bytes', this.totalSizeBytes);
    }
  }

  async deleteAllForBuild(buildId: string): Promise<void> {
    const checkpointIds = this.buildIndex.get(buildId) || [];
    for (const id of checkpointIds) {
      const stored = this.checkpoints.get(id);
      if (stored) {
        this.totalSizeBytes -= stored.sizeBytes;
      }
      this.checkpoints.delete(id);
      this.accessOrder = this.accessOrder.filter(cpId => cpId !== id);
    }
    this.buildIndex.delete(buildId);

    setGauge('olympus_checkpoint_count', this.checkpoints.size);
    setGauge('olympus_checkpoint_size_bytes', this.totalSizeBytes);
  }

  /**
   * Cleanup resources - MUST be called on shutdown
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.checkpoints.clear();
    this.buildIndex.clear();
    this.accessOrder = [];
    this.totalSizeBytes = 0;
  }

  /**
   * Get storage statistics
   */
  getStats(): { count: number; sizeBytes: number; oldestAge: number } {
    let oldestTimestamp = Date.now();
    for (const stored of this.checkpoints.values()) {
      if (stored.lastAccessed < oldestTimestamp) {
        oldestTimestamp = stored.lastAccessed;
      }
    }

    return {
      count: this.checkpoints.size,
      sizeBytes: this.totalSizeBytes,
      oldestAge: Date.now() - oldestTimestamp,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async evictIfNeeded(newSize: number): Promise<void> {
    // Evict expired entries first
    await this.evictExpired();

    // Evict by count limit
    while (this.checkpoints.size >= this.config.maxCheckpoints && this.accessOrder.length > 0) {
      const oldestId = this.accessOrder[0];
      logger.debug('Evicting checkpoint (count limit)', { checkpointId: oldestId });
      incCounter('olympus_checkpoint_evictions', 1, { reason: 'count' });
      await this.delete(oldestId);
    }

    // Evict by size limit
    while (
      this.totalSizeBytes + newSize > this.config.maxSizeBytes &&
      this.accessOrder.length > 0
    ) {
      const oldestId = this.accessOrder[0];
      logger.debug('Evicting checkpoint (size limit)', { checkpointId: oldestId });
      incCounter('olympus_checkpoint_evictions', 1, { reason: 'size' });
      await this.delete(oldestId);
    }
  }

  private async evictExpired(): Promise<void> {
    const now = Date.now();
    const expired: string[] = [];

    for (const [id, stored] of this.checkpoints) {
      if (now - stored.lastAccessed > this.config.ttlMs) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      logger.debug('Evicting checkpoint (TTL expired)', { checkpointId: id });
      incCounter('olympus_checkpoint_evictions', 1, { reason: 'ttl' });
      await this.delete(id);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.evictExpired().catch(error => {
        logger.error('Checkpoint cleanup failed', {
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
    }, this.config.cleanupIntervalMs);

    // Don't keep process alive just for cleanup
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private estimateSize(checkpoint: CheckpointData): number {
    // Rough size estimation
    let size = 200; // Base overhead

    // Estimate outputs size
    for (const output of checkpoint.outputs.values()) {
      size += 100; // Object overhead
      for (const artifact of output.artifacts) {
        size += artifact.content.length * 2; // UTF-16
        size += artifact.path.length * 2;
        size += 100; // Artifact overhead
      }
    }

    // Estimate config size
    size += JSON.stringify(checkpoint.config).length * 2;

    // Agent states
    size += checkpoint.agentStates.size * 200;

    // Metadata
    size += JSON.stringify(checkpoint.metadata).length * 2;

    return size;
  }

  private serialize(checkpoint: CheckpointData): CheckpointData {
    return {
      ...checkpoint,
      outputs: new Map(checkpoint.outputs),
      agentStates: new Map(checkpoint.agentStates),
      qualityScores: new Map(checkpoint.qualityScores),
    };
  }

  private deserialize(data: CheckpointData): CheckpointData {
    return {
      ...data,
      outputs: new Map(data.outputs),
      agentStates: new Map(data.agentStates),
      qualityScores: new Map(data.qualityScores),
    };
  }
}

// ============================================================================
// REDIS STORAGE (Production)
// ============================================================================

class RedisCheckpointStorage implements CheckpointStorage {
  private redis: {
    set: (key: string, value: string, options?: { ex?: number }) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    del: (key: string) => Promise<void>;
    keys: (pattern: string) => Promise<string[]>;
    sadd: (key: string, ...members: string[]) => Promise<void>;
    smembers: (key: string) => Promise<string[]>;
    srem: (key: string, ...members: string[]) => Promise<void>;
  } | null = null;

  private readonly keyPrefix = 'olympus:checkpoint:';
  private readonly indexPrefix = 'olympus:build:checkpoints:';
  private readonly ttlSeconds = 60 * 60 * 24 * 7; // 7 days

  constructor(redisClient?: unknown) {
    // In production, pass actual Redis client
    this.redis = redisClient as typeof this.redis;
  }

  async save(checkpoint: CheckpointData): Promise<void> {
    if (!this.redis) {
      logger.warn('Redis not available, checkpoint not persisted');
      return;
    }

    const key = `${this.keyPrefix}${checkpoint.id}`;
    const serialized = this.serializeForRedis(checkpoint);

    await this.redis.set(key, serialized, { ex: this.ttlSeconds });
    await this.redis.sadd(`${this.indexPrefix}${checkpoint.buildId}`, checkpoint.id);

    logger.info('Checkpoint saved to Redis', {
      checkpointId: checkpoint.id,
      buildId: checkpoint.buildId,
    });
  }

  async load(checkpointId: string): Promise<CheckpointData | null> {
    if (!this.redis) return null;

    const key = `${this.keyPrefix}${checkpointId}`;
    const data = await this.redis.get(key);

    return data ? this.deserializeFromRedis(data) : null;
  }

  async loadLatest(buildId: string): Promise<CheckpointData | null> {
    if (!this.redis) return null;

    const checkpointIds = await this.redis.smembers(`${this.indexPrefix}${buildId}`);
    if (checkpointIds.length === 0) return null;

    let latest: CheckpointData | null = null;
    for (const id of checkpointIds) {
      const cp = await this.load(id);
      if (cp && (!latest || cp.timestamp > latest.timestamp)) {
        latest = cp;
      }
    }

    return latest;
  }

  async list(buildId: string): Promise<CheckpointMetadata[]> {
    if (!this.redis) return [];

    const checkpointIds = await this.redis.smembers(`${this.indexPrefix}${buildId}`);
    const results: CheckpointMetadata[] = [];

    for (const id of checkpointIds) {
      const cp = await this.load(id);
      if (cp) {
        results.push({
          id: cp.id,
          buildId: cp.buildId,
          phaseId: cp.phaseId,
          phaseName: cp.phaseName,
          timestamp: cp.timestamp,
          tokensUsed: cp.tokensUsed,
          costAccrued: cp.costAccrued,
        });
      }
    }

    return results.sort((a, b) => a.timestamp - b.timestamp);
  }

  async delete(checkpointId: string): Promise<void> {
    if (!this.redis) return;

    const cp = await this.load(checkpointId);
    if (cp) {
      await this.redis.del(`${this.keyPrefix}${checkpointId}`);
      await this.redis.srem(`${this.indexPrefix}${cp.buildId}`, checkpointId);
    }
  }

  async deleteAllForBuild(buildId: string): Promise<void> {
    if (!this.redis) return;

    const checkpointIds = await this.redis.smembers(`${this.indexPrefix}${buildId}`);
    for (const id of checkpointIds) {
      await this.redis.del(`${this.keyPrefix}${id}`);
    }
    await this.redis.del(`${this.indexPrefix}${buildId}`);
  }

  private serializeForRedis(checkpoint: CheckpointData): string {
    return JSON.stringify({
      ...checkpoint,
      outputs: Array.from(checkpoint.outputs.entries()),
      agentStates: Array.from(checkpoint.agentStates.entries()),
      qualityScores: Array.from(checkpoint.qualityScores.entries()),
    });
  }

  private deserializeFromRedis(data: string): CheckpointData {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      outputs: new Map(parsed.outputs),
      agentStates: new Map(parsed.agentStates),
      qualityScores: new Map(parsed.qualityScores),
    };
  }
}

// ============================================================================
// CHECKPOINT MANAGER
// ============================================================================

export class CheckpointManager {
  private storage: CheckpointStorage;
  private activeBuilds = new Map<string, CheckpointData[]>();

  constructor(storage?: CheckpointStorage) {
    this.storage = storage || new InMemoryCheckpointStorage();
  }

  /**
   * Create a checkpoint after phase completion
   */
  async createCheckpoint(
    buildId: string,
    phaseId: string,
    phaseName: string,
    data: {
      outputs: Map<string, PhaseOutput>;
      config: BuildConfig;
      agentStates: Map<string, AgentCheckpointState>;
      qualityScores: Map<string, number>;
      tokensUsed: number;
      costAccrued: number;
      elapsedTime: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<CheckpointData> {
    const parentCheckpoint = await this.storage.loadLatest(buildId);

    const checkpoint: CheckpointData = {
      id: `cp_${buildId}_${phaseId}_${Date.now()}`,
      buildId,
      phaseId,
      phaseName,
      timestamp: Date.now(),
      outputs: data.outputs,
      config: data.config,
      agentStates: data.agentStates,
      qualityScores: data.qualityScores,
      tokensUsed: data.tokensUsed,
      costAccrued: data.costAccrued,
      elapsedTime: data.elapsedTime,
      inputHash: this.computeInputHash(data.config),
      parentCheckpointId: parentCheckpoint?.id,
      metadata: data.metadata || {},
    };

    await this.storage.save(checkpoint);

    // Track in memory for quick access
    const buildCheckpoints = this.activeBuilds.get(buildId) || [];
    buildCheckpoints.push(checkpoint);
    this.activeBuilds.set(buildId, buildCheckpoints);

    incCounter('olympus_checkpoints_created');
    setGauge('olympus_checkpoint_size_bytes', JSON.stringify(checkpoint).length);

    logger.info('Checkpoint created', {
      checkpointId: checkpoint.id,
      buildId,
      phaseId,
      phaseName,
      tokensUsed: data.tokensUsed,
      costAccrued: data.costAccrued,
    });

    return checkpoint;
  }

  /**
   * Resume build from checkpoint
   */
  async resumeFromCheckpoint(options: ResumeOptions): Promise<ResumeResult> {
    const checkpoint = await this.storage.load(options.checkpointId);

    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${options.checkpointId}`);
    }

    // Merge config overrides
    const config: BuildConfig = {
      ...checkpoint.config,
      ...options.configOverrides,
    };

    // Determine which phases to skip
    const completedPhases = Array.from(checkpoint.outputs.keys());
    let skippedPhases: string[] = [];
    let remainingPhases: string[] = [];

    if (options.incrementalMode) {
      // Check which phases have unchanged inputs
      const currentInputHash = this.computeInputHash(config);
      if (currentInputHash === checkpoint.inputHash) {
        skippedPhases = completedPhases.filter(p => !options.forcePhases?.includes(p));
      }
    } else {
      skippedPhases = completedPhases;
    }

    remainingPhases = config.phases.filter(
      p => !skippedPhases.includes(p) || options.forcePhases?.includes(p)
    );

    // Estimate savings
    const avgTokensPerPhase = checkpoint.tokensUsed / completedPhases.length;
    const avgTimePerPhase = checkpoint.elapsedTime / completedPhases.length;
    const estimatedTokensSaved = skippedPhases.length * avgTokensPerPhase;
    const estimatedTimeSaved = skippedPhases.length * avgTimePerPhase;

    incCounter('olympus_checkpoint_resumes');

    logger.info('Resuming from checkpoint', {
      checkpointId: options.checkpointId,
      buildId: checkpoint.buildId,
      skippedPhases: skippedPhases.length,
      remainingPhases: remainingPhases.length,
      estimatedTokensSaved,
      estimatedTimeSaved,
    });

    return {
      success: true,
      checkpoint,
      skippedPhases,
      remainingPhases,
      estimatedTokensSaved,
      estimatedTimeSaved,
    };
  }

  /**
   * Rollback to a previous checkpoint
   */
  async rollbackToCheckpoint(buildId: string, targetCheckpointId: string): Promise<CheckpointData> {
    const checkpoints = await this.storage.list(buildId);
    const targetIndex = checkpoints.findIndex(cp => cp.id === targetCheckpointId);

    if (targetIndex === -1) {
      throw new Error(`Checkpoint not found: ${targetCheckpointId}`);
    }

    // Delete all checkpoints after the target
    const toDelete = checkpoints.slice(targetIndex + 1);
    for (const cp of toDelete) {
      await this.storage.delete(cp.id);
    }

    const checkpoint = await this.storage.load(targetCheckpointId);
    if (!checkpoint) {
      throw new Error(`Failed to load checkpoint: ${targetCheckpointId}`);
    }

    incCounter('olympus_checkpoint_rollbacks');

    logger.info('Rolled back to checkpoint', {
      buildId,
      targetCheckpointId,
      deletedCheckpoints: toDelete.length,
    });

    return checkpoint;
  }

  /**
   * Get all checkpoints for a build
   */
  async getCheckpoints(buildId: string): Promise<CheckpointMetadata[]> {
    return this.storage.list(buildId);
  }

  /**
   * Get latest checkpoint for a build
   */
  async getLatestCheckpoint(buildId: string): Promise<CheckpointData | null> {
    return this.storage.loadLatest(buildId);
  }

  /**
   * Load specific checkpoint
   */
  async loadCheckpoint(checkpointId: string): Promise<CheckpointData | null> {
    return this.storage.load(checkpointId);
  }

  /**
   * Compare two checkpoints to find differences
   */
  async compareCheckpoints(checkpointId1: string, checkpointId2: string): Promise<CheckpointDiff> {
    const cp1 = await this.storage.load(checkpointId1);
    const cp2 = await this.storage.load(checkpointId2);

    if (!cp1 || !cp2) {
      throw new Error('One or both checkpoints not found');
    }

    const addedPhases: string[] = [];
    const removedPhases: string[] = [];
    const modifiedPhases: string[] = [];
    const artifactChanges: ArtifactChange[] = [];

    // Compare phases
    const phases1 = new Set(cp1.outputs.keys());
    const phases2 = new Set(cp2.outputs.keys());

    for (const p of phases2) {
      if (!phases1.has(p)) {
        addedPhases.push(p);
      } else {
        // Check if artifacts changed
        const output1 = cp1.outputs.get(p);
        const output2 = cp2.outputs.get(p);
        if (output1 && output2) {
          const hasChanges = this.comparePhaseOutputs(output1, output2, artifactChanges);
          if (hasChanges) {
            modifiedPhases.push(p);
          }
        }
      }
    }

    for (const p of phases1) {
      if (!phases2.has(p)) {
        removedPhases.push(p);
      }
    }

    return {
      checkpoint1: { id: cp1.id, timestamp: cp1.timestamp },
      checkpoint2: { id: cp2.id, timestamp: cp2.timestamp },
      addedPhases,
      removedPhases,
      modifiedPhases,
      artifactChanges,
      tokensDelta: cp2.tokensUsed - cp1.tokensUsed,
      costDelta: cp2.costAccrued - cp1.costAccrued,
      timeDelta: cp2.elapsedTime - cp1.elapsedTime,
    };
  }

  /**
   * Clean up old checkpoints
   */
  async cleanup(buildId: string, keepCount = 5): Promise<number> {
    const checkpoints = await this.storage.list(buildId);

    if (checkpoints.length <= keepCount) {
      return 0;
    }

    // Keep the most recent ones
    const toDelete = checkpoints.slice(0, -keepCount);
    for (const cp of toDelete) {
      await this.storage.delete(cp.id);
    }

    logger.info('Cleaned up old checkpoints', {
      buildId,
      deleted: toDelete.length,
      kept: keepCount,
    });

    return toDelete.length;
  }

  /**
   * Delete all checkpoints for a build
   */
  async deleteAll(buildId: string): Promise<void> {
    await this.storage.deleteAllForBuild(buildId);
    this.activeBuilds.delete(buildId);

    logger.info('Deleted all checkpoints', { buildId });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private computeInputHash(config: BuildConfig): string {
    const input = JSON.stringify({
      prompt: config.prompt,
      model: config.model,
      phases: config.phases.sort(),
      agents: config.enabledAgents.sort(),
    });

    // Simple hash for demo - use crypto in production
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }

  private comparePhaseOutputs(
    output1: PhaseOutput,
    output2: PhaseOutput,
    changes: ArtifactChange[]
  ): boolean {
    let hasChanges = false;

    const artifacts1 = new Map(output1.artifacts.map(a => [a.id, a]));
    const artifacts2 = new Map(output2.artifacts.map(a => [a.id, a]));

    // Find added and modified
    for (const [id, artifact] of artifacts2) {
      const existing = artifacts1.get(id);
      if (!existing) {
        changes.push({ type: 'added', artifact });
        hasChanges = true;
      } else if (existing.hash !== artifact.hash) {
        changes.push({
          type: 'modified',
          artifact,
          previousHash: existing.hash,
        });
        hasChanges = true;
      }
    }

    // Find removed
    for (const [id, artifact] of artifacts1) {
      if (!artifacts2.has(id)) {
        changes.push({ type: 'removed', artifact });
        hasChanges = true;
      }
    }

    return hasChanges;
  }
}

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

export interface CheckpointDiff {
  checkpoint1: { id: string; timestamp: number };
  checkpoint2: { id: string; timestamp: number };
  addedPhases: string[];
  removedPhases: string[];
  modifiedPhases: string[];
  artifactChanges: ArtifactChange[];
  tokensDelta: number;
  costDelta: number;
  timeDelta: number;
}

export interface ArtifactChange {
  type: 'added' | 'modified' | 'removed';
  artifact: Artifact;
  previousHash?: string;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const checkpointManager = new CheckpointManager();

export default checkpointManager;
