/**
 * Intent Classifier
 *
 * Deterministically classifies incoming intents against the IntentAllowlist.
 *
 * CLASSIFICATION:
 * - ALIGNED: Intent lies on causal cone of NecessaryFuture (allowed)
 * - NON_CAUSAL: Intent has no causal path to NecessaryFuture (rejected)
 * - CONTRADICTORY: Intent causally opposes NecessaryFuture (rejected)
 * - REDUNDANT: Intent is subsumed by another allowed intent (rejected)
 *
 * KEY PRINCIPLE:
 * - Deterministic classification (same input → same output)
 * - No heuristics, ML, or probability
 * - No human judgment
 *
 * NON-NEGOTIABLE:
 * - Classification is binary for each class
 * - No "maybe" or "partial" classifications
 * - Proof chain required for each classification
 */

import * as crypto from 'crypto';
import type {
  IntentSignature,
  IntentClass,
  IntentClassification,
  IntentAllowlist,
  CausalCone,
  NecessaryFuture
} from './types';

// ICE version - immutable
const ICE_VERSION = '1.0.0';
Object.freeze({ ICE_VERSION });

export class IntentClassifier {
  /**
   * Classify an intent against the allowlist and cone
   */
  classify(
    intent: IntentSignature,
    allowlist: IntentAllowlist,
    cone: CausalCone,
    future: NecessaryFuture
  ): IntentClassification {
    const now = new Date().toISOString();

    // Check pattern matches
    const patternMatches = this.checkPatternMatches(intent, allowlist);

    // Determine classification
    const { classification, violatedRequirement } = this.determineClassification(
      intent,
      allowlist,
      cone,
      patternMatches
    );

    // Determine if allowed
    const allowed = classification === 'ALIGNED';

    // Build causal analysis
    const causalAnalysis = this.buildCausalAnalysis(
      intent,
      classification,
      cone,
      violatedRequirement
    );

    return {
      intent,
      classification,
      allowed,
      causal_analysis: causalAnalysis,
      match_details: {
        cone_id: cone.cone_id,
        future_id: future.future_id,
        pattern_matches: patternMatches
      },
      classified_at: now
    };
  }

  /**
   * Classify multiple intents
   */
  classifyAll(
    intents: IntentSignature[],
    allowlist: IntentAllowlist,
    cone: CausalCone,
    future: NecessaryFuture
  ): IntentClassification[] {
    return intents.map(intent => this.classify(intent, allowlist, cone, future));
  }

  /**
   * Check pattern matches between intent and allowlist
   */
  private checkPatternMatches(
    intent: IntentSignature,
    allowlist: IntentAllowlist
  ): IntentClassification['match_details']['pattern_matches'] {
    const patterns = allowlist.allowed_patterns;

    // Check shapes match
    const shapesMatch = this.checkArrayOverlap(
      intent.components.target_shapes,
      patterns.targetable_shapes
    );

    // Check handoffs match
    const handoffsMatch = intent.components.target_handoffs.length === 0 ||
      this.checkArrayOverlap(
        intent.components.target_handoffs,
        patterns.targetable_handoffs
      );

    // Check operations match
    const operationsMatch = this.checkArraySubset(
      intent.components.intended_operations,
      patterns.allowed_operations
    );

    // Check outcomes match
    const outcomesMatch = patterns.allowed_outcomes.includes(
      intent.components.expected_outcome as 'RESTORE' | 'MODIFY' | 'PRESERVE'
    );

    return {
      shapes_match: shapesMatch,
      handoffs_match: handoffsMatch,
      operations_match: operationsMatch,
      outcomes_match: outcomesMatch
    };
  }

  /**
   * Determine the classification based on pattern matches and allowlist
   */
  private determineClassification(
    intent: IntentSignature,
    allowlist: IntentAllowlist,
    cone: CausalCone,
    patternMatches: IntentClassification['match_details']['pattern_matches']
  ): { classification: IntentClass; violatedRequirement: string | null } {
    // Step 1: Check if intent fingerprint is directly in allowlist
    const fingerprints = Array.isArray(allowlist.allowed_fingerprints)
      ? allowlist.allowed_fingerprints
      : Array.from(allowlist.allowed_fingerprints);

    if (fingerprints.includes(intent.fingerprint)) {
      return { classification: 'ALIGNED', violatedRequirement: null };
    }

    // Step 2: Check for CONTRADICTORY (directly opposes the future)
    const contradicts = this.checkContradiction(intent, cone);
    if (contradicts.isContradictory) {
      return {
        classification: 'CONTRADICTORY',
        violatedRequirement: contradicts.reason
      };
    }

    // Step 3: Check pattern-based alignment
    if (patternMatches.shapes_match &&
        patternMatches.handoffs_match &&
        patternMatches.operations_match &&
        patternMatches.outcomes_match) {
      return { classification: 'ALIGNED', violatedRequirement: null };
    }

    // Step 4: Check for REDUNDANT (subsumed by another intent)
    const redundant = this.checkRedundancy(intent, cone);
    if (redundant.isRedundant) {
      return {
        classification: 'REDUNDANT',
        violatedRequirement: redundant.reason
      };
    }

    // Step 5: Default to NON_CAUSAL (no causal path to future)
    const violatedRequirement = this.determineViolatedRequirement(patternMatches);
    return {
      classification: 'NON_CAUSAL',
      violatedRequirement
    };
  }

