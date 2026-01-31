/**
 * OLYMPUS 2.0 - Server-Sent Events (SSE)
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

/** SSE event data */
export interface SSEEvent {
  event?: string;
  data: unknown;
  id?: string;
  retry?: number;
}

/** SSE stream options */
export interface SSEOptions {
  keepAliveInterval?: number; // ms, default 30s
  onClose?: () => void;
}

/** Format SSE message */
function formatSSEMessage(event: SSEEvent): string {
  const lines: string[] = [];

  if (event.id) lines.push(`id: ${event.id}`);
  if (event.event) lines.push(`event: ${event.event}`);
  if (event.retry) lines.push(`retry: ${event.retry}`);

  const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
  lines.push(`data: ${data}`);

  return lines.join('\n') + '\n\n';
}

/** Create SSE response with controller */
export function createSSEStream(options: SSEOptions = {}): {
  stream: ReadableStream;
  send: (event: SSEEvent) => void;
  close: () => void;
} {
  const { keepAliveInterval = 30000, onClose } = options;
  let controller: ReadableStreamDefaultController | null = null;
  let keepAliveTimer: NodeJS.Timeout | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      // Send initial connection event
      const encoder = new TextEncoder();
      ctrl.enqueue(
        encoder.encode(formatSSEMessage({ event: 'connected', data: { timestamp: Date.now() } }))
      );

      // Keep-alive ping
      keepAliveTimer = setInterval(() => {
        if (!isClosed && controller) {
          try {
            ctrl.enqueue(encoder.encode(': ping\n\n'));
          } catch {
            close();
          }
        }
      }, keepAliveInterval);
    },
    cancel() {
      close();
    },
  });

  function send(event: SSEEvent) {
    if (isClosed || !controller) return;
    try {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(formatSSEMessage(event)));
    } catch {
      close();
    }
  }

  function close() {
    if (isClosed) return;
    isClosed = true;
    if (keepAliveTimer) clearInterval(keepAliveTimer);
    if (controller) {
      try {
        controller.close();
      } catch {}
    }
    onClose?.();
  }

  return { stream, send, close };
}

/** Create SSE response headers */
export function getSSEHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  };
}

/** Create SSE Response object */
export function createSSEResponse(options: SSEOptions = {}): {
  response: Response;
  send: (event: SSEEvent) => void;
  close: () => void;
} {
  const { stream, send, close } = createSSEStream(options);
  const response = new Response(stream, { headers: getSSEHeaders() });
  return { response, send, close };
}

// ============================================================================
// CONFIGURATION SYSTEM - FUTURE-PROOF EXTERNAL CONFIGURATION
// ============================================================================

/**
 * External configuration for SSE behavior.
 * This allows Future You to modify behavior without touching code.
 * Load from environment variables, config files, or databases.
 */
export interface SSEConfig {
  /** Contextual progress messages by build phase */
  contextualMessages: Record<string, string[]>;
  /** Base time estimates in seconds by build context */
  baseTimeEstimates: Record<string, number>;
  /** Error recovery settings */
  errorRecovery: {
    maxReconnectAttempts: number;
    baseReconnectDelay: number;
    maxReconnectDelay: number;
  };
  /** Security settings */
  security: {
    maxInputLength: number;
    sanitizeInputs: boolean;
  };
}

/**
 * Default SSE configuration.
 * Future You: Override this via environment variables or config file.
 */
const DEFAULT_SSE_CONFIG: SSEConfig = {
  contextualMessages: {
    codeGeneration: [
      'Analyzing your requirements...',
      'Crafting the perfect solution...',
      'Adding those special touches...',
      'Almost there - polishing the details...',
    ],
    deployment: [
      'Preparing your application...',
      'Configuring the cloud environment...',
      'Setting up security and monitoring...',
      'Your app is live! 🚀',
    ],
    testing: [
      'Running comprehensive tests...',
      'Checking code quality...',
      'Validating performance...',
      'Ensuring everything works perfectly...',
    ],
  },
  baseTimeEstimates: {
    codeGeneration: 180, // 3 minutes for code generation
    deployment: 120, // 2 minutes for deployment
    testing: 90, // 1.5 minutes for testing
  },
  errorRecovery: {
    maxReconnectAttempts: 3,
    baseReconnectDelay: 1000, // 1 second
    maxReconnectDelay: 30000, // 30 seconds
  },
  security: {
    maxInputLength: 500,
    sanitizeInputs: true,
  },
};

