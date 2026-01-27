/**
 * OLYMPUS 2.1 - UX_CRITIC Agent Definition & System Prompt
 */

import {
  AgentDefinition,
  UXCriticInput,
  UXCriticResult,
  UXCriticConcern,
  BENCHMARKS,
  EVALUATION_CRITERIA,
  INSTANT_REJECTION_PATTERNS,
} from './ux-critic-types';

// Re-export types
export * from './ux-critic-types';

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export const uxCriticAgent: AgentDefinition = {
  id: 'ux_critic',
  name: 'UX_CRITIC',
  description: 'Adversarial UX review - Compares against elite product standards',
  phase: 'validation',
  tier: 'opus',
  dependencies: ['pixel', 'wire'],
  optional: false,
  maxRetries: 2,
  timeout: 120000,

  outputSchema: {
    type: 'object',
    required: ['verdict', 'overallScore', 'scores', 'concerns'],
    properties: {
      verdict: { type: 'string', enum: ['APPROVED', 'NEEDS_WORK', 'REJECTED'] },
      overallScore: { type: 'number', minimum: 1, maximum: 5 },
      benchmark: { type: 'string' },
      scores: {
        type: 'object',
        properties: {
          clarity: { type: 'object' },
          efficiency: { type: 'object' },
          simplicity: { type: 'object' },
          trust: { type: 'object' },
        },
      },
      praise: { type: 'array', items: { type: 'string' } },
      concerns: { type: 'array', items: { type: 'object' } },
      verdictReasoning: { type: 'string' },
    },
  },

  systemPrompt: `You are UX_CRITIC, the adversarial reviewer. You exist to find flaws.

═══════════════════════════════════════════════════════════════════════════
PRIME DIRECTIVE: TECHNICALLY VALID ≠ GOOD
═══════════════════════════════════════════════════════════════════════════

The code has ALREADY PASSED all technical validators:
- Design tokens: VALID
- Layout grammar: VALID
- Component registry: VALID
- Motion system: VALID
- Accessibility: VALID

Your job is different. You evaluate QUALITY and TASTE.
A UI can pass all rules and still be mediocre.
Your job is to prevent mediocrity from shipping.

═══════════════════════════════════════════════════════════════════════════
YOUR EVALUATION FRAMEWORK
═══════════════════════════════════════════════════════════════════════════

For EVERY screen, score these dimensions:

CLARITY (Weight: 30%)
□ Is the purpose obvious within 3 seconds?
□ Can a new user complete the primary action without instructions?
□ Are labels clear and action-oriented?
□ Is the visual hierarchy correct? (most important = most prominent)

EFFICIENCY (Weight: 25%)
□ Is this the shortest path to the goal?
□ Are there unnecessary steps that can be removed?
□ Can any form fields be auto-filled or removed?
□ Is information available when needed? (no hunting)

SIMPLICITY (Weight: 25%)
□ Can any element be removed without losing function?
□ Is there visual noise that doesn't serve a purpose?
□ Are there too many choices competing for attention?
□ Is the cognitive load appropriate for the task?

TRUST (Weight: 20%)
□ Does this look professional/legitimate?
□ Would this pass the "screenshot test"? (show someone for 2 seconds)
□ Are prices, terms, and actions clearly visible?
□ Does it feel polished or rushed?

═══════════════════════════════════════════════════════════════════════════
BENCHMARK COMPARISON
═══════════════════════════════════════════════════════════════════════════

Compare against elite products:

BENCHMARKS BY DOMAIN:
- Payment/Checkout: Stripe
- Project Management: Linear
- Productivity: Notion
- Developer Tools: Vercel
- Consumer: Apple
- E-commerce: Shopify
- Analytics: Mixpanel

SCORING (per criterion):
1 = Significantly worse than benchmark
2 = Somewhat worse than benchmark
3 = Comparable to benchmark (MINIMUM TO PASS)
4 = Slightly better than benchmark
5 = Significantly better (rare)

OVERALL MINIMUM TO PASS: 3.0 average

═══════════════════════════════════════════════════════════════════════════
AUTOMATIC REJECTION PATTERNS
═══════════════════════════════════════════════════════════════════════════

INSTANT REJECTION (any of these):
- Cognitive overload (too much information at once)
- Buried primary action (user can't find main CTA)
- Ambiguous labels ("Submit", "Continue" without context)
- Fear-inducing error states (scary red, no recovery path)
- Dark patterns (hidden costs, confusing unsubscribe)
- Dead ends (no navigation, no next action)
- Competing CTAs (multiple primary buttons)

STRONG CONCERNS (accumulate to rejection):
- Generic feeling ("could be any app")
- Inconsistent visual language within same page
- Walls of text without structure
- Too many steps for simple action
- Important information below the fold
- Missing loading/error/empty states

═══════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON)
═══════════════════════════════════════════════════════════════════════════

{
  "verdict": "APPROVED" | "NEEDS_WORK" | "REJECTED",
  "overallScore": 3.4,
  "benchmark": "Comparable to Linear, slightly below Stripe",
  "scores": {
    "clarity": { "score": 4, "reasoning": "..." },
    "efficiency": { "score": 3, "reasoning": "..." },
    "simplicity": { "score": 3, "reasoning": "..." },
    "trust": { "score": 4, "reasoning": "..." }
  },
  "praise": [
    "Specific thing done well with explanation"
  ],
  "concerns": [
    {
      "severity": "high" | "medium" | "low",
      "screen": "checkout",
      "observation": "What you see",
      "problem": "Why it's bad for users",
      "evidence": "UX principle or benchmark comparison",
      "recommendation": "Specific fix"
    }
  ],
  "verdictReasoning": "Why you made this decision"
}

═══════════════════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════════════════

1. YOU ARE NOT HERE TO BE NICE
   - Don't soften criticism
   - Don't use "might" or "could"
   - State problems directly

2. EVERY CONCERN NEEDS EVIDENCE
   - Reference UX principles (Hick's Law, Fitts's Law, etc.)
   - Compare to specific benchmark products
   - Cite research if applicable

3. RECOMMENDATIONS MUST BE SPECIFIC
   - NOT "improve the checkout"
   - YES "Reduce checkout to 3 steps: Shipping → Payment → Confirm"

4. PRAISE MUST BE EARNED
   - Don't praise just to balance criticism
   - Only praise what's genuinely above benchmark

YOU EXIST TO MAKE IT GREAT, NOT TO APPROVE IT.`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate weighted overall score from individual scores
 */
export function calculateOverallScore(scores: UXCriticResult['scores']): number {
  const weights = EVALUATION_CRITERIA;
  const weighted =
    scores.clarity.score * weights.clarity.weight +
    scores.efficiency.score * weights.efficiency.weight +
    scores.simplicity.score * weights.simplicity.weight +
    scores.trust.score * weights.trust.weight;
  return Math.round(weighted * 10) / 10;
}

/**
 * Determine verdict from score
 */
export function determineVerdict(score: number): UXCriticResult['verdict'] {
  if (score >= 3.5) return 'APPROVED';
  if (score >= 3.0) return 'NEEDS_WORK';
  return 'REJECTED';
}

/**
 * Get appropriate benchmark for page type
 */
export function getBenchmarkForPageType(pageType: string): keyof typeof BENCHMARKS {
  const mapping: Record<string, keyof typeof BENCHMARKS> = {
    checkout: 'payment',
    payment: 'payment',
    billing: 'payment',
    dashboard: 'analytics',
    analytics: 'analytics',
    metrics: 'analytics',
    project: 'projectManagement',
    tasks: 'projectManagement',
    issues: 'projectManagement',
    docs: 'productivity',
    notes: 'productivity',
    editor: 'productivity',
    deploy: 'devTools',
    settings: 'devTools',
    config: 'devTools',
    landing: 'consumer',
    marketing: 'consumer',
    home: 'consumer',
    product: 'ecommerce',
    cart: 'ecommerce',
    shop: 'ecommerce',
  };

  const lower = pageType.toLowerCase();
  for (const [key, value] of Object.entries(mapping)) {
    if (lower.includes(key)) return value;
  }
  return 'consumer'; // default
}

/**
 * Check for instant rejection patterns in code
 */
export function checkInstantRejectionPatterns(code: string): string[] {
  const detected: string[] = [];

  // Multiple primary CTAs
  const primaryButtons = (code.match(/variant=["']primary["']/g) || []).length;
  if (primaryButtons > 1) {
    detected.push('Competing CTAs (multiple primary buttons)');
  }

  // No navigation elements
  const hasNav = code.includes('<nav') || code.includes('Navbar') || code.includes('Sidebar');
  const hasBack = code.includes('back') || code.includes('Back') || code.includes('←');
  if (!hasNav && !hasBack && code.includes('page')) {
    detected.push('Dead ends (no navigation, no next action)');
  }

  // Generic labels
  const genericLabels = ['Submit', 'Continue', 'Click here', 'Next'];
  for (const label of genericLabels) {
    if (code.includes(`>${label}<`)) {
      detected.push(`Ambiguous labels ("${label}" without context)`);
      break;
    }
  }

  return detected;
}

/**
 * Format UX_CRITIC result for CLI display
 */
export function formatUXCriticResult(result: UXCriticResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('╭─────────────────────────────────────────────────────────────╮');
  lines.push('│ 🎯 UX CRITIC REVIEW                                        │');
  lines.push('╰─────────────────────────────────────────────────────────────╯');
  lines.push('');

  // Verdict
  const verdictIcon = result.verdict === 'APPROVED' ? '✓' : result.verdict === 'NEEDS_WORK' ? '⚠' : '✗';
  lines.push(`  Verdict: ${verdictIcon} ${result.verdict}`);
  lines.push(`  Score: ${result.overallScore}/5 (${result.benchmark})`);
  lines.push('');

  // Scores
  const scoreBar = (score: number) => '█'.repeat(score) + '░'.repeat(5 - score);
  lines.push(`  Clarity:    [${scoreBar(result.scores.clarity.score)}] ${result.scores.clarity.score}/5`);
  lines.push(`              "${result.scores.clarity.reasoning}"`);
  lines.push(`  Efficiency: [${scoreBar(result.scores.efficiency.score)}] ${result.scores.efficiency.score}/5`);
  lines.push(`              "${result.scores.efficiency.reasoning}"`);
  lines.push(`  Simplicity: [${scoreBar(result.scores.simplicity.score)}] ${result.scores.simplicity.score}/5`);
  lines.push(`              "${result.scores.simplicity.reasoning}"`);
  lines.push(`  Trust:      [${scoreBar(result.scores.trust.score)}] ${result.scores.trust.score}/5`);
  lines.push(`              "${result.scores.trust.reasoning}"`);
  lines.push('');

  // Praise
  if (result.praise.length > 0) {
    lines.push('  ✓ Praise:');
    for (const p of result.praise) {
      lines.push(`    • ${p}`);
    }
    lines.push('');
  }

  // Concerns
  if (result.concerns.length > 0) {
    lines.push('  ⚠ Concerns:');
    for (const c of result.concerns) {
      const icon = c.severity === 'high' ? '🔴' : c.severity === 'medium' ? '🟡' : '🟢';
      lines.push(`    ${icon} [${c.screen}] ${c.observation}`);
      lines.push(`       Problem: ${c.problem}`);
      lines.push(`       Fix: ${c.recommendation}`);
    }
    lines.push('');
  }

  lines.push(`  Reasoning: ${result.verdictReasoning}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Create a prompt for the UX_CRITIC agent
 */
export function createUXCriticPrompt(input: UXCriticInput): string {
  const benchmark = getBenchmarkForPageType(input.pageType);
  const benchmarkInfo = BENCHMARKS[benchmark];

  return `
## TASK
Review this ${input.pageType} UI for quality and taste.
Compare against ${benchmarkInfo.name}.

## PAGE DESCRIPTION
${input.description}

## CODE TO REVIEW
\`\`\`tsx
${input.code}
\`\`\`

## BENCHMARK: ${benchmarkInfo.name}
Key traits: ${benchmarkInfo.traits.join(', ')}

## YOUR REVIEW
Provide your evaluation in the JSON format specified in your instructions.
Be direct. Be specific. Find the flaws.
`;
}
