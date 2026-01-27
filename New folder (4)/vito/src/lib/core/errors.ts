/**
 * OLYMPUS 10X - Error Catalog
 *
 * Centralized error definitions for Handoffs, Guardrails, and MCP.
 * Extends the existing VitoError pattern.
 */

import { HTTP_STATUS } from './constants';

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERROR_CODES = {
  // Guardrail errors (1xxx)
  GUARDRAIL_INPUT_BLOCKED: 'guardrail_input_blocked',
  GUARDRAIL_SECURITY_VIOLATION: 'guardrail_security_violation',
  GUARDRAIL_PII_DETECTED: 'guardrail_pii_detected',
  GUARDRAIL_INJECTION_DETECTED: 'guardrail_injection_detected',
  GUARDRAIL_INPUT_TOO_LARGE: 'guardrail_input_too_large',
  GUARDRAIL_RATE_LIMITED: 'guardrail_rate_limited',
  GUARDRAIL_TIMEOUT: 'guardrail_timeout',
  GUARDRAIL_LAYER_FAILED: 'guardrail_layer_failed',

  // Handoff errors (2xxx)
  HANDOFF_CHAIN_DEPTH_EXCEEDED: 'handoff_chain_depth_exceeded',
  HANDOFF_CIRCUIT_OPEN: 'handoff_circuit_open',
  HANDOFF_TARGET_UNAVAILABLE: 'handoff_target_unavailable',
  HANDOFF_DECISION_FAILED: 'handoff_decision_failed',
  HANDOFF_COMPRESSION_FAILED: 'handoff_compression_failed',
  HANDOFF_INVALID_TARGET: 'handoff_invalid_target',
  HANDOFF_TIMEOUT: 'handoff_timeout',

  // MCP errors (3xxx)
  MCP_CONNECTION_FAILED: 'mcp_connection_failed',
  MCP_DISCONNECTED: 'mcp_disconnected',
  MCP_TOOL_NOT_FOUND: 'mcp_tool_not_found',
  MCP_TOOL_EXECUTION_FAILED: 'mcp_tool_execution_failed',
  MCP_INVALID_RESPONSE: 'mcp_invalid_response',
  MCP_SERVER_ERROR: 'mcp_server_error',
  MCP_TIMEOUT: 'mcp_timeout',

  // Context errors (4xxx)
  CONTEXT_NOT_FOUND: 'context_not_found',
  CONTEXT_EXPIRED: 'context_expired',
  CONTEXT_INVALID: 'context_invalid',
  CONTEXT_BAGGAGE_TOO_LARGE: 'context_baggage_too_large',
  IDEMPOTENCY_CONFLICT: 'idempotency_conflict',

  // General errors (5xxx)
  INTERNAL_ERROR: 'internal_error',
  VALIDATION_ERROR: 'validation_error',
  NOT_IMPLEMENTED: 'not_implemented',
  CONFIGURATION_ERROR: 'configuration_error',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

/**
 * Base error class for OLYMPUS 10X.
 * Compatible with existing VitoError pattern.
 */
export class OlympusError extends Error {
  /** Error code for programmatic handling */
  readonly code: ErrorCode;

  /** User-friendly message (no technical jargon) */
  readonly userMessage: string;

  /** Whether this error is retryable */
  readonly retryable: boolean;

  /** HTTP status code */
  readonly statusCode: number;

  /** Additional context */
  readonly context?: Record<string, unknown>;

  /** Timestamp when error occurred */
  readonly timestamp: Date;

  constructor(options: {
    code: ErrorCode;
    message: string;
    userMessage: string;
    retryable?: boolean;
    statusCode?: number;
    context?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(options.message);
    this.name = 'OlympusError';
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.retryable = options.retryable ?? false;
    this.statusCode = options.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
    this.context = options.context;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Preserve cause for error chaining
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  /** Convert to JSON for logging/API responses */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      retryable: this.retryable,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

// ============================================================================
// GUARDRAIL ERRORS
// ============================================================================

export class GuardrailBlockedError extends OlympusError {
  constructor(options: {
    reason: string;
    layer: string;
    confidence: number;
    detectedPatterns?: string[];
  }) {
    super({
      code: ERROR_CODES.GUARDRAIL_INPUT_BLOCKED,
      message: `Input blocked by ${options.layer} layer: ${options.reason}`,
      userMessage: 'Your request could not be processed. Please modify your input.',
      retryable: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      context: {
        layer: options.layer,
        confidence: options.confidence,
        detectedPatterns: options.detectedPatterns,
      },
    });
    this.name = 'GuardrailBlockedError';
  }
}

export class GuardrailSecurityError extends OlympusError {
  constructor(options: {
    violationType: string;
    details?: string;
  }) {
    super({
      code: ERROR_CODES.GUARDRAIL_SECURITY_VIOLATION,
      message: `Security violation detected: ${options.violationType}`,
      userMessage: 'Security check failed. Please ensure your input is safe.',
      retryable: false,
      statusCode: HTTP_STATUS.FORBIDDEN,
      context: {
        violationType: options.violationType,
        details: options.details,
      },
    });
    this.name = 'GuardrailSecurityError';
  }
}

export class GuardrailInputTooLargeError extends OlympusError {
  constructor(actualSize: number, maxSize: number) {
    super({
      code: ERROR_CODES.GUARDRAIL_INPUT_TOO_LARGE,
      message: `Input size ${actualSize} exceeds maximum ${maxSize}`,
      userMessage: 'Your input is too large. Please reduce the size and try again.',
      retryable: false,
      statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
      context: {
        actualSize,
        maxSize,
      },
    });
    this.name = 'GuardrailInputTooLargeError';
  }
}

export class GuardrailTimeoutError extends OlympusError {
  constructor(timeoutMs: number) {
    super({
      code: ERROR_CODES.GUARDRAIL_TIMEOUT,
      message: `Guardrail validation timed out after ${timeoutMs}ms`,
      userMessage: 'Validation took too long. Please try again.',
      retryable: true,
      statusCode: HTTP_STATUS.GATEWAY_TIMEOUT,
      context: { timeoutMs },
    });
    this.name = 'GuardrailTimeoutError';
  }
}

// ============================================================================
// HANDOFF ERRORS
// ============================================================================

export class HandoffChainDepthError extends OlympusError {
  constructor(currentDepth: number, maxDepth: number) {
    super({
      code: ERROR_CODES.HANDOFF_CHAIN_DEPTH_EXCEEDED,
      message: `Handoff chain depth ${currentDepth} exceeds maximum ${maxDepth}`,
      userMessage: 'Request is too complex. Please simplify and try again.',
      retryable: false,
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      context: {
        currentDepth,
        maxDepth,
      },
    });
    this.name = 'HandoffChainDepthError';
  }
}

export class HandoffCircuitOpenError extends OlympusError {
  constructor(retryAfterMs: number) {
    super({
      code: ERROR_CODES.HANDOFF_CIRCUIT_OPEN,
      message: `Handoff circuit breaker is open. Retry after ${retryAfterMs}ms`,
      userMessage: 'Service is recovering. Please try again shortly.',
      retryable: true,
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      context: { retryAfterMs },
    });
    this.name = 'HandoffCircuitOpenError';
  }
}

export class HandoffTargetUnavailableError extends OlympusError {
  constructor(targetAgent: string) {
    super({
      code: ERROR_CODES.HANDOFF_TARGET_UNAVAILABLE,
      message: `Handoff target agent "${targetAgent}" is unavailable`,
      userMessage: 'The specialized assistant is currently unavailable.',
      retryable: true,
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      context: { targetAgent },
    });
    this.name = 'HandoffTargetUnavailableError';
  }
}

export class HandoffDecisionError extends OlympusError {
  constructor(reason: string) {
    super({
      code: ERROR_CODES.HANDOFF_DECISION_FAILED,
      message: `Handoff decision failed: ${reason}`,
      userMessage: 'Could not determine the best way to handle your request.',
      retryable: true,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      context: { reason },
    });
    this.name = 'HandoffDecisionError';
  }
}

// ============================================================================
// MCP ERRORS
// ============================================================================

export class MCPConnectionError extends OlympusError {
  constructor(serverName: string, reason: string) {
    super({
      code: ERROR_CODES.MCP_CONNECTION_FAILED,
      message: `Failed to connect to MCP server "${serverName}": ${reason}`,
      userMessage: 'Could not connect to external service.',
      retryable: true,
      statusCode: HTTP_STATUS.BAD_GATEWAY,
      context: { serverName, reason },
    });
    this.name = 'MCPConnectionError';
  }
}

export class MCPToolNotFoundError extends OlympusError {
  constructor(toolName: string, serverName?: string) {
    super({
      code: ERROR_CODES.MCP_TOOL_NOT_FOUND,
      message: `MCP tool "${toolName}" not found${serverName ? ` on server "${serverName}"` : ''}`,
      userMessage: 'The requested capability is not available.',
      retryable: false,
      statusCode: HTTP_STATUS.NOT_FOUND,
      context: { toolName, serverName },
    });
    this.name = 'MCPToolNotFoundError';
  }
}

export class MCPToolExecutionError extends OlympusError {
  constructor(toolName: string, reason: string) {
    super({
      code: ERROR_CODES.MCP_TOOL_EXECUTION_FAILED,
      message: `MCP tool "${toolName}" execution failed: ${reason}`,
      userMessage: 'External tool encountered an error.',
      retryable: true,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      context: { toolName, reason },
    });
    this.name = 'MCPToolExecutionError';
  }
}

export class MCPTimeoutError extends OlympusError {
  constructor(operation: string, timeoutMs: number) {
    super({
      code: ERROR_CODES.MCP_TIMEOUT,
      message: `MCP ${operation} timed out after ${timeoutMs}ms`,
      userMessage: 'External service took too long to respond.',
      retryable: true,
      statusCode: HTTP_STATUS.GATEWAY_TIMEOUT,
      context: { operation, timeoutMs },
    });
    this.name = 'MCPTimeoutError';
  }
}

// ============================================================================
// CONTEXT ERRORS
// ============================================================================

export class ContextNotFoundError extends OlympusError {
  constructor(requestId: string) {
    super({
      code: ERROR_CODES.CONTEXT_NOT_FOUND,
      message: `Context not found for request "${requestId}"`,
      userMessage: 'Request context is missing.',
      retryable: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      context: { requestId },
    });
    this.name = 'ContextNotFoundError';
  }
}

export class IdempotencyConflictError extends OlympusError {
  constructor(idempotencyKey: string) {
    super({
      code: ERROR_CODES.IDEMPOTENCY_CONFLICT,
      message: `Idempotency conflict for key "${idempotencyKey}"`,
      userMessage: 'This request has already been processed.',
      retryable: false,
      statusCode: HTTP_STATUS.CONFLICT,
      context: { idempotencyKey },
    });
    this.name = 'IdempotencyConflictError';
  }
}

export class BaggageTooLargeError extends OlympusError {
  constructor(actualSize: number, maxSize: number) {
    super({
      code: ERROR_CODES.CONTEXT_BAGGAGE_TOO_LARGE,
      message: `Baggage size ${actualSize} exceeds maximum ${maxSize}`,
      userMessage: 'Too much context data. Please reduce and try again.',
      retryable: false,
      statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
      context: { actualSize, maxSize },
    });
    this.name = 'BaggageTooLargeError';
  }
}

// ============================================================================
// ERROR FACTORY
// ============================================================================

/**
 * Create an OlympusError from an unknown error.
 * Preserves OlympusError instances, wraps others.
 */
export function createOlympusError(error: unknown): OlympusError {
  // Already an OlympusError
  if (error instanceof OlympusError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Detect specific error types from message
    if (message.includes('timeout')) {
      return new OlympusError({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: error.message,
        userMessage: 'Operation timed out. Please try again.',
        retryable: true,
        statusCode: HTTP_STATUS.GATEWAY_TIMEOUT,
        cause: error,
      });
    }

    if (message.includes('network') || message.includes('fetch')) {
      return new OlympusError({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: error.message,
        userMessage: 'Network error. Please check your connection.',
        retryable: true,
        statusCode: HTTP_STATUS.BAD_GATEWAY,
        cause: error,
      });
    }

    // Generic wrap
    return new OlympusError({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error.message,
      userMessage: 'An unexpected error occurred.',
      retryable: false,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      cause: error,
    });
  }

  // Unknown type
  return new OlympusError({
    code: ERROR_CODES.INTERNAL_ERROR,
    message: String(error),
    userMessage: 'An unexpected error occurred.',
    retryable: false,
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  });
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isOlympusError(error: unknown): error is OlympusError {
  return error instanceof OlympusError;
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof OlympusError) {
    return error.retryable;
  }
  return false;
}

export function getErrorCode(error: unknown): ErrorCode | null {
  if (error instanceof OlympusError) {
    return error.code;
  }
  return null;
}
