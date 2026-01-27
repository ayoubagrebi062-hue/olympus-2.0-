/**
 * Adaptive Inspection Escalation
 *
 * Automatically escalates inspection depth based on shape mortality status.
 * NO FLAGS, NO CONFIG, NO OVERRIDES.
 *
 * Inspection Levels (DETERMINISTIC):
 * - HEALTHY     → BASELINE (basic checks)
 * - FLAKY       → ATTRIBUTE_DIFF (attribute comparison)
 * - DEGRADING   → FULL_STRUCTURAL_TRACE (complete trace)
 * - BROKEN      → MANDATORY_FORENSICS (fingerprints + counterfactual)
 *
 * NON-NEGOTIABLE:
 * - Inspection level is determined SOLELY by mortality status
 * - No human override
 * - No configuration
 * - No runtime flags
 */

import type {
  InspectionLevel,
  MortalityStatus,
  ShapeInspectionConfig,
  ShapeKind,
  ShapeCriticality
} from './types';
import type { ShapeDeclaration } from '../registry/types';
import { MortalityTracker } from './mortality-tracker';

// Inspection level mapping - IMMUTABLE
const INSPECTION_LEVEL_MAP: Record<MortalityStatus, InspectionLevel> = Object.freeze({
  HEALTHY: 'BASELINE',
  FLAKY: 'ATTRIBUTE_DIFF',
  DEGRADING: 'FULL_STRUCTURAL_TRACE',
  SYSTEMICALLY_BROKEN: 'MANDATORY_FORENSICS'
});

// Trace depth mapping - IMMUTABLE
const TRACE_DEPTH_MAP: Record<InspectionLevel, 'SHALLOW' | 'MEDIUM' | 'DEEP' | 'FULL'> = Object.freeze({
  BASELINE: 'SHALLOW',
  ATTRIBUTE_DIFF: 'MEDIUM',
  FULL_STRUCTURAL_TRACE: 'DEEP',
  MANDATORY_FORENSICS: 'FULL'
});

// Fingerprint requirement mapping - IMMUTABLE
const FINGERPRINT_REQUIRED_MAP: Record<InspectionLevel, boolean> = Object.freeze({
  BASELINE: false,
  ATTRIBUTE_DIFF: false,
  FULL_STRUCTURAL_TRACE: true,
  MANDATORY_FORENSICS: true
});

// Counterfactual requirement mapping - IMMUTABLE
const COUNTERFACTUAL_REQUIRED_MAP: Record<InspectionLevel, boolean> = Object.freeze({
  BASELINE: false,
  ATTRIBUTE_DIFF: false,
  FULL_STRUCTURAL_TRACE: false,
  MANDATORY_FORENSICS: true
});

// Freeze all mappings to prevent runtime modification
Object.freeze(INSPECTION_LEVEL_MAP);
Object.freeze(TRACE_DEPTH_MAP);
Object.freeze(FINGERPRINT_REQUIRED_MAP);
Object.freeze(COUNTERFACTUAL_REQUIRED_MAP);

export class AdaptiveInspector {
  private mortalityTracker: MortalityTracker;

  constructor(mortalityTracker: MortalityTracker) {
    this.mortalityTracker = mortalityTracker;
  }

  /**
   * Determine inspection configuration for a shape
   *
   * Inspection level is DETERMINISTICALLY derived from mortality status.
   * NO OVERRIDES, NO FLAGS, NO CONFIGURATION.
   */
  getInspectionConfig(shapeId: string): ShapeInspectionConfig {
    const mortalityStatus = this.mortalityTracker.getMortalityStatus(shapeId);
    const inspectionLevel = this.deriveInspectionLevel(mortalityStatus);

    return {
      shape_id: shapeId,
      mortality_status: mortalityStatus,
      inspection_level: inspectionLevel,
      requires_fingerprints: FINGERPRINT_REQUIRED_MAP[inspectionLevel],
      requires_counterfactual: COUNTERFACTUAL_REQUIRED_MAP[inspectionLevel],
      trace_depth: TRACE_DEPTH_MAP[inspectionLevel]
    };
  }

  /**
   * Get inspection configurations for all shapes
   */
  getInspectionConfigs(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>
  ): ShapeInspectionConfig[] {
    return shapes.map(shape => this.getInspectionConfig(shape.id));
  }

