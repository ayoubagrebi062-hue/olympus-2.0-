/**
 * Pattern Engine - Extracts and applies learned patterns
 *
 * Responsibilities:
 * - Extract patterns from build history
 * - Match patterns to current context
 * - Apply pattern actions to improve builds
 * - Track pattern effectiveness
 */

import type {
  LearnedPattern,
  PatternType,
  PatternTrigger,
  PatternAction,
  TriggerCondition,
  ActionType,
  PatternMatchContext,
  IPatternStore,
  BuildRecord,
  MemoryConfig,
} from './types';
import type { ProjectType, ProjectComplexity } from '../types';

/**
 * Pattern Engine for extracting and applying learned patterns
 */
export class PatternEngine implements IPatternStore {
  private patterns: Map<string, LearnedPattern> = new Map();
  private patternsByType: Map<PatternType, Set<string>> = new Map();
  private config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async save(pattern: LearnedPattern): Promise<void> {
    this.patterns.set(pattern.id, { ...pattern });

    // Index by type
    if (!this.patternsByType.has(pattern.type)) {
      this.patternsByType.set(pattern.type, new Set());
    }
    this.patternsByType.get(pattern.type)!.add(pattern.id);
  }

  async get(patternId: string): Promise<LearnedPattern | null> {
    const pattern = this.patterns.get(patternId);
    return pattern ? { ...pattern } : null;
  }

  async update(patternId: string, updates: Partial<LearnedPattern>): Promise<void> {
    const existing = this.patterns.get(patternId);
    if (!existing) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    const updated: LearnedPattern = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date(),
    };

    // Update type index if type changed
    if (updates.type && updates.type !== existing.type) {
      this.patternsByType.get(existing.type)?.delete(patternId);
      if (!this.patternsByType.has(updates.type)) {
        this.patternsByType.set(updates.type, new Set());
      }
      this.patternsByType.get(updates.type)!.add(patternId);
    }

