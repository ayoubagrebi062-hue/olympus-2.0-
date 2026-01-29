/**
 * OLYMPUS 2.0 - Contract: GRID → CARTOGRAPHER
 *
 * GRID defines layout system and spacing.
 * CARTOGRAPHER needs this for navigation design.
 */

import type { AgentContract } from '../types';

export const GRID_TO_CARTOGRAPHER_CONTRACT: AgentContract = {
  upstream: 'grid',
  downstream: 'cartographer',

  description: 'GRID must provide layout system for CARTOGRAPHER to design navigation',

  criticality: 'medium',

  requiredFields: ['grid_system', 'breakpoints'],

  fieldConstraints: {
    grid_system: {
      type: 'object',
      mustContain: ['columns', 'gutter', 'margin'],
      reason: 'Grid system needs columns, gutter, and margin',
    },
    breakpoints: {
      type: 'object',
      mustContain: ['mobile', 'tablet', 'desktop'],
      reason: 'Responsive breakpoints required',
    },
    'grid_system.columns': {
      type: 'number',
      reason: 'Column count must be a number',
    },
  },

  expectedFormat: 'structured_json',
};
