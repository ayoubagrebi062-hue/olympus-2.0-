/**
 * ORIS Invariant Validator
 *
 * Validates INVARIANT shapes and ensures they survive ALL handoffs.
 *
 * INVARIANT shapes:
 * - Must survive ALL handoffs (H1-H5)
 * - Are NEVER summarized
 * - Bypass summarizeOutputForDependency entirely
 * - Violations are ALWAYS FATAL
 *
 * NO EXCEPTIONS. NO OVERRIDES.
 */

import type {
  InvariantViolation,
  ShapeKind
} from './types';
import type { HandoffId, LossClass, TracedAgentId } from '../types';
import type { ShapeTraceResult, HandoffLossResult } from '../registry/types';
import type { CriticalShapeDeclaration } from '../registry/shapes';
import { INVARIANT_SHAPES } from '../registry/shapes';

// All handoffs that INVARIANT shapes must survive
const ALL_HANDOFFS: HandoffId[] = ['H1', 'H2', 'H3', 'H4', 'H5'];

// Stage order for reference
const STAGE_ORDER: TracedAgentId[] = ['strategos', 'scope', 'cartographer', 'blocks', 'wire', 'pixel'];

export class InvariantValidator {
  /**
   * Validate all INVARIANT shapes
   * Returns violations (ALWAYS FATAL)
   */
  validateAll(
    traceResults: Record<string, ShapeTraceResult>
  ): InvariantViolation[] {
    const violations: InvariantViolation[] = [];

    for (const shape of INVARIANT_SHAPES) {
      const shapeViolations = this.validateShape(shape, traceResults[shape.id]);
      violations.push(...shapeViolations);
    }

    return violations;
  }

  /**
   * Validate a single INVARIANT shape
   */
  validateShape(
    shape: CriticalShapeDeclaration,
    traceResult: ShapeTraceResult | undefined
  ): InvariantViolation[] {
    const violations: InvariantViolation[] = [];
    const timestamp = new Date().toISOString();

    // Check 1: Shape must be INVARIANT
    if (shape.kind !== 'INVARIANT') {
      // Not an invariant shape, skip validation
      return [];
    }

    // Check 2: Shape must have trace result
    if (!traceResult) {
      violations.push({
        shape_id: shape.id,
        handoff_id: 'H1',
        violation_type: 'SHAPE_ABSENT',
        expected: 'Shape trace result present',
        actual: 'No trace result for INVARIANT shape',
        timestamp,
        fatal: true
      });
      return violations;
    }

    // Check 3: Shape must survive ALL handoffs
    for (let i = 0; i < ALL_HANDOFFS.length; i++) {
      const handoffId = ALL_HANDOFFS[i];
      const sourceStage = STAGE_ORDER[i];
      const targetStage = STAGE_ORDER[i + 1];

      const handoffLoss = traceResult.handoff_losses[handoffId];

      if (!handoffLoss) {
        // Missing handoff data
        violations.push({
          shape_id: shape.id,
          handoff_id: handoffId,
          violation_type: 'SHAPE_ABSENT',
          expected: `Handoff ${handoffId} data present`,
          actual: 'Missing handoff data for INVARIANT shape',
          timestamp,
          fatal: true
        });
        continue;
      }

      // Check for any loss
      if (handoffLoss.loss_detected && handoffLoss.loss_class) {
        violations.push({
          shape_id: shape.id,
          handoff_id: handoffId,
          violation_type: 'ATTRIBUTE_LOST',
          expected: `Zero loss at ${handoffId} (${sourceStage} → ${targetStage})`,
          actual: `Loss detected: ${handoffLoss.loss_class}, attributes lost: [${handoffLoss.attributes_lost.join(', ')}]`,
          timestamp,
          fatal: true
        });
      }
    }

    // Check 4: Shape must have full attribute coverage at final stage
    const pixelExtraction = traceResult.extractions['pixel'];
    if (pixelExtraction) {
      if (pixelExtraction.attributes_missing.length > 0) {
        violations.push({
          shape_id: shape.id,
          handoff_id: 'H5',
          violation_type: 'ATTRIBUTE_LOST',
          expected: `All ${shape.attributes.required.length} required attributes present at PIXEL`,
          actual: `Missing ${pixelExtraction.attributes_missing.length} attributes: [${pixelExtraction.attributes_missing.join(', ')}]`,
          timestamp,
          fatal: true
        });
      }
    } else {
      violations.push({
        shape_id: shape.id,
        handoff_id: 'H5',
        violation_type: 'SHAPE_ABSENT',
        expected: 'Shape present at PIXEL stage',
        actual: 'INVARIANT shape not found at PIXEL stage',
        timestamp,
        fatal: true
      });
    }

    return violations;
  }

  /**
   * Check if a shape is an INVARIANT shape
   */
  isInvariantShape(shapeId: string): boolean {
    return INVARIANT_SHAPES.some(s => s.id === shapeId);
  }

  /**
   * Get all INVARIANT shape IDs
   */
  getInvariantShapeIds(): string[] {
    return INVARIANT_SHAPES.map(s => s.id);
  }

  /**
   * Check if any INVARIANT violations exist (execution should be blocked)
   */
  hasViolations(traceResults: Record<string, ShapeTraceResult>): boolean {
    return this.validateAll(traceResults).length > 0;
  }

  /**
   * Get violation summary
   */
  getViolationSummary(violations: InvariantViolation[]): {
    total: number;
    by_type: Record<InvariantViolation['violation_type'], number>;
    by_handoff: Record<HandoffId, number>;
    affected_shapes: string[];
  } {
    const byType: Record<InvariantViolation['violation_type'], number> = {
      'SUMMARIZATION_ATTEMPTED': 0,
      'ATTRIBUTE_LOST': 0,
      'SHAPE_ABSENT': 0
    };

    const byHandoff: Record<HandoffId, number> = {
      H1: 0, H2: 0, H3: 0, H4: 0, H5: 0
    };

    const affectedShapes = new Set<string>();

    for (const v of violations) {
      byType[v.violation_type]++;
      byHandoff[v.handoff_id]++;
      affectedShapes.add(v.shape_id);
    }

    return {
      total: violations.length,
      by_type: byType,
      by_handoff: byHandoff,
      affected_shapes: Array.from(affectedShapes)
    };
  }
}
