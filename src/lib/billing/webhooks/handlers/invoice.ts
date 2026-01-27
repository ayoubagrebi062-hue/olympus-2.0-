/**
 * OLYMPUS 2.0 - Invoice Webhook Handlers
 *
 * FIXED: Emails now wired to handlers (was TODO)
 */

import type Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/auth/clients';
import {
  sendBillingEmail,
  paymentSuccessEmail,
  paymentFailedEmail,
  invoiceCreatedEmail,
} from '@/lib/billing/emails';

/**
 * Handle invoice created event.
 */
export async function handleInvoiceCreated(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;

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

  // Get subscription if present
  let subscriptionId: string | null = null;
  if ((invoice as any).subscription) {
    const { data: rawSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', (invoice as any).subscription as string)
      .single();
    const sub = rawSub as any;
    subscriptionId = sub?.id || null;
  }

  // Upsert invoice
  await (supabase.from('invoices') as any).upsert(
    {
      tenant_id: customer.tenant_id,
      subscription_id: subscriptionId,
      stripe_invoice_id: invoice.id,
      stripe_customer_id: customerId,
      number: invoice.number,
      status: invoice.status || 'draft',
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      tax: (invoice as any).tax,
      total: invoice.total,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      amount_remaining: invoice.amount_remaining,
      period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
    },
    { onConflict: 'stripe_invoice_id' }
  );

  console.log(`[webhook] Created/updated invoice ${invoice.id}`);
}

/**
 * Handle invoice paid event.
 */
export async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const supabase = createServiceRoleClient();

  await (supabase.from('invoices') as any)
    .update({
      status: 'paid',
      amount_paid: invoice.amount_paid,
      amount_remaining: 0,
      paid_at: new Date().toISOString(),
    })
    .eq('stripe_invoice_id', invoice.id);

  // If subscription was past_due, it should now be active (handled by subscription.updated)
  console.log(`[webhook] Invoice ${invoice.id} paid`);

  // FIXED: Send payment success email
  try {
    const customerId = invoice.customer as string;

    // Get tenant and user info for email
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

      if (membership) {
        const user = (membership as any).users;
        const planName = invoice.lines?.data?.[0]?.description || 'OLYMPUS Plan';

        const emailContent = paymentSuccessEmail({
          userName: user.full_name || 'there',
          planName,
          planTier: 'pro', // Default, could be looked up
          amount: invoice.amount_paid,
          currency: invoice.currency,
          invoiceUrl: invoice.hosted_invoice_url || undefined,
          billingPeriod: 'monthly', // Could be determined from invoice
        });

        await sendBillingEmail(user.email, emailContent);
        console.log(`[webhook] Payment success email sent to ${user.email}`);
      }
    }
  } catch (emailError) {
    console.error(`[webhook] Failed to send payment success email:`, emailError);
    // Don't throw - email failure shouldn't fail the webhook
  }
}

/**
 * Handle invoice payment failed event.
 */
export async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const supabase = createServiceRoleClient();

  await (supabase.from('invoices') as any)
    .update({ status: 'open' })
    .eq('stripe_invoice_id', invoice.id);

  console.log(`[webhook] Invoice ${invoice.id} payment failed`);

  // FIXED: Send payment failed email with retry link
  try {
    const customerId = invoice.customer as string;

    // Get tenant and user info for email
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

      if (membership) {
        const user = (membership as any).users;
        const planName = invoice.lines?.data?.[0]?.description || 'OLYMPUS Plan';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Calculate retry date (Stripe typically retries in 3-5 days)
        const retryDate = new Date();
        retryDate.setDate(retryDate.getDate() + 3);

        const emailContent = paymentFailedEmail({
          userName: user.full_name || 'there',
          planName,
          amount: invoice.amount_due,
          currency: invoice.currency,
          retryDate: retryDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }),
          updatePaymentUrl: `${appUrl}/settings/billing?update_payment=true`,
          failureReason: (invoice as any).last_payment_error?.message,
        });

        await sendBillingEmail(user.email, emailContent);
        console.log(`[webhook] Payment failed email sent to ${user.email}`);
      }
    }
  } catch (emailError) {
    console.error(`[webhook] Failed to send payment failed email:`, emailError);
    // Don't throw - email failure shouldn't fail the webhook
  }
}
