/**
 * OLYMPUS 2.0 - Security Middleware
 *
 * Integrates OLYMPUS 2.1 Security Blueprint into API routes.
 * Provides middleware for:
 * - Rate limiting with tier-based limits
 * - Prompt injection protection
 * - Request validation
 * - Security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validatePrompt,
  TIER_RATE_LIMITS,
  getEndpointLimit,
  getEffectiveLimit,
  createRateLimitResult,
  slidingWindowCheck,
  AUTH_RULES,
  BRUTE_FORCE_CONFIG,
  type RateLimitTier,
  type PromptValidationResult,
} from '@/lib/security';
import { error } from '../responses';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SecurityContext {
  userId?: string;
  tenantId?: string;
  tier?: RateLimitTier;
  ip: string;
}

export interface SecurityOptions {
  checkPromptInjection?: boolean;
  promptField?: string;
  rateLimit?: boolean;
  addSecurityHeaders?: boolean;
  requireAuth?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract IP address from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetAt: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  return response;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER (In-Memory for simplicity - use Redis in production)
// ═══════════════════════════════════════════════════════════════════════════════

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

/**
 * Check rate limit for identifier
 */
function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = `${identifier}:${Math.floor(now / windowMs)}`;

  let entry = rateLimitStore.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { count: 0, windowStart: now };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);
  const resetAt = entry.windowStart + windowMs;

  // Cleanup old entries periodically
  if (rateLimitStore.size > 10000) {
    const cutoff = now - windowMs;
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.windowStart < cutoff) {
        rateLimitStore.delete(k);
      }
    }
  }

  return { allowed, remaining, resetAt };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Security middleware - applies rate limiting and security headers
 */
export function withSecurity(
  options: SecurityOptions = {}
): (
  handler: (req: NextRequest, ctx: SecurityContext) => Promise<NextResponse>
) => (req: NextRequest, ctx: any) => Promise<NextResponse> {
  return handler => async (request: NextRequest, ctx: any) => {
    const ip = getClientIP(request);
    const path = new URL(request.url).pathname;
    const method = request.method;

    // Build security context
    const securityCtx: SecurityContext = {
      userId: ctx?.user?.id,
      tenantId: ctx?.tenant?.id,
      tier: (ctx?.tenant?.tier as RateLimitTier) || 'free',
      ip,
    };

    // Check rate limit
    if (options.rateLimit !== false) {
      const endpointLimit = getEndpointLimit(path, method);
      const effectiveLimit = getEffectiveLimit(endpointLimit, securityCtx.tier || 'free');
      const identifier = securityCtx.userId ? `user:${securityCtx.userId}` : `ip:${ip}`;

      const rateLimitResult = checkRateLimit(
        `${identifier}:${path}`,
        effectiveLimit.requests,
        effectiveLimit.windowMs
      );

      if (!rateLimitResult.allowed) {
        const response = error('RATE_001', 'Too many requests', 429);
        addRateLimitHeaders(
          response as NextResponse,
          effectiveLimit.requests,
          rateLimitResult.remaining,
          rateLimitResult.resetAt
        );
        response.headers.set(
          'Retry-After',
          String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))
        );
        return response as NextResponse;
      }
    }

    // Execute handler
    let response = await handler(request, securityCtx);

    // Add security headers
    if (options.addSecurityHeaders !== false) {
      response = addSecurityHeaders(response);
    }

    return response;
  };
}

/**
 * Prompt injection protection middleware
 */
export function withPromptProtection(
  promptField: string = 'prompt'
): (
  handler: (req: NextRequest, ctx: any, validation: PromptValidationResult) => Promise<NextResponse>
) => (req: NextRequest, ctx: any) => Promise<NextResponse> {
  return handler => async (request: NextRequest, ctx: any) => {
    try {
      const body = await request.clone().json();
      const prompt = body[promptField];

      if (!prompt) {
        return handler(request, ctx, {
          valid: true,
          blocked: false,
          sanitizedInput: '',
          detections: [],
          warnings: [],
        });
      }

      const validation = validatePrompt(prompt);

      if (validation.blocked) {
        console.warn(`[Security] Prompt injection blocked`, {
          ip: getClientIP(request),
          detections: validation.detections,
          warnings: validation.warnings,
        });
        return error('SEC_001', 'Request blocked for security reasons', 403) as NextResponse;
      }

      return handler(request, ctx, validation);
    } catch (e) {
      // If we can't parse the body, pass through
      return handler(request, ctx, {
        valid: true,
        blocked: false,
        sanitizedInput: '',
        detections: [],
        warnings: [],
      });
    }
  };
}

/**
 * Brute force protection middleware (for auth endpoints)
 */
export function withBruteForceProtection(): (
  handler: (req: NextRequest, ctx: any) => Promise<NextResponse>
) => (req: NextRequest, ctx: any) => Promise<NextResponse> {
  return handler => async (request: NextRequest, ctx: any) => {
    const ip = getClientIP(request);
    const key = `bruteforce:${ip}`;

    const result = checkRateLimit(
      key,
      BRUTE_FORCE_CONFIG.maxLoginAttempts,
      15 * 60 * 1000 // 15 minutes
    );

    if (!result.allowed) {
      const lockoutMs = 15 * 60 * 1000; // 15 minutes
      const retryAfter = Math.ceil(lockoutMs / 1000);

      console.warn(`[Security] Brute force protection triggered for IP: ${ip}`);

      const response = error(
        'AUTH_002',
        'Too many login attempts. Please try again later.',
        429
      ) as NextResponse;
      response.headers.set('Retry-After', String(retryAfter));
      return response;
    }

    return handler(request, ctx);
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const SECURITY_MIDDLEWARE = {
  withSecurity,
  withPromptProtection,
  withBruteForceProtection,
  addSecurityHeaders,
  addRateLimitHeaders,
  getClientIP,
};
