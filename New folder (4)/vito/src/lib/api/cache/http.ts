/**
 * OLYMPUS 2.0 - HTTP Cache Helpers
 */

import { NextRequest, NextResponse } from 'next/server';
import { ENDPOINT_CACHE, type EndpointCacheConfig } from './config';

/** Match endpoint pattern to request */
function matchEndpoint(method: string, path: string): EndpointCacheConfig | null {
  const key = `${method} ${path}`;

  // Exact match
  if (ENDPOINT_CACHE[key]) return ENDPOINT_CACHE[key];

  // Pattern match (replace :param with regex)
  for (const [pattern, config] of Object.entries(ENDPOINT_CACHE)) {
    const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
    if (regex.test(key)) return config;
  }

  return null;
}

/** Add cache headers to response */
export function addCacheHeaders(
  response: NextResponse,
  config: EndpointCacheConfig
): NextResponse {
  const directives: string[] = [];

  // Private or public
  directives.push(config.private ? 'private' : 'public');

  // Max age
  directives.push(`max-age=${config.ttl}`);

  // Stale while revalidate
  if (config.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  response.headers.set('Cache-Control', directives.join(', '));

  // Add cache tags for CDN invalidation
  if (config.tags?.length) {
    response.headers.set('Cache-Tag', config.tags.join(','));
  }

  return response;
}

/** Middleware to add cache headers */
export function withCache(config?: Partial<EndpointCacheConfig>) {
  return <T>(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse<T>>) => {
    return async (request: NextRequest, ...args: any[]): Promise<NextResponse<T>> => {
      const response = await handler(request, ...args);

      // Skip caching for non-GET or error responses
      if (request.method !== 'GET' || response.status >= 400) {
        return response;
      }

      // Use provided config or match from patterns
      const url = new URL(request.url);
      const cacheConfig = config || matchEndpoint(request.method, url.pathname);

      if (cacheConfig) {
        return addCacheHeaders(response, cacheConfig as EndpointCacheConfig) as NextResponse<T>;
      }

      return response;
    };
  };
}

/** No-cache response helper */
export function noCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

/** Conditional request handling (ETag/Last-Modified) */
export function handleConditionalRequest(
  request: NextRequest,
  etag: string,
  lastModified?: Date
): NextResponse | null {
  const ifNoneMatch = request.headers.get('if-none-match');
  const ifModifiedSince = request.headers.get('if-modified-since');

  // ETag match
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }

  // Last-Modified match
  if (ifModifiedSince && lastModified) {
    const clientDate = new Date(ifModifiedSince);
    if (lastModified <= clientDate) {
      return new NextResponse(null, { status: 304 });
    }
  }

  return null;
}

/** Add ETag and Last-Modified headers */
export function addConditionalHeaders(
  response: NextResponse,
  etag: string,
  lastModified?: Date
): NextResponse {
  response.headers.set('ETag', etag);

  if (lastModified) {
    response.headers.set('Last-Modified', lastModified.toUTCString());
  }

  return response;
}

/** Generate ETag from content */
export function generateETag(content: string | object): string {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(16)}"`;
}
