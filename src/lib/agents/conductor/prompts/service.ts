/**
 * PROMPT SERVICE
 * Phase 5 of OLYMPUS 50X - CRITICAL for Level 5 (EVOLUTION MODULE)
 *
 * High-level service for prompt management with:
 * - Memory caching (fast in-process cache)
 * - Redis caching (distributed cache)
 * - Hardcoded fallback (reliability)
 * - A/B testing support
 * - Performance tracking
 */

import { PromptStore } from './store';
import {
  LoadedPrompt,
  PromptRecord,
  CreatePromptInput,
  UpdatePromptInput,
  PromptServiceConfig,
  CachedPrompt,
  PromptPerformance,
  PromptExperiment,
  ExperimentResults,
  DEFAULT_PROMPT_SERVICE_CONFIG,
  PromptHistoryEntry,
} from './types';
import { getHardcodedPrompt, getAllHardcodedPrompts, hasHardcodedPrompt } from './hardcoded';

// Redis type (optional dependency)
type RedisClient = {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
};

export class PromptService {
  private store: PromptStore;
  private cache: Map<string, CachedPrompt>;
  private redis?: RedisClient;
  private config: PromptServiceConfig;
  private initialized: boolean = false;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config?: Partial<PromptServiceConfig>,
    redis?: RedisClient
  ) {
    this.store = new PromptStore(supabaseUrl, supabaseKey);
    this.cache = new Map();
    this.config = {
      ...DEFAULT_PROMPT_SERVICE_CONFIG,
      ...config,
    };
    this.redis = redis;
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  /**
   * Initialize the service (preload prompts if configured)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.preloadAll();
      this.initialized = true;
      console.log('[PromptService] Initialized successfully');
    } catch (error) {
      console.error('[PromptService] Initialization failed:', error);
      // Continue anyway - will use fallbacks
    }
  }

  // =========================================================================
  // PROMPT LOADING (Main API for agents)
  // =========================================================================

  /**
   * Get prompt for an agent (main entry point for agent execution)
   *
   * Priority:
   * 1. Memory cache
   * 2. Redis cache (if available)
   * 3. Database
   * 4. Hardcoded fallback
   */
  async getPrompt(agentId: string): Promise<LoadedPrompt> {
    // 1. Check memory cache
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(agentId);
      if (cached) {
        return cached;
      }
    }

    // 2. Check Redis cache
    if (this.redis) {
      const redisCached = await this.getFromRedis(agentId);
      if (redisCached) {
        this.setInCache(agentId, redisCached);
        return redisCached;
      }
    }

    // 3. Load from database
    try {
      const prompt = await this.store.getActivePrompt(agentId);

      if (prompt) {
        // Cache the result
        this.setInCache(agentId, prompt);
        if (this.redis) {
          await this.setInRedis(agentId, prompt);
        }
        return prompt;
      }
    } catch (error) {
      console.error(`[PromptService] Failed to load prompt from DB for ${agentId}:`, error);
    }

    // 4. Fallback to hardcoded
    if (this.config.fallbackToHardcoded) {
      const hardcoded = getHardcodedPrompt(agentId);
      if (hardcoded) {
        console.warn(`[PromptService] Using hardcoded prompt for ${agentId} (DB not available)`);
        return hardcoded;
      }
    }

    throw new Error(`No prompt found for agent: ${agentId}`);
  }

  /**
   * Get prompt without fallback (for admin/management)
   */
  async getPromptStrict(agentId: string): Promise<LoadedPrompt | null> {
    try {
      return await this.store.getActivePrompt(agentId);
    } catch {
      return null;
    }
  }

  /**
   * Preload all active prompts into cache
   */
  async preloadAll(): Promise<number> {
    try {
      const prompts = await this.store.getAllActivePrompts();

      for (const prompt of prompts) {
        this.setInCache(prompt.agentId, prompt);
        if (this.redis) {
          await this.setInRedis(prompt.agentId, prompt);
        }
      }

      console.log(`[PromptService] Preloaded ${prompts.length} prompts into cache`);
      return prompts.length;
    } catch (error) {
      console.error('[PromptService] Failed to preload prompts:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache for an agent (call after updates)
   */
  invalidateCache(agentId: string): void {
    this.cache.delete(agentId);
    if (this.redis) {
      this.redis.del(`prompt:${agentId}`).catch(err => {
        console.error(`[PromptService] Failed to delete Redis cache for ${agentId}:`, err);
      });
    }
  }

  /**
   * Invalidate all caches
   */
  invalidateAllCaches(): void {
    this.cache.clear();
    if (this.redis) {
      this.redis
        .keys('prompt:*')
        .then(keys => {
          if (keys.length > 0) {
            return this.redis!.del(...keys);
          }
        })
        .catch(err => {
          console.error('[PromptService] Failed to clear Redis cache:', err);
        });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryCacheSize: number;
    memoryCacheAgents: string[];
  } {
    return {
      memoryCacheSize: this.cache.size,
      memoryCacheAgents: Array.from(this.cache.keys()),
    };
  }

  // =========================================================================
  // PROMPT MANAGEMENT
  // =========================================================================

  /**
   * Create new prompt version
   */
  async createPrompt(input: CreatePromptInput): Promise<PromptRecord> {
    return this.store.createPrompt(input);
  }

  /**
   * Update prompt
   */
  async updatePrompt(promptId: string, input: UpdatePromptInput): Promise<PromptRecord> {
    const result = await this.store.updatePrompt(promptId, input);

    // Invalidate cache for this agent
    this.invalidateCache(result.agentId);

    return result;
  }

  /**
   * Activate a prompt version (make it the default)
   */
  async activatePrompt(promptId: string, changedBy?: string): Promise<void> {
    const prompt = await this.store.getPrompt(promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    await this.store.activatePrompt(promptId, changedBy);

    // Invalidate cache
    this.invalidateCache(prompt.agentId);
  }

  /**
   * Archive a prompt
   */
  async archivePrompt(promptId: string): Promise<void> {
    const prompt = await this.store.getPrompt(promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    await this.store.archivePrompt(promptId);

    // Invalidate cache if this was active
    if (prompt.isDefault) {
      this.invalidateCache(prompt.agentId);
    }
  }

  /**
   * Get specific prompt by ID
   */
  async getPromptById(promptId: string): Promise<PromptRecord | null> {
    return this.store.getPrompt(promptId);
  }

  /**
   * Get all versions for an agent
   */
  async getPromptVersions(agentId: string): Promise<PromptRecord[]> {
    return this.store.getPromptsForAgent(agentId);
  }

  /**
   * Get prompt history
   */
  async getPromptHistory(promptId: string): Promise<PromptHistoryEntry[]> {
    return this.store.getHistory(promptId);
  }

  /**
   * Check if prompt exists (in DB or hardcoded)
   */
  async hasPrompt(agentId: string): Promise<boolean> {
    // Check DB first
    const versions = await this.store.getPromptsForAgent(agentId);
    if (versions.length > 0) return true;

    // Check hardcoded
    return hasHardcodedPrompt(agentId);
  }

  /**
   * Get list of all agents with prompts
   */
  async getAllAgentIds(): Promise<string[]> {
    const hardcodedAgents = getAllHardcodedPrompts().map(p => p.agentId);

    // Get unique agent IDs from DB (would need a dedicated query)
    // For now, return hardcoded list
    return [...new Set(hardcodedAgents)];
  }

  // =========================================================================
  // PERFORMANCE TRACKING
  // =========================================================================

  /**
   * Record performance metrics for a prompt
   */
  async recordPerformance(
    promptId: string,
    buildId: string,
    metrics: {
      qualityScore: number;
      tokensUsed: number;
      latencyMs: number;
      passedValidation: boolean;
      retryCount: number;
    }
  ): Promise<void> {
    if (!this.config.trackPerformance) return;

    await this.store.recordPerformance({
      promptId,
      buildId,
      ...metrics,
    });
  }

  /**
   * Get performance history
   */
  async getPerformanceHistory(promptId: string, limit?: number): Promise<PromptPerformance[]> {
    return this.store.getPerformanceHistory(promptId, limit);
  }

  /**
   * Get aggregate performance stats
   */
  async getPerformanceStats(promptId: string): Promise<{
    count: number;
    avgQualityScore: number;
    successRate: number;
    avgTokensUsed: number;
    avgLatencyMs: number;
  }> {
    return this.store.getPerformanceStats(promptId);
  }

  // =========================================================================
  // A/B TESTING
  // =========================================================================

  /**
   * Create A/B test experiment
   */
  async createExperiment(
    agentId: string,
    name: string,
    controlPromptId: string,
    variantPromptIds: string[],
    trafficSplit: Record<string, number>,
    options?: {
      description?: string;
      minSampleSize?: number;
      createdBy?: string;
    }
  ): Promise<string> {
    if (!this.config.abTestingEnabled) {
      throw new Error('A/B testing is disabled');
    }

    // Validate traffic split
    const totalTraffic = Object.values(trafficSplit).reduce((sum, val) => sum + val, 0);
    if (totalTraffic !== 100) {
      throw new Error(`Traffic split must total 100, got ${totalTraffic}`);
    }

    const experiment = await this.store.createExperiment({
      agentId,
      name,
      description: options?.description,
      controlPromptId,
      variantPromptIds,
      trafficSplit,
      minSampleSize: options?.minSampleSize || 100,
      status: 'draft',
      createdBy: options?.createdBy,
    });

    return experiment.id;
  }

  /**
   * Start experiment
   */
  async startExperiment(experimentId: string): Promise<void> {
    if (!this.config.abTestingEnabled) {
      throw new Error('A/B testing is disabled');
    }

    await this.store.startExperiment(experimentId);

    // Invalidate cache for the agent
    const exp = await this.store.getExperiment(experimentId);
    if (exp) {
      this.invalidateCache(exp.agentId);
    }
  }

  /**
   * End experiment and optionally promote winner
   */
  async endExperiment(
    experimentId: string,
    winnerPromptId: string,
    promoteWinner: boolean = true
  ): Promise<void> {
    const exp = await this.store.getExperiment(experimentId);
    if (!exp) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    // Calculate results from performance data
    const results = await this.calculateExperimentResults(exp);

    await this.store.endExperiment(experimentId, winnerPromptId, results);

    // Promote winner as default
    if (promoteWinner) {
      await this.activatePrompt(winnerPromptId);
    }

    // Invalidate cache
    this.invalidateCache(exp.agentId);
  }

  /**
   * Cancel experiment
   */
  async cancelExperiment(experimentId: string): Promise<void> {
    await this.store.cancelExperiment(experimentId);

    const exp = await this.store.getExperiment(experimentId);
    if (exp) {
      this.invalidateCache(exp.agentId);
    }
  }

  /**
   * Get experiment details
   */
  async getExperiment(experimentId: string): Promise<PromptExperiment | null> {
    return this.store.getExperiment(experimentId);
  }

  /**
   * Get experiments for an agent
   */
  async getExperimentsForAgent(agentId: string): Promise<PromptExperiment[]> {
    return this.store.getExperimentsForAgent(agentId);
  }

  /**
   * Get running experiments for an agent
   */
  async getRunningExperiments(agentId: string): Promise<PromptExperiment[]> {
    return this.store.getRunningExperiments(agentId);
  }

  /**
   * Calculate experiment results
   */
  private async calculateExperimentResults(exp: PromptExperiment): Promise<ExperimentResults> {
    const allPromptIds = [exp.controlPromptId, ...exp.variantPromptIds];
    const variants: ExperimentResults['variants'] = [];

    for (const promptId of allPromptIds) {
      const stats = await this.store.getPerformanceStats(promptId);
      const prompt = await this.store.getPrompt(promptId);

      variants.push({
        promptId,
        name: prompt?.name || promptId,
        sampleSize: stats.count,
        avgQualityScore: stats.avgQualityScore,
        successRate: stats.successRate,
        avgLatencyMs: stats.avgLatencyMs,
        confidenceInterval: this.calculateConfidenceInterval(stats.avgQualityScore, stats.count),
      });
    }

    // Determine winner (highest quality score with sufficient samples)
    const validVariants = variants.filter(v => v.sampleSize >= exp.minSampleSize);
    const winner =
      validVariants.length > 0
        ? validVariants.reduce((best, curr) =>
            curr.avgQualityScore > best.avgQualityScore ? curr : best
          )
        : undefined;

    return {
      variants,
      winner: winner?.promptId,
      confidence: this.calculateConfidence(variants),
      recommendation: this.generateRecommendation(variants, winner, exp.minSampleSize),
    };
  }

  /**
   * Calculate confidence interval for a metric
   */
  private calculateConfidenceInterval(mean: number, n: number): [number, number] {
    if (n === 0) return [0, 0];

    // Simple 95% confidence interval approximation
    const stdError = 1 / Math.sqrt(n);
    const margin = 1.96 * stdError;

    return [Math.max(0, mean - margin), Math.min(10, mean + margin)];
  }

  /**
   * Calculate overall confidence in results
   */
  private calculateConfidence(variants: ExperimentResults['variants']): number {
    const totalSamples = variants.reduce((sum, v) => sum + v.sampleSize, 0);
    if (totalSamples === 0) return 0;

    // More samples = higher confidence (max at ~1000 samples)
    return Math.min(1, totalSamples / 1000);
  }

  /**
   * Generate human-readable recommendation
   */
  private generateRecommendation(
    variants: ExperimentResults['variants'],
    winner: ExperimentResults['variants'][0] | undefined,
    minSampleSize: number
  ): string {
    const totalSamples = variants.reduce((sum, v) => sum + v.sampleSize, 0);

    if (totalSamples < minSampleSize) {
      return `Need more data. Only ${totalSamples} of ${minSampleSize} minimum samples collected.`;
    }

    if (!winner) {
      return 'No clear winner. Consider running experiment longer.';
    }

    const improvement =
      variants.length > 1
        ? ((winner.avgQualityScore - variants[0].avgQualityScore) / variants[0].avgQualityScore) *
          100
        : 0;

    if (Math.abs(improvement) < 5) {
      return `No significant difference. ${winner.name} marginally better.`;
    }

    return improvement > 0
      ? `Promote ${winner.name}. ${improvement.toFixed(1)}% improvement in quality score.`
      : `Keep control. Variant ${improvement.toFixed(1)}% worse.`;
  }

  // =========================================================================
  // CACHE HELPERS
  // =========================================================================

  private getFromCache(agentId: string): LoadedPrompt | null {
    const cached = this.cache.get(agentId);
    if (!cached) return null;

    if (new Date() > cached.expiresAt) {
      this.cache.delete(agentId);
      return null;
    }

    return cached.prompt;
  }

  private setInCache(agentId: string, prompt: LoadedPrompt): void {
    this.cache.set(agentId, {
      prompt,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.cacheTtlMs),
    });
  }

  private async getFromRedis(agentId: string): Promise<LoadedPrompt | null> {
    if (!this.redis) return null;

    try {
      const data = await this.redis.get(`prompt:${agentId}`);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private async setInRedis(agentId: string, prompt: LoadedPrompt): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.setex(
        `prompt:${agentId}`,
        Math.floor(this.config.cacheTtlMs / 1000),
        JSON.stringify(prompt)
      );
    } catch (error) {
      console.error('[PromptService] Failed to cache prompt in Redis:', error);
    }
  }
}
