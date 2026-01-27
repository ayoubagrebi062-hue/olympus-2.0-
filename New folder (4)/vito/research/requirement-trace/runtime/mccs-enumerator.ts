/**
 * MCCS Enumerator
 *
 * Enumerates ALL MCCS variants from OCIC for a given doomed fingerprint.
 *
 * KEY PRINCIPLE:
 * - No pruning during enumeration
 * - No ranking yet (that's the Selector's job)
 * - Just enumerate all possible interventions
 *
 * NON-NEGOTIABLE:
 * - Complete enumeration (no omissions)
 * - Deterministic
 * - No heuristics or ML
 */

import type {
  MCCSCandidate,
  MinimalCausalCutSet,
  OCICIntelligence
} from './types';

// NE version - immutable
const NE_VERSION = '1.0.0';
Object.freeze({ NE_VERSION });

export class MCCSEnumerator {
  /**
   * Enumerate all MCCS candidates from OCIC intelligence
   *
   * Takes OCIC output and converts all MCCS into NE candidates.
   * No filtering, no ranking - just enumeration.
   */
  enumerate(
    ocicIntelligence: OCICIntelligence,
    doomedFingerprint: string
  ): MCCSCandidate[] {
    const candidates: MCCSCandidate[] = [];
    const now = new Date().toISOString();

    // Get all MCCS from OCIC
    const mccsList = ocicIntelligence.minimal_causal_cuts;

    if (mccsList.length === 0) {
      // No MCCS available - no candidates
      return candidates;
    }

    // Convert each MCCS to a candidate
    for (const mccs of mccsList) {
      const candidate = this.convertToCandidate(mccs, doomedFingerprint, now);
      candidates.push(candidate);
    }

    // Sort by MCCS ID for determinism
    return candidates.sort((a, b) => a.mccs_id.localeCompare(b.mccs_id));
  }

  /**
   * Convert MCCS to NE candidate
   */
  private convertToCandidate(
    mccs: MinimalCausalCutSet,
    doomedFingerprint: string,
    timestamp: string
  ): MCCSCandidate {
    const candidateId = `CAND-${doomedFingerprint.substring(0, 8)}-${mccs.mccs_id}`;

    return {
      candidate_id: candidateId,
      mccs_id: mccs.mccs_id,
      interventions: mccs.interventions,
      intervention_count: mccs.intervention_count,
      projected_outcome: {
        global_rsr_before: mccs.projected_outcome.global_rsr_before,
        global_rsr_after: mccs.projected_outcome.global_rsr_after,
        rsr_gain: mccs.projected_outcome.rsr_gain,
        shapes_restored: mccs.projected_outcome.shapes_restored
      },
      enumerated_at: timestamp
    };
  }

  /**
   * Get enumeration summary
   */
  getSummary(candidates: MCCSCandidate[]): {
    total_candidates: number;
    total_interventions: number;
    average_cardinality: number;
    min_cardinality: number;
    max_cardinality: number;
  } {
    if (candidates.length === 0) {
      return {
        total_candidates: 0,
        total_interventions: 0,
        average_cardinality: 0,
        min_cardinality: 0,
        max_cardinality: 0
      };
    }

    const totalInterventions = candidates.reduce(
      (sum, c) => sum + c.intervention_count, 0
    );
    const cardinalities = candidates.map(c => c.intervention_count);

    return {
      total_candidates: candidates.length,
      total_interventions: totalInterventions,
      average_cardinality: totalInterventions / candidates.length,
      min_cardinality: Math.min(...cardinalities),
      max_cardinality: Math.max(...cardinalities)
    };
  }
}
