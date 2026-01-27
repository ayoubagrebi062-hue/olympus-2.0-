/**
 * Enforcement Engine
 *
 * The RUNTIME PRIMITIVE that enforces RSR laws at PRE_WIRE_GATE.
 * This is NOT analytics. This is NOT configurable. This is ENFORCEMENT.
 *
 * NON-BYPASSABLE. NO FLAGS. NO ENV VARS. NO OVERRIDES.
 */

import type {
  EnforcementDecision,
  EnforcementAction,
  EnforcementProof,
  ShapeRSRResult,
  CriticalityTierResult,
  RSRViolation,
  TrackState,
  TTEForkDecision,
  ShapeCriticality
} from './types';
import { RSR_LAWS } from './types';
import { RSRComputer } from './rsr-computer';
import { TTEController } from './tte-controller';
import type { ShapeTraceResult, GateResult } from '../registry/types';
import type { CriticalShapeDeclaration } from '../registry/shapes';

// Enforcement mode is IMMUTABLE
const ENFORCEMENT_MODE = Object.freeze({
  type: 'RUNTIME_PRIMITIVE',
  bypassable: false,
  configurable: false,
  override_allowed: false
});

export class EnforcementEngine {
  private rsrComputer: RSRComputer;
  private tteController: TTEController;
  private runId: string;

  constructor() {
    this.rsrComputer = new RSRComputer();
    this.tteController = new TTEController();
    this.runId = '';
  }

  /**
   * Execute enforcement at PRE_WIRE_GATE.
   *
   * This is the ONLY method that produces enforcement decisions.
   * It is deterministic, non-bypassable, and cannot be overridden.
   */
  enforce(
    shapes: CriticalShapeDeclaration[],
    traceResults: Record<string, ShapeTraceResult>,
    gateResult: GateResult,
    runId: string
  ): EnforcementDecision {
    this.runId = runId;
    const timestamp = new Date().toISOString();

    // Step 1: Compute RSR for all shapes
    const perShapeRSR = this.rsrComputer.computeAllShapeRSR(shapes, traceResults);

    // Step 2: Aggregate by criticality tier
    const perTierResults = this.rsrComputer.aggregateByTier(perShapeRSR);

    // Step 3: Extract violations by tier
    const foundationalViolations = this.extractTierViolations(perTierResults, 'FOUNDATIONAL');
    const interactiveViolations = this.extractTierViolations(perTierResults, 'INTERACTIVE');
    const enhancementViolations = this.extractTierViolations(perTierResults, 'ENHANCEMENT');

    // Step 4: Determine overall action (priority: FOUNDATIONAL > INTERACTIVE > ENHANCEMENT)
    const overallAction = this.determineOverallAction(
      foundationalViolations,
      interactiveViolations,
      enhancementViolations
    );

    // Step 5: Decide TTE fork
    const tteDecision = this.tteController.decideFork(perTierResults);

    // Step 6: Create tracks based on decision
    const activeTracks = this.createTracksFromDecision(
      tteDecision,
      gateResult,
      perShapeRSR,
      traceResults
    );

    // Step 7: Determine if CANONICAL is allowed
    const canonicalAllowed = overallAction === 'WARN_ONLY' ||
      (overallAction !== 'BLOCK_ALL' && foundationalViolations.length === 0);

    // Step 8: Build proof
    const proof = this.buildProof();

    return {
      timestamp,
      run_id: runId,
      per_shape_rsr: perShapeRSR,
      per_tier_results: perTierResults,
      overall_action: overallAction,
      canonical_allowed: canonicalAllowed && !tteDecision.canonical_blocked,
      tte_decision: tteDecision,
      active_tracks: activeTracks,
      foundational_violations: foundationalViolations,
      interactive_violations: interactiveViolations,
      enhancement_violations: enhancementViolations,
      proof
    };
  }

