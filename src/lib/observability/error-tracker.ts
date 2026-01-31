/**
 * OLYMPUS 2.0 - Error Tracker
 *
 * Centralized error tracking for observability.
 * Logs errors with structured context for debugging.
 */

export interface ErrorContext {
  type: string;
  metadata?: Record<string, unknown>;
  agentId?: string;
}

interface TrackedError {
  error: Error;
  context: ErrorContext;
  timestamp: Date;
}

const recentErrors: TrackedError[] = [];
const MAX_TRACKED_ERRORS = 100;

/**
 * Track an error with context
 */
export function trackError(error: Error, context: ErrorContext): void {
  const tracked: TrackedError = {
    error,
    context,
    timestamp: new Date(),
  };

  recentErrors.push(tracked);

  // Prevent unbounded growth
  if (recentErrors.length > MAX_TRACKED_ERRORS) {
    recentErrors.shift();
  }

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ErrorTracker] [${context.type}]`, error.message, context.metadata ?? {});
  }
}

/**
 * Get recent tracked errors
 */
export function getRecentErrors(limit: number = 10): TrackedError[] {
  return recentErrors.slice(-limit);
}

/**
 * Get error count by type
 */
export function getErrorCountByType(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tracked of recentErrors) {
    counts[tracked.context.type] = (counts[tracked.context.type] || 0) + 1;
  }
  return counts;
}

/**
 * Clear tracked errors (for testing)
 */
export function clearTrackedErrors(): void {
  recentErrors.length = 0;
}
