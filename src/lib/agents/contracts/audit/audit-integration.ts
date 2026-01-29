/**
 * OLYMPUS Contract Audit Integration
 *
 * Main integration module for automatic audit execution during builds.
 * Handles configuration, triggering, and result processing.
 *
 * @module audit-integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { executeProductionAudit, quickAuditCheck } from './audit-bridge';
import type {
  AuditTriggerConfig,
  AuditProductionConfig,
  AuditFinding,
  AuditEvent,
  AuditEventHandler,
  AuditHistoryEntry,
} from './audit-types';
import { AuditBlockError, AuditExecutionError } from './audit-types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: AuditProductionConfig = {
  enabled: true,
  triggerOn: 'phase-complete',
  blocking: {
    critical: true,
    high: true,
    medium: false,
  },
  reporting: {
    savePath: './audit-reports/{projectId}/{buildId}/',
    format: ['json', 'markdown'],
    retentionDays: 30,
  },
  notifications: {
    enabled: true,
    channels: ['console', 'file'],
    triggerOn: ['critical', 'high'],
  },
  exclusions: {
    paths: [],
    rules: [],
    agents: [],
  },
  performance: {
    timeout: 120000,
    maxFindings: 100,
    parallelPhases: false,
  },
};

/**
 * Load audit configuration from file or use defaults
 */
export function loadAuditConfig(configPath?: string): AuditProductionConfig {
  const searchPaths = [
    configPath,
    './config/audit-production.json',
    './.auditrc.json',
    './audit.config.json',
  ].filter(Boolean) as string[];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8');
        const loaded = JSON.parse(content);
        return { ...DEFAULT_CONFIG, ...loaded };
      } catch {
        console.warn(`[AUDIT] Failed to load config from ${p}, using defaults`);
      }
    }
  }

  return DEFAULT_CONFIG;
}

/**
 * Convert production config to trigger config
 */
function toTriggerConfig(config: AuditProductionConfig): AuditTriggerConfig {
  return {
    triggerOn: config.triggerOn,
    blockOnCritical: config.blocking.critical,
    blockOnHigh: config.blocking.high,
    reportPath: config.reporting.savePath,
    notifyOn: config.notifications.triggerOn,
    timeout: config.performance.timeout,
    excludePaths: config.exclusions.paths,
    excludeRules: config.exclusions.rules,
  };
}

// ============================================================================
// AUDIT MANAGER
// ============================================================================

/**
 * Production Audit Manager
 *
 * Manages audit execution, event handling, and history tracking.
 */
export class ProductionAuditManager {
  private config: AuditProductionConfig;
  private eventHandlers: AuditEventHandler[] = [];
  private history: AuditHistoryEntry[] = [];
  private isRunning = false;