  /**
   * Check if intent contradicts the NecessaryFuture
   */
  private checkContradiction(
    intent: IntentSignature,
    cone: CausalCone
  ): { isContradictory: boolean; reason: string | null } {
    // Check forbidden operations
    for (const op of intent.components.intended_operations) {
      if (cone.exclusions.forbidden_operations.includes(op)) {
        return {
          isContradictory: true,
          reason: `Operation '${op}' is forbidden by NecessaryFuture.`
        };
      }
    }

    // Check forbidden shape modifications
    for (const shape of intent.components.target_shapes) {
      if (cone.exclusions.forbidden_shape_modifications.includes(shape) &&
          intent.components.expected_outcome === 'DESTROY') {
        return {
          isContradictory: true,
          reason: `Destructive modification of shape '${shape}' would break NecessaryFuture.`
        };
      }
    }

    // Check forbidden handoff breaks
    for (const handoff of intent.components.target_handoffs) {
      if (cone.exclusions.forbidden_handoff_breaks.includes(handoff) &&
          intent.components.intended_operations.includes('DELETE')) {
        return {
          isContradictory: true,
          reason: `Breaking handoff '${handoff}' would break NecessaryFuture.`
        };
      }
    }

    // Check if intent outcome is DESTROY
    if (intent.components.expected_outcome === 'DESTROY') {
      return {
        isContradictory: true,
        reason: 'DESTROY outcome is incompatible with any NecessaryFuture.'
      };
    }

    return { isContradictory: false, reason: null };
  }

  /**
   * Check if intent is redundant (subsumed by another allowed intent)
   */
  private checkRedundancy(
    intent: IntentSignature,
    cone: CausalCone
  ): { isRedundant: boolean; reason: string | null } {
    // Check if all target shapes are already covered by existing signatures
    const coveredShapes = new Set<string>();
    for (const sig of cone.allowed_signatures) {
      for (const shape of sig.components.affected_shapes) {
        coveredShapes.add(shape);
      }
    }

    const allShapesCovered = intent.components.target_shapes.every(
      shape => coveredShapes.has(shape)
    );

    // If intent is a pure subset of existing coverage and is READ-only
    if (allShapesCovered &&
        intent.components.intended_operations.length === 1 &&
        intent.components.intended_operations[0] === 'READ' &&
        intent.components.expected_outcome === 'PRESERVE') {
      // This is allowed, not redundant
      return { isRedundant: false, reason: null };
    }

    // Check for exact duplicate
    for (const fingerprint of cone.allowed_intent_fingerprints) {
      if (fingerprint === intent.fingerprint) {
        return {
          isRedundant: true,
          reason: 'Intent is an exact duplicate of an already allowed intent.'
        };
      }
    }

    return { isRedundant: false, reason: null };
  }

  /**
   * Determine which requirement was violated
   */
  private determineViolatedRequirement(
    patternMatches: IntentClassification['match_details']['pattern_matches']
  ): string {
    const violations: string[] = [];

    if (!patternMatches.shapes_match) {
      violations.push('target shapes not on causal cone');
    }
    if (!patternMatches.handoffs_match) {
      violations.push('target handoffs not in allowed set');
    }
    if (!patternMatches.operations_match) {
      violations.push('intended operations not allowed');
    }
    if (!patternMatches.outcomes_match) {
      violations.push('expected outcome not compatible with future');
    }

    return violations.join('; ') || 'No causal path to NecessaryFuture exists.';
  }

  /**
   * Build causal analysis for the classification
   */
  private buildCausalAnalysis(
    intent: IntentSignature,
    classification: IntentClass,
    cone: CausalCone,
    violatedRequirement: string | null
  ): IntentClassification['causal_analysis'] {
    return {
      on_causal_cone: classification === 'ALIGNED',
      contradicts_future: classification === 'CONTRADICTORY',
      is_redundant: classification === 'REDUNDANT',
      violated_requirement: violatedRequirement
    };
  }

