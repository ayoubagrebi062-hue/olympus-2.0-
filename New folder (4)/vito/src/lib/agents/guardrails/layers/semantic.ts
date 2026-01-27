/**
 * OLYMPUS 10X - Semantic Guardrail Layer
 *
 * Third line of defense: Prompt quality assessment, intent classification,
 * scope validation. Uses heuristics and optional LLM-based analysis.
 */

import { GUARDRAIL_LAYERS, THRESHOLDS } from '@/lib/core';
import type { GuardrailInput } from '@/lib/core';
import type {
  GuardrailLayerHandler,
  GuardrailContext,
  SemanticLayerConfig,
  LayerValidationResult,
} from '../types';

// ============================================================================
// INTENT CLASSIFICATION
// ============================================================================

/**
 * Recognized intent categories.
 */
export type IntentCategory =
  | 'build_application'
  | 'modify_code'
  | 'debug_issue'
  | 'explain_concept'
  | 'generate_content'
  | 'data_analysis'
  | 'security_related'
  | 'administrative'
  | 'harmful_intent'
  | 'unclear';

/**
 * Intent classification result.
 */
export interface IntentClassification {
  /** Primary detected intent */
  primary: IntentCategory;

  /** Secondary intents (multi-intent prompts) */
  secondary: IntentCategory[];

  /** Confidence in classification (0-1) */
  confidence: number;

  /** Keywords that influenced classification */
  matchedKeywords: string[];
}

/**
 * Keyword patterns for intent classification.
 */
const INTENT_PATTERNS: Record<IntentCategory, RegExp[]> = {
  build_application: [
    /\b(build|create|make|develop|implement|generate)\b.*\b(app|application|website|system|platform|tool|service)\b/i,
    /\b(new|start)\b.*\b(project|application|app)\b/i,
    /\bbuild\s+me\b/i,
  ],
  modify_code: [
    /\b(change|modify|update|edit|refactor|fix|improve|optimize)\b.*\b(code|function|component|file|logic)\b/i,
    /\b(add|remove|delete)\b.*\b(feature|function|component)\b/i,
  ],
  debug_issue: [
    /\b(debug|fix|solve|resolve)\b.*\b(bug|issue|error|problem)\b/i,
    /\b(not\s+working|broken|failing|crashed)\b/i,
    /\b(why|how come)\b.*\b(error|fail|break)\b/i,
  ],
  explain_concept: [
    /\b(explain|what\s+is|how\s+does|describe|tell\s+me\s+about)\b/i,
    /\b(understand|learn|teach\s+me)\b/i,
  ],
  generate_content: [
    /\b(write|generate|create)\b.*\b(content|text|copy|documentation|readme)\b/i,
    /\b(draft|compose)\b/i,
  ],
  data_analysis: [
    /\b(analyze|analyse|examine|review)\b.*\b(data|metrics|statistics|logs)\b/i,
    /\b(find\s+patterns|correlate|insights)\b/i,
  ],
  security_related: [
    /\b(security|vulnerability|exploit|attack|penetration|hack)\b/i,
    /\b(audit|scan|secure)\b/i,
  ],
  administrative: [
    /\b(deploy|configure|setup|install|manage)\b/i,
    /\b(server|database|infrastructure|environment)\b/i,
  ],
  harmful_intent: [
    /\b(steal|hack|attack|exploit|bypass|crack)\b.*\b(password|credentials|data|system)\b/i,
    /\b(malware|virus|ransomware|phishing)\b/i,
    /\b(ddos|denial\s+of\s+service)\b/i,
  ],
  unclear: [], // Fallback when no patterns match
};

// ============================================================================
// QUALITY SCORING
// ============================================================================

/**
 * Quality assessment result.
 */
export interface QualityAssessment {
  /** Overall quality score (0-1) */
  score: number;

  /** Individual quality dimensions */
  dimensions: {
    clarity: number;
    specificity: number;
    completeness: number;
    relevance: number;
  };

  /** Quality issues found */
  issues: string[];

  /** Suggestions for improvement */
  suggestions: string[];
}

// ============================================================================
// SCOPE ANALYSIS
// ============================================================================

/**
 * Scope complexity result.
 */
export interface ScopeAnalysis {
  /** Complexity score (0-10) */
  complexity: number;

  /** Estimated components */
  estimatedComponents: string[];

  /** Potential concerns */
  concerns: string[];

  /** Whether scope is within acceptable limits */
  withinLimits: boolean;
}

