/**
 * OLYMPUS 2.0 - Billing Types (API & Functions)
 */

import type { PlanTier, BillingPeriod, UsageMetric, SubscriptionStatus } from './core';

// ============================================================================
// CHECKOUT TYPES
// ============================================================================

export interface CreateCheckoutParams {
  tenantId: string;
  planId: string;
  billingPeriod: BillingPeriod;
  successUrl: string;
  cancelUrl: string;
  promoCode?: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
  expiresAt: number;
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT TYPES
// ============================================================================

export interface ChangePlanParams {
  tenantId: string;
  newPlanId: string;
  immediate?: boolean;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

export interface CancelSubscriptionParams {
  tenantId: string;
  immediate?: boolean;
  reason?: string;
  feedback?: string;
}

export interface ResumeSubscriptionParams {
  tenantId: string;
}

export interface SubscriptionChange {
  type: 'upgrade' | 'downgrade' | 'same_tier';
  fromPlan: PlanTier;
  toPlan: PlanTier;
  proratedAmount: number;
  effectiveDate: string;
}

// ============================================================================
// USAGE TYPES
// ============================================================================

export interface TrackUsageParams {
  tenantId: string;
  metric: UsageMetric;
  quantity: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckLimitParams {
  tenantId: string;
  metric: UsageMetric;
  quantityToAdd?: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  percentageUsed: number;
  canPurchaseMore: boolean;
  overagePrice?: number;
}

// ============================================================================
// FEATURE & TRIAL TYPES
// ============================================================================

export interface FeatureCheckResult {
  hasFeature: boolean;
  requiredPlan: PlanTier | null;
  currentPlan: PlanTier;
}

export interface Trial {
  tenantId: string;
  planTier: PlanTier;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  isExpired: boolean;
  wasExtended: boolean;
}

export interface StartTrialParams {
  tenantId: string;
  skipIfUsedBefore?: boolean;
}

export interface ExtendTrialParams {
  tenantId: string;
  days: number;
  reason: string;
}

// ============================================================================
// PORTAL & RESPONSE TYPES
// ============================================================================

export interface CreatePortalSessionParams {
  tenantId: string;
  returnUrl: string;
}

export interface PortalSession {
  id: string;
  url: string;
}

export interface BillingOverview {
  subscription: {
    planName: string;
    planTier: PlanTier;
    status: SubscriptionStatus;
    billingPeriod: BillingPeriod;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
  } | null;
  usage: {
    builds: { current: number; limit: number };
    deploys: { current: number; limit: number };
    storage: { current: number; limit: number };
  };
  upcomingInvoice: { amount: number; dueDate: string } | null;
  paymentMethod: { brand: string; last4: string } | null;
}
