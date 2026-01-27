/**
 * OLYMPUS 2.0 - Subscription Plan Changes
 */

import { getStripe, withStripeErrorHandling } from '../stripe';
import { createServiceRoleClient } from '@/lib/auth/clients';
import { BillingError, BILLING_ERROR_CODES } from '../errors';
import { isUpgrade, isDowngrade } from '../constants';
import { requireSubscription } from './core';
import type { ChangePlanParams, SubscriptionChange, PlanTier } from '../types';

/**
 * Change subscription plan (upgrade or downgrade).
 * Supports both: changePlan({ tenantId, newPlanId }) and changePlan(tenantId, newPlanId, immediate)
 */
export async function changePlan(
  params: ChangePlanParams | string,
  newPlanIdArg?: string,
  immediateArg?: boolean
): Promise<SubscriptionChange> {
  const resolvedParams: ChangePlanParams = typeof params === 'string'
    ? { tenantId: params, newPlanId: newPlanIdArg!, immediate: immediateArg }
    : params;
  const { tenantId, newPlanId, immediate = true, prorationBehavior = 'create_prorations' } = resolvedParams;

  const supabase = createServiceRoleClient();

  // Get current subscription
  const subscription = await requireSubscription(tenantId);

  if (!subscription.stripe_subscription_id) {
    throw new BillingError(BILLING_ERROR_CODES.NO_ACTIVE_SUBSCRIPTION);
  }

  // Get new plan
  const { data: rawNewPlan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', newPlanId)
    .single();
  const newPlan = rawNewPlan as any;

  if (!newPlan) {
    throw new BillingError(BILLING_ERROR_CODES.INVALID_PLAN_CHANGE, { reason: 'Plan not found' });
  }

  // Determine change type
  const currentTier = subscription.plan.tier as PlanTier;
  const newTier = newPlan.tier as PlanTier;
  const changeType = isUpgrade(currentTier, newTier) ? 'upgrade'
    : isDowngrade(currentTier, newTier) ? 'downgrade' : 'same_tier';

  // Get new price ID
  const newPriceId = subscription.billing_period === 'annual'
    ? newPlan.stripe_price_annual_id
    : newPlan.stripe_price_monthly_id;

  if (!newPriceId) {
    throw new BillingError(BILLING_ERROR_CODES.BILLING_NOT_CONFIGURED, { plan: newTier });
  }

  // Update subscription in Stripe
  const stripe = getStripe();
  const stripeSubscription = await withStripeErrorHandling(
    () => stripe.subscriptions.retrieve(subscription.stripe_subscription_id!),
    'Get subscription'
  );

  const itemId = stripeSubscription.items.data[0]?.id;
  if (!itemId) {
    throw new BillingError(BILLING_ERROR_CODES.STRIPE_API_ERROR, { reason: 'No subscription items' });
  }

  const updatedSubscription = await withStripeErrorHandling(
    () => stripe.subscriptions.update(subscription.stripe_subscription_id!, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: immediate ? prorationBehavior : 'none',
      billing_cycle_anchor: immediate ? 'now' : 'unchanged',
    }),
    'Update subscription'
  );

  // Update local database
  await (supabase.from('subscriptions') as any)
    .update({
      plan_id: newPlanId,
      stripe_price_id: newPriceId,
      current_period_start: new Date((updatedSubscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((updatedSubscription as any).current_period_end * 1000).toISOString(),
    })
    .eq('id', subscription.id);

  // Calculate prorated amount
  const upcomingInvoice = await (stripe.invoices as any).retrieveUpcoming({
    subscription: subscription.stripe_subscription_id!,
  }).catch(() => null);

  return {
    type: changeType,
    fromPlan: currentTier,
    toPlan: newTier,
    proratedAmount: upcomingInvoice?.amount_due || 0,
    effectiveDate: immediate ? new Date().toISOString() : subscription.current_period_end,
  };
}

/**
 * Preview plan change without executing.
 */
export async function previewPlanChange(params: ChangePlanParams): Promise<{
  proratedAmount: number;
  newMonthlyAmount: number;
  effectiveDate: string;
}> {
  const { tenantId, newPlanId, immediate = true } = params;
  const supabase = createServiceRoleClient();

  const subscription = await requireSubscription(tenantId);
  if (!subscription.stripe_subscription_id) {
    throw new BillingError(BILLING_ERROR_CODES.NO_ACTIVE_SUBSCRIPTION);
  }

  const { data: rawNewPlan } = await supabase.from('plans').select('*').eq('id', newPlanId).single();
  const newPlan = rawNewPlan as any;
  if (!newPlan) throw new BillingError(BILLING_ERROR_CODES.INVALID_PLAN_CHANGE);

  const newPriceId = subscription.billing_period === 'annual'
    ? newPlan.stripe_price_annual_id : newPlan.stripe_price_monthly_id;

  const stripe = getStripe();
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
  const itemId = stripeSubscription.items.data[0]?.id;

  const preview = await (stripe.invoices as any).retrieveUpcoming({
    subscription: subscription.stripe_subscription_id,
    subscription_items: [{ id: itemId, price: newPriceId }],
    subscription_proration_behavior: immediate ? 'create_prorations' : 'none',
  });

  return {
    proratedAmount: preview.amount_due,
    newMonthlyAmount: newPlan.price_monthly,
    effectiveDate: immediate ? new Date().toISOString() : subscription.current_period_end,
  };
}
