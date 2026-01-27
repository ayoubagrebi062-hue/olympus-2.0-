/**
 * OLYMPUS 3.0 - Usage Tracking Service
 *
 * Real-time usage tracking using Redis for cost monitoring.
 * Replaces placeholder values in AI build routes.
 *
 * @version 3.0.0
 */

import { getClient } from '@/lib/db/redis';
import { REDIS_KEYS, calculateCost } from '@/lib/security/cost-guardian';
import type { CurrentUsage, UsageRecord, USAGE_TTL } from './types';

// ============================================================================
// TTL CONSTANTS (in seconds)
// ============================================================================

const TTL = {
  HOURLY: 3600,        // 1 hour
  DAILY: 86400,        // 24 hours
  MONTHLY: 2678400,    // 31 days
} as const;

// ============================================================================
// USAGE SERVICE CLASS
// ============================================================================

class UsageService {
  /**
   * Get current usage for a tenant
   * Used by cost guardian to check limits before builds
   */
  async getCurrentUsage(tenantId: string): Promise<CurrentUsage> {
    try {
      const redis = getClient();

      // Get all usage values in parallel
      const [hourlySpend, dailySpend, monthlySpend, monthlyTokens, buildsToday] = await Promise.all([
        redis.get(REDIS_KEYS.hourlySpend(tenantId)),
        redis.get(REDIS_KEYS.dailySpend(tenantId)),
        redis.get(REDIS_KEYS.monthlySpend(tenantId)),
        redis.get(REDIS_KEYS.tokensUsed(tenantId)),
        redis.get(REDIS_KEYS.buildsToday(tenantId)),
      ]);

      return {
        hourlySpend: parseFloat(hourlySpend || '0'),
        dailySpend: parseFloat(dailySpend || '0'),
        monthlySpend: parseFloat(monthlySpend || '0'),
        monthlyTokens: parseInt(monthlyTokens || '0', 10),
        buildsToday: parseInt(buildsToday || '0', 10),
      };
    } catch (error) {
      console.error('[UsageService] Failed to get current usage:', error);
      // Return zeros on error - fail open for better UX
      // Cost guardian will still enforce limits on next successful check
      return {
        hourlySpend: 0,
        dailySpend: 0,
        monthlySpend: 0,
        monthlyTokens: 0,
        buildsToday: 0,
      };
    }
  }

  /**
   * Record usage after a build or AI operation
   */
  async recordUsage(record: UsageRecord): Promise<void> {
    try {
      const redis = getClient();
      const { tenantId, inputTokens, outputTokens, cost } = record;
      const totalTokens = inputTokens + outputTokens;

      // Use pipeline for atomic updates
      const pipeline = redis.pipeline();

      // Increment hourly spend (with TTL)
      pipeline.incrbyfloat(REDIS_KEYS.hourlySpend(tenantId), cost);
      pipeline.expire(REDIS_KEYS.hourlySpend(tenantId), TTL.HOURLY);

      // Increment daily spend (with TTL)
      pipeline.incrbyfloat(REDIS_KEYS.dailySpend(tenantId), cost);
      pipeline.expire(REDIS_KEYS.dailySpend(tenantId), TTL.DAILY);

      // Increment monthly spend (with TTL)
      pipeline.incrbyfloat(REDIS_KEYS.monthlySpend(tenantId), cost);
      pipeline.expire(REDIS_KEYS.monthlySpend(tenantId), TTL.MONTHLY);

      // Increment monthly tokens (with TTL)
      pipeline.incrby(REDIS_KEYS.tokensUsed(tenantId), totalTokens);
      pipeline.expire(REDIS_KEYS.tokensUsed(tenantId), TTL.MONTHLY);

      // Increment daily builds (with TTL)
      pipeline.incr(REDIS_KEYS.buildsToday(tenantId));
      pipeline.expire(REDIS_KEYS.buildsToday(tenantId), TTL.DAILY);

      await pipeline.exec();

      if (process.env.NODE_ENV === 'development') {
        console.log(`[UsageService] Recorded: ${totalTokens} tokens, $${cost.toFixed(4)} for tenant ${tenantId}`);
      }
    } catch (error) {
      console.error('[UsageService] Failed to record usage:', error);
      // Don't throw - usage recording failure shouldn't block builds
    }
  }

