/**
 * Action Fingerprinter
 *
 * Captures proposed execution diffs as deterministic structural fingerprints.
 *
 * KEY PRINCIPLE:
 * Fingerprints are STRUCTURAL, not content-based:
 * - Which shapes are affected
 * - Which handoffs are involved
 * - Which transform types are applied
 * - Direction of change (ADD/REMOVE/MODIFY)
 *
 * This ensures the same "type" of action always produces the same fingerprint,
 * even if the specific values differ.
 *
 * NON-NEGOTIABLE:
 * - Deterministic (same inputs → same fingerprint)
 * - No heuristics or ML
 * - No probability
 * - Structural only
 */

import * as crypto from 'crypto';
import type { ActionSignature } from './types';
import type { ShapeTraceResult } from '../registry/types';

// IE version - immutable
const IE_VERSION = '1.0.0';
Object.freeze({ IE_VERSION });

/**
 * Change detection result for a single shape
 */
interface ShapeChange {
  shapeId: string;
  handoffIds: string[];
  transformType: string;
  direction: 'ADD' | 'REMOVE' | 'MODIFY';
}

export class ActionFingerprinter {
  /**
   * Compute action signature from trace results
   *
   * The fingerprint captures the STRUCTURE of what's changing,
   * not the specific values.
   */
  computeSignature(
    traceResults: Record<string, ShapeTraceResult>,
    runId: string
  ): ActionSignature {
    // Detect all changes
    const changes = this.detectChanges(traceResults);

    // Extract components
    const components = this.extractComponents(changes);

    // Compute deterministic fingerprint
    const fingerprint = this.computeFingerprint(components);

    // Generate signature ID
    const signatureId = `SIG-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    return {
      signature_id: signatureId,
      fingerprint,
      components,
      computed_at: new Date().toISOString(),
      run_id: runId
    };
  }

  /**
   * Detect changes from trace results
   *
   * Analyzes each shape to determine:
   * - If it's a new shape (ADD)
   * - If it's being removed (REMOVE)
   * - If it's being modified (MODIFY)
   */
  private detectChanges(
    traceResults: Record<string, ShapeTraceResult>
  ): ShapeChange[] {
    const changes: ShapeChange[] = [];

    for (const [shapeId, result] of Object.entries(traceResults)) {
      // Determine change direction based on trace result
      const direction = this.determineChangeDirection(result);

      // Get transform type from the shape category
      const transformType = this.extractTransformType(result);

      // Get handoff IDs from handoff_losses
      const handoffIds = this.extractHandoffIds(result);

      changes.push({
        shapeId,
        handoffIds,
        transformType,
        direction
      });
    }

    // Sort for determinism (always same order)
    return changes.sort((a, b) => a.shapeId.localeCompare(b.shapeId));
  }

  /**
   * Determine change direction from trace result
   *
   * Uses survival_status and handoff_losses to determine direction:
   * - If shape survived = MODIFY (existing shape being processed)
   * - If shape has losses = MODIFY with potential removal
   * - If shape didn't survive = REMOVE (shape was lost)
   */
  private determineChangeDirection(result: ShapeTraceResult): 'ADD' | 'REMOVE' | 'MODIFY' {
    // Check survival status
    const survived = result.survival_status.survived_to_target;

    if (!survived) {
      // Shape didn't survive - it was removed/lost
      return 'REMOVE';
    }

    // Check for losses in handoffs
    const hasLosses = Object.values(result.handoff_losses).some(
      loss => loss.loss_detected
    );

    if (hasLosses) {
      // Shape survived but has losses - modification
      return 'MODIFY';
    }

    // Shape survived without losses - could be new or existing
    // Default to MODIFY as we're tracing existing pipeline
    return 'MODIFY';
  }

  /**
   * Extract transform type from trace result
   *
   * Uses category as the transform type
   */
  private extractTransformType(result: ShapeTraceResult): string {
    // Use category as transform type
    if (result.category) {
      return result.category;
    }

    // Fallback: extract from shape ID pattern
    const match = result.shape_id?.match(/^([A-Z]+)-/);
    if (match) {
      return match[1];
    }

    return 'UNKNOWN';
  }

  /**
   * Extract handoff IDs from trace result
   */
  private extractHandoffIds(result: ShapeTraceResult): string[] {
    // Get all handoff IDs from handoff_losses
    const handoffIds = Object.keys(result.handoff_losses);

    // Sort for determinism
    return handoffIds.sort();
  }

  /**
   * Extract structural components from changes
   */
  private extractComponents(changes: ShapeChange[]): ActionSignature['components'] {
    // Deduplicate and sort for determinism
    const affectedShapes = [...new Set(changes.map(c => c.shapeId))].sort();

    // Flatten all handoff IDs
    const allHandoffs: string[] = [];
    for (const change of changes) {
      allHandoffs.push(...change.handoffIds);
    }
    const affectedHandoffs = [...new Set(allHandoffs)].sort();

    const transformTypes = [...new Set(changes.map(c => c.transformType))].sort();
    const changeDirections = [...new Set(changes.map(c => c.direction))].sort() as ('ADD' | 'REMOVE' | 'MODIFY')[];

    return {
      affected_shapes: affectedShapes,
      affected_handoffs: affectedHandoffs,
      transform_types: transformTypes,
      change_directions: changeDirections
    };
  }

  /**
   * Compute deterministic fingerprint from components
   *
   * Uses SHA-256 for cryptographic determinism.
   * The fingerprint is structural - same structure = same fingerprint.
   */
  private computeFingerprint(components: ActionSignature['components']): string {
    // Create canonical representation
    const canonical = {
      shapes: components.affected_shapes,
      handoffs: components.affected_handoffs,
      transforms: components.transform_types,
      directions: components.change_directions
    };

    // Deterministic JSON (sorted keys)
    const json = JSON.stringify(canonical, Object.keys(canonical).sort());

    // SHA-256 hash
    const hash = crypto.createHash('sha256').update(json).digest('hex');

    // Return truncated hash (first 16 chars is sufficient)
    return hash.substring(0, 16);
  }

  /**
   * Check if two signatures have the same structural fingerprint
   */
  signaturesMatch(sig1: ActionSignature, sig2: ActionSignature): boolean {
    return sig1.fingerprint === sig2.fingerprint;
  }

  /**
   * Get structural similarity score between two signatures
   * Returns 1.0 for identical, 0.0 for completely different
   */
  computeSimilarity(sig1: ActionSignature, sig2: ActionSignature): number {
    if (sig1.fingerprint === sig2.fingerprint) {
      return 1.0;
    }

    // Compute Jaccard similarity for each component
    const shapesSimilarity = this.jaccardSimilarity(
      sig1.components.affected_shapes,
      sig2.components.affected_shapes
    );
    const handoffsSimilarity = this.jaccardSimilarity(
      sig1.components.affected_handoffs,
      sig2.components.affected_handoffs
    );
    const transformsSimilarity = this.jaccardSimilarity(
      sig1.components.transform_types,
      sig2.components.transform_types
    );
    const directionsSimilarity = this.jaccardSimilarity(
      sig1.components.change_directions,
      sig2.components.change_directions
    );

    // Weighted average (transforms and handoffs matter more)
    return (
      0.2 * shapesSimilarity +
      0.3 * handoffsSimilarity +
      0.3 * transformsSimilarity +
      0.2 * directionsSimilarity
    );
  }

  /**
   * Compute Jaccard similarity between two arrays
   */
  private jaccardSimilarity(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) {
      return 1.0; // Both empty = identical
    }

    return intersection.size / union.size;
  }
}
