/**
 * OLYMPUS 2.0 - Cognitive Session Validation
 *
 * Input validation, rate limiting, and safety guards
 * for the cognitive session system.
 */

import type { CognitiveSession, BuildRecord, CommunicationStyle } from './types';
import { SESSION_LIMITS } from './limits';

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ValidationResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export type ValidatedBuildInput = Omit<BuildRecord, 'id'>;

export interface FeedbackInput {
  buildId: string;
  rating: number;
  feedback?: string;
}

export interface PreferenceInput {
  category: string;
  key: string;
  value: unknown;
}

export interface CommunicationStyleInput {
  verbosity?: CommunicationStyle['verbosity'];
  technicalDepth?: CommunicationStyle['technicalDepth'];
  preferredExamples?: CommunicationStyle['preferredExamples'];
  responseFormat?: CommunicationStyle['responseFormat'];
}

// ═══════════════════════════════════════════════════════════════════════════
// SIZE LIMITS
// ═══════════════════════════════════════════════════════════════════════════

export const SIZE_LIMITS = {
  /** Max length for build prompt */
  maxPromptLength: 10_000,
  /** Max length for user feedback */
  maxFeedbackLength: 5_000,
  /** Max length for preference key */
  maxPreferenceKeyLength: 100,
  /** Max number of stack entries */
  maxStackEntries: 50,
  /** Max number of phases per build */
  maxPhasesPerBuild: 20,
  /** Max string value length for preferences */
  maxPreferenceValueLength: 1_000,
  /** Max userId length */
  maxUserIdLength: 128,
};

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

export const RATE_LIMITS = {
  BUILDS_PER_MINUTE: { max: 10, windowMs: 60_000 },
  FEEDBACK_PER_MINUTE: { max: 30, windowMs: 60_000 },
  PREFERENCES_PER_MINUTE: { max: 60, windowMs: 60_000 },
} as const;

type RateLimitKey = keyof typeof RATE_LIMITS;

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check rate limit for a user + action combination
 */
