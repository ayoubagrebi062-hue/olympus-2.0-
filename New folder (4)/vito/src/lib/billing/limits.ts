/**
 * OLYMPUS 2.0 - Usage Limits
 */

import { createServiceRoleClient } from '@/lib/auth/clients';
import { PLAN_LIMITS, OVERAGE_PRICES, USAGE_THRESHOLDS } from './constants';
import { getTenantPlanTier } from './subscriptions';
import type { CheckLimitParams, LimitCheckResult, UsageMetric, PlanTier, UsageSummary } from './types';

/**
 * Check if usage is within limits.
 */
export async function checkLimit(params: CheckLimitParams): Promise<LimitCheckResult> {
  const { tenantId, metric, quantityToAdd = 1 } = params;
  const supabase = createServiceRoleClient();

  const { data: rawData } = await (supabase.rpc as any)('check_usage_limit', {
    p_tenant_id: tenantId, p_metric: metric, p_quantity_to_add: quantityToAdd,
  });
  const data = rawData as any;

  if (!data || data.length === 0) {
    const freeLimit = getLimitForMetric('free', metric);
    return { allowed: false, current: 0, limit: freeLimit, remaining: 0, percentageUsed: 100, canPurchaseMore: false };
  }

  const result = data[0];
  const percentageUsed = result.limit_value > 0 ? Math.round((result.current_usage / result.limit_value) * 100) : 0;

  return {
    allowed: result.allowed,
    current: Number(result.current_usage),
    limit: Number(result.limit_value),
    remaining: Number(result.remaining),
    percentageUsed,
    canPurchaseMore: ['builds', 'deploys', 'storage', 'ai_tokens'].includes(metric),
    overagePrice: OVERAGE_PRICES[metric as keyof typeof OVERAGE_PRICES],
  };
}

/**
 * Get limit value for a metric and plan tier.
 */
export function getLimitForMetric(tier: PlanTier, metric: UsageMetric): number {
  const limits = PLAN_LIMITS[tier];
  const map: Record<UsageMetric, number> = {
    builds: limits.builds_per_month,
    deploys: limits.deploys_per_month,
    storage: limits.storage_gb,
    ai_tokens: limits.ai_tokens_per_month,
    api_calls: limits.api_calls_per_day,
  };
  return map[metric] ?? 0;
}

/**
 * Get usage summary for tenant.
 */
export async function getUsageSummary(tenantId: string): Promise<UsageSummary> {
  const planTier = await getTenantPlanTier(tenantId);
  const supabase = createServiceRoleClient();

  const periodStart = new Date(); periodStart.setDate(1); periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart); periodEnd.setMonth(periodEnd.getMonth() + 1);

  const metrics: UsageMetric[] = ['builds', 'deploys', 'storage', 'ai_tokens', 'api_calls'];
  const summary: Partial<UsageSummary> = {};

  for (const metric of metrics) {
    const { data: rawData } = await (supabase.rpc as any)('get_usage_for_period', {
      p_tenant_id: tenantId, p_metric: metric,
      p_period_start: periodStart.toISOString(), p_period_end: periodEnd.toISOString(),
    });
    const data = rawData as any;
    const current = Number(data) || 0;
    const limit = getLimitForMetric(planTier, metric);

    summary[metric] = {
      tenant_id: tenantId, metric, period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(), total_quantity: current,
      limit: limit === -1 ? Infinity : limit,
      percentage_used: limit > 0 ? Math.round((current / limit) * 100) : 0,
    };
  }
  return summary as UsageSummary;
}

/**
 * Check if tenant is approaching limit.
 */
export async function isApproachingLimit(tenantId: string, metric: UsageMetric): Promise<{
  warning: boolean; critical: boolean; blocked: boolean; percentageUsed: number;
}> {
  const result = await checkLimit({ tenantId, metric });
  return {
    warning: result.percentageUsed >= USAGE_THRESHOLDS.WARNING_PERCENTAGE,
    critical: result.percentageUsed >= USAGE_THRESHOLDS.CRITICAL_PERCENTAGE,
    blocked: result.percentageUsed >= USAGE_THRESHOLDS.BLOCKED_PERCENTAGE,
    percentageUsed: result.percentageUsed,
  };
}

/**
 * Get all limits for a tenant's current plan.
 */
export async function getTenantLimits(tenantId: string): Promise<Record<UsageMetric, number>> {
  const planTier = await getTenantPlanTier(tenantId);
  const limits = PLAN_LIMITS[planTier];
  return {
    builds: limits.builds_per_month, deploys: limits.deploys_per_month,
    storage: limits.storage_gb, ai_tokens: limits.ai_tokens_per_month, api_calls: limits.api_calls_per_day,
  };
}
