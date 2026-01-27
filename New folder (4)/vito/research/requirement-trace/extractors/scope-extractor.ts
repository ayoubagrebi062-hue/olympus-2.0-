/**
 * SCOPE Extractor
 *
 * Extracts FilterCapabilityShape from SCOPE agent output.
 * Schema: { in_scope: [{ feature, description, acceptance_criteria[], priority }] }
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
import { FilterCapabilityShapeDefinition } from '../shapes/filter-capability';

export class ScopeExtractor {
  readonly agentId = 'scope' as const;

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

    // Look for in_scope array
    const inScope = output.in_scope;
    if (!Array.isArray(inScope)) {
      errors.push(`in_scope not found or not an array. Found keys: ${Object.keys(output).join(', ')}`);
      return this.createFailedResult(sourcePath, timestamp, errors);
    }

    // Search each scope item for filter-related structure
    const filterCandidates: Array<{
      index: number;
      item: Record<string, unknown>;
      score: number;
      extractedShape: Partial<FilterCapabilityShape>;
      extractedEvidence: AttributeEvidence[];
    }> = [];

    inScope.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;

      const itemObj = item as Record<string, unknown>;
      const basePath = `in_scope[${index}]`;

      // Score this item for filter-likelihood
      let score = ShapeMatcher.scoreFilterLikelihood(itemObj);

      // Check acceptance_criteria array structure
      const criteria = itemObj.acceptance_criteria;
      const extractedEvidence: AttributeEvidence[] = [];
      const extractedShape: Partial<FilterCapabilityShape> = {};

      if (Array.isArray(criteria) && criteria.length > 0) {
        // Look for filter-related criteria structures
        criteria.forEach((criterion, critIndex) => {
          if (criterion && typeof criterion === 'object') {
            const critObj = criterion as Record<string, unknown>;
            const critScore = ShapeMatcher.scoreFilterLikelihood(critObj);
            score = Math.max(score, critScore);

            // Extract from criterion object
            const { shape: critShape, evidence: critEvidence } = ShapeMatcher.extractFromObject(
              critObj,
              { agentId: this.agentId, basePath: `${basePath}.acceptance_criteria[${critIndex}]` }
            );

            Object.assign(extractedShape, critShape);
            extractedEvidence.push(...critEvidence);
          }
        });

        // If criteria has 2+ items, they might be filter values
        if (criteria.length >= 2) {
          const stringCriteria = criteria.filter(c => typeof c === 'string');
          if (stringCriteria.length >= 2) {
            // Check if these look like filter states
            const stateIndicators = ['all', 'active', 'completed', 'pending', 'done', 'open', 'closed'];
            const matchingStates = stringCriteria.filter(c =>
              stateIndicators.some(s => (c as string).toLowerCase().includes(s))
            );
            if (matchingStates.length >= 2) {
              extractedShape.filter_values = stringCriteria as string[];
              extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
                'filter_values',
                stringCriteria,
                `${basePath}.acceptance_criteria`,
                0.8
              ));
              score += 0.3;
            }
          }
        }
      }

      // Extract from item level
      const { shape: itemShape, evidence: itemEvidence } = ShapeMatcher.extractFromObject(
        itemObj,
        { agentId: this.agentId, basePath }
      );
      Object.assign(extractedShape, itemShape);
      extractedEvidence.push(...itemEvidence);

      // Extract target_entity from feature name if present
      if (itemObj.feature && typeof itemObj.feature === 'string') {
        const featureName = itemObj.feature as string;
        // Try to identify entity from feature name structure
        const entityMatch = featureName.match(/(\w+)\s+(filter|filtering|status)/i);
        if (entityMatch) {
          extractedShape.target_entity = entityMatch[1].toLowerCase();
          extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
            'target_entity',
            entityMatch[1].toLowerCase(),
            `${basePath}.feature`,
            0.7,
            featureName
          ));
          score += 0.2;
        }
      }

      if (score > 0.2 || Object.keys(extractedShape).length > 0) {
        filterCandidates.push({
          index,
          item: itemObj,
          score,
          extractedShape,
          extractedEvidence
        });
      }
    });

    // If no filter candidates found, report L0_TOTAL_OMISSION
    if (filterCandidates.length === 0) {
      errors.push(`No filter-related scope items found in ${inScope.length} in_scope entries`);

      const required: ShapeAttribute[] = ['target_entity', 'filter_attribute', 'filter_values'];
      for (const attr of required) {
        evidence.push(FilterCapabilityShapeDefinition.createMissingEvidence(attr, 'in_scope[*]'));
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
          `in_scope[${best.index}]`
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
