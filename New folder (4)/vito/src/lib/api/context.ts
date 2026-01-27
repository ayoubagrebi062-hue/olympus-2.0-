/**
 * OLYMPUS 2.0 - Request Context Utilities
 */

import { NextRequest } from 'next/server';
import type { ApiContext, HttpMethod } from './types';

/**
 * Generate a unique request ID.
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${random}`;
}

/**
 * Extract client IP from request.
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  return '127.0.0.1';
}

/**
 * Get user agent from request.
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Create base API context from request.
 */
export function createApiContext(request: NextRequest): ApiContext {
  const url = new URL(request.url);

  return {
    requestId: generateRequestId(),
    startTime: Date.now(),
    method: request.method as HttpMethod,
    path: url.pathname,
    ip: getClientIp(request),
    userAgent: getUserAgent(request),
  };
}

/**
 * Get request duration in milliseconds.
 */
export function getRequestDuration(context: ApiContext): number {
  return Date.now() - context.startTime;
}

/**
 * Extract path parameter from URL.
 */
export function getPathParam(params: Record<string, string>, key: string): string | undefined {
  return params[key];
}

/**
 * Require path parameter, throw if missing.
 */
export function requirePathParam(params: Record<string, string>, key: string): string {
  const value = params[key];
  if (!value) {
    throw new Error(`Missing required path parameter: ${key}`);
  }
  return value;
}

/**
 * Get query parameter from URL.
 */
export function getQueryParam(request: NextRequest, key: string): string | null {
  const url = new URL(request.url);
  return url.searchParams.get(key);
}

/**
 * Get all query parameters as object.
 */
export function getQueryParams(request: NextRequest): URLSearchParams {
  const url = new URL(request.url);
  return url.searchParams;
}

/**
 * Parse JSON body safely.
 */
export async function parseJsonBody<T>(request: NextRequest): Promise<T | null> {
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Get tenant ID from header or context.
 */
export function getTenantIdFromHeader(request: NextRequest): string | null {
  return request.headers.get('x-tenant-id');
}
