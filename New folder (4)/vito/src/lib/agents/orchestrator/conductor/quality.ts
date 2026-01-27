/**
 * QUALITY ASSESSMENT
 *
 * Analyzes generated code and produces a quality score.
 *
 * LESSON: Single Responsibility Principle
 * This module does ONE thing: assess code quality.
 * It doesn't know about APIs, caching, or UI.
 * This makes it easy to test and reason about.
 */

import type { Quality, QualityChecks } from "./types";
import { QUALITY_THRESHOLDS } from "./config";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Assess the quality of generated code.
 *
 * @param code - The generated code to assess
 * @param task - The original task (to check relevance)
 * @returns Quality assessment with score and breakdown
 *
 * WHY score code?
 * 1. Trust: Users know what they're getting
 * 2. Auto-retry: Low score triggers retry
 * 3. Feedback: Specific areas to improve
 */
export function assessQuality(code: string, task: string): Quality {
  // Empty or trivial code
  if (!code || code.length < 10) {
    return {
      score: 0,
      checks: defaultChecks(),
      assessment: "No code generated",
    };
  }

  // Run all quality checks
  const checks = runChecks(code, task);

  // Calculate score from checks
  const score = calculateScore(code, checks);

  // Generate human-readable assessment
  const assessment = getAssessment(score);

  return { score, checks, assessment };
}

// ============================================================================
// QUALITY CHECKS
// ============================================================================

/**
 * Run all quality checks on the code.
 *
 * WHY these specific checks?
 * - hasTypes: TypeScript's main value
 * - hasExports: Reusable code is better
 * - isComplete: Partial code wastes time
 * - hasErrorHandling: Production code handles failures
 * - matchesRequest: Did we solve the problem?
 */
function runChecks(code: string, task: string): QualityChecks {
  return {
    hasTypes: checkHasTypes(code),
    hasExports: checkHasExports(code),
    isComplete: checkIsComplete(code),
    hasErrorHandling: checkHasErrorHandling(code, task),
    matchesRequest: checkMatchesRequest(code, task),
  };
}

/**
 * Check if code has TypeScript types.
 *
 * Looks for type annotations like:
 * - : string, : number, : boolean
 * - Promise<T>, Array<T>
 * - React.FC, HTMLElement
 */
function checkHasTypes(code: string): boolean {
  const typePatterns = [
    /:\s*(string|number|boolean|void|null|undefined)\b/,
    /:\s*Promise</,
    /:\s*Array</,
    /:\s*Record</,
    /:\s*React\./,
    /:\s*HTML\w+Element/,
    /:\s*\w+\[\]/,
    /<\w+>/,
  ];

  return typePatterns.some((pattern) => pattern.test(code));
}

/**
 * Check if code has exports.
 *
 * Code that can be imported is more useful.
 * Looks for: export function, export const, export default
 */
function checkHasExports(code: string): boolean {
  return /export\s+(default\s+)?(function|const|class|interface|type)\b/.test(code);
}

/**
 * Check if code is complete (not truncated).
 *
 * Incomplete code has:
 * - Unbalanced braces
 * - TODO comments
 * - Ellipsis (...)
 */
function checkIsComplete(code: string): boolean {
  // Check balanced braces
  const opens = (code.match(/\{/g) || []).length;
  const closes = (code.match(/\}/g) || []).length;

  if (opens !== closes || opens === 0) {
    return false;
  }

  // Check for incomplete markers
  const incompleteMarkers = [
    "// TODO",
    "// ...",
    "/* TODO",
    "// FIXME",
    "// XXX",
  ];

  for (const marker of incompleteMarkers) {
    if (code.includes(marker)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if code has appropriate error handling.
 *
 * Error handling is needed when:
 * - Task mentions API, fetch, async operations
 * - Task mentions submit, save, delete, update
 *
 * If needed, code should have try/catch or .catch()
 */
function checkHasErrorHandling(code: string, task: string): boolean {
  // Does this task need error handling?
  const needsErrorHandling = /\b(fetch|api|async|submit|save|delete|update|post|get|request)\b/i.test(task);

  if (!needsErrorHandling) {
    return true; // No error handling needed, passes by default
  }

  // Check for error handling patterns
  const hasErrorHandling = [
    /try\s*\{/,
    /catch\s*\(/,
    /\.catch\(/,
    /throw\s+new/,
    /onError/,
    /handleError/,
  ].some((pattern) => pattern.test(code));

  return hasErrorHandling;
}

/**
 * Check if code matches the original request.
 *
 * Extracts keywords from task and checks if they
 * appear in the code. At least 30% should match.
 */
function checkMatchesRequest(code: string, task: string): boolean {
  // Extract meaningful words from task (4+ chars)
  const taskWords = task
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length >= 4);

  if (taskWords.length === 0) {
    return true; // No keywords to check
  }

  // Count matches in code
  const codeLower = code.toLowerCase();
  let matches = 0;

  for (const word of taskWords) {
    if (codeLower.includes(word)) {
      matches++;
    }
  }

  // At least 30% of keywords should appear
  return matches / taskWords.length >= 0.3;
}

// ============================================================================
// SCORE CALCULATION
// ============================================================================

/**
 * Calculate quality score from checks.
 *
 * Base score from checks (max 100):
 * - hasTypes: 25 points
 * - hasExports: 20 points
 * - isComplete: 25 points
 * - hasErrorHandling: 15 points
 * - matchesRequest: 15 points
 *
 * Bonus points for good patterns (up to 15):
 * - Props interface: +5
 * - Aria attributes: +5
 * - Tailwind classes: +5
 *
 * Capped at 100.
 */
function calculateScore(code: string, checks: QualityChecks): number {
  let score = 0;

  // Base score from checks
  if (checks.hasTypes) score += 25;
  if (checks.hasExports) score += 20;
  if (checks.isComplete) score += 25;
  if (checks.hasErrorHandling) score += 15;
  if (checks.matchesRequest) score += 15;

  // Bonus for code length (more code = more complete)
  const lines = code.split("\n").length;
  if (lines > 10) {
    score += Math.min(10, Math.floor(lines / 10));
  }

  // Bonus for good React patterns
  if (/interface\s+\w+Props/.test(code)) score += 5;

  // Bonus for accessibility
  if (/aria-\w+/.test(code)) score += 5;

  // Bonus for Tailwind usage
  if (/className=/.test(code)) score += 5;

  // Cap at 100
  return Math.min(100, score);
}

// ============================================================================
// ASSESSMENT MESSAGES
// ============================================================================

/**
 * Get human-readable assessment from score.
 */
function getAssessment(score: number): string {
  if (score >= QUALITY_THRESHOLDS.excellent) {
    return "This is production-ready code.";
  }
  if (score >= QUALITY_THRESHOLDS.good) {
    return "Solid code, ready to use.";
  }
  if (score >= QUALITY_THRESHOLDS.acceptable) {
    return "Good foundation to build on.";
  }
  return "Might need some tweaks.";
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Default checks (all false).
 */
export function defaultChecks(): QualityChecks {
  return {
    hasTypes: false,
    hasExports: false,
    isComplete: false,
    hasErrorHandling: false,
    matchesRequest: false,
  };
}

/**
 * Check if quality meets minimum threshold.
 */
export function meetsThreshold(quality: Quality, minScore: number): boolean {
  return quality.score >= minScore;
}
