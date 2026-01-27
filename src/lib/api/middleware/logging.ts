/**
 * OLYMPUS 2.0 - Logging Middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiContext, TenantContext, RequestLog, RouteParams } from '../types';
import { getRequestDuration } from '../context';
import { isApiError } from '../errors';

type Handler<T, C> = (req: NextRequest, ctx: C, params: RouteParams) => Promise<NextResponse<T>>;

/**
 * Middleware that logs all requests.
 */
export function withLogging<T, C extends ApiContext>(handler: Handler<T, C>): Handler<T, C> {
  return async (request: NextRequest, ctx: C, params: RouteParams) => {
    const startTime = Date.now();
    let response: NextResponse<T>;
    let errorInfo: { code: string; message: string } | undefined;

    try {
      response = await handler(request, ctx, params);
    } catch (error) {
      // Log error and re-throw
      if (isApiError(error)) {
        errorInfo = { code: error.code, message: error.message };
      } else if (error instanceof Error) {
        errorInfo = { code: 'INT_001', message: error.message };
      }
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      const log = buildRequestLog(request, ctx, response!?.status || 500, duration, errorInfo);
      logRequest(log);
    }

    return response;
  };
}

/**
 * Build request log entry.
 */
function buildRequestLog(
  request: NextRequest,
  ctx: ApiContext,
  status: number,
  duration: number,
  error?: { code: string; message: string }
): RequestLog {
  return {
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
    method: ctx.method,
    path: ctx.path,
    status,
    duration,
    userId: (ctx as TenantContext).userId,
    tenantId: (ctx as TenantContext).tenantId,
    userAgent: ctx.userAgent,
    ip: ctx.ip,
    error,
  };
}

/**
 * Log request to console (structured JSON in production).
 */
function logRequest(log: RequestLog): void {
  const level = log.status >= 500 ? 'error' : log.status >= 400 ? 'warn' : 'info';
  const emoji = log.status >= 500 ? '❌' : log.status >= 400 ? '⚠️' : '✓';

  if (process.env.NODE_ENV === 'production') {
    // Structured JSON for log aggregation
    console.log(JSON.stringify({ level, ...log }));
  } else {
    // Human-readable for development
    const parts = [emoji, log.method.padEnd(6), log.path, `${log.status}`, `${log.duration}ms`];
    if (log.userId) parts.push(`user:${log.userId.slice(0, 8)}`);
    if (log.tenantId) parts.push(`tenant:${log.tenantId.slice(0, 8)}`);
    if (log.error) parts.push(`[${log.error.code}]`);

    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](parts.join(' '));
  }
}

/**
 * Log slow requests (over threshold).
 */
export function logSlowRequest(log: RequestLog, thresholdMs: number = 1000): void {
  if (log.duration > thresholdMs) {
    console.warn(
      `[slow] ${log.method} ${log.path} took ${log.duration}ms (threshold: ${thresholdMs}ms)`
    );
  }
}

/**
 * Create a child logger with context.
 */
export function createLogger(ctx: ApiContext) {
  const prefix = `[${ctx.requestId}]`;
  return {
    debug: (msg: string, data?: unknown) => console.debug(prefix, msg, data || ''),
    info: (msg: string, data?: unknown) => console.info(prefix, msg, data || ''),
    warn: (msg: string, data?: unknown) => console.warn(prefix, msg, data || ''),
    error: (msg: string, data?: unknown) => console.error(prefix, msg, data || ''),
  };
}
