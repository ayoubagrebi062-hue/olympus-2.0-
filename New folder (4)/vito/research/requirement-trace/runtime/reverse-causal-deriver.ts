/**
 * Reverse Causal Deriver
 *
 * Derives the causal cone and intent allowlist from a NecessaryFuture.
 *
 * KEY PRINCIPLE:
 * - Start from NecessaryFuture (the end state)
 * - Derive backwards what ActionSignatures lie on its causal cone
 * - Generate IntentAllowlist from derived signatures
 *
 * REVERSE DERIVATION:
 * 1. Extract MCCS interventions from NecessaryFuture
 * 2. Identify required shapes, handoffs, operations
 * 3. Compute allowed signature space
 * 4. Generate intent patterns
 *
 * NON-NEGOTIABLE:
 * - Deterministic derivation
 * - No heuristics, ML, or probability
 * - No human input
 */

import * as crypto from 'crypto';
import type {
  NecessaryFuture,
  ActionSignature,
  CausalCone,
  IntentAllowlist,
  CausalIntervention
} from './types';

// ICE version - immutable
const ICE_VERSION = '1.0.0';
Object.freeze({ ICE_VERSION });

export class ReverseCausalDeriver {
  /**
   * Derive the complete causal cone from a NecessaryFuture
   *
   * The causal cone contains all ActionSignatures that lie on the
   * causal path to the NecessaryFuture.
   */
  deriveCausalCone(future: NecessaryFuture): CausalCone {
    const coneId = `CONE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Extract derivation data from the future
    const derivation = this.extractDerivation(future);

    // Derive allowed signatures
    const allowedSignatures = this.deriveAllowedSignatures(future, derivation);

    // Generate allowed intent fingerprints
    const allowedIntentFingerprints = this.deriveIntentFingerprints(allowedSignatures, derivation);

    // Compute exclusions (what is definitely outside the cone)
    const exclusions = this.computeExclusions(future, derivation);

    return {
      cone_id: coneId,
      source_future_id: future.future_id,
      source_future_fingerprint: future.allowed_signature.fingerprint,
      allowed_signatures: allowedSignatures,
      allowed_intent_fingerprints: allowedIntentFingerprints,
      derivation,
      exclusions,
      derived_at: now,
      immutable: true,
      append_only: true
    };
  }

  /**
   * Generate intent allowlist from causal cone
   */
  generateIntentAllowlist(cone: CausalCone, future: NecessaryFuture): IntentAllowlist {
    const allowlistId = `ALLOW-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Extract allowed patterns from the cone
    const allowedPatterns = this.extractAllowedPatterns(cone, future);

    return {
      allowlist_id: allowlistId,
      source_cone_id: cone.cone_id,
      source_future_id: future.future_id,
      allowed_fingerprints: cone.allowed_intent_fingerprints,
      allowed_patterns: allowedPatterns,
      created_at: now
    };
  }

  /**
   * Extract derivation data from the future
   */
  private extractDerivation(future: NecessaryFuture): CausalCone['derivation'] {
    const mccs = future.chosen_mccs;

    // Extract all interventions
    const requiredInterventions = mccs.interventions;

    // Extract shapes that must be preserved (not modified destructively)
    const preservedShapes = this.computePreservedShapes(future);

    // Extract handoffs that must remain intact
    const preservedHandoffs = this.computePreservedHandoffs(future);

    // Extract required operations
    const requiredOperations = this.computeRequiredOperations(requiredInterventions);

    return {
      mccs_id: mccs.mccs_id,
      required_interventions: requiredInterventions,
      preserved_shapes: preservedShapes,
      preserved_handoffs: preservedHandoffs,
      required_operations: requiredOperations
    };
  }

  /**
   * Compute shapes that must be preserved
   */
  private computePreservedShapes(future: NecessaryFuture): string[] {
    const preserved: Set<string> = new Set();

    // Shapes that are restored by the MCCS must be preserved
    for (const shapeId of future.chosen_mccs.projected_outcome.shapes_restored) {
      preserved.add(shapeId);
    }

    // Shapes affected by interventions need careful handling
    for (const intervention of future.chosen_mccs.interventions) {
      // The target shape is being modified to restore RSR
      // Other shapes should be preserved
      preserved.add(intervention.target_shape_id);
    }

    return Array.from(preserved).sort();
  }

  /**
   * Compute handoffs that must remain intact
   */
  private computePreservedHandoffs(future: NecessaryFuture): string[] {
    const preserved: Set<string> = new Set();

    // Handoffs involved in interventions must remain
    for (const intervention of future.chosen_mccs.interventions) {
      preserved.add(intervention.target_handoff_id);
    }

    return Array.from(preserved).sort();
  }

