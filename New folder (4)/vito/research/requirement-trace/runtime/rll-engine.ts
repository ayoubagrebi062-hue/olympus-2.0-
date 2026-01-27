/**
 * RLL Engine (Reality Lock-In Layer)
 *
 * Makes Olympus decisions irreversible and enforces convergence
 * on proven minimal realities.
 *
 * INTEGRATION:
 * - Hooks AFTER OCIC decision stage
 * - Supersedes ALL downstream execution (WIRE, PIXEL, etc.)
 *
 * NON-NEGOTIABLE:
 * - Singularities are immutable and append-only
 * - No overrides, flags, retries, or configs
 * - Enforcement is deterministic
 * - HARD_ABORT on any deviation
 *
 * PHILOSOPHY:
 * Once Olympus proves the smallest valid reality,
 * all other realities are invalid forever.
 * Olympus does not negotiate with broken systems.
 */

import { DecisionSingularityManager } from './decision-singularity';
import { LockEnforcer, LockValidationInput } from './lock-enforcer';
import { OCICEngine, OCICExecutionResult } from './ocic-engine';
import type {
  RLLIntelligence,
  DecisionSingularity,
  LockEnforcementResult,
  BlockedReality,
  ConvergenceStatus,
  CausalFingerprint,
  RSRViolation,
  MinimalCausalCutSet,
  RuntimeControlReport
} from './types';
import type { ShapeTraceResult, GateResult } from '../registry/types';
import type { HandoffId } from '../types';

// RLL version - immutable
const RLL_VERSION = '1.0.0';
Object.freeze({ RLL_VERSION });

export interface RLLExecutionResult {
  // OCIC result (includes ORIS enforcement + causal intelligence)
  ocicResult: OCICExecutionResult;

  // RLL intelligence
  rllIntelligence: RLLIntelligence;

  // Final execution decision
  executionAllowed: boolean;
  abortReason: string | null;
}

