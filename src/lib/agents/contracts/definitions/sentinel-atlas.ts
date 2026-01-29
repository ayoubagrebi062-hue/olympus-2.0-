/**
 * OLYMPUS 2.0 - Contract: SENTINEL → ATLAS
 *
 * SENTINEL defines security rules.
 * ATLAS needs this to generate documentation.
 */

import type { AgentContract } from '../types';

export const SENTINEL_TO_ATLAS_CONTRACT: AgentContract = {
  upstream: 'sentinel',
  downstream: 'atlas',

  description: 'SENTINEL must provide security rules for ATLAS to generate documentation',

  criticality: 'medium',

  requiredFields: ['security_rules', 'auth_flows'],

  fieldConstraints: {
    security_rules: {
      type: 'array',
      minCount: 5,
      reason: 'At least 5 security rules documented',
    },
    'security_rules[]': {
      eachMustHave: ['name', 'description', 'enforcement'],
      reason: 'Each rule needs name, description, and enforcement',
    },
    auth_flows: {
      type: 'array',
      minCount: 2,
      reason: 'Authentication flows for documentation',
    },
  },

  expectedFormat: 'structured_json',
};
