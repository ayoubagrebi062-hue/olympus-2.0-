/**
 * OLYMPUS 10X - Handoff Router
 *
 * LLM-driven agent routing with confidence scoring.
 * Implements neural routing with fallback to rule-based decisions.
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import {
  THRESHOLDS,
  TIMEOUTS,
  createRequestId,
  log,
  metrics,
  events,
  EVENT_TYPES,
  HandoffChainDepthError,
  HandoffCircuitOpenError,
  HandoffDecisionError,
} from '@/lib/core';
import type { AgentId, HandoffContext, HandoffDecision, HandoffResult } from '@/lib/core';
import type {
  HandoffRouterConfig,
  AgentCapabilities,
  RoutingDecision,
  HandoffExecutionOptions,
  HandoffExecutionResult,
  HandoffChain,
  HandoffHop,
  IHandoffRouter,
  CircuitBreakerState,
} from './types';
import { CircuitBreaker, createCircuitBreaker } from './circuit-breaker';
import { ContextCompressor, createContextCompressor } from './compressor';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: HandoffRouterConfig = {
  defaultConfidenceThreshold: THRESHOLDS.HANDOFF_CONFIDENCE,
  maxChainDepth: THRESHOLDS.MAX_HANDOFF_CHAIN_DEPTH,
  defaultCompression: 'semantic',
  circuitBreaker: {
    failureThreshold: THRESHOLDS.CIRCUIT_BREAKER_FAILURES,
    successThreshold: THRESHOLDS.CIRCUIT_BREAKER_SUCCESSES,
    resetTimeoutMs: TIMEOUTS.CIRCUIT_BREAKER_RESET_MS,
    handoffTimeoutMs: TIMEOUTS.HANDOFF_DECISION_MS,
  },
  agentRegistry: new Map(),
  useLLMRouting: true,
  fallbackToRules: true,
};

// ============================================================================
// ROUTING PATTERNS (Rule-Based Fallback)
// ============================================================================

/**
 * Keyword patterns for rule-based routing.
 */
const ROUTING_PATTERNS: Map<string, RegExp[]> = new Map([
  [
    'frontend-agent',
    [
      /\b(react|vue|angular|svelte|ui|ux|component|styling|css|tailwind|design)\b/i,
      /\b(button|form|modal|dropdown|animation|responsive)\b/i,
    ],
  ],
  [
    'backend-agent',
    [
      /\b(api|database|server|endpoint|rest|graphql|auth|authentication)\b/i,
      /\b(crud|query|mutation|middleware|controller|service)\b/i,
    ],
  ],
  [
    'devops-agent',
    [
      /\b(deploy|docker|kubernetes|ci\/cd|pipeline|infrastructure)\b/i,
      /\b(nginx|aws|azure|gcp|terraform|ansible)\b/i,
    ],
  ],
  [
    'testing-agent',
    [
      /\b(test|spec|jest|vitest|cypress|playwright|e2e|unit|integration)\b/i,
      /\b(mock|stub|fixture|coverage|assertion)\b/i,
    ],
  ],
  [
    'security-agent',
    [
      /\b(security|vulnerability|xss|csrf|injection|auth|encryption)\b/i,
      /\b(sanitize|validate|token|jwt|oauth|permissions)\b/i,
    ],
  ],
]);

// ============================================================================
// HANDOFF ROUTER IMPLEMENTATION
// ============================================================================

export class HandoffRouter implements IHandoffRouter {
  private config: HandoffRouterConfig;
  private circuitBreaker: CircuitBreaker;
  private compressor: ContextCompressor;
  private chains: Map<string, HandoffChain>;

  constructor(config: Partial<HandoffRouterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.circuitBreaker = createCircuitBreaker(this.config.circuitBreaker);
    this.compressor = createContextCompressor({
      strategy: this.config.defaultCompression,
    });
    this.chains = new Map();
  }

