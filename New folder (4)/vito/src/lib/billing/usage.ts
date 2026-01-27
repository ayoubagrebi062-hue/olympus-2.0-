/**
 * OLYMPUS 2.0 - Usage Tracking
 */

import { createServiceRoleClient } from '@/lib/auth/clients';
import { BillingError, BILLING_ERROR_CODES } from './errors';
import { checkLimit } from './limits';
import type { TrackUsageParams, UsageMetric } from './types';

/**
 * Track usage for a tenant.
 */
export async function trackUsage(params: TrackUsageParams): Promise<{
  recorded: boolean;
  usageId: string | null;
  current: number;
  limit: number;
}> {
  const { tenantId, metric, quantity, idempotencyKey, metadata } = params;

  // Check if within limits first
  const limitCheck = await checkLimit({ tenantId, metric, quantityToAdd: quantity });

  if (!limitCheck.allowed && !limitCheck.canPurchaseMore) {
    throw new BillingError(BILLING_ERROR_CODES.LIMIT_REACHED, {
      metric,
      current: limitCheck.current,
      limit: limitCheck.limit,
    });
  }

  const supabase = createServiceRoleClient();

  // Use database function for atomic increment
  const { data, error } = await (supabase.rpc as any)('increment_usage', {
    p_tenant_id: tenantId,
    p_metric: metric,
    p_quantity: quantity,
    p_idempotency_key: idempotencyKey || null,
  });

  if (error) {
    console.error('[usage] Failed to track usage:', error);
    throw new BillingError(BILLING_ERROR_CODES.UNKNOWN_ERROR, { error: error.message });
  }

  return {
    recorded: true,
    usageId: data,
    current: limitCheck.current + quantity,
    limit: limitCheck.limit,
  };
}

/**
 * Track a single build.
 */
export async function trackBuild(tenantId: string, buildId?: string): Promise<void> {
  await trackUsage({
    tenantId,
    metric: 'builds',
    quantity: 1,
    idempotencyKey: buildId ? `build:${buildId}` : undefined,
    metadata: { buildId },
  });
}

/**
 * Track a single deploy.
 */
export async function trackDeploy(tenantId: string, deployId?: string): Promise<void> {
  await trackUsage({
    tenantId,
    metric: 'deploys',
    quantity: 1,
    idempotencyKey: deployId ? `deploy:${deployId}` : undefined,
    metadata: { deployId },
  });
}

/**
 * Track storage usage (in bytes).
 */
export async function trackStorage(tenantId: string, bytes: number): Promise<void> {
  const gb = bytes / (1024 * 1024 * 1024);
  await trackUsage({
    tenantId,
    metric: 'storage',
    quantity: Math.ceil(gb * 100) / 100, // Round to 2 decimal places
  });
}

/**
 * Track AI token usage.
 */
export async function trackAiTokens(tenantId: string, tokens: number, requestId?: string): Promise<void> {
  await trackUsage({
    tenantId,
    metric: 'ai_tokens',
    quantity: tokens,
    idempotencyKey: requestId ? `ai:${requestId}` : undefined,
  });
}

/**
 * Track API call.
 */
export async function trackApiCall(tenantId: string): Promise<void> {
  await trackUsage({
    tenantId,
    metric: 'api_calls',
    quantity: 1,
  });
}

/**
 * Get current usage for a metric.
 */
export async function getCurrentUsage(tenantId: string, metric: UsageMetric): Promise<number> {
  const supabase = createServiceRoleClient();

  const { data } = await (supabase.rpc as any)('get_usage_for_period', {
    p_tenant_id: tenantId,
    p_metric: metric,
  });

  return data || 0;
}

/**
 * Get all usage for current period.
 */
export async function getAllUsage(tenantId: string): Promise<Record<UsageMetric, number>> {
  const metrics: UsageMetric[] = ['builds', 'deploys', 'storage', 'ai_tokens', 'api_calls'];
  const results: Record<string, number> = {};

  for (const metric of metrics) {
    results[metric] = await getCurrentUsage(tenantId, metric);
  }

  return results as Record<UsageMetric, number>;
}
