/**
 * PaginationCapability Shape Declaration
 *
 * CRITICALITY: INTERACTIVE
 * KIND: CAPABILITY
 *
 * STATEFUL shape requiring page state and navigation handlers.
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

export const PAGINATION_CAPABILITY: ShapeDeclaration & { criticality: ShapeCriticality; kind: ShapeKind } = {
  id: 'PAGINATION_CAPABILITY',
  name: 'Pagination Capability',
  category: 'STATEFUL',
  kind: KIND,
  criticality: CRITICALITY,

  attributes: {
    required: [
      'target_entity',
      'page_size',
      'page_state_hook',
      'navigation_handler',
      'total_indicator'
    ],
    optional: [
      'infinite_scroll',
      'cursor_based',
      'load_more_button',
      'page_info_display'
    ]
  },

  survival: {
    must_reach_stage: 'wire',
    forbidden_loss_classes: [
      'L0_TOTAL_OMISSION',
      'L1_PARTIAL_CAPTURE',
      'L6_SUMMARY_COLLAPSE'
    ]
  },

  extraction: {
    root_paths: {
      strategos: ['mvp_features[*]', 'mvp_features[*].acceptance_criteria[*]'],
      scope: ['in_scope[*]', 'in_scope[*].acceptance_criteria[*]'],
      cartographer: ['pages[*].sections[*].components[*]'],
      blocks: ['components[*]', 'components[*].props'],
      wire: ['files[*].content'],
      pixel: ['files[*].content', 'components[*]']
    },
    structural_signals: {
      feature_keywords: ['pagination', 'paginate', 'page', 'paging', 'loadMore'],
      component_types: ['pagination', 'paginator', 'page-nav', 'load-more'],
      state_patterns: ['useState', 'usePagination', 'pageState', 'currentPage', 'pageSize'],
      handler_patterns: ['onPageChange', 'handlePage', 'setPage', 'goToPage', 'nextPage', 'prevPage']
    }
  }
};
