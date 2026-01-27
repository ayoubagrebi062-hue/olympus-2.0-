/**
 * OLYMPUS 10X - Core Types
 *
 * Branded types and core interfaces for the 10X upgrade.
 * These types are used across Handoffs, Guardrails, and MCP.
 */

import type { GUARDRAIL_LAYERS } from './constants';

// ============================================================================
// BRANDED TYPES (Runtime-safe type differentiation)
// ============================================================================

/**
 * Branded type helper - creates nominal types from structural types
 */
type Brand<T, B> = T & { readonly __brand: B };

/** Unique request identifier */
export type RequestId = Brand<string, 'RequestId'>;

/** Distributed trace identifier (W3C format: 32 hex chars) */
export type TraceId = Brand<string, 'TraceId'>;

/** Span identifier (W3C format: 16 hex chars) */
export type SpanId = Brand<string, 'SpanId'>;

/** Agent identifier */
export type AgentId = Brand<string, 'AgentId'>;

/** Build identifier */
export type BuildId = Brand<string, 'BuildId'>;

/** Tenant identifier */
export type TenantId = Brand<string, 'TenantId'>;

/** Idempotency key for request deduplication */
export type IdempotencyKey = Brand<string, 'IdempotencyKey'>;

// ============================================================================
// BRAND CREATORS (Type-safe factories)
// ============================================================================

export function createRequestId(value?: string): RequestId {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return (value || `req_${timestamp}_${random}`) as RequestId;
}

export function createTraceId(value?: string): TraceId {
  if (value && value.length === 32) return value as TraceId;
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result as TraceId;
}

export function createSpanId(value?: string): SpanId {
  if (value && value.length === 16) return value as SpanId;
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result as SpanId;
}

export function createAgentId(value: string): AgentId {
  return value as AgentId;
}

export function createBuildId(value?: string): BuildId {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return (value || `build_${timestamp}_${random}`) as BuildId;
}

export function createTenantId(value: string): TenantId {
  return value as TenantId;
}

export function createIdempotencyKey(value: string): IdempotencyKey {
  return value as IdempotencyKey;
}

// ============================================================================
// GUARDRAIL TYPES
// ============================================================================

/** Guardrail action - graduated response levels */
export type GuardrailAction = 'allow' | 'warn' | 'block' | 'halt' | 'terminate';

/** Guardrail layer identifier */
export type GuardrailLayer = (typeof GUARDRAIL_LAYERS)[keyof typeof GUARDRAIL_LAYERS];

/** Result of a guardrail check */
export interface GuardrailResult {
  /** Action to take */
  action: GuardrailAction;

  /** Which layer triggered this result */
  layer: GuardrailLayer;

  /** Human-readable reason */
  reason: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Processing time in milliseconds */
  durationMs: number;

  /** Additional metadata */
  metadata?: {
    /** Detected patterns */
    detectedPatterns?: string[];

    /** PII types found */
    piiTypes?: string[];

    /** Injection type if detected */
    injectionType?: string;

    /** Tripwire that was triggered */
    tripwireName?: string;

    /** Request ID for tracing */
    requestId?: string;

    /** Additional custom metadata */
    [key: string]: unknown;
  };
}

/** Input for guardrail validation */
export interface GuardrailInput {
  /** The prompt/content to validate */
  prompt: string;

  /** Optional user ID for context */
  userId?: string;

  /** Optional tenant ID */
  tenantId?: TenantId;

  /** Target agent if known */
  targetAgent?: AgentId;

  /** Agent ID for agent-specific validation */
  agentId?: AgentId;

  /** Maximum tokens limit for validation */
  maxTokens?: number;

  /** Request ID for tracing */
  requestId?: string;

  /** Additional context */
  context?: Record<string, unknown>;

  /** Metadata for logging/tracking */
  metadata?: Record<string, unknown>;
}

/** Tripwire configuration */
export interface TripwireConfig {
  /** Unique name for this tripwire */
  name: string;

  /** Pattern to match (regex or function) */
  pattern: RegExp | ((input: string) => boolean);

  /** Action to take when triggered */
  action: GuardrailAction;

  /** Priority (lower = runs first) */
  priority: number;

  /** Roles that can bypass this tripwire */
  bypassRoles?: string[];

  /** Whether this tripwire is enabled */
  enabled?: boolean;
}

// ============================================================================
// HANDOFF TYPES
// ============================================================================

/** Handoff configuration for an agent */
export interface HandoffConfig {
  /** Agents that can receive handoffs from this agent */
  allowedTargets: AgentId[];

  /** Minimum confidence to trigger handoff */
  confidenceThreshold: number;

  /** Maximum chain depth before circuit breaker */
  maxChainDepth: number;

  /** Context compression strategy */
  contextCompression: 'none' | 'semantic' | 'neural';

  /** Optional callbacks */
  callbacks?: HandoffCallbacks;
}

/** Handoff lifecycle callbacks */
export interface HandoffCallbacks {
  onHandoffStart?: (ctx: HandoffContext) => void | Promise<void>;
  onHandoffComplete?: (result: HandoffResult) => void | Promise<void>;
  onHandoffFailed?: (error: HandoffError) => void | Promise<void>;
}

