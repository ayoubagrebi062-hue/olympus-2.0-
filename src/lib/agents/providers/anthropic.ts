/**
 * OLYMPUS 2.0 - Anthropic Claude Client
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProviderClient,
  CompletionRequest,
  CompletionResponse,
  ProviderConfig,
  TokenUsage,
  AnthropicModel,
} from './types';

export class AnthropicClient implements AIProviderClient {
  provider = 'anthropic' as const;
  private client: Anthropic;
  private defaultModel: AnthropicModel;

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout || 120000,
      maxRetries: config.maxRetries || 3,
    });
    this.defaultModel = (config.defaultModel as AnthropicModel) || 'claude-sonnet-4-20250514';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const model = (request.model as AnthropicModel) || this.defaultModel;

    const response = await this.client.messages.create({
      model,
      max_tokens: request.maxTokens || 8192,
      temperature: request.temperature ?? 0.7,
      system: request.systemPrompt,
      messages: request.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      stop_sequences: request.stopSequences,
    });

    const content: string = response.content
      .map(block => (block.type === 'text' ? block.text : ''))
      .join('');

    const usage: TokenUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      cacheReadTokens: (response.usage as any).cache_read_input_tokens,
      cacheWriteTokens: (response.usage as any).cache_creation_input_tokens,
    };

    return {
      id: response.id,
      content,
      model,
      usage,
      finishReason:
        response.stop_reason === 'end_turn'
          ? 'stop'
          : response.stop_reason === 'max_tokens'
            ? 'max_tokens'
            : 'stop',
      latency: Date.now() - startTime,
    };
  }

  async *streamComplete(request: CompletionRequest): AsyncGenerator<string, CompletionResponse> {
    const startTime = Date.now();
    const model = (request.model as AnthropicModel) || this.defaultModel;
    let fullContent = '';
    let usage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let responseId = '';

    const stream = this.client.messages.stream({
      model,
      max_tokens: request.maxTokens || 8192,
      temperature: request.temperature ?? 0.7,
      system: request.systemPrompt,
      messages: request.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullContent += event.delta.text;
        yield event.delta.text;
      }
      if (event.type === 'message_start') {
        responseId = event.message.id;
        usage.inputTokens = event.message.usage.input_tokens;
      }
      if (event.type === 'message_delta') {
        usage.outputTokens = event.usage.output_tokens;
      }
    }

    usage.totalTokens = usage.inputTokens + usage.outputTokens;

    return {
      id: responseId,
      content: fullContent,
      model,
      usage,
      finishReason: 'stop',
      latency: Date.now() - startTime,
    };
  }

  async countTokens(text: string): Promise<number> {
    const response = await (this.client.messages as any).countTokens({
      model: this.defaultModel,
      messages: [{ role: 'user', content: text }],
    });
    return response.input_tokens;
  }
}

/** Create Anthropic client from env */
export function createAnthropicClient(config?: Partial<ProviderConfig>): AnthropicClient {
  return new AnthropicClient({
    apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY!,
    ...config,
  });
}

// ============================================
// NEW PROVIDER INTERFACE (for AIRouter)
// ============================================

import { AIProviderInterface, AIProviderType, AIRequest, AIResponse, AIStreamChunk } from './types';

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const TIMEOUT_MS = 120000;

function getAnthropicApiKey(): string {
  return process.env.ANTHROPIC_API_KEY || '';
}

/**
 * Anthropic Provider implementing AIProviderInterface
 * Used by AIRouter for high-quality AI completions
 */
export class AnthropicProvider implements AIProviderInterface {
  type = AIProviderType.ANTHROPIC;
  name = 'Anthropic Claude';

