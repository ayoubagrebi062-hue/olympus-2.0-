/**
 * OLYMPUS 2.1 - UX_CRITIC Agent
 *
 * The ONLY AI agent in the validation pipeline.
 * Runs AFTER all code validators pass.
 *
 * Purpose: Comparative judgment against elite products (taste).
 * Philosophy: "Technically valid ≠ good"
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface UXCriticInput {
  code: string;
  pageType: string;
  description: string;
  screenshots?: string[];
}

export interface UXCriticScore {
  score: number;
  reasoning: string;
}

export interface UXCriticConcern {
  severity: 'high' | 'medium' | 'low';
  screen: string;
  observation: string;
  problem: string;
  evidence: string;
  recommendation: string;
}

export interface UXCriticResult {
  verdict: 'APPROVED' | 'NEEDS_WORK' | 'REJECTED';
  overallScore: number;
  benchmark: string;
  scores: {
    clarity: UXCriticScore;
    efficiency: UXCriticScore;
    simplicity: UXCriticScore;
    trust: UXCriticScore;
  };
  praise: string[];
  concerns: UXCriticConcern[];
  verdictReasoning: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  phase: string;
  tier: string;
  dependencies: string[];
  optional: boolean;
  systemPrompt: string;
  outputSchema: object;
  maxRetries: number;
  timeout: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

export const BENCHMARKS = {
  payment: {
    name: 'Stripe',
    traits: ['Clean checkout', '3-step max', 'Clear pricing', 'Trust signals'],
    metrics: { checkoutSteps: 3, formFieldsPerStep: 4, errorRecoveryClicks: 1 },
  },
  projectManagement: {
    name: 'Linear',
    traits: ['Keyboard-first', 'Fast interactions', 'Minimal UI', 'Clear hierarchy'],
    metrics: { keyboardShortcuts: true, loadingStateMaxDuration: 200, actionsPerClick: 1 },
  },
  productivity: {
    name: 'Notion',
    traits: ['Flexible blocks', 'Clean typography', 'Intuitive nesting', 'Minimal chrome'],
    metrics: { contentToChrome: 0.9, nestingLevels: 5 },
  },
  devTools: {
    name: 'Vercel',
    traits: ['Dark theme', 'Technical precision', 'Status clarity', 'Fast feedback'],
    metrics: { deploymentStatus: 'always-visible', errorMessages: 'actionable' },
  },
  consumer: {
    name: 'Apple',
    traits: ['Premium feel', 'White space', 'Focus on hero', 'Minimal options'],
    metrics: { ctaPerPage: 1, heroImageQuality: 'high' },
  },
  ecommerce: {
    name: 'Shopify',
    traits: ['Product focus', 'Quick checkout', 'Trust badges', 'Mobile-first'],
    metrics: { productImageSize: 'large', addToCartClicks: 1, checkoutFields: 6 },
  },
  analytics: {
    name: 'Mixpanel',
    traits: ['Data visualization', 'Drill-down', 'Clear metrics', 'Exportable'],
    metrics: { chartsPerDashboard: 6, interactiveCharts: true },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION FRAMEWORK
// ═══════════════════════════════════════════════════════════════════════════════

export const EVALUATION_CRITERIA = {
  clarity: {
    weight: 0.3,
    questions: [
      'Is the purpose obvious within 3 seconds?',
      'Can a new user complete the primary action without instructions?',
      'Are labels clear and action-oriented?',
      'Is the visual hierarchy correct?',
    ],
  },
  efficiency: {
    weight: 0.25,
    questions: [
      'Is this the shortest path to the goal?',
      'Are there unnecessary steps that can be removed?',
      'Can any form fields be auto-filled or removed?',
      'Is information available when needed?',
    ],
  },
  simplicity: {
    weight: 0.25,
    questions: [
      'Can any element be removed without losing function?',
      "Is there visual noise that doesn't serve a purpose?",
      'Are there too many choices competing for attention?',
      'Is the cognitive load appropriate for the task?',
    ],
  },
  trust: {
    weight: 0.2,
    questions: [
      'Does this look professional/legitimate?',
      'Would this pass the screenshot test?',
      'Are prices, terms, and actions clearly visible?',
      'Does it feel polished or rushed?',
    ],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// REJECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

export const INSTANT_REJECTION_PATTERNS = [
  'Cognitive overload (too much information at once)',
  "Buried primary action (user can't find main CTA)",
  'Ambiguous labels ("Submit", "Continue" without context)',
  'Fear-inducing error states (scary red, no recovery path)',
  'Dark patterns (hidden costs, confusing unsubscribe)',
  'Dead ends (no navigation, no next action)',
  'Competing CTAs (multiple primary buttons)',
] as const;

export const STRONG_CONCERN_PATTERNS = [
  'Generic feeling ("could be any app")',
  'Inconsistent visual language within same page',
  'Walls of text without structure',
  'Too many steps for simple action',
  'Important information below the fold',
  'Missing loading states',
  'Missing error states',
  'Missing empty states',
] as const;
