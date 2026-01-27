/**
 * JUDGE MODULE
 *
 * Quality control brain for CONDUCTOR - scores, validates, and improves agent outputs.
 * Orchestrates QualityScorer, OutputValidator, and ImprovementSuggester.
 */

import { QualityScorer } from './scorer';
import { OutputValidator } from './validator';
import { ImprovementSuggester } from './improver';
import { SpecComplianceValidator } from './spec-compliance-validator';
import type { SpecRequirements, SpecComplianceResult } from '../../spec/types';
import type {
  JudgeConfig,
  JudgeContext,
  JudgeDecision,
  JudgeAction,
  QualityScore,
  QualityMetrics,
  QualityThreshold,
  QualityDimensions,
  AgentOutputForJudge,
  AgentDefinitionForJudge,
  ImprovementSuggestion,
} from './types';
import type { AIRouter } from '../../providers/router';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: JudgeConfig = {
  enabled: true,
  strictMode: false,
  autoRetry: true,
  thresholds: new Map(),
  scoringModel: 'sonnet',
};

const DEFAULT_THRESHOLD: Omit<QualityThreshold, 'agentId'> = {
  minOverallScore: 6,
  minDimensionScores: {
    completeness: 5,
    correctness: 5,
    consistency: 4,
    creativity: 3,
    clarity: 4,
  },
  criticalFields: [],
  maxRetries: 2,
};

// Critical agents have stricter thresholds
const CRITICAL_AGENTS = ['strategos', 'archon', 'pixel', 'datum', 'engine', 'wire'];

// Code-generating agents that should be checked for spec compliance
const SPEC_COMPLIANCE_AGENTS = ['pixel', 'wire', 'polish', 'forge', 'engine'];

// ============================================================================
// JUDGE MODULE CLASS
// ============================================================================

export class JudgeModule {
  private scorer: QualityScorer;
  private validator: OutputValidator;
  private improver: ImprovementSuggester;
  private specComplianceValidator: SpecComplianceValidator;
  private config: JudgeConfig;
  private metrics: Map<string, QualityMetrics>;

  constructor(aiRouter?: AIRouter, config?: Partial<JudgeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scorer = new QualityScorer(aiRouter, this.config.scoringModel);
    this.validator = new OutputValidator();
    this.improver = new ImprovementSuggester();
    this.specComplianceValidator = new SpecComplianceValidator();
    this.metrics = new Map();
  }

  /**
   * Initialize spec compliance validation with requirements
   */
  initializeSpecCompliance(spec: SpecRequirements): void {
    this.specComplianceValidator.initialize(spec);
  }

  // ==========================================================================
  // MAIN JUDGING METHODS
  // ==========================================================================

  /**
   * Full judgment of an agent output (with LLM scoring)
   */
  async judge(
    agentId: string,
    output: AgentOutputForJudge,
    definition: AgentDefinitionForJudge,
    context: JudgeContext
  ): Promise<JudgeDecision> {
    // Skip if disabled
    if (!this.config.enabled) {
      return this.createPassDecision(agentId, output);
    }

    // 1. Validate output structure
    const validation = this.validator.validate(agentId, output, definition);

    // 2. Score quality (uses LLM)
    const score = await this.scorer.score(agentId, output, {
      agentRole: context.agentRole,
      expectedOutputType: context.expectedOutputType,
      previousOutputs: context.previousOutputs,
    });

    // 3. Generate improvement suggestions
    const suggestions = this.improver.suggest(agentId, score, validation);

    // 4. Update metrics
    this.updateMetrics(agentId, context.buildId, score);

    // 4.5. Check spec compliance for code-generating agents
    let specComplianceResult: SpecComplianceResult | null = null;
    if (
      SPEC_COMPLIANCE_AGENTS.includes(agentId.toLowerCase()) &&
      this.specComplianceValidator.isInitialized()
    ) {
      // Extract generated files from output data (artifacts are stored in data)
      const generatedFiles = new Map<string, string>();
      const outputData = output.data as Record<string, unknown> | null;
      const artifacts =
        (outputData?.artifacts as Array<{ type: string; path?: string; content?: string }>) || [];

      for (const artifact of artifacts) {
        if (artifact.type === 'code' && artifact.path && artifact.content) {
          generatedFiles.set(artifact.path, artifact.content);
        }
      }

      if (generatedFiles.size > 0) {
        specComplianceResult = this.specComplianceValidator.validate(generatedFiles, agentId);

        // If compliance is low, force retry with spec compliance instructions
        if (specComplianceResult.overallCompliance < 90 && context.currentRetry < 2) {
          const missingPages = specComplianceResult.missing.criticalPages
            .map(p => p.path)
            .slice(0, 5);
          const missingComponents = specComplianceResult.missing.criticalComponents
            .map(c => c.name)
            .slice(0, 5);

          const complianceFeedback =
            `CRITICAL: Your output is missing required spec items. Generate these FIRST:\n` +
            `- Missing pages: ${missingPages.join(', ') || 'none'}\n` +
            `- Missing components: ${missingComponents.join(', ') || 'none'}\n` +
            `Current compliance: ${specComplianceResult.overallCompliance}%. Required: 90%.`;

          return {
            action: 'retry',
            score,
            validation,
            suggestions: [
              ...suggestions,
              {
                aspect: 'spec_compliance',
                currentState: `Spec compliance: ${specComplianceResult.overallCompliance}% (requires 90%)`,
                suggestedFix: `Generate missing items: ${missingPages.join(', ')} pages; ${missingComponents.join(', ')} components`,
                priority: 'high' as const,
                estimatedImpact: 10,
              },
            ],
            retryStrategy: {
              type: 'alternative' as const,
              modifiedPrompt: complianceFeedback,
              focusAreas: [...missingPages.slice(0, 3), ...missingComponents.slice(0, 3)],
              maxRetries: 2,
              currentRetry: context.currentRetry,
            },
          };
        }
      }
    }

    // 5. Determine action
    const action = this.determineAction(agentId, score, validation, context.currentRetry);

    // 6. Build decision
    const decision: JudgeDecision = {
      action,
      score,
      validation,
      suggestions,
    };

    // Add spec compliance result if available
    if (specComplianceResult) {
      (decision as any).specCompliance = specComplianceResult;
    }

    // Add retry strategy if needed
    if (action === 'retry' && this.config.autoRetry) {
      decision.retryStrategy = this.improver.determineRetryStrategy(
        agentId,
        score,
        validation,
        context.currentRetry
      );
    }

    return decision;
  }

