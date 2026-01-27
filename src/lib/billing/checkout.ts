/**
 * OLYMPUS 2.0 - Checkout Session Management
 */

import { getStripe, withStripeErrorHandling } from './stripe';
import { getOrCreateCustomer } from './customer';
import { createServiceRoleClient } from '@/lib/auth/clients';
import { BillingError, BILLING_ERROR_CODES } from './errors';
import { TRIAL_CONFIG, BILLING_CONFIG } from './constants';
import type { CreateCheckoutParams, CheckoutSession, BillingPeriod } from './types';

/**
 * Create a Stripe Checkout session for subscription.
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<CheckoutSession> {
  const { tenantId, planId, billingPeriod, successUrl, cancelUrl, promoCode } = params;

  const supabase = createServiceRoleClient();

  // Get tenant details
  const { data: rawTenant } = await supabase
    .from('tenants')
    .select('id, name, owner_id')
    .eq('id', tenantId)
    .single();
  const tenant = rawTenant as any;

  if (!tenant) {
    throw new BillingError(BILLING_ERROR_CODES.UNKNOWN_ERROR, { reason: 'Tenant not found' });
  }

  // Get owner email
  const { data: rawOwner } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', tenant.owner_id)
    .single();
  const owner = rawOwner as any;

  if (!owner?.email) {
    throw new BillingError(BILLING_ERROR_CODES.UNKNOWN_ERROR, { reason: 'Owner email not found' });
  }

  // Get plan and price
  const { data: rawPlan } = await supabase.from('plans').select('*').eq('id', planId).single();
  const plan = rawPlan as any;

  if (!plan) {
    throw new BillingError(BILLING_ERROR_CODES.UNKNOWN_ERROR, { reason: 'Plan not found' });
  }

  const priceId =
    billingPeriod === 'annual' ? plan.stripe_price_annual_id : plan.stripe_price_monthly_id;
  if (!priceId) {
    throw new BillingError(BILLING_ERROR_CODES.BILLING_NOT_CONFIGURED, { plan: plan.tier });
  }

  // Get or create Stripe customer
  const customerId = await getOrCreateCustomer({
    tenantId,
    email: owner.email,
    name: tenant.name,
  });

  // Check if eligible for trial
  const trialEligible = await isTrialEligible(tenantId);

  // Create checkout session
  const stripe = getStripe();
  const session = await withStripeErrorHandling(
    () =>
      stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        subscription_data: {
          trial_period_days: trialEligible ? TRIAL_CONFIG.DURATION_DAYS : undefined,
          metadata: { tenant_id: tenantId, plan_id: planId },
        },
        allow_promotion_codes: BILLING_CONFIG.ALLOW_PROMO_CODES && !promoCode,
        discounts: promoCode ? [{ promotion_code: promoCode }] : undefined,
        metadata: { tenant_id: tenantId, plan_id: planId },
        billing_address_collection: 'auto',
        tax_id_collection: { enabled: true },
      }),
    'Create checkout session'
  );

  return {
    id: session.id,
    url: session.url!,
    expiresAt: session.expires_at,
  };
}

/**
 * Check if tenant is eligible for trial.
 */
async function isTrialEligible(tenantId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // Check if tenant ever had a subscription
  const { data: rawData } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);
  const data = rawData as any;

  return !data || data.length === 0;
}

/**
 * Get price ID for plan and period.
 */
export async function getPriceId(planId: string, period: BillingPeriod): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data: rawData } = await supabase
    .from('plans')
    .select('stripe_price_monthly_id, stripe_price_annual_id')
    .eq('id', planId)
    .single();
  const data = rawData as any;

  if (!data) return null;
  return period === 'annual' ? data.stripe_price_annual_id : data.stripe_price_monthly_id;
}
