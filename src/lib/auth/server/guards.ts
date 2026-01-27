/**
 * OLYMPUS 2.0 - Server Auth Guards
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '../clients/server';
import { getAuthSession } from './context';
import { createAuthError } from '../errors';
import { REDIRECTS } from '../constants';
import { hasMinimumRole } from '../permissions';
import type { AuthSession, Permission, TenantRole } from '../types';

/** Require authentication. Redirects to login if not authenticated. */
export async function requireAuth(redirectTo?: string): Promise<AuthSession> {
  const authSession = await getAuthSession();

  if (!authSession) {
    const loginUrl = new URL(
      REDIRECTS.UNAUTHENTICATED,
      process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
    );
    if (redirectTo) loginUrl.searchParams.set('redirect', redirectTo);
    redirect(loginUrl.pathname + loginUrl.search);
  }

  return authSession;
}

/** Require authentication and email verification. */
export async function requireVerifiedAuth(redirectTo?: string): Promise<AuthSession> {
  const authSession = await requireAuth(redirectTo);
  if (!authSession.user.emailVerified) redirect('/verify-email');
  return authSession;
}

/** Require authentication and tenant access. */
export async function requireTenantAccess(tenantId?: string): Promise<AuthSession> {
  const authSession = await requireVerifiedAuth();

  if (tenantId && authSession.tenant?.id !== tenantId) {
    const supabase = await createServerSupabaseClient();
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', authSession.user.id)
      .eq('is_active', true)
      .single();

    if (!membership) throw createAuthError('AUTH_302');
  }

  if (!authSession.tenant) redirect('/onboarding/create-organization');
  return authSession;
}

/** Check if current user has a specific permission. */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const authSession = await getAuthSession();
  if (!authSession) return false;
  return (
    authSession.permissions.includes(permission) ||
    authSession.permissions.includes('*' as Permission)
  );
}

/** Check if current user has any of the specified permissions. */
export async function hasAnyPermission(permissions: Permission[]): Promise<boolean> {
  const authSession = await getAuthSession();
  if (!authSession) return false;
  if (authSession.permissions.includes('*' as Permission)) return true;
  return permissions.some(p => authSession.permissions.includes(p));
}

/** Check if current user has all specified permissions. */
export async function hasAllPermissions(permissions: Permission[]): Promise<boolean> {
  const authSession = await getAuthSession();
  if (!authSession) return false;
  if (authSession.permissions.includes('*' as Permission)) return true;
  return permissions.every(p => authSession.permissions.includes(p));
}

/** Require a specific permission. Throws if not permitted. */
export async function requirePermission(permission: Permission): Promise<void> {
  if (!(await hasPermission(permission))) {
    throw createAuthError('AUTH_301', { details: { required: permission } });
  }
}

/** Check if current user has minimum role level. */
export async function hasRole(minRole: TenantRole): Promise<boolean> {
  const authSession = await getAuthSession();
  if (!authSession?.membership) return false;
  return hasMinimumRole(authSession.membership.role, minRole);
}

/** Require minimum role level. Throws if insufficient. */
export async function requireRole(minRole: TenantRole): Promise<void> {
  if (!(await hasRole(minRole))) {
    throw createAuthError('AUTH_301', { details: { requiredRole: minRole } });
  }
}
