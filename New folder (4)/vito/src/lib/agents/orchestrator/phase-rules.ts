/**
 * Phase Transition Rules
 * Phase 3 of OLYMPUS 50X - Build Plan Integration
 *
 * Defines valid transitions between build phases
 * and validation guards for each transition.
 */

import { BuildPhase, AgentPlan } from './build-plan-store';

// ============================================================================
// TYPES
// ============================================================================

export type PhaseId =
  | 'discovery'
  | 'design'
  | 'architecture'
  | 'frontend'
  | 'backend'
  | 'integration'
  | 'testing'
  | 'deployment';

export interface PhaseTransition {
  from: PhaseId | null; // null = start
  to: PhaseId;
  allowed: boolean;
  conditions: TransitionCondition[];
  description?: string;
}

export interface TransitionCondition {
  type: 'agents_complete' | 'min_quality' | 'required_outputs' | 'no_critical_errors' | 'custom';
  description: string;
  validate: (context: TransitionContext) => Promise<boolean>;
  required: boolean; // If false, transition proceeds with warning
}

export interface TransitionContext {
  buildId: string;
  projectType: string;
  fromPhase: PhaseId | null;
  toPhase: PhaseId;
  completedAgents: string[];
  agentOutputs: Map<string, Record<string, unknown>>;
  qualityScores: Map<string, number>;
  errors: Map<string, string>;
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// STRATEGOS FEASIBILITY GATE (UPGRADE SPEC #4)
// Validates STRATEGOS output BEFORE it propagates to downstream agents
// ============================================================================

/** STRATEGOS output structure for validation */
interface StrategosOutput {
  mvp_features?: Array<{ name: string; priority: string; description?: string }>;
  featureChecklist?: {
    critical?: Array<{ id: string; name: string; description: string }>;
    important?: Array<{ id: string; name: string; description: string }>;
    niceToHave?: Array<{ id: string; name: string; description: string }>;
  };
  constraints?: string[];
  scope?: string;
}

/** Result of feasibility validation */
interface FeasibilityResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  blockedFeatures: string[];
}

/**
 * Patterns that indicate IMPOSSIBLE requirements
 * These features require specialized infrastructure that OLYMPUS cannot generate
 */
const IMPOSSIBLE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Real-time/streaming
  { pattern: /real[- ]?time video/i, reason: 'Real-time video requires WebRTC infrastructure' },
  { pattern: /live[- ]?stream/i, reason: 'Live streaming requires media server infrastructure' },
  { pattern: /video[- ]?call/i, reason: 'Video calls require WebRTC and TURN servers' },

  // Blockchain/Web3
  { pattern: /blockchain/i, reason: 'Blockchain integration requires web3 infrastructure' },
  { pattern: /smart[- ]?contract/i, reason: 'Smart contracts require blockchain deployment' },
  { pattern: /nft|non[- ]?fungible/i, reason: 'NFT features require blockchain infrastructure' },
  { pattern: /cryptocurrency|crypto[- ]?payment/i, reason: 'Crypto payments require wallet integration' },

  // ML/AI training
  { pattern: /train.*model|model.*training/i, reason: 'ML model training requires GPU infrastructure' },
  { pattern: /fine[- ]?tun/i, reason: 'Model fine-tuning requires ML infrastructure' },
  { pattern: /neural[- ]?network/i, reason: 'Neural networks require ML framework setup' },

  // IoT/Hardware
  { pattern: /iot|internet of things/i, reason: 'IoT requires hardware integration' },
  { pattern: /hardware[- ]?integrat/i, reason: 'Hardware integration requires device drivers' },
  { pattern: /sensor[- ]?data/i, reason: 'Sensor integration requires hardware setup' },
  { pattern: /bluetooth|ble/i, reason: 'Bluetooth requires native device access' },

  // Native features
  { pattern: /native[- ]?app/i, reason: 'Native apps require React Native/Flutter' },
  { pattern: /push[- ]?notification/i, reason: 'Push notifications require FCM/APNs setup' },
  { pattern: /offline[- ]?first/i, reason: 'Offline-first requires service worker complexity' },

  // Complex infrastructure
  { pattern: /microservice/i, reason: 'Microservices require orchestration infrastructure' },
  { pattern: /kubernetes|k8s/i, reason: 'Kubernetes requires cluster infrastructure' },
  { pattern: /multi[- ]?region/i, reason: 'Multi-region requires distributed infrastructure' },
];

