/**
 * Continuity Gate
 *
 * Final gate AFTER OCPM verification.
 * Either ACCEPT_PROOF or REJECT_PROOF.
 *
 * KEY PRINCIPLE:
 * - This is the final checkpoint before a proof enters the ledger
 * - Must pass all continuity checks
 * - No bypass possible
 *
 * GATE CHECKS:
 * 1. OCPM verification passed
 * 2. Lineage resolved
 * 3. Precedents validated
 * 4. No unrefuted conflicts
 *
 * NON-NEGOTIABLE:
 * - ACCEPT or REJECT - no middle ground
 * - Rejection must have explicit reason
 * - No re-evaluation of OCPM decision
 */

import * as crypto from 'crypto';
import type {
  OlympusDecisionProof,
  ContinuityProof,
  ContinuityDecision,
  ContinuityGateResult,
  ContinuityReport,
  LineageResolution,
  PrecedentValidation,
  RefutationRecord
} from './types';
import { ProofLedger } from './proof-ledger';
import { ProofLineageResolver } from './proof-lineage-resolver';
import { PrecedentValidator } from './precedent-validator';

// PCL version - immutable
const PCL_VERSION = '1.0.0';
Object.freeze({ PCL_VERSION });

/**
 * Gate configuration
 */
export interface ContinuityGateConfig {
  // Require OCPM verification to have passed
  require_ocpm_verification?: boolean;

  // Enforce precedent validation
  enforce_precedents?: boolean;

  // Maximum allowed blocking precedents (0 = strict)
  max_unrefuted_blocks?: number;
}

export class ContinuityGate {
  private lineageResolver: ProofLineageResolver;
  private precedentValidator: PrecedentValidator;
  private config: Required<ContinuityGateConfig>;

  constructor(
    lineageResolver: ProofLineageResolver,
    precedentValidator: PrecedentValidator,
    config?: Partial<ContinuityGateConfig>
  ) {
    this.lineageResolver = lineageResolver;
    this.precedentValidator = precedentValidator;

    this.config = {
      require_ocpm_verification: config?.require_ocpm_verification ?? true,
      enforce_precedents: config?.enforce_precedents ?? true,
      max_unrefuted_blocks: config?.max_unrefuted_blocks ?? 0
    };
  }

  /**
   * Check if a proof should be accepted into the continuity chain
   *
   * @param proof The OCPM-verified proof
   * @param ocpmVerified Whether OCPM verification passed
   * @param refutations Explicit refutations provided
   * @param ledger The proof ledger
   * @returns Gate result with decision
   */
  check(
    proof: OlympusDecisionProof,
    ocpmVerified: boolean,
    refutations: RefutationRecord[],
    ledger: ProofLedger
  ): ContinuityGateResult {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];

    // Step 1: Check OCPM verification
    if (this.config.require_ocpm_verification && !ocpmVerified) {
      return this.createRejection(
        'OCPM verification failed - proof integrity not confirmed',
        { direct_parents: [], global_precedents: [], all_parents: [], depth: 0 },
        { valid: false, matches: [], blocking: [], required_refutations: [], errors: ['OCPM verification required'] },
        timestamp
      );
    }

    // Step 2: Resolve lineage
    const lineage = this.lineageResolver.resolve(proof, ledger);

    // Step 3: Validate precedents
    const precedentValidation = this.precedentValidator.validate(proof, refutations, ledger);

    // Step 4: Check for blocking issues
    if (this.config.enforce_precedents) {
      const unrefutedBlocks = precedentValidation.blocking.filter(b => {
        // Check if this block has been refuted
        return !refutations.some(r => r.refuted_proof_hash === b.proof_hash);
      });

      if (unrefutedBlocks.length > this.config.max_unrefuted_blocks) {
        const blockReasons = unrefutedBlocks.map(b =>
          `${b.precedent_type} from ${b.proof_run_id}: ${b.matching_element}`
        );

        return this.createRejection(
          `Unrefuted precedent conflicts: ${blockReasons.join('; ')}`,
          lineage,
          precedentValidation,
          timestamp
        );
      }
    }

