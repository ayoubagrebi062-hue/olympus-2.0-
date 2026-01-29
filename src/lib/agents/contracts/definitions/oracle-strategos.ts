/**
 * OLYMPUS 2.0 - Contract: ORACLE → STRATEGOS
 *
 * ORACLE defines the project vision and goals.
 * STRATEGOS needs this to create feature roadmap.
 */

import type { AgentContract } from '../types';

export const ORACLE_TO_STRATEGOS_CONTRACT: AgentContract = {
  upstream: 'oracle',
  downstream: 'strategos',

  description:
    'ORACLE must provide project vision and goals for STRATEGOS to create feature roadmap',

  criticality: 'critical',

  requiredFields: ['project_vision', 'target_audience', 'success_metrics'],

  fieldConstraints: {
    project_vision: {
      type: 'string',
      minLength: 50,
      reason: 'Project vision must be clearly defined',
    },
    target_audience: {
      type: 'array',
      minCount: 1,
      reason: 'At least one target audience segment required',
    },
    success_metrics: {
      type: 'array',
      minCount: 3,
      reason: 'Success metrics needed for roadmap planning',
    },
    'success_metrics[]': {
      eachMustHave: ['name', 'target'],
      reason: 'Each metric needs name and target value',
    },
  },

  expectedFormat: 'structured_json',
};
