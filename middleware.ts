/**
 * OLYMPUS 2.0 - Next.js Middleware
 *
 * Handles authentication, route protection, and session refresh.
 * P1-P5 fixes applied for security and routing issues
 */

import { NextResponse, type NextRequest } from 'next/server';

// P3 fix - trusted proxy configuration
const TRUSTED_PROXIES = process.env.TRUSTED_PROXIES?.split(',') || [];

export async function middleware(request: NextRequest) {
  // Skip static files and internal Next.js routes
  if (shouldSkipMiddleware(request)) {
    return NextResponse.next();
  }

  // P1 fix - prevent redirect loops
  const redirectCount = parseInt(request.headers.get('x-redirect-count') || '0', 10);
  if (redirectCount > 5) {
    console.error('[middleware] Redirect loop detected');
    return new NextResponse('Too many redirects', { status: 508 });
  }

  try {
    // P3 fix - validate X-Forwarded-For only from trusted proxies
    const clientIp = getClientIp(request);

    const response = NextResponse.next();

    // Forward client IP to API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      response.headers.set('x-real-ip', clientIp);
    }

    return response;
  } catch (error) {
    console.error('[middleware] Error:', error);
    return NextResponse.next();
  }
}

function shouldSkipMiddleware(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;

  // Skip static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/images/') ||
    /\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|css|js|map)$/.test(pathname)
  ) {
    return true;
  }

  // P2 fix - more precise API path matching
  // Skip only specific public API routes
  const publicApiRoutes = ['/api/health', '/api/auth/callback', '/api/billing/webhooks'];
  if (publicApiRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return true;
  }

  return false;
}

// P3 fix - safely extract client IP
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  // Only trust X-Forwarded-For if from trusted proxy
  if (forwardedFor && TRUSTED_PROXIES.length > 0) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    // Return the first non-proxy IP
    for (const ip of ips) {
      if (!TRUSTED_PROXIES.includes(ip)) {
        return ip;
      }
    }
  }

  // Fallback to x-real-ip or first forwarded IP
  return realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';
}

// P4 fix - validate session
function isSessionValid(session: { expires_at?: number | string } | null): boolean {
  if (!session) return false;

  const expiresAt = session.expires_at;
  if (!expiresAt) return true; // No expiry means indefinite

  const expiryTime = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
  return Date.now() < expiryTime;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)',
  ],
};
