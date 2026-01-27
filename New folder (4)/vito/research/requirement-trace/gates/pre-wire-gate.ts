/**
 * PRE_WIRE_GATE
 *
 * The invariant gate that MUST pass before WIRE execution.
 * This is NON-BYPASSABLE. This is LAW.
 */

import type {
  GateResult,
  ShapeGateResult,
  FatalViolation,
  ShapeDeclaration,
  ShapeTraceResult,
  BlockedExecutionEvent,
  SecurityViolationEvent
} from '../registry/types';
import { ShapeRegistry } from '../registry';
import { SurvivalValidator } from './validators/survival-validator';
import { BudgetValidator } from './validators/budget-validator';
import { IntegrityValidator } from './validators/integrity-validator';
import type { TracedAgentId } from '../types';

// Gate bypass protection flag - cannot be changed at runtime
const GATE_BYPASS_PROTECTION = true;
Object.freeze({ GATE_BYPASS_PROTECTION });

export class PreWireGate {
  readonly id = 'PRE_WIRE_GATE';
  readonly checkpoint_after: TracedAgentId = 'blocks';
  readonly checkpoint_before: TracedAgentId = 'wire';

  private registry: ShapeRegistry;
  private survivalValidator: SurvivalValidator;
  private budgetValidator: BudgetValidator;
  private integrityValidator: IntegrityValidator;

  private executionBlocked = false;
  private gateEvaluated = false;

  constructor(registry: ShapeRegistry) {
    this.registry = registry;
    this.survivalValidator = new SurvivalValidator();
    this.budgetValidator = new BudgetValidator(registry);
    this.integrityValidator = new IntegrityValidator();
  }

  /**
   * Execute the gate validation.
   * This is the ONLY way to proceed to WIRE.
   */
  execute(shapeTraces: Record<string, ShapeTraceResult>): GateResult {
    const timestamp = new Date().toISOString();
    const shapeResults: ShapeGateResult[] = [];
    const fatalViolations: FatalViolation[] = [];

    // Get all shapes that must survive to at least WIRE
    const relevantShapes = this.registry.getShapesMustSurviveTo('wire');

    for (const shape of relevantShapes) {
      const traceResult = shapeTraces[shape.id];

      if (!traceResult) {
        // Shape not traced at all - FATAL
        fatalViolations.push({
          shape_id: shape.id,
          violation_type: 'SHAPE_ABSENT',
          handoff_id: 'H1',
          loss_class: 'L0_TOTAL_OMISSION',
          evidence: {
            source_path: 'N/A',
            target_path: 'N/A',
            explanation: `Shape ${shape.id} was not traced. Cannot verify survival.`
          }
        });

        shapeResults.push({
          shape_id: shape.id,
          category: shape.category,
          survived: false,
          attributes_present: 0,
          attributes_required: shape.attributes.required.length,
          budget_status: 'FATAL',
          degradations_used: 0,
          degradations_allowed: 0,
          loss_detected: 'L0_TOTAL_OMISSION',
          loss_is_fatal: true
        });

        continue;
      }

      // 1. Survival Validation
      const survivalResult = this.survivalValidator.validate(shape, traceResult);

      // 2. Budget Validation (check all handoffs up to WIRE)
      const budgetResults = this.budgetValidator.validateAllHandoffs(shape, traceResult);
      const worstBudget = this.getWorstBudgetResult(budgetResults);

      // 3. Integrity Validation at checkpoint
      const integrityResult = this.integrityValidator.validateAtCheckpoint(
        shape,
        traceResult,
        this.checkpoint_after
      );

      // Determine overall result for this shape
      const survived = survivalResult.passed && integrityResult.passed;
      const budgetStatus = worstBudget?.budget_status || 'WITHIN';
      const isFatal = !survived || budgetStatus === 'FATAL';

      // Collect fatal violations
      if (survivalResult.violation) {
        fatalViolations.push(survivalResult.violation);
      }
      if (worstBudget?.violation) {
        fatalViolations.push(worstBudget.violation);
      }
      if (integrityResult.violation && !survivalResult.violation) {
        fatalViolations.push(integrityResult.violation);
      }

      // Determine loss class
      let lossDetected = traceResult.survival_status.failure_class;
      if (!lossDetected && !survived) {
        lossDetected = 'L0_TOTAL_OMISSION';
      }

      shapeResults.push({
        shape_id: shape.id,
        category: shape.category,
        survived,
        attributes_present: integrityResult.attributes_present,
        attributes_required: integrityResult.attributes_required,
        budget_status: budgetStatus,
        degradations_used: worstBudget?.degradations_used || 0,
        degradations_allowed: worstBudget?.degradations_allowed || 0,
        loss_detected: lossDetected,
        loss_is_fatal: isFatal
      });
    }

    // Determine verdict
    const hasFatalViolations = fatalViolations.length > 0;
    const allPassed = shapeResults.every(r => r.survived && !r.loss_is_fatal);

    let verdict: 'PASS' | 'FAIL' | 'WARN';
    if (hasFatalViolations || !allPassed) {
      verdict = 'FAIL';
    } else if (shapeResults.some(r => r.budget_status === 'EXCEEDED')) {
      verdict = 'WARN';
    } else {
      verdict = 'PASS';
    }

    // SET EXECUTION BLOCK STATE
    this.executionBlocked = verdict === 'FAIL';
    this.gateEvaluated = true;

    return {
      gate_id: this.id,
      timestamp,
      verdict,
      shape_results: shapeResults,
      fatal_violations: fatalViolations,
      block_downstream: this.executionBlocked
    };
  }

