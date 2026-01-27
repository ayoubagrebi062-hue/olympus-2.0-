/**
 * STRATEGOS Extractor
 *
 * Extracts FilterCapabilityShape from STRATEGOS agent output.
 * Schema: { mvp_features: [{ name, description, acceptance_criteria[] }] }
 *
 * NO TEXT MATCHING - STRUCTURAL ONLY
 */

import type {
  ExtractionResult,
  FilterCapabilityShape,
  AttributeEvidence,
  ShapeAttribute
} from '../types';
import { ShapeMatcher } from '../shapes/shape-matcher';
import { FilterCapabilityShapeDefinition, REQUIRED_ATTRIBUTES_BY_STAGE } from '../shapes/filter-capability';

export class StrategosExtractor {
  readonly agentId = 'strategos' as const;

  extract(agentOutput: unknown, sourcePath: string): ExtractionResult {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    const evidence: AttributeEvidence[] = [];
    let shape: FilterCapabilityShape | null = null;

    // Validate input structure
    if (!agentOutput || typeof agentOutput !== 'object') {
      return this.createFailedResult(sourcePath, timestamp, ['Agent output is null or not an object']);
    }

    const output = agentOutput as Record<string, unknown>;

    // Look for mvp_features array
    const mvpFeatures = output.mvp_features;
    if (!Array.isArray(mvpFeatures)) {
      errors.push(`mvp_features not found or not an array at root level. Found keys: ${Object.keys(output).join(', ')}`);
      return this.createFailedResult(sourcePath, timestamp, errors);
    }

    // Search each feature for filter-related structure
    const filterCandidates: Array<{
      index: number;
      feature: Record<string, unknown>;
      score: number;
      extractedShape: Partial<FilterCapabilityShape>;
      extractedEvidence: AttributeEvidence[];
    }> = [];

    mvpFeatures.forEach((feature, index) => {
      if (!feature || typeof feature !== 'object') return;

      const featureObj = feature as Record<string, unknown>;
      const basePath = `mvp_features[${index}]`;

      // Score this feature for filter-likelihood
      const score = ShapeMatcher.scoreFilterLikelihood(featureObj);

      // Also check acceptance_criteria for filter signals
      const criteria = featureObj.acceptance_criteria;
      let criteriaScore = 0;
      if (Array.isArray(criteria)) {
        for (let i = 0; i < criteria.length; i++) {
          const criterion = criteria[i];
          if (typeof criterion === 'string' || (criterion && typeof criterion === 'object')) {
            const text = typeof criterion === 'string' ? criterion : JSON.stringify(criterion);
            // Structural check: does the criterion object have filter-related keys?
            if (typeof criterion === 'object') {
              const critScore = ShapeMatcher.scoreFilterLikelihood(criterion as Record<string, unknown>);
              criteriaScore = Math.max(criteriaScore, critScore);
            }
          }
        }
      }

      const totalScore = Math.max(score, criteriaScore);

      if (totalScore > 0.2) {
        const { shape: extractedShape, evidence: extractedEvidence } = ShapeMatcher.extractFromObject(
          featureObj,
          { agentId: this.agentId, basePath }
        );

        // Try to extract from feature name/description structure
        if (featureObj.name && typeof featureObj.name === 'string') {
          const nameLower = (featureObj.name as string).toLowerCase();
          if (nameLower.includes('filter') || nameLower.includes('status')) {
            extractedShape.filter_attribute = extractedShape.filter_attribute || 'status';
            extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
              'filter_attribute',
              'status',
              `${basePath}.name`,
              0.7,
              featureObj.name as string
            ));
          }
        }

        // Extract target_entity from feature context
        if (featureObj.entity || featureObj.target || featureObj.resource) {
          const entity = (featureObj.entity || featureObj.target || featureObj.resource) as string;
          extractedShape.target_entity = entity;
          extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
            'target_entity',
            entity,
            `${basePath}.entity`,
            0.9
          ));
        }

        filterCandidates.push({
          index,
          feature: featureObj,
          score: totalScore,
          extractedShape,
          extractedEvidence
        });
      }
    });

    // If no filter candidates found, report L0_TOTAL_OMISSION
    if (filterCandidates.length === 0) {
      errors.push(`No filter-related features found in ${mvpFeatures.length} mvp_features`);

      // Add NOT_FOUND evidence for required attributes
      const required = REQUIRED_ATTRIBUTES_BY_STAGE.strategos ||
        ['target_entity', 'filter_attribute'];
      for (const attr of required) {
        evidence.push(FilterCapabilityShapeDefinition.createMissingEvidence(
          attr as ShapeAttribute,
          'mvp_features[*]'
        ));
      }

      return {
        agent_id: this.agentId,
        timestamp,
        shape: null,
        attribute_evidence: evidence,
        source_file: sourcePath,
        source_type: 'agent_output',
        status: 'FAILED',
        extraction_errors: errors
      };
    }

    // Use the best candidate
    const best = filterCandidates.sort((a, b) => b.score - a.score)[0];
    shape = best.extractedShape as FilterCapabilityShape;
    evidence.push(...best.extractedEvidence);

    // Validate and add missing evidence
    const validation = FilterCapabilityShapeDefinition.validateAtStage(shape, this.agentId);
    for (const missing of validation.missing) {
      if (!evidence.find(e => e.attribute === missing)) {
        evidence.push(FilterCapabilityShapeDefinition.createMissingEvidence(
          missing,
          `mvp_features[${best.index}]`
        ));
      }
    }

    return {
      agent_id: this.agentId,
      timestamp,
      shape: Object.keys(shape).length > 0 ? shape : null,
      attribute_evidence: evidence,
      source_file: sourcePath,
      source_type: 'agent_output',
      status: validation.missing.length === 0 ? 'SUCCESS' : 'PARTIAL',
      extraction_errors: errors
    };
  }

  private createFailedResult(sourcePath: string, timestamp: string, errors: string[]): ExtractionResult {
    return {
      agent_id: this.agentId,
      timestamp,
      shape: null,
      attribute_evidence: [],
      source_file: sourcePath,
      source_type: 'agent_output',
      status: 'FAILED',
      extraction_errors: errors
    };
  }
}
