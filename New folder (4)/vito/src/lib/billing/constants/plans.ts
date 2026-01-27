/**
 * OLYMPUS 2.0 - Billing Constants (Plans)
 */

import type { PlanTier, PlanLimits, Feature } from '../types';

// ============================================================================
// PLAN DEFINITIONS
// ============================================================================

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    builds_per_month: 3,
    deploys_per_month: 1,
    projects: 1,
    team_members: 1,
    storage_gb: 0.1,
    api_calls_per_day: 100,
    ai_tokens_per_month: 10000,
  },
  starter: {
    builds_per_month: 20,
    deploys_per_month: 10,
    projects: 5,
    team_members: 3,
    storage_gb: 1,
    api_calls_per_day: 1000,
    ai_tokens_per_month: 100000,
  },
  pro: {
    builds_per_month: 100,
    deploys_per_month: 50,
    projects: 20,
    team_members: 10,
    storage_gb: 10,
    api_calls_per_day: 10000,
    ai_tokens_per_month: 500000,
  },
  business: {
    builds_per_month: 500,
    deploys_per_month: 200,
    projects: -1,
    team_members: 25,
    storage_gb: 50,
    api_calls_per_day: 50000,
    ai_tokens_per_month: 2000000,
  },
  enterprise: {
    builds_per_month: -1,
    deploys_per_month: -1,
    projects: -1,
    team_members: -1,
    storage_gb: -1,
    api_calls_per_day: -1,
    ai_tokens_per_month: -1,
  },
};

export const PLAN_FEATURES: Record<PlanTier, Feature[]> = {
  free: ['export_code'],
  starter: ['export_code', 'custom_domain', 'team_collaboration'],
  pro: [
    'export_code',
    'custom_domain',
    'team_collaboration',
    'white_label',
    'advanced_analytics',
    'api_access',
    'multiple_environments',
  ],
  business: [
    'export_code',
    'custom_domain',
    'team_collaboration',
    'white_label',
    'advanced_analytics',
    'api_access',
    'multiple_environments',
    'priority_support',
    'sso',
    'audit_logs',
    'custom_branding',
  ],
  enterprise: [
    'export_code',
    'custom_domain',
    'team_collaboration',
    'white_label',
    'advanced_analytics',
    'api_access',
    'multiple_environments',
    'priority_support',
    'sso',
    'audit_logs',
    'custom_branding',
    'dedicated_support',
    'sla_guarantee',
    'custom_integrations',
  ],
};

export const PLAN_PRICING = {
  free: { monthly: 0, annual: 0 },
  starter: { monthly: 1900, annual: 19000 },
  pro: { monthly: 4900, annual: 49000 },
  business: { monthly: 14900, annual: 149000 },
  enterprise: { monthly: 0, annual: 0 },
};

export const PLAN_DISPLAY_NAMES: Record<PlanTier, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

export const PLAN_DESCRIPTIONS: Record<PlanTier, string> = {
  free: 'Perfect for trying out OLYMPUS',
  starter: 'For individuals and small projects',
  pro: 'For growing teams and businesses',
  business: 'For large teams with advanced needs',
  enterprise: 'Custom solutions for large organizations',
};

export const PLAN_ORDER: PlanTier[] = ['free', 'starter', 'pro', 'business', 'enterprise'];

export function getPlanRank(tier: PlanTier): number {
  return PLAN_ORDER.indexOf(tier);
}

export function isUpgrade(from: PlanTier, to: PlanTier): boolean {
  return getPlanRank(to) > getPlanRank(from);
}

export function isDowngrade(from: PlanTier, to: PlanTier): boolean {
  return getPlanRank(to) < getPlanRank(from);
}
