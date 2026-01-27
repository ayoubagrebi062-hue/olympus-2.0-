/**
 * Counterfactual Shadow Replay Engine
 *
 * Executes COUNTERFACTUAL track - read-only, structural-only replay
 * to prove causality of shape loss.
 *
 * NON-NEGOTIABLE:
 * - NO codegen, NO side effects
 * - Read-only structural simulation only
 * - Used ONLY to prove causality
 * - Does NOT modify execution
 * - Does NOT change enforcement decisions
 * - Deterministic behavior only
 */

import type {
  CounterfactualScenario,
  CounterfactualResult,
  ShapeKind,
  ShapeCriticality,
  CausalFingerprint
} from './types';
import type { ShapeTraceResult, ShapeDeclaration } from '../registry/types';
import type { LossClass, HandoffId, TracedAgentId } from '../types';
import { INVARIANT_SHAPES } from '../registry/shapes';

// OFEL version - immutable
const OFEL_VERSION = '1.0.0';
Object.freeze({ OFEL_VERSION });

/**
 * Counterfactual Replay Engine
 *
 * Simulates alternative execution paths to prove causality.
 * STRUCTURAL ONLY - no actual code execution.
 */
export class CounterfactualReplayEngine {
  private invariantShapeIds: Set<string>;

  constructor() {
    this.invariantShapeIds = new Set(INVARIANT_SHAPES.map(s => s.id));
  }

  /**
   * Execute counterfactual replay for a specific scenario
   */
  executeReplay(
    scenario: CounterfactualScenario,
    shape: ShapeDeclaration,
    traceResult: ShapeTraceResult,
    targetHandoff: HandoffId,
    fingerprint?: CausalFingerprint
  ): CounterfactualResult {
    const timestamp = new Date().toISOString();

    // Compute baseline (actual execution)
    const baseline = this.computeBaseline(traceResult, targetHandoff);

    // Compute counterfactual (simulated execution)
    const counterfactual = this.computeCounterfactual(
      scenario,
      shape,
      traceResult,
      targetHandoff,
      fingerprint
    );

    // Compute causal impact
    const causalImpact = this.computeCausalImpact(baseline, counterfactual);

    return {
      scenario,
      target_shape_id: shape.id,
      target_handoff_id: targetHandoff,
      timestamp,

      baseline,
      counterfactual,
      causal_impact: causalImpact,

      // Proof - these are always true
      proof: {
        replay_deterministic: true,
        no_side_effects: true,
        structural_only: true,
        read_only: true
      }
    };
  }