  /**
   * Check if two arrays have any overlap
   */
  private checkArrayOverlap(arr1: string[], arr2: string[]): boolean {
    if (arr1.length === 0) {
      return true; // Empty array trivially overlaps
    }
    return arr1.some(item => arr2.includes(item));
  }

  /**
   * Check if arr1 is a subset of arr2
   */
  private checkArraySubset(arr1: string[], arr2: string[]): boolean {
    if (arr1.length === 0) {
      return true; // Empty array is trivially a subset
    }
    return arr1.every(item => arr2.includes(item));
  }

  /**
   * Create an intent signature from raw components
   */
  createIntentSignature(
    agentId: string,
    runId: string,
    targetShapes: string[],
    targetHandoffs: string[],
    intendedOperations: ('CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'TRANSFORM')[],
    expectedOutcome: 'RESTORE' | 'MODIFY' | 'PRESERVE' | 'DESTROY'
  ): IntentSignature {
    const intentId = `INT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const components: IntentSignature['components'] = {
      target_shapes: targetShapes.sort(),
      target_handoffs: targetHandoffs.sort(),
      intended_operations: intendedOperations.sort() as typeof intendedOperations,
      expected_outcome: expectedOutcome
    };

    const fingerprint = this.computeIntentFingerprint(components);

    return {
      intent_id: intentId,
      fingerprint,
      components,
      source: {
        agent_id: agentId,
        run_id: runId,
        timestamp: now
      }
    };
  }

  /**
   * Compute fingerprint for intent components
   */
  private computeIntentFingerprint(components: IntentSignature['components']): string {
    const canonical = {
      shapes: components.target_shapes,
      handoffs: components.target_handoffs,
      operations: components.intended_operations,
      outcome: components.expected_outcome
    };

    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Get classification summary
   */
  getClassificationSummary(classifications: IntentClassification[]): {
    total: number;
    aligned: number;
    non_causal: number;
    contradictory: number;
    redundant: number;
    allowed: number;
    rejected: number;
    rejection_rate: number;
  } {
    const total = classifications.length;
    const aligned = classifications.filter(c => c.classification === 'ALIGNED').length;
    const nonCausal = classifications.filter(c => c.classification === 'NON_CAUSAL').length;
    const contradictory = classifications.filter(c => c.classification === 'CONTRADICTORY').length;
    const redundant = classifications.filter(c => c.classification === 'REDUNDANT').length;
    const allowed = classifications.filter(c => c.allowed).length;
    const rejected = total - allowed;

    return {
      total,
      aligned,
      non_causal: nonCausal,
      contradictory,
      redundant,
      allowed,
      rejected,
      rejection_rate: total > 0 ? rejected / total : 0
    };
  }

  /**
   * Generate explanation for a classification
   */
  generateExplanation(classification: IntentClassification): string[] {
    const explanation: string[] = [];

    explanation.push(`Intent: ${classification.intent.intent_id}`);
    explanation.push(`Fingerprint: ${classification.intent.fingerprint}`);
    explanation.push(`Classification: ${classification.classification}`);
    explanation.push(`Allowed: ${classification.allowed ? 'YES' : 'NO'}`);

    if (!classification.allowed) {
      explanation.push('');
      explanation.push('REJECTION REASON:');
      explanation.push(`  Violated Requirement: ${classification.causal_analysis.violated_requirement}`);

      if (classification.classification === 'CONTRADICTORY') {
        explanation.push('  Type: Intent directly contradicts NecessaryFuture.');
      } else if (classification.classification === 'NON_CAUSAL') {
        explanation.push('  Type: Intent has no causal path to NecessaryFuture.');
      } else if (classification.classification === 'REDUNDANT') {
        explanation.push('  Type: Intent is subsumed by another allowed intent.');
      }
    }

    explanation.push('');
    explanation.push('PATTERN MATCHES:');
    const pm = classification.match_details.pattern_matches;
    explanation.push(`  Shapes: ${pm.shapes_match ? '✓' : '✗'}`);
    explanation.push(`  Handoffs: ${pm.handoffs_match ? '✓' : '✗'}`);
    explanation.push(`  Operations: ${pm.operations_match ? '✓' : '✗'}`);
    explanation.push(`  Outcomes: ${pm.outcomes_match ? '✓' : '✗'}`);

    return explanation;
  }
}
