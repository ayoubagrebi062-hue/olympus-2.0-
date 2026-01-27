/**
 * OLYMPUS AI Router
 *
 * Intelligent routing:
 * - Routes agents to optimal providers
 * - Local first (FREE), cloud as fallback
 * - Automatic failover
 * - Cost tracking
 */

import {
  AIProviderInterface,
  AIProviderType,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  RoutingDecision,
  RoutingContext,
  ExecutionResult,
  ExecutionOptions,
  AgentCategory,
  TaskComplexity,
  AGENT_PROVIDER_MAP,
  getAgentCategory,
  calculateCost,
} from './types';

import { OllamaProvider, getOllamaProvider } from './ollama';
import { GroqProvider, getGroqProvider } from './groq';
import { OpenAIProvider, getOpenAIProvider } from './openai';
import { AnthropicProvider, getAnthropicProvider } from './anthropic';

/**
 * Provider registry
 */
interface ProviderRegistry {
  [AIProviderType.OLLAMA]?: AIProviderInterface;
  [AIProviderType.GROQ]?: AIProviderInterface;
  [AIProviderType.ANTHROPIC]?: AIProviderInterface;
  [AIProviderType.OPENROUTER]?: AIProviderInterface;
  [AIProviderType.LM_STUDIO]?: AIProviderInterface;
  [AIProviderType.OPENAI]?: AIProviderInterface;
}

/**
 * Router configuration
 */
interface RouterConfig {
  maxRetries: number;
  fallbackEnabled: boolean;
  localFirst: boolean;
  timeout: number;
}

const DEFAULT_CONFIG: RouterConfig = {
  maxRetries: 2,
  fallbackEnabled: true,
  localFirst: false, // DISABLED - Use cloud providers (GROQ, OpenAI, Anthropic)
  timeout: 120000,
};

/**
 * AI Router Class
 */
export class AIRouter {
  private providers: ProviderRegistry = {};
  private config: RouterConfig;
  private healthCache: Map<AIProviderType, { healthy: boolean; checkedAt: number }> = new Map();
  private readonly HEALTH_CACHE_TTL = 30000; // 30 seconds

  constructor(config?: Partial<RouterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeProviders();
  }

  /**
   * Initialize available providers
   * PRIORITY: Anthropic (PRIMARY) → OpenAI (FALLBACK) → Groq (FALLBACK2) → Ollama (LOCAL EMERGENCY)
   * Anthropic is now PRIMARY since OpenAI credits exhausted
   */
  private initializeProviders(): void {
    // Anthropic as PRIMARY (Claude - high quality, user has credits)
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers[AIProviderType.ANTHROPIC] = getAnthropicProvider();
      console.log('[AIRouter] Anthropic Claude provider initialized (PRIMARY)');
    }

    // OpenAI as FALLBACK (when Anthropic unavailable)
    if (process.env.OPENAI_API_KEY) {
      this.providers[AIProviderType.OPENAI] = getOpenAIProvider();
      console.log('[AIRouter] OpenAI provider initialized (FALLBACK)');
    }

    // Groq as FALLBACK2 (fast but blocked on some networks)
    if (process.env.GROQ_API_KEY) {
      this.providers[AIProviderType.GROQ] = getGroqProvider();
      console.log('[AIRouter] Groq provider initialized (FALLBACK2)');
    }

    // Ollama as EMERGENCY FALLBACK when no cloud providers available
    // This ensures builds can still complete using local LLMs
    const hasCloudProvider =
      process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
    if (!hasCloudProvider) {
      console.log('[AIRouter] No cloud API keys found - enabling Ollama as emergency fallback');
      this.providers[AIProviderType.OLLAMA] = getOllamaProvider();
      console.log('[AIRouter] Ollama provider initialized (EMERGENCY LOCAL)');
    }

