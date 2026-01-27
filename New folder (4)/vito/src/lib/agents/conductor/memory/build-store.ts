/**
 * Build Store - Stores and retrieves build history
 *
 * Responsibilities:
 * - Store complete build records
 * - Query builds by various criteria
 * - Calculate analytics from history
 * - Manage build lifecycle
 */

import type {
  BuildRecord,
  BuildStatus,
  IBuildStore,
  QueryOptions,
  QueryFilter,
  UserFeedback,
  BuildOutputSummary,
  BuildError,
} from './types';
import type { ProjectType } from '../types';

/**
 * In-memory build store implementation
 * Can be extended with database backends
 */
export class BuildStore implements IBuildStore {
  private builds: Map<string, BuildRecord> = new Map();
  private buildsByTenant: Map<string, Set<string>> = new Map();
  private buildsByType: Map<ProjectType, Set<string>> = new Map();
  private maxBuildsPerTenant: number;

  constructor(maxBuildsPerTenant: number = 100) {
    this.maxBuildsPerTenant = maxBuildsPerTenant;
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async save(record: BuildRecord): Promise<void> {
    // Store the build
    this.builds.set(record.id, { ...record });

    // Index by tenant
    if (!this.buildsByTenant.has(record.tenantId)) {
      this.buildsByTenant.set(record.tenantId, new Set());
    }
    this.buildsByTenant.get(record.tenantId)!.add(record.id);

    // Index by project type
    if (!this.buildsByType.has(record.projectType)) {
      this.buildsByType.set(record.projectType, new Set());
    }
    this.buildsByType.get(record.projectType)!.add(record.id);

    // Enforce limit per tenant
    await this.enforceLimit(record.tenantId);
  }

  async get(buildId: string): Promise<BuildRecord | null> {
    const build = this.builds.get(buildId);
    return build ? { ...build } : null;
  }

  async getByTenant(tenantId: string, options?: QueryOptions): Promise<BuildRecord[]> {
    const buildIds = this.buildsByTenant.get(tenantId);
    if (!buildIds) return [];

    let builds = Array.from(buildIds)
      .map(id => this.builds.get(id))
      .filter((b): b is BuildRecord => b !== undefined);

    // Apply filters
    if (options?.filters) {
      builds = this.applyFilters(builds, options.filters);
    }

    // Apply ordering
    if (options?.orderBy) {
      builds = this.applyOrdering(builds, options.orderBy, options.orderDirection || 'desc');
    } else {
      // Default: order by startedAt desc
      builds.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    }

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || builds.length;
    builds = builds.slice(offset, offset + limit);

    return builds.map(b => ({ ...b }));
  }

  async update(buildId: string, updates: Partial<BuildRecord>): Promise<void> {
    const existing = this.builds.get(buildId);
    if (!existing) {
      throw new Error(`Build not found: ${buildId}`);
    }

    // Preserve id and tenantId
    const updated: BuildRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      tenantId: existing.tenantId,
    };

    // Update project type index if changed
    if (updates.projectType && updates.projectType !== existing.projectType) {
      this.buildsByType.get(existing.projectType)?.delete(buildId);
      if (!this.buildsByType.has(updates.projectType)) {
        this.buildsByType.set(updates.projectType, new Set());
      }
      this.buildsByType.get(updates.projectType)!.add(buildId);
    }

    this.builds.set(buildId, updated);
  }

  async delete(buildId: string): Promise<void> {
    const build = this.builds.get(buildId);
    if (!build) return;

    // Remove from all indexes
    this.builds.delete(buildId);
    this.buildsByTenant.get(build.tenantId)?.delete(buildId);
    this.buildsByType.get(build.projectType)?.delete(buildId);
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  async getRecentBuilds(limit: number): Promise<BuildRecord[]> {
    const allBuilds = Array.from(this.builds.values());
    return allBuilds
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit)
      .map(b => ({ ...b }));
  }

  async getFailedBuilds(tenantId?: string, limit: number = 10): Promise<BuildRecord[]> {
    if (tenantId) {
      return this.getByTenant(tenantId, {
        filters: [{ field: 'status', operator: 'equals', value: 'failed' }],
        orderBy: 'startedAt',
        orderDirection: 'desc',
        limit,
      });
    }

    return this.getBuildsByStatus('failed', limit);
  }

  async getSuccessfulBuilds(tenantId?: string, limit: number = 10): Promise<BuildRecord[]> {
    if (tenantId) {
      return this.getByTenant(tenantId, {
        filters: [{ field: 'status', operator: 'equals', value: 'completed' }],
        orderBy: 'startedAt',
        orderDirection: 'desc',
        limit,
      });
    }

    return this.getBuildsByStatus('completed', limit);
  }

