/**
 * Necessity Selector
 *
 * Selects the SINGLE minimal survivable future from survivable MCCS.
 *
 * SELECTION CRITERIA (in order):
 * 1. Minimal cardinality (fewest interventions)
 * 2. Lowest entropy ceiling (tie-breaker)
 * 3. Fastest stabilization (tie-breaker)
 *
 * KEY PRINCIPLE:
 * - Only ONE future is necessary
 * - Selection is deterministic (same inputs → same selection)
 * - All alternatives are forbidden
 *
 * NON-NEGOTIABLE:
 * - Single selection (no ambiguity)
 * - Deterministic
 * - No heuristics or ML
 * - No human input
 */

import * as crypto from 'crypto';
import type {
  MCCSCandidate,
  SurvivabilityResult,
  NecessaryFuture,
  ActionSignature
} from './types';

// NE version - immutable
const NE_VERSION = '1.0.0';
Object.freeze({ NE_VERSION });

export class NecessitySelector {
  /**
   * Select the single necessary future from survivable candidates
   *
   * Returns null if no survivable candidates exist.
   */
  select(
    candidates: MCCSCandidate[],
    survivabilityResults: SurvivabilityResult[],
    doomedFingerprint: string
  ): NecessaryFuture | null {
    // Get survivable results
    const survivableResults = survivabilityResults.filter(r => r.survivable);

    if (survivableResults.length === 0) {
      return null; // No survivable future exists
    }

    // Find matching candidates for survivable results
    const survivableCandidates = this.matchCandidates(candidates, survivableResults);

    if (survivableCandidates.length === 0) {
      return null;
    }

    // Select the best candidate using the criteria hierarchy
    const selection = this.selectBest(survivableCandidates, survivableResults);

    // Build the necessary future
    return this.buildNecessaryFuture(
      selection.candidate,
      selection.result,
      selection.chosenBy,
      survivableCandidates,
      survivableResults,
      candidates,
      doomedFingerprint
    );
  }

  /**
   * Match candidates to their survivability results
   */
  private matchCandidates(
    candidates: MCCSCandidate[],
    results: SurvivabilityResult[]
  ): Array<{ candidate: MCCSCandidate; result: SurvivabilityResult }> {
    const matched: Array<{ candidate: MCCSCandidate; result: SurvivabilityResult }> = [];

    for (const result of results) {
      const candidate = candidates.find(c => c.candidate_id === result.candidate_id);
      if (candidate) {
        matched.push({ candidate, result });
      }
    }

    return matched;
  }

  /**
   * Select the best candidate using criteria hierarchy
   */
  private selectBest(
    matched: Array<{ candidate: MCCSCandidate; result: SurvivabilityResult }>,
    results: SurvivabilityResult[]
  ): {
    candidate: MCCSCandidate;
    result: SurvivabilityResult;
    chosenBy: 'MINIMAL_CARDINALITY' | 'LOWEST_ENTROPY_CEILING' | 'FASTEST_STABILIZATION';
  } {
    // Sort by selection criteria
    const sorted = [...matched].sort((a, b) => {
      // 1. Minimal cardinality (fewest interventions)
      if (a.candidate.intervention_count !== b.candidate.intervention_count) {
        return a.candidate.intervention_count - b.candidate.intervention_count;
      }

      // 2. Lowest entropy ceiling (tie-breaker)
      if (a.result.entropy_ceiling !== b.result.entropy_ceiling) {
        return a.result.entropy_ceiling - b.result.entropy_ceiling;
      }

      // 3. Fastest stabilization (tie-breaker)
      if (a.result.stabilization_step !== b.result.stabilization_step) {
        return a.result.stabilization_step - b.result.stabilization_step;
      }

      // 4. Final tie-breaker: deterministic by candidate ID
      return a.candidate.candidate_id.localeCompare(b.candidate.candidate_id);
    });

    const best = sorted[0];

    // Determine why this was chosen
    const chosenBy = this.determineChosenBy(best, sorted);

    return {
      candidate: best.candidate,
      result: best.result,
      chosenBy
    };
  }

