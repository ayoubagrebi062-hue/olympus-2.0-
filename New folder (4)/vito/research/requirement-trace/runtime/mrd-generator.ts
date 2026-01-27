/**
 * ORIS Minimal Repair Directive (MRD) Generator
 *
 * Generates advisory repair directives that identify the smallest
 * structural change that would prevent observed losses.
 *
 * MRDs are:
 * - ADVISORY ONLY - they do not execute automatically
 * - Do NOT modify agent logic
 * - Do NOT infer missing data
 * - Do NOT retry operations
 * - DETERMINISTIC - same input always produces same output
 */

import * as crypto from 'crypto';
import type {
  MinimalRepairDirective,
  LossEvidence,
  RepairType,
  RSRViolation,
  ShapeKind,
  ShapeCriticality,
  EnforcementAction
} from './types';
import type { LossClass, TracedAgentId, HandoffId } from '../types';
import type { ShapeTraceResult, HandoffLossResult, ShapeExtractionResult } from '../registry/types';
import type { CriticalShapeDeclaration } from '../registry/shapes';

// Stage order
const STAGE_ORDER: TracedAgentId[] = ['strategos', 'scope', 'cartographer', 'blocks', 'wire', 'pixel'];

// Handoff to stage mapping
const HANDOFF_STAGES: Record<HandoffId, { source: TracedAgentId; target: TracedAgentId }> = {
  H1: { source: 'strategos', target: 'scope' },
  H2: { source: 'scope', target: 'cartographer' },
  H3: { source: 'cartographer', target: 'blocks' },
  H4: { source: 'blocks', target: 'wire' },
  H5: { source: 'wire', target: 'pixel' }
};

export class MRDGenerator {
  /**
   * Generate MRDs for all violations
   */
  generateAll(
    trigger: 'BLOCK_ALL' | 'FORK_TTE',
    violations: RSRViolation[],
    shapes: CriticalShapeDeclaration[],
    traceResults: Record<string, ShapeTraceResult>
  ): MinimalRepairDirective[] {
    const directives: MinimalRepairDirective[] = [];

    for (const violation of violations) {
      const shape = shapes.find(s => s.id === violation.shape_id);
      if (!shape) continue;

      const traceResult = traceResults[shape.id];
      if (!traceResult) continue;

      const mrd = this.generateForViolation(trigger, violation, shape, traceResult);
      if (mrd) {
        directives.push(mrd);
      }
    }

    return directives;
  }

  /**
   * Generate MRD for a single violation
   */
  generateForViolation(
    trigger: 'BLOCK_ALL' | 'FORK_TTE',
    violation: RSRViolation,
    shape: CriticalShapeDeclaration,
    traceResult: ShapeTraceResult
  ): MinimalRepairDirective | null {
    // Find the first handoff where loss occurred
    const lossEvidence = this.findLossEvidence(shape, traceResult);
    if (!lossEvidence) return null;

    // Determine repair type based on loss class
    const repairType = this.determineRepairType(lossEvidence.loss_class, shape.kind);

    // Generate repair description
    const repairDescription = this.generateRepairDescription(
      repairType,
      lossEvidence,
      shape
    );

    // Determine repair location
    const repairLocation = this.determineRepairLocation(lossEvidence);

    // Determine structural change
    const structuralChange = this.determineStructuralChange(
      repairType,
      lossEvidence,
      shape
    );

    return {
      directive_id: this.generateDirectiveId(),
      generated_at: new Date().toISOString(),
      trigger,

      target_shape_id: shape.id,
      target_shape_kind: shape.kind,
      target_criticality: shape.criticality,

      loss_evidence: lossEvidence,

      repair_type: repairType,
      repair_description: repairDescription,
      repair_location: repairLocation,

      structural_change: structuralChange,

      readonly: true,
      automatic_execution: false
    };
  }

