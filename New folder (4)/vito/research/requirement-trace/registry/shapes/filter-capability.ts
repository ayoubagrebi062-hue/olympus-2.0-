/**
 * FilterCapability Shape Declaration
 *
 * CRITICALITY: INTERACTIVE
 * KIND: CAPABILITY
 *
 * STATEFUL shape requiring state hooks and event handlers.
 * Must survive to WIRE stage.
 *
 * CAPABILITY shapes are subject to RSR laws per criticality tier.
 *
 * RSR Law: >= 0.95, only L3 tolerated
 */

import type { ShapeDeclaration } from '../types';
import type { ShapeCriticality, ShapeKind } from '../../runtime/types';

// Kind and Criticality are CODE-DEFINED, not configurable
const KIND: ShapeKind = 'CAPABILITY';
const CRITICALITY: ShapeCriticality = 'INTERACTIVE';

export const FILTER_CAPABILITY: ShapeDeclaration & { criticality: ShapeCriticality; kind: ShapeKind } = {
  id: 'FILTER_CAPABILITY',
  name: 'Filter Capability',
  category: 'STATEFUL',
  kind: KIND,
  criticality: CRITICALITY,

  attributes: {
    required: [
      'target_entity',
      'filter_attribute',
      'filter_values',
      'ui_control',
      'state_hook',
      'event_handler'
    ],
    optional: [
      'filter_type',
      'default_value',
      'triggers_refetch',
      'client_side_only',
      'state_location'
    ]
  },

  survival: {
    must_reach_stage: 'wire',
    forbidden_loss_classes: [
      'L0_TOTAL_OMISSION',
      'L1_PARTIAL_CAPTURE',
      'L5_DEPENDENCY_SKIP',
      'L6_SUMMARY_COLLAPSE'
    ]
  },

  extraction: {
    root_paths: {
      strategos: ['mvp_features[*]', 'mvp_features[*].acceptance_criteria[*]'],
      scope: ['in_scope[*]', 'in_scope[*].acceptance_criteria[*]'],
      cartographer: ['pages[*].sections[*].components[*]'],
      blocks: ['components[*]', 'components[*].variants'],
      wire: ['files[*].content'],
      pixel: ['files[*].content', 'components[*]']
    },
    structural_signals: {
      feature_keywords: ['filter', 'status', 'filterBy', 'filterValue'],
      component_types: ['filter', 'filter-bar', 'tabs', 'status-filter', 'dropdown', 'select'],
      state_patterns: ['useState', 'useFilter', 'filterState', 'activeFilter'],
      handler_patterns: ['onFilterChange', 'handleFilter', 'setFilter', 'onChange']
    }
  }
};
