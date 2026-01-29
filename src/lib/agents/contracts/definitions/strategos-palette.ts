/**
 * OLYMPUS 2.0 - Contract: STRATEGOS → PALETTE
 *
 * STRATEGOS defines MVP features and brand identity.
 * PALETTE needs this to create design system.
 */

import type { AgentContract } from '../types';

export const STRATEGOS_TO_PALETTE_CONTRACT: AgentContract = {
  upstream: 'strategos',
  downstream: 'palette',

  description: 'STRATEGOS must provide brand identity for PALETTE to create design system',

  criticality: 'high',

  requiredFields: ['brand_identity', 'design_requirements'],

  fieldConstraints: {
    brand_identity: {
      type: 'object',
      mustContain: ['tone', 'style'],
      reason: 'Brand tone and style must be defined',
    },
    design_requirements: {
      type: 'object',
      mustContain: ['accessibility', 'theme'],
      reason: 'Design requirements for PALETTE',
    },
    'brand_identity.tone': {
      type: 'string',
      minLength: 5,
      reason: 'Brand tone must be descriptive',
    },
  },

  expectedFormat: 'structured_json',
};
