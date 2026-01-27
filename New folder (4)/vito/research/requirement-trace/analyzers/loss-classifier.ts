/**
 * Loss Classifier
 *
 * Classifies losses into L0-L7 taxonomy based on diff patterns and evidence.
 * Returns the earliest and most severe applicable loss class.
 */

import type {
  LossClass,
  LossClassification,
  LossEvidence,
  LossSeverity,
  AttributeDiff,
  ExtractionResult,
  TracedAgentId
} from '../types';
import { LOSS_PRIORITY, LOSS_SEVERITY } from '../types';

interface ClassificationContext {
  sourceExtraction: ExtractionResult;
  targetExtraction: ExtractionResult;
  contextExtraction: ExtractionResult | null;
  dependencyExtraction: ExtractionResult | null;
  diffs: AttributeDiff[];
}

export class LossClassifier {
  /**
   * Classify the loss based on extraction results and diffs.
   * Returns the earliest (in priority order) and most severe loss class.
   */
  classify(context: ClassificationContext): LossClassification | null {
    // Check each loss class in priority order (most severe first)
    for (const lossClass of LOSS_PRIORITY) {
      const classification = this.checkLossClass(lossClass, context);
      if (classification) {
        return classification;
      }
    }

    return null; // No loss detected
  }

  private checkLossClass(
    lossClass: LossClass,
    context: ClassificationContext
  ): LossClassification | null {
    switch (lossClass) {
      case 'L0_TOTAL_OMISSION':
        return this.checkL0(context);
      case 'L1_PARTIAL_CAPTURE':
        return this.checkL1(context);
      case 'L2_SEMANTIC_DRIFT':
        return this.checkL2(context);
      case 'L3_SPECIFICITY_LOSS':
        return this.checkL3(context);
      case 'L4_CONTEXT_TRUNCATION':
        return this.checkL4(context);
      case 'L5_DEPENDENCY_SKIP':
        return this.checkL5(context);
      case 'L6_SUMMARY_COLLAPSE':
        return this.checkL6(context);
      case 'L7_SCHEMA_MISMATCH':
        return this.checkL7(context);
      default:
        return null;
    }
  }

  /**
   * L0: Total Omission
   * Shape completely absent from target when present in source
   */
  private checkL0(context: ClassificationContext): LossClassification | null {
    const { sourceExtraction, targetExtraction } = context;

    // Source has shape, target doesn't
    if (sourceExtraction.shape && !targetExtraction.shape) {
      return {
        loss_class: 'L0_TOTAL_OMISSION',
        severity: LOSS_SEVERITY['L0_TOTAL_OMISSION'],
        triggering_condition: 'shape.present_in_source && !shape.present_in_target',
        evidence: {
          source_path: sourceExtraction.source_file,
          target_path: targetExtraction.source_file,
          source_value: sourceExtraction.shape,
          target_value: null,
          explanation: `Filter capability shape found in ${sourceExtraction.agent_id} output but completely absent in ${targetExtraction.agent_id} output. Extraction status: source=${sourceExtraction.status}, target=${targetExtraction.status}`
        }
      };
    }

    return null;
  }

  /**
   * L1: Partial Capture
   * Shape exists but missing required attributes
   */
  private checkL1(context: ClassificationContext): LossClassification | null {
    const { sourceExtraction, targetExtraction, diffs } = context;

    if (!targetExtraction.shape) return null;

    // Count MISSING attributes that were present in source
    const missingDiffs = diffs.filter(d =>
      d.status === 'MISSING' &&
      d.source_value !== undefined
    );

    if (missingDiffs.length > 0) {
      const missingAttrs = missingDiffs.map(d => d.attribute);
      return {
        loss_class: 'L1_PARTIAL_CAPTURE',
        severity: LOSS_SEVERITY['L1_PARTIAL_CAPTURE'],
        triggering_condition: `shape.present && missingRequired.length > 0 (${missingDiffs.length} missing)`,
        evidence: {
          source_path: missingDiffs[0].source_path,
          target_path: 'NOT_FOUND',
          source_value: missingDiffs.map(d => ({ [d.attribute]: d.source_value })),
          target_value: null,
          explanation: `Shape exists but missing ${missingDiffs.length} attributes: ${missingAttrs.join(', ')}. ` +
            `These were present in ${sourceExtraction.agent_id} but lost in ${targetExtraction.agent_id}.`
        }
      };
    }

    return null;
  }

  /**
   * L2: Semantic Drift
   * Attribute values transformed to non-equivalent meaning
   */
  private checkL2(context: ClassificationContext): LossClassification | null {
    const { diffs } = context;

    // Find attributes with low similarity but still present
    const driftedDiffs = diffs.filter(d =>
      d.status === 'TRANSFORMED' &&
      d.similarity_score < 0.5 &&
      d.source_value !== undefined &&
      d.target_value !== undefined
    );

    if (driftedDiffs.length > 0) {
      const worstDrift = driftedDiffs.sort((a, b) => a.similarity_score - b.similarity_score)[0];
      return {
        loss_class: 'L2_SEMANTIC_DRIFT',
        severity: LOSS_SEVERITY['L2_SEMANTIC_DRIFT'],
        triggering_condition: `attribute.similarity < 0.5 (${worstDrift.similarity_score.toFixed(2)})`,
        evidence: {
          source_path: worstDrift.source_path,
          target_path: worstDrift.target_path,
          source_value: worstDrift.source_value,
          target_value: worstDrift.target_value,
          explanation: `Attribute '${worstDrift.attribute}' drifted semantically: ` +
            `'${JSON.stringify(worstDrift.source_value)}' → '${JSON.stringify(worstDrift.target_value)}' ` +
            `(similarity: ${worstDrift.similarity_score.toFixed(2)})`
        }
      };
    }

    return null;
  }

