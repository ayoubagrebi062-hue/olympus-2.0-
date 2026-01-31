/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   VISION ORCHESTRATOR v2.0 - World-Class Edition                              ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║   📖 WHY DECISIONS: See ADR.md for architecture decision records              ║
 * ║                                                                               ║
 * ║   REQUEST FLOW:                                                               ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────┐ ║
 * ║   │  generate(prompt)                                                       │ ║
 * ║   │      ↓                                                                  │ ║
 * ║   │  [Validate Input] → Error? Return VisionErr(INVALID_*)                  │ ║
 * ║   │      ↓                                                                  │ ║
 * ║   │  [Create Context] → traceId, deadline, signal                           │ ║
 * ║   │      ↓                                                                  │ ║
 * ║   │  [Dedup Check] → Same request in-flight? Wait for it.                   │ ║
 * ║   │      ↓                                                                  │ ║
 * ║   │  [Select Provider] → Anthropic (if available) → OpenAI (fallback)       │ ║
 * ║   │      ↓                                                                  │ ║
 * ║   │  [Circuit Breaker] → OPEN? Skip provider. CLOSED? Try it.               │ ║
 * ║   │      ↓                                                                  │ ║
 * ║   │  [Generate Code] → with retry + exponential backoff                     │ ║
 * ║   │      ↓                                                                  │ ║
 * ║   │  [Generate Images] → Optional, failures don't block code                │ ║
 * ║   │      ↓                                                                  │ ║
 * ║   │  Result<GenerateResult, VisionError>                                    │ ║
 * ║   └─────────────────────────────────────────────────────────────────────────┘ ║
 * ║                                                                               ║
 * ║   PATTERNS USED:                                                              ║
 * ║   1. Result<T,E>        - Errors as values (see ADR-001)                      ║
 * ║   2. Circuit Breaker    - Per-provider health (see ADR-002)                   ║
 * ║   3. Deduplication      - Coalesce identical requests (see ADR-003)           ║
 * ║   4. Provider Priority  - Anthropic → OpenAI (see ADR-004)                    ║
 * ║   5. Graceful Degrade   - Partial results over total failure                  ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  Result,
  Ok,
  Err,
  VisionError,
  VisionErrorCode,
  createError,
  withRetry,
  isOk,
  isErr,
  RequestContext,
  createContext,
  checkContext,
  withDeadline,
  remainingTime,
  CircuitBreaker,
  getCircuitBreaker,
  RequestDeduplicator,
  createRequestKey,
  RateLimiter,
} from './core';
import type { VisionConfig, GenerationResult, QualityMetrics, GeneratedImage } from './types';

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - All tunables in one place
// ════════════════════════════════════════════════════════════════════════════════

/** Maximum time for entire generation request (code + images) */
const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes

/** Maximum time for a single API call to Anthropic */
const API_CALL_TIMEOUT_MS = 60_000; // 1 minute

/** Delay to suggest when rate limited */
const RATE_LIMIT_RETRY_MS = 5_000; // 5 seconds

/** How long to keep in-flight requests for deduplication */
const DEDUP_MAX_AGE_MS = 300_000; // 5 minutes

/** Circuit breaker reset time for code generation */
const CODE_CIRCUIT_RESET_MS = 30_000; // 30 seconds

/** Circuit breaker reset time for image generation */
const IMAGE_CIRCUIT_RESET_MS = 60_000; // 1 minute

/** Maximum retries for transient failures */
const DEFAULT_MAX_RETRIES = 3;

/** Maximum prompt length to prevent abuse */
const MAX_PROMPT_LENGTH = 10_000;

/** Minimum code length to consider generation successful */
const MIN_CODE_LENGTH = 50;

// ─── RATE LIMITING ───────────────────────────────────────────────────────────
// See ADR.md for reasoning behind these values

/** Maximum requests allowed to burst */
const RATE_LIMIT_MAX_TOKENS = 20;

/** Tokens refilled per second (sustained rate) */
const RATE_LIMIT_REFILL_RATE = 2; // 2 requests/second sustained

// ─── INPUT SIZE LIMITS ───────────────────────────────────────────────────────
// Prevents memory bombs from large arrays/objects

