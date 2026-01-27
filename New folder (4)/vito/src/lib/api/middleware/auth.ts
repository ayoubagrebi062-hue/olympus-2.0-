/**
 * OLYMPUS 2.0 - Auth Middleware
 *
 * Supports both P7 (ctx with params) and P8 native patterns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { AuthenticationError } from '../errors';
import { createApiContext } from '../context';
import type { ApiContext, AuthenticatedContext, RouteParams } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyParams = RouteParams | any;

/**
 * P7-compatible auth context with flexible structure.
 */
export interface P7AuthContext extends AuthenticatedContext {
  user: { id: string; email: string };
}

// Handler types supporting both P7 and P8 patterns
type P7AuthHandler = (req: NextRequest, ctx: P7AuthContext, params?: AnyParams) => Promise<NextResponse>;
type BaseHandler = (req: NextRequest, params?: AnyParams) => Promise<NextResponse>;

/**
 * Auth middleware supporting P7 pattern: withAuth(handler)
 * Handler receives (request, ctx, params) where ctx has ctx.user.id
 */
export function withAuth(handler: P7AuthHandler): BaseHandler {
  return async (request: NextRequest, params?: AnyParams) => {
    const apiContext = createApiContext(request);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      throw new AuthenticationError('AUTH_001', { message: 'Authentication required' });
    }

    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    if (Date.now() >= expiresAt) {
      throw new AuthenticationError('AUTH_002', { message: 'Session expired' });
    }

    const authContext: P7AuthContext = {
      ...apiContext,
      userId: session.user.id,
      email: session.user.email || '',
      sessionId: session.access_token.slice(-12),
      user: {
        id: session.user.id,
        email: session.user.email || '',
      },
    };

    return handler(request, authContext, params);
  };
}

/**
 * Optional auth - doesn't throw if not authenticated.
 */
export function withOptionalAuth(
  handler: (req: NextRequest, ctx: ApiContext & { userId?: string }, params?: AnyParams) => Promise<NextResponse>
): BaseHandler {
  return async (request: NextRequest, params?: AnyParams) => {
    const apiContext = createApiContext(request);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    const context = {
      ...apiContext,
      userId: session?.user.id,
      email: session?.user.email,
    };

    return handler(request, context, params);
  };
}

/**
 * Get user ID from request (for internal use).
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  return session?.user.id || null;
}
