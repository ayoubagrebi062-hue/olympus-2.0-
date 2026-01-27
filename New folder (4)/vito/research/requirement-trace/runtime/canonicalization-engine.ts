/**
 * Canonicalization Engine
 *
 * Produces UNIQUE canonical representations for intents.
 *
 * KEY PRINCIPLE:
 * - Each causal path has exactly ONE canonical intent representation
 * - Structurally equivalent MSIs collapse to the same canonical form
 * - Canonicalization is deterministic and reversible in structure
 *
 * CANONICALIZATION RULES:
 * 1. Normalize all components (sort, deduplicate)
 * 2. Order operations by causal dependency
 * 3. Compute deterministic canonical fingerprint
 * 4. Group equivalent intents into equivalence classes
 *
 * NON-NEGOTIABLE:
 * - Deterministic canonicalization
 * - Unique representation per causal path
 * - No heuristics, ML, or probability
 */

import * as crypto from 'crypto';
import type {
  MinimalStructuralIntent,
  CanonicalIntent,
  NecessaryFuture,
  CausalCone
} from './types';

// CIN version - immutable
const CIN_VERSION = '1.0.0';
Object.freeze({ CIN_VERSION });

// Operation ordering by causal dependency
// READ must come before UPDATE/TRANSFORM (can't modify what you haven't read)
// CREATE must come before UPDATE (can't update what doesn't exist)
// TRANSFORM is most powerful (comes last)
const OPERATION_ORDER: Record<string, number> = {
  'READ': 0,
  'CREATE': 1,
  'UPDATE': 2,
  'TRANSFORM': 3
};

export class CanonicalizationEngine {
  // Cache of canonical intents by fingerprint
  private canonicalCache: Map<string, CanonicalIntent> = new Map();

  // Equivalence class tracking (original fingerprint -> canonical fingerprint)
  private equivalenceIndex: Map<string, string> = new Map();

