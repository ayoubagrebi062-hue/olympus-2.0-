/**
 * CARTOGRAPHER Extractor
 *
 * Extracts FilterCapabilityShape from CARTOGRAPHER agent output.
 * Schema: { pages: [{ name, sections: [{ components: [] }] }], navigation: {} }
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

export class CartographerExtractor {
  readonly agentId = 'cartographer' as const;

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

    // Look for pages array
    const pages = output.pages;
    if (!Array.isArray(pages)) {
      errors.push(`pages not found or not an array. Found keys: ${Object.keys(output).join(', ')}`);
      return this.createFailedResult(sourcePath, timestamp, errors);
    }

    // Search all pages for filter-related components
    const filterCandidates: Array<{
      path: string;
      component: Record<string, unknown>;
      score: number;
      extractedShape: Partial<FilterCapabilityShape>;
      extractedEvidence: AttributeEvidence[];
    }> = [];

    pages.forEach((page, pageIndex) => {
      if (!page || typeof page !== 'object') return;
      const pageObj = page as Record<string, unknown>;

      // Check page-level components
      this.searchComponents(
        pageObj,
        `pages[${pageIndex}]`,
        filterCandidates
      );

      // Check sections
      const sections = pageObj.sections;
      if (Array.isArray(sections)) {
        sections.forEach((section, sectionIndex) => {
          if (!section || typeof section !== 'object') return;
          this.searchComponents(
            section as Record<string, unknown>,
            `pages[${pageIndex}].sections[${sectionIndex}]`,
            filterCandidates
          );
        });
      }

      // Check wireframe if present
      const wireframe = pageObj.wireframe;
      if (wireframe && typeof wireframe === 'object') {
        this.searchComponents(
          wireframe as Record<string, unknown>,
          `pages[${pageIndex}].wireframe`,
          filterCandidates
        );
      }

      // Check layout if present
      const layout = pageObj.layout;
      if (layout && typeof layout === 'object') {
        this.searchComponents(
          layout as Record<string, unknown>,
          `pages[${pageIndex}].layout`,
          filterCandidates
        );
      }
    });

    // If no filter candidates found, report L0_TOTAL_OMISSION
    if (filterCandidates.length === 0) {
      errors.push(`No filter-related components found in ${pages.length} pages`);

      const required: ShapeAttribute[] = ['target_entity', 'filter_attribute', 'filter_values', 'ui_control'];
      for (const attr of required) {
        evidence.push(FilterCapabilityShapeDefinition.createMissingEvidence(attr, 'pages[*]'));
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
        evidence.push(FilterCapabilityShapeDefinition.createMissingEvidence(missing, best.path));
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

  private searchComponents(
    obj: Record<string, unknown>,
    basePath: string,
    candidates: Array<{
      path: string;
      component: Record<string, unknown>;
      score: number;
      extractedShape: Partial<FilterCapabilityShape>;
      extractedEvidence: AttributeEvidence[];
    }>
  ): void {
    // Check direct components array
    const components = obj.components;
    if (Array.isArray(components)) {
      components.forEach((comp, compIndex) => {
        if (!comp || typeof comp !== 'object') return;
        const compObj = comp as Record<string, unknown>;
        const compPath = `${basePath}.components[${compIndex}]`;

        const result = this.analyzeComponent(compObj, compPath);
        if (result.score > 0.3) {
          candidates.push(result);
        }
      });
    }

    // Check nested elements/items
    for (const key of ['elements', 'items', 'children', 'content']) {
      const nested = obj[key];
      if (Array.isArray(nested)) {
        nested.forEach((item, itemIndex) => {
          if (item && typeof item === 'object') {
            this.searchComponents(
              item as Record<string, unknown>,
              `${basePath}.${key}[${itemIndex}]`,
              candidates
            );
          }
        });
      }
    }
  }

  private analyzeComponent(
    comp: Record<string, unknown>,
    path: string
  ): {
    path: string;
    component: Record<string, unknown>;
    score: number;
    extractedShape: Partial<FilterCapabilityShape>;
    extractedEvidence: AttributeEvidence[];
  } {
    const extractedShape: Partial<FilterCapabilityShape> = {};
    const extractedEvidence: AttributeEvidence[] = [];
    let score = 0;

    // Check component type
    const compType = comp.type || comp.component || comp.name;
    if (typeof compType === 'string') {
      const typeLower = compType.toLowerCase();
      const filterTypes = ['filter', 'tabs', 'status-filter', 'filter-bar', 'tab-bar', 'segmented-control'];

      if (filterTypes.some(ft => typeLower.includes(ft))) {
        score += 0.5;

        // Map to ui_control
        if (typeLower.includes('tab')) {
          extractedShape.ui_control = 'tabs';
        } else if (typeLower.includes('dropdown') || typeLower.includes('select')) {
          extractedShape.ui_control = 'dropdown';
        } else if (typeLower.includes('button')) {
          extractedShape.ui_control = 'buttons';
        } else {
          extractedShape.ui_control = typeLower as FilterCapabilityShape['ui_control'];
        }

        extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'ui_control',
          extractedShape.ui_control,
          `${path}.type`,
          0.9,
          compType
        ));
      }
    }

    // Check for options/values array
    const optionsKeys = ['options', 'values', 'items', 'tabs', 'segments'];
    for (const key of optionsKeys) {
      const options = comp[key];
      if (Array.isArray(options) && options.length >= 2) {
        // Extract string values
        const values = options.map(opt => {
          if (typeof opt === 'string') return opt;
          if (opt && typeof opt === 'object') {
            return (opt as Record<string, unknown>).value ||
              (opt as Record<string, unknown>).label ||
              (opt as Record<string, unknown>).name;
          }
          return null;
        }).filter(Boolean) as string[];

        if (values.length >= 2) {
          extractedShape.filter_values = values;
          extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
            'filter_values',
            values,
            `${path}.${key}`,
            0.9
          ));
          score += 0.3;
        }
      }
    }

    // Check for default value
    const defaultKeys = ['default', 'defaultValue', 'selected', 'active', 'initial'];
    for (const key of defaultKeys) {
      if (comp[key] !== undefined) {
        extractedShape.default_value = String(comp[key]);
        extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'default_value',
          comp[key],
          `${path}.${key}`,
          0.8
        ));
        break;
      }
    }

    // Check for filter attribute
    const attrKeys = ['filterBy', 'attribute', 'field', 'property'];
    for (const key of attrKeys) {
      if (comp[key] && typeof comp[key] === 'string') {
        extractedShape.filter_attribute = comp[key] as string;
        extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'filter_attribute',
          comp[key],
          `${path}.${key}`,
          0.9
        ));
        score += 0.2;
        break;
      }
    }

    // General score boost
    score += ShapeMatcher.scoreFilterLikelihood(comp) * 0.3;

    return {
      path,
      component: comp,
      score,
      extractedShape,
      extractedEvidence
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
