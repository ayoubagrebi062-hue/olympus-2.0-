/**
 * OLYMPUS 2.0 - Brute Force Protection
 * Redis-based distributed rate limiting for production scalability.
 */

import { Redis } from '@upstash/redis';
import {
  LOCKOUT_CONFIG,
  getProgressiveDelay,
  shouldLockAccount,
  getLockoutEndTime,
  isLockoutExpired,
} from '../constants';

interface AttemptRecord {
  count: number;
  lastAttempt: number;
  lockedAt: number | null;
}

// Initialize Redis client (only if credentials are provided)
let redis: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  } else {
    console.warn('[brute-force] Redis credentials not found, using in-memory fallback');
  }
} catch (error) {
  console.error('[brute-force] Failed to initialize Redis:', error);
}

// Fallback in-memory store for development/testing
const memoryStore = new Map<string, AttemptRecord>();

/**
 * Get attempt key from identifier (email or IP).
 */
function getKey(identifier: string): string {
  return `login:${identifier.toLowerCase()}`;
}

/**
 * Get record from Redis or memory fallback.
 */
async function getRecord(key: string): Promise<AttemptRecord | null> {
  if (redis) {
    try {
      return await redis.get<AttemptRecord>(key);
    } catch (error) {
      console.error('[brute-force] Redis GET error:', error);
      // Fallback to memory
      return memoryStore.get(key) || null;
    }
  }
  return memoryStore.get(key) || null;
}

/**
 * Set record in Redis or memory fallback.
 */
async function setRecord(key: string, record: AttemptRecord, ttlSeconds: number): Promise<void> {
  if (redis) {
    try {
      await redis.set(key, record, { ex: ttlSeconds });
      return;
    } catch (error) {
      console.error('[brute-force] Redis SET error:', error);
      // Fallback to memory
    }
  }
  memoryStore.set(key, record);
}

/**
 * Delete record from Redis or memory fallback.
 */
async function deleteRecord(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch (error) {
      console.error('[brute-force] Redis DEL error:', error);
      // Fallback to memory
    }
  }
  memoryStore.delete(key);
}

/**
 * Record a failed login attempt.
 */
export async function recordFailedAttempt(identifier: string): Promise<{
  isLocked: boolean;
  attemptsRemaining: number;
  lockoutEndsAt: Date | null;
  delayMs: number;
}> {
  const key = getKey(identifier);
  const now = Date.now();

  let record = await getRecord(key);

  if (!record) {
    record = { count: 0, lastAttempt: now, lockedAt: null };
  }

  // Check if lockout has expired
  if (record.lockedAt && isLockoutExpired(new Date(record.lockedAt))) {
    record = { count: 0, lastAttempt: now, lockedAt: null };
  }

  // If already locked, return lockout info
  if (record.lockedAt) {
    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockoutEndsAt: getLockoutEndTime(new Date(record.lockedAt)),
      delayMs: 0,
    };
  }

  // Increment count
  record.count++;
  record.lastAttempt = now;

  // Check if should lock
  if (shouldLockAccount(record.count)) {
    record.lockedAt = now;
    await setRecord(key, record, LOCKOUT_CONFIG.LOCKOUT_DURATION_MS);

    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockoutEndsAt: getLockoutEndTime(new Date(now)),
      delayMs: 0,
    };
  }

  await setRecord(key, record, 3600); // 1 hour TTL

  return {
    isLocked: false,
    attemptsRemaining: LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS - record.count,
    lockoutEndsAt: null,
    delayMs: getProgressiveDelay(record.count),
  };
}

/**
 * Record a successful login (resets attempts).
 */
export async function recordSuccessfulLogin(identifier: string): Promise<void> {
  const key = getKey(identifier);
  await deleteRecord(key);
}

/**
 * Check if identifier is currently locked out.
 */
export async function isLockedOut(identifier: string): Promise<{
  isLocked: boolean;
  lockoutEndsAt: Date | null;
  attemptsRemaining: number;
}> {
  const key = getKey(identifier);
  const record = await getRecord(key);

  if (!record) {
    return {
      isLocked: false,
      lockoutEndsAt: null,
      attemptsRemaining: LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS,
    };
  }

  if (record.lockedAt) {
    if (isLockoutExpired(new Date(record.lockedAt))) {
      await deleteRecord(key);
      return {
        isLocked: false,
        lockoutEndsAt: null,
        attemptsRemaining: LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS,
      };
    }
    return {
      isLocked: true,
      lockoutEndsAt: getLockoutEndTime(new Date(record.lockedAt)),
      attemptsRemaining: 0,
    };
  }

  return {
    isLocked: false,
    lockoutEndsAt: null,
    attemptsRemaining: LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS - record.count,
  };
}

/**
 * Manually unlock an account.
 */
export async function unlockAccount(identifier: string): Promise<void> {
  const key = getKey(identifier);
  await deleteRecord(key);
}

// Cleanup expired records every 10 minutes (only for memory fallback)
if (typeof setInterval !== 'undefined' && !redis) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of Array.from(memoryStore.entries())) {
      const expired = record.lockedAt && isLockoutExpired(new Date(record.lockedAt));
      const stale = now - record.lastAttempt > 3600000;
      if (expired || stale) memoryStore.delete(key);
    }
  }, 600000);
}
