/**
 * OLYMPUS 2.0 - Audit Logging
 *
 * Utilities for logging authentication and security events.
 */

import { createServiceRoleClient } from '../clients';
import type { AuthAuditAction } from '../types';

interface AuditLogParams {
  action: AuthAuditAction;
  userId?: string | null;
  email?: string | null;
  tenantId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: 'success' | 'failure';
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log an authentication event.
 */
export async function logAuthEvent(params: AuditLogParams): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    await supabase.from('audit_logs').insert({
      action: params.action,
      action_description: `Auth: ${params.action}`,
      table_name: 'auth',
      record_id: params.userId,
      actor_id: params.userId,
      actor_type: 'user',
      actor_email: params.email,
      tenant_id: params.tenantId,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      status: params.status || 'success',
      error_message: params.errorMessage,
      metadata: params.metadata || {},
    } as any);
  } catch (error) {
    console.error('[audit] Failed to log event:', error);
  }
}

/**
 * Log a successful login.
 */
export async function logLoginSuccess(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string,
  method: 'password' | 'oauth' | 'magic_link' = 'password'
): Promise<void> {
  await logAuthEvent({
    action:
      method === 'oauth'
        ? 'oauth_login'
        : method === 'magic_link'
          ? 'magic_link_used'
          : 'login_success',
    userId,
    email,
    ipAddress,
    userAgent,
    status: 'success',
    metadata: { method },
  });
}

/**
 * Log a failed login attempt.
 */
export async function logLoginFailure(
  email: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuthEvent({
    action: 'login_failure',
    email,
    ipAddress,
    userAgent,
    status: 'failure',
    errorMessage: reason,
  });
}

/**
 * Log account lockout.
 */
export async function logAccountLocked(email: string, ipAddress?: string): Promise<void> {
  await logAuthEvent({
    action: 'account_locked',
    email,
    ipAddress,
    status: 'success',
    metadata: { reason: 'Too many failed attempts' },
  });
}

/**
 * Log password change.
 */
export async function logPasswordChanged(
  userId: string,
  email: string,
  ipAddress?: string
): Promise<void> {
  await logAuthEvent({
    action: 'password_changed',
    userId,
    email,
    ipAddress,
    status: 'success',
  });
}

/**
 * Log role change.
 */
export async function logRoleChanged(
  userId: string,
  tenantId: string,
  oldRole: string,
  newRole: string,
  changedBy: string
): Promise<void> {
  await logAuthEvent({
    action: 'role_changed',
    userId,
    tenantId,
    status: 'success',
    metadata: { oldRole, newRole, changedBy },
  });
}
