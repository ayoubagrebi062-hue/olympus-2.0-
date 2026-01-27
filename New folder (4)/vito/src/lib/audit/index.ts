/**
 * OLYMPUS 3.0 - Unified Audit Service
 *
 * Consolidated audit logging for all system events.
 * Combines auth, security, and governance audit trails into one service.
 *
 * @version 3.0.0
 */

export * from './types';
export * from './audit-service';
export { auditService, createScopedAuditLogger } from './audit-service';