  /**
   * Check if WIRE execution is allowed.
   * This MUST be called before WIRE.
   * Returns false if gate not evaluated or gate failed.
   */
  canExecuteWire(): boolean {
    if (!this.gateEvaluated) {
      this.emitSecurityViolation('Gate not evaluated before WIRE execution attempt');
      return false;
    }
    return !this.executionBlocked;
  }

  /**
   * Check if PIXEL execution is allowed.
   * If WIRE is blocked, PIXEL is also blocked.
   */
  canExecutePixel(): boolean {
    return this.canExecuteWire();
  }

  /**
   * Generate BLOCKED_EXECUTION event
   */
  generateBlockedEvent(gateResult: GateResult, runId: string): BlockedExecutionEvent {
    return {
      event_type: 'BLOCKED_EXECUTION',
      timestamp: new Date().toISOString(),
      run_id: runId,
      gate_id: this.id,
      verdict: 'EXECUTION_BLOCKED_REQUIREMENT_LOSS',
      blocked_agents: ['wire', 'pixel'],
      fatal_violations: gateResult.fatal_violations,
      reason: `PRE_WIRE_GATE failed with ${gateResult.fatal_violations.length} fatal violations. ` +
        `WIRE and PIXEL execution blocked to prevent requirement loss propagation.`
    };
  }

  /**
   * Emit security violation if bypass is attempted
   */
  private emitSecurityViolation(reason: string): SecurityViolationEvent {
    const event: SecurityViolationEvent = {
      event_type: 'SECURITY_VIOLATION',
      timestamp: new Date().toISOString(),
      violation: 'GATE_BYPASS_ATTEMPTED',
      source: reason,
      blocked: true
    };

    // In production, this would be logged to security audit
    console.error('SECURITY VIOLATION:', JSON.stringify(event));

    return event;
  }

  /**
   * Reset gate state (only for new runs)
   */
  reset(): void {
    this.executionBlocked = false;
    this.gateEvaluated = false;
  }

  private getWorstBudgetResult(results: Array<{ budget_status: 'WITHIN' | 'EXCEEDED' | 'FATAL'; violation: FatalViolation | null; degradations_used: number; degradations_allowed: number }>) {
    const order = { FATAL: 0, EXCEEDED: 1, WITHIN: 2 };
    return results.sort((a, b) => order[a.budget_status] - order[b.budget_status])[0] || null;
  }
}
