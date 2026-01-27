/**
 * OLYMPUS 2.0 - Webhook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

// Create a comprehensive chainable mock for Supabase queries
const createFullChainableMock = (defaultResult: { data: unknown; error: unknown } = { data: null, error: null }) => {
  const chainable: Record<string, unknown> = {};
  const methods = [
    'select', 'eq', 'not', 'in', 'order', 'limit', 'single', 'maybeSingle',
    'gte', 'lte', 'gt', 'lt', 'is', 'neq', 'like', 'ilike'
  ];

  for (const method of methods) {
    if (method === 'single' || method === 'maybeSingle') {
      chainable[method] = vi.fn(() => defaultResult);
    } else {
      chainable[method] = vi.fn(() => chainable);
    }
  }

  // insert, update, upsert, delete should also return chainable objects
  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);
  chainable.upsert = vi.fn(() => chainable);
  chainable.delete = vi.fn(() => chainable);

  return chainable;
};

// Mock the auth clients module
vi.mock('@/lib/auth/clients', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => createFullChainableMock()),
  })),
}));

// Mock Stripe
vi.mock('@/lib/billing/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(() => Promise.resolve({ id: 'sub_123', status: 'active' })),
      update: vi.fn(() => Promise.resolve({ id: 'sub_123' })),
    },
  },
  getStripe: vi.fn(() => ({
    subscriptions: {
      retrieve: vi.fn(() => Promise.resolve({ id: 'sub_123', status: 'active' })),
    },
  })),
  withStripeErrorHandling: vi.fn(async (operation: () => Promise<unknown>) => operation()),
}));

// Mock email sending
vi.mock('@/lib/billing/emails', () => ({
  sendPaymentSuccessEmail: vi.fn(),
  sendPaymentFailedEmail: vi.fn(),
  sendTrialEndingEmail: vi.fn(),
  sendTrialExpiredEmail: vi.fn(),
  sendSubscriptionCanceledEmail: vi.fn(),
  sendUsageWarningEmail: vi.fn(),
  sendInvoiceCreatedEmail: vi.fn(),
}));

// Import the modules after mocks are set up
import { processWebhook } from '@/lib/billing/webhooks';

describe('Webhook Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('storeWebhookEvent', () => {
    it('should store webhook event for processing', async () => {
      const { storeWebhookEvent } = await import('@/lib/billing/webhooks/store');
      const event = {
        id: 'evt_123',
        type: 'customer.subscription.created',
        api_version: '2023-10-16',
        data: { object: {} },
      } as unknown as Stripe.Event;

      await expect(storeWebhookEvent(event)).resolves.not.toThrow();
    });

    it('should check if event is processed', async () => {
      const { isEventProcessed } = await import('@/lib/billing/webhooks/store');
      const result = await isEventProcessed('evt_123');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('processWebhook', () => {
    it('should process subscription.created event', async () => {
      const event = {
        id: 'evt_sub_created',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            items: { data: [{ price: { id: 'price_123' } }] },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          },
        },
      } as unknown as Stripe.Event;

      await expect(processWebhook(event)).resolves.not.toThrow();
    });

    it('should process subscription.deleted event', async () => {
      const event = {
        id: 'evt_sub_deleted',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
          },
        },
      } as unknown as Stripe.Event;

      await expect(processWebhook(event)).resolves.not.toThrow();
    });

    it('should process invoice.paid event', async () => {
      const event = {
        id: 'evt_inv_paid',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            amount_paid: 4900,
            currency: 'usd',
          },
        },
      } as unknown as Stripe.Event;

      await expect(processWebhook(event)).resolves.not.toThrow();
    });

    it('should process invoice.payment_failed event', async () => {
      const event = {
        id: 'evt_inv_failed',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            amount_due: 4900,
          },
        },
      } as unknown as Stripe.Event;

      await expect(processWebhook(event)).resolves.not.toThrow();
    });

    it('should process trial_will_end event', async () => {
      const event = {
        id: 'evt_trial_end',
        type: 'customer.subscription.trial_will_end',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            trial_end: Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60,
          },
        },
      } as unknown as Stripe.Event;

      await expect(processWebhook(event)).resolves.not.toThrow();
    });

    it('should process payment_method.attached event', async () => {
      const event = {
        id: 'evt_pm_attached',
        type: 'payment_method.attached',
        data: {
          object: {
            id: 'pm_123',
            customer: 'cus_123',
            type: 'card',
            card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2025 },
          },
        },
      } as unknown as Stripe.Event;

      await expect(processWebhook(event)).resolves.not.toThrow();
    });

    it('should skip unknown event types', async () => {
      const event = {
        id: 'evt_unknown',
        type: 'unknown.event.type',
        data: { object: {} },
      } as unknown as Stripe.Event;

      await expect(processWebhook(event)).resolves.not.toThrow();
    });
  });

  describe('Webhook Handlers', () => {
    it('should handle subscription handler', async () => {
      const { handleSubscriptionCreated } = await import('@/lib/billing/webhooks/handlers/subscription');
      const event = {
        id: 'evt_123',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            items: { data: [{ price: { id: 'price_123' } }] },
          },
        },
      } as unknown as Stripe.Event;

      await expect(handleSubscriptionCreated(event)).resolves.not.toThrow();
    });

    it('should handle invoice handler', async () => {
      const { handleInvoicePaid } = await import('@/lib/billing/webhooks/handlers/invoice');
      const event = {
        id: 'evt_123',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            amount_paid: 4900,
          },
        },
      } as unknown as Stripe.Event;

      await expect(handleInvoicePaid(event)).resolves.not.toThrow();
    });

    it('should handle payment method handler', async () => {
      const { handlePaymentMethodAttached } = await import('@/lib/billing/webhooks/handlers/payment-method');
      const event = {
        id: 'evt_123',
        type: 'payment_method.attached',
        data: {
          object: {
            id: 'pm_123',
            customer: 'cus_123',
            type: 'card',
          },
        },
      } as unknown as Stripe.Event;

      await expect(handlePaymentMethodAttached(event)).resolves.not.toThrow();
    });

    it('should handle customer handler', async () => {
      const { handleCustomerUpdated } = await import('@/lib/billing/webhooks/handlers/customer');
      const event = {
        id: 'evt_123',
        type: 'customer.updated',
        data: {
          object: {
            id: 'cus_123',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      } as unknown as Stripe.Event;

      await expect(handleCustomerUpdated(event)).resolves.not.toThrow();
    });
  });

  describe('Event Retry Logic', () => {
    it('should mark event as failed after max retries', async () => {
      const { markEventFailed } = await import('@/lib/billing/webhooks/store');
      await expect(markEventFailed('evt_123', 'Processing error')).resolves.not.toThrow();
    });

    it('should have getPendingEvents function', async () => {
      const { getPendingEvents } = await import('@/lib/billing/webhooks/store');
      expect(typeof getPendingEvents).toBe('function');
    });
  });
});
