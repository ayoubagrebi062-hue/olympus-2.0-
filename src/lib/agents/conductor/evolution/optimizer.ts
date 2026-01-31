/**
 * PROMPT OPTIMIZER
 * Phase 7 of OLYMPUS 50X - CRITICAL for Level 5 (AUTONOMOUS)
 *
 * Generates improved prompt variants based on performance analysis.
 * Uses LLM to suggest and create improvements.
 */

import type {
  PromptImprovement,
  PromptChange,
  AgentPerformanceAnalysis,
  MetaPattern,
  SuccessCriteria,
  EvolutionConfig,
} from './types';
import { DEFAULT_EVOLUTION_CONFIG } from './types';
import type { PromptService, PromptRecord } from '../prompts';
import { safeJsonParse } from '@/lib/core/safe-json';

// ============================================================================
// TYPES
// ============================================================================

interface LLMProvider {
  complete(options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  }): Promise<string>;
}

interface ExperimentResults {
  experiment: {
    control_prompt_id: string;
    variant_prompt_id: string;
    success_criteria: SuccessCriteria;
  };
  control: {
    avgQuality: number;
    avgTokens: number;
    sampleSize: number;
  };
  variant: {
    avgQuality: number;
    avgTokens: number;
    sampleSize: number;
  };
}

// ============================================================================
// PROMPT OPTIMIZER CLASS
// ============================================================================

export class PromptOptimizer {
  private llmProvider: LLMProvider;
  private promptService: PromptService;
  private patterns: MetaPattern[] = [];
  private config: EvolutionConfig;

