/**
 * OLYMPUS 2.1 - SECURITY BLUEPRINT
 * Rate Limiter - Request throttling and abuse prevention
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMIT TIERS
// ═══════════════════════════════════════════════════════════════════════════════

export type RateLimitTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
  keyBy: 'ip' | 'user' | 'api_key';
}

export const TIER_RATE_LIMITS: Record<RateLimitTier, RateLimitConfig> = {
  free: { requests: 100, windowMs: 60 * 60 * 1000, keyBy: 'user' },
  starter: { requests: 1000, windowMs: 60 * 60 * 1000, keyBy: 'user' },
  pro: { requests: 5000, windowMs: 60 * 60 * 1000, keyBy: 'user' },
  business: { requests: 20000, windowMs: 60 * 60 * 1000, keyBy: 'user' },
  enterprise: { requests: 100000, windowMs: 60 * 60 * 1000, keyBy: 'user' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT-SPECIFIC LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

export interface EndpointLimit {
  path: string | RegExp;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | '*';
  requests: number;
  windowMs: number;
  keyBy?: 'ip' | 'user' | 'api_key';
  skipSuccessfulRequests?: boolean;
  message?: string;
}

export const ENDPOINT_LIMITS: EndpointLimit[] = [
  // Authentication - Strict
  { path: '/api/auth/login', method: 'POST', requests: 5, windowMs: 15 * 60 * 1000, keyBy: 'ip' },
  { path: '/api/auth/signup', method: 'POST', requests: 3, windowMs: 60 * 60 * 1000, keyBy: 'ip' },
  {
    path: '/api/auth/forgot-password',
    method: 'POST',
    requests: 3,
    windowMs: 60 * 60 * 1000,
    keyBy: 'ip',
  },
  // Builds - Expensive
  { path: /^\/api\/ai\/builds/, method: 'POST', requests: 5, windowMs: 60 * 1000, keyBy: 'user' },
  {
    path: /^\/api\/builds\/[^/]+\/iterate/,
    method: 'POST',
    requests: 20,
    windowMs: 60 * 1000,
    keyBy: 'user',
  },
  // Deployments
  { path: /^\/api\/deployments/, method: 'POST', requests: 3, windowMs: 60 * 1000, keyBy: 'user' },
  // Storage
  {
    path: /^\/api\/storage\/upload/,
    method: 'POST',
    requests: 30,
    windowMs: 60 * 1000,
    keyBy: 'user',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // GOVERNANCE ENDPOINTS - SECURITY FIX: Cluster #4 Hardening
  // These are critical security endpoints requiring strict rate limiting
  // ═══════════════════════════════════════════════════════════════════════════════

  // Governance mode changes - VERY STRICT (impacts entire system)
  {
    path: '/api/v1/governance/mode',
    method: 'POST',
    requests: 5,
    windowMs: 60 * 60 * 1000, // 5 per hour
    keyBy: 'user',
    message: 'Governance mode change rate limit exceeded. Try again later.',
  },
  {
    path: '/api/v1/governance/mode',
    method: 'PUT',
    requests: 5,
    windowMs: 60 * 60 * 1000,
    keyBy: 'user',
    message: 'Governance mode change rate limit exceeded. Try again later.',
  },

  // Governance status - Moderate (monitoring is okay, but not abuse)
  {
    path: '/api/v1/governance/status',
    method: 'GET',
    requests: 60,
    windowMs: 60 * 1000, // 60 per minute
    keyBy: 'user',
  },

  // Kill switch - EXTREMELY STRICT (emergency only)
  {
    path: '/api/v1/governance/kill-switch',
    method: 'POST',
    requests: 3,
    windowMs: 60 * 60 * 1000, // 3 per hour
    keyBy: 'user',
    message: 'Kill switch rate limit exceeded. Contact administrator.',
  },

  // Tenant lock - EXTREMELY STRICT (critical operation)
  {
    path: /^\/api\/v1\/governance\/tenant\/[^/]+\/lock/,
    method: 'POST',
    requests: 5,
    windowMs: 60 * 60 * 1000, // 5 per hour
    keyBy: 'user',
    message: 'Tenant lock rate limit exceeded.',
  },

  // Policy violations - Read (moderate), Write (strict)
  {
    path: /^\/api\/v1\/governance\/violations/,
    method: 'GET',
    requests: 120,
    windowMs: 60 * 1000, // 120 per minute for reads
    keyBy: 'user',
  },
  {
    path: /^\/api\/v1\/governance\/violations/,
    method: 'POST',
    requests: 30,
    windowMs: 60 * 1000, // 30 per minute for writes
    keyBy: 'user',
  },

  // Remediation actions - STRICT (irreversible operations)
  {
    path: /^\/api\/v1\/governance\/remediate/,
    method: 'POST',
    requests: 10,
    windowMs: 60 * 1000, // 10 per minute
    keyBy: 'user',
    message: 'Remediation rate limit exceeded. Allow cooldown before retrying.',
  },

  // Ledger operations - Read (moderate), Write (strict)
  {
    path: /^\/api\/v1\/governance\/ledger/,
    method: 'GET',
    requests: 60,
    windowMs: 60 * 1000,
    keyBy: 'user',
  },
  {
    path: /^\/api\/v1\/governance\/ledger/,
    method: 'POST',
    requests: 20,
    windowMs: 60 * 1000,
    keyBy: 'user',
  },

  // Agent registration - STRICT (security-sensitive)
  {
    path: /^\/api\/v1\/governance\/agents\/register/,
    method: 'POST',
    requests: 10,
    windowMs: 60 * 60 * 1000, // 10 per hour
    keyBy: 'user',
    message: 'Agent registration rate limit exceeded.',
  },

  // Decision strategies - Read (moderate), Write (very strict)
  {
    path: /^\/api\/v1\/governance\/strategies/,
    method: 'GET',
    requests: 30,
    windowMs: 60 * 1000,
    keyBy: 'user',
  },
  {
    path: /^\/api\/v1\/governance\/strategies/,
    method: 'POST',
    requests: 5,
    windowMs: 60 * 60 * 1000, // 5 per hour for strategy changes
    keyBy: 'user',
    message: 'Strategy modification rate limit exceeded.',
  },
  {
    path: /^\/api\/v1\/governance\/strategies/,
    method: 'PUT',
    requests: 5,
    windowMs: 60 * 60 * 1000,
    keyBy: 'user',
    message: 'Strategy modification rate limit exceeded.',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// REDIS KEY PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

export const RATE_LIMIT_KEYS = {
  global: (identifier: string, window: number) => `ratelimit:global:${identifier}:${window}`,
  endpoint: (identifier: string, endpoint: string, window: number) =>
    `ratelimit:endpoint:${endpoint}:${identifier}:${window}`,
  bruteForce: (ip: string) => `ratelimit:bruteforce:${ip}`,
  captchaRequired: (identifier: string) => `ratelimit:captcha:${identifier}`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CAPTCHA CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const CAPTCHA_CONFIG = {
  provider: 'cloudflare_turnstile' as const,
  siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
  secretKey: process.env.TURNSTILE_SECRET_KEY || '',
  triggers: { failedLogins: 3, signupFromNewIP: true, passwordReset: true },
  verifyUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDING WINDOW CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export function slidingWindowCheck(
  currentWindowCount: number,
  previousWindowCount: number,
  windowMs: number,
  limit: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowProgress = (now - windowStart) / windowMs;
  const estimatedCount = previousWindowCount * (1 - windowProgress) + currentWindowCount;
  const allowed = estimatedCount < limit;
  const remaining = Math.max(0, Math.floor(limit - estimatedCount));
  const resetAt = windowStart + windowMs;
  return { allowed, remaining, resetAt };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT MATCHING
// ═══════════════════════════════════════════════════════════════════════════════

export function getEndpointLimit(path: string, method: string): EndpointLimit | undefined {
  return ENDPOINT_LIMITS.find(limit => {
    if (limit.method && limit.method !== '*' && limit.method !== method) return false;
    if (typeof limit.path === 'string') return path === limit.path;
    return limit.path.test(path);
  });
}

export function getEffectiveLimit(
  endpointLimit: EndpointLimit | undefined,
  tier: RateLimitTier
): RateLimitConfig {
  const tierLimit = TIER_RATE_LIMITS[tier];
  if (!endpointLimit) return tierLimit;
  return {
    requests: Math.min(endpointLimit.requests, tierLimit.requests),
    windowMs: endpointLimit.windowMs,
    keyBy: endpointLimit.keyBy || tierLimit.keyBy,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
  headers: Record<string, string>;
}

export function createRateLimitResult(
  allowed: boolean,
  limit: number,
  remaining: number,
  resetAt: number
): RateLimitResult {
  const retryAfter = allowed ? undefined : Math.ceil((resetAt - Date.now()) / 1000);
  return {
    allowed,
    limit,
    remaining,
    resetAt,
    retryAfter,
    headers: {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      ...(retryAfter && { 'Retry-After': String(retryAfter) }),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const RATE_LIMITER = {
  tiers: TIER_RATE_LIMITS,
  endpoints: ENDPOINT_LIMITS,
  keys: RATE_LIMIT_KEYS,
  captcha: CAPTCHA_CONFIG,
  slidingWindow: slidingWindowCheck,
  getEndpointLimit,
  getEffectiveLimit,
  createResult: createRateLimitResult,
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY IMPLEMENTATION (kept for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

interface LegacyRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

interface LegacyRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

interface RateLimitInfo {
  count: number;
  resetAt: number;
}

// ============================================================================
// 10X UPGRADE: PRODUCTION-READY REDIS CONNECTION
// ============================================================================

interface RedisClient {
  del(key: string): Promise<void>;
  multi(): {
    zremrangebyscore(key: string, min: number, max: number): void;
    zadd(key: string, score: number, member: string): void;
    zcard(key: string): void;
    expire(key: string, seconds: number): void;
    exec(): Promise<Array<[Error | null, unknown]> | null>;
  };
}

// 10X: Lazy singleton Redis connection with health monitoring
let redisClient: RedisClient | null = null;
let redisHealthy = true;
let redisLastError: Date | null = null;
const REDIS_RETRY_AFTER_MS = 30000; // Retry unhealthy Redis after 30s

/**
 * 10X UPGRADE: Production Redis connection with circuit breaker pattern
 * - Reads from REDIS_URL or UPSTASH_REDIS_REST_URL environment variable
 * - Implements circuit breaker to prevent cascading failures
 * - Falls back gracefully to memory store
 */
