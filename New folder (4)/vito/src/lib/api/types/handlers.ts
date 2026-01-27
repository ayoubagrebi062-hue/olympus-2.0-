/**
 * OLYMPUS 2.0 - API Handler Types
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  ApiContext,
  AuthenticatedContext,
  TenantContext,
  ApiResponse,
  ApiErrorResponse,
} from './responses';

/**
 * Route params from Next.js.
 */
export interface RouteParams<T extends Record<string, string> = Record<string, string>> {
  params: T;
}

/**
 * Base handler function.
 */
export type BaseHandler<T = unknown> = (
  request: NextRequest,
  params: RouteParams
) => Promise<NextResponse<ApiResponse<T> | ApiErrorResponse>>;

/**
 * Handler with API context.
 */
export type ContextHandler<T = unknown> = (
  request: NextRequest,
  context: ApiContext,
  params: RouteParams
) => Promise<NextResponse<ApiResponse<T> | ApiErrorResponse>>;

/**
 * Handler requiring authentication.
 */
export type AuthenticatedHandler<T = unknown> = (
  request: NextRequest,
  context: AuthenticatedContext,
  params: RouteParams
) => Promise<NextResponse<ApiResponse<T> | ApiErrorResponse>>;

/**
 * Handler requiring tenant context.
 */
export type TenantHandler<T = unknown> = (
  request: NextRequest,
  context: TenantContext,
  params: RouteParams
) => Promise<NextResponse<ApiResponse<T> | ApiErrorResponse>>;

/**
 * Handler with validated body.
 */
export type ValidatedHandler<T = unknown, B = unknown> = (
  request: NextRequest,
  context: TenantContext,
  body: B,
  params: RouteParams
) => Promise<NextResponse<ApiResponse<T> | ApiErrorResponse>>;

/**
 * Middleware function type.
 */
export type Middleware<TIn = ApiContext, TOut = ApiContext> = (
  handler: (req: NextRequest, ctx: TOut, params: RouteParams) => Promise<NextResponse>
) => (req: NextRequest, ctx: TIn, params: RouteParams) => Promise<NextResponse>;

/**
 * Route handler config.
 */
export interface RouteConfig {
  /** Require authentication */
  auth?: boolean;
  /** Require tenant context */
  tenant?: boolean;
  /** Required permission */
  permission?: string;
  /** Rate limit config */
  rateLimit?: {
    requests: number;
    window: string;
  };
  /** Cache config */
  cache?: {
    ttl: number;
    tags?: string[];
  };
}

/**
 * Request log entry.
 */
export interface RequestLog {
  requestId: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  userId?: string;
  tenantId?: string;
  userAgent: string;
  ip: string;
  error?: {
    code: string;
    message: string;
  };
}
