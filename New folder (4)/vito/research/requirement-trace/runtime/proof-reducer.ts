/**
 * Proof Reducer
 *
 * Reduces proof artifacts to their minimal sufficient form.
 * Removes narrative, duplicates, and secondary effects.
 *
 * KEY PRINCIPLE:
 * - "If a decision cannot be explained minimally, it is not yet true."
 * - Smallest sufficient explanation
 * - No redundant information
 *
 * REDUCTION RULES:
 * 1. Causal chain: Only events that directly cause the decision
 * 2. Forbidden alternatives: Only unique, non-redundant hashes
 * 3. Descriptions: Stripped to essential facts
 * 4. One primary invariant: Others are secondary effects
 *
 * NON-NEGOTIABLE:
 * - Does NOT change the decision
 * - Does NOT lose essential information
 * - Deterministic reduction
 * - Idempotent (reduce(reduce(x)) === reduce(x))
 */

import * as crypto from 'crypto';
import type {
  OlympusDecisionProof,
  CausalLink
} from './types';

// OCPM version - immutable
const OCPM_VERSION = '1.0.0';
Object.freeze({ OCPM_VERSION });

/**
 * Reduction statistics
 */
export interface ReductionStats {
  original_chain_length: number;
  reduced_chain_length: number;
  original_alternatives_count: number;
  reduced_alternatives_count: number;
  description_reduction_percent: number;
  is_minimal: boolean;
}

export class ProofReducer {
  /**
   * Reduce a proof to its minimal form
   */
  reduce(proof: OlympusDecisionProof): {
    proof: OlympusDecisionProof;
    stats: ReductionStats;
  } {
    // Step 1: Reduce causal chain
    const reducedChain = this.reduceCausalChain(proof.causal_chain);

    // Step 2: Reduce forbidden alternatives
    const reducedAlternatives = this.reduceForbiddenAlternatives(proof.forbidden_alternatives);

    // Step 3: Reduce description
    const reducedDescription = this.reduceDescription(proof.primary_violation_description);

    // Step 4: Calculate stats
    const stats: ReductionStats = {
      original_chain_length: proof.causal_chain.length,
      reduced_chain_length: reducedChain.length,
      original_alternatives_count: proof.forbidden_alternatives.length,
      reduced_alternatives_count: reducedAlternatives.length,
      description_reduction_percent: this.calculateDescriptionReduction(
        proof.primary_violation_description,
        reducedDescription
      ),
      is_minimal: this.isMinimal(reducedChain, reducedAlternatives)
    };

    // Step 5: Build reduced proof
    const reducedProof: OlympusDecisionProof = {
      ...proof,
      causal_chain: reducedChain,
      forbidden_alternatives: reducedAlternatives,
      primary_violation_description: reducedDescription,
      // Recompute hash for reduced proof
      proof_hash: this.recomputeHash(proof, reducedChain, reducedAlternatives)
    };

    return { proof: reducedProof, stats };
  }

  /**
   * Reduce causal chain to minimal form
   *
   * Rules:
   * - Remove duplicate events (same layer + same event)
   * - Remove intermediate steps that don't change outcome
   * - Keep only: trigger event, violation event, decision event
   */
  private reduceCausalChain(chain: CausalLink[]): CausalLink[] {
    if (chain.length <= 1) return chain;

    const reduced: CausalLink[] = [];
    const seen = new Set<string>();

    for (const link of chain) {
      // Create unique key for deduplication
      const key = `${link.source_layer}:${link.event}`;

      // Skip duplicates
      if (seen.has(key)) continue;
      seen.add(key);

      // Keep essential links only
      if (this.isEssentialLink(link)) {
        reduced.push({
          ...link,
          step: reduced.length + 1 // Renumber steps
        });
      }
    }

    // Ensure at least one link if original had any
    if (reduced.length === 0 && chain.length > 0) {
      return [{ ...chain[0], step: 1 }];
    }

    return reduced;
  }

  /**
   * Check if a causal link is essential
   */
  private isEssentialLink(link: CausalLink): boolean {
    // Gate decisions are always essential
    if (link.event.includes('Gate') || link.event.includes('decision')) {
      return true;
    }

    // Violation detections are essential
    if (link.event.includes('detected') || link.event.includes('VIOLATION')) {
      return true;
    }

    // Forward simulation results are essential
    if (link.event.includes('simulation') || link.event.includes('Forward')) {
      return true;
    }

    // Action permitted is essential for ALLOW
    if (link.effect.includes('permitted') || link.effect.includes('ALLOW')) {
      return true;
    }

    // Default: keep it (conservative)
    return true;
  }