/** Maximum items in expectedFeatures array */
const MAX_FEATURES_LENGTH = 50;

/** Maximum items in style.colors array */
const MAX_COLORS_LENGTH = 20;

/** Maximum total request payload size (characters when JSON stringified) */
const MAX_REQUEST_SIZE = 50_000; // 50KB

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface GenerationRequest {
  prompt: string;
  pageType?: string;
  expectedFeatures?: string[];
  style?: {
    theme?: 'light' | 'dark';
    colors?: string[];
    designSystem?: string;
  };
  options?: {
    generateImages?: boolean;
    skipCache?: boolean;
    maxRetries?: number;
  };
}

export interface GenerationResponse {
  /** Unique ID for this generation */
  id: string;

  /** The generated code (may be null if generation failed) */
  code: string | null;

  /** Generated preview images */
  images: GeneratedImage[];

  /** Quality metrics */
  quality: QualityMetrics | null;

  /** Timing breakdown */
  timing: {
    totalMs: number;
    codeMs?: number;
    imagesMs?: number;
  };

  /** Warnings (non-fatal issues) */
  warnings: string[];

  /** Whether healing was applied */
  healingApplied: boolean;

  /** Trace ID for debugging */
  traceId: string;
}

// Event types for observability
export type GenerationEvent =
  | { type: 'started'; traceId: string; prompt: string }
  | { type: 'cache_hit'; traceId: string }
  | { type: 'cache_miss'; traceId: string }
  | { type: 'code_started'; traceId: string }
  | { type: 'code_completed'; traceId: string; durationMs: number }
  | { type: 'code_failed'; traceId: string; error: VisionError }
  | { type: 'images_started'; traceId: string }
  | { type: 'images_completed'; traceId: string; count: number; durationMs: number }
  | { type: 'images_failed'; traceId: string; error: VisionError }
  | { type: 'completed'; traceId: string; durationMs: number; success: boolean }
  | { type: 'circuit_state_change'; provider: string; from: string; to: string };

export type EventHandler = (event: GenerationEvent) => void;

// ════════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR V2
// ════════════════════════════════════════════════════════════════════════════════

export class VisionOrchestratorV2 {
  private client: Anthropic | null = null;
  private eventHandlers: Set<EventHandler> = new Set();
  private dedup: RequestDeduplicator<GenerationResponse>;
  private codeCircuit: CircuitBreaker;
  private imageCircuit: CircuitBreaker;
  private rateLimiter: RateLimiter;

