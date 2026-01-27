/**
 * OLYMPUS 2.1 - 10X UPGRADE: Persistent Token Store
 *
 * Production-ready token management with:
 * - Redis persistence (with memory fallback)
 * - Token expiration and rotation
 * - Usage tracking and quotas
 * - Secure token generation
 * - Multi-tier support (guest, free, pro, enterprise)
 */

import { logger } from '../observability/logger';
import { incCounter } from '../observability/metrics';

// ============================================================================
// TYPES
// ============================================================================

export type TokenTier = 'guest' | 'free' | 'pro' | 'enterprise';

export interface TokenData {
  id: string;
  tier: TokenTier;
  userId?: string;
  email?: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
  usage: {
    builds: number;
    tokens: number;
    apiCalls: number;
  };
  limits: {
    maxBuilds: number;
    maxTokensPerBuild: number;
    maxApiCallsPerHour: number;
  };
  metadata?: Record<string, unknown>;
}

export interface TokenQuota {
  builds: { used: number; limit: number; remaining: number };
  tokens: { used: number; limit: number; remaining: number };
  apiCalls: { used: number; limit: number; remaining: number };
}

// ============================================================================
// TIER LIMITS
// ============================================================================

const TIER_LIMITS: Record<TokenTier, TokenData['limits']> = {
  guest: {
    maxBuilds: 3,
    maxTokensPerBuild: 50000,
    maxApiCallsPerHour: 10,
  },
  free: {
    maxBuilds: 10,
    maxTokensPerBuild: 100000,
    maxApiCallsPerHour: 100,
  },
  pro: {
    maxBuilds: 100,
    maxTokensPerBuild: 500000,
    maxApiCallsPerHour: 1000,
  },
  enterprise: {
    maxBuilds: -1, // Unlimited
    maxTokensPerBuild: -1, // Unlimited
    maxApiCallsPerHour: -1, // Unlimited
  },
};

const TIER_EXPIRY_HOURS: Record<TokenTier, number> = {
  guest: 24, // 1 day
  free: 720, // 30 days
  pro: 2160, // 90 days
  enterprise: 8760, // 1 year
};

// ============================================================================
// TOKEN STORE CLASS
// ============================================================================

interface TokenStore {
  get(id: string): Promise<TokenData | null>;
  set(id: string, data: TokenData, ttlSeconds?: number): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

// Memory store (fallback)
class MemoryTokenStore implements TokenStore {
  private store = new Map<string, { data: TokenData; expiresAt: number }>();

  async get(id: string): Promise<TokenData | null> {
    const entry = this.store.get(id);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(id);
      return null;
    }
    return entry.data;
  }

  async set(id: string, data: TokenData, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds
      ? Date.now() + ttlSeconds * 1000
      : new Date(data.expiresAt).getTime();
    this.store.set(id, { data, expiresAt });
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const entry = this.store.get(id);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(id);
      return false;
    }
    return true;
  }
}

// Redis store (production)
class RedisTokenStore implements TokenStore {
  private prefix = 'olympus:token:';

  constructor(private redis: { get: Function; set: Function; del: Function; exists: Function }) {}

  async get(id: string): Promise<TokenData | null> {
    try {
      const data = await this.redis.get(this.prefix + id);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn('Redis get failed, data may be stale', { error: error instanceof Error ? error : new Error(String(error)) });
      return null;
    }
  }

