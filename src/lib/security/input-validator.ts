/**
 * OLYMPUS 3.0 - Input Validation & Sanitization
 * OWASP-compliant input security
 *
 * @ETHICAL_OVERSIGHT - Security validation affects all user inputs
 * @HUMAN_ACCOUNTABILITY - Changes impact platform security posture
 * @HUMAN_OVERRIDE_REQUIRED - Validation rules must be human-reviewed
 */

import { z } from 'zod';

// ============================================================================
// COMMON PATTERNS
// ============================================================================

const PATTERNS = {
  // Email - RFC 5322 compliant
  email:
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,

  // UUID v4
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // Alphanumeric with underscores and hyphens
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,

  // Safe filename
  filename: /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/,

  // No HTML/script tags
  noHtml: /<[^>]*>/,

  // L7 fix - improved SQL injection patterns (less bypassable)
  sqlInjection:
    /('|--|;|\/\*|\*\/|xp_|0x|char\s*\(|concat\s*\(|UNION[\s/\*]+SELECT|SELECT[\s/\*]+.+[\s/\*]+FROM|INSERT[\s/\*]+INTO|UPDATE[\s/\*]+.+[\s/\*]+SET|DELETE[\s/\*]+FROM|DROP[\s/\*]+TABLE|DROP[\s/\*]+DATABASE|EXEC[\s(]|EXECUTE[\s(]|WAITFOR[\s]+DELAY|BENCHMARK\s*\(|SLEEP\s*\()/i,

  // L8 fix - more comprehensive XSS patterns
  xssPatterns:
    /(javascript\s*:|data\s*:|vbscript\s*:|on\w+\s*=|<\s*script|<\s*img[^>]+onerror|<\s*svg[^>]+onload|<\s*body[^>]+onload|<\s*iframe|<\s*object|<\s*embed|<\s*link[^>]+href\s*=|expression\s*\(|url\s*\(\s*javascript|@import)/i,
};

// ============================================================================
// SANITIZERS
// ============================================================================

/**
 * Sanitize string for safe HTML display
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Remove all HTML tags
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * L9 fix - DEPRECATED: Use parameterized queries instead!
 * This function should NOT be used for SQL queries.
 * @deprecated Use parameterized queries with your database driver instead
 */
export function sanitizeSql(input: string): string {
  console.warn(
    '[SECURITY WARNING] sanitizeSql is deprecated and insecure. ' +
      'Use parameterized queries instead! Stack trace:',
    new Error().stack
  );

  // Minimal escaping - this is NOT sufficient for security
  return input.replace(/'/g, "''").replace(/\\/g, '\\\\').replace(/\0/g, '\\0');
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
}

/**
 * Normalize and trim whitespace
 */
export function normalizeWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Remove null bytes and control characters
 */
export function removeControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// ============================================================================
// VALIDATORS
// ============================================================================

/**
 * Check for potential SQL injection
 */
export function hasSqlInjection(input: string): boolean {
  return PATTERNS.sqlInjection.test(input);
}

/**
 * Check for potential XSS
 */
export function hasXss(input: string): boolean {
  return PATTERNS.xssPatterns.test(input) || PATTERNS.noHtml.test(input);
}

/**
 * Validate email format
 */
export function isValidEmail(input: string): boolean {
  return PATTERNS.email.test(input) && input.length <= 254;
}

/**
 * Validate UUID format
 */
export function isValidUuid(input: string): boolean {
  return PATTERNS.uuid.test(input);
}

/**
 * Validate slug format
 */
export function isValidSlug(input: string): boolean {
  return PATTERNS.slug.test(input) && input.length <= 100;
}

/**
 * Validate filename
 */
export function isValidFilename(input: string): boolean {
  return PATTERNS.filename.test(input) && input.length <= 255;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Safe string schema (sanitized and validated)
 */
export const safeStringSchema = z
  .string()
  .transform(removeControlChars)
  .transform(normalizeWhitespace)
  .refine(val => !hasXss(val), 'Invalid characters detected')
  .refine(val => !hasSqlInjection(val), 'Invalid characters detected');

/**
 * Email schema
 */
export const emailSchema = z.string().email().max(254).toLowerCase().transform(normalizeWhitespace);

/**
 * UUID schema
 */
export const uuidSchema = z.string().refine(isValidUuid, 'Invalid UUID format');

/**
 * Slug schema
 */
export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .toLowerCase()
  .refine(isValidSlug, 'Invalid slug format');

/**
 * Password schema (security requirements)
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine(val => /[A-Z]/.test(val), 'Password must contain at least one uppercase letter')
  .refine(val => /[a-z]/.test(val), 'Password must contain at least one lowercase letter')
  .refine(val => /[0-9]/.test(val), 'Password must contain at least one number');

/**
 * URL schema
 */
export const urlSchema = z
  .string()
  .url()
  .refine(
    val => val.startsWith('https://') || val.startsWith('http://'),
    'URL must use HTTP or HTTPS protocol'
  );

/**
 * Filename schema
 */
export const filenameSchema = z
  .string()
  .min(1)
  .max(255)
  .transform(sanitizeFilename)
  .refine(isValidFilename, 'Invalid filename');

// ============================================================================
// COMPREHENSIVE SANITIZER
// ============================================================================

/**
 * Sanitize all string values in an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    stripHtml?: boolean;
    removeControlChars?: boolean;
    normalizeWhitespace?: boolean;
    maxLength?: number;
  } = {}
): T {
  const {
    stripHtml: doStripHtml = true,
    removeControlChars: doRemoveControl = true,
    normalizeWhitespace: doNormalize = true,
    maxLength = 10000,
  } = options;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      let sanitizedValue = value;

      if (doRemoveControl) {
        sanitizedValue = removeControlChars(sanitizedValue);
      }

      if (doStripHtml) {
        sanitizedValue = stripHtml(sanitizedValue);
      }

      if (doNormalize) {
        sanitizedValue = normalizeWhitespace(sanitizedValue);
      }

      if (maxLength) {
        sanitizedValue = sanitizedValue.slice(0, maxLength);
      }

      sanitized[key] = sanitizedValue;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string'
          ? sanitizeObject({ v: item }, options).v
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>, options)
            : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

/**
 * Validate and sanitize request body
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const sanitized = sanitizeObject(body);
    const result = schema.safeParse(sanitized);

    if (!result.success) {
      return {
        success: false,
        error: result.error.errors.map(e => e.message).join(', '),
      };
    }

    return { success: true, data: result.data };
  } catch {
    return { success: false, error: 'Invalid JSON body' };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const params: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  const sanitized = sanitizeObject(params);
  const result = schema.safeParse(sanitized);

  if (!result.success) {
    return {
      success: false,
      error: result.error.errors.map(e => e.message).join(', '),
    };
  }

  return { success: true, data: result.data };
}
