/**
 * OLYMPUS Contract Audit - Production Integration
 *
 * Auto-triggers security scanning during builds.
 *
 * @module contracts/audit
 */

// Types
export type {
  AuditTriggerConfig,
  AuditProductionConfig,
  AuditFinding,
  AuditResult,
  AuditEvent,
  AuditEventHandler,
  AuditHistoryEntry,
  RecurringPattern,
  PredictedRisk,
} from './audit-types';

export {
  AuditBlockError,
  AuditExecutionError,
} from './audit-types';

// Bridge (CLI execution)
export {
  executeContractAuditCLI,
  executeProductionAudit,
  quickAuditCheck,
} from './audit-bridge';

// Integration (main manager)
export {
  ProductionAuditManager,
  getAuditManager,
  initAuditManager,
  loadAuditConfig,
  onPhaseComplete,
  onBuildComplete,
  onCheckpointSave,
} from './audit-integration';

// History (pattern tracking)
export {
  AuditHistoryTracker,
  getHistoryTracker,
} from './audit-history';

// Wiring (orchestrator integration)
export {
  withAuditHooks,
  createBuildCompleteHandler,
  createCheckpointHandler,
  runStandaloneAudit,
  getAuditStats,
  getRecurringPatterns,
  initAudit,
} from './audit-wiring';
