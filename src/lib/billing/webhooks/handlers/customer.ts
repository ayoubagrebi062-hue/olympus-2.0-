/**
 * OLYMPUS 2.0 - Customer Webhook Handlers
 */

import type Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/auth/clients';

/**
 * Handle checkout session completed event.
 */
export async function handleCheckoutCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  // Only handle subscription checkouts
  if (session.mode !== 'subscription') {
    console.log(`[webhook] Ignoring checkout mode: ${session.mode}`);
    return;
  }

  const customerId = session.customer as string;
  const tenantId = session.metadata?.tenant_id;

  if (!tenantId) {
    console.error('[webhook] No tenant_id in checkout metadata');
    return;
  }

  const supabase = createServiceRoleClient();

  // Ensure billing customer exists
  await (supabase.from('billing_customers') as any).upsert(
    {
      tenant_id: tenantId,
      stripe_customer_id: customerId,
      email: session.customer_details?.email || null,
      name: session.customer_details?.name || null,
    },
    { onConflict: 'tenant_id' }
  );

  console.log(`[webhook] Checkout completed for tenant ${tenantId}`);

  // Subscription will be created via customer.subscription.created event
}

/**
 * Handle customer updated event.
 */
export async function handleCustomerUpdated(event: Stripe.Event): Promise<void> {
  const customer = event.data.object as Stripe.Customer;
  const supabase = createServiceRoleClient();

  // Update billing customer
  await (supabase.from('billing_customers') as any)
    .update({
      email: customer.email,
      name: customer.name,
      tax_exempt: customer.tax_exempt || 'none',
      metadata: customer.metadata || {},
    })
    .eq('stripe_customer_id', customer.id);

  console.log(`[webhook] Customer ${customer.id} updated`);
}
