/**
 * OLYMPUS 2.0 - Safe JSON Parsing Utilities
 *
 * FIX 3.2 (Jan 31, 2026): Prototype Pollution Protection
 *
 * These utilities prevent prototype pollution attacks by stripping
 * dangerous keys (__proto__, constructor, prototype) during JSON parsing.
 *
 * USAGE:
 *   import { safeJsonParse } from '@/lib/core/safe-json';
 *   const data = safeJsonParse<MyType>(jsonString);
 */

// ============================================================================
// DANGEROUS KEYS (Block these during parsing)
// ============================================================================

/**
 * Keys that can be used for prototype pollution attacks.
 * These are stripped during parsing to prevent object prototype modification.
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// ============================================================================
// SAFE JSON PARSE
// ============================================================================

/**
 * Parse JSON safely, blocking prototype pollution attacks.
 *
 * @param json - The JSON string to parse
 * @param fallback - Optional fallback value if parsing fails
 * @returns The parsed value, or fallback if provided and parsing fails
 * @throws SyntaxError if parsing fails and no fallback is provided
 *
 * @example
 * // Basic usage
 * const data = safeJsonParse<User>('{"name": "Alice"}');
 *
 * @example
 * // With fallback
 * const data = safeJsonParse<Config>(maybeInvalidJson, { defaults: true });
 *
 * @example
 * // Blocks prototype pollution
 * const malicious = '{"__proto__": {"isAdmin": true}}';
 * const result = safeJsonParse(malicious);
 * // result = {} (dangerous key stripped)
 */
export function safeJsonParse<T>(json: string, fallback?: T): T {
  try {
    return JSON.parse(json, (key, value) => {
      // Strip dangerous keys that could pollute prototypes
      if (DANGEROUS_KEYS.has(key)) {
        return undefined;
      }
      return value;
    }) as T;
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

/**
 * Parse JSON safely with explicit error handling.
 * Returns a discriminated union for type-safe error handling.
 *
 * @param json - The JSON string to parse
 * @returns Object with success boolean and either data or error
 *
 * @example
 * const result = safeJsonParseResult<Config>(jsonString);
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 */
export function safeJsonParseResult<T>(
  json: string
): { success: true; data: T } | { success: false; error: Error } {
  try {
    const data = safeJsonParse<T>(json);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Check if a JSON string is valid without parsing it fully.
 * Useful for validation before expensive operations.
 *
 * @param json - The JSON string to validate
 * @returns true if valid JSON, false otherwise
 */
export function isValidJson(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}

/**
 * Stringify an object safely, handling circular references.
 *
 * @param value - The value to stringify
 * @param space - Optional indentation
 * @returns JSON string, or '[Circular]' placeholder for circular refs
 */
export function safeJsonStringify(value: unknown, space?: number): string {
  const seen = new WeakSet();

  return JSON.stringify(
    value,
    (key, val) => {
      // Handle circular references
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    },
    space
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

// Functions are already exported inline above.
// DANGEROUS_KEYS is exported here for external use.
export { DANGEROUS_KEYS };
