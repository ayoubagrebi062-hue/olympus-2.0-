/**
 * OLYMPUS 2.0 - Subscription Webhook Handlers
 *
 * FIXED: Trial ending email now wired (was TODO)
 */

import type Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/auth/clients';
import {
  sendBillingEmail,
  trialEndingEmail,
  subscriptionCanceledEmail
} from '@/lib/billing/emails';
import { PLAN_FEATURES } from '@/lib/billing/constants';

/**
 * Handle subscription created event.
 */
export async function handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  const supabase = createServiceRoleClient();

  // Get tenant from billing customer
  const { data: rawCustomer } = await supabase
    .from('billing_customers')
    .select('tenant_id')
    .eq('stripe_customer_id', customerId)
    .single();
  const customer = rawCustomer as any;

  if (!customer) {
    console.error(`[webhook] No tenant found for customer ${customerId}`);
    return;
  }

  // Get plan from price
  const priceId = subscription.items.data[0]?.price.id;
  const { data: rawPlan } = await supabase
    .from('plans')
    .select('id')
    .or(`stripe_price_monthly_id.eq.${priceId},stripe_price_annual_id.eq.${priceId}`)
    .single();
  const plan = rawPlan as any;

  if (!plan) {
    console.error(`[webhook] No plan found for price ${priceId}`);
    return;
  }

  // Upsert subscription
  await (supabase.from('subscriptions') as any).upsert({
    tenant_id: customer.tenant_id,
    plan_id: plan.id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    stripe_price_id: priceId,
    status: subscription.status,
    billing_period: subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'annual' : 'monthly',
    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
  }, { onConflict: 'stripe_subscription_id' });

  console.log(`[webhook] Created subscription for tenant ${customer.tenant_id}`);
}

/**
 * Handle subscription updated event.
 */
export async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const supabase = createServiceRoleClient();

  const priceId = subscription.items.data[0]?.price.id;

  // Get plan if price changed
  let planId: string | undefined;
  if (priceId) {
    const { data: rawPlan } = await supabase
      .from('plans')
      .select('id')
      .or(`stripe_price_monthly_id.eq.${priceId},stripe_price_annual_id.eq.${priceId}`)
      .single();
    const plan = rawPlan as any;
    planId = plan?.id;
  }

  const updateData: Record<string, unknown> = {
    status: subscription.status,
    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
  };

  if (planId) {
    updateData.plan_id = planId;
    updateData.stripe_price_id = priceId;
    updateData.billing_period = subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'annual' : 'monthly';
  }

  await (supabase.from('subscriptions') as any)
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id);

  console.log(`[webhook] Updated subscription ${subscription.id}`);
}

/**
 * Handle subscription deleted event.
 */
export async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const supabase = createServiceRoleClient();

  await (supabase.from('subscriptions') as any)
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id);

  console.log(`[webhook] Deleted subscription ${subscription.id}`);
}

/**
 * Handle trial will end event (3 days before).
 */
export async function handleTrialWillEnd(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  console.log(`[webhook] Trial ending soon for subscription ${subscription.id}`);

  // FIXED: Send trial ending email notification
  const supabase = createServiceRoleClient();

  try {
    const customerId = subscription.customer as string;

    // Get tenant info
    const { data: customerData } = await supabase
      .from('billing_customers')
      .select('tenant_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (customerData) {
      // Get tenant owner email
      const { data: membership } = await supabase
        .from('tenant_memberships')
        .select('user_id, users(email, full_name)')
        .eq('tenant_id', (customerData as any).tenant_id)
        .eq('role', 'owner')
        .single();

      // Get plan name
      const priceId = subscription.items.data[0]?.price.id;
      const { data: planData } = await supabase
        .from('plans')
        .select('name, tier')
        .or(`stripe_price_monthly_id.eq.${priceId},stripe_price_annual_id.eq.${priceId}`)
        .single();

      if (membership && planData) {
        const user = (membership as any).users;
        const plan = planData as any;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Calculate days remaining
        const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : new Date();
        const now = new Date();
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Get features for this plan tier
        const planFeatures = PLAN_FEATURES[plan.tier as keyof typeof PLAN_FEATURES] || [];
        const featureList = planFeatures.slice(0, 5).map((f: any) => f.name || f);

        const emailContent = trialEndingEmail({
          userName: user.full_name || 'there',
          planName: plan.name,
          daysRemaining: Math.max(1, daysRemaining),
          trialEndDate: trialEnd.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
          upgradeUrl: `${appUrl}/settings/billing?upgrade=true`,
          features: featureList,
        });

        await sendBillingEmail(user.email, emailContent);
        console.log(`[webhook] Trial ending email sent to ${user.email}`);
      }
    }
  } catch (emailError) {
    console.error(`[webhook] Failed to send trial ending email:`, emailError);
    // Don't throw - email failure shouldn't fail the webhook
  }
}
