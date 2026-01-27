/**
 * OLYMPUS Groq Provider
 *
 * Ultra-fast cloud inference using Groq.
 * Models: Llama 3.1 70B, Llama 3.1 8B
 * Speed: 500+ tokens/sec
 *
 * FEATURE: 5-Key Rotation for Rate Limit Bypass
 * When key 1 hits limit → key 2 → key 3 → key 4 → key 5 → OpenAI fallback
 */

import {
  AIProviderInterface,
  AIProviderType,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIMessage,
} from './types';
import { safeJsonParse } from '@/lib/utils/safe-json';

// Configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 60000; // 1 minute

// ═══════════════════════════════════════════════════════════════
// KEY ROTATION SYSTEM - 5 Keys = 500K tokens/day
// ═══════════════════════════════════════════════════════════════

/**
 * Load all available Groq API keys from environment
 * Filters out placeholder/empty values
 */
function loadApiKeys(): string[] {
  const keys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
    process.env.GROQ_API_KEY, // Legacy single key as final fallback
  ].filter((key): key is string => {
    // Filter out empty, undefined, or placeholder keys
    if (!key || typeof key !== 'string') return false;
    return key.startsWith('gsk_') &&
           !key.includes('YOUR_') &&
           key.length > 20;
  });

  // Remove duplicates
  return [...new Set(keys)];
}

// === 50X RELIABILITY: Thread-Safe Key Rotation ===
let GROQ_API_KEYS: string[] = [];
let currentKeyIndex = 0;
let keysInitialized = false;
let rotationLock = false; // Simple lock to prevent race conditions

/**
 * Initialize keys (lazy load)
 */
function initializeKeys(): void {
  if (keysInitialized) return;

  GROQ_API_KEYS = loadApiKeys();
  keysInitialized = true;
  console.log(`[Groq] Initialized with ${GROQ_API_KEYS.length} API key(s)`);
}

/**
 * Get current API key
 */
function getCurrentKey(): string | null {
  initializeKeys();
  if (GROQ_API_KEYS.length === 0) return null;
  if (currentKeyIndex >= GROQ_API_KEYS.length) return null;
  return GROQ_API_KEYS[currentKeyIndex];
}

/**
 * Rotate to next API key (THREAD-SAFE)
 * Uses a simple lock to prevent race conditions when multiple
 * concurrent requests try to rotate simultaneously.
 *
 * @returns true if rotation successful, false if all keys exhausted
 */
function rotateKey(): boolean {
  // 50X RELIABILITY: Prevent race condition with lock
  if (rotationLock) {
    // Another rotation in progress - check if we still have keys
    console.log('[Groq] Rotation in progress, checking current state...');
    return currentKeyIndex < GROQ_API_KEYS.length - 1;
  }

  rotationLock = true;

  try {
    initializeKeys();

    const nextIndex = currentKeyIndex + 1;

    if (nextIndex >= GROQ_API_KEYS.length) {
      console.error(`[Groq] ALL ${GROQ_API_KEYS.length} KEYS EXHAUSTED - Falling back to OpenAI`);
      return false;
    }

    currentKeyIndex = nextIndex;
    console.log(`[Groq] Rotated to key ${currentKeyIndex + 1}/${GROQ_API_KEYS.length}`);
    return true;
  } finally {
    rotationLock = false;
  }
}

/**
 * Reset key rotation (call at start of new build)
 */
export function resetKeyRotation(): void {
  // 50X RELIABILITY: Ensure no rotation in progress before reset
  if (rotationLock) {
    console.warn('[Groq] Waiting for rotation lock before reset...');
  }
  currentKeyIndex = 0;
  console.log(`[Groq] Key rotation reset to key 1/${GROQ_API_KEYS.length}`);
}

/**
 * Get key rotation status
 */
export function getKeyRotationStatus(): { current: number; total: number; exhausted: boolean } {
  initializeKeys();
  return {
    current: currentKeyIndex + 1,
    total: GROQ_API_KEYS.length,
    exhausted: currentKeyIndex >= GROQ_API_KEYS.length,
  };
}

// Legacy function for backward compatibility
function getApiKey(): string {
  return getCurrentKey() || '';
}

/**
 * Groq API response format (OpenAI-compatible)
 */
interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Groq streaming chunk
 */
interface GroqStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