  /**
   * Compute required operations from interventions
   */
  private computeRequiredOperations(interventions: CausalIntervention[]): string[] {
    const operations: Set<string> = new Set();

    for (const intervention of interventions) {
      operations.add(intervention.intervention_type);
    }

    return Array.from(operations).sort();
  }

  /**
   * Derive allowed action signatures from the future
   */
  private deriveAllowedSignatures(
    future: NecessaryFuture,
    derivation: CausalCone['derivation']
  ): ActionSignature[] {
    const signatures: ActionSignature[] = [];

    // The primary allowed signature is the one from the future itself
    signatures.push(future.allowed_signature);

    // Derive additional signatures that lie on the causal cone
    // These are signatures that:
    // 1. Only affect preserved shapes
    // 2. Only use allowed operations
    // 3. Do not contradict the future

    // Generate READ-only signatures for preserved shapes
    const readOnlySignature = this.generateReadOnlySignature(derivation);
    if (readOnlySignature) {
      signatures.push(readOnlySignature);
    }

    // Generate RESTORE signatures for shapes that need restoration
    const restoreSignatures = this.generateRestoreSignatures(future, derivation);
    signatures.push(...restoreSignatures);

    return signatures;
  }

  /**
   * Generate a READ-only signature for preserved shapes
   */
  private generateReadOnlySignature(derivation: CausalCone['derivation']): ActionSignature | null {
    if (derivation.preserved_shapes.length === 0) {
      return null;
    }

    const signatureId = `SIG-READ-${Date.now().toString(36)}`;

    const components: ActionSignature['components'] = {
      affected_shapes: derivation.preserved_shapes,
      affected_handoffs: [],
      transform_types: ['READ'],
      change_directions: []
    };

    return {
      signature_id: signatureId,
      fingerprint: this.computeFingerprint(components),
      components,
      computed_at: new Date().toISOString(),
      run_id: `ICE-READ-${signatureId}`
    };
  }

  /**
   * Generate RESTORE signatures for shapes needing restoration
   */
  private generateRestoreSignatures(
    future: NecessaryFuture,
    derivation: CausalCone['derivation']
  ): ActionSignature[] {
    const signatures: ActionSignature[] = [];

    // Each intervention generates an allowed signature
    for (const intervention of derivation.required_interventions) {
      const signatureId = `SIG-RESTORE-${intervention.target_shape_id.substring(0, 8)}`;

      const components: ActionSignature['components'] = {
        affected_shapes: [intervention.target_shape_id],
        affected_handoffs: [intervention.target_handoff_id],
        transform_types: [intervention.intervention_type],
        change_directions: ['MODIFY']
      };

      signatures.push({
        signature_id: signatureId,
        fingerprint: this.computeFingerprint(components),
        components,
        computed_at: new Date().toISOString(),
        run_id: `ICE-RESTORE-${signatureId}`
      });
    }

    return signatures;
  }

  /**
   * Derive intent fingerprints from allowed signatures
   */
  private deriveIntentFingerprints(
    signatures: ActionSignature[],
    derivation: CausalCone['derivation']
  ): string[] {
    const fingerprints: Set<string> = new Set();

    // Add fingerprints from allowed signatures
    for (const sig of signatures) {
      fingerprints.add(sig.fingerprint);
    }

    // Generate intent fingerprints for allowed operations
    // These are fingerprints that represent valid intents

    // READ intents are always allowed
    const readFingerprint = this.computeIntentFingerprint({
      target_shapes: derivation.preserved_shapes,
      target_handoffs: [],
      intended_operations: ['READ'],
      expected_outcome: 'PRESERVE'
    });
    fingerprints.add(readFingerprint);

    // RESTORE intents for required interventions
    for (const intervention of derivation.required_interventions) {
      const restoreFingerprint = this.computeIntentFingerprint({
        target_shapes: [intervention.target_shape_id],
        target_handoffs: [intervention.target_handoff_id],
        intended_operations: ['UPDATE', 'TRANSFORM'],
        expected_outcome: 'RESTORE'
      });
      fingerprints.add(restoreFingerprint);
    }

    return Array.from(fingerprints).sort();
  }

