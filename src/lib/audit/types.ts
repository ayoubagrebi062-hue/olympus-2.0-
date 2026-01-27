/**
 * OLYMPUS 3.0 - Unified Audit Types
 *
 * Consolidated type definitions for all audit events.
 */

// ============================================================================
// ACTION TYPES (Unified from all audit implementations)
// ============================================================================

export type AuditAction =
  // Authentication events (from auth/security/audit.ts)
  | 'auth.login_success'
  | 'auth.login_failure'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.password_changed'
  | 'auth.password_reset_requested'
  | 'auth.password_reset_completed'
  | 'auth.email_changed'
  | 'auth.account_locked'
  | 'auth.account_unlocked'
  | 'auth.oauth_login'
  | 'auth.magic_link_sent'
  | 'auth.magic_link_used'
  | 'auth.mfa_enabled'
  | 'auth.mfa_disabled'
  | 'auth.role_changed'
  // Session events
  | 'session.create'
  | 'session.revoke'
  | 'session.refresh'
  | 'session.expired'
  // User events
  | 'user.profile_update'
  | 'user.delete'
  | 'user.invite'
  | 'user.invite_accepted'
  // API key events
  | 'api.key_create'
  | 'api.key_revoke'
  | 'api.key_use'
  // Build events
  | 'build.create'
  | 'build.update'
  | 'build.delete'
  | 'build.export'
  | 'build.share'
  | 'build.start'
  | 'build.complete'
  | 'build.fail'
  | 'build.cancel'
  // Subscription/billing events
  | 'subscription.create'
  | 'subscription.upgrade'
  | 'subscription.downgrade'
  | 'subscription.cancel'
  | 'payment.success'
  | 'payment.failed'
  // Admin events
  | 'admin.action'
  | 'admin.config_change'
  // Security events
  | 'security.rate_limit_hit'
  | 'security.suspicious_activity'
  | 'security.blocked_request'
  | 'security.permission_denied'
  // Governance events (from agents/governance)
  | 'governance.identity_verified'
  | 'governance.identity_failed'
  | 'governance.lease_granted'
  | 'governance.lease_revoked'
  | 'governance.kill_switch_activated'
  | 'governance.agent_action';

// ============================================================================
// SEVERITY LEVELS
// ============================================================================

export type AuditSeverity = 'info' | 'warning' | 'critical';

// ============================================================================
// ACTOR TYPES
// ============================================================================

export type AuditActorType = 'user' | 'system' | 'agent' | 'operator' | 'api_key';

// ============================================================================
// EVENT INTERFACES
// ============================================================================

export interface AuditEvent {
  id: string;
  action: AuditAction;
  severity: AuditSeverity;
  timestamp: Date;

  // Actor info
  actorId?: string;
  actorType: AuditActorType;
  actorEmail?: string;

  // Target info
  targetId?: string;
  targetType?: string;

  // Context
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;

  // Result
  status: 'success' | 'failure';
  errorMessage?: string;

  // Additional data
  metadata: Record<string, unknown>;
}

export interface AuditContext {
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  actorType?: AuditActorType;
}

export interface AuditLogParams {
  action: AuditAction;
  actorId?: string;
  actorType?: AuditActorType;
  actorEmail?: string;
  targetId?: string;
  targetType?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// QUERY INTERFACES
// ============================================================================

export interface AuditQueryOptions {
  userId?: string;
  tenantId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditQueryResult {
  logs: AuditEvent[];
  total: number;
  hasMore: boolean;
}

export interface AuditStats {
  total: number;
  byAction: Record<string, number>;
  bySeverity: Record<string, number>;
  recentCritical: AuditEvent[];
}
