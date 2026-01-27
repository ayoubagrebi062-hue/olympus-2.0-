/**
 * OLYMPUS 2.0 - Rate Limit (re-export for convenience)
 */

export {
  checkRateLimit,
  requireRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  type RateLimitResult,
  type RateLimitParams,
} from './rate-limit/limiter';

export {
  PLAN_RATE_LIMITS,
  ENDPOINT_RATE_LIMITS,
  getEndpointLimit,
  getPlanLimit,
  getEffectiveLimit,
  windowToMs,
  type RateLimitWindow,
} from './rate-limit/config';

import { checkRateLimit as _checkRateLimit } from './rate-limit/limiter';

/**
 * P7-compatible rate limit function.
 * @param identifier - User/tenant/IP identifier
 * @param options - { limit: number, window: number (seconds) }
 * @returns { success: boolean, ... }
 */
export async function rateLimit(
  identifier: string,
  options: { limit: number; window: number }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Convert window from seconds to P8 format
  const windowStr = `${options.window}s` as any;

  const result = await _checkRateLimit({
    identifier,
    limit: options.limit,
    window: windowStr,
  });

  return {
    success: result.allowed,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