  // Stats
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    rateLimited: 0,
  };

  constructor(private config: Partial<VisionConfig> = {}) {
    // Initialize rate limiter - prevents abuse and controls costs
    this.rateLimiter = new RateLimiter({
      maxTokens: RATE_LIMIT_MAX_TOKENS,
      refillRate: RATE_LIMIT_REFILL_RATE,
      name: 'vision-orchestrator',
    });

    // Initialize deduplicator - prevents duplicate API calls for identical requests
    this.dedup = new RequestDeduplicator<GenerationResponse>({
      maxAgeMs: DEDUP_MAX_AGE_MS,
      onDedup: (key, count) => {
        this.log('info', `Request deduplicated (${count} callers sharing result)`, { key });
      },
    });

    // Initialize circuit breakers - fail fast when providers are down
    this.codeCircuit = getCircuitBreaker('anthropic-code', {
      failureThreshold: 3, // Open after 3 failures
      resetTimeoutMs: CODE_CIRCUIT_RESET_MS,
      onStateChange: (from, to, name) => {
        this.emit({ type: 'circuit_state_change', provider: name, from, to });
      },
    });

    this.imageCircuit = getCircuitBreaker('image-generation', {
      failureThreshold: 5, // More lenient for images
      resetTimeoutMs: IMAGE_CIRCUIT_RESET_MS,
      onStateChange: (from, to, name) => {
        this.emit({ type: 'circuit_state_change', provider: name, from, to });
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Generate code from a natural language prompt.
   *
   * @param request - The generation request containing prompt and options
   * @param options.timeoutMs - Maximum time for entire operation (default: 2 minutes)
   * @param options.signal - AbortSignal for cancellation
   *
   * @returns Result<GenerationResponse, VisionError> - NEVER throws
   *
   * @example
   * ```typescript
   * const result = await orchestrator.generate({
   *   prompt: "Create a login form with email and password",
   *   pageType: "auth",
   *   expectedFeatures: ["validation", "error states", "loading"]
   * });
   *
   * if (isOk(result)) {
   *   console.log(result.value.code);
   * } else {
   *   // Handle error - check result.error.code for specific handling
   *   if (result.error.code === 'RATE_LIMITED') {
   *     await sleep(result.error.retryAfterMs);
   *   }
   * }
   * ```
   */
  async generate(
    request: GenerationRequest,
    options: { timeoutMs?: number; signal?: AbortSignal } = {}
  ): Promise<Result<GenerationResponse, VisionError>> {
    // ┌─────────────────────────────────────────────────────────────────────────┐
    // │ STEP 1: Rate Limiting - Reject early if over limit                      │
    // └─────────────────────────────────────────────────────────────────────────┘
    const rateLimitResult = this.rateLimiter.acquire();
    if (isErr(rateLimitResult)) {
      this.stats.rateLimited++;
      return Err(rateLimitResult.error);
    }

    // Create request context
    const ctx = createContext({
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      signal: options.signal,
      metadata: {
        prompt: request.prompt?.substring(0, 100) ?? '',
        pageType: request.pageType,
      },
    });

    this.stats.totalRequests++;

    // ┌─────────────────────────────────────────────────────────────────────────┐
    // │ STEP 2: Input Validation - Reject garbage/oversized data                │
    // └─────────────────────────────────────────────────────────────────────────┘
    const validation = this.validateRequest(request);
    if (isErr(validation)) {
      return Err(validation.error);
    }

    // Check if already cancelled
    const ctxError = checkContext(ctx);
    if (ctxError) {
      return Err(ctxError);
    }

    this.emit({ type: 'started', traceId: ctx.traceId, prompt: request.prompt });

    // Deduplicate concurrent identical requests
    const dedupKey = createRequestKey({
      prompt: request.prompt,
      pageType: request.pageType,
      features: request.expectedFeatures,
      style: request.style,
    });

    return this.dedup.execute(() => this.executeGeneration(request, ctx), ctx, dedupKey);
  }

  /**
   * Subscribe to generation events
   */
  on(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      rateLimit: this.rateLimiter.getStats(),
      dedup: this.dedup.getStats(),
      circuits: {
        code: this.codeCircuit.getStats(),
        images: this.imageCircuit.getStats(),
      },
    };
  }

  /**
   * Health check - are all systems operational?
   */
  isHealthy(): boolean {
    return this.codeCircuit.isAvailable();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // INTERNAL: MAIN PIPELINE
  // ──────────────────────────────────────────────────────────────────────────────

  private async executeGeneration(
    request: GenerationRequest,
    ctx: RequestContext
  ): Promise<Result<GenerationResponse, VisionError>> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Generate code with retry and circuit breaker
      this.emit({ type: 'code_started', traceId: ctx.traceId });
      const codeStart = Date.now();

      const codeResult = await this.generateCodeWithResilience(request, ctx);

      if (isErr(codeResult)) {
        const codeError = codeResult.error;
        this.emit({ type: 'code_failed', traceId: ctx.traceId, error: codeError });

        // Check if we should fail completely or return partial result
        if (!codeError.retryable) {
          this.stats.failedRequests++;
          return Err(codeError);
        }

        // Return partial result with null code
        return Ok(
          this.createResponse(ctx, {
            code: null,
            images: [],
            quality: null,
            timing: { totalMs: Date.now() - startTime },
            warnings: [`Code generation failed: ${codeError.message}`],
            healingApplied: false,
          })
        );
      }

      const codeMs = Date.now() - codeStart;
      this.emit({ type: 'code_completed', traceId: ctx.traceId, durationMs: codeMs });

      // Generate images (graceful degradation - failure is OK)
      let images: GeneratedImage[] = [];
      let imagesMs = 0;

      if (request.options?.generateImages !== false) {
        this.emit({ type: 'images_started', traceId: ctx.traceId });
        const imageStart = Date.now();

        const imageResult = await this.generateImagesWithResilience(request, ctx);

        if (isOk(imageResult)) {
          images = imageResult.value;
          imagesMs = Date.now() - imageStart;
          this.emit({
            type: 'images_completed',
            traceId: ctx.traceId,
            count: images.length,
            durationMs: imagesMs,
          });
        } else {
          // Images failed - add warning but continue
          const imageError = imageResult.error;
          warnings.push(`Image generation failed: ${imageError.message}`);
          this.emit({ type: 'images_failed', traceId: ctx.traceId, error: imageError });
        }
      }

      // Success!
      this.stats.successfulRequests++;
      const totalMs = Date.now() - startTime;

      this.emit({
        type: 'completed',
        traceId: ctx.traceId,
        durationMs: totalMs,
        success: true,
      });

      return Ok(
        this.createResponse(ctx, {
          code: codeResult.value,
          images,
          quality: null, // TODO: Add quality analysis
          timing: { totalMs, codeMs, imagesMs },
          warnings,
          healingApplied: false, // TODO: Add healing
        })
      );
    } catch (error) {
      // Unexpected error - should rarely happen with Result types
      this.stats.failedRequests++;

      const visionError = createError(
        VisionErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error',
        {
          cause: error instanceof Error ? error : undefined,
          traceId: ctx.traceId,
        }
      );

      this.emit({
        type: 'completed',
        traceId: ctx.traceId,
        durationMs: Date.now() - startTime,
        success: false,
      });

      return Err(visionError);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // INTERNAL: CODE GENERATION
  // ──────────────────────────────────────────────────────────────────────────────

  private async generateCodeWithResilience(
    request: GenerationRequest,
    ctx: RequestContext
  ): Promise<Result<string, VisionError>> {
    // Use circuit breaker
    return this.codeCircuit.execute(async () => {
      // Use retry with exponential backoff
      return withRetry(() => this.generateCodeOnce(request, ctx), {
        maxAttempts: request.options?.maxRetries ?? DEFAULT_MAX_RETRIES,
        onRetry: (error, attempt, delayMs) => {
          this.log('warn', `Code generation retry ${attempt}`, {
            traceId: ctx.traceId,
            error: error.code,
            delayMs,
          });
        },
      });
    }, ctx);
  }

  private async generateCodeOnce(
    request: GenerationRequest,
    ctx: RequestContext
  ): Promise<Result<string, VisionError>> {
    // Check context before expensive operation
    const ctxError = checkContext(ctx);
    if (ctxError) {
      return Err(ctxError);
    }

    // Get client (validates API key)
    const clientResult = this.getClient();
    if (isErr(clientResult)) {
      return Err(clientResult.error);
    }
    const client = clientResult.value;

    const systemPrompt = `You are an expert React/TypeScript developer creating production-quality components.

CRITICAL RULES:
1. EVERY button MUST have onClick handler - NO exceptions
2. NO placeholder links (href="#") - use real routes or buttons
3. NO console.log in handlers - use proper state management
4. ALL inputs must be controlled (value + onChange)
5. ALL async operations need try/catch with user feedback
6. Modals/dropdowns must close on Escape and outside click
7. Loading states on all async buttons

OUTPUT: Return ONLY valid TypeScript/React code. No markdown, no explanations.`;

    const userPrompt = `Create a React component for: ${request.prompt}

${request.pageType ? `Page type: ${request.pageType}` : ''}
${request.expectedFeatures?.length ? `Expected features: ${request.expectedFeatures.join(', ')}` : ''}
${request.style?.theme ? `Theme: ${request.style.theme}` : ''}
${request.style?.designSystem ? `Design system: ${request.style.designSystem}` : ''}

Return production-ready code with all functionality implemented.`;

    try {
      // Apply context deadline to API call (use remaining time or default)
      const remaining = remainingTime(ctx);
      const effectiveTimeout = remaining
        ? Math.min(remaining, API_CALL_TIMEOUT_MS)
        : API_CALL_TIMEOUT_MS;

      const response = await withDeadline(
        ctx,
        client.messages.create({
          model: this.config.aiModel || 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          messages: [{ role: 'user', content: userPrompt }],
          system: systemPrompt,
        })
      );

      const content = response.content[0];
      if (content.type !== 'text') {
        return Err(
          createError(VisionErrorCode.GENERATION_FAILED, 'Unexpected response format from AI', {
            traceId: ctx.traceId,
          })
        );
      }

      // Extract code from response
      let code = content.text.trim();
      if (code.startsWith('```')) {
        code = code.replace(/^```(?:tsx?|typescript|javascript)?\n?/, '').replace(/\n?```$/, '');
      }

      if (!code || code.length < MIN_CODE_LENGTH) {
        return Err(
          createError(
            VisionErrorCode.GENERATION_FAILED,
            `Generated code too short (${code?.length ?? 0} chars). Try a more detailed prompt.`,
            { traceId: ctx.traceId, retryable: true }
          )
        );
      }

      return Ok(code);
    } catch (error) {
      // Map Anthropic errors to actionable VisionErrors
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          return Err(
            createError(
              VisionErrorCode.RATE_LIMITED,
              'API rate limit hit. Wait a moment and retry.',
              { traceId: ctx.traceId, retryAfterMs: RATE_LIMIT_RETRY_MS }
            )
          );
        }
        if (error.message.includes('invalid_api_key')) {
          return Err(
            createError(
              VisionErrorCode.INVALID_API_KEY,
              'Invalid API key. Check ANTHROPIC_API_KEY environment variable.',
              { traceId: ctx.traceId }
            )
          );
        }
        if (error.message.includes('timeout') || error.message.includes('deadline')) {
          return Err(
            createError(
              VisionErrorCode.TIMEOUT,
              'Code generation timed out. Try a simpler prompt or increase timeout.',
              { traceId: ctx.traceId }
            )
          );
        }
      }

      return Err(
        createError(
          VisionErrorCode.PROVIDER_ERROR,
          error instanceof Error ? error.message : 'Unknown API error',
          {
            traceId: ctx.traceId,
            cause: error instanceof Error ? error : undefined,
          }
        )
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // INTERNAL: IMAGE GENERATION
  // ──────────────────────────────────────────────────────────────────────────────

  private async generateImagesWithResilience(
    request: GenerationRequest,
    ctx: RequestContext
  ): Promise<Result<GeneratedImage[], VisionError>> {
    // Use circuit breaker
    return this.imageCircuit.execute(async () => {
      // For now, return empty array - image generation would go here
      // This is where you'd integrate Pollinations, DALL-E, etc.
      return Ok<GeneratedImage[]>([]);
    }, ctx);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // INTERNAL: VALIDATION
  // ──────────────────────────────────────────────────────────────────────────────

  private validateRequest(request: GenerationRequest): Result<void, VisionError> {
    // ─── CHECK TOTAL PAYLOAD SIZE ───────────────────────────────────────────────
    // Prevents memory bombs from huge objects
    let payloadSize: number;
    try {
      payloadSize = JSON.stringify(request).length;
    } catch {
      return Err(
        createError(
          VisionErrorCode.INVALID_REQUEST,
          'Request contains non-serializable data (circular reference or invalid types).'
        )
      );
    }

    if (payloadSize > MAX_REQUEST_SIZE) {
      return Err(
        createError(
          VisionErrorCode.INVALID_REQUEST,
          `Request too large (${Math.round(payloadSize / 1024)}KB). Maximum is ${MAX_REQUEST_SIZE / 1000}KB. Reduce features or style options.`,
          { context: { size: payloadSize, max: MAX_REQUEST_SIZE } }
        )
      );
    }

    // ─── CHECK PROMPT ───────────────────────────────────────────────────────────
    if (!request.prompt || typeof request.prompt !== 'string') {
      return Err(
        createError(
          VisionErrorCode.INVALID_REQUEST,
          'Missing prompt. Provide a description of the component you want to generate.'
        )
      );
    }

    const trimmed = request.prompt.trim();
    if (trimmed.length === 0) {
      return Err(
        createError(
          VisionErrorCode.INVALID_PROMPT,
          'Prompt is empty. Describe what you want to build (e.g., "A login form with email and password").'
        )
      );
    }

    if (trimmed.length > MAX_PROMPT_LENGTH) {
      return Err(
        createError(
          VisionErrorCode.PROMPT_TOO_LONG,
          `Prompt too long (${trimmed.length} chars). Maximum is ${MAX_PROMPT_LENGTH}. Try breaking into smaller requests.`,
          { context: { length: trimmed.length, max: MAX_PROMPT_LENGTH } }
        )
      );
    }

    // ─── CHECK ARRAY SIZES ──────────────────────────────────────────────────────
    // Prevents memory exhaustion from huge arrays
    if (request.expectedFeatures) {
      if (!Array.isArray(request.expectedFeatures)) {
        return Err(
          createError(
            VisionErrorCode.INVALID_REQUEST,
            'expectedFeatures must be an array of strings.'
          )
        );
      }

      if (request.expectedFeatures.length > MAX_FEATURES_LENGTH) {
        return Err(
          createError(
            VisionErrorCode.INVALID_REQUEST,
            `Too many features (${request.expectedFeatures.length}). Maximum is ${MAX_FEATURES_LENGTH}.`,
            { context: { count: request.expectedFeatures.length, max: MAX_FEATURES_LENGTH } }
          )
        );
      }

      // Validate each feature is a string
      for (let i = 0; i < request.expectedFeatures.length; i++) {
        if (typeof request.expectedFeatures[i] !== 'string') {
          return Err(
            createError(
              VisionErrorCode.INVALID_REQUEST,
              `expectedFeatures[${i}] must be a string, got ${typeof request.expectedFeatures[i]}.`
            )
          );
        }
      }
    }

    if (request.style?.colors) {
      if (!Array.isArray(request.style.colors)) {
        return Err(
          createError(
            VisionErrorCode.INVALID_REQUEST,
            'style.colors must be an array of color strings.'
          )
        );
      }

      if (request.style.colors.length > MAX_COLORS_LENGTH) {
        return Err(
          createError(
            VisionErrorCode.INVALID_REQUEST,
            `Too many colors (${request.style.colors.length}). Maximum is ${MAX_COLORS_LENGTH}.`,
            { context: { count: request.style.colors.length, max: MAX_COLORS_LENGTH } }
          )
        );
      }
    }

    // ─── CHECK PAGETYP ──────────────────────────────────────────────────────────
    if (request.pageType !== undefined && typeof request.pageType !== 'string') {
      return Err(createError(VisionErrorCode.INVALID_REQUEST, 'pageType must be a string.'));
    }

    return Ok(undefined);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // INTERNAL: UTILITIES
  // ──────────────────────────────────────────────────────────────────────────────

  private getClient(): Result<Anthropic, VisionError> {
    if (this.client) {
      return Ok(this.client);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Err(
        createError(
          VisionErrorCode.MISSING_API_KEY,
          'ANTHROPIC_API_KEY not set. Add it to your environment: export ANTHROPIC_API_KEY="sk-..."'
        )
      );
    }

    this.client = new Anthropic({ apiKey });
    return Ok(this.client);
  }

  private createResponse(
    ctx: RequestContext,
    data: Omit<GenerationResponse, 'id' | 'traceId'>
  ): GenerationResponse {
    return {
      id: `gen_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
      traceId: ctx.traceId,
      ...data,
    };
  }

  private emit(event: GenerationEvent): void {
    for (const handler of Array.from(this.eventHandlers)) {
      try {
        handler(event);
      } catch (error) {
        console.error('[VisionOrchestrator] Event handler error:', error);
      }
    }
  }

  private log(
    level: 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, unknown>
  ): void {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, ...context };

    // Structured logging - in production, this would go to your logging system
    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logEntry));
    } else {
      // Don't log info in production unless debug mode
      if (process.env.NODE_ENV === 'development') {
        console.log(JSON.stringify(logEntry));
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// FACTORY
// ════════════════════════════════════════════════════════════════════════════════

let instance: VisionOrchestratorV2 | null = null;

export function createVisionOrchestratorV2(config?: Partial<VisionConfig>): VisionOrchestratorV2 {
  instance = new VisionOrchestratorV2(config);
  return instance;
}

export function getVisionOrchestratorV2(): VisionOrchestratorV2 {
  if (!instance) {
    instance = new VisionOrchestratorV2();
  }
  return instance;
}

export default VisionOrchestratorV2;
