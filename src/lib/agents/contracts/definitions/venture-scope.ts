/**
 * OLYMPUS 2.0 - Contract: VENTURE → SCOPE
 *
 * VENTURE defines business model and monetization.
 * SCOPE needs this to define project boundaries.
 */

import type { AgentContract } from '../types';

export const VENTURE_TO_SCOPE_CONTRACT: AgentContract = {
  upstream: 'venture',
  downstream: 'scope',

  description: 'VENTURE must provide business model for SCOPE to define project boundaries',

  criticality: 'high',

  requiredFields: ['business_model', 'revenue_streams'],

  fieldConstraints: {
    business_model: {
      type: 'object',
      mustContain: ['type', 'description'],
      reason: 'Business model type must be defined',
    },
    revenue_streams: {
      type: 'array',
      minCount: 1,
      reason: 'At least one revenue stream needed',
    },
    'revenue_streams[]': {
      eachMustHave: ['name', 'pricing'],
      reason: 'Each revenue stream needs pricing info',
    },
  },

  expectedFormat: 'structured_json',
};
