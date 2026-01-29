/**
 * OLYMPUS 2.0 - Contract: ARTIST → BLOCKS
 *
 * ARTIST creates visual assets.
 * BLOCKS needs this for component imagery.
 */

import type { AgentContract } from '../types';

export const ARTIST_TO_BLOCKS_CONTRACT: AgentContract = {
  upstream: 'artist',
  downstream: 'blocks',

  description: 'ARTIST must provide visual assets for BLOCKS component imagery',

  criticality: 'medium',

  requiredFields: ['assets', 'icons'],

  fieldConstraints: {
    assets: {
      type: 'array',
      minCount: 5,
      reason: 'At least 5 visual assets needed',
    },
    'assets[]': {
      eachMustHave: ['name', 'type', 'url'],
      reason: 'Each asset needs name, type, and url',
    },
    icons: {
      type: 'array',
      minCount: 10,
      reason: 'At least 10 icons for UI',
    },
  },

  expectedFormat: 'structured_json',
};
