/**
 * Budget Validator
 *
 * Validates that shape degradations stay within budget limits.
 */

import type { ShapeDeclaration, ShapeTraceResult, HandoffLossResult, FatalViolation, ShapeCategory } from '../../registry/types';
import { ShapeRegistry } from '../../registry';
import type { HandoffId, LossClass } from '../../types';

export interface BudgetValidationResult {
  shape_id: string;
  category: ShapeCategory;
  handoff_id: HandoffId;
  passed: boolean;
  budget_status: 'WITHIN' | 'EXCEEDED' | 'FATAL';
  degradations_used: number;
  degradations_allowed: number;
  violation: FatalViolation | null;
}

export class BudgetValidator {
  private registry: ShapeRegistry;

  constructor(registry: ShapeRegistry) {
    this.registry = registry;
  }

  validateHandoff(
    shape: ShapeDeclaration,
    handoffResult: HandoffLossResult
  ): BudgetValidationResult {
    const budget = this.registry.getBudgetForHandoff(handoffResult.handoff_id, shape.category);

    if (!budget) {
      return {
        shape_id: shape.id,
        category: shape.category,
        handoff_id: handoffResult.handoff_id,
        passed: false,
        budget_status: 'FATAL',
        degradations_used: 0,
        degradations_allowed: 0,
        violation: {
          shape_id: shape.id,
          violation_type: 'BUDGET_EXCEEDED',
          handoff_id: handoffResult.handoff_id,
          loss_class: 'L0_TOTAL_OMISSION',
          evidence: {
            source_path: 'N/A',
            target_path: 'N/A',
            explanation: `No budget defined for handoff ${handoffResult.handoff_id} category ${shape.category}`
          }
        }
      };
    }

    // Check for fatal loss class
    if (handoffResult.loss_class && budget.fatal.loss_classes.includes(handoffResult.loss_class)) {
      return {
        shape_id: shape.id,
        category: shape.category,
        handoff_id: handoffResult.handoff_id,
        passed: false,
        budget_status: 'FATAL',
        degradations_used: handoffResult.attributes_degraded.length,
        degradations_allowed: budget.allowed.max_attributes_degraded,
        violation: {
          shape_id: shape.id,
          violation_type: 'FATAL_LOSS',
          handoff_id: handoffResult.handoff_id,
          loss_class: handoffResult.loss_class,
          evidence: {
            source_path: `agentOutputs.${handoffResult.source_agent}`,
            target_path: `agentOutputs.${handoffResult.target_agent}`,
            explanation: `Fatal loss class ${handoffResult.loss_class} detected at ${handoffResult.handoff_id} for ${shape.category} shape ${shape.id}`
          }
        }
      };
    }

    // Check degradation count
    const degradationsUsed = handoffResult.attributes_degraded.length + handoffResult.attributes_lost.length;
    const degradationsAllowed = budget.allowed.max_attributes_degraded;

    if (degradationsUsed > degradationsAllowed) {
      return {
        shape_id: shape.id,
        category: shape.category,
        handoff_id: handoffResult.handoff_id,
        passed: false,
        budget_status: 'EXCEEDED',
        degradations_used: degradationsUsed,
        degradations_allowed: degradationsAllowed,
        violation: {
          shape_id: shape.id,
          violation_type: 'BUDGET_EXCEEDED',
          handoff_id: handoffResult.handoff_id,
          loss_class: handoffResult.loss_class || 'L1_PARTIAL_CAPTURE',
          evidence: {
            source_path: `agentOutputs.${handoffResult.source_agent}`,
            target_path: `agentOutputs.${handoffResult.target_agent}`,
            explanation: `Budget exceeded: ${degradationsUsed} degradations used, ${degradationsAllowed} allowed. ` +
              `Lost: [${handoffResult.attributes_lost.join(', ')}], Degraded: [${handoffResult.attributes_degraded.join(', ')}]`
          }
        }
      };
    }

    // Check if loss is tolerated
    if (handoffResult.loss_class && !budget.allowed.tolerated_loss_classes.includes(handoffResult.loss_class)) {
      // Not explicitly fatal, but also not tolerated
      return {
        shape_id: shape.id,
        category: shape.category,
        handoff_id: handoffResult.handoff_id,
        passed: false,
        budget_status: 'EXCEEDED',
        degradations_used: degradationsUsed,
        degradations_allowed: degradationsAllowed,
        violation: {
          shape_id: shape.id,
          violation_type: 'FATAL_LOSS',
          handoff_id: handoffResult.handoff_id,
          loss_class: handoffResult.loss_class,
          evidence: {
            source_path: `agentOutputs.${handoffResult.source_agent}`,
            target_path: `agentOutputs.${handoffResult.target_agent}`,
            explanation: `Loss class ${handoffResult.loss_class} not tolerated at ${handoffResult.handoff_id} for ${shape.category} shape`
          }
        }
      };
    }

    return {
      shape_id: shape.id,
      category: shape.category,
      handoff_id: handoffResult.handoff_id,
      passed: true,
      budget_status: 'WITHIN',
      degradations_used: degradationsUsed,
      degradations_allowed: degradationsAllowed,
      violation: null
    };
  }

  validateAllHandoffs(
    shape: ShapeDeclaration,
    traceResult: ShapeTraceResult
  ): BudgetValidationResult[] {
    const results: BudgetValidationResult[] = [];

    for (const [handoffId, handoffResult] of Object.entries(traceResult.handoff_losses)) {
      results.push(this.validateHandoff(shape, handoffResult));
    }

    return results;
  }
}