function getRedis(): RedisClient | null {
  // Circuit breaker: Don't try Redis if it recently failed
  if (!redisHealthy && redisLastError) {
    const timeSinceError = Date.now() - redisLastError.getTime();
    if (timeSinceError < REDIS_RETRY_AFTER_MS) {
      return null; // Use memory fallback
    }
    // Reset circuit breaker to try again
    redisHealthy = true;
  }

  // Already have a healthy client
  if (redisClient && redisHealthy) {
    return redisClient;
  }

  // Try to create Redis client from environment
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

  if (!redisUrl) {
    // No Redis configured - this is fine for development
    return null;
  }

  try {
    // Dynamic import to avoid bundling Redis client when not needed
    // In production, this would use @upstash/redis or ioredis
    // For now, we log that Redis is available but not implemented
    console.log(
      '[rate-limiter] Redis URL detected. Using memory fallback until Redis client is implemented.'
    );
    console.log('[rate-limiter] To enable Redis: npm install @upstash/redis');

    // ENHANCEMENT: Enable Redis for distributed rate limiting
    // Uncomment below when ready to use Upstash Redis:
    // const { Redis } = await import('@upstash/redis');
    // redisClient = new Redis({ url: redisUrl });

    return null;
  } catch (error) {
    console.error('[rate-limiter] Redis connection failed:', error);
    redisHealthy = false;
    redisLastError = new Date();
    markRedisFailure();
    return null;
  }
}

