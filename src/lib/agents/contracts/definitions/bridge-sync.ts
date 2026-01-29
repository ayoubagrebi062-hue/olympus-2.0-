/**
 * OLYMPUS 2.0 - Contract: BRIDGE → SYNC
 *
 * BRIDGE defines integration points.
 * SYNC needs this to implement real-time sync.
 */

import type { AgentContract } from '../types';

export const BRIDGE_TO_SYNC_CONTRACT: AgentContract = {
  upstream: 'bridge',
  downstream: 'sync',

  description: 'BRIDGE must provide integration points for SYNC to implement real-time sync',

  criticality: 'medium',

  requiredFields: ['integrations', 'data_flows'],

  fieldConstraints: {
    integrations: {
      type: 'array',
      minCount: 2,
      reason: 'At least 2 integrations needed',
    },
    'integrations[]': {
      eachMustHave: ['name', 'type', 'endpoints'],
      reason: 'Each integration needs name, type, and endpoints',
    },
    data_flows: {
      type: 'array',
      minCount: 3,
      reason: 'Data flow definitions for sync',
    },
  },

  expectedFormat: 'structured_json',
};
