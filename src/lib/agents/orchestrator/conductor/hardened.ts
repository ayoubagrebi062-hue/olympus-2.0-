/**
 * BATTLE-HARDENED VITO
 *
 * Built for chaos:
 * - 🌪️ API dies? Retry with backoff, serve cached, degrade gracefully
 * - 🔥 3,000 concurrent? Queue, rate limit, shed load
 * - 🤬 XSS attempt? Sanitize everything
 * - 🐌 Slow network? Timeout, cancel, recover
 * - 💀 Memory explodes? Bounded caches, LRU eviction
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';

// ============================================================================
// CHAOS DEFENSE: Rate Limiter + Request Queue
// ============================================================================

interface QueuedRequest {
  id: string;
  task: string;
  context?: string;
  resolve: (result: HardenedResult) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retries: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = 0;
  private readonly maxConcurrent: number;
  private readonly maxQueueSize: number;
  private readonly requestsPerMinute: number;
  private requestTimestamps: number[] = [];

  constructor(
    config: {
      maxConcurrent?: number;
      maxQueueSize?: number;
      requestsPerMinute?: number;
    } = {}
  ) {
    this.maxConcurrent = config.maxConcurrent || 3;
    this.maxQueueSize = config.maxQueueSize || 100;
    this.requestsPerMinute = config.requestsPerMinute || 50;
  }

  async enqueue(
    task: string,
    context: string | undefined,
    processor: (task: string, context?: string) => Promise<HardenedResult>
  ): Promise<HardenedResult> {
    // Check queue capacity
    if (this.queue.length >= this.maxQueueSize) {
      throw new QueueFullError(`Queue full (${this.maxQueueSize} pending). Try again in a moment.`);
    }

    // Check rate limit
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);

    if (this.requestTimestamps.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = Math.ceil((60000 - (now - oldestRequest)) / 1000);
      throw new RateLimitError(`Rate limit reached. Try again in ${waitTime}s.`);
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `req-${now}-${Math.random().toString(36).slice(2, 6)}`,
        task,
        context,
        resolve,
        reject,
        timestamp: now,
        retries: 0,
      };

      this.queue.push(request);
      this.processNext(processor);
    });
  }

  private async processNext(
    processor: (task: string, context?: string) => Promise<HardenedResult>
  ): Promise<void> {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.processing++;
    this.requestTimestamps.push(Date.now());

    try {
      const result = await processor(request.task, request.context);
      request.resolve(result);
    } catch (error) {
      request.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.processing--;
      this.processNext(processor);
    }
  }

  getStats(): { queued: number; processing: number; rateLimitRemaining: number } {
    const now = Date.now();
    const recentRequests = this.requestTimestamps.filter(t => now - t < 60000);

    return {
      queued: this.queue.length,
      processing: this.processing,
      rateLimitRemaining: Math.max(0, this.requestsPerMinute - recentRequests.length),
    };
  }
}

// ============================================================================
// CHAOS DEFENSE: Bounded LRU Cache
// ============================================================================

class BoundedCache<T> {
  private cache: Map<string, { value: T; timestamp: number; hits: number }> = new Map();
  private readonly maxSize: number;
  private readonly maxAge: number;

  constructor(maxSize = 1000, maxAgeMs = 3600000) {
    this.maxSize = maxSize;
    this.maxAge = maxAgeMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check expiry
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    // Update hit count for LRU
    entry.hits++;
    return entry.value;
  }

  set(key: string, value: T): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 1,
    });
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruHits = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.hits < lruHits) {
        lruHits = entry.hits;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// CHAOS DEFENSE: Circuit Breaker
// ============================================================================

type CircuitState = 'closed' | 'open' | 'half-open';

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailure = 0;
  private readonly threshold: number;
  private readonly resetTimeout: number;

  constructor(threshold = 5, resetTimeoutMs = 30000) {
    this.threshold = threshold;
    this.resetTimeout = resetTimeoutMs;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if we should try half-open
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new CircuitOpenError(
          `Service unavailable. Retry in ${Math.ceil((this.resetTimeout - (Date.now() - this.lastFailure)) / 1000)}s.`
        );
      }
    }

    try {
      const result = await fn();

      // Success - reset if half-open
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'open';
      }

      throw error;
    }
  }

  getState(): { state: CircuitState; failures: number } {
    return { state: this.state, failures: this.failures };
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
  }
}

// ============================================================================
// CHAOS DEFENSE: Input Sanitizer
// ============================================================================

class InputSanitizer {
  private static readonly DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi,
  ];

  private static readonly MAX_INPUT_LENGTH = 50000;

  static sanitize(input: string): { clean: string; threats: string[] } {
    const threats: string[] = [];

    // Length check
    if (input.length > this.MAX_INPUT_LENGTH) {
      threats.push('Input truncated (exceeded max length)');
      input = input.slice(0, this.MAX_INPUT_LENGTH);
    }

    // Detect and remove dangerous patterns
    let clean = input;
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(clean)) {
        threats.push(`Removed: ${pattern.source}`);
        clean = clean.replace(pattern, '[REMOVED]');
      }
    }

    // Escape HTML entities for safety
    clean = this.escapeHtml(clean);

    return { clean, threats };
  }

  private static escapeHtml(str: string): string {
    // Only escape in obvious HTML contexts, preserve code
    return str
      .replace(/&(?![\w#]+;)/g, '&amp;')
      .replace(/<(?!\/?code|pre)/g, '&lt;')
      .replace(/(?<!code|pre)>/g, '&gt;');
  }

  static validateTask(task: string): { valid: boolean; reason?: string } {
    if (!task || task.trim().length === 0) {
      return { valid: false, reason: 'Task cannot be empty' };
    }

    if (task.trim().length < 3) {
      return { valid: false, reason: 'Task too short. Be more specific.' };
    }

    if (task.length > 10000) {
      return { valid: false, reason: 'Task too long. Keep it under 10,000 characters.' };
    }

    return { valid: true };
  }
}

// ============================================================================
// CHAOS DEFENSE: Timeout Controller
// ============================================================================

class TimeoutController {
  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message = 'Operation timed out'
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new TimeoutError(message));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }
}

// ============================================================================
// CHAOS DEFENSE: Retry with Exponential Backoff
// ============================================================================

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000, shouldRetry = () => true } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

class QueueFullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueueFullError';
  }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// HARDENED RESULT TYPE
// ============================================================================

export interface HardenedResult {
  success: boolean;
  code: string;
  confidence: number;

  // Chaos info
  cached: boolean;
  retries: number;
  latency: number;
  threats: string[];

  // Degradation info
  degraded: boolean;
  degradationReason?: string;

  // User-friendly feedback
  message: string;
  suggestion?: string;
}

// ============================================================================
// HARDENED VITO
// ============================================================================

export class HardenedVito extends EventEmitter {
  private anthropic: Anthropic;
  private queue: RequestQueue;
  private cache: BoundedCache<HardenedResult>;
  private circuitBreaker: CircuitBreaker;
  private readonly timeout: number;

  constructor(
    config: {
      apiKey?: string;
      maxConcurrent?: number;
      maxQueueSize?: number;
      requestsPerMinute?: number;
      cacheSize?: number;
      timeout?: number;
    } = {}
  ) {
    super();

    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('API key required. Set ANTHROPIC_API_KEY or pass apiKey.');
    }

    this.anthropic = new Anthropic({ apiKey });

    this.queue = new RequestQueue({
      maxConcurrent: config.maxConcurrent || 3,
      maxQueueSize: config.maxQueueSize || 100,
      requestsPerMinute: config.requestsPerMinute || 50,
    });

    this.cache = new BoundedCache(config.cacheSize || 1000);
    this.circuitBreaker = new CircuitBreaker(5, 30000);
    this.timeout = config.timeout || 60000;
  }

  async build(task: string, context?: string): Promise<HardenedResult> {
    const startTime = Date.now();

    // 1. VALIDATE INPUT
    const validation = InputSanitizer.validateTask(task);
    if (!validation.valid) {
      return this.errorResult(validation.reason!, startTime);
    }

    // 2. SANITIZE INPUT
    const sanitizedTask = InputSanitizer.sanitize(task);
    const sanitizedContext = context
      ? InputSanitizer.sanitize(context)
      : { clean: undefined, threats: [] };

    const threats = [...sanitizedTask.threats, ...sanitizedContext.threats];

    if (threats.length > 0) {
      this.emit('threats_detected', { threats });
    }

    // 3. CHECK CACHE
    const cacheKey = this.getCacheKey(sanitizedTask.clean, sanitizedContext.clean);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      this.emit('cache_hit', { task: sanitizedTask.clean });
      return {
        ...cached,
        cached: true,
        latency: Date.now() - startTime,
        message: 'Retrieved from cache (instant!)',
      };
    }

    // 4. QUEUE THE REQUEST
    try {
      const result = await this.queue.enqueue(sanitizedTask.clean, sanitizedContext.clean, (t, c) =>
        this.executeWithProtection(t, c, threats)
      );

      // Cache successful results
      if (result.success) {
        this.cache.set(cacheKey, result);
      }

      return {
        ...result,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime, threats);
    }
  }

  private async executeWithProtection(
    task: string,
    context: string | undefined,
    threats: string[]
  ): Promise<HardenedResult> {
    const startTime = Date.now();

    // Execute through circuit breaker with timeout and retry
    try {
      const result = await this.circuitBreaker.execute(() =>
        TimeoutController.withTimeout(
          retryWithBackoff(() => this.callAPI(task, context), {
            maxRetries: 3,
            shouldRetry: error => this.isRetryable(error),
          }),
          this.timeout,
          'Request timed out. The task might be too complex.'
        )
      );

      return {
        success: true,
        code: result.code,
        confidence: result.confidence,
        cached: false,
        retries: result.retries,
        latency: Date.now() - startTime,
        threats,
        degraded: false,
        message: this.getSuccessMessage(result.confidence),
      };
    } catch (error) {
      // Try degraded response
      return this.getDegradedResponse(task, error, startTime, threats);
    }
  }

  private async callAPI(
    task: string,
    context?: string
  ): Promise<{ code: string; confidence: number; retries: number }> {
    const prompt = this.buildPrompt(task, context);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const code = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      code,
      confidence: this.assessConfidence(code),
      retries: 0,
    };
  }

  private buildPrompt(task: string, context?: string): string {
    let prompt = `You are a senior engineer. Generate production-ready TypeScript code.

Task: ${task}`;

    if (context) {
      prompt += `\n\nContext:\n${context}`;
    }

    prompt += `

Requirements:
- TypeScript with strict types
- Handle errors properly
- No placeholder implementations
- Return only code blocks`;

    return prompt;
  }

  private assessConfidence(code: string): number {
    if (!code) return 0;

    let score = 0.5;
    if (/```[\s\S]*```/.test(code)) score += 0.2;
    if (/interface|type\s+\w+/.test(code)) score += 0.1;
    if (/export/.test(code)) score += 0.1;
    if (/try\s*{/.test(code)) score += 0.1;

    return Math.min(score, 1);
  }

  private isRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Rate limits - retry
    if (message.includes('rate') || message.includes('429')) return true;

    // Server errors - retry
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return true;
    }

    // Timeouts - retry
    if (message.includes('timeout') || message.includes('etimedout')) return true;

    // Auth errors - don't retry
    if (message.includes('401') || message.includes('403')) return false;

    // Default: retry
    return true;
  }

  private getDegradedResponse(
    task: string,
    error: unknown,
    startTime: number,
    threats: string[]
  ): HardenedResult {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Provide helpful degraded response
    return {
      success: false,
      code: this.getTemplateCode(task),
      confidence: 0.1,
      cached: false,
      retries: 3,
      latency: Date.now() - startTime,
      threats,
      degraded: true,
      degradationReason: errorMessage,
      message: "Service is busy. Here's a template to get started.",
      suggestion: this.getSuggestion(errorMessage),
    };
  }

  private getTemplateCode(task: string): string {
    // Provide a helpful template based on task keywords
    const lower = task.toLowerCase();

    if (lower.includes('component') || lower.includes('react')) {
      return `// Template for: ${task}
interface Props {
  // Add your props here
}

export function Component({ }: Props) {
  return (
    <div>
      {/* Implement your component */}
    </div>
  );
}`;
    }

    if (lower.includes('api') || lower.includes('endpoint')) {
      return `// Template for: ${task}
