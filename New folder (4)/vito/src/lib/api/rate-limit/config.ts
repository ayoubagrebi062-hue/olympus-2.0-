/**
 * OLYMPUS 2.0 - Rate Limit Configuration
 */

import type { PlanTier } from '../types';

/** Rate limit window duration */
export type RateLimitWindow = '1m' | '5m' | '15m' | '1h' | '1d';

/** Rate limit config per plan */
export interface PlanRateLimits {
  requests: number;
  window: RateLimitWindow;
}

/** Rate limits by plan tier */
export const PLAN_RATE_LIMITS: Record<PlanTier, PlanRateLimits> = {
  free: { requests: 100, window: '1h' },
  starter: { requests: 1000, window: '1h' },
  pro: { requests: 5000, window: '1h' },
  business: { requests: 20000, window: '1h' },
  enterprise: { requests: 100000, window: '1h' },
};

/** Rate limits by endpoint category */
export const ENDPOINT_RATE_LIMITS: Record<string, PlanRateLimits> = {
  // Auth endpoints - strict limits
  'auth:login': { requests: 5, window: '15m' },
  'auth:signup': { requests: 3, window: '1h' },
  'auth:forgot-password': { requests: 3, window: '1h' },
  'auth:verify': { requests: 10, window: '1h' },

  // Expensive operations
  'builds:create': { requests: 5, window: '1m' },
  'builds:iterate': { requests: 20, window: '1m' },
  'deploys:create': { requests: 3, window: '1m' },
  'deploys:promote': { requests: 5, window: '1m' },

  // Storage operations
  'storage:upload': { requests: 30, window: '1m' },
  'storage:delete': { requests: 50, window: '1m' },

  // Preview/AI operations
  'preview:iterate': { requests: 30, window: '1m' },
  'preview:chat': { requests: 60, window: '1m' },

  // Standard CRUD
  'default': { requests: 60, window: '1m' },
};

/** Convert window string to milliseconds */
export function windowToMs(window: RateLimitWindow): number {
  const units: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  const match = window.match(/^(\d+)([mhd])$/);
  if (!match) return 60 * 1000; // Default 1 minute
  return parseInt(match[1]) * units[match[2]];
}

/** Get rate limit for endpoint */
export function getEndpointLimit(endpoint: string): PlanRateLimits {
  return ENDPOINT_RATE_LIMITS[endpoint] || ENDPOINT_RATE_LIMITS['default'];
}

/** Get rate limit for plan */
export function getPlanLimit(plan: PlanTier): PlanRateLimits {
  return PLAN_RATE_LIMITS[plan] || PLAN_RATE_LIMITS['free'];
}

/** Calculate effective limit (min of plan and endpoint) */
export function getEffectiveLimit(plan: PlanTier, endpoint: string): PlanRateLimits {
  const planLimit = getPlanLimit(plan);
  const endpointLimit = getEndpointLimit(endpoint);

  const planMs = windowToMs(planLimit.window);
  const endpointMs = windowToMs(endpointLimit.window);

  // Normalize to same window for comparison
  const planRatePerMin = (planLimit.requests / planMs) * 60000;
  const endpointRatePerMin = (endpointLimit.requests / endpointMs) * 60000;

  // Return the more restrictive limit
  return planRatePerMin < endpointRatePerMin ? planLimit : endpointLimit;
}