  /**
   * L3: Specificity Loss
   * Attribute values became vague/generic
   */
  private checkL3(context: ClassificationContext): LossClassification | null {
    const { diffs } = context;

    const degradedDiffs = diffs.filter(d => d.status === 'DEGRADED');

    if (degradedDiffs.length > 0) {
      const worstDegraded = degradedDiffs[0];
      return {
        loss_class: 'L3_SPECIFICITY_LOSS',
        severity: LOSS_SEVERITY['L3_SPECIFICITY_LOSS'],
        triggering_condition: 'attribute.specificity < previous.specificity',
        evidence: {
          source_path: worstDegraded.source_path,
          target_path: worstDegraded.target_path,
          source_value: worstDegraded.source_value,
          target_value: worstDegraded.target_value,
          explanation: `Attribute '${worstDegraded.attribute}' lost specificity: ` +
            `${worstDegraded.notes}`
        }
      };
    }

    return null;
  }

  /**
   * L4: Context Truncation
   * Shape present in agent output but truncated in context handoff
   */
  private checkL4(context: ClassificationContext): LossClassification | null {
    const { sourceExtraction, contextExtraction } = context;

    // Source has shape but context doesn't
    if (sourceExtraction.shape && contextExtraction && !contextExtraction.shape) {
      // Check if context had truncation
      const wasTruncated = contextExtraction.extraction_errors.some(e =>
        e.toLowerCase().includes('truncat')
      );

      return {
        loss_class: 'L4_CONTEXT_TRUNCATION',
        severity: LOSS_SEVERITY['L4_CONTEXT_TRUNCATION'],
        triggering_condition: 'agentOutput.hasShape && contextSummary.lacksShape',
        evidence: {
          source_path: sourceExtraction.source_file,
          target_path: contextExtraction.source_file,
          source_value: sourceExtraction.shape,
          target_value: null,
          explanation: `Shape present in ${sourceExtraction.agent_id} output but ` +
            `absent in context summary passed to next agent. ` +
            (wasTruncated ? 'Context was explicitly truncated.' : 'Shape may have been outside truncation window.')
        }
      };
    }

    return null;
  }

  /**
   * L5: Dependency Skip
   * Source agent not in target agent's dependency chain
   */
  private checkL5(context: ClassificationContext): LossClassification | null {
    const { sourceExtraction, dependencyExtraction } = context;

    // If dependency extraction is null, the source wasn't in the dependency chain
    if (sourceExtraction.shape && dependencyExtraction === null) {
      return {
        loss_class: 'L5_DEPENDENCY_SKIP',
        severity: LOSS_SEVERITY['L5_DEPENDENCY_SKIP'],
        triggering_condition: 'sourceAgent.hasShape && targetAgent.dependencies.excludes(sourceAgent)',
        evidence: {
          source_path: sourceExtraction.source_file,
          target_path: 'NOT_IN_DEPENDENCY_CHAIN',
          source_value: sourceExtraction.shape,
          target_value: null,
          explanation: `${sourceExtraction.agent_id} has filter capability but is not ` +
            `in the dependency chain of the target agent. Shape cannot propagate.`
        }
      };
    }

    return null;
  }

  /**
   * L6: Summary Collapse
   * Shape collapsed to non-recoverable summary in summarizeOutputForDependency
   */
  private checkL6(context: ClassificationContext): LossClassification | null {
    const { sourceExtraction, dependencyExtraction } = context;

    // Source has shape but dependency summary doesn't
    if (sourceExtraction.shape && dependencyExtraction && !dependencyExtraction.shape) {
      // Check if this is specifically from dependency summary (not context)
      if (dependencyExtraction.source_type === 'dependency_summary') {
        return {
          loss_class: 'L6_SUMMARY_COLLAPSE',
          severity: LOSS_SEVERITY['L6_SUMMARY_COLLAPSE'],
          triggering_condition: 'summarizeOutputForDependency().lacks(shapeAttributes)',
          evidence: {
            source_path: sourceExtraction.source_file,
            target_path: dependencyExtraction.source_file,
            source_value: sourceExtraction.shape,
            target_value: null,
            explanation: `Shape in ${sourceExtraction.agent_id} was collapsed by summarizeOutputForDependency(). ` +
              `Only first 3 decisions and file count are preserved. Filter capability details lost.`
          }
        };
      }
    }

    return null;
  }

  /**
   * L7: Schema Mismatch
   * Shape exists but in wrong schema location
   */
  private checkL7(context: ClassificationContext): LossClassification | null {
    const { sourceExtraction, targetExtraction, diffs } = context;

    // Both have shapes but paths don't align
    if (sourceExtraction.shape && targetExtraction.shape) {
      // Check if any attribute exists in both but at incompatible paths
      const incompatibleDiffs = diffs.filter(d =>
        d.status === 'INCOMPATIBLE'
      );

      if (incompatibleDiffs.length > 0) {
        const worst = incompatibleDiffs[0];
        return {
          loss_class: 'L7_SCHEMA_MISMATCH',
          severity: LOSS_SEVERITY['L7_SCHEMA_MISMATCH'],
          triggering_condition: 'shape.path !== expectedPath',
          evidence: {
            source_path: worst.source_path,
            target_path: worst.target_path,
            source_value: worst.source_value,
            target_value: worst.target_value,
            explanation: `Attribute '${worst.attribute}' has type mismatch: ` +
              `expected at '${worst.source_path}' but found incompatible type at '${worst.target_path}'`
          }
        };
      }
    }

    return null;
  }
}
