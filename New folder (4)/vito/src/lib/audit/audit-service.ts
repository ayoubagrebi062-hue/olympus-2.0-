/**
 * OLYMPUS 3.0 - Unified Audit Service
 *
 * Consolidated audit logging with:
 * - Database persistence (Supabase audit_logs table)
 * - In-memory buffer for performance
 * - Thread-safe operations
 * - Scoped loggers for different contexts
 *
 * @version 3.0.0
 */

import { createClient } from '@supabase/supabase-js';
import type {
  AuditAction,
  AuditSeverity,
  AuditEvent,
  AuditContext,
  AuditLogParams,
  AuditQueryOptions,
  AuditQueryResult,
  AuditStats,
  AuditActorType,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_BUFFER_SIZE = 1000;
const FLUSH_INTERVAL = 30000; // 30 seconds
const OVERFLOW_FLUSH_THRESHOLD = 800;

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[Audit] Supabase not configured - audit logs will be memory-only');
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

// ============================================================================
// AUDIT SERVICE CLASS
// ============================================================================

class AuditService {
  private buffer: AuditEvent[] = [];
  private bufferLock = false;
  private flushIntervalId: ReturnType<typeof setInterval> | null = null;
  private overflowCount = 0;

  constructor() {
    // Start periodic flush
    if (typeof setInterval !== 'undefined') {
      this.flushIntervalId = setInterval(() => {
        this.flush();
      }, FLUSH_INTERVAL);
    }
  }

  /**
   * Log an audit event
   */
  log(params: AuditLogParams): string {
    const severity = this.getActionSeverity(params.action);

    const event: AuditEvent = {
      id: this.generateId(),
      action: params.action,
      severity,
      timestamp: new Date(),
      actorId: params.actorId,
      actorType: params.actorType || 'user',
      actorEmail: params.actorEmail,
      targetId: params.targetId,
      targetType: params.targetType,
      tenantId: params.tenantId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      status: params.status || 'success',
      errorMessage: params.errorMessage,
      metadata: params.metadata || {},
    };

    // Add to buffer (thread-safe)
    this.addToBuffer(event);

    // Persist to database asynchronously
    this.persistEvent(event);

    // Log critical events immediately
    if (severity === 'critical') {
      console.error('[AUDIT-CRITICAL]', JSON.stringify(event));
      this.flush();
    } else if (process.env.NODE_ENV === 'development') {
      console.log('[audit]', params.action, params.metadata);
    }

    return event.id;
  }

  /**
   * Log authentication event
   */
  logAuth(
    action: AuditAction,
    userId: string | undefined,
    email: string | undefined,
    context: Partial<AuditContext> = {},
    status: 'success' | 'failure' = 'success',
    errorMessage?: string
  ): string {
    return this.log({
      action,
      actorId: userId,
      actorEmail: email,
      actorType: 'user',
      tenantId: context.tenantId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      status,
      errorMessage,
    });
  }

  /**
   * Log security event
   */
  logSecurity(
    type: 'rate_limit_hit' | 'suspicious_activity' | 'blocked_request' | 'permission_denied',
    details: Record<string, unknown>,
    context: AuditContext
  ): string {
    return this.log({
      action: `security.${type}` as AuditAction,
      actorId: context.userId,
      actorType: context.actorType || 'user',
      tenantId: context.tenantId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: details,
    });
  }

  /**
   * Log governance event (agent verification, leases, etc.)
   */
  logGovernance(
    action: AuditAction,
    entityType: string,
    entityId: string,
    performedBy: AuditActorType,
    result: 'success' | 'failure',
    details?: Record<string, unknown>
  ): string {
    return this.log({
      action,
      actorType: performedBy,
      targetId: entityId,
      targetType: entityType,
      status: result,
      metadata: details || {},
    });
  }

  /**
   * Query audit logs
   */
  async query(options: AuditQueryOptions = {}): Promise<AuditQueryResult> {
    const { limit = 100, offset = 0 } = options;
    let logs: AuditEvent[] = [];

    // Try to fetch from database first
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase.from('audit_logs').select('*', { count: 'exact' });

        if (options.userId) query = query.eq('actor_id', options.userId);
        if (options.tenantId) query = query.eq('tenant_id', options.tenantId);
        if (options.action) query = query.eq('action', options.action);
        if (options.startDate) query = query.gte('created_at', options.startDate.toISOString());
        if (options.endDate) query = query.lte('created_at', options.endDate.toISOString());

        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data, count, error } = await query;

        if (!error && data) {
          logs = data.map(this.mapDbToEvent);
          return {
            logs,
            total: count || 0,
            hasMore: offset + logs.length < (count || 0),
          };
        }
      } catch (error) {
        console.error('[Audit] Database query failed:', error);
      }
    }

    // Fall back to in-memory buffer
    logs = this.filterBuffer(options);
    const total = logs.length;
    logs = logs.slice(offset, offset + limit);

    return {
      logs,
      total,
      hasMore: offset + logs.length < total,
    };
  }

  /**
   * Get audit statistics
   */
  getStats(): AuditStats {
    const byAction: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const recentCritical: AuditEvent[] = [];

    for (const event of this.buffer) {
      byAction[event.action] = (byAction[event.action] || 0) + 1;
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;

      if (event.severity === 'critical') {
        recentCritical.push(event);
      }
    }

    return {
      total: this.buffer.length,
      byAction,
      bySeverity,
      recentCritical: recentCritical.slice(-10),
    };
  }

  /**
   * Flush buffer to persistent storage
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const eventsToFlush = [...this.buffer];
    this.buffer = [];

    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const records = eventsToFlush.map((event) => ({
        action: event.action,
        action_description: this.getActionDescription(event.action),
        actor_id: event.actorId,
        actor_type: event.actorType,
        actor_email: event.actorEmail,
        tenant_id: event.tenantId,
        record_id: event.targetId,
        table_name: event.targetType,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        status: event.status,
        error_message: event.errorMessage,
        metadata: event.metadata,
        created_at: event.timestamp.toISOString(),
      }));

      const { error } = await supabase.from('audit_logs').insert(records);

      if (error) {
        console.error('[Audit] Flush failed:', error);
        // Re-add events to buffer on failure
        this.buffer.unshift(...eventsToFlush);
      }
    } catch (error) {
      console.error('[Audit] Flush error:', error);
      this.buffer.unshift(...eventsToFlush);
    }
  }

  /**
   * Stop the service (cleanup)
   */
  stop(): void {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }
    this.flush();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private addToBuffer(event: AuditEvent): void {
    if (!this.bufferLock) {
      this.bufferLock = true;
      try {
        this.buffer.push(event);

        if (this.buffer.length > MAX_BUFFER_SIZE) {
          this.overflowCount++;
          this.buffer.shift();
          console.warn(`[Audit] Buffer overflow! Events lost: ${this.overflowCount}`);
        }
      } finally {
        this.bufferLock = false;
      }
    }

    // Trigger early flush if approaching capacity
    if (this.buffer.length >= OVERFLOW_FLUSH_THRESHOLD) {
      this.flush();
    }
  }

  private async persistEvent(event: AuditEvent): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.from('audit_logs').insert({
        action: event.action,
        action_description: this.getActionDescription(event.action),
        actor_id: event.actorId,
        actor_type: event.actorType,
        actor_email: event.actorEmail,
        tenant_id: event.tenantId,
        record_id: event.targetId,
        table_name: event.targetType,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        status: event.status,
        error_message: event.errorMessage,
        metadata: event.metadata,
        created_at: event.timestamp.toISOString(),
      });
    } catch (error) {
      // Silently fail - event is still in buffer
    }
  }

  private filterBuffer(options: AuditQueryOptions): AuditEvent[] {
    let logs = [...this.buffer];

    if (options.userId) {
      logs = logs.filter((e) => e.actorId === options.userId);
    }
    if (options.tenantId) {
      logs = logs.filter((e) => e.tenantId === options.tenantId);
    }
    if (options.action) {
      logs = logs.filter((e) => e.action === options.action);
    }
    if (options.severity) {
      logs = logs.filter((e) => e.severity === options.severity);
    }
    if (options.startDate) {
      logs = logs.filter((e) => e.timestamp >= options.startDate!);
    }
    if (options.endDate) {
      logs = logs.filter((e) => e.timestamp <= options.endDate!);
    }

    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return logs;
  }

  private mapDbToEvent(record: any): AuditEvent {
    return {
      id: record.id,
      action: record.action as AuditAction,
      severity: 'info', // Would need to compute from action
      timestamp: new Date(record.created_at),
      actorId: record.actor_id,
      actorType: record.actor_type || 'user',
      actorEmail: record.actor_email,
      targetId: record.record_id,
      targetType: record.table_name,
      tenantId: record.tenant_id,
      ipAddress: record.ip_address,
      userAgent: record.user_agent,
      status: record.status || 'success',
      errorMessage: record.error_message,
      metadata: record.metadata || {},
    };
  }

  private generateId(): string {
    return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private getActionSeverity(action: AuditAction): AuditSeverity {
    const criticalActions: AuditAction[] = [
      'auth.account_locked',
      'auth.password_changed',
      'api.key_create',
      'api.key_revoke',
      'admin.action',
      'security.suspicious_activity',
      'security.blocked_request',
      'governance.kill_switch_activated',
      'user.delete',
    ];

    const warningActions: AuditAction[] = [
      'auth.login_failure',
      'session.revoke',
      'subscription.cancel',
      'payment.failed',
      'security.rate_limit_hit',
      'security.permission_denied',
      'governance.identity_failed',
    ];

    if (criticalActions.includes(action)) return 'critical';
    if (warningActions.includes(action)) return 'warning';
    return 'info';
  }

  private getActionDescription(action: AuditAction): string {
    const descriptions: Record<string, string> = {
      'auth.login_success': 'User logged in successfully',
      'auth.login_failure': 'Failed login attempt',
      'auth.logout': 'User logged out',
      'auth.password_changed': 'Password was changed',
      'auth.account_locked': 'Account was locked',
      'security.rate_limit_hit': 'Rate limit exceeded',
      'security.blocked_request': 'Request was blocked',
      'build.create': 'Build was created',
      'build.complete': 'Build completed',
      'build.fail': 'Build failed',
    };
    return descriptions[action] || action.replace(/[._]/g, ' ');
  }
}

