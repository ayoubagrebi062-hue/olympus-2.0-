/**
 * Memory Module - Main orchestrator for CONDUCTOR's learning brain
 *
 * Provides:
 * - Build history storage and retrieval
 * - Pattern extraction and application
 * - Similarity search for relevant builds
 * - User preference learning
 * - Recommendations based on learned patterns
 */

import {
  BuildStore,
  createBuildRecord,
  addOutputToRecord,
  addErrorToRecord,
  finalizeBuildRecord,
} from './build-store';
import { PatternEngine, executePatternAction, type PatternActionResult } from './pattern-engine';
import {
  VectorStore,
  createOllamaEmbeddingFn,
  type VectorStoreConfig,
  type OllamaEmbeddingConfig,
} from './vector-store';
import { PreferencesManager, type PreferenceRecommendations } from './preferences';
import type {
  BuildRecord,
  LearnedPattern,
  UserPreferences,
  UserFeedback,
  SimilarBuild,
  SimilarityQuery,
  PatternMatchContext,
  MemoryConfig,
  DEFAULT_MEMORY_CONFIG,
  MemoryEvent,
  MemoryEventType,
  MemoryAnalytics,
  MemoryRecommendation,
  PatternType,
} from './types';
import type { ProjectType, ProjectComplexity } from '../types';

// Re-export types and classes for convenience
export * from './types';
export {
  BuildStore,
  createBuildRecord,
  addOutputToRecord,
  addErrorToRecord,
  finalizeBuildRecord,
} from './build-store';
export { PatternEngine, executePatternAction } from './pattern-engine';
export { VectorStore, createOllamaEmbeddingFn } from './vector-store';
export { PreferencesManager, DEFAULT_USER_PREFERENCES } from './preferences';

/**
 * Main Memory Module class
 */
