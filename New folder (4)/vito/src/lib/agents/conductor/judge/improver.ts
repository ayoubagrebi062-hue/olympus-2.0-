/**
 * Improvement Suggester
 *
 * Analyzes quality scores and validation results to suggest improvements.
 * Determines retry strategies when quality is low.
 */

import type {
  QualityScore,
  QualityDimensions,
  ValidationResult,
  ImprovementSuggestion,
  RetryStrategy,
} from './types';

// ============================================================================
// AGENT-SPECIFIC SUGGESTIONS
// ============================================================================

const AGENT_SPECIFIC_SUGGESTIONS: Record<string, ImprovementSuggestion> = {
  strategos: {
    aspect: 'MVP Clarity',
    currentState: 'MVP scope may be unclear',
    suggestedFix: 'Ensure each feature has clear acceptance criteria and priority',
    priority: 'high',
    estimatedImpact: 9,
  },
  archon: {
    aspect: 'Tech Justification',
    currentState: 'Technology choices may lack reasoning',
    suggestedFix: 'Explain why each technology was chosen over alternatives',
    priority: 'medium',
    estimatedImpact: 7,
  },
  pixel: {
    aspect: 'Component Reusability',
    currentState: 'Components may be too specific',
    suggestedFix: 'Design components with reusability and props in mind',
    priority: 'medium',
    estimatedImpact: 6,
  },
  datum: {
    aspect: 'Data Relationships',
    currentState: 'Relationships may be incomplete',
    suggestedFix: 'Verify all foreign keys and relationship types are defined',
    priority: 'high',
    estimatedImpact: 8,
  },
  nexus: {
    aspect: 'API Consistency',
    currentState: 'Endpoint naming may be inconsistent',
    suggestedFix: 'Follow REST conventions and maintain consistent naming patterns',
    priority: 'medium',
    estimatedImpact: 7,
  },
  wire: {
    aspect: 'Page Structure',
    currentState: 'Page layouts may be incomplete',
    suggestedFix: 'Ensure all necessary pages and routes are defined with proper layouts',
    priority: 'high',
    estimatedImpact: 8,
  },
  engine: {
    aspect: 'Business Logic',
    currentState: 'Business rules may be scattered',
    suggestedFix: 'Centralize business logic in service layer with clear separation',
    priority: 'high',
    estimatedImpact: 8,
  },
  oracle: {
    aspect: 'Market Analysis Depth',
    currentState: 'Analysis may be superficial',
    suggestedFix: 'Include specific market data, trends, and competitor details',
    priority: 'medium',
    estimatedImpact: 6,
  },
  empathy: {
    aspect: 'Persona Specificity',
    currentState: 'User personas may be generic',
    suggestedFix: 'Add specific demographics, behaviors, and goals to each persona',
    priority: 'medium',
    estimatedImpact: 6,
  },
};

// ============================================================================
// MAX RETRIES PER AGENT
// ============================================================================

const AGENT_MAX_RETRIES: Record<string, number> = {
  // Critical agents get more retries
  strategos: 3,
  archon: 3,
  pixel: 3,
  datum: 3,
  engine: 3,
  wire: 3,
  // Standard agents
  oracle: 2,
  empathy: 2,
  palette: 2,
  blocks: 2,
  cartographer: 2,
  nexus: 2,
  sentinel: 2,
  forge: 2,
  // Non-critical agents
  scope: 2,
  polish: 1,
  tether: 2,
};

// ============================================================================
// IMPROVEMENT SUGGESTER CLASS
// ============================================================================

export class ImprovementSuggester {
  /**
   * Generate improvement suggestions based on scores and validation
   */
  suggest(
    agentId: string,
    score: QualityScore,
    validation: ValidationResult
  ): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // 1. Suggestions from low dimension scores
    suggestions.push(...this.suggestFromScores(score));

    // 2. Suggestions from validation errors
    suggestions.push(...this.suggestFromValidation(validation));

    // 3. Agent-specific suggestions
    suggestions.push(...this.suggestForAgent(agentId, score));

