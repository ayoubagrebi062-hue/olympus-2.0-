/**
 * Rewrite Enforcer
 *
 * Enforces canonical form on all intents.
 *
 * KEY PRINCIPLE:
 * - Every intent MUST be expressed in its canonical form
 * - Non-canonical intents are rewritten, not rejected
 * - Rewrite proof documents the transformation
 *
 * ENFORCEMENT RULES:
 * 1. If intent is already canonical → PASSTHROUGH
 * 2. If intent differs from canonical → REWRITE_INTENT
 * 3. Rewritten intent replaces original (irreversible)
 * 4. Full proof chain for every rewrite
 *
 * NON-NEGOTIABLE:
 * - Deterministic enforcement
 * - No human override
 * - Append-only history
 */

import * as crypto from 'crypto';
import type {
  IntentSignature,
  CanonicalIntent,
  MinimalStructuralIntent,
  RewriteProof,
  RewriteResult
} from './types';

// CIN version - immutable
const CIN_VERSION = '1.0.0';
Object.freeze({ CIN_VERSION });

export class RewriteEnforcer {
  /**
   * Enforce canonical form on an intent
   *
   * @param intent The original intent
   * @param canonical The canonical form for this intent
   * @param msi The minimal structural intent (intermediate form)
   * @param runId The current run ID
   */
  enforce(
    intent: IntentSignature,
    canonical: CanonicalIntent,
    msi: MinimalStructuralIntent,
    runId: string
  ): RewriteResult {
    const rewriteId = `RW-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Check if intent is already canonical
    const isCanonical = this.isIntentCanonical(intent, canonical);

    if (isCanonical) {
      // PASSTHROUGH: Intent is already in canonical form
      return this.createPassthroughResult(
        rewriteId,
        runId,
        now,
        intent,
        canonical
      );
    } else {
      // REWRITE_INTENT: Intent differs from canonical form
      return this.createRewriteResult(
        rewriteId,
        runId,
        now,
        intent,
        canonical,
        msi
      );
    }
  }

  /**
   * Check if an intent is already in canonical form
   */
  private isIntentCanonical(intent: IntentSignature, canonical: CanonicalIntent): boolean {
    // Compare intent components with canonical components
    const intentShapes = new Set(intent.components.target_shapes);
    const canonicalShapes = new Set(canonical.canonical_components.shapes);

    const intentHandoffs = new Set(intent.components.target_handoffs);
    const canonicalHandoffs = new Set(canonical.canonical_components.handoffs);

    // Filter out DELETE from intent operations (forbidden)
    const intentOps = intent.components.intended_operations.filter(op => op !== 'DELETE');
    const canonicalOps = canonical.canonical_components.operations;

    // Check shapes match exactly
    if (!this.setsEqual(intentShapes, canonicalShapes)) {
      return false;
    }

    // Check handoffs match exactly
    if (!this.setsEqual(intentHandoffs, canonicalHandoffs)) {
      return false;
    }

    // Check operations match (order matters for canonical form)
    if (intentOps.length !== canonicalOps.length) {
      return false;
    }
    for (let i = 0; i < intentOps.length; i++) {
      if (intentOps[i] !== canonicalOps[i]) {
        return false;
      }
    }

    // Check outcome matches
    const intentOutcome = intent.components.expected_outcome;
    const canonicalOutcome = canonical.canonical_components.outcome;

    // DESTROY is never canonical, so if intent has DESTROY it's not canonical
    if (intentOutcome === 'DESTROY') {
      return false;
    }

    return intentOutcome === canonicalOutcome;
  }

  /**
   * Check if two sets are equal
   */
  private setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  /**
   * Create a PASSTHROUGH result (intent is already canonical)
   */
  private createPassthroughResult(
    rewriteId: string,
    runId: string,
    timestamp: string,
    intent: IntentSignature,
    canonical: CanonicalIntent
  ): RewriteResult {
    // Create output intent (same as input since it's canonical)
    const outputIntent: IntentSignature = {
      ...intent,
      // Mark as canonical by updating the fingerprint
      fingerprint: canonical.canonical_fingerprint
    };

    return {
      rewrite_id: rewriteId,
      run_id: runId,
      timestamp,
      original_intent: intent,
      action: 'PASSTHROUGH',
      rewrite_necessary: false,
      canonical_intent: canonical,
      rewrite_proof: null,
      output_intent: outputIntent,
      enforcement_proof: {
        reduction_deterministic: true,
        canonicalization_unique: true,
        rewrite_reversible: false,
        no_information_loss: true, // No rewrite means no loss
        no_heuristics: true,
        no_ml: true,
        no_config: true,
        no_override: true
      }
    };
  }

  /**
   * Create a REWRITE_INTENT result (intent differs from canonical)
   */
  private createRewriteResult(
    rewriteId: string,
    runId: string,
    timestamp: string,
    intent: IntentSignature,
    canonical: CanonicalIntent,
    msi: MinimalStructuralIntent
  ): RewriteResult {
    // Build rewrite proof
    const rewriteProof = this.buildRewriteProof(
      rewriteId,
      intent,
      canonical
    );

    // Create canonical output intent
    const outputIntent = this.createCanonicalIntent(intent, canonical);

    // Check if information was lost
    const noInformationLoss = this.checkNoInformationLoss(intent, canonical, msi);

    return {
      rewrite_id: rewriteId,
      run_id: runId,
      timestamp,
      original_intent: intent,
      action: 'REWRITE_INTENT',
      rewrite_necessary: true,
      canonical_intent: canonical,
      rewrite_proof: rewriteProof,
      output_intent: outputIntent,
      enforcement_proof: {
        reduction_deterministic: true,
        canonicalization_unique: true,
        rewrite_reversible: false, // Rewrites are NOT reversible (by design)
        no_information_loss: noInformationLoss,
        no_heuristics: true,
        no_ml: true,
        no_config: true,
        no_override: true
      }
    };
  }

  /**
   * Build rewrite proof documenting the transformation
   */
  private buildRewriteProof(
    rewriteId: string,
    intent: IntentSignature,
    canonical: CanonicalIntent
  ): RewriteProof {
    // Compute structural equivalence
    const equivalenceProof = this.computeEquivalenceProof(intent, canonical);

    // Compute what changed
    const changes = this.computeChanges(intent, canonical);

    // Determine rewrite reason
    const rewriteReason = this.determineRewriteReason(changes);

    return {
      rewrite_id: rewriteId,
      original_intent: intent,
      original_fingerprint: intent.fingerprint,
      canonical_intent: canonical,
      canonical_fingerprint: canonical.canonical_fingerprint,
      equivalence_proof: equivalenceProof,
      rewrite_reason: rewriteReason,
      changes,
      rewritten_at: new Date().toISOString()
    };
  }

  /**
   * Compute structural equivalence proof
   */
  private computeEquivalenceProof(
    intent: IntentSignature,
    canonical: CanonicalIntent
  ): RewriteProof['equivalence_proof'] {
    // Compare essential shapes
    // After reduction, canonical shapes are the essential ones
    const canonicalShapeSet = new Set(canonical.canonical_components.shapes);
    const intentShapeSet = new Set(intent.components.target_shapes);

    // Check if intent shapes contain all canonical shapes (essential shapes)
    let sameEssentialShapes = true;
    for (const shape of canonicalShapeSet) {
      if (!intentShapeSet.has(shape)) {
        sameEssentialShapes = false;
        break;
      }
    }

    // Compare essential handoffs
    const canonicalHandoffSet = new Set(canonical.canonical_components.handoffs);
    const intentHandoffSet = new Set(intent.components.target_handoffs);

    let sameEssentialHandoffs = true;
    for (const handoff of canonicalHandoffSet) {
      if (!intentHandoffSet.has(handoff)) {
        sameEssentialHandoffs = false;
        break;
      }
    }

    // Compare essential operations
    const canonicalOps = canonical.canonical_components.operations;
    const intentOps = intent.components.intended_operations.filter(op => op !== 'DELETE');

    let sameEssentialOperations = true;
    for (const op of canonicalOps) {
      if (!intentOps.includes(op)) {
        sameEssentialOperations = false;
        break;
      }
    }

    // Compare essential outcome
    const canonicalOutcome = canonical.canonical_components.outcome;
    const intentOutcome = intent.components.expected_outcome;
    const sameEssentialOutcome =
      intentOutcome === canonicalOutcome ||
      (intentOutcome === 'DESTROY' && canonicalOutcome === 'MODIFY'); // DESTROY maps to MODIFY

    // Overall structural equivalence
    const structurallyEquivalent =
      sameEssentialShapes &&
      sameEssentialHandoffs &&
      sameEssentialOperations &&
      sameEssentialOutcome;

    return {
      same_essential_shapes: sameEssentialShapes,
      same_essential_handoffs: sameEssentialHandoffs,
      same_essential_operations: sameEssentialOperations,
      same_essential_outcome: sameEssentialOutcome,
      structurally_equivalent: structurallyEquivalent
    };
  }

  /**
   * Compute what changed between original and canonical
   */
  private computeChanges(
    intent: IntentSignature,
    canonical: CanonicalIntent
  ): RewriteProof['changes'] {
    const intentShapes = new Set(intent.components.target_shapes);
    const canonicalShapes = new Set(canonical.canonical_components.shapes);

    const intentHandoffs = new Set(intent.components.target_handoffs);
    const canonicalHandoffs = new Set(canonical.canonical_components.handoffs);

    const intentOps = new Set(intent.components.intended_operations);
    const canonicalOps = new Set(canonical.canonical_components.operations);

    // Shapes added (in canonical but not in intent)
    const shapesAdded: string[] = [];
    for (const shape of canonicalShapes) {
      if (!intentShapes.has(shape)) {
        shapesAdded.push(shape);
      }
    }

    // Shapes removed (in intent but not in canonical)
    const shapesRemoved: string[] = [];
    for (const shape of intentShapes) {
      if (!canonicalShapes.has(shape)) {
        shapesRemoved.push(shape);
      }
    }

    // Handoffs added
    const handoffsAdded: string[] = [];
    for (const handoff of canonicalHandoffs) {
      if (!intentHandoffs.has(handoff)) {
        handoffsAdded.push(handoff);
      }
    }

    // Handoffs removed
    const handoffsRemoved: string[] = [];
    for (const handoff of intentHandoffs) {
      if (!canonicalHandoffs.has(handoff)) {
        handoffsRemoved.push(handoff);
      }
    }

    // Operations added
    const operationsAdded: string[] = [];
    for (const op of canonicalOps) {
      if (!intentOps.has(op)) {
        operationsAdded.push(op);
      }
    }

    // Operations removed
    const operationsRemoved: string[] = [];
    for (const op of intentOps) {
      if (!canonicalOps.has(op as any)) {
        operationsRemoved.push(op);
      }
    }

    // Outcome changed
    const intentOutcome = intent.components.expected_outcome;
    const canonicalOutcome = canonical.canonical_components.outcome;
    const outcomeChanged = intentOutcome !== canonicalOutcome;

    return {
      shapes_added: shapesAdded.sort(),
      shapes_removed: shapesRemoved.sort(),
      handoffs_added: handoffsAdded.sort(),
      handoffs_removed: handoffsRemoved.sort(),
      operations_added: operationsAdded.sort(),
      operations_removed: operationsRemoved.sort(),
      outcome_changed: outcomeChanged
    };
  }

  /**
   * Determine the rewrite reason from changes
   */
  private determineRewriteReason(changes: RewriteProof['changes']): string {
    const reasons: string[] = [];

    if (changes.shapes_removed.length > 0) {
      reasons.push(`Removed ${changes.shapes_removed.length} non-essential shapes`);
    }
    if (changes.shapes_added.length > 0) {
      reasons.push(`Added ${changes.shapes_added.length} missing essential shapes`);
    }
    if (changes.handoffs_removed.length > 0) {
      reasons.push(`Removed ${changes.handoffs_removed.length} non-essential handoffs`);
    }
    if (changes.handoffs_added.length > 0) {
      reasons.push(`Added ${changes.handoffs_added.length} missing essential handoffs`);
    }
    if (changes.operations_removed.length > 0) {
      reasons.push(`Removed operations: ${changes.operations_removed.join(', ')}`);
    }
    if (changes.operations_added.length > 0) {
      reasons.push(`Added operations: ${changes.operations_added.join(', ')}`);
    }
    if (changes.outcome_changed) {
      reasons.push('Outcome normalized to canonical form');
    }

    if (reasons.length === 0) {
      return 'Intent normalized to canonical ordering';
    }

    return reasons.join('; ');
  }

  /**
   * Create a canonical output intent
   */
  private createCanonicalIntent(
    original: IntentSignature,
    canonical: CanonicalIntent
  ): IntentSignature {
    return {
      intent_id: `${original.intent_id}-CAN`,
      fingerprint: canonical.canonical_fingerprint,
      components: {
        target_shapes: [...canonical.canonical_components.shapes],
        target_handoffs: [...canonical.canonical_components.handoffs],
        intended_operations: [...canonical.canonical_components.operations],
        expected_outcome: canonical.canonical_components.outcome
      },
      source: {
        agent_id: original.source.agent_id,
        run_id: original.source.run_id,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Check if information was lost during rewrite
   *
   * Information is lost if the rewrite removes essential components
   * that were actually needed for the intent's goal.
   * However, by definition, anything stripped by MSI reduction
   * was not MCCS-backed and therefore not essential.
   */
  private checkNoInformationLoss(
    intent: IntentSignature,
    canonical: CanonicalIntent,
    msi: MinimalStructuralIntent
  ): boolean {
    // If the MSI is fully backed by MCCS, no essential information is lost
    return msi.mccs_backing.fully_backed;
  }

  /**
   * Verify a rewrite result
   */
  verifyRewriteResult(result: RewriteResult): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check action consistency
    if (result.action === 'PASSTHROUGH' && result.rewrite_necessary) {
      issues.push('PASSTHROUGH action but rewrite_necessary is true');
    }
    if (result.action === 'REWRITE_INTENT' && !result.rewrite_necessary) {
      issues.push('REWRITE_INTENT action but rewrite_necessary is false');
    }

    // Check proof presence
    if (result.action === 'REWRITE_INTENT' && !result.rewrite_proof) {
      issues.push('REWRITE_INTENT action but no rewrite_proof');
    }

    // Check output intent fingerprint matches canonical
    if (result.output_intent.fingerprint !== result.canonical_intent.canonical_fingerprint) {
      issues.push('Output intent fingerprint does not match canonical fingerprint');
    }

    // Check enforcement proof
    if (!result.enforcement_proof.reduction_deterministic) {
      issues.push('Enforcement proof claims non-deterministic reduction');
    }
    if (!result.enforcement_proof.canonicalization_unique) {
      issues.push('Enforcement proof claims non-unique canonicalization');
    }
    if (result.enforcement_proof.rewrite_reversible !== false) {
      issues.push('Enforcement proof incorrectly claims rewrites are reversible');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get rewrite statistics from a set of results
   */
  getRewriteStats(results: RewriteResult[]): {
    total: number;
    passthroughs: number;
    rewrites: number;
    rewrite_rate: number;
    information_preserved: number;
    information_lost: number;
  } {
    let passthroughs = 0;
    let rewrites = 0;
    let informationPreserved = 0;
    let informationLost = 0;

    for (const result of results) {
      if (result.action === 'PASSTHROUGH') {
        passthroughs++;
        informationPreserved++;
      } else {
        rewrites++;
        if (result.enforcement_proof.no_information_loss) {
          informationPreserved++;
        } else {
          informationLost++;
        }
      }
    }

    const total = results.length;
    const rewriteRate = total > 0 ? rewrites / total : 0;

    return {
      total,
      passthroughs,
      rewrites,
      rewrite_rate: rewriteRate,
      information_preserved: informationPreserved,
      information_lost: informationLost
    };
  }
}
