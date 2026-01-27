/**
 * TTE Controller
 *
 * Triple-Track Execution Controller.
 * Manages CANONICAL, SHADOW, and REMEDIATED execution tracks.
 *
 * Tracks are FULLY ISOLATED - no shared state, cache, or summaries.
 */

import * as crypto from 'crypto';
import type {
  ExecutionTrack,
  TrackState,
  TrackStatus,
  RepairDirective,
  TTEForkDecision,
  RSRViolation,
  ShapeRSRResult,
  CriticalityTierResult,
  PromotionEligibility,
  PromotionBlocker,
  PromotionResult
} from './types';
import type { GateResult } from '../registry/types';

export class TTEController {
  private tracks: Map<string, TrackState> = new Map();
  private canonicalLineage: string[] = [];

  /**
   * Decide whether to fork into TTE based on tier results
   */
  decideFork(tierResults: CriticalityTierResult[]): TTEForkDecision {
    const foundationalTier = tierResults.find(t => t.criticality === 'FOUNDATIONAL');
    const interactiveTier = tierResults.find(t => t.criticality === 'INTERACTIVE');

    const foundationalViolations = foundationalTier?.violations || [];
    const interactiveViolations = interactiveTier?.violations || [];

    // FOUNDATIONAL violation → BLOCK ALL
    if (foundationalViolations.length > 0) {
      return {
        fork_required: false,
        reason: 'FOUNDATIONAL RSR violation - execution completely blocked',
        canonical_blocked: true,
        shadow_allowed: false,
        remediation_possible: false,
        tracks_to_create: [],
        triggering_violations: foundationalViolations
      };
    }

    // INTERACTIVE violation → Fork TTE
    if (interactiveViolations.length > 0) {
      return {
        fork_required: true,
        reason: 'INTERACTIVE RSR violation - forking Triple-Track Execution',
        canonical_blocked: true,
        shadow_allowed: true,
        remediation_possible: true,
        tracks_to_create: ['SHADOW', 'REMEDIATED'],
        triggering_violations: interactiveViolations
      };
    }

    // No significant violations - CANONICAL proceeds
    return {
      fork_required: false,
      reason: 'All RSR laws satisfied - CANONICAL execution allowed',
      canonical_blocked: false,
      shadow_allowed: false,
      remediation_possible: false,
      tracks_to_create: ['CANONICAL'],
      triggering_violations: []
    };
  }

  /**
   * Create a new execution track.
   * Tracks are ALWAYS isolated.
   */
  createTrack(
    track: ExecutionTrack,
    parentRunId: string | null,
    gateResults: GateResult[],
    rsrResults: ShapeRSRResult[],
    repairDirective: RepairDirective | null = null
  ): TrackState {
    const runId = this.generateRunId(track);

    const state: TrackState = {
      track,
      run_id: runId,
      parent_run_id: parentRunId,
      created_at: new Date().toISOString(),
      status: 'PENDING',
      isolated: true, // Always true - IMMUTABLE
      promotable: track === 'REMEDIATED', // Only REMEDIATED can be promoted
      gate_results: gateResults,
      rsr_results: rsrResults,
      repair_directive: repairDirective
    };

    this.tracks.set(runId, state);

    if (track === 'CANONICAL' && state.status === 'PASSED') {
      this.canonicalLineage.push(runId);
    }

    return state;
  }

