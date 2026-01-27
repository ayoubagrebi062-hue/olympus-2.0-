/**
 * Survivability Evaluator
 *
 * Evaluates each MCCS candidate through IE forward expansion to determine
 * if it leads to survival or collapse.
 *
 * KEY PRINCIPLE:
 * - Apply MCCS as hypothetical intervention
 * - Run IE forward expansion
 * - Reject if ANY path collapses
 *
 * A candidate is SURVIVABLE only if ALL paths avoid collapse.
 *
 * NON-NEGOTIABLE:
 * - Complete evaluation (all candidates)
 * - Deterministic
 * - No heuristics or ML
 * - No probability
 */

import type {
  MCCSCandidate,
  SurvivabilityResult,
  CausalPath,
  ArchitecturalPhase
} from './types';
import { ForwardCounterfactualExpander, SimulationContext } from './forward-expander';
import { InevitabilityDetector } from './inevitability-detector';

// NE version - immutable
const NE_VERSION = '1.0.0';
Object.freeze({ NE_VERSION });

// Simulation steps for survivability evaluation
const SURVIVABILITY_SIMULATION_STEPS = 10; // More steps for thorough evaluation

export class SurvivabilityEvaluator {
  private expander: ForwardCounterfactualExpander;
  private detector: InevitabilityDetector;

  constructor() {
    this.expander = new ForwardCounterfactualExpander(SURVIVABILITY_SIMULATION_STEPS);
    this.detector = new InevitabilityDetector();
  }

  /**
   * Evaluate all MCCS candidates for survivability
   *
   * Returns results for each candidate indicating if it leads to survival.
   */
  evaluateAll(
    candidates: MCCSCandidate[],
    baseContext: SimulationContext
  ): SurvivabilityResult[] {
    const results: SurvivabilityResult[] = [];

    for (const candidate of candidates) {
      const result = this.evaluateCandidate(candidate, baseContext);
      results.push(result);
    }

    return results;
  }

  /**
   * Evaluate a single MCCS candidate
   */
  evaluateCandidate(
    candidate: MCCSCandidate,
    baseContext: SimulationContext
  ): SurvivabilityResult {
    const now = new Date().toISOString();

    // Create modified context after applying MCCS intervention
    const interventionContext = this.applyIntervention(candidate, baseContext);

    // Simulate forward from the intervention state
    const paths = this.simulateForward(candidate, interventionContext);

    // Analyze paths for survivability
    const analysis = this.analyzePaths(paths);

    // Determine if survivable
    const survivable = analysis.paths_to_collapse === 0;

    // Find best path (if survivable)
    const bestPath = survivable
      ? this.findBestPath(paths)
      : null;

    // Determine rejection reason if not survivable
    const rejectionReason = survivable
      ? null
      : this.determineRejectionReason(analysis);

    return {
      candidate_id: candidate.candidate_id,
      mccs_id: candidate.mccs_id,
      survivable,
      rejection_reason: rejectionReason,
      paths_evaluated: paths.length,
      paths_to_collapse: analysis.paths_to_collapse,
      paths_surviving: analysis.paths_surviving,
      entropy_ceiling: analysis.entropy_ceiling,
      entropy_floor: analysis.entropy_floor,
      stabilization_step: analysis.stabilization_step,
      best_path: bestPath,
      evaluated_at: now
    };
  }

