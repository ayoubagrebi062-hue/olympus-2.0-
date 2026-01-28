/**
 * OLYMPUS-Specific Tracing Utilities
 *
 * High-level tracing functions designed for OLYMPUS domain concepts:
 * builds, phases, agents, providers, checkpoints, etc.
 */

import { Span, SpanStatusCode } from '@opentelemetry/api';
import { withSpan, addSpanEvent, setSpanAttributes, setSpanAttribute } from './utils';
import { OlympusSpanAttributes, SPAN_EVENTS } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// BUILD TRACING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trace an entire build execution
 * This is the root span for all build operations
 */
export async function traceBuild<T>(
  buildId: string,
  buildName: string,
  userId: string,
  tier: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(
    `build:${buildName}`,
    'build',
    async span => {
      addSpanEvent(SPAN_EVENTS.BUILD_STARTED, {
        build_id: buildId,
        build_name: buildName,
        user_id: userId,
        tier: tier,
      });

      try {
        const result = await fn(span);

        addSpanEvent(SPAN_EVENTS.BUILD_COMPLETED, {
          build_id: buildId,
          success: true,
        });

        return result;
      } catch (error) {
        addSpanEvent(SPAN_EVENTS.BUILD_FAILED, {
          build_id: buildId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    {
      'olympus.build.id': buildId,
      'olympus.build.name': buildName,
      'olympus.build.user_id': userId,
      'olympus.build.tier': tier,
    }
  );
}

/**
 * Record build completion metrics
 */
export function recordBuildMetrics(
  totalDuration: number,
  totalTokens: number,
  totalCost: number,
  agentCount: number
): void {
  addSpanEvent('build.metrics', {
    duration_ms: totalDuration,
    total_tokens: totalTokens,
    total_cost: totalCost,
    agent_count: agentCount,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE TRACING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trace a build phase
 */
export async function tracePhase<T>(
  phaseName: string,
  phaseIndex: number,
  totalPhases: number,
  buildId: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(
    `phase:${phaseName}`,
    'phase',
    async span => {
      addSpanEvent(SPAN_EVENTS.PHASE_STARTED, {
        phase_name: phaseName,
        phase_index: phaseIndex,
        total_phases: totalPhases,
      });

      try {
        const result = await fn(span);

        addSpanEvent(SPAN_EVENTS.PHASE_COMPLETED, {
          phase_name: phaseName,
          success: true,
        });

        return result;
      } catch (error) {
        addSpanEvent(SPAN_EVENTS.PHASE_FAILED, {
          phase_name: phaseName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    {
      'olympus.phase.name': phaseName,
      'olympus.phase.index': phaseIndex,
      'olympus.phase.total': totalPhases,
      'olympus.build.id': buildId,
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT TRACING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trace agent execution
 */
export async function traceAgent<T>(
  agentId: string,
  agentTier: string,
  buildId: string,
  dependencies: string[],
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(
    `agent:${agentId}`,
    'agent',
    async span => {
      addSpanEvent(SPAN_EVENTS.AGENT_STARTED, {
        agent_id: agentId,
        agent_tier: agentTier,
        dependencies: dependencies.join(','),
      });

      try {
        const result = await fn(span);

        addSpanEvent(SPAN_EVENTS.AGENT_COMPLETED, {
          agent_id: agentId,
          success: true,
        });

        return result;
      } catch (error) {
        addSpanEvent(SPAN_EVENTS.AGENT_FAILED, {
          agent_id: agentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    {
      'olympus.agent.id': agentId,
      'olympus.agent.tier': agentTier,
      'olympus.agent.dependencies': dependencies.join(','),
      'olympus.build.id': buildId,
    }
  );
}

/**
 * Record agent token usage and cost
 */
export function recordAgentTokens(inputTokens: number, outputTokens: number, cost: number): void {
  setSpanAttributes({
    'olympus.provider.tokens.input': inputTokens,
    'olympus.provider.tokens.output': outputTokens,
    'olympus.provider.cost': cost,
  });

  addSpanEvent(SPAN_EVENTS.AGENT_TOKENS, {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    cost: cost,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER TRACING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trace AI provider call
 */
export async function traceProviderCall<T>(
  providerName: string,
  model: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(
    `provider:${providerName}/${model}`,
    'provider',
    async span => {
      const startTime = Date.now();

      addSpanEvent(SPAN_EVENTS.PROVIDER_REQUEST, {
        provider: providerName,
        model: model,
        timestamp: startTime,
      });

      try {
        const result = await fn(span);

        addSpanEvent(SPAN_EVENTS.PROVIDER_RESPONSE, {
          provider: providerName,
          latency_ms: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        addSpanEvent(SPAN_EVENTS.PROVIDER_ERROR, {
          provider: providerName,
          error: error instanceof Error ? error.message : 'Unknown error',
          latency_ms: Date.now() - startTime,
        });
        throw error;
      }
    },
    {
      'olympus.provider.name': providerName,
      'olympus.provider.model': model,
    }
  );
}

/**
 * Record provider response details
 */
export function recordProviderResponse(
  inputTokens: number,
  outputTokens: number,
  cost: number,
  latencyMs: number
): void {
  setSpanAttributes({
    'olympus.provider.tokens.input': inputTokens,
    'olympus.provider.tokens.output': outputTokens,
    'olympus.provider.cost': cost,
    'olympus.provider.latency_ms': latencyMs,
  });

  addSpanEvent(SPAN_EVENTS.PROVIDER_METRICS, {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    cost: cost,
    latency_ms: latencyMs,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// RETRY/ERROR TRACING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trace a retry attempt
 */
export async function traceRetry<T>(
  attemptNumber: number,
  maxAttempts: number,
  reason: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(
    `retry:attempt_${attemptNumber}`,
    'retry',
    async span => {
      addSpanEvent(SPAN_EVENTS.RETRY_STARTED, {
        attempt: attemptNumber,
        max_attempts: maxAttempts,
        reason: reason,
      });

      try {
        const result = await fn(span);

        addSpanEvent(SPAN_EVENTS.RETRY_SUCCEEDED, {
          attempt: attemptNumber,
        });

        return result;
      } catch (error) {
        if (attemptNumber >= maxAttempts) {
          addSpanEvent(SPAN_EVENTS.RETRY_EXHAUSTED, {
            total_attempts: attemptNumber,
            final_error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        throw error;
      }
    },
    {
      'olympus.execution.retries': attemptNumber,
    }
  );
}

/**
 * Record circuit breaker state change
 */
export function recordCircuitBreakerState(
  state: 'closed' | 'open' | 'half-open',
  name: string
): void {
  setSpanAttribute('olympus.execution.circuit_breaker', `${name}:${state}`);

  addSpanEvent(SPAN_EVENTS.CIRCUIT_BREAKER_STATE, {
    name: name,
    state: state,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKPOINT TRACING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trace checkpoint operations
 */
export async function traceCheckpoint<T>(
  operation: 'save' | 'load' | 'verify',
  buildId: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const eventName =
    operation === 'save'
      ? SPAN_EVENTS.CHECKPOINT_SAVE
      : operation === 'load'
        ? SPAN_EVENTS.CHECKPOINT_LOAD
        : SPAN_EVENTS.CHECKPOINT_VERIFY;

  return withSpan(
    `checkpoint:${operation}`,
    'checkpoint',
    async span => {
      addSpanEvent(`${eventName}.started`, {
        build_id: buildId,
        operation: operation,
      });

      const result = await fn(span);

      addSpanEvent(`${eventName}.completed`, {
        build_id: buildId,
        operation: operation,
      });

      return result;
    },
    {
      'olympus.build.id': buildId,
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION TRACING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trace input/output validation
 */
export async function traceValidation<T>(
  type: 'input' | 'output',
  schemaName: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(`validation:${type}:${schemaName}`, 'validation', fn);
}

/**
 * Record validation success
 */
export function recordValidationSuccess(type: 'input' | 'output', schemaName: string): void {
  addSpanEvent(SPAN_EVENTS.VALIDATION_PASSED, {
    type: type,
    schema: schemaName,
  });
}

/**
 * Record validation failure
 */
export function recordValidationFailure(
  type: 'input' | 'output',
  schemaName: string,
  errors: string[]
): void {
  addSpanEvent(SPAN_EVENTS.VALIDATION_FAILED, {
    type: type,
    schema: schemaName,
    error_count: errors.length,
    errors: errors.slice(0, 5).join('; '), // Limit to first 5 errors
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDOFF TRACING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trace agent handoff
 */
export async function traceHandoff<T>(
  fromAgent: string,
  toAgent: string,
  buildId: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(
    `handoff:${fromAgent}->${toAgent}`,
    'handoff',
    async span => {
      addSpanEvent('handoff.started', {
        from_agent: fromAgent,
        to_agent: toAgent,
        build_id: buildId,
      });

      const result = await fn(span);

      addSpanEvent('handoff.completed', {
        from_agent: fromAgent,
        to_agent: toAgent,
      });

      return result;
    },
    {
      'olympus.build.id': buildId,
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION TRACING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trace cognitive session operations
 */
export async function traceSession<T>(
  operation: 'get' | 'update' | 'learn' | 'predict',
  userId: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return withSpan(
    `session:${operation}`,
    'session',
    async span => {
      addSpanEvent(`session.${operation}.started`, {
        user_id: userId,
      });

      const result = await fn(span);

      addSpanEvent(`session.${operation}.completed`, {
        user_id: userId,
      });

      return result;
    },
    {
      'olympus.session.user_id': userId,
    }
  );
}

/**
 * Record session expertise level
 */
export function recordSessionExpertise(
  userId: string,
  expertiseLevel: string,
  confidence: number
): void {
  setSpanAttributes({
    'olympus.session.user_id': userId,
    'olympus.session.expertise': expertiseLevel,
  });

  addSpanEvent('session.expertise', {
    user_id: userId,
    expertise_level: expertiseLevel,
    confidence: confidence,
  });
}