/**
 * Maximum number of CRITICAL features per tier
 * Prevents scope creep that leads to incomplete builds
 */
const MAX_CRITICAL_FEATURES: Record<string, number> = {
  starter: 5,
  professional: 10,
  ultimate: 20,
  enterprise: 50,
};

/**
 * Agent capability mapping
 * Maps features to the agents that can actually implement them
 */
const AGENT_CAPABILITIES: Record<string, string[]> = {
  // PIXEL can do these
  'dashboard': ['pixel', 'wire'],
  'kanban': ['pixel', 'wire'],
  'table': ['pixel', 'wire'],
  'form': ['pixel', 'wire'],
  'chart': ['pixel', 'wire'],
  'card': ['pixel', 'wire'],
  'modal': ['pixel', 'wire'],
  'navigation': ['pixel', 'wire'],
  'list': ['pixel', 'wire'],
  'grid': ['pixel', 'wire'],

  // ENGINE can do these
  'crud': ['engine', 'gateway'],
  'api': ['engine', 'gateway'],
  'database': ['datum', 'engine'],
  'auth': ['sentinel', 'engine'],
  'upload': ['engine'],

  // INTEGRATION agents
  'payment': ['bridge'],
  'email': ['notify'],
  'search': ['search'],
  'sync': ['sync'],
};

/**
 * Validate STRATEGOS output for feasibility
 * Called BEFORE transitioning from discovery to design phase
 */