// ============================================================================
// SCOPED LOGGER FACTORY
// ============================================================================

/**
 * Create a scoped audit logger with pre-filled context
 */
export function createScopedAuditLogger(context: AuditContext) {
  return {
    log: (action: AuditAction, metadata: Record<string, unknown> = {}) =>
      auditService.log({
        action,
        actorId: context.userId,
        actorType: context.actorType || 'user',
        tenantId: context.tenantId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata,
      }),

    security: (
      type: 'rate_limit_hit' | 'suspicious_activity' | 'blocked_request' | 'permission_denied',
      details: Record<string, unknown>
    ) => auditService.logSecurity(type, details, context),

    // Convenience methods
    userLogin: (method: string) =>
      auditService.log({
        action: 'auth.login_success',
        actorId: context.userId,
        tenantId: context.tenantId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { method },
      }),

    userLogout: () =>
      auditService.log({
        action: 'auth.logout',
        actorId: context.userId,
        tenantId: context.tenantId,
        ipAddress: context.ipAddress,
      }),

    buildAction: (
      action: 'create' | 'update' | 'delete' | 'export' | 'share' | 'start' | 'complete' | 'fail' | 'cancel',
      buildId: string,
      details: Record<string, unknown> = {}
    ) =>
      auditService.log({
        action: `build.${action}` as AuditAction,
        actorId: context.userId,
        tenantId: context.tenantId,
        targetId: buildId,
        targetType: 'build',
        metadata: details,
      }),

    subscriptionAction: (
      action: 'create' | 'upgrade' | 'downgrade' | 'cancel',
      details: Record<string, unknown>
    ) =>
      auditService.log({
        action: `subscription.${action}` as AuditAction,
        actorId: context.userId,
        tenantId: context.tenantId,
        metadata: details,
      }),
  };
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const auditService = new AuditService();
