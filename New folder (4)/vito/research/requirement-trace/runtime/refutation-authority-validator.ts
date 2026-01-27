/**
 * Refutation Authority Validator
 *
 * Ensures:
 * - Refuter authority >= refuted authority
 * - Supremacy rules are satisfied
 * - Violations = HARD_ABORT
 *
 * KEY PRINCIPLE:
 * - "Authority without memory is tyranny."
 * - Only authorized entities can refute decisions
 * - Supremacy-1 invariants are UNREFUTABLE
 *
 * VALIDATION RULES:
 * 1. Refuter must have >= authority level than the original decision
 * 2. Refuter must be in the invariant's refutable_by list
 * 3. Supremacy-1 invariants cannot be refuted by anyone
 *
 * NON-NEGOTIABLE:
 * - HARD_ABORT on unauthorized refutation attempt
 * - No exceptions, no overrides
 * - Deterministic enforcement
 */

import type {
  AuthorityClass,
  InvariantCategory,
  RefutationRecord,
  RefutationAuthorityResult,
  SupremacyLevel
} from './types';
import { AuthorityClassRegistry } from './authority-class-registry';
import { InvariantSupremacyRegistry } from './invariant-supremacy-registry';

// AAM version - immutable
const AAM_VERSION = '1.0.0';
Object.freeze({ AAM_VERSION });

/**
 * Validation error types
 */
export type RefutationValidationError =
  | 'INSUFFICIENT_AUTHORITY_LEVEL'
  | 'NOT_IN_REFUTABLE_BY_LIST'
  | 'UNREFUTABLE_INVARIANT'
  | 'UNKNOWN_AUTHORITY_CLASS'
  | 'UNKNOWN_INVARIANT';

/**
 * Detailed validation result
 */
export interface DetailedRefutationValidation {
  result: RefutationAuthorityResult;
  error_type: RefutationValidationError | null;
  hard_abort: boolean;
  details: string;
}

export class RefutationAuthorityValidator {
  private authorityRegistry: AuthorityClassRegistry;
  private supremacyRegistry: InvariantSupremacyRegistry;

  constructor(
    authorityRegistry: AuthorityClassRegistry,
    supremacyRegistry: InvariantSupremacyRegistry
  ) {
    this.authorityRegistry = authorityRegistry;
    this.supremacyRegistry = supremacyRegistry;
  }

  /**
   * Validate a refutation attempt
   *
   * @param refuterAuthority The authority class of the entity attempting refutation
   * @param refutedAuthority The authority class of the original decision
   * @param invariant The invariant being refuted
   * @returns Validation result
   */
  validate(
    refuterAuthority: AuthorityClass,
    refutedAuthority: AuthorityClass,
    invariant: InvariantCategory
  ): RefutationAuthorityResult {
    const refuterLevel = this.authorityRegistry.getLevel(refuterAuthority);
    const refutedLevel = this.authorityRegistry.getLevel(refutedAuthority);
    const supremacyLevel = this.supremacyRegistry.getSupremacyLevel(invariant);

    // Check 1: Is the invariant UNREFUTABLE?
    if (this.supremacyRegistry.isUnrefutable(invariant)) {
      return {
        authorized: false,
        refuter_authority: refuterAuthority,
        refuter_level: refuterLevel,
        refuted_authority: refutedAuthority,
        refuted_level: refutedLevel,
        invariant_supremacy: supremacyLevel,
        rejection_reason: `HARD_ABORT: Invariant ${invariant} is UNREFUTABLE (supremacy level 1)`
      };
    }

    // Check 2: Does refuter have sufficient authority level?
    if (refuterLevel < refutedLevel) {
      return {
        authorized: false,
        refuter_authority: refuterAuthority,
        refuter_level: refuterLevel,
        refuted_authority: refutedAuthority,
        refuted_level: refutedLevel,
        invariant_supremacy: supremacyLevel,
        rejection_reason: `HARD_ABORT: Refuter authority ${refuterAuthority} (level ${refuterLevel}) ` +
          `is lower than refuted authority ${refutedAuthority} (level ${refutedLevel})`
      };
    }

    // Check 3: Is refuter authorized to refute this invariant?
    if (!this.supremacyRegistry.canRefute(refuterAuthority, invariant)) {
      return {
        authorized: false,
        refuter_authority: refuterAuthority,
        refuter_level: refuterLevel,
        refuted_authority: refutedAuthority,
        refuted_level: refutedLevel,
        invariant_supremacy: supremacyLevel,
        rejection_reason: `HARD_ABORT: Authority ${refuterAuthority} is not authorized to ` +
          `refute invariant ${invariant} (supremacy level ${supremacyLevel})`
      };
    }

    // Check 4: Can the refuter authority refute the refuted authority class?
    if (!this.authorityRegistry.canRefute(refuterAuthority, refutedAuthority)) {
      return {
        authorized: false,
        refuter_authority: refuterAuthority,
        refuter_level: refuterLevel,
        refuted_authority: refutedAuthority,
        refuted_level: refutedLevel,
        invariant_supremacy: supremacyLevel,
        rejection_reason: `HARD_ABORT: Authority ${refuterAuthority} cannot refute decisions ` +
          `made by ${refutedAuthority}`
      };
    }

    // All checks passed
    return {
      authorized: true,
      refuter_authority: refuterAuthority,
      refuter_level: refuterLevel,
      refuted_authority: refutedAuthority,
      refuted_level: refutedLevel,
      invariant_supremacy: supremacyLevel,
      rejection_reason: null
    };
  }

