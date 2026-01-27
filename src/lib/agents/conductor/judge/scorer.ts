/**
 * Quality Scorer
 *
 * Uses an LLM to evaluate agent output quality across multiple dimensions.
 * Supports both full LLM scoring (for critical agents) and quick heuristic scoring.
 */

import type { QualityScore, QualityDimensions, ScoringContext, AgentOutputForJudge } from './types';
import type { AIRouter } from '../../providers/router';
import type { AIRequest } from '../../providers/types';
import { safeJsonParse } from '@/lib/utils/safe-json';

// ============================================================================
// CONSTANTS
// ============================================================================

const SCORING_SYSTEM_PROMPT = `You are a Quality Judge for an AI code generation system.

Your job is to objectively score agent outputs across 5 dimensions.

Be STRICT but FAIR:
- Score 1-3: Unacceptable, major issues
- Score 4-5: Below average, significant gaps
- Score 6-7: Acceptable, meets basic requirements
- Score 8-9: Good, exceeds expectations
- Score 10: Exceptional, world-class

Never give 10 unless truly exceptional.
Never give 1 unless completely broken.

Be consistent across evaluations.`;

// ============================================================================
// QUALITY SCORER CLASS
// ============================================================================

export class QualityScorer {
  private aiRouter: AIRouter | null;
  private scoringModel: string;

  constructor(aiRouter?: AIRouter, model: string = 'sonnet') {
    this.aiRouter = aiRouter || null;
    this.scoringModel = model;
  }

