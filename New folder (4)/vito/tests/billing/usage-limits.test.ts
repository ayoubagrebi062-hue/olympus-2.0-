/**
 * OLYMPUS 2.0 - Usage & Limits Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock Supabase client
const mockRpc = vi.fn();
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(() => ({ data: null, error: null })),
      gte: vi.fn(() => ({
        lte: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
  })),
  insert: vi.fn(() => ({ data: null, error: null })),
  upsert: vi.fn(() => ({ data: null, error: null })),
}));

const mockSupabaseClient = {
  from: mockFrom,
  rpc: mockRpc,
};

// Mock the auth clients module
vi.mock('@/lib/auth/clients', () => ({
  createServiceRoleClient: vi.fn(() => mockSupabaseClient),
}));

// Mock subscriptions to return a plan tier
vi.mock('@/lib/billing/subscriptions', () => ({
  getTenantPlanTier: vi.fn(() => Promise.resolve('pro')),
}));

// Import after mocks are set up
import {
  trackUsage,
  trackBuild,
  trackDeploy,
  trackAiTokens,
  trackStorage,
  trackApiCall,
  getCurrentUsage,
  getAllUsage,
} from '@/lib/billing/usage';

import {
  checkLimit,
  isApproachingLimit,
  getUsageSummary,
  getTenantLimits,
} from '@/lib/billing/limits';

describe('Usage Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: limit check passes
    mockRpc.mockResolvedValue({
      data: [{ allowed: true, current_usage: 5, limit_value: 100, remaining: 95 }],
      error: null,
    });
  });

  describe('trackUsage', () => {
    it('should track build usage', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, current_usage: 5, limit_value: 100, remaining: 95 }],
        error: null,
      }).mockResolvedValueOnce({
        data: 'usage-id-123',
        error: null,
      });

      const result = await trackBuild('tenant-123', 'build-456');
      expect(result).toBeUndefined(); // trackBuild returns void
      expect(mockRpc).toHaveBeenCalled();
    });

    it('should track deploy usage', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, current_usage: 5, limit_value: 100, remaining: 95 }],
        error: null,
      }).mockResolvedValueOnce({
        data: 'usage-id-123',
        error: null,
      });

      const result = await trackDeploy('tenant-123', 'deploy-789');
      expect(result).toBeUndefined();
      expect(mockRpc).toHaveBeenCalled();
    });

    it('should track AI token usage', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, current_usage: 1000, limit_value: 100000, remaining: 99000 }],
        error: null,
      }).mockResolvedValueOnce({
        data: 'usage-id-123',
        error: null,
      });

      const result = await trackAiTokens('tenant-123', 1500, 'request-abc');
      expect(result).toBeUndefined();
      expect(mockRpc).toHaveBeenCalled();
    });

    it('should track storage usage', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, current_usage: 1, limit_value: 10, remaining: 9 }],
        error: null,
      }).mockResolvedValueOnce({
        data: 'usage-id-123',
        error: null,
      });

      const result = await trackStorage('tenant-123', 500 * 1024 * 1024); // 500MB in bytes
      expect(result).toBeUndefined();
      expect(mockRpc).toHaveBeenCalled();
    });

    it('should track API call usage', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, current_usage: 100, limit_value: 10000, remaining: 9900 }],
        error: null,
      }).mockResolvedValueOnce({
        data: 'usage-id-123',
        error: null,
      });

      const result = await trackApiCall('tenant-123');
      expect(result).toBeUndefined();
      expect(mockRpc).toHaveBeenCalled();
    });

    it('should handle idempotent tracking', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, current_usage: 5, limit_value: 100, remaining: 95 }],
        error: null,
      }).mockResolvedValueOnce({
        data: 'usage-id-123',
        error: null,
      });

      const result1 = await trackUsage({
        tenantId: 'tenant-123',
        metric: 'builds',
        quantity: 1,
        idempotencyKey: 'unique-key-123',
      });

      expect(result1).toBeDefined();
      expect(result1.recorded).toBe(true);
    });
  });

  describe('getCurrentUsage', () => {
    it('should return current period usage', async () => {
      mockRpc.mockResolvedValueOnce({ data: 42, error: null });

      const result = await getCurrentUsage('tenant-123', 'builds');
      expect(typeof result).toBe('number');
      expect(result).toBe(42);
    });
  });

  describe('getAllUsage', () => {
    it('should return all metric usage', async () => {
      mockRpc.mockResolvedValue({ data: 10, error: null });

      const result = await getAllUsage('tenant-123');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('builds');
      expect(result).toHaveProperty('deploys');
      expect(result).toHaveProperty('storage');
      expect(result).toHaveProperty('ai_tokens');
      expect(result).toHaveProperty('api_calls');
    });
  });
});

describe('Limit Checking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkLimit', () => {
    it('should return allowed=true when under limit', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, current_usage: 5, limit_value: 100, remaining: 95 }],
        error: null,
      });

      const result = await checkLimit({ tenantId: 'tenant-123', metric: 'builds' });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should return allowed=false when at limit', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: false, current_usage: 100, limit_value: 100, remaining: 0 }],
        error: null,
      });

      const result = await checkLimit({ tenantId: 'tenant-123', metric: 'builds' });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle unlimited plans', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, current_usage: 1000, limit_value: -1, remaining: 999999999 }],
        error: null,
      });

      const result = await checkLimit({ tenantId: 'enterprise-tenant', metric: 'builds' });

      expect(result.allowed).toBe(true);
    });
  });

  describe('isApproachingLimit', () => {
    it('should return true when usage exceeds 80%', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ allowed: true, current_usage: 85, limit_value: 100, remaining: 15 }],
        error: null,
      });

      const result = await isApproachingLimit('tenant-123', 'builds');
      expect(typeof result.warning).toBe('boolean');
      expect(result.percentageUsed).toBe(85);
    });
  });

  describe('getUsageSummary', () => {
    it('should return summary for all metrics', async () => {
      mockRpc.mockResolvedValue({ data: 10, error: null });

      const result = await getUsageSummary('tenant-123');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('builds');
    });
  });

  describe('getTenantLimits', () => {
    it('should return plan limits for tenant', async () => {
      const result = await getTenantLimits('tenant-123');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('builds');
      expect(result).toHaveProperty('deploys');
      expect(result).toHaveProperty('storage');
    });
  });
});
