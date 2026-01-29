/**
 * OLYMPUS 2.0 - Contract: POLISH → SEARCH
 *
 * POLISH applies final styling.
 * SEARCH needs this to implement search functionality.
 */

import type { AgentContract } from '../types';

export const POLISH_TO_SEARCH_CONTRACT: AgentContract = {
  upstream: 'polish',
  downstream: 'search',

  description: 'POLISH must provide styled components for SEARCH to implement search UI',

  criticality: 'medium',

  requiredFields: ['styled_components', 'search_ui'],

  fieldConstraints: {
    styled_components: {
      type: 'array',
      minCount: 5,
      reason: 'Styled components for search UI',
    },
    'styled_components[]': {
      eachMustHave: ['name', 'styles', 'variants'],
      reason: 'Each component needs name, styles, and variants',
    },
    search_ui: {
      type: 'object',
      mustContain: ['input', 'results', 'filters'],
      reason: 'Search UI components defined',
    },
  },

  expectedFormat: 'structured_json',
};
