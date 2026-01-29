/**
 * OLYMPUS 2.0 - Contract: ARCHON → DATUM
 *
 * ARCHON defines data architecture decisions.
 * DATUM needs this to design data models.
 */

import type { AgentContract } from '../types';

export const ARCHON_TO_DATUM_CONTRACT: AgentContract = {
  upstream: 'archon',
  downstream: 'datum',

  description: 'ARCHON must provide architecture decisions for DATUM to design data models',

  criticality: 'critical',

  requiredFields: ['data_architecture', 'storage_decisions'],

  fieldConstraints: {
    data_architecture: {
      type: 'object',
      mustContain: ['pattern', 'consistency'],
      reason: 'Data architecture pattern must be defined',
    },
    storage_decisions: {
      type: 'object',
      mustContain: ['primary_database', 'caching'],
      reason: 'Storage decisions needed for data design',
    },
    'storage_decisions.primary_database': {
      type: 'object',
      mustContain: ['type', 'rationale'],
      reason: 'Database choice needs rationale',
    },
  },

  expectedFormat: 'structured_json',
};
