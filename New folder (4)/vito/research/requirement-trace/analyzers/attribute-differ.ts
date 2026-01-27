/**
 * Attribute Differ
 *
 * Computes attribute-level diffs between two FilterCapabilityShapes.
 * Returns detailed diff with source/target paths and similarity scores.
 */

import type {
  FilterCapabilityShape,
  ShapeAttribute,
  AttributeDiff,
  DiffStatus,
  AttributeEvidence
} from '../types';
import { ALL_SHAPE_ATTRIBUTES } from '../types';
import { computeAttributeSimilarity } from '../shapes/shape-matcher';

export class AttributeDiffer {
  /**
   * Compute full attribute diff between source and target shapes
   */
  diff(
    sourceShape: FilterCapabilityShape | null,
    targetShape: FilterCapabilityShape | null,
    sourceEvidence: AttributeEvidence[],
    targetEvidence: AttributeEvidence[]
  ): AttributeDiff[] {
    const diffs: AttributeDiff[] = [];

    // Create evidence lookup maps
    const sourceEvidenceMap = new Map<ShapeAttribute, AttributeEvidence>();
    const targetEvidenceMap = new Map<ShapeAttribute, AttributeEvidence>();

    for (const ev of sourceEvidence) {
      sourceEvidenceMap.set(ev.attribute, ev);
    }
    for (const ev of targetEvidence) {
      targetEvidenceMap.set(ev.attribute, ev);
    }

    // Diff each attribute
    for (const attribute of ALL_SHAPE_ATTRIBUTES) {
      const sourceValue = sourceShape?.[attribute];
      const targetValue = targetShape?.[attribute];

      const sourceEv = sourceEvidenceMap.get(attribute);
      const targetEv = targetEvidenceMap.get(attribute);

      const sourcePath = sourceEv?.json_path || 'NOT_FOUND';
      const targetPath = targetEv?.json_path || 'NOT_FOUND';

      const status = this.computeDiffStatus(sourceValue, targetValue);
      const similarity = computeAttributeSimilarity(sourceValue, targetValue);

      diffs.push({
        attribute,
        source_value: sourceValue,
        target_value: targetValue,
        status,
        similarity_score: similarity,
        source_path: sourcePath,
        target_path: targetPath,
        notes: this.generateNotes(attribute, sourceValue, targetValue, status)
      });
    }

    return diffs;
  }

  /**
   * Compute diff status for a single attribute
   */
  private computeDiffStatus(sourceValue: unknown, targetValue: unknown): DiffStatus {
    // Both undefined
    if (sourceValue === undefined && targetValue === undefined) {
      return 'PRESERVED'; // Both missing is "preserved" state
    }

    // Source has value, target doesn't
    if (sourceValue !== undefined && targetValue === undefined) {
      return 'MISSING';
    }

    // Target has value, source doesn't
    if (sourceValue === undefined && targetValue !== undefined) {
      return 'ADDED';
    }

    // Both have values - check similarity
    const similarity = computeAttributeSimilarity(sourceValue, targetValue);

    if (similarity === 1.0) {
      return 'PRESERVED';
    }

    if (similarity >= 0.7) {
      return 'TRANSFORMED';
    }

    if (similarity >= 0.3) {
      return 'DEGRADED';
    }

    // Type mismatch check
    if (typeof sourceValue !== typeof targetValue) {
      return 'INCOMPATIBLE';
    }

    // Array length check
    if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      if (targetValue.length < sourceValue.length) {
        return 'DEGRADED';
      }
    }

    return 'TRANSFORMED';
  }

  /**
   * Generate notes explaining the diff
   */
  private generateNotes(
    attribute: ShapeAttribute,
    sourceValue: unknown,
    targetValue: unknown,
    status: DiffStatus
  ): string {
    switch (status) {
      case 'PRESERVED':
        if (sourceValue === undefined) {
          return `Attribute not present in either source or target`;
        }
        return `Attribute preserved: ${JSON.stringify(sourceValue)}`;

      case 'MISSING':
        return `Attribute lost in handoff. Source had: ${JSON.stringify(sourceValue)}`;

      case 'ADDED':
        return `Attribute appeared in target (not in source): ${JSON.stringify(targetValue)}`;

      case 'TRANSFORMED':
        return `Value changed: ${JSON.stringify(sourceValue)} → ${JSON.stringify(targetValue)}`;

      case 'DEGRADED':
        if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
          const lost = (sourceValue as unknown[]).filter(v => !(targetValue as unknown[]).includes(v));
          return `Array shrunk. Lost values: ${JSON.stringify(lost)}`;
        }
        return `Value lost specificity: ${JSON.stringify(sourceValue)} → ${JSON.stringify(targetValue)}`;

      case 'INCOMPATIBLE':
        return `Type mismatch: ${typeof sourceValue} → ${typeof targetValue}`;

      default:
        return '';
    }
  }

  /**
   * Summarize diffs into counts
   */
  summarize(diffs: AttributeDiff[]): {
    preserved: number;
    missing: number;
    degraded: number;
    transformed: number;
    added: number;
    incompatible: number;
  } {
    const summary = {
      preserved: 0,
      missing: 0,
      degraded: 0,
      transformed: 0,
      added: 0,
      incompatible: 0
    };

    for (const diff of diffs) {
      switch (diff.status) {
        case 'PRESERVED': summary.preserved++; break;
        case 'MISSING': summary.missing++; break;
        case 'DEGRADED': summary.degraded++; break;
        case 'TRANSFORMED': summary.transformed++; break;
        case 'ADDED': summary.added++; break;
        case 'INCOMPATIBLE': summary.incompatible++; break;
      }
    }

    return summary;
  }

  /**
   * Get only attributes that changed (for reporting)
   */
  getChangedAttributes(diffs: AttributeDiff[]): AttributeDiff[] {
    return diffs.filter(d =>
      d.status !== 'PRESERVED' ||
      (d.source_value !== undefined && d.target_value !== undefined)
    );
  }

  /**
   * Get lost attributes specifically
   */
  getLostAttributes(diffs: AttributeDiff[]): AttributeDiff[] {
    return diffs.filter(d => d.status === 'MISSING');
  }

  /**
   * Get degraded attributes
   */
  getDegradedAttributes(diffs: AttributeDiff[]): AttributeDiff[] {
    return diffs.filter(d => d.status === 'DEGRADED');
  }
}