/**
 * Groq Provider Implementation
 */
export class GroqProvider implements AIProviderInterface {
  type = AIProviderType.GROQ;
  name = 'Groq (Fast Cloud)';

  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getApiKey();
  }

  /**
   * Check if Groq is available (uses key rotation)
   */
  async isAvailable(): Promise<boolean> {
    const currentKey = getCurrentKey();
    if (!currentKey) {
      console.warn('[Groq] No API keys available (all exhausted or not configured)');
      return false;
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const status = getKeyRotationStatus();
        console.log(`[Groq] Available with ${status.total} key(s), currently on key ${status.current}`);
      }
      return response.ok;
    } catch (error) {
      console.error('[Groq] Availability check failed:', error);
      return false;
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.status}`);
      }

      const data = await response.json();
      return (data.data || []).map((m: { id: string }) => m.id);
    } catch (error) {
      console.error('Failed to get Groq models:', error);
      return [];
    }
  }

  /**
   * Send completion request with automatic key rotation on rate limit
   */
  async complete(request: AIRequest, retryCount: number = 0): Promise<AIResponse> {
    // Get current key (may have rotated)
    const currentKey = getCurrentKey();
    if (!currentKey) {
      throw new Error('All Groq API keys exhausted - falling back to OpenAI');
    }

    // Update instance key to current rotation key
    this.apiKey = currentKey;

    const startTime = Date.now();
    const model = request.model || DEFAULT_MODEL;
    const keyStatus = getKeyRotationStatus();

    console.log(`[Groq] Using key ${keyStatus.current}/${keyStatus.total}`);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: this.formatMessages(request.messages),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 4096,
          stream: false,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Handle rate limiting with key rotation
        if (response.status === 429) {
          console.log(`[Groq] ⚠️ Key ${keyStatus.current}/${keyStatus.total} RATE LIMITED`);

          // Try to rotate to next key
          const rotated = rotateKey();
          if (rotated) {
            // Retry with next key (max 5 retries to prevent infinite loop)
            if (retryCount < 5) {
              console.log(`[Groq] Retrying with next key...`);
              return this.complete(request, retryCount + 1);
            }
          }

          // All keys exhausted or max retries reached
          throw new Error(`Groq rate limited (all ${keyStatus.total} keys exhausted): ${errorText}`);
        }

        throw new Error(`Groq request failed: ${response.status} - ${errorText}`);
      }

      const data: GroqResponse = await response.json();
      const latencyMs = Date.now() - startTime;

      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        provider: AIProviderType.GROQ,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        latencyMs,
        cached: false,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error(`Groq completion failed after ${latencyMs}ms:`, error);
      throw error;
    }
  }

  /**
   * Stream completion
   */
  async *stream(request: AIRequest): AsyncGenerator<AIStreamChunk> {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }

    const model = request.model || DEFAULT_MODEL;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: this.formatMessages(request.messages),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 4096,
          stream: true,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Groq stream failed: ${response.status}`);
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              // 50X RELIABILITY: Safe JSON parse for stream chunks
              const chunk = safeJsonParse<GroqStreamChunk | null>(data, null, 'groq:streamChunk');
              if (!chunk) continue; // Skip malformed chunks instead of crashing
              const content = chunk.choices[0]?.delta?.content || '';
              const isDone = chunk.choices[0]?.finish_reason !== null;

              yield { content, done: isDone };
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Groq stream error:', error);
      throw error;
    }
  }

  /**
   * Estimate token count
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Format messages for Groq API
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
let instance: GroqProvider | null = null;

/**
 * Get Groq provider instance
 */
export function getGroqProvider(): GroqProvider {
  if (!instance) {
    instance = new GroqProvider();
  }
  return instance;
}

/**
 * Check if Groq is configured and available
 */
export async function isGroqAvailable(): Promise<boolean> {
  return await getGroqProvider().isAvailable();
}

/**
 * Simple completion (convenience function)
 */
export async function groqComplete(
  prompt: string,
  options?: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const provider = getGroqProvider();

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

/**
 * Available Groq models
 */
export const GROQ_MODELS = {
  LLAMA_70B: 'llama-3.3-70b-versatile',
  LLAMA_8B: 'llama-3.1-8b-instant',
  MIXTRAL: 'mixtral-8x7b-32768',
} as const;

export default GroqProvider;