export class MemoryModule {
  private buildStore: BuildStore;
  private patternEngine: PatternEngine;
  private vectorStore: VectorStore;
  private preferencesManager: PreferencesManager;
  private config: MemoryConfig;
  private eventListeners: ((event: MemoryEvent) => void)[] = [];

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      enabled: true,
      buildHistoryLimit: 100,
      patternRetentionDays: 90,
      minSamplesForPattern: 5,
      patternConfidenceThreshold: 0.7,
      learningEnabled: true,
      vectorSearchEnabled: true,
      similarityThreshold: 0.75,
      maxSimilarResults: 10,
      preferenceLearningEnabled: true,
      preferenceDecayDays: 30,
      ...config,
    };

    this.buildStore = new BuildStore(this.config.buildHistoryLimit);
    this.patternEngine = new PatternEngine(this.config);
    this.vectorStore = new VectorStore(this.config);
    this.preferencesManager = new PreferencesManager(this.config);
  }

  // ============================================================================
  // Build History Operations
  // ============================================================================

  /**
   * Store a completed build record
   */
  async storeBuild(record: BuildRecord): Promise<void> {
    if (!this.config.enabled) return;

    await this.buildStore.save(record);
    this.emit('memory:build_stored', { buildId: record.id });

    // Index for similarity search if enabled
    if (this.config.vectorSearchEnabled) {
      await this.vectorStore.indexBuild(record);
    }

    // Update user preferences from build
    if (this.config.preferenceLearningEnabled) {
      await this.preferencesManager.updateFromBuild(record.tenantId, record);
    }

    // Extract patterns if we have enough data
    if (this.config.learningEnabled) {
      await this.maybeExtractPatterns(record.tenantId);
    }
  }

  /**
   * Get a build by ID
   */
  async getBuild(buildId: string): Promise<BuildRecord | null> {
    const record = await this.buildStore.get(buildId);
    if (record) {
      this.emit('memory:build_retrieved', { buildId });
    }
    return record;
  }

  /**
   * Get builds for a tenant
   */
  async getTenantBuilds(tenantId: string, limit: number = 20): Promise<BuildRecord[]> {
    return this.buildStore.getByTenant(tenantId, { limit });
  }

  /**
   * Get recent builds across all tenants
   */
  async getRecentBuilds(limit: number = 20): Promise<BuildRecord[]> {
    return this.buildStore.getRecentBuilds(limit);
  }

  /**
   * Get failed builds for analysis
   */
  async getFailedBuilds(tenantId?: string, limit: number = 10): Promise<BuildRecord[]> {
    return this.buildStore.getFailedBuilds(tenantId, limit);
  }

  /**
   * Add user feedback to a build
   */
  async addFeedback(buildId: string, feedback: UserFeedback): Promise<void> {
    const build = await this.buildStore.get(buildId);
    if (!build) {
      throw new Error(`Build not found: ${buildId}`);
    }

    await this.buildStore.addFeedback(buildId, feedback);
    this.emit('memory:feedback_recorded', { buildId, rating: feedback.rating });

    // Update preferences from feedback
    if (this.config.preferenceLearningEnabled) {
      await this.preferencesManager.recordFeedback(build.tenantId, feedback);
    }
  }

  // ============================================================================
  // Similarity Search
  // ============================================================================

  /**
   * Find similar builds based on description
   */
  async findSimilarBuilds(query: SimilarityQuery): Promise<SimilarBuild[]> {
    if (!this.config.vectorSearchEnabled) {
      return [];
    }

    const results = await this.vectorStore.searchByText(query);
    this.emit('memory:similar_found', { count: results.length, query: query.description });

    // Enrich results with applicable patterns
    for (const result of results) {
      const context: PatternMatchContext = {
        projectType: result.record.projectType,
        complexity: result.record.complexity,
        tier: result.record.tier,
        tenantId: result.record.tenantId,
      };
      result.relevantPatterns = await this.patternEngine.getApplicable(context);
    }

    return results;
  }

  /**
   * Find builds similar to an existing build
   */
  async findRelatedBuilds(buildId: string, limit: number = 5): Promise<SimilarBuild[]> {
    if (!this.config.vectorSearchEnabled) {
      return [];
    }

    return this.vectorStore.findSimilarBuilds(buildId, limit);
  }

  // ============================================================================
  // Pattern Operations
  // ============================================================================

  /**
   * Get applicable patterns for a given context
   */
  async getApplicablePatterns(context: PatternMatchContext): Promise<LearnedPattern[]> {
    const patterns = await this.patternEngine.getApplicable(context);
    if (patterns.length > 0) {
      this.emit('memory:pattern_applied', { count: patterns.length, context });
    }
    return patterns;
  }

  /**
   * Apply patterns and return recommended changes
   */
  async applyPatterns(context: PatternMatchContext): Promise<PatternApplicationResult> {
    const patterns = await this.getApplicablePatterns(context);
    const changes: Record<string, unknown> = {};
    const appliedPatterns: string[] = [];

    for (const pattern of patterns) {
      const result = executePatternAction(pattern.action, changes);
      if (result.applied) {
        Object.assign(changes, result.changes);
        appliedPatterns.push(pattern.id);
      }
    }

    return {
      applied: appliedPatterns.length > 0,
      patterns: appliedPatterns,
      changes,
      messages: patterns.map(p => `Applied pattern: ${p.type}`),
    };
  }

  /**
   * Record pattern application success/failure
   */
  async recordPatternOutcome(patternId: string, success: boolean): Promise<void> {
    await this.patternEngine.incrementApplied(patternId, success);
    this.emit('memory:pattern_updated', { patternId, success });
  }

  /**
   * Get patterns by type
   */
  async getPatternsByType(type: PatternType): Promise<LearnedPattern[]> {
    return this.patternEngine.getByType(type);
  }

  /**
   * Get most effective patterns
   */
  async getMostEffectivePatterns(type: PatternType, limit: number = 5): Promise<LearnedPattern[]> {
    return this.patternEngine.getMostEffective(type, limit);
  }

  /**
   * Manually add a pattern
   */
  async addPattern(pattern: LearnedPattern): Promise<void> {
    await this.patternEngine.save(pattern);
    this.emit('memory:pattern_extracted', { patternId: pattern.id, type: pattern.type });
  }

  // ============================================================================
  // User Preferences
  // ============================================================================

  /**
   * Get user preferences
   */
  async getPreferences(tenantId: string): Promise<UserPreferences> {
    return this.preferencesManager.getOrCreate(tenantId);
  }

  /**
   * Get recommendations based on preferences
   */
  async getRecommendations(tenantId: string): Promise<PreferenceRecommendations> {
    const recommendations = await this.preferencesManager.getRecommendations(tenantId);
    if (recommendations.hasPreferences) {
      this.emit('memory:preference_applied', { tenantId, confidence: recommendations.confidence });
    }
    return recommendations;
  }

  /**
   * Update user preferences manually
   */
  async updatePreferences(tenantId: string, updates: Partial<UserPreferences>): Promise<void> {
    await this.preferencesManager.update(tenantId, updates);
    this.emit('memory:preference_learned', { tenantId });
  }

  /**
   * Check if user prefers quality over speed
   */
  async prefersQuality(tenantId: string): Promise<boolean> {
    return this.preferencesManager.prefersQuality(tenantId);
  }

  /**
   * Check if user is budget sensitive
   */
  async isBudgetSensitive(tenantId: string): Promise<boolean> {
    return this.preferencesManager.isBudgetSensitive(tenantId);
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /**
   * Get comprehensive memory analytics
   */
  async getAnalytics(): Promise<MemoryAnalytics> {
    const buildCount = await this.buildStore.count();
    const patternStats = await this.patternEngine.getStatistics();
    const vectorStats = await this.vectorStore.getStatistics();
    const prefStats = await this.preferencesManager.getStatistics();

    // Calculate builds by project type
    const allBuilds = await this.buildStore.getRecentBuilds(1000);
    const buildsByProjectType: Partial<Record<ProjectType, number>> = {};
    let totalQuality = 0;
    let qualityCount = 0;

    for (const build of allBuilds) {
      buildsByProjectType[build.projectType] = (buildsByProjectType[build.projectType] || 0) + 1;
      if (build.status === 'completed') {
        totalQuality += build.overallQuality;
        qualityCount += 1;
      }
    }

    // Determine quality trend
    let qualityTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (allBuilds.length >= 10) {
      const recent = allBuilds.slice(0, 5);
      const older = allBuilds.slice(5, 10);
      const recentAvg =
        recent.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.overallQuality, 0) /
        5;
      const olderAvg =
        older.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.overallQuality, 0) /
        5;
      const diff = recentAvg - olderAvg;
      if (diff > 0.5) qualityTrend = 'improving';
      else if (diff < -0.5) qualityTrend = 'declining';
    }

    return {
      totalBuilds: buildCount,
      averageQuality: qualityCount > 0 ? totalQuality / qualityCount : 0,
      totalBuildsStored: buildCount,
      totalPatterns: patternStats.total,
      patternsApplied: patternStats.totalApplications,
      averagePatternSuccess: patternStats.avgSuccessRate,
      similaritySearches: vectorStats.totalEmbeddings,
      preferencesLearned: prefStats.totalTenants,
      feedbackCollected: allBuilds.filter(b => b.userFeedback).length,
      patternsByType: patternStats.byType,
      buildsByProjectType: buildsByProjectType as Record<ProjectType, number>,
      qualityTrend,
      costTrend: 'stable', // Would need historical cost data to calculate
    };
  }

  /**
   * Get tenant-specific analytics
   */
  async getTenantAnalytics(tenantId: string): Promise<TenantAnalytics> {
    const builds = await this.buildStore.getByTenant(tenantId);
    const avgQuality = await this.buildStore.getAverageQuality(tenantId);
    const avgDuration = await this.buildStore.getAverageDuration(tenantId);
    const avgCost = await this.buildStore.getAverageCost(tenantId);
    const successRate = await this.buildStore.getSuccessRate(tenantId);
    const qualityTrend = await this.buildStore.getQualityTrend(tenantId);
    const preferences = await this.preferencesManager.get(tenantId);

    return {
      tenantId,
      buildCount: builds.length,
      totalBuilds: builds.length,
      averageQuality: avgQuality,
      averageDuration: avgDuration,
      averageCost: avgCost,
      successRate,
      qualityTrend,
      preferenceConfidence: preferences?.confidence || 0,
      feedbackCount: preferences?.totalFeedbacks || 0,
      averageRating: preferences?.averageRating || 0,
    };
  }

  // ============================================================================
  // Recommendations
  // ============================================================================

  /**
   * Generate recommendations for a new build
   */
  async generateRecommendations(
    tenantId: string,
    description: string,
    projectType: ProjectType,
    complexity: ProjectComplexity
  ): Promise<MemoryRecommendation[]> {
    const recommendations: MemoryRecommendation[] = [];

    // Get user preference recommendations
    const prefRecs = await this.getRecommendations(tenantId);
    if (prefRecs.hasPreferences && prefRecs.confidence && prefRecs.confidence >= 0.5) {
      recommendations.push({
        id: `rec_pref_${Date.now()}`,
        type: 'preference_application',
        title: 'Apply User Preferences',
        description: `Based on ${Math.round(prefRecs.confidence * 100)}% confidence in learned preferences`,
        confidence: prefRecs.confidence,
        impact: 'medium',
        basedOn: [{ type: 'user_feedback', id: tenantId, relevance: prefRecs.confidence }],
        action: {
          type: 'apply_fallback',
          parameters: prefRecs.recommendations,
          priority: 5,
        },
      });
    }

    // Find similar builds for insights
    const similarBuilds = await this.findSimilarBuilds({
      description,
      projectType,
      complexity,
      minQuality: 7,
      limit: 5,
    });

    if (similarBuilds.length > 0) {
      const topSimilar = similarBuilds[0];
      recommendations.push({
        id: `rec_similar_${Date.now()}`,
        type: 'quality_improvement',
        title: 'Similar Successful Build Found',
        description: `Found ${similarBuilds.length} similar builds with average quality ${(
          similarBuilds.reduce((sum, b) => sum + b.record.overallQuality, 0) / similarBuilds.length
        ).toFixed(1)}`,
        confidence: topSimilar.similarity,
        impact: 'high',
        basedOn: similarBuilds.map(b => ({
          type: 'similar_build' as const,
          id: b.buildId,
          relevance: b.similarity,
        })),
      });
    }

    // Get applicable patterns
    const context: PatternMatchContext = {
      projectType,
      complexity,
      tier: 'standard',
      tenantId,
    };

    const patterns = await this.getApplicablePatterns(context);
    for (const pattern of patterns.slice(0, 3)) {
      recommendations.push({
        id: `rec_pattern_${pattern.id}`,
        type: this.mapPatternTypeToRecType(pattern.type),
        title: `Pattern: ${pattern.type.replace(/_/g, ' ')}`,
        description: `Applied ${pattern.timesApplied} times with ${Math.round(pattern.successRate * 100)}% success`,
        confidence: pattern.confidence,
        impact:
          pattern.action.priority >= 7 ? 'high' : pattern.action.priority >= 4 ? 'medium' : 'low',
        basedOn: [{ type: 'pattern', id: pattern.id, relevance: pattern.confidence }],
        action: pattern.action,
      });
    }

    // Sort by confidence and impact
    recommendations.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
      if (impactDiff !== 0) return impactDiff;
      return b.confidence - a.confidence;
    });

    return recommendations;
  }

  private mapPatternTypeToRecType(patternType: PatternType): MemoryRecommendation['type'] {
    switch (patternType) {
      case 'quality_threshold':
        return 'quality_improvement';
      case 'cost_optimization':
        return 'cost_reduction';
      case 'parallel_execution':
      case 'phase_ordering':
        return 'speed_optimization';
      case 'error_recovery':
        return 'error_prevention';
      default:
        return 'quality_improvement';
    }
  }

  // ============================================================================
  // Pattern Extraction
  // ============================================================================

  private async maybeExtractPatterns(tenantId: string): Promise<void> {
    const builds = await this.buildStore.getByTenant(tenantId);
    if (builds.length < this.config.minSamplesForPattern) return;

    // Only extract patterns periodically (every 5 builds)
    if (builds.length % 5 !== 0) return;

    const patterns = await this.patternEngine.extractPatterns(builds);
    if (patterns.length > 0) {
      this.emit('memory:learning_completed', {
        tenantId,
        patternsExtracted: patterns.length,
      });
    }
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Subscribe to memory events
   */
  onEvent(listener: (event: MemoryEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index >= 0) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  private emit(type: MemoryEventType, data: Record<string, unknown>): void {
    let normalizedType = type;
    if (typeof type === 'string' && type.startsWith('memory:')) {
      normalizedType = type.replace('memory:', '') as MemoryEventType;
    }
    if (normalizedType === 'pattern_extracted') {
      normalizedType = 'pattern_added' as MemoryEventType;
    }
    const event: MemoryEvent = {
      type: normalizedType,
      timestamp: new Date(),
      data,
    };

    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Memory event listener error:', error);
      }
    }
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Get current configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Configure Ollama embedding function
   */
  configureOllamaEmbeddings(ollamaConfig: OllamaEmbeddingConfig): void {
    const embeddingFn = createOllamaEmbeddingFn(ollamaConfig);
    this.vectorStore.setEmbeddingFunction(embeddingFn);
  }

  // ============================================================================
  // Utility Operations
  // ============================================================================

  /**
   * Get sub-components for direct access
   */
  getBuildStore(): BuildStore {
    return this.buildStore;
  }

  getPatternEngine(): PatternEngine {
    return this.patternEngine;
  }

  getVectorStore(): VectorStore {
    return this.vectorStore;
  }

  getPreferencesManager(): PreferencesManager {
    return this.preferencesManager;
  }

  /**
   * Clear all memory data
   */
  async clear(): Promise<void> {
    await this.buildStore.clear();
    await this.patternEngine.clear();
    await this.vectorStore.clear();
    await this.preferencesManager.clear();
  }

  /**
   * Clear memory for a specific tenant
   */
  async clearTenant(tenantId: string): Promise<void> {
    await this.buildStore.clearByTenant(tenantId);
    await this.preferencesManager.delete(tenantId);
  }

  /**
   * Check if memory is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface PatternApplicationResult {
  applied: boolean;
  patterns: string[];
  changes: Record<string, unknown>;
  messages: string[];
}

export interface TenantAnalytics {
  tenantId: string;
  buildCount?: number;
  totalBuilds: number;
  averageQuality: number;
  averageDuration: number;
  averageCost: number;
  successRate: number;
  qualityTrend: 'improving' | 'stable' | 'declining';
  preferenceConfidence: number;
  feedbackCount: number;
  averageRating: number;
}
