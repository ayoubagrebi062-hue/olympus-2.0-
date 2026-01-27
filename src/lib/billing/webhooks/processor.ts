/**
 * OLYMPUS 2.0 - Webhook Event Processor
 */

import type Stripe from 'stripe';
import { markEventProcessed, markEventFailed, markEventSkipped } from './store';
import * as subscriptionHandlers from './handlers/subscription';
import * as invoiceHandlers from './handlers/invoice';
import * as paymentHandlers from './handlers/payment-method';
import * as customerHandlers from './handlers/customer';

type WebhookHandler = (event: Stripe.Event) => Promise<void>;

const HANDLERS: Record<string, WebhookHandler> = {
  'customer.subscription.created': subscriptionHandlers.handleSubscriptionCreated,
  'customer.subscription.updated': subscriptionHandlers.handleSubscriptionUpdated,
  'customer.subscription.deleted': subscriptionHandlers.handleSubscriptionDeleted,
  'customer.subscription.trial_will_end': subscriptionHandlers.handleTrialWillEnd,
  'invoice.created': invoiceHandlers.handleInvoiceCreated,
  'invoice.paid': invoiceHandlers.handleInvoicePaid,
  'invoice.payment_failed': invoiceHandlers.handleInvoicePaymentFailed,
  'invoice.payment_action_required': invoiceHandlers.handleInvoicePaymentFailed,
  'payment_method.attached': paymentHandlers.handlePaymentMethodAttached,
  'payment_method.detached': paymentHandlers.handlePaymentMethodDetached,
  'payment_method.updated': paymentHandlers.handlePaymentMethodAttached,
  'checkout.session.completed': customerHandlers.handleCheckoutCompleted,
  'customer.updated': customerHandlers.handleCustomerUpdated,
};

/**
 * Process a webhook event by routing to the appropriate handler.
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  const eventId = event.id;
  const eventType = event.type;

  console.log(`[webhook] Processing ${eventType} (${eventId})`);

  const handler = HANDLERS[eventType];
  if (!handler) {
    console.log(`[webhook] No handler for ${eventType}`);
    await markEventSkipped(eventId, `No handler for ${eventType}`);
    return;
  }

  try {
    await handler(event);
    await markEventProcessed(eventId);
    console.log(`[webhook] Successfully processed ${eventType} (${eventId})`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[webhook] Failed to process ${eventType}:`, errorMessage);
    await markEventFailed(eventId, errorMessage);
    throw error;
  }
}

/**
 * Retry failed events.
 */
export async function retryFailedEvents(): Promise<{ processed: number; failed: number }> {
  const { getPendingEvents } = await import('./store');
  const { getStripe } = await import('../stripe');

  const eventIds = await getPendingEvents(10);
  const stripe = getStripe();
  let processed = 0,
    failed = 0;

  for (const eventId of eventIds) {
    try {
      const event = await stripe.events.retrieve(eventId);
      await processWebhookEvent(event);
      processed++;
    } catch {
      failed++;
    }
  }

  return { processed, failed };
}
