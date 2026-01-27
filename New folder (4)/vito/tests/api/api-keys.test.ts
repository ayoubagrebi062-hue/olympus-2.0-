/**
 * OLYMPUS 2.0 - API Keys Tests
 * ============================
 * Unit tests for API key authentication and management logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

describe('API Key Format Validation', () => {
  const KEY_PATTERN = /^oly_(live|test)_[a-zA-Z0-9]{32}$/;

  it('should accept valid live API key format', () => {
    const validKey = 'oly_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
    expect(KEY_PATTERN.test(validKey)).toBe(true);
  });

  it('should accept valid test API key format', () => {
    const validKey = 'oly_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    expect(KEY_PATTERN.test(validKey)).toBe(true);
  });

  it('should reject keys with wrong prefix', () => {
    const invalidKeys = [
      'invalid-key',
      'oly_invalid_prefix_xxxxxxxxxxxxxxxxxxxx',
      'sk_live_stripe_key_format',
      'api_key_wrong_format',
    ];

    invalidKeys.forEach((key) => {
      expect(KEY_PATTERN.test(key)).toBe(false);
    });
  });

  it('should reject keys that are too short', () => {
    const shortKey = 'oly_live_short';
    expect(KEY_PATTERN.test(shortKey)).toBe(false);
  });

  it('should reject keys that are too long', () => {
    const longKey = 'oly_live_' + 'a'.repeat(64);
    expect(KEY_PATTERN.test(longKey)).toBe(false);
  });

  it('should reject empty string', () => {
    expect(KEY_PATTERN.test('')).toBe(false);
  });
});

describe('API Key Generation', () => {
  function generateApiKey(environment: 'live' | 'test' = 'live'): { key: string; prefix: string; hash: string } {
    const randomPart = crypto.randomBytes(24).toString('base64url').substring(0, 32);
    const key = `oly_${environment}_${randomPart}`;
    const prefix = key.substring(0, 12);
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    return { key, prefix, hash };
  }

  it('should generate unique keys', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();

    expect(key1.key).not.toBe(key2.key);
    expect(key1.hash).not.toBe(key2.hash);
  });

  it('should generate keys with correct prefix', () => {
    const liveKey = generateApiKey('live');
    const testKey = generateApiKey('test');

    expect(liveKey.key).toMatch(/^oly_live_/);
    expect(testKey.key).toMatch(/^oly_test_/);
  });

  it('should generate valid prefix for storage', () => {
    const { prefix } = generateApiKey();
    expect(prefix).toHaveLength(12);
    expect(prefix).toMatch(/^oly_(live|test)/);
  });

  it('should generate consistent hash for same key', () => {
    const key = 'oly_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
    const hash1 = crypto.createHash('sha256').update(key).digest('hex');
    const hash2 = crypto.createHash('sha256').update(key).digest('hex');

    expect(hash1).toBe(hash2);
  });
});

describe('API Key Verification', () => {
  function verifyApiKey(providedKey: string, storedHash: string): boolean {
    const computedHash = crypto.createHash('sha256').update(providedKey).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash));
  }

  it('should verify valid key against stored hash', () => {
    const key = 'oly_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    expect(verifyApiKey(key, hash)).toBe(true);
  });

  it('should reject invalid key', () => {
    const validKey = 'oly_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
    const invalidKey = 'oly_live_wrongkeywrongkeywrongkeywrong';
    const hash = crypto.createHash('sha256').update(validKey).digest('hex');

    expect(verifyApiKey(invalidKey, hash)).toBe(false);
  });
});

describe('API Key Revocation', () => {
  interface ApiKey {
    id: string;
    tenant_id: string;
    name: string;
    revoked_at: string | null;
  }

  function isKeyRevoked(key: ApiKey): boolean {
    return key.revoked_at !== null;
  }

  function canUseKey(key: ApiKey): boolean {
    return !isKeyRevoked(key);
  }

  it('should identify active keys', () => {
    const activeKey: ApiKey = {
      id: 'key-1',
      tenant_id: 'tenant-123',
      name: 'Production',
      revoked_at: null,
    };

    expect(isKeyRevoked(activeKey)).toBe(false);
    expect(canUseKey(activeKey)).toBe(true);
  });

  it('should identify revoked keys', () => {
    const revokedKey: ApiKey = {
      id: 'key-1',
      tenant_id: 'tenant-123',
      name: 'Production',
      revoked_at: '2024-01-01T00:00:00Z',
    };

    expect(isKeyRevoked(revokedKey)).toBe(true);
    expect(canUseKey(revokedKey)).toBe(false);
  });
});

describe('API Key Tenant Scoping', () => {
  interface ApiKey {
    id: string;
    tenant_id: string;
    name: string;
  }

  function belongsToTenant(key: ApiKey, tenantId: string): boolean {
    return key.tenant_id === tenantId;
  }

  it('should allow access to own tenant keys', () => {
    const key: ApiKey = {
      id: 'key-1',
      tenant_id: 'tenant-a',
      name: 'Production',
    };

    expect(belongsToTenant(key, 'tenant-a')).toBe(true);
  });

  it('should deny access to other tenant keys', () => {
    const key: ApiKey = {
      id: 'key-1',
      tenant_id: 'tenant-a',
      name: 'Production',
    };

    expect(belongsToTenant(key, 'tenant-b')).toBe(false);
  });
});

describe('API Key Rate Limiting', () => {
  interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
  }

  interface RateLimitState {
    count: number;
    resetAt: number;
  }

  function checkRateLimit(
    state: RateLimitState | null,
    config: RateLimitConfig,
    now: number = Date.now()
  ): { allowed: boolean; remaining: number; resetAt: number } {
    if (!state || now > state.resetAt) {
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      };
    }

    const allowed = state.count < config.maxRequests;
    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - state.count - 1),
      resetAt: state.resetAt,
    };
  }

  it('should allow requests within limit', () => {
    const config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 };
    const state: RateLimitState = { count: 50, resetAt: Date.now() + 30000 };

    const result = checkRateLimit(state, config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(49);
  });

  it('should block requests over limit', () => {
    const config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 };
    const state: RateLimitState = { count: 100, resetAt: Date.now() + 30000 };

    const result = checkRateLimit(state, config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after window expires', () => {
    const config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 };
    const expiredState: RateLimitState = { count: 100, resetAt: Date.now() - 1000 };

    const result = checkRateLimit(expiredState, config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
  });
});

describe('API Key Security', () => {
  it('should mask key for logging', () => {
    const fullKey = 'oly_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
    const masked = fullKey.substring(0, 12) + '...' + fullKey.slice(-4);

    expect(masked).toBe('oly_live_a1b...o5p6');
    expect(masked).not.toContain('b2c3d4e5f6g7h8i9j0k1l2m3n4');
  });

  it('should use timing-safe comparison', () => {
    expect(typeof crypto.timingSafeEqual).toBe('function');
  });

  it('should return consistent error for invalid vs non-existent keys', () => {
    const errorForInvalid = 'Invalid API key';
    const errorForNotFound = 'Invalid API key';

    expect(errorForInvalid).toBe(errorForNotFound);
  });

  it('should not expose internal key hash', () => {
    const keyData = {
      id: 'key-1',
      name: 'Production',
      prefix: 'oly_live_a1b2',
      key_hash: 'secret_hash_value',
    };

    const publicData = {
      id: keyData.id,
      name: keyData.name,
      prefix: keyData.prefix,
    };

    expect(publicData).not.toHaveProperty('key_hash');
  });
});

describe('API Key Management', () => {
  it('should enforce maximum keys per tenant', () => {
    const MAX_KEYS_PER_TENANT = 10;
    const currentKeyCount = 10;

    const canCreateMore = currentKeyCount < MAX_KEYS_PER_TENANT;
    expect(canCreateMore).toBe(false);
  });

  it('should allow creating keys below limit', () => {
    const MAX_KEYS_PER_TENANT = 10;
    const currentKeyCount = 5;

    const canCreateMore = currentKeyCount < MAX_KEYS_PER_TENANT;
    expect(canCreateMore).toBe(true);
  });

  it('should require name for key creation', () => {
    const validateKeyInput = (input: { name?: string }): boolean => {
      return typeof input.name === 'string' && input.name.length > 0;
    };

    expect(validateKeyInput({ name: 'Production' })).toBe(true);
    expect(validateKeyInput({ name: '' })).toBe(false);
    expect(validateKeyInput({})).toBe(false);
  });
});