// ============================================================================
// SEMANTIC LAYER IMPLEMENTATION
// ============================================================================

export class SemanticLayer implements GuardrailLayerHandler {
  readonly layer = GUARDRAIL_LAYERS.SEMANTIC;
  readonly name = 'Semantic Layer';

  private blockedIntents: Set<IntentCategory>;
  private bypassRoles: Set<string>;

  constructor(
    blockedIntents: IntentCategory[] = ['harmful_intent'],
    bypassRoles: string[] = ['admin', 'system']
  ) {
    this.blockedIntents = new Set(blockedIntents);
    this.bypassRoles = new Set(bypassRoles);
  }

  async validate(
    context: GuardrailContext,
    input: GuardrailInput,
    config: SemanticLayerConfig
  ): Promise<LayerValidationResult> {
    const startTime = Date.now();
    const options = config.options || {};
    const prompt = input.prompt || '';

    try {
      // 1. Classify intent
      const intent = this.classifyIntent(prompt);

      // 2. Check for blocked intents
      if (this.blockedIntents.has(intent.primary)) {
        return this.createResult(
          {
            action: 'terminate',
            confidence: intent.confidence,
            reason: `Blocked intent detected: ${intent.primary}`,
            metadata: { intent, blocked: true },
          },
          startTime
        );
      }

      // Check blocked intents from config
      if (options.blockedIntents?.includes(intent.primary)) {
        return this.createResult(
          {
            action: 'block',
            confidence: intent.confidence,
            reason: `Intent '${intent.primary}' is not allowed`,
            metadata: { intent, blocked: true },
          },
          startTime
        );
      }

      // 3. Assess quality
      const quality = this.assessQuality(prompt);

      // Check minimum quality score
      const minQuality = options.minQualityScore || THRESHOLDS.MIN_QUALITY_SCORE;
      if (quality.score < minQuality) {
        return this.createResult(
          {
            action: 'warn',
            confidence: quality.score,
            reason: `Prompt quality below threshold (${(quality.score * 100).toFixed(0)}% < ${(minQuality * 100).toFixed(0)}%)`,
            metadata: {
              intent,
              quality,
              suggestions: quality.suggestions,
            },
          },
          startTime
        );
      }

      // 4. Analyze scope
      const scope = this.analyzeScope(prompt);

      // Check scope complexity
      const maxComplexity = options.maxScopeComplexity || 8;
      if (scope.complexity > maxComplexity) {
        return this.createResult(
          {
            action: 'warn',
            confidence: 0.7,
            reason: `Scope complexity (${scope.complexity}/10) exceeds maximum (${maxComplexity}/10)`,
            metadata: {
              intent,
              quality,
              scope,
              concerns: scope.concerns,
            },
          },
          startTime
        );
      }

      // 5. All checks passed
      return this.createResult(
        {
          action: 'allow',
          confidence: Math.min(intent.confidence, quality.score),
          reason: 'Prompt passed semantic validation',
          metadata: {
            intent,
            quality,
            scope,
          },
        },
        startTime
      );
    } catch (error) {
      if (!config.continueOnError) {
        return this.createResult(
          {
            action: 'warn',
            confidence: 0.5,
            reason: `Semantic analysis error: ${error instanceof Error ? error.message : String(error)}`,
          },
          startTime
        );
      }

      return this.createResult(
        {
          action: 'allow',
          confidence: 0.5,
          reason: `Semantic analysis error (continuing): ${error instanceof Error ? error.message : String(error)}`,
        },
        startTime
      );
    }
  }

  shouldBypass(context: GuardrailContext): boolean {
    if (!context.userRoles) return false;
    return context.userRoles.some(role => this.bypassRoles.has(role));
  }

  // ===========================================================================
  // INTENT CLASSIFICATION
  // ===========================================================================