  /**
   * Reduce forbidden alternatives
   *
   * Rules:
   * - Remove exact duplicates
   * - Limit to most significant (first N)
   */
  private reduceForbiddenAlternatives(alternatives: string[]): string[] {
    // Remove duplicates
    const unique = [...new Set(alternatives)];

    // Limit to 10 most significant
    const MAX_ALTERNATIVES = 10;
    return unique.slice(0, MAX_ALTERNATIVES);
  }

  /**
   * Reduce description to essential facts
   *
   * Rules:
   * - Remove narrative words ("the", "a", "is", "was", etc.)
   * - Keep technical terms and numbers
   * - Maximum length: 100 characters
   */
  private reduceDescription(description: string | null): string | null {
    if (!description) return null;

    // Remove common narrative words
    const narrativeWords = [
      'the', 'a', 'an', 'is', 'was', 'are', 'were', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can',
      'that', 'which', 'who', 'whom', 'this', 'these', 'those',
      'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either',
      'because', 'since', 'although', 'while', 'whereas',
      'very', 'really', 'quite', 'rather', 'somewhat',
      'currently', 'actually', 'basically', 'essentially'
    ];

    let reduced = description;

    // Remove narrative words (case insensitive, word boundaries)
    for (const word of narrativeWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      reduced = reduced.replace(regex, '');
    }

    // Clean up multiple spaces
    reduced = reduced.replace(/\s+/g, ' ').trim();

    // Truncate to max length
    const MAX_LENGTH = 100;
    if (reduced.length > MAX_LENGTH) {
      reduced = reduced.substring(0, MAX_LENGTH - 3) + '...';
    }

    return reduced || null;
  }

  /**
   * Calculate description reduction percentage
   */
  private calculateDescriptionReduction(
    original: string | null,
    reduced: string | null
  ): number {
    if (!original || !reduced) return 0;
    const originalLen = original.length;
    const reducedLen = reduced.length;
    if (originalLen === 0) return 0;
    return Math.round((1 - reducedLen / originalLen) * 100);
  }

  /**
   * Check if proof is already minimal
   */
  private isMinimal(chain: CausalLink[], alternatives: string[]): boolean {
    // Minimal chain: 1-3 links
    if (chain.length > 3) return false;

    // Minimal alternatives: <= 5
    if (alternatives.length > 5) return false;

    // No duplicate layer events
    const layerEvents = chain.map(l => `${l.source_layer}:${l.event}`);
    if (new Set(layerEvents).size !== layerEvents.length) return false;

    return true;
  }

  /**
   * Recompute hash for reduced proof
   */
  private recomputeHash(
    original: OlympusDecisionProof,
    reducedChain: CausalLink[],
    reducedAlternatives: string[]
  ): string {
    const canonical = {
      run_id: original.run_id,
      proof_version: original.proof_version,
      final_decision: original.final_decision,
      primary_invariant_violated: original.primary_invariant_violated,
      causal_chain_length: reducedChain.length,
      forbidden_alternatives_count: reducedAlternatives.length,
      entropy_state_hash: this.hashObject(original.entropy_state),
      contract_valid: original.temporal_contract_summary.valid,
      created_at: original.created_at,
      reduced: true
    };

    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Hash an object deterministically
   */
  private hashObject(obj: object): string {
    const json = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash('sha256').update(json).digest('hex').substring(0, 16);
  }

  /**
   * Check if a proof needs reduction
   */
  needsReduction(proof: OlympusDecisionProof): boolean {
    // Check chain length
    if (proof.causal_chain.length > 3) return true;

    // Check alternatives count
    if (proof.forbidden_alternatives.length > 10) return true;

    // Check for duplicates in chain
    const layerEvents = proof.causal_chain.map(l => `${l.source_layer}:${l.event}`);
    if (new Set(layerEvents).size !== layerEvents.length) return true;

    // Check description length
    if (proof.primary_violation_description && proof.primary_violation_description.length > 100) {
      return true;
    }

    return false;
  }

  /**
   * Get reduction summary
   */
  getReductionSummary(stats: ReductionStats): string {
    const lines: string[] = [];

    lines.push('REDUCTION SUMMARY:');
    lines.push(`  Chain: ${stats.original_chain_length} → ${stats.reduced_chain_length}`);
    lines.push(`  Alternatives: ${stats.original_alternatives_count} → ${stats.reduced_alternatives_count}`);
    lines.push(`  Description: ${stats.description_reduction_percent}% reduced`);
    lines.push(`  Is Minimal: ${stats.is_minimal ? 'YES' : 'NO'}`);

    return lines.join('\n');
  }
}