    // Log which providers are active
    const activeProviders = Object.keys(this.providers).filter(
      k => this.providers[k as AIProviderType]
    );
    console.log(
      `[AIRouter] Active providers: ${activeProviders.join(', ') || 'NONE - CHECK API KEYS!'}`
    );
  }

  /**
   * Get routing decision for an agent
   */
  async route(context: RoutingContext): Promise<RoutingDecision> {
    const category = context.agentCategory;
    const mapping = AGENT_PROVIDER_MAP[category];

    // Check primary provider health
    const primaryHealthy = await this.isProviderHealthy(mapping.primary.provider);

    if (primaryHealthy) {
      return {
        primaryProvider: mapping.primary.provider,
        primaryModel: mapping.primary.model,
        fallbackProvider: mapping.fallback.provider,
        fallbackModel: mapping.fallback.model,
        reason: `Primary provider ${mapping.primary.provider} is healthy`,
        estimatedCost: this.estimateCost(
          mapping.primary.provider,
          mapping.primary.model,
          context.tokenEstimate
        ),
        estimatedLatency: this.estimateLatency(mapping.primary.provider),
      };
    }

    // Fallback if primary unhealthy
    const fallbackHealthy = await this.isProviderHealthy(mapping.fallback.provider);

    if (fallbackHealthy) {
      // When using fallback as primary, add Groq as secondary fallback
      return {
        primaryProvider: mapping.fallback.provider,
        primaryModel: mapping.fallback.model,
        fallbackProvider: AIProviderType.GROQ,
        fallbackModel: 'llama-3.3-70b-versatile', // Higher quality model for code
        reason: `Fallback to ${mapping.fallback.provider} - primary unavailable`,
        estimatedCost: this.estimateCost(
          mapping.fallback.provider,
          mapping.fallback.model,
          context.tokenEstimate
        ),
        estimatedLatency: this.estimateLatency(mapping.fallback.provider),
      };
    }

    // Emergency: use any available provider
    const anyHealthy = await this.findAnyHealthyProvider();
    if (anyHealthy) {
      // Use appropriate default model for the emergency provider
      // IMPORTANT: Use models with sufficient token limits for code generation
      const emergencyModel =
        anyHealthy.type === AIProviderType.OLLAMA
          ? 'llama3.2:latest' // Fast local model
          : anyHealthy.type === AIProviderType.GROQ
            ? 'llama-3.3-70b-versatile' // Higher quality + larger context (was 8b-instant with 6k limit)
            : anyHealthy.type === AIProviderType.ANTHROPIC
              ? 'claude-sonnet-4-20250514'
              : anyHealthy.type === AIProviderType.OPENAI
                ? 'gpt-4o-mini'
                : 'default';

      return {
        primaryProvider: anyHealthy.type,
        primaryModel: emergencyModel,
        reason: `Emergency fallback to ${anyHealthy.type}`,
        estimatedCost: 0,
        estimatedLatency: 5000,
      };
    }

    throw new Error('No AI providers available');
  }

  /**
   * Execute request with automatic routing and fallback
   */
  async execute(
    agentId: string,
    request: AIRequest,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const providersUsed: AIProviderType[] = [];
    let attempts = 0;
    let lastError: Error | null = null;

    // Get routing decision
    const category = getAgentCategory(agentId);
    const routingContext: RoutingContext = {
      agentId,
      agentCategory: category,
      complexity: this.assessComplexity(request),
      tokenEstimate: this.estimateRequestTokens(request),
      requiresReasoning: ['discovery', 'design', 'architecture'].includes(category),
      requiresSpeed: ['testing'].includes(category),
    };

    // Force specific provider if requested
    if (options?.forceProvider) {
      const provider = this.providers[options.forceProvider];
      if (provider) {
        try {
          const response = await provider.complete({
            ...request,
            model: options.forceModel || request.model,
          });

          return {
            success: true,
            response,
            attempts: 1,
            providersUsed: [options.forceProvider],
            totalLatencyMs: Date.now() - startTime,
            totalTokens: response.usage.totalTokens,
            totalCost: calculateCost(
              options.forceProvider,
              response.model,
              response.usage.promptTokens,
              response.usage.completionTokens
            ),
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            attempts: 1,
            providersUsed: [options.forceProvider],
            totalLatencyMs: Date.now() - startTime,
            totalTokens: 0,
            totalCost: 0,
          };
        }
      }
    }

    // Get routing decision
    const routing = await this.route(routingContext);
    const maxRetries = options?.maxRetries ?? this.config.maxRetries;

    // Try primary provider
    const primaryProvider = this.providers[routing.primaryProvider];
    if (primaryProvider) {
      attempts++;
      providersUsed.push(routing.primaryProvider);

      try {
        const response = await primaryProvider.complete({
          ...request,
          model: routing.primaryModel,
        });

        return {
          success: true,
          response,
          attempts,
          providersUsed,
          totalLatencyMs: Date.now() - startTime,
          totalTokens: response.usage.totalTokens,
          totalCost: calculateCost(
            routing.primaryProvider,
            response.model,
            response.usage.promptTokens,
            response.usage.completionTokens
          ),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Primary provider ${routing.primaryProvider} failed:`, lastError.message);

        // Mark as unhealthy
        this.healthCache.set(routing.primaryProvider, { healthy: false, checkedAt: Date.now() });
      }
    }

    // Try fallback provider
    console.log(
      `[AIRouter] Checking fallback: enabled=${this.config.fallbackEnabled}, fallbackProvider=${routing.fallbackProvider}`
    );
    if (this.config.fallbackEnabled && routing.fallbackProvider) {
      const fallbackProvider = this.providers[routing.fallbackProvider];
      console.log(
        `[AIRouter] Fallback provider found: ${!!fallbackProvider}, providers keys: ${Object.keys(this.providers).join(', ')}`
      );

      if (fallbackProvider) {
        attempts++;
        providersUsed.push(routing.fallbackProvider);
        console.log(
          `[AIRouter] Attempting fallback to ${routing.fallbackProvider} with model ${routing.fallbackModel}`
        );

        try {
          console.log(`[AIRouter] Calling ${routing.fallbackProvider}.complete()...`);
          const response = await fallbackProvider.complete({
            ...request,
            model: routing.fallbackModel,
          });
          console.log(
            `[AIRouter] Fallback ${routing.fallbackProvider} succeeded! Tokens: ${response.usage.totalTokens}`
          );

          return {
            success: true,
            response,
            attempts,
            providersUsed,
            totalLatencyMs: Date.now() - startTime,
            totalTokens: response.usage.totalTokens,
            totalCost: calculateCost(
              routing.fallbackProvider,
              response.model,
              response.usage.promptTokens,
              response.usage.completionTokens
            ),
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.warn(`Fallback provider ${routing.fallbackProvider} failed:`, lastError.message);
        }
      }
    }

    // All providers failed
    return {
      success: false,
      error: lastError?.message || 'All providers failed',
      attempts,
      providersUsed,
      totalLatencyMs: Date.now() - startTime,
      totalTokens: 0,
      totalCost: 0,
    };
  }

  /**
   * Stream execution (uses primary provider only)
   */
  async *stream(agentId: string, request: AIRequest): AsyncGenerator<AIStreamChunk> {
    const category = getAgentCategory(agentId);
    const mapping = AGENT_PROVIDER_MAP[category];

    const provider = this.providers[mapping.primary.provider];
    if (!provider) {
      throw new Error(`Provider ${mapping.primary.provider} not available`);
    }

    yield* provider.stream({
      ...request,
      model: mapping.primary.model,
    });
  }

  /**
   * Check if provider is healthy (with caching)
   */
  private async isProviderHealthy(type: AIProviderType): Promise<boolean> {
    const cached = this.healthCache.get(type);

    if (cached && Date.now() - cached.checkedAt < this.HEALTH_CACHE_TTL) {
      return cached.healthy;
    }

    const provider = this.providers[type];
    if (!provider) return false;

    try {
      const healthy = await provider.isAvailable();
      this.healthCache.set(type, { healthy, checkedAt: Date.now() });
      return healthy;
    } catch {
      this.healthCache.set(type, { healthy: false, checkedAt: Date.now() });
      return false;
    }
  }

  /**
   * Find any healthy provider
   */
  private async findAnyHealthyProvider(): Promise<AIProviderInterface | null> {
    for (const [type, provider] of Object.entries(this.providers)) {
      if (provider && (await this.isProviderHealthy(type as AIProviderType))) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Assess request complexity
   */
  private assessComplexity(request: AIRequest): TaskComplexity {
    const totalChars = request.messages.reduce((sum, m) => sum + m.content.length, 0);

    if (totalChars < 500) return TaskComplexity.SIMPLE;
    if (totalChars < 2000) return TaskComplexity.MODERATE;
    if (totalChars < 5000) return TaskComplexity.COMPLEX;
    return TaskComplexity.CRITICAL;
  }

  /**
   * Estimate request tokens
   */
  private estimateRequestTokens(request: AIRequest): number {
    const totalChars = request.messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Estimate cost for a request
   */
  private estimateCost(provider: AIProviderType, model: string, tokens: number): number {
    // Local is free
    if (provider === AIProviderType.OLLAMA || provider === AIProviderType.LM_STUDIO) {
      return 0;
    }

    // Rough estimates
    const costs: Record<string, number> = {
      groq: 0.0001, // Very cheap
      anthropic: 0.01, // More expensive
    };

    return (tokens / 1000) * (costs[provider] || 0.001);
  }

  /**
   * Estimate latency for a provider
   */
  private estimateLatency(provider: AIProviderType): number {
    const estimates: Record<AIProviderType, number> = {
      [AIProviderType.OLLAMA]: 3000, // 3 seconds
      [AIProviderType.LM_STUDIO]: 3000,
      [AIProviderType.GROQ]: 500, // 0.5 seconds
      [AIProviderType.ANTHROPIC]: 2000, // 2 seconds
      [AIProviderType.OPENROUTER]: 2500,
      [AIProviderType.OPENAI]: 2000,
    };

    return estimates[provider] || 3000;
  }

  /**
   * Get router stats
   */
  getStats(): {
    availableProviders: AIProviderType[];
    healthStatus: Record<AIProviderType, boolean>;
  } {
    const healthStatus: Record<string, boolean> = {};

    for (const [type, cached] of this.healthCache.entries()) {
      healthStatus[type] = cached.healthy;
    }

    return {
      availableProviders: Object.keys(this.providers) as AIProviderType[],
      healthStatus: healthStatus as Record<AIProviderType, boolean>,
    };
  }
}

// ============================================
// SINGLETON & CONVENIENCE
// ============================================

let routerInstance: AIRouter | null = null;

/**
 * Get router instance
 */
export function getRouter(): AIRouter {
  if (!routerInstance) {
    routerInstance = new AIRouter();
  }
  return routerInstance;
}

/**
 * Execute with routing (convenience function)
 */
export async function routedExecute(
  agentId: string,
  request: AIRequest,
  options?: ExecutionOptions
): Promise<ExecutionResult> {
  return await getRouter().execute(agentId, request, options);
}

export default AIRouter;