  constructor(config?: Partial<AuditProductionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if audit is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AuditProductionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Register event handler
   */
  onEvent(handler: AuditEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Emit event to all handlers
   */
  private async emitEvent(event: AuditEvent): Promise<void> {
    for (const handler of this.eventHandlers) {
      try {
        await handler(event);
      } catch (err) {
        console.error('[AUDIT] Event handler error:', err);
      }
    }
  }

  /**
   * Execute audit for a phase
   *
   * This is the main entry point called by the orchestrator.
   */
  async auditPhase(context: {
    projectId: string;
    buildId: string;
    phaseId: string;
    checkpointPath: string;
    generatedFiles: string[];
  }): Promise<{
    passed: boolean;
    shouldBlock: boolean;
    findings: AuditFinding[];
    reportPath: string;
  }> {
    if (!this.config.enabled) {
      return {
        passed: true,
        shouldBlock: false,
        findings: [],
        reportPath: '',
      };
    }

    // Prevent concurrent audits
    if (this.isRunning) {
      console.warn('[AUDIT] Audit already in progress, skipping');
      return {
        passed: true,
        shouldBlock: false,
        findings: [],
        reportPath: '',
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    // Emit start event
    await this.emitEvent({
      type: 'audit_started',
      timestamp: new Date(),
      buildId: context.buildId,
      phaseId: context.phaseId,
      data: { checkpointPath: context.checkpointPath },
    });

    try {
      // Execute the audit
      const result = await executeProductionAudit(
        context,
        toTriggerConfig(this.config)
      );

      // Record in history
      this.history.push({
        id: `${context.buildId}-${context.phaseId}-${Date.now()}`,
        projectId: context.projectId,
        buildId: context.buildId,
        timestamp: new Date(),
        duration: result.duration,
        findings: result.findings,
        summary: {
          criticalCount: result.criticalCount,
          highCount: result.highCount,
          mediumCount: result.mediumCount,
        },
        blocked: result.shouldBlock,
        config: toTriggerConfig(this.config),
      });

      // Log results
      this.logResults(context.phaseId, result);

      // Emit completion event
      await this.emitEvent({
        type: 'audit_completed',
        timestamp: new Date(),
        buildId: context.buildId,
        phaseId: context.phaseId,
        data: {
          duration: result.duration,
          criticalCount: result.criticalCount,
          highCount: result.highCount,
          mediumCount: result.mediumCount,
          reportPath: result.reportPath,
        },
      });

      // Emit individual finding events for critical/high
      for (const finding of result.findings) {
        if (finding.severity === 'critical' || finding.severity === 'high') {
          await this.emitEvent({
            type: 'finding_detected',
            timestamp: new Date(),
            buildId: context.buildId,
            phaseId: context.phaseId,
            data: { ...finding } as Record<string, unknown>,
          });
        }
      }

      // Handle blocking
      if (result.shouldBlock) {
        await this.emitEvent({
          type: 'build_blocked',
          timestamp: new Date(),
          buildId: context.buildId,
          phaseId: context.phaseId,
          data: {
            criticalCount: result.criticalCount,
            highCount: result.highCount,
            reportPath: result.reportPath,
          },
        });

        throw new AuditBlockError(
          `Build blocked: ${result.criticalCount} critical, ${result.highCount} high findings`,
          result.reportPath,
          result.findings,
          result.criticalCount,
          result.highCount
        );
      }

      return {
        passed: result.passed,
        shouldBlock: false,
        findings: result.findings,
        reportPath: result.reportPath,
      };
    } catch (err) {
      // Re-throw block errors
      if (err instanceof AuditBlockError) {
        throw err;
      }

      // Handle other errors gracefully
      console.error('[AUDIT] Execution error:', err);
      await this.emitEvent({
        type: 'audit_failed',
        timestamp: new Date(),
        buildId: context.buildId,
        phaseId: context.phaseId,
        data: { error: err instanceof Error ? err.message : 'Unknown error' },
      });

      // Graceful degradation - don't block on audit failure
      return {
        passed: true,
        shouldBlock: false,
        findings: [],
        reportPath: '',
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Quick check - fast pass/fail without full analysis
   */
  async quickCheck(checkpointPath: string): Promise<boolean> {
    if (!this.config.enabled) return true;

    const result = await quickAuditCheck(checkpointPath);
    return result.passed;
  }

  /**
   * Log audit results to console
   */
  private logResults(
    phaseId: string,
    result: {
      criticalCount: number;
      highCount: number;
      mediumCount: number;
      duration: number;
      reportPath: string;
    }
  ): void {
    const total = result.criticalCount + result.highCount + result.mediumCount;

    if (total === 0) {
      console.log(`[AUDIT] ✅ Phase ${phaseId}: PASSED (${result.duration}ms)`);
    } else {
      console.log(`[AUDIT] ⚠️  Phase ${phaseId}: ${total} findings`);
      if (result.criticalCount > 0) {
        console.log(`[AUDIT]    🔴 ${result.criticalCount} CRITICAL`);
      }
      if (result.highCount > 0) {
        console.log(`[AUDIT]    🟠 ${result.highCount} HIGH`);
      }
      if (result.mediumCount > 0) {
        console.log(`[AUDIT]    🟡 ${result.mediumCount} MEDIUM`);
      }
      console.log(`[AUDIT]    Report: ${result.reportPath}`);
    }
  }

  /**
   * Get audit history
   */
  getHistory(): AuditHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get recurring patterns from history
   */
  getRecurringPatterns(): Array<{
    type: string;
    title: string;
    count: number;
    phases: string[];
  }> {
    const patterns = new Map<string, { count: number; phases: Set<string> }>();

    for (const entry of this.history) {
      for (const finding of entry.findings) {
        const key = `${finding.type}:${finding.title}`;
        const existing = patterns.get(key) || { count: 0, phases: new Set() };
        existing.count++;
        existing.phases.add(entry.buildId);
        patterns.set(key, existing);
      }
    }

    return Array.from(patterns.entries())
      .filter(([_, v]) => v.count > 1)
      .map(([key, v]) => {
        const [type, title] = key.split(':');
        return {
          type,
          title,
          count: v.count,
          phases: Array.from(v.phases),
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Clear history (for testing)
   */
  clearHistory(): void {
    this.history = [];
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let auditManagerInstance: ProductionAuditManager | null = null;

/**
 * Get the global audit manager instance
 */
export function getAuditManager(): ProductionAuditManager {
  if (!auditManagerInstance) {
    const config = loadAuditConfig();
    auditManagerInstance = new ProductionAuditManager(config);
  }
  return auditManagerInstance;
}

/**
 * Initialize audit manager with custom config
 */
export function initAuditManager(config: Partial<AuditProductionConfig>): ProductionAuditManager {
  auditManagerInstance = new ProductionAuditManager(config);
  return auditManagerInstance;
}

// ============================================================================
// HELPER FUNCTIONS FOR ORCHESTRATOR INTEGRATION
// ============================================================================

/**
 * Hook for orchestrator: Call after phase completes
 */
export async function onPhaseComplete(
  projectId: string,
  buildId: string,
  phaseId: string,
  checkpointPath: string,
  generatedFiles: string[]
): Promise<void> {
  const manager = getAuditManager();

  if (!manager.isEnabled()) {
    return;
  }

  const config = loadAuditConfig();
  if (config.triggerOn !== 'phase-complete') {
    return;
  }

  await manager.auditPhase({
    projectId,
    buildId,
    phaseId,
    checkpointPath,
    generatedFiles,
  });
}

/**
 * Hook for orchestrator: Call after build completes
 */
export async function onBuildComplete(
  projectId: string,
  buildId: string,
  finalCheckpointPath: string
): Promise<void> {
  const manager = getAuditManager();

  if (!manager.isEnabled()) {
    return;
  }

  const config = loadAuditConfig();
  if (config.triggerOn !== 'build-complete') {
    return;
  }

  await manager.auditPhase({
    projectId,
    buildId,
    phaseId: 'final',
    checkpointPath: finalCheckpointPath,
    generatedFiles: [],
  });
}

/**
 * Hook for orchestrator: Call after checkpoint save
 */
export async function onCheckpointSave(
  projectId: string,
  buildId: string,
  checkpointPath: string
): Promise<void> {
  const manager = getAuditManager();

  if (!manager.isEnabled()) {
    return;
  }

  const config = loadAuditConfig();
  if (config.triggerOn !== 'checkpoint-save') {
    return;
  }

  await manager.auditPhase({
    projectId,
    buildId,
    phaseId: 'checkpoint',
    checkpointPath,
    generatedFiles: [],
  });
}
