/**
 * RSR Computer
 *
 * Computes Requirement Survival Rate per shape using STRUCTURAL ATTRIBUTE RATIO.
 * NO inference. NO softening. Deterministic computation.
 */

import type {
  ShapeCriticality,
  ShapeRSRResult,
  RSRViolation,
  CriticalityTierResult,
  EnforcementAction,
  RSR_LAWS
} from './types';
import { RSR_LAWS as LAWS } from './types';
import type { ShapeTraceResult } from '../registry/types';
import type { CriticalShapeDeclaration } from '../registry/shapes';
import type { LossClass, TracedAgentId } from '../types';

export class RSRComputer {
  /**
   * Compute RSR for a single shape.
   *
   * RSR = attributes_at_target_stage / attributes_at_strategos
   *
   * This is STRUCTURAL ATTRIBUTE RATIO - no inference, no softening.
   */
  computeShapeRSR(
    shape: CriticalShapeDeclaration,
    traceResult: ShapeTraceResult
  ): ShapeRSRResult {
    const criticality = shape.criticality;
    const law = LAWS[criticality];

    // Get attribute counts
    const strategosExtraction = traceResult.extractions['strategos'];
    const targetStage = shape.survival.must_reach_stage;
    const targetExtraction = traceResult.extractions[targetStage];

    // Count attributes at each stage
    const attributesAtStrategos = Math.max(
      strategosExtraction?.attributes_found.length || 0,
      1 // Avoid division by zero; if no attributes at strategos, RSR is 0
    );
    const attributesAtTarget = targetExtraction?.attributes_found.length || 0;

    // Compute RSR
    const rsr = attributesAtTarget / shape.attributes.required.length;

    // Collect all loss classes detected
    const lossClassesDetected: LossClass[] = [];
    for (const handoff of Object.values(traceResult.handoff_losses)) {
      if (handoff.loss_class) {
        lossClassesDetected.push(handoff.loss_class);
      }
    }

    // Determine tolerated vs untolerated losses
    const toleratedLosses = lossClassesDetected.filter(
      lc => law.tolerated_losses.includes(lc)
    );
    const untoleratedLosses = lossClassesDetected.filter(
      lc => !law.tolerated_losses.includes(lc)
    );

    // Check if RSR meets threshold
    const rsrMet = rsr >= law.min_rsr && untoleratedLosses.length === 0;

    // Create violation if not met
    let violation: RSRViolation | null = null;
    if (!rsrMet) {
      violation = {
        shape_id: shape.id,
        criticality,
        actual_rsr: rsr,
        required_rsr: law.min_rsr,
        deficit: law.min_rsr - rsr,
        untolerated_losses: untoleratedLosses,
        enforcement_action: law.violation_action
      };
    }

    return {
      shape_id: shape.id,
      criticality,
      rsr,
      required_rsr: law.min_rsr,
      rsr_met: rsrMet,
      attributes_at_strategos: strategosExtraction?.attributes_found.length || 0,
      attributes_at_target: attributesAtTarget,
      loss_classes_detected: lossClassesDetected,
      tolerated_losses: toleratedLosses,
      untolerated_losses: untoleratedLosses,
      violation
    };
  }

  /**
   * Compute RSR results for all shapes
   */
  computeAllShapeRSR(
    shapes: CriticalShapeDeclaration[],
    traceResults: Record<string, ShapeTraceResult>
  ): ShapeRSRResult[] {
    return shapes.map(shape => {
      const traceResult = traceResults[shape.id];
      if (!traceResult) {
        // Shape not traced - immediate violation
        return this.createMissingTraceResult(shape);
      }
      return this.computeShapeRSR(shape, traceResult);
    });
  }

  /**
   * Aggregate RSR results by criticality tier
   */
  aggregateByTier(rsrResults: ShapeRSRResult[]): CriticalityTierResult[] {
    const tiers: ShapeCriticality[] = ['FOUNDATIONAL', 'INTERACTIVE', 'ENHANCEMENT'];

    return tiers.map(criticality => {
      const tierShapes = rsrResults.filter(r => r.criticality === criticality);
      const law = LAWS[criticality];

      if (tierShapes.length === 0) {
        return {
          criticality,
          shapes: [],
          aggregate_rsr: 1.0,
          required_rsr: law.min_rsr,
          tier_met: true,
          enforcement_action: law.violation_action,
          violations: []
        };
      }

      // Aggregate RSR is the MINIMUM across all shapes in tier
      // This ensures no shape can hide behind aggregates
      const aggregateRsr = Math.min(...tierShapes.map(s => s.rsr));

      // Collect all violations
      const violations = tierShapes
        .filter(s => s.violation !== null)
        .map(s => s.violation!);

      // Tier is met only if ALL shapes in tier pass
      const tierMet = tierShapes.every(s => s.rsr_met);

      return {
        criticality,
        shapes: tierShapes,
        aggregate_rsr: aggregateRsr,
        required_rsr: law.min_rsr,
        tier_met: tierMet,
        enforcement_action: tierMet ? 'WARN_ONLY' : law.violation_action,
        violations
      };
    });
  }

  /**
   * Compute global RSR (informational only, not for enforcement)
   */
  computeGlobalRSR(rsrResults: ShapeRSRResult[]): number {
    if (rsrResults.length === 0) return 0;
    const sum = rsrResults.reduce((acc, r) => acc + r.rsr, 0);
    return sum / rsrResults.length;
  }

  /**
   * Create result for missing trace
   */
  private createMissingTraceResult(shape: CriticalShapeDeclaration): ShapeRSRResult {
    const law = LAWS[shape.criticality];

    return {
      shape_id: shape.id,
      criticality: shape.criticality,
      rsr: 0,
      required_rsr: law.min_rsr,
      rsr_met: false,
      attributes_at_strategos: 0,
      attributes_at_target: 0,
      loss_classes_detected: ['L0_TOTAL_OMISSION'],
      tolerated_losses: [],
      untolerated_losses: ['L0_TOTAL_OMISSION'],
      violation: {
        shape_id: shape.id,
        criticality: shape.criticality,
        actual_rsr: 0,
        required_rsr: law.min_rsr,
        deficit: law.min_rsr,
        untolerated_losses: ['L0_TOTAL_OMISSION'],
        enforcement_action: law.violation_action
      }
    };
  }
}