  /**
   * Apply MCCS intervention to create a new context
   *
   * This simulates what the system state would be AFTER the intervention.
   */
  private applyIntervention(
    candidate: MCCSCandidate,
    baseContext: SimulationContext
  ): SimulationContext {
    // Calculate new RSR after intervention
    const newRsr = candidate.projected_outcome.global_rsr_after;

    // Calculate new dead shapes (shapes restored are no longer dead)
    const shapesRestored = candidate.projected_outcome.shapes_restored.length;
    const newDeadShapes = Math.max(0, baseContext.current_dead_shapes - shapesRestored);

    // MCCS size becomes the intervention count
    const newMccsSize = candidate.intervention_count;

    // Estimate new entropy based on RSR improvement
    // Higher RSR = lower entropy (simplified model)
    const rsrImprovement = newRsr - baseContext.current_rsr;
    const entropyReduction = rsrImprovement * 0.5; // Each RSR point reduces entropy by half
    const newEntropy = Math.max(0, Math.min(1, baseContext.current_entropy - entropyReduction));

    // Determine new phase based on entropy
    const newPhase = this.classifyPhase(newEntropy);

    return {
      current_entropy: newEntropy,
      current_phase: newPhase,
      current_mccs_size: newMccsSize,
      current_rsr: newRsr,
      current_dead_shapes: newDeadShapes,
      current_singularities: baseContext.current_singularities,
      total_shapes: baseContext.total_shapes
    };
  }

  /**
   * Simulate forward from intervention context
   */
  private simulateForward(
    candidate: MCCSCandidate,
    context: SimulationContext
  ): CausalPath[] {
    // Create a mock OCIC intelligence with just this candidate's MCCS
    const mockOcicIntelligence = {
      ocic_version: '1.0.0',
      minimal_causal_cuts: [{
        mccs_id: candidate.mccs_id,
        computed_at: new Date().toISOString(),
        interventions: candidate.interventions,
        intervention_count: candidate.intervention_count,
        projected_outcome: {
          ...candidate.projected_outcome,
          invariants_preserved: true,
          all_tiers_compliant: true
        },
        rank: 1,
        ranking_factors: {
          intervention_count_score: candidate.intervention_count,
          rsr_gain_score: candidate.projected_outcome.rsr_gain,
          invariant_safety_score: 1.0
        },
        proof: {
          verified_via_replay: true,
          composition_id: `COMP-${candidate.candidate_id}`,
          deterministic: true as const,
          no_inference: true as const
        }
      }],
      predictive_blocks: [],
      counterfactual_compositions: [],
      intelligence_summary: {
        mccs_computed: 1,
        best_mccs_intervention_count: candidate.intervention_count,
        best_mccs_rsr_gain: candidate.projected_outcome.rsr_gain,
        predictive_blocks_issued: 0,
        compositions_evaluated: 1,
        causal_certainty_achieved: true
      },
      intelligence_proof: {
        mccs_proven_via_replay: true as const,
        predictions_evidence_based: true as const,
        no_heuristics: true as const,
        no_ml: true as const,
        no_probability: true as const,
        deterministic: true as const,
        decisions_not_suggestions: true as const
      }
    };

    // Run forward expansion
    return this.expander.expand(
      mockOcicIntelligence,
      context,
      `SURV-${candidate.candidate_id}`
    );
  }

  /**
   * Analyze paths for survivability metrics
   */
  private analyzePaths(paths: CausalPath[]): {
    paths_to_collapse: number;
    paths_surviving: number;
    entropy_ceiling: number;
    entropy_floor: number;
    stabilization_step: number;
  } {
    if (paths.length === 0) {
      return {
        paths_to_collapse: 0,
        paths_surviving: 0,
        entropy_ceiling: 1.0,
        entropy_floor: 1.0,
        stabilization_step: 0
      };
    }

    const pathsToCollapse = paths.filter(p => p.leads_to_collapse).length;
    const pathsSurviving = paths.length - pathsToCollapse;

    // Calculate entropy metrics across all paths
    let maxEntropy = 0;
    let minEntropy = 1;
    let totalStabilizationSteps = 0;

    for (const path of paths) {
      // Track max/min entropy across trajectory
      for (const entropy of path.entropy_trajectory) {
        maxEntropy = Math.max(maxEntropy, entropy);
        minEntropy = Math.min(minEntropy, entropy);
      }

      // Find stabilization step (when entropy stops changing significantly)
      const stabilization = this.findStabilizationStep(path.entropy_trajectory);
      totalStabilizationSteps += stabilization;
    }

    return {
      paths_to_collapse: pathsToCollapse,
      paths_surviving: pathsSurviving,
      entropy_ceiling: maxEntropy,
      entropy_floor: minEntropy,
      stabilization_step: Math.round(totalStabilizationSteps / paths.length)
    };
  }

