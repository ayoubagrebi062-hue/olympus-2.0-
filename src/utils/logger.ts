/**
 * OLYMPUS 2.0 - Unified Logger Utility
 * ====================================
 * Replaces raw console.log statements with environment-aware logging.
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.debug('Debug info', { data });
 *   logger.info('Info message');
 *   logger.warn('Warning');
 *   logger.error('Error', error);
 */

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: unknown;
}

/**
 * Production log service integration point.
 *
 * ENHANCEMENT: When ready to add external logging, implement this function
 * to send logs to Sentry, LogRocket, DataDog, or similar service.
 * Current state: No-op placeholder (logs go to console only).
 */
const sendToLogService = async (_entry: LogEntry): Promise<void> => {
  // No-op: External logging service not yet configured
  // To enable: Set LOG_SERVICE_URL and implement the fetch call
};

/**
 * Format log message with timestamp and level
 */
const formatMessage = (level: LogLevel, message: string): string => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

/**
 * Core log function
 */
const log = (level: LogLevel, message: string, ...args: unknown[]): void => {
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    data: args.length > 0 ? args : undefined,
  };

  // In test environment, suppress most logs
  if (isTest && level !== 'error') {
    return;
  }

  switch (level) {
    case 'debug':
      // Debug only in development
      if (isDev) {
        console.log(formatMessage(level, message), ...args);
      }
      break;
    case 'info':
      console.info(formatMessage(level, message), ...args);
      break;
    case 'warn':
      console.warn(formatMessage(level, message), ...args);
      break;
    case 'error':
      console.error(formatMessage(level, message), ...args);
      // In production, send errors to logging service
      if (!isDev && !isTest) {
        sendToLogService(entry).catch(() => {
          // Silent fail - don't cause issues with error reporting
        });
      }
      break;
  }
};

/**
 * Logger object with level-specific methods
 */
export const logger = {
  /**
   * Debug-level logging - only shows in development
   */
  debug: (message: string, ...args: unknown[]): void => {
    log('debug', message, ...args);
  },

  /**
   * Info-level logging - shows in all environments
   */
  info: (message: string, ...args: unknown[]): void => {
    log('info', message, ...args);
  },

  /**
   * Warning-level logging - shows in all environments
   */
  warn: (message: string, ...args: unknown[]): void => {
    log('warn', message, ...args);
  },

  /**
   * Error-level logging - shows everywhere, sent to log service in production
   */
  error: (message: string, ...args: unknown[]): void => {
    log('error', message, ...args);
  },

  /**
   * Group related logs together (dev only)
   */
  group: (label: string, fn: () => void): void => {
    if (isDev) {
      console.group(label);
      fn();
      console.groupEnd();
    }
  },

  /**
   * Time an operation (dev only)
   */
  time: (label: string): void => {
    if (isDev) {
      console.time(label);
    }
  },

  timeEnd: (label: string): void => {
    if (isDev) {
      console.timeEnd(label);
    }
  },

  /**
   * Log a table (dev only)
   */
  table: (data: unknown): void => {
    if (isDev) {
      console.table(data);
    }
  },
};

export default logger;
