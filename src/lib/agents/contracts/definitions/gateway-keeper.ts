/**
 * OLYMPUS 2.0 - Contract: GATEWAY → KEEPER
 *
 * GATEWAY defines API gateway.
 * KEEPER needs this to implement data persistence.
 */

import type { AgentContract } from '../types';

export const GATEWAY_TO_KEEPER_CONTRACT: AgentContract = {
  upstream: 'gateway',
  downstream: 'keeper',

  description: 'GATEWAY must provide API routes for KEEPER to implement data persistence',

  criticality: 'high',

  requiredFields: ['routes', 'data_operations'],

  fieldConstraints: {
    routes: {
      type: 'array',
      minCount: 5,
      reason: 'At least 5 routes for data operations',
    },
    'routes[]': {
      eachMustHave: ['path', 'method', 'dataModel'],
      reason: 'Each route needs path, method, and data model',
    },
    data_operations: {
      type: 'object',
      mustContain: ['create', 'read', 'update', 'delete'],
      reason: 'CRUD operations must be defined',
    },
  },

  expectedFormat: 'structured_json',
};
