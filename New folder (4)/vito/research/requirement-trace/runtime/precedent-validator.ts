/**
 * Precedent Validator
 *
 * Scans prior proofs for active forbidden invariants.
 * If current proof conflicts, requires explicit refutation section.
 * Otherwise HARD_ABORT.
 *
 * KEY PRINCIPLE:
 * - OLYMPUS cannot contradict itself without explicit proof-level refutation
 * - Past decisions constrain future decisions
 * - Refutation must be explicit and justified
 *
 * VALIDATION CHECKS:
 * 1. Active forbidden invariants - Cannot violate without refutation
 * 2. Global precedents - System-wide constraints
 * 3. Direct parent constraints - Local consistency
 *
 * NON-NEGOTIABLE:
 * - No implicit contradictions
 * - Refutation must be explicit
 * - HARD_ABORT on unrefuted conflict
 */

import type {
  OlympusDecisionProof,
  PrecedentValidation,
  PrecedentMatch,
  RefutationRecord,
  InvariantCategory,
  LedgerEntry
} from './types';
import { ProofLedger } from './proof-ledger';

// PCL version - immutable
const PCL_VERSION = '1.0.0';
Object.freeze({ PCL_VERSION });

/**
 * Invariants that create HARD precedents (must be refuted to override)
 */
const HARD_PRECEDENT_INVARIANTS: InvariantCategory[] = [
  'ENTROPY_BUDGET_EXHAUSTED',
  'TEMPORAL_CONTRACT_MISSING',
  'TEMPORAL_CONTRACT_INVALID',
  'SINGULARITY_BREACH',
  'REALITY_LOCK_VIOLATED',
  'FUTURE_INEVITABILITY_VIOLATION',
  'ENTROPY_DRIFT_EXCEEDED',
  'MUTATION_LIMIT_EXCEEDED',
  'LIFESPAN_EXCEEDED'
];

/**
 * Invariants that create SOFT precedents (informational, not blocking)
 */
const SOFT_PRECEDENT_INVARIANTS: InvariantCategory[] = [
  'INTENT_COLLAPSE_FAILED',
  'CANONICAL_FORM_INVALID',
  'NECESSITY_NOT_ESTABLISHED'
];

/**
 * Validator configuration
 */
export interface PrecedentValidatorConfig {
  // Whether to enforce hard precedents
  enforce_hard_precedents?: boolean;

  // Whether to warn on soft precedent conflicts
  warn_soft_precedents?: boolean;

  // Maximum precedents to check
  max_precedents_to_check?: number;
}

export class PrecedentValidator {
  private config: Required<PrecedentValidatorConfig>;

  constructor(config?: Partial<PrecedentValidatorConfig>) {
    this.config = {
      enforce_hard_precedents: config?.enforce_hard_precedents ?? true,
      warn_soft_precedents: config?.warn_soft_precedents ?? true,
      max_precedents_to_check: config?.max_precedents_to_check ?? 1000
    };
  }

  /**
   * Validate a proof against precedents in the ledger
   *
   * @param proof The proof to validate
   * @param refutations Any explicit refutations provided
   * @param ledger The proof ledger
   * @returns Validation result
   */
  validate(
    proof: OlympusDecisionProof,
    refutations: RefutationRecord[],
    ledger: ProofLedger
  ): PrecedentValidation {
    const matches: PrecedentMatch[] = [];
    const blocking: PrecedentMatch[] = [];
    const errors: string[] = [];
    const requiredRefutations: PrecedentValidation['required_refutations'] = [];

    const entries = ledger.getAllEntries();

    // Limit entries to check
    const entriesToCheck = entries.slice(-this.config.max_precedents_to_check);

    // Step 1: Scan for forbidden alternative conflicts
    for (const entry of entriesToCheck) {
      const conflict = this.checkForbiddenAlternativeConflict(proof, entry);
      if (conflict) {
        matches.push(conflict);
        if (conflict.effect === 'BLOCKS' || conflict.effect === 'REQUIRES_REFUTATION') {
          blocking.push(conflict);
        }
      }
    }

    // Step 2: Scan for active invariant conflicts
    for (const entry of entriesToCheck) {
      const conflict = this.checkActiveInvariantConflict(proof, entry);
      if (conflict) {
        matches.push(conflict);
        if (conflict.effect === 'BLOCKS' || conflict.effect === 'REQUIRES_REFUTATION') {
          blocking.push(conflict);
        }
      }
    }

    // Step 3: Check global precedents
    for (const entry of entriesToCheck) {
      const globalConflict = this.checkGlobalPrecedentConflict(proof, entry);
      if (globalConflict) {
        matches.push(globalConflict);
        if (globalConflict.effect === 'BLOCKS' || globalConflict.effect === 'REQUIRES_REFUTATION') {
          blocking.push(globalConflict);
        }
      }
    }

    // Step 4: Check if blocking precedents have been refuted
    for (const block of blocking) {
      const isRefuted = this.isBlockingPrecedentRefuted(block, refutations);

      if (!isRefuted) {
        if (this.config.enforce_hard_precedents && block.strength === 'HARD') {
          requiredRefutations.push({
            proof_hash: block.proof_hash,
            invariant: this.parseInvariantFromElement(block.matching_element),
            reason: `Blocking precedent ${block.precedent_type}: ${block.matching_element}`
          });

          errors.push(
            `HARD_ABORT: Unrefuted precedent conflict with ${block.proof_run_id} ` +
            `(${block.precedent_type}: ${block.matching_element})`
          );
        }
      }
    }

    // Determine overall validity
    const valid = errors.length === 0;

    return {
      valid,
      matches,
      blocking,
      required_refutations: requiredRefutations,
      errors
    };
  }