  /**
   * Evaluate whether a handoff should occur.
   */
  async evaluate(
    context: HandoffContext,
    currentAgent: AgentId,
    output: unknown,
    input: unknown
  ): Promise<RoutingDecision> {
    const startTime = Date.now();

    log.debug('Evaluating handoff', {
      currentAgent,
      chainDepth: context.chainDepth,
    });

    // Check chain depth
    if (context.chainDepth >= this.config.maxChainDepth) {
      throw new HandoffChainDepthError(context.chainDepth, this.config.maxChainDepth);
    }

    // Check circuit breaker for current agent
    if (!this.circuitBreaker.canExecute(currentAgent)) {
      log.warn('Circuit open for agent', { currentAgent });
      return this.createNoHandoffDecision('Circuit breaker open for current agent', startTime);
    }

    let decision: RoutingDecision;

    // Try LLM routing first
    if (this.config.useLLMRouting) {
      try {
        decision = await this.evaluateWithLLM(context, currentAgent, output, input, startTime);
        if (decision.shouldHandoff) {
          return decision;
        }
      } catch (error) {
        log.warn('LLM routing failed, falling back to rules', {
          error: error instanceof Error ? error.message : String(error),
        });

        if (!this.config.fallbackToRules) {
          throw error;
        }
      }
    }

    // Fall back to rule-based routing
    decision = this.evaluateWithRules(context, currentAgent, output, input, startTime);

    return decision;
  }

  /**
   * Execute a handoff.
   */
  async execute(
    decision: RoutingDecision,
    context: HandoffContext,
    options?: HandoffExecutionOptions
  ): Promise<HandoffExecutionResult> {
    const startTime = Date.now();
    const timings = {
      routing: decision.decisionTimeMs,
      compression: 0,
      execution: 0,
    };

    // Validate decision
    if (!decision.shouldHandoff || !decision.targetAgent) {
      throw new HandoffDecisionError('Cannot execute handoff without target agent');
    }

    // Check circuit breaker (unless skipped)
    if (!options?.skipCircuitBreaker && !this.circuitBreaker.canExecute(decision.targetAgent)) {
      throw new HandoffCircuitOpenError(TIMEOUTS.CIRCUIT_BREAKER_RESET_MS);
    }

    // Check confidence threshold
    const threshold = options?.confidenceThreshold ?? this.config.defaultConfidenceThreshold;
    if (!options?.force && decision.confidence < threshold) {
      throw new HandoffDecisionError(
        `Confidence ${decision.confidence.toFixed(2)} below threshold ${threshold}`
      );
    }

    try {
      // Compress context
      const compressionStart = Date.now();
      const compressedContext = await this.compressor.compress(context, {
        strategy: options?.compression ?? this.config.defaultCompression,
      });
      timings.compression = Date.now() - compressionStart;

      // Create/update chain
      const chain = this.getOrCreateChain(context);
      const hop: HandoffHop = {
        hopNumber: chain.hops.length,
        fromAgent: context.sourceAgent,
        toAgent: decision.targetAgent,
        confidence: decision.confidence,
        reason: decision.reasoning,
        durationMs: 0, // Will be updated after execution
        timestamp: new Date(),
        contextSize: compressedContext.compressedSize,
      };

      // Execute handoff (in production, this would call the target agent)
      const executionStart = Date.now();
      const result = await this.executeHandoffToAgent(
        decision.targetAgent,
        compressedContext.content,
        context,
        options?.timeoutMs ?? TIMEOUTS.HANDOFF_DECISION_MS
      );
      timings.execution = Date.now() - executionStart;

      // Update hop duration
      hop.durationMs = timings.execution;
      chain.hops.push(hop);
      chain.depth = chain.hops.length;
      chain.totalTimeMs += hop.durationMs;

      // Record success
      this.circuitBreaker.recordSuccess(decision.targetAgent);

      // Emit event
      events.emit(EVENT_TYPES.HANDOFF_EXECUTED, {
        fromAgent: context.sourceAgent,
        toAgent: decision.targetAgent,
        confidence: decision.confidence,
        chainDepth: chain.depth,
      });

      // Record metrics
      metrics.duration('handoffs.execute', Date.now() - startTime, {
        fromAgent: context.sourceAgent as string,
        toAgent: decision.targetAgent as string,
      });

      const executionResult: HandoffExecutionResult = {
        success: result.success,
        response: result.response,
        sourceAgent: context.sourceAgent,
        targetAgent: decision.targetAgent,
        durationMs: Date.now() - startTime,
        decision,
        compressedContext,
        circuitState: this.circuitBreaker.getState(decision.targetAgent).state,
        totalTimeMs: Date.now() - startTime,
        timing: timings,
      };

      log.info('Handoff executed successfully', {
        fromAgent: context.sourceAgent,
        toAgent: decision.targetAgent,
        totalTimeMs: executionResult.totalTimeMs,
      });

      return executionResult;
    } catch (error) {
      // Record failure
      this.circuitBreaker.recordFailure(decision.targetAgent);

      log.error('Handoff execution failed', error as Error, {
        targetAgent: decision.targetAgent,
      });

      throw error;
    }
  }

