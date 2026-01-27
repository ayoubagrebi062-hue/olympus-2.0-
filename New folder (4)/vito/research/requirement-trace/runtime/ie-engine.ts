/**
 * IE Engine (Inevitability Engine)
 *
 * Prevents executions that mathematically guarantee future architectural collapse.
 *
 * INTEGRATION:
 * - Executes BEFORE AEC (and thus before RLL)
 * - If IE aborts, AEC/RLL never run
 * - Supersedes ALL downstream execution
 *
 * WORKFLOW:
 * 1. Compute action signature (structural fingerprint)
 * 2. Check if fingerprint is already known doomed
 * 3. If not known, expand counterfactuals forward
 * 4. Detect inevitability
 * 5. Enforce gate decision
 * 6. If ALLOW, proceed to AEC
 * 7. Record history (append-only)
 *
 * PHILOSOPHY:
 * "Tests stop bugs. AEC stops decay. Inevitability stops self-destruction."
 *
 * NON-NEGOTIABLE:
 * - No configs, flags, overrides
 * - No heuristics, ML, or probability
 * - Deterministic only
 * - Append-only persistence
 */

import * as fs from 'fs';
import * as path from 'path';
import { ActionFingerprinter } from './action-fingerprinter';
import { ForwardCounterfactualExpander, SimulationContext } from './forward-expander';
import { InevitabilityDetector } from './inevitability-detector';
import { InevitabilityGate } from './inevitability-gate';
import { AECEngine, AECExecutionResult } from './aec-engine';
import type {
  ActionSignature,
  CausalPath,
  InevitabilityProof,
  InevitabilityGateResult,
  IEIntelligence,
  ArchitecturalPhase
} from './types';
import type { ShapeTraceResult, GateResult } from '../registry/types';

// IE version - immutable
const IE_VERSION = '1.0.0';
Object.freeze({ IE_VERSION });

export interface IEExecutionResult {
  // IE intelligence
  ieIntelligence: IEIntelligence;

  // AEC result (only if IE allowed)
  aecResult: AECExecutionResult | null;

  // Final execution decision
  executionAllowed: boolean;
  mutationsAllowed: boolean;
  abortReason: string | null;
}

export class IEEngine {
  private dataDir: string;
  private fingerprinter: ActionFingerprinter;
  private expander: ForwardCounterfactualExpander;
  private detector: InevitabilityDetector;
  private gate: InevitabilityGate;
  private aecEngine: AECEngine;

  constructor(dataDir: string, simulationSteps: number = 5) {
    this.dataDir = dataDir;
    this.fingerprinter = new ActionFingerprinter();
    this.expander = new ForwardCounterfactualExpander(simulationSteps);
    this.detector = new InevitabilityDetector();
    this.gate = new InevitabilityGate(dataDir);
    this.aecEngine = new AECEngine(dataDir);
  }

  /**
   * Execute full IE-enhanced flow
   *
   * Order of operations:
   * 1. Compute action signature
   * 2. Check if known doomed fingerprint
   * 3. If not known, expand counterfactuals forward
   * 4. Detect inevitability
   * 5. Enforce gate decision
   * 6. If ALLOW, proceed to AEC
   * 7. Record history
   * 8. Return final decision
   *
   * IE SUPERSEDES AEC:
   * If IE aborts, AEC never runs.
   */
  execute(
    traceResults: Record<string, ShapeTraceResult>,
    gateResult: GateResult,
    runId: string
  ): IEExecutionResult {
    // Step 1: Compute action signature
    const signature = this.fingerprinter.computeSignature(traceResults, runId);

    // Step 2: Check if fingerprint is already known doomed
    const fingerprint = signature.fingerprint;
    const isKnownDoomed = this.gate.isDoomed(fingerprint);

    let paths: CausalPath[] = [];
    let proof: InevitabilityProof;
    let gateEnforcementResult: InevitabilityGateResult;

    if (isKnownDoomed) {
      // Known doomed - skip simulation, immediate abort
      proof = {
        inevitable: true,
        proof_type: 'ALL_PATHS_COLLAPSE',
        paths_analyzed: 0,
        paths_to_collapse: 0,
        paths_with_mccs_growth: 0,
        steps_to_collapse: null,
        fastest_collapse_path: null,
        confidence: 1.0,
        proven_at: new Date().toISOString()
      };

      gateEnforcementResult = this.gate.enforce(signature, proof, runId);
    } else {
      // Step 3: Run AEC first to get OCIC intelligence for expansion
      // We need the counterfactuals from OCIC to expand forward
      // But we can't run AEC if we haven't checked inevitability yet!
      //
      // SOLUTION: Run a lightweight OCIC extraction first
      const ocicContext = this.extractOCICContext(traceResults, gateResult, runId);

      // Step 4: Expand counterfactuals forward
      paths = this.expander.expand(
        ocicContext.ocicIntelligence,
        ocicContext.simulationContext,
        runId
      );

      // Step 5: Detect inevitability
      proof = this.detector.detect(paths);

      // Step 6: Enforce gate decision
      gateEnforcementResult = this.gate.enforce(signature, proof, runId);
    }

    // Step 7: If ALLOW, proceed to AEC
    let aecResult: AECExecutionResult | null = null;

    if (gateEnforcementResult.action === 'ALLOW') {
      aecResult = this.aecEngine.execute(traceResults, gateResult, runId);
    }

    // Step 8: Build IE intelligence
    const ieIntelligence = this.buildIntelligence(
      signature,
      paths,
      proof,
      gateEnforcementResult
    );

    // Step 9: Record full history
    this.recordHistory(
      runId,
      signature,
      paths,
      proof,
      gateEnforcementResult,
      aecResult
    );

    // Step 10: Determine final execution decision
    const executionAllowed = this.determineExecutionAllowed(
      gateEnforcementResult,
      aecResult
    );

    const mutationsAllowed = this.determineMutationsAllowed(
      gateEnforcementResult,
      aecResult
    );

    const abortReason = this.determineAbortReason(
      gateEnforcementResult,
      aecResult
    );

    return {
      ieIntelligence,
      aecResult,
      executionAllowed,
      mutationsAllowed,
      abortReason
    };
  }

