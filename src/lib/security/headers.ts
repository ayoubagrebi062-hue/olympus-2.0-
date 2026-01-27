/**
 * OLYMPUS 3.0 - Security Headers
 * OWASP-compliant HTTP security headers
 */

// ============================================================================
// SECURITY HEADERS CONFIGURATION
// ============================================================================

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: boolean | string;
  strictTransportSecurity?: boolean;
  xContentTypeOptions?: boolean;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN';
  xXssProtection?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: boolean | string;
}

const DEFAULT_CONFIG: Required<SecurityHeadersConfig> = {
  contentSecurityPolicy: true,
  strictTransportSecurity: true,
  xContentTypeOptions: true,
  xFrameOptions: 'DENY',
  xXssProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: true,
};

// ============================================================================
// CONTENT SECURITY POLICY
// ============================================================================

/**
 * Build Content Security Policy header (L10 fix - removed unsafe-inline when nonce present)
 */
export function buildCsp(nonce?: string): string {
  // L10 fix - when nonce is provided, don't include unsafe-inline for scripts
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:`
    : `script-src 'self' 'strict-dynamic' https: 'unsafe-inline'`; // Fallback only when no nonce

  const directives = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' https://fonts.googleapis.com", // L10 fix - removed unsafe-inline for styles where possible
    "style-src-attr 'unsafe-inline'", // Allow inline style attributes only
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.stripe.com",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'self' https://*.stripe.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
}

/**
 * Generate CSP nonce
 */
export function generateCspNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

// ============================================================================
// PERMISSIONS POLICY
// ============================================================================

/**
 * Build Permissions Policy header
 */
export function buildPermissionsPolicy(): string {
  const policies = [
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'battery=()',
    'camera=()',
    'cross-origin-isolated=()',
    'display-capture=()',
    'document-domain=()',
    'encrypted-media=()',
    'execution-while-not-rendered=()',
    'execution-while-out-of-viewport=()',
    'fullscreen=(self)',
    'geolocation=()',
    'gyroscope=()',
    'keyboard-map=()',
    'magnetometer=()',
    'microphone=()',
    'midi=()',
    'navigation-override=()',
    'payment=(self)',
    'picture-in-picture=()',
    'publickey-credentials-get=()',
    'screen-wake-lock=()',
    'sync-xhr=()',
    'usb=()',
    'web-share=(self)',
    'xr-spatial-tracking=()',
  ];

  return policies.join(', ');
}

// ============================================================================
// SECURITY HEADERS BUILDER
// ============================================================================

/**
 * Get all security headers
 */
export function getSecurityHeaders(
  config: SecurityHeadersConfig = {},
  nonce?: string
): Record<string, string> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const headers: Record<string, string> = {};

  // Content-Security-Policy
  if (mergedConfig.contentSecurityPolicy) {
    headers['Content-Security-Policy'] =
      typeof mergedConfig.contentSecurityPolicy === 'string'
        ? mergedConfig.contentSecurityPolicy
        : buildCsp(nonce);
  }

  // Strict-Transport-Security (HSTS)
  if (mergedConfig.strictTransportSecurity) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  // X-Content-Type-Options
  if (mergedConfig.xContentTypeOptions) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  // X-Frame-Options
  if (mergedConfig.xFrameOptions) {
    headers['X-Frame-Options'] = mergedConfig.xFrameOptions;
  }

  // L12 fix - X-XSS-Protection is deprecated in modern browsers
  // Only include for legacy browser compatibility, but CSP is the real protection
  if (mergedConfig.xXssProtection) {
    // Note: This header is deprecated and can cause issues in some browsers
    // CSP is the recommended approach for XSS protection
    headers['X-XSS-Protection'] = '0'; // Disable legacy XSS filter to avoid quirks
  }

  // Referrer-Policy
  if (mergedConfig.referrerPolicy) {
    headers['Referrer-Policy'] = mergedConfig.referrerPolicy;
  }

  // Permissions-Policy
  if (mergedConfig.permissionsPolicy) {
    headers['Permissions-Policy'] =
      typeof mergedConfig.permissionsPolicy === 'string'
        ? mergedConfig.permissionsPolicy
        : buildPermissionsPolicy();
  }

  // Additional security headers
  headers['X-DNS-Prefetch-Control'] = 'on';
  headers['X-Download-Options'] = 'noopen';
  headers['X-Permitted-Cross-Domain-Policies'] = 'none';

  return headers;
}

// ============================================================================
// NEXT.JS HEADERS CONFIG
// ============================================================================

/**
 * Get headers config for next.config.js
 */
export function getNextSecurityHeaders(): Array<{
  source: string;
  headers: Array<{ key: string; value: string }>;
}> {
  const headers = getSecurityHeaders();

  return [
    {
      source: '/:path*',
      headers: Object.entries(headers).map(([key, value]) => ({
        key,
        value,
      })),
    },
  ];
}

// ============================================================================
// CORS HEADERS
// ============================================================================

/**
 * Get CORS headers for API routes (L11 fix - improved origin validation)
 */
export function getCorsHeaders(
  origin: string | null,
  options: {
    methods?: string[];
    allowCredentials?: boolean;
    maxAge?: number;
  } = {}
): Record<string, string> {
  const {
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowCredentials = true,
    maxAge = 86400,
  } = options;

  // L11 fix - validate origin format and against allowlist
  if (!origin) {
    return {};
  }

  // Validate origin is a valid URL
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    console.warn('[CORS] Invalid origin format:', origin);
    return {};
  }

  // Only allow http(s) protocols
  if (!['http:', 'https:'].includes(originUrl.protocol)) {
    console.warn('[CORS] Invalid origin protocol:', origin);
    return {};
  }

  // Parse allowed origins
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  // L11 fix - check exact match and wildcard subdomains
  const isAllowed =
    allowedOrigins.length === 0 ||
    allowedOrigins.some(allowed => {
      if (allowed === origin) return true;

      // Support wildcard subdomains (e.g., *.example.com)
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        return originUrl.hostname.endsWith(domain) || originUrl.hostname === domain.slice(1);
      }

      return false;
    });

  if (!isAllowed) {
    console.warn('[CORS] Origin not in allowlist:', origin);
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With',
    'Access-Control-Allow-Credentials': String(allowCredentials),
    'Access-Control-Max-Age': String(maxAge),
    'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset',
  };
}