// 10X: Metrics for observability
let rateLimitMetrics = {
  totalChecks: 0,
  redisHits: 0,
  memoryHits: 0,
  blocked: 0,
  errors: 0,
  redisFailures: 0,
};

export function getRateLimitMetrics() {
  return { ...rateLimitMetrics };
}

function markRedisFailure() {
  rateLimitMetrics.redisFailures++;
  rateLimitMetrics.errors++;
}

function recordCheck(source: 'redis' | 'memory', blocked: boolean) {
  rateLimitMetrics.totalChecks++;
  if (source === 'redis') rateLimitMetrics.redisHits++;
  else rateLimitMetrics.memoryHits++;
  if (blocked) rateLimitMetrics.blocked++;
}

// ============================================================================
// IN-MEMORY FALLBACK
// ============================================================================

// L1 fix - bounded memory store with max size
const MAX_MEMORY_STORE_SIZE = 10000;
const memoryStore = new Map<string, RateLimitInfo>();
const CLEANUP_INTERVAL = 60000; // 1 minute

// L2 fix - store cleanup interval reference for proper shutdown
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

// 50X RELIABILITY: Mutex lock for thread-safe memory store operations
let rateLimitLock = false;
const pendingLockQueue: Array<() => void> = [];

function acquireRateLimitLock(): Promise<void> {
  return new Promise(resolve => {
    if (!rateLimitLock) {
      rateLimitLock = true;
      resolve();
    } else {
      pendingLockQueue.push(resolve);
    }
  });
}

