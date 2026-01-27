/**
 * Shape Registry
 *
 * Central registry for all capability shapes and their budgets.
 */

import type { ShapeDeclaration, HandoffBudget, ShapeCategory } from './types';
import { ALL_SHAPES, SHAPE_BY_ID } from './shapes';
import { HANDOFF_BUDGETS, getBudgetForHandoff, isFatalLoss, isToleratedLoss } from './budgets/handoff-budgets';
import type { HandoffId, TracedAgentId, LossClass } from '../types';

export class ShapeRegistry {
  private shapes: Map<string, ShapeDeclaration> = new Map();
  private budgets: HandoffBudget[] = [];

  constructor() {
    // Load all shapes
    for (const shape of ALL_SHAPES) {
      this.shapes.set(shape.id, shape);
    }
    // Load budgets
    this.budgets = HANDOFF_BUDGETS;
  }

  getShape(id: string): ShapeDeclaration | undefined {
    return this.shapes.get(id);
  }

  getAllShapes(): ShapeDeclaration[] {
    return Array.from(this.shapes.values());
  }

  getShapesByCategory(category: ShapeCategory): ShapeDeclaration[] {
    return this.getAllShapes().filter(s => s.category === category);
  }

  getStatefulShapes(): ShapeDeclaration[] {
    return this.getShapesByCategory('STATEFUL');
  }

  getControlShapes(): ShapeDeclaration[] {
    return this.getShapesByCategory('CONTROL');
  }

  getBudgets(): HandoffBudget[] {
    return this.budgets;
  }

  getBudgetForHandoff(handoffId: HandoffId, category: ShapeCategory) {
    return getBudgetForHandoff(handoffId, category);
  }

  isFatalLoss(handoffId: HandoffId, category: ShapeCategory, lossClass: LossClass): boolean {
    return isFatalLoss(handoffId, category, lossClass);
  }

  isToleratedLoss(handoffId: HandoffId, category: ShapeCategory, lossClass: LossClass): boolean {
    return isToleratedLoss(handoffId, category, lossClass);
  }

  /**
   * Check if a shape must survive to a given stage
   */
  mustSurviveTo(shapeId: string, stage: TracedAgentId): boolean {
    const shape = this.getShape(shapeId);
    if (!shape) return false;

    const stageOrder: TracedAgentId[] = ['strategos', 'scope', 'cartographer', 'blocks', 'wire', 'pixel'];
    const targetIdx = stageOrder.indexOf(shape.survival.must_reach_stage);
    const checkIdx = stageOrder.indexOf(stage);

    return checkIdx <= targetIdx;
  }

  /**
   * Get shapes that must survive to at least the given stage
   */
  getShapesMustSurviveTo(stage: TracedAgentId): ShapeDeclaration[] {
    const stageOrder: TracedAgentId[] = ['strategos', 'scope', 'cartographer', 'blocks', 'wire', 'pixel'];
    const stageIdx = stageOrder.indexOf(stage);

    return this.getAllShapes().filter(shape => {
      const mustIdx = stageOrder.indexOf(shape.survival.must_reach_stage);
      return mustIdx >= stageIdx;
    });
  }

  /**
   * Validate shape registry integrity
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const shape of this.getAllShapes()) {
      // Check required attributes not empty
      if (shape.attributes.required.length === 0) {
        errors.push(`Shape ${shape.id} has no required attributes`);
      }

      // Check survival stage is valid
      const validStages = ['strategos', 'scope', 'cartographer', 'blocks', 'wire', 'pixel'];
      if (!validStages.includes(shape.survival.must_reach_stage)) {
        errors.push(`Shape ${shape.id} has invalid survival stage: ${shape.survival.must_reach_stage}`);
      }

      // Check forbidden loss classes not empty
      if (shape.survival.forbidden_loss_classes.length === 0) {
        errors.push(`Shape ${shape.id} has no forbidden loss classes`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// Export types
export * from './types';
export { ALL_SHAPES, SHAPE_BY_ID } from './shapes';
export { HANDOFF_BUDGETS } from './budgets/handoff-budgets';
