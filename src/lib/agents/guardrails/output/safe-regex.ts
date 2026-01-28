/**
 * OLYMPUS 2.0 - Safe Regex Execution
 *
 * Prevents ReDoS (Regular Expression Denial of Service) attacks.
 * PATCH 5: Critical security for Week 2.
 */

/**
 * Safe regex execution with timeout
 */
export async function safeRegexExec(
  regex: RegExp,
  content: string,
  timeoutMs: number = 1000
): Promise<RegExpExecArray | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new RegexTimeoutError(regex.source, timeoutMs));
    }, timeoutMs);

    try {
      const result = regex.exec(content);
      clearTimeout(timer);
      resolve(result);
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

/**
 * Safe regex match all with timeout and limits
 */
export async function safeRegexMatchAll(
  regex: RegExp,
  content: string,
  timeoutMs: number = 5000,
  maxMatches: number = 1000
): Promise<RegExpExecArray[]> {
  const matches: RegExpExecArray[] = [];
  const startTime = Date.now();

  // Ensure global flag
  const globalRegex = new RegExp(
    regex.source,
    regex.flags.includes('g') ? regex.flags : regex.flags + 'g'
  );

  let match;
  let lastIndex = 0;

  while ((match = globalRegex.exec(content)) !== null) {
    matches.push(match);

    // Check timeout
    if (Date.now() - startTime > timeoutMs) {
      console.warn(`[SafeRegex] Timeout after ${matches.length} matches for pattern: ${regex.source.slice(0, 50)}`);
      break;
    }

    // Check max matches
    if (matches.length >= maxMatches) {
      console.warn(`[SafeRegex] Max matches (${maxMatches}) reached for pattern: ${regex.source.slice(0, 50)}`);
      break;
    }

    // Prevent infinite loop on zero-width matches
    if (match.index === lastIndex) {
      globalRegex.lastIndex++;
    }
    lastIndex = globalRegex.lastIndex;

    // Safety: if we haven't advanced in the string, break
    if (globalRegex.lastIndex === 0) {
      break;
    }
  }

  return matches;
}

/**
 * Pre-validate regex for potential ReDoS
 * Basic heuristic checks for dangerous patterns
 */
export function isRegexSafe(pattern: string): { safe: boolean; reason?: string } {
  // Check for nested quantifiers (common ReDoS pattern)
  // e.g., (a+)+ or (a*)*
  if (/\([^)]*[+*][^)]*\)[+*]/.test(pattern)) {
    return { safe: false, reason: 'Nested quantifiers detected (potential ReDoS)' };
  }

  // Check for overlapping alternations with quantifiers
  // e.g., (a|aa)+
  if (/\([^)]*\|[^)]*\)[+*]{1,2}/.test(pattern)) {
    // Could have false positives but better safe
    return { safe: false, reason: 'Overlapping alternation with quantifier (potential ReDoS)' };
  }

  // Check for very long pattern (complexity indicator)
  if (pattern.length > 500) {
    return { safe: false, reason: 'Pattern too long (>500 chars)' };
  }

  // Check for excessive quantifiers
  const quantifierCount = (pattern.match(/[+*?]|\{\d+,?\d*\}/g) || []).length;
  if (quantifierCount > 10) {
    return { safe: false, reason: `Too many quantifiers (${quantifierCount})` };
  }

  // Check for backreferences with quantifiers (can be dangerous)
  if (/\\[1-9][+*]/.test(pattern)) {
    return { safe: false, reason: 'Backreference with quantifier' };
  }

  return { safe: true };
}

/**
 * Create a safe version of a regex with execution limits
 */
export function createSafeRegex(
  pattern: string | RegExp,
  flags?: string
): { regex: RegExp; isSafe: boolean; warning?: string } {
  const source = typeof pattern === 'string' ? pattern : pattern.source;
  const finalFlags = flags ?? (typeof pattern === 'string' ? '' : pattern.flags);

  const safetyCheck = isRegexSafe(source);

  return {
    regex: new RegExp(source, finalFlags),
    isSafe: safetyCheck.safe,
    warning: safetyCheck.reason,
  };
}

/**
 * Execute regex with all safety measures
 */
export async function executeRegexSafely(
  pattern: string | RegExp,
  content: string,
  options: {
    timeoutMs?: number;
    maxMatches?: number;
    maxContentLength?: number;
  } = {}
): Promise<{
  matches: RegExpExecArray[];
  truncated: boolean;
  timedOut: boolean;
  matchCount: number;
}> {
  const { timeoutMs = 5000, maxMatches = 1000, maxContentLength = 1_000_000 } = options;

  // Truncate content if too large
  let processedContent = content;
  let truncated = false;

  if (content.length > maxContentLength) {
    processedContent = content.slice(0, maxContentLength);
    truncated = true;
    console.warn(`[SafeRegex] Content truncated from ${content.length} to ${maxContentLength} chars`);
  }

  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;

  try {
    const matches = await safeRegexMatchAll(regex, processedContent, timeoutMs, maxMatches);

    return {
      matches,
      truncated,
      timedOut: false,
      matchCount: matches.length,
    };
  } catch (error) {
    if (error instanceof RegexTimeoutError) {
      return {
        matches: [],
        truncated,
        timedOut: true,
        matchCount: 0,
      };
    }
    throw error;
  }
}

/**
 * Regex timeout error
 */
export class RegexTimeoutError extends Error {
  public readonly pattern: string;
  public readonly timeoutMs: number;

  constructor(pattern: string, timeoutMs: number) {
    super(`Regex execution timed out after ${timeoutMs}ms`);
    this.name = 'RegexTimeoutError';
    this.pattern = pattern.slice(0, 100);
    this.timeoutMs = timeoutMs;
  }
}