export function checkRateLimitForUser(
  userId: string,
  limitType: RateLimitKey
): { allowed: boolean; retryAfterMs?: number } {
  const config = RATE_LIMITS[limitType];
  const key = `${userId}:${limitType}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter(t => t > now - config.windowMs);

  if (entry.timestamps.length >= config.max) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  entry.timestamps.push(now);
  return { allowed: true };
}

/**
 * Cleanup expired rate limit entries
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  const maxWindow = Math.max(...Object.values(RATE_LIMITS).map(r => r.windowMs));

  for (const [key, entry] of rateLimitStore) {
    entry.timestamps = entry.timestamps.filter(t => t > now - maxWindow);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate build input data
 */
export function validateBuildInput(
  input: Omit<BuildRecord, 'id'>
): ValidationResult<ValidatedBuildInput> {
  if (!input) {
    return { success: false, error: 'Build input is required' };
  }

  if (typeof input.buildType !== 'string' || input.buildType.length === 0) {
    return { success: false, error: 'buildType is required and must be a non-empty string' };
  }

  if (typeof input.prompt !== 'string') {
    return { success: false, error: 'prompt must be a string' };
  }

  if (input.prompt.length > SIZE_LIMITS.maxPromptLength) {
    return {
      success: false,
      error: `prompt exceeds maximum length of ${SIZE_LIMITS.maxPromptLength}`,
    };
  }

  if (typeof input.totalDuration !== 'number' || input.totalDuration < 0) {
    return { success: false, error: 'totalDuration must be a non-negative number' };
  }

  if (typeof input.totalTokens !== 'number' || input.totalTokens < 0) {
    return { success: false, error: 'totalTokens must be a non-negative number' };
  }

  if (typeof input.totalCost !== 'number' || input.totalCost < 0) {
    return { success: false, error: 'totalCost must be a non-negative number' };
  }

  if (typeof input.success !== 'boolean') {
    return { success: false, error: 'success must be a boolean' };
  }

  if (!input.stack || typeof input.stack !== 'object') {
    return { success: false, error: 'stack must be an object' };
  }

  if (Object.keys(input.stack).length > SIZE_LIMITS.maxStackEntries) {
    return {
      success: false,
      error: `stack exceeds maximum of ${SIZE_LIMITS.maxStackEntries} entries`,
    };
  }

  if (!Array.isArray(input.phases)) {
    return { success: false, error: 'phases must be an array' };
  }

  if (input.phases.length > SIZE_LIMITS.maxPhasesPerBuild) {
    return {
      success: false,
      error: `phases exceeds maximum of ${SIZE_LIMITS.maxPhasesPerBuild}`,
    };
  }

  return { success: true, data: input as ValidatedBuildInput };
}

/**
 * Validate feedback input
 */
export function validateFeedbackInput(input: FeedbackInput): ValidationResult {
  if (!input) {
    return { success: false, error: 'Feedback input is required' };
  }

  if (typeof input.buildId !== 'string' || input.buildId.length === 0) {
    return { success: false, error: 'buildId is required' };
  }

  if (typeof input.rating !== 'number' || input.rating < 1 || input.rating > 5) {
    return { success: false, error: 'rating must be a number between 1 and 5' };
  }

  if (!Number.isInteger(input.rating)) {
    return { success: false, error: 'rating must be an integer' };
  }

  if (
    input.feedback !== undefined &&
    (typeof input.feedback !== 'string' || input.feedback.length > SIZE_LIMITS.maxFeedbackLength)
  ) {
    return {
      success: false,
      error: `feedback must be a string with max length ${SIZE_LIMITS.maxFeedbackLength}`,
    };
  }

  return { success: true };
}

/**
 * Validate preference input
 */
export function validatePreferenceInput(input: PreferenceInput): ValidationResult {
  if (!input) {
    return { success: false, error: 'Preference input is required' };
  }

  if (typeof input.category !== 'string' || input.category.length === 0) {
    return { success: false, error: 'category is required' };
  }

  if (typeof input.key !== 'string' || input.key.length === 0) {
    return { success: false, error: 'key is required' };
  }

  if (input.key.length > SIZE_LIMITS.maxPreferenceKeyLength) {
    return {
      success: false,
      error: `key exceeds maximum length of ${SIZE_LIMITS.maxPreferenceKeyLength}`,
    };
  }

  if (input.value === undefined || input.value === null) {
    return { success: false, error: 'value is required' };
  }

  // Check string value length
  if (typeof input.value === 'string' && input.value.length > SIZE_LIMITS.maxPreferenceValueLength) {
    return {
      success: false,
      error: `string value exceeds maximum length of ${SIZE_LIMITS.maxPreferenceValueLength}`,
    };
  }

  return { success: true };
}

/**
 * Validate communication style input
 */
export function validateCommunicationStyleInput(
  input: Partial<CommunicationStyleInput>
): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Communication style input must be an object' };
  }

  const validVerbosity = ['minimal', 'balanced', 'detailed'];
  const validDepth = ['basic', 'standard', 'advanced'];
  const validExamples = ['none', 'brief', 'detailed'];
  const validFormat = ['prose', 'structured', 'code-first'];

  if (input.verbosity !== undefined && !validVerbosity.includes(input.verbosity)) {
    return { success: false, error: `verbosity must be one of: ${validVerbosity.join(', ')}` };
  }

  if (input.technicalDepth !== undefined && !validDepth.includes(input.technicalDepth)) {
    return { success: false, error: `technicalDepth must be one of: ${validDepth.join(', ')}` };
  }

  if (input.preferredExamples !== undefined && !validExamples.includes(input.preferredExamples)) {
    return {
      success: false,
      error: `preferredExamples must be one of: ${validExamples.join(', ')}`,
    };
  }

  if (input.responseFormat !== undefined && !validFormat.includes(input.responseFormat)) {
    return { success: false, error: `responseFormat must be one of: ${validFormat.join(', ')}` };
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION SAFETY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sanitize user ID (prevent injection, limit length)
 */
export function sanitizeUserId(userId: string): string | null {
  if (typeof userId !== 'string') return null;

  // Trim and check length
  const trimmed = userId.trim();
  if (trimmed.length === 0 || trimmed.length > SIZE_LIMITS.maxUserIdLength) return null;

  // Only allow alphanumeric, hyphens, underscores, dots, @
  if (!/^[a-zA-Z0-9_\-\.@]+$/.test(trimmed)) return null;

  return trimmed;
}

/**
 * Prune session to stay within limits (called after mutations)
 */
export function pruneSessionToLimits(session: CognitiveSession): void {
  // Enforce all limits from the limits module
  if (session.builds.length > SESSION_LIMITS.maxBuilds) {
    session.builds = session.builds.slice(-SESSION_LIMITS.maxBuilds);
  }

  if (session.learnings.length > SESSION_LIMITS.maxLearnings) {
    session.learnings = session.learnings
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, SESSION_LIMITS.maxLearnings);
  }

  if (session.predictions.length > SESSION_LIMITS.maxPredictions) {
    session.predictions = session.predictions.slice(0, SESSION_LIMITS.maxPredictions);
  }

  if (session.evolution.length > SESSION_LIMITS.maxEvolution) {
    session.evolution = session.evolution.slice(-SESSION_LIMITS.maxEvolution);
  }
}

/**
 * Estimate session size in bytes
 */
export function estimateSessionSize(session: CognitiveSession): number {
  try {
    return Buffer.byteLength(JSON.stringify(session), 'utf8');
  } catch {
    return 0;
  }
}

/**
 * Check if session is near limits
 */
export function isSessionNearLimits(
  session: CognitiveSession,
  threshold: number = 0.9
): boolean {
  return (
    session.builds.length > SESSION_LIMITS.maxBuilds * threshold ||
    session.learnings.length > SESSION_LIMITS.maxLearnings * threshold ||
    session.predictions.length > SESSION_LIMITS.maxPredictions * threshold ||
    session.evolution.length > SESSION_LIMITS.maxEvolution * threshold
  );
}