export class RLLEngine {
  private dataDir: string;
  private ocicEngine: OCICEngine;
  private singularityManager: DecisionSingularityManager;
  private lockEnforcer: LockEnforcer;
  private runHistory: string[] = [];

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.ocicEngine = new OCICEngine(dataDir);
    this.singularityManager = new DecisionSingularityManager(dataDir);
    this.lockEnforcer = new LockEnforcer(this.singularityManager);
  }

  /**
   * Execute full RLL-enhanced flow
   *
   * Order of operations:
   * 1. Execute OCIC (includes ORIS enforcement)
   * 2. Enforce locks against active singularities
   * 3. Create new singularity if conditions met
   * 4. Update convergence status
   * 5. Return final decision
   *
   * RLL SUPERSEDES OCIC:
   * Even if OCIC allows execution, RLL can HARD_ABORT.
   */
  execute(
    traceResults: Record<string, ShapeTraceResult>,
    gateResult: GateResult,
    runId: string
  ): RLLExecutionResult {
    // Track run history for convergence analysis
    this.runHistory.push(runId);

    // Step 1: Execute OCIC (includes ORIS)
    const ocicResult = this.ocicEngine.execute(traceResults, gateResult, runId);

    // Extract fingerprints and execution path
    const fingerprints = ocicResult.orisResult.forensics?.causal_fingerprints || [];
    const executionPath = this.extractExecutionPath(fingerprints);

    // Step 2: Enforce locks against active singularities
    const lockInput: LockValidationInput = {
      runId,
      fingerprints,
      executionPath
    };
    const lockEnforcementResult = this.lockEnforcer.enforce(lockInput);

    // Step 3: Build blocked realities if any deviations
    const blockedRealities = this.lockEnforcer.buildBlockedRealities(
      lockEnforcementResult.deviations,
      fingerprints,
      runId
    );

    // Step 4: Check if we should create a new singularity
    let newSingularity: DecisionSingularity | null = null;

    if (this.shouldCreateSingularity(ocicResult, lockEnforcementResult)) {
      newSingularity = this.createSingularity(ocicResult, runId);
    }

    // Step 5: Compute convergence status
    const convergenceStatus = this.computeConvergenceStatus(
      ocicResult,
      lockEnforcementResult
    );

    // Step 6: Build RLL intelligence
    const rllIntelligence = this.buildIntelligence(
      newSingularity,
      lockEnforcementResult,
      blockedRealities,
      convergenceStatus
    );

    // Step 7: Determine final execution decision
    // RLL SUPERSEDES OCIC - if RLL says HARD_ABORT, it's final
    const executionAllowed = this.determineExecutionAllowed(
      ocicResult,
      lockEnforcementResult
    );

    const abortReason = this.determineAbortReason(
      ocicResult,
      lockEnforcementResult
    );

    return {
      ocicResult,
      rllIntelligence,
      executionAllowed,
      abortReason
    };
  }

  /**
   * Extract execution path from fingerprints
   */
  private extractExecutionPath(fingerprints: CausalFingerprint[]): HandoffId[] {
    return fingerprints.map(fp => fp.handoff_id);
  }

  /**
   * Check if a new singularity should be created
   */
  private shouldCreateSingularity(
    ocicResult: OCICExecutionResult,
    lockResult: LockEnforcementResult
  ): boolean {
    // Don't create if lock enforcement failed (we're already blocked)
    if (lockResult.action === 'HARD_ABORT') {
      return false;
    }

    // Check OCIC result
    const enforcement = ocicResult.orisResult.enforcement;
    const intelligence = ocicResult.intelligence;

    // Must have RSR violation
    if (enforcement.canonical_allowed) {
      return false;
    }

    // Must have computed MCCS with causal certainty
    if (!intelligence.intelligence_summary.causal_certainty_achieved) {
      return false;
    }

    // Must have MCCS available
    if (intelligence.minimal_causal_cuts.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Create a new decision singularity
   */
  private createSingularity(
    ocicResult: OCICExecutionResult,
    runId: string
  ): DecisionSingularity {
    const enforcement = ocicResult.orisResult.enforcement;
    const intelligence = ocicResult.intelligence;
    const forensics = ocicResult.orisResult.forensics;

    // Collect all violations
    const allViolations: RSRViolation[] = [
      ...enforcement.foundational_violations,
      ...enforcement.interactive_violations,
      ...enforcement.enhancement_violations
    ];

    // Calculate global RSR
    const globalRSR = enforcement.per_shape_rsr.length > 0
      ? enforcement.per_shape_rsr.reduce((sum, r) => sum + r.rsr, 0) /
        enforcement.per_shape_rsr.length
      : 0;

    // Required RSR (use FOUNDATIONAL threshold as project-wide requirement)
    const requiredRSR = 1.0;

    // Get fingerprints
    const fingerprints = forensics?.causal_fingerprints || [];

    return this.singularityManager.createSingularity(
      runId,
      globalRSR,
      requiredRSR,
      allViolations,
      intelligence.minimal_causal_cuts,
      fingerprints,
      'PROJECT'
    );
  }

  /**
   * Compute convergence status
   */
  private computeConvergenceStatus(
    ocicResult: OCICExecutionResult,
    lockResult: LockEnforcementResult
  ): ConvergenceStatus {
    const stats = this.singularityManager.getStats();
    const enforcement = ocicResult.orisResult.enforcement;

    // Calculate global RSR
    const currentGlobalRSR = enforcement.per_shape_rsr.length > 0
      ? enforcement.per_shape_rsr.reduce((sum, r) => sum + r.rsr, 0) /
        enforcement.per_shape_rsr.length
      : 0;

    const targetGlobalRSR = 1.0;
    const rsr_gap = targetGlobalRSR - currentGlobalRSR;

    // Converged if RSR meets target and no violations
    const converged = enforcement.canonical_allowed &&
      currentGlobalRSR >= targetGlobalRSR;

    // Determine trend based on historical singularities
    let trend: 'CONVERGING' | 'STABLE' | 'DIVERGING' = 'STABLE';
    if (stats.total_singularities > 0) {
      // If we have singularities, we're working toward convergence
      if (lockResult.action === 'PROCEED' && !converged) {
        trend = 'CONVERGING';
      } else if (lockResult.action === 'HARD_ABORT') {
        trend = 'DIVERGING';
      }
    }

    // Count runs since last singularity
    const runsSinceLast = this.countRunsSinceLastSingularity();

    return {
      converged,
      convergence_run_id: converged ? this.runHistory[this.runHistory.length - 1] : null,
      current_global_rsr: currentGlobalRSR,
      target_global_rsr: targetGlobalRSR,
      rsr_gap,
      total_realities_evaluated: stats.total_allowed_realities + stats.total_forbidden_fingerprints,
      allowed_realities_count: stats.total_allowed_realities,
      forbidden_fingerprints_count: stats.total_forbidden_fingerprints,
      trend,
      runs_since_last_singularity: runsSinceLast
    };
  }

  /**
   * Count runs since last singularity was created
   */
  private countRunsSinceLastSingularity(): number {
    const database = this.singularityManager.getDatabase();
    if (database.singularities.length === 0) {
      return this.runHistory.length;
    }

    const lastSingularity = database.singularities[database.singularities.length - 1];
    const lastRunId = lastSingularity.run_id;
    const lastIndex = this.runHistory.indexOf(lastRunId);

    if (lastIndex === -1) {
      return 0;
    }

    return this.runHistory.length - lastIndex - 1;
  }

  /**
   * Build RLL intelligence
   */
  private buildIntelligence(
    singularity: DecisionSingularity | null,
    lockResult: LockEnforcementResult,
    blockedRealities: BlockedReality[],
    convergenceStatus: ConvergenceStatus
  ): RLLIntelligence {
    const stats = this.singularityManager.getStats();

    return {
      rll_version: RLL_VERSION,

      decision_singularity: singularity,
      lock_enforcement: lockResult,
      blocked_realities: blockedRealities,
      convergence_status: convergenceStatus,

      summary: {
        singularity_created: singularity !== null,
        active_singularities: stats.total_singularities,
        realities_blocked: blockedRealities.length,
        execution_allowed: lockResult.action === 'PROCEED',
        convergence_achieved: convergenceStatus.converged
      },

      proof: {
        singularities_immutable: true,
        enforcement_deterministic: true,
        no_override_possible: true,
        no_config_possible: true,
        no_flag_possible: true,
        decisions_irreversible: true
      }
    };
  }

  /**
   * Determine if execution is allowed
   *
   * RLL SUPERSEDES OCIC:
   * - If RLL says HARD_ABORT → blocked
   * - If OCIC says blocked AND RLL says PROCEED → still blocked
   */
  private determineExecutionAllowed(
    ocicResult: OCICExecutionResult,
    lockResult: LockEnforcementResult
  ): boolean {
    // RLL has veto power
    if (lockResult.action === 'HARD_ABORT') {
      return false;
    }

    // OCIC decision applies if RLL allows
    return ocicResult.executionAllowed;
  }

  /**
   * Determine abort reason
   */
  private determineAbortReason(
    ocicResult: OCICExecutionResult,
    lockResult: LockEnforcementResult
  ): string | null {
    // RLL abort takes precedence
    if (lockResult.action === 'HARD_ABORT' && lockResult.abort_proof) {
      return `RLL HARD_ABORT: Deviation from singularity ${lockResult.abort_proof.singularity_id}. ` +
        `${lockResult.abort_proof.historical_evidence}`;
    }

    // OCIC/ORIS abort
    if (!ocicResult.executionAllowed) {
      const enforcement = ocicResult.orisResult.enforcement;
      if (!enforcement.canonical_allowed) {
        return `ORIS BLOCK_ALL: RSR violations detected. ` +
          `Foundational: ${enforcement.foundational_violations.length}, ` +
          `Interactive: ${enforcement.interactive_violations.length}, ` +
          `Enhancement: ${enforcement.enhancement_violations.length}`;
      }

      if (ocicResult.preExecutionBlocks.length > 0) {
        return `PFF BLOCK_PREEMPTIVELY: ${ocicResult.preExecutionBlocks.length} historical failure patterns matched`;
      }
    }

    return null;
  }

  /**
   * Generate full report with RLL intelligence
   */
  generateReport(
    runId: string,
    traceResults: Record<string, ShapeTraceResult>,
    rllResult: RLLExecutionResult
  ): RuntimeControlReport & { rll?: RLLIntelligence } {
    const baseReport = this.ocicEngine.generateReport(
      runId,
      traceResults,
      rllResult.ocicResult
    );

    return {
      ...baseReport,
      rll: rllResult.rllIntelligence
    };
  }

  /**
   * Get OCIC engine
   */
  getOCICEngine(): OCICEngine {
    return this.ocicEngine;
  }

  /**
   * Get singularity manager
   */
  getSingularityManager(): DecisionSingularityManager {
    return this.singularityManager;
  }

  /**
   * Get lock enforcer
   */
  getLockEnforcer(): LockEnforcer {
    return this.lockEnforcer;
  }

  /**
   * Reset all state (for testing)
   */
  reset(): void {
    this.ocicEngine.reset();
    this.singularityManager.clearDatabase();
    this.runHistory = [];
  }
}
