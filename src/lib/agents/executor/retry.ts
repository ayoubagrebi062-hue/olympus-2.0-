/**
 * OLYMPUS 2.0 - Retry Handler
 */

import type { RetryStrategy, ExecutionError } from './types';
import { DEFAULT_RETRY_STRATEGY } from './types';

/** Retry handler for agent execution */
export class RetryHandler {
  private strategy: RetryStrategy;

  constructor(strategy: Partial<RetryStrategy> = {}) {
    this.strategy = { ...DEFAULT_RETRY_STRATEGY, ...strategy };
  }

  /** Check if error is retryable */
  isRetryable(error: ExecutionError | Error): boolean {
    const code = (error as ExecutionError).code || this.inferErrorCode(error as Error);
    return this.strategy.retryableErrors.includes(code);
  }

  /** Infer error code from error message */
  private inferErrorCode(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('rate limit') || message.includes('429')) return 'RATE_LIMIT';
    if (message.includes('timeout') || message.includes('timed out')) return 'TIMEOUT';
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('econnrefused')
    )
      return 'NETWORK_ERROR';
    if (message.includes('503') || message.includes('service unavailable'))
      return 'SERVICE_UNAVAILABLE';
    if (message.includes('overloaded') || message.includes('capacity')) return 'OVERLOADED';
    if (message.includes('500') || message.includes('internal server')) return 'SERVER_ERROR';

    return 'UNKNOWN_ERROR';
  }

  /** Calculate delay for retry attempt */
  calculateDelay(attempt: number): number {
    const delay = this.strategy.baseDelay * Math.pow(this.strategy.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 0.2 * delay; // 20% jitter
    return Math.min(delay + jitter, this.strategy.maxDelay);
  }

  /** Check if should retry */
  shouldRetry(attempt: number, error: ExecutionError | Error): boolean {
    if (attempt >= this.strategy.maxRetries) return false;
    return this.isRetryable(error);
  }

  /** Get max retries */
  get maxRetries(): number {
    return this.strategy.maxRetries;
  }

  /** Execute with retry */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: { onRetry?: (attempt: number, error: Error, delay: number) => void } = {}
  ): Promise<{ result: T; attempts: number } | { error: Error; attempts: number }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.strategy.maxRetries + 1; attempt++) {
      try {
        const result = await fn();
        return { result, attempts: attempt };
      } catch (error) {
        lastError = error as Error;

        if (!this.shouldRetry(attempt, lastError)) {
          return { error: lastError, attempts: attempt };
        }

        const delay = this.calculateDelay(attempt);
        options.onRetry?.(attempt, lastError, delay);

        await this.sleep(delay);
      }
    }

    return { error: lastError!, attempts: this.strategy.maxRetries + 1 };
  }

  /** Sleep for specified duration */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/** Create execution error from Error */
export function createExecutionError(error: Error, agentId: string, phase: string): ExecutionError {
  const handler = new RetryHandler();
  const code = handler['inferErrorCode'](error);

  return {
    code,
    message: error.message,
    agentId: agentId as any,
    phase,
    recoverable: handler.isRetryable({ code } as ExecutionError),
    originalError: error,
  };
}

/** Default retry handler instance */
export const defaultRetryHandler = new RetryHandler();
