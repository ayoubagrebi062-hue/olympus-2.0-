/**
 * OLYMPUS 2.0 - Redis Cache Client
 */

import { Redis } from '@upstash/redis';
import { buildCacheKey } from './config';

/** Cached value wrapper */
interface CachedValue<T> {
  data: T;
  tags?: string[];
  createdAt: number;
  expiresAt: number;
}

// Lazy-initialized Redis client
let redis: Redis | null = null;

/** Get Redis client */
function getRedis(): Redis | null {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('[cache] Upstash not configured');
      return null;
    }

    redis = new Redis({ url, token });
  }
  return redis;
}

/** Get value from cache */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;

  const fullKey = buildCacheKey(key);
  const cached = await r.get<CachedValue<T>>(fullKey);

  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    await r.del(fullKey);
    return null;
  }

  return cached.data;
}

/** Set value in cache */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: { ttl: number; tags?: string[] }
): Promise<void> {
  const r = getRedis();
  if (!r) return;

  const fullKey = buildCacheKey(key);
  const now = Date.now();

  const cached: CachedValue<T> = {
    data: value,
    tags: options.tags,
    createdAt: now,
    expiresAt: now + options.ttl * 1000,
  };

  await r.set(fullKey, cached, { ex: options.ttl });

  // Track key in tag sets for invalidation
  if (options.tags?.length) {
    const pipeline = r.pipeline();
    for (const tag of options.tags) {
      pipeline.sadd(buildCacheKey('tags', tag), fullKey);
      pipeline.expire(buildCacheKey('tags', tag), options.ttl);
    }
    await pipeline.exec();
  }
}

/** Delete value from cache */
export async function cacheDelete(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;

  await r.del(buildCacheKey(key));
}

/** Invalidate all keys with tag */
export async function cacheInvalidateTag(tag: string): Promise<number> {
  const r = getRedis();
  if (!r) return 0;

  const tagKey = buildCacheKey('tags', tag);
  const keys = await r.smembers(tagKey);

  if (keys.length === 0) return 0;

  const pipeline = r.pipeline();
  for (const key of keys) {
    pipeline.del(key);
  }
  pipeline.del(tagKey);
  await pipeline.exec();

  return keys.length;
}

/** Invalidate multiple tags */
export async function cacheInvalidateTags(tags: string[]): Promise<number> {
  let total = 0;
  for (const tag of tags) {
    total += await cacheInvalidateTag(tag);
  }
  return total;
}

/** Get or set pattern (cache-aside) */
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl: number; tags?: string[] }
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const value = await fetcher();
  await cacheSet(key, value, options);

  return value;
}

/** Check if key exists in cache */
export async function cacheHas(key: string): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;

  return (await r.exists(buildCacheKey(key))) > 0;
}

/** Get TTL remaining for key */
export async function cacheTTL(key: string): Promise<number> {
  const r = getRedis();
  if (!r) return -1;

  return await r.ttl(buildCacheKey(key));
}
