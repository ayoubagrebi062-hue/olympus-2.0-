/**
 * OLYMPUS 2.0 - Constants & Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  PLAN_LIMITS,
  PLAN_PRICING,
  PLAN_FEATURES,
  FEATURE_DEFINITIONS,
  USAGE_THRESHOLDS,
  TRIAL_CONFIG,
  HANDLED_WEBHOOK_EVENTS,
} from '@/lib/billing/constants';
import type { PlanTier } from '@/lib/billing/types';

describe('Plan Constants', () => {
  describe('PLAN_LIMITS', () => {
    const expectedTiers: PlanTier[] = ['free', 'starter', 'pro', 'business', 'enterprise'];

    it('should define limits for all plan tiers', () => {
      for (const tier of expectedTiers) {
        expect(PLAN_LIMITS[tier]).toBeDefined();
      }
    });

    it('should have required limit properties', () => {
      const requiredProperties = [
        'builds_per_month',
        'deploys_per_month',
        'projects',
        'team_members',
        'storage_gb',
        'api_calls_per_day',
        'ai_tokens_per_month',
      ];

      for (const tier of expectedTiers) {
        for (const prop of requiredProperties) {
          expect(PLAN_LIMITS[tier]).toHaveProperty(prop);
        }
      }
    });

    it('should have increasing limits from free to business', () => {
      expect(PLAN_LIMITS.free.builds_per_month).toBeLessThan(PLAN_LIMITS.starter.builds_per_month);
      expect(PLAN_LIMITS.starter.builds_per_month).toBeLessThan(PLAN_LIMITS.pro.builds_per_month);
      expect(PLAN_LIMITS.pro.builds_per_month).toBeLessThan(PLAN_LIMITS.business.builds_per_month);
    });

    it('should have unlimited (-1) for enterprise', () => {
      expect(PLAN_LIMITS.enterprise.builds_per_month).toBe(-1);
      expect(PLAN_LIMITS.enterprise.deploys_per_month).toBe(-1);
      expect(PLAN_LIMITS.enterprise.projects).toBe(-1);
    });
  });

  describe('PLAN_PRICING', () => {
    it('should have free tier at $0', () => {
      expect(PLAN_PRICING.free.monthly).toBe(0);
      expect(PLAN_PRICING.free.annual).toBe(0);
    });

    it('should have annual discount (approximately 17%)', () => {
      const tiers: PlanTier[] = ['starter', 'pro', 'business'];
      for (const tier of tiers) {
        const monthlyAnnualized = PLAN_PRICING[tier].monthly * 12;
        const annual = PLAN_PRICING[tier].annual;
        // Annual should be cheaper than 12x monthly
        expect(annual).toBeLessThan(monthlyAnnualized);
      }
    });

    it('should have prices in cents', () => {
      // Starter is $19/month = 1900 cents
      expect(PLAN_PRICING.starter.monthly).toBe(1900);
      // Pro is $49/month = 4900 cents
      expect(PLAN_PRICING.pro.monthly).toBe(4900);
      // Business is $149/month = 14900 cents
      expect(PLAN_PRICING.business.monthly).toBe(14900);
    });

    it('should have enterprise at $0 (custom pricing)', () => {
      expect(PLAN_PRICING.enterprise.monthly).toBe(0);
      expect(PLAN_PRICING.enterprise.annual).toBe(0);
    });
  });

  describe('PLAN_FEATURES', () => {
    it('should have basic features in all plans', () => {
      expect(PLAN_FEATURES.free).toContain('export_code');
      expect(PLAN_FEATURES.starter).toContain('export_code');
    });

    it('should have progressive feature unlocking', () => {
      // Starter unlocks custom_domain
      expect(PLAN_FEATURES.starter).toContain('custom_domain');
      expect(PLAN_FEATURES.free).not.toContain('custom_domain');

      // Pro unlocks white_label
      expect(PLAN_FEATURES.pro).toContain('white_label');
      expect(PLAN_FEATURES.starter).not.toContain('white_label');

      // Business unlocks sso
      expect(PLAN_FEATURES.business).toContain('sso');
      expect(PLAN_FEATURES.pro).not.toContain('sso');
    });

    it('should have most features in enterprise', () => {
      expect(PLAN_FEATURES.enterprise.length).toBeGreaterThan(PLAN_FEATURES.business.length);
    });
  });

  describe('FEATURE_DEFINITIONS', () => {
    it('should define all features with required fields', () => {
      for (const [key, def] of Object.entries(FEATURE_DEFINITIONS)) {
        expect(def).toHaveProperty('name');
        expect(def).toHaveProperty('description');
        expect(def).toHaveProperty('requiredPlan');
      }
    });

    it('should have valid plan tier references', () => {
      const validTiers = ['free', 'starter', 'pro', 'business', 'enterprise'];
      for (const [key, def] of Object.entries(FEATURE_DEFINITIONS)) {
        expect(validTiers).toContain(def.requiredPlan);
      }
    });
  });
});

describe('Usage Thresholds', () => {
  describe('USAGE_THRESHOLDS', () => {
    it('should have warning at 80%', () => {
      expect(USAGE_THRESHOLDS.WARNING_PERCENTAGE).toBe(80);
    });

    it('should have critical at 95%', () => {
      expect(USAGE_THRESHOLDS.CRITICAL_PERCENTAGE).toBe(95);
    });

    it('should have blocked at 100%', () => {
      expect(USAGE_THRESHOLDS.BLOCKED_PERCENTAGE).toBe(100);
    });

    it('should have thresholds in correct order', () => {
      expect(USAGE_THRESHOLDS.WARNING_PERCENTAGE).toBeLessThan(USAGE_THRESHOLDS.CRITICAL_PERCENTAGE);
      expect(USAGE_THRESHOLDS.CRITICAL_PERCENTAGE).toBeLessThan(USAGE_THRESHOLDS.BLOCKED_PERCENTAGE);
    });
  });
});

describe('Trial Configuration', () => {
  describe('TRIAL_CONFIG', () => {
    it('should have 14 day trial duration', () => {
      expect(TRIAL_CONFIG.DURATION_DAYS).toBe(14);
    });

    it('should have trial end warning days', () => {
      expect(TRIAL_CONFIG.REMINDER_DAYS_BEFORE).toBeDefined();
      expect(TRIAL_CONFIG.REMINDER_DAYS_BEFORE.length).toBeGreaterThan(0);
    });

    it('should have extension days', () => {
      expect(TRIAL_CONFIG.EXTENSION_DAYS).toBeDefined();
      expect(TRIAL_CONFIG.EXTENSION_DAYS).toBeGreaterThan(0);
    });
  });
});

describe('Stripe Configuration', () => {
  describe('HANDLED_WEBHOOK_EVENTS', () => {
    it('should have webhook event types', () => {
      expect(HANDLED_WEBHOOK_EVENTS).toBeDefined();
      expect(Array.isArray(HANDLED_WEBHOOK_EVENTS)).toBe(true);
      expect(HANDLED_WEBHOOK_EVENTS.length).toBeGreaterThan(0);
    });

    it('should include essential webhook events', () => {
      const essentialEvents = [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.paid',
        'invoice.payment_failed',
      ];

      for (const event of essentialEvents) {
        expect(HANDLED_WEBHOOK_EVENTS).toContain(event);
      }
    });
  });
});

describe('Type Validation', () => {
  it('should have consistent plan tier type', () => {
    const planLimitTiers = Object.keys(PLAN_LIMITS);
    const planPricingTiers = Object.keys(PLAN_PRICING);
    const planFeatureTiers = Object.keys(PLAN_FEATURES);

    expect(planLimitTiers.sort()).toEqual(planPricingTiers.sort());
    expect(planLimitTiers.sort()).toEqual(planFeatureTiers.sort());
  });

  it('should have all features defined in FEATURE_DEFINITIONS', () => {
    const allFeatures: string[] = [];

    for (const features of Object.values(PLAN_FEATURES)) {
      for (const feature of features) {
        if (!allFeatures.includes(feature)) {
          allFeatures.push(feature);
        }
      }
    }

    for (const feature of allFeatures) {
      expect((FEATURE_DEFINITIONS as any)[feature]).toBeDefined();
    }
  });
});