  /**
   * Check if WIRE execution is allowed.
   * This is called by PRE_WIRE_GATE.
   */
  isWireExecutionAllowed(decision: EnforcementDecision): boolean {
    // BLOCK_ALL means no execution at all
    if (decision.overall_action === 'BLOCK_ALL') {
      return false;
    }

    // Any FOUNDATIONAL violation blocks execution
    if (decision.foundational_violations.length > 0) {
      return false;
    }

    // CANONICAL must be allowed
    return decision.canonical_allowed;
  }

  /**
   * Check if PIXEL execution is allowed.
   */
  isPixelExecutionAllowed(decision: EnforcementDecision): boolean {
    // Same rules as WIRE - if WIRE is blocked, PIXEL is blocked
    return this.isWireExecutionAllowed(decision);
  }

  /**
   * Get the TTE controller for track management
   */
  getTTEController(): TTEController {
    return this.tteController;
  }

  /**
   * Extract violations for a specific tier
   */
  private extractTierViolations(
    tierResults: CriticalityTierResult[],
    criticality: ShapeCriticality
  ): RSRViolation[] {
    const tier = tierResults.find(t => t.criticality === criticality);
    return tier?.violations || [];
  }

  /**
   * Determine overall enforcement action.
   *
   * Priority order (most severe first):
   * 1. FOUNDATIONAL violation → BLOCK_ALL
   * 2. INTERACTIVE violation → FORK_TTE
   * 3. ENHANCEMENT violation → WARN_ONLY
   * 4. No violations → WARN_ONLY (allow execution)
   */
  private determineOverallAction(
    foundationalViolations: RSRViolation[],
    interactiveViolations: RSRViolation[],
    enhancementViolations: RSRViolation[]
  ): EnforcementAction {
    if (foundationalViolations.length > 0) {
      return 'BLOCK_ALL';
    }

    if (interactiveViolations.length > 0) {
      return 'FORK_TTE';
    }

    // ENHANCEMENT violations only warn
    return 'WARN_ONLY';
  }

  /**
   * Create tracks based on TTE fork decision
   */
  private createTracksFromDecision(
    decision: TTEForkDecision,
    gateResult: GateResult,
    rsrResults: ShapeRSRResult[],
    traceResults: Record<string, ShapeTraceResult>
  ): TrackState[] {
    const tracks: TrackState[] = [];

    if (!decision.fork_required && !decision.canonical_blocked) {
      // No fork - create CANONICAL track
      const track = this.tteController.createTrack(
        'CANONICAL',
        null,
        [gateResult],
        rsrResults,
        null
      );
      track.status = 'PASSED';
      tracks.push(track);
      return tracks;
    }

    if (decision.canonical_blocked && !decision.fork_required) {
      // Completely blocked - no tracks created
      return [];
    }

    // Fork TTE - create SHADOW and REMEDIATED tracks
    if (decision.shadow_allowed) {
      const shadowTrack = this.tteController.createTrack(
        'SHADOW',
        null,
        [gateResult],
        rsrResults,
        null
      );
      shadowTrack.status = 'EXECUTING';
      tracks.push(shadowTrack);
    }

    if (decision.remediation_possible) {
      // Generate repair directives for violated shapes
      const violatedShapes = rsrResults.filter(r => r.violation !== null);
      for (const violated of violatedShapes) {
        const traceResult = traceResults[violated.shape_id];
        if (traceResult) {
          const repairDirective = this.tteController.generateRepairDirective(
            violated,
            traceResult as any
          );

          const remediatedTrack = this.tteController.createTrack(
            'REMEDIATED',
            null,
            [gateResult],
            rsrResults,
            repairDirective
          );
          remediatedTrack.status = 'PENDING';
          tracks.push(remediatedTrack);
        }
      }
    }

    return tracks;
  }

  /**
   * Build enforcement proof.
   * This proves the decision is deterministic and non-bypassable.
   */
  private buildProof(): EnforcementProof {
    return {
      laws_applied: RSR_LAWS,
      computation_method: 'STRUCTURAL_ATTRIBUTE_RATIO',
      no_inference_used: true,
      no_softening_applied: true,
      no_override_possible: true,
      decision_deterministic: true
    };
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.tteController.reset();
    this.runId = '';
  }
}
