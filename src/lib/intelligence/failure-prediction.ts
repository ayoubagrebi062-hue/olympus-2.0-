/**
 * OLYMPUS 2.1 - 10X UPGRADE: Failure Prediction Engine
 *
 * PREDICT FAILURES BEFORE THEY HAPPEN.
 *
 * What it does:
 * - Analyzes prompts for failure risk factors
 * - Learns from historical build failures
 * - Predicts which phases/agents are likely to fail
 * - Suggests preventive actions BEFORE build starts
 * - Estimates confidence in predictions
 */

import { logger } from '../observability/logger';
import { incCounter, observeHistogram } from '../observability/metrics';

// ============================================================================
// TYPES
// ============================================================================

export interface PredictionInput {
  /** The user's prompt */
  prompt: string;
  /** Build configuration */
  config: {
    model: string;
    maxTokens: number;
    qualityThreshold: number;
    phases: string[];
    agents: string[];
  };
  /** User's historical success rate */
  userHistoryScore?: number;
  /** Similar past builds for comparison */
  similarBuilds?: HistoricalBuild[];
}

export interface HistoricalBuild {
  buildId: string;
  prompt: string;
  success: boolean;
  failedPhases: string[];
  failedAgents: string[];
  failureReasons: string[];
  tokensUsed: number;
  duration: number;
  similarity?: number;
}

export interface FailurePrediction {
  /** Overall failure probability (0-1) */
  failureProbability: number;
  /** Confidence in prediction (0-1) */
  confidence: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Predicted failure points */
  predictedFailures: PredictedFailure[];
  /** Risk factors identified */
  riskFactors: RiskFactor[];
  /** Suggested preventive actions */
  preventiveActions: PreventiveAction[];
  /** Historical patterns matched */
  matchedPatterns: FailurePattern[];
  /** Estimated success if recommendations followed */
  improvedSuccessRate: number;
}

export interface PredictedFailure {
  /** Phase likely to fail */
  phaseId: string;
  /** Specific agents likely to fail */
  agentIds: string[];
  /** Probability of failure (0-1) */
  probability: number;
  /** Primary reason */
  reason: string;
  /** Severity if this fails */
  severity: 'minor' | 'major' | 'critical';
  /** Can this be recovered automatically? */
  recoverable: boolean;
}

export interface RiskFactor {
  /** Risk category */
  category: 'complexity' | 'ambiguity' | 'scope' | 'constraints' | 'resources' | 'history';
  /** Specific risk identified */
  name: string;
  /** Description */
  description: string;
  /** Impact on failure probability (0-1) */
  impact: number;
  /** Evidence for this risk */
  evidence: string[];
  /** How to mitigate */
  mitigation?: string;
}

export interface PreventiveAction {
  /** Action type */
  type: 'clarify' | 'simplify' | 'split' | 'constrain' | 'add_context' | 'reduce_scope';
  /** Priority (1-10) */
  priority: number;
  /** Description of action */
  description: string;
  /** Expected improvement in success rate */
  expectedImprovement: number;
  /** Suggested prompt modification */
  promptSuggestion?: string;
  /** Auto-applicable? */
  canAutoApply: boolean;
}

export interface FailurePattern {
  /** Pattern identifier */
  id: string;
  /** Pattern name */
  name: string;
  /** Description */
  description: string;
  /** How often this pattern leads to failure */
  failureRate: number;
  /** Occurrences in prompt */
  occurrences: PatternMatch[];
}

export interface PatternMatch {
  /** Where in prompt */
  location: { start: number; end: number };
  /** Matched text */
  matchedText: string;
  /** Why this is problematic */
  reason: string;
}

// ============================================================================
// FAILURE PATTERNS DATABASE
// ============================================================================