  private client: Anthropic | null = null;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getAnthropicApiKey();
    if (this.apiKey) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        timeout: TIMEOUT_MS,
        maxRetries: 3,
      });
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey || !this.client) {
      console.warn('Anthropic API key not configured');
      return false;
    }

    try {
      // Simple availability check - just verify we can create a client
      // Anthropic doesn't have a models endpoint like OpenAI
      return true;
    } catch (error) {
      console.error('Anthropic availability check failed:', error);
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    // Anthropic doesn't have a models API, return known models
    return [
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
      'claude-haiku-3-20250414',
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307',
    ];
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Anthropic API key not configured');
    }

    const startTime = Date.now();
    const model = request.model || DEFAULT_ANTHROPIC_MODEL;

    // Model-aware max tokens:
    // - Haiku: 4096 (hard limit)
    // - Sonnet 4: 64k (but we allow up to 32k for heavy agents like BLOCKS)
    // - Opus: 64k (same as Sonnet)
    // FIX: Increased Sonnet/Opus limit from 16384 to 32768 to support BLOCKS (60 components)
    // BLOCKS needs ~30k tokens for full component specs
    const isHaiku = model.includes('haiku');
    const maxTokensLimit = isHaiku ? 4096 : 32768; // Doubled for heavy agents
    const maxTokens = Math.min(request.maxTokens || maxTokensLimit, maxTokensLimit);

    try {
      // Separate system message from other messages
      const systemMessage = request.messages.find(m => m.role === 'system');
      const otherMessages = request.messages.filter(m => m.role !== 'system');

      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: request.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: otherMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const content = response.content
        .map(block => (block.type === 'text' ? block.text : ''))
        .join('');

      const latencyMs = Date.now() - startTime;

      // DEBUG: Log stop reason to detect truncation
      console.log(
        `[Anthropic] Response complete: stop_reason=${response.stop_reason}, model=${response.model}, output_tokens=${response.usage.output_tokens}, max_tokens=${maxTokens}`
      );
      if (response.stop_reason === 'max_tokens') {
        console.warn(
          `[Anthropic] WARNING: Response was truncated due to max_tokens limit (${maxTokens}). Content length: ${content.length}`
        );
      }

      return {
        content,
        model: response.model,
        provider: AIProviderType.ANTHROPIC,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        latencyMs,
        cached: false,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error(`Anthropic completion failed after ${latencyMs}ms:`, error);
      throw error;
    }
  }

  async *stream(request: AIRequest): AsyncGenerator<AIStreamChunk> {
    if (!this.client) {
      throw new Error('Anthropic API key not configured');
    }

    const model = request.model || DEFAULT_ANTHROPIC_MODEL;

    // Model-aware max tokens:
    // - Haiku: 4096 (hard limit)
    // - Sonnet 4: 64k (but we allow up to 32k for heavy agents like BLOCKS)
    // - Opus: 64k (same as Sonnet)
    // FIX: Increased Sonnet/Opus limit from 16384 to 32768 to support BLOCKS (60 components)
    // BLOCKS needs ~30k tokens for full component specs
    const isHaiku = model.includes('haiku');
    const maxTokensLimit = isHaiku ? 4096 : 32768; // Doubled for heavy agents
    const maxTokens = Math.min(request.maxTokens || maxTokensLimit, maxTokensLimit);

    try {
      // Separate system message from other messages
      const systemMessage = request.messages.find(m => m.role === 'system');
      const otherMessages = request.messages.filter(m => m.role !== 'system');

      const stream = this.client.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature: request.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: otherMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { content: event.delta.text, done: false };
        }
        if (event.type === 'message_stop') {
          yield { content: '', done: true };
        }
      }
    } catch (error) {
      console.error('Anthropic stream error:', error);
      throw error;
    }
  }

  estimateTokens(text: string): number {
    // Rough estimate: ~4 chars per token for English
    return Math.ceil(text.length / 4);
  }
}

// Singleton instance
let anthropicProviderInstance: AnthropicProvider | null = null;

export function getAnthropicProvider(): AnthropicProvider {
  if (!anthropicProviderInstance) {
    anthropicProviderInstance = new AnthropicProvider();
  }
  return anthropicProviderInstance;
}

export async function isAnthropicAvailable(): Promise<boolean> {
  return await getAnthropicProvider().isAvailable();
}
