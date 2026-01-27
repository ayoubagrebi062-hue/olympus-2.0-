/**
 * OLYMPUS 2.0 - P7 Compatibility Layer
 *
 * Provides backward-compatible context for routes written with P7 patterns.
 * P7 routes expect ctx.user.id and ctx.tenant.id instead of ctx.userId/ctx.tenantId.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { AuthenticationError, AuthorizationError } from '../errors';
import { createApiContext } from '../context';
import type { TenantRole, PlanTier } from '../types';
import { createServiceRoleClient } from '@/lib/auth/clients';

// Extended permission type for P7 compatibility
type Permission =
  | 'read:tenant' | 'write:tenant' | 'delete:tenant'
  | 'manage:members' | 'manage:billing'
  | 'read:project' | 'write:project' | 'delete:project'
  | 'read:build' | 'write:build' | 'create:build' | 'cancel:build'
  | 'create:deploy' | 'manage:domains'
  | 'read:analytics' | 'manage:settings';

/** Route params wrapper */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteParams = { params: Record<string, string> } | any;

/**
 * P7-compatible context with user and tenant objects.
 */
export interface P7Context {
  requestId: string;
  startTime: number;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  user: {
    id: string;
    email: string;
  };
  tenant: {
    id: string;
    role: TenantRole;
    plan: PlanTier;
  };
  // Also include flat properties for flexibility
  userId: string;
  tenantId: string;
  tenantRole: TenantRole;
  tenantPlan: PlanTier;
}

/** Handler with params support */
type P7Handler = (req: NextRequest, ctx: P7Context, params?: RouteParams) => Promise<NextResponse>;
type BaseHandler = (req: NextRequest, params?: RouteParams) => Promise<NextResponse>;

/**
 * Compose middleware for P7-style routes.
 * Usage:
 * ```
 * compose(withAuth, withTenant, withPermission('read:build'))(handler)(request, {});
 * ```
 */
export function composeP7(...middlewares: Array<(h: any) => any>) {
  return (handler: P7Handler): BaseHandler => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler as any);
  };
}

/**
 * P7-compatible withAuth - creates user object in context.
 */
export function withAuthP7(handler: P7Handler): BaseHandler {
  return async (request: NextRequest, params?: RouteParams) => {
    const apiContext = createApiContext(request);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      throw new AuthenticationError('AUTH_001', { message: 'Authentication required' });
    }

    const ctx: Partial<P7Context> = {
      ...apiContext,
      user: {
        id: session.user.id,
        email: session.user.email || '',
      },
      userId: session.user.id,
    };

    return handler(request, ctx as P7Context, params);
  };
}

/**
 * P7-compatible withTenant - adds tenant object to context.
 */
export function withTenantP7(handler: P7Handler): P7Handler {
  return async (request: NextRequest, ctx: P7Context, params?: RouteParams) => {
    // Get tenant ID from header, query, or path params
    let tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      const url = new URL(request.url);
      tenantId = url.searchParams.get('tenantId');
    }

    if (!tenantId && params?.params?.tenantId) {
      tenantId = params.params.tenantId;
    }

    if (!tenantId) {
      throw new AuthorizationError('AUTHZ_001', { message: 'Tenant context required' });
    }

    // Get tenant membership using service role client
    const supabase = createServiceRoleClient();

    const { data: rawMembership } = await supabase
      .from('tenant_members')
      .select('role, tenants(id, plan)')
      .eq('tenant_id', tenantId)
      .eq('user_id', ctx.user.id)
      .single();
    const membership = rawMembership as any;

    if (!membership) {
      throw new AuthorizationError('AUTHZ_002', { message: 'Not a member of this tenant' });
    }

    const tenantData = membership.tenants as any;
    const role = (membership as any).role as TenantRole;
    const plan = (tenantData?.plan || 'free') as PlanTier;

    const enrichedCtx: P7Context = {
      ...ctx,
      tenant: {
        id: tenantId,
        role,
        plan,
      },
      tenantId,
      tenantRole: role,
      tenantPlan: plan,
    };

    return handler(request, enrichedCtx, params);
  };
}

/**
 * P7-compatible withPermission - curried permission check.
 */
export function withPermissionP7(permission: Permission): (handler: P7Handler) => P7Handler {
  const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
    owner: [
      'read:tenant', 'write:tenant', 'delete:tenant',
      'manage:members', 'manage:billing',
      'read:project', 'write:project', 'delete:project',
      'read:build', 'write:build', 'create:build', 'cancel:build',
      'create:deploy', 'manage:domains',
      'read:analytics', 'manage:settings',
    ],
    admin: [
      'read:tenant', 'write:tenant',
      'manage:members',
      'read:project', 'write:project', 'delete:project',
      'read:build', 'write:build', 'create:build', 'cancel:build',
      'create:deploy', 'manage:domains',
      'read:analytics', 'manage:settings',
    ],
    member: [
      'read:tenant',
      'read:project', 'write:project',
      'read:build', 'write:build', 'create:build', 'cancel:build',
      'create:deploy',
      'read:analytics',
    ],
    viewer: [
      'read:tenant',
      'read:project',
      'read:build',
      'read:analytics',
    ],
  };

  return (handler: P7Handler): P7Handler => {
    return async (request: NextRequest, ctx: P7Context, params?: RouteParams) => {
      const permissions = ROLE_PERMISSIONS[ctx.tenant.role] || [];
      if (!permissions.includes(permission)) {
        throw new AuthorizationError('AUTHZ_003', {
          message: `Permission denied: ${permission}`,
          details: { required: permission, role: ctx.tenant.role },
        });
      }
      return handler(request, ctx, params);
    };
  };
}

// Re-export as P7-compatible names
export { withAuthP7 as withAuth };
export { withTenantP7 as withTenant };
export { withPermissionP7 as withPermission };
export { composeP7 as compose };
