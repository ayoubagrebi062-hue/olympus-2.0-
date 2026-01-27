/**
 * OLYMPUS 2.0 - API Error Handler
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError, ValidationError, InternalError, isApiError } from './classes';
import type { ApiErrorResponse } from '../types';

/**
 * Handle any error and convert to API response.
 */
export function handleApiError(error: unknown, requestId: string): NextResponse<ApiErrorResponse> {
  // Already an ApiError
  if (isApiError(error)) {
    return NextResponse.json(error.toResponse(requestId), { status: error.status });
  }

  // Zod validation error
  if (error instanceof ZodError) {
    const validationError = new ValidationError(formatZodErrors(error));
    return NextResponse.json(validationError.toResponse(requestId), { status: 422 });
  }

  // Supabase/Postgres errors
  if (isPostgresError(error)) {
    return handlePostgresError(error, requestId);
  }

  // Standard Error
  if (error instanceof Error) {
    console.error(`[api] Unhandled error: ${error.message}`, {
      requestId,
      stack: error.stack,
      cause: error.cause,
    });

    const internalError = new InternalError({
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      cause: error,
    });
    return NextResponse.json(internalError.toResponse(requestId), { status: 500 });
  }

  // Unknown error type
  console.error('[api] Unknown error type:', { requestId, error });
  const unknownError = new InternalError();
  return NextResponse.json(unknownError.toResponse(requestId), { status: 500 });
}

/**
 * Format Zod errors into a readable structure.
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!formatted[path]) formatted[path] = [];
    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Check if error is a Postgres error.
 */
function isPostgresError(
  error: unknown
): error is { code: string; message: string; detail?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
}

/**
 * Handle Postgres-specific errors.
 */
function handlePostgresError(
  error: { code: string; message: string; detail?: string },
  requestId: string
): NextResponse<ApiErrorResponse> {
  const pgErrorMap: Record<string, { code: string; status: number; message: string }> = {
    '23505': { code: 'VAL_003', status: 409, message: 'Resource already exists' },
    '23503': { code: 'VAL_003', status: 400, message: 'Referenced resource not found' },
    '23502': { code: 'VAL_002', status: 400, message: 'Missing required field' },
    '22P02': { code: 'VAL_003', status: 400, message: 'Invalid input format' },
    '42501': { code: 'AUTHZ_003', status: 403, message: 'Permission denied' },
    PGRST116: { code: 'PROJECT_001', status: 404, message: 'Resource not found' },
  };

  const mapped = pgErrorMap[error.code];
  if (mapped) {
    const apiError = new ApiError(mapped.code, {
      message: mapped.message,
      status: mapped.status,
      details: process.env.NODE_ENV === 'development' ? error.detail : undefined,
    });
    return NextResponse.json(apiError.toResponse(requestId), { status: mapped.status });
  }

  console.error('[api] Postgres error:', { requestId, code: error.code, message: error.message });
  const internalError = new InternalError({ message: 'Database error' });
  return NextResponse.json(internalError.toResponse(requestId), { status: 500 });
}

/**
 * Create a standardized error response.
 */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details, requestId },
    },
    { status }
  );
}