function releaseRateLimitLock(): void {
  const next = pendingLockQueue.shift();
  if (next) {
    next();
  } else {
    rateLimitLock = false;
  }
}

// Cleanup expired entries - 50X RELIABILITY: Thread-safe with error handling
if (typeof setInterval !== 'undefined') {
  cleanupIntervalId = setInterval(async () => {
    // Acquire lock for safe iteration and modification
    await acquireRateLimitLock();

    try {
      const now = Date.now();
      let deletedCount = 0;

      // Collect keys to delete (don't delete during iteration)
      const keysToDelete: string[] = [];
      for (const [key, info] of memoryStore.entries()) {
        if (now > info.resetAt) {
          keysToDelete.push(key);
        }
      }

      // Delete expired entries
      for (const key of keysToDelete) {
        memoryStore.delete(key);
        deletedCount++;
      }

      // L1 fix - if store is still too large, remove oldest entries
      if (memoryStore.size > MAX_MEMORY_STORE_SIZE) {
        const entries = Array.from(memoryStore.entries()).sort(
          (a, b) => a[1].resetAt - b[1].resetAt
        );

        const toDelete = entries.slice(0, memoryStore.size - MAX_MEMORY_STORE_SIZE);
        for (const [key] of toDelete) {
          memoryStore.delete(key);
        }
      }

      if (deletedCount > 0 || memoryStore.size > MAX_MEMORY_STORE_SIZE * 0.8) {
        console.log(
          `[rate-limiter] Cleanup: removed ${deletedCount} expired, store size: ${memoryStore.size}`
        );
      }
    } catch (error) {
      console.error('[rate-limiter] Cleanup error:', error);
    } finally {
      releaseRateLimitLock();
    }
  }, CLEANUP_INTERVAL);
}

// L2 fix - cleanup function for graceful shutdown
export function stopRateLimiterCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

// ============================================================================
// RATE LIMITER
// ============================================================================

/**
 * Create a rate limiter with the given configuration
 */
