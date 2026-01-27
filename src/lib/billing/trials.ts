/**
 * OLYMPUS 2.0 - Trial Management
 */

import { createServiceRoleClient } from '@/lib/auth/clients';
import { getStripe, withStripeErrorHandling } from './stripe';
import { TRIAL_CONFIG } from './constants';
import { getSubscription } from './subscriptions';
import { BillingError, BILLING_ERROR_CODES } from './errors';
import type { Trial, ExtendTrialParams, PlanTier } from './types';

/**
 * Check if tenant is eligible for trial.
 */
export async function isTrialEligible(tenantId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data: rawData } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);
  const data = rawData as any;
  return !data || data.length === 0;
}

/**
 * Get current trial status.
 */
export async function getTrialStatus(tenantId: string): Promise<Trial | null> {
  const subscription = await getSubscription(tenantId);
  if (!subscription || subscription.status !== 'trialing' || !subscription.trial_end) return null;

  const trialEnd = new Date(subscription.trial_end);
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    tenantId,
    planTier: subscription.plan.tier as PlanTier,
    startDate: subscription.trial_start || subscription.created_at,
    endDate: subscription.trial_end,
    daysRemaining,
    isExpired: now > trialEnd,
    wasExtended: (subscription as any).trial_extended || false,
  };
}

/**
 * Extend trial period.
 */
export async function extendTrial(params: ExtendTrialParams): Promise<Trial> {
  const { tenantId, days, reason } = params;
  const subscription = await getSubscription(tenantId);

  if (!subscription || subscription.status !== 'trialing') {
    throw new BillingError(BILLING_ERROR_CODES.NO_ACTIVE_SUBSCRIPTION, {
      reason: 'No active trial',
    });
  }
  if (!subscription.stripe_subscription_id || !subscription.trial_end) {
    throw new BillingError(BILLING_ERROR_CODES.STRIPE_API_ERROR);
  }

  const newEnd = new Date(new Date(subscription.trial_end).getTime() + days * 24 * 60 * 60 * 1000);

  const stripe = getStripe();
  await withStripeErrorHandling(
    () =>
      stripe.subscriptions.update(subscription.stripe_subscription_id!, {
        trial_end: Math.floor(newEnd.getTime() / 1000),
        metadata: { trial_extension_reason: reason },
      }),
    'Extend trial'
  );

  await (createServiceRoleClient().from('subscriptions') as any)
    .update({ trial_end: newEnd.toISOString(), trial_extended: true })
    .eq('id', subscription.id);

  return (await getTrialStatus(tenantId))!;
}

/**
 * Get tenant IDs with trials expiring soon.
 */
export async function getExpiringTrials(daysAhead: number = 3): Promise<string[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const { data: rawData } = await createServiceRoleClient()
    .from('subscriptions')
    .select('tenant_id')
    .eq('status', 'trialing')
    .lte('trial_end', futureDate.toISOString())
    .gt('trial_end', new Date().toISOString());
  const data = rawData as any;
  return data?.map((s: any) => s.tenant_id) || [];
}

/**
 * Handle expired trial (downgrade to free).
 */
export async function handleTrialExpired(tenantId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: rawFreePlan } = await supabase
    .from('plans')
    .select('id')
    .eq('tier', 'free')
    .single();
  const freePlan = rawFreePlan as any;
  if (!freePlan) return;

  await (supabase.from('subscriptions') as any)
    .update({
      plan_id: freePlan.id,
      status: 'canceled',
      trial_end: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('status', 'trialing');
}

/**
 * Get trial configuration.
 */
export function getTrialConfig() {
  return {
    durationDays: TRIAL_CONFIG.DURATION_DAYS,
    planTier: TRIAL_CONFIG.PLAN_TIER,
    requiresPaymentMethod: TRIAL_CONFIG.REQUIRE_PAYMENT_METHOD,
  };
}
