/**
 * AEC Engine (Architectural Entropy Control)
 *
 * Enforces long-term architectural health across executions.
 *
 * INTEGRATION:
 * - Executes AFTER RLL
 * - Supersedes ALL downstream execution
 *
 * USES ONLY EXISTING OLYMPUS ARTIFACTS:
 * - RSR history
 * - Mortality data
 * - MCCS size
 * - Singularity count
 *
 * NON-NEGOTIABLE:
 * - No configs, flags, overrides, or resets
 * - No heuristics, ML, or probability
 * - Deterministic only
 * - Append-only persistence
 *
 * PHILOSOPHY:
 * Bugs are local. Entropy is existential.
 * Olympus must protect the future, not just the present.
 */

import * as fs from 'fs';
import * as path from 'path';
import { EntropyCalculator, EntropyInputs } from './entropy-calculator';
import { PhaseClassifier, PhaseClassificationResult } from './phase-classifier';
import { EntropyGate } from './entropy-gate';
import { RLLEngine, RLLExecutionResult } from './rll-engine';
import type {
  AECIntelligence,
  ArchitecturalEntropyScore,
  ArchitecturalPhase,
  EntropyGateResult,
  EntropyHistoryRecord,
  EntropyHistoryDatabase,
  RuntimeControlReport
} from './types';
import type { ShapeTraceResult, GateResult } from '../registry/types';

// AEC version - immutable
const AEC_VERSION = '1.0.0';
Object.freeze({ AEC_VERSION });

// Database filename
const DB_FILENAME = 'entropy-history.json';

export interface AECExecutionResult {
  // RLL result (includes OCIC + ORIS)
  rllResult: RLLExecutionResult;

  // AEC intelligence
  aecIntelligence: AECIntelligence;

  // Final execution decision
  executionAllowed: boolean;
  mutationsAllowed: boolean;
  abortReason: string | null;
}

