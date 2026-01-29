/**
 * OLYMPUS Contract Audit Wiring
 *
 * Wires the Contract Audit CLI into the Orchestrator pipeline.
 * This module provides the integration hooks for automatic audit execution.
 *
 * @module audit-wiring
 */

import type { BuildPhase, AgentId } from '../../types';
import type { PhaseStatus, OrchestrationOptions, BuildProgress } from '../../orchestrator/types';
import {
  getAuditManager,
  initAuditManager,
  loadAuditConfig,
  onPhaseComplete as auditOnPhaseComplete,
  onBuildComplete as auditOnBuildComplete,
  onCheckpointSave as auditOnCheckpointSave,
} from './audit-integration';
import { getHistoryTracker } from './audit-history';
import type { AuditProductionConfig, AuditFinding } from './audit-types';
import { AuditBlockError } from './audit-types';

// ============================================================================
// ORCHESTRATOR WIRING
// ============================================================================

/**
 * Create orchestration options with audit hooks
 *
 * This wraps the user's callbacks with audit hooks that execute
 * BEFORE the user's callbacks (so we can block if needed).
 *
 * @example
 * ```typescript
 * const options = withAuditHooks({
 *   maxConcurrency: 4,
 *   continueOnError: false,
 *   onProgress: (p) => console.log('Progress:', p.progress),
 * }, {
 *   projectId: 'my-project',
 *   buildId: 'build-123',
 * });
 *
 * const orchestrator = new Orchestrator(plan, options);
 * ```
 */
export function withAuditHooks(
  baseOptions: Partial<OrchestrationOptions>,
  context: {
    projectId: string;
    buildId: string;
    checkpointPath?: string;
  }
): OrchestrationOptions {
  const config = loadAuditConfig();
  const manager = getAuditManager();

  // If audit is disabled, return original options
  if (!config.enabled) {
    return baseOptions as OrchestrationOptions;
  }

  // Store original callbacks
  const originalOnPhaseComplete = baseOptions.onPhaseComplete;
  const originalOnProgress = baseOptions.onProgress;
  const originalOnError = baseOptions.onError;

  // Track generated files per phase
  const generatedFiles = new Map<BuildPhase, string[]>();

  return {
    ...baseOptions,

    // Wrap onPhaseComplete with audit hook
    onPhaseComplete: async (phase: BuildPhase, status: PhaseStatus) => {
      // Get checkpoint path (from options or default)
      const checkpointPath = context.checkpointPath ||
        `./.olympus/builds/${context.buildId}/checkpoints/${phase}.json`;

      try {
        // Execute audit for this phase
        if (config.triggerOn === 'phase-complete') {
          await auditOnPhaseComplete(
            context.projectId,
            context.buildId,
            phase,
            checkpointPath,
            generatedFiles.get(phase) || []
          );
        }
      } catch (err) {
        // If audit blocks, propagate the error
        if (err instanceof AuditBlockError) {
          console.error(`[AUDIT] Build blocked by security findings`);
          console.error(`[AUDIT] Report: ${err.reportPath}`);
          console.error(`[AUDIT] ${err.criticalCount} critical, ${err.highCount} high findings`);

          // Call original error handler if exists
          if (originalOnError) {
            originalOnError({
              code: 'AUDIT_BLOCK',
              message: err.message,
              phase,
              recoverable: false,
              details: err.findings,
            });
          }

          // Re-throw to stop the build
          throw err;
        }

        // Non-blocking audit error - log and continue (graceful degradation)
        console.warn(`[AUDIT] Non-blocking audit error:`, err);
      }

      // Call original callback
      if (originalOnPhaseComplete) {
        originalOnPhaseComplete(phase, status);
      }
    },

    // Wrap onProgress to track generated files
    onProgress: (progress: BuildProgress) => {
      // Original callback
      if (originalOnProgress) {
        originalOnProgress(progress);
      }
    },

    // Keep original error handler but enhance with audit context
    onError: originalOnError,
  } as OrchestrationOptions;
}

/**
 * Create a build completion handler with audit
 *
 * Call this after the build completes to run final audit.
 *
 * @example
 * ```typescript
 * const handleBuildComplete = createBuildCompleteHandler({
 *   projectId: 'my-project',
 *   buildId: 'build-123',
 * });
 *
 * // After build completes
 * await handleBuildComplete('/path/to/final/checkpoint.json');
 * ```
 */
export function createBuildCompleteHandler(context: {
  projectId: string;
  buildId: string;
}): (finalCheckpointPath: string) => Promise<void> {
  return async (finalCheckpointPath: string) => {
    const config = loadAuditConfig();

    if (!config.enabled || config.triggerOn !== 'build-complete') {
      return;
    }

    try {
      await auditOnBuildComplete(
        context.projectId,
        context.buildId,
        finalCheckpointPath
      );
    } catch (err) {
      if (err instanceof AuditBlockError) {
        console.error(`[AUDIT] Build blocked at completion by security findings`);
        throw err;
      }
      console.warn(`[AUDIT] Non-blocking audit error at build complete:`, err);
    }
  };
}

/**
 * Create a checkpoint save handler with audit
 */
export function createCheckpointHandler(context: {
  projectId: string;
  buildId: string;
}): (checkpointPath: string) => Promise<void> {
  return async (checkpointPath: string) => {
    const config = loadAuditConfig();

    if (!config.enabled || config.triggerOn !== 'checkpoint-save') {
      return;
    }

    try {
      await auditOnCheckpointSave(
        context.projectId,
        context.buildId,
        checkpointPath
      );
    } catch (err) {
      if (err instanceof AuditBlockError) {
        console.error(`[AUDIT] Build blocked at checkpoint by security findings`);
        throw err;
      }
      console.warn(`[AUDIT] Non-blocking audit error at checkpoint:`, err);
    }
  };
}

// ============================================================================
// STANDALONE AUDIT FUNCTIONS
// ============================================================================

/**
 * Run a standalone audit on a checkpoint file
 *
 * Use this for manual audits outside the build pipeline.
 */
export async function runStandaloneAudit(
  checkpointPath: string,
  options: {
    projectId?: string;
    buildId?: string;
    blocking?: boolean;
  } = {}
): Promise<{
  passed: boolean;
  findings: AuditFinding[];
  reportPath: string;
}> {
  const manager = getAuditManager();

  const result = await manager.auditPhase({
    projectId: options.projectId || 'standalone',
    buildId: options.buildId || `manual-${Date.now()}`,
    phaseId: 'manual',
    checkpointPath,
    generatedFiles: [],
  });

  return {
    passed: result.passed,
    findings: result.findings,
    reportPath: result.reportPath,
  };
}

/**
 * Get audit statistics
 */
export async function getAuditStats(): Promise<{
  totalAudits: number;
  totalFindings: number;
  findingsByType: Record<string, number>;
  findingsBySeverity: Record<string, number>;
  blockedBuilds: number;
  averageDuration: number;
}> {
  const tracker = getHistoryTracker();
  return tracker.getStatistics();
}

/**
 * Get recurring security patterns
 */
export async function getRecurringPatterns(projectId?: string) {
  const tracker = getHistoryTracker();
  return tracker.getRecurringPatterns(projectId);
}

/**
 * Initialize audit system with custom config
 */
export function initAudit(config?: Partial<AuditProductionConfig>) {
  if (config) {
    initAuditManager(config);
  }
  return getAuditManager();
}

// ============================================================================
// EXPORTS FOR ORCHESTRATOR INTEGRATION
// ============================================================================

export {
  getAuditManager,
  loadAuditConfig,
  AuditBlockError,
};
