/**
 * OLYMPUS 2.0 - API Tenant Access Wrapper
 *
 * Higher-order function to protect API routes with tenant access checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../clients/server';
import { createAuthError, getErrorResponse } from '../errors';
import type { AuthSession } from '../types';
import { getAuthSession } from '../server/context';

export type TenantHandler = (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthSession; tenantId: string }
) => Promise<NextResponse> | NextResponse;

type HandlerContext = { params: Record<string, string> };

/**
 * Wrap an API route handler with tenant access verification.
 * Extracts tenantId from params or query string.
 */
export function withTenantAccess(handler: TenantHandler) {
  return async (request: NextRequest, context: HandlerContext) => {
    try {
      const auth = await getAuthSession();

      if (!auth) {
        const { status, body } = getErrorResponse(createAuthError('AUTH_300'));
        return NextResponse.json(body, { status });
      }

      // Get tenant ID from params, query, or current session
      const tenantId =
        context.params?.tenantId || request.nextUrl.searchParams.get('tenantId') || auth.tenant?.id;

      if (!tenantId) {
        const { status, body } = getErrorResponse(createAuthError('AUTH_302'));
        return NextResponse.json(body, { status });
      }

      // Verify access if different from current tenant
      if (tenantId !== auth.tenant?.id) {
        const supabase = await createServerSupabaseClient();
        const { data: membership } = await supabase
          .from('tenant_members')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('user_id', auth.user.id)
          .eq('is_active', true)
          .single();

        if (!membership) {
          const { status, body } = getErrorResponse(createAuthError('AUTH_302'));
          return NextResponse.json(body, { status });
        }
      }

      return await handler(request, { ...context, auth, tenantId });
    } catch (error) {
      const { status, body } = getErrorResponse(error);
      return NextResponse.json(body, { status });
    }
  };
}

/**
 * Wrap an API route handler requiring current tenant context.
 */
export function withCurrentTenant(handler: TenantHandler) {
  return async (request: NextRequest, context: HandlerContext) => {
    try {
      const auth = await getAuthSession();

      if (!auth) {
        const { status, body } = getErrorResponse(createAuthError('AUTH_300'));
        return NextResponse.json(body, { status });
      }

      if (!auth.tenant) {
        const { status, body } = getErrorResponse(createAuthError('AUTH_302'));
        return NextResponse.json(body, { status });
      }

      return await handler(request, { ...context, auth, tenantId: auth.tenant.id });
    } catch (error) {
      const { status, body } = getErrorResponse(error);
      return NextResponse.json(body, { status });
    }
  };
}