const FAILURE_PATTERNS: FailurePattern[] = [
  {
    id: 'vague_requirements',
    name: 'Vague Requirements',
    description: 'Prompt lacks specific, measurable requirements',
    failureRate: 0.65,
    occurrences: [],
  },
  {
    id: 'scope_creep',
    name: 'Scope Creep Indicators',
    description: 'Prompt requests too many features at once',
    failureRate: 0.55,
    occurrences: [],
  },
  {
    id: 'conflicting_constraints',
    name: 'Conflicting Constraints',
    description: 'Prompt contains contradictory requirements',
    failureRate: 0.75,
    occurrences: [],
  },
  {
    id: 'missing_context',
    name: 'Missing Context',
    description: 'Prompt lacks necessary business or technical context',
    failureRate: 0.45,
    occurrences: [],
  },
  {
    id: 'complex_integrations',
    name: 'Complex Integrations',
    description: 'Prompt requires multiple external service integrations',
    failureRate: 0.5,
    occurrences: [],
  },
  {
    id: 'undefined_edge_cases',
    name: 'Undefined Edge Cases',
    description: "Prompt doesn't specify how to handle edge cases",
    failureRate: 0.4,
    occurrences: [],
  },
  {
    id: 'unrealistic_expectations',
    name: 'Unrealistic Expectations',
    description: 'Prompt expects perfection without iteration',
    failureRate: 0.6,
    occurrences: [],
  },
];

// Risk patterns with regex
const RISK_PATTERNS = {
  vague_requirements: [
    /\bshould\s+(?:probably|maybe|possibly)\b/gi,
    /\b(?:something|anything)\s+like\b/gi,
    /\b(?:etc|and\s+so\s+on|and\s+more)\b/gi,
    /\bit\s+should\s+(?:just\s+)?work\b/gi,
    /\b(?:figure\s+out|work\s+out)\b/gi,
    /\b(?:simple|easy|quick|basic)\s+\w+\b/gi,
  ],
  scope_creep: [
    /\b(?:also|additionally|plus|and\s+also)\s+(?:add|include|make)\b/gi,
    /\b(?:everything|all\s+(?:the|of))\b/gi,
    /\b(?:full|complete|comprehensive|entire)\s+(?:system|platform|solution)\b/gi,
    /\bfull-?stack\b/gi,
    /\bfrom\s+scratch\b/gi,
    /\bend-?to-?end\b/gi,
  ],
  conflicting_constraints: [
    /\bbut\s+also\b/gi,
    /\b(?:however|although|yet)\s+(?:also|at\s+the\s+same\s+time)\b/gi,
    /\b(?:minimal|simple)\s+(?:but|yet)\s+(?:complete|comprehensive|full)\b/gi,
    /\b(?:fast|quick)\s+(?:but|and)\s+(?:perfect|flawless)\b/gi,
  ],
  missing_context: [
    /\blike\s+(?:uber|amazon|netflix|facebook)\b/gi,
    /\b(?:standard|normal|typical|usual)\s+(?:way|approach)\b/gi,
    /\byou\s+know\s+(?:what|how)\b/gi,
    /\bthe\s+(?:usual|regular)\s+stuff\b/gi,
  ],
  complex_integrations: [
    /\bintegrate\s+with\s+(?:\w+,?\s*)+(?:and|&)\s+\w+\b/gi,
    /\b(?:stripe|paypal|twilio|sendgrid|aws|gcp|azure)\b/gi,
    /\boauth\s+(?:2\.0|with\s+multiple)\b/gi,
    /\b(?:real-?time|websocket|sse)\s+(?:sync|updates?)\b/gi,
  ],
  undefined_edge_cases: [
    /\bhandle\s+(?:all|any)\s+(?:errors?|cases?|scenarios?)\b/gi,
    /\b(?:robust|resilient)\s+(?:error\s+)?handling\b/gi,
    /\b(?:graceful|elegant)\s+(?:degradation|fallback)\b/gi,
  ],
  unrealistic_expectations: [
    /\b(?:pixel-?perfect|flawless|bug-?free)\b/gi,
    /\b(?:production-?ready|enterprise-?grade)\b/gi,
    /\b(?:no|zero)\s+(?:bugs?|errors?|issues?)\b/gi,
    /\b100%\s+(?:test\s+)?coverage\b/gi,
    /\bfully\s+(?:tested|documented|optimized)\b/gi,
  ],
};

