/**
 * OLYMPUS 2.0 - Contract: FLOW → WIRE
 *
 * FLOW defines user flows and interactions.
 * WIRE needs this to implement component wiring.
 */

import type { AgentContract } from '../types';

export const FLOW_TO_WIRE_CONTRACT: AgentContract = {
  upstream: 'flow',
  downstream: 'wire',

  description: 'FLOW must provide user flows for WIRE to implement component connections',

  criticality: 'high',

  requiredFields: ['user_flows', 'interactions'],

  fieldConstraints: {
    user_flows: {
      type: 'array',
      minCount: 3,
      reason: 'At least 3 user flows needed',
    },
    'user_flows[]': {
      eachMustHave: ['name', 'steps', 'entry_point'],
      reason: 'Each flow needs steps and entry point',
    },
    interactions: {
      type: 'array',
      minCount: 5,
      reason: 'At least 5 interactions defined',
    },
    'interactions[]': {
      eachMustHave: ['trigger', 'action', 'target'],
      reason: 'Each interaction needs trigger, action, target',
    },
  },

  expectedFormat: 'structured_json',
};