    this.patterns.set(patternId, updated);
  }

  async delete(patternId: string): Promise<void> {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    this.patterns.delete(patternId);
    this.patternsByType.get(pattern.type)?.delete(patternId);
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  async getByType(type: PatternType): Promise<LearnedPattern[]> {
    const patternIds = this.patternsByType.get(type);
    if (!patternIds) return [];

    return Array.from(patternIds)
      .map(id => this.patterns.get(id))
      .filter((p): p is LearnedPattern => p !== undefined)
      .map(p => ({ ...p }));
  }

  async getApplicable(context: PatternMatchContext): Promise<LearnedPattern[]> {
    const allPatterns = Array.from(this.patterns.values());

    return allPatterns
      .filter(pattern => this.matchesTrigger(pattern.trigger, context))
      .filter(pattern => pattern.confidence >= this.config.patternConfidenceThreshold)
      .sort((a, b) => {
        // Sort by confidence * successRate (effectiveness)
        const aScore = a.confidence * a.successRate;
        const bScore = b.confidence * b.successRate;
        return bScore - aScore;
      })
      .map(p => ({ ...p }));
  }

  async findMatchingPatterns(context: PatternMatchContext): Promise<LearnedPattern[]> {
    return this.getApplicable(context);
  }

  async getMostEffective(
    typeOrLimit: PatternType | number,
    limit?: number
  ): Promise<LearnedPattern[]> {
    const type = typeof typeOrLimit === 'string' ? typeOrLimit : null;
    const effectiveLimit = typeof typeOrLimit === 'number' ? typeOrLimit : (limit ?? 5);
    const patterns = type ? await this.getByType(type) : await this.getAllPatterns();

    return patterns
      .filter(p => p.timesApplied >= Math.min(this.config.minSamplesForPattern, 1))
      .sort((a, b) => {
        const aScore = a.successRate * a.confidence;
        const bScore = b.successRate * b.confidence;
        return bScore - aScore;
      })
      .slice(0, effectiveLimit);
  }

  async getAllPatterns(): Promise<LearnedPattern[]> {
    return Array.from(this.patterns.values()).map(p => ({ ...p }));
  }

  async getConfidentPatterns(
    minConfidence: number = this.config.patternConfidenceThreshold
  ): Promise<LearnedPattern[]> {
    return Array.from(this.patterns.values())
      .filter(pattern => pattern.confidence >= minConfidence)
      .map(pattern => ({ ...pattern }));
  }

  // ============================================================================
  // Learning Operations
  // ============================================================================

  async incrementApplied(patternId: string, success: boolean): Promise<void> {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    // Update times applied
    pattern.timesApplied += 1;
    pattern.lastApplied = new Date();

    // Update success rate using exponential moving average
    const alpha = 0.2; // Weight for new observation
    const observation = success ? 1 : 0;
    pattern.successRate = alpha * observation + (1 - alpha) * pattern.successRate;

    // Update confidence based on sample size
    pattern.actualSamples += 1;
    if (pattern.actualSamples >= pattern.minSamples) {
      pattern.confidence = Math.min(1, pattern.confidence + 0.05);
    }

    pattern.updatedAt = new Date();
    this.patterns.set(patternId, pattern);
  }

  async recordOutcome(patternId: string, success: boolean): Promise<void> {
    await this.incrementApplied(patternId, success);
  }

  async updateConfidence(patternId: string, newConfidence: number): Promise<void> {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    pattern.confidence = Math.max(0, Math.min(1, newConfidence));
    pattern.updatedAt = new Date();
    this.patterns.set(patternId, pattern);
  }

  // ============================================================================
  // Pattern Extraction
  // ============================================================================

  /**
   * Extract patterns from a collection of build records
   */
  async extractPatterns(builds: BuildRecord[]): Promise<LearnedPattern[]> {
    const extractedPatterns: LearnedPattern[] = [];

    // Extract quality threshold patterns
    const qualityPatterns = this.extractQualityPatterns(builds);
    extractedPatterns.push(...qualityPatterns);

    // Extract agent selection patterns
    const agentPatterns = this.extractAgentPatterns(builds);
    extractedPatterns.push(...agentPatterns);

    // Extract retry strategy patterns
    const retryPatterns = this.extractRetryPatterns(builds);
    extractedPatterns.push(...retryPatterns);

    // Extract error recovery patterns
    const errorPatterns = this.extractErrorPatterns(builds);
    extractedPatterns.push(...errorPatterns);

    // Extract cost optimization patterns
    const costPatterns = this.extractCostPatterns(builds);
    extractedPatterns.push(...costPatterns);

    // Save all extracted patterns
    for (const pattern of extractedPatterns) {
      await this.save(pattern);
    }

    return extractedPatterns;
  }

  private extractQualityPatterns(builds: BuildRecord[]): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Group builds by project type
    const byType = this.groupBy(builds, b => b.projectType);

    for (const [projectType, typeBuilds] of Object.entries(byType)) {
      if (typeBuilds.length < this.config.minSamplesForPattern) continue;

      // Find successful builds (quality > 7)
      const successfulBuilds = typeBuilds.filter(
        b => b.status === 'completed' && b.overallQuality >= 7
      );
      if (successfulBuilds.length < 3) continue;

      // Calculate optimal quality threshold
      const avgQuality =
        successfulBuilds.reduce((sum, b) => sum + b.overallQuality, 0) / successfulBuilds.length;
      const optimalThreshold = Math.max(6, avgQuality - 1);

      patterns.push(
        this.createPattern({
          type: 'quality_threshold',
          trigger: {
            conditions: [{ field: 'projectType', operator: 'equals', value: projectType }],
            operator: 'AND',
          },
          action: {
            type: 'modify_threshold',
            parameters: { threshold: optimalThreshold },
            priority: 5,
          },
          confidence: Math.min(0.9, successfulBuilds.length / typeBuilds.length),
          source: 'automatic',
        })
      );
    }

    return patterns;
  }

  private extractAgentPatterns(builds: BuildRecord[]): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Group by project type and complexity
    const grouped = this.groupBy(builds, b => `${b.projectType}:${b.complexity}`);

    for (const [key, groupBuilds] of Object.entries(grouped)) {
      if (groupBuilds.length < this.config.minSamplesForPattern) continue;

      const [projectType, complexity] = key.split(':');
      const successfulBuilds = groupBuilds.filter(
        b => b.status === 'completed' && b.overallQuality >= 7
      );
      if (successfulBuilds.length < 3) continue;

      // Find agents with consistently high scores
      const agentScores: Record<string, number[]> = {};
      for (const build of successfulBuilds) {
        for (const [agentId, score] of Object.entries(build.qualityScores)) {
          if (!agentScores[agentId]) agentScores[agentId] = [];
          agentScores[agentId].push(score);
        }
      }

      const highPerformingAgents: string[] = [];
      for (const [agentId, scores] of Object.entries(agentScores)) {
        const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        if (avgScore >= 7.5 && scores.length >= 3) {
          highPerformingAgents.push(agentId);
        }
      }

      if (highPerformingAgents.length > 0) {
        patterns.push(
          this.createPattern({
            type: 'agent_selection',
            trigger: {
              conditions: [
                { field: 'projectType', operator: 'equals', value: projectType },
                { field: 'complexity', operator: 'equals', value: complexity },
              ],
              operator: 'AND',
            },
            action: {
              type: 'add_agent',
              parameters: { priorityAgents: highPerformingAgents },
              priority: 7,
            },
            confidence: successfulBuilds.length / groupBuilds.length,
            source: 'automatic',
          })
        );
      }
    }

    return patterns;
  }

  private extractRetryPatterns(builds: BuildRecord[]): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Analyze builds with retries
    const buildsWithRetries = builds.filter(b => {
      return Object.values(b.outputs).some(o => o.retryCount > 0);
    });

    if (buildsWithRetries.length < this.config.minSamplesForPattern) return patterns;

    // Group by project type
    const byType = this.groupBy(buildsWithRetries, b => b.projectType);

    for (const [projectType, typeBuilds] of Object.entries(byType)) {
      if (typeBuilds.length < 3) continue;

      // Find optimal retry count
      const successfulWithRetries = typeBuilds.filter(
        b => b.status === 'completed' && b.overallQuality >= 7
      );
      if (successfulWithRetries.length < 2) continue;

      const avgRetries =
        successfulWithRetries.reduce((sum, b) => {
          const totalRetries = Object.values(b.outputs).reduce((s, o) => s + o.retryCount, 0);
          return sum + totalRetries;
        }, 0) / successfulWithRetries.length;

      const optimalRetries = Math.ceil(avgRetries);

      patterns.push(
        this.createPattern({
          type: 'retry_strategy',
          trigger: {
            conditions: [{ field: 'projectType', operator: 'equals', value: projectType }],
            operator: 'AND',
          },
          action: {
            type: optimalRetries > 2 ? 'increase_retries' : 'decrease_retries',
            parameters: { suggestedRetries: optimalRetries },
            priority: 4,
          },
          confidence: successfulWithRetries.length / typeBuilds.length,
          source: 'automatic',
        })
      );
    }

    return patterns;
  }

  private extractErrorPatterns(builds: BuildRecord[]): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Find builds with errors that were recovered
    const recoveredBuilds = builds.filter(
      b => b.status === 'completed' && b.errors.some(e => e.recoverable)
    );

    if (recoveredBuilds.length < this.config.minSamplesForPattern) return patterns;

    // Group errors by type/message pattern
    const errorGroups: Record<string, { count: number; agentIds: Set<string>; recovered: number }> =
      {};

    for (const build of recoveredBuilds) {
      for (const error of build.errors) {
        // Extract error type from message
        const errorType = this.extractErrorType(error.error);

        if (!errorGroups[errorType]) {
          errorGroups[errorType] = { count: 0, agentIds: new Set(), recovered: 0 };
        }

        errorGroups[errorType].count += 1;
        errorGroups[errorType].agentIds.add(error.agentId);
        if (error.recoverable) {
          errorGroups[errorType].recovered += 1;
        }
      }
    }

    for (const [errorType, stats] of Object.entries(errorGroups)) {
      if (stats.count < 3) continue;

      const recoveryRate = stats.recovered / stats.count;
      if (recoveryRate < 0.5) continue;

      patterns.push(
        this.createPattern({
          type: 'error_recovery',
          trigger: {
            conditions: [{ field: 'errorType', operator: 'matches', value: errorType }],
            operator: 'AND',
          },
          action: {
            type: 'apply_fallback',
            parameters: {
              errorType,
              affectedAgents: Array.from(stats.agentIds),
              recoveryRate,
            },
            priority: 8,
          },
          confidence: recoveryRate,
          source: 'automatic',
        })
      );
    }

    return patterns;
  }

  private extractCostPatterns(builds: BuildRecord[]): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Find cost-efficient builds (high quality, lower than average cost)
    const completedBuilds = builds.filter(b => b.status === 'completed');
    if (completedBuilds.length < this.config.minSamplesForPattern) return patterns;

    const avgCost = completedBuilds.reduce((sum, b) => sum + b.costUSD, 0) / completedBuilds.length;
    const avgQuality =
      completedBuilds.reduce((sum, b) => sum + b.overallQuality, 0) / completedBuilds.length;

    // Find builds that are both high quality and cost efficient
    const efficientBuilds = completedBuilds.filter(
      b => b.overallQuality >= avgQuality && b.costUSD < avgCost * 0.8
    );

    if (efficientBuilds.length < 3) return patterns;

    // Group by tier
    const byTier = this.groupBy(efficientBuilds, b => b.tier);

    for (const [tier, tierBuilds] of Object.entries(byTier)) {
      if (tierBuilds.length < 2) continue;

      const avgTierCost = tierBuilds.reduce((sum, b) => sum + b.costUSD, 0) / tierBuilds.length;
      const savingsPercent = ((avgCost - avgTierCost) / avgCost) * 100;

      patterns.push(
        this.createPattern({
          type: 'cost_optimization',
          trigger: {
            conditions: [{ field: 'tier', operator: 'equals', value: tier }],
            operator: 'AND',
          },
          action: {
            type: 'alert_user',
            parameters: {
              message: `Using ${tier} tier can save ~${savingsPercent.toFixed(0)}% on similar projects`,
              savingsPercent,
              avgCost: avgTierCost,
            },
            priority: 3,
          },
          confidence: tierBuilds.length / efficientBuilds.length,
          source: 'automatic',
        })
      );
    }

    return patterns;
  }

  // ============================================================================
  // Pattern Matching
  // ============================================================================

  private matchesTrigger(trigger: PatternTrigger, context: PatternMatchContext): boolean {
    const results = trigger.conditions.map(condition => this.matchesCondition(condition, context));

    if (trigger.operator === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  private matchesCondition(condition: TriggerCondition, context: PatternMatchContext): boolean {
    const contextValue = (context as Record<string, unknown>)[condition.field];

    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;

      case 'contains':
        if (typeof contextValue === 'string') {
          return contextValue.includes(String(condition.value));
        }
        if (Array.isArray(contextValue)) {
          return contextValue.includes(condition.value);
        }
        return false;

      case 'greaterThan':
        return typeof contextValue === 'number' && contextValue > (condition.value as number);

      case 'lessThan':
        return typeof contextValue === 'number' && contextValue < (condition.value as number);

      case 'matches':
        if (typeof contextValue !== 'string') return false;
        try {
          const regex = new RegExp(String(condition.value));
          return regex.test(contextValue);
        } catch {
          return false;
        }

      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue);

      default:
        return false;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private createPattern(params: {
    type: PatternType;
    trigger: PatternTrigger;
    action: PatternAction;
    confidence: number;
    source: 'automatic' | 'manual' | 'feedback';
  }): LearnedPattern {
    return {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      trigger: params.trigger,
      action: params.action,
      successRate: 0.5, // Initial neutral rate
      timesApplied: 0,
      lastApplied: null,
      confidence: params.confidence,
      minSamples: this.config.minSamplesForPattern,
      actualSamples: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: params.source,
    };
  }

  private groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
    const groups: Record<string, T[]> = {};
    for (const item of items) {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }

  private extractErrorType(errorMessage: string): string {
    // Extract a normalized error type from the message
    const patterns = [
      /timeout/i,
      /rate.?limit/i,
      /validation.?error/i,
      /parse.?error/i,
      /connection/i,
      /auth/i,
      /permission/i,
      /not.?found/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(errorMessage)) {
        return pattern.source.replace(/[^a-z]/gi, '_').toLowerCase();
      }
    }

    return 'unknown_error';
  }

  // ============================================================================
  // Utility Operations
  // ============================================================================

  async count(): Promise<number> {
    return this.patterns.size;
  }

  async countByType(type: PatternType): Promise<number> {
    return this.patternsByType.get(type)?.size || 0;
  }

  async clear(): Promise<void> {
    this.patterns.clear();
    this.patternsByType.clear();
  }

  async getStatistics(): Promise<{
    total: number;
    byType: Record<PatternType, number>;
    avgConfidence: number;
    avgSuccessRate: number;
    totalApplications: number;
  }> {
    const allPatterns = Array.from(this.patterns.values());

    const byType: Partial<Record<PatternType, number>> = {};
    let totalConfidence = 0;
    let totalSuccessRate = 0;
    let totalApplications = 0;

    for (const pattern of allPatterns) {
      byType[pattern.type] = (byType[pattern.type] || 0) + 1;
      totalConfidence += pattern.confidence;
      totalSuccessRate += pattern.successRate;
      totalApplications += pattern.timesApplied;
    }

    return {
      total: allPatterns.length,
      byType: byType as Record<PatternType, number>,
      avgConfidence: allPatterns.length > 0 ? totalConfidence / allPatterns.length : 0,
      avgSuccessRate: allPatterns.length > 0 ? totalSuccessRate / allPatterns.length : 0,
      totalApplications,
    };
  }
}

