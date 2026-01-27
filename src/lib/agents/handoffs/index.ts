/**
 * OLYMPUS 10X - Handoffs Module
 *
 * Public exports for the LLM-driven agent handoff system.
 *
 * Usage:
 * ```typescript
 * import {
 *   HandoffRouter,
 *   createHandoffRouter,
 *   CircuitBreaker,
 *   ContextCompressor,
 * } from '@/lib/agents/handoffs';
 *
 * // Create router with default config
 * const router = createHandoffRouter();
 *
 * // Register agents
 * router.registerAgent({
 *   agentId: 'frontend-agent' as AgentId,
 *   name: 'Frontend Agent',
 *   description: 'Handles UI/UX tasks',
 *   capabilities: ['react', 'vue', 'css', 'tailwind'],
 *   triggerKeywords: ['component', 'styling', 'responsive'],
 *   priority: 1,
 *   available: true,
 *   maxConcurrent: 5,
 *   currentLoad: 0,
 * });
 *
 * // Evaluate handoff
 * const decision = await router.evaluate(context, currentAgent, output, input);
 *
 * // Execute if needed
 * if (decision.shouldHandoff) {
 *   const result = await router.execute(decision, context);
 * }
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Re-exported from core
  AgentId,
  HandoffConfig,
  HandoffCallbacks,
  HandoffContext,
  HandoffMessage,
  HandoffDecision,
  HandoffResult,
  HandoffError,

  // Circuit breaker types
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerState,
  ICircuitBreaker,

  // Compression types
  CompressionStrategy,
  CompressedContext,
  CompressorConfig,
  IContextCompressor,

  // Router types
  HandoffRouterConfig,
  AgentCapabilities,
  RoutingDecision,
  HandoffExecutionOptions,
  HandoffExecutionResult,

  // Chain types
  HandoffChain,
  HandoffHop,

  // Interface
  IHandoffRouter,
} from './types';

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

export {
  CircuitBreaker,
  createCircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './circuit-breaker';

// ============================================================================
// CONTEXT COMPRESSOR
// ============================================================================

export {
  ContextCompressor,
  createContextCompressor,
  DEFAULT_COMPRESSOR_CONFIG,
} from './compressor';

// ============================================================================
// HANDOFF ROUTER
// ============================================================================

export {
  HandoffRouter,
  createHandoffRouter,
  DEFAULT_ROUTER_CONFIG,
  ROUTING_PATTERNS,
} from './router';
