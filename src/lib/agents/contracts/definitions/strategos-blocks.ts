/**
 * OLYMPUS 2.0 - Contract: STRATEGOS → BLOCKS
 *
 * STRATEGOS defines MVP features and requirements.
 * BLOCKS needs clear feature specs to design component system.
 *
 * HIGH PRIORITY CONTRACT - Feature requirements must propagate.
 */

import type { AgentContract, ContractViolation } from '../types';

/**
 * STRATEGOS → BLOCKS Contract
 *
 * STRATEGOS must output:
 * - mvp_features array with prioritized features
 * - featureChecklist with critical/important/niceToHave
 * - technical_requirements with stack decisions
 */
export const STRATEGOS_TO_BLOCKS_CONTRACT: AgentContract = {
  upstream: 'strategos',
  downstream: 'blocks',

  description:
    'STRATEGOS must provide clear MVP features and requirements for BLOCKS to design component system',

  criticality: 'high',

  requiredFields: ['mvp_features', 'technical_requirements'],

  fieldConstraints: {
    // MVP features array
    mvp_features: {
      type: 'array',
      minCount: 5,
      reason: 'STRATEGOS should identify at least 5 MVP features',
    },

    // Each MVP feature must have key fields
    'mvp_features[]': {
      eachMustHave: ['id', 'name', 'category', 'priority', 'description'],
      reason: 'Each feature needs identification and prioritization',
    },

    // Feature names must be specific
    'mvp_features[].name': {
      type: 'string',
      minLength: 5,
      mustNotBe: ['Feature', 'TODO', 'Example', 'TBD'],
      reason: 'Feature names must be specific to the app',
    },

    // Priority must be valid
    'mvp_features[].priority': {
      mustContain: [], // Checked in custom validation
      reason: 'Priority must be one of: must_have, should_have, could_have, wont_have',
    },

    // Technical requirements
    technical_requirements: {
      type: 'object',
      mustContain: ['stack'],
      reason: 'BLOCKS needs to know the tech stack for component design',
    },

    // Stack must have required fields
    'technical_requirements.stack': {
      type: 'object',
      mustContain: ['frontend', 'database'],
      reason: 'Stack must specify frontend and database',
    },

    // Feature checklist (if present)
    featureChecklist: {
      type: 'object',
      mustContain: ['critical'],
      reason: 'Feature checklist should have critical items',
    },

    // Critical features must exist
    'featureChecklist.critical': {
      type: 'array',
      minCount: 3,
      reason: 'At least 3 critical features expected',
    },

    // Each critical feature needs acceptance criteria
    'featureChecklist.critical[]': {
      eachMustHave: ['id', 'name', 'acceptanceCriteria'],
      reason: 'Critical features need acceptance criteria for validation',
    },
  },

  expectedFormat: 'structured_json',

  // Custom validation
  customValidation: (output: unknown): ContractViolation[] => {
    const violations: ContractViolation[] = [];
    const data = output as Record<string, unknown>;

    // Validate MVP features
    if (Array.isArray(data.mvp_features)) {
      const features = data.mvp_features as Array<Record<string, unknown>>;

      // Check priority distribution
      const priorities = new Map<string, number>();
      for (const f of features) {
        const p = f.priority as string;
        priorities.set(p, (priorities.get(p) || 0) + 1);
      }

      // Must have at least 1 must_have
      if (!priorities.has('must_have') && !priorities.has('P0') && !priorities.has('critical')) {
        violations.push({
          field: 'mvp_features',
          constraint: 'has_must_have',
          expected: 'At least 1 must_have priority feature',
          actual: `Priorities found: ${Array.from(priorities.keys()).join(', ')}`,
          severity: 'error',
          suggestion: 'STRATEGOS should identify critical must-have features',
        });
      }

      // Check for RICE scores (should have some scoring)
      const hasRice = features.some(
        f => f.rice_score !== undefined || f.rice_breakdown !== undefined || f.score !== undefined
      );
      if (!hasRice) {
        violations.push({
          field: 'mvp_features',
          constraint: 'has_scoring',
          expected: 'Features should have RICE scores for prioritization',
          actual: 'No scoring found',
          severity: 'warning',
          suggestion: 'Add RICE scores to help prioritize features',
        });
      }

      // Check feature descriptions are meaningful
      for (let i = 0; i < features.length; i++) {
        const desc = features[i].description as string;
        if (desc && desc.length < 20) {
          violations.push({
            field: `mvp_features[${i}].description`,
            constraint: 'description_length',
            expected: 'Meaningful description (20+ chars)',
            actual: `${desc.length} chars`,
            severity: 'warning',
            suggestion: 'Feature description too short to be useful',
          });
        }
      }
    }

    // Validate technical requirements
    const techReqs = data.technical_requirements as Record<string, unknown>;
    if (techReqs) {
      const stack = techReqs.stack as Record<string, unknown>;
      if (stack) {
        // Check frontend is React/Next.js (BLOCKS expects this)
        const frontend = stack.frontend as string;
        if (
          frontend &&
          !frontend.toLowerCase().includes('react') &&
          !frontend.toLowerCase().includes('next')
        ) {
          violations.push({
            field: 'technical_requirements.stack.frontend',
            constraint: 'supported_frontend',
            expected: 'React or Next.js based frontend',
            actual: frontend,
            severity: 'warning',
            suggestion: 'BLOCKS is optimized for React/Next.js components',
          });
        }
      }

      // Check for performance requirements (optional but useful)
      if (!techReqs.performance) {
        violations.push({
          field: 'technical_requirements',
          constraint: 'has_performance',
          expected: 'Performance requirements defined',
          actual: 'No performance requirements',
          severity: 'info',
          suggestion: 'Consider adding performance targets',
        });
      }
    }

    // Validate roadmap if present
    const roadmap = data.roadmap as Record<string, unknown>;
    if (roadmap) {
      if (!roadmap.phase_1_mvp) {
        violations.push({
          field: 'roadmap',
          constraint: 'has_phase_1',
          expected: 'MVP phase defined',
          actual: 'No phase_1_mvp in roadmap',
          severity: 'warning',
        });
      }
    }

    return violations;
  },
};