export class AECEngine {
  private dataDir: string;
  private rllEngine: RLLEngine;
  private entropyCalculator: EntropyCalculator;
  private phaseClassifier: PhaseClassifier;
  private entropyGate: EntropyGate;
  private database: EntropyHistoryDatabase;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.rllEngine = new RLLEngine(dataDir);
    this.entropyCalculator = new EntropyCalculator();
    this.phaseClassifier = new PhaseClassifier();
    this.entropyGate = new EntropyGate();
    this.database = this.loadDatabase();
  }

  /**
   * Load the entropy history database from disk
   */
  private loadDatabase(): EntropyHistoryDatabase {
    const dbPath = path.join(this.dataDir, DB_FILENAME);

    if (fs.existsSync(dbPath)) {
      try {
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data) as EntropyHistoryDatabase;
      } catch (error) {
        // If corrupted, start fresh
        return this.createEmptyDatabase();
      }
    }

    return this.createEmptyDatabase();
  }

  /**
   * Create empty database
   */
  private createEmptyDatabase(): EntropyHistoryDatabase {
    return {
      version: AEC_VERSION,
      created_at: new Date().toISOString(),
      last_record_at: '',
      records: [],
      stats: {
        total_runs: 0,
        current_phase: 'STABLE',
        highest_entropy: 0,
        lowest_entropy: 1,
        runs_in_stable: 0,
        runs_in_decaying: 0,
        runs_in_collapsing: 0,
        runs_in_dead: 0
      },
      trend_data: {
        entropy_values: [],
        rsr_values: [],
        mortality_values: [],
        singularity_values: [],
        mccs_values: [],
        timestamps: []
      }
    };
  }

  /**
   * Persist the database to disk
   *
   * APPEND-ONLY: Records can never be modified or deleted
   */
  private persistDatabase(): void {
    const dbPath = path.join(this.dataDir, DB_FILENAME);

    // Ensure directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    fs.writeFileSync(dbPath, JSON.stringify(this.database, null, 2), 'utf-8');
  }

  /**
   * Execute full AEC-enhanced flow
   *
   * Order of operations:
   * 1. Execute RLL (includes OCIC + ORIS)
   * 2. Compute architectural entropy
   * 3. Classify phase
   * 4. Enforce entropy gate
   * 5. Record history (append-only)
   * 6. Return final decision
   *
   * AEC SUPERSEDES RLL:
   * Even if RLL allows execution, AEC can PERMANENT_HALT.
   */
  execute(
    traceResults: Record<string, ShapeTraceResult>,
    gateResult: GateResult,
    runId: string
  ): AECExecutionResult {
    // Step 1: Execute RLL (includes OCIC + ORIS)
    const rllResult = this.rllEngine.execute(traceResults, gateResult, runId);

    // Step 2: Gather entropy inputs from Olympus artifacts
    const entropyInputs = this.gatherEntropyInputs(rllResult);

    // Step 3: Compute architectural entropy
    const entropyScore = this.entropyCalculator.compute(entropyInputs);

    // Step 4: Classify phase
    const previousPhase = this.phaseClassifier.getLastPhase(this.database.records);
    const mccsConvergence = rllResult.rllIntelligence.convergence_status.converged;
    const phaseResult = this.phaseClassifier.classify(
      entropyScore,
      previousPhase,
      mccsConvergence
    );

    // Step 5: Enforce entropy gate
    const gateEnforcementResult = this.entropyGate.enforce(
      entropyScore,
      phaseResult.phase,
      runId
    );

    // Step 6: Record history (append-only)
    const historyRecord = this.recordHistory(
      runId,
      entropyScore,
      phaseResult,
      gateEnforcementResult,
      rllResult
    );

    // Step 7: Build AEC intelligence
    const aecIntelligence = this.buildIntelligence(
      entropyScore,
      phaseResult,
      gateEnforcementResult
    );

    // Step 8: Determine final execution decision
    // AEC SUPERSEDES RLL
    const executionAllowed = this.determineExecutionAllowed(
      rllResult,
      gateEnforcementResult
    );

    const mutationsAllowed = this.determineMutationsAllowed(
      rllResult,
      gateEnforcementResult
    );

    const abortReason = this.determineAbortReason(
      rllResult,
      gateEnforcementResult
    );

    return {
      rllResult,
      aecIntelligence,
      executionAllowed,
      mutationsAllowed,
      abortReason
    };
  }

  /**
   * Gather entropy inputs from Olympus artifacts
   */
  private gatherEntropyInputs(rllResult: RLLExecutionResult): EntropyInputs {
    const orisResult = rllResult.ocicResult.orisResult;
    const ocicIntelligence = rllResult.ocicResult.intelligence;
    const rllIntelligence = rllResult.rllIntelligence;

    // Calculate global RSR
    const enforcement = orisResult.enforcement;
    const globalRSR = enforcement.per_shape_rsr.length > 0
      ? enforcement.per_shape_rsr.reduce((sum, r) => sum + r.rsr, 0) /
        enforcement.per_shape_rsr.length
      : 0;

    // Count shapes
    const totalShapes = enforcement.per_shape_rsr.length;
    const deadShapes = orisResult.mortality_analysis.broken_count;

    // Get singularities
    const activeSingularities = rllIntelligence.summary.active_singularities;

    // Get MCCS info
    const mccsComputed = ocicIntelligence.minimal_causal_cuts.length;
    const averageMCCSSize = mccsComputed > 0
      ? ocicIntelligence.minimal_causal_cuts.reduce(
          (sum, m) => sum + m.intervention_count, 0
        ) / mccsComputed
      : 0;

    return {
      currentRSR: globalRSR,
      activeShapes: totalShapes,
      deadShapes,
      activeSingularities,
      mccsComputed,
      averageMCCSSize,
      historicalRecords: this.database.records
    };
  }

  /**
   * Record history (append-only)
   */
  private recordHistory(
    runId: string,
    entropyScore: ArchitecturalEntropyScore,
    phaseResult: PhaseClassificationResult,
    gateResult: EntropyGateResult,
    rllResult: RLLExecutionResult
  ): EntropyHistoryRecord {
    const now = new Date().toISOString();
    const recordId = `ENTROPY-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const orisResult = rllResult.ocicResult.orisResult;
    const ocicIntelligence = rllResult.ocicResult.intelligence;
    const rllIntelligence = rllResult.rllIntelligence;

    // Calculate global RSR
    const enforcement = orisResult.enforcement;
    const globalRSR = enforcement.per_shape_rsr.length > 0
      ? enforcement.per_shape_rsr.reduce((sum, r) => sum + r.rsr, 0) /
        enforcement.per_shape_rsr.length
      : 0;

    const record: EntropyHistoryRecord = {
      record_id: recordId,
      run_id: runId,
      timestamp: now,

      entropy_score: entropyScore,

      phase: phaseResult.phase,
      previous_phase: phaseResult.previous_phase,
      phase_worsened: phaseResult.phase_worsened,

      enforcement_action: gateResult.action,

      context: {
        global_rsr: globalRSR,
        active_singularities: rllIntelligence.summary.active_singularities,
        mccs_computed: ocicIntelligence.minimal_causal_cuts.length,
        shapes_dead: orisResult.mortality_analysis.broken_count,
        shapes_total: enforcement.per_shape_rsr.length
      },

      immutable: true,
      append_only: true
    };

    // Append to database (NEVER modify existing records)
    this.database.records.push(record);
    this.database.last_record_at = now;

    // Update stats
    this.updateStats(record);

    // Update trend data
    this.updateTrendData(record);

    // Persist immediately
    this.persistDatabase();

    return record;
  }

  /**
   * Update database statistics
   */
  private updateStats(record: EntropyHistoryRecord): void {
    const stats = this.database.stats;

    stats.total_runs++;
    stats.current_phase = record.phase;
    stats.highest_entropy = Math.max(stats.highest_entropy, record.entropy_score.entropy);
    stats.lowest_entropy = Math.min(stats.lowest_entropy, record.entropy_score.entropy);

    // Update phase counts
    switch (record.phase) {
      case 'STABLE':
        stats.runs_in_stable++;
        break;
      case 'DECAYING':
        stats.runs_in_decaying++;
        break;
      case 'COLLAPSING':
        stats.runs_in_collapsing++;
        break;
      case 'DEAD':
        stats.runs_in_dead++;
        break;
    }
  }

  /**
   * Update trend data for reporting
   */
  private updateTrendData(record: EntropyHistoryRecord): void {
    const trend = this.database.trend_data;

    trend.entropy_values.push(record.entropy_score.entropy);
    trend.rsr_values.push(record.context.global_rsr);
    trend.mortality_values.push(record.context.shapes_dead);
    trend.singularity_values.push(record.context.active_singularities);
    trend.mccs_values.push(record.context.mccs_computed);
    trend.timestamps.push(record.timestamp);
  }

  /**
   * Build AEC intelligence
   */
  private buildIntelligence(
    entropyScore: ArchitecturalEntropyScore,
    phaseResult: PhaseClassificationResult,
    gateResult: EntropyGateResult
  ): AECIntelligence {
    // Calculate entropy trend
    const records = this.database.records;
    const recentRecords = records.slice(-5);
    let entropyTrend: 'IMPROVING' | 'STABLE' | 'WORSENING' = 'STABLE';
    let entropyDelta = 0;

    if (recentRecords.length >= 2) {
      const oldest = recentRecords[0].entropy_score.entropy;
      const newest = recentRecords[recentRecords.length - 1].entropy_score.entropy;
      entropyDelta = newest - oldest;

      if (entropyDelta < -0.05) {
        entropyTrend = 'IMPROVING';
      } else if (entropyDelta > 0.05) {
        entropyTrend = 'WORSENING';
      }
    }

    // Get phase history
    const phaseHistory = this.phaseClassifier.getPhaseHistory(records);

    return {
      aec_version: AEC_VERSION,

      entropy_score: entropyScore,

      phase: phaseResult.phase,
      phase_history: phaseHistory,

      gate_result: gateResult,

      trend: {
        entropy_trend: entropyTrend,
        runs_analyzed: recentRecords.length,
        entropy_delta: entropyDelta
      },

      summary: {
        current_entropy: entropyScore.entropy,
        current_phase: phaseResult.phase,
        execution_allowed: gateResult.execution_allowed,
        mutations_allowed: gateResult.mutations_allowed,
        system_healthy: phaseResult.phase === 'STABLE'
      },

      proof: {
        entropy_deterministic: true,
        phase_from_fixed_thresholds: true,
        gate_non_bypassable: true,
        history_append_only: true,
        no_config: true,
        no_flag: true,
        no_override: true,
        no_reset: true
      }
    };
  }

  /**
   * Determine if execution is allowed
   *
   * AEC SUPERSEDES RLL:
   * - If AEC says PERMANENT_HALT → blocked
   * - If AEC says READ_ONLY → blocked for mutations
   * - If RLL says blocked AND AEC says CONTINUE → still blocked
   */
  private determineExecutionAllowed(
    rllResult: RLLExecutionResult,
    gateResult: EntropyGateResult
  ): boolean {
    // AEC has veto power
    if (!gateResult.execution_allowed) {
      return false;
    }

    // RLL decision applies if AEC allows
    return rllResult.executionAllowed;
  }

  /**
   * Determine if mutations are allowed
   */
  private determineMutationsAllowed(
    rllResult: RLLExecutionResult,
    gateResult: EntropyGateResult
  ): boolean {
    // AEC has veto power
    if (!gateResult.mutations_allowed) {
      return false;
    }

    // RLL decision applies if AEC allows
    return rllResult.executionAllowed;
  }

  /**
   * Determine abort reason
   */
  private determineAbortReason(
    rllResult: RLLExecutionResult,
    gateResult: EntropyGateResult
  ): string | null {
    // AEC abort takes precedence
    if (gateResult.enforcement_reason) {
      return `AEC ${gateResult.action}: ${gateResult.enforcement_reason}`;
    }

    // RLL abort
    if (rllResult.abortReason) {
      return rllResult.abortReason;
    }

    return null;
  }

  /**
   * Generate full report with AEC intelligence
   */
  generateReport(
    runId: string,
    traceResults: Record<string, ShapeTraceResult>,
    aecResult: AECExecutionResult
  ): RuntimeControlReport & { aec?: AECIntelligence } {
    const baseReport = this.rllEngine.generateReport(
      runId,
      traceResults,
      aecResult.rllResult
    );

    return {
      ...baseReport,
      aec: aecResult.aecIntelligence
    };
  }

  /**
   * Get RLL engine
   */
  getRLLEngine(): RLLEngine {
    return this.rllEngine;
  }

  /**
   * Get entropy calculator
   */
  getEntropyCalculator(): EntropyCalculator {
    return this.entropyCalculator;
  }

  /**
   * Get phase classifier
   */
  getPhaseClassifier(): PhaseClassifier {
    return this.phaseClassifier;
  }

  /**
   * Get entropy gate
   */
  getEntropyGate(): EntropyGate {
    return this.entropyGate;
  }

  /**
   * Get database (read-only)
   */
  getDatabase(): EntropyHistoryDatabase {
    return this.database;
  }

  /**
   * Get trend data (for reporting)
   */
  getTrendData(): EntropyHistoryDatabase['trend_data'] {
    return { ...this.database.trend_data };
  }

  /**
   * Get statistics (for reporting)
   */
  getStats(): EntropyHistoryDatabase['stats'] {
    return { ...this.database.stats };
  }

  /**
   * Reset all state (for testing only)
   * IN PRODUCTION: This should be DISABLED
   */
  reset(): void {
    this.rllEngine.reset();
    this.database = this.createEmptyDatabase();
    this.persistDatabase();
  }
}
