/**
 * OLYMPUS 2.0 - Subscription Cancel & Resume
 */

import { getStripe, withStripeErrorHandling } from '../stripe';
import { createServiceRoleClient } from '@/lib/auth/clients';
import { BillingError, BILLING_ERROR_CODES } from '../errors';
import { requireSubscription, getSubscription } from './core';
import type { CancelSubscriptionParams, ResumeSubscriptionParams, Subscription } from '../types';

/**
 * Cancel subscription.
 * Supports both: cancelSubscription({ tenantId, immediate }) and cancelSubscription(tenantId, immediate)
 */
export async function cancelSubscription(
  params: CancelSubscriptionParams | string,
  immediate?: boolean
): Promise<Subscription> {
  const resolvedParams: CancelSubscriptionParams =
    typeof params === 'string' ? { tenantId: params, immediate: immediate ?? false } : params;
  const { tenantId, immediate: isImmediate = false, reason, feedback } = resolvedParams;
  const subscription = await requireSubscription(tenantId);

  if (!subscription.stripe_subscription_id) {
    throw new BillingError(BILLING_ERROR_CODES.NO_ACTIVE_SUBSCRIPTION);
  }
  if (subscription.status === 'canceled') {
    throw new BillingError(BILLING_ERROR_CODES.SUBSCRIPTION_ALREADY_CANCELED);
  }

  const stripe = getStripe();
  const supabase = createServiceRoleClient();

  if (isImmediate) {
    await withStripeErrorHandling(
      () => stripe.subscriptions.cancel(subscription.stripe_subscription_id!),
      'Cancel subscription'
    );
    await (supabase.from('subscriptions') as any)
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancellation_reason: reason,
        cancellation_feedback: feedback,
      })
      .eq('id', subscription.id);
  } else {
    await withStripeErrorHandling(
      () =>
        stripe.subscriptions.update(subscription.stripe_subscription_id!, {
          cancel_at_period_end: true,
          metadata: { cancellation_reason: reason || '', cancellation_feedback: feedback || '' },
        }),
      'Schedule cancellation'
    );
    await (supabase.from('subscriptions') as any)
      .update({
        cancel_at_period_end: true,
        cancellation_reason: reason,
        cancellation_feedback: feedback,
      })
      .eq('id', subscription.id);
  }

  return (await getSubscription(tenantId)) as Subscription;
}

/**
 * Resume a subscription scheduled for cancellation.
 * Supports both: resumeSubscription({ tenantId }) and resumeSubscription(tenantId)
 */
export async function resumeSubscription(
  params: ResumeSubscriptionParams | string
): Promise<Subscription> {
  const tenantId = typeof params === 'string' ? params : params.tenantId;
  const subscription = await requireSubscription(tenantId);

  if (!subscription.stripe_subscription_id) {
    throw new BillingError(BILLING_ERROR_CODES.NO_ACTIVE_SUBSCRIPTION);
  }
  if (!subscription.cancel_at_period_end) {
    throw new BillingError(BILLING_ERROR_CODES.INVALID_PLAN_CHANGE, {
      reason: 'Subscription is not scheduled for cancellation',
    });
  }

  const stripe = getStripe();
  const supabase = createServiceRoleClient();

  await withStripeErrorHandling(
    () =>
      stripe.subscriptions.update(subscription.stripe_subscription_id!, {
        cancel_at_period_end: false,
      }),
    'Resume subscription'
  );

  await (supabase.from('subscriptions') as any)
    .update({
      cancel_at_period_end: false,
      cancellation_reason: null,
      cancellation_feedback: null,
    })
    .eq('id', subscription.id);

  return (await getSubscription(tenantId)) as Subscription;
}

/**
 * Pause subscription.
 */
export async function pauseSubscription(tenantId: string): Promise<void> {
  const subscription = await requireSubscription(tenantId);
  if (!subscription.stripe_subscription_id)
    throw new BillingError(BILLING_ERROR_CODES.NO_ACTIVE_SUBSCRIPTION);

  const stripe = getStripe();
  await withStripeErrorHandling(
    () =>
      stripe.subscriptions.update(subscription.stripe_subscription_id!, {
        pause_collection: { behavior: 'mark_uncollectible' },
      }),
    'Pause subscription'
  );
  await (createServiceRoleClient().from('subscriptions') as any)
    .update({ status: 'paused' })
    .eq('id', subscription.id);
}

/**
 * Unpause subscription.
 */
export async function unpauseSubscription(tenantId: string): Promise<void> {
  const subscription = await requireSubscription(tenantId);
  if (!subscription.stripe_subscription_id)
    throw new BillingError(BILLING_ERROR_CODES.NO_ACTIVE_SUBSCRIPTION);

  const stripe = getStripe();
  await withStripeErrorHandling(
    () =>
      stripe.subscriptions.update(subscription.stripe_subscription_id!, { pause_collection: '' }),
    'Unpause subscription'
  );
  await (createServiceRoleClient().from('subscriptions') as any)
    .update({ status: 'active' })
    .eq('id', subscription.id);
}
