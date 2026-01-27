/**
 * Proof Hasher
 *
 * Computes deterministic hashes of proof artifacts.
 * Reproducible across machines and time.
 *
 * KEY PRINCIPLE:
 * - Same proof → Same hash (always)
 * - Different proof → Different hash (with high probability)
 * - Deterministic canonicalization before hashing
 *
 * HASH PROPERTIES:
 * - SHA-256 based
 * - Canonical JSON serialization
 * - Sorted keys for determinism
 * - No floating point precision issues
 *
 * NON-NEGOTIABLE:
 * - No randomness
 * - No timestamps in hash computation
 * - Reproducible on any machine
 * - Collision resistant
 */

import * as crypto from 'crypto';
import type {
  OlympusDecisionProof,
  CausalLink,
  EntropyStateSnapshot,
  TemporalContractSummary,
  ActionFingerprintSummary
} from './types';

// OCPM version - immutable
const OCPM_VERSION = '1.0.0';
Object.freeze({ OCPM_VERSION });

/**
 * Hash computation result
 */
export interface HashResult {
  full_hash: string;         // Full SHA-256 hash (64 chars)
  short_hash: string;        // First 16 chars
  fingerprint: string;       // First 8 chars (for display)
  algorithm: 'sha256';
  input_size_bytes: number;
  canonical_json: string;    // For debugging/verification
}

/**
 * Component hashes for verification
 */
export interface ComponentHashes {
  action_fingerprint_hash: string;
  causal_chain_hash: string;
  entropy_state_hash: string;
  contract_summary_hash: string;
  forbidden_alternatives_hash: string;
  necessary_future_hash: string;
  combined_hash: string;
}

export class ProofHasher {
  /**
   * Compute full hash of a proof
   */
  hashProof(proof: OlympusDecisionProof): HashResult {
    // Build canonical representation (excluding proof_hash itself)
    const canonical = this.buildCanonical(proof);
    const json = this.serializeCanonical(canonical);
    const hash = this.computeSHA256(json);

    return {
      full_hash: hash,
      short_hash: hash.substring(0, 16),
      fingerprint: hash.substring(0, 8),
      algorithm: 'sha256',
      input_size_bytes: Buffer.byteLength(json, 'utf8'),
      canonical_json: json
    };
  }

  /**
   * Compute component hashes for detailed verification
   */
  hashComponents(proof: OlympusDecisionProof): ComponentHashes {
    return {
      action_fingerprint_hash: this.hashActionFingerprint(proof.attempted_action_fingerprint),
      causal_chain_hash: this.hashCausalChain(proof.causal_chain),
      entropy_state_hash: this.hashEntropyState(proof.entropy_state),
      contract_summary_hash: this.hashContractSummary(proof.temporal_contract_summary),
      forbidden_alternatives_hash: this.hashForbiddenAlternatives(proof.forbidden_alternatives),
      necessary_future_hash: this.hashNecessaryFuture(proof.necessary_future),
      combined_hash: this.hashProof(proof).full_hash
    };
  }

  /**
   * Verify that a proof's hash is valid
   */
  verifyHash(proof: OlympusDecisionProof): {
    valid: boolean;
    computed_hash: string;
    stored_hash: string;
  } {
    const computed = this.hashProof(proof);
    return {
      valid: computed.full_hash === proof.proof_hash,
      computed_hash: computed.full_hash,
      stored_hash: proof.proof_hash
    };
  }

  /**
   * Build canonical representation of proof
   * Excludes proof_hash to avoid circular dependency
   */
  private buildCanonical(proof: OlympusDecisionProof): Record<string, unknown> {
    return {
      // Identification
      run_id: proof.run_id,
      proof_version: proof.proof_version,

      // Core decision
      final_decision: proof.final_decision,
      primary_invariant_violated: proof.primary_invariant_violated,

      // Action fingerprint (canonical form)
      action: {
        id: proof.attempted_action_fingerprint.action_id,
        type: proof.attempted_action_fingerprint.action_type,
        hash: proof.attempted_action_fingerprint.hash
      },

      // Causal chain (minimal canonical form)
      chain: proof.causal_chain.map(link => ({
        s: link.step,
        l: link.source_layer,
        e: link.event.substring(0, 50), // Truncate for consistency
        d: true // deterministic
      })),

      // Forbidden alternatives (just the hashes)
      forbidden: proof.forbidden_alternatives.sort(),

      // Necessary future (if present)
      future: proof.necessary_future ? {
        exists: proof.necessary_future.exists,
        steps: proof.necessary_future.survivable_steps,
        first_violation: proof.necessary_future.first_violation_step,
        survivability: this.roundNumber(proof.necessary_future.projected_survivability, 4)
      } : null,

      // Entropy state (canonical)
      entropy: {
        current: this.roundNumber(proof.entropy_state.current_entropy, 6),
        baseline: this.roundNumber(proof.entropy_state.baseline_entropy, 6),
        drift: this.roundNumber(proof.entropy_state.drift, 6),
        exhausted: proof.entropy_state.is_exhausted
      },

      // Contract summary (canonical)
      contract: {
        id: proof.temporal_contract_summary.contract_id,
        valid: proof.temporal_contract_summary.valid,
        step: proof.temporal_contract_summary.current_step,
        mutations: proof.temporal_contract_summary.mutation_count
      },

      // Metadata
      chain_valid: proof.proof_chain_valid
    };
  }

