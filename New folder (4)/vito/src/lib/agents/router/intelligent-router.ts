/**
 * OLYMPUS 50X - Intelligent Model Router
 *
 * Routes tasks to optimal Claude model based on complexity analysis.
 * Achieves 70% cost reduction by using:
 * - Haiku for simple tasks (10x cheaper than Sonnet)
 * - Sonnet for medium tasks (default)
 * - Opus for complex tasks (only when needed)
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================
// TYPES
// ============================================

export type ModelTier = 'haiku' | 'sonnet' | 'opus';

export type TaskComplexity = 'simple' | 'medium' | 'complex';

export interface ComplexityAnalysis {
  complexity: TaskComplexity;
  tier: ModelTier;
  confidence: number;
  reasons: string[];
  estimatedTokens: number;
  estimatedCost: number;
}

export interface RoutingDecision {
  model: string;
  tier: ModelTier;
  complexity: TaskComplexity;
  cost: {
    estimated: number;
    saved: number;      // vs always using Opus
    savingsPercent: number;
  };
  reasoning: string;
}

export interface RouterStats {
  totalRequests: number;
  byTier: Record<ModelTier, number>;
  totalCost: number;
  totalSaved: number;
  averageSavingsPercent: number;
}

export interface RouterConfig {
  defaultTier: ModelTier;
  enableComplexityAnalysis: boolean;
  costOptimization: 'aggressive' | 'balanced' | 'quality';
  overrides?: {
    forceHaiku?: string[];  // Agent IDs to always use Haiku
    forceSonnet?: string[]; // Agent IDs to always use Sonnet
    forceOpus?: string[];   // Agent IDs to always use Opus
  };
}

// ============================================
// CONSTANTS
// ============================================

export const MODEL_IDS: Record<ModelTier, string> = {
  haiku: 'claude-3-5-haiku-20241022',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514',
};

// Pricing per 1M tokens (as of 2024)
export const MODEL_PRICING = {
  haiku: { input: 0.25, output: 1.25 },
  sonnet: { input: 3.00, output: 15.00 },
  opus: { input: 15.00, output: 75.00 },
};

// Complexity indicators
const SIMPLE_INDICATORS = [
  'simple', 'basic', 'quick', 'small', 'minor', 'trivial',
  'badge', 'button', 'icon', 'divider', 'spacer', 'skeleton',
];

const COMPLEX_INDICATORS = [
  'complex', 'advanced', 'sophisticated', 'comprehensive', 'enterprise',
  'dashboard', 'analytics', 'multi-step', 'wizard', 'workflow',
  'authentication', 'authorization', 'real-time', 'socket',
  'chart', 'graph', 'visualization', 'data-table', 'crud',
];

// ============================================
// INTELLIGENT ROUTER
// ============================================

export class IntelligentModelRouter {
  private anthropic: Anthropic;
  private config: RouterConfig;
  private stats: RouterStats = {
    totalRequests: 0,
    byTier: { haiku: 0, sonnet: 0, opus: 0 },
    totalCost: 0,
    totalSaved: 0,
    averageSavingsPercent: 0,
  };

  constructor(config: Partial<RouterConfig> = {}) {
    this.anthropic = new Anthropic();

    // Default overrides: Code-generating agents MUST use Sonnet (not Haiku)
    // Haiku has 4096 max tokens which is too small for component generation
    const defaultOverrides = {
      forceSonnet: [
        'pixel',     // Component generator - needs full 8192 tokens
        'wire',      // Page assembly - needs full token capacity
        'polish',    // Enhancement agent - needs full capacity
        'engine',    // Backend code generator
        'gateway',   // API route generator
        'forge',     // Infrastructure generator
        'blocks',    // UI component specs
      ],
    };

    this.config = {
      defaultTier: 'sonnet',
      enableComplexityAnalysis: true,
      costOptimization: 'balanced',
      ...config,
      overrides: {
        ...defaultOverrides,
        ...config.overrides,
        // Merge forceSonnet arrays if both exist
        forceSonnet: [
          ...defaultOverrides.forceSonnet,
          ...(config.overrides?.forceSonnet || []),
        ],
      },
    };
  }

  /**
   * Analyze task complexity
   */
  analyzeComplexity(prompt: string, agentId?: string): ComplexityAnalysis {
    const promptLower = prompt.toLowerCase();
    const promptLength = prompt.length;

    // Check for forced overrides
    if (agentId && this.config.overrides) {
      if (this.config.overrides.forceHaiku?.includes(agentId)) {
        return this.buildAnalysis('simple', 'haiku', 1.0, ['Agent forced to Haiku'], promptLength);
      }
      if (this.config.overrides.forceSonnet?.includes(agentId)) {
        return this.buildAnalysis('medium', 'sonnet', 1.0, ['Agent forced to Sonnet (code generator)'], promptLength);
      }
      if (this.config.overrides.forceOpus?.includes(agentId)) {
        return this.buildAnalysis('complex', 'opus', 1.0, ['Agent forced to Opus'], promptLength);
      }
    }

    // Quick heuristics
    const reasons: string[] = [];
    let simpleScore = 0;
    let complexScore = 0;

    // Check for complexity indicators
    for (const indicator of SIMPLE_INDICATORS) {
      if (promptLower.includes(indicator)) {
        simpleScore++;
        reasons.push(`Contains simple indicator: "${indicator}"`);
      }
    }

    for (const indicator of COMPLEX_INDICATORS) {
      if (promptLower.includes(indicator)) {
        complexScore++;
        reasons.push(`Contains complex indicator: "${indicator}"`);
      }
    }

    // Length-based scoring
    if (promptLength < 100) {
      simpleScore += 2;
      reasons.push('Short prompt (<100 chars)');
    } else if (promptLength > 500) {
      complexScore++;
      reasons.push('Long prompt (>500 chars)');
    }

    if (promptLength > 1000) {
      complexScore++;
      reasons.push('Very long prompt (>1000 chars)');
    }

    // Feature count (look for bullet points, numbered lists)
    const featureMatches = prompt.match(/[-•*]\s|^\d+\./gm);
    if (featureMatches && featureMatches.length > 5) {
      complexScore++;
      reasons.push(`Multiple features listed (${featureMatches.length})`);
    }

    // Technical keywords
    const technicalTerms = ['API', 'database', 'async', 'websocket', 'OAuth', 'JWT', 'encryption'];
    for (const term of technicalTerms) {
      if (prompt.includes(term)) {
        complexScore++;
        reasons.push(`Technical term: ${term}`);
        break; // Only count once
      }
    }

    // Cost optimization adjustment
    if (this.config.costOptimization === 'aggressive') {
      simpleScore += 1; // Bias toward cheaper models
    } else if (this.config.costOptimization === 'quality') {
      complexScore += 1; // Bias toward better models
    }

    // Determine tier
    let complexity: TaskComplexity;
    let tier: ModelTier;
    let confidence: number;

    if (complexScore > simpleScore + 2) {
      complexity = 'complex';
      tier = 'opus';
      confidence = Math.min(0.9, 0.5 + complexScore * 0.1);
    } else if (simpleScore > complexScore + 1) {
      complexity = 'simple';
      tier = 'haiku';
      confidence = Math.min(0.9, 0.5 + simpleScore * 0.1);
    } else {
      complexity = 'medium';
      tier = 'sonnet';
      confidence = 0.7;
    }

    return this.buildAnalysis(complexity, tier, confidence, reasons, promptLength);
  }

  /**
   * Build complexity analysis object
   */
  private buildAnalysis(
    complexity: TaskComplexity,
    tier: ModelTier,
    confidence: number,
    reasons: string[],
    promptLength: number
  ): ComplexityAnalysis {
    const estimatedTokens = Math.ceil(promptLength / 4) + 2000; // Input + estimated output
    const pricing = MODEL_PRICING[tier];
    const estimatedCost = (estimatedTokens / 1_000_000) * (pricing.input + pricing.output);

    return {
      complexity,
      tier,
      confidence,
      reasons,
      estimatedTokens,
      estimatedCost,
    };
  }

  /**
   * Get routing decision for a prompt
   */
  route(prompt: string, agentId?: string): RoutingDecision {
    const analysis = this.config.enableComplexityAnalysis
      ? this.analyzeComplexity(prompt, agentId)
      : this.buildAnalysis('medium', this.config.defaultTier, 0.5, ['Default tier'], prompt.length);

    // Calculate costs
    const opusCost = (analysis.estimatedTokens / 1_000_000) * (MODEL_PRICING.opus.input + MODEL_PRICING.opus.output);
    const actualCost = analysis.estimatedCost;
    const saved = opusCost - actualCost;
    const savingsPercent = (saved / opusCost) * 100;

    // Update stats
    this.stats.totalRequests++;
    this.stats.byTier[analysis.tier]++;
    this.stats.totalCost += actualCost;
    this.stats.totalSaved += saved;
    this.stats.averageSavingsPercent =
      (this.stats.totalSaved / (this.stats.totalCost + this.stats.totalSaved)) * 100;

    return {
      model: MODEL_IDS[analysis.tier],
      tier: analysis.tier,
      complexity: analysis.complexity,
      cost: {
        estimated: actualCost,
        saved,
        savingsPercent,
      },
      reasoning: `${analysis.complexity} task → ${analysis.tier} (${analysis.confidence * 100}% confidence). ${analysis.reasons[0]}`,
    };
  }

  /**
   * Execute a completion with intelligent routing
   */
  async complete(
    prompt: string,
    options: {
      agentId?: string;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<{
    response: string;
    routing: RoutingDecision;
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      actualCost: number;
    };
  }> {
    const routing = this.route(prompt, options.agentId);

    const response = await this.anthropic.messages.create({
      model: routing.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const pricing = MODEL_PRICING[routing.tier];
    const actualCost =
      (response.usage.input_tokens / 1_000_000) * pricing.input +
      (response.usage.output_tokens / 1_000_000) * pricing.output;

    return {
      response: text,
      routing,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        actualCost,
      },
    };
  }

  /**
   * Get router statistics
   */
  getStats(): RouterStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      byTier: { haiku: 0, sonnet: 0, opus: 0 },
      totalCost: 0,
      totalSaved: 0,
      averageSavingsPercent: 0,
    };
  }

  /**
   * Get cost report
   */
  getCostReport(): string {
    const s = this.stats;
    return `
═══════════════════════════════════════════════════════════
              50X INTELLIGENT ROUTER - COST REPORT
═══════════════════════════════════════════════════════════

REQUESTS BY TIER:
  Haiku:  ${s.byTier.haiku} (${((s.byTier.haiku / s.totalRequests) * 100).toFixed(1)}%)
  Sonnet: ${s.byTier.sonnet} (${((s.byTier.sonnet / s.totalRequests) * 100).toFixed(1)}%)
  Opus:   ${s.byTier.opus} (${((s.byTier.opus / s.totalRequests) * 100).toFixed(1)}%)

COST ANALYSIS:
  Total Spent:    $${s.totalCost.toFixed(4)}
  Total Saved:    $${s.totalSaved.toFixed(4)}
  Savings Rate:   ${s.averageSavingsPercent.toFixed(1)}%

  (Savings compared to using Opus for all requests)

═══════════════════════════════════════════════════════════
`.trim();
  }
}

