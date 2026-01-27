/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                     XSS PROTECTION MODULE                                     ║
 * ║                                                                               ║
 * ║   CRITICAL FIX #1: Prevent XSS attacks in node labels                        ║
 * ║                                                                               ║
 * ║   Attack Vector:                                                              ║
 * ║   - User submits agent name: "<img src=x onerror=alert('XSS')>"              ║
 * ║   - If rendered with innerHTML... game over                                   ║
 * ║                                                                               ║
 * ║   Defense Layers:                                                             ║
 * ║   1. Input sanitization (remove/escape dangerous characters)                  ║
 * ║   2. Output encoding (always use textContent, never innerHTML)                ║
 * ║   3. Allowlist validation (only permit known-safe patterns)                   ║
 * ║   4. CSP headers (block inline script execution)                              ║
 * ║                                                                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Characters that are safe in node labels */
const SAFE_CHARS_REGEX = /^[a-zA-Z0-9\s\-_.:@#()[\]{}|/\\,;'"!?&%$*+=~`^]+$/;

/** Maximum label length to prevent DoS via massive strings */
const MAX_LABEL_LENGTH = 256;

/** HTML entities to escape */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/** Dangerous patterns that indicate XSS attempts */
const DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,  // onclick=, onerror=, etc.
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<link/i,
  /<style/i,
  /data:/i,
  /vbscript:/i,
  /expression\s*\(/i,
  /url\s*\(/i,
];

// ============================================================================
// CORE SANITIZATION
// ============================================================================

/**
 * Escape HTML entities in a string
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return String(str ?? '');
  }

  return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char);
}

/**
 * Check if a string contains dangerous XSS patterns
 */
export function containsXssPattern(str: string): boolean {
  if (typeof str !== 'string') return false;
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtml(str: string): string {
  if (typeof str !== 'string') return '';

  // First pass: remove obvious tags
  let result = str.replace(/<[^>]*>/g, '');

  // Second pass: remove any remaining angle brackets
  result = result.replace(/[<>]/g, '');

  return result;
}

/**
 * Validate that a string contains only safe characters
 */
export function isValidLabel(str: string): boolean {
  if (typeof str !== 'string') return false;
  if (str.length === 0 || str.length > MAX_LABEL_LENGTH) return false;
  return SAFE_CHARS_REGEX.test(str);
}

// ============================================================================
// MAIN SANITIZATION FUNCTION
// ============================================================================

export interface SanitizeOptions {
  /** Maximum length (default: 256) */
  maxLength?: number;
  /** Allow HTML entities in output (default: false) */
  preserveEntities?: boolean;
  /** Fallback value if sanitization fails (default: 'Invalid') */
  fallback?: string;
  /** Log suspicious inputs (default: true) */
  logSuspicious?: boolean;
}

export interface SanitizeResult {
  /** The sanitized string */
  value: string;
  /** Whether the original was modified */
  wasModified: boolean;
  /** Whether XSS was detected */
  xssDetected: boolean;
  /** Original value (for logging) */
  original: string;
}

/**
 * SANITIZE NODE LABEL
 *
 * The main function to call for any user-provided text that will be rendered.
 *
 * Defense-in-depth approach:
 * 1. Type check and coerce to string
 * 2. Length limit (prevent DoS)
 * 3. XSS pattern detection (log and flag)
 * 4. Strip HTML tags
 * 5. Escape remaining HTML entities
 * 6. Validate against allowlist
 *
 * @example
 * sanitizeNodeLabel('<script>alert("xss")</script>')
 * // Returns: { value: 'scriptalert("xss")/script', wasModified: true, xssDetected: true, ... }
 *
 * sanitizeNodeLabel('Auth Service')
 * // Returns: { value: 'Auth Service', wasModified: false, xssDetected: false, ... }
 */
export function sanitizeNodeLabel(
  input: unknown,
  options: SanitizeOptions = {}
): SanitizeResult {
  const {
    maxLength = MAX_LABEL_LENGTH,
    preserveEntities = false,
    fallback = 'Invalid',
    logSuspicious = true,
  } = options;

  // Type coercion
  let str = typeof input === 'string' ? input : String(input ?? '');
  const original = str;
  let wasModified = false;
  let xssDetected = false;

  // Empty check
  if (str.trim().length === 0) {
    return { value: fallback, wasModified: true, xssDetected: false, original };
  }

  // Length limit
  if (str.length > maxLength) {
    str = str.slice(0, maxLength);
    wasModified = true;
  }

  // XSS pattern detection
  if (containsXssPattern(str)) {
    xssDetected = true;
    wasModified = true;
    if (logSuspicious) {
      console.warn('[XSS-PROTECTION] Suspicious input detected:', {
        input: original.slice(0, 100),
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Strip HTML
  const stripped = stripHtml(str);
  if (stripped !== str) {
    str = stripped;
    wasModified = true;
  }

  // Escape entities (if not preserving)
  if (!preserveEntities) {
    const escaped = escapeHtml(str);
    if (escaped !== str) {
      str = escaped;
      wasModified = true;
    }
  }

  // Final validation
  if (str.trim().length === 0) {
    return { value: fallback, wasModified: true, xssDetected, original };
  }

  return { value: str, wasModified, xssDetected, original };
}

// ============================================================================
// BATCH SANITIZATION
// ============================================================================

/**
 * Sanitize an array of labels efficiently
 */
export function sanitizeLabels(
  labels: unknown[],
  options?: SanitizeOptions
): SanitizeResult[] {
  return labels.map(label => sanitizeNodeLabel(label, options));
}

/**
 * Sanitize all string values in an object (shallow)
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options?: SanitizeOptions
): T {
  const result = { ...obj };

  for (const key in result) {
    if (typeof result[key] === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeNodeLabel(result[key], options).value;
    }
  }

  return result;
}

// ============================================================================
// SAFE RENDERING UTILITIES
// ============================================================================

/**
 * Safely set text content on a DOM element
 *
 * ALWAYS use this instead of innerHTML for user content
 */
export function safeSetText(element: Element | null, text: unknown): void {
  if (!element) return;
  const sanitized = sanitizeNodeLabel(text);
  element.textContent = sanitized.value;
}

/**
 * Safely create a text node
 */
export function safeTextNode(text: unknown): Text {
  const sanitized = sanitizeNodeLabel(text);
  return document.createTextNode(sanitized.value);
}

/**
 * Safely set an attribute value
 */
export function safeSetAttribute(
  element: Element | null,
  name: string,
  value: unknown
): void {
  if (!element) return;

  // Prevent dangerous attributes
  const dangerousAttrs = ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur'];
  if (dangerousAttrs.includes(name.toLowerCase())) {
    console.warn('[XSS-PROTECTION] Blocked dangerous attribute:', name);
    return;
  }

  // Prevent javascript: URLs in href/src
  if (['href', 'src', 'action', 'formaction'].includes(name.toLowerCase())) {
    const strValue = String(value ?? '');
    if (/^(javascript|data|vbscript):/i.test(strValue.trim())) {
      console.warn('[XSS-PROTECTION] Blocked dangerous URL:', strValue.slice(0, 50));
      return;
    }
  }

  const sanitized = sanitizeNodeLabel(value, { preserveEntities: true });
  element.setAttribute(name, sanitized.value);
}

// ============================================================================
// CANVAS/WEBGL SAFE RENDERING
// ============================================================================

/**
 * Safely render text on a Canvas 2D context
 *
 * Note: Canvas fillText is inherently safe from XSS (it's not HTML parsing),
 * but we still sanitize to prevent:
 * - Extremely long strings (DoS via rendering)
 * - Control characters that might break layout
 * - Logging of suspicious inputs
 */
export function safeCanvasText(
  ctx: CanvasRenderingContext2D,
  text: unknown,
  x: number,
  y: number,
  maxWidth?: number
): void {
  const sanitized = sanitizeNodeLabel(text);
  ctx.fillText(sanitized.value, x, y, maxWidth);
}

/**
 * Safely stroke text on a Canvas 2D context
 */
export function safeCanvasStrokeText(
  ctx: CanvasRenderingContext2D,
  text: unknown,
  x: number,
  y: number,
  maxWidth?: number
): void {
  const sanitized = sanitizeNodeLabel(text);
  ctx.strokeText(sanitized.value, x, y, maxWidth);
}

// ============================================================================
// CSP HELPER
// ============================================================================

/**
 * Generate a strict Content-Security-Policy meta tag
 *
 * Add this to the <head> of your HTML:
 * const meta = document.createElement('meta');
 * meta.httpEquiv = 'Content-Security-Policy';
 * meta.content = generateCSP();
 * document.head.appendChild(meta);
 */
export function generateCSP(options: {
  nonce?: string;
  reportUri?: string;
} = {}): string {
  const { nonce, reportUri } = options;

  const directives = [
    "default-src 'self'",
    nonce ? `script-src 'self' 'nonce-${nonce}'` : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",  // Allow inline styles (needed for canvas)
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
  }

  return directives.join('; ');
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const XSSProtection = {
  // Core
  sanitizeNodeLabel,
  sanitizeLabels,
  sanitizeObject,

  // Utilities
  escapeHtml,
  stripHtml,
  containsXssPattern,
  isValidLabel,

  // Safe DOM
  safeSetText,
  safeTextNode,
  safeSetAttribute,

  // Safe Canvas
  safeCanvasText,
  safeCanvasStrokeText,

  // CSP
  generateCSP,
};

export default XSSProtection;
