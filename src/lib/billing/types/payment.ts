/**
 * OLYMPUS 2.0 - Billing Types (Payment & Invoice)
 */

import type { InvoiceStatus, PaymentMethodType } from './core';

// ============================================================================
// INVOICE TYPES
// ============================================================================

export interface Invoice {
  id: string;
  tenant_id: string;
  stripe_invoice_id: string;
  stripe_customer_id: string;
  subscription_id: string | null;
  number: string | null;
  status: InvoiceStatus;
  currency: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  subtotal: number;
  tax: number | null;
  total: number;
  period_start: string;
  period_end: string;
  due_date: string | null;
  paid_at: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  stripe_line_item_id: string;
  description: string;
  quantity: number;
  unit_amount: number;
  amount: number;
  currency: string;
  period_start: string | null;
  period_end: string | null;
}

// ============================================================================
// PAYMENT METHOD TYPES
// ============================================================================

export interface PaymentMethod {
  id: string;
  tenant_id: string;
  stripe_payment_method_id: string;
  type: PaymentMethodType;
  brand: string | null;
  last4: string;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
  billing_details: {
    name: string | null;
    email: string | null;
    address: {
      city: string | null;
      country: string | null;
      line1: string | null;
      line2: string | null;
      postal_code: string | null;
      state: string | null;
    } | null;
  };
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CREDIT TYPES
// ============================================================================

export type CreditType = 'build' | 'deploy' | 'ai_token' | 'storage';

export interface Credit {
  id: string;
  tenant_id: string;
  type: CreditType;
  amount: number;
  remaining: number;
  stripe_payment_intent_id: string | null;
  expires_at: string | null;
  purchased_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export type WebhookEventStatus = 'pending' | 'processed' | 'failed' | 'skipped';

export interface WebhookEvent {
  id: string;
  stripe_event_id: string;
  type: string;
  api_version: string | null;
  data: Record<string, unknown>;
  status: WebhookEventStatus;
  processed_at: string | null;
  error: string | null;
  retry_count: number;
  created_at: string;
}
