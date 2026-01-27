/**
 * OLYMPUS 2.0 - Payment Method Webhook Handlers
 */

import type Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/auth/clients';

/**
 * Handle payment method attached event.
 */
export async function handlePaymentMethodAttached(event: Stripe.Event): Promise<void> {
  const paymentMethod = event.data.object as Stripe.PaymentMethod;
  const customerId = paymentMethod.customer as string;

  if (!customerId) {
    console.log('[webhook] Payment method not attached to customer');
    return;
  }

  const supabase = createServiceRoleClient();

  // Get tenant from billing customer
  const { data: rawCustomer } = await supabase
    .from('billing_customers')
    .select('tenant_id')
    .eq('stripe_customer_id', customerId)
    .single();
  const customer = rawCustomer as any;

  if (!customer) {
    console.log(`[webhook] No tenant found for customer ${customerId}`);
    return;
  }

  // Extract card details
  const card = paymentMethod.card;

  // Upsert payment method
  await (supabase.from('payment_methods') as any).upsert(
    {
      tenant_id: customer.tenant_id,
      stripe_payment_method_id: paymentMethod.id,
      stripe_customer_id: customerId,
      type: paymentMethod.type as 'card' | 'bank_account' | 'link' | 'sepa_debit',
      brand: card?.brand || null,
      last4: card?.last4 || paymentMethod.id.slice(-4),
      exp_month: card?.exp_month || null,
      exp_year: card?.exp_year || null,
      funding: card?.funding || null,
      billing_name: paymentMethod.billing_details?.name || null,
      billing_email: paymentMethod.billing_details?.email || null,
      billing_address:
        (paymentMethod.billing_details?.address as unknown as Record<string, unknown>) || null,
      is_active: true,
    },
    { onConflict: 'stripe_payment_method_id' }
  );

  console.log(`[webhook] Payment method ${paymentMethod.id} attached`);
}

/**
 * Handle payment method detached event.
 */
export async function handlePaymentMethodDetached(event: Stripe.Event): Promise<void> {
  const paymentMethod = event.data.object as Stripe.PaymentMethod;
  const supabase = createServiceRoleClient();

  await (supabase.from('payment_methods') as any)
    .update({ is_active: false })
    .eq('stripe_payment_method_id', paymentMethod.id);

  console.log(`[webhook] Payment method ${paymentMethod.id} detached`);
}
