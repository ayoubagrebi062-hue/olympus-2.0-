/**
 * OLYMPUS 3.0 - Audit Logging
 * Security event logging for compliance and forensics
 */

// ============================================================================
// TYPES
// ============================================================================

type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.signup'
  | 'user.password_change'
  | 'user.email_change'
  | 'user.profile_update'
  | 'user.delete'
  | 'user.invite'
  | 'session.create'
  | 'session.revoke'
  | 'session.refresh'
  | 'api.key_create'
  | 'api.key_revoke'
  | 'api.key_use'
  | 'build.create'
  | 'build.update'
  | 'build.delete'
  | 'build.export'
  | 'build.share'
  | 'subscription.create'
  | 'subscription.upgrade'
  | 'subscription.downgrade'
  | 'subscription.cancel'
  | 'payment.success'
  | 'payment.failed'
  | 'admin.action'
  | 'security.rate_limit_hit'
  | 'security.suspicious_activity'
  | 'security.blocked_request';

type AuditSeverity = 'info' | 'warning' | 'critical';

interface AuditEvent {
  id: string;
  action: AuditAction;
  severity: AuditSeverity;
  userId?: string;
  targetId?: string;
  targetType?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  tenantId?: string;
}

interface AuditContext {
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// AUDIT BUFFER (L13 fix - bounded buffer with overflow handling)
// ============================================================================

const auditBuffer: AuditEvent[] = [];
const MAX_BUFFER_SIZE = 1000;
const FLUSH_INTERVAL = 30000; // 30 seconds
const OVERFLOW_FLUSH_THRESHOLD = 800; // Flush early if nearing capacity

// L14 fix - track overflow events
let overflowCount = 0;
let lastFlushTime = Date.now();

// 50X RELIABILITY: Mutex lock for thread-safe buffer operations
let auditBufferLock = false;

async function acquireAuditLock(): Promise<void> {
  const maxWait = 5000; // 5 second timeout
  const start = Date.now();
  while (auditBufferLock) {
    if (Date.now() - start > maxWait) {
      console.error('[audit] Lock acquisition timeout - forcing unlock');
      auditBufferLock = false;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  auditBufferLock = true;
}

function releaseAuditLock(): void {
  auditBufferLock = false;
}

// L13 fix - store interval reference for cleanup
let flushIntervalId: ReturnType<typeof setInterval> | null = null;

// Periodic flush
if (typeof setInterval !== 'undefined') {
  flushIntervalId = setInterval(() => {
    flushAuditLogs();
  }, FLUSH_INTERVAL);
}

// L14 fix - cleanup function for graceful shutdown
export function stopAuditLogFlush(): void {
  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }
  // Ensure final flush on shutdown
  flushAuditLogs();
}

// ============================================================================
// AUDIT FUNCTIONS
// ============================================================================

/**
 * Log an audit event
 */
export function auditLog(
  action: AuditAction,
  metadata: Record<string, unknown> = {},
  context: AuditContext = {}
): string {
  const severity = getActionSeverity(action);

  const event: AuditEvent = {
    id: generateAuditId(),
    action,
    severity,
    userId: context.userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    tenantId: context.tenantId,
    metadata,
    timestamp: new Date(),
  };

  // Add target info if present in metadata
  if (metadata.targetId) {
    event.targetId = String(metadata.targetId);
  }
  if (metadata.targetType) {
    event.targetType = String(metadata.targetType);
  }

  // 50X RELIABILITY: Thread-safe buffer operations with mutex
  // Use synchronous lock check for performance (async only when contention)
  if (!auditBufferLock) {
    auditBufferLock = true;
    try {
      auditBuffer.push(event);

      // L13 fix - handle buffer overflow properly
      if (auditBuffer.length > MAX_BUFFER_SIZE) {
        overflowCount++;
        auditBuffer.shift();
        console.warn(`[audit] Buffer overflow! Events lost: ${overflowCount}`);
      }
    } finally {
      auditBufferLock = false;
    }
  } else {
    // Contention detected - use async lock acquisition
    acquireAuditLock().then(() => {
      try {
        auditBuffer.push(event);
        if (auditBuffer.length > MAX_BUFFER_SIZE) {
          overflowCount++;
          auditBuffer.shift();
        }
      } finally {
        releaseAuditLock();
      }
    });
  }

  // L13 fix - trigger early flush if approaching capacity
  if (auditBuffer.length >= OVERFLOW_FLUSH_THRESHOLD) {
    flushAuditLogs();
  }

  // Log critical events immediately
  if (severity === 'critical') {
    console.error('[AUDIT-CRITICAL]', JSON.stringify(event));
    flushAuditLogs();
  } else if (process.env.NODE_ENV === 'development') {
    console.log('[audit]', action, metadata);
  }

  return event.id;
}

/**
 * Log a security event
 */
export function securityLog(
  type: 'rate_limit_hit' | 'suspicious_activity' | 'blocked_request',
  details: Record<string, unknown>,
  context: AuditContext
): string {
  return auditLog(`security.${type}` as AuditAction, details, context);
}

// ============================================================================
// SCOPED AUDIT LOGGER
// ============================================================================

/**
 * Create a scoped audit logger with pre-filled context
 */
export function createAuditLogger(context: AuditContext) {
  return {
    log: (action: AuditAction, metadata: Record<string, unknown> = {}) =>
      auditLog(action, metadata, context),

    security: (
      type: 'rate_limit_hit' | 'suspicious_activity' | 'blocked_request',
      details: Record<string, unknown>
    ) => securityLog(type, details, context),

    // Convenience methods
    userLogin: (method: string) => auditLog('user.login', { method }, context),

    userLogout: () => auditLog('user.logout', {}, context),

    buildAction: (
      action: 'create' | 'update' | 'delete' | 'export' | 'share',
      buildId: string,
      details: Record<string, unknown> = {}
    ) =>
      auditLog(
        `build.${action}` as AuditAction,
        { targetId: buildId, targetType: 'build', ...details },
        context
      ),

    subscriptionAction: (
      action: 'create' | 'upgrade' | 'downgrade' | 'cancel',
      details: Record<string, unknown>
    ) => auditLog(`subscription.${action}` as AuditAction, details, context),
  };
}

// ============================================================================
// AUDIT RETRIEVAL
// ============================================================================

/**
 * L15 fix - Get audit logs with async support for persistent storage
 * Note: For production, implement getPersistedAuditLogs to query database
 */
export async function getAuditLogs(
  options: {
    userId?: string;
    tenantId?: string;
    action?: AuditAction;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    includeMemory?: boolean; // Include in-memory buffer
  } = {}
): Promise<{ logs: AuditEvent[]; total: number; hasMore: boolean }> {
  const { limit = 100, offset = 0, includeMemory = true } = options;

  let logs: AuditEvent[] = [];

  // L15 fix - In production, fetch from persistent storage first
  if (process.env.NODE_ENV === 'production') {
    try {
      // This would be replaced with actual database query
      // const persistedLogs = await getPersistedAuditLogs(options);
      // logs = persistedLogs;
      console.log('[audit] Would query persistent storage with filters:', options);
    } catch (error) {
      console.error('[audit] Failed to fetch from persistent storage:', error);
    }
  }

  // Include in-memory buffer
  if (includeMemory) {
    logs = [...logs, ...auditBuffer];
  }

  // Apply filters
  if (options.userId) {
    logs = logs.filter(e => e.userId === options.userId);
  }

  if (options.tenantId) {
    logs = logs.filter(e => e.tenantId === options.tenantId);
  }

  if (options.action) {
    logs = logs.filter(e => e.action === options.action);
  }

  if (options.severity) {
    logs = logs.filter(e => e.severity === options.severity);
  }

  if (options.startDate) {
    logs = logs.filter(e => e.timestamp >= options.startDate!);
  }

  if (options.endDate) {
    logs = logs.filter(e => e.timestamp <= options.endDate!);
  }

  // Sort by timestamp descending
  logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const total = logs.length;

  // Apply pagination
  logs = logs.slice(offset, offset + limit);

  return {
    logs,
    total,
    hasMore: offset + logs.length < total,
  };
}

/**
 * Synchronous version for backward compatibility (L15 fix - deprecated)
 * @deprecated Use async getAuditLogs instead
 */
export function getAuditLogsSync(
  options: {
    userId?: string;
    action?: AuditAction;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): AuditEvent[] {
  let logs = [...auditBuffer];

  if (options.userId) {
    logs = logs.filter(e => e.userId === options.userId);
  }

  if (options.action) {
    logs = logs.filter(e => e.action === options.action);
  }

  if (options.severity) {
    logs = logs.filter(e => e.severity === options.severity);
  }

  if (options.startDate) {
    logs = logs.filter(e => e.timestamp >= options.startDate!);
  }

  if (options.endDate) {
    logs = logs.filter(e => e.timestamp <= options.endDate!);
  }

  logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (options.limit) {
    logs = logs.slice(0, options.limit);
  }

  return logs;
}

/**
 * Get audit statistics
 */
export function getAuditStats(): {
  total: number;
  byAction: Record<string, number>;
  bySeverity: Record<string, number>;
  recentCritical: AuditEvent[];
} {
  const byAction: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const recentCritical: AuditEvent[] = [];

  for (const event of auditBuffer) {
    byAction[event.action] = (byAction[event.action] || 0) + 1;
    bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;

    if (event.severity === 'critical') {
      recentCritical.push(event);
    }
  }

  return {
    total: auditBuffer.length,
    byAction,
    bySeverity,
    recentCritical: recentCritical.slice(-10),
  };
}

// ============================================================================
// FLUSH TO PERSISTENT STORAGE
// ============================================================================

/**
 * Flush audit logs to persistent storage
 * 50X RELIABILITY: Thread-safe with mutex lock
 */
async function flushAuditLogs(): Promise<void> {
  if (auditBuffer.length === 0) return;

  // Acquire lock for thread-safe buffer access
  await acquireAuditLock();

  let eventsToFlush: AuditEvent[] = [];
  try {
    // Copy and clear buffer atomically
    eventsToFlush = [...auditBuffer];
    auditBuffer.length = 0; // Clear in place
    lastFlushTime = Date.now();
  } finally {
    releaseAuditLock();
  }

  if (eventsToFlush.length === 0) return;

  // In production, send to persistent storage (database, S3, etc.)
  if (process.env.NODE_ENV === 'production') {
    try {
      // This would be replaced with actual storage logic
      // await storageClient.putAuditLogs(eventsToFlush);

      // For now, just log that we would flush
      console.log(`[audit] Would flush ${eventsToFlush.length} events to storage`);
    } catch (error) {
      console.error('[audit] Failed to flush logs:', error);
      // Re-add events to buffer on failure (with lock)
      await acquireAuditLock();
      try {
        auditBuffer.unshift(...eventsToFlush);
      } finally {
        releaseAuditLock();
      }
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateAuditId(): string {
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getActionSeverity(action: AuditAction): AuditSeverity {
  const criticalActions: AuditAction[] = [
    'user.delete',
    'user.password_change',
    'api.key_create',
    'api.key_revoke',
    'admin.action',
    'security.suspicious_activity',
    'security.blocked_request',
  ];

  const warningActions: AuditAction[] = [
    'session.revoke',
    'subscription.cancel',
    'payment.failed',
    'security.rate_limit_hit',
  ];

  if (criticalActions.includes(action)) {
    return 'critical';
  }

  if (warningActions.includes(action)) {
    return 'warning';
  }

  return 'info';
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { AuditAction, AuditSeverity, AuditEvent, AuditContext };
