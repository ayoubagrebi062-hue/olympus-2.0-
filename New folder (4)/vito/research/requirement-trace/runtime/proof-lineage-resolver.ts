/**
 * Proof Lineage Resolver
 *
 * Determines parent_proof_hash[] for each new proof.
 * Supports direct dependency and global precedent dependency.
 *
 * KEY PRINCIPLE:
 * - Every proof has lineage
 * - Direct parents: proofs this one explicitly depends on
 * - Global precedents: proofs with system-wide effects
 *
 * LINEAGE TYPES:
 * 1. Direct Dependency - Same action/resource
 * 2. Global Precedent - System-wide invariants
 *
 * NON-NEGOTIABLE:
 * - Deterministic resolution
 * - No circular dependencies
 * - Verifiable lineage
 */

import type {
  OlympusDecisionProof,
  LineageResolution,
  LedgerEntry,
  InvariantCategory
} from './types';
import { ProofLedger } from './proof-ledger';

// PCL version - immutable
const PCL_VERSION = '1.0.0';
Object.freeze({ PCL_VERSION });

/**
 * Invariants that have global (system-wide) effect
 */
const GLOBAL_INVARIANTS: InvariantCategory[] = [
  'ENTROPY_BUDGET_EXHAUSTED',
  'TEMPORAL_CONTRACT_MISSING',
  'SINGULARITY_BREACH'
];

/**
 * Lineage resolver configuration
 */
export interface LineageResolverConfig {
  // Maximum depth to traverse for lineage
  max_depth?: number;

  // Whether to include global precedents
  include_global_precedents?: boolean;

  // Action similarity threshold for direct dependency
  action_similarity_threshold?: number;
}

export class ProofLineageResolver {
  private config: Required<LineageResolverConfig>;

  constructor(config?: Partial<LineageResolverConfig>) {
    this.config = {
      max_depth: config?.max_depth ?? 10,
      include_global_precedents: config?.include_global_precedents ?? true,
      action_similarity_threshold: config?.action_similarity_threshold ?? 0.8
    };
  }

  /**
   * Resolve lineage for a new proof
   *
   * @param proof The new proof being added
   * @param ledger The proof ledger to search
   * @returns LineageResolution with parent hashes
   */
  resolve(proof: OlympusDecisionProof, ledger: ProofLedger): LineageResolution {
    const directParents: string[] = [];
    const globalPrecedents: string[] = [];

    const entries = ledger.getAllEntries();

    // Step 1: Find direct parents (same action/resource)
    for (const entry of entries) {
      if (this.isDirectParent(proof, entry.proof)) {
        directParents.push(entry.proof.proof_hash);
      }
    }

    // Step 2: Find global precedents (system-wide effects)
    if (this.config.include_global_precedents) {
      for (const entry of entries) {
        if (this.isGlobalPrecedent(entry.proof)) {
          // Don't duplicate if already a direct parent
          if (!directParents.includes(entry.proof.proof_hash)) {
            globalPrecedents.push(entry.proof.proof_hash);
          }
        }
      }
    }

    // Combine and deduplicate
    const allParents = [...new Set([...directParents, ...globalPrecedents])];

    // Calculate depth
    const depth = this.calculateLineageDepth(allParents, ledger);

    return {
      direct_parents: directParents,
      global_precedents: globalPrecedents,
      all_parents: allParents,
      depth
    };
  }

