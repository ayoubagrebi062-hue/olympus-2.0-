/**
 * OLYMPUS 2.0 - API Response Types
 */

/**
 * Standard success response wrapper.
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

/**
 * Standard error response wrapper.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

/**
 * Response metadata.
 */
export interface ApiMeta {
  pagination?: PaginationMeta;
  rateLimit?: RateLimitMeta;
  cached?: boolean;
  timing?: number;
}

/**
 * Pagination metadata.
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
}

/**
 * Rate limit metadata.
 */
export interface RateLimitMeta {
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Pagination query parameters.
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Common filter parameters.
 */
export interface FilterParams {
  search?: string;
  status?: string | string[];
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

/**
 * Paginated result wrapper.
 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * HTTP methods.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

/**
 * API route context.
 */
export interface ApiContext {
  requestId: string;
  startTime: number;
  method: HttpMethod;
  path: string;
  ip: string;
  userAgent: string;
}

/**
 * Authenticated context (extends ApiContext).
 */
export interface AuthenticatedContext extends ApiContext {
  userId: string;
  email: string;
  sessionId: string;
}

/**
 * Tenant context (extends AuthenticatedContext).
 */
export interface TenantContext extends AuthenticatedContext {
  tenantId: string;
  tenantRole: TenantRole;
  tenantPlan: PlanTier;
}

/**
 * Tenant roles.
 */
export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Plan tiers (from billing).
 */
export type PlanTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

/**
 * Permission types.
 */
export type Permission =
  | 'read:tenant'
  | 'write:tenant'
  | 'delete:tenant'
  | 'manage:members'
  | 'manage:billing'
  | 'read:project'
  | 'write:project'
  | 'delete:project'
  | 'create:build'
  | 'cancel:build'
  | 'create:deploy'
  | 'manage:domains'
  | 'read:analytics'
  | 'manage:settings'
  | 'admin:api_keys';
