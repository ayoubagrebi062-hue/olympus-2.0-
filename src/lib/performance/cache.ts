/**
 * OLYMPUS 3.0 - Caching Utilities
 * Multi-layer caching with Redis, in-memory, and request-level caching
 */

import { getClient as getRedis } from '@/lib/db/redis';

// ============================================================================
// TYPES
// ============================================================================

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  staleWhileRevalidate?: number; // Serve stale while fetching fresh
  tags?: string[]; // Cache tags for invalidation
  prefix?: string; // Key prefix
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

// ============================================================================
// IN-MEMORY CACHE (Request-level + Short-term)
// ============================================================================

const memoryCache = new Map<string, CacheEntry<unknown>>();
const MEMORY_CACHE_MAX_SIZE = 1000;
const MEMORY_CLEANUP_INTERVAL = 60000; // 1 minute

// Cleanup expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (now > entry.timestamp + entry.ttl * 1000) {
        memoryCache.delete(key);
      }
    }
  }, MEMORY_CLEANUP_INTERVAL);
}

// ============================================================================
// CACHE FUNCTIONS
// ============================================================================

/**
 * Get from cache with multi-layer fallback
 */
export async function cacheGet<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
  const fullKey = options.prefix ? `${options.prefix}:${key}` : key;

  // 1. Check memory cache first (fastest)
  const memoryEntry = memoryCache.get(fullKey) as CacheEntry<T> | undefined;
  if (memoryEntry) {
    const now = Date.now();
    if (now < memoryEntry.timestamp + memoryEntry.ttl * 1000) {
      return memoryEntry.value;
    }
    memoryCache.delete(fullKey);
  }

  // 2. Check Redis cache
  try {
    const redis = getRedis();
    if (redis) {
      const data = await redis.get(fullKey);
      if (data) {
        const parsed = JSON.parse(data) as T;
        // Populate memory cache for subsequent requests
        cacheSetMemory(fullKey, parsed, options.ttl || 60);
        return parsed;
      }
    }
  } catch (error) {
    console.warn('[cache] Redis get failed:', error);
  }

  return null;
}

/**
 * Set in cache (both memory and Redis)
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const fullKey = options.prefix ? `${options.prefix}:${key}` : key;
  const ttl = options.ttl || 300; // 5 minutes default

  // 1. Set in memory cache
  cacheSetMemory(fullKey, value, ttl, options.tags);

  // 2. Set in Redis cache
  try {
    const redis = getRedis();
    if (redis) {
      await redis.setex(fullKey, ttl, JSON.stringify(value));

      // Track tags for invalidation
      if (options.tags?.length) {
        for (const tag of options.tags) {
          await redis.sadd(`cache:tag:${tag}`, fullKey);
          await redis.expire(`cache:tag:${tag}`, ttl * 2);
        }
      }
    }
  } catch (error) {
    console.warn('[cache] Redis set failed:', error);
  }
}

/**
 * Delete from cache
 */
export async function cacheDelete(key: string, options: CacheOptions = {}): Promise<void> {
  const fullKey = options.prefix ? `${options.prefix}:${key}` : key;

  // Delete from memory
  memoryCache.delete(fullKey);

  // Delete from Redis
  try {
    const redis = getRedis();
    if (redis) {
      await redis.del(fullKey);
    }
  } catch (error) {
    console.warn('[cache] Redis delete failed:', error);
  }
}

/**
 * Invalidate cache by tag
 */
export async function cacheInvalidateByTag(tag: string): Promise<number> {
  let invalidated = 0;

  try {
    const redis = getRedis();
    if (redis) {
      const keys = await redis.smembers(`cache:tag:${tag}`);
      if (keys.length) {
        await redis.del(...keys);
        await redis.del(`cache:tag:${tag}`);
        invalidated = keys.length;

        // Also clear from memory cache
        for (const key of keys) {
          memoryCache.delete(key);
        }
      }
    }
  } catch (error) {
    console.warn('[cache] Tag invalidation failed:', error);
  }

  return invalidated;
}

/**
 * Cache-aside pattern with auto-populate
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache
  const cached = await cacheGet<T>(key, options);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const fresh = await fetcher();

  // Cache the result
  await cacheSet(key, fresh, options);

  return fresh;
}

/**
 * Stale-while-revalidate pattern
 */
export async function cacheSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const fullKey = options.prefix ? `${options.prefix}:${key}` : key;
  const ttl = options.ttl || 300;
  const swrTtl = options.staleWhileRevalidate || ttl;

  // Check if we have cached data
  const cached = await cacheGet<{ data: T; fetchedAt: number }>(fullKey);

  if (cached) {
    const age = (Date.now() - cached.fetchedAt) / 1000;

    // If fresh, return immediately
    if (age < ttl) {
      return cached.data;
    }

    // If stale but within SWR window, return stale and revalidate in background
    if (age < swrTtl) {
      // Revalidate in background (fire and forget)
      revalidateInBackground(key, fetcher, options);
      return cached.data;
    }
  }

  // No cache or too old, fetch fresh
  const fresh = await fetcher();
  await cacheSet(
    fullKey,
    { data: fresh, fetchedAt: Date.now() },
    {
      ...options,
      ttl: swrTtl,
    }
  );

  return fresh;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function cacheSetMemory<T>(key: string, value: T, ttl: number, tags?: string[]): void {
  // Evict oldest entries if cache is full
  if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }

  memoryCache.set(key, {
    value,
    timestamp: Date.now(),
    ttl,
    tags,
  });
}

async function revalidateInBackground<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions
): Promise<void> {
  try {
    const fresh = await fetcher();
    await cacheSet(key, { data: fresh, fetchedAt: Date.now() }, options);
  } catch (error) {
    console.warn('[cache] Background revalidation failed:', error);
  }
}

// ============================================================================
// CACHE STATS
// ============================================================================

export function getCacheStats(): {
  memorySize: number;
  memoryMaxSize: number;
  hitRate: number;
} {
  return {
    memorySize: memoryCache.size,
    memoryMaxSize: MEMORY_CACHE_MAX_SIZE,
    hitRate: 0, // Would need hit/miss tracking
  };
}

// ============================================================================
// CACHE DECORATORS (for class methods)
// ============================================================================

export function Cached(options: CacheOptions = {}) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
      return cacheGetOrSet(cacheKey, () => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}