  /**
   * Derive inspection level from mortality status
   *
   * This is a PURE FUNCTION - same input always produces same output.
   * NO RANDOMNESS, NO EXTERNAL STATE (except mortality data).
   */
  private deriveInspectionLevel(mortalityStatus: MortalityStatus): InspectionLevel {
    return INSPECTION_LEVEL_MAP[mortalityStatus];
  }

  /**
   * Check if shape requires fingerprint collection
   */
  requiresFingerprints(shapeId: string): boolean {
    const config = this.getInspectionConfig(shapeId);
    return config.requires_fingerprints;
  }

  /**
   * Check if shape requires counterfactual replay
   */
  requiresCounterfactual(shapeId: string): boolean {
    const config = this.getInspectionConfig(shapeId);
    return config.requires_counterfactual;
  }

  /**
   * Get all shapes requiring mandatory forensics
   */
  getShapesRequiringForensics(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>
  ): string[] {
    return shapes
      .filter(shape => {
        const config = this.getInspectionConfig(shape.id);
        return config.inspection_level === 'MANDATORY_FORENSICS';
      })
      .map(shape => shape.id);
  }

  /**
   * Get all shapes requiring fingerprints
   */
  getShapesRequiringFingerprints(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>
  ): string[] {
    return shapes
      .filter(shape => this.requiresFingerprints(shape.id))
      .map(shape => shape.id);
  }

  /**
   * Get all shapes requiring counterfactual replay
   */
  getShapesRequiringCounterfactual(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>
  ): string[] {
    return shapes
      .filter(shape => this.requiresCounterfactual(shape.id))
      .map(shape => shape.id);
  }

  /**
   * Generate inspection summary
   */
  generateSummary(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>
  ): InspectionSummary {
    const configs = this.getInspectionConfigs(shapes);

    const byLevel: Record<InspectionLevel, number> = {
      BASELINE: 0,
      ATTRIBUTE_DIFF: 0,
      FULL_STRUCTURAL_TRACE: 0,
      MANDATORY_FORENSICS: 0
    };

    for (const config of configs) {
      byLevel[config.inspection_level]++;
    }

    return {
      total_shapes: shapes.length,
      by_inspection_level: byLevel,
      shapes_requiring_fingerprints: configs.filter(c => c.requires_fingerprints).length,
      shapes_requiring_counterfactual: configs.filter(c => c.requires_counterfactual).length,
      shapes_at_mandatory_forensics: byLevel.MANDATORY_FORENSICS,
      escalation_ratio: shapes.length > 0
        ? (byLevel.FULL_STRUCTURAL_TRACE + byLevel.MANDATORY_FORENSICS) / shapes.length
        : 0
    };
  }

  /**
   * Check if any shape requires escalated inspection
   */
  hasEscalatedShapes(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>
  ): boolean {
    return shapes.some(shape => {
      const config = this.getInspectionConfig(shape.id);
      return config.inspection_level !== 'BASELINE';
    });
  }

  /**
   * Get the highest inspection level among all shapes
   */
  getMaxInspectionLevel(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>
  ): InspectionLevel {
    const levels: InspectionLevel[] = ['BASELINE', 'ATTRIBUTE_DIFF', 'FULL_STRUCTURAL_TRACE', 'MANDATORY_FORENSICS'];

    let maxIndex = 0;
    for (const shape of shapes) {
      const config = this.getInspectionConfig(shape.id);
      const index = levels.indexOf(config.inspection_level);
      if (index > maxIndex) {
        maxIndex = index;
      }
    }

    return levels[maxIndex];
  }

  /**
   * Determine if forensic collection should run
   *
   * Returns true if ANY shape is at FULL_STRUCTURAL_TRACE or MANDATORY_FORENSICS
   */
  shouldCollectForensics(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>
  ): boolean {
    return shapes.some(shape => {
      const config = this.getInspectionConfig(shape.id);
      return config.requires_fingerprints;
    });
  }

  /**
   * Determine if counterfactual replay should run
   *
   * Returns true if ANY shape is at MANDATORY_FORENSICS
   */
  shouldRunCounterfactual(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>
  ): boolean {
    return shapes.some(shape => {
      const config = this.getInspectionConfig(shape.id);
      return config.requires_counterfactual;
    });
  }
}

/**
 * Inspection summary
 */
export interface InspectionSummary {
  total_shapes: number;
  by_inspection_level: Record<InspectionLevel, number>;
  shapes_requiring_fingerprints: number;
  shapes_requiring_counterfactual: number;
  shapes_at_mandatory_forensics: number;
  escalation_ratio: number;
}
