/**
 * OLYMPUS 2.0 - Contract: SCRIBE → ARCHITECT
 *
 * SCRIBE documents requirements.
 * ARCHITECT needs this for technical design.
 */

import type { AgentContract } from '../types';

export const SCRIBE_TO_ARCHITECT_CONTRACT: AgentContract = {
  upstream: 'scribe',
  downstream: 'architect_conversion',

  description: 'SCRIBE must provide requirements for ARCHITECT to create technical design',

  criticality: 'high',

  requiredFields: ['requirements', 'constraints'],

  fieldConstraints: {
    requirements: {
      type: 'array',
      minCount: 10,
      reason: 'At least 10 documented requirements',
    },
    'requirements[]': {
      eachMustHave: ['id', 'description', 'priority'],
      reason: 'Each requirement needs id, description, and priority',
    },
    constraints: {
      type: 'array',
      minCount: 3,
      reason: 'Technical and business constraints',
    },
  },

  expectedFormat: 'structured_json',
};
