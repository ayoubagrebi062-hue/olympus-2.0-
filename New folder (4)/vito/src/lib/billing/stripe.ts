/**
 * OLYMPUS 2.0 - Stripe Client Setup
 */

import Stripe from 'stripe';
import { BillingError, BILLING_ERROR_CODES } from './errors';

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

function validateStripeConfig(): void {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new BillingError(BILLING_ERROR_CODES.BILLING_NOT_CONFIGURED, {
      missing: 'STRIPE_SECRET_KEY',
    });
  }
}

// ============================================================================
// STRIPE CLIENT SINGLETON
// ============================================================================

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  validateStripeConfig();

  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20' as any,
    typescript: true,
    appInfo: {
      name: 'OLYMPUS',
      version: '2.0.0',
      url: 'https://olympus.dev',
    },
  });

  return stripeClient;
}

// ============================================================================
// PUBLIC KEY (FOR FRONTEND)
// ============================================================================

export function getStripePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new BillingError(BILLING_ERROR_CODES.BILLING_NOT_CONFIGURED, {
      missing: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    });
  }
  return key;
}

// ============================================================================
// WEBHOOK SECRET
// ============================================================================

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new BillingError(BILLING_ERROR_CODES.BILLING_NOT_CONFIGURED, {
      missing: 'STRIPE_WEBHOOK_SECRET',
    });
  }
  return secret;
}

// ============================================================================
// ERROR WRAPPER
// ============================================================================

export async function withStripeErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error(`[stripe] ${context || 'Operation'} failed:`, error.message);

      if (error instanceof Stripe.errors.StripeRateLimitError) {
        throw new BillingError(BILLING_ERROR_CODES.STRIPE_RATE_LIMITED, {
          context,
          stripeError: error.message,
        });
      }

      if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        throw new BillingError(BILLING_ERROR_CODES.STRIPE_API_ERROR, {
          context,
          stripeError: error.message,
          param: error.param,
        });
      }

      throw new BillingError(BILLING_ERROR_CODES.STRIPE_API_ERROR, {
        context,
        stripeError: error.message,
        type: error.type,
      });
    }

    throw error;
  }
}

// ============================================================================
// TEST MODE CHECK
// ============================================================================

export function isTestMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return key.startsWith('sk_test_');
}

export function requireLiveMode(): void {
  if (isTestMode() && process.env.NODE_ENV === 'production') {
    console.warn('[stripe] Using test keys in production!');
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

// Lazy-initialized stripe instance for backward compat (P7 routes use `stripe`)
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});
