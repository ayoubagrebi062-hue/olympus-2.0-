/**
 * OLYMPUS 2.0 - Validation Middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError, BadRequestError } from '../errors';
import { safeJsonParse } from '@/lib/utils/safe-json';
import type { TenantContext, RouteParams } from '../types';

// 50X RELIABILITY: Sentinel to detect JSON parse failure
const JSON_PARSE_FAILED = Symbol('JSON_PARSE_FAILED');

type ValidatedHandler<T, B> = (req: NextRequest, ctx: TenantContext, body: B, params: RouteParams) => Promise<NextResponse<T>>;
type TenantHandler<T> = (req: NextRequest, ctx: TenantContext, params: RouteParams) => Promise<NextResponse<T>>;

/**
 * Middleware that validates request body against Zod schema.
 */
export function withValidation<T, S extends ZodSchema>(
  schema: S,
  handler: ValidatedHandler<T, z.infer<S>>
): TenantHandler<T> {
  return async (request: NextRequest, ctx: TenantContext, params: RouteParams) => {
    let body: unknown;

    // 50X RELIABILITY: Safe JSON parsing with logging
    const text = await request.text();
    if (!text) {
      throw new BadRequestError('VAL_001', { message: 'Request body is required' });
    }

    body = safeJsonParse(text, JSON_PARSE_FAILED, 'validation:request-body');
    if (body === JSON_PARSE_FAILED) {
      throw new BadRequestError('VAL_001', { message: 'Invalid JSON body' });
    }

    try {
      const validated = schema.parse(body);
      return handler(request, ctx, validated, params);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new ValidationError(formatZodErrors(e));
      }
      throw e;
    }
  };
}

/**
 * Validate query parameters against schema.
 */
export function withQueryValidation<T, S extends ZodSchema>(
  schema: S,
  handler: (req: NextRequest, ctx: TenantContext, query: z.infer<S>, params: RouteParams) => Promise<NextResponse<T>>
): TenantHandler<T> {
  return async (request: NextRequest, ctx: TenantContext, params: RouteParams) => {
    const url = new URL(request.url);
    const queryObj: Record<string, string> = {};
    url.searchParams.forEach((value, key) => { queryObj[key] = value; });

    try {
      const validated = schema.parse(queryObj);
      return handler(request, ctx, validated, params);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new ValidationError(formatZodErrors(e), { message: 'Invalid query parameters' });
      }
      throw e;
    }
  };
}

/**
 * Validate path parameters against schema.
 */
export function withPathValidation<T, S extends ZodSchema>(
  schema: S,
  handler: (req: NextRequest, ctx: TenantContext, pathParams: z.infer<S>, params: RouteParams) => Promise<NextResponse<T>>
): TenantHandler<T> {
  return async (request: NextRequest, ctx: TenantContext, params: RouteParams) => {
    try {
      const validated = schema.parse(params.params);
      return handler(request, ctx, validated, params);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new ValidationError(formatZodErrors(e), { message: 'Invalid path parameters' });
      }
      throw e;
    }
  };
}

/**
 * Format Zod errors into readable object.
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
 * Common validation helpers.
 */
export const validators = {
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with dashes'),
  url: z.string().url('Invalid URL format'),
  date: z.string().datetime('Invalid date format'),
  positiveInt: z.number().int().positive(),
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
};