/** Context passed during handoff */
export interface HandoffContext {
  /** Source agent initiating handoff */
  sourceAgent: AgentId;

  /** Conversation/message history */
  conversationHistory: HandoffMessage[];

  /** Current goal being pursued */
  currentGoal: string;

  /** Attributes preserved across handoffs */
  attributes: Map<string, unknown>;

  /** Current depth in handoff chain */
  chainDepth: number;

  /** Circuit breaker state */
  circuitState: 'closed' | 'open' | 'half-open';

  /** Request context */
  requestId: RequestId;
  traceId: TraceId;
}

/** Message in handoff history */
export interface HandoffMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentId?: AgentId;
}

/** Decision from handoff router */
export interface HandoffDecision {
  /** Whether to perform handoff */
  shouldHandoff: boolean;

  /** Target agent (if handoff) */
  targetAgent: AgentId | null;

  /** Confidence in this decision (0-1) */
  confidence: number;

  /** LLM's reasoning for the decision */
  reasoning: string;

  /** Compressed context for target agent */
  compressedContext: string;

  /** Whether to preserve conversation history */
  preserveHistory: boolean;
}

/** Result of a completed handoff */
export interface HandoffResult {
  /** Whether handoff succeeded */
  success: boolean;

  /** Source agent */
  sourceAgent: AgentId;

  /** Target agent */
  targetAgent: AgentId;

  /** Duration in milliseconds */
  durationMs: number;

  /** Output from target agent */
  output?: unknown;

  /** Response data from handoff execution */
  response?: unknown;

  /** Error if failed */
  error?: string;
}

/** Handoff error */
export interface HandoffError {
  /** Error code */
  code: string;

  /** Human-readable message */
  message: string;

  /** Source agent */
  sourceAgent: AgentId;

  /** Target agent (if known) */
  targetAgent?: AgentId;

  /** Whether retry is possible */
  recoverable: boolean;
}

// ============================================================================
// MCP TYPES
// ============================================================================

/** MCP transport type */
export type MCPTransport = 'stdio' | 'sse' | 'websocket' | 'http';

/** MCP server configuration */
export interface MCPServerConfig {
  /** Unique name for this server */
  name: string;

  /** Transport mechanism */
  transport: MCPTransport;

  /** Command to run (for stdio) */
  command?: string;

  /** URL (for http/sse/websocket) */
  url?: string;

  /** Command arguments */
  args?: string[];

  /** Environment variables */
  env?: Record<string, string>;

  /** Server capabilities */
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };

  /** Connection timeout */
  timeoutMs?: number;

  /** Retry configuration */
  retry?: {
    maxRetries: number;
    backoffMs: number;
  };
}

/** MCP tool definition */
export interface MCPTool {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** JSON Schema for input */
  inputSchema: Record<string, unknown>;

  /** Server this tool belongs to */
  serverName: string;
}

/** MCP tool call result */
export interface MCPToolResult {
  /** Whether call succeeded */
  success: boolean;

  /** Result data */
  data?: unknown;

  /** Error if failed */
  error?: string;

  /** Duration in milliseconds */
  durationMs: number;
}

/** Unified tool (built-in or MCP) */
export interface UnifiedTool {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** JSON Schema for input */
  inputSchema: Record<string, unknown>;

  /** Source: built-in or MCP */
  source: 'builtin' | 'mcp';

  /** MCP server name (if source is mcp) */
  mcpServer?: string;

  /** Execute the tool */
  execute: (args: unknown) => Promise<unknown>;
}

// ============================================================================
// OPERATIONAL CONTEXT TYPES
// ============================================================================

/** Degradation level for graceful degradation */
export type DegradationLevel = 'none' | 'reduced' | 'minimal' | 'offline';

/** Degradation strategy */
export interface DegradationStrategy {
  /** Level of degradation */
  degradationLevel: DegradationLevel;

  /** Condition that triggers this degradation */
  triggeredBy: (error: unknown) => boolean;

  /** Fallback action to take */
  fallbackAction: () => Promise<unknown>;
}

/** Operational context options */
export interface OperationalContextOptions {
  /** Request ID (generated if not provided) */
  requestId?: RequestId;

  /** Trace ID (generated if not provided) */
  traceId?: TraceId;

  /** Span ID (generated if not provided) */
  spanId?: SpanId;

  /** Parent span ID for distributed tracing */
  parentSpanId?: SpanId;

  /** User ID */
  userId?: string;

  /** Tenant ID */
  tenantId?: TenantId;

  /** Build ID */
  buildId?: BuildId;

  /** Idempotency key for deduplication */
  idempotencyKey?: IdempotencyKey;

  /** Initial metadata */
  metadata?: Record<string, string>;

  /** Initial baggage (propagated context) */
  baggage?: Map<string, unknown>;
}

/** Idempotency check result */
export interface IdempotencyCheckResult {
  /** Whether a cached result exists */
  cached: boolean;

  /** Cached result (if exists) */
  result?: unknown;

  /** When the result was cached */
  cachedAt?: Date;
}

// ============================================================================
// COMMON TYPES
// ============================================================================

/** Generic result type */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/** Async result type */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/** Callback for events */
export type EventCallback<T = unknown> = (event: T) => void | Promise<void>;

/** Unsubscribe function */
export type Unsubscribe = () => void;
