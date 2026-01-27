/**
 * 50X RELIABILITY: Safe JSON Parsing
 *
 * Never crashes on invalid JSON - always logs and returns fallback.
 * Use this instead of raw JSON.parse() to prevent silent failures.
 */

/**
 * Safely parse JSON with logging and fallback
 */
export function safeJsonParse<T>(
  content: string | null | undefined,
  fallback: T,
  context: string
): T {
  // Handle empty/null content
  if (!content || content.trim() === '') {
    console.warn(`[JSON] Empty content in ${context}, using fallback`);
    return fallback;
  }

  try {
    return JSON.parse(content) as T;
  } catch (error) {
    const preview = content.length > 200 ? `${content.slice(0, 200)}...` : content;
    console.error(`[JSON] Parse failed in ${context}:`, error);
    console.error(`[JSON] Content preview: ${preview}`);
    return fallback;
  }
}

/**
 * Safely stringify with fallback
 */
export function safeJsonStringify(
  data: unknown,
  fallback: string = '{}',
  context: string = 'unknown'
): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error(`[JSON] Stringify failed in ${context}:`, error);
    return fallback;
  }
}

/**
 * Safely stringify with pretty printing
 */
export function safeJsonStringifyPretty(
  data: unknown,
  fallback: string = '{}',
  context: string = 'unknown'
): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error(`[JSON] Stringify (pretty) failed in ${context}:`, error);
    return fallback;
  }
}

/**
 * Parse JSON and validate shape with a type guard
 */
export function safeJsonParseValidated<T>(
  content: string | null | undefined,
  validator: (data: unknown) => data is T,
  fallback: T,
  context: string
): T {
  const parsed = safeJsonParse<unknown>(content, null, context);

  if (parsed === null) {
    return fallback;
  }

  if (validator(parsed)) {
    return parsed;
  }

  console.warn(`[JSON] Validation failed in ${context}, using fallback`);
  return fallback;
}

/**
 * Parse JSON from a file path (server-side only)
 */
export async function safeJsonParseFile<T>(
  filePath: string,
  fallback: T,
  context: string
): Promise<T> {
  try {
    const fs = await import('fs');

    if (!fs.existsSync(filePath)) {
      console.warn(`[JSON] File not found: ${filePath} (${context})`);
      return fallback;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return safeJsonParse(content, fallback, context);
  } catch (error) {
    console.error(`[JSON] File read failed for ${filePath} (${context}):`, error);
    return fallback;
  }
}