  async getBuildsByProjectType(projectType: ProjectType, limit: number = 10): Promise<BuildRecord[]> {
    const buildIds = this.buildsByType.get(projectType);
    if (!buildIds) return [];

    return Array.from(buildIds)
      .map(id => this.builds.get(id))
      .filter((b): b is BuildRecord => b !== undefined)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit)
      .map(b => ({ ...b }));
  }

  async getBuildsByStatus(status: BuildStatus, limit: number = 10): Promise<BuildRecord[]> {
    return Array.from(this.builds.values())
      .filter(b => b.status === status)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit)
      .map(b => ({ ...b }));
  }

  async getBuildsByQualityRange(
    minQuality: number,
    maxQuality: number,
    limit: number = 1
  ): Promise<BuildRecord[]> {
    return Array.from(this.builds.values())
      .filter(b => b.overallQuality >= minQuality && b.overallQuality <= maxQuality)
      .sort((a, b) => b.overallQuality - a.overallQuality)
      .slice(0, limit)
      .map(b => ({ ...b }));
  }

  async searchBuilds(searchText: string, limit: number = 10): Promise<BuildRecord[]> {
    const lowerSearch = searchText.toLowerCase();
    return Array.from(this.builds.values())
      .filter(b =>
        b.description.toLowerCase().includes(lowerSearch) ||
        b.tags.some(t => t.toLowerCase().includes(lowerSearch))
      )
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit)
      .map(b => ({ ...b }));
  }

  // ============================================================================
  // Analytics Operations
  // ============================================================================

  async getAverageQuality(tenantId?: string): Promise<number> {
    const builds = tenantId ? await this.getByTenant(tenantId) : Array.from(this.builds.values());
    if (builds.length === 0) return 0;

    const totalQuality = builds.reduce((sum, b) => sum + b.overallQuality, 0);
    return totalQuality / builds.length;
  }

  async getAverageDuration(tenantId?: string): Promise<number> {
    const builds = tenantId ? await this.getByTenant(tenantId) : Array.from(this.builds.values());
    if (builds.length === 0) return 0;

    const completedBuilds = builds.filter(b => b.status === 'completed' && b.duration > 0);
    if (completedBuilds.length === 0) return 0;

    const totalDuration = completedBuilds.reduce((sum, b) => sum + b.duration, 0);
    return totalDuration / completedBuilds.length;
  }

  async getAverageCost(tenantId?: string): Promise<number> {
    const builds = tenantId ? await this.getByTenant(tenantId) : Array.from(this.builds.values());
    if (builds.length === 0) return 0;

    const totalCost = builds.reduce((sum, b) => sum + b.costUSD, 0);
    return totalCost / builds.length;
  }

  async getSuccessRate(tenantId?: string): Promise<number> {
    const builds = tenantId ? await this.getByTenant(tenantId) : Array.from(this.builds.values());
    if (builds.length === 0) return 0;

    const completed = builds.filter(b => b.status === 'completed').length;
    return completed / builds.length;
  }

  async getTotalTokensUsed(tenantId?: string): Promise<number> {
    const builds = tenantId ? await this.getByTenant(tenantId) : Array.from(this.builds.values());
    return builds.reduce((sum, b) => sum + b.tokensUsed, 0);
  }

  async getTotalCost(tenantId?: string): Promise<number> {
    const builds = tenantId ? await this.getByTenant(tenantId) : Array.from(this.builds.values());
    return builds.reduce((sum, b) => sum + b.costUSD, 0);
  }

  async getQualityTrend(tenantId: string, recentCount?: number): Promise<'improving' | 'stable' | 'declining'>;
  async getQualityTrend(recentCount: number, ignored?: number): Promise<number[]>;
  async getQualityTrend(
    tenantIdOrCount: string | number,
    recentCount: number = 10
  ): Promise<'improving' | 'stable' | 'declining' | number[]> {
    if (typeof tenantIdOrCount === 'number') {
      const builds = Array.from(this.builds.values())
        .filter(b => b.status === 'completed')
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, tenantIdOrCount);
      return builds.map(b => b.overallQuality);
    }

    const builds = await this.getByTenant(tenantIdOrCount, {
      filters: [{ field: 'status', operator: 'equals', value: 'completed' }],
      orderBy: 'startedAt',
      orderDirection: 'desc',
      limit: recentCount,
    });

    if (builds.length < 3) return 'stable';

    // Compare first half vs second half
    const midpoint = Math.floor(builds.length / 2);
    const recentHalf = builds.slice(0, midpoint);
    const olderHalf = builds.slice(midpoint);

    const recentAvg = recentHalf.reduce((sum, b) => sum + b.overallQuality, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((sum, b) => sum + b.overallQuality, 0) / olderHalf.length;

    const diff = recentAvg - olderAvg;
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'declining';
    return 'stable';
  }

  async getProjectTypeDistribution(tenantId?: string): Promise<Record<ProjectType, number>> {
    const builds = tenantId ? await this.getByTenant(tenantId) : Array.from(this.builds.values());
    const distribution: Partial<Record<ProjectType, number>> = {};

    for (const build of builds) {
      distribution[build.projectType] = (distribution[build.projectType] || 0) + 1;
    }

    return distribution as Record<ProjectType, number>;
  }

  async getAgentPerformance(tenantId: string): Promise<Record<string, { avgScore: number; count: number }>> {
    const builds = await this.getByTenant(tenantId);
    const agentStats: Record<string, { totalScore: number; count: number }> = {};

    for (const build of builds) {
      for (const [agentId, score] of Object.entries(build.qualityScores)) {
        if (!agentStats[agentId]) {
          agentStats[agentId] = { totalScore: 0, count: 0 };
        }
        agentStats[agentId].totalScore += score;
        agentStats[agentId].count += 1;
      }
    }

    const result: Record<string, { avgScore: number; count: number }> = {};
    for (const [agentId, stats] of Object.entries(agentStats)) {
      result[agentId] = {
        avgScore: stats.totalScore / stats.count,
        count: stats.count,
      };
    }

    return result;
  }

  // ============================================================================
  // Feedback Operations
  // ============================================================================

  async addFeedback(buildId: string, feedback: UserFeedback): Promise<void> {
    await this.update(buildId, { userFeedback: feedback });
  }

  async getBuildsWithFeedback(tenantId: string, limit: number): Promise<BuildRecord[]> {
    const builds = await this.getByTenant(tenantId);
    return builds
      .filter(b => b.userFeedback !== undefined)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  async getAverageRating(tenantId: string): Promise<number> {
    const builds = await this.getBuildsWithFeedback(tenantId, 1000);
    if (builds.length === 0) return 0;

    const totalRating = builds.reduce((sum, b) => sum + (b.userFeedback?.rating || 0), 0);
    return totalRating / builds.length;
  }

  // ============================================================================
  // Utility Operations
  // ============================================================================

  async count(): Promise<number> {
    return this.builds.size;
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.buildsByTenant.get(tenantId)?.size || 0;
  }

  async clear(): Promise<void> {
    this.builds.clear();
    this.buildsByTenant.clear();
    this.buildsByType.clear();
  }

  async clearByTenant(tenantId: string): Promise<void> {
    const buildIds = this.buildsByTenant.get(tenantId);
    if (!buildIds) return;

    for (const buildId of buildIds) {
      const build = this.builds.get(buildId);
      if (build) {
        this.buildsByType.get(build.projectType)?.delete(buildId);
        this.builds.delete(buildId);
      }
    }
    this.buildsByTenant.delete(tenantId);
  }

  async export(): Promise<BuildRecord[]> {
    return Array.from(this.builds.values()).map(b => ({ ...b }));
  }

  async import(records: BuildRecord[]): Promise<void> {
    for (const record of records) {
      await this.save(record);
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async enforceLimit(tenantId: string): Promise<void> {
    const buildIds = this.buildsByTenant.get(tenantId);
    if (!buildIds || buildIds.size <= this.maxBuildsPerTenant) return;

    // Get all builds sorted by date (oldest first)
    const builds = Array.from(buildIds)
      .map(id => this.builds.get(id))
      .filter((b): b is BuildRecord => b !== undefined)
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

    // Remove oldest builds until within limit
    const toRemove = builds.length - this.maxBuildsPerTenant;
    for (let i = 0; i < toRemove; i++) {
      await this.delete(builds[i].id);
    }
  }

  private applyFilters(builds: BuildRecord[], filters: QueryFilter[]): BuildRecord[] {
    return builds.filter(build => {
      return filters.every(filter => this.matchesFilter(build, filter));
    });
  }

  private matchesFilter(build: BuildRecord, filter: QueryFilter): boolean {
    const value = this.getNestedValue(build, filter.field);

    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'contains':
        return typeof value === 'string' && value.includes(String(filter.value));
      case 'greaterThan':
        return typeof value === 'number' && value > (filter.value as number);
      case 'lessThan':
        return typeof value === 'number' && value < (filter.value as number);
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'between':
        if (!Array.isArray(filter.value) || filter.value.length !== 2) return false;
        return typeof value === 'number' &&
          value >= (filter.value[0] as number) &&
          value <= (filter.value[1] as number);
      default:
        return false;
    }
  }

  private getNestedValue<T extends object>(obj: T, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj as Record<string, unknown>;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private applyOrdering(builds: BuildRecord[], orderBy: string, direction: 'asc' | 'desc'): BuildRecord[] {
    return [...builds].sort((a, b) => {
      const aVal = this.getNestedValue(a, orderBy);
      const bVal = this.getNestedValue(b, orderBy);

      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return direction === 'asc' ? 1 : -1;
      if (bVal === undefined || bVal === null) return direction === 'asc' ? -1 : 1;

      let comparison: number;
      if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }
}

// ============================================================================
// Build Record Factory
// ============================================================================

export function createBuildRecord(
  params: {
    id?: string;
    tenantId: string;
    description: string;
    projectType: ProjectType;
    complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
    tier: 'basic' | 'standard' | 'premium' | 'enterprise';
    status?: BuildStatus;
  }
): BuildRecord {
  const recordId = params.id ?? `build_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const status = params.status ?? 'completed';
  return {
    id: recordId,
    tenantId: params.tenantId,
    description: params.description,
    projectType: params.projectType,
    complexity: params.complexity,
    tier: params.tier,
    startedAt: new Date(),
    completedAt: null,
    duration: 0,
    status,
    outputs: {},
    errors: [],
    qualityScores: {},
    overallQuality: 0,
    tokensUsed: 0,
    costUSD: 0,
    tags: [],
    metadata: {},
  };
}

export function addOutputToRecord(
  record: BuildRecord,
  agentId: string,
  phaseOrOutput: string | Record<string, unknown>,
  output?: unknown,
  qualityScore?: number,
  retryCount: number = 0
): void {
  const isPhaseProvided = typeof phaseOrOutput === 'string';
  const phase = isPhaseProvided ? phaseOrOutput : 'output';
  const payload = isPhaseProvided ? output : phaseOrOutput;
  const outputStr = payload !== undefined ? JSON.stringify(payload) : '';
  const keyFields = payload && typeof payload === 'object'
    ? Object.keys(payload as Record<string, unknown>).slice(0, 10)
    : [];
  const inferredQuality = typeof (payload as any)?.quality === 'number' ? Number((payload as any).quality) : 0;
  const inferredTokens = typeof (payload as any)?.tokens === 'number' ? Number((payload as any).tokens) : 0;
  const effectiveQuality = qualityScore ?? inferredQuality;

  record.outputs[agentId] = {
    agentId,
    phase,
    outputSize: outputStr.length,
    keyFields,
    qualityScore: effectiveQuality,
    quality: inferredQuality || undefined,
    tokens: inferredTokens || undefined,
    retryCount,
  };

  record.qualityScores[agentId] = effectiveQuality;
}

export function addErrorToRecord(
  record: BuildRecord,
  agentOrError: string | { agentId: string; phase: string; error: string; recoverable?: boolean },
  phase?: string,
  error?: string,
  recoverable: boolean = false
): void {
  if (typeof agentOrError === 'string') {
    record.errors.push({
      agentId: agentOrError,
      phase: phase || 'unknown',
      error: error || 'Unknown error',
      recoverable,
      timestamp: new Date(),
    });
    return;
  }

  record.errors.push({
    agentId: agentOrError.agentId,
    phase: agentOrError.phase,
    error: agentOrError.error,
    recoverable: agentOrError.recoverable ?? false,
    timestamp: new Date(),
  });
}

export function finalizeBuildRecord(
  record: BuildRecord,
  status: BuildStatus,
  tokensUsedOrMetrics: number | { overallQuality: number; tokensUsed: number; costUSD: number },
  costUSD?: number
): void {
  record.completedAt = new Date();
  record.duration = Math.max(1, record.completedAt.getTime() - record.startedAt.getTime());
  record.status = status;
  if (typeof tokensUsedOrMetrics === 'number') {
    record.tokensUsed = tokensUsedOrMetrics;
    record.costUSD = costUSD ?? 0;
  } else {
    record.overallQuality = tokensUsedOrMetrics.overallQuality;
    record.tokensUsed = tokensUsedOrMetrics.tokensUsed;
    record.costUSD = tokensUsedOrMetrics.costUSD;
  }

  // Calculate overall quality
  if (!record.overallQuality) {
    const scores = Object.values(record.qualityScores);
    if (scores.length > 0) {
      record.overallQuality = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    }
  }
}
