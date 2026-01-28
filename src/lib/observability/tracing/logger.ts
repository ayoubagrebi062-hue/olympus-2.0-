/**
 * Pluggable Correlated Logger
 *
 * Inject your own logger backend (Winston, Pino, Bunyan, etc.)
 * while maintaining automatic trace correlation.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LogContext {
  traceId: string;
  spanId: string;
  [key: string]: string | number | boolean | undefined;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context: LogContext;
  data?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Logger backend interface
 * Implement this to use your own logging library
 */
export interface LoggerBackend {
  log(entry: LogEntry): void;
}

/**
 * Correlated logger that auto-injects trace context
 */
export interface CorrelatedLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT BACKENDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * JSON console logger (default)
 * Outputs structured JSON logs to console
 */
export const jsonConsoleBackend: LoggerBackend = {
  log(entry: LogEntry): void {
    const payload = {
      level: entry.level,
      message: entry.message,
      ...entry.context,
      ...entry.data,
      timestamp: entry.timestamp.toISOString(),
    };

    const line = JSON.stringify(payload);

    switch (entry.level) {
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(line);
        }
        break;
      case 'info':
        console.info(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      case 'error':
        console.error(line);
        break;
    }
  },
};

/**
 * Pretty console logger (for development)
 * Human-readable colored output
 */
export const prettyConsoleBackend: LoggerBackend = {
  log(entry: LogEntry): void {
    const colors: Record<string, string> = {
      debug: '\x1b[90m', // gray
      info: '\x1b[36m', // cyan
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const color = colors[entry.level] || '';

    const traceShort = entry.context.traceId.substring(0, 8);
    const prefix = `${color}[${entry.level.toUpperCase()}]${reset} [${traceShort}]`;
    const contextStr = Object.entries(entry.context)
      .filter(([k]) => k !== 'traceId' && k !== 'spanId')
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');

    console.log(`${prefix} ${entry.message} ${contextStr ? `{${contextStr}}` : ''}`);

    if (entry.data && Object.keys(entry.data).length > 0) {
      console.log(`  ${JSON.stringify(entry.data)}`);
    }
  },
};

/**
 * Silent backend (for testing)
 */
export const silentBackend: LoggerBackend = {
  log(): void {
    // Intentionally empty
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

let globalBackend: LoggerBackend = jsonConsoleBackend;

/**
 * Set the global logger backend
 *
 * @example
 * // Use pretty logs in development
 * if (process.env.NODE_ENV === 'development') {
 *   setLoggerBackend(prettyConsoleBackend);
 * }
 *
 * @example
 * // Integrate with Winston
 * import winston from 'winston';
 * const winstonLogger = winston.createLogger({ ... });
 *
 * setLoggerBackend({
 *   log(entry) {
 *     winstonLogger.log(entry.level, entry.message, {
 *       ...entry.context,
 *       ...entry.data,
 *     });
 *   }
 * });
 */
export function setLoggerBackend(backend: LoggerBackend): void {
  globalBackend = backend;
}

/**
 * Get the current logger backend
 */
export function getLoggerBackend(): LoggerBackend {
  return globalBackend;
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a correlated logger for a specific trace context
 */
export function createCorrelatedLogger(
  traceId: string,
  spanId: string,
  businessContext: Record<string, string | number | boolean | undefined>
): CorrelatedLogger {
  const context: LogContext = {
    traceId,
    spanId,
  };

  // Add business context (filtering undefined values)
  for (const [key, value] of Object.entries(businessContext)) {
    if (value !== undefined) {
      context[key] = value;
    }
  }

  const log = (level: LogEntry['level'], message: string, data?: Record<string, unknown>) => {
    globalBackend.log({
      level,
      message,
      context,
      data,
      timestamp: new Date(),
    });
  };

  return {
    debug: (message, data) => log('debug', message, data),
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warn', message, data),
    error: (message, data) => log('error', message, data),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE: Wrap existing loggers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a backend from any logger with standard methods
 *
 * @example
 * import pino from 'pino';
 * const logger = pino();
 * setLoggerBackend(wrapLogger(logger));
 */
export function wrapLogger(logger: {
  debug?(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}): LoggerBackend {
  return {
    log(entry: LogEntry): void {
      const merged = { ...entry.context, ...entry.data };
      switch (entry.level) {
        case 'debug':
          logger.debug?.(entry.message, merged);
          break;
        case 'info':
          logger.info(entry.message, merged);
          break;
        case 'warn':
          logger.warn(entry.message, merged);
          break;
        case 'error':
          logger.error(entry.message, merged);
          break;
      }
    },
  };
}
