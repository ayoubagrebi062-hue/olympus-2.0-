/**
 * OLYMPUS 3.0 - CSRF Protection
 * Cross-Site Request Forgery prevention
 */

import { cookies } from 'next/headers';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CSRF_TOKEN_COOKIE = 'csrf_token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate a secure CSRF token (L4 fix - use crypto.randomUUID or randomBytes)
 */
export function generateCsrfToken(): string {
  // Use cryptographically secure random bytes
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  // Add timestamp and additional entropy
  const timestamp = Date.now().toString(36);
  const randomPart = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${randomPart}${timestamp}`;
}

/**
 * Create a signed token with timestamp
 */
function createSignedToken(): { token: string; expires: number } {
  const token = generateCsrfToken();
  const expires = Date.now() + TOKEN_EXPIRY;
  return { token, expires };
}

// ============================================================================
// COOKIE MANAGEMENT
// ============================================================================

/**
 * Set CSRF token in cookie
 */
export async function setCsrfCookie(): Promise<string> {
  const { token, expires } = createSignedToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_TOKEN_COOKIE, `${token}:${expires}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(expires),
  });

  return token;
}

/**
 * Get CSRF token from cookie
 */
export async function getCsrfFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(CSRF_TOKEN_COOKIE);

  if (!cookie?.value) {
    return null;
  }

  const [token, expiresStr] = cookie.value.split(':');
  const expires = parseInt(expiresStr, 10);

  // Check expiry
  if (isNaN(expires) || Date.now() > expires) {
    return null;
  }

  return token;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate CSRF token from request
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  // Get token from header
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);

  if (!headerToken) {
    return false;
  }

  // Get token from cookie
  const cookieToken = await getCsrfFromCookie();

  if (!cookieToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return secureCompare(headerToken, cookieToken);
}

/**
 * Constant-time string comparison (L5 fix - truly constant time)
 */
function secureCompare(a: string, b: string): boolean {
  // L5 fix - pad shorter string to make comparison constant-time
  // even when lengths differ (prevents length-based timing attacks)
  const maxLength = Math.max(a.length, b.length);
  const aPadded = a.padEnd(maxLength, '\0');
  const bPadded = b.padEnd(maxLength, '\0');

  let result = a.length ^ b.length; // Will be non-zero if lengths differ

  for (let i = 0; i < maxLength; i++) {
    result |= aPadded.charCodeAt(i) ^ bPadded.charCodeAt(i);
  }

  return result === 0;
}

// ============================================================================
// MIDDLEWARE HELPER
// ============================================================================

/**
 * CSRF protection middleware
 */
export async function csrfProtection(
  request: Request
): Promise<{ valid: boolean; error?: string }> {
  // Skip for safe methods
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (safeMethod) {
    return { valid: true };
  }

  // L6 fix - don't skip CSRF for API key routes entirely
  // API keys should be validated separately, but CSRF still applies for browser requests
  const authHeader = request.headers.get('authorization');
  const hasApiKey = authHeader?.startsWith('Bearer ') && authHeader.length > 50; // Real API keys are longer

  // Only skip CSRF if request is clearly from a non-browser client
  const isNonBrowserClient =
    hasApiKey &&
    !request.headers.get('cookie') && // No cookies = programmatic client
    (request.headers.get('user-agent')?.includes('curl') ||
      request.headers.get('user-agent')?.includes('python') ||
      request.headers.get('user-agent')?.includes('node') ||
      !request.headers.get('user-agent'));

  if (isNonBrowserClient) {
    return { valid: true };
  }

  // Validate CSRF token
  const isValid = await validateCsrfToken(request);

  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid or missing CSRF token',
    };
  }

  return { valid: true };
}

// ============================================================================
// DOUBLE SUBMIT COOKIE PATTERN
// ============================================================================

/**
 * Generate token for client-side forms
 */
export async function getClientCsrfToken(): Promise<string> {
  let token = await getCsrfFromCookie();

  if (!token) {
    token = await setCsrfCookie();
  }

  return token;
}

/**
 * Create hidden input for forms
 */
export async function csrfInput(): Promise<string> {
  const token = await getClientCsrfToken();
  return `<input type="hidden" name="_csrf" value="${token}" />`;
}
