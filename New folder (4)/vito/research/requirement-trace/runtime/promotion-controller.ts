/**
 * Promotion Controller
 *
 * Controls promotion of REMEDIATED tracks to CANONICAL lineage.
 *
 * PROMOTION RULES (IMMUTABLE):
 * 1. Only REMEDIATED tracks can be promoted
 * 2. Track must have PASSED status
 * 3. ALL gates must pass
 * 4. ALL FOUNDATIONAL RSR laws must be satisfied
 * 5. ALL INTERACTIVE RSR laws must be satisfied
 * 6. No untolerated losses allowed
 *
 * These rules are NON-NEGOTIABLE.
 */

import type {
  PromotionEligibility,
  PromotionResult,
  PromotionBlocker,
  TrackState,
  ShapeRSRResult,
  ExecutionTrack
} from './types';
import { RSR_LAWS } from './types';
import { TTEController } from './tte-controller';

// Promotion rules are IMMUTABLE
const PROMOTION_RULES = Object.freeze({
  allowed_source_tracks: ['REMEDIATED'] as ExecutionTrack[],
  required_status: 'PASSED' as const,
  all_gates_must_pass: true,
  foundational_must_be_met: true,
  interactive_must_be_met: true,
  no_untolerated_losses: true
});

Object.freeze(PROMOTION_RULES);

export class PromotionController {
  private tteController: TTEController;

  constructor(tteController: TTEController) {
    this.tteController = tteController;
  }

  /**
   * Evaluate all tracks for promotion eligibility
   */
  evaluateAllTracks(): PromotionEligibility[] {
    const activeTracks = this.tteController.getActiveTracks();
    return activeTracks.map(track =>
      this.tteController.checkPromotionEligibility(track.run_id)
    );
  }

  /**
   * Get all promotable tracks
   */
  getPromotableTracks(): PromotionEligibility[] {
    return this.evaluateAllTracks().filter(e => e.eligible);
  }

  /**
   * Attempt to promote the best eligible track.
   * Returns the first successful promotion or null.
   */
  promoteFirstEligible(): PromotionResult | null {
    const promotable = this.getPromotableTracks();

    if (promotable.length === 0) {
      return null;
    }

    // Promote the first eligible track
    const toPromote = promotable[0];
    return this.tteController.attemptPromotion(toPromote.run_id);
  }

  /**
   * Promote a specific track by run ID
   */
  promoteTrack(runId: string): PromotionResult {
    return this.tteController.attemptPromotion(runId);
  }

  /**
   * Check if any track is eligible for promotion
   */
  hasPromotableTrack(): boolean {
    return this.getPromotableTracks().length > 0;
  }

  /**
   * Get promotion summary for all tracks
   */
  getPromotionSummary(): {
    total_tracks: number;
    eligible_count: number;
    blocked_count: number;
    common_blockers: Record<string, number>;
  } {
    const eligibilities = this.evaluateAllTracks();
    const eligible = eligibilities.filter(e => e.eligible);
    const blocked = eligibilities.filter(e => !e.eligible);

    // Count common blockers
    const blockerCounts: Record<string, number> = {};
    for (const e of blocked) {
      for (const b of e.blockers) {
        const key = `${b.blocker_type}:${b.description}`;
        blockerCounts[key] = (blockerCounts[key] || 0) + 1;
      }
    }

    return {
      total_tracks: eligibilities.length,
      eligible_count: eligible.length,
      blocked_count: blocked.length,
      common_blockers: blockerCounts
    };
  }

  /**
   * Generate promotion report for a specific track
   */
  generatePromotionReport(runId: string): {
    eligibility: PromotionEligibility;
    rules_checked: typeof PROMOTION_RULES;
    detailed_analysis: {
      track_type_check: boolean;
      status_check: boolean;
      gates_check: boolean;
      foundational_check: boolean;
      interactive_check: boolean;
      loss_check: boolean;
    };
  } {
    const eligibility = this.tteController.checkPromotionEligibility(runId);
    const track = this.tteController.getTrack(runId);

    const detailedAnalysis = {
      track_type_check: track?.track === 'REMEDIATED',
      status_check: track?.status === 'PASSED',
      gates_check: eligibility.failed_gates.length === 0,
      foundational_check: eligibility.rsr_compliance.foundational_met,
      interactive_check: eligibility.rsr_compliance.interactive_met,
      loss_check: !eligibility.blockers.some(b => b.blocker_type === 'UNTOLERATED_LOSS')
    };

    return {
      eligibility,
      rules_checked: PROMOTION_RULES,
      detailed_analysis: detailedAnalysis
    };
  }

  /**
   * Abandon all non-promotable REMEDIATED tracks
   */
  abandonNonPromotable(): string[] {
    const abandoned: string[] = [];
    const eligibilities = this.evaluateAllTracks();

    for (const e of eligibilities) {
      if (!e.eligible && e.track === 'REMEDIATED') {
        this.tteController.abandonTrack(e.run_id);
        abandoned.push(e.run_id);
      }
    }

    return abandoned;
  }

  /**
   * Get canonical lineage
   */
  getCanonicalLineage(): string[] {
    return this.tteController.getCanonicalLineage();
  }
}
