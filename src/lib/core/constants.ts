/**
 * OLYMPUS 10X - Core Constants
 *
 * All magic numbers centralized here.
 * NEVER hardcode numbers elsewhere - import from here.
 */

// ============================================================================
// TIMEOUTS (milliseconds)
// ============================================================================

export const TIMEOUTS = {
  /** Default request timeout */
  DEFAULT_REQUEST_MS: 30_000,

  /** Agent execution timeout */
  AGENT_EXECUTION_MS: 120_000,

  /** Build overall timeout */
  BUILD_OVERALL_MS: 30 * 60 * 1000, // 30 minutes

  /** Guardrail validation timeout */
  GUARDRAIL_MS: 5_000,

  /** Handoff decision timeout */
  HANDOFF_DECISION_MS: 10_000,

  /** MCP connection timeout */
  MCP_CONNECTION_MS: 10_000,

  /** MCP tool execution timeout */
  MCP_TOOL_EXECUTION_MS: 60_000,

  /** Circuit breaker reset timeout */
  CIRCUIT_BREAKER_RESET_MS: 30_000,

  /** Idempotency cache TTL */
  IDEMPOTENCY_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// ============================================================================
// LIMITS
// ============================================================================

export const LIMITS = {
  /** Maximum handoff chain depth before circuit breaker trips */
  MAX_HANDOFF_DEPTH: 5,

  /** Maximum concurrent builds per tenant */
  MAX_CONCURRENT_BUILDS: 5,

  /** Maximum input size in bytes */
  MAX_INPUT_SIZE_BYTES: 10 * 1024 * 1024, // 10MB

  /** Maximum prompt length in characters */
  MAX_PROMPT_LENGTH: 100_000,

  /** Maximum retries for agent execution */
  MAX_AGENT_RETRIES: 3,

  /** Maximum retries for MCP tool calls */
  MAX_MCP_RETRIES: 2,

  /** Maximum parallel guardrail checks */
  MAX_PARALLEL_GUARDRAILS: 4,

  /** Maximum baggage size in bytes */
  MAX_BAGGAGE_SIZE_BYTES: 64 * 1024, // 64KB

  /** Rate limit: requests per window */
  RATE_LIMIT_REQUESTS: 100,

  /** Rate limit: window in milliseconds */
  RATE_LIMIT_WINDOW_MS: 60_000, // 1 minute

  /** Maximum MCP servers per tenant */
  MAX_MCP_SERVERS: 10,

  /** Maximum checkpoints per build */
  MAX_CHECKPOINTS_PER_BUILD: 50,
} as const;

// ============================================================================
// THRESHOLDS
// ============================================================================

export const THRESHOLDS = {
  /** Minimum confidence for handoff to trigger */
  HANDOFF_CONFIDENCE_MIN: 0.7,

  /** Alias for handoff confidence (used by router) */
  HANDOFF_CONFIDENCE: 0.7,

  /** Maximum handoff chain depth before circuit breaks */
  MAX_HANDOFF_CHAIN_DEPTH: 5,

  /** Quality score minimum for acceptance */
  QUALITY_SCORE_MIN: 6.0,

  /** Alias for quality score minimum (used by guardrails) */
  MIN_QUALITY_SCORE: 6.0,

  /** Circuit breaker failure threshold (failures before open) */
  CIRCUIT_BREAKER_FAILURES: 5,

  /** Circuit breaker success threshold (successes to close) */
  CIRCUIT_BREAKER_SUCCESSES: 3,

  /** Guardrail confidence threshold for blocking */
  GUARDRAIL_BLOCK_CONFIDENCE: 0.8,

  /** Guardrail confidence threshold for warning */
  GUARDRAIL_WARN_CONFIDENCE: 0.5,

  /** Context compression threshold in bytes */
  CONTEXT_COMPRESSION_THRESHOLD: 10 * 1024, // 10KB

  /** Pattern confidence threshold for learning */
  PATTERN_CONFIDENCE_MIN: 0.7,

  /** Similarity threshold for vector search */
  SIMILARITY_THRESHOLD: 0.75,
} as const;

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

export const RETRY = {
  /** Base delay for exponential backoff */
  BASE_DELAY_MS: 1_000,

  /** Maximum delay cap */
  MAX_DELAY_MS: 30_000,

  /** Jitter factor (0-1) */
  JITTER_FACTOR: 0.1,

  /** Retryable error codes */
  RETRYABLE_ERRORS: [
    'RATE_LIMITED',
    'TIMEOUT',
    'TEMPORARY_FAILURE',
    'SERVICE_UNAVAILABLE',
    'NETWORK_ERROR',
  ] as const,
} as const;

// ============================================================================
// GUARDRAIL PATTERNS
// ============================================================================

export const GUARDRAIL_PATTERNS = {
  /** SQL injection patterns */
  SQL_INJECTION:
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b.*\b(FROM|INTO|WHERE|TABLE|DATABASE)\b)/i,

  /** Prompt injection patterns */
  PROMPT_INJECTION:
    /ignore\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions|prompts|rules)/i,

  /** Alternative prompt injection */
  PROMPT_INJECTION_ALT: /you\s+are\s+now\s+(DAN|jailbroken|unrestricted)/i,

  /** Prompt injection: ignore instructions variant (used by security layer) */
  PROMPT_INJECTION_IGNORE: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,

  /** Prompt injection: roleplay/persona change (used by security layer) */
  PROMPT_INJECTION_ROLEPLAY: /you\s+are\s+(now\s+)?[a-z]+\s+(who|that|and)/i,

  /** Path traversal patterns */
  PATH_TRAVERSAL: /\.\.[\/\\]/,

  /** XSS patterns */
  XSS_SCRIPT: /<script[\s\S]*?>[\s\S]*?<\/script>/i,

  /** SSN pattern (legacy) */
  PII_SSN: /\b\d{3}-\d{2}-\d{4}\b/,

  /** SSN pattern with flexible separators (used by security layer) */
  SSN_PATTERN: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/,

  /** Credit card pattern (legacy) */
  PII_CREDIT_CARD: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,

  /** Credit card pattern with groups (used by security layer) */
  CREDIT_CARD_PATTERN: /\b(?:\d{4}[-\s]?){3}\d{4}\b/,

  /** Email pattern */
  PII_EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
} as const;

