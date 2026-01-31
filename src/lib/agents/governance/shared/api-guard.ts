/**
 * Sentinel API Guard — Authentication + Rate Limiting
 *
 * Usage in any sentinel route:
 *   import { withGuard } from '@/lib/agents/governance/shared/api-guard';
 *   export const POST = withGuard(async (request) => { ... });
 *
 * Authentication:
 *   - If SENTINEL_API_KEY env var is set, requires Bearer token match.
 *   - If not set, allows all requests (localhost-only development mode).
 *
 * Rate Limiting:
 *   - Token bucket: 30 requests per minute per IP.
 *   - Returns 429 when exhausted.
 *
 * @module governance/api-guard
 * @version 1.0.0
 */

import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// ============================================================================
// RATE LIMITER
// ============================================================================

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const RATE_LIMIT = 30; // requests per window
const WINDOW_MS = 60_000; // 1 minute
const MAX_BUCKETS = 500; // prevent memory leak

const buckets = new Map<string, Bucket>();

function getRateLimitResult(ip: string): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket) {
    // Evict oldest if at capacity
    if (buckets.size >= MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey !== undefined) buckets.delete(oldestKey);
    }
    bucket = { tokens: RATE_LIMIT, lastRefill: now };
    buckets.set(ip, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= WINDOW_MS) {
    bucket.tokens = RATE_LIMIT;
    bucket.lastRefill = now;
  }

  const resetMs = WINDOW_MS - (now - bucket.lastRefill);

  if (bucket.tokens <= 0) {
    return { allowed: false, remaining: 0, resetMs };
  }

  bucket.tokens -= 1;
  return { allowed: true, remaining: bucket.tokens, resetMs };
}

// ============================================================================
// AUTH CHECK
// ============================================================================

function checkAuth(request: Request): boolean {
  const apiKey = process.env.SENTINEL_API_KEY;
  if (!apiKey) {
    // In production, deny access if no API key is configured
    if (process.env.NODE_ENV === 'production') {
      logger.error('[api-guard] SENTINEL_API_KEY not configured in production — denying access');
      return false;
    }
    return true; // No key configured = open access (dev mode only)
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const [scheme, token] = authHeader.split(' ', 2);
  if (scheme?.toLowerCase() !== 'bearer') return false;
  if (!token) return false;

  // Constant-time comparison to prevent timing attacks
  if (token.length !== apiKey.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ apiKey.charCodeAt(i);
  }
  return mismatch === 0;
}

// ============================================================================
// GUARD WRAPPER
// ============================================================================

type RouteHandler = (request: Request) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a Next.js route handler with auth + rate limiting.
 *
 * @example
 * export const GET = withGuard(async (request) => {
 *   return NextResponse.json({ ok: true });
 * });
 */
export function withGuard(handler: RouteHandler): RouteHandler {
  return async (request: Request) => {
    // 1. Auth check
    if (!checkAuth(request)) {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'Unauthorized' },
        {
          status: 401,
          headers: { 'WWW-Authenticate': 'Bearer realm="sentinel"' },
        }
      );
    }

    // 2. Rate limit check
    const ip =
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';

    const rateResult = getRateLimitResult(ip);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateResult.resetMs / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMIT),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateResult.resetMs / 1000)),
          },
        }
      );
    }

    // 3. Execute handler with rate limit headers
    const response = await handler(request);

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT));
    response.headers.set('X-RateLimit-Remaining', String(rateResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateResult.resetMs / 1000)));

    return response;
  };
}