  /**
   * Compute exclusions (what is definitely outside the cone)
   */
  private computeExclusions(
    future: NecessaryFuture,
    derivation: CausalCone['derivation']
  ): CausalCone['exclusions'] {
    // Shapes that CANNOT be modified (would break the future)
    const forbiddenShapeModifications: Set<string> = new Set();

    // Any shape NOT in the intervention list should not be destructively modified
    // (We don't know all shapes, so we track the inverse - shapes that CAN be modified)
    // For now, we mark shapes that would break invariants

    // Handoffs that CANNOT be broken
    const forbiddenHandoffBreaks: Set<string> = new Set();

    // Handoffs required by the future must not be broken
    for (const intervention of derivation.required_interventions) {
      forbiddenHandoffBreaks.add(intervention.target_handoff_id);
    }

    // Operations that CANNOT occur
    const forbiddenOperations: Set<string> = new Set();

    // DELETE operations are forbidden as they destroy shapes
    forbiddenOperations.add('DELETE');

    // Any operation that would contradict the future
    // (Operations that increase entropy or break preserved shapes)
    forbiddenOperations.add('DESTROY');

    return {
      forbidden_shape_modifications: Array.from(forbiddenShapeModifications).sort(),
      forbidden_handoff_breaks: Array.from(forbiddenHandoffBreaks).sort(),
      forbidden_operations: Array.from(forbiddenOperations).sort()
    };
  }

  /**
   * Extract allowed patterns from the cone
   */
  private extractAllowedPatterns(
    cone: CausalCone,
    future: NecessaryFuture
  ): IntentAllowlist['allowed_patterns'] {
    // Shapes that intents CAN target
    const targetableShapes = new Set<string>();

    // Add preserved shapes (can be read)
    for (const shape of cone.derivation.preserved_shapes) {
      targetableShapes.add(shape);
    }

    // Add shapes from allowed signatures
    for (const sig of cone.allowed_signatures) {
      for (const shape of sig.components.affected_shapes) {
        targetableShapes.add(shape);
      }
    }

    // Handoffs that intents CAN affect
    const targetableHandoffs = new Set<string>();

    for (const sig of cone.allowed_signatures) {
      for (const handoff of sig.components.affected_handoffs) {
        targetableHandoffs.add(handoff);
      }
    }

    // Add preserved handoffs
    for (const handoff of cone.derivation.preserved_handoffs) {
      targetableHandoffs.add(handoff);
    }

    // Operations that are allowed
    const allowedOperations: Set<'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'TRANSFORM'> = new Set();
    allowedOperations.add('READ'); // Always allowed

    // Add operations from interventions
    for (const intervention of cone.derivation.required_interventions) {
      const opType = intervention.intervention_type;
      // All intervention types allow UPDATE and TRANSFORM
      if (opType === 'ATTRIBUTE_PRESERVATION' ||
          opType === 'SUMMARIZATION_BYPASS' ||
          opType === 'INVARIANT_ENFORCEMENT') {
        allowedOperations.add('UPDATE');
        allowedOperations.add('TRANSFORM');
      }
    }

    // Outcomes that are allowed
    const allowedOutcomes: ('RESTORE' | 'MODIFY' | 'PRESERVE')[] = ['RESTORE', 'MODIFY', 'PRESERVE'];

    return {
      targetable_shapes: Array.from(targetableShapes).sort(),
      targetable_handoffs: Array.from(targetableHandoffs).sort(),
      allowed_operations: Array.from(allowedOperations) as ('CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'TRANSFORM')[],
      allowed_outcomes: allowedOutcomes
    };
  }

  /**
   * Compute fingerprint for action signature components
   */
  private computeFingerprint(components: ActionSignature['components']): string {
    const canonical = {
      shapes: components.affected_shapes,
      handoffs: components.affected_handoffs,
      transforms: components.transform_types,
      directions: components.change_directions
    };

    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Compute fingerprint for intent components
   */
  private computeIntentFingerprint(components: {
    target_shapes: string[];
    target_handoffs: string[];
    intended_operations: string[];
    expected_outcome: string;
  }): string {
    const canonical = {
      shapes: components.target_shapes.sort(),
      handoffs: components.target_handoffs.sort(),
      operations: components.intended_operations.sort(),
      outcome: components.expected_outcome
    };

    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Check if an intent fingerprint is in the allowlist
   */
  isIntentAllowed(intentFingerprint: string, allowlist: IntentAllowlist): boolean {
    const fingerprints = Array.isArray(allowlist.allowed_fingerprints)
      ? allowlist.allowed_fingerprints
      : Array.from(allowlist.allowed_fingerprints);

    return fingerprints.includes(intentFingerprint);
  }

  /**
   * Get derivation summary
   */
  getDerivationSummary(cone: CausalCone): {
    total_allowed_signatures: number;
    total_allowed_fingerprints: number;
    required_interventions: number;
    preserved_shapes: number;
    forbidden_operations: number;
  } {
    return {
      total_allowed_signatures: cone.allowed_signatures.length,
      total_allowed_fingerprints: cone.allowed_intent_fingerprints.length,
      required_interventions: cone.derivation.required_interventions.length,
      preserved_shapes: cone.derivation.preserved_shapes.length,
      forbidden_operations: cone.exclusions.forbidden_operations.length
    };
  }
}