  /**
   * Register an agent.
   */
  registerAgent(capabilities: AgentCapabilities): void {
    this.config.agentRegistry.set(capabilities.agentId, capabilities);

    log.info('Agent registered', {
      agentId: capabilities.agentId,
      capabilities: capabilities.capabilities,
    });
  }

  /**
   * Unregister an agent.
   */
  unregisterAgent(agentId: AgentId): boolean {
    const removed = this.config.agentRegistry.delete(agentId);

    if (removed) {
      log.info('Agent unregistered', { agentId });
    }

    return removed;
  }

  /**
   * Get agent capabilities.
   */
  getAgent(agentId: AgentId): AgentCapabilities | undefined {
    return this.config.agentRegistry.get(agentId);
  }

  /**
   * Get all registered agents.
   */
  getAllAgents(): AgentCapabilities[] {
    return Array.from(this.config.agentRegistry.values());
  }

  /**
   * Get circuit breaker state for an agent.
   */
  getCircuitState(agentId: AgentId): CircuitBreakerState {
    return this.circuitBreaker.getState(agentId);
  }

  /**
   * Reset circuit breaker for an agent.
   */
  resetCircuit(agentId: AgentId): void {
    this.circuitBreaker.reset(agentId);
  }

  /**
   * Get current handoff chain.
   */
  getChain(chainId: string): HandoffChain | undefined {
    return this.chains.get(chainId);
  }

