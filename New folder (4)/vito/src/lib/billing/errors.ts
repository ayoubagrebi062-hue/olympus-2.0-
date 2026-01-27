/**
 * OLYMPUS 2.0 - Billing Errors
 */

// ============================================================================
// ERROR CODES
// ============================================================================

export const BILLING_ERROR_CODES = {
  // Subscription errors
  NO_ACTIVE_SUBSCRIPTION: 'BILLING_001',
  SUBSCRIPTION_ALREADY_CANCELED: 'BILLING_002',
  SUBSCRIPTION_NOT_FOUND: 'BILLING_003',
  INVALID_PLAN_CHANGE: 'BILLING_004',
  TRIAL_ALREADY_USED: 'BILLING_005',

  // Payment errors
  PAYMENT_METHOD_REQUIRED: 'BILLING_010',
  PAYMENT_FAILED: 'BILLING_011',
  PAYMENT_ACTION_REQUIRED: 'BILLING_012',
  INVALID_PAYMENT_METHOD: 'BILLING_013',

  // Usage/Limit errors
  LIMIT_REACHED: 'BILLING_020',
  OVERAGE_NOT_ALLOWED: 'BILLING_021',
  INSUFFICIENT_CREDITS: 'BILLING_022',

  // Feature errors
  FEATURE_NOT_AVAILABLE: 'BILLING_030',
  UPGRADE_REQUIRED: 'BILLING_031',

  // Webhook errors
  WEBHOOK_SIGNATURE_INVALID: 'BILLING_040',
  WEBHOOK_DUPLICATE_EVENT: 'BILLING_041',
  WEBHOOK_PROCESSING_FAILED: 'BILLING_042',

  // Stripe errors
  STRIPE_CUSTOMER_NOT_FOUND: 'BILLING_050',
  STRIPE_API_ERROR: 'BILLING_051',
  STRIPE_RATE_LIMITED: 'BILLING_052',

  // General errors
  BILLING_NOT_CONFIGURED: 'BILLING_090',
  UNKNOWN_ERROR: 'BILLING_099',
} as const;

export type BillingErrorCode = typeof BILLING_ERROR_CODES[keyof typeof BILLING_ERROR_CODES];

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const BILLING_ERROR_MESSAGES: Record<BillingErrorCode, string> = {
  BILLING_001: 'No active subscription found',
  BILLING_002: 'Subscription is already canceled',
  BILLING_003: 'Subscription not found',
  BILLING_004: 'Invalid plan change requested',
  BILLING_005: 'Trial period has already been used',
  BILLING_010: 'A payment method is required',
  BILLING_011: 'Payment failed',
  BILLING_012: 'Additional payment action required',
  BILLING_013: 'Invalid payment method',
  BILLING_020: 'Usage limit reached for this billing period',
  BILLING_021: 'Overage billing is not enabled for your plan',
  BILLING_022: 'Insufficient credits',
  BILLING_030: 'This feature is not available on your plan',
  BILLING_031: 'Please upgrade your plan to access this feature',
  BILLING_040: 'Invalid webhook signature',
  BILLING_041: 'Duplicate webhook event',
  BILLING_042: 'Failed to process webhook event',
  BILLING_050: 'Stripe customer not found',
  BILLING_051: 'Stripe API error',
  BILLING_052: 'Rate limited by Stripe',
  BILLING_090: 'Billing is not configured',
  BILLING_099: 'An unknown billing error occurred',
};

// ============================================================================
// ERROR CLASS
// ============================================================================

export class BillingError extends Error {
  readonly code: BillingErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BillingErrorCode,
    details?: Record<string, unknown>,
    options?: { status?: number; retryable?: boolean }
  ) {
    super(BILLING_ERROR_MESSAGES[code]);
    this.name = 'BillingError';
    this.code = code;
    this.status = options?.status ?? getDefaultStatus(code);
    this.retryable = options?.retryable ?? isRetryable(code);
    this.details = details;
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
    };
  }
}

function getDefaultStatus(code: BillingErrorCode): number {
  if (code.startsWith('BILLING_01')) return 402;
  if (code.startsWith('BILLING_02')) return 403;
  if (code.startsWith('BILLING_03')) return 403;
  if (code.startsWith('BILLING_04')) return 400;
  if (code === 'BILLING_052') return 429;
  return 400;
}

function isRetryable(code: BillingErrorCode): boolean {
  return ['BILLING_051', 'BILLING_052', 'BILLING_042'].includes(code);
}

// ============================================================================
// ERROR HELPERS
// ============================================================================

export function isBillingError(error: unknown): error is BillingError {
  return error instanceof BillingError;
}

export function createBillingError(
  code: BillingErrorCode,
  details?: Record<string, unknown>
): BillingError {
  return new BillingError(code, details);
}
