/**
 * OLYMPUS 2.0 - Tenant Middleware
 *
 * Supports both P7 (ctx with params) and P8 native patterns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/clients';
import { AuthorizationError, NotFoundError } from '../errors';
import type { TenantRole, PlanTier, RouteParams } from '../types';
import type { P7AuthContext } from './auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyParams = RouteParams | any;

/**
 * P7-compatible tenant context with flexible structure.
 */
export interface P7TenantContext extends P7AuthContext {
  tenant: {
    id: string;
    role: TenantRole;
    plan: PlanTier;
  };
  tenantId: string;
  tenantRole: TenantRole;
  tenantPlan: PlanTier;
}

// Handler types supporting both P7 and P8 patterns
type P7TenantHandler = (req: NextRequest, ctx: P7TenantContext, params?: AnyParams) => Promise<NextResponse>;
type P7AuthHandler = (req: NextRequest, ctx: P7AuthContext, params?: AnyParams) => Promise<NextResponse>;

/**
 * Tenant middleware supporting P7 pattern: withTenant(handler)
 * Handler receives (request, ctx, params) where ctx has ctx.tenant.id
 */
export function withTenant(handler: P7TenantHandler): P7AuthHandler {
  return async (request: NextRequest, ctx: P7AuthContext, params?: AnyParams) => {
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
      throw new AuthorizationError('TENANT_002', { message: 'Tenant context required' });
    }

    // Verify membership and get role
    let membership = await getTenantMembership(ctx.userId, tenantId);

    // If no membership, try to auto-create if user owns this tenant
    if (!membership) {
      const supabase = createServiceRoleClient();

      // Check if user owns this tenant
      const { data: tenant } = await supabase
        .from('tenants')
        .select('owner_id')
        .eq('id', tenantId)
        .single();

      if (tenant && (tenant as any).owner_id === ctx.userId) {
        // Auto-create membership for owner
        await supabase.from('tenant_members').insert({
          tenant_id: tenantId,
          user_id: ctx.userId,
          role: 'owner',
        } as any);
        membership = { role: 'owner' };
        console.log(`[Tenant] Auto-created membership for owner ${ctx.userId} in tenant ${tenantId}`);
      }
    }

    if (!membership) {
      throw new AuthorizationError('TENANT_002', { message: 'Not a member of this tenant' });
    }

    // Get tenant plan
    const plan = await getTenantPlan(tenantId);

    const tenantContext: P7TenantContext = {
      ...ctx,
      tenant: {
        id: tenantId,
        role: membership.role as TenantRole,
        plan,
      },
      tenantId,
      tenantRole: membership.role as TenantRole,
      tenantPlan: plan,
    };

    return handler(request, tenantContext, params);
  };
}

/**
 * Extract tenant ID from request.
 */
function getTenantIdFromRequest(request: NextRequest, params?: AnyParams): string | null {
  // 1. Check header
  const headerTenantId = request.headers.get('x-tenant-id');
  if (headerTenantId) return headerTenantId;

  // 2. Check path params
  if (params?.params?.tenantId) return params.params.tenantId;

  // 3. Check query params
  const url = new URL(request.url);
  const queryTenantId = url.searchParams.get('tenantId');
  if (queryTenantId) return queryTenantId;

  return null;
}

/**
 * Get user's membership in tenant.
 */
async function getTenantMembership(userId: string, tenantId: string): Promise<{ role: string } | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Get tenant's plan tier.
 */
async function getTenantPlan(tenantId: string): Promise<PlanTier> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from('subscriptions')
    .select('plans(tier)')
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'trialing'])
    .single();

  if (!(data as any)?.plans) return 'free';
  return ((data as any).plans as any).tier as PlanTier;
}

/**
 * Get tenant by ID with validation.
 */
export async function getTenant(tenantId: string) {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Tenant');
  }

  return data;
}

/**
 * Check if user is tenant owner.
 */
export async function isTenantOwner(userId: string, tenantId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from('tenants')
    .select('owner_id')
    .eq('id', tenantId)
    .single();

  return (data as any)?.owner_id === userId;
}
