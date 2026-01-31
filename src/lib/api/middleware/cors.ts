/**
 * OLYMPUS 2.0 - CORS Middleware
 */

import { NextRequest, NextResponse } from 'next/server';

type Handler = (req: NextRequest, params: any) => Promise<NextResponse>;

/**
 * CORS configuration.
 */
export interface CorsConfig {
  origins: string[] | '*';
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * Default CORS config.
 * SECURITY FIX (Jan 31, 2026): Removed wildcard '*' for development mode.
 * Always use explicit origin whitelist from CORS_ORIGINS environment variable.
 */
const DEFAULT_CORS: CorsConfig = {
  // Parse CORS_ORIGINS env var (comma-separated) or use empty array (deny all)
  origins: (() => {
    const originsEnv = process.env.CORS_ORIGINS;
    if (!originsEnv) {
      // In development, allow localhost origins if no explicit config
      if (process.env.NODE_ENV === 'development') {
        return ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];
      }
      return []; // Production: deny all if not configured
    }
    return originsEnv
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);
  })(),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Request-Id'],
  // SECURITY: Only send credentials when origins are explicitly whitelisted
  credentials: !!process.env.CORS_ORIGINS || process.env.NODE_ENV === 'development',
  maxAge: 86400, // 24 hours
};

/**
 * Check if origin is allowed.
 */
function isOriginAllowed(origin: string | null, config: CorsConfig): boolean {
  if (!origin) return false;
  if (config.origins === '*') return true;
  return config.origins.includes(origin);
}

/**
 * Add CORS headers to response.
 */
export function addCorsHeaders(
  response: NextResponse,
  request: NextRequest,
  config: CorsConfig = DEFAULT_CORS
): NextResponse {
  const origin = request.headers.get('origin');

  if (isOriginAllowed(origin, config)) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
  }

  if (config.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set(
    'Access-Control-Allow-Methods',
    (config.methods || DEFAULT_CORS.methods!).join(', ')
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    (config.headers || DEFAULT_CORS.headers!).join(', ')
  );

  if (config.maxAge) {
    response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
  }

  return response;
}

/**
 * Handle OPTIONS preflight request.
 */
export function handlePreflight(
  request: NextRequest,
  config: CorsConfig = DEFAULT_CORS
): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, request, config);
}

/**
 * CORS middleware wrapper.
 */
export function withCors<T>(handler: Handler, config: CorsConfig = DEFAULT_CORS): Handler {
  return async (request: NextRequest, params: any) => {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return handlePreflight(request, config);
    }

    const response = await handler(request, params);
    return addCorsHeaders(response, request, config);
  };
}

/**
 * Create OPTIONS handler for route.
 */
export function createOptionsHandler(config: CorsConfig = DEFAULT_CORS) {
  return async (request: NextRequest) => handlePreflight(request, config);
}
