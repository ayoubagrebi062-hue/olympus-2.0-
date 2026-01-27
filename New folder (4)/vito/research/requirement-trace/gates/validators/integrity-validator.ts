/**
 * Integrity Validator
 *
 * Validates overall shape integrity at checkpoints.
 */

import type { ShapeDeclaration, ShapeTraceResult, ShapeExtractionResult, FatalViolation } from '../../registry/types';
import type { TracedAgentId, HandoffId } from '../../types';

export interface IntegrityValidationResult {
  shape_id: string;
  checkpoint: TracedAgentId;
  passed: boolean;
  attributes_present: number;
  attributes_required: number;
  completeness_ratio: number;
  violation: FatalViolation | null;
}

export class IntegrityValidator {
  /**
   * Validate shape integrity at a specific checkpoint
   */
  validateAtCheckpoint(
    shape: ShapeDeclaration,
    traceResult: ShapeTraceResult,
    checkpoint: TracedAgentId
  ): IntegrityValidationResult {
    const extraction = traceResult.extractions[checkpoint];
    const requiredCount = shape.attributes.required.length;

    if (!extraction || !extraction.present) {
      return {
        shape_id: shape.id,
        checkpoint,
        passed: false,
        attributes_present: 0,
        attributes_required: requiredCount,
        completeness_ratio: 0,
        violation: {
          shape_id: shape.id,
          violation_type: 'SHAPE_ABSENT',
          handoff_id: this.getPrecedingHandoff(checkpoint),
          loss_class: 'L0_TOTAL_OMISSION',
          evidence: {
            source_path: 'N/A',
            target_path: `agentOutputs.${checkpoint}`,
            explanation: `Shape ${shape.id} not present at checkpoint ${checkpoint}`
          }
        }
      };
    }

    const presentCount = extraction.attributes_found.length;
    const completenessRatio = presentCount / requiredCount;

    // Check if minimum attributes are present
    const minRequired = Math.ceil(requiredCount * 0.5); // At least 50% required
    const passed = presentCount >= minRequired;

    return {
      shape_id: shape.id,
      checkpoint,
      passed,
      attributes_present: presentCount,
      attributes_required: requiredCount,
      completeness_ratio: completenessRatio,
      violation: passed ? null : {
        shape_id: shape.id,
        violation_type: 'SHAPE_ABSENT',
        handoff_id: this.getPrecedingHandoff(checkpoint),
        loss_class: 'L1_PARTIAL_CAPTURE',
        evidence: {
          source_path: 'N/A',
          target_path: `agentOutputs.${checkpoint}`,
          explanation: `Shape ${shape.id} incomplete at ${checkpoint}: ${presentCount}/${requiredCount} attributes. ` +
            `Missing: [${extraction.attributes_missing.join(', ')}]`
        }
      }
    };
  }

  /**
   * Calculate completeness score across all stages
   */
  calculateCompletenessScore(
    shape: ShapeDeclaration,
    traceResult: ShapeTraceResult
  ): number {
    const stages: TracedAgentId[] = ['strategos', 'scope', 'cartographer', 'blocks', 'wire', 'pixel'];
    const requiredCount = shape.attributes.required.length;
    let totalPresent = 0;
    let stagesChecked = 0;

    for (const stage of stages) {
      const extraction = traceResult.extractions[stage];
      if (extraction) {
        stagesChecked++;
        totalPresent += extraction.attributes_found.length;
      }
    }

    if (stagesChecked === 0) return 0;
    const maxPossible = requiredCount * stagesChecked;
    return totalPresent / maxPossible;
  }

  private getPrecedingHandoff(stage: TracedAgentId): HandoffId {
    const handoffMap: Record<TracedAgentId, HandoffId> = {
      strategos: 'H1' as HandoffId, // No preceding, use H1
      scope: 'H1' as HandoffId,
      cartographer: 'H2' as HandoffId,
      blocks: 'H3' as HandoffId,
      wire: 'H4' as HandoffId,
      pixel: 'H5' as HandoffId
    };
    return handoffMap[stage];
  }
}
