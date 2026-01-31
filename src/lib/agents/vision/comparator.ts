/**
 * OLYMPUS 50X - Visual Comparator
 *
 * Uses Claude Vision to compare generated output against design standards.
 * Provides quality scores and improvement feedback.
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================
// TYPES
// ============================================

export interface ComparisonResult {
  score: number; // 0-100
  passed: boolean; // score >= threshold
  feedback: string[]; // Specific issues found
  improvements: string[]; // Suggested fixes
  categories: {
    design: number; // Design system compliance
    layout: number; // Layout and spacing
    typography: number; // Text hierarchy
    interaction: number; // Interactive elements
    accessibility: number; // A11y considerations
  };
  summary: string;
}

export interface CompareOptions {
  threshold?: number; // Minimum passing score (default 85)
  detailed?: boolean; // Include detailed category scores
  requirements?: string; // Additional requirements to check
}

// ============================================
// DESIGN STANDARDS PROMPT
// ============================================

const DESIGN_STANDARDS = `
OLYMPUS 50X DESIGN STANDARDS:

COLOR PALETTE:
- Background: #0a0a0a (primary dark), #0d0d0d (cards), #141414 (elevated)
- Text: white (primary), white/60 (secondary), white/40 (muted)
- Brand: violet-600 (#7c3aed), violet-500 (#8b5cf6), purple-600
- Borders: white/10 (default), white/20 (hover)
- NO generic blue-500 or default colors

EFFECTS:
- Glassmorphism: bg-white/[0.03] backdrop-blur-xl border border-white/10
- Glow: shadow-[0_0_50px_rgba(124,58,237,0.3)]
- Gradients: from-violet-600 to-purple-600

TYPOGRAPHY:
- Hero: 72px (text-7xl) font-bold tracking-tight
- H1: 48px (text-5xl) font-bold
- H2: 36px (text-4xl) font-bold
- H3: 24px (text-2xl) font-semibold
- Body: 16px (text-base)
- Proper hierarchy with clear visual distinction

SPACING:
- Consistent padding/margins
- Proper visual breathing room
- Section padding: py-20
- Component padding: p-4 to p-6

INTERACTIONS:
- ALL buttons must have visible hover states
- Transitions on interactive elements
- Focus states for accessibility
- Loading states where appropriate

LAYOUT:
- Proper visual hierarchy
- Balanced composition
- Responsive considerations
- Max-width containers

QUALITY TIERS:
- 90-100: Exceptional, Vercel/Linear quality
- 80-89: Good, production ready
- 70-79: Average, needs polish
- Below 70: Generic AI output, needs significant work
`;

// ============================================
// VISUAL COMPARATOR
// ============================================

export class VisualComparator {
  private anthropic: Anthropic;
  private model: string;

  constructor(options: { model?: string } = {}) {
    this.anthropic = new Anthropic();
    this.model = options.model || 'claude-sonnet-4-20250514';
  }

  /**
   * Compare generated output against design standards
   */
  async compare(
    generated: Buffer,
    reference?: Buffer,
    options: CompareOptions = {}
  ): Promise<ComparisonResult> {
    const { threshold = 85, detailed = true, requirements } = options;

    // Build image content
    const images: Anthropic.ImageBlockParam[] = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: generated.toString('base64'),
        },
      },
    ];

    // Add reference image if provided
    if (reference) {
      images.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: reference.toString('base64'),
        },
      });
    }

    // Build prompt
    const prompt = this.buildPrompt(!!reference, requirements, detailed);

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [...images, { type: 'text', text: prompt }],
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';

      // Parse response
      return this.parseResponse(text, threshold);
    } catch (error) {
      console.error('[VisualComparator] Comparison failed:', error);

      // Return failure result
      return {
        score: 0,
        passed: false,
        feedback: [`Vision comparison failed: ${(error as Error).message}`],
        improvements: ['Retry the visual validation'],
        categories: {
          design: 0,
          layout: 0,
          typography: 0,
          interaction: 0,
          accessibility: 0,
        },
        summary: 'Visual comparison failed due to an error.',
      };
    }
  }

  /**
   * Quick quality check without detailed feedback
   */
  async quickCheck(screenshot: Buffer): Promise<{ score: number; passed: boolean }> {
    const result = await this.compare(screenshot, undefined, {
      threshold: 85,
      detailed: false,
    });

    return {
      score: result.score,
      passed: result.passed,
    };
  }

  /**
   * Compare two versions of the same component
   */
  async compareVersions(
    before: Buffer,
    after: Buffer
  ): Promise<{
    improved: boolean;
    scoreDelta: number;
    beforeScore: number;
    afterScore: number;
    changes: string[];
  }> {
    const [beforeResult, afterResult] = await Promise.all([
      this.compare(before),
      this.compare(after),
    ]);

    return {
      improved: afterResult.score > beforeResult.score,
      scoreDelta: afterResult.score - beforeResult.score,
      beforeScore: beforeResult.score,
      afterScore: afterResult.score,
      changes: afterResult.improvements,
    };
  }

  /**
   * Build comparison prompt
   */
  private buildPrompt(hasReference: boolean, requirements?: string, detailed?: boolean): string {
    if (hasReference) {
      return `You are a senior UI/UX designer reviewing generated output.

IMAGE 1: Generated output (what the AI created)
IMAGE 2: Reference design (what it should look like)

${DESIGN_STANDARDS}

${requirements ? `ADDITIONAL REQUIREMENTS:\n${requirements}\n` : ''}

Compare the generated output to the reference design and evaluate:

1. OVERALL SCORE (0-100): How well does the generated output match the reference?
   Consider: colors, layout, spacing, typography, effects, overall feel

2. CATEGORY SCORES (0-100 each):
   - design: Brand colors, effects, visual style
   - layout: Structure, alignment, spacing
   - typography: Font sizes, weights, hierarchy
   - interaction: Buttons, hover states, focus indicators
   - accessibility: Contrast, labels, semantic structure

3. FEEDBACK: List specific differences and issues

4. IMPROVEMENTS: What code changes would fix the issues

Respond in JSON format:
{
  "score": <overall 0-100>,
  "categories": {
    "design": <0-100>,
    "layout": <0-100>,
    "typography": <0-100>,
    "interaction": <0-100>,
    "accessibility": <0-100>
  },
  "feedback": ["<issue 1>", "<issue 2>"],
  "improvements": ["<fix 1>", "<fix 2>"],
  "summary": "<one paragraph assessment>"
}`;
    }

    return `You are a senior UI/UX designer reviewing generated UI output for a premium dark-mode web application.

${DESIGN_STANDARDS}

${requirements ? `ADDITIONAL REQUIREMENTS:\n${requirements}\n` : ''}

Evaluate this screenshot against the 50X design standards:

1. OVERALL SCORE (0-100):
   - 90-100: Exceptional, matches Vercel/Linear quality
   - 80-89: Good, production ready with minor tweaks
   - 70-79: Average, needs polish (missing animations, weak colors)
   - 60-69: Below average (generic AI look)
   - Below 60: Poor (wrong colors, broken layout)

${
  detailed
    ? `2. CATEGORY SCORES (0-100 each):
   - design: Does it use brand colors (violet/purple)? Has glassmorphism? Gradients?
   - layout: Proper spacing? Visual hierarchy? Balanced composition?
   - typography: Correct font sizes? Clear hierarchy? Good contrast?
   - interaction: Hover states visible? Transitions? Focus states?
   - accessibility: Good contrast? Readable text? Semantic structure?`
    : ''
}

3. FEEDBACK: List specific issues (be direct and specific)
   Examples: "Missing hover state on primary button", "Text contrast too low"

4. IMPROVEMENTS: Specific code/design changes needed
   Examples: "Add hover:-translate-y-1 transition-transform to button"

Respond in JSON format:
{
  "score": <0-100>,
  ${
    detailed
      ? `"categories": {
    "design": <0-100>,
    "layout": <0-100>,
    "typography": <0-100>,
    "interaction": <0-100>,
    "accessibility": <0-100>
  },`
      : ''
  }
  "feedback": ["<issue 1>", "<issue 2>"],
  "improvements": ["<fix 1>", "<fix 2>"],
  "summary": "<one paragraph assessment>"
}`;
  }

  /**
   * Parse LLM response into structured result
   */
  private parseResponse(text: string, threshold: number): ComparisonResult {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        score: result.score || 50,
        passed: (result.score || 50) >= threshold,
        feedback: result.feedback || [],
        improvements: result.improvements || [],
        categories: result.categories || {
          design: result.score || 50,
          layout: result.score || 50,
          typography: result.score || 50,
          interaction: result.score || 50,
          accessibility: result.score || 50,
        },
        summary: result.summary || 'Unable to generate summary.',
      };
    } catch (error) {
      console.error('[VisualComparator] Failed to parse response:', error);

      // Return default failure result
      return {
        score: 50,
        passed: false,
        feedback: ['Failed to parse vision comparison result'],
        improvements: ['Retry generation'],
        categories: {
          design: 50,
          layout: 50,
          typography: 50,
          interaction: 50,
          accessibility: 50,
        },
        summary: 'Vision comparison parsing failed.',
      };
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let comparatorInstance: VisualComparator | null = null;

/**
 * Get or create comparator instance
 */
export function getComparator(): VisualComparator {
  if (!comparatorInstance) {
    comparatorInstance = new VisualComparator();
  }
  return comparatorInstance;
}

/**
 * Quick visual quality check
 */
export async function checkVisualQuality(
  screenshot: Buffer,
  options: CompareOptions = {}
): Promise<ComparisonResult> {
  const comparator = getComparator();
  return comparator.compare(screenshot, undefined, options);
}

export default VisualComparator;
