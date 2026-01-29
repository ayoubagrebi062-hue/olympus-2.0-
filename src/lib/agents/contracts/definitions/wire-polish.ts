/**
 * OLYMPUS 2.0 - Contract: WIRE → POLISH
 *
 * WIRE connects components together.
 * POLISH needs this to apply final styling.
 */

import type { AgentContract } from '../types';

export const WIRE_TO_POLISH_CONTRACT: AgentContract = {
  upstream: 'wire',
  downstream: 'polish',

  description: 'WIRE must provide connected components for POLISH to apply final styling',

  criticality: 'high',

  requiredFields: ['wired_components', 'integration_points'],

  fieldConstraints: {
    wired_components: {
      type: 'array',
      minCount: 10,
      reason: 'At least 10 wired components needed',
    },
    'wired_components[]': {
      eachMustHave: ['name', 'props', 'connections'],
      reason: 'Each component needs name, props, and connections',
    },
    integration_points: {
      type: 'array',
      minCount: 3,
      reason: 'Integration points for state management',
    },
  },

  expectedFormat: 'structured_json',
};