  /**
   * Generate a RepairDirective for a failed shape.
   * RepairDirectives are INFORMATIONAL ONLY.
   * They do NOT modify agent logic or infer missing data.
   */
  generateRepairDirective(
    rsrResult: ShapeRSRResult,
    traceResult: { extractions: Record<string, { attributes_missing: string[]; source_paths: Record<string, string> }> }
  ): RepairDirective {
    const targetExtraction = traceResult.extractions['wire'] || traceResult.extractions['pixel'];
    const blocksExtraction = traceResult.extractions['blocks'];

    return {
      directive_id: `RD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      target_shape_id: rsrResult.shape_id,
      criticality: rsrResult.criticality,
      missing_attributes: targetExtraction?.attributes_missing || [],
      degraded_attributes: [], // Computed from diffs if available
      suggested_sources: blocksExtraction
        ? Object.values(blocksExtraction.source_paths)
        : [],
      generated_at: new Date().toISOString(),
      readonly: true // Immutable
    };
  }

  /**
   * Update track status
   */
  updateTrackStatus(runId: string, status: TrackStatus): void {
    const track = this.tracks.get(runId);
    if (track) {
      // Cannot change PROMOTED or ABANDONED tracks
      if (track.status === 'PROMOTED' || track.status === 'ABANDONED') {
        return;
      }
      track.status = status;
    }
  }

  /**
   * Check if a track is eligible for promotion to CANONICAL
   */
  checkPromotionEligibility(runId: string): PromotionEligibility {
    const track = this.tracks.get(runId);

    if (!track) {
      return {
        track: 'SHADOW',
        run_id: runId,
        eligible: false,
        blockers: [{
          blocker_type: 'TRACK_TYPE',
          description: 'Track not found',
          blocking_entity: runId
        }],
        passed_gates: [],
        failed_gates: [],
        rsr_compliance: {
          foundational_met: false,
          interactive_met: false,
          enhancement_met: false
        }
      };
    }

    const blockers: PromotionBlocker[] = [];

    // Check 1: Track type - only REMEDIATED can be promoted
    if (track.track !== 'REMEDIATED') {
      blockers.push({
        blocker_type: 'TRACK_TYPE',
        description: `Only REMEDIATED tracks can be promoted. This is ${track.track}.`,
        blocking_entity: track.track
      });
    }

    // Check 2: Track must have PASSED status
    if (track.status !== 'PASSED') {
      blockers.push({
        blocker_type: 'GATE_FAILURE',
        description: `Track status is ${track.status}, must be PASSED`,
        blocking_entity: track.status
      });
    }

    // Check 3: All gates must have passed
    const passedGates: string[] = [];
    const failedGates: string[] = [];
    for (const gate of track.gate_results) {
      if (gate.verdict === 'PASS') {
        passedGates.push(gate.gate_id);
      } else {
        failedGates.push(gate.gate_id);
        blockers.push({
          blocker_type: 'GATE_FAILURE',
          description: `Gate ${gate.gate_id} verdict: ${gate.verdict}`,
          blocking_entity: gate.gate_id
        });
      }
    }

    // Check 4: RSR compliance for all tiers
    const foundationalResults = track.rsr_results.filter(r => r.criticality === 'FOUNDATIONAL');
    const interactiveResults = track.rsr_results.filter(r => r.criticality === 'INTERACTIVE');
    const enhancementResults = track.rsr_results.filter(r => r.criticality === 'ENHANCEMENT');

    const foundationalMet = foundationalResults.every(r => r.rsr_met);
    const interactiveMet = interactiveResults.every(r => r.rsr_met);
    const enhancementMet = enhancementResults.every(r => r.rsr_met);

    if (!foundationalMet) {
      for (const result of foundationalResults.filter(r => !r.rsr_met)) {
        blockers.push({
          blocker_type: 'RSR_VIOLATION',
          description: `FOUNDATIONAL shape ${result.shape_id} RSR: ${result.rsr.toFixed(2)} < ${result.required_rsr}`,
          blocking_entity: result.shape_id
        });
      }
    }

    if (!interactiveMet) {
      for (const result of interactiveResults.filter(r => !r.rsr_met)) {
        blockers.push({
          blocker_type: 'RSR_VIOLATION',
          description: `INTERACTIVE shape ${result.shape_id} RSR: ${result.rsr.toFixed(2)} < ${result.required_rsr}`,
          blocking_entity: result.shape_id
        });
      }
    }

    // Check 5: No untolerated losses
    for (const result of track.rsr_results) {
      if (result.untolerated_losses.length > 0) {
        blockers.push({
          blocker_type: 'UNTOLERATED_LOSS',
          description: `Shape ${result.shape_id} has untolerated losses: ${result.untolerated_losses.join(', ')}`,
          blocking_entity: result.shape_id
        });
      }
    }

    return {
      track: track.track,
      run_id: runId,
      eligible: blockers.length === 0,
      blockers,
      passed_gates: passedGates,
      failed_gates: failedGates,
      rsr_compliance: {
        foundational_met: foundationalMet,
        interactive_met: interactiveMet,
        enhancement_met: enhancementMet
      }
    };
  }

  /**
   * Attempt to promote a track to CANONICAL lineage
   */
  attemptPromotion(runId: string): PromotionResult {
    const eligibility = this.checkPromotionEligibility(runId);

    if (!eligibility.eligible) {
      return {
        attempted: true,
        success: false,
        source_track: eligibility.track,
        source_run_id: runId,
        target_track: 'CANONICAL',
        promoted_at: null,
        blockers: eligibility.blockers
      };
    }

    // Promote the track
    const track = this.tracks.get(runId)!;
    track.status = 'PROMOTED';
    this.canonicalLineage.push(runId);

    return {
      attempted: true,
      success: true,
      source_track: track.track,
      source_run_id: runId,
      target_track: 'CANONICAL',
      promoted_at: new Date().toISOString(),
      blockers: []
    };
  }

  /**
   * Get all active tracks
   */
  getActiveTracks(): TrackState[] {
    return Array.from(this.tracks.values()).filter(
      t => t.status !== 'ABANDONED' && t.status !== 'PROMOTED'
    );
  }

  /**
   * Get track by run ID
   */
  getTrack(runId: string): TrackState | undefined {
    return this.tracks.get(runId);
  }

  /**
   * Get canonical lineage
   */
  getCanonicalLineage(): string[] {
    return [...this.canonicalLineage];
  }

  /**
   * Abandon a track (mark it as no longer viable)
   */
  abandonTrack(runId: string): void {
    const track = this.tracks.get(runId);
    if (track && track.status !== 'PROMOTED') {
      track.status = 'ABANDONED';
    }
  }

  /**
   * Generate unique run ID for a track
   */
  private generateRunId(track: ExecutionTrack): string {
    const prefix = {
      CANONICAL: 'CAN',
      SHADOW: 'SHD',
      REMEDIATED: 'REM'
    }[track];
    return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Reset controller state (for new runs)
   */
  reset(): void {
    this.tracks.clear();
    this.canonicalLineage = [];
  }
}