  /**
   * Quick judgment without full LLM scoring (for non-critical agents)
   */
  quickJudge(
    agentId: string,
    output: AgentOutputForJudge,
    definition: AgentDefinitionForJudge,
    context: JudgeContext
  ): JudgeDecision {
    // Skip if disabled
    if (!this.config.enabled) {
      return this.createPassDecision(agentId, output);
    }

    // 1. Validate output structure
    const validation = this.validator.validate(agentId, output, definition);

    // 2. Quick score (heuristics only)
    const score = this.scorer.quickScore(agentId, output);

    // 3. Generate improvement suggestions
    const suggestions = this.improver.suggest(agentId, score, validation);

    // 4. Update metrics
    this.updateMetrics(agentId, context.buildId, score);

    // 5. Determine action
    const action = this.determineAction(agentId, score, validation, context.currentRetry);

    // 6. Build decision
    const decision: JudgeDecision = {
      action,
      score,
      validation,
      suggestions,
    };

    // Add retry strategy if needed
    if (action === 'retry' && this.config.autoRetry) {
      decision.retryStrategy = this.improver.determineRetryStrategy(
        agentId,
        score,
        validation,
        context.currentRetry
      );
    }

    return decision;
  }

  // ==========================================================================
  // ACTION DETERMINATION
  // ==========================================================================

  /**
   * Determine what action to take based on quality assessment
   */
  private determineAction(
    agentId: string,
    score: QualityScore,
    validation: { valid: boolean; errors: Array<{ severity: string }> },
    currentRetry: number
  ): JudgeAction {
    const threshold = this.getThreshold(agentId);

    // Critical validation failure
    if (!validation.valid) {
      const hasCriticalErrors = validation.errors.some(e => e.severity === 'critical');
      if (hasCriticalErrors) {
        // Can we retry?
        if (currentRetry < threshold.maxRetries) {
          return 'retry';
        }
        return this.config.strictMode ? 'fail' : 'accept';
      }
    }

    // Check overall score
    if (score.overall < threshold.minOverallScore) {
      if (currentRetry < threshold.maxRetries) {
        return 'retry';
      }
      // Below threshold but out of retries
      return this.config.strictMode ? 'fail' : 'accept';
    }

    // Check dimension scores
    const { dimensions } = score;
    const minDims = threshold.minDimensionScores;
    const belowMinDimensions =
      dimensions.completeness < minDims.completeness ||
      dimensions.correctness < minDims.correctness ||
      dimensions.consistency < minDims.consistency;

    if (belowMinDimensions) {
      if (currentRetry < threshold.maxRetries) {
        return 'retry';
      }
      // Below dimension thresholds but out of retries
      return this.config.strictMode ? 'fail' : 'accept';
    }

    // Quality is acceptable - check if it could be enhanced
    if (score.overall >= 7 && score.overall < 9 && !this.config.strictMode) {
      // Good but not great - could enhance if resources allow
      return 'accept'; // Default to accept, enhance is optional
    }

    return 'accept';
  }

