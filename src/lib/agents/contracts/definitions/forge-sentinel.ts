/**
 * OLYMPUS 2.0 - Contract: FORGE → SENTINEL
 *
 * FORGE generates API implementation.
 * SENTINEL needs this to create security rules.
 */

import type { AgentContract } from '../types';

export const FORGE_TO_SENTINEL_CONTRACT: AgentContract = {
  upstream: 'forge',
  downstream: 'sentinel',

  description: 'FORGE must provide API implementation for SENTINEL to create security rules',

  criticality: 'critical',

  requiredFields: ['api_routes', 'authentication'],

  fieldConstraints: {
    api_routes: {
      type: 'array',
      minCount: 5,
      reason: 'API routes needed for security analysis',
    },
    'api_routes[]': {
      eachMustHave: ['path', 'method', 'handler'],
      reason: 'Each route needs path, method, and handler',
    },
    authentication: {
      type: 'object',
      mustContain: ['strategy', 'providers'],
      reason: 'Authentication strategy must be defined',
    },
  },

  expectedFormat: 'structured_json',
};