  /**
   * Find loss evidence from trace result
   */
  private findLossEvidence(
    shape: CriticalShapeDeclaration,
    traceResult: ShapeTraceResult
  ): LossEvidence | null {
    // Find first handoff with loss
    const handoffs: HandoffId[] = ['H1', 'H2', 'H3', 'H4', 'H5'];

    for (const handoffId of handoffs) {
      const handoffLoss = traceResult.handoff_losses[handoffId];
      if (!handoffLoss || !handoffLoss.loss_detected || !handoffLoss.loss_class) {
        continue;
      }

      const stages = HANDOFF_STAGES[handoffId];
      const sourceExtraction = traceResult.extractions[stages.source];
      const targetExtraction = traceResult.extractions[stages.target];

      return {
        shape_id: shape.id,
        handoff_id: handoffId,
        source_agent: stages.source,
        target_agent: stages.target,
        loss_class: handoffLoss.loss_class,
        attributes_before: sourceExtraction?.attributes_found || [],
        attributes_after: targetExtraction?.attributes_found || [],
        attributes_lost: handoffLoss.attributes_lost || [],
        source_path: this.getFirstSourcePath(sourceExtraction),
        target_path: this.getFirstSourcePath(targetExtraction),
        structural_diff: this.classifyStructuralDiff(handoffLoss.loss_class)
      };
    }

    // No handoff loss found, but violation exists - check final stage
    const pixelExtraction = traceResult.extractions['pixel'];
    const strategosExtraction = traceResult.extractions['strategos'];

    if (pixelExtraction && pixelExtraction.attributes_missing.length > 0) {
      return {
        shape_id: shape.id,
        handoff_id: 'H5', // Default to last handoff
        source_agent: 'wire',
        target_agent: 'pixel',
        loss_class: 'L1_PARTIAL_CAPTURE',
        attributes_before: strategosExtraction?.attributes_found || shape.attributes.required,
        attributes_after: pixelExtraction.attributes_found,
        attributes_lost: pixelExtraction.attributes_missing,
        source_path: null,
        target_path: this.getFirstSourcePath(pixelExtraction),
        structural_diff: {
          type: 'OMISSION',
          description: `${pixelExtraction.attributes_missing.length} required attributes missing at final stage`
        }
      };
    }

    return null;
  }

  /**
   * Get first source path from extraction
   */
  private getFirstSourcePath(extraction: ShapeExtractionResult | undefined): string | null {
    if (!extraction) return null;
    const paths = Object.values(extraction.source_paths);
    return paths.length > 0 ? paths[0] : null;
  }

  /**
   * Classify structural diff based on loss class
   */
  private classifyStructuralDiff(lossClass: LossClass): LossEvidence['structural_diff'] {
    switch (lossClass) {
      case 'L0_TOTAL_OMISSION':
        return {
          type: 'OMISSION',
          description: 'Shape completely omitted from agent output'
        };
      case 'L1_PARTIAL_CAPTURE':
        return {
          type: 'OMISSION',
          description: 'Some required attributes omitted'
        };
      case 'L2_SEMANTIC_DRIFT':
        return {
          type: 'TRANSFORMATION',
          description: 'Attribute meaning changed during handoff'
        };
      case 'L3_SPECIFICITY_LOSS':
        return {
          type: 'TRUNCATION',
          description: 'Specific values lost, replaced with generic'
        };
      case 'L4_CONTEXT_TRUNCATION':
        return {
          type: 'TRUNCATION',
          description: 'Contextual information truncated'
        };
      case 'L5_DEPENDENCY_SKIP':
        return {
          type: 'OMISSION',
          description: 'Dependent attributes skipped'
        };
      case 'L6_SUMMARY_COLLAPSE':
        return {
          type: 'COLLAPSE',
          description: 'Multiple attributes collapsed during summarization'
        };
      case 'L7_SCHEMA_MISMATCH':
        return {
          type: 'TRANSFORMATION',
          description: 'Schema structure changed incompatibly'
        };
      default:
        return {
          type: 'OMISSION',
          description: 'Unknown loss type'
        };
    }
  }

  /**
   * Determine repair type based on loss class and shape kind
   */
  private determineRepairType(lossClass: LossClass, shapeKind: ShapeKind): RepairType {
    // INVARIANT shapes always get ENFORCE_INVARIANT
    if (shapeKind === 'INVARIANT') {
      return 'ENFORCE_INVARIANT';
    }

    switch (lossClass) {
      case 'L0_TOTAL_OMISSION':
      case 'L1_PARTIAL_CAPTURE':
        return 'PREVENT_OMISSION';
      case 'L6_SUMMARY_COLLAPSE':
        return 'PRESERVE_STRUCTURE';
      case 'L5_DEPENDENCY_SKIP':
        return 'PROTECT_ATTRIBUTE';
      default:
        return 'ADD_EXTRACTION_SIGNAL';
    }
  }