  /**
   * Record a build start (increments build count only)
   */
  async recordBuildStart(tenantId: string): Promise<void> {
    try {
      const redis = getClient();

      await redis.incr(REDIS_KEYS.buildsToday(tenantId));
      await redis.expire(REDIS_KEYS.buildsToday(tenantId), TTL.DAILY);
    } catch (error) {
      console.error('[UsageService] Failed to record build start:', error);
    }
  }

  /**
   * Check if tenant is budget-paused
   */
  async isBudgetPaused(tenantId: string): Promise<boolean> {
    try {
      const redis = getClient();
      const paused = await redis.get(REDIS_KEYS.budgetPaused(tenantId));
      return paused === 'true' || paused === '1';
    } catch (error) {
      console.error('[UsageService] Failed to check budget pause:', error);
      return false;
    }
  }

  /**
   * Pause budget spending for tenant (e.g., after hard stop)
   */
  async pauseBudget(tenantId: string, durationSeconds: number = TTL.HOURLY): Promise<void> {
    try {
      const redis = getClient();
      await redis.setex(REDIS_KEYS.budgetPaused(tenantId), durationSeconds, 'true');
      console.warn(`[UsageService] Budget PAUSED for tenant ${tenantId} for ${durationSeconds}s`);
    } catch (error) {
      console.error('[UsageService] Failed to pause budget:', error);
    }
  }

  /**
   * Resume budget spending for tenant
   */
  async resumeBudget(tenantId: string): Promise<void> {
    try {
      const redis = getClient();
      await redis.del(REDIS_KEYS.budgetPaused(tenantId));
      console.log(`[UsageService] Budget RESUMED for tenant ${tenantId}`);
    } catch (error) {
      console.error('[UsageService] Failed to resume budget:', error);
    }
  }

  /**
   * Get usage summary for dashboard/reporting
   */
  async getUsageSummary(tenantId: string): Promise<{
    hourly: { spend: number };
    daily: { spend: number; builds: number };
    monthly: { spend: number; tokens: number };
  }> {
    const usage = await this.getCurrentUsage(tenantId);

    return {
      hourly: {
        spend: usage.hourlySpend,
      },
      daily: {
        spend: usage.dailySpend,
        builds: usage.buildsToday,
      },
      monthly: {
        spend: usage.monthlySpend,
        tokens: usage.monthlyTokens,
      },
    };
  }

  /**
   * Reset usage counters (for testing or admin)
   */
  async resetUsage(tenantId: string): Promise<void> {
    try {
      const redis = getClient();
      await redis.del(
        REDIS_KEYS.hourlySpend(tenantId),
        REDIS_KEYS.dailySpend(tenantId),
        REDIS_KEYS.monthlySpend(tenantId),
        REDIS_KEYS.tokensUsed(tenantId),
        REDIS_KEYS.buildsToday(tenantId),
        REDIS_KEYS.budgetPaused(tenantId)
      );
      console.log(`[UsageService] Usage RESET for tenant ${tenantId}`);
    } catch (error) {
      console.error('[UsageService] Failed to reset usage:', error);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const usageService = new UsageService();

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Get current usage for a tenant (convenience wrapper)
 */
export async function getCurrentUsage(tenantId: string): Promise<CurrentUsage> {
  return usageService.getCurrentUsage(tenantId);
}

/**
 * Record usage after an AI operation (convenience wrapper)
 */
export async function recordUsage(
  tenantId: string,
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  buildId?: string
): Promise<void> {
  const cost = calculateCost(inputTokens, outputTokens, model);

  return usageService.recordUsage({
    tenantId,
    userId,
    model,
    inputTokens,
    outputTokens,
    cost,
    buildId,
    timestamp: new Date(),
  });
}