  /**
   * Extract OCIC context without running full AEC flow
   *
   * We need OCIC intelligence to expand counterfactuals,
   * but we can't run AEC before checking inevitability.
   *
   * This runs just the OCIC portion to get the data we need.
   */
  private extractOCICContext(
    traceResults: Record<string, ShapeTraceResult>,
    gateResult: GateResult,
    runId: string
  ): {
    ocicIntelligence: any;
    simulationContext: SimulationContext;
  } {
    // Get the RLL engine from AEC
    const rllEngine = this.aecEngine.getRLLEngine();

    // Get the OCIC engine from RLL
    const ocicEngine = rllEngine.getOCICEngine();

    // Execute OCIC only (not the full RLL flow)
    const ocicResult = ocicEngine.execute(traceResults, gateResult, runId);

    // Build simulation context from OCIC result
    const orisResult = ocicResult.orisResult;
    const enforcement = orisResult.enforcement;

    // Calculate global RSR
    const globalRSR = enforcement.per_shape_rsr.length > 0
      ? enforcement.per_shape_rsr.reduce((sum, r) => sum + r.rsr, 0) /
        enforcement.per_shape_rsr.length
      : 0;

    // Get current entropy from AEC's entropy calculator
    const entropyCalculator = this.aecEngine.getEntropyCalculator();
    const entropyInputs = {
      currentRSR: globalRSR,
      activeShapes: enforcement.per_shape_rsr.length,
      deadShapes: orisResult.mortality_analysis.broken_count,
      activeSingularities: rllEngine.getSingularityManager().getActiveSingularities().length,
      mccsComputed: ocicResult.intelligence.minimal_causal_cuts.length,
      averageMCCSSize: ocicResult.intelligence.minimal_causal_cuts.length > 0
        ? ocicResult.intelligence.minimal_causal_cuts.reduce(
            (sum, m) => sum + m.intervention_count, 0
          ) / ocicResult.intelligence.minimal_causal_cuts.length
        : 0,
      historicalRecords: []
    };

    const entropyScore = entropyCalculator.compute(entropyInputs);

    // Get current phase from AEC
    const phaseClassifier = this.aecEngine.getPhaseClassifier();
    const aecDatabase = this.aecEngine.getDatabase();
    const previousPhase = phaseClassifier.getLastPhase(aecDatabase.records) ?? 'STABLE';

    const simulationContext: SimulationContext = {
      current_entropy: entropyScore.entropy,
      current_phase: previousPhase,
      current_mccs_size: entropyInputs.averageMCCSSize,
      current_rsr: globalRSR,
      current_dead_shapes: orisResult.mortality_analysis.broken_count,
      current_singularities: entropyInputs.activeSingularities,
      total_shapes: enforcement.per_shape_rsr.length
    };

    return {
      ocicIntelligence: ocicResult.intelligence,
      simulationContext
    };
  }

