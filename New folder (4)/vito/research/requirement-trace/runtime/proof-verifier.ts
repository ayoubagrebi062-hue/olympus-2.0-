/**
 * Proof Verifier
 *
 * Re-runs structural checks and confirms proof integrity without execution.
 * Validates that a proof artifact is well-formed and consistent.
 *
 * KEY PRINCIPLE:
 * - Verification without re-execution
 * - Structural integrity checks
 * - Deterministic validation
 *
 * VERIFICATION CHECKS:
 * 1. Hash integrity - stored hash matches computed hash
 * 2. Chain validity - causal chain is properly ordered
 * 3. Invariant validity - primary invariant matches decision
 * 4. State consistency - entropy and contract states are consistent
 * 5. Immutability - proof is marked immutable
 *
 * NON-NEGOTIABLE:
 * - Does NOT re-execute engines
 * - Does NOT modify the proof
 * - Deterministic verification
 * - Returns clear pass/fail with reasons
 */

import type {
  OlympusDecisionProof,
  ProofVerificationResult,
  CausalLink,
  InvariantCategory
} from './types';

import { ProofHasher } from './proof-hasher';

// OCPM version - immutable
const OCPM_VERSION = '1.0.0';
Object.freeze({ OCPM_VERSION });

/**
 * Detailed verification report
 */
export interface DetailedVerificationReport {
  result: ProofVerificationResult;
  checks: {
    name: string;
    passed: boolean;
    reason: string;
  }[];
  summary: string;
}

export class ProofVerifier {
  private hasher: ProofHasher;

  constructor() {
    this.hasher = new ProofHasher();
  }

  /**
   * Verify a proof's integrity
   */
  verify(proof: OlympusDecisionProof): ProofVerificationResult {
    const errors: string[] = [];

    // Check 1: Hash integrity
    const hashValid = this.verifyHashIntegrity(proof);
    if (!hashValid.valid) {
      errors.push(`Hash mismatch: computed ${hashValid.computed}, stored ${hashValid.stored}`);
    }

    // Check 2: Chain validity
    const chainValid = this.verifyChainValidity(proof.causal_chain);
    if (!chainValid.valid) {
      errors.push(...chainValid.errors);
    }

    // Check 3: Invariant validity
    const invariantValid = this.verifyInvariantValidity(
      proof.final_decision,
      proof.primary_invariant_violated
    );
    if (!invariantValid.valid) {
      errors.push(...invariantValid.errors);
    }

    // Check 4: State consistency
    const stateValid = this.verifyStateConsistency(proof);
    if (!stateValid.valid) {
      errors.push(...stateValid.errors);
    }

    // Check 5: Immutability marker
    if (!proof.immutable) {
      errors.push('Proof is not marked as immutable');
    }

    // Check 6: Required fields
    const fieldsValid = this.verifyRequiredFields(proof);
    if (!fieldsValid.valid) {
      errors.push(...fieldsValid.errors);
    }

    return {
      valid: errors.length === 0,
      hash_matches: hashValid.valid,
      chain_valid: chainValid.valid,
      invariant_valid: invariantValid.valid,
      errors
    };
  }

