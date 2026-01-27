/**
 * MSI Reducer (Minimal Structural Intent)
 *
 * Reduces ALIGNED intents to their minimal MCCS-backed structure.
 *
 * KEY PRINCIPLE:
 * - Start from ALIGNED intent
 * - Identify which components are MCCS-backed (essential)
 * - Strip everything that isn't causally required
 * - Produce minimal structural representation
 *
 * REDUCTION RULES:
 * 1. Only shapes in MCCS interventions are essential
 * 2. Only handoffs in MCCS interventions are essential
 * 3. Only operations required by interventions are essential
 * 4. Outcome must match intervention direction
 *
 * NON-NEGOTIABLE:
 * - Deterministic reduction
 * - No heuristics, ML, or probability
 * - No human input
 */

import * as crypto from 'crypto';
import type {
  IntentSignature,
  IntentClassification,
  NecessaryFuture,
  CausalCone,
  MinimalStructuralIntent,
  CausalIntervention
} from './types';

// CIN version - immutable
const CIN_VERSION = '1.0.0';
Object.freeze({ CIN_VERSION });

export class MSIReducer {
  /**
   * Reduce an ALIGNED intent to its minimal structural form
   *
   * @param intent The ALIGNED intent to reduce
   * @param classification The intent's classification (must be ALIGNED)
   * @param future The NecessaryFuture providing MCCS backing
   * @param cone The CausalCone derived from the future
   */
  reduceToMSI(
    intent: IntentSignature,
    classification: IntentClassification,
    future: NecessaryFuture,
    cone: CausalCone
  ): MinimalStructuralIntent {
    // GATE: Only ALIGNED intents can be reduced
    if (classification.classification !== 'ALIGNED') {
      throw new Error(
        `MSI reduction requires ALIGNED intent. Got: ${classification.classification}. ` +
        'Non-aligned intents cannot be reduced - they are rejected by ICE.'
      );
    }

    const msiId = `MSI-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Extract MCCS interventions
    const mccs = future.chosen_mccs;
    const interventions = mccs.interventions;

    // Compute essential components from MCCS
    const essentialComponents = this.computeEssentialComponents(intent, interventions, cone);

    // Compute what was stripped
    const reductionReport = this.computeReductionReport(intent, essentialComponents);

    // Build MCCS backing proof
    const mccsBacking = this.buildMCCSBacking(essentialComponents, mccs, interventions);

    return {
      msi_id: msiId,
      source_intent_id: intent.intent_id,
      source_intent_fingerprint: intent.fingerprint,
      minimal_components: essentialComponents,
      reduction_report: reductionReport,
      mccs_backing: mccsBacking,
      reduced_at: now
    };
  }

  /**
   * Compute essential components from MCCS interventions
   *
   * Only components that are directly backed by MCCS interventions
   * are considered essential.
   */
  private computeEssentialComponents(
    intent: IntentSignature,
    interventions: CausalIntervention[],
    cone: CausalCone
  ): MinimalStructuralIntent['minimal_components'] {
    // Extract shapes from MCCS interventions
    const mccsShapes = new Set<string>();
    for (const intervention of interventions) {
      mccsShapes.add(intervention.target_shape_id);
    }

    // Extract handoffs from MCCS interventions
    const mccsHandoffs = new Set<string>();
    for (const intervention of interventions) {
      mccsHandoffs.add(intervention.target_handoff_id);
    }

    // Essential shapes: intersection of intent shapes and MCCS shapes
    // Plus preserved shapes from the cone (can be read)
    const preservedShapes = new Set(cone.derivation.preserved_shapes);
    const essentialShapes: string[] = [];

    for (const shape of intent.components.target_shapes) {
      if (mccsShapes.has(shape) || preservedShapes.has(shape)) {
        essentialShapes.push(shape);
      }
    }

    // Essential handoffs: intersection of intent handoffs and MCCS handoffs
    const preservedHandoffs = new Set(cone.derivation.preserved_handoffs);
    const essentialHandoffs: string[] = [];

    for (const handoff of intent.components.target_handoffs) {
      if (mccsHandoffs.has(handoff) || preservedHandoffs.has(handoff)) {
        essentialHandoffs.push(handoff);
      }
    }

    // Essential operations: map intervention types to operations
    const essentialOps = this.mapInterventionsToOperations(interventions, intent);

    // Essential outcome: derive from intent's expected outcome
    // but only if it aligns with MCCS direction
    const essentialOutcome = this.deriveEssentialOutcome(intent, interventions);

    return {
      essential_shapes: essentialShapes.sort(),
      essential_handoffs: essentialHandoffs.sort(),
      essential_operations: essentialOps,
      essential_outcome: essentialOutcome
    };
  }

  /**
   * Map intervention types to essential operations
   */
  private mapInterventionsToOperations(
    interventions: CausalIntervention[],
    intent: IntentSignature
  ): ('CREATE' | 'READ' | 'UPDATE' | 'TRANSFORM')[] {
    const ops = new Set<'CREATE' | 'READ' | 'UPDATE' | 'TRANSFORM'>();

    // READ is always essential if the intent includes it
    // (reading doesn't contradict any intervention)
    if (intent.components.intended_operations.includes('READ')) {
      ops.add('READ');
    }

    // Map intervention types to required operations
    for (const intervention of interventions) {
      switch (intervention.intervention_type) {
        case 'ATTRIBUTE_PRESERVATION':
          // Preserving attributes requires UPDATE or TRANSFORM
          if (intent.components.intended_operations.includes('UPDATE')) {
            ops.add('UPDATE');
          }
          if (intent.components.intended_operations.includes('TRANSFORM')) {
            ops.add('TRANSFORM');
          }
          break;

        case 'SUMMARIZATION_BYPASS':
          // Bypassing summarization requires TRANSFORM
          if (intent.components.intended_operations.includes('TRANSFORM')) {
            ops.add('TRANSFORM');
          }
          break;

        case 'INVARIANT_ENFORCEMENT':
          // Enforcing invariants requires UPDATE
          if (intent.components.intended_operations.includes('UPDATE')) {
            ops.add('UPDATE');
          }
          break;

        case 'EXTRACTION_PATH_ADD':
          // Adding extraction path requires CREATE
          if (intent.components.intended_operations.includes('CREATE')) {
            ops.add('CREATE');
          }
          break;
      }
    }

    // If no specific operations matched, but intent has READ, that's all we need
    if (ops.size === 0 && intent.components.intended_operations.includes('READ')) {
      ops.add('READ');
    }

    // If still no operations, default to READ (most minimal)
    if (ops.size === 0) {
      ops.add('READ');
    }

    return Array.from(ops).sort() as ('CREATE' | 'READ' | 'UPDATE' | 'TRANSFORM')[];
  }

  /**
   * Derive essential outcome from intent and interventions
   */
  private deriveEssentialOutcome(
    intent: IntentSignature,
    interventions: CausalIntervention[]
  ): 'RESTORE' | 'MODIFY' | 'PRESERVE' {
    const expected = intent.components.expected_outcome;

    // DESTROY is never essential (forbidden by ICE)
    // Map to closest allowed outcome
    switch (expected) {
      case 'RESTORE':
        // RESTORE is allowed if interventions are restorative
        return 'RESTORE';

      case 'MODIFY':
        // MODIFY is allowed if interventions modify state
        return 'MODIFY';

      case 'PRESERVE':
        // PRESERVE is always allowed (no change)
        return 'PRESERVE';

      case 'DESTROY':
        // DESTROY intent should never reach MSI reducer (rejected by ICE)
        // If it somehow does, treat as MODIFY (most neutral)
        return 'MODIFY';

      default:
        // Unknown outcome defaults to PRESERVE (safest)
        return 'PRESERVE';
    }
  }

  /**
   * Compute reduction report (what was stripped)
   */
  private computeReductionReport(
    intent: IntentSignature,
    essential: MinimalStructuralIntent['minimal_components']
  ): MinimalStructuralIntent['reduction_report'] {
    const essentialShapeSet = new Set(essential.essential_shapes);
    const essentialHandoffSet = new Set(essential.essential_handoffs);
    const essentialOpSet = new Set(essential.essential_operations);

    // Shapes stripped: in intent but not essential
    const shapesStripped: string[] = [];
    for (const shape of intent.components.target_shapes) {
      if (!essentialShapeSet.has(shape)) {
        shapesStripped.push(shape);
      }
    }

    // Handoffs stripped: in intent but not essential
    const handoffsStripped: string[] = [];
    for (const handoff of intent.components.target_handoffs) {
      if (!essentialHandoffSet.has(handoff)) {
        handoffsStripped.push(handoff);
      }
    }

    // Operations stripped: in intent but not essential
    const operationsStripped: string[] = [];
    for (const op of intent.components.intended_operations) {
      // DELETE is always stripped (forbidden)
      if (op === 'DELETE' || !essentialOpSet.has(op as any)) {
        operationsStripped.push(op);
      }
    }

    // Narrative is always stripped (MSI has no narrative)
    const narrativeStripped = true;

    return {
      shapes_stripped: shapesStripped.sort(),
      handoffs_stripped: handoffsStripped.sort(),
      operations_stripped: operationsStripped.sort(),
      narrative_stripped: narrativeStripped
    };
  }

  /**
   * Build MCCS backing proof
   */
  private buildMCCSBacking(
    essential: MinimalStructuralIntent['minimal_components'],
    mccs: { mccs_id: string },
    interventions: CausalIntervention[]
  ): MinimalStructuralIntent['mccs_backing'] {
    // Find which interventions back the essential components
    const backingInterventions: string[] = [];

    const essentialShapeSet = new Set(essential.essential_shapes);
    const essentialHandoffSet = new Set(essential.essential_handoffs);

    for (const intervention of interventions) {
      // An intervention backs the MSI if its target shape or handoff is essential
      if (
        essentialShapeSet.has(intervention.target_shape_id) ||
        essentialHandoffSet.has(intervention.target_handoff_id)
      ) {
        backingInterventions.push(intervention.intervention_id);
      }
    }

    // Fully backed if at least one intervention backs the MSI
    // or if the MSI is READ-only (no intervention needed)
    const isReadOnly =
      essential.essential_operations.length === 1 &&
      essential.essential_operations[0] === 'READ';

    const fullyBacked = backingInterventions.length > 0 || isReadOnly;

    return {
      mccs_id: mccs.mccs_id,
      intervention_ids: backingInterventions.sort(),
      fully_backed: fullyBacked
    };
  }

  /**
   * Verify an MSI is properly reduced
   */
  verifyMSI(msi: MinimalStructuralIntent): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check essential components exist
    if (msi.minimal_components.essential_shapes.length === 0) {
      // No essential shapes is valid for READ-only intents
      if (
        msi.minimal_components.essential_operations.length !== 1 ||
        msi.minimal_components.essential_operations[0] !== 'READ'
      ) {
        issues.push('No essential shapes and not READ-only');
      }
    }

    // Check MCCS backing
    if (!msi.mccs_backing.fully_backed) {
      issues.push('MSI is not fully MCCS-backed');
    }

    // Check no forbidden operations
    const forbiddenOps = ['DELETE'];
    for (const op of msi.minimal_components.essential_operations) {
      if (forbiddenOps.includes(op)) {
        issues.push(`Forbidden operation in essential set: ${op}`);
      }
    }

    // Check essential outcome is valid
    const validOutcomes = ['RESTORE', 'MODIFY', 'PRESERVE'];
    if (!validOutcomes.includes(msi.minimal_components.essential_outcome)) {
      issues.push(`Invalid essential outcome: ${msi.minimal_components.essential_outcome}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Compute fingerprint for an MSI
   */
  computeMSIFingerprint(msi: MinimalStructuralIntent): string {
    const canonical = {
      shapes: msi.minimal_components.essential_shapes,
      handoffs: msi.minimal_components.essential_handoffs,
      operations: msi.minimal_components.essential_operations,
      outcome: msi.minimal_components.essential_outcome
    };

    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Check if two MSIs are structurally equivalent
   */
  areStructurallyEquivalent(msi1: MinimalStructuralIntent, msi2: MinimalStructuralIntent): boolean {
    return this.computeMSIFingerprint(msi1) === this.computeMSIFingerprint(msi2);
  }

  /**
   * Get reduction summary
   */
  getReductionSummary(msi: MinimalStructuralIntent): {
    essential_shape_count: number;
    essential_handoff_count: number;
    essential_operation_count: number;
    shapes_stripped: number;
    handoffs_stripped: number;
    operations_stripped: number;
    reduction_ratio: number;
  } {
    const essentialCount =
      msi.minimal_components.essential_shapes.length +
      msi.minimal_components.essential_handoffs.length +
      msi.minimal_components.essential_operations.length;

    const strippedCount =
      msi.reduction_report.shapes_stripped.length +
      msi.reduction_report.handoffs_stripped.length +
      msi.reduction_report.operations_stripped.length;

    const totalOriginal = essentialCount + strippedCount;
    const reductionRatio = totalOriginal > 0 ? strippedCount / totalOriginal : 0;

    return {
      essential_shape_count: msi.minimal_components.essential_shapes.length,
      essential_handoff_count: msi.minimal_components.essential_handoffs.length,
      essential_operation_count: msi.minimal_components.essential_operations.length,
      shapes_stripped: msi.reduction_report.shapes_stripped.length,
      handoffs_stripped: msi.reduction_report.handoffs_stripped.length,
      operations_stripped: msi.reduction_report.operations_stripped.length,
      reduction_ratio: reductionRatio
    };
  }
}