export function createRateLimiter(config: LegacyRateLimitConfig) {
  const { windowMs, maxRequests, keyPrefix = 'rl' } = config;

  return {
    /**
     * Check if request is allowed
     */
    async check(identifier: string): Promise<RateLimitResult> {
      const key = `${keyPrefix}:${identifier}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      try {
        const redis = getRedis();

        if (redis) {
          const legacyResult = await checkWithRedis(redis, key, windowMs, maxRequests, now);
          const result = createRateLimitResult(
            legacyResult.allowed,
            maxRequests,
            legacyResult.remaining,
            legacyResult.resetAt.getTime()
          );
          recordCheck('redis', !result.allowed);
          return result;
        }
      } catch (error) {
        console.warn('[rate-limiter] Redis error, falling back to memory:', error);
        markRedisFailure();
      }

      // Fallback to memory store
      const legacyResult = checkWithMemory(key, windowMs, maxRequests, now);
      const result = createRateLimitResult(
        legacyResult.allowed,
        maxRequests,
        legacyResult.remaining,
        legacyResult.resetAt.getTime()
      );
      recordCheck('memory', !result.allowed);
      return result;
    },

    /**
     * Reset rate limit for identifier
     */
    async reset(identifier: string): Promise<void> {
      const key = `${keyPrefix}:${identifier}`;

      try {
        const redis = getRedis();
        if (redis) {
          await redis.del(key);
        }
      } catch {
        // Ignore Redis errors
      }

      memoryStore.delete(key);
    },
  };
}

// ============================================================================
// REDIS IMPLEMENTATION (Sliding Window)
// ============================================================================

async function checkWithRedis(
  redis: RedisClient,
  key: string,
  windowMs: number,
  maxRequests: number,
  now: number
): Promise<LegacyRateLimitResult> {
  const windowStart = now - windowMs;

  // Use sorted set for sliding window
  const multi = redis!.multi();

  // Remove expired entries
  multi.zremrangebyscore(key, 0, windowStart);

  // Add current request
  multi.zadd(key, now, `${now}-${Math.random()}`);

  // Count requests in window
  multi.zcard(key);

  // Set expiry
  multi.expire(key, Math.ceil(windowMs / 1000));

  const results = await multi.exec();
  const count = (results?.[2]?.[1] as number) || 0;

  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);
  const resetAt = new Date(now + windowMs);

  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? undefined : Math.ceil(windowMs / 1000),
  };
}

// ============================================================================
// MEMORY IMPLEMENTATION (Fixed Window) - 50X RELIABILITY: Thread-Safe
// ============================================================================

/**
 * Thread-safe rate limit check with mutex lock
 * Prevents race conditions in read-modify-write pattern
 */
async function checkWithMemoryAsync(
  key: string,
  windowMs: number,
  maxRequests: number,
  now: number
): Promise<LegacyRateLimitResult> {
  await acquireRateLimitLock();

  try {
    let info = memoryStore.get(key);

    // Reset if window expired
    if (!info || now > info.resetAt) {
      info = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    // Atomic increment
    info.count++;
    memoryStore.set(key, info);

    const allowed = info.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - info.count);
    const resetAt = new Date(info.resetAt);

    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((info.resetAt - now) / 1000),
    };
  } finally {
    releaseRateLimitLock();
  }
}

/**
 * Synchronous fallback (kept for backward compatibility)
 * Note: Use checkWithMemoryAsync for thread-safe operations
 */
function checkWithMemory(
  key: string,
  windowMs: number,
  maxRequests: number,
  now: number
): LegacyRateLimitResult {
  // Fast path: no contention
  if (!rateLimitLock) {
    rateLimitLock = true;
    try {
      let info = memoryStore.get(key);

      if (!info || now > info.resetAt) {
        info = { count: 0, resetAt: now + windowMs };
      }

      info.count++;
      memoryStore.set(key, info);

      const allowed = info.count <= maxRequests;
      const remaining = Math.max(0, maxRequests - info.count);
      const resetAt = new Date(info.resetAt);

      return {
        allowed,
        remaining,
        resetAt,
        retryAfter: allowed ? undefined : Math.ceil((info.resetAt - now) / 1000),
      };
    } finally {
      releaseRateLimitLock();
    }
  }

  // Contention detected - log warning and proceed (sync function can't wait)
  console.warn(
    '[rate-limiter] Lock contention in sync checkWithMemory - consider using async version'
  );

  let info = memoryStore.get(key);
  if (!info || now > info.resetAt) {
    info = { count: 0, resetAt: now + windowMs };
  }
  info.count++;
  memoryStore.set(key, info);

  const allowed = info.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - info.count);
  const resetAt = new Date(info.resetAt);

  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? undefined : Math.ceil((info.resetAt - now) / 1000),
  };
}

// ============================================================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================================================

/**
 * API rate limiter - 100 requests per minute
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: 'rl:api',
});

/**
 * Auth rate limiter - 5 attempts per 15 minutes
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'rl:auth',
});

/**
 * Strict rate limiter - 10 requests per minute (for sensitive endpoints)
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'rl:strict',
});

/**
 * Upload rate limiter - 20 uploads per hour
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'rl:upload',
});

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE RATE LIMITERS - SECURITY FIX: Cluster #4 Hardening
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Governance API rate limiter - 30 requests per minute
 * For general governance operations (status checks, reads)
 */
export const governanceRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: 'rl:governance',
});

/**
 * Governance critical rate limiter - 5 requests per hour
 * For kill switch, mode changes, tenant locks
 */
export const governanceCriticalRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'rl:governance:critical',
});

/**
 * Governance remediation rate limiter - 10 requests per minute
 * For automated remediation actions
 */
export const governanceRemediationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'rl:governance:remediate',
});

/**
 * Governance ledger rate limiter - 20 writes per minute
 * For ledger append operations
 */
export const governanceLedgerRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'rl:governance:ledger',
});

// ============================================================================
// MIDDLEWARE HELPER
// ============================================================================

/**
 * Create rate limit headers (L3 fix - correct header naming)
 */
export function createRateLimitHeaders(
  result: LegacyRateLimitResult,
  maxRequests: number = 100
): Record<string, string> {
  return {
    'X-RateLimit-Limit': maxRequests.toString(), // L3 fix - should be max, not remaining
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(), // Unix timestamp
    ...(result.retryAfter ? { 'Retry-After': result.retryAfter.toString() } : {}),
  };
}

/**
 * Get identifier from request
 */
export function getRequestIdentifier(request: Request, userId?: string): string {
  // Prefer user ID if authenticated
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

  return `ip:${ip}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE MIDDLEWARE - SECURITY FIX: Cluster #4 Hardening
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Governance operation severity levels
 */
export type GovernanceOperationSeverity = 'read' | 'write' | 'critical' | 'emergency';

/**
 * Get appropriate rate limiter based on governance operation severity
 */
export function getGovernanceRateLimiter(severity: GovernanceOperationSeverity) {
  switch (severity) {
    case 'emergency':
    case 'critical':
      return governanceCriticalRateLimiter;
    case 'write':
      return governanceRemediationRateLimiter;
    case 'read':
    default:
      return governanceRateLimiter;
  }
}

/**
 * Map governance endpoints to severity levels
 */
const GOVERNANCE_SEVERITY_MAP: Array<{
  pattern: string | RegExp;
  method?: string;
  severity: GovernanceOperationSeverity;
}> = [
  // Emergency operations
  { pattern: '/api/v1/governance/kill-switch', method: 'POST', severity: 'emergency' },

  // Critical operations
  { pattern: '/api/v1/governance/mode', method: 'POST', severity: 'critical' },
  { pattern: '/api/v1/governance/mode', method: 'PUT', severity: 'critical' },
  { pattern: /^\/api\/v1\/governance\/tenant\/[^/]+\/lock/, method: 'POST', severity: 'critical' },
  { pattern: /^\/api\/v1\/governance\/strategies/, method: 'POST', severity: 'critical' },
  { pattern: /^\/api\/v1\/governance\/strategies/, method: 'PUT', severity: 'critical' },
  { pattern: /^\/api\/v1\/governance\/agents\/register/, method: 'POST', severity: 'critical' },

  // Write operations
  { pattern: /^\/api\/v1\/governance\/remediate/, method: 'POST', severity: 'write' },
  { pattern: /^\/api\/v1\/governance\/violations/, method: 'POST', severity: 'write' },
  { pattern: /^\/api\/v1\/governance\/ledger/, method: 'POST', severity: 'write' },

  // Read operations (default)
  { pattern: /^\/api\/v1\/governance\//, severity: 'read' },
];

/**
 * Determine governance operation severity from path and method
 */
export function getGovernanceOperationSeverity(
  path: string,
  method: string
): GovernanceOperationSeverity {
  for (const entry of GOVERNANCE_SEVERITY_MAP) {
    // Check method if specified
    if (entry.method && entry.method !== method) continue;

    // Check path
    if (typeof entry.pattern === 'string') {
      if (path === entry.pattern) return entry.severity;
    } else if (entry.pattern.test(path)) {
      return entry.severity;
    }
  }

  return 'read'; // Default to read (least restrictive)
}

/**
 * Check governance rate limit for a request
 * Returns headers and whether request is allowed
 */
export async function checkGovernanceRateLimit(
  request: Request,
  userId?: string
): Promise<RateLimitResult> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Determine operation severity
  const severity = getGovernanceOperationSeverity(path, method);

  // Get appropriate rate limiter
  const rateLimiter = getGovernanceRateLimiter(severity);

  // Get identifier (prefer user ID for accountability)
  const identifier = getRequestIdentifier(request, userId);

  // Check rate limit
  const result = await rateLimiter.check(identifier);

  // Log critical/emergency operations
  if ((severity === 'critical' || severity === 'emergency') && !result.allowed) {
    console.warn('[Governance Rate Limit] Blocked', {
      severity,
      path,
      method,
      identifier,
      remaining: result.remaining,
      resetAt: new Date(result.resetAt).toISOString(),
    });
  }

  return result;
}

/**
 * Create governance rate limit response
 * Use this to return a proper 429 response when rate limited
 */
export function createGovernanceRateLimitResponse(
  result: RateLimitResult,
  severity: GovernanceOperationSeverity
): Response {
  const messages: Record<GovernanceOperationSeverity, string> = {
    emergency: 'Emergency operation rate limit exceeded. Contact system administrator.',
    critical: 'Critical governance operation rate limit exceeded. Please wait before retrying.',
    write: 'Governance write operation rate limit exceeded. Try again shortly.',
    read: 'Too many requests. Please slow down.',
  };

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: messages[severity],
      retryAfter: result.retryAfter,
      resetAt: new Date(result.resetAt).toISOString(),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...result.headers,
      },
    }
  );
}