  /**
   * Execute all applicable counterfactual scenarios for a shape
   */
  executeAllScenarios(
    shape: ShapeDeclaration & { kind?: ShapeKind },
    traceResult: ShapeTraceResult,
    targetHandoff: HandoffId,
    fingerprint?: CausalFingerprint
  ): CounterfactualResult[] {
    const results: CounterfactualResult[] = [];

    // Determine applicable scenarios based on shape and trace
    const applicableScenarios = this.getApplicableScenarios(
      shape,
      traceResult,
      fingerprint
    );

    for (const scenario of applicableScenarios) {
      const result = this.executeReplay(
        scenario,
        shape,
        traceResult,
        targetHandoff,
        fingerprint
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Compute baseline (actual execution state)
   */
  private computeBaseline(
    traceResult: ShapeTraceResult,
    targetHandoff: HandoffId
  ): CounterfactualResult['baseline'] {
    const targetAgent = this.getTargetAgent(targetHandoff);
    const extraction = traceResult.extractions[targetAgent];

    const survived = extraction !== undefined && extraction.present;

    const attributesPresent = extraction?.attributes_found.length ?? 0;
    // Get total required attributes from handoff loss if available
    const handoffLoss = traceResult.handoff_losses[targetHandoff];
    const attributesRequired = attributesPresent + (handoffLoss?.attributes_lost.length ?? 0);

    const rsr = attributesRequired > 0
      ? attributesPresent / attributesRequired
      : traceResult.rsr;

    // Get loss class from handoff
    const lossClass = handoffLoss?.loss_class ?? traceResult.survival_status.failure_class;

    return {
      survived,
      rsr,
      attributes_present: attributesPresent,
      attributes_required: attributesRequired,
      loss_class: lossClass
    };
  }

  /**
   * Compute counterfactual (simulated execution state)
   */
  private computeCounterfactual(
    scenario: CounterfactualScenario,
    shape: ShapeDeclaration,
    traceResult: ShapeTraceResult,
    targetHandoff: HandoffId,
    fingerprint?: CausalFingerprint
  ): CounterfactualResult['counterfactual'] {
    switch (scenario) {
      case 'SUMMARIZATION_REMOVED':
        return this.simulateSummarizationRemoved(shape, traceResult, targetHandoff, fingerprint);

      case 'INVARIANT_BYPASSED':
        return this.simulateInvariantBypassed(shape, traceResult, targetHandoff);

      case 'FULL_ATTRIBUTE_PRESERVATION':
        return this.simulateFullPreservation(shape, traceResult, targetHandoff);

      default:
        // Exhaustive check
        const _exhaustive: never = scenario;
        throw new Error(`Unknown scenario: ${_exhaustive}`);
    }
  }

  /**
   * Simulate: What if summarization was NOT invoked?
   *
   * Assumes all attributes would survive if summarization didn't compress/omit data.
   */
  private simulateSummarizationRemoved(
    shape: ShapeDeclaration,
    traceResult: ShapeTraceResult,
    targetHandoff: HandoffId,
    fingerprint?: CausalFingerprint
  ): CounterfactualResult['counterfactual'] {
    // If summarization wasn't invoked, this scenario doesn't apply
    if (!fingerprint?.summarization_invoked) {
      return this.computeBaseline(traceResult, targetHandoff);
    }

    // Get source extraction (before handoff)
    const sourceAgent = this.getSourceAgent(targetHandoff);
    const sourceExtraction = traceResult.extractions[sourceAgent];

    // Assume all attributes from source would survive without summarization
    const attributesPresent = sourceExtraction?.attributes_found.length ?? 0;
    const attributesRequired = shape.attributes.required.length + shape.attributes.optional.length;

    const rsr = attributesRequired > 0
      ? attributesPresent / attributesRequired
      : 0;

    const survived = attributesPresent > 0;

    // If all attributes present, no loss
    const lossClass: LossClass | null = survived && rsr < 1.0
      ? 'L1_PARTIAL_CAPTURE'
      : null;

    return {
      survived,
      rsr,
      attributes_present: attributesPresent,
      attributes_required: attributesRequired,
      loss_class: lossClass
    };
  }

  /**
   * Simulate: What if invariant bypass WAS allowed?
   *
   * NOTE: This is a PROOF scenario only. Invariant bypass is NEVER allowed
   * in actual execution. This shows what WOULD happen if the protection
   * was removed - used to prove the invariant protection is necessary.
   */
  private simulateInvariantBypassed(
    shape: ShapeDeclaration,
    traceResult: ShapeTraceResult,
    targetHandoff: HandoffId
  ): CounterfactualResult['counterfactual'] {
    // If not an invariant shape, scenario doesn't change anything
    if (!this.invariantShapeIds.has(shape.id)) {
      return this.computeBaseline(traceResult, targetHandoff);
    }

    // Simulate: Without invariant protection, shape would be subject to
    // normal summarization rules. Assume worst case - shape gets summarized
    // and loses specificity.

    const baseline = this.computeBaseline(traceResult, targetHandoff);

    // Simulate 50% attribute loss from summarization
    const simulatedAttributeCount = Math.floor(baseline.attributes_present * 0.5);
    const attributesRequired = shape.attributes.required.length + shape.attributes.optional.length;

    const rsr = attributesRequired > 0
      ? simulatedAttributeCount / attributesRequired
      : 0;

    return {
      survived: simulatedAttributeCount > 0,
      rsr,
      attributes_present: simulatedAttributeCount,
      attributes_required: attributesRequired,
      loss_class: rsr < 1.0 ? 'L3_SPECIFICITY_LOSS' : null
    };
  }

  /**
   * Simulate: What if ALL attributes were preserved?
   *
   * Shows ideal state - all attributes survive handoff.
   * Used to compute maximum possible RSR improvement.
   */
  private simulateFullPreservation(
    shape: ShapeDeclaration,
    traceResult: ShapeTraceResult,
    _targetHandoff: HandoffId
  ): CounterfactualResult['counterfactual'] {
    const attributesRequired = shape.attributes.required.length + shape.attributes.optional.length;

    return {
      survived: true,
      rsr: 1.0,
      attributes_present: attributesRequired,
      attributes_required: attributesRequired,
      loss_class: null
    };
  }

  /**
   * Compute causal impact by comparing baseline to counterfactual
   */
  private computeCausalImpact(
    baseline: CounterfactualResult['baseline'],
    counterfactual: CounterfactualResult['counterfactual']
  ): CounterfactualResult['causal_impact'] {
    const survivalChanged = baseline.survived !== counterfactual.survived;
    const rsrDelta = counterfactual.rsr - baseline.rsr;

    // Would this counterfactual have prevented the loss?
    const wouldHavePreventedLoss =
      !baseline.survived && counterfactual.survived ||
      baseline.loss_class !== null && counterfactual.loss_class === null;

    // Causal factor is confirmed if the counterfactual shows improvement
    const causalFactorConfirmed = rsrDelta > 0 || wouldHavePreventedLoss;

    return {
      survival_changed: survivalChanged,
      rsr_delta: rsrDelta,
      would_have_prevented_loss: wouldHavePreventedLoss,
      causal_factor_confirmed: causalFactorConfirmed
    };
  }

  /**
   * Get applicable scenarios for a shape
   */
  private getApplicableScenarios(
    shape: ShapeDeclaration & { kind?: ShapeKind },
    traceResult: ShapeTraceResult,
    fingerprint?: CausalFingerprint
  ): CounterfactualScenario[] {
    const scenarios: CounterfactualScenario[] = [];

    // Always include FULL_ATTRIBUTE_PRESERVATION as reference
    scenarios.push('FULL_ATTRIBUTE_PRESERVATION');

    // SUMMARIZATION_REMOVED only if summarization was invoked
    if (fingerprint?.summarization_invoked) {
      scenarios.push('SUMMARIZATION_REMOVED');
    }

    // INVARIANT_BYPASSED only for invariant shapes
    if (shape.kind === 'INVARIANT' || this.invariantShapeIds.has(shape.id)) {
      scenarios.push('INVARIANT_BYPASSED');
    }

    return scenarios;
  }

  /**
   * Get source agent for handoff
   */
  private getSourceAgent(handoffId: HandoffId): TracedAgentId {
    const mapping: Record<HandoffId, TracedAgentId> = {
      H1: 'strategos',
      H2: 'scope',
      H3: 'cartographer',
      H4: 'blocks',
      H5: 'wire'
    };
    return mapping[handoffId];
  }

  /**
   * Get target agent for handoff
   */
  private getTargetAgent(handoffId: HandoffId): TracedAgentId {
    const mapping: Record<HandoffId, TracedAgentId> = {
      H1: 'scope',
      H2: 'cartographer',
      H3: 'blocks',
      H4: 'wire',
      H5: 'pixel'
    };
    return mapping[handoffId];
  }

  /**
   * Aggregate counterfactual results for a run
   */
  aggregateResults(
    results: CounterfactualResult[]
  ): CounterfactualAggregation {
    const totalReplays = results.length;
    const causalFactorsConfirmed = results.filter(
      r => r.causal_impact.causal_factor_confirmed
    ).length;
    const preventableLosses = results.filter(
      r => r.causal_impact.would_have_prevented_loss
    ).length;

    const byScenario: Record<CounterfactualScenario, number> = {
      'SUMMARIZATION_REMOVED': 0,
      'INVARIANT_BYPASSED': 0,
      'FULL_ATTRIBUTE_PRESERVATION': 0
    };

    for (const result of results) {
      if (result.causal_impact.causal_factor_confirmed) {
        byScenario[result.scenario]++;
      }
    }

    const avgRsrImprovement = results.length > 0
      ? results.reduce((sum, r) => sum + r.causal_impact.rsr_delta, 0) / results.length
      : 0;

    return {
      total_replays: totalReplays,
      causal_factors_confirmed: causalFactorsConfirmed,
      preventable_losses: preventableLosses,
      by_scenario: byScenario,
      avg_rsr_improvement: avgRsrImprovement
    };
  }
}

/**
 * Aggregated counterfactual results
 */
export interface CounterfactualAggregation {
  total_replays: number;
  causal_factors_confirmed: number;
  preventable_losses: number;
  by_scenario: Record<CounterfactualScenario, number>;
  avg_rsr_improvement: number;
}
