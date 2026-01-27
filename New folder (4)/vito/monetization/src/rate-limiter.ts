// OLYMPUS COCKPIT SAAS — RATE LIMITER

import type { Tier } from './types'
import { RATE_LIMITS } from './types'

// In-memory store for development (use Redis in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>()

export interface RateLimitResult {
  readonly allowed: boolean
  readonly remaining: number
  readonly resetAt: string
}

/**
 * Check rate limit for a user
 */
export function checkRateLimit(userId: string, tier: Tier): RateLimitResult {
  const limit = RATE_LIMITS[tier]
  const now = Date.now()
  const hourMs = 60 * 60 * 1000

  const key = `${userId}:${tier}`
  const existing = requestCounts.get(key)

  // Reset if hour has passed
  if (!existing || now > existing.resetAt) {
    requestCounts.set(key, {
      count: 1,
      resetAt: now + hourMs,
    })
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(now + hourMs).toISOString(),
    }
  }

  // Check if over limit
  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(existing.resetAt).toISOString(),
    }
  }

  // Increment count
  existing.count++
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: new Date(existing.resetAt).toISOString(),
  }
}

/**
 * Reset rate limit (for testing)
 */
export function resetRateLimit(userId: string, tier: Tier): void {
  const key = `${userId}:${tier}`
  requestCounts.delete(key)
}
