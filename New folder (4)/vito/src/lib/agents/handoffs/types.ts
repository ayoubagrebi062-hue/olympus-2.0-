/**
 * OLYMPUS 10X - Handoff Types
 *
 * Type definitions for the LLM-driven agent handoff system.
 * Implements neural routing with confidence scoring.
 */

import type {
  AgentId,
  RequestId,
  TraceId,
  TenantId,
  HandoffConfig,
  HandoffCallbacks,
  HandoffContext,
  HandoffMessage,
  HandoffDecision,
  HandoffResult,
  HandoffError,
} from '@/lib/core';

// ============================================================================
// RE-EXPORT CORE TYPES
// ============================================================================

export type {
  AgentId,
  HandoffConfig,
  HandoffCallbacks,
  HandoffContext,
  HandoffMessage,
  HandoffDecision,
  HandoffResult,
  HandoffError,
};

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Circuit breaker states.
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration.
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;

  /** Number of successes in half-open to close circuit */
  successThreshold: number;

  /** Time in ms before attempting half-open */
  resetTimeoutMs: number;

  /** Timeout for individual handoff attempts */
  handoffTimeoutMs: number;
}

/**
 * Circuit breaker state tracking.
 */
export interface CircuitBreakerState {
  /** Current state */
  state: CircuitState;

  /** Consecutive failures */
  failures: number;

  /** Consecutive successes (in half-open) */
  successes: number;

  /** Last failure timestamp */
  lastFailureAt?: Date;

  /** Last state change timestamp */
  lastStateChangeAt: Date;

  /** Next retry allowed at (when open) */
  nextRetryAt?: Date;
}

// ============================================================================
// CONTEXT COMPRESSION
// ============================================================================

/**
 * Compression strategies.
 */
export type CompressionStrategy = 'none' | 'semantic' | 'neural';

/**
 * Compressed context result.
 */
export interface CompressedContext {
  /** The compressed content */
  content: string;

  /** Original size in bytes */
  originalSize: number;

  /** Compressed size in bytes */
  compressedSize: number;

  /** Compression ratio (0-1) */
  ratio: number;

  /** Strategy used */
  strategy: CompressionStrategy;

  /** Key information preserved */
  preservedKeys: string[];

  /** Compression metadata */
  metadata?: {
    tokensOriginal?: number;
    tokensCompressed?: number;
    compressionTime?: number;
  };
}

/**
 * Context compressor configuration.
 */
export interface CompressorConfig {
  /** Target size in bytes */
  targetSizeBytes: number;

  /** Maximum size in bytes */
  maxSizeBytes: number;

  /** Preserve these keys in full */
  preserveKeys: string[];

  /** Compression strategy */
  strategy: CompressionStrategy;
}

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

/**
 * Handoff router configuration.
 */
export interface HandoffRouterConfig {
  /** Default confidence threshold */
  defaultConfidenceThreshold: number;

  /** Maximum chain depth */
  maxChainDepth: number;

  /** Default compression strategy */
  defaultCompression: CompressionStrategy;

  /** Circuit breaker config */
  circuitBreaker: CircuitBreakerConfig;

  /** Registered agents and their capabilities */
  agentRegistry: Map<AgentId, AgentCapabilities>;

  /** Use LLM for routing decisions */
  useLLMRouting: boolean;

  /** Fallback to rule-based when LLM fails */
  fallbackToRules: boolean;
}

/**
 * Agent capabilities for routing.
 */
export interface AgentCapabilities {
  /** Agent identifier */
  agentId: AgentId;

  /** Human-readable name */
  name: string;

  /** Description of what this agent does */
  description: string;

  /** Capabilities/skills */
  capabilities: string[];

  /** Keywords that trigger this agent */
  triggerKeywords: string[];

  /** Priority (higher = preferred) */
  priority: number;

  /** Whether agent is available */
  available: boolean;

  /** Maximum concurrent handoffs */
  maxConcurrent: number;

  /** Current load */
  currentLoad: number;
}

// ============================================================================
// ROUTING DECISION
// ============================================================================

/**
 * Extended handoff decision with routing details.
 */
export interface RoutingDecision extends HandoffDecision {
  /** Routing method used */
  routingMethod: 'llm' | 'rules' | 'fallback';

  /** Alternative targets considered */
  alternatives: Array<{
    agentId: AgentId;
    confidence: number;
    reason: string;
  }>;

  /** Time taken to make decision */
  decisionTimeMs: number;

  /** Matched capabilities */
  matchedCapabilities: string[];
}

// ============================================================================
// HANDOFF EXECUTION
// ============================================================================

/**
 * Handoff execution options.
 */
export interface HandoffExecutionOptions {
  /** Override confidence threshold */
  confidenceThreshold?: number;

