/**
 * Checkpoint Store
 *
 * Persists checkpoints with compression and expiration.
 * Provides both Supabase implementation and in-memory store for testing.
 *
 * @AUTHORITY_CHECK - Storage operations require authorization verification
 */

import type {
  Checkpoint,
  CheckpointState,
  ICheckpointStore,
  CheckpointQuery,
  CheckpointStats,
  CheckpointConfig,
  DEFAULT_CHECKPOINT_CONFIG,
} from './types';
import { compress, decompress, shouldCompress, getStringByteSize } from './compression';
import { safeJsonParse } from '@/lib/core/safe-json';

// ============================================================================
// IN-MEMORY CHECKPOINT STORE (for testing and development)
// ============================================================================

/**
 * In-memory checkpoint store for testing
 */
export class InMemoryCheckpointStore implements ICheckpointStore {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private checkpointsByBuild: Map<string, Set<string>> = new Map();
  private config: Partial<CheckpointConfig>;

  constructor(config: Partial<CheckpointConfig> = {}) {
    this.config = config;
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    // Store the checkpoint
    this.checkpoints.set(checkpoint.id, { ...checkpoint });

    // Index by build
    if (!this.checkpointsByBuild.has(checkpoint.buildId)) {
      this.checkpointsByBuild.set(checkpoint.buildId, new Set());
    }
    this.checkpointsByBuild.get(checkpoint.buildId)!.add(checkpoint.id);
  }

