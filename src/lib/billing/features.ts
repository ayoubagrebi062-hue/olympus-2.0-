/**
 * OLYMPUS 2.0 - Feature Gating
 */

import { createServiceRoleClient } from '@/lib/auth/clients';
import { PLAN_FEATURES, FEATURE_DEFINITIONS, PLAN_ORDER } from './constants';
import { getTenantPlanTier } from './subscriptions';
import { BillingError, BILLING_ERROR_CODES } from './errors';
import type { Feature, PlanTier, FeatureCheckResult } from './types';

/**
 * Check if tenant has access to a feature.
 */
export async function hasFeature(tenantId: string, feature: Feature): Promise<boolean> {
  const planTier = await getTenantPlanTier(tenantId);
  return planHasFeature(planTier, feature);
}

/**
 * Check if a plan tier has a specific feature.
 */
export function planHasFeature(tier: PlanTier, feature: Feature): boolean {
  // Enterprise has all features
  if (tier === 'enterprise') return true;

  const features = PLAN_FEATURES[tier] || [];
  return features.includes(feature);
}

/**
 * Get detailed feature check result.
 */
export async function checkFeature(
  tenantId: string,
  feature: Feature
): Promise<FeatureCheckResult> {
  const currentPlan = await getTenantPlanTier(tenantId);
  const hasIt = planHasFeature(currentPlan, feature);

  // Find minimum required plan
  let requiredPlan: PlanTier | null = null;
  if (!hasIt) {
    const definition = FEATURE_DEFINITIONS[feature];
    requiredPlan = definition?.requiredPlan || null;
  }

  return {
    hasFeature: hasIt,
    requiredPlan,
    currentPlan,
  };
}

/**
 * Require a feature, throw if not available.
 */
export async function requireFeature(tenantId: string, feature: Feature): Promise<void> {
  const result = await checkFeature(tenantId, feature);

  if (!result.hasFeature) {
    throw new BillingError(BILLING_ERROR_CODES.FEATURE_NOT_AVAILABLE, {
      feature,
      currentPlan: result.currentPlan,
      requiredPlan: result.requiredPlan,
    });
  }
}

/**
 * Get all features for a plan tier.
 */
export function getFeaturesForPlan(tier: PlanTier): Feature[] {
  if (tier === 'enterprise') {
    return Object.keys(FEATURE_DEFINITIONS) as Feature[];
  }
  return PLAN_FEATURES[tier] || [];
}

/**
 * Get all features available to a tenant.
 */
export async function getTenantFeatures(tenantId: string): Promise<Feature[]> {
  const planTier = await getTenantPlanTier(tenantId);
  return getFeaturesForPlan(planTier);
}

/**
 * Get features that would be unlocked by upgrading.
 */
export function getUpgradeFeatures(currentTier: PlanTier, targetTier: PlanTier): Feature[] {
  const currentFeatures = new Set(getFeaturesForPlan(currentTier));
  const targetFeatures = getFeaturesForPlan(targetTier);

  return targetFeatures.filter(f => !currentFeatures.has(f));
}

/**
 * Get minimum plan required for a feature.
 */
export function getMinimumPlanForFeature(feature: Feature): PlanTier {
  const definition = FEATURE_DEFINITIONS[feature];
  return definition?.requiredPlan || 'enterprise';
}

/**
 * Check multiple features at once.
 */
export async function checkFeatures(
  tenantId: string,
  features: Feature[]
): Promise<Record<Feature, boolean>> {
  const planTier = await getTenantPlanTier(tenantId);
  const result: Record<string, boolean> = {};

  for (const feature of features) {
    result[feature] = planHasFeature(planTier, feature);
  }

  return result as Record<Feature, boolean>;
}

/**
 * Get feature comparison for plans (for pricing table).
 */
export function getFeatureComparison(): Record<Feature, Record<PlanTier, boolean>> {
  const allFeatures = Object.keys(FEATURE_DEFINITIONS) as Feature[];
  const comparison: Record<string, Record<string, boolean>> = {};

  for (const feature of allFeatures) {
    comparison[feature] = {};
    for (const tier of PLAN_ORDER) {
      comparison[feature][tier] = planHasFeature(tier, feature);
    }
  }

  return comparison as Record<Feature, Record<PlanTier, boolean>>;
}