  async set(id: string, data: TokenData, ttlSeconds?: number): Promise<void> {
    try {
      const key = this.prefix + id;
      const value = JSON.stringify(data);
      if (ttlSeconds) {
        await this.redis.set(key, value, { ex: ttlSeconds });
      } else {
        const expiry = Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000);
        await this.redis.set(key, value, { ex: Math.max(expiry, 60) });
      }
    } catch (error) {
      logger.error('Redis set failed', { error: error instanceof Error ? error : new Error(String(error)), tokenId: id });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.redis.del(this.prefix + id);
    } catch (error) {
      logger.warn('Redis delete failed', { error: error instanceof Error ? error : new Error(String(error)), tokenId: id });
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      return (await this.redis.exists(this.prefix + id)) === 1;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// PERSISTENT TOKEN SERVICE
// ============================================================================

export class PersistentTokenService {
  private store: TokenStore;
  private fallbackStore: MemoryTokenStore;
  private useFallback = false;

  constructor(redis?: { get: Function; set: Function; del: Function; exists: Function }) {
    this.fallbackStore = new MemoryTokenStore();

    if (redis) {
      this.store = new RedisTokenStore(redis);
    } else {
      this.store = this.fallbackStore;
      this.useFallback = true;
      logger.warn('PersistentTokenService: No Redis, using memory store (not recommended for production)');
    }
  }

  /**
   * Generate a cryptographically secure token ID
   */
  private generateTokenId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `oly_${crypto.randomUUID().replace(/-/g, '')}`;
    }
    // Fallback for older environments
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'oly_';
    for (let i = 0; i < 32; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  /**
   * Create a new token
   */
  async createToken(
    tier: TokenTier,
    options?: {
      userId?: string;
      email?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<TokenData> {
    const id = this.generateTokenId();
    const now = new Date();
    const expiryHours = TIER_EXPIRY_HOURS[tier];
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    const tokenData: TokenData = {
      id,
      tier,
      userId: options?.userId,
      email: options?.email,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastUsedAt: now.toISOString(),
      usage: {
        builds: 0,
        tokens: 0,
        apiCalls: 0,
      },
      limits: TIER_LIMITS[tier],
      metadata: options?.metadata,
    };

    await this.store.set(id, tokenData);
    incCounter('olympus_tokens_created', 1, { tier });

    logger.info('Token created', {
      tokenId: id,
      tier,
      expiresAt: expiresAt.toISOString(),
    });

    return tokenData;
  }

  /**
   * Get a token by ID
   */
  async getToken(id: string): Promise<TokenData | null> {
    // Try primary store
    let token = await this.store.get(id);

    // If primary failed and we have a fallback, try that
    if (!token && !this.useFallback) {
      token = await this.fallbackStore.get(id);
    }

    if (!token) {
      return null;
    }

    // Check if expired
    if (new Date(token.expiresAt) < new Date()) {
      await this.deleteToken(id);
      return null;
    }

    return token;
  }

  /**
   * Validate a token and check quota
   */
  async validateToken(id: string): Promise<{
    valid: boolean;
    token?: TokenData;
    error?: string;
    quota?: TokenQuota;
  }> {
    const token = await this.getToken(id);

    if (!token) {
      return { valid: false, error: 'Token not found or expired' };
    }

    const quota = this.calculateQuota(token);

    // Check if over limits (skip for unlimited)
    if (token.limits.maxBuilds !== -1 && quota.builds.remaining <= 0) {
      return { valid: false, token, error: 'Build quota exceeded', quota };
    }

    return { valid: true, token, quota };
  }

  /**
   * Calculate remaining quota
   */
  private calculateQuota(token: TokenData): TokenQuota {
    const limits = token.limits;
    const usage = token.usage;

    return {
      builds: {
        used: usage.builds,
        limit: limits.maxBuilds,
        remaining: limits.maxBuilds === -1 ? Infinity : limits.maxBuilds - usage.builds,
      },
      tokens: {
        used: usage.tokens,
        limit: limits.maxTokensPerBuild * limits.maxBuilds,
        remaining:
          limits.maxBuilds === -1
            ? Infinity
            : limits.maxTokensPerBuild * limits.maxBuilds - usage.tokens,
      },
      apiCalls: {
        used: usage.apiCalls,
        limit: limits.maxApiCallsPerHour,
        remaining:
          limits.maxApiCallsPerHour === -1
            ? Infinity
            : limits.maxApiCallsPerHour - usage.apiCalls,
      },
    };
  }

  /**
   * Record usage for a token
   */
  async recordUsage(
    id: string,
    usage: { builds?: number; tokens?: number; apiCalls?: number }
  ): Promise<TokenData | null> {
    const token = await this.getToken(id);
    if (!token) return null;

    token.usage.builds += usage.builds || 0;
    token.usage.tokens += usage.tokens || 0;
    token.usage.apiCalls += usage.apiCalls || 0;
    token.lastUsedAt = new Date().toISOString();

    await this.store.set(id, token);

    // Also update fallback if using primary
    if (!this.useFallback) {
      await this.fallbackStore.set(id, token);
    }

    return token;
  }

  /**
   * Upgrade a token to a new tier
   */
  async upgradeToken(id: string, newTier: TokenTier): Promise<TokenData | null> {
    const token = await this.getToken(id);
    if (!token) return null;

    const oldTier = token.tier;
    token.tier = newTier;
    token.limits = TIER_LIMITS[newTier];

    // Extend expiry based on new tier
    const now = new Date();
    const expiryHours = TIER_EXPIRY_HOURS[newTier];
    token.expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000).toISOString();

    await this.store.set(id, token);

    logger.info('Token upgraded', { tokenId: id, oldTier, newTier });
    incCounter('olympus_tokens_upgraded', 1, { oldTier, newTier });

    return token;
  }

  /**
   * Delete a token
   */
  async deleteToken(id: string): Promise<void> {
    await this.store.delete(id);
    if (!this.useFallback) {
      await this.fallbackStore.delete(id);
    }
    incCounter('olympus_tokens_deleted');
  }

  /**
   * Refresh/extend a token's expiry
   */
  async refreshToken(id: string): Promise<TokenData | null> {
    const token = await this.getToken(id);
    if (!token) return null;

    const now = new Date();
    const expiryHours = TIER_EXPIRY_HOURS[token.tier];
    token.expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000).toISOString();
    token.lastUsedAt = now.toISOString();

    await this.store.set(id, token);
    return token;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let tokenService: PersistentTokenService | null = null;

/**
 * Get or create the token service singleton
 */
export function getTokenService(redis?: {
  get: Function;
  set: Function;
  del: Function;
  exists: Function;
}): PersistentTokenService {
  if (!tokenService) {
    tokenService = new PersistentTokenService(redis);
  }
  return tokenService;
}

/**
 * Initialize token service with Redis
 */
export function initializeTokenService(redis: {
  get: Function;
  set: Function;
  del: Function;
  exists: Function;
}): PersistentTokenService {
  tokenService = new PersistentTokenService(redis);
  return tokenService;
}

export default PersistentTokenService;