/**
 * Load SSE configuration from environment or use defaults.
 * Includes chaos engineering protection against invalid configurations.
 */
function loadSSEConfig(): SSEConfig {
  try {
    // Start with validated defaults
    const config = { ...DEFAULT_SSE_CONFIG };

    // Safe environment variable parsing with validation
    const maxReconnectStr = process.env.SSE_MAX_RECONNECT_ATTEMPTS;
    if (maxReconnectStr) {
      const maxReconnect = parseInt(maxReconnectStr, 10);
      if (!isNaN(maxReconnect) && maxReconnect >= 0 && maxReconnect <= 10) {
        // Reasonable bounds
        config.errorRecovery.maxReconnectAttempts = maxReconnect;
      } else {
        console.warn(`SSE: Invalid SSE_MAX_RECONNECT_ATTEMPTS "${maxReconnectStr}", using default`);
      }
    }

    // Validate the final configuration
    const validation = validateSSEConfig(config);
    if (!validation.valid) {
      console.error('SSE: Configuration validation failed, using defaults:', validation.errors);
      return DEFAULT_SSE_CONFIG;
    }

    return config;
  } catch (error) {
    console.error('SSE: Failed to load configuration, using defaults:', error);
    return DEFAULT_SSE_CONFIG;
  }
}

/**
 * Validate SSE configuration for chaos engineering protection.
 */
function validateSSEConfig(config: SSEConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate base time estimates
  Object.entries(config.baseTimeEstimates).forEach(([context, time]) => {
    if (typeof time !== 'number' || time < 10 || time > 3600) {
      // 10 seconds to 1 hour
      errors.push(`Invalid baseTimeEstimates.${context}: ${time}`);
    }
  });

  // Validate error recovery settings
  if (
    config.errorRecovery.maxReconnectAttempts < 0 ||
    config.errorRecovery.maxReconnectAttempts > 20
  ) {
    errors.push(`Invalid maxReconnectAttempts: ${config.errorRecovery.maxReconnectAttempts}`);
  }
  if (
    config.errorRecovery.baseReconnectDelay < 100 ||
    config.errorRecovery.baseReconnectDelay > 10000
  ) {
    errors.push(`Invalid baseReconnectDelay: ${config.errorRecovery.baseReconnectDelay}`);
  }

  // Validate security settings
  if (config.security.maxInputLength < 10 || config.security.maxInputLength > 10000) {
    errors.push(`Invalid maxInputLength: ${config.security.maxInputLength}`);
  }

  return { valid: errors.length === 0, errors };
}

// Load configuration once at module level
const sseConfig = loadSSEConfig();

// Extract constants for backward compatibility and performance
const CONTEXTUAL_MESSAGES = sseConfig.contextualMessages;
const BASE_TIME_ESTIMATES = sseConfig.baseTimeEstimates;
const MAX_RECONNECT_ATTEMPTS = sseConfig.errorRecovery.maxReconnectAttempts;
const BASE_RECONNECT_DELAY = sseConfig.errorRecovery.baseReconnectDelay;
const MAX_RECONNECT_DELAY = sseConfig.errorRecovery.maxReconnectDelay;

/**
 * Export configuration for external access.
 * Future You: Use this to modify behavior programmatically.
 */
export { sseConfig as SSE_CONFIG };

/**
 * Calculate estimated time remaining based on current progress and build context.
 * Uses linear interpolation: if 50% complete and base time is 180s, ETA is 90s.
 *
 * @param progress - Current progress percentage (0-100)
 * @param context - Build context to determine base time estimate
 * @returns Estimated seconds remaining, rounded up
 */
