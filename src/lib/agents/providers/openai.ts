/**
 * OLYMPUS 2.0 - OpenAI Client & Provider
 */

import OpenAI from 'openai';
import type {
  AIProviderClient,
  CompletionRequest,
  CompletionResponse,
  ProviderConfig,
  TokenUsage,
  OpenAIModel,
} from './types';
import {
  AIProviderInterface,
  AIProviderType,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIMessage,
} from './types';
import { safeJsonParse } from '@/lib/utils/safe-json';

export class OpenAIClient implements AIProviderClient {
  provider = 'openai' as const;
  private client: OpenAI;
  private defaultModel: OpenAIModel;

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout || 120000,
      maxRetries: config.maxRetries || 3,
    });
    this.defaultModel = (config.defaultModel as OpenAIModel) || 'gpt-4o';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const model = (request.model as OpenAIModel) || this.defaultModel;

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push(
      ...request.messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }))
    );

    const response = await this.client.chat.completions.create({
      model,
      messages,
      max_completion_tokens: request.maxTokens || 16384,
      temperature: request.temperature ?? 0.7,
      stop: request.stopSequences,
    });

    const content = response.choices[0]?.message?.content || '';
    const usage: TokenUsage = {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };

    return {
      id: response.id,
      content,
      model,
      usage,
      finishReason:
        response.choices[0]?.finish_reason === 'stop'
          ? 'stop'
          : response.choices[0]?.finish_reason === 'length'
            ? 'max_tokens'
            : 'stop',
      latency: Date.now() - startTime,
    };
  }

  async *streamComplete(request: CompletionRequest): AsyncGenerator<string, CompletionResponse> {
    const startTime = Date.now();
    const model = (request.model as OpenAIModel) || this.defaultModel;
    let fullContent = '';
    let responseId = '';

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push(
      ...request.messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }))
    );

    const stream = await this.client.chat.completions.create({
      model,
      messages,
      max_completion_tokens: request.maxTokens || 16384,
      temperature: request.temperature ?? 0.7,
      stream: true,
      stream_options: { include_usage: true },
    });

    let usage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    for await (const chunk of stream) {
      responseId = chunk.id;
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        yield delta;
      }
      if (chunk.usage) {
        usage = {
          inputTokens: chunk.usage.prompt_tokens || 0,
          outputTokens: chunk.usage.completion_tokens || 0,
          totalTokens: chunk.usage.total_tokens || 0,
        };
      }
    }

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
    // Rough estimate: ~4 chars per token for English
    return Math.ceil(text.length / 4);
  }
}

/** Create OpenAI client from env */
export function createOpenAIClient(config?: Partial<ProviderConfig>): OpenAIClient {
  return new OpenAIClient({
    apiKey: config?.apiKey || process.env.OPENAI_API_KEY!,
    ...config,
  });
}

// ============================================
// NEW PROVIDER INTERFACE (for AIRouter)
// ============================================

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const TIMEOUT_MS = 120000;

function getOpenAIApiKey(): string {
  return process.env.OPENAI_API_KEY || '';
}

/**
 * OpenAI Provider implementing AIProviderInterface
 * Used by AIRouter as fallback when Groq rate limits
 */
export class OpenAIProvider implements AIProviderInterface {
  type = AIProviderType.OPENAI;
  name = 'OpenAI (Fallback)';

  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getOpenAIApiKey();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured');
      return false;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.error('OpenAI availability check failed:', error);
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return (data.data || [])
        .filter((m: { id: string }) => m.id.startsWith('gpt'))
        .map((m: { id: string }) => m.id);
    } catch {
      return [];
    }
  }

  async complete(request: AIRequest, retryCount: number = 0): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const MAX_RETRIES = 3;
    const startTime = Date.now();
    const model = request.model || DEFAULT_OPENAI_MODEL;

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: request.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          temperature: request.temperature ?? 0.7,
          max_completion_tokens: request.maxTokens || 16384,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Handle rate limiting with retry
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          // Extract wait time from error message (e.g., "Please try again in 410ms" or "11.452s")
          const waitMatch = errorText.match(/try again in (\d+(?:\.\d+)?)(ms|s)/i);
          let waitMs = 5000; // Default 5 seconds
          if (waitMatch) {
            const value = parseFloat(waitMatch[1]);
            waitMs = waitMatch[2].toLowerCase() === 's' ? value * 1000 : value;
            waitMs = Math.min(waitMs + 500, 30000); // Add 500ms buffer, cap at 30s
          }

          console.log(
            `[OpenAI] Rate limited (429). Waiting ${waitMs}ms before retry ${retryCount + 1}/${MAX_RETRIES}...`
          );
          await new Promise(resolve => setTimeout(resolve, waitMs));
          return this.complete(request, retryCount + 1);
        }

        throw new Error(`OpenAI request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        provider: AIProviderType.OPENAI,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        latencyMs,
        cached: false,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error(`OpenAI completion failed after ${latencyMs}ms:`, error);
      throw error;
    }
  }

  async *stream(request: AIRequest): AsyncGenerator<AIStreamChunk> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const model = request.model || DEFAULT_OPENAI_MODEL;

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: request.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          temperature: request.temperature ?? 0.7,
          max_completion_tokens: request.maxTokens || 16384,
          stream: true,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`OpenAI stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            // 50X RELIABILITY: Safe JSON parse for stream chunks
            const chunk = safeJsonParse<{
              choices: Array<{ delta?: { content?: string }; finish_reason: string | null }>;
            } | null>(data, null, 'openai:streamChunk');
            if (!chunk) continue; // Skip malformed chunks instead of crashing

            const content = chunk.choices[0]?.delta?.content || '';
            const isDone = chunk.choices[0]?.finish_reason !== null;

            yield { content, done: isDone };
          }
        }
      }
    } catch (error) {
      console.error('OpenAI stream error:', error);
      throw error;
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// Singleton instance
let openaiProviderInstance: OpenAIProvider | null = null;

export function getOpenAIProvider(): OpenAIProvider {
  if (!openaiProviderInstance) {
    openaiProviderInstance = new OpenAIProvider();
  }
  return openaiProviderInstance;
}

export async function isOpenAIAvailable(): Promise<boolean> {
  return await getOpenAIProvider().isAvailable();
}