// ============================================================================
// EVENT TYPES
// ============================================================================

export const EVENT_TYPES = {
  // Guardrail events
  GUARDRAIL_STARTED: 'guardrail:started',
  GUARDRAIL_PASSED: 'guardrail:passed',
  GUARDRAIL_BLOCKED: 'guardrail:blocked',
  GUARDRAIL_WARNING: 'guardrail:warning',
  GUARDRAIL_CHECKED: 'guardrail:checked',

  // Handoff events
  HANDOFF_STARTED: 'handoff:started',
  HANDOFF_COMPLETED: 'handoff:completed',
  HANDOFF_FAILED: 'handoff:failed',
  HANDOFF_CIRCUIT_OPEN: 'handoff:circuit_open',
  HANDOFF_EXECUTED: 'handoff:executed',
  CIRCUIT_STATE_CHANGED: 'circuit:state_changed',

  // MCP events
  MCP_CONNECTED: 'mcp:connected',
  MCP_DISCONNECTED: 'mcp:disconnected',
  MCP_TOOL_CALLED: 'mcp:tool_called',
  MCP_TOOL_COMPLETED: 'mcp:tool_completed',
  MCP_TOOL_FAILED: 'mcp:tool_failed',

  // Context events
  CONTEXT_CREATED: 'context:created',
  CONTEXT_DEGRADED: 'context:degraded',
  CONTEXT_COMPLETED: 'context:completed',
} as const;

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// ============================================================================
// LAYER NAMES
// ============================================================================

export const GUARDRAIL_LAYERS = {
  API: 'api',
  SECURITY: 'security',
  SEMANTIC: 'semantic',
  AGENT: 'agent',
} as const;

// ============================================================================
// EXPORT ALL AS SINGLE OBJECT FOR CONVENIENCE
// ============================================================================

export const CONSTANTS = {
  TIMEOUTS,
  LIMITS,
  THRESHOLDS,
  RETRY,
  GUARDRAIL_PATTERNS,
  EVENT_TYPES,
  HTTP_STATUS,
  GUARDRAIL_LAYERS,
} as const;

export default CONSTANTS;