function calculateETA(progress: number, context: keyof typeof BASE_TIME_ESTIMATES): number {
  // Get base time estimate for this context, fallback to code generation
  const baseTime = BASE_TIME_ESTIMATES[context] || BASE_TIME_ESTIMATES.codeGeneration || 180;

  // Calculate fraction remaining (e.g., 50% complete = 0.5 remaining)
  const remainingProgress = (100 - progress) / 100;

  // Estimate time as: baseTime × remainingFraction
  // Round up to avoid under-promising
  return Math.ceil(baseTime * remainingProgress);
}

/** Enhanced progress sender with contextual messages */
function sendEnhancedProgress(
  send: (event: SSEEvent) => void,
  step: string,
  progress: number,
  context: keyof typeof BASE_TIME_ESTIMATES,
  customMessage?: string
) {
  // Use custom message if provided, otherwise get contextual message
  const message =
    customMessage ||
    (() => {
      const messages = CONTEXTUAL_MESSAGES[context];
      if (!messages) return undefined;

      const messageIndex = Math.floor((progress / 100) * messages.length);
      return messages[Math.min(messageIndex, messages.length - 1)];
    })();

  const estimatedTimeRemaining = calculateETA(progress, context);

  send({
    event: 'progress',
    data: {
      step,
      progress,
      message,
      estimatedTimeRemaining,
      context,
      timestamp: new Date().toISOString(),
    },
  });
}

