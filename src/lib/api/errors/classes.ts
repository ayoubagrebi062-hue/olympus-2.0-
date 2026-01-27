/**
 * OLYMPUS 2.0 - API Error Classes
 */

import { getErrorMessage, getErrorStatus, type ErrorCode } from './codes';
import type { ApiErrorResponse } from '../types';

/** Base API error class */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(
    code: string,
    options?: {
      message?: string;
      status?: number;
      details?: unknown;
      requestId?: string;
      cause?: Error;
    }
  ) {
    super(options?.message || getErrorMessage(code), { cause: options?.cause });
    this.name = 'ApiError';
    this.code = code;
    this.status = options?.status || getErrorStatus(code);
    this.details = options?.details;
    this.requestId = options?.requestId;
    Error.captureStackTrace?.(this, this.constructor);
  }

  toResponse(requestId?: string): ApiErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        requestId: requestId || this.requestId || 'unknown',
      },
    };
  }
}

/** Authentication error (401) */
export class AuthenticationError extends ApiError {
  constructor(code: ErrorCode = 'AUTH_001', options?: { message?: string; details?: unknown }) {
    super(code, { ...options, status: 401 });
    this.name = 'AuthenticationError';
  }
}

/** Authorization error (403) */
export class AuthorizationError extends ApiError {
  constructor(code: ErrorCode = 'AUTHZ_002', options?: { message?: string; details?: unknown }) {
    super(code, { ...options, status: 403 });
    this.name = 'AuthorizationError';
  }
}

/** Not found error (404) */
export class NotFoundError extends ApiError {
  constructor(resource: string, options?: { details?: unknown }) {
    super(`${resource.toUpperCase()}_001`, {
      message: `${resource} not found`,
      status: 404,
      details: options?.details,
    });
    this.name = 'NotFoundError';
  }
}

/** Validation error (422) */
export class ValidationError extends ApiError {
  constructor(details: unknown, options?: { message?: string }) {
    super('VAL_001', { message: options?.message || 'Validation failed', status: 422, details });
    this.name = 'ValidationError';
  }
}

/** Rate limit error (429) */
export class RateLimitError extends ApiError {
  readonly retryAfter: number;
  constructor(retryAfter: number, options?: { message?: string }) {
    super('RATE_001', {
      message: options?.message || 'Rate limit exceeded',
      status: 429,
      details: { retryAfter },
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/** Conflict error (409) */
export class ConflictError extends ApiError {
  constructor(code: ErrorCode, options?: { message?: string; details?: unknown }) {
    super(code, { ...options, status: 409 });
    this.name = 'ConflictError';
  }
}

/** Bad request error (400) */
export class BadRequestError extends ApiError {
  constructor(code: ErrorCode, options?: { message?: string; details?: unknown }) {
    super(code, { ...options, status: 400 });
    this.name = 'BadRequestError';
  }
}

/** Internal server error (500) */
export class InternalError extends ApiError {
  constructor(options?: { message?: string; details?: unknown; cause?: Error }) {
    super('INT_001', { ...options, status: 500 });
    this.name = 'InternalError';
  }
}

/** Service unavailable error (503) */
export class ServiceUnavailableError extends ApiError {
  constructor(options?: { message?: string; details?: unknown }) {
    super('INT_002', {
      message: options?.message || 'Service temporarily unavailable',
      status: 503,
      details: options?.details,
    });
    this.name = 'ServiceUnavailableError';
  }
}

/** Type guard for ApiError */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
