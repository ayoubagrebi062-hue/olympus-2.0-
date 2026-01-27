/**
 * OLYMPUS 10X - API Guardrail Layer
 *
 * First line of defense: Rate limiting, size limits, format validation.
 * Blocks obviously invalid requests before deeper processing.
 */

import { GUARDRAIL_LAYERS, LIMITS } from '@/lib/core';
import type { GuardrailInput } from '@/lib/core';
import type {
  GuardrailLayerHandler,
  GuardrailContext,
  ApiLayerConfig,
  LayerValidationResult,
  RateLimiter,
  RateLimitEntry,
} from '../types';

// ============================================================================
// IN-MEMORY RATE LIMITER (Replace with Redis in production)
// ============================================================================

class InMemoryRateLimiter implements RateLimiter {
  private entries: Map<string, RateLimitEntry> = new Map();
  private accessOrder: string[] = []; // LRU tracking
  private defaultWindowMs = 60_000; // 1 minute
  private defaultLimit = 100;
  private maxEntries: number; // Prevent memory exhaustion

  constructor(
    private limit: number = 100,
    private windowMs: number = 60_000,
    maxEntries: number = 10_000 // Cap at 10K entries to prevent OOM
  ) {
    this.defaultLimit = limit;
    this.defaultWindowMs = windowMs;
    this.maxEntries = maxEntries;

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60_000);
  }

  async check(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now > entry.windowStart + entry.windowMs) {
      // New window or expired
      return {
        allowed: true,
        remaining: this.defaultLimit - 1,
        resetAt: new Date(now + this.defaultWindowMs),
      };
    }

    const remaining = this.defaultLimit - entry.count;
    const allowed = remaining > 0;

    return {
      allowed,
      remaining: Math.max(0, remaining - 1),
      resetAt: new Date(entry.windowStart + entry.windowMs),
    };
  }

  async record(key: string): Promise<void> {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now > entry.windowStart + entry.windowMs) {
      // MEMORY PROTECTION: Evict oldest entries if at capacity
      if (this.entries.size >= this.maxEntries) {
        this.evictOldest(Math.ceil(this.maxEntries * 0.1)); // Evict 10%
      }

      // Start new window
      this.entries.set(key, {
        count: 1,
        windowStart: now,
        windowMs: this.defaultWindowMs,
      });

      // Track access order for LRU
      this.accessOrder.push(key);
    } else {
      // Increment in current window
      entry.count++;

      // Update access order (move to end)
      const idx = this.accessOrder.indexOf(key);
      if (idx !== -1) {
        this.accessOrder.splice(idx, 1);
        this.accessOrder.push(key);
      }
    }
  }

  /**
   * Evict oldest entries to prevent memory exhaustion.
   * This is the defense against DoS via unique key flooding.
   */
  private evictOldest(count: number): void {
    const toEvict = this.accessOrder.splice(0, count);
    for (const key of toEvict) {
      this.entries.delete(key);
    }
  }

  async reset(key: string): Promise<void> {
    this.entries.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now > entry.windowStart + entry.windowMs) {
        this.entries.delete(key);
      }
    }
  }
}

// ============================================================================
// API LAYER IMPLEMENTATION
// ============================================================================

export class ApiLayer implements GuardrailLayerHandler {
  readonly layer = GUARDRAIL_LAYERS.API;
  readonly name = 'API Layer';

  private rateLimiter: RateLimiter;
  private bypassRoles: Set<string>;

  constructor(
    rateLimiter?: RateLimiter,
    bypassRoles: string[] = ['admin', 'system']
  ) {
    this.rateLimiter = rateLimiter || new InMemoryRateLimiter();
    this.bypassRoles = new Set(bypassRoles);
  }