export function validateStrategosFeasibility(
  output: StrategosOutput,
  tier: string
): FeasibilityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const blockedFeatures: string[] = [];

  // FIX #6: Check for completely empty output first
  if (!output || typeof output !== 'object') {
    return {
      valid: false,
      errors: ['STRATEGOS output is empty or invalid - no features will be built'],
      warnings: [],
      blockedFeatures: [],
    };
  }

  // FIX #6: Check featureChecklist exists and has content
  if (!output.featureChecklist) {
    return {
      valid: false,
      errors: ['STRATEGOS output missing featureChecklist - no features will be built'],
      warnings: [],
      blockedFeatures: [],
    };
  }

  const criticalFeatures = output.featureChecklist?.critical || [];
  const importantFeatures = output.featureChecklist?.important || [];

  // FIX #6: CRITICAL CHECK - Empty critical features means nothing will be built
  if (criticalFeatures.length === 0) {
    // Check if there are at least important features as fallback
    if (importantFeatures.length === 0) {
      return {
        valid: false,
        errors: [
          'STRATEGOS featureChecklist is EMPTY - no features defined. ' +
          'Build cannot proceed without at least one critical or important feature.',
        ],
        warnings: [],
        blockedFeatures: [],
      };
    } else {
      // Warn but allow if there are important features
      errors.push(
        `No critical features defined, only ${importantFeatures.length} important features. ` +
        `Consider promoting key features to critical priority.`
      );
    }
  }

  // Get all features to validate
  const allFeatures = [
    ...(output.mvp_features || []).map(f => f.name),
    ...criticalFeatures.map(f => f.name),
    ...importantFeatures.map(f => f.name),
  ];

  const maxCritical = MAX_CRITICAL_FEATURES[tier] || MAX_CRITICAL_FEATURES.starter;

  // CHECK 1: Scope limit validation
  if (criticalFeatures.length > maxCritical) {
    errors.push(
      `Too many critical features for ${tier} tier: ${criticalFeatures.length} (max: ${maxCritical}). ` +
      `Move ${criticalFeatures.length - maxCritical} features to "important" or "niceToHave".`
    );
  }

  // CHECK 2: Impossible feature detection
  for (const featureName of allFeatures) {
    for (const { pattern, reason } of IMPOSSIBLE_PATTERNS) {
      if (pattern.test(featureName)) {
        errors.push(`Impossible feature detected: "${featureName}" - ${reason}`);
        blockedFeatures.push(featureName);
        break;
      }
    }
  }

  // CHECK 3: Agent capability matching
  for (const feature of criticalFeatures) {
    const featureLower = feature.name.toLowerCase();
    let canBeImplemented = false;

    for (const [capability, agents] of Object.entries(AGENT_CAPABILITIES)) {
      if (featureLower.includes(capability)) {
        canBeImplemented = true;
        // Assign to first capable agent if not already assigned
        if (!(feature as any).assignedTo) {
          (feature as any).assignedTo = agents[0];
        }
        break;
      }
    }

    // If no known capability matches, warn but don't block
    if (!canBeImplemented && !blockedFeatures.includes(feature.name)) {
      warnings.push(
        `Feature "${feature.name}" doesn't match known agent capabilities. ` +
        `Verify it can be implemented by available agents.`
      );
    }
  }

  // CHECK 4: Feature description quality
  for (const feature of criticalFeatures) {
    if (!feature.description || feature.description.length < 20) {
      warnings.push(
        `Critical feature "${feature.name}" has insufficient description. ` +
        `Add detailed description for downstream agents.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    blockedFeatures,
  };
}

// ============================================================================
// PHASE DEFINITIONS
// ============================================================================

export const PHASE_DEFINITIONS: Record<PhaseId, { name: string; agents: string[]; order: number }> =
  {
    discovery: {
      name: 'Discovery',
      agents: ['oracle', 'empathy', 'strategos'],
      order: 0,
    },
    design: {
      name: 'Design',
      agents: ['palette', 'grid', 'blocks', 'motion', 'fonts'],
      order: 1,
    },
    architecture: {
      name: 'Architecture',
      agents: ['archon', 'datum', 'shield'],
      order: 2,
    },
    frontend: {
      name: 'Frontend',
      agents: ['pixel', 'wire', 'react', 'state'],
      order: 3,
    },
    backend: {
      name: 'Backend',
      agents: ['engine', 'api', 'cache', 'queue'],
      order: 4,
    },
    integration: {
      name: 'Integration',
      agents: ['bridge', 'sync', 'notify', 'search', 'media'],
      order: 5,
    },
    testing: {
      name: 'Testing',
      agents: ['junit', 'cypress', 'load', 'a11y', 'security'],
      order: 6,
    },
    deployment: {
      name: 'Deployment',
      agents: ['infra', 'cicd', 'monitor', 'docs'],
      order: 7,
    },
  };

// ============================================================================
// TRANSITION RULES
// ============================================================================

/**
 * Phase transition rules matrix
 */
export const PHASE_TRANSITIONS: PhaseTransition[] = [
  // =========================================================================
  // START TRANSITIONS
  // =========================================================================

  // Start -> Discovery (always allowed)
  {
    from: null,
    to: 'discovery',
    allowed: true,
    conditions: [],
    description: 'Initial phase - no conditions required',
  },

  // =========================================================================
  // DISCOVERY TRANSITIONS
  // =========================================================================

  // Discovery -> Design
  {
    from: 'discovery',
    to: 'design',
    allowed: true,
    description: 'Move to design after discovery analysis',
    conditions: [
      {
        type: 'agents_complete',
        description: 'STRATEGOS must complete',
        required: true,
        validate: async (ctx) => ctx.completedAgents.includes('strategos'),
      },
      {
        type: 'required_outputs',
        description: 'MVP features must be defined',
        required: true,
        validate: async (ctx) => {
          const output = ctx.agentOutputs.get('strategos');
          const mvpFeatures = output?.mvp_features as unknown[];
          return Array.isArray(mvpFeatures) && mvpFeatures.length > 0;
        },
      },
      // ═══════════════════════════════════════════════════════════════
      // STRATEGOS FEASIBILITY GATE (UPGRADE SPEC #4)
      // Validates features are achievable BEFORE downstream propagation
      // ═══════════════════════════════════════════════════════════════
      {
        type: 'custom',
        description: 'STRATEGOS features must be feasible for the build tier',
        required: true,
        validate: async (ctx) => {
          const output = ctx.agentOutputs.get('strategos');
          if (!output) return false;

          // Get tier from metadata (default to starter)
          const tier = (ctx.metadata?.tier as string) || 'starter';

          const feasibility = validateStrategosFeasibility(
            output as unknown as StrategosOutput,
            tier
          );

          // Store validation results in metadata for downstream use
          if (ctx.metadata) {
            ctx.metadata.feasibilityResult = feasibility;
            ctx.metadata.blockedFeatures = feasibility.blockedFeatures;
          }

          // Log detailed feedback
          if (!feasibility.valid) {
            console.error('[PHASE-RULES] STRATEGOS feasibility check FAILED:');
            feasibility.errors.forEach(e => console.error(`  ❌ ${e}`));
          }
          if (feasibility.warnings.length > 0) {
            console.warn('[PHASE-RULES] STRATEGOS feasibility warnings:');
            feasibility.warnings.forEach(w => console.warn(`  ⚠️ ${w}`));
          }

          return feasibility.valid;
        },
      },
      {
        type: 'no_critical_errors',
        description: 'No critical discovery errors',
        required: false, // Warning only
        validate: async (ctx) => {
          const criticalAgents = ['oracle', 'strategos'];
          return !criticalAgents.some((a) => ctx.errors.has(a));
        },
      },
    ],
  },

  // =========================================================================
  // DESIGN TRANSITIONS
  // =========================================================================

  // Design -> Architecture
  {
    from: 'design',
    to: 'architecture',
    allowed: true,
    description: 'Move to architecture after design approval',
    conditions: [
      {
        type: 'agents_complete',
        description: 'BLOCKS must complete',
        required: true,
        validate: async (ctx) => ctx.completedAgents.includes('blocks'),
      },
      {
        type: 'min_quality',
        description: 'Design quality must be >= 6',
        required: true,
        validate: async (ctx) => {
          const scores = ['palette', 'grid', 'blocks'].map((a) => ctx.qualityScores.get(a) || 0);
          const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          return avg >= 6;
        },
      },
    ],
  },

  // Design -> Frontend (skip architecture for simple projects)
  {
    from: 'design',
    to: 'frontend',
    allowed: true,
    description: 'Skip architecture for landing pages',
    conditions: [
      {
        type: 'custom',
        description: 'Only for landing-page or portfolio project types',
        required: true,
        validate: async (ctx) => {
          return ['landing-page', 'portfolio', 'blog'].includes(ctx.projectType);
        },
      },
      {
        type: 'agents_complete',
        description: 'At least PALETTE and BLOCKS must complete',
        required: true,
        validate: async (ctx) => {
          return (
            ctx.completedAgents.includes('palette') && ctx.completedAgents.includes('blocks')
          );
        },
      },
    ],
  },

  // =========================================================================
  // ARCHITECTURE TRANSITIONS
  // =========================================================================

  // Architecture -> Frontend
  {
    from: 'architecture',
    to: 'frontend',
    allowed: true,
    description: 'Start frontend development',
    conditions: [
      {
        type: 'agents_complete',
        description: 'ARCHON must complete',
        required: true,
        validate: async (ctx) => ctx.completedAgents.includes('archon'),
      },
      {
        type: 'required_outputs',
        description: 'Tech stack must be defined',
        required: true,
        validate: async (ctx) => {
          const output = ctx.agentOutputs.get('archon');
          const techStack = output?.tech_stack as Record<string, unknown> | undefined;
          return techStack?.framework !== undefined;
        },
      },
    ],
  },

  // Architecture -> Backend (can run parallel with frontend)
  {
    from: 'architecture',
    to: 'backend',
    allowed: true,
    description: 'Start backend development',
    conditions: [
      {
        type: 'agents_complete',
        description: 'DATUM must complete',
        required: true,
        validate: async (ctx) => ctx.completedAgents.includes('datum'),
      },
      {
        type: 'required_outputs',
        description: 'Database schema must be defined',
        required: true,
        validate: async (ctx) => {
          const output = ctx.agentOutputs.get('datum');
          const schema = output?.schema as unknown;
          return schema !== undefined;
        },
      },
    ],
  },

  // =========================================================================
  // FRONTEND TRANSITIONS
  // =========================================================================

  // Frontend -> Integration
  {
    from: 'frontend',
    to: 'integration',
    allowed: true,
    description: 'Start integration after frontend',
    conditions: [
      {
        type: 'agents_complete',
        description: 'PIXEL and WIRE must complete',
        required: true,
        validate: async (ctx) =>
          ctx.completedAgents.includes('pixel') && ctx.completedAgents.includes('wire'),
      },
      {
        type: 'min_quality',
        description: 'Frontend quality must be >= 7',
        required: false, // Warning only
        validate: async (ctx) => {
          const scores = ['pixel', 'wire', 'react'].map((a) => ctx.qualityScores.get(a) || 0);
          const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          return avg >= 7;
        },
      },
    ],
  },

  // Frontend -> Testing (skip integration for static sites)
  {
    from: 'frontend',
    to: 'testing',
    allowed: true,
    description: 'Skip integration for static sites',
    conditions: [
      {
        type: 'custom',
        description: 'Only for static project types',
        required: true,
        validate: async (ctx) => {
          return ['landing-page', 'portfolio', 'documentation'].includes(ctx.projectType);
        },
      },
    ],
  },

  // =========================================================================
  // BACKEND TRANSITIONS
  // =========================================================================

  // Backend -> Integration
  {
    from: 'backend',
    to: 'integration',
    allowed: true,
    description: 'Start integration after backend',
    conditions: [
      {
        type: 'agents_complete',
        description: 'ENGINE must complete',
        required: true,
        validate: async (ctx) => ctx.completedAgents.includes('engine'),
      },
      {
        type: 'required_outputs',
        description: 'API endpoints must be defined',
        required: true,
        validate: async (ctx) => {
          const output = ctx.agentOutputs.get('api');
          const endpoints = output?.endpoints as unknown[];
          return Array.isArray(endpoints) && endpoints.length > 0;
        },
      },
    ],
  },

  // =========================================================================
  // INTEGRATION TRANSITIONS
  // =========================================================================

  // Integration -> Testing
  {
    from: 'integration',
    to: 'testing',
    allowed: true,
    description: 'Move to testing after integration',
    conditions: [
      {
        type: 'agents_complete',
        description: 'At least one integration agent must complete',
        required: true,
        validate: async (ctx) =>
          ['bridge', 'sync', 'notify', 'search'].some((a) => ctx.completedAgents.includes(a)),
      },
    ],
  },

  // =========================================================================
  // TESTING TRANSITIONS
  // =========================================================================

  // Testing -> Deployment
  {
    from: 'testing',
    to: 'deployment',
    allowed: true,
    description: 'Deploy after all tests pass',
    conditions: [
      {
        type: 'min_quality',
        description: 'All required tests must pass',
        required: true,
        validate: async (ctx) => {
          // Check test agent outputs (junit stores test-runner results, cypress stores smoke results)
          const testAgents = ['junit', 'cypress'];
          return testAgents.every((a) => {
            const output = ctx.agentOutputs.get(a) as Record<string, unknown> | undefined;
            if (!output) {
              // Agent didn't run - that's OK for optional agents
              return !ctx.completedAgents.includes(a);
            }

            // Check status field (from our test/smoke runner)
            if (output.status === 'failed') {
              console.warn(`[Phase Rules] ${a} reported failure`);
              return false;
            }

            // Legacy check for passed field
            if (output.passed === false) {
              return false;
            }

            return true;
          });
        },
      },
      {
        type: 'no_critical_errors',
        description: 'No security or a11y critical issues',
        required: true,
        validate: async (ctx) => {
          const securityOutput = ctx.agentOutputs.get('security');
          const a11yOutput = ctx.agentOutputs.get('a11y');

          const securityCritical = (securityOutput?.critical_issues as unknown[])?.length || 0;
          const a11yCritical = (a11yOutput?.critical_issues as unknown[])?.length || 0;

          return securityCritical === 0 && a11yCritical === 0;
        },
      },
      {
        type: 'custom',
        description: 'Smoke tests must pass (if run)',
        required: false, // Warning only, not blocking
        validate: async (ctx) => {
          // Smoke results are stored in 'cypress' agent output
          const smokeOutput = ctx.agentOutputs.get('cypress') as Record<string, unknown> | undefined;
          if (smokeOutput && smokeOutput.status === 'failed') {
            // Get decision info for details
            const decisions = smokeOutput.decisions as Array<{ reasoning?: string }> | undefined;
            const reason = decisions?.[0]?.reasoning || 'Unknown failure';
            console.warn(`[Phase Rules] Smoke tests failed: ${reason}`);
            return false;
          }
          return true;
        },
      },
    ],
  },
];

// ============================================================================
// SKIP RULES
// ============================================================================

/**
 * Phases that can be skipped based on project type
 */
export const PHASE_SKIP_RULES: Record<string, PhaseId[]> = {
  'landing-page': ['backend', 'integration', 'testing'],
  portfolio: ['backend', 'integration'],
  blog: ['integration'],
  documentation: ['backend', 'integration'],
  'api-only': ['design', 'frontend'],
  'saas-full': [], // No skips - full build
  'e-commerce': [], // No skips - full build
  marketplace: [], // No skips - full build
  dashboard: ['integration'],
  'mobile-app': ['deployment'], // Different deployment
  'chrome-extension': ['backend', 'testing'],
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate a phase transition
 */
export async function validateTransition(context: TransitionContext): Promise<TransitionResult> {
  const transition = PHASE_TRANSITIONS.find(
    (t) => t.from === context.fromPhase && t.to === context.toPhase
  );

  if (!transition) {
    return {
      valid: false,
      errors: [`Invalid transition: ${context.fromPhase || 'start'} -> ${context.toPhase}`],
      warnings: [],
    };
  }

  if (!transition.allowed) {
    return {
      valid: false,
      errors: [`Transition not allowed: ${context.fromPhase || 'start'} -> ${context.toPhase}`],
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const condition of transition.conditions) {
    try {
      const passed = await condition.validate(context);
      if (!passed) {
        if (condition.required) {
          errors.push(`[${condition.type}] ${condition.description}`);
        } else {
          warnings.push(`[${condition.type}] ${condition.description}`);
        }
      }
    } catch (err) {
      errors.push(`Condition validation failed: ${condition.description}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get valid next phases from current phase
 */
export function getValidNextPhases(currentPhase: PhaseId | null): PhaseId[] {
  return PHASE_TRANSITIONS.filter((t) => t.from === currentPhase && t.allowed).map((t) => t.to);
}

/**
 * Get recommended next phase based on context
 */
export function getRecommendedNextPhase(
  currentPhase: PhaseId | null,
  projectType: string
): PhaseId | null {
  const validPhases = getValidNextPhases(currentPhase);
  if (validPhases.length === 0) return null;

  // Filter out skippable phases
  const skipRules = PHASE_SKIP_RULES[projectType] || [];
  const nonSkippedPhases = validPhases.filter((p) => !skipRules.includes(p));

  // Return the first non-skipped phase (by order)
  if (nonSkippedPhases.length > 0) {
    return nonSkippedPhases.sort((a, b) => {
      return PHASE_DEFINITIONS[a].order - PHASE_DEFINITIONS[b].order;
    })[0];
  }

  // If all valid phases are skipped, return the first valid one
  return validPhases[0];
}

/**
 * Check if a phase can be skipped
 */
export function canSkipPhase(phase: PhaseId, projectType: string): boolean {
  const skipRules = PHASE_SKIP_RULES[projectType];
  return skipRules?.includes(phase) || false;
}

/**
 * Get all phases for a project type (excluding skipped ones)
 */
export function getPhasesForProjectType(projectType: string): PhaseId[] {
  const skipRules = PHASE_SKIP_RULES[projectType] || [];
  const allPhases = Object.keys(PHASE_DEFINITIONS) as PhaseId[];

  return allPhases.filter((p) => !skipRules.includes(p)).sort((a, b) => {
    return PHASE_DEFINITIONS[a].order - PHASE_DEFINITIONS[b].order;
  });
}

/**
 * Get agents for a phase
 */
export function getPhaseAgents(phase: PhaseId): string[] {
  return PHASE_DEFINITIONS[phase]?.agents || [];
}

/**
 * Check if all phases are complete
 */
export function areAllPhasesComplete(
  phases: BuildPhase[],
  projectType: string
): { complete: boolean; remaining: string[] } {
  const requiredPhases = getPhasesForProjectType(projectType);
  const completedPhaseIds = phases
    .filter((p) => p.status === 'completed' || p.status === 'skipped')
    .map((p) => p.id);

  const remaining = requiredPhases.filter((p) => !completedPhaseIds.includes(p));

  return {
    complete: remaining.length === 0,
    remaining,
  };
}

/**
 * Get phase by order
 */
export function getPhaseByOrder(order: number): PhaseId | null {
  const entry = Object.entries(PHASE_DEFINITIONS).find(([_, def]) => def.order === order);
  return entry ? (entry[0] as PhaseId) : null;
}

/**
 * Get phase order
 */
export function getPhaseOrder(phase: PhaseId): number {
  return PHASE_DEFINITIONS[phase]?.order ?? -1;
}

/**
 * Check if transition requires approval
 */
export function transitionRequiresApproval(fromPhase: PhaseId | null, toPhase: PhaseId): boolean {
  // Deployment always requires approval
  if (toPhase === 'deployment') return true;

  // Skipping phases requires approval
  const fromOrder = fromPhase ? getPhaseOrder(fromPhase) : -1;
  const toOrder = getPhaseOrder(toPhase);

  // If skipping more than one phase
  if (toOrder - fromOrder > 1) return true;

  return false;
}
