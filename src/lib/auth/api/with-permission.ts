/**
 * OLYMPUS 2.0 - API Permission Wrapper
 *
 * Higher-order functions to protect API routes with permission checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthError, getErrorResponse } from '../errors';
import { hasMinimumRole } from '../permissions';
import type { AuthSession, Permission, TenantRole } from '../types';
import { getAuthSession } from '../server/context';

export type AuthenticatedHandler = (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthSession }
) => Promise<NextResponse> | NextResponse;

type HandlerContext = { params: Record<string, string> };

/**
 * Wrap an API route handler with permission check.
 */
export function withPermission(permission: Permission, handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: HandlerContext) => {
    try {
      const auth = await getAuthSession();

      if (!auth) {
        const { status, body } = getErrorResponse(createAuthError('AUTH_300'));
        return NextResponse.json(body, { status });
      }

      const hasPermission = auth.permissions.includes(permission);

      if (!hasPermission) {
        const { status, body } = getErrorResponse(
          createAuthError('AUTH_301', { details: { required: permission } })
        );
        return NextResponse.json(body, { status });
      }

      return await handler(request, { ...context, auth });
    } catch (error) {
      const { status, body } = getErrorResponse(error);
      return NextResponse.json(body, { status });
    }
  };
}

/**
 * Wrap an API route handler with any-permission check.
 */
export function withAnyPermission(permissions: Permission[], handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: HandlerContext) => {
    try {
      const auth = await getAuthSession();

      if (!auth) {
        const { status, body } = getErrorResponse(createAuthError('AUTH_300'));
        return NextResponse.json(body, { status });
      }

      const hasAny = permissions.some(p => auth.permissions.includes(p));

      if (!hasAny) {
        const { status, body } = getErrorResponse(
          createAuthError('AUTH_301', { details: { requiredAny: permissions } })
        );
        return NextResponse.json(body, { status });
      }

      return await handler(request, { ...context, auth });
    } catch (error) {
      const { status, body } = getErrorResponse(error);
      return NextResponse.json(body, { status });
    }
  };
}

/**
 * Wrap an API route handler with role check.
 */
export function withRole(minRole: TenantRole, handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: HandlerContext) => {
    try {
      const auth = await getAuthSession();

      if (!auth) {
        const { status, body } = getErrorResponse(createAuthError('AUTH_300'));
        return NextResponse.json(body, { status });
      }

      if (!auth.membership || !hasMinimumRole(auth.membership.role, minRole)) {
        const { status, body } = getErrorResponse(
          createAuthError('AUTH_301', { details: { requiredRole: minRole } })
        );
        return NextResponse.json(body, { status });
      }

      return await handler(request, { ...context, auth });
    } catch (error) {
      const { status, body } = getErrorResponse(error);
      return NextResponse.json(body, { status });
    }
  };
}