  /**
   * Check for forbidden alternative conflict
   *
   * If the new proof's action matches a forbidden alternative from a prior proof,
   * it creates a conflict.
   */
  private checkForbiddenAlternativeConflict(
    newProof: OlympusDecisionProof,
    priorEntry: LedgerEntry
  ): PrecedentMatch | null {
    const priorProof = priorEntry.proof;
    const newActionHash = newProof.attempted_action_fingerprint.hash;

    // Check if new action matches any forbidden alternative
    for (const forbidden of priorProof.forbidden_alternatives) {
      if (this.hashesMatch(newActionHash, forbidden)) {
        return {
          proof_hash: priorProof.proof_hash,
          proof_run_id: priorProof.run_id,
          ledger_index: priorEntry.index,
          precedent_type: 'FORBIDDEN_ALTERNATIVE',
          matching_element: forbidden,
          effect: 'REQUIRES_REFUTATION',
          strength: 'HARD'
        };
      }
    }

    return null;
  }

  /**
   * Check for active invariant conflict
   *
   * If a prior proof established an invariant that the new proof would violate,
   * it creates a conflict.
   */
  private checkActiveInvariantConflict(
    newProof: OlympusDecisionProof,
    priorEntry: LedgerEntry
  ): PrecedentMatch | null {
    const priorProof = priorEntry.proof;

    // If prior proof blocked with a hard invariant, and new proof would allow
    // the same type of action, that's a conflict
    if (priorProof.final_decision === 'BLOCK' || priorProof.final_decision === 'PERMANENT_READ_ONLY') {
      const priorInvariant = priorProof.primary_invariant_violated;

      // Check if actions are related (same type, similar target)
      const actionsRelated = this.actionsAreRelated(
        newProof.attempted_action_fingerprint,
        priorProof.attempted_action_fingerprint
      );

      // Check if this creates a conflict with the new proof
      if (actionsRelated && this.invariantsConflict(priorInvariant, newProof)) {
        const isHard = HARD_PRECEDENT_INVARIANTS.includes(priorInvariant);

        return {
          proof_hash: priorProof.proof_hash,
          proof_run_id: priorProof.run_id,
          ledger_index: priorEntry.index,
          precedent_type: 'ACTIVE_INVARIANT',
          matching_element: priorInvariant,
          effect: isHard ? 'REQUIRES_REFUTATION' : 'INFORMATIONAL',
          strength: isHard ? 'HARD' : 'SOFT'
        };
      }
    }

    return null;
  }

