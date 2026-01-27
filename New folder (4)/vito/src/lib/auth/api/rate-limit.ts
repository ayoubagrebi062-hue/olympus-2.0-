/**
 * OLYMPUS 2.0 - Rate Limiting
 *
 * In-memory rate limiting for API routes.
 * For production, use Redis-based implementation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthError, getErrorResponse } from '../errors';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

/**
 * Get rate limit key from request.
 */
function getRateLimitKey(request: NextRequest, prefix: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const userId = request.headers.get('x-user-id') || '';

  return `${prefix}:${userId || ip}`;
}

/**
 * Check and update rate limit.
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = getRateLimitKey(request, config.keyPrefix || 'api');
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs };
    rateLimitStore.set(key, entry);
  }

  entry.count++;

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const allowed = entry.count <= config.maxRequests;

  return { allowed, remaining, resetAt: entry.resetAt };
}

/**
 * Create rate limit response headers.
 */
export function rateLimitHeaders(
  remaining: number,
  resetAt: number,
  limit: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
  };
}

/**
 * Rate limit middleware wrapper.
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: NextRequest, context: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: any) => {
    const { allowed, remaining, resetAt } = checkRateLimit(request, config);

    if (!allowed) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      const { status, body } = getErrorResponse(
        createAuthError('AUTH_400', { retryAfter })
      );

      return NextResponse.json(body, {
        status,
        headers: {
          ...rateLimitHeaders(remaining, resetAt, config.maxRequests),
          'Retry-After': retryAfter.toString(),
        },
      });
    }

    const response = await handler(request, context);

    // Add rate limit headers to response
    Object.entries(rateLimitHeaders(remaining, resetAt, config.maxRequests))
      .forEach(([key, value]) => response.headers.set(key, value));

    return response;
  };
}

// Cleanup old entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of Array.from(rateLimitStore.entries())) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
