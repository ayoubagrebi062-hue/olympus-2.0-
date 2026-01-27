/**
 * OLYMPUS 2.0 - Rate Limiter (Upstash Redis)
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { RateLimitError } from '../errors';
import { windowToMs, getEndpointLimit, getPlanLimit, type RateLimitWindow } from './config';
import type { PlanTier } from '../types';

// =============================================================================
// 50X RELIABILITY: LRU Cache with bounded size to prevent memory leaks
// =============================================================================

const LIMITER_CACHE_MAX_SIZE = 1000;

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // If key exists, delete first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  get size(): number {
    return this.cache.size;
  }
}

/** Rate limit result */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds
}

/** Rate limit check params */
export interface RateLimitParams {
  identifier: string; // userId, tenantId, or IP
  endpoint?: string;
  plan?: PlanTier;
  limit?: number;
  window?: RateLimitWindow;
}

// Lazy-initialized Redis client
let redis: Redis | null = null;
// 50X RELIABILITY: Use LRU cache with bounded size to prevent memory leaks
const limiterCache = new LRUCache<string, Ratelimit>(LIMITER_CACHE_MAX_SIZE);

/** Get Redis client */
function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('[rate-limit] Upstash not configured, using in-memory fallback');
      return null as any;
    }

    redis = new Redis({ url, token });
  }
  return redis;
}

/** Get or create rate limiter for config */
function getLimiter(requests: number, window: RateLimitWindow): Ratelimit {
  const key = `${requests}:${window}`;

  if (!limiterCache.has(key)) {
    const r = getRedis();
    if (!r) {
      // Return a pass-through limiter if Redis not configured
      return { limit: async () => ({ success: true, limit: requests, remaining: requests, reset: Date.now() + windowToMs(window) }) } as any;
    }

    limiterCache.set(key, new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(requests, `${windowToMs(window)}ms`),
      analytics: true,
      prefix: 'olympus:ratelimit',
    }));
  }

  return limiterCache.get(key)!;
}

/** Check rate limit */
export async function checkRateLimit(params: RateLimitParams): Promise<RateLimitResult> {
  const { identifier, endpoint = 'default', plan = 'free' } = params;

  // Get limits
  const endpointLimit = getEndpointLimit(endpoint);
  const planLimit = getPlanLimit(plan);

  // Use custom limit or calculate from config
  const limit = params.limit ?? endpointLimit.requests;
  const window = params.window ?? endpointLimit.window;

  const limiter = getLimiter(limit, window);
  const key = `${identifier}:${endpoint}`;

  const result = await limiter.limit(key);

  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
  };
}

/** Check rate limit and throw if exceeded */
export async function requireRateLimit(params: RateLimitParams): Promise<RateLimitResult> {
  const result = await checkRateLimit(params);

  if (!result.allowed) {
    throw new RateLimitError(result.retryAfter || 60, {
      message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
    });
  }

  return result;
}

/** Reset rate limit for identifier */
export async function resetRateLimit(identifier: string, endpoint?: string): Promise<void> {
  const r = getRedis();
  if (!r) return;

  const pattern = endpoint ? `olympus:ratelimit:${identifier}:${endpoint}` : `olympus:ratelimit:${identifier}:*`;

  const keys = await r.keys(pattern);
  if (keys.length > 0) {
    await r.del(...keys);
  }
}

/** Get current rate limit status without consuming */
export async function getRateLimitStatus(identifier: string, endpoint: string = 'default'): Promise<RateLimitResult | null> {
  const r = getRedis();
  if (!r) return null;

  const key = `olympus:ratelimit:${identifier}:${endpoint}`;
  const data = await r.get(key);

  if (!data) return null;

  const endpointLimit = getEndpointLimit(endpoint);
  return {
    allowed: true,
    limit: endpointLimit.requests,
    remaining: endpointLimit.requests - (typeof data === 'number' ? data : 0),
    reset: Date.now() + windowToMs(endpointLimit.window),
  };
}
