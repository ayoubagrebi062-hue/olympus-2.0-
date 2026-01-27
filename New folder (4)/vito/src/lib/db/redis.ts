/**
 * OLYMPUS 2.0 - Redis Client
 * Cache layer for sessions, rate limiting, and real-time features.
 */

import Redis from 'ioredis';

// Environment variables
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Singleton client instance
let client: Redis | null = null;

/**
 * Get or create Redis client instance
 */
// Track if we've already warned about Redis unavailability
let redisWarned = false;

export function getClient(): Redis {
  if (!client) {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        // Stop retrying after 5 attempts to prevent log spam
        if (times > 5) {
          if (!redisWarned) {
            console.warn('[Redis] Max retries reached. Redis unavailable - caching disabled.');
            redisWarned = true;
          }
          return null; // Stop retrying
        }
        const delay = Math.min(times * 100, 2000);
        return delay;
      },
      lazyConnect: true,
      enableReadyCheck: true,
      // O1 fix - connection management (ioredis handles pooling internally)
      connectTimeout: 5000, // Reduced from 10s
      keepAlive: 30000,
      family: 4, // IPv4
    });

    client.on('error', (error) => {
      // Only log once per error type to prevent spam
      if (!redisWarned) {
        console.error('[Redis] Connection error:', error.message);
      }
    });

    client.on('connect', () => {
      redisWarned = false; // Reset warning flag on successful connect
      console.log('[Redis] Connected successfully');
    });
  }
  return client;
}

/**
 * Check connection health
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const redis = getClient();
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

/**
 * Close the client (call on app shutdown)
 */
