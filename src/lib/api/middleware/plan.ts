/**
 * OLYMPUS 2.0 - Plan-Aware Middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthorizationError } from '../errors';
import type { TenantContext, PlanTier, RouteParams } from '../types';

type TenantHandler<T> = (
  req: NextRequest,
  ctx: TenantContext,
  params: RouteParams
) => Promise<NextResponse<T>>;

/**
 * Plan feature matrix.
 */
const PLAN_FEATURES: Record<PlanTier, string[]> = {
  free: ['basic_projects', 'basic_builds'],
  starter: ['basic_projects', 'basic_builds', 'custom_domains', 'priority_builds'],
  pro: [
    'basic_projects',
    'basic_builds',
    'custom_domains',
    'priority_builds',
    'team_collaboration',
    'advanced_analytics',
    'api_access',
  ],
  business: [
    'basic_projects',
    'basic_builds',
    'custom_domains',
    'priority_builds',
    'team_collaboration',
    'advanced_analytics',
    'api_access',
    'sso',
    'audit_logs',
    'sla',
  ],
  enterprise: [
    'basic_projects',
    'basic_builds',
    'custom_domains',
    'priority_builds',
    'team_collaboration',
    'advanced_analytics',
    'api_access',
    'sso',
    'audit_logs',
    'sla',
    'dedicated_support',
    'custom_integrations',
  ],
};

/**
 * Plan limits.
 */
const PLAN_LIMITS: Record<
  PlanTier,
  { projects: number; builds: number; deploys: number; members: number }
> = {
  free: { projects: 1, builds: 3, deploys: 1, members: 1 },
  starter: { projects: 5, builds: 20, deploys: 10, members: 3 },
  pro: { projects: 20, builds: 100, deploys: 50, members: 10 },
  business: { projects: 100, builds: 500, deploys: 200, members: 50 },
  enterprise: { projects: -1, builds: -1, deploys: -1, members: -1 }, // Unlimited
};

/**
 * Check if plan has feature.
 */
export function planHasFeature(plan: PlanTier, feature: string): boolean {
  return PLAN_FEATURES[plan]?.includes(feature) || false;
}

/**
 * Get limit for plan.
 */
export function getPlanLimit(plan: PlanTier, limitType: keyof typeof PLAN_LIMITS.free): number {
  return PLAN_LIMITS[plan]?.[limitType] ?? 0;
}

/**
 * Middleware that requires a specific plan feature.
 */
export function withPlanFeature<T>(feature: string, handler: TenantHandler<T>): TenantHandler<T> {
  return async (request: NextRequest, ctx: TenantContext, params: RouteParams) => {
    if (!planHasFeature(ctx.tenantPlan, feature)) {
      throw new AuthorizationError('AUTHZ_005', {
        message: `This feature requires a higher plan`,
        details: { feature, currentPlan: ctx.tenantPlan },
      });
    }
    return handler(request, ctx, params);
  };
}

/**
 * Middleware that checks plan limits.
 */
export function withPlanLimit<T>(
  limitType: keyof typeof PLAN_LIMITS.free,
  getCurrentCount: (ctx: TenantContext) => Promise<number>,
  handler: TenantHandler<T>
): TenantHandler<T> {
  return async (request: NextRequest, ctx: TenantContext, params: RouteParams) => {
    const limit = getPlanLimit(ctx.tenantPlan, limitType);

    // -1 means unlimited
    if (limit !== -1) {
      const current = await getCurrentCount(ctx);
      if (current >= limit) {
        throw new AuthorizationError('AUTHZ_005', {
          message: `${limitType} limit reached for your plan`,
          details: { limit, current, plan: ctx.tenantPlan },
        });
      }
    }

    return handler(request, ctx, params);
  };
}

/**
 * Get minimum plan required for feature.
 */
export function getMinimumPlanForFeature(feature: string): PlanTier | null {
  const plans: PlanTier[] = ['free', 'starter', 'pro', 'business', 'enterprise'];
  for (const plan of plans) {
    if (planHasFeature(plan, feature)) return plan;
  }
  return null;
}