  /**
   * Generate detailed verification report
   */
  generateReport(proof: OlympusDecisionProof): DetailedVerificationReport {
    const checks: DetailedVerificationReport['checks'] = [];

    // Check 1: Hash integrity
    const hashResult = this.verifyHashIntegrity(proof);
    checks.push({
      name: 'Hash Integrity',
      passed: hashResult.valid,
      reason: hashResult.valid
        ? 'Hash matches computed value'
        : `Hash mismatch: ${hashResult.computed.substring(0, 16)}... vs ${hashResult.stored.substring(0, 16)}...`
    });

    // Check 2: Chain validity
    const chainResult = this.verifyChainValidity(proof.causal_chain);
    checks.push({
      name: 'Causal Chain',
      passed: chainResult.valid,
      reason: chainResult.valid
        ? `Valid chain with ${proof.causal_chain.length} links`
        : chainResult.errors.join('; ')
    });

    // Check 3: Invariant validity
    const invariantResult = this.verifyInvariantValidity(
      proof.final_decision,
      proof.primary_invariant_violated
    );
    checks.push({
      name: 'Invariant Validity',
      passed: invariantResult.valid,
      reason: invariantResult.valid
        ? `${proof.final_decision} with ${proof.primary_invariant_violated}`
        : invariantResult.errors.join('; ')
    });

    // Check 4: State consistency
    const stateResult = this.verifyStateConsistency(proof);
    checks.push({
      name: 'State Consistency',
      passed: stateResult.valid,
      reason: stateResult.valid
        ? 'Entropy and contract states are consistent'
        : stateResult.errors.join('; ')
    });

    // Check 5: Immutability
    checks.push({
      name: 'Immutability',
      passed: proof.immutable === true,
      reason: proof.immutable ? 'Proof is immutable' : 'Proof is not marked immutable'
    });

    // Check 6: Required fields
    const fieldsResult = this.verifyRequiredFields(proof);
    checks.push({
      name: 'Required Fields',
      passed: fieldsResult.valid,
      reason: fieldsResult.valid
        ? 'All required fields present'
        : fieldsResult.errors.join('; ')
    });

    const result = this.verify(proof);
    const passedCount = checks.filter(c => c.passed).length;
    const summary = result.valid
      ? `VERIFIED: ${passedCount}/${checks.length} checks passed`
      : `FAILED: ${checks.length - passedCount}/${checks.length} checks failed`;

    return { result, checks, summary };
  }

  /**
   * Verify hash integrity
   */
  private verifyHashIntegrity(proof: OlympusDecisionProof): {
    valid: boolean;
    computed: string;
    stored: string;
  } {
    const result = this.hasher.verifyHash(proof);
    return {
      valid: result.valid,
      computed: result.computed_hash,
      stored: result.stored_hash
    };
  }

