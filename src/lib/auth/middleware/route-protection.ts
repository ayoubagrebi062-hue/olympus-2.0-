/**
 * OLYMPUS 2.0 - Middleware Auth Logic
 *
 * Route protection logic for Next.js middleware.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '../clients/middleware';
import { REDIRECTS, isPublicRoute, isAuthRoute, isProtectedRoute } from '../constants';

export interface MiddlewareAuthResult {
  authenticated: boolean;
  userId: string | null;
  tenantId: string | null;
  tenantSlug: string | null;
  response: NextResponse;
}

/**
 * Process authentication in middleware.
 */
export async function processAuthMiddleware(request: NextRequest): Promise<MiddlewareAuthResult> {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createMiddlewareSupabaseClient(request, response);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  let tenantId: string | null = null;
  let tenantSlug: string | null = null;

  if (user && !error) {
    // User is already verified by supabase.auth.getUser() above
    // Now safely extract tenant claims from verified session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      try {
        // Safe JWT payload extraction (signature already verified by Supabase)
        const parts = session.access_token.split('.');
        if (parts.length === 3) {
          // Use safe base64 decoding with validation
          const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64Payload)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);

          // Only extract olympus-specific claims
          if (payload.olympus && typeof payload.olympus === 'object') {
            tenantId =
              typeof payload.olympus.tenant_id === 'string' ? payload.olympus.tenant_id : null;
            tenantSlug =
              typeof payload.olympus.tenant_slug === 'string' ? payload.olympus.tenant_slug : null;
          }
        }
      } catch (jwtError) {
        // Log JWT parsing errors for debugging but don't fail the request
        // User is still authenticated via getUser() above
        console.warn(
          '[Auth] Failed to parse JWT claims:',
          jwtError instanceof Error ? jwtError.message : 'Unknown error'
        );
      }
    }
  }

  return {
    authenticated: !!user && !error,
    userId: user?.id || null,
    tenantId,
    tenantSlug,
    response,
  };
}

/**
 * Handle route protection based on auth state.
 */
export function handleRouteProtection(
  request: NextRequest,
  authResult: MiddlewareAuthResult
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const { authenticated } = authResult;

  // Public routes - always allow
  if (isPublicRoute(pathname)) {
    return null;
  }

  // Auth routes (login, signup) - redirect to dashboard if authenticated
  if (isAuthRoute(pathname)) {
    if (authenticated) {
      const url = request.nextUrl.clone();
      url.pathname = REDIRECTS.AFTER_LOGIN;
      return NextResponse.redirect(url);
    }
    return null;
  }

  // Protected routes - redirect to login if not authenticated
  if (isProtectedRoute(pathname) || pathname.startsWith('/api/v1')) {
    if (!authenticated) {
      // API routes return 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: { code: 'AUTH_300', message: 'Unauthorized' } },
          { status: 401 }
        );
      }

      // Page routes redirect to login
      const url = request.nextUrl.clone();
      url.pathname = REDIRECTS.UNAUTHENTICATED;
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return null;
}

/**
 * Add auth headers to response.
 */
export function addAuthHeaders(
  response: NextResponse,
  authResult: MiddlewareAuthResult
): NextResponse {
  if (authResult.authenticated) {
    response.headers.set('x-user-id', authResult.userId || '');
    if (authResult.tenantId) {
      response.headers.set('x-tenant-id', authResult.tenantId);
    }
    if (authResult.tenantSlug) {
      response.headers.set('x-tenant-slug', authResult.tenantSlug);
    }
  }

  return response;
}