  async validate(
    context: GuardrailContext,
    input: GuardrailInput,
    config: ApiLayerConfig
  ): Promise<LayerValidationResult> {
    const startTime = Date.now();
    const options = config.options || {};

    try {
      // 1. Check rate limit
      const rateLimitResult = await this.checkRateLimit(context, options);
      if (rateLimitResult) {
        return this.createResult(rateLimitResult, startTime);
      }

      // 2. Check input size
      const sizeResult = this.checkInputSize(input, options);
      if (sizeResult) {
        return this.createResult(sizeResult, startTime);
      }

      // 3. Check prompt length
      const promptResult = this.checkPromptLength(input, options);
      if (promptResult) {
        return this.createResult(promptResult, startTime);
      }

      // 4. Check content type / format
      const formatResult = this.checkFormat(input, options);
      if (formatResult) {
        return this.createResult(formatResult, startTime);
      }

      // All checks passed
      return this.createResult(
        {
          action: 'allow' as const,
          confidence: 1.0,
          reason: 'Input passed all API layer checks',
        },
        startTime
      );
    } catch (error) {
      // Layer error - don't block on internal errors unless configured
      if (!config.continueOnError) {
        return this.createResult(
          {
            action: 'block' as const,
            confidence: 0.5,
            reason: `API layer error: ${error instanceof Error ? error.message : String(error)}`,
          },
          startTime
        );
      }

      return this.createResult(
        {
          action: 'warn' as const,
          confidence: 0.5,
          reason: `API layer error (continuing): ${error instanceof Error ? error.message : String(error)}`,
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
  // PRIVATE METHODS
  // ===========================================================================

  private async checkRateLimit(
    context: GuardrailContext,
    options: ApiLayerConfig['options']
  ): Promise<Partial<LayerValidationResult> | null> {
    const limit = options?.rateLimitPerMinute || 100;
    const key = this.getRateLimitKey(context);

    const { allowed, remaining, resetAt } = await this.rateLimiter.check(key);

    if (!allowed) {
      return {
        action: 'block',
        confidence: 1.0,
        reason: `Rate limit exceeded. Reset at ${resetAt.toISOString()}`,
        metadata: {
          rateLimitExceeded: true,
          remaining: 0,
          resetAt: resetAt.toISOString(),
        },
      };
    }

    // Record this request
    await this.rateLimiter.record(key);

    // Warn if approaching limit
    if (remaining <= limit * 0.1) {
      return {
        action: 'warn',
        confidence: 0.8,
        reason: `Approaching rate limit. ${remaining} requests remaining`,
        metadata: {
          rateLimitWarning: true,
          remaining,
          resetAt: resetAt.toISOString(),
        },
      };
    }

    return null;
  }

  private checkInputSize(
    input: GuardrailInput,
    options: ApiLayerConfig['options']
  ): Partial<LayerValidationResult> | null {
    const maxSize = options?.maxInputSizeBytes || LIMITS.MAX_INPUT_SIZE_BYTES;
    const inputSize = this.calculateInputSize(input);

    if (inputSize > maxSize) {
      return {
        action: 'block',
        confidence: 1.0,
        reason: `Input size ${this.formatBytes(inputSize)} exceeds maximum ${this.formatBytes(maxSize)}`,
        metadata: {
          inputSize,
          maxSize,
          sizeExceeded: true,
        },
      };
    }

    return null;
  }

  private checkPromptLength(
    input: GuardrailInput,
    options: ApiLayerConfig['options']
  ): Partial<LayerValidationResult> | null {
    const maxLength = options?.maxPromptLength || LIMITS.MAX_PROMPT_LENGTH;
    const prompt = input.prompt || '';
    const promptLength = prompt.length;

    if (promptLength > maxLength) {
      return {
        action: 'block',
        confidence: 1.0,
        reason: `Prompt length ${promptLength.toLocaleString()} exceeds maximum ${maxLength.toLocaleString()}`,
        metadata: {
          promptLength,
          maxLength,
          lengthExceeded: true,
        },
      };
    }

    // Warn if prompt is very short (might be low quality)
    if (promptLength < 10 && promptLength > 0) {
      return {
        action: 'warn',
        confidence: 0.6,
        reason: 'Prompt is very short, may lack necessary context',
        metadata: {
          promptLength,
          shortPrompt: true,
        },
      };
    }

    return null;
  }

  private checkFormat(
    input: GuardrailInput,
    options: ApiLayerConfig['options']
  ): Partial<LayerValidationResult> | null {
    // Check for null/undefined prompt
    if (input.prompt === null || input.prompt === undefined) {
      return {
        action: 'block',
        confidence: 1.0,
        reason: 'Prompt is required but was null or undefined',
        metadata: {
          missingPrompt: true,
        },
      };
    }

    // Check prompt is a string
    if (typeof input.prompt !== 'string') {
      return {
        action: 'block',
        confidence: 1.0,
        reason: `Prompt must be a string, received ${typeof input.prompt}`,
        metadata: {
          invalidType: true,
          receivedType: typeof input.prompt,
        },
      };
    }

    // Check for empty prompt
    if (input.prompt.trim().length === 0) {
      return {
        action: 'block',
        confidence: 1.0,
        reason: 'Prompt cannot be empty',
        metadata: {
          emptyPrompt: true,
        },
      };
    }

    // Check for binary data in prompt
    if (this.containsBinaryData(input.prompt)) {
      return {
        action: 'block',
        confidence: 0.9,
        reason: 'Prompt appears to contain binary data',
        metadata: {
          binaryDataDetected: true,
        },
      };
    }

    return null;
  }

  private getRateLimitKey(context: GuardrailContext): string {
    // Key by tenant + user if available, otherwise by request ID
    if (context.tenantId && context.userId) {
      return `${context.tenantId}:${context.userId}`;
    }
    if (context.tenantId) {
      return `tenant:${context.tenantId}`;
    }
    return `request:${context.requestId}`;
  }

  private calculateInputSize(input: GuardrailInput): number {
    try {
      return new Blob([JSON.stringify(input)]).size;
    } catch {
      // Fallback for non-browser environments
      return JSON.stringify(input).length * 2; // Approximate UTF-16
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private containsBinaryData(str: string): boolean {
    // Check for null bytes or other binary characters
    // eslint-disable-next-line no-control-regex
    return /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(str);
  }

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
 * Create a new API layer instance.
 */
export function createApiLayer(
  rateLimiter?: RateLimiter,
  bypassRoles?: string[]
): ApiLayer {
  return new ApiLayer(rateLimiter, bypassRoles);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { InMemoryRateLimiter };
export type { RateLimiter };
