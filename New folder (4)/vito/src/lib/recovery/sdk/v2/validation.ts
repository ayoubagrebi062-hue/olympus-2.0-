/**
 * Input Validation & Sanitization
 *
 * Security-first validation for all user inputs.
 * Prevents injection attacks, resource exhaustion, and invalid configs.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const LIMITS = {
  /** Maximum operation name length */
  MAX_NAME_LENGTH: 128,
  /** Maximum number of registrations per registry */
  MAX_REGISTRY_SIZE: 1000,
  /** Minimum timeout in ms */
  MIN_TIMEOUT: 1,
  /** Maximum timeout in ms (10 minutes) */
  MAX_TIMEOUT: 600000,
  /** Minimum concurrent limit */
  MIN_CONCURRENT: 1,
  /** Maximum concurrent limit */
  MAX_CONCURRENT: 10000,
  /** Maximum queue size */
  MAX_QUEUE_SIZE: 100000,
  /** Maximum cache size */
  MAX_CACHE_SIZE: 100000,
  /** Maximum retry attempts */
  MAX_RETRY_ATTEMPTS: 100,
  /** Maximum hedge requests */
  MAX_HEDGES: 10,
} as const;

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: unknown,
    public readonly constraint: string
  ) {
    super(`Invalid ${field}: ${constraint}. Got: ${JSON.stringify(value)}`);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// VALIDATORS
// ============================================================================

/**
 * Sanitize operation name to prevent injection attacks.
 * - Removes control characters
 * - Truncates to max length
 * - Replaces dangerous characters
 */
export function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new ValidationError('name', name, 'must be a string');
  }

  if (name.length === 0) {
    throw new ValidationError('name', name, 'cannot be empty');
  }

  // Remove control characters and dangerous chars
  let sanitized = name
    .replace(/[\x00-\x1F\x7F]/g, '') // Control chars
    .replace(/[<>'"&\\]/g, '_')      // XSS/injection chars
    .replace(/[\r\n]/g, ' ')         // Newlines (log injection)
    .trim();

  // Truncate
  if (sanitized.length > LIMITS.MAX_NAME_LENGTH) {
    sanitized = sanitized.slice(0, LIMITS.MAX_NAME_LENGTH);
  }

  if (sanitized.length === 0) {
    throw new ValidationError('name', name, 'cannot be empty after sanitization');
  }

  return sanitized;
}

/**
 * Validate positive integer within bounds.
 */
export function validatePositiveInt(
  field: string,
  value: unknown,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ValidationError(field, value, `must be an integer`);
  }

  if (value < min) {
    throw new ValidationError(field, value, `must be >= ${min}`);
  }

  if (value > max) {
    throw new ValidationError(field, value, `must be <= ${max}`);
  }

  return value;
}

/**
 * Validate timeout value.
 */
export function validateTimeout(
  field: string,
  value: unknown,
  defaultValue: number
): number {
  return validatePositiveInt(field, value, LIMITS.MIN_TIMEOUT, LIMITS.MAX_TIMEOUT, defaultValue);
}

/**
 * Validate probability (0-1).
 */
export function validateProbability(
  field: string,
  value: unknown,
  defaultValue: number
): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(field, value, 'must be a number');
  }

  if (value < 0 || value > 1) {
    throw new ValidationError(field, value, 'must be between 0 and 1');
  }

  return value;
}

/**
 * Validate function input.
 */
export function validateFunction<T>(
  field: string,
  value: unknown
): asserts value is () => T | Promise<T> {
  if (typeof value !== 'function') {
    throw new ValidationError(field, typeof value, 'must be a function');
  }
}

/**
 * Validate operation (the core function to execute).
 */
export function validateOperation<T>(operation: unknown): asserts operation is () => T | Promise<T> {
  if (operation === null || operation === undefined) {
    throw new ValidationError('operation', operation, 'cannot be null or undefined');
  }
  validateFunction<T>('operation', operation);
}