  /**
   * Serialize canonical object to JSON string
   * Keys are sorted for determinism
   */
  private serializeCanonical(obj: Record<string, unknown>): string {
    return JSON.stringify(obj, this.sortedReplacer);
  }

  /**
   * JSON replacer that sorts object keys
   */
  private sortedReplacer = (_key: string, value: unknown): unknown => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  };

  /**
   * Compute SHA-256 hash of string
   */
  private computeSHA256(input: string): string {
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
  }

  /**
   * Round number to fixed precision (avoids floating point issues)
   */
  private roundNumber(num: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.round(num * factor) / factor;
  }

  /**
   * Hash action fingerprint
   */
  private hashActionFingerprint(fp: ActionFingerprintSummary): string {
    const canonical = {
      id: fp.action_id,
      type: fp.action_type,
      hash: fp.hash
    };
    return this.computeSHA256(JSON.stringify(canonical, Object.keys(canonical).sort())).substring(0, 16);
  }

  /**
   * Hash causal chain
   */
  private hashCausalChain(chain: CausalLink[]): string {
    const canonical = chain.map(link => ({
      s: link.step,
      l: link.source_layer,
      e: link.event.substring(0, 50)
    }));
    return this.computeSHA256(JSON.stringify(canonical)).substring(0, 16);
  }

  /**
   * Hash entropy state
   */
  private hashEntropyState(state: EntropyStateSnapshot): string {
    const canonical = {
      c: this.roundNumber(state.current_entropy, 6),
      b: this.roundNumber(state.baseline_entropy, 6),
      d: this.roundNumber(state.drift, 6),
      e: state.is_exhausted
    };
    return this.computeSHA256(JSON.stringify(canonical, Object.keys(canonical).sort())).substring(0, 16);
  }

  /**
   * Hash contract summary
   */
  private hashContractSummary(summary: TemporalContractSummary): string {
    const canonical = {
      id: summary.contract_id,
      v: summary.valid,
      s: summary.current_step,
      m: summary.mutation_count
    };
    return this.computeSHA256(JSON.stringify(canonical, Object.keys(canonical).sort())).substring(0, 16);
  }

  /**
   * Hash forbidden alternatives
   */
  private hashForbiddenAlternatives(alternatives: string[]): string {
    const sorted = [...alternatives].sort();
    return this.computeSHA256(JSON.stringify(sorted)).substring(0, 16);
  }

  /**
   * Hash necessary future
   */
  private hashNecessaryFuture(
    future: OlympusDecisionProof['necessary_future']
  ): string {
    if (!future) return this.computeSHA256('null').substring(0, 16);

    const canonical = {
      e: future.exists,
      s: future.survivable_steps,
      f: future.first_violation_step,
      p: this.roundNumber(future.projected_survivability, 4)
    };
    return this.computeSHA256(JSON.stringify(canonical, Object.keys(canonical).sort())).substring(0, 16);
  }

  /**
   * Generate hash comparison report
   */
  compareHashes(
    proof1: OlympusDecisionProof,
    proof2: OlympusDecisionProof
  ): {
    identical: boolean;
    differences: string[];
    hash1: string;
    hash2: string;
  } {
    const h1 = this.hashComponents(proof1);
    const h2 = this.hashComponents(proof2);
    const differences: string[] = [];

    if (h1.action_fingerprint_hash !== h2.action_fingerprint_hash) {
      differences.push('action_fingerprint');
    }
    if (h1.causal_chain_hash !== h2.causal_chain_hash) {
      differences.push('causal_chain');
    }
    if (h1.entropy_state_hash !== h2.entropy_state_hash) {
      differences.push('entropy_state');
    }
    if (h1.contract_summary_hash !== h2.contract_summary_hash) {
      differences.push('contract_summary');
    }
    if (h1.forbidden_alternatives_hash !== h2.forbidden_alternatives_hash) {
      differences.push('forbidden_alternatives');
    }
    if (h1.necessary_future_hash !== h2.necessary_future_hash) {
      differences.push('necessary_future');
    }

    return {
      identical: differences.length === 0,
      differences,
      hash1: h1.combined_hash,
      hash2: h2.combined_hash
    };
  }
}