  /**
   * Canonicalize an MSI to its unique canonical form
   *
   * @param msi The MSI to canonicalize
   * @param future The NecessaryFuture providing causal context
   * @param cone The CausalCone for this future
   */
  canonicalize(
    msi: MinimalStructuralIntent,
    future: NecessaryFuture,
    cone: CausalCone
  ): CanonicalIntent {
    // Compute canonical fingerprint
    const canonicalFingerprint = this.computeCanonicalFingerprint(msi);

    // Check if we already have this canonical form
    const existing = this.canonicalCache.get(canonicalFingerprint);
    if (existing) {
      // Add this MSI's source to the equivalence class
      this.addToEquivalenceClass(existing, msi);
      return existing;
    }

    // Create new canonical intent
    const canonicalId = `CAN-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Normalize components
    const canonicalComponents = this.normalizeComponents(msi);

    // Build causal path reference
    const causalPath = {
      future_id: future.future_id,
      mccs_id: future.chosen_mccs.mccs_id,
      cone_id: cone.cone_id
    };

    // Initialize equivalence class with this MSI's source
    const equivalenceClass = {
      equivalent_fingerprints: [msi.source_intent_fingerprint],
      equivalence_count: 1
    };

    const canonical: CanonicalIntent = {
      canonical_id: canonicalId,
      canonical_fingerprint: canonicalFingerprint,
      source_msi_id: msi.msi_id,
      causal_path: causalPath,
      canonical_components: canonicalComponents,
      equivalence_class: equivalenceClass,
      canonicalized_at: now,
      immutable: true,
      append_only: true
    };

    // Cache the canonical intent
    this.canonicalCache.set(canonicalFingerprint, canonical);

    // Index the equivalence
    this.equivalenceIndex.set(msi.source_intent_fingerprint, canonicalFingerprint);

    return canonical;
  }

  /**
   * Normalize MSI components to canonical form
   */
  private normalizeComponents(
    msi: MinimalStructuralIntent
  ): CanonicalIntent['canonical_components'] {
    // Sort and deduplicate shapes
    const shapes = this.normalizeAndSort(msi.minimal_components.essential_shapes);

    // Sort and deduplicate handoffs
    const handoffs = this.normalizeAndSort(msi.minimal_components.essential_handoffs);

    // Order operations by causal dependency
    const operations = this.orderOperationsByCausalDependency(
      msi.minimal_components.essential_operations
    );

    // Outcome is already singular
    const outcome = msi.minimal_components.essential_outcome;

    return {
      shapes,
      handoffs,
      operations,
      outcome
    };
  }

  /**
   * Normalize an array: sort and deduplicate
   */
  private normalizeAndSort(items: string[]): string[] {
    return Array.from(new Set(items)).sort();
  }

  /**
   * Order operations by causal dependency
   *
   * READ < CREATE < UPDATE < TRANSFORM
   */
  private orderOperationsByCausalDependency(
    operations: ('CREATE' | 'READ' | 'UPDATE' | 'TRANSFORM')[]
  ): ('CREATE' | 'READ' | 'UPDATE' | 'TRANSFORM')[] {
    // Deduplicate
    const uniqueOps = Array.from(new Set(operations));

    // Sort by causal dependency order
    return uniqueOps.sort((a, b) => {
      const orderA = OPERATION_ORDER[a] ?? 999;
      const orderB = OPERATION_ORDER[b] ?? 999;
      return orderA - orderB;
    });
  }

  /**
   * Compute canonical fingerprint for an MSI
   *
   * This is the unique identifier for the canonical form.
   * Structurally equivalent MSIs produce the same fingerprint.
   */
  computeCanonicalFingerprint(msi: MinimalStructuralIntent): string {
    // Normalize all components for fingerprinting
    const shapes = this.normalizeAndSort(msi.minimal_components.essential_shapes);
    const handoffs = this.normalizeAndSort(msi.minimal_components.essential_handoffs);
    const operations = this.orderOperationsByCausalDependency(
      msi.minimal_components.essential_operations
    );
    const outcome = msi.minimal_components.essential_outcome;

    // Create canonical representation
    const canonical = {
      shapes,
      handoffs,
      operations,
      outcome
    };

    // Compute deterministic hash
    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Add an MSI's source intent to an existing canonical's equivalence class
   */
  private addToEquivalenceClass(
    canonical: CanonicalIntent,
    msi: MinimalStructuralIntent
  ): void {
    const fingerprint = msi.source_intent_fingerprint;

    // Check if already in equivalence class
    if (!canonical.equivalence_class.equivalent_fingerprints.includes(fingerprint)) {
      canonical.equivalence_class.equivalent_fingerprints.push(fingerprint);
      canonical.equivalence_class.equivalence_count++;
    }

    // Update equivalence index
    this.equivalenceIndex.set(fingerprint, canonical.canonical_fingerprint);
  }

  /**
   * Look up canonical form by original intent fingerprint
   */
  getCanonicalByOriginalFingerprint(originalFingerprint: string): CanonicalIntent | null {
    const canonicalFingerprint = this.equivalenceIndex.get(originalFingerprint);
    if (!canonicalFingerprint) {
      return null;
    }
    return this.canonicalCache.get(canonicalFingerprint) ?? null;
  }

  /**
   * Look up canonical form by canonical fingerprint
   */
  getCanonicalByFingerprint(canonicalFingerprint: string): CanonicalIntent | null {
    return this.canonicalCache.get(canonicalFingerprint) ?? null;
  }

  /**
   * Check if two MSIs are canonically equivalent
   */
  areCanonicallyEquivalent(msi1: MinimalStructuralIntent, msi2: MinimalStructuralIntent): boolean {
    const fp1 = this.computeCanonicalFingerprint(msi1);
    const fp2 = this.computeCanonicalFingerprint(msi2);
    return fp1 === fp2;
  }

  /**
   * Verify a canonical intent is properly formed
   */
  verifyCanonical(canonical: CanonicalIntent): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check fingerprint matches computed
    const recomputed = this.recomputeFingerprint(canonical);
    if (recomputed !== canonical.canonical_fingerprint) {
      issues.push(
        `Fingerprint mismatch: stored=${canonical.canonical_fingerprint}, computed=${recomputed}`
      );
    }

    // Check components are normalized
    const shapes = canonical.canonical_components.shapes;
    const sortedShapes = [...shapes].sort();
    if (JSON.stringify(shapes) !== JSON.stringify(sortedShapes)) {
      issues.push('Shapes are not properly sorted');
    }

    const handoffs = canonical.canonical_components.handoffs;
    const sortedHandoffs = [...handoffs].sort();
    if (JSON.stringify(handoffs) !== JSON.stringify(sortedHandoffs)) {
      issues.push('Handoffs are not properly sorted');
    }

    // Check operations are ordered
    const operations = canonical.canonical_components.operations;
    const orderedOps = this.orderOperationsByCausalDependency([...operations]);
    if (JSON.stringify(operations) !== JSON.stringify(orderedOps)) {
      issues.push('Operations are not properly ordered by causal dependency');
    }

    // Check equivalence class is consistent
    if (canonical.equivalence_class.equivalent_fingerprints.length !==
        canonical.equivalence_class.equivalence_count) {
      issues.push('Equivalence class count mismatch');
    }

    // Check immutability markers
    if (canonical.immutable !== true || canonical.append_only !== true) {
      issues.push('Immutability markers not set');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Recompute fingerprint from canonical components
   */
  private recomputeFingerprint(canonical: CanonicalIntent): string {
    const components = {
      shapes: canonical.canonical_components.shapes,
      handoffs: canonical.canonical_components.handoffs,
      operations: canonical.canonical_components.operations,
      outcome: canonical.canonical_components.outcome
    };

    const json = JSON.stringify(components, Object.keys(components).sort());
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Get all canonical intents
   */
  getAllCanonicals(): CanonicalIntent[] {
    return Array.from(this.canonicalCache.values());
  }

  /**
   * Get equivalence statistics
   */
  getEquivalenceStats(): {
    total_canonicals: number;
    total_equivalences: number;
    average_class_size: number;
    largest_class_size: number;
  } {
    const canonicals = this.getAllCanonicals();
    let totalEquivalences = 0;
    let largestClassSize = 0;

    for (const canonical of canonicals) {
      const classSize = canonical.equivalence_class.equivalence_count;
      totalEquivalences += classSize;
      if (classSize > largestClassSize) {
        largestClassSize = classSize;
      }
    }

    const totalCanonicals = canonicals.length;
    const averageClassSize = totalCanonicals > 0 ? totalEquivalences / totalCanonicals : 0;

    return {
      total_canonicals: totalCanonicals,
      total_equivalences: totalEquivalences,
      average_class_size: averageClassSize,
      largest_class_size: largestClassSize
    };
  }

  /**
   * Clear the canonicalization cache
   * (Only for testing - in production, cache is append-only)
   */
  clearCache(): void {
    this.canonicalCache.clear();
    this.equivalenceIndex.clear();
  }

  /**
   * Export the equivalence index
   */
  exportEquivalenceIndex(): Record<string, string> {
    const index: Record<string, string> = {};
    for (const [original, canonical] of this.equivalenceIndex) {
      index[original] = canonical;
    }
    return index;
  }

  /**
   * Import equivalence index (for persistence restoration)
   */
  importEquivalenceIndex(index: Record<string, string>): void {
    for (const [original, canonical] of Object.entries(index)) {
      this.equivalenceIndex.set(original, canonical);
    }
  }

  /**
   * Import canonical intents (for persistence restoration)
   */
  importCanonicals(canonicals: CanonicalIntent[]): void {
    for (const canonical of canonicals) {
      this.canonicalCache.set(canonical.canonical_fingerprint, canonical);

      // Rebuild equivalence index
      for (const fingerprint of canonical.equivalence_class.equivalent_fingerprints) {
        this.equivalenceIndex.set(fingerprint, canonical.canonical_fingerprint);
      }
    }
  }
}