// Agent-specific risk factors
const AGENT_RISK_FACTORS: Record<
  string,
  { complexity: number; failureRate: number; riskKeywords: string[] }
> = {
  schemaforge: {
    complexity: 0.7,
    failureRate: 0.25,
    riskKeywords: ['complex relationships', 'many-to-many', 'polymorphic', 'inheritance'],
  },
  nexus: {
    complexity: 0.8,
    failureRate: 0.3,
    riskKeywords: ['authentication', 'authorization', 'oauth', 'jwt', 'rbac'],
  },
  pixel: {
    complexity: 0.6,
    failureRate: 0.35,
    riskKeywords: ['responsive', 'animations', 'complex forms', 'drag and drop'],
  },
  wire: {
    complexity: 0.5,
    failureRate: 0.2,
    riskKeywords: ['state management', 'real-time', 'optimistic updates', 'caching'],
  },
  sentinel: {
    complexity: 0.6,
    failureRate: 0.4,
    riskKeywords: ['e2e tests', 'integration tests', 'mocking', '100% coverage'],
  },
  aegis: {
    complexity: 0.9,
    failureRate: 0.45,
    riskKeywords: ['encryption', 'security audit', 'compliance', 'penetration testing'],
  },
};

// ============================================================================
// PREDICTION ENGINE
// ============================================================================

export class FailurePredictionEngine {
  private patternHistory: Map<string, number> = new Map(); // pattern -> failure count
  private agentHistory: Map<string, { successes: number; failures: number }> = new Map();

