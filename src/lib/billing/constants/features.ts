/**
 * OLYMPUS 2.0 - Billing Constants (Features & Config)
 */

import type { Feature, PlanTier } from '../types';

// ============================================================================
// FEATURE DEFINITIONS
// ============================================================================

export const FEATURE_DEFINITIONS: Record<
  Feature,
  {
    name: string;
    description: string;
    requiredPlan: PlanTier;
  }
> = {
  export_code: {
    name: 'Export Code',
    description: 'Download generated source code',
    requiredPlan: 'free',
  },
  custom_domain: {
    name: 'Custom Domain',
    description: 'Use your own domain for deployed apps',
    requiredPlan: 'starter',
  },
  team_collaboration: {
    name: 'Team Collaboration',
    description: 'Invite team members to your workspace',
    requiredPlan: 'starter',
  },
  white_label: {
    name: 'White Label',
    description: 'Remove OLYMPUS branding from your apps',
    requiredPlan: 'pro',
  },
  advanced_analytics: {
    name: 'Advanced Analytics',
    description: 'Detailed usage and performance analytics',
    requiredPlan: 'pro',
  },
  api_access: {
    name: 'API Access',
    description: 'Programmatic access to OLYMPUS features',
    requiredPlan: 'pro',
  },
  multiple_environments: {
    name: 'Multiple Environments',
    description: 'Staging, production, and custom environments',
    requiredPlan: 'pro',
  },
  priority_support: {
    name: 'Priority Support',
    description: '24-hour response time guarantee',
    requiredPlan: 'business',
  },
  sso: {
    name: 'Single Sign-On',
    description: 'SAML/OIDC authentication integration',
    requiredPlan: 'business',
  },
  audit_logs: {
    name: 'Audit Logs',
    description: 'Detailed activity logging and compliance',
    requiredPlan: 'business',
  },
  custom_branding: {
    name: 'Custom Branding',
    description: 'Full brand customization options',
    requiredPlan: 'business',
  },
  dedicated_support: {
    name: 'Dedicated Support',
    description: 'Dedicated account manager',
    requiredPlan: 'enterprise',
  },
  sla_guarantee: {
    name: 'SLA Guarantee',
    description: '99.9% uptime SLA with credits',
    requiredPlan: 'enterprise',
  },
  custom_integrations: {
    name: 'Custom Integrations',
    description: 'Custom integrations and workflows',
    requiredPlan: 'enterprise',
  },
};

// ============================================================================
// USAGE THRESHOLDS
// ============================================================================

export const USAGE_THRESHOLDS = {
  WARNING_PERCENTAGE: 80,
  CRITICAL_PERCENTAGE: 95,
  BLOCKED_PERCENTAGE: 100,
} as const;

// ============================================================================
// BILLING CONFIGURATION
// ============================================================================

export const BILLING_CONFIG = {
  CURRENCY: 'usd',
  TAX_BEHAVIOR: 'exclusive' as const,
  ALLOW_PROMO_CODES: true,
  ANNUAL_DISCOUNT_PERCENTAGE: 17,
  GRACE_PERIOD_DAYS: 7,
  INVOICE_DAYS_UNTIL_DUE: 30,
} as const;

// ============================================================================
// NOTIFICATION TRIGGERS
// ============================================================================

export const NOTIFICATION_TRIGGERS = {
  TRIAL_EXPIRING_DAYS: [7, 3, 1],
  USAGE_WARNING_PERCENTAGE: 80,
  USAGE_CRITICAL_PERCENTAGE: 95,
  PAYMENT_RETRY_DAYS: [1, 3, 5],
} as const;
