/**
 * OLYMPUS 2.0 - Contract: NEXUS → FORGE
 *
 * NEXUS defines API contracts and endpoints.
 * FORGE needs this to generate API implementation.
 */

import type { AgentContract } from '../types';

export const NEXUS_TO_FORGE_CONTRACT: AgentContract = {
  upstream: 'nexus',
  downstream: 'forge',

  description: 'NEXUS must provide API contracts for FORGE to generate implementation',

  criticality: 'critical',

  requiredFields: ['endpoints', 'schemas'],

  fieldConstraints: {
    endpoints: {
      type: 'array',
      minCount: 5,
      reason: 'At least 5 API endpoints needed',
    },
    'endpoints[]': {
      eachMustHave: ['method', 'path', 'request', 'response'],
      reason: 'Each endpoint needs method, path, request, response',
    },
    schemas: {
      type: 'object',
      minKeys: 3,
      reason: 'At least 3 schema definitions needed',
    },
  },

  expectedFormat: 'structured_json',
};
