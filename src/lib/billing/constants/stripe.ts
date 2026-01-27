/**
 * OLYMPUS 2.0 - Billing Constants (Stripe)
 */

// ============================================================================
// STRIPE PRODUCT & PRICE IDS
// ============================================================================

export const STRIPE_PRODUCTS = {
  starter: process.env.STRIPE_PRODUCT_STARTER || '',
  pro: process.env.STRIPE_PRODUCT_PRO || '',
  business: process.env.STRIPE_PRODUCT_BUSINESS || '',
  enterprise: process.env.STRIPE_PRODUCT_ENTERPRISE || '',
} as const;

export const STRIPE_PRICES = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL || '',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL || '',
  },
  business: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
    annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL || '',
  },
} as const;

export const STRIPE_METERED_PRICES = {
  build_overage: process.env.STRIPE_PRICE_BUILD_OVERAGE || '',
  deploy_overage: process.env.STRIPE_PRICE_DEPLOY_OVERAGE || '',
  storage_overage: process.env.STRIPE_PRICE_STORAGE_OVERAGE || '',
  ai_token_overage: process.env.STRIPE_PRICE_AI_TOKEN_OVERAGE || '',
} as const;

// ============================================================================
// OVERAGE PRICING (in cents)
// ============================================================================

export const OVERAGE_PRICES = {
  builds: 50,
  deploys: 100,
  storage: 10,
  ai_tokens: 1,
  api_calls: 1,
} as const;

// ============================================================================
// TRIAL CONFIGURATION
// ============================================================================

export const TRIAL_CONFIG = {
  DURATION_DAYS: 14,
  PLAN_TIER: 'pro' as const,
  REQUIRE_PAYMENT_METHOD: false,
  EXTEND_ON_ENGAGEMENT: true,
  EXTENSION_DAYS: 7,
  REMINDER_DAYS_BEFORE: [7, 3, 1],
} as const;

// ============================================================================
// WEBHOOK CONFIGURATION
// ============================================================================

export const WEBHOOK_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 5000, 30000],
  EVENT_EXPIRY_HOURS: 24,
} as const;

// ============================================================================
// HANDLED WEBHOOK EVENTS
// ============================================================================

export const HANDLED_WEBHOOK_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'customer.updated',
  'invoice.created',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'invoice.finalized',
  'payment_method.attached',
  'payment_method.detached',
  'payment_method.updated',
  'checkout.session.completed',
  'checkout.session.expired',
  'customer.created',
  'customer.deleted',
] as const;

export type HandledWebhookEvent = (typeof HANDLED_WEBHOOK_EVENTS)[number];

// ============================================================================
// CUSTOMER PORTAL CONFIGURATION
// ============================================================================

export const PORTAL_CONFIG = {
  ALLOW_CANCEL: true,
  ALLOW_UPDATE_PAYMENT: true,
  ALLOW_VIEW_INVOICES: true,
  ALLOW_PLAN_CHANGES: false,
} as const;