  /**
   * Generate human-readable repair description
   */
  private generateRepairDescription(
    repairType: RepairType,
    evidence: LossEvidence,
    shape: CriticalShapeDeclaration
  ): string {
    const handoff = `${evidence.source_agent} → ${evidence.target_agent}`;

    switch (repairType) {
      case 'PREVENT_OMISSION':
        return `Prevent omission of shape "${shape.id}" attributes at handoff ${evidence.handoff_id} (${handoff}). ` +
          `Lost attributes: [${evidence.attributes_lost.join(', ')}]. ` +
          `Ensure agent "${evidence.target_agent}" explicitly preserves these structural attributes.`;

      case 'PRESERVE_STRUCTURE':
        return `Prevent structural collapse of shape "${shape.id}" at handoff ${evidence.handoff_id} (${handoff}). ` +
          `The summarization process is collapsing required attributes. ` +
          `Mark shape attributes as non-summarizable.`;

      case 'PROTECT_ATTRIBUTE':
        return `Protect attributes of shape "${shape.id}" during handoff ${evidence.handoff_id} (${handoff}). ` +
          `Attributes [${evidence.attributes_lost.join(', ')}] are being dropped. ` +
          `Add explicit attribute preservation directive.`;

      case 'ENFORCE_INVARIANT':
        return `INVARIANT shape "${shape.id}" must survive all handoffs. ` +
          `Violation at ${evidence.handoff_id} (${handoff}). ` +
          `This shape must NEVER be summarized and must preserve ALL attributes. ` +
          `Add to summarization bypass list.`;

      case 'ADD_EXTRACTION_SIGNAL':
        return `Add extraction signals for shape "${shape.id}" at agent "${evidence.target_agent}". ` +
          `Current extraction patterns are not capturing required attributes. ` +
          `Lost: [${evidence.attributes_lost.join(', ')}].`;

      default:
        return `Repair required for shape "${shape.id}" at handoff ${evidence.handoff_id}.`;
    }
  }

  /**
   * Determine where the repair should be applied
   */
  private determineRepairLocation(evidence: LossEvidence): MinimalRepairDirective['repair_location'] {
    // The repair should be applied at the TARGET agent (where loss occurred)
    // or at the summarization layer if it's a collapse
    const agent = evidence.structural_diff.type === 'COLLAPSE'
      ? evidence.source_agent // Fix at source (summarization happens there)
      : evidence.target_agent; // Fix at target (extraction/processing)

    return {
      agent,
      suggested_path: evidence.target_path || `agents/${agent}/processor.ts`
    };
  }

  /**
   * Determine the minimal structural change needed
   */
  private determineStructuralChange(
    repairType: RepairType,
    evidence: LossEvidence,
    shape: CriticalShapeDeclaration
  ): MinimalRepairDirective['structural_change'] {
    switch (repairType) {
      case 'PREVENT_OMISSION':
        return {
          type: 'PRESERVE_ATTRIBUTE',
          attribute: evidence.attributes_lost[0] || null,
          rationale: `Add explicit handling for attribute "${evidence.attributes_lost[0]}" ` +
            `in agent "${evidence.target_agent}" to prevent omission.`
        };

      case 'PRESERVE_STRUCTURE':
        return {
          type: 'PREVENT_SUMMARIZATION',
          attribute: null,
          rationale: `Mark shape "${shape.id}" as non-summarizable in summarizeOutputForDependency. ` +
            `All ${shape.attributes.required.length} required attributes must be preserved.`
        };

      case 'PROTECT_ATTRIBUTE':
        return {
          type: 'PRESERVE_ATTRIBUTE',
          attribute: evidence.attributes_lost[0] || null,
          rationale: `Add protection for attributes [${evidence.attributes_lost.join(', ')}] ` +
            `during handoff processing.`
        };

      case 'ENFORCE_INVARIANT':
        return {
          type: 'MARK_INVARIANT',
          attribute: null,
          rationale: `Shape "${shape.id}" is INVARIANT and must bypass all summarization. ` +
            `Add to INVARIANT_SHAPE_IDS in summarization bypass list.`
        };

      case 'ADD_EXTRACTION_SIGNAL':
        return {
          type: 'ADD_EXTRACTION_PATH',
          attribute: evidence.attributes_lost[0] || null,
          rationale: `Add extraction signal patterns for attributes [${evidence.attributes_lost.join(', ')}] ` +
            `in agent "${evidence.target_agent}" extractor.`
        };

      default:
        return {
          type: 'PRESERVE_ATTRIBUTE',
          attribute: null,
          rationale: 'General structural preservation needed.'
        };
    }
  }

  /**
   * Generate unique directive ID
   */
  private generateDirectiveId(): string {
    return `MRD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
}
