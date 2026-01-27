/**
 * OLYMPUS 2.0 - Middleware Composition
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '../errors';
import { createApiContext } from '../context';
import type { RouteParams, ApiContext } from '../types';

type Handler = (req: NextRequest, params: RouteParams) => Promise<NextResponse>;

/**
 * Wrap a handler with error handling.
 */
export function withErrorHandling(handler: Handler): Handler {
  return async (request: NextRequest, params: RouteParams) => {
    const ctx = createApiContext(request);
    try {
      return await handler(request, params);
    } catch (error) {
      return handleApiError(error, ctx.requestId);
    }
  };
}

/**
 * Create a route handler with middleware chain.
 *
 * Usage:
 * ```
 * export const GET = createHandler({
 *   auth: true,
 *   tenant: true,
 *   permission: 'read:project',
 * }, async (req, ctx, params) => {
 *   // Handler implementation
 * });
 * ```
 */
export function createHandler<T>(
  config: {
    auth?: boolean;
    tenant?: boolean;
    permission?: string;
    rateLimit?: { requests: number; window: string };
  },
  handler: (req: NextRequest, ctx: any, params: RouteParams) => Promise<NextResponse<T>>
): Handler {
  return withErrorHandling(async (request: NextRequest, params: RouteParams) => {
    let ctx: any = createApiContext(request);

    // Dynamically import middleware to avoid circular deps
    if (config.auth || config.tenant) {
      const { withAuth } = await import('./auth');
      // withAuth returns a function that takes handler
      const authHandler = withAuth(async (req, authCtx, p) => {
        ctx = authCtx;
        return NextResponse.json({ __continue: true });
      });
      await authHandler(request, params);
    }

    if (config.tenant) {
      const { withTenant } = await import('./tenant');
      const tenantHandler = withTenant(async (req, tenantCtx, p) => {
        ctx = tenantCtx;
        return NextResponse.json({ __continue: true });
      });
      await tenantHandler(request, ctx, params);
    }

    if (config.permission) {
      const { withPermission } = await import('./permission');
      const permHandler = withPermission(config.permission as any, async () => {
        return NextResponse.json({ __continue: true });
      });
      await permHandler(request, ctx, params);
    }

    if (config.rateLimit) {
      const { checkRateLimit } = await import('../rate-limit');
      await checkRateLimit({
        identifier: ctx.tenantId || ctx.userId || ctx.ip,
        limit: config.rateLimit.requests,
        window: config.rateLimit.window as any,
      });
    }

    return handler(request, ctx, params);
  });
}

/**
 * Compose multiple middleware functions.
 *
 * @example
 * const handler = compose(
 *   withErrorHandling,
 *   withAuth,
 *   withTenant
 * )(actualHandler);
 */
export function compose<T>(...middlewares: Array<(h: any) => any>) {
  return (handler: T): T => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler) as T;
  };
}

/**
 * Apply middleware only if condition is true.
 */
export function applyIf<T>(
  condition: boolean,
  middleware: (h: T) => T
): (h: T) => T {
  return condition ? middleware : (h) => h;
}

/**
 * Create a handler for specific HTTP method.
 */
export function methodHandler(handlers: Partial<Record<string, Handler>>): Handler {
  return async (request: NextRequest, params: RouteParams) => {
    const method = request.method.toUpperCase();
    const handler = handlers[method];

    if (!handler) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL_001', message: `Method ${method} not allowed`, requestId: 'unknown' } },
        { status: 405, headers: { Allow: Object.keys(handlers).join(', ') } }
      );
    }

    return handler(request, params);
  };
}