  /**
   * Score an agent's output using LLM
   */
  async score(
    agentId: string,
    output: AgentOutputForJudge,
    context: ScoringContext
  ): Promise<QualityScore> {
    // If no AI router, fall back to quick scoring
    if (!this.aiRouter) {
      console.warn('[QualityScorer] No AI router available, using quick scoring');
      return this.quickScore(agentId, output);
    }

    try {
      const prompt = this.buildScoringPrompt(agentId, output, context);

      const request: AIRequest = {
        messages: [
          {
            role: 'system',
            content: SCORING_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: this.scoringModel,
        temperature: 0.2, // Low temperature for consistent scoring
        maxTokens: 500,
        metadata: {
          agentId: 'judge-scorer',
          phase: 'quality-check',
        },
      };

      const response = await this.aiRouter.execute('judge-scorer', request);
      if (!response.response) {
        throw new Error(response.error || 'No response from AI router');
      }
      return this.parseScoreResponse(response.response.content);
    } catch (error) {
      console.error('[QualityScorer] LLM scoring failed, falling back to quick score:', error);
      return this.quickScore(agentId, output);
    }
  }

  /**
   * Quick score without full LLM call (for non-critical agents)
   */
  quickScore(agentId: string, output: AgentOutputForJudge): QualityScore {
    const dimensions: QualityDimensions = {
      completeness: this.scoreCompleteness(output),
      correctness: this.scoreCorrectness(output),
      consistency: 7, // Default, can't assess without context
      creativity: 7, // Default
      clarity: this.scoreClarity(output),
    };

    const overall = this.calculateOverallScore(dimensions);

    return {
      overall: Math.round(overall * 10) / 10,
      dimensions,
      confidence: 0.6, // Lower confidence for quick scoring
      timestamp: new Date(),
      reasoning: 'Quick heuristic scoring',
    };
  }

  /**
   * Build the scoring prompt for the LLM
   */
  private buildScoringPrompt(
    agentId: string,
    output: AgentOutputForJudge,
    context: ScoringContext
  ): string {
    const previousOutputsStr =
      context.previousOutputs.length > 0
        ? context.previousOutputs
            .map(o => `- ${o.agentId}: ${JSON.stringify(o.summary).substring(0, 200)}`)
            .join('\n')
        : 'None yet';

    const outputStr = output.data
      ? JSON.stringify(output.data, null, 2).substring(0, 3000)
      : 'No data';

    return `## Task: Score Agent Output Quality

### Agent Information
- Agent ID: ${agentId}
- Agent Role: ${context.agentRole}
- Expected Output Type: ${context.expectedOutputType}

### Previous Agent Outputs (for consistency check)
${previousOutputsStr}

### Current Output to Score
\`\`\`json
${outputStr}
\`\`\`

### Scoring Criteria

Score each dimension from 1-10:

1. **COMPLETENESS** (1-10)
   - Does it include all required fields?
   - Are there any obvious gaps?
   - Is the depth of information sufficient?

2. **CORRECTNESS** (1-10)
   - Is the information technically accurate?
   - Are there any logical errors?
   - Does the code/design follow best practices?

3. **CONSISTENCY** (1-10)
   - Does it align with previous agent outputs?
   - Are naming conventions consistent?
   - Does it build upon (not contradict) prior decisions?

4. **CREATIVITY** (1-10)
   - Is the solution innovative or just basic?
   - Are there clever optimizations?
   - Does it go beyond the minimum requirements?

5. **CLARITY** (1-10)
   - Is the output well-structured?
   - Is it easy to understand?
   - Are explanations clear?

### Output Format

Respond with ONLY a JSON object:
\`\`\`json
{
  "overall": <number>,
  "dimensions": {
    "completeness": <number>,
    "correctness": <number>,
    "consistency": <number>,
    "creativity": <number>,
    "clarity": <number>
  },
  "confidence": <number 0-1>,
  "reasoning": "<brief explanation>"
}
\`\`\``;
  }

  /**
   * Parse the LLM's scoring response
   */
  private parseScoreResponse(response: string): QualityScore {
    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[QualityScorer] No JSON found in response, using defaults');
      return this.getDefaultScore();
    }

    interface ParsedScore {
      overall: number;
      dimensions: QualityDimensions;
      confidence?: number;
      reasoning?: string;
    }

    const parsed = safeJsonParse<ParsedScore | null>(
      jsonMatch[0],
      null,
      'judge:scorer:parseResponse'
    );

    if (!parsed) {
      console.warn('[QualityScorer] Failed to parse JSON, using defaults');
      return this.getDefaultScore();
    }

    // Validate and clamp scores
    const clamp = (n: number) => Math.max(1, Math.min(10, n || 5));

    return {
      overall: clamp(parsed.overall),
      dimensions: {
        completeness: clamp(parsed.dimensions?.completeness),
        correctness: clamp(parsed.dimensions?.correctness),
        consistency: clamp(parsed.dimensions?.consistency),
        creativity: clamp(parsed.dimensions?.creativity),
        clarity: clamp(parsed.dimensions?.clarity),
      },
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.8)),
      timestamp: new Date(),
      reasoning: parsed.reasoning,
    };
  }

  /**
   * Calculate overall score from dimensions
   */
  private calculateOverallScore(dimensions: QualityDimensions): number {
    // Weighted average - correctness and completeness matter more
    const weights = {
      completeness: 1.2,
      correctness: 1.3,
      consistency: 1.0,
      creativity: 0.8,
      clarity: 0.9,
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    const weightedSum = Object.entries(dimensions).reduce((sum, [key, value]) => {
      return sum + value * weights[key as keyof typeof weights];
    }, 0);

    return weightedSum / totalWeight;
  }

  /**
   * Score completeness heuristically
   */
  private scoreCompleteness(output: AgentOutputForJudge): number {
    if (!output.data) return 1;

    const data = output.data;
    const fields = Object.keys(data);

    if (fields.length === 0) return 2;
    if (fields.length < 3) return 4;
    if (fields.length < 5) return 6;
    if (fields.length < 10) return 7;

    // Check for empty values
    const emptyCount = fields.filter(k => {
      const v = data[k];
      return v === null || v === undefined || (Array.isArray(v) && v.length === 0);
    }).length;

    const emptyRatio = emptyCount / fields.length;
    if (emptyRatio > 0.5) return 4;
    if (emptyRatio > 0.2) return 6;

    return 8;
  }

  /**
   * Score correctness heuristically
   */
  private scoreCorrectness(output: AgentOutputForJudge): number {
    if (!output.data) return 1;

    const str = JSON.stringify(output.data);

    // Check for common error patterns
    let score = 7;

    // Undefined/null values in output
    if (str.includes('"undefined"') || str.includes(': null')) {
      score -= 1;
    }

    // TODO markers suggest incomplete work
    if (str.includes('TODO') || str.includes('FIXME')) {
      score -= 1;
    }

    // Placeholder text
    if (str.includes('Lorem ipsum') || str.includes('placeholder') || str.includes('example')) {
      score -= 1;
    }

    // Empty strings
    if (str.includes('""') && str.split('""').length > 3) {
      score -= 1;
    }

    return Math.max(1, score);
  }

  /**
   * Score clarity heuristically
   */
  private scoreClarity(output: AgentOutputForJudge): number {
    if (!output.data) return 1;

    const str = JSON.stringify(output.data, null, 2);

    // Too short = probably incomplete
    if (str.length < 100) return 4;

    // Too verbose = hard to understand
    if (str.length > 50000) return 5;

    // Very long string values suggest unstructured content
    const longStrings = (str.match(/".{500,}"/g) || []).length;
    if (longStrings > 3) return 5;

    // Well-structured with reasonable depth
    const depth = (str.match(/\n/g) || []).length;
    if (depth < 5) return 5;
    if (depth > 500) return 6;

    return 7;
  }

  /**
   * Get default score when parsing fails
   */
  private getDefaultScore(): QualityScore {
    return {
      overall: 5,
      dimensions: {
        completeness: 5,
        correctness: 5,
        consistency: 5,
        creativity: 5,
        clarity: 5,
      },
      confidence: 0.3,
      timestamp: new Date(),
      reasoning: 'Default score - unable to assess',
    };
  }
}
