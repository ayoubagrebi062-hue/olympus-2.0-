/**
 * Handoff Analyzer
 *
 * Analyzes complete handoffs between agents, combining:
 * - Source output extraction
 * - Target input extraction (context + dependency summaries)
 * - Attribute-level diffs
 * - Loss classification
 */

import type {
  Handoff,
  HandoffId,
  TracedAgentId,
  ExtractionResult,
  LossClassification
} from '../types';
import { AttributeDiffer } from './attribute-differ';
import { LossClassifier } from './loss-classifier';

export class HandoffAnalyzer {
  private differ = new AttributeDiffer();
  private classifier = new LossClassifier();

  /**
   * Analyze a single handoff between two agents
   */
  analyzeHandoff(
    handoffId: HandoffId,
    sourceAgent: TracedAgentId,
    targetAgent: TracedAgentId,
    sourceExtraction: ExtractionResult,
    targetExtraction: ExtractionResult,
    contextExtraction: ExtractionResult | null,
    dependencyExtraction: ExtractionResult | null
  ): Handoff {
    // Compute attribute-level diffs
    const diffs = this.differ.diff(
      sourceExtraction.shape,
      targetExtraction.shape,
      sourceExtraction.attribute_evidence,
      targetExtraction.attribute_evidence
    );

    // Summarize diff results
    const summary = this.differ.summarize(diffs);

    // Classify the loss
    const loss = this.classifier.classify({
      sourceExtraction,
      targetExtraction,
      contextExtraction,
      dependencyExtraction,
      diffs
    });

    return {
      id: handoffId,
      source_agent: sourceAgent,
      target_agent: targetAgent,
      source_output: {
        extraction: sourceExtraction,
        raw_output_path: sourceExtraction.source_file
      },
      target_input: {
        context_extraction: contextExtraction,
        dependency_extraction: dependencyExtraction,
        raw_context_path: contextExtraction?.source_file || 'NOT_AVAILABLE'
      },
      attribute_diffs: diffs,
      attributes_preserved: summary.preserved,
      attributes_lost: summary.missing,
      attributes_degraded: summary.degraded + summary.transformed,
      loss
    };
  }

  /**
   * Find the first handoff where loss is detected
   */
  findFirstLoss(handoffs: Handoff[]): Handoff | null {
    for (const handoff of handoffs) {
      if (handoff.loss !== null) {
        return handoff;
      }
    }
    return null;
  }

  /**
   * Find all handoffs with losses
   */
  findAllLosses(handoffs: Handoff[]): Handoff[] {
    return handoffs.filter(h => h.loss !== null);
  }

  /**
   * Get the most severe loss across all handoffs
   */
  getMostSevereLoss(handoffs: Handoff[]): Handoff | null {
    const withLoss = this.findAllLosses(handoffs);
    if (withLoss.length === 0) return null;

    // Sort by severity (CRITICAL > HIGH > MEDIUM > LOW)
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    withLoss.sort((a, b) => {
      const aIdx = severityOrder.indexOf(a.loss!.severity);
      const bIdx = severityOrder.indexOf(b.loss!.severity);
      return aIdx - bIdx;
    });

    return withLoss[0];
  }

  /**
   * Generate summary statistics for all handoffs
   */
  generateStatistics(handoffs: Handoff[]): {
    totalHandoffs: number;
    handoffsWithLoss: number;
    totalAttributesLost: number;
    totalAttributesDegraded: number;
    lossClassDistribution: Record<string, number>;
  } {
    const stats = {
      totalHandoffs: handoffs.length,
      handoffsWithLoss: 0,
      totalAttributesLost: 0,
      totalAttributesDegraded: 0,
      lossClassDistribution: {} as Record<string, number>
    };

    for (const handoff of handoffs) {
      stats.totalAttributesLost += handoff.attributes_lost;
      stats.totalAttributesDegraded += handoff.attributes_degraded;

      if (handoff.loss) {
        stats.handoffsWithLoss++;
        const lc = handoff.loss.loss_class;
        stats.lossClassDistribution[lc] = (stats.lossClassDistribution[lc] || 0) + 1;
      }
    }

    return stats;
  }
}