export async function closeClient(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

// ============================================
// KEY PREFIXES
// ============================================

export const PREFIXES = {
  SESSION: 'session:',
  BUILD_STATUS: 'build:status:',
  BUILD_PROGRESS: 'build:progress:',
  RATE_LIMIT: 'ratelimit:',
  CACHE: 'cache:',
  LOCK: 'lock:',
  PUBSUB: 'pubsub:',
  PROVIDER_HEALTH: 'provider:health:',
} as const;

// ============================================
// SESSION OPERATIONS
// ============================================

/**
 * Store a session
 */
export async function setSession(
  sessionId: string,
  data: Record<string, any>,
  ttlSeconds: number = 86400 // 24 hours
): Promise<void> {
  const redis = getClient();
  await redis.setex(
    `${PREFIXES.SESSION}${sessionId}`,
    ttlSeconds,
    JSON.stringify(data)
  );
}

/**
 * Get a session
 */
export async function getSession(
  sessionId: string
): Promise<Record<string, any> | null> {
  const redis = getClient();
  const data = await redis.get(`${PREFIXES.SESSION}${sessionId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const redis = getClient();
  await redis.del(`${PREFIXES.SESSION}${sessionId}`);
}

/**
 * Refresh session TTL
 */
export async function refreshSession(
  sessionId: string,
  ttlSeconds: number = 86400
): Promise<void> {
  const redis = getClient();
  await redis.expire(`${PREFIXES.SESSION}${sessionId}`, ttlSeconds);
}

// ============================================
// BUILD STATUS OPERATIONS
// ============================================

export interface BuildStatusCache {
  status: 'pending' | 'building' | 'completed' | 'failed';
  phase: string;
  progress: number;
  agent?: string;
  message?: string;
  updatedAt: string;
}

/**
 * Set build status (for real-time updates)
 */
export async function setBuildStatus(
  buildId: string,
  status: BuildStatusCache
): Promise<void> {
  const redis = getClient();
  await redis.setex(
    `${PREFIXES.BUILD_STATUS}${buildId}`,
    3600, // 1 hour TTL
    JSON.stringify({ ...status, updatedAt: new Date().toISOString() })
  );

  // Also publish for real-time subscribers
  await redis.publish(
    `${PREFIXES.PUBSUB}build:${buildId}`,
    JSON.stringify(status)
  );
}

/**
 * Get build status
 */
export async function getBuildStatus(
  buildId: string
): Promise<BuildStatusCache | null> {
  const redis = getClient();
  const data = await redis.get(`${PREFIXES.BUILD_STATUS}${buildId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Update build progress
 */
export async function updateBuildProgress(
  buildId: string,
  progress: number,
  phase: string,
  agent?: string
): Promise<void> {
  const existing = await getBuildStatus(buildId);
  await setBuildStatus(buildId, {
    status: existing?.status || 'building',
    phase,
    progress,
    agent,
    updatedAt: new Date().toISOString(),
  });
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Check and increment rate limit
 * Returns true if within limit, false if exceeded
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const redis = getClient();
  const fullKey = `${PREFIXES.RATE_LIMIT}${key}`;

  const multi = redis.multi();
  multi.incr(fullKey);
  multi.ttl(fullKey);

  const results = await multi.exec();
  const count = results?.[0]?.[1] as number;
  let ttl = results?.[1]?.[1] as number;

  // Set expiry on first request
  if (ttl === -1) {
    await redis.expire(fullKey, windowSeconds);
    ttl = windowSeconds;
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetIn: ttl,
  };
}

/**
 * Reset rate limit
 */
export async function resetRateLimit(key: string): Promise<void> {
  const redis = getClient();
  await redis.del(`${PREFIXES.RATE_LIMIT}${key}`);
}

// ============================================
// CACHING
// ============================================

/**
 * Set cache value
 */
export async function setCache(
  key: string,
  value: any,
  ttlSeconds: number = 300
): Promise<void> {
  const redis = getClient();
  await redis.setex(
    `${PREFIXES.CACHE}${key}`,
    ttlSeconds,
    JSON.stringify(value)
  );
}

/**
 * Get cache value
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
  const redis = getClient();
  const data = await redis.get(`${PREFIXES.CACHE}${key}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Delete cache value
 */
export async function deleteCache(key: string): Promise<void> {
  const redis = getClient();
  await redis.del(`${PREFIXES.CACHE}${key}`);
}

/**
 * Clear cache by pattern
 */
export async function clearCachePattern(pattern: string): Promise<number> {
  const redis = getClient();
  const keys = await redis.keys(`${PREFIXES.CACHE}${pattern}`);
  if (keys.length === 0) return 0;
  return await redis.del(...keys);
}

// ============================================
// DISTRIBUTED LOCKS
// ============================================

/**
 * Acquire a distributed lock
 */
export async function acquireLock(
  lockName: string,
  ttlSeconds: number = 30
): Promise<boolean> {
  const redis = getClient();
  const result = await redis.set(
    `${PREFIXES.LOCK}${lockName}`,
    Date.now().toString(),
    'EX',
    ttlSeconds,
    'NX'
  );
  return result === 'OK';
}

/**
 * Release a distributed lock
 */
export async function releaseLock(lockName: string): Promise<void> {
  const redis = getClient();
  await redis.del(`${PREFIXES.LOCK}${lockName}`);
}

/**
 * Execute with lock
 */
export async function withLock<T>(
  lockName: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 30
): Promise<T | null> {
  const acquired = await acquireLock(lockName, ttlSeconds);
  if (!acquired) {
    return null;
  }

  try {
    return await fn();
  } finally {
    await releaseLock(lockName);
  }
}

// ============================================
// PUB/SUB (for real-time updates)
// ============================================

/**
 * Subscribe to build updates
 */
export function subscribeToBuild(
  buildId: string,
  callback: (status: BuildStatusCache) => void
): Redis {
  const subscriber = new Redis(REDIS_URL);

  subscriber.subscribe(`${PREFIXES.PUBSUB}build:${buildId}`, (err) => {
    if (err) {
      console.error('Failed to subscribe:', err);
    }
  });

  subscriber.on('message', (_channel, message) => {
    try {
      const status = JSON.parse(message);
      callback(status);
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  });

  return subscriber;
}

// ============================================
// PROVIDER HEALTH
// ============================================

export interface ProviderHealthCache {
  healthy: boolean;
  latencyMs: number;
  checkedAt: string;
}

/**
 * Set provider health status
 */
export async function setProviderHealth(
  provider: string,
  healthy: boolean,
  latencyMs: number
): Promise<void> {
  const redis = getClient();
  await redis.setex(
    `${PREFIXES.PROVIDER_HEALTH}${provider}`,
    300, // 5 minute TTL
    JSON.stringify({
      healthy,
      latencyMs,
      checkedAt: new Date().toISOString(),
    })
  );
}

/**
 * Get provider health status
 */
export async function getProviderHealth(
  provider: string
): Promise<ProviderHealthCache | null> {
  const redis = getClient();
  const data = await redis.get(`${PREFIXES.PROVIDER_HEALTH}${provider}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Get all provider health statuses
 */
export async function getAllProviderHealth(): Promise<Record<string, ProviderHealthCache>> {
  const redis = getClient();
  const keys = await redis.keys(`${PREFIXES.PROVIDER_HEALTH}*`);

  if (keys.length === 0) return {};

  const result: Record<string, ProviderHealthCache> = {};

  for (const key of keys) {
    const provider = key.replace(PREFIXES.PROVIDER_HEALTH, '');
    const data = await redis.get(key);
    if (data) {
      result[provider] = JSON.parse(data);
    }
  }

  return result;
}

export default {
  getClient,
  healthCheck,
  closeClient,
  PREFIXES,
  setSession,
  getSession,
  deleteSession,
  refreshSession,
  setBuildStatus,
  getBuildStatus,
  updateBuildProgress,
  checkRateLimit,
  resetRateLimit,
  setCache,
  getCache,
  deleteCache,
  clearCachePattern,
  acquireLock,
  releaseLock,
  withLock,
  subscribeToBuild,
  setProviderHealth,
  getProviderHealth,
  getAllProviderHealth,
};