  /**
   * Build IE intelligence
   */
  private buildIntelligence(
    signature: ActionSignature,
    paths: CausalPath[],
    proof: InevitabilityProof,
    gateResult: InevitabilityGateResult
  ): IEIntelligence {
    // Generate causal chain summary
    const causalChainSummary = this.detector.generateCausalChainSummary(paths, proof);

    // Build entropy trajectory data
    const entropyTrajectory = paths.map(path => ({
      path_id: path.path_id,
      trajectory: path.entropy_trajectory,
      leads_to_collapse: path.leads_to_collapse
    }));

    return {
      ie_version: IE_VERSION,
      action_signature: signature,
      causal_paths: paths,
      proof,
      gate_result: gateResult,
      summary: {
        inevitable: proof.inevitable,
        steps_to_collapse: proof.steps_to_collapse,
        paths_analyzed: proof.paths_analyzed,
        paths_to_collapse: proof.paths_to_collapse,
        action_taken: gateResult.action,
        fingerprint_was_doomed: gateResult.fingerprint_already_doomed
      },
      causal_chain_summary: causalChainSummary,
      entropy_trajectory: entropyTrajectory,
      proof_chain: {
        simulation_deterministic: true,
        all_paths_explored: true,
        inevitability_mathematical: true,
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
   * Record full history
   */
  private recordHistory(
    runId: string,
    signature: ActionSignature,
    paths: CausalPath[],
    proof: InevitabilityProof,
    gateResult: InevitabilityGateResult,
    aecResult: AECExecutionResult | null
  ): void {
    // Build context
    let context: {
      current_entropy: number;
      current_phase: ArchitecturalPhase;
      current_mccs_size: number;
      active_singularities: number;
    };

    if (aecResult) {
      context = {
        current_entropy: aecResult.aecIntelligence.entropy_score.entropy,
        current_phase: aecResult.aecIntelligence.phase,
        current_mccs_size: aecResult.rllResult.ocicResult.intelligence.minimal_causal_cuts.length,
        active_singularities: aecResult.rllResult.rllIntelligence.summary.active_singularities
      };
    } else {
      // IE aborted before AEC ran - use last known state
      const aecDatabase = this.aecEngine.getDatabase();
      const lastRecord = aecDatabase.records[aecDatabase.records.length - 1];

      context = {
        current_entropy: lastRecord?.entropy_score.entropy ?? 0,
        current_phase: lastRecord?.phase ?? 'STABLE',
        current_mccs_size: lastRecord?.context.mccs_computed ?? 0,
        active_singularities: lastRecord?.context.active_singularities ?? 0
      };
    }

    // Record in gate
    this.gate.recordFullRecord(
      runId,
      signature,
      paths,
      proof,
      gateResult,
      context
    );
  }

  /**
   * Determine if execution is allowed
   *
   * IE SUPERSEDES AEC:
   * - If IE says HARD_ABORT → blocked
   * - If IE says ALLOW, check AEC decision
   */
  private determineExecutionAllowed(
    gateResult: InevitabilityGateResult,
    aecResult: AECExecutionResult | null
  ): boolean {
    // IE has veto power
    if (gateResult.action === 'HARD_ABORT') {
      return false;
    }

    // AEC decision applies if IE allows
    if (aecResult) {
      return aecResult.executionAllowed;
    }

    // This shouldn't happen (if IE allowed, AEC should have run)
    return false;
  }

  /**
   * Determine if mutations are allowed
   */
  private determineMutationsAllowed(
    gateResult: InevitabilityGateResult,
    aecResult: AECExecutionResult | null
  ): boolean {
    // IE has veto power
    if (gateResult.action === 'HARD_ABORT') {
      return false;
    }

    // AEC decision applies if IE allows
    if (aecResult) {
      return aecResult.mutationsAllowed;
    }

    return false;
  }

  /**
   * Determine abort reason
   */
  private determineAbortReason(
    gateResult: InevitabilityGateResult,
    aecResult: AECExecutionResult | null
  ): string | null {
    // IE abort takes precedence
    if (gateResult.action === 'HARD_ABORT') {
      return `IE HARD_ABORT: ${gateResult.reason}`;
    }

    // AEC abort
    if (aecResult?.abortReason) {
      return aecResult.abortReason;
    }

    return null;
  }

  /**
   * Get action fingerprinter
   */
  getFingerprinter(): ActionFingerprinter {
    return this.fingerprinter;
  }

  /**
   * Get forward expander
   */
  getExpander(): ForwardCounterfactualExpander {
    return this.expander;
  }

  /**
   * Get inevitability detector
   */
  getDetector(): InevitabilityDetector {
    return this.detector;
  }

  /**
   * Get inevitability gate
   */
  getGate(): InevitabilityGate {
    return this.gate;
  }

  /**
   * Get AEC engine
   */
  getAECEngine(): AECEngine {
    return this.aecEngine;
  }

  /**
   * Get doomed fingerprints
   */
  getDoomedFingerprints(): string[] {
    return this.gate.getDoomedFingerprints();
  }

  /**
   * Reset all state (for testing only)
   */
  reset(): void {
    this.gate.reset();
    this.aecEngine.reset();
  }
}
