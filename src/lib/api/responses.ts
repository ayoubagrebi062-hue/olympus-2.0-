/**
 * OLYMPUS 2.0 - API Response Helpers
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, ApiMeta, PaginationMeta, PaginatedResult } from './types';

/** Create a success response */
export function successResponse<T>(
  data: T,
  options?: { status?: number; meta?: Partial<ApiMeta>; headers?: Record<string, string> }
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = { success: true, data };
  if (options?.meta && Object.keys(options.meta).length > 0)
    response.meta = options.meta as ApiMeta;
  return NextResponse.json(response, { status: options?.status || 200, headers: options?.headers });
}

/** Create a paginated response */
export function paginatedResponse<T>(
  result: PaginatedResult<T>,
  options?: { meta?: Partial<Omit<ApiMeta, 'pagination'>>; headers?: Record<string, string> }
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json(
    {
      success: true,
      data: result.items,
      meta: { pagination: result.pagination, ...options?.meta },
    },
    { headers: options?.headers }
  );
}

/** Create a 201 Created response */
export function createdResponse<T>(
  data: T,
  options?: { headers?: Record<string, string> }
): NextResponse<ApiResponse<T>> {
  return successResponse(data, { status: 201, ...options });
}

/** Create a 204 No Content response */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/** Calculate pagination metadata */
export function calculatePagination(params: {
  page: number;
  pageSize: number;
  totalCount: number;
}): PaginationMeta {
  const { page, pageSize, totalCount } = params;
  const totalPages = Math.ceil(totalCount / pageSize);
  return { page, pageSize, totalPages, totalCount, hasMore: page < totalPages };
}

/** Parse pagination params from request */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  offset: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
  };
}

/** Parse common filter params from request */
export function parseFilterParams(searchParams: URLSearchParams): {
  search?: string;
  status?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
} {
  const search = searchParams.get('search') || undefined;
  const statusParam = searchParams.get('status');
  const createdAfter = searchParams.get('createdAfter');
  const createdBefore = searchParams.get('createdBefore');
  return {
    search,
    status: statusParam ? statusParam.split(',') : undefined,
    createdAfter: createdAfter ? new Date(createdAfter) : undefined,
    createdBefore: createdBefore ? new Date(createdBefore) : undefined,
  };
}

/** Add rate limit headers to response */
export function withRateLimitHeaders<T>(
  response: NextResponse<T>,
  rateLimit: { limit: number; remaining: number; reset: number }
): NextResponse<T> {
  response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimit.reset.toString());
  return response;
}

/** Add cache headers to response */
export function withCacheHeaders<T>(
  response: NextResponse<T>,
  options: { maxAge?: number; staleWhileRevalidate?: number; private?: boolean }
): NextResponse<T> {
  const directives: string[] = [options.private ? 'private' : 'public'];
  if (options.maxAge) directives.push(`max-age=${options.maxAge}`);
  if (options.staleWhileRevalidate)
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  response.headers.set('Cache-Control', directives.join(', '));
  return response;
}

// Backward compatibility aliases (P7 signatures)

/**
 * P7-compatible success response.
 * Supports: success(data), success(data, 201), success(data, { status: 201 })
 */
export function success<T>(
  data: T,
  statusOrOptions?:
    | number
    | { status?: number; meta?: Partial<ApiMeta>; headers?: Record<string, string> }
): NextResponse<ApiResponse<T>> {
  if (typeof statusOrOptions === 'number') {
    return successResponse(data, { status: statusOrOptions });
  }
  return successResponse(data, statusOrOptions);
}

/**
 * P7-compatible error response.
 * Supports: error('CODE', 'message'), error('CODE', 'message', 400), error('CODE', 'message', 400, details)
 */
export function error(code: string, message: string, status: number = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details, requestId: 'unknown' },
    },
    { status }
  );
}

/**
 * P7-compatible paginated response.
 * Supports: paginatedSuccess(data, { page, pageSize, totalCount, ... })
 */
export function paginatedSuccess<T>(
  data: T[],
  pagination: PaginationMeta | PaginatedResult<T>
): NextResponse<ApiResponse<T[]>> {
  // Handle both PaginatedResult and direct pagination object
  const paginationMeta = 'items' in pagination ? pagination.pagination : pagination;
  const items = 'items' in pagination ? pagination.items : data;

  return NextResponse.json({
    success: true,
    data: items,
    meta: { pagination: paginationMeta },
  });
}
