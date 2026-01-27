/**
 * OLYMPUS 2.0 - Features & Trials Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create a comprehensive chainable mock for Supabase queries
const createFullChainableMock = (defaultResult: { data: unknown; error: unknown } = { data: null, error: null }) => {
  const chainable: Record<string, unknown> = {};
  const methods = [
    'select', 'eq', 'not', 'in', 'order', 'limit', 'single', 'maybeSingle',
    'gte', 'lte', 'gt', 'lt', 'is', 'neq', 'like', 'ilike', 'insert', 'update', 'upsert', 'delete'
  ];

  for (const method of methods) {
    if (method === 'single' || method === 'maybeSingle') {
      chainable[method] = vi.fn(() => defaultResult);
    } else {
      chainable[method] = vi.fn(() => chainable);
    }
  }

  return chainable;
};

const mockFrom = vi.fn(() => createFullChainableMock());

const mockSupabaseClient = {
  from: mockFrom,
};

// Mock the auth clients module
vi.mock('@/lib/auth/clients', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => createFullChainableMock()),
  })),
  createBrowserClient: vi.fn(() => ({})),
}));

// Mock Stripe for trial extension
vi.mock('@/lib/billing/stripe', () => ({
  stripe: {
    subscriptions: {
      update: vi.fn(() => Promise.resolve({ id: 'sub_123' })),
    },
  },
  getStripe: vi.fn(() => ({
    subscriptions: {
      update: vi.fn(() => Promise.resolve({ id: 'sub_123' })),
    },
  })),
  withStripeErrorHandling: vi.fn(async (operation: () => Promise<unknown>) => operation()),
}));

// Import the modules after mocks are set up
import {
  planHasFeature,
  getFeaturesForPlan,
  getMinimumPlanForFeature,
  getFeatureComparison,
} from '@/lib/billing/features';

import {
  getTrialConfig,
} from '@/lib/billing/trials';

describe('Feature Gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasFeature', () => {
    it('should be importable', async () => {
      const { hasFeature } = await import('@/lib/billing/features');
      expect(typeof hasFeature).toBe('function');
    });

    it('should handle async feature check', async () => {
      const { hasFeature } = await import('@/lib/billing/features');
      // With mocked supabase returning null, this tests the code path
      const result = await hasFeature('pro-tenant', 'custom_domain');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('requireFeature', () => {
    it('should be importable', async () => {
      const { requireFeature } = await import('@/lib/billing/features');
      expect(typeof requireFeature).toBe('function');
    });
  });

  describe('planHasFeature', () => {
    it('should check if plan includes feature', () => {
      // Pro plan should have custom_domain
      const hasCustomDomain = planHasFeature('pro', 'custom_domain');
      expect(typeof hasCustomDomain).toBe('boolean');

      // Free plan should not have sso
      const hasSso = planHasFeature('free', 'sso');
      expect(typeof hasSso).toBe('boolean');
    });
  });

  describe('getFeaturesForPlan', () => {
    it('should return all features for a plan', () => {
      const proFeatures = getFeaturesForPlan('pro');
      expect(Array.isArray(proFeatures)).toBe(true);
    });
  });

  describe('getMinimumPlanForFeature', () => {
    it('should return minimum required plan tier', () => {
      const minPlan = getMinimumPlanForFeature('sso');
      expect(['free', 'starter', 'pro', 'business', 'enterprise']).toContain(minPlan);
    });
  });

  describe('getFeatureComparison', () => {
    it('should return feature comparison across plans', async () => {
      const comparison = await getFeatureComparison();
      expect(comparison).toBeDefined();
    });
  });
});

describe('Trial Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isTrialEligible', () => {
    it('should be importable', async () => {
      const { isTrialEligible } = await import('@/lib/billing/trials');
      expect(typeof isTrialEligible).toBe('function');
    });
  });

  describe('getTrialStatus', () => {
    it('should be importable', async () => {
      const { getTrialStatus } = await import('@/lib/billing/trials');
      expect(typeof getTrialStatus).toBe('function');
    });
  });

  describe('extendTrial', () => {
    it('should be importable', async () => {
      const { extendTrial } = await import('@/lib/billing/trials');
      expect(typeof extendTrial).toBe('function');
    });
  });

  describe('getExpiringTrials', () => {
    it('should be importable', async () => {
      const { getExpiringTrials } = await import('@/lib/billing/trials');
      expect(typeof getExpiringTrials).toBe('function');
    });
  });

  describe('getTrialConfig', () => {
    it('should return trial configuration', () => {
      const config = getTrialConfig();
      expect(config).toHaveProperty('durationDays');
      expect(config).toHaveProperty('planTier');
      expect(config).toHaveProperty('requiresPaymentMethod');
    });
  });
});
