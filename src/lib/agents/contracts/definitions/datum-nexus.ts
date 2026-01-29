/**
 * OLYMPUS 2.0 - Contract: DATUM → NEXUS
 *
 * DATUM defines data models and schemas.
 * NEXUS needs this to design API contracts.
 */

import type { AgentContract } from '../types';

export const DATUM_TO_NEXUS_CONTRACT: AgentContract = {
  upstream: 'datum',
  downstream: 'nexus',

  description: 'DATUM must provide data models for NEXUS to design API contracts',

  criticality: 'critical',

  requiredFields: ['entities', 'relationships'],

  fieldConstraints: {
    entities: {
      type: 'array',
      minCount: 3,
      reason: 'At least 3 data entities needed',
    },
    'entities[]': {
      eachMustHave: ['name', 'fields', 'primaryKey'],
      reason: 'Each entity needs name, fields, and primary key',
    },
    relationships: {
      type: 'array',
      minCount: 1,
      reason: 'At least 1 relationship between entities',
    },
    'relationships[]': {
      eachMustHave: ['from', 'to', 'type'],
      reason: 'Each relationship needs from, to, and type',
    },
  },

  expectedFormat: 'structured_json',
};