    // Sort by priority and impact, deduplicate
    const sorted = suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.estimatedImpact - a.estimatedImpact;
    });

    // Deduplicate by aspect and return top 5
    const seen = new Set<string>();
    return sorted.filter((s) => {
      if (seen.has(s.aspect)) return false;
      seen.add(s.aspect);
      return true;
    }).slice(0, 5);
  }

  /**
   * Determine retry strategy based on quality assessment
   */
  determineRetryStrategy(
    agentId: string,
    score: QualityScore,
    validation: ValidationResult,
    currentRetry: number
  ): RetryStrategy {
    const maxRetries = this.getMaxRetries(agentId);

    // Already at max retries
    if (currentRetry >= maxRetries) {
      return {
        type: 'same',
        maxRetries,
        currentRetry,
      };
    }

    const { dimensions } = score;

    // Very low completeness - try simplified approach
    if (dimensions.completeness < 4) {
      return {
        type: 'simplified',
        focusAreas: ['core_requirements_only', 'minimal_viable_output'],
        modifiedPrompt: this.createSimplifiedPrompt(agentId),
        maxRetries,
        currentRetry: currentRetry + 1,
      };
    }

    // Low correctness - try alternative approach
    if (dimensions.correctness < 5) {
      return {
        type: 'alternative',
        focusAreas: ['accuracy', 'best_practices', 'technical_correctness'],
        modifiedPrompt: this.createAlternativePrompt(agentId),
        maxRetries,
        currentRetry: currentRetry + 1,
      };
    }

    // Low consistency - provide more context
    if (dimensions.consistency < 5) {
      return {
        type: 'same',
        focusAreas: ['align_with_previous', 'use_established_patterns', 'maintain_naming'],
        modifiedPrompt: this.createConsistencyPrompt(agentId),
        maxRetries,
        currentRetry: currentRetry + 1,
      };
    }

    // Multiple validation errors - decompose the task
    if (score.overall < 6 && validation.errors.length > 3) {
      return {
        type: 'decomposed',
        focusAreas: validation.errors.map((e) => e.field),
        modifiedPrompt: this.createDecomposedPrompt(agentId, validation),
        maxRetries,
        currentRetry: currentRetry + 1,
      };
    }

    // Default: retry with emphasis on weak areas
    return {
      type: 'same',
      focusAreas: this.getWeakAreas(dimensions),
      modifiedPrompt: this.createFocusedPrompt(agentId, dimensions),
      maxRetries,
      currentRetry: currentRetry + 1,
    };
  }

  /**
   * Get maximum retries for an agent
   */
  getMaxRetries(agentId: string): number {
    return AGENT_MAX_RETRIES[agentId] || 2;
  }

  /**
   * Generate suggestions from low quality scores
   */
  private suggestFromScores(score: QualityScore): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];
    const { dimensions } = score;

    if (dimensions.completeness < 6) {
      suggestions.push({
        aspect: 'Completeness',
        currentState: `Score: ${dimensions.completeness}/10 - Missing required elements`,
        suggestedFix: 'Include all required fields and expand on each section',
        priority: dimensions.completeness < 4 ? 'high' : 'medium',
        estimatedImpact: 8,
      });
    }

    if (dimensions.correctness < 6) {
      suggestions.push({
        aspect: 'Correctness',
        currentState: `Score: ${dimensions.correctness}/10 - Technical issues detected`,
        suggestedFix: 'Review for accuracy, fix logical errors, follow best practices',
        priority: 'high',
        estimatedImpact: 9,
      });
    }

    if (dimensions.consistency < 6) {
      suggestions.push({
        aspect: 'Consistency',
        currentState: `Score: ${dimensions.consistency}/10 - Conflicts with previous outputs`,
        suggestedFix: 'Align naming conventions and patterns with earlier agents',
        priority: 'medium',
        estimatedImpact: 7,
      });
    }

    if (dimensions.creativity < 5) {
      suggestions.push({
        aspect: 'Creativity',
        currentState: `Score: ${dimensions.creativity}/10 - Output is too basic`,
        suggestedFix: 'Add innovative features, optimize beyond minimum requirements',
        priority: 'low',
        estimatedImpact: 5,
      });
    }

    if (dimensions.clarity < 6) {
      suggestions.push({
        aspect: 'Clarity',
        currentState: `Score: ${dimensions.clarity}/10 - Structure unclear`,
        suggestedFix: 'Improve organization, add comments, use clear naming',
        priority: 'medium',
        estimatedImpact: 6,
      });
    }

    return suggestions;
  }

  /**
   * Generate suggestions from validation errors
   */
  private suggestFromValidation(validation: ValidationResult): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // Critical errors
    const criticalErrors = validation.errors.filter((e) => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      suggestions.push({
        aspect: 'Critical Fields',
        currentState: `Missing: ${criticalErrors.map((e) => e.field).join(', ')}`,
        suggestedFix: 'Add all required critical fields before proceeding',
        priority: 'high',
        estimatedImpact: 10,
      });
    }

    // Major errors
    const majorErrors = validation.errors.filter((e) => e.severity === 'major');
    if (majorErrors.length > 0) {
      suggestions.push({
        aspect: 'Required Fields',
        currentState: `Missing or invalid: ${majorErrors.map((e) => e.field).join(', ')}`,
        suggestedFix: 'Address all major validation errors',
        priority: 'high',
        estimatedImpact: 8,
      });
    }

    // Low coverage
    if (validation.coverage < 70) {
      suggestions.push({
        aspect: 'Schema Coverage',
        currentState: `Only ${validation.coverage}% of expected fields present`,
        suggestedFix: 'Include more of the expected output structure',
        priority: 'medium',
        estimatedImpact: 7,
      });
    }

    // Warnings
    if (validation.warnings.length > 3) {
      suggestions.push({
        aspect: 'Quality Warnings',
        currentState: `${validation.warnings.length} warnings detected`,
        suggestedFix: validation.warnings
          .slice(0, 3)
          .map((w) => w.suggestion)
          .join('; '),
        priority: 'low',
        estimatedImpact: 4,
      });
    }

    return suggestions;
  }

  /**
   * Generate agent-specific suggestions
   */
  private suggestForAgent(
    agentId: string,
    score: QualityScore
  ): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // Only add agent-specific suggestion if score is below 8
    if (score.overall < 8 && agentId in AGENT_SPECIFIC_SUGGESTIONS) {
      suggestions.push(AGENT_SPECIFIC_SUGGESTIONS[agentId]);
    }

    return suggestions;
  }

  /**
   * Get weak areas from dimension scores
   */
  private getWeakAreas(dimensions: QualityDimensions): string[] {
    return Object.entries(dimensions)
      .filter(([_, score]) => score < 7)
      .sort(([_, a], [__, b]) => a - b)
      .map(([key]) => key);
  }

  /**
   * Create simplified prompt for low completeness
   */
  private createSimplifiedPrompt(agentId: string): string {
    return `SIMPLIFIED TASK: Focus only on the essential, core requirements.
Skip advanced features and optimizations.
Produce a minimal but complete output.
Ensure all required fields are present, even if basic.

Agent: ${agentId}
Priority: COMPLETENESS over complexity`;
  }

  /**
   * Create alternative prompt for low correctness
   */
  private createAlternativePrompt(agentId: string): string {
    return `ALTERNATIVE APPROACH: The previous approach had accuracy issues.
Try a different approach, focusing on:
1. Following established best practices
2. Using proven patterns
3. Prioritizing correctness over creativity
4. Double-checking technical accuracy

Agent: ${agentId}
Priority: CORRECTNESS and ACCURACY`;
  }

  /**
   * Create consistency prompt for alignment issues
   */
  private createConsistencyPrompt(agentId: string): string {
    return `CONSISTENCY FOCUS: Previous attempt had alignment issues.
Carefully review outputs from earlier agents and:
1. Match naming conventions exactly
2. Use the same terminology
3. Build upon (don't contradict) previous decisions
4. Reference established patterns

Agent: ${agentId}
Priority: CONSISTENCY with previous outputs`;
  }

  /**
   * Create decomposed prompt for multiple issues
   */
  private createDecomposedPrompt(
    agentId: string,
    validation: ValidationResult
  ): string {
    const missingFields = validation.errors.map((e) => e.field).join(', ');

    return `FOCUSED TASK: Multiple issues detected. Address these specific fields:
${missingFields}

For each field:
1. Understand what's expected
2. Provide complete, valid content
3. Ensure it integrates with other fields

Agent: ${agentId}
Priority: Address SPECIFIC ISSUES one by one`;
  }

  /**
   * Create focused prompt for weak areas
   */
  private createFocusedPrompt(
    agentId: string,
    dimensions: QualityDimensions
  ): string {
    const weakAreas = this.getWeakAreas(dimensions);

    return `IMPROVEMENT FOCUS: Address these weak areas:
${weakAreas.map((area) => `- ${area.toUpperCase()}: Score was low, needs improvement`).join('\n')}

Specifically:
${weakAreas.includes('completeness') ? '- Include ALL required sections\n' : ''}
${weakAreas.includes('correctness') ? '- Double-check technical accuracy\n' : ''}
${weakAreas.includes('consistency') ? '- Align with previous agent outputs\n' : ''}
${weakAreas.includes('creativity') ? '- Add innovative elements\n' : ''}
${weakAreas.includes('clarity') ? '- Improve structure and organization\n' : ''}

Agent: ${agentId}`;
  }
}
