/**
 * OLYMPUS 2.0 - Contract: EMPATHY → PSYCHE
 *
 * EMPATHY defines user personas and pain points.
 * PSYCHE needs this to design user journeys.
 */

import type { AgentContract } from '../types';

export const EMPATHY_TO_PSYCHE_CONTRACT: AgentContract = {
  upstream: 'empathy',
  downstream: 'psyche',

  description: 'EMPATHY must provide user personas for PSYCHE to design user journeys',

  criticality: 'high',

  requiredFields: ['personas', 'pain_points'],

  fieldConstraints: {
    personas: {
      type: 'array',
      minCount: 2,
      reason: 'At least 2 user personas needed',
    },
    'personas[]': {
      eachMustHave: ['name', 'goals', 'frustrations'],
      reason: 'Each persona needs goals and frustrations',
    },
    pain_points: {
      type: 'array',
      minCount: 3,
      reason: 'At least 3 pain points to address',
    },
  },

  expectedFormat: 'structured_json',
};