  private classifyIntent(prompt: string): IntentClassification {
    const matchedKeywords: string[] = [];
    const scores: Record<IntentCategory, number> = {
      build_application: 0,
      modify_code: 0,
      debug_issue: 0,
      explain_concept: 0,
      generate_content: 0,
      data_analysis: 0,
      security_related: 0,
      administrative: 0,
      harmful_intent: 0,
      unclear: 0,
    };

    // Check each intent category
    for (const [category, patterns] of Object.entries(INTENT_PATTERNS) as [IntentCategory, RegExp[]][]) {
      for (const pattern of patterns) {
        const match = prompt.match(pattern);
        if (match) {
          scores[category] += 1;
          matchedKeywords.push(match[0]);
        }
      }
    }

    // Find primary and secondary intents
    const sorted = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]) as [IntentCategory, number][];

    if (sorted.length === 0) {
      return {
        primary: 'unclear',
        secondary: [],
        confidence: 0.3,
        matchedKeywords: [],
      };
    }

    const primary = sorted[0][0];
    const primaryScore = sorted[0][1];
    const secondary = sorted.slice(1).map(([cat]) => cat);

    // Calculate confidence
    const totalScore = sorted.reduce((sum, [_, score]) => sum + score, 0);
    const confidence = Math.min(0.95, 0.5 + (primaryScore / totalScore) * 0.5);

    return {
      primary,
      secondary,
      confidence,
      matchedKeywords: [...new Set(matchedKeywords)],
    };
  }

  // ===========================================================================
  // QUALITY ASSESSMENT
  // ===========================================================================

  private assessQuality(prompt: string): QualityAssessment {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Clarity: Sentence structure, grammar indicators
    const clarity = this.assessClarity(prompt, issues, suggestions);

    // Specificity: Concrete details vs vague language
    const specificity = this.assessSpecificity(prompt, issues, suggestions);

    // Completeness: Required information present
    const completeness = this.assessCompleteness(prompt, issues, suggestions);

    // Relevance: Focus on task, not tangents
    const relevance = this.assessRelevance(prompt, issues, suggestions);

    // Overall score (weighted average)
    const score =
      clarity * 0.25 +
      specificity * 0.3 +
      completeness * 0.25 +
      relevance * 0.2;

    return {
      score,
      dimensions: {
        clarity,
        specificity,
        completeness,
        relevance,
      },
      issues,
      suggestions,
    };
  }

  private assessClarity(prompt: string, issues: string[], suggestions: string[]): number {
    let score = 1.0;

    // Check for excessive length without structure
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = prompt.length / Math.max(1, sentences.length);

    if (avgSentenceLength > 200) {
      score -= 0.2;
      issues.push('Sentences are too long');
      suggestions.push('Break long sentences into shorter, clearer ones');
    }

    // Check for excessive use of vague words
    const vagueWords = /\b(thing|stuff|something|somehow|somewhere|whatever|etc)\b/gi;
    const vagueCount = (prompt.match(vagueWords) || []).length;
    if (vagueCount > 3) {
      score -= 0.15;
      issues.push('Uses too many vague terms');
      suggestions.push('Replace vague terms with specific details');
    }

    // Check for contradictions
    if (/\b(but|however)\b.*\b(but|however)\b/i.test(prompt)) {
      score -= 0.1;
      issues.push('May contain contradictory requirements');
    }

    return Math.max(0.1, score);
  }

  private assessSpecificity(prompt: string, issues: string[], suggestions: string[]): number {
    let score = 0.5; // Start neutral

    // Positive: Contains specific technologies/frameworks
    const techTerms = /\b(react|vue|angular|typescript|javascript|python|node|next\.?js|express|django|flask|postgres|mongodb|redis|docker|kubernetes|aws|gcp|azure)\b/gi;
    const techMatches = (prompt.match(techTerms) || []).length;
    score += Math.min(0.3, techMatches * 0.1);

    // Positive: Contains numbers/metrics
    const hasNumbers = /\b\d+\b/.test(prompt);
    if (hasNumbers) {
      score += 0.1;
    }

    // Positive: Contains specific feature descriptions
    const featureIndicators = /\b(with|including|such as|like|for example)\b/gi;
    const featureCount = (prompt.match(featureIndicators) || []).length;
    score += Math.min(0.2, featureCount * 0.05);

    // Negative: Too short to be specific
    if (prompt.length < 50) {
      score -= 0.3;
      issues.push('Prompt is very short');
      suggestions.push('Add more details about what you want to achieve');
    }

    return Math.max(0.1, Math.min(1.0, score));
  }

  private assessCompleteness(prompt: string, issues: string[], suggestions: string[]): number {
    let score = 0.7; // Start with assumption of reasonable completeness

    // Check for question marks without clear answers needed
    const hasQuestion = /\?/.test(prompt);

    // Check for action verbs
    const actionVerbs = /\b(build|create|make|implement|add|remove|fix|update|deploy|configure|analyze|generate)\b/i;
    if (!actionVerbs.test(prompt) && !hasQuestion) {
      score -= 0.2;
      issues.push('No clear action specified');
      suggestions.push('Start with what you want to do (build, create, fix, etc.)');
    }

    // Check for context
    const contextIndicators = /\b(for|because|since|so that|in order to)\b/i;
    if (prompt.length > 100 && !contextIndicators.test(prompt)) {
      score -= 0.15;
      suggestions.push('Consider adding context about why you need this');
    }

    return Math.max(0.1, score);
  }

  private assessRelevance(prompt: string, issues: string[], suggestions: string[]): number {
    let score = 0.8; // Assume relevance by default

    // Check for off-topic tangents
    const tangentIndicators = /\b(by the way|unrelated|random thought|just curious|off topic)\b/i;
    if (tangentIndicators.test(prompt)) {
      score -= 0.3;
      issues.push('Contains off-topic content');
      suggestions.push('Focus on the main request');
    }

    // Check for excessive meta-discussion
    const metaIndicators = /\b(I think|in my opinion|I feel like|I wonder if)\b/gi;
    const metaCount = (prompt.match(metaIndicators) || []).length;
    if (metaCount > 3) {
      score -= 0.2;
      suggestions.push('Focus on what you need rather than opinions');
    }

    return Math.max(0.1, score);
  }

  // ===========================================================================
  // SCOPE ANALYSIS
  // ===========================================================================

  private analyzeScope(prompt: string): ScopeAnalysis {
    const estimatedComponents: string[] = [];
    const concerns: string[] = [];
    let complexity = 0;

    // Detect mentioned components
    const componentPatterns: Record<string, RegExp> = {
      'Frontend': /\b(frontend|ui|interface|react|vue|angular|html|css)\b/i,
      'Backend': /\b(backend|server|api|rest|graphql|endpoint)\b/i,
      'Database': /\b(database|db|sql|postgres|mongo|redis|storage)\b/i,
      'Authentication': /\b(auth|login|signup|jwt|oauth|session)\b/i,
      'Payments': /\b(payment|stripe|paypal|checkout|billing)\b/i,
      'File Upload': /\b(upload|file|image|video|attachment)\b/i,
      'Real-time': /\b(realtime|real-time|websocket|live|streaming)\b/i,
      'Email': /\b(email|smtp|sendgrid|mailgun|notification)\b/i,
      'Search': /\b(search|elasticsearch|algolia|filter|query)\b/i,
      'Analytics': /\b(analytics|tracking|metrics|dashboard|report)\b/i,
    };

    for (const [component, pattern] of Object.entries(componentPatterns)) {
      if (pattern.test(prompt)) {
        estimatedComponents.push(component);
        complexity += 1;
      }
    }

    // Check for complexity indicators
    const complexityIndicators: Array<{ pattern: RegExp; weight: number; concern: string }> = [
      { pattern: /\b(microservice|distributed|scalable)\b/i, weight: 2, concern: 'Distributed architecture adds complexity' },
      { pattern: /\b(machine learning|ml|ai|neural)\b/i, weight: 2, concern: 'ML integration requires specialized expertise' },
      { pattern: /\b(blockchain|crypto|web3)\b/i, weight: 2, concern: 'Blockchain integration is complex' },
      { pattern: /\b(multi-tenant|saas)\b/i, weight: 1.5, concern: 'Multi-tenancy adds architectural complexity' },
      { pattern: /\b(enterprise|large-scale)\b/i, weight: 1.5, concern: 'Enterprise requirements increase scope' },
    ];

    for (const indicator of complexityIndicators) {
      if (indicator.pattern.test(prompt)) {
        complexity += indicator.weight;
        concerns.push(indicator.concern);
      }
    }

    // Normalize complexity to 0-10 scale
    complexity = Math.min(10, complexity);

    return {
      complexity,
      estimatedComponents,
      concerns,
      withinLimits: complexity <= 8,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private createResult(
    partial: Partial<LayerValidationResult>,
    startTime: number
  ): LayerValidationResult {
    return {
      layer: this.layer,
      action: partial.action || 'allow',
      confidence: partial.confidence || 1.0,
      reason: partial.reason || 'Validation complete',
      durationMs: Date.now() - startTime,
      metadata: partial.metadata,
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new Semantic layer instance.
 */
export function createSemanticLayer(
  blockedIntents?: IntentCategory[],
  bypassRoles?: string[]
): SemanticLayer {
  return new SemanticLayer(blockedIntents, bypassRoles);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { INTENT_PATTERNS };
