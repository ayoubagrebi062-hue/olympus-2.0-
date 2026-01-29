/**
 * OLYMPUS 2.0 - Contract: ENGINE → GATEWAY
 *
 * ENGINE defines business logic.
 * GATEWAY needs this to create API gateway.
 */

import type { AgentContract } from '../types';

export const ENGINE_TO_GATEWAY_CONTRACT: AgentContract = {
  upstream: 'engine',
  downstream: 'gateway',

  description: 'ENGINE must provide business logic for GATEWAY to create API gateway',

  criticality: 'high',

  requiredFields: ['services', 'business_rules'],

  fieldConstraints: {
    services: {
      type: 'array',
      minCount: 3,
      reason: 'At least 3 services needed',
    },
    'services[]': {
      eachMustHave: ['name', 'methods', 'dependencies'],
      reason: 'Each service needs name, methods, and dependencies',
    },
    business_rules: {
      type: 'array',
      minCount: 5,
      reason: 'Business rules for validation',
    },
  },

  expectedFormat: 'structured_json',
};
