/**
 * OLYMPUS 10X - Redis Client
 *
 * Singleton Redis connection for build queue and caching
 */

import Redis from 'ioredis';

let redis: Redis | null = null;

/**
 * Get or create Redis client (singleton pattern)
 */
export function getRedisClient(): Redis {
  if (!redis) {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.error('[Redis] Max retries reached, giving up');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        console.log(`[Redis] Retry ${times}/3 in ${delay}ms`);
        return delay;
      },
      lazyConnect: false,
    };

    redis = new Redis(config);

    redis.on('error', err => {
      console.error('[Redis] Connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    redis.on('ready', () => {
      console.log('[Redis] Client ready');
    });

    redis.on('close', () => {
      console.log('[Redis] Connection closed');
    });

    redis.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });
  }

  return redis;
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('[Redis] Connection closed gracefully');
  }
}

/**
 * Check if Redis is connected
 */
export async function isRedisConnected(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('[Redis] Health check failed:', error);
    return false;
  }
}

/**
 * Get Redis info (for debugging)
 */
export async function getRedisInfo(): Promise<any> {
  try {
    const client = getRedisClient();
    const info = await client.info();
    return {
      connected: true,
      info: info.split('\r\n').filter(line => line && !line.startsWith('#')),
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
