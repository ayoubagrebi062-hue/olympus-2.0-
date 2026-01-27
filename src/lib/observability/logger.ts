/**
 * OLYMPUS 2.1 - 10X UPGRADE: Structured Logging
 *
 * Production-ready logging with:
 * - JSON output for log aggregation (Datadog, CloudWatch, etc.)
 * - Request correlation IDs
 * - Performance timing
 * - Error context preservation
 * - Log levels with filtering
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

interface LogContext {
  // Request context
  requestId?: string;
  userId?: string;
  tenantId?: string;
  buildId?: string;

  // Performance
  duration?: number;
  startTime?: number;

  // Error context
  error?: Error;
  stack?: string;

  // Custom fields
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  context: LogContext;
}

// ============================================================================
// LOGGER CONFIGURATION
// ============================================================================

const config = {
  minLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
  service: process.env.SERVICE_NAME || 'olympus',
  environment: process.env.NODE_ENV || 'development',
  prettyPrint: process.env.NODE_ENV !== 'production',
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[config.minLevel];
}

// ============================================================================
// CORE LOGGER
// ============================================================================

function formatEntry(entry: LogEntry): string {
  if (config.prettyPrint) {
    // Human-readable format for development
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m', // green
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
      fatal: '\x1b[35m', // magenta
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];

    let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`;

    if (entry.context.duration) {
      output += ` (${entry.context.duration}ms)`;
    }

    if (entry.context.requestId) {
      output += ` [req:${entry.context.requestId.slice(0, 8)}]`;
    }

    if (entry.context.error) {
      output += `\n${entry.context.stack || entry.context.error}`;
    }

    return output;
  }

  // JSON format for production (log aggregation)
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context: LogContext = {}): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: config.service,
    environment: config.environment,
    context,
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case 'debug':
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
    case 'fatal':
      console.error(formatted);
      break;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
  fatal: (message: string, context?: LogContext) => log('fatal', message, context),

  /**
   * Log with error object (preserves stack trace)
   */
  exception: (message: string, error: unknown, context?: LogContext) => {
    const err = error instanceof Error ? error : new Error(String(error));
    log('error', message, {
      ...context,
      error: err,
      stack: err.stack,
      errorName: err.name,
      errorMessage: err.message,
    });
  },

  /**
   * Create a child logger with preset context
   */
  child: (baseContext: LogContext) => ({
    debug: (message: string, ctx?: LogContext) => log('debug', message, { ...baseContext, ...ctx }),
    info: (message: string, ctx?: LogContext) => log('info', message, { ...baseContext, ...ctx }),
    warn: (message: string, ctx?: LogContext) => log('warn', message, { ...baseContext, ...ctx }),
    error: (message: string, ctx?: LogContext) => log('error', message, { ...baseContext, ...ctx }),
    fatal: (message: string, ctx?: LogContext) => log('fatal', message, { ...baseContext, ...ctx }),
  }),

  /**
   * Time an async operation
   */
  async time<T>(label: string, fn: () => Promise<T>, context?: LogContext): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      log('info', `${label} completed`, { ...context, duration: Date.now() - start });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log('error', `${label} failed`, {
        ...context,
        duration: Date.now() - start,
        error: err,
        stack: err.stack,
      });
      throw error;
    }
  },
};

// ============================================================================
// REQUEST CONTEXT (for correlation IDs)
// ============================================================================

// AsyncLocalStorage for request context (Node.js 16+)
let requestContext: Map<string, LogContext> | null = null;

if (typeof window === 'undefined') {
  // Server-side only
  try {
    const { AsyncLocalStorage } = require('async_hooks');
    requestContext = new AsyncLocalStorage();
  } catch {
    // Fallback for environments without async_hooks
    requestContext = new Map();
  }
}

export function runWithRequestContext<T>(context: LogContext, fn: () => T): T {
  if (!requestContext) return fn();

  if (requestContext instanceof Map) {
    const id = context.requestId || crypto.randomUUID();
    requestContext.set(id, context);
    try {
      return fn();
    } finally {
      requestContext.delete(id);
    }
  }

  return (requestContext as any).run(context, fn);
}

export function getRequestContext(): LogContext | undefined {
  if (!requestContext) return undefined;
  if (requestContext instanceof Map) return undefined; // Can't get without ID
  return (requestContext as any).getStore();
}

// ============================================================================
// BUILD LOGGER (specialized for OLYMPUS builds)
// ============================================================================

export function createBuildLogger(buildId: string, userId?: string) {
  return logger.child({ buildId, userId });
}

export default logger;