// ============================================================================
// Pattern Action Executor
// ============================================================================

export interface PatternActionResult {
  success: boolean;
  applied: boolean;
  changes: Record<string, unknown>;
  message: string;
}

/**
 * Execute a pattern action and return the result
 */
export function executePatternAction(
  action: PatternAction,
  context: Record<string, unknown>
): PatternActionResult {
  const target = context && typeof context === 'object' ? context : {};
  switch (action.type) {
    case 'modify_threshold':
      if (!target.thresholds || typeof target.thresholds !== 'object') {
        target.thresholds = {};
      }
      if (action.parameters.dimension) {
        (target.thresholds as Record<string, number>)[String(action.parameters.dimension)] = Number(
          action.parameters.threshold
        );
      }
      return {
        success: true,
        applied: true,
        changes: target,
        message: `Modified quality threshold to ${action.parameters.threshold}`,
      };

    case 'add_agent':
      return {
        success: true,
        applied: true,
        changes: { priorityAgents: action.parameters.priorityAgents },
        message: `Prioritized agents: ${(action.parameters.priorityAgents as string[]).join(', ')}`,
      };

    case 'skip_agent':
      return {
        success: true,
        applied: true,
        changes: { skipAgents: action.parameters.skipAgents },
        message: `Skipping agents: ${(action.parameters.skipAgents as string[]).join(', ')}`,
      };

    case 'increase_retries':
      target.retryPolicy = Number(action.parameters.suggestedRetries);
      return {
        success: true,
        applied: true,
        changes: target,
        message: `Increased max retries to ${action.parameters.suggestedRetries}`,
      };

    case 'decrease_retries':
      target.retryPolicy = Number(action.parameters.suggestedRetries);
      return {
        success: true,
        applied: true,
        changes: target,
        message: `Decreased max retries to ${action.parameters.suggestedRetries}`,
      };

    case 'adjust_retry':
      target.retryPolicy = Number(
        action.parameters.retryPolicy ??
          action.parameters.maxRetries ??
          action.parameters.suggestedRetries
      );
      return {
        success: true,
        applied: true,
        changes: target,
        message: `Adjusted retry policy to ${target.retryPolicy}`,
      };

    case 'enable_parallel':
      return {
        success: true,
        applied: true,
        changes: { parallelExecution: true },
        message: 'Enabled parallel execution based on pattern',
      };

    case 'disable_parallel':
      return {
        success: true,
        applied: true,
        changes: { parallelExecution: false },
        message: 'Disabled parallel execution based on pattern',
      };

    case 'apply_fallback':
      return {
        success: true,
        applied: true,
        changes: { fallback: action.parameters },
        message: `Applied fallback strategy for ${action.parameters.errorType}`,
      };

    case 'alert_user':
      return {
        success: true,
        applied: true,
        changes: { alert: action.parameters.message },
        message: String(action.parameters.message),
      };

    case 'enhance_prompt':
      return {
        success: true,
        applied: true,
        changes: { promptEnhancement: action.parameters },
        message: 'Applied prompt enhancement',
      };

    case 'reorder_phases':
      return {
        success: true,
        applied: true,
        changes: { phaseOrder: action.parameters.order },
        message: 'Reordered phases based on pattern',
      };

    default:
      return {
        success: false,
        applied: false,
        changes: {},
        message: `Unknown action type: ${action.type}`,
      };
  }
}