/** Build log streaming helper with enhanced progress and error recovery */
export function createBuildLogStream(buildId: string, onClose?: () => void) {
  const { response, send, close } = createSSEResponse({ onClose });
  let connectionAttempts = 0;
  let reconnectTimeout: NodeJS.Timeout | null = null;

  // Input validation and sanitization with chaos engineering defenses
  const sanitizeInput = (
    input: string,
    maxLength: number = sseConfig.security.maxInputLength || 500
  ): string => {
    if (typeof input !== 'string') return '';
    if (input.length > maxLength * 2) {
      // Early rejection for extremely large inputs
      console.warn(`SSE: Input too large (${input.length} chars), rejecting`);
      return '';
    }
    // Comprehensive XSS prevention + length limit + null byte protection
    return input
      .replace(/[<>\"'&]/g, '') // XSS characters
      .replace(/\0/g, '') // Null bytes
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control characters
      .substring(0, maxLength);
  };

  const validateContext = (context: string): context is keyof typeof BASE_TIME_ESTIMATES => {
    if (typeof context !== 'string') return false;
    return context in BASE_TIME_ESTIMATES && context.length <= 50; // Reasonable length limit
  };

  // Rate limiting for chaos engineering protection
  let requestCount = 0;
  let rateLimitWindow = Date.now();
  const RATE_LIMIT_MAX = 100; // 100 requests per second max
  const RATE_LIMIT_WINDOW = 1000; // 1 second window

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    if (now - rateLimitWindow >= RATE_LIMIT_WINDOW) {
      requestCount = 0;
      rateLimitWindow = now;
    }
    requestCount++;
    return requestCount <= RATE_LIMIT_MAX;
  };

  return {
    response,
    sendLog: (
      level: 'info' | 'warn' | 'error',
      message: string,
      meta?: Record<string, unknown>
    ) => {
      try {
        const sanitizedMessage = sanitizeInput(message);
        send({
          event: 'log',
          data: { level, message: sanitizedMessage, timestamp: new Date().toISOString(), ...meta },
        });
      } catch (error) {
        console.error('Failed to send log:', error);
        // Don't close connection on log failure - continue streaming
      }
    },
    sendProgress: async (
      step: string,
      progress: number,
      context?: keyof typeof BASE_TIME_ESTIMATES,
      customMessage?: string
    ) => {
      try {
        // Rate limiting check - chaos engineering protection
        if (!checkRateLimit()) {
          console.warn('SSE: Rate limit exceeded, dropping progress update');
          return; // Silently drop to prevent resource exhaustion
        }

        // Validate and sanitize inputs with comprehensive checks
        if (typeof step !== 'string' || typeof progress !== 'number') {
          console.warn('SSE: Invalid progress parameters, dropping update');
          return;
        }

        const sanitizedStep = sanitizeInput(step);
        const clampedProgress = Math.max(0, Math.min(100, progress)); // Bounds checking

        if (context && !validateContext(context)) {
          console.warn(
            `SSE: Invalid progress context "${context}". Falling back to basic progress.`
          );
          context = undefined; // Fallback to basic progress
        }

        // Size validation and performance optimization - prevent memory exhaustion
        const totalMessageSize = (sanitizedStep.length + (customMessage || '').length) * 2;
        const MAX_MESSAGE_SIZE = 10000; // 10KB limit per message
        const PERFORMANCE_THRESHOLD = 50000; // 50KB per second rate limit

        if (totalMessageSize > MAX_MESSAGE_SIZE) {
          console.warn(`SSE: Message too large (${totalMessageSize} bytes), truncating`);
          const maxCustomLength = Math.floor((MAX_MESSAGE_SIZE - sanitizedStep.length * 2) / 2);
          customMessage = customMessage?.substring(0, Math.max(0, maxCustomLength - 3)) + '...';
        }

        // Performance monitoring - detect if we're overwhelming the client
        // Note: Throttling logic would be implemented here for high-throughput scenarios

        if (context) {
          sendEnhancedProgress(
            send,
            sanitizedStep,
            clampedProgress,
            context,
            customMessage ? sanitizeInput(customMessage) : undefined
          );
        } else {
          const sanitizedMessage = customMessage ? sanitizeInput(customMessage) : undefined;
          send({
            event: 'progress',
            data: {
              step: sanitizedStep,
              progress: clampedProgress,
              message: sanitizedMessage,
              timestamp: new Date().toISOString(),
            },
          });
        }
      } catch (error) {
        console.error('Failed to send progress:', error);
        // Attempt recovery by sending error status
        try {
          send({
            event: 'error',
            data: {
              code: 'STREAM_ERROR',
              message: 'Progress update failed',
              timestamp: new Date().toISOString(),
            },
          });
        } catch (recoveryError) {
          console.error('Failed to send error recovery:', recoveryError);
          // If recovery fails, close the stream to prevent cascading failures
          close();
        }
      }
    },
    sendStatus: (status: string, message?: string) => {
      try {
        const sanitizedStatus = sanitizeInput(status);
        const sanitizedMessage = message ? sanitizeInput(message) : undefined;
        send({
          event: 'status',
          data: {
            status: sanitizedStatus,
            message: sanitizedMessage,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to send status:', error);
      }
    },
    sendComplete: (result: unknown) => {
      try {
        send({ event: 'complete', data: { result, timestamp: new Date().toISOString() } });
      } catch (error) {
        console.error('Failed to send completion:', error);
      } finally {
        close();
      }
    },
    sendError: (error: { code: string; message: string }) => {
      try {
        const sanitizedError = {
          code: sanitizeInput(error.code),
          message: sanitizeInput(error.message),
          timestamp: new Date().toISOString(),
          canRetry: connectionAttempts < MAX_RECONNECT_ATTEMPTS,
        };
        send({ event: 'error', data: sanitizedError });

        // Implement automatic reconnection for transient errors
        if (sanitizedError.canRetry && ['NETWORK_ERROR', 'TIMEOUT'].includes(error.code)) {
          connectionAttempts++;
          reconnectTimeout = setTimeout(
            () => {
              send({
                event: 'reconnecting',
                data: { attempt: connectionAttempts, timestamp: new Date().toISOString() },
              });
              // Reconnection logic would be handled by the client
            },
            Math.min(BASE_RECONNECT_DELAY * Math.pow(2, connectionAttempts), MAX_RECONNECT_DELAY)
          );
        } else {
          close();
        }
      } catch (sendError) {
        console.error('Failed to send error:', sendError);
        close();
      }
    },
    close: () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      close();
    },
  };
}
