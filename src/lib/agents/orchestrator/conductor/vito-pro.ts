/**
 * VITO PRO - Production hardening that AWS would approve.
 *
 * Same simple API. Battle-tested internals.
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// CONFIGURATION - Sensible defaults, full control when needed
// ============================================================================

export interface VitoConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  maxRetries?: number;
  timeout?: number;
  cache?: VitoCache;
  onRequest?: (req: VitoRequest) => void;
  onResponse?: (res: VitoResponse) => void;
  onError?: (err: VitoError) => void;
}

export interface VitoCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
}

// ============================================================================
// TYPES - Minimal, useful
// ============================================================================

export interface VitoRequest {
  id: string;
  task: string;
  context?: string;
  timestamp: number;
}

export interface VitoResponse {
  id: string;
  code: string;
  files: Map<string, string>;
  tokens: { input: number; output: number };
  cost: number;
  latency: number;
  cached: boolean;
}

export interface VitoError {
  id: string;
  code: 'RATE_LIMIT' | 'AUTH' | 'TIMEOUT' | 'PARSE' | 'UNKNOWN';
  message: string;
  retry: boolean;
  retryAfter?: number;
}

// ============================================================================
// VITO PRO CLASS
// ============================================================================

export class VitoPro {
  private client: Anthropic;
  private config: Required<Omit<VitoConfig, 'cache' | 'onRequest' | 'onResponse' | 'onError'>> &
    Pick<VitoConfig, 'cache' | 'onRequest' | 'onResponse' | 'onError'>;
  private requestCount = 0;

  constructor(config: VitoConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      model: config.model || 'claude-sonnet-4-20250514',
      maxTokens: config.maxTokens || 8192,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 120000,
      cache: config.cache,
      onRequest: config.onRequest,
      onResponse: config.onResponse,
      onError: config.onError,
    };

    if (!this.config.apiKey) {
      throw new Error('ANTHROPIC_API_KEY required. Set env or pass apiKey.');
    }

    this.client = new Anthropic({ apiKey: this.config.apiKey });
  }

  async build(task: string, context?: string): Promise<VitoResponse> {
    const id = this.generateId();
    const start = Date.now();

    const request: VitoRequest = { id, task, context, timestamp: start };
    this.config.onRequest?.(request);

    // Check cache
    if (this.config.cache) {
      const cacheKey = this.cacheKey(task, context);
      const cached = await this.config.cache.get(cacheKey);
      if (cached) {
        const response = JSON.parse(cached) as VitoResponse;
        response.cached = true;
        response.latency = Date.now() - start;
        this.config.onResponse?.(response);
        return response;
      }
    }

    // Execute with retries
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await this.execute(id, task, context, start);

        // Cache successful response
        if (this.config.cache) {
          const cacheKey = this.cacheKey(task, context);
          await this.config.cache.set(cacheKey, JSON.stringify(response), 3600);
        }

        this.config.onResponse?.(response);
        return response;
      } catch (err) {
        lastError = err as Error;
        const vitoError = this.parseError(id, err);

        if (!vitoError.retry) {
          this.config.onError?.(vitoError);
          throw new Error(`[${vitoError.code}] ${vitoError.message}`);
        }

        if (vitoError.retryAfter) {
          await this.sleep(vitoError.retryAfter);
        } else {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    const finalError = this.parseError(id, lastError);
    this.config.onError?.(finalError);
    throw new Error(`[${finalError.code}] ${finalError.message}`);
  }

  async *stream(task: string, context?: string): AsyncGenerator<string> {
    const prompt = this.buildPrompt(task, context);

    const stream = this.client.messages.stream({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  // =========================================================================
  // INTERNAL
  // =========================================================================

  private async execute(
    id: string,
    task: string,
    context: string | undefined,
    start: number
  ): Promise<VitoResponse> {
    const prompt = this.buildPrompt(task, context);

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    const files = this.parseFiles(content);

    return {
      id,
      code: Array.from(files.values()).join('\n\n'),
      files,
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      cost: this.calculateCost(response.usage),
      latency: Date.now() - start,
      cached: false,
    };
  }

  private buildPrompt(task: string, context?: string): string {
    const parts = [
      'You are a senior engineer. Generate production-ready code.',
      '',
      `Task: ${task}`,
    ];

    if (context) {
      parts.push('', 'Context:', context);
    }

    parts.push(
      '',
      'Rules:',
      '- TypeScript with strict types',
      '- No comments explaining obvious code',
      '- No placeholder implementations',
      '- Handle errors properly',
      '- Return ONLY code blocks',
      '',
      'Format multiple files as:',
      '```typescript:path/to/file.ts',
      '// code',
      '```'
    );

    return parts.join('\n');
  }

  private parseFiles(content: string): Map<string, string> {
    const files = new Map<string, string>();
    const regex = /```(?:typescript|tsx?|javascript|jsx?)?(?::([^\n]+))?\n([\s\S]*?)```/g;

    let match;
    let index = 0;

    while ((match = regex.exec(content)) !== null) {
      const path = match[1]?.trim() || `file-${index++}.ts`;
      files.set(path, match[2].trim());
    }

    if (files.size === 0 && content.trim()) {
      files.set('output.ts', content.trim());
    }

    return files;
  }

  private parseError(id: string, err: unknown): VitoError {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('rate_limit') || message.includes('429')) {
      const retryMatch = message.match(/retry.+?(\d+)/i);
      return {
        id,
        code: 'RATE_LIMIT',
        message: 'Rate limited. Retrying...',
        retry: true,
        retryAfter: retryMatch ? parseInt(retryMatch[1]) * 1000 : 60000,
      };
    }

    if (message.includes('401') || message.includes('invalid_api_key')) {
      return {
        id,
        code: 'AUTH',
        message: 'Invalid API key. Check ANTHROPIC_API_KEY.',
        retry: false,
      };
    }

    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return {
        id,
        code: 'TIMEOUT',
        message: 'Request timed out. Try a smaller task.',
        retry: true,
      };
    }

    return {
      id,
      code: 'UNKNOWN',
      message,
      retry: true,
    };
  }

  private calculateCost(usage: { input_tokens: number; output_tokens: number }): number {
    // Claude Sonnet pricing
    return (usage.input_tokens * 0.003 + usage.output_tokens * 0.015) / 1000;
  }

  private cacheKey(task: string, context?: string): string {
    const input = context ? `${task}::${context}` : task;
    return `vito:${this.hash(input)}`;
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private generateId(): string {
    return `vito-${Date.now()}-${(++this.requestCount).toString(36)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// CONVENIENCE EXPORT
// ============================================================================

let defaultInstance: VitoPro | null = null;

export function getVito(config?: VitoConfig): VitoPro {
  if (config) {
    return new VitoPro(config);
  }
  if (!defaultInstance) {
    defaultInstance = new VitoPro();
  }
  return defaultInstance;
}

// ============================================================================
// ONE-LINER FOR SIMPLE CASES
// ============================================================================

export async function vito(task: string, context?: string): Promise<VitoResponse> {
  return getVito().build(task, context);
}

export async function* vitoStream(task: string, context?: string): AsyncGenerator<string> {
  yield* getVito().stream(task, context);
}
