/**
 * Survival Validator
 *
 * Validates that shapes survive to their declared stages.
 */

import type { ShapeDeclaration, ShapeTraceResult, FatalViolation } from '../../registry/types';
import type { TracedAgentId, HandoffId } from '../../types';

export interface SurvivalValidationResult {
  shape_id: string;
  passed: boolean;
  target_stage: TracedAgentId;
  actual_last_stage: TracedAgentId | null;
  violation: FatalViolation | null;
}

export class SurvivalValidator {
  private stageOrder: TracedAgentId[] = ['strategos', 'scope', 'cartographer', 'blocks', 'wire', 'pixel'];

  validate(
    shape: ShapeDeclaration,
    traceResult: ShapeTraceResult
  ): SurvivalValidationResult {
    const targetStage = shape.survival.must_reach_stage;
    const targetIdx = this.stageOrder.indexOf(targetStage);

    // Find the last stage where shape was present
    let lastPresentStage: TracedAgentId | null = null;
    let lastPresentIdx = -1;

    for (let i = 0; i <= targetIdx; i++) {
      const stage = this.stageOrder[i];
      const extraction = traceResult.extractions[stage];
      if (extraction && extraction.present) {
        lastPresentStage = stage;
        lastPresentIdx = i;
      }
    }

    // Check extraction at target stage
    const targetExtraction = traceResult.extractions[targetStage];
    const survivedToTarget = targetExtraction && targetExtraction.present;

    if (survivedToTarget) {
      return {
        shape_id: shape.id,
        passed: true,
        target_stage: targetStage,
        actual_last_stage: targetStage,
        violation: null
      };
    }

    // Shape did not survive - find where it was lost
    let failureHandoff: HandoffId | null = null;
    if (lastPresentIdx >= 0 && lastPresentIdx < targetIdx) {
      // Lost between lastPresentStage and next stage
      const handoffNum = lastPresentIdx + 1;
      failureHandoff = `H${handoffNum}` as HandoffId;
    } else if (lastPresentIdx === -1) {
      // Never present
      failureHandoff = 'H1' as HandoffId;
    }

    // Get the loss class from handoff
    const lossClass = traceResult.survival_status.failure_class || 'L0_TOTAL_OMISSION';

    return {
      shape_id: shape.id,
      passed: false,
      target_stage: targetStage,
      actual_last_stage: lastPresentStage,
      violation: {
        shape_id: shape.id,
        violation_type: 'SURVIVAL_FAILURE',
        handoff_id: failureHandoff || ('H1' as HandoffId),
        loss_class: lossClass,
        evidence: {
          source_path: lastPresentStage ? `agentOutputs.${lastPresentStage}` : 'N/A',
          target_path: `agentOutputs.${targetStage}`,
          explanation: `Shape ${shape.id} required to survive to ${targetStage} but ` +
            (lastPresentStage
              ? `was last seen at ${lastPresentStage}`
              : 'was never present in pipeline')
        }
      }
    };
  }

  /**
   * Get the handoff ID between two stages
   */
  getHandoffBetween(source: TracedAgentId, target: TracedAgentId): HandoffId | null {
    const sourceIdx = this.stageOrder.indexOf(source);
    const targetIdx = this.stageOrder.indexOf(target);

    if (sourceIdx === -1 || targetIdx === -1) return null;
    if (targetIdx !== sourceIdx + 1) return null;

    return `H${targetIdx}` as HandoffId;
  }
}