    // Step 5: All checks passed - ACCEPT
    return {
      decision: 'ACCEPT_PROOF',
      rejection_reason: null,
      precedent_validation: precedentValidation,
      lineage,
      timestamp
    };
  }

  /**
   * Enhance a proof with continuity information
   */
  enhanceProof(
    proof: OlympusDecisionProof,
    lineage: LineageResolution,
    refutations: RefutationRecord[],
    ledgerIndex: number
  ): ContinuityProof {
    // Compute continuity hash (includes parent references)
    const continuityHash = this.computeContinuityHash(proof, lineage);

    return {
      ...proof,
      parent_proof_hashes: lineage.all_parents,
      precedent_checked: true,
      refuted_precedents: refutations,
      ledger_index: ledgerIndex,
      continuity_hash: continuityHash
    };
  }

  /**
   * Generate continuity report
   */
  generateReport(
    proof: ContinuityProof,
    gateResult: ContinuityGateResult
  ): ContinuityReport {
    const upheldPrecedents: ContinuityReport['upheld_precedents'] = [];

    // Collect upheld (non-refuted) precedents
    for (const match of gateResult.precedent_validation.matches) {
      const wasRefuted = proof.refuted_precedents.some(
        r => r.refuted_proof_hash === match.proof_hash
      );

      if (!wasRefuted) {
        upheldPrecedents.push({
          proof_hash: match.proof_hash,
          invariant: match.matching_element
        });
      }
    }

    return {
      proof_run_id: proof.run_id,
      proof_hash: proof.proof_hash,
      gate_decision: gateResult.decision,
      precedent_summary: {
        total_checked: gateResult.precedent_validation.matches.length,
        applicable: gateResult.precedent_validation.matches.filter(
          m => m.effect !== 'INFORMATIONAL'
        ).length,
        blocking: gateResult.precedent_validation.blocking.length,
        refuted: proof.refuted_precedents.length
      },
      upheld_precedents: upheldPrecedents,
      refuted_precedents: proof.refuted_precedents,
      chain_info: {
        ledger_index: proof.ledger_index,
        parent_count: proof.parent_proof_hashes.length,
        lineage_depth: gateResult.lineage.depth
      },
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Create a rejection result
   */
  private createRejection(
    reason: string,
    lineage: LineageResolution,
    precedentValidation: PrecedentValidation,
    timestamp: string
  ): ContinuityGateResult {
    return {
      decision: 'REJECT_PROOF',
      rejection_reason: reason,
      precedent_validation: precedentValidation,
      lineage,
      timestamp
    };
  }

  /**
   * Compute continuity hash
   * Includes proof hash + parent references for chain integrity
   */
  private computeContinuityHash(
    proof: OlympusDecisionProof,
    lineage: LineageResolution
  ): string {
    const canonical = {
      proof_hash: proof.proof_hash,
      run_id: proof.run_id,
      parent_hashes: lineage.all_parents.sort(),
      lineage_depth: lineage.depth
    };

    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Quick check - just pass/fail
   */
  quickCheck(
    proof: OlympusDecisionProof,
    ocpmVerified: boolean,
    ledger: ProofLedger
  ): boolean {
    const result = this.check(proof, ocpmVerified, [], ledger);
    return result.decision === 'ACCEPT_PROOF';
  }

  /**
   * Get gate statistics
   */
  getStats(): {
    config: ContinuityGateConfig;
    version: string;
  } {
    return {
      config: this.config,
      version: PCL_VERSION
    };
  }
}

/**
 * Create a new ContinuityGate instance
 */
export function createContinuityGate(
  lineageResolver: ProofLineageResolver,
  precedentValidator: PrecedentValidator,
  config?: Partial<ContinuityGateConfig>
): ContinuityGate {
  return new ContinuityGate(lineageResolver, precedentValidator, config);
}