export async function handler(request: Request): Promise<Response> {
  try {
    // Implement your endpoint
    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}`;
    }

    if (lower.includes('hook')) {
      return `// Template for: ${task}
import { useState, useEffect } from 'react';

export function useCustomHook() {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Implement your hook logic
  }, []);

  return { state };
}`;
    }

    return `// Template for: ${task}
// Service is temporarily unavailable.
// Here's a starting point:

export function implement() {
  // TODO: Implement when service recovers
  throw new Error('Not implemented');
}`;
  }

  private getSuggestion(error: string): string {
    if (error.includes('rate') || error.includes('429')) {
      return 'Too many requests. Wait a moment and try again.';
    }
    if (error.includes('timeout')) {
      return 'Request took too long. Try a simpler task or break it into parts.';
    }
    if (error.includes('circuit')) {
      return 'Service is recovering. It will be back shortly.';
    }
    if (error.includes('queue')) {
      return 'System is busy. Your request will be processed soon.';
    }
    return 'Something went wrong. Try again in a moment.';
  }

  private getSuccessMessage(confidence: number): string {
    if (confidence >= 0.9) return 'Excellent! High confidence result.';
    if (confidence >= 0.8) return 'Great! Code looks solid.';
    if (confidence >= 0.7) return 'Good result. Review recommended.';
    if (confidence >= 0.5) return 'Generated, but please review carefully.';
    return 'Basic result. May need significant changes.';
  }

  private errorResult(reason: string, startTime: number): HardenedResult {
    return {
      success: false,
      code: '',
      confidence: 0,
      cached: false,
      retries: 0,
      latency: Date.now() - startTime,
      threats: [],
      degraded: true,
      degradationReason: reason,
      message: reason,
      suggestion: 'Check your input and try again.',
    };
  }

  private handleError(error: unknown, startTime: number, threats: string[]): HardenedResult {
    const message = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      code: '',
      confidence: 0,
      cached: false,
      retries: 0,
      latency: Date.now() - startTime,
      threats,
      degraded: true,
      degradationReason: message,
      message: this.getUserFriendlyMessage(message),
      suggestion: this.getSuggestion(message),
    };
  }

  private getUserFriendlyMessage(error: string): string {
    // Never expose internal errors to users
    if (error.includes('ENOTFOUND') || error.includes('ECONNREFUSED')) {
      return 'Cannot connect to service. Check your internet connection.';
    }
    if (error.includes('401') || error.includes('api_key')) {
      return 'Authentication issue. Please check your configuration.';
    }
    if (error.includes('rate') || error.includes('429')) {
      return 'Too many requests. Please slow down.';
    }
    return "Something went wrong. We're on it.";
  }

  private getCacheKey(task: string, context?: string): string {
    const input = context ? `${task}::${context}` : task;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash = hash & hash;
    }
    return `vito:${Math.abs(hash).toString(36)}`;
  }

  // ==========================================================================
  // OBSERVABILITY
  // ==========================================================================

  getHealth(): {
    queue: { queued: number; processing: number; rateLimitRemaining: number };
    circuit: { state: CircuitState; failures: number };
    cache: { size: number };
  } {
    return {
      queue: this.queue.getStats(),
      circuit: this.circuitBreaker.getState(),
      cache: { size: this.cache.size() },
    };
  }

  resetCircuit(): void {
    this.circuitBreaker.reset();
    this.emit('circuit_reset');
  }

  clearCache(): void {
    this.cache.clear();
    this.emit('cache_cleared');
  }
}

// ============================================================================
// CONVENIENCE EXPORT
// ============================================================================

let instance: HardenedVito | null = null;

export function getHardenedVito(
  config?: ConstructorParameters<typeof HardenedVito>[0]
): HardenedVito {
  if (!instance || config) {
    instance = new HardenedVito(config);
  }
  return instance;
}

export async function vitoBuild(task: string, context?: string): Promise<HardenedResult> {
  return getHardenedVito().build(task, context);
}

// ============================================================================
// EXPORT ERRORS FOR HANDLING
// ============================================================================

export { QueueFullError, RateLimitError, CircuitOpenError, TimeoutError, ValidationError };
