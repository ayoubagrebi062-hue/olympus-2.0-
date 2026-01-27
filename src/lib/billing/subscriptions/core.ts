/**
 * OLYMPUS 2.0 - Subscription Management (Core)
 */

import { createServiceRoleClient } from '@/lib/auth/clients';
import { BillingError, BILLING_ERROR_CODES } from '../errors';
import type { Subscription, SubscriptionWithPlan, PlanTier } from '../types';

/**
 * Get active subscription for tenant.
 */
export async function getSubscription(tenantId: string): Promise<SubscriptionWithPlan | null> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from('subscriptions')
    .select(`*, plan:plans(*)`)
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("canceled","incomplete_expired")')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data as SubscriptionWithPlan | null;
}

/**
 * Get subscription by Stripe subscription ID.
 */
export async function getSubscriptionByStripeId(
  stripeSubscriptionId: string
): Promise<Subscription | null> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single();

  return data;
}

/**
 * Get tenant's current plan tier.
 */
export async function getTenantPlanTier(tenantId: string): Promise<PlanTier> {
  const subscription = await getSubscription(tenantId);

  if (!subscription) return 'free';
  if (subscription.status === 'trialing' || subscription.status === 'active') {
    return subscription.plan.tier as PlanTier;
  }

  return 'free';
}

/**
 * Check if tenant has active subscription.
 */
export async function hasActiveSubscription(tenantId: string): Promise<boolean> {
  const subscription = await getSubscription(tenantId);
  return subscription !== null && ['active', 'trialing'].includes(subscription.status);
}

/**
 * Get subscription status summary.
 */
export async function getSubscriptionStatus(tenantId: string): Promise<{
  hasSubscription: boolean;
  status: string;
  planTier: PlanTier;
  isTrialing: boolean;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}> {
  const subscription = await getSubscription(tenantId);

  if (!subscription) {
    return {
      hasSubscription: false,
      status: 'none',
      planTier: 'free',
      isTrialing: false,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    };
  }

  return {
    hasSubscription: true,
    status: subscription.status,
    planTier: subscription.plan.tier as PlanTier,
    isTrialing: subscription.status === 'trialing',
    trialEndsAt: subscription.trial_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: subscription.current_period_end,
  };
}

/**
 * Require active subscription, throw if not found.
 */
export async function requireSubscription(tenantId: string): Promise<SubscriptionWithPlan> {
  const subscription = await getSubscription(tenantId);

  if (!subscription) {
    throw new BillingError(BILLING_ERROR_CODES.NO_ACTIVE_SUBSCRIPTION, { tenantId });
  }

  return subscription;
}