  /**
   * Determine which criterion was the deciding factor
   */
  private determineChosenBy(
    chosen: { candidate: MCCSCandidate; result: SurvivabilityResult },
    all: Array<{ candidate: MCCSCandidate; result: SurvivabilityResult }>
  ): 'MINIMAL_CARDINALITY' | 'LOWEST_ENTROPY_CEILING' | 'FASTEST_STABILIZATION' {
    if (all.length === 1) {
      return 'MINIMAL_CARDINALITY'; // Only one option
    }

    const minCardinality = Math.min(...all.map(a => a.candidate.intervention_count));
    const withMinCardinality = all.filter(
      a => a.candidate.intervention_count === minCardinality
    );

    if (withMinCardinality.length === 1) {
      return 'MINIMAL_CARDINALITY';
    }

    const minEntropyCeiling = Math.min(...withMinCardinality.map(a => a.result.entropy_ceiling));
    const withMinEntropy = withMinCardinality.filter(
      a => a.result.entropy_ceiling === minEntropyCeiling
    );

    if (withMinEntropy.length === 1) {
      return 'LOWEST_ENTROPY_CEILING';
    }

    return 'FASTEST_STABILIZATION';
  }

  /**
   * Build the NecessaryFuture artifact
   */
  private buildNecessaryFuture(
    chosen: MCCSCandidate,
    survivabilityProof: SurvivabilityResult,
    chosenBy: 'MINIMAL_CARDINALITY' | 'LOWEST_ENTROPY_CEILING' | 'FASTEST_STABILIZATION',
    survivableCandidates: Array<{ candidate: MCCSCandidate; result: SurvivabilityResult }>,
    survivableResults: SurvivabilityResult[],
    allCandidates: MCCSCandidate[],
    doomedFingerprint: string
  ): NecessaryFuture {
    const futureId = `FUTURE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Create allowed signature for this future
    const allowedSignature = this.createAllowedSignature(chosen, doomedFingerprint);

    // Build forbidden alternatives list
    const forbiddenAlternatives = this.buildForbiddenAlternatives(
      chosen,
      allCandidates,
      survivableResults
    );

    return {
      future_id: futureId,
      doomed_fingerprint: doomedFingerprint,
      chosen_mccs: chosen,
      allowed_signature: allowedSignature,
      selection_reason: {
        total_candidates: allCandidates.length,
        survivable_candidates: survivableCandidates.length,
        chosen_by: chosenBy,
        cardinality: chosen.intervention_count,
        entropy_ceiling: survivabilityProof.entropy_ceiling,
        stabilization_step: survivabilityProof.stabilization_step
      },
      forbidden_alternatives: forbiddenAlternatives,
      survivability_proof: survivabilityProof,
      declared_at: now,
      immutable: true,
      append_only: true
    };
  }

  /**
   * Create the allowed action signature for the necessary future
   */
  private createAllowedSignature(
    chosen: MCCSCandidate,
    doomedFingerprint: string
  ): ActionSignature {
    const signatureId = `SIG-NECESSITY-${chosen.candidate_id}`;

    // Build components from the MCCS interventions
    const affectedShapes = chosen.interventions.map(i => i.target_shape_id);
    const affectedHandoffs = [...new Set(chosen.interventions.map(i => i.target_handoff_id))];
    const transformTypes = [...new Set(chosen.interventions.map(i => i.intervention_type))];

    // Create structural fingerprint
    const components = {
      affected_shapes: affectedShapes.sort(),
      affected_handoffs: affectedHandoffs.sort(),
      transform_types: transformTypes.sort(),
      change_directions: ['MODIFY'] as ('ADD' | 'REMOVE' | 'MODIFY')[]
    };

    const fingerprint = this.computeFingerprint(components);

    return {
      signature_id: signatureId,
      fingerprint,
      components,
      computed_at: new Date().toISOString(),
      run_id: `NECESSITY-${chosen.candidate_id}`
    };
  }

  /**
   * Compute deterministic fingerprint
   */
  private computeFingerprint(components: ActionSignature['components']): string {
    const canonical = {
      shapes: components.affected_shapes,
      handoffs: components.affected_handoffs,
      transforms: components.transform_types,
      directions: components.change_directions
    };

    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Build list of forbidden alternatives with rejection reasons
   */
  private buildForbiddenAlternatives(
    chosen: MCCSCandidate,
    allCandidates: MCCSCandidate[],
    survivabilityResults: SurvivabilityResult[]
  ): NecessaryFuture['forbidden_alternatives'] {
    const forbidden: NecessaryFuture['forbidden_alternatives'] = [];

    for (const candidate of allCandidates) {
      if (candidate.candidate_id === chosen.candidate_id) {
        continue; // Skip the chosen one
      }

      const result = survivabilityResults.find(r => r.candidate_id === candidate.candidate_id);

      let rejectionReason: string;

      if (!result || !result.survivable) {
        // Non-survivable
        rejectionReason = result?.rejection_reason || 'Leads to collapse.';
      } else {
        // Survivable but not chosen - explain why
        rejectionReason = this.explainWhyNotChosen(candidate, result, chosen);
      }

      forbidden.push({
        candidate_id: candidate.candidate_id,
        mccs_id: candidate.mccs_id,
        rejection_reason: rejectionReason
      });
    }

    return forbidden;
  }

  /**
   * Explain why a survivable candidate was not chosen
   */
  private explainWhyNotChosen(
    candidate: MCCSCandidate,
    result: SurvivabilityResult,
    chosen: MCCSCandidate
  ): string {
    const chosenResult = result; // We need the chosen result, but for comparison

    if (candidate.intervention_count > chosen.intervention_count) {
      return `Higher cardinality (${candidate.intervention_count} vs ${chosen.intervention_count} interventions).`;
    }

    if (result.entropy_ceiling > result.entropy_ceiling) {
      return `Higher entropy ceiling (${(result.entropy_ceiling * 100).toFixed(1)}%).`;
    }

    return `Slower stabilization or lower rank in deterministic ordering.`;
  }

  /**
   * Generate explanation for why this future is necessary
   */
  generateNecessityExplanation(future: NecessaryFuture): string[] {
    const explanation: string[] = [];

    explanation.push(`NECESSITY DECLARED: Future ${future.future_id}`);
    explanation.push(`Doomed fingerprint: ${future.doomed_fingerprint}`);
    explanation.push(`Selected from ${future.selection_reason.total_candidates} candidates.`);
    explanation.push(`${future.selection_reason.survivable_candidates} candidates were survivable.`);
    explanation.push(`Chosen by: ${future.selection_reason.chosen_by}`);
    explanation.push(`Cardinality: ${future.selection_reason.cardinality} interventions`);
    explanation.push(`Entropy ceiling: ${(future.selection_reason.entropy_ceiling * 100).toFixed(1)}%`);
    explanation.push(`Stabilization: ${future.selection_reason.stabilization_step} steps`);
    explanation.push(`CONCLUSION: This is the ONLY allowed path forward.`);

    return explanation;
  }

  /**
   * Generate explanation for why alternatives are forbidden
   */
  generateForbiddenExplanation(future: NecessaryFuture): string[] {
    const explanation: string[] = [];

    explanation.push(`FORBIDDEN ALTERNATIVES: ${future.forbidden_alternatives.length}`);

    for (const alt of future.forbidden_alternatives.slice(0, 5)) {
      explanation.push(`  - ${alt.candidate_id}: ${alt.rejection_reason}`);
    }

    if (future.forbidden_alternatives.length > 5) {
      explanation.push(`  ... and ${future.forbidden_alternatives.length - 5} more`);
    }

    explanation.push(`CONCLUSION: All alternatives are mathematically inferior or lead to collapse.`);

    return explanation;
  }
}