  /**
   * Predict failure probability for a build
   */
  predict(input: PredictionInput): FailurePrediction {
    const startTime = Date.now();

    // Analyze prompt for risk factors
    const riskFactors = this.analyzeRiskFactors(input);

    // Match failure patterns
    const matchedPatterns = this.matchPatterns(input.prompt);

    // Predict specific failures
    const predictedFailures = this.predictFailures(input, riskFactors, matchedPatterns);

    // Calculate overall failure probability
    const failureProbability = this.calculateFailureProbability(
      riskFactors,
      matchedPatterns,
      predictedFailures,
      input.userHistoryScore,
      input.similarBuilds
    );

    // Generate preventive actions
    const preventiveActions = this.generatePreventiveActions(
      riskFactors,
      matchedPatterns,
      predictedFailures,
      input.prompt
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(
      matchedPatterns.length,
      input.similarBuilds?.length || 0,
      riskFactors.length
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(failureProbability, confidence);

    // Estimate improved success rate
    const improvedSuccessRate = this.estimateImprovedRate(failureProbability, preventiveActions);

    const prediction: FailurePrediction = {
      failureProbability,
      confidence,
      riskLevel,
      predictedFailures,
      riskFactors,
      preventiveActions,
      matchedPatterns,
      improvedSuccessRate,
    };

    // Log and metrics
    const duration = Date.now() - startTime;
    observeHistogram('olympus_prediction_duration_ms', duration);
    incCounter('olympus_predictions', 1, { riskLevel });

    logger.info('Failure prediction complete', {
      failureProbability,
      confidence,
      riskLevel,
      riskFactorCount: riskFactors.length,
      patternMatchCount: matchedPatterns.length,
      predictedFailureCount: predictedFailures.length,
      actionCount: preventiveActions.length,
      durationMs: duration,
    });

    return prediction;
  }

  /**
   * Analyze prompt for risk factors
   */
  private analyzeRiskFactors(input: PredictionInput): RiskFactor[] {
    const factors: RiskFactor[] = [];
    const prompt = input.prompt.toLowerCase();

    // Check complexity
    const wordCount = input.prompt.split(/\s+/).length;
    const sentenceCount = input.prompt.split(/[.!?]+/).length;
    const avgSentenceLength = wordCount / Math.max(1, sentenceCount);

    if (wordCount > 500) {
      factors.push({
        category: 'complexity',
        name: 'Long Prompt',
        description: 'Prompt exceeds 500 words, increasing interpretation ambiguity',
        impact: Math.min(0.3, (wordCount - 500) / 1000),
        evidence: [`Word count: ${wordCount}`],
        mitigation: 'Break down into smaller, focused builds',
      });
    }

    if (avgSentenceLength > 25) {
      factors.push({
        category: 'complexity',
        name: 'Complex Sentences',
        description: 'Average sentence length exceeds 25 words',
        impact: 0.15,
        evidence: [`Average sentence length: ${avgSentenceLength.toFixed(1)} words`],
        mitigation: 'Use shorter, clearer sentences',
      });
    }

    // Check for feature count
    const featureIndicators =
      prompt.match(/(?:feature|functionality|capability|ability to|should be able to)/gi) || [];
    if (featureIndicators.length > 5) {
      factors.push({
        category: 'scope',
        name: 'Feature Overload',
        description: `${featureIndicators.length} features requested in single build`,
        impact: Math.min(0.4, featureIndicators.length * 0.05),
        evidence: featureIndicators.slice(0, 5).map(f => `Found: "${f}"`),
        mitigation: 'Prioritize and build incrementally',
      });
    }

    // Check agent-specific risks
    for (const agent of input.config.agents) {
      const agentRisk = AGENT_RISK_FACTORS[agent.toLowerCase()];
      if (agentRisk) {
        const matches = agentRisk.riskKeywords.filter(kw => prompt.includes(kw.toLowerCase()));
        if (matches.length > 0) {
          factors.push({
            category: 'complexity',
            name: `${agent} Complexity`,
            description: `Agent ${agent} has high-risk requirements`,
            impact: agentRisk.failureRate * (matches.length / agentRisk.riskKeywords.length),
            evidence: matches.map(m => `Keyword: "${m}"`),
            mitigation: `Simplify ${agent} requirements or add more context`,
          });
        }
      }
    }

    // Check constraints
    const mustHave = (prompt.match(/\bmust\s+(?:have|be|include)\b/gi) || []).length;
    const required = (prompt.match(/\brequired?\b/gi) || []).length;
    const mandatory = (prompt.match(/\bmandatory\b/gi) || []).length;
    const constraintCount = mustHave + required + mandatory;

    if (constraintCount > 10) {
      factors.push({
        category: 'constraints',
        name: 'Heavy Constraints',
        description: 'Too many mandatory requirements increase failure risk',
        impact: Math.min(0.35, constraintCount * 0.03),
        evidence: [`${constraintCount} hard constraints found`],
        mitigation: 'Distinguish must-have from nice-to-have',
      });
    }

    // Check token budget
    const estimatedTokens = this.estimateRequiredTokens(input);
    if (estimatedTokens > input.config.maxTokens * 0.8) {
      factors.push({
        category: 'resources',
        name: 'Token Budget Risk',
        description: 'Estimated token usage approaches limit',
        impact: 0.25,
        evidence: [
          `Estimated: ${estimatedTokens.toLocaleString()} tokens`,
          `Budget: ${input.config.maxTokens.toLocaleString()} tokens`,
        ],
        mitigation: 'Increase token budget or reduce scope',
      });
    }

    // Check user history
    if (input.userHistoryScore !== undefined && input.userHistoryScore < 0.5) {
      factors.push({
        category: 'history',
        name: 'User History Risk',
        description: 'User has below-average build success rate',
        impact: (1 - input.userHistoryScore) * 0.2,
        evidence: [`Historical success rate: ${(input.userHistoryScore * 100).toFixed(0)}%`],
        mitigation: 'Review past failures and apply learnings',
      });
    }

    return factors;
  }

  /**
   * Match known failure patterns in prompt
   */
  private matchPatterns(prompt: string): FailurePattern[] {
    const matches: FailurePattern[] = [];

    for (const pattern of FAILURE_PATTERNS) {
      const regexes = RISK_PATTERNS[pattern.id as keyof typeof RISK_PATTERNS];
      if (!regexes) continue;

      const occurrences: PatternMatch[] = [];

      for (const regex of regexes) {
        let match;
        const r = new RegExp(regex.source, regex.flags);
        while ((match = r.exec(prompt)) !== null) {
          occurrences.push({
            location: { start: match.index, end: match.index + match[0].length },
            matchedText: match[0],
            reason: `Matches ${pattern.name} pattern`,
          });
        }
      }

      if (occurrences.length > 0) {
        matches.push({
          ...pattern,
          occurrences,
        });
      }
    }

    return matches;
  }

  /**
   * Predict specific phase/agent failures
   */
  private predictFailures(
    input: PredictionInput,
    riskFactors: RiskFactor[],
    matchedPatterns: FailurePattern[]
  ): PredictedFailure[] {
    const predictions: PredictedFailure[] = [];
    const prompt = input.prompt.toLowerCase();

    // Analyze each phase
    const phaseRisks: Record<string, number> = {};

    // Schema phase
    if (input.config.phases.includes('schema')) {
      const schemaRisk = this.calculatePhaseRisk(prompt, [
        'complex relationships',
        'many tables',
        'polymorphic',
        'inheritance',
        'soft delete',
        'audit trail',
        'versioning',
      ]);
      if (schemaRisk > 0.3) {
        predictions.push({
          phaseId: 'schema',
          agentIds: ['schemaforge', 'chronos'],
          probability: schemaRisk,
          reason: 'Complex database schema requirements',
          severity: schemaRisk > 0.6 ? 'critical' : 'major',
          recoverable: true,
        });
      }
    }

    // Generation phase
    if (input.config.phases.includes('generation')) {
      const uiRisk = this.calculatePhaseRisk(prompt, [
        'responsive',
        'animations',
        'drag and drop',
        'complex forms',
        'data tables',
        'charts',
        'dashboards',
      ]);
      if (uiRisk > 0.3) {
        predictions.push({
          phaseId: 'generation',
          agentIds: ['pixel', 'flow'],
          probability: uiRisk,
          reason: 'Complex UI component requirements',
          severity: uiRisk > 0.6 ? 'major' : 'minor',
          recoverable: true,
        });
      }

      const apiRisk = this.calculatePhaseRisk(prompt, [
        'authentication',
        'authorization',
        'oauth',
        'api rate limiting',
        'webhooks',
        'file upload',
        'streaming',
      ]);
      if (apiRisk > 0.3) {
        predictions.push({
          phaseId: 'generation',
          agentIds: ['nexus', 'aegis'],
          probability: apiRisk,
          reason: 'Complex API/security requirements',
          severity: apiRisk > 0.6 ? 'critical' : 'major',
          recoverable: false,
        });
      }
    }

    // Quality phase
    if (input.config.phases.includes('quality')) {
      const testRisk = this.calculatePhaseRisk(prompt, [
        'full test coverage',
        '100% coverage',
        'e2e tests',
        'integration tests',
        'performance tests',
        'security audit',
      ]);
      if (testRisk > 0.3) {
        predictions.push({
          phaseId: 'quality',
          agentIds: ['sentinel', 'polish'],
          probability: testRisk,
          reason: 'Extensive testing requirements',
          severity: testRisk > 0.6 ? 'major' : 'minor',
          recoverable: true,
        });
      }
    }

    // Factor in matched patterns
    for (const pattern of matchedPatterns) {
      if (pattern.failureRate > 0.5) {
        // Increase probability for all predictions
        for (const pred of predictions) {
          pred.probability = Math.min(0.95, pred.probability + pattern.failureRate * 0.1);
        }
      }
    }

    // Sort by probability
    predictions.sort((a, b) => b.probability - a.probability);

    return predictions;
  }

  /**
   * Calculate phase-specific risk
   */
  private calculatePhaseRisk(prompt: string, riskKeywords: string[]): number {
    let matches = 0;
    for (const keyword of riskKeywords) {
      if (prompt.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    return Math.min(0.9, matches / riskKeywords.length + matches * 0.05);
  }

  /**
   * Calculate overall failure probability
   */
  private calculateFailureProbability(
    riskFactors: RiskFactor[],
    matchedPatterns: FailurePattern[],
    predictedFailures: PredictedFailure[],
    userHistoryScore?: number,
    similarBuilds?: HistoricalBuild[]
  ): number {
    // Base probability
    let probability = 0.1;

    // Add risk factor impacts
    for (const factor of riskFactors) {
      probability += factor.impact * 0.5;
    }

    // Add pattern impacts
    for (const pattern of matchedPatterns) {
      probability += pattern.failureRate * 0.2 * Math.min(3, pattern.occurrences.length);
    }

    // Add predicted failure impacts
    for (const pred of predictedFailures) {
      const severityMultiplier =
        pred.severity === 'critical' ? 0.3 : pred.severity === 'major' ? 0.2 : 0.1;
      probability += pred.probability * severityMultiplier;
    }

    // Adjust by user history
    if (userHistoryScore !== undefined) {
      probability *= 2 - userHistoryScore;
    }

    // Adjust by similar builds
    if (similarBuilds && similarBuilds.length > 0) {
      const avgSuccess = similarBuilds.filter(b => b.success).length / similarBuilds.length;
      probability = probability * 0.7 + (1 - avgSuccess) * 0.3;
    }

    return Math.min(0.95, Math.max(0.05, probability));
  }

  /**
   * Generate preventive actions
   */
  private generatePreventiveActions(
    riskFactors: RiskFactor[],
    matchedPatterns: FailurePattern[],
    predictedFailures: PredictedFailure[],
    prompt: string
  ): PreventiveAction[] {
    const actions: PreventiveAction[] = [];

    // Actions based on risk factors
    for (const factor of riskFactors) {
      if (factor.category === 'complexity' && factor.impact > 0.2) {
        actions.push({
          type: 'simplify',
          priority: Math.round(factor.impact * 10),
          description: factor.mitigation || 'Simplify requirements',
          expectedImprovement: factor.impact * 0.5,
          canAutoApply: false,
        });
      }

      if (factor.category === 'scope' && factor.impact > 0.2) {
        actions.push({
          type: 'split',
          priority: Math.round(factor.impact * 10),
          description: 'Split into multiple smaller builds',
          expectedImprovement: factor.impact * 0.6,
          canAutoApply: false,
        });
      }

      if (factor.category === 'constraints' && factor.impact > 0.2) {
        actions.push({
          type: 'constrain',
          priority: Math.round(factor.impact * 8),
          description: 'Prioritize constraints and make some optional',
          expectedImprovement: factor.impact * 0.4,
          canAutoApply: false,
        });
      }
    }

    // Actions based on patterns
    for (const pattern of matchedPatterns) {
      if (pattern.id === 'vague_requirements') {
        actions.push({
          type: 'clarify',
          priority: 9,
          description: 'Add specific, measurable requirements',
          expectedImprovement: 0.25,
          promptSuggestion: this.suggestClarification(pattern.occurrences, prompt),
          canAutoApply: false,
        });
      }

      if (pattern.id === 'missing_context') {
        actions.push({
          type: 'add_context',
          priority: 8,
          description: 'Add business context and technical constraints',
          expectedImprovement: 0.2,
          canAutoApply: false,
        });
      }

      if (pattern.id === 'scope_creep') {
        actions.push({
          type: 'reduce_scope',
          priority: 9,
          description: 'Focus on MVP features only',
          expectedImprovement: 0.3,
          canAutoApply: false,
        });
      }
    }

    // Actions based on predicted failures
    for (const pred of predictedFailures) {
      if (pred.probability > 0.5 && !pred.recoverable) {
        actions.push({
          type: 'clarify',
          priority: 10,
          description: `Clarify requirements for ${pred.phaseId} phase to prevent ${pred.reason}`,
          expectedImprovement: pred.probability * 0.5,
          canAutoApply: false,
        });
      }
    }

    // Sort by priority and deduplicate
    actions.sort((a, b) => b.priority - a.priority);

    return this.deduplicateActions(actions);
  }

  /**
   * Suggest clarification for vague text
   */
  private suggestClarification(occurrences: PatternMatch[], prompt: string): string {
    const suggestions: string[] = [];

    for (const occ of occurrences.slice(0, 3)) {
      const before = prompt.substring(Math.max(0, occ.location.start - 20), occ.location.start);
      const after = prompt.substring(
        occ.location.end,
        Math.min(prompt.length, occ.location.end + 20)
      );
      suggestions.push(`Replace "${occ.matchedText}" with specific requirements`);
    }

    return suggestions.join('; ');
  }

  /**
   * Remove duplicate actions
   */
  private deduplicateActions(actions: PreventiveAction[]): PreventiveAction[] {
    const seen = new Set<string>();
    return actions.filter(a => {
      const key = `${a.type}:${a.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate confidence in prediction
   */
  private calculateConfidence(
    patternCount: number,
    similarBuildCount: number,
    riskFactorCount: number
  ): number {
    // More data = higher confidence
    let confidence = 0.3; // Base confidence

    // Add for patterns (max +0.3)
    confidence += Math.min(0.3, patternCount * 0.1);

    // Add for similar builds (max +0.3)
    confidence += Math.min(0.3, similarBuildCount * 0.1);

    // Add for risk factors (max +0.1)
    confidence += Math.min(0.1, riskFactorCount * 0.02);

    return Math.min(0.95, confidence);
  }

  /**
   * Determine risk level
   */
  private determineRiskLevel(
    failureProbability: number,
    confidence: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Weight probability by confidence
    const weightedRisk =
      failureProbability * confidence + failureProbability * (1 - confidence) * 0.5;

    if (weightedRisk > 0.7) return 'critical';
    if (weightedRisk > 0.5) return 'high';
    if (weightedRisk > 0.3) return 'medium';
    return 'low';
  }

  /**
   * Estimate improved success rate after following recommendations
   */
  private estimateImprovedRate(failureProbability: number, actions: PreventiveAction[]): number {
    let improvementSum = 0;
    for (const action of actions) {
      improvementSum += action.expectedImprovement;
    }

    // Diminishing returns
    const effectiveImprovement = Math.min(0.5, improvementSum * 0.8);
    return Math.min(0.95, 1 - failureProbability + failureProbability * effectiveImprovement);
  }

  /**
   * Estimate required tokens
   */
  private estimateRequiredTokens(input: PredictionInput): number {
    const baseTokens = 5000; // Base overhead
    const promptTokens = input.prompt.length / 4; // ~4 chars per token
    const agentTokens = input.config.agents.length * 3000; // Per agent
    const phaseTokens = input.config.phases.length * 2000; // Per phase

    return Math.round(baseTokens + promptTokens + agentTokens + phaseTokens);
  }

  /**
   * Learn from a completed build
   */
  learnFromBuild(build: HistoricalBuild): void {
    // Update pattern history
    for (const pattern of FAILURE_PATTERNS) {
      const regexes = RISK_PATTERNS[pattern.id as keyof typeof RISK_PATTERNS];
      if (!regexes) continue;

      let matched = false;
      for (const regex of regexes) {
        if (regex.test(build.prompt)) {
          matched = true;
          break;
        }
      }

      if (matched && !build.success) {
        const count = this.patternHistory.get(pattern.id) || 0;
        this.patternHistory.set(pattern.id, count + 1);
      }
    }

    // Update agent history
    for (const agentId of build.failedAgents) {
      const stats = this.agentHistory.get(agentId) || { successes: 0, failures: 0 };
      stats.failures++;
      this.agentHistory.set(agentId, stats);
    }

    logger.info('Learned from build', {
      buildId: build.buildId,
      success: build.success,
      failedAgents: build.failedAgents,
    });
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const failurePrediction = new FailurePredictionEngine();

export default failurePrediction;
