/**
 * OLYMPUS 3.0 - Error Tracking
 * Centralized error capture, reporting, and analysis
 */

// ============================================================================
// TYPES
// ============================================================================

interface ErrorContext {
  userId?: string;
  tenantId?: string;
  buildId?: string;
  route?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  name: string;
  context: ErrorContext;
  timestamp: Date;
  fingerprint: string;
  severity: 'error' | 'warning' | 'info';
  handled: boolean;
}

interface ErrorStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentErrors: TrackedError[];
}

// ============================================================================
// ERROR STORAGE
// ============================================================================

const errorBuffer: TrackedError[] = [];
const MAX_BUFFER_SIZE = 100;
const errorCounts: Record<string, number> = {};

// ============================================================================
// ERROR TRACKING FUNCTIONS
// ============================================================================

/**
 * Generate a fingerprint for error deduplication
 */
function generateFingerprint(error: Error, context: ErrorContext): string {
  const parts = [
    error.name,
    error.message.slice(0, 100),
    context.route || 'unknown',
    context.action || 'unknown',
  ];
  return parts.join('|');
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Capture and track an error
 */
export function captureError(
  error: Error,
  context: ErrorContext = {},
  severity: 'error' | 'warning' | 'info' = 'error'
): string {
  const fingerprint = generateFingerprint(error, context);
  const errorId = generateErrorId();

  // Increment count for this error type
  errorCounts[fingerprint] = (errorCounts[fingerprint] || 0) + 1;

  const trackedError: TrackedError = {
    id: errorId,
    message: error.message,
    stack: error.stack,
    name: error.name,
    context,
    timestamp: new Date(),
    fingerprint,
    severity,
    handled: true,
  };

  // Add to buffer
  errorBuffer.unshift(trackedError);
  if (errorBuffer.length > MAX_BUFFER_SIZE) {
    errorBuffer.pop();
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[error-tracker] ${severity.toUpperCase()}:`, {
      id: errorId,
      message: error.message,
      context,
    });
  }

  // Send to external service if configured
  sendToExternalService(trackedError);

  return errorId;
}

/**
 * Capture an exception with full context
 */
export function captureException(error: unknown, context: ErrorContext = {}): string {
  if (error instanceof Error) {
    return captureError(error, context, 'error');
  }

  // Convert non-Error to Error
  const wrappedError = new Error(typeof error === 'string' ? error : JSON.stringify(error));
  return captureError(wrappedError, context, 'error');
}

/**
 * Capture a warning
 */
export function captureWarning(message: string, context: ErrorContext = {}): string {
  const error = new Error(message);
  error.name = 'Warning';
  return captureError(error, context, 'warning');
}

/**
 * Capture a message (info level)
 */
export function captureMessage(message: string, context: ErrorContext = {}): string {
  const error = new Error(message);
  error.name = 'Info';
  return captureError(error, context, 'info');
}

// ============================================================================
// ERROR BOUNDARY HELPER
// ============================================================================

/**
 * Wrap an async function with error tracking
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: ErrorContext = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, context);
      throw error;
    }
  }) as T;
}

/**
 * Create a scoped error tracker
 */
export function createErrorScope(baseContext: ErrorContext) {
  return {
    captureError: (error: Error, additionalContext: ErrorContext = {}) =>
      captureError(error, { ...baseContext, ...additionalContext }),
    captureException: (error: unknown, additionalContext: ErrorContext = {}) =>
      captureException(error, { ...baseContext, ...additionalContext }),
    captureWarning: (message: string, additionalContext: ErrorContext = {}) =>
      captureWarning(message, { ...baseContext, ...additionalContext }),
  };
}

// ============================================================================
// ERROR STATISTICS
// ============================================================================

/**
 * Get error statistics
 */
export function getErrorStats(): ErrorStats {
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const error of errorBuffer) {
    byType[error.name] = (byType[error.name] || 0) + 1;
    bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
  }

  return {
    total: errorBuffer.length,
    byType,
    bySeverity,
    recentErrors: errorBuffer.slice(0, 10),
  };
}

/**
 * Get error by ID
 */
export function getErrorById(id: string): TrackedError | undefined {
  return errorBuffer.find(e => e.id === id);
}

/**
 * Clear error buffer
 */
export function clearErrors(): void {
  errorBuffer.length = 0;
}

// ============================================================================
// EXTERNAL SERVICE INTEGRATION
// ============================================================================

/**
 * Send error to external tracking service (Sentry, etc.)
 */
async function sendToExternalService(error: TrackedError): Promise<void> {
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!sentryDsn || process.env.NODE_ENV === 'development') {
    return;
  }

  try {
    // In production, this would integrate with Sentry SDK
    // For now, we'll just log that we would send
    if (error.severity === 'error') {
      // Sentry.captureException(error);
    }
  } catch {
    // Silent fail - don't let error tracking cause more errors
  }
}

// ============================================================================
// GLOBAL ERROR HANDLERS
// ============================================================================

/**
 * Set up global error handlers
 */
export function initializeErrorTracking(): void {
  if (typeof window !== 'undefined') {
    // Browser unhandled errors
    window.addEventListener('error', event => {
      captureError(
        event.error || new Error(event.message),
        { route: window.location.pathname },
        'error'
      );
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      captureException(event.reason, {
        route: window.location.pathname,
        action: 'unhandledRejection',
      });
    });
  }

  if (typeof process !== 'undefined') {
    // Node.js unhandled errors
    process.on('uncaughtException', error => {
      captureError(error, { action: 'uncaughtException' }, 'error');
    });

    process.on('unhandledRejection', reason => {
      captureException(reason, { action: 'unhandledRejection' });
    });
  }
}