  async load(checkpointId: string): Promise<Checkpoint | null> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return null;
    }

    // Check expiration
    if (checkpoint.expiresAt < new Date()) {
      return null;
    }

    return { ...checkpoint };
  }

  async loadLatest(buildId: string): Promise<Checkpoint | null> {
    const checkpointIds = this.checkpointsByBuild.get(buildId);
    if (!checkpointIds || checkpointIds.size === 0) {
      return null;
    }

    // Find latest by sequence
    let latest: Checkpoint | null = null;

    for (const id of checkpointIds) {
      const checkpoint = this.checkpoints.get(id);
      if (checkpoint && checkpoint.expiresAt >= new Date()) {
        if (!latest || checkpoint.sequence > latest.sequence) {
          latest = checkpoint;
        }
      }
    }

    return latest ? { ...latest } : null;
  }

  async list(query: CheckpointQuery): Promise<Checkpoint[]> {
    let results: Checkpoint[] = [];

    // Filter by buildId if provided
    if (query.buildId) {
      const ids = this.checkpointsByBuild.get(query.buildId);
      if (ids) {
        for (const id of ids) {
          const cp = this.checkpoints.get(id);
          if (cp) results.push(cp);
        }
      }
    } else if (query.tenantId) {
      // Filter by tenantId
      for (const cp of this.checkpoints.values()) {
        if (cp.tenantId === query.tenantId) {
          results.push(cp);
        }
      }
    } else {
      // Return all
      results = Array.from(this.checkpoints.values());
    }

    // Apply additional filters
    if (query.agentId) {
      results = results.filter(cp => cp.agentId === query.agentId);
    }
    if (query.phase) {
      results = results.filter(cp => cp.phase === query.phase);
    }
    if (!query.includeExpired) {
      const now = new Date();
      results = results.filter(cp => cp.expiresAt >= now);
    }

    // Sort
    const orderBy = query.orderBy || 'sequence';
    const orderDir = query.orderDirection || 'asc';

    results.sort((a, b) => {
      const aVal = orderBy === 'sequence' ? a.sequence : a.createdAt.getTime();
      const bVal = orderBy === 'sequence' ? b.sequence : b.createdAt.getTime();
      return orderDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results.map(cp => ({ ...cp }));
  }

  async delete(checkpointId: string): Promise<void> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (checkpoint) {
      this.checkpoints.delete(checkpointId);
      this.checkpointsByBuild.get(checkpoint.buildId)?.delete(checkpointId);
    }
  }

  async deleteForBuild(buildId: string): Promise<void> {
    const ids = this.checkpointsByBuild.get(buildId);
    if (ids) {
      for (const id of ids) {
        this.checkpoints.delete(id);
      }
      this.checkpointsByBuild.delete(buildId);
    }
  }

  async cleanup(olderThan: Date): Promise<number> {
    let deletedCount = 0;

    for (const [id, checkpoint] of this.checkpoints) {
      if (checkpoint.expiresAt < olderThan) {
        this.checkpoints.delete(id);
        this.checkpointsByBuild.get(checkpoint.buildId)?.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async getStats(buildId: string): Promise<CheckpointStats> {
    const checkpoints = await this.list({ buildId });

    if (checkpoints.length === 0) {
      return {
        checkpointCount: 0,
        totalSizeBytes: 0,
        oldestCheckpoint: null,
        latestCheckpoint: null,
        completionPercent: 0,
        averageSizeBytes: 0,
        compressedCount: 0,
      };
    }

    const totalSize = checkpoints.reduce((sum, cp) => sum + cp.sizeBytes, 0);
    const compressedCount = checkpoints.filter(cp => cp.compressed).length;
    const latest = checkpoints[checkpoints.length - 1];

    return {
      checkpointCount: checkpoints.length,
      totalSizeBytes: totalSize,
      oldestCheckpoint: checkpoints[0].createdAt,
      latestCheckpoint: latest.createdAt,
      completionPercent: Math.round(
        (latest.state.progress.completedCount / latest.state.progress.totalAgents) * 100
      ),
      averageSizeBytes: Math.round(totalSize / checkpoints.length),
      compressedCount,
    };
  }

  // Utility for testing
  clear(): void {
    this.checkpoints.clear();
    this.checkpointsByBuild.clear();
  }

  size(): number {
    return this.checkpoints.size;
  }
}

// ============================================================================
// SUPABASE CHECKPOINT STORE
// ============================================================================

/**
 * Supabase-backed checkpoint store
 */
export class SupabaseCheckpointStore implements ICheckpointStore {
  private supabaseUrl: string;
  private supabaseKey: string;
  private compressionThreshold: number;
  private defaultExpirationDays: number;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    options?: {
      compressionThreshold?: number;
      defaultExpirationDays?: number;
    }
  ) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.compressionThreshold = options?.compressionThreshold || 10 * 1024;
    this.defaultExpirationDays = options?.defaultExpirationDays || 7;
  }

  private async getClient() {
    // Dynamic import to avoid issues in different environments
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    const supabase = await this.getClient();

    // Serialize state (convert Maps to objects for JSON)
    const serializedState = this.serializeState(checkpoint.state);
    let stateJson = JSON.stringify(serializedState);
    let compressed = false;

    // Compress if large
    if (shouldCompress(stateJson, this.compressionThreshold)) {
      stateJson = await compress(stateJson);
      compressed = true;
    }

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.defaultExpirationDays);

    const record = {
      id: checkpoint.id,
      build_id: checkpoint.buildId,
      tenant_id: checkpoint.tenantId,
      sequence: checkpoint.sequence,
      agent_id: checkpoint.agentId,
      phase: checkpoint.phase,
      state: stateJson,
      compressed,
      size_bytes: getStringByteSize(stateJson),
      created_at: checkpoint.createdAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    const { error } = await supabase.from('build_checkpoints').upsert(record);

    if (error) {
      throw new Error(`Failed to save checkpoint: ${error.message}`);
    }
  }

  async load(checkpointId: string): Promise<Checkpoint | null> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from('build_checkpoints')
      .select('*')
      .eq('id', checkpointId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.deserializeCheckpoint(data);
  }

  async loadLatest(buildId: string): Promise<Checkpoint | null> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from('build_checkpoints')
      .select('*')
      .eq('build_id', buildId)
      .gt('expires_at', new Date().toISOString())
      .order('sequence', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return this.deserializeCheckpoint(data);
  }

  async list(query: CheckpointQuery): Promise<Checkpoint[]> {
    const supabase = await this.getClient();

    let q = supabase.from('build_checkpoints').select('*');

    if (query.buildId) {
      q = q.eq('build_id', query.buildId);
    }
    if (query.tenantId) {
      q = q.eq('tenant_id', query.tenantId);
    }
    if (query.agentId) {
      q = q.eq('agent_id', query.agentId);
    }
    if (query.phase) {
      q = q.eq('phase', query.phase);
    }
    if (!query.includeExpired) {
      q = q.gt('expires_at', new Date().toISOString());
    }

    // Ordering
    const orderBy = query.orderBy === 'createdAt' ? 'created_at' : 'sequence';
    q = q.order(orderBy, { ascending: query.orderDirection !== 'desc' });

    // Pagination
    if (query.offset) {
      q = q.range(query.offset, query.offset + (query.limit || 100) - 1);
    } else if (query.limit) {
      q = q.limit(query.limit);
    }

    const { data, error } = await q;

    if (error) {
      throw new Error(`Failed to list checkpoints: ${error.message}`);
    }

    const checkpoints = await Promise.all((data || []).map(d => this.deserializeCheckpoint(d)));

    return checkpoints;
  }

  async delete(checkpointId: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await supabase.from('build_checkpoints').delete().eq('id', checkpointId);

    if (error) {
      throw new Error(`Failed to delete checkpoint: ${error.message}`);
    }
  }

  async deleteForBuild(buildId: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await supabase.from('build_checkpoints').delete().eq('build_id', buildId);

    if (error) {
      throw new Error(`Failed to delete checkpoints for build: ${error.message}`);
    }
  }

  async cleanup(olderThan: Date): Promise<number> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from('build_checkpoints')
      .delete()
      .lt('expires_at', olderThan.toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to cleanup checkpoints: ${error.message}`);
    }

    return data?.length || 0;
  }

  async getStats(buildId: string): Promise<CheckpointStats> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from('build_checkpoints')
      .select('*')
      .eq('build_id', buildId)
      .gt('expires_at', new Date().toISOString())
      .order('sequence', { ascending: true });

    if (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        checkpointCount: 0,
        totalSizeBytes: 0,
        oldestCheckpoint: null,
        latestCheckpoint: null,
        completionPercent: 0,
        averageSizeBytes: 0,
        compressedCount: 0,
      };
    }

    const totalSize = data.reduce((sum, d) => sum + (d.size_bytes || 0), 0);
    const compressedCount = data.filter(d => d.compressed).length;
    const latest = data[data.length - 1];

    // Deserialize latest to get progress
    const latestCheckpoint = await this.deserializeCheckpoint(latest);

    return {
      checkpointCount: data.length,
      totalSizeBytes: totalSize,
      oldestCheckpoint: new Date(data[0].created_at),
      latestCheckpoint: new Date(latest.created_at),
      completionPercent: Math.round(
        (latestCheckpoint.state.progress.completedCount /
          latestCheckpoint.state.progress.totalAgents) *
          100
      ),
      averageSizeBytes: Math.round(totalSize / data.length),
      compressedCount,
    };
  }

  // ============================================================================
  // SERIALIZATION HELPERS
  // ============================================================================

  private serializeState(state: CheckpointState): Record<string, unknown> {
    return {
      buildContext: state.buildContext,
      agentOutputs: Object.fromEntries(state.agentOutputs),
      qualityScores: Object.fromEntries(state.qualityScores),
      decisions: state.decisions,
      knowledge: state.knowledge,
      progress: state.progress,
      timing: {
        ...state.timing,
        buildStartedAt: state.timing.buildStartedAt.toISOString(),
      },
      costs: {
        ...state.costs,
        costByAgent: Object.fromEntries(state.costs.costByAgent),
      },
    };
  }

  private async deserializeCheckpoint(data: Record<string, unknown>): Promise<Checkpoint> {
    let stateJson = data.state as string;

    // Decompress if needed
    if (data.compressed) {
      stateJson = await decompress(stateJson);
    }

    // FIX 3.3: Use safeJsonParse to prevent prototype pollution
    // Define expected structure for type safety
    interface ParsedCheckpointState {
      buildContext: unknown;
      agentOutputs?: Record<string, unknown>;
      qualityScores?: Record<string, unknown>;
      decisions?: unknown[];
      knowledge?: Record<string, unknown>;
      progress: unknown;
      timing: {
        buildStartedAt: string;
        [key: string]: unknown;
      };
      costs?: {
        costByAgent?: Record<string, unknown>;
        [key: string]: unknown;
      };
    }
    const parsedState = safeJsonParse<ParsedCheckpointState>(stateJson);

    // Convert objects back to Maps with proper type casting
    const state: CheckpointState = {
      buildContext: parsedState.buildContext as CheckpointState['buildContext'],
      agentOutputs: new Map(
        Object.entries(parsedState.agentOutputs || {})
      ) as CheckpointState['agentOutputs'],
      qualityScores: new Map(
        Object.entries(parsedState.qualityScores || {})
      ) as CheckpointState['qualityScores'],
      decisions: (parsedState.decisions || []) as CheckpointState['decisions'],
      knowledge: (parsedState.knowledge || {}) as Record<string, unknown>,
      progress: parsedState.progress as CheckpointState['progress'],
      timing: {
        ...(parsedState.timing as Omit<CheckpointState['timing'], 'buildStartedAt'>),
        buildStartedAt: new Date(parsedState.timing.buildStartedAt),
      },
      costs: {
        ...(parsedState.costs as Omit<CheckpointState['costs'], 'costByAgent'>),
        costByAgent: new Map(
          Object.entries(parsedState.costs?.costByAgent || {})
        ) as CheckpointState['costs']['costByAgent'],
      },
    };

    return {
      id: data.id as string,
      buildId: data.build_id as string,
      tenantId: data.tenant_id as string,
      sequence: data.sequence as number,
      agentId: data.agent_id as string,
      phase: data.phase as string,
      state,
      createdAt: new Date(data.created_at as string),
      expiresAt: new Date(data.expires_at as string),
      sizeBytes: data.size_bytes as number,
      compressed: data.compressed as boolean,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a checkpoint store based on environment
 */
export function createCheckpointStore(config?: {
  type?: 'memory' | 'supabase';
  supabaseUrl?: string;
  supabaseKey?: string;
  compressionThreshold?: number;
  defaultExpirationDays?: number;
}): ICheckpointStore {
  if (config?.type === 'supabase' && config.supabaseUrl && config.supabaseKey) {
    return new SupabaseCheckpointStore(config.supabaseUrl, config.supabaseKey, {
      compressionThreshold: config.compressionThreshold,
      defaultExpirationDays: config.defaultExpirationDays,
    });
  }

  // Default to in-memory
  return new InMemoryCheckpointStore({
    compressionThreshold: config?.compressionThreshold,
    defaultExpirationDays: config?.defaultExpirationDays,
  } as Partial<CheckpointConfig>);
}