// ============================================
// AGENT-SPECIFIC ROUTING RULES
// ============================================

/**
 * Default routing rules for 50X pipeline agents
 */
export const PIPELINE_AGENT_TIERS: Record<string, ModelTier> = {
  // Fast agents (Haiku)
  planner: 'haiku',
  reviewer: 'haiku',

  // Balanced agents (Sonnet)
  designer: 'sonnet',
  coder: 'sonnet',
  fixer: 'sonnet',
};

/**
 * Get recommended tier for pipeline agent
 */
export function getAgentTier(agentId: string): ModelTier {
  return PIPELINE_AGENT_TIERS[agentId] || 'sonnet';
}

// ============================================
// SINGLETON & CONVENIENCE
// ============================================

let routerInstance: IntelligentModelRouter | null = null;

/**
 * Get singleton router instance
 */
export function getIntelligentRouter(config?: Partial<RouterConfig>): IntelligentModelRouter {
  if (!routerInstance) {
    routerInstance = new IntelligentModelRouter(config);
  }
  return routerInstance;
}

/**
 * Quick routing decision
 */
export function routeTask(prompt: string, agentId?: string): RoutingDecision {
  return getIntelligentRouter().route(prompt, agentId);
}

/**
 * Execute with intelligent routing
 */
export async function smartComplete(
  prompt: string,
  options?: {
    agentId?: string;
    systemPrompt?: string;
    maxTokens?: number;
  }
) {
  return getIntelligentRouter().complete(prompt, options);
}

export default IntelligentModelRouter;