  /**
   * Find the step at which entropy stabilizes
   */
  private findStabilizationStep(trajectory: number[]): number {
    const threshold = 0.01; // 1% change is considered stable

    for (let i = 1; i < trajectory.length; i++) {
      const delta = Math.abs(trajectory[i] - trajectory[i - 1]);
      if (delta < threshold) {
        return i;
      }
    }

    return trajectory.length; // Never stabilized
  }

  /**
   * Find the best surviving path
   */
  private findBestPath(paths: CausalPath[]): SurvivabilityResult['best_path'] {
    const survivingPaths = paths.filter(p => !p.leads_to_collapse);

    if (survivingPaths.length === 0) {
      return null;
    }

    // Best path = lowest terminal entropy and fastest to stable
    let bestPath = survivingPaths[0];
    let bestScore = this.calculatePathScore(bestPath);

    for (const path of survivingPaths.slice(1)) {
      const score = this.calculatePathScore(path);
      if (score < bestScore) {
        bestPath = path;
        bestScore = score;
      }
    }

    // Find steps to stable
    const stepsToStable = this.findStabilizationStep(bestPath.entropy_trajectory);

    return {
      path_id: bestPath.path_id,
      terminal_phase: bestPath.terminal_state.phase,
      terminal_entropy: bestPath.terminal_state.entropy,
      steps_to_stable: stepsToStable
    };
  }

  /**
   * Calculate path score for ranking (lower is better)
   */
  private calculatePathScore(path: CausalPath): number {
    // Score based on terminal entropy and stabilization speed
    const entropyScore = path.terminal_state.entropy;
    const stabilization = this.findStabilizationStep(path.entropy_trajectory);
    const stabilizationScore = stabilization / path.steps_simulated;

    // Weight: 70% entropy, 30% stabilization speed
    return 0.7 * entropyScore + 0.3 * stabilizationScore;
  }

  /**
   * Determine rejection reason for non-survivable candidate
   */
  private determineRejectionReason(analysis: {
    paths_to_collapse: number;
    paths_surviving: number;
    entropy_ceiling: number;
  }): string {
    if (analysis.paths_to_collapse === analysis.paths_to_collapse + analysis.paths_surviving) {
      return `All ${analysis.paths_to_collapse} paths lead to collapse.`;
    }

    const collapsePercent = (analysis.paths_to_collapse /
      (analysis.paths_to_collapse + analysis.paths_surviving) * 100).toFixed(0);

    return `${analysis.paths_to_collapse} of ${analysis.paths_to_collapse + analysis.paths_surviving} ` +
      `paths (${collapsePercent}%) lead to collapse. Entropy ceiling: ${(analysis.entropy_ceiling * 100).toFixed(1)}%.`;
  }

  /**
   * Classify phase based on entropy
   */
  private classifyPhase(entropy: number): ArchitecturalPhase {
    if (entropy <= 0.25) return 'STABLE';
    if (entropy <= 0.50) return 'DECAYING';
    if (entropy <= 0.75) return 'COLLAPSING';
    return 'DEAD';
  }

  /**
   * Get survivable candidates from results
   */
  getSurvivableCandidates(results: SurvivabilityResult[]): SurvivabilityResult[] {
    return results.filter(r => r.survivable);
  }

  /**
   * Get non-survivable candidates from results
   */
  getNonSurvivableCandidates(results: SurvivabilityResult[]): SurvivabilityResult[] {
    return results.filter(r => !r.survivable);
  }
}
