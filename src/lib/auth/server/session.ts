/**
 * OLYMPUS 2.0 - Server Session Utilities
 *
 * Cached session retrieval functions for server-side usage.
 */

import { cache } from 'react';
import { createServerSupabaseClient } from '../clients/server';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

// ============================================
// CACHED SESSION RETRIEVAL
// ============================================

/**
 * Get the current session from Supabase.
 * Cached per request to avoid multiple database calls.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('[auth] Error getting session:', error.message);
    return null;
  }

  return session;
});

/**
 * Get the current user from Supabase.
 * Uses getUser() which validates the JWT against the database.
 * Cached per request.
 */
export const getSupabaseUser = cache(async (): Promise<SupabaseUser | null> => {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('[auth] Error getting user:', error.message);
    return null;
  }

  return user;
});

/**
 * Check if user is authenticated (quick check).
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Extract custom claims from JWT access token.
 */
export function extractClaimsFromJWT(accessToken: string): Record<string, unknown> | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload.olympus || null;
  } catch {
    return null;
  }
}

/**
 * Get custom OLYMPUS claims from session.
 */
export async function getSessionClaims(): Promise<{
  tenantId: string | null;
  tenantRole: string | null;
  tenantSlug: string | null;
  permissions: string[];
  planTier: string | null;
  isPlatformAdmin: boolean;
} | null> {
  const session = await getSession();

  if (!session) return null;

  const claims = extractClaimsFromJWT(session.access_token);

  if (!claims) {
    return {
      tenantId: null,
      tenantRole: null,
      tenantSlug: null,
      permissions: [],
      planTier: null,
      isPlatformAdmin: false,
    };
  }

  return {
    tenantId: (claims.tenant_id as string) || null,
    tenantRole: (claims.tenant_role as string) || null,
    tenantSlug: (claims.tenant_slug as string) || null,
    permissions: (claims.permissions as string[]) || [],
    planTier: (claims.plan_tier as string) || null,
    isPlatformAdmin: (claims.is_platform_admin as boolean) || false,
  };
}

/**
 * Refresh the current session.
 */
export async function refreshSession(): Promise<Session | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.refreshSession();

  if (error) {
    console.error('[auth] Error refreshing session:', error.message);
    return null;
  }

  return session;
}