  /**
   * Verify causal chain validity
   */
  private verifyChainValidity(chain: CausalLink[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check step ordering
    for (let i = 0; i < chain.length; i++) {
      if (chain[i].step !== i + 1) {
        errors.push(`Chain step ${i} has incorrect step number: ${chain[i].step}`);
      }
    }

    // Check deterministic flag
    for (const link of chain) {
      if (!link.deterministic) {
        errors.push(`Chain link at step ${link.step} is not deterministic`);
      }
    }

    // Check source layers are valid
    const validLayers = ['IE', 'NE', 'ICE', 'CIN', 'TSL', 'AEC', 'RLL', 'ORIS', 'OFEL', 'OCIC'];
    for (const link of chain) {
      if (!validLayers.includes(link.source_layer)) {
        errors.push(`Invalid source layer: ${link.source_layer}`);
      }
    }

    // Check events and effects are non-empty
    for (const link of chain) {
      if (!link.event || link.event.trim() === '') {
        errors.push(`Chain link at step ${link.step} has empty event`);
      }
      if (!link.effect || link.effect.trim() === '') {
        errors.push(`Chain link at step ${link.step} has empty effect`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Verify invariant matches decision
   */
  private verifyInvariantValidity(
    decision: OlympusDecisionProof['final_decision'],
    invariant: InvariantCategory
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // ALLOW must have NONE invariant
    if (decision === 'ALLOW' && invariant !== 'NONE') {
      errors.push(`ALLOW decision should have NONE invariant, got ${invariant}`);
    }

    // BLOCK must have a specific invariant
    if (decision === 'BLOCK' && invariant === 'NONE') {
      errors.push('BLOCK decision must have a specific invariant');
    }

    // PERMANENT_READ_ONLY typically has budget exhaustion
    if (decision === 'PERMANENT_READ_ONLY') {
      const validInvariants: InvariantCategory[] = [
        'ENTROPY_BUDGET_EXHAUSTED',
        'TEMPORAL_CONTRACT_MISSING',
        'TEMPORAL_CONTRACT_INVALID'
      ];
      if (!validInvariants.includes(invariant)) {
        errors.push(`PERMANENT_READ_ONLY decision has unusual invariant: ${invariant}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Verify state consistency
   */
  private verifyStateConsistency(proof: OlympusDecisionProof): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check entropy state internal consistency
    const entropyState = proof.entropy_state;
    const computedDrift = Math.abs(entropyState.current_entropy - entropyState.baseline_entropy);
    const driftDiff = Math.abs(computedDrift - entropyState.drift);
    if (driftDiff > 0.0001) {
      errors.push(`Entropy drift inconsistent: computed ${computedDrift}, stored ${entropyState.drift}`);
    }

    // Check budget ratio
    if (entropyState.budget_initial > 0) {
      const computedRatio = entropyState.budget_remaining / entropyState.budget_initial;
      const ratioDiff = Math.abs(computedRatio - entropyState.budget_ratio);
      if (ratioDiff > 0.0001) {
        errors.push(`Budget ratio inconsistent: computed ${computedRatio}, stored ${entropyState.budget_ratio}`);
      }
    }

    // Check exhaustion flag
    if (entropyState.is_exhausted && entropyState.budget_remaining > entropyState.budget_initial * 0.01) {
      errors.push('Exhaustion flag set but budget remaining is > 1%');
    }

    // Check contract summary consistency
    const contractSummary = proof.temporal_contract_summary;
    const contractDrift = Math.abs(contractSummary.current_drift);
    if (Math.abs(contractDrift - entropyState.drift) > 0.0001) {
      errors.push('Contract drift does not match entropy state drift');
    }

    // Check decision consistency with exhaustion
    if (proof.final_decision === 'PERMANENT_READ_ONLY' && !entropyState.is_exhausted) {
      // This is a warning, not necessarily an error (could be other reasons)
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Verify required fields are present
   */
  private verifyRequiredFields(proof: OlympusDecisionProof): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check run_id
    if (!proof.run_id || proof.run_id.trim() === '') {
      errors.push('Missing run_id');
    }

    // Check proof_version
    if (!proof.proof_version) {
      errors.push('Missing proof_version');
    }

    // Check action fingerprint
    if (!proof.attempted_action_fingerprint) {
      errors.push('Missing attempted_action_fingerprint');
    } else {
      if (!proof.attempted_action_fingerprint.action_id) {
        errors.push('Missing action_id in fingerprint');
      }
      if (!proof.attempted_action_fingerprint.hash) {
        errors.push('Missing hash in fingerprint');
      }
    }

    // Check final_decision
    const validDecisions = ['ALLOW', 'BLOCK', 'READ_ONLY', 'PERMANENT_READ_ONLY'];
    if (!validDecisions.includes(proof.final_decision)) {
      errors.push(`Invalid final_decision: ${proof.final_decision}`);
    }

    // Check proof_hash
    if (!proof.proof_hash || proof.proof_hash.length !== 64) {
      errors.push('Invalid or missing proof_hash');
    }

    // Check created_at
    if (!proof.created_at) {
      errors.push('Missing created_at timestamp');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Quick validation - just pass/fail
   */
  isValid(proof: OlympusDecisionProof): boolean {
    return this.verify(proof).valid;
  }

  /**
   * Validate a batch of proofs
   */
  validateBatch(proofs: OlympusDecisionProof[]): {
    total: number;
    valid: number;
    invalid: number;
    results: { run_id: string; valid: boolean }[];
  } {
    const results = proofs.map(proof => ({
      run_id: proof.run_id,
      valid: this.isValid(proof)
    }));

    const validCount = results.filter(r => r.valid).length;

    return {
      total: proofs.length,
      valid: validCount,
      invalid: proofs.length - validCount,
      results
    };
  }
}
