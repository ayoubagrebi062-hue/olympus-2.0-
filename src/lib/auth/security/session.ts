/**
 * OLYMPUS 2.0 - Session Management
 *
 * Utilities for managing user sessions.
 */

import { createServiceRoleClient } from '../clients';
import { SESSION_CONFIG } from '../constants';

/**
 * Get all active sessions for a user.
 */
export async function getUserSessions(userId: string): Promise<
  {
    id: string;
    createdAt: string;
    lastActiveAt: string;
    userAgent: string | null;
    ipAddress: string | null;
  }[]
> {
  // Note: Supabase doesn't expose sessions directly via standard API
  // This would require implementing a custom sessions table
  // For now, we can only revoke sessions, not list them
  console.warn('[sessions] getUserSessions requires custom sessions table');
  return [];
}

/**
 * Revoke a specific session.
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();

    // Use Supabase Admin API to sign out specific session
    const { error } = await supabase.auth.admin.signOut(sessionId, 'others');

    if (error) {
      console.error('[sessions] Failed to revoke session:', error);
      return false;
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      action: 'session_revoked',
      action_description: `Session ${sessionId} revoked`,
      actor_type: 'system',
      status: 'success',
      metadata: { sessionId },
    } as any);

    return true;
  } catch (error) {
    console.error('[sessions] Error revoking session:', error);
    return false;
  }
}

/**
 * Revoke all sessions for a user except current.
 */
export async function revokeOtherSessions(
  userId: string,
  currentSessionId?: string
): Promise<number> {
  try {
    const supabase = createServiceRoleClient();

    // Supabase Admin API: sign out all sessions except current
    const scope = currentSessionId ? 'others' : 'global';
    const { error } = await supabase.auth.admin.signOut(userId, scope);

    if (error) {
      console.error('[sessions] Failed to revoke other sessions:', error);
      return 0;
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      action: 'sessions_revoked',
      action_description: 'All other sessions revoked',
      actor_id: userId,
      actor_type: 'user',
      status: 'success',
      metadata: { scope, currentSessionId },
    } as any);

    // We can't know exact count without custom sessions table
    return 1; // At least one session was revoked
  } catch (error) {
    console.error('[sessions] Error revoking other sessions:', error);
    return 0;
  }
}

/**
 * Revoke all sessions for a user.
 */
export async function revokeAllSessions(userId: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();

    // Use Supabase Admin API to sign out all sessions globally
    const { error } = await supabase.auth.admin.signOut(userId, 'global');

    if (error) {
      console.error('[sessions] Failed to revoke all sessions:', error);
      return false;
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      action: 'all_sessions_revoked',
      action_description: 'All sessions revoked globally',
      actor_id: userId,
      actor_type: 'user',
      status: 'success',
      metadata: { revokedAll: true },
    } as any);

    return true;
  } catch (error) {
    console.error('[sessions] Failed to revoke sessions:', error);
    return false;
  }
}

/**
 * Check if session is still valid.
 */
export function isSessionValid(expiresAt: number): boolean {
  return Date.now() < expiresAt * 1000;
}

/**
 * Check if session needs refresh.
 */
export function shouldRefreshSession(expiresAt: number): boolean {
  const refreshThreshold = 5 * 60 * 1000; // 5 minutes
  return expiresAt * 1000 - Date.now() < refreshThreshold;
}

/**
 * Get session expiry time.
 */
export function getSessionExpiry(rememberMe: boolean = false): number {
  const lifetime = rememberMe
    ? SESSION_CONFIG.EXTENDED_SESSION_LIFETIME
    : SESSION_CONFIG.ACCESS_TOKEN_LIFETIME;

  return Math.floor(Date.now() / 1000) + lifetime;
}

/**
 * Format session info for display.
 */
export function formatSessionInfo(userAgent: string | null): {
  browser: string;
  os: string;
  device: string;
} {
  if (!userAgent) {
    return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
  }

  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) {
    os = 'Android';
    device = 'Mobile';
  } else if (userAgent.includes('iPhone')) {
    os = 'iOS';
    device = 'Mobile';
  }

  return { browser, os, device };
}