  /**
   * Validate a refutation record
   */
  validateRefutationRecord(
    record: RefutationRecord,
    refuterAuthority: AuthorityClass,
    refutedAuthority: AuthorityClass
  ): RefutationAuthorityResult {
    return this.validate(
      refuterAuthority,
      refutedAuthority,
      record.refuted_invariant
    );
  }

  /**
   * Detailed validation with error classification
   */
  validateDetailed(
    refuterAuthority: AuthorityClass,
    refutedAuthority: AuthorityClass,
    invariant: InvariantCategory
  ): DetailedRefutationValidation {
    const result = this.validate(refuterAuthority, refutedAuthority, invariant);

    let errorType: RefutationValidationError | null = null;
    let details = '';

    if (!result.authorized) {
      // Classify the error
      if (this.supremacyRegistry.isUnrefutable(invariant)) {
        errorType = 'UNREFUTABLE_INVARIANT';
        details = `Invariant ${invariant} has supremacy level 1 (UNREFUTABLE). ` +
          `No authority, not even SYSTEM_ROOT, can refute this invariant.`;
      } else if (result.refuter_level < result.refuted_level) {
        errorType = 'INSUFFICIENT_AUTHORITY_LEVEL';
        details = `Refuter has authority level ${result.refuter_level} but needs ` +
          `at least level ${result.refuted_level} to refute this decision.`;
      } else if (!this.supremacyRegistry.canRefute(refuterAuthority, invariant)) {
        errorType = 'NOT_IN_REFUTABLE_BY_LIST';
        const supremacy = this.supremacyRegistry.getSupremacy(invariant);
        details = `Invariant ${invariant} can only be refuted by: ` +
          `${supremacy?.refutable_by.join(', ') || 'none'}. ` +
          `${refuterAuthority} is not in this list.`;
      }
    } else {
      details = `Refutation authorized. ${refuterAuthority} (level ${result.refuter_level}) ` +
        `may refute ${refutedAuthority} (level ${result.refuted_level}) ` +
        `for invariant ${invariant} (supremacy ${result.invariant_supremacy}).`;
    }

    return {
      result,
      error_type: errorType,
      hard_abort: !result.authorized,
      details
    };
  }

  /**
   * Check if a refutation would be allowed (without full validation)
   */
  wouldBeAllowed(
    refuterAuthority: AuthorityClass,
    refutedAuthority: AuthorityClass,
    invariant: InvariantCategory
  ): boolean {
    // Quick check for unrefutable
    if (this.supremacyRegistry.isUnrefutable(invariant)) {
      return false;
    }

    // Quick check for authority level
    const refuterLevel = this.authorityRegistry.getLevel(refuterAuthority);
    const refutedLevel = this.authorityRegistry.getLevel(refutedAuthority);

    if (refuterLevel < refutedLevel) {
      return false;
    }

    // Check supremacy
    return this.supremacyRegistry.canRefute(refuterAuthority, invariant);
  }

  /**
   * Get the minimum authority required to refute a given invariant
   */
  getMinimumRefutationAuthority(invariant: InvariantCategory): AuthorityClass | null {
    if (this.supremacyRegistry.isUnrefutable(invariant)) {
      return null; // Cannot be refuted
    }

    const supremacy = this.supremacyRegistry.getSupremacy(invariant);
    if (!supremacy || supremacy.refutable_by.length === 0) {
      return null;
    }

    // Return the lowest authority that can refute
    let minAuthority: AuthorityClass = 'SYSTEM_ROOT';
    let minLevel = 999;

    for (const auth of supremacy.refutable_by) {
      const level = this.authorityRegistry.getLevel(auth);
      if (level < minLevel) {
        minLevel = level;
        minAuthority = auth;
      }
    }

    return minAuthority;
  }

  /**
   * Get validation statistics
   */
  getStats(): {
    unrefutable_invariants: InvariantCategory[];
    authority_hierarchy: { class: AuthorityClass; level: number }[];
  } {
    return {
      unrefutable_invariants: this.supremacyRegistry.getUnrefutableInvariants(),
      authority_hierarchy: this.authorityRegistry.getAllClasses()
        .map(c => ({ class: c.class, level: c.level }))
    };
  }
}

/**
 * Create a new RefutationAuthorityValidator
 */
export function createRefutationAuthorityValidator(
  authorityRegistry: AuthorityClassRegistry,
  supremacyRegistry: InvariantSupremacyRegistry
): RefutationAuthorityValidator {
  return new RefutationAuthorityValidator(authorityRegistry, supremacyRegistry);
}
