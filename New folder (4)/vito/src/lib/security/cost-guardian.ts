/**
 * OLYMPUS 2.1 - SECURITY BLUEPRINT
 * Cost Guardian - AI Cost Protection
 * 
 * Prevents cost exhaustion attacks and budget overruns.
 * Critical for multi-tenant SaaS with AI costs.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TIER LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

export type PlanTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

export interface TierLimits {
  tokensPerMonth: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  buildsPerDay: number;
  concurrentBuilds: number;
  alertThresholdPerHour: number;  // USD
  hardStopPerHour: number;        // USD
  allowCustomBudget: boolean;
}

export const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  free: {
    tokensPerMonth: 10_000,
    maxInputTokens: 2_000,
    maxOutputTokens: 2_000,
    buildsPerDay: 3,
    concurrentBuilds: 1,
    alertThresholdPerHour: 1,
    hardStopPerHour: 2,
    allowCustomBudget: false,
  },
  starter: {
    tokensPerMonth: 100_000,
    maxInputTokens: 4_000,
    maxOutputTokens: 4_000,
    buildsPerDay: 10,
    concurrentBuilds: 1,
    alertThresholdPerHour: 5,
    hardStopPerHour: 10,
    allowCustomBudget: false,
  },
  pro: {
    tokensPerMonth: 500_000,
    maxInputTokens: 8_000,
    maxOutputTokens: 8_000,
    buildsPerDay: 50,
    concurrentBuilds: 3,
    alertThresholdPerHour: 25,
    hardStopPerHour: 50,
    allowCustomBudget: true,
  },
  business: {
    tokensPerMonth: 2_000_000,
    maxInputTokens: 16_000,
    maxOutputTokens: 16_000,
    buildsPerDay: 200,
    concurrentBuilds: 5,
    alertThresholdPerHour: 100,
    hardStopPerHour: 200,
    allowCustomBudget: true,
  },
  enterprise: {
    tokensPerMonth: Infinity,
    maxInputTokens: 32_000,
    maxOutputTokens: 32_000,
    buildsPerDay: Infinity,
    concurrentBuilds: 10,
    alertThresholdPerHour: Infinity,  // Custom
    hardStopPerHour: Infinity,        // Custom
    allowCustomBudget: true,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COST CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface AIProviderPricing {
  inputPer1k: number;   // USD per 1000 input tokens
  outputPer1k: number;  // USD per 1000 output tokens
}

export const AI_PRICING: Record<string, AIProviderPricing> = {
  'claude-opus': { inputPer1k: 0.015, outputPer1k: 0.075 },
  'claude-sonnet': { inputPer1k: 0.003, outputPer1k: 0.015 },
  'claude-haiku': { inputPer1k: 0.00025, outputPer1k: 0.00125 },
  'gpt-4-turbo': { inputPer1k: 0.01, outputPer1k: 0.03 },
  'gpt-4o': { inputPer1k: 0.005, outputPer1k: 0.015 },
  'gpt-3.5-turbo': { inputPer1k: 0.0005, outputPer1k: 0.0015 },
};

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const pricing = AI_PRICING[model] || AI_PRICING['claude-sonnet'];
  return (
    (inputTokens / 1000) * pricing.inputPer1k +
    (outputTokens / 1000) * pricing.outputPer1k
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USAGE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface UsageRecord {
  tenantId: string;
  userId: string;
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  buildId?: string;
}

export interface UsageSummary {
  hourly: number;
  daily: number;
  monthly: number;
  tokensUsed: number;
  tokensRemaining: number;
  buildsToday: number;
  buildsRemaining: number;
}

// Redis key patterns for tracking
export const REDIS_KEYS = {
  hourlySpend: (tenantId: string) => `cost:hourly:${tenantId}`,
  dailySpend: (tenantId: string) => `cost:daily:${tenantId}`,
  monthlySpend: (tenantId: string) => `cost:monthly:${tenantId}`,
  tokensUsed: (tenantId: string) => `tokens:monthly:${tenantId}`,
  buildsToday: (tenantId: string) => `builds:daily:${tenantId}`,
  budgetPaused: (tenantId: string) => `budget:paused:${tenantId}`,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// LIMIT CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  limit?: string;
  current?: number;
  max?: number;
  suggestion?: string;
}

export function checkTokenLimit(
  requestTokens: number,
  tier: PlanTier,
  direction: 'input' | 'output'
): LimitCheckResult {
  const limits = TIER_LIMITS[tier];
  const max = direction === 'input' ? limits.maxInputTokens : limits.maxOutputTokens;

  if (requestTokens > max) {
    return {
      allowed: false,
      reason: `${direction} tokens exceed limit`,
      limit: `max_${direction}_tokens`,
      current: requestTokens,
      max,
      suggestion: tier === 'enterprise' 
        ? 'Contact support for higher limits'
        : `Upgrade to ${getNextTier(tier)} for higher limits`,
    };
  }

  return { allowed: true };
}

export function checkMonthlyTokens(
  tokensUsed: number,
  tier: PlanTier
): LimitCheckResult {
  const limits = TIER_LIMITS[tier];
  
  if (tokensUsed >= limits.tokensPerMonth) {
    return {
      allowed: false,
      reason: 'Monthly token quota exceeded',
      limit: 'tokens_per_month',
      current: tokensUsed,
      max: limits.tokensPerMonth,
      suggestion: tier === 'enterprise'
        ? 'Contact support'
        : `Upgrade to ${getNextTier(tier)} or wait until next billing cycle`,
    };
  }

  return { allowed: true };
}

export function checkDailyBuilds(
  buildsToday: number,
  tier: PlanTier
): LimitCheckResult {
  const limits = TIER_LIMITS[tier];
  
  if (buildsToday >= limits.buildsPerDay) {
    return {
      allowed: false,
      reason: 'Daily build limit reached',
      limit: 'builds_per_day',
      current: buildsToday,
      max: limits.buildsPerDay,
      suggestion: 'Try again tomorrow or upgrade your plan',
    };
  }

  return { allowed: true };
}

export function checkHourlySpend(
  hourlySpend: number,
  tier: PlanTier
): LimitCheckResult {
  const limits = TIER_LIMITS[tier];
  
  if (hourlySpend >= limits.hardStopPerHour) {
    return {
      allowed: false,
      reason: 'Hourly spend limit exceeded (safety stop)',
      limit: 'hard_stop_per_hour',
      current: hourlySpend,
      max: limits.hardStopPerHour,
      suggestion: 'This is a safety feature. Contact support if legitimate.',
    };
  }

  return { allowed: true };
}

function getNextTier(current: PlanTier): PlanTier {
  const order: PlanTier[] = ['free', 'starter', 'pro', 'business', 'enterprise'];
  const index = order.indexOf(current);
  return order[Math.min(index + 1, order.length - 1)];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export interface CostGuardianCheckInput {
  tenantId: string;
  tier: PlanTier;
  inputTokens: number;
  outputTokens: number;
  model: string;
  currentUsage: {
    hourlySpend: number;
    dailySpend: number;
    monthlyTokens: number;
    buildsToday: number;
  };
  customBudget?: {
    monthlyLimit?: number;
    dailyLimit?: number;
  };
}

export interface CostGuardianResult {
  allowed: boolean;
  estimatedCost: number;
  checks: {
    inputTokens: LimitCheckResult;
    outputTokens: LimitCheckResult;
    monthlyTokens: LimitCheckResult;
    dailyBuilds: LimitCheckResult;
    hourlySpend: LimitCheckResult;
    customBudget?: LimitCheckResult;
  };
  warnings: string[];
  blockedBy?: string;
}

export function costGuardianCheck(input: CostGuardianCheckInput): CostGuardianResult {
  const { tier, inputTokens, outputTokens, model, currentUsage, customBudget } = input;
  const limits = TIER_LIMITS[tier];
  const warnings: string[] = [];

  // Calculate estimated cost
  const estimatedCost = calculateCost(inputTokens, outputTokens, model);

  // Run all checks
  const checks = {
    inputTokens: checkTokenLimit(inputTokens, tier, 'input'),
    outputTokens: checkTokenLimit(outputTokens, tier, 'output'),
    monthlyTokens: checkMonthlyTokens(
      currentUsage.monthlyTokens + inputTokens + outputTokens,
      tier
    ),
    dailyBuilds: checkDailyBuilds(currentUsage.buildsToday + 1, tier),
    hourlySpend: checkHourlySpend(currentUsage.hourlySpend + estimatedCost, tier),
  };

  // Check custom budget if set
  let customBudgetCheck: LimitCheckResult | undefined;
  if (customBudget && limits.allowCustomBudget) {
    if (customBudget.dailyLimit && currentUsage.dailySpend + estimatedCost > customBudget.dailyLimit) {
      customBudgetCheck = {
        allowed: false,
        reason: 'Custom daily budget exceeded',
        limit: 'custom_daily_budget',
        current: currentUsage.dailySpend + estimatedCost,
        max: customBudget.dailyLimit,
        suggestion: 'Adjust your budget in settings or wait until tomorrow',
      };
    }
  }

  // Check for warnings (approaching limits)
  if (currentUsage.hourlySpend + estimatedCost >= limits.alertThresholdPerHour) {
    warnings.push(`Approaching hourly spend alert threshold ($${limits.alertThresholdPerHour})`);
  }

  const tokensAfter = currentUsage.monthlyTokens + inputTokens + outputTokens;
  if (tokensAfter >= limits.tokensPerMonth * 0.8) {
    warnings.push(`Used ${Math.round((tokensAfter / limits.tokensPerMonth) * 100)}% of monthly tokens`);
  }

  // Determine if blocked
  const allChecks = [
    checks.inputTokens,
    checks.outputTokens,
    checks.monthlyTokens,
    checks.dailyBuilds,
    checks.hourlySpend,
    customBudgetCheck,
  ].filter(Boolean) as LimitCheckResult[];

  const blockedCheck = allChecks.find(c => !c.allowed);

  return {
    allowed: !blockedCheck,
    estimatedCost,
    checks: {
      ...checks,
      customBudget: customBudgetCheck,
    },
    warnings,
    blockedBy: blockedCheck?.limit,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

export type AlertType = 'spend_spike' | 'approaching_limit' | 'hard_stop' | 'unusual_activity';

export interface CostAlert {
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  tenantId: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export function createSpendAlert(
  tenantId: string,
  hourlySpend: number,
  threshold: number,
  isHardStop: boolean
): CostAlert {
  return {
    type: isHardStop ? 'hard_stop' : 'spend_spike',
    severity: isHardStop ? 'critical' : 'warning',
    tenantId,
    message: isHardStop
      ? `Hard stop triggered: $${hourlySpend.toFixed(2)} spent in last hour (limit: $${threshold})`
      : `Spend spike alert: $${hourlySpend.toFixed(2)} spent in last hour (threshold: $${threshold})`,
    data: { hourlySpend, threshold },
    timestamp: new Date(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const COST_GUARDIAN = {
  tiers: TIER_LIMITS,
  pricing: AI_PRICING,
  calculateCost,
  check: costGuardianCheck,
  redisKeys: REDIS_KEYS,
  createAlert: createSpendAlert,
};