  /**
   * Destroy router and cleanup resources.
   */
  destroy(): void {
    this.circuitBreaker.destroy();
    this.chains.clear();
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private async evaluateWithLLM(
    context: HandoffContext,
    currentAgent: AgentId,
    output: unknown,
    input: unknown,
    startTime: number
  ): Promise<RoutingDecision> {
    // In production, this would call an LLM to make the routing decision
    // For now, we simulate LLM-based routing with enhanced rule matching

    log.debug('Simulating LLM routing evaluation');

    const availableAgents = this.getAvailableAgents(currentAgent);

    if (availableAgents.length === 0) {
      return this.createNoHandoffDecision('No available agents', startTime);
    }

    // Analyze output to determine if handoff is needed
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
    const combinedContext = `${context.currentGoal} ${outputStr} ${inputStr}`;

    // Score each available agent
    const scoredAgents = availableAgents.map(agent => {
      const score = this.scoreAgentMatch(agent, combinedContext);
      return { agent, score };
    });

    // Sort by score
    scoredAgents.sort((a, b) => b.score - a.score);

    const bestMatch = scoredAgents[0];

    // Check if best match is good enough
    if (bestMatch.score < THRESHOLDS.HANDOFF_CONFIDENCE) {
      return this.createNoHandoffDecision(
        `Best match score ${bestMatch.score.toFixed(2)} below threshold`,
        startTime
      );
    }

    // Check if handoff is actually needed (don't handoff to same type)
    if (this.isSameAgentType(currentAgent, bestMatch.agent.agentId)) {
      return this.createNoHandoffDecision('Current agent can handle this task', startTime);
    }

    const decision: RoutingDecision = {
      shouldHandoff: true,
      targetAgent: bestMatch.agent.agentId,
      confidence: bestMatch.score,
      reasoning: `Task matches ${bestMatch.agent.name} capabilities: ${bestMatch.agent.capabilities.slice(0, 3).join(', ')}`,
      compressedContext: '',
      preserveHistory: true,
      routingMethod: 'llm',
      alternatives: scoredAgents.slice(1, 4).map(({ agent, score }) => ({
        agentId: agent.agentId,
        confidence: score,
        reason: `Matches: ${agent.capabilities.slice(0, 2).join(', ')}`,
      })),
      decisionTimeMs: Date.now() - startTime,
      matchedCapabilities: bestMatch.agent.capabilities.filter(cap =>
        combinedContext.toLowerCase().includes(cap.toLowerCase())
      ),
    };

    return decision;
  }

  private evaluateWithRules(
    context: HandoffContext,
    currentAgent: AgentId,
    output: unknown,
    input: unknown,
    startTime: number
  ): RoutingDecision {
    log.debug('Using rule-based routing evaluation');

    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
    const combinedContext = `${context.currentGoal} ${outputStr} ${inputStr}`;

    // Check patterns
    for (const [agentId, patterns] of ROUTING_PATTERNS) {
      // Skip if this is the current agent
      if (this.isSameAgentType(currentAgent, agentId as AgentId)) {
        continue;
      }

      // Check if agent is available
      const agent = this.config.agentRegistry.get(agentId as AgentId);
      if (!agent?.available) {
        continue;
      }

      // Check circuit breaker
      if (!this.circuitBreaker.canExecute(agentId as AgentId)) {
        continue;
      }

      // Count pattern matches
      let matchCount = 0;
      for (const pattern of patterns) {
        if (pattern.test(combinedContext)) {
          matchCount++;
        }
      }

      // Calculate confidence based on match count
      if (matchCount > 0) {
        const confidence = Math.min(0.5 + matchCount * 0.15, 0.95);

        if (confidence >= THRESHOLDS.HANDOFF_CONFIDENCE) {
          return {
            shouldHandoff: true,
            targetAgent: agentId as AgentId,
            confidence,
            reasoning: `Rule-based match: ${matchCount} patterns matched for ${agentId}`,
            compressedContext: '',
            preserveHistory: true,
            routingMethod: 'rules',
            alternatives: [],
            decisionTimeMs: Date.now() - startTime,
            matchedCapabilities: [],
          };
        }
      }
    }

    return this.createNoHandoffDecision('No rule matches found', startTime);
  }

  private createNoHandoffDecision(reason: string, startTime: number): RoutingDecision {
    return {
      shouldHandoff: false,
      targetAgent: null,
      confidence: 0,
      reasoning: reason,
      compressedContext: '',
      preserveHistory: false,
      routingMethod: 'fallback',
      alternatives: [],
      decisionTimeMs: Date.now() - startTime,
      matchedCapabilities: [],
    };
  }

  private getAvailableAgents(excludeAgent: AgentId): AgentCapabilities[] {
    return Array.from(this.config.agentRegistry.values()).filter(agent => {
      // Exclude current agent type
      if (this.isSameAgentType(excludeAgent, agent.agentId)) {
        return false;
      }

      // Check availability
      if (!agent.available) {
        return false;
      }

      // Check load
      if (agent.currentLoad >= agent.maxConcurrent) {
        return false;
      }

      // Check circuit breaker
      if (!this.circuitBreaker.canExecute(agent.agentId)) {
        return false;
      }

      return true;
    });
  }

  private scoreAgentMatch(agent: AgentCapabilities, context: string): number {
    let score = 0;
    const contextLower = context.toLowerCase();

    // Check capabilities
    for (const capability of agent.capabilities) {
      if (contextLower.includes(capability.toLowerCase())) {
        score += 0.2;
      }
    }

    // Check trigger keywords
    for (const keyword of agent.triggerKeywords) {
      if (contextLower.includes(keyword.toLowerCase())) {
        score += 0.15;
      }
    }

    // Apply priority bonus
    score += agent.priority * 0.05;

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  private isSameAgentType(agent1: AgentId, agent2: AgentId): boolean {
    // Extract agent type from ID (e.g., "frontend-agent-1" -> "frontend")
    const type1 = (agent1 as string).split('-')[0];
    const type2 = (agent2 as string).split('-')[0];
    return type1 === type2;
  }

  private getOrCreateChain(context: HandoffContext): HandoffChain {
    // Use trace ID as chain ID if available
    const chainId = (context as any).traceId || createRequestId();

    let chain = this.chains.get(chainId);
    if (!chain) {
      chain = {
        chainId,
        requestId: (context as any).requestId || createRequestId(),
        traceId: chainId as any,
        tenantId: (context as any).tenantId,
        hops: [],
        depth: 0,
        maxDepth: this.config.maxChainDepth,
        totalTimeMs: 0,
        status: 'active',
      };
      this.chains.set(chainId, chain);
    }

    return chain;
  }

  private async executeHandoffToAgent(
    targetAgent: AgentId,
    compressedContext: string,
    originalContext: HandoffContext,
    timeoutMs: number
  ): Promise<HandoffResult> {
    // In production, this would actually execute the target agent
    // For now, return a simulated success

    log.debug('Executing handoff to agent', {
      targetAgent,
      contextSize: compressedContext.length,
    });

    // Simulate some execution time
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, Math.min(100, timeoutMs / 10)));
    const durationMs = Date.now() - startTime;

    return {
      success: true,
      sourceAgent: originalContext.sourceAgent,
      targetAgent,
      durationMs,
      response: {
        message: `Handoff to ${targetAgent} completed`,
        context: compressedContext,
      },
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new handoff router instance.
 */
export function createHandoffRouter(config?: Partial<HandoffRouterConfig>): HandoffRouter {
  return new HandoffRouter(config);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DEFAULT_CONFIG as DEFAULT_ROUTER_CONFIG, ROUTING_PATTERNS };