  /** Override compression strategy */
  compression?: CompressionStrategy;

  /** Additional context to include */
  additionalContext?: Record<string, unknown>;

  /** Timeout for the handoff */
  timeoutMs?: number;

  /** Skip circuit breaker check */
  skipCircuitBreaker?: boolean;

  /** Force handoff even if below threshold */
  force?: boolean;
}

/**
 * Handoff execution result with details.
 */
export interface HandoffExecutionResult extends HandoffResult {
  /** Routing decision that triggered this */
  decision: RoutingDecision;

  /** Compressed context used */
  compressedContext: CompressedContext;

  /** Circuit breaker state after handoff */
  circuitState: CircuitState;

  /** Total execution time */
  totalTimeMs: number;

  /** Breakdown of time spent */
  timing: {
    routing: number;
    compression: number;
    execution: number;
  };
}

// ============================================================================
// HANDOFF CHAIN
// ============================================================================

/**
 * Handoff chain tracking.
 */
export interface HandoffChain {
  /** Chain identifier */
  chainId: string;

  /** Request that started the chain */
  requestId: RequestId;

  /** Trace ID for the chain */
  traceId: TraceId;

  /** Tenant ID */
  tenantId?: TenantId;

  /** Chain of handoffs */
  hops: HandoffHop[];

  /** Current depth */
  depth: number;

  /** Maximum allowed depth */
  maxDepth: number;

  /** Total time so far */
  totalTimeMs: number;

  /** Chain status */
  status: 'active' | 'completed' | 'failed' | 'depth_exceeded';
}

/**
 * Single hop in a handoff chain.
 */
export interface HandoffHop {
  /** Hop number (0-indexed) */
  hopNumber: number;

  /** Source agent */
  fromAgent: AgentId;

  /** Target agent */
  toAgent: AgentId;

  /** Confidence of this handoff */
  confidence: number;

  /** Reason for handoff */
  reason: string;

  /** Time taken for this hop */
  durationMs: number;

  /** Timestamp */
  timestamp: Date;

  /** Context size after compression */
  contextSize: number;
}

// ============================================================================
// ROUTER INTERFACE
// ============================================================================

/**
 * Handoff router interface.
 */
export interface IHandoffRouter {
  /**
   * Evaluate whether a handoff should occur.
   */
  evaluate(
    context: HandoffContext,
    currentAgent: AgentId,
    output: unknown,
    input: unknown
  ): Promise<RoutingDecision>;

  /**
   * Execute a handoff.
   */
  execute(
    decision: RoutingDecision,
    context: HandoffContext,
    options?: HandoffExecutionOptions
  ): Promise<HandoffExecutionResult>;

  /**
   * Register an agent.
   */
  registerAgent(capabilities: AgentCapabilities): void;

  /**
   * Unregister an agent.
   */
  unregisterAgent(agentId: AgentId): boolean;

  /**
   * Get agent capabilities.
   */
  getAgent(agentId: AgentId): AgentCapabilities | undefined;

  /**
   * Get all registered agents.
   */
  getAllAgents(): AgentCapabilities[];

  /**
   * Get circuit breaker state for an agent.
   */
  getCircuitState(agentId: AgentId): CircuitBreakerState;

  /**
   * Reset circuit breaker for an agent.
   */
  resetCircuit(agentId: AgentId): void;

  /**
   * Get current handoff chain.
   */
  getChain(chainId: string): HandoffChain | undefined;
}

// ============================================================================
// COMPRESSOR INTERFACE
// ============================================================================

/**
 * Context compressor interface.
 */
export interface IContextCompressor {
  /**
   * Compress context for handoff.
   */
  compress(
    context: HandoffContext,
    config?: Partial<CompressorConfig>
  ): Promise<CompressedContext>;

  /**
   * Decompress context.
   */
  decompress(compressed: CompressedContext): HandoffContext;

  /**
   * Estimate compression result without compressing.
   */
  estimate(context: HandoffContext): {
    originalSize: number;
    estimatedSize: number;
    strategy: CompressionStrategy;
  };
}

// ============================================================================
// CIRCUIT BREAKER INTERFACE
// ============================================================================

/**
 * Circuit breaker interface.
 */
export interface ICircuitBreaker {
  /**
   * Check if circuit allows request.
   */
  canExecute(agentId: AgentId): boolean;

  /**
   * Record a successful handoff.
   */
  recordSuccess(agentId: AgentId): void;

  /**
   * Record a failed handoff.
   */
  recordFailure(agentId: AgentId): void;

  /**
   * Get current state.
   */
  getState(agentId: AgentId): CircuitBreakerState;

  /**
   * Reset circuit.
   */
  reset(agentId: AgentId): void;

  /**
   * Get all circuit states.
   */
  getAllStates(): Map<AgentId, CircuitBreakerState>;
}