  /**
   * Check if two actions are related (same type and similar description)
   */
  private actionsAreRelated(
    action1: OlympusDecisionProof['attempted_action_fingerprint'],
    action2: OlympusDecisionProof['attempted_action_fingerprint']
  ): boolean {
    // Same action type
    if (action1.action_type !== action2.action_type) {
      return false;
    }

    // Check description similarity using Jaccard index
    const words1 = new Set(action1.description.toLowerCase().split(/\s+/));
    const words2 = new Set(action2.description.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return false;

    const similarity = intersection.size / union.size;
    return similarity >= 0.5; // 50% word overlap
  }

  /**
   * Check for global precedent conflict
   */
  private checkGlobalPrecedentConflict(
    newProof: OlympusDecisionProof,
    priorEntry: LedgerEntry
  ): PrecedentMatch | null {
    const priorProof = priorEntry.proof;

    // PERMANENT_READ_ONLY is a global precedent that blocks all mutations
    if (priorProof.final_decision === 'PERMANENT_READ_ONLY') {
      // If new proof would allow a mutation, that conflicts
      if (newProof.final_decision === 'ALLOW') {
        return {
          proof_hash: priorProof.proof_hash,
          proof_run_id: priorProof.run_id,
          ledger_index: priorEntry.index,
          precedent_type: 'ACTIVE_INVARIANT',
          matching_element: 'PERMANENT_READ_ONLY_ACTIVE',
          effect: 'BLOCKS',
          strength: 'HARD'
        };
      }
    }

    // Budget exhaustion is global
    if (priorProof.entropy_state.is_exhausted) {
      if (newProof.final_decision === 'ALLOW' && !newProof.entropy_state.is_exhausted) {
        return {
          proof_hash: priorProof.proof_hash,
          proof_run_id: priorProof.run_id,
          ledger_index: priorEntry.index,
          precedent_type: 'ACTIVE_INVARIANT',
          matching_element: 'ENTROPY_BUDGET_EXHAUSTED',
          effect: 'REQUIRES_REFUTATION',
          strength: 'HARD'
        };
      }
    }

    return null;
  }

  /**
   * Check if two invariants conflict
   */
  private invariantsConflict(
    priorInvariant: InvariantCategory,
    newProof: OlympusDecisionProof
  ): boolean {
    // If new proof allows and prior blocked with hard invariant
    if (newProof.final_decision === 'ALLOW') {
      // Same action type attempting to do what was previously forbidden
      if (priorInvariant !== 'NONE') {
        // Check if new proof is attempting similar action
        // This is a simplified check - in practice would be more sophisticated
        return true;
      }
    }

    // If both block but for different reasons, no conflict
    if (newProof.final_decision === 'BLOCK' && newProof.primary_invariant_violated !== 'NONE') {
      return false;
    }

    return false;
  }

  /**
   * Check if a blocking precedent has been explicitly refuted
   */
  private isBlockingPrecedentRefuted(
    blocking: PrecedentMatch,
    refutations: RefutationRecord[]
  ): boolean {
    for (const refutation of refutations) {
      if (refutation.refuted_proof_hash === blocking.proof_hash) {
        // Check if the refutation covers the matching element
        const refutedInvariant = refutation.refuted_invariant;
        const matchingInvariant = this.parseInvariantFromElement(blocking.matching_element);

        if (refutedInvariant === matchingInvariant) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Parse invariant category from matching element string
   */
  private parseInvariantFromElement(element: string): InvariantCategory {
    // If element is already an invariant category, return it
    const invariants: InvariantCategory[] = [
      'TEMPORAL_CONTRACT_MISSING',
      'TEMPORAL_CONTRACT_INVALID',
      'ENTROPY_BUDGET_EXHAUSTED',
      'ENTROPY_DRIFT_EXCEEDED',
      'MUTATION_LIMIT_EXCEEDED',
      'LIFESPAN_EXCEEDED',
      'FUTURE_INEVITABILITY_VIOLATION',
      'REALITY_LOCK_VIOLATED',
      'INTENT_COLLAPSE_FAILED',
      'CANONICAL_FORM_INVALID',
      'NECESSITY_NOT_ESTABLISHED',
      'ARCHITECTURAL_PHASE_VIOLATION',
      'SINGULARITY_BREACH',
      'NONE'
    ];

    if (invariants.includes(element as InvariantCategory)) {
      return element as InvariantCategory;
    }

    // Handle special cases
    if (element === 'PERMANENT_READ_ONLY_ACTIVE') {
      return 'ENTROPY_BUDGET_EXHAUSTED';
    }

    // Default to NONE
    return 'NONE';
  }

  /**
   * Check if two hashes match (allowing partial matches)
   */
  private hashesMatch(hash1: string, hash2: string): boolean {
    // Exact match
    if (hash1 === hash2) return true;

    // Partial match (first 12 characters)
    if (hash1.substring(0, 12) === hash2.substring(0, 12)) return true;

    return false;
  }

  /**
   * Create a refutation record
   */
  createRefutation(
    priorProof: OlympusDecisionProof,
    invariant: InvariantCategory,
    reason: string,
    authority: RefutationRecord['refutation_authority']
  ): RefutationRecord {
    return {
      refuted_proof_hash: priorProof.proof_hash,
      refuted_proof_run_id: priorProof.run_id,
      refuted_invariant: invariant,
      refutation_reason: reason,
      refutation_authority: authority,
      refuted_at: new Date().toISOString()
    };
  }

  /**
   * Check if an invariant is hard (requires explicit refutation)
   */
  isHardInvariant(invariant: InvariantCategory): boolean {
    return HARD_PRECEDENT_INVARIANTS.includes(invariant);
  }

  /**
   * Check if an invariant is soft (informational only)
   */
  isSoftInvariant(invariant: InvariantCategory): boolean {
    return SOFT_PRECEDENT_INVARIANTS.includes(invariant);
  }

  /**
   * Get all hard precedents from the ledger
   */
  getHardPrecedents(ledger: ProofLedger): LedgerEntry[] {
    const entries = ledger.getAllEntries();
    return [...entries].filter(e =>
      HARD_PRECEDENT_INVARIANTS.includes(e.proof.primary_invariant_violated)
    );
  }
}

/**
 * Create a new PrecedentValidator instance
 */
export function createPrecedentValidator(
  config?: Partial<PrecedentValidatorConfig>
): PrecedentValidator {
  return new PrecedentValidator(config);
}
