/**
 * OLYMPUS 2.0 - Subscription Billing Period Management
 */

import { getStripe, withStripeErrorHandling } from '../stripe';
import { createServiceRoleClient } from '@/lib/auth/clients';
import { BillingError, BILLING_ERROR_CODES } from '../errors';
import { requireSubscription } from './core';
import type { BillingPeriod, Subscription } from '../types';

/**
 * Switch billing period (monthly <-> annual).
 */
export async function switchBillingPeriod(
  tenantId: string,
  newPeriod: BillingPeriod
): Promise<{
  subscription: Subscription;
  proratedAmount: number;
  savings: number;
}> {
  const supabase = createServiceRoleClient();
  const subscription = await requireSubscription(tenantId);

  if (!subscription.stripe_subscription_id) {
    throw new BillingError(BILLING_ERROR_CODES.NO_ACTIVE_SUBSCRIPTION);
  }

  if (subscription.billing_period === newPeriod) {
    throw new BillingError(BILLING_ERROR_CODES.INVALID_PLAN_CHANGE, {
      reason: `Already on ${newPeriod} billing`,
    });
  }

  // Get new price ID
  const newPriceId = newPeriod === 'annual'
    ? subscription.plan.stripe_price_annual_id
    : subscription.plan.stripe_price_monthly_id;

  if (!newPriceId) {
    throw new BillingError(BILLING_ERROR_CODES.BILLING_NOT_CONFIGURED);
  }

  const stripe = getStripe();

  // Get current subscription from Stripe
  const stripeSubscription = await withStripeErrorHandling(
    () => stripe.subscriptions.retrieve(subscription.stripe_subscription_id!),
    'Get subscription'
  );

  const itemId = stripeSubscription.items.data[0]?.id;
  if (!itemId) {
    throw new BillingError(BILLING_ERROR_CODES.STRIPE_API_ERROR);
  }

  // Update subscription
  const updated = await withStripeErrorHandling(
    () => stripe.subscriptions.update(subscription.stripe_subscription_id!, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: 'create_prorations',
      billing_cycle_anchor: 'now',
    }),
    'Switch billing period'
  );

  // Update local database
  await (supabase.from('subscriptions') as any)
    .update({
      billing_period: newPeriod,
      stripe_price_id: newPriceId,
      current_period_start: new Date((updated as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((updated as any).current_period_end * 1000).toISOString(),
    })
    .eq('id', subscription.id);

  // Calculate savings
  const monthlyCost = subscription.plan.price_monthly;
  const annualCost = subscription.plan.price_annual;
  const savings = newPeriod === 'annual' ? (monthlyCost * 12) - annualCost : 0;

  // Get prorated amount
  const upcomingInvoice = await (stripe.invoices as any).retrieveUpcoming({
    subscription: subscription.stripe_subscription_id!,
  }).catch(() => null);

  return {
    subscription: { ...subscription, billing_period: newPeriod } as Subscription,
    proratedAmount: upcomingInvoice?.amount_due || 0,
    savings,
  };
}

/**
 * Get billing period switch preview.
 */
export async function previewBillingPeriodSwitch(
  tenantId: string,
  newPeriod: BillingPeriod
): Promise<{
  currentAmount: number;
  newAmount: number;
  proratedCredit: number;
  amountDue: number;
  savings: number;
}> {
  const subscription = await requireSubscription(tenantId);

  if (!subscription.stripe_subscription_id) {
    throw new BillingError(BILLING_ERROR_CODES.NO_ACTIVE_SUBSCRIPTION);
  }

  const newPriceId = newPeriod === 'annual'
    ? subscription.plan.stripe_price_annual_id
    : subscription.plan.stripe_price_monthly_id;

  const stripe = getStripe();
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
  const itemId = stripeSubscription.items.data[0]?.id;

  const preview = await (stripe.invoices as any).retrieveUpcoming({
    subscription: subscription.stripe_subscription_id,
    subscription_items: [{ id: itemId, price: newPriceId }],
    subscription_proration_behavior: 'create_prorations',
    subscription_billing_cycle_anchor: 'now',
  });

  const currentAmount = subscription.billing_period === 'annual'
    ? subscription.plan.price_annual
    : subscription.plan.price_monthly;

  const newAmount = newPeriod === 'annual'
    ? subscription.plan.price_annual
    : subscription.plan.price_monthly;

  const savings = newPeriod === 'annual'
    ? (subscription.plan.price_monthly * 12) - subscription.plan.price_annual
    : 0;

  return {
    currentAmount,
    newAmount,
    proratedCredit: Math.abs(preview.starting_balance || 0),
    amountDue: preview.amount_due,
    savings,
  };
}

// Alias for backward compatibility
export const changeBillingPeriod = switchBillingPeriod;
