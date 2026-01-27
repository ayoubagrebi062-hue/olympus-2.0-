/**
 * BLOCKS Extractor
 *
 * Extracts FilterCapabilityShape from BLOCKS agent output.
 * Schema: { components: [{ name, variants: [], props: {} }], design_tokens: {} }
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

export class BlocksExtractor {
  readonly agentId = 'blocks' as const;

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

    // Look for components array
    const components = output.components;
    if (!Array.isArray(components)) {
      errors.push(`components not found or not an array. Found keys: ${Object.keys(output).join(', ')}`);
      return this.createFailedResult(sourcePath, timestamp, errors);
    }

    // Search each component for filter-related structure
    const filterCandidates: Array<{
      index: number;
      component: Record<string, unknown>;
      score: number;
      extractedShape: Partial<FilterCapabilityShape>;
      extractedEvidence: AttributeEvidence[];
    }> = [];

    components.forEach((component, index) => {
      if (!component || typeof component !== 'object') return;

      const compObj = component as Record<string, unknown>;
      const basePath = `components[${index}]`;

      const result = this.analyzeComponent(compObj, basePath);
      if (result.score > 0.3) {
        filterCandidates.push({
          index,
          component: compObj,
          ...result
        });
      }
    });

    // If no filter candidates found, report L0_TOTAL_OMISSION
    if (filterCandidates.length === 0) {
      errors.push(`No filter-related components found in ${components.length} components`);

      const required: ShapeAttribute[] = ['filter_attribute', 'filter_values', 'ui_control', 'default_value'];
      for (const attr of required) {
        evidence.push(FilterCapabilityShapeDefinition.createMissingEvidence(attr, 'components[*]'));
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
          `components[${best.index}]`
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

  private analyzeComponent(
    comp: Record<string, unknown>,
    basePath: string
  ): {
    score: number;
    extractedShape: Partial<FilterCapabilityShape>;
    extractedEvidence: AttributeEvidence[];
  } {
    const extractedShape: Partial<FilterCapabilityShape> = {};
    const extractedEvidence: AttributeEvidence[] = [];
    let score = 0;

    // Check component name/type
    const compName = (comp.name || comp.type || comp.component) as string | undefined;
    if (compName && typeof compName === 'string') {
      const nameLower = compName.toLowerCase();
      const filterNames = ['filter', 'tabs', 'status', 'segmented', 'toggle-group', 'radio-group'];

      if (filterNames.some(fn => nameLower.includes(fn))) {
        score += 0.4;

        // Infer ui_control from name
        if (nameLower.includes('tab')) {
          extractedShape.ui_control = 'tabs';
        } else if (nameLower.includes('dropdown') || nameLower.includes('select')) {
          extractedShape.ui_control = 'dropdown';
        } else if (nameLower.includes('button') || nameLower.includes('toggle')) {
          extractedShape.ui_control = 'buttons';
        } else if (nameLower.includes('chip')) {
          extractedShape.ui_control = 'chips';
        }

        if (extractedShape.ui_control) {
          extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
            'ui_control',
            extractedShape.ui_control,
            `${basePath}.name`,
            0.8,
            compName
          ));
        }
      }
    }

    // Check variants array (critical for BLOCKS)
    const variants = comp.variants;
    if (Array.isArray(variants) && variants.length >= 2) {
      const variantValues = variants.map(v => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object') {
          const vObj = v as Record<string, unknown>;
          return vObj.name || vObj.value || vObj.label || vObj.id;
        }
        return null;
      }).filter(Boolean) as string[];

      if (variantValues.length >= 2) {
        extractedShape.filter_values = variantValues;
        extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'filter_values',
          variantValues,
          `${basePath}.variants`,
          0.9
        ));
        score += 0.3;

        // Check for default variant
        const defaultVariant = variants.find(v => {
          if (v && typeof v === 'object') {
            const vObj = v as Record<string, unknown>;
            return vObj.default === true || vObj.isDefault === true || vObj.initial === true;
          }
          return false;
        });

        if (defaultVariant && typeof defaultVariant === 'object') {
          const defObj = defaultVariant as Record<string, unknown>;
          const defaultValue = defObj.name || defObj.value || defObj.label;
          if (defaultValue) {
            extractedShape.default_value = String(defaultValue);
            extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
              'default_value',
              defaultValue,
              `${basePath}.variants[?].default`,
              0.9
            ));
          }
        }
      }
    }

    // Check states array (alternative to variants)
    const states = comp.states;
    if (Array.isArray(states) && states.length >= 2 && !extractedShape.filter_values) {
      const stateValues = states.map(s => {
        if (typeof s === 'string') return s;
        if (s && typeof s === 'object') {
          const sObj = s as Record<string, unknown>;
          return sObj.name || sObj.value || sObj.state;
        }
        return null;
      }).filter(Boolean) as string[];

      if (stateValues.length >= 2) {
        extractedShape.filter_values = stateValues;
        extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'filter_values',
          stateValues,
          `${basePath}.states`,
          0.85
        ));
        score += 0.25;
      }
    }

    // Check props for filter-related properties
    const props = comp.props || comp.properties;
    if (props && typeof props === 'object') {
      const propsObj = props as Record<string, unknown>;

      // Look for value/onChange pattern
      if (propsObj.value !== undefined || propsObj.selected !== undefined) {
        score += 0.1;
      }
      if (propsObj.onChange || propsObj.onSelect || propsObj.onValueChange) {
        score += 0.1;
      }

      // Look for options/items
      const optionsKeys = ['options', 'items', 'choices'];
      for (const key of optionsKeys) {
        if (Array.isArray(propsObj[key]) && (propsObj[key] as unknown[]).length >= 2) {
          if (!extractedShape.filter_values) {
            extractedShape.filter_values = propsObj[key] as string[];
            extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
              'filter_values',
              propsObj[key],
              `${basePath}.props.${key}`,
              0.8
            ));
            score += 0.2;
          }
          break;
        }
      }

      // Look for default value in props
      const defaultKeys = ['defaultValue', 'default', 'initialValue'];
      for (const key of defaultKeys) {
        if (propsObj[key] !== undefined && !extractedShape.default_value) {
          extractedShape.default_value = String(propsObj[key]);
          extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
            'default_value',
            propsObj[key],
            `${basePath}.props.${key}`,
            0.9
          ));
          break;
        }
      }
    }

    // General filter likelihood
    score += ShapeMatcher.scoreFilterLikelihood(comp) * 0.2;

    return { score, extractedShape, extractedEvidence };
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
