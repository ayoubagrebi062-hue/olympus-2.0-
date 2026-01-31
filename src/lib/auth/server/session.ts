/**
 * OLYMPUS 2.0 - Server Session Utilities
 *
 * Cached session retrieval functions for server-side usage.
 *
 * SECURITY FIX (Jan 31, 2026): Added JWT signature verification
 * to prevent privilege escalation via forged JWT claims.
 */

import { cache } from 'react';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { createServerSupabaseClient } from '../clients/server';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

// ============================================
// JWT VERIFICATION (SECURITY FIX)
// ============================================

/**
 * JWKS endpoint for Supabase JWT verification.
 * Cached to avoid repeated fetches.
 */
const getJWKS = cache(() => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for JWT verification');
  }
  return createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
});

/**
 * Verified OLYMPUS claims from JWT payload.
 */
export interface VerifiedOlympusClaims {
  tenant_id?: string;
  tenant_role?: string;
  tenant_slug?: string;
  permissions?: string[];
  plan_tier?: string;
  is_platform_admin?: boolean;
}

/**
 * Extended JWT payload with OLYMPUS claims.
 */
interface OlympusJWTPayload extends JWTPayload {
  olympus?: VerifiedOlympusClaims;
}

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
 *
 * @deprecated Use extractVerifiedClaims() for security-sensitive operations.
 * This function does NOT verify the JWT signature and should only be used
 * for non-sensitive display purposes.
 */
export function extractClaimsFromJWT(accessToken: string): Record<string, unknown> | null {
  logger.warn(
    '[SECURITY] extractClaimsFromJWT() called without signature verification. ' +
      'Use extractVerifiedClaims() for security-sensitive operations.'
  );
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
 * SECURITY FIX: Extract and VERIFY custom claims from JWT access token.
 *
 * This function verifies the JWT signature against Supabase's JWKS endpoint
 * before extracting claims, preventing privilege escalation via forged JWTs.
 *
 * @param accessToken - The JWT access token to verify
 * @returns Verified OLYMPUS claims or null if verification fails
 */
export async function extractVerifiedClaims(
  accessToken: string
): Promise<VerifiedOlympusClaims | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      logger.error('[auth] NEXT_PUBLIC_SUPABASE_URL not set, cannot verify JWT');
      return null;
    }

    const JWKS = getJWKS();

    const { payload } = await jwtVerify(accessToken, JWKS, {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated',
    });

    const olympusPayload = payload as OlympusJWTPayload;
    return olympusPayload.olympus || null;
  } catch (error) {
    logger.error('[auth] JWT verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Get custom OLYMPUS claims from session.
 *
 * SECURITY FIX: Now uses extractVerifiedClaims() to verify JWT signature
 * before extracting claims, preventing privilege escalation attacks.
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

  // SECURITY FIX: Use verified claims extraction
  const claims = await extractVerifiedClaims(session.access_token);

  if (!claims) {
    // No claims or verification failed - return safe defaults
    logger.warn('[auth] No verified claims available, using safe defaults');
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
    tenantId: claims.tenant_id || null,
    tenantRole: claims.tenant_role || null,
    tenantSlug: claims.tenant_slug || null,
    permissions: claims.permissions || [],
    planTier: claims.plan_tier || null,
    isPlatformAdmin: claims.is_platform_admin || false,
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
