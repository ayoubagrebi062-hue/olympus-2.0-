/**
 * ERRORS
 *
 * Typed errors with user-friendly messages.
 *
 * LESSON: Don't just throw Error("something broke").
 * Create specific error types that:
 * - Can be caught and handled specifically
 * - Carry context about what went wrong
 * - Have user-friendly messages built-in
 * - Are easy to log and debug
 */

// ============================================================================
// BASE ERROR
// ============================================================================

/**
 * Base class for all Vito errors.
 *
 * WHY a base class?
 * - instanceof VitoError catches all our errors
 * - Consistent structure across error types
 * - Easy to add common functionality
 */
export class VitoError extends Error {
  /** User-friendly message (no technical jargon) */
  readonly userMessage: string;

  /** Whether to retry this request */
  readonly retryable: boolean;

  /** HTTP status code if applicable */
  readonly statusCode?: number;

  constructor(message: string, userMessage: string, retryable = false, statusCode?: number) {
    super(message);
    this.name = 'VitoError';
    this.userMessage = userMessage;
    this.retryable = retryable;
    this.statusCode = statusCode;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ============================================================================
// SPECIFIC ERROR TYPES
// ============================================================================

/**
 * Rate limit exceeded.
 *
 * WHY specific type?
 * - UI can show countdown timer
 * - We know exactly when to retry
 * - Different from other errors
 */
export class RateLimitError extends VitoError {
  /** Seconds until rate limit resets */
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfterSeconds}s`,
      `Quick breather - ${retryAfterSeconds} seconds.`,
      true,
      429
    );
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * API authentication failed.
 *
 * WHY specific type?
 * - User needs to fix configuration
 * - Should not auto-retry
 * - Clear action needed
 */
export class AuthenticationError extends VitoError {
  constructor(message = 'Invalid API key') {
    super(
      `Authentication failed: ${message}`,
      'Configuration issue - check the API key?',
      false,
      401
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * Request was cancelled.
 *
 * WHY specific type?
 * - Not an error, just a cancellation
 * - No retry needed
 * - UI shows "ready when you are"
 */
export class CancellationError extends VitoError {
  constructor() {
    super('Request was cancelled', 'Cancelled.', false);
    this.name = 'CancellationError';
  }
}

/**
 * Network connectivity issue.
 *
 * WHY specific type?
 * - Can fall back to local model
 * - Can queue for later
 * - Different handling than API errors
 */
export class NetworkError extends VitoError {
  constructor(message = 'Network unavailable') {
    super(`Network error: ${message}`, "Can't reach the internet. Airplane mode?", true);
    this.name = 'NetworkError';
  }
}

/**
 * API server error.
 *
 * WHY specific type?
 * - Not our fault, server's fault
 * - Should retry with backoff
 * - User shouldn't feel blamed
 */
export class ServerError extends VitoError {
  constructor(statusCode: number, message = 'Server error') {
    super(
      `Server error ${statusCode}: ${message}`,
      'Server hiccup. Not you, them!',
      true,
      statusCode
    );
    this.name = 'ServerError';
  }
}

/**
 * Request timed out.
 *
 * WHY specific type?
 * - Maybe request was too complex
 * - User can break it down
 * - Different from network error
 */
export class TimeoutError extends VitoError {
  /** Timeout in milliseconds */
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(
      `Request timed out after ${timeoutMs}ms`,
      'That was a big one! Try breaking it down.',
      true
    );
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Circuit breaker is open.
 *
 * WHY specific type?
 * - Service is recovering
 * - Specific wait time known
 * - Different from other errors
 */
export class CircuitOpenError extends VitoError {
  /** Seconds until circuit might close */
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      `Circuit breaker open. Retry after ${retryAfterSeconds}s`,
      `Service recovering - ${retryAfterSeconds} seconds.`,
      true
    );
    this.name = 'CircuitOpenError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Input validation failed.
 *
 * WHY specific type?
 * - User can fix the input
 * - Not a system error
 * - Helpful guidance needed
 */
export class ValidationError extends VitoError {
  /** Which field/aspect failed validation */
  readonly field: string;

  constructor(field: string, message: string, userMessage: string) {
    super(`Validation failed for ${field}: ${message}`, userMessage, false);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Quality threshold not met.
 *
 * WHY specific type?
 * - Auto-retry is triggered
 * - Score is tracked
 * - Different handling path
 */
export class QualityError extends VitoError {
  /** Score that was achieved */
  readonly score: number;

  /** Minimum required score */
  readonly minScore: number;

  constructor(score: number, minScore: number) {
    super(
      `Quality score ${score} below threshold ${minScore}`,
      "Quality wasn't quite there. Trying again...",
      true
    );
    this.name = 'QualityError';
    this.score = score;
    this.minScore = minScore;
  }
}

// ============================================================================
// ERROR FACTORY
// ============================================================================

/**
 * Create appropriate error from API response or exception.
 *
 * LESSON: Centralize error creation.
 * This ensures consistent error types and messages
 * regardless of where the error originates.
 */
export function createError(error: unknown): VitoError {
  // Already a VitoError
  if (error instanceof VitoError) {
    return error;
  }

  // AbortError from fetch
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (error.name === 'AbortError' || message.includes('abort')) {
      return new CancellationError();
    }

    if (message.includes('rate') || message.includes('429')) {
      // Try to parse retry-after, default to 60s
      const match = message.match(/(\d+)/);
      const seconds = match ? parseInt(match[1]) : 60;
      return new RateLimitError(seconds);
    }

    if (message.includes('401') || message.includes('key') || message.includes('auth')) {
      return new AuthenticationError(error.message);
    }

    if (message.includes('timeout')) {
      return new TimeoutError(30000);
    }

    if (message.includes('network') || message.includes('enotfound') || message.includes('fetch')) {
      return new NetworkError(error.message);
    }

    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      const statusMatch = message.match(/(5\d{2})/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 500;
      return new ServerError(status, error.message);
    }
  }

  // Unknown error
  return new VitoError(String(error), 'Hit a snag, but your request is saved!', true);
}

// ============================================================================
// TYPE GUARD
// ============================================================================

/**
 * Check if an error is a VitoError.
 *
 * LESSON: Type guards make TypeScript happy
 * and code more readable.
 */
export function isVitoError(error: unknown): error is VitoError {
  return error instanceof VitoError;
}

/**
 * Check if an error is retryable.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof VitoError) {
    return error.retryable;
  }
  return false;
}
