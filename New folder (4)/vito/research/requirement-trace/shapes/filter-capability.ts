/**
 * Filter Capability Shape Definition
 *
 * Defines the structural shape and validation rules for filter capabilities.
 * NO TEXT MATCHING - STRUCTURAL ONLY
 */

import type {
  FilterCapabilityShape,
  ShapeAttribute,
  TracedAgentId,
  AttributeEvidence
} from '../types';

/**
 * Required attributes at each pipeline stage.
 * If an attribute is required but missing, it indicates potential loss.
 */
export const REQUIRED_ATTRIBUTES_BY_STAGE: Record<TracedAgentId, ShapeAttribute[]> = {
  strategos: ['target_entity', 'filter_attribute'],
  scope: ['target_entity', 'filter_attribute', 'filter_values'],
  cartographer: ['target_entity', 'filter_attribute', 'filter_values', 'ui_control'],
  blocks: ['filter_attribute', 'filter_values', 'ui_control', 'default_value'],
  wire: ['filter_attribute', 'filter_values', 'state_location', 'ui_control', 'state_hook'],
  pixel: ['filter_attribute', 'filter_values', 'ui_control', 'event_handler']
};

/**
 * Known filter-related structural indicators by agent schema.
 * These are JSON structure patterns, NOT text patterns.
 */
export const FilterCapabilityShapeDefinition = {
  name: 'FilterCapabilityShape',

  /**
   * Structural indicators in STRATEGOS output (mvp_features[])
   */
  strategos_indicators: {
    // Feature object with filter-related structure
    feature_structure: {
      must_have: ['name', 'description'],
      should_have: ['acceptance_criteria'],
      filter_signals: {
        // Acceptance criteria that mention filtering behavior
        acceptance_criteria_patterns: [
          // Structure: { text: string } where text describes filtering
          'filter',
          'status',
          'show only',
          'display based on'
        ]
      }
    }
  },

  /**
   * Structural indicators in SCOPE output (in_scope[])
   */
  scope_indicators: {
    in_scope_structure: {
      must_have: ['feature', 'acceptance_criteria'],
      filter_signals: {
        // Acceptance criteria array with filter-describing items
        criteria_count_min: 1
      }
    }
  },

  /**
   * Structural indicators in CARTOGRAPHER output (pages[].sections[].components[])
   */
  cartographer_indicators: {
    component_structure: {
      filter_types: ['filter', 'filter-bar', 'tabs', 'status-filter', 'dropdown'],
      must_have: ['type'],
      should_have: ['options', 'values', 'items']
    }
  },

  /**
   * Structural indicators in BLOCKS output (components[])
   */
  blocks_indicators: {
    component_structure: {
      must_have: ['name', 'variants'],
      filter_signals: {
        // Variants array should have multiple states
        variants_min: 2,
        // Props should include filter-related props
        props_signals: ['value', 'onChange', 'options', 'selected']
      }
    }
  },

  /**
   * Structural indicators in WIRE/PIXEL output (files[])
   */
  code_indicators: {
    // AST-level signals (simplified for JSON extraction)
    state_patterns: [
      'useState',
      'useFilter',
      'useQuery',
      'filter',
      'setFilter',
      'activeFilter',
      'filterValue'
    ],
    handler_patterns: [
      'onClick',
      'onChange',
      'onFilterChange',
      'handleFilter',
      'setStatus'
    ],
    ui_patterns: [
      'Tabs',
      'TabsList',
      'TabsTrigger',
      'Select',
      'Filter',
      'StatusFilter'
    ]
  },

  /**
   * Validate shape presence at a specific stage
   */
  validateAtStage(
    shape: FilterCapabilityShape | null,
    stage: TracedAgentId
  ): { valid: boolean; missing: ShapeAttribute[]; present: ShapeAttribute[] } {
    const required = REQUIRED_ATTRIBUTES_BY_STAGE[stage];
    const present: ShapeAttribute[] = [];
    const missing: ShapeAttribute[] = [];

    if (!shape) {
      return { valid: false, missing: required, present: [] };
    }

    for (const attr of required) {
      const value = shape[attr];
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length === 0) {
          missing.push(attr);
        } else {
          present.push(attr);
        }
      } else {
        missing.push(attr);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      present
    };
  },

  /**
   * Create empty evidence for a missing attribute
   */
  createMissingEvidence(attribute: ShapeAttribute, searchedPath: string): AttributeEvidence {
    return {
      attribute,
      found: false,
      value: undefined,
      json_path: 'NOT_FOUND',
      raw_text: undefined,
      confidence: 0
    };
  },

  /**
   * Create evidence for a found attribute
   */
  createFoundEvidence(
    attribute: ShapeAttribute,
    value: unknown,
    jsonPath: string,
    confidence: number,
    rawText?: string
  ): AttributeEvidence {
    return {
      attribute,
      found: true,
      value,
      json_path: jsonPath,
      raw_text: rawText,
      confidence
    };
  }
};
