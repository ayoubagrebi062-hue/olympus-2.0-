/**
 * UTILITIES
 *
 * Pure functions with no side effects.
 *
 * LESSON: Pure Functions Are Easy to Test
 * - Same input = same output
 * - No external state
 * - No side effects
 * - Can be tested in isolation
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { MAX_INPUT_LENGTH } from './config';

// ============================================================================
// HASHING
// ============================================================================

/**
 * Hash a string to a short, deterministic key.
 *
 * Uses a MurmurHash3-inspired algorithm:
 * - Fast (O(n) where n = string length)
 * - Low collision rate
 * - Deterministic (same input = same output)
 * - Short output (base36 = ~12 chars)
 *
 * WHY not crypto hash?
 * - We don't need cryptographic security
 * - Speed matters for cache lookups
 * - Shorter output saves memory
 *
 * @param str - String to hash
 * @returns Short hash string
 */
export function hash(str: string): string {
  // Initialize with prime numbers
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  // Process each character
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    // Mix the bits using multiplication and XOR
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  // Final mixing
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  // Convert to base36 for shorter output
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize user input to prevent injection attacks.
 *
 * Removes:
 * - Script tags (XSS prevention)
 * - javascript: URLs
 * - Event handlers (onclick, etc.)
 *
 * Also truncates to MAX_INPUT_LENGTH.
 *
 * LESSON: Never Trust User Input
 * Even if we're just passing it to an LLM,
 * sanitize to prevent prompt injection.
 *
 * @param input - Raw user input
 * @returns Sanitized input
 */
export function sanitize(input: string): string {
  return (
    input
      // Remove script tags and their contents
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove javascript: URLs
      .replace(/javascript:/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=/gi, '')
      // Truncate to max length
      .slice(0, MAX_INPUT_LENGTH)
  );
}

// ============================================================================
// CODE EXTRACTION
// ============================================================================

/**
 * Extract clean code from LLM response.
 *
 * LLMs often wrap code in markdown code blocks.
 * This extracts just the code.
 *
 * Priority:
 * 1. Language-specific code block (```tsx, ```typescript)
 * 2. Generic code block (```)
 * 3. Raw content (cleaned up)
 *
 * @param raw - Raw LLM response
 * @returns Clean code
 */
export function extractCode(raw: string): string {
  // Try language-specific code block first
  const languageMatch = raw.match(/```(?:tsx?|jsx?|typescript|javascript)?\n([\s\S]*?)```/);
  if (languageMatch) {
    return languageMatch[1].trim();
  }

  // Try generic code block
  const genericMatch = raw.match(/```\n?([\s\S]*?)```/);
  if (genericMatch) {
    return genericMatch[1].trim();
  }

  // No code block, clean up raw content
  return raw
    .replace(/^Here's?\s+(the\s+)?code:?\s*/i, '')
    .replace(/^```\w*\n?/gm, '')
    .replace(/```$/gm, '')
    .trim();
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

/**
 * Detect the programming language of code.
 *
 * Uses heuristics based on common patterns.
 *
 * @param code - Code to analyze
 * @returns Detected language
 */
export function detectLanguage(code: string): string {
  // TSX: React with TypeScript
  if (/^["']use client["']|^import\s+.*from\s+["']react["']|<[A-Z]\w+/.test(code)) {
    return 'tsx';
  }

  // TypeScript: imports/exports with type annotations
  if (/^import\s|^export\s|:\s*(string|number|boolean|void)/.test(code)) {
    return 'typescript';
  }

  // JavaScript: variable declarations without types
  if (/^const\s|^let\s|^function\s|^class\s/.test(code)) {
    return 'javascript';
  }

  // HTML: tags or doctype
  if (/^<\w+|^<!DOCTYPE/i.test(code)) {
    return 'html';
  }

  // CSS: selectors or at-rules
  if (/^\.\w+\s*\{|^#\w+\s*\{|^@media|^@tailwind/.test(code)) {
    return 'css';
  }

  // Default to TypeScript
  return 'typescript';
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format code for copying with metadata.
 *
 * Provides:
 * - full: Complete code
 * - preview: First 5 lines (for UI preview)
 * - lineCount: Total lines
 * - language: Detected language
 *
 * @param code - Code to format
 * @returns Formatted code with metadata
 */
export function formatForCopy(code: string): {
  full: string;
  preview: string;
  lineCount: number;
  language: string;
} {
  const lines = code.split('\n');

  return {
    full: code,
    preview: lines.slice(0, 5).join('\n') + (lines.length > 5 ? '\n...' : ''),
    lineCount: lines.length,
    language: detectLanguage(code),
  };
}

// ============================================================================
// TIMING
// ============================================================================

/**
 * Sleep for a given duration.
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay.
 *
 * delay = baseDelay * 2^attempt
 *
 * Capped at maxDelay.
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in ms
 * @param maxDelay - Maximum delay in ms
 * @returns Delay in ms
 */
export function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a task is valid for processing.
 *
 * @param task - Task to validate
 * @returns Validation result with error message if invalid
 */
export function validateTask(task: string | undefined): {
  valid: boolean;
  error?: string;
  userMessage?: string;
} {
  if (!task?.trim()) {
    return {
      valid: false,
      error: 'Task is empty',
      userMessage: "I'm ready! What would you like?",
    };
  }

  if (task.length < 3) {
    return {
      valid: false,
      error: 'Task is too short',
      userMessage: 'Tell me a bit more?',
    };
  }

  return { valid: true };
}

// ============================================================================
// CONTINUATION DETECTION
// ============================================================================

/**
 * Detect if a task is a continuation of a previous request.
 *
 * Looks for words like "that", "it", "this", etc.
 *
 * @param task - Current task
 * @param hasPreviousCode - Whether there's previous code to reference
 * @returns Whether this is a continuation
 */
export function isContinuation(task: string, hasPreviousCode: boolean): boolean {
  if (!hasPreviousCode) {
    return false;
  }

  const continuationPatterns = /\b(that|it|this|the same|previous|last one|above)\b/i;
  return continuationPatterns.test(task);
}

/**
 * Build a continuation prompt with previous code.
 *
 * @param task - Current task
 * @param previousCode - Previous code to modify
 * @returns Full prompt with context
 */
export function buildContinuationPrompt(task: string, previousCode: string): string {
  return `Modify this existing code:\n\`\`\`\n${previousCode}\n\`\`\`\n\nRequested change: ${task}`;
}
