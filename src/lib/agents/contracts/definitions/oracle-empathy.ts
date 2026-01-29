/**
 * OLYMPUS 2.0 - Contract: ORACLE → EMPATHY
 *
 * ORACLE defines project vision.
 * EMPATHY needs this to understand user context.
 */

import type { AgentContract } from '../types';

export const ORACLE_TO_EMPATHY_CONTRACT: AgentContract = {
  upstream: 'oracle',
  downstream: 'empathy',

  description: 'ORACLE must provide project context for EMPATHY to understand users',

  criticality: 'high',

  requiredFields: ['project_context', 'user_segments'],

  fieldConstraints: {
    project_context: {
      type: 'object',
      mustContain: ['domain', 'problem_statement'],
      reason: 'Project context needed for empathy mapping',
    },
    user_segments: {
      type: 'array',
      minCount: 2,
      reason: 'At least 2 user segments to analyze',
    },
    'user_segments[]': {
      eachMustHave: ['name', 'characteristics'],
      reason: 'Each segment needs name and characteristics',
    },
  },

  expectedFormat: 'structured_json',
};