  // ==========================================================================
  // THRESHOLD MANAGEMENT
  // ==========================================================================

  /**
   * Get threshold for an agent (with defaults for critical agents)
   */
  getThreshold(agentId: string): QualityThreshold {
    // Check custom threshold first
    const custom = this.config.thresholds.get(agentId);
    if (custom) {
      return custom;
    }

    // Critical agents get stricter defaults
    if (CRITICAL_AGENTS.includes(agentId)) {
      return {
        agentId,
        minOverallScore: 7,
        minDimensionScores: {
          completeness: 6,
          correctness: 6,
          consistency: 5,
          creativity: 4,
          clarity: 5,
        },
        criticalFields: this.validator.getRequiredFields(agentId),
        maxRetries: 3,
      };
    }

    // Default threshold
    return {
      agentId,
      ...DEFAULT_THRESHOLD,
    };
  }

  /**
   * Set custom threshold for an agent
   */
  setThreshold(agentId: string, threshold: Partial<QualityThreshold>): void {
    const existing = this.getThreshold(agentId);
    this.config.thresholds.set(agentId, {
      ...existing,
      ...threshold,
      agentId,
    });
  }

  // ==========================================================================
  // METRICS TRACKING
  // ==========================================================================

  /**
   * Update metrics for an agent
   */
  private updateMetrics(agentId: string, buildId: string, score: QualityScore): void {
    const existing = this.metrics.get(agentId);

    if (existing) {
      // Add new score to history (keep last 10)
      const scores = [...existing.scores, score].slice(-10);
      const averageScore = scores.reduce((sum, s) => sum + s.overall, 0) / scores.length;

      // Determine trend
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (scores.length >= 3) {
        const recent = scores.slice(-3).reduce((sum, s) => sum + s.overall, 0) / 3;
        const older =
          scores.slice(0, -3).reduce((sum, s) => sum + s.overall, 0) /
          Math.max(1, scores.length - 3);
        if (recent > older + 0.5) trend = 'improving';
        else if (recent < older - 0.5) trend = 'declining';
      }

      this.metrics.set(agentId, {
        agentId,
        buildId,
        scores,
        averageScore: Math.round(averageScore * 10) / 10,
        trend,
        lastUpdated: new Date(),
      });
    } else {
      // Create new metrics entry
      this.metrics.set(agentId, {
        agentId,
        buildId,
        scores: [score],
        averageScore: score.overall,
        trend: 'stable',
        lastUpdated: new Date(),
      });
    }
  }

  /**
   * Get metrics for an agent
   */
  getMetrics(agentId: string): QualityMetrics | undefined {
    return this.metrics.get(agentId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, QualityMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get agents with declining quality
   */
  getDecliningAgents(): string[] {
    return Array.from(this.metrics.entries())
      .filter(([_, m]) => m.trend === 'declining')
      .map(([id]) => id);
  }

  /**
   * Check if an agent is underperforming
   */
  isUnderperforming(agentId: string): boolean {
    const metrics = this.metrics.get(agentId);
    if (!metrics) return false;

    const threshold = this.getThreshold(agentId);
    return metrics.averageScore < threshold.minOverallScore;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Create a pass decision (when judging is disabled)
   */
  private createPassDecision(agentId: string, output: AgentOutputForJudge): JudgeDecision {
    return {
      action: 'accept',
      score: {
        overall: 10,
        dimensions: {
          completeness: 10,
          correctness: 10,
          consistency: 10,
          creativity: 10,
          clarity: 10,
        },
        confidence: 0,
        timestamp: new Date(),
        reasoning: 'Judging disabled - auto-pass',
      },
      validation: {
        valid: true,
        errors: [],
        warnings: [],
        coverage: 100,
      },
      suggestions: [],
    };
  }

  /**
   * Get configuration
   */
  getConfig(): JudgeConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<JudgeConfig>): void {
    this.config = { ...this.config, ...updates };

    // Update scorer model if changed
    if (updates.scoringModel) {
      this.scorer = new QualityScorer(undefined, updates.scoringModel);
    }
  }

  /**
   * Get validator instance (for direct access if needed)
   */
  getValidator(): OutputValidator {
    return this.validator;
  }

  /**
   * Get improver instance (for direct access if needed)
   */
  getImprover(): ImprovementSuggester {
    return this.improver;
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { QualityScorer } from './scorer';
export { OutputValidator } from './validator';
export { ImprovementSuggester } from './improver';
export * from './types';