// ============================================================================
// REGISTRY SIZE ENFORCEMENT
// ============================================================================

/**
 * Check if registry can accept new entries.
 */
export function checkRegistrySize(registry: Map<string, unknown>, name: string): void {
  if (registry.size >= LIMITS.MAX_REGISTRY_SIZE) {
    throw new Error(
      `Registry limit reached (${LIMITS.MAX_REGISTRY_SIZE}). ` +
      `Cannot create "${name}". Consider reusing existing entries or clearing unused ones.`
    );
  }
}

// ============================================================================
// CONFIG VALIDATORS
// ============================================================================

export interface ValidatedBulkheadConfig {
  maxConcurrent: number;
  maxQueued: number;
  queueTimeout: number;
  enablePriority: boolean;
  name: string;
}

export function validateBulkheadConfig(
  name: string,
  config: Record<string, unknown> = {}
): ValidatedBulkheadConfig {
  return {
    name: sanitizeName(config.name ?? name),
    maxConcurrent: validatePositiveInt('maxConcurrent', config.maxConcurrent, LIMITS.MIN_CONCURRENT, LIMITS.MAX_CONCURRENT, 10),
    maxQueued: validatePositiveInt('maxQueued', config.maxQueued, 0, LIMITS.MAX_QUEUE_SIZE, 100),
    queueTimeout: validateTimeout('queueTimeout', config.queueTimeout, 30000),
    enablePriority: config.enablePriority === true,
  };
}

export interface ValidatedCoalescerConfig {
  cacheTtlMs: number;
  cacheErrors: boolean;
  errorCacheTtlMs: number;
  maxCacheSize: number;
  name: string;
}

export function validateCoalescerConfig(
  name: string,
  config: Record<string, unknown> = {}
): ValidatedCoalescerConfig {
  return {
    name: sanitizeName(config.name ?? name),
    cacheTtlMs: validatePositiveInt('cacheTtlMs', config.cacheTtlMs, 0, LIMITS.MAX_TIMEOUT, 0),
    cacheErrors: config.cacheErrors === true,
    errorCacheTtlMs: validatePositiveInt('errorCacheTtlMs', config.errorCacheTtlMs, 0, LIMITS.MAX_TIMEOUT, 1000),
    maxCacheSize: validatePositiveInt('maxCacheSize', config.maxCacheSize, 1, LIMITS.MAX_CACHE_SIZE, 1000),
  };
}

export interface ValidatedHedgeConfig {
  hedgeDelay: number;
  maxHedges: number;
  cancelOnSuccess: boolean;
  adaptiveHedging: boolean;
  percentileThreshold: number;
}

export function validateHedgeConfig(config: Record<string, unknown> = {}): ValidatedHedgeConfig {
  const hedgeDelay = validatePositiveInt('hedgeDelay', config.hedgeDelay, 1, LIMITS.MAX_TIMEOUT, 100);

  return {
    hedgeDelay,
    maxHedges: validatePositiveInt('maxHedges', config.maxHedges, 0, LIMITS.MAX_HEDGES, 1),
    cancelOnSuccess: config.cancelOnSuccess !== false,
    adaptiveHedging: config.adaptiveHedging === true,
    percentileThreshold: validateProbability('percentileThreshold', config.percentileThreshold, 0.95),
  };
}

// ============================================================================
// SAFE ERROR MESSAGES
// ============================================================================

/**
 * Create safe error message that doesn't leak internal state.
 */
export function safeErrorMessage(
  code: string,
  publicMessage: string,
  _internalDetails?: Record<string, unknown>
): string {
  // In production, only return the code and public message
  // Internal details are logged separately, not returned to caller
  return `[${code}] ${publicMessage}`;
}

/**
 * Sanitize error message for safe display.
 */
export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/[\x00-\x1F\x7F]/g, '') // Control chars
    .replace(/[<>]/g, '')            // HTML
    .slice(0, 500);                  // Limit length
}
