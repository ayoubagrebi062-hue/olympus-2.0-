/**
 * OLYMPUS 2.0 - Billing Types (Core)
 */

// ============================================================================
// PLAN TYPES
// ============================================================================

export type PlanTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';
export type BillingPeriod = 'monthly' | 'annual';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export type UsageMetric = 'builds' | 'deploys' | 'storage' | 'ai_tokens' | 'api_calls';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
export type PaymentMethodType = 'card' | 'bank_account' | 'link';

export type Feature =
  | 'custom_domain'
  | 'white_label'
  | 'priority_support'
  | 'advanced_analytics'
  | 'team_collaboration'
  | 'api_access'
  | 'sso'
  | 'audit_logs'
  | 'export_code'
  | 'multiple_environments'
  | 'custom_branding'
  | 'dedicated_support'
  | 'sla_guarantee'
  | 'custom_integrations';

export interface PlanLimits {
  builds_per_month: number;
  deploys_per_month: number;
  projects: number;
  team_members: number;
  storage_gb: number;
  api_calls_per_day: number;
  ai_tokens_per_month: number;
}

export interface Plan {
  id: string;
  stripe_product_id: string | null;
  stripe_price_monthly_id: string | null;
  stripe_price_annual_id: string | null;
  name: string;
  description: string;
  tier: PlanTier;
  limits: PlanLimits;
  features: string[];
  price_monthly: number;
  price_annual: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: SubscriptionStatus;
  billing_period: BillingPeriod;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  cancellation_reason: string | null;
  trial_start: string | null;
  trial_end: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan;
}

// ============================================================================
// USAGE TYPES
// ============================================================================

export interface UsageRecord {
  id: string;
  tenant_id: string;
  metric: UsageMetric;
  quantity: number;
  period_start: string;
  period_end: string;
  reported_to_stripe: boolean;
  stripe_usage_record_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UsageAggregate {
  tenant_id: string;
  metric: UsageMetric;
  period_start: string;
  period_end: string;
  total_quantity: number;
  limit: number;
  percentage_used: number;
}

export interface UsageSummary {
  builds: UsageAggregate;
  deploys: UsageAggregate;
  storage: UsageAggregate;
  ai_tokens: UsageAggregate;
  api_calls: UsageAggregate;
}