  constructor(
    llmProvider: LLMProvider,
    promptService: PromptService,
    config?: Partial<EvolutionConfig>
  ) {
    this.llmProvider = llmProvider;
    this.promptService = promptService;
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Load learned patterns for optimization
   */
  async loadPatterns(patterns: MetaPattern[]): Promise<void> {
    this.patterns = patterns;
    console.log(`[PromptOptimizer] Loaded ${patterns.length} meta-patterns`);
  }

  /**
   * Generate improvement suggestion for an agent
   */
  async suggestImprovement(analysis: AgentPerformanceAnalysis): Promise<PromptImprovement | null> {
    // 1. Get current prompt
    const currentPrompt = await this.promptService.getPromptById(analysis.agentId);
    if (!currentPrompt) {
      console.warn(`[PromptOptimizer] No prompt found for ${analysis.agentId}`);
      return null;
    }

    // 2. Determine improvement type based on issues
    const improvementType = this.determineImprovementType(analysis);

    // 3. Apply meta-patterns if available
    const applicablePatterns = this.findApplicablePatterns(analysis);

    // 4. Generate improved prompt variant
    const variant = await this.generateVariant(
      currentPrompt.systemPrompt,
      analysis,
      improvementType,
      applicablePatterns
    );

    if (!variant) {
      console.warn(`[PromptOptimizer] Failed to generate variant for ${analysis.agentId}`);
      return null;
    }

    // 5. Create improvement suggestion
    return {
      agentId: analysis.agentId,
      currentPromptId: currentPrompt.id,
      currentVersion: currentPrompt.version,
      improvement: {
        type: improvementType,
        targetArea: this.identifyTargetArea(analysis),
        rationale: this.generateRationale(analysis, improvementType),
        expectedImpact: this.estimateImpact(analysis, improvementType),
      },
      variant: {
        promptText: variant.text,
        changes: variant.changes,
        confidence: variant.confidence,
      },
      testPlan: {
        trafficSplit: 20, // 20% traffic to new variant
        minSampleSize: this.config.thresholds.minBuildsSample,
        successCriteria: this.defineSuccessCriteria(analysis),
      },
    };
  }

  /**
   * Generate multiple variant suggestions with different strategies
   */
  async suggestMultipleVariants(
    analysis: AgentPerformanceAnalysis,
    count: number = 3
  ): Promise<PromptImprovement[]> {
    const suggestions: PromptImprovement[] = [];

    // Different improvement strategies
    const strategies: Array<'refine' | 'restructure' | 'expand' | 'simplify'> = [
      'refine',
      'restructure',
      'expand',
      'simplify',
    ];

    for (const strategy of strategies.slice(0, count)) {
      const modifiedAnalysis = {
        ...analysis,
        _forceStrategy: strategy,
      };

      const suggestion = await this.suggestImprovement(modifiedAnalysis as any);
      if (suggestion) {
        suggestion.improvement.type = strategy;
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Create and start A/B test for an improvement
   */
  async createExperiment(improvement: PromptImprovement): Promise<string> {
    // Create variant prompt in database
    const variantPrompt = await this.promptService.createPrompt({
      agentId: improvement.agentId,
      systemPrompt: improvement.variant.promptText,
      name: `${improvement.agentId} v${improvement.currentVersion + 1} (Optimized)`,
      changeNotes: improvement.improvement.rationale,
      metadata: {
        optimization: true,
        improvementType: improvement.improvement.type,
        expectedImpact: improvement.improvement.expectedImpact,
      },
    });

    // Create experiment
    const experimentId = await this.promptService.createExperiment(
      improvement.agentId,
      `Optimization: ${improvement.improvement.type}`,
      improvement.currentPromptId,
      [variantPrompt.id],
      {
        [improvement.currentPromptId]: 100 - improvement.testPlan.trafficSplit,
        [variantPrompt.id]: improvement.testPlan.trafficSplit,
      },
      {
        description: improvement.improvement.rationale,
        minSampleSize: improvement.testPlan.minSampleSize,
      }
    );

    // Start experiment
    await this.promptService.startExperiment(experimentId);

    // Update improvement with experiment ID
    improvement.testPlan.experimentId = experimentId;

    console.log(`[PromptOptimizer] Started experiment ${experimentId} for ${improvement.agentId}`);

    return experimentId;
  }

  /**
   * Evaluate experiment results and decide on promotion
   */
  async evaluateExperiment(experimentId: string): Promise<{
    shouldPromote: boolean;
    reason: string;
    metrics: ExperimentResults;
  }> {
    const results = await this.getExperimentResults(experimentId);

    const controlMetrics = results.control;
    const variantMetrics = results.variant;

    // Check if variant meets success criteria
    const qualityImprovement = variantMetrics.avgQuality - controlMetrics.avgQuality;
    const tokenChange =
      controlMetrics.avgTokens > 0
        ? (variantMetrics.avgTokens - controlMetrics.avgTokens) / controlMetrics.avgTokens
        : 0;
    const sampleSize = variantMetrics.sampleSize;

    const successCriteria = results.experiment.success_criteria;

    const meetsQuality = qualityImprovement >= successCriteria.minQualityImprovement;
    const meetsTokens = tokenChange <= successCriteria.maxTokenIncrease;
    const meetsSample = sampleSize >= successCriteria.minSampleSize;

    const shouldPromote = meetsQuality && meetsTokens && meetsSample;

    return {
      shouldPromote,
      reason: shouldPromote
        ? `Variant improved quality by ${qualityImprovement.toFixed(2)} points with acceptable token usage`
        : `Variant did not meet criteria: quality=${meetsQuality}, tokens=${meetsTokens}, samples=${meetsSample}`,
      metrics: results,
    };
  }

  /**
   * Promote winning variant to active
   */
  async promoteVariant(experimentId: string): Promise<void> {
    const results = await this.getExperimentResults(experimentId);

    // End experiment with winner
    await this.promptService.endExperiment(
      experimentId,
      results.experiment.variant_prompt_id,
      true // Promote winner
    );

    console.log(
      `[PromptOptimizer] Promoted variant ${results.experiment.variant_prompt_id} from experiment ${experimentId}`
    );
  }

  /**
   * Roll back a failed optimization
   */
  async rollbackExperiment(experimentId: string): Promise<void> {
    await this.promptService.cancelExperiment(experimentId);
    console.log(`[PromptOptimizer] Rolled back experiment ${experimentId}`);
  }

  // ==========================================================================
  // PRIVATE METHODS - IMPROVEMENT TYPE DETERMINATION
  // ==========================================================================

  private determineImprovementType(
    analysis: AgentPerformanceAnalysis
  ): 'refine' | 'restructure' | 'expand' | 'simplify' | 'specialize' {
    // Force strategy if specified (for multiple variants)
    if ((analysis as any)._forceStrategy) {
      return (analysis as any)._forceStrategy;
    }

    const { quality, efficiency, issues } = analysis;

    // High failure rate -> simplify
    if (efficiency.failureRate > 0.15) return 'simplify';

    // High volatility -> restructure for consistency
    if (quality.volatility > this.config.analysis.volatilityThreshold) return 'restructure';

    // Low completeness -> expand
    const completenessIssue = issues.find(i => i.description.toLowerCase().includes('complete'));
    if (completenessIssue) return 'expand';

    // Low creativity/no high scores -> specialize
    if (quality.scoreDistribution['9-10'] === 0 && quality.averageScore > 6) return 'specialize';

    // Default -> refine
    return 'refine';
  }

  private findApplicablePatterns(analysis: AgentPerformanceAnalysis): MetaPattern[] {
    return this.patterns.filter(pattern => {
      // Check if any issue matches pattern trigger
      return analysis.issues.some(issue => issue.type === pattern.trigger.issueType);
    });
  }

  // ==========================================================================
  // PRIVATE METHODS - VARIANT GENERATION
  // ==========================================================================

  private async generateVariant(
    currentPrompt: string,
    analysis: AgentPerformanceAnalysis,
    improvementType: string,
    patterns: MetaPattern[]
  ): Promise<{ text: string; changes: PromptChange[]; confidence: number } | null> {
    const prompt = this.buildOptimizationPrompt(currentPrompt, analysis, improvementType, patterns);

    try {
      const response = await this.llmProvider.complete({
        model: 'sonnet',
        messages: [
          { role: 'system', content: OPTIMIZER_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      });

      return this.parseOptimizationResponse(response, currentPrompt);
    } catch (error) {
      console.error('[PromptOptimizer] Failed to generate variant:', error);
      return null;
    }
  }

  private buildOptimizationPrompt(
    currentPrompt: string,
    analysis: AgentPerformanceAnalysis,
    improvementType: string,
    patterns: MetaPattern[]
  ): string {
    const improvementGuidelines = this.getImprovementGuidelines(improvementType);

    return `
## Task: Optimize Agent Prompt

### Agent: ${analysis.agentId}

### Current Performance
- Average Quality Score: ${analysis.quality.averageScore}/10
- Trend: ${analysis.quality.trend}
- Failure Rate: ${(analysis.efficiency.failureRate * 100).toFixed(1)}%
- Retry Rate: ${(analysis.efficiency.retryRate * 100).toFixed(1)}%
- Score Distribution: ${JSON.stringify(analysis.quality.scoreDistribution)}

### Issues Detected
${analysis.issues.map(i => `- [${i.severity.toUpperCase()}] ${i.description}\n  Suggested fix: ${i.suggestedFix}`).join('\n')}

### Improvement Type: ${improvementType.toUpperCase()}
${improvementGuidelines}

### Learned Patterns to Apply
${patterns.length > 0 ? patterns.map(p => `- ${p.name}: ${p.action.promptModification}`).join('\n') : 'No specific patterns - use general optimization principles'}

### Current Prompt
\`\`\`
${currentPrompt}
\`\`\`

### Instructions

Generate an improved version of this prompt. Your response must be valid JSON:

\`\`\`json
{
  "improved_prompt": "The full improved prompt text...",
  "changes": [
    {
      "section": "Which part changed",
      "before": "What it was (brief excerpt)",
      "after": "What it is now (brief excerpt)",
      "reason": "Why this change helps"
    }
  ],
  "confidence": 0.8,
  "expected_improvement": "What specific metrics should improve and why"
}
\`\`\`

IMPORTANT:
- Focus on changes that directly address the detected issues
- Preserve what's working well
- The improved_prompt must be complete and ready to use
- Be specific in your changes - vague improvements don't help
- Keep the agent's core purpose intact
`;
  }

  private getImprovementGuidelines(improvementType: string): string {
    const guidelines: Record<string, string> = {
      refine: `
REFINE: Make targeted improvements to specific sections.
- Improve clarity of ambiguous instructions
- Add specificity where needed
- Fix inconsistencies
- Don't change the overall structure`,

      restructure: `
RESTRUCTURE: Reorganize the prompt for better consistency.
- Add clear section headers
- Improve logical flow
- Define output format precisely
- Create consistent instruction patterns`,

      expand: `
EXPAND: Add more detail, examples, and edge case handling.
- Add 2-3 concrete examples
- Cover edge cases explicitly
- Provide more context
- Add guidance for difficult scenarios`,

      simplify: `
SIMPLIFY: Reduce complexity and ambiguity.
- Remove redundant instructions
- Use simpler language
- Reduce cognitive load
- Focus on core requirements only`,

      specialize: `
SPECIALIZE: Add domain-specific knowledge and techniques.
- Include expert-level guidance
- Add specialized terminology
- Reference best practices
- Include quality benchmarks`,
    };

    return guidelines[improvementType] || guidelines['refine'];
  }

  private parseOptimizationResponse(
    response: string,
    currentPrompt: string
  ): { text: string; changes: PromptChange[]; confidence: number } | null {
    try {
      // Extract JSON from response
      // FIX 3.3: Define expected structure for type safety
      interface ParsedOptimization {
        improved_prompt?: string;
        changes?: PromptChange[];
        confidence?: number;
      }

      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        // Try to find raw JSON
        const rawJsonMatch = response.match(/\{[\s\S]*"improved_prompt"[\s\S]*\}/);
        if (!rawJsonMatch) return null;

        // FIX 3.3: Use safeJsonParse to prevent prototype pollution
        const parsed = safeJsonParse<ParsedOptimization>(rawJsonMatch[0]);
        return {
          text: parsed.improved_prompt || currentPrompt,
          changes: parsed.changes || [],
          confidence: parsed.confidence || 0.5,
        };
      }

      // FIX 3.3: Use safeJsonParse to prevent prototype pollution
      const parsed = safeJsonParse<ParsedOptimization>(jsonMatch[1]);

      return {
        text: parsed.improved_prompt || currentPrompt,
        changes: parsed.changes || [],
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      console.error('[PromptOptimizer] Failed to parse response:', error);
      return null;
    }
  }

  // ==========================================================================
  // PRIVATE METHODS - IMPROVEMENT METADATA
  // ==========================================================================

  private identifyTargetArea(analysis: AgentPerformanceAnalysis): string {
    if (analysis.issues.length > 0) {
      return analysis.issues[0].description;
    }
    if (analysis.quality.trend === 'declining') {
      return 'Quality trend reversal';
    }
    if (analysis.efficiency.failureRate > 0.05) {
      return 'Reliability improvement';
    }
    return 'General optimization';
  }

  private generateRationale(analysis: AgentPerformanceAnalysis, improvementType: string): string {
    const issuesSummary =
      analysis.issues.length > 0
        ? analysis.issues
            .slice(0, 3)
            .map(i => i.description)
            .join('; ')
        : 'general quality improvement';

    return `${improvementType.charAt(0).toUpperCase() + improvementType.slice(1)} optimization to address: ${issuesSummary}. Current score: ${analysis.quality.averageScore}/10, Trend: ${analysis.quality.trend}`;
  }

  private estimateImpact(analysis: AgentPerformanceAnalysis, improvementType: string): number {
    // Base impact on current score gap from 10
    const gap = 10 - analysis.quality.averageScore;
    const baseImpact = Math.min(gap, 5);

    // Adjust by improvement type
    const typeMultiplier: Record<string, number> = {
      refine: 0.7,
      restructure: 0.9,
      expand: 0.8,
      simplify: 1.0, // Simplify often has biggest impact on failing agents
      specialize: 0.6,
    };

    // Adjust by number of issues
    const issueBonus = Math.min(analysis.issues.length * 0.2, 1);

    return Math.round(baseImpact * (typeMultiplier[improvementType] || 0.7) + issueBonus);
  }

  private defineSuccessCriteria(analysis: AgentPerformanceAnalysis): SuccessCriteria {
    // More aggressive criteria for worse-performing agents
    const minImprovement = analysis.quality.averageScore < 6 ? 0.5 : 0.3;

    return {
      minQualityImprovement: minImprovement,
      maxTokenIncrease: 0.15, // Max 15% more tokens
      minSampleSize: this.config.thresholds.minBuildsSample,
      confidenceLevel: 0.9,
    };
  }

  // ==========================================================================
  // PRIVATE METHODS - EXPERIMENT RESULTS
  // ==========================================================================

  private async getExperimentResults(experimentId: string): Promise<ExperimentResults> {
    const experiment = await this.promptService.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    // Get performance data for control
    const controlStats = await this.promptService.getPerformanceStats(experiment.controlPromptId);

    // Get performance data for variant (first variant)
    const variantId = experiment.variantPromptIds[0];
    const variantStats = await this.promptService.getPerformanceStats(variantId);

    return {
      experiment: {
        control_prompt_id: experiment.controlPromptId,
        variant_prompt_id: variantId,
        success_criteria: {
          minQualityImprovement: 0.3,
          maxTokenIncrease: 0.15,
          minSampleSize: experiment.minSampleSize || 10,
          confidenceLevel: 0.9,
        },
      },
      control: {
        avgQuality: controlStats.avgQualityScore || 0,
        avgTokens: controlStats.avgTokensUsed || 0,
        sampleSize: controlStats.count || 0,
      },
      variant: {
        avgQuality: variantStats.avgQualityScore || 0,
        avgTokens: variantStats.avgTokensUsed || 0,
        sampleSize: variantStats.count || 0,
      },
    };
  }
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const OPTIMIZER_SYSTEM_PROMPT = `You are an expert prompt engineer specializing in AI agent optimization for the OLYMPUS system.

Your task is to improve prompts based on performance data and detected issues.

Guidelines:
1. Make targeted, specific changes that address identified issues
2. Preserve what works well - don't change everything
3. Add clarity where there's ambiguity
4. Include examples where helpful (2-3 max)
5. Ensure output format is well-defined with clear schema
6. Consider edge cases and failure modes
7. Keep prompts focused - remove redundancy
8. Use consistent instruction patterns

Quality principles:
- Every instruction should have a clear purpose
- Output format should be unambiguous
- Error handling should be explicit
- Complex tasks need step-by-step guidance

Your improvements must directly address the issues identified in the analysis.
Be specific and actionable - vague improvements don't help.`;
