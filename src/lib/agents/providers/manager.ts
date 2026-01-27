/**
 * OLYMPUS 2.0 - Provider Manager
 */

import type {
  AIProvider,
  AIProviderClient,
  AIModel,
  ProviderConfig,
  CompletionRequest,
  CompletionResponse,
} from './types';
import { TIER_MODEL_MAP, MODEL_CAPABILITIES } from './types';
import { AnthropicClient, createAnthropicClient } from './anthropic';
import { OpenAIClient, createOpenAIClient } from './openai';
import { TokenTracker } from './tracker';
import type { AgentTier } from '../types';

/** Provider manager for handling multiple AI clients */
export class ProviderManager {
  private anthropicClient: AnthropicClient | null = null;
  private openaiClient: OpenAIClient | null = null;
  private primaryProvider: AIProvider;
  private fallbackProvider: AIProvider | null;

  constructor(options: { primaryProvider?: AIProvider; fallbackProvider?: AIProvider } = {}) {
    this.primaryProvider = options.primaryProvider || 'anthropic';
    this.fallbackProvider = options.fallbackProvider || null;
  }

  /** Get or create Anthropic client */
  getAnthropicClient(): AnthropicClient {
    if (!this.anthropicClient) {
      this.anthropicClient = createAnthropicClient();
    }
    return this.anthropicClient;
  }

  /** Get or create OpenAI client */
  getOpenAIClient(): OpenAIClient {
    if (!this.openaiClient) {
      this.openaiClient = createOpenAIClient();
    }
    return this.openaiClient;
  }

  /** Get client for provider */
  getClient(provider: AIProvider): AIProviderClient {
    return provider === 'anthropic' ? this.getAnthropicClient() : this.getOpenAIClient();
  }

  /** Get primary client */
  getPrimaryClient(): AIProviderClient {
    return this.getClient(this.primaryProvider);
  }

  /** Get model for agent tier */
  getModelForTier(tier: AgentTier): AIModel {
    return TIER_MODEL_MAP[tier];
  }

  /** Complete with automatic fallback */
  async completeWithFallback(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      return await this.getPrimaryClient().complete(request);
    } catch (error) {
      if (this.fallbackProvider) {
        console.warn(`Primary provider failed, falling back to ${this.fallbackProvider}:`, error);
        return await this.getClient(this.fallbackProvider).complete(request);
      }
      throw error;
    }
  }

  /** Check if model is available */
  isModelAvailable(model: AIModel): boolean {
    const isAnthropic = model.startsWith('claude');
    if (isAnthropic) {
      return !!process.env.ANTHROPIC_API_KEY;
    }
    return !!process.env.OPENAI_API_KEY;
  }

  /** Get available models */
  getAvailableModels(): AIModel[] {
    const models: AIModel[] = [];
    if (process.env.ANTHROPIC_API_KEY) {
      models.push('claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-haiku-3-20250414');
    }
    if (process.env.OPENAI_API_KEY) {
      models.push('gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini');
    }
    return models;
  }

  /** Estimate cost for a build */
  estimateBuildCost(tier: string, estimatedTokens: number): { model: AIModel; cost: number } {
    const model = this.getModelForTier(tier as AgentTier);
    const capabilities = MODEL_CAPABILITIES[model];
    const inputTokens = estimatedTokens * 0.7;
    const outputTokens = estimatedTokens * 0.3;
    const cost =
      (inputTokens / 1000) * capabilities.costPer1kInput +
      (outputTokens / 1000) * capabilities.costPer1kOutput;
    return { model, cost };
  }
}

// Singleton instance
let providerManager: ProviderManager | null = null;

export function getProviderManager(): ProviderManager {
  if (!providerManager) {
    providerManager = new ProviderManager();
  }
  return providerManager;
}

export function createProviderManager(options?: {
  primaryProvider?: AIProvider;
  fallbackProvider?: AIProvider;
}): ProviderManager {
  return new ProviderManager(options);
}
