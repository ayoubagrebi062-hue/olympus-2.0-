/**
 * OLYMPUS 2.0 - API Auth Wrapper
 *
 * Higher-order function to protect API routes with authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthError, getErrorResponse } from '../errors';
import type { AuthSession } from '../types';
import { getAuthSession } from '../server/context';

export interface AuthContext {
  params: Record<string, string>;
  auth: AuthSession;
  // Convenience shortcuts
  userId: string;
  tenantId: string | null;
  tenantSlug: string | null;
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse> | NextResponse;

export type HandlerContext = {
  params: Record<string, string>;
};

/**
 * Wrap an API route handler with authentication.
 * Automatically returns 401 if not authenticated.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: HandlerContext) => {
    try {
      const auth = await getAuthSession();

      if (!auth) {
        const { status, body } = getErrorResponse(createAuthError('AUTH_300'));
        return NextResponse.json(body, { status });
      }

      const authContext: AuthContext = {
        ...context,
        auth,
        userId: auth.user.id,
        tenantId: auth.tenant?.id || null,
        tenantSlug: auth.tenant?.slug || null,
      };

      return await handler(request, authContext);
    } catch (error) {
      const { status, body } = getErrorResponse(error);
      return NextResponse.json(body, { status });
    }
  };
}

/**
 * Wrap an API route handler with authentication and email verification.
 */
export function withVerifiedAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: HandlerContext) => {
    try {
      const auth = await getAuthSession();

      if (!auth) {
        const { status, body } = getErrorResponse(createAuthError('AUTH_300'));
        return NextResponse.json(body, { status });
      }

      if (!auth.user.emailVerified) {
        const { status, body } = getErrorResponse(createAuthError('AUTH_102'));
        return NextResponse.json(body, { status });
      }

      const authContext: AuthContext = {
        ...context,
        auth,
        userId: auth.user.id,
        tenantId: auth.tenant?.id || null,
        tenantSlug: auth.tenant?.slug || null,
      };

      return await handler(request, authContext);
    } catch (error) {
      const { status, body } = getErrorResponse(error);
      return NextResponse.json(body, { status });
    }
  };
}