  /**
   * Check if an existing proof is a direct parent of the new proof
   *
   * Direct parent criteria:
   * - Same action type on same target
   * - Same project context
   * - Or explicit dependency via forbidden alternatives
   */
  private isDirectParent(
    newProof: OlympusDecisionProof,
    existingProof: OlympusDecisionProof
  ): boolean {
    // Same action on same target
    if (this.actionsRelated(newProof, existingProof)) {
      return true;
    }

    // New proof's action matches existing forbidden alternative
    const newActionHash = newProof.attempted_action_fingerprint.hash;
    if (existingProof.forbidden_alternatives.includes(newActionHash)) {
      return true;
    }

    // Explicit dependency via causal chain reference
    for (const link of newProof.causal_chain) {
      if (link.event.includes(existingProof.run_id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if two actions are related
   */
  private actionsRelated(
    proof1: OlympusDecisionProof,
    proof2: OlympusDecisionProof
  ): boolean {
    const action1 = proof1.attempted_action_fingerprint;
    const action2 = proof2.attempted_action_fingerprint;

    // Same action type
    if (action1.action_type !== action2.action_type) {
      return false;
    }

    // Check description similarity
    const similarity = this.stringSimilarity(
      action1.description,
      action2.description
    );

    return similarity >= this.config.action_similarity_threshold;
  }

  /**
   * Simple string similarity (Jaccard index on words)
   */
  private stringSimilarity(s1: string, s2: string): number {
    const words1 = new Set(s1.toLowerCase().split(/\s+/));
    const words2 = new Set(s2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Check if a proof has global (system-wide) effect
   */
  private isGlobalPrecedent(proof: OlympusDecisionProof): boolean {
    // Check if invariant is global
    if (GLOBAL_INVARIANTS.includes(proof.primary_invariant_violated)) {
      return true;
    }

    // PERMANENT_READ_ONLY affects everything
    if (proof.final_decision === 'PERMANENT_READ_ONLY') {
      return true;
    }

    // Entropy exhaustion is global
    if (proof.entropy_state.is_exhausted) {
      return true;
    }

    return false;
  }

  /**
   * Calculate the maximum depth of lineage
   */
  private calculateLineageDepth(parentHashes: string[], ledger: ProofLedger): number {
    if (parentHashes.length === 0) return 0;

    let maxDepth = 0;
    const visited = new Set<string>();

    const traverse = (hash: string, currentDepth: number): void => {
      if (currentDepth > this.config.max_depth) return;
      if (visited.has(hash)) return;
      visited.add(hash);

      maxDepth = Math.max(maxDepth, currentDepth);

      const entry = ledger.getByProofHash(hash);
      if (entry && 'parent_proof_hashes' in entry.proof) {
        const continuityProof = entry.proof as any;
        if (Array.isArray(continuityProof.parent_proof_hashes)) {
          for (const parentHash of continuityProof.parent_proof_hashes) {
            traverse(parentHash, currentDepth + 1);
          }
        }
      }
    };

    for (const hash of parentHashes) {
      traverse(hash, 1);
    }

    return maxDepth;
  }

  /**
   * Get the full lineage tree for a proof
   */
  getLineageTree(
    proofHash: string,
    ledger: ProofLedger
  ): { hash: string; depth: number; type: 'direct' | 'global' }[] {
    const tree: { hash: string; depth: number; type: 'direct' | 'global' }[] = [];
    const visited = new Set<string>();

    const entry = ledger.getByProofHash(proofHash);
    if (!entry) return tree;

    const traverse = (hash: string, depth: number): void => {
      if (depth > this.config.max_depth) return;
      if (visited.has(hash)) return;
      visited.add(hash);

      const currentEntry = ledger.getByProofHash(hash);
      if (!currentEntry) return;

      const type = this.isGlobalPrecedent(currentEntry.proof) ? 'global' : 'direct';
      tree.push({ hash, depth, type });

      if ('parent_proof_hashes' in currentEntry.proof) {
        const continuityProof = currentEntry.proof as any;
        if (Array.isArray(continuityProof.parent_proof_hashes)) {
          for (const parentHash of continuityProof.parent_proof_hashes) {
            traverse(parentHash, depth + 1);
          }
        }
      }
    };

    if ('parent_proof_hashes' in entry.proof) {
      const continuityProof = entry.proof as any;
      if (Array.isArray(continuityProof.parent_proof_hashes)) {
        for (const parentHash of continuityProof.parent_proof_hashes) {
          traverse(parentHash, 1);
        }
      }
    }

    return tree;
  }

  /**
   * Find common ancestors between two proofs
   */
  findCommonAncestors(
    hash1: string,
    hash2: string,
    ledger: ProofLedger
  ): string[] {
    const ancestors1 = new Set<string>();
    const ancestors2 = new Set<string>();

    const collectAncestors = (hash: string, ancestors: Set<string>): void => {
      if (ancestors.size > 100) return; // Safety limit
      if (ancestors.has(hash)) return;
      ancestors.add(hash);

      const entry = ledger.getByProofHash(hash);
      if (!entry) return;

      if ('parent_proof_hashes' in entry.proof) {
        const continuityProof = entry.proof as any;
        if (Array.isArray(continuityProof.parent_proof_hashes)) {
          for (const parentHash of continuityProof.parent_proof_hashes) {
            collectAncestors(parentHash, ancestors);
          }
        }
      }
    };

    collectAncestors(hash1, ancestors1);
    collectAncestors(hash2, ancestors2);

    return [...ancestors1].filter(a => ancestors2.has(a));
  }

  /**
   * Check if proof B is a descendant of proof A
   */
  isDescendant(
    ancestorHash: string,
    descendantHash: string,
    ledger: ProofLedger
  ): boolean {
    const visited = new Set<string>();

    const search = (hash: string): boolean => {
      if (visited.has(hash)) return false;
      visited.add(hash);

      if (hash === ancestorHash) return true;

      const entry = ledger.getByProofHash(hash);
      if (!entry) return false;

      if ('parent_proof_hashes' in entry.proof) {
        const continuityProof = entry.proof as any;
        if (Array.isArray(continuityProof.parent_proof_hashes)) {
          for (const parentHash of continuityProof.parent_proof_hashes) {
            if (search(parentHash)) return true;
          }
        }
      }

      return false;
    };

    return search(descendantHash);
  }
}

/**
 * Create a new ProofLineageResolver instance
 */
export function createLineageResolver(config?: Partial<LineageResolverConfig>): ProofLineageResolver {
  return new ProofLineageResolver(config);
}
