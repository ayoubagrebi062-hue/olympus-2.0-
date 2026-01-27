/**
 * OLYMPUS Ollama Provider
 *
 * Local AI inference using Ollama.
 * Models: DeepSeek-R1, Llama 3.1, Llama 3.2
 * Cost: FREE
 */

import {
  AIProviderInterface,
  AIProviderType,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIMessage,
} from './types';

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = 'deepseek-r1:latest';
const TIMEOUT_MS = 120000; // 2 minutes for local inference

/**
 * Ollama API response format
 */
interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Ollama model info
 */
interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

/**
 * Ollama Provider Implementation
 */
export class OllamaProvider implements AIProviderInterface {
  type = AIProviderType.OLLAMA;
  name = 'Ollama (Local)';

  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || OLLAMA_BASE_URL;
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.error('Ollama availability check failed:', error);
      return false;
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.status}`);
      }

      const data = await response.json();
      return (data.models || []).map((m: OllamaModel) => m.name);
    } catch (error) {
      console.error('Failed to get Ollama models:', error);
      return [];
    }
  }

  /**
   * Send completion request
   */
  async complete(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const model = request.model || DEFAULT_MODEL;

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: this.formatMessages(request.messages),
          stream: false,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 4096,
          },
        }),
        signal: AbortSignal.timeout(request.maxTokens ? TIMEOUT_MS * 2 : TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama request failed: ${response.status} - ${errorText}`);
      }

      const data: OllamaResponse = await response.json();
      const latencyMs = Date.now() - startTime;

      // Calculate tokens (Ollama provides these)
      const promptTokens = data.prompt_eval_count || this.estimateTokens(
        request.messages.map(m => m.content).join(' ')
      );
      const completionTokens = data.eval_count || this.estimateTokens(data.message.content);

      return {
        content: data.message.content,
        model: data.model,
        provider: AIProviderType.OLLAMA,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        latencyMs,
        cached: false,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error(`Ollama completion failed after ${latencyMs}ms:`, error);
      throw error;
    }
  }

  /**
   * Stream completion
   */
  async *stream(request: AIRequest): AsyncGenerator<AIStreamChunk> {
    const model = request.model || DEFAULT_MODEL;

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: this.formatMessages(request.messages),
          stream: true,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 4096,
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS * 2),
      });

      if (!response.ok) {
        throw new Error(`Ollama stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data: OllamaResponse = JSON.parse(line);
              yield {
                content: data.message?.content || '',
                done: data.done,
              };
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('Ollama stream error:', error);
      throw error;
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Format messages for Ollama API
   */
  private formatMessages(messages: AIMessage[]): Array<{ role: string; content: string }> {
    return messages.map(m => ({
      role: m.role,
      content: m.content,
    }));
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

// Singleton instance
let instance: OllamaProvider | null = null;

/**
 * Get Ollama provider instance
 */
export function getOllamaProvider(): OllamaProvider {
  if (!instance) {
    instance = new OllamaProvider();
  }
  return instance;
}

/**
 * Quick check if Ollama is running
 */
export async function isOllamaRunning(): Promise<boolean> {
  return await getOllamaProvider().isAvailable();
}

/**
 * List installed models
 */
export async function listOllamaModels(): Promise<string[]> {
  return await getOllamaProvider().getModels();
}

/**
 * Simple completion (convenience function)
 */
export async function ollamaComplete(
  prompt: string,
  options?: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const provider = getOllamaProvider();

  const messages: AIMessage[] = [];

  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const response = await provider.complete({
    messages,
    model: options?.model,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });

  return response.content;
}

export default OllamaProvider;
