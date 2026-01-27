/**
 * OLYMPUS 10X - Circuit Breaker
 *
 * Self-healing circuit breaker to prevent handoff loops and cascading failures.
 * Implements the circuit breaker pattern with automatic recovery.
 */

import { THRESHOLDS, TIMEOUTS, log, metrics, events, EVENT_TYPES } from '@/lib/core';
import type { AgentId } from '@/lib/core';
import type {
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerState,
  ICircuitBreaker,
} from './types';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: THRESHOLDS.CIRCUIT_BREAKER_FAILURES,
  successThreshold: THRESHOLDS.CIRCUIT_BREAKER_SUCCESSES,
  resetTimeoutMs: TIMEOUTS.CIRCUIT_BREAKER_RESET_MS,
  handoffTimeoutMs: TIMEOUTS.HANDOFF_DECISION_MS,
};

// ============================================================================
// CIRCUIT BREAKER IMPLEMENTATION
// ============================================================================

export class CircuitBreaker implements ICircuitBreaker {
  private config: CircuitBreakerConfig;
  private states: Map<AgentId, CircuitBreakerState>;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.states = new Map();

    // Periodic cleanup of stale states
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  /**
   * Check if circuit allows request to agent.
   */
  canExecute(agentId: AgentId): boolean {
    const state = this.getOrCreateState(agentId);

    switch (state.state) {
      case 'closed':
        return true;

      case 'open':
        // Check if we should transition to half-open
        if (state.nextRetryAt && new Date() >= state.nextRetryAt) {
          this.transitionTo(agentId, 'half-open');
          return true;
        }
        return false;

      case 'half-open':
        // Allow limited requests in half-open
        return true;

      default:
        return true;
    }
  }

  /**
   * Record a successful handoff.
   */
  recordSuccess(agentId: AgentId): void {
    const state = this.getOrCreateState(agentId);

    switch (state.state) {
      case 'closed':
        // Reset failure count on success
        state.failures = 0;
        break;

      case 'half-open':
        // Count successes in half-open
        state.successes++;
        if (state.successes >= this.config.successThreshold) {
          this.transitionTo(agentId, 'closed');
        }
        break;

      case 'open':
        // Shouldn't happen, but handle gracefully
        log.warn('Success recorded while circuit open', { agentId });
        break;
    }

    this.emitEvent(agentId, 'success', state);
  }

  /**
   * Record a failed handoff.
   */
  recordFailure(agentId: AgentId): void {
    const state = this.getOrCreateState(agentId);
    state.failures++;
    state.lastFailureAt = new Date();

    switch (state.state) {
      case 'closed':
        if (state.failures >= this.config.failureThreshold) {
          this.transitionTo(agentId, 'open');
        }
        break;

      case 'half-open':
        // Any failure in half-open goes back to open
        this.transitionTo(agentId, 'open');
        break;

      case 'open':
        // Already open, just update state
        break;
    }

    this.emitEvent(agentId, 'failure', state);
  }

  /**
   * Get current state for an agent.
   */
  getState(agentId: AgentId): CircuitBreakerState {
    return this.getOrCreateState(agentId);
  }

  /**
   * Reset circuit for an agent.
   */
  reset(agentId: AgentId): void {
    const newState = this.createInitialState();
    this.states.set(agentId, newState);

    log.info('Circuit breaker reset', { agentId });
    this.emitEvent(agentId, 'reset', newState);
  }

  /**
   * Get all circuit states.
   */
  getAllStates(): Map<AgentId, CircuitBreakerState> {
    return new Map(this.states);
  }

  /**
   * Cleanup resources.
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.states.clear();
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private getOrCreateState(agentId: AgentId): CircuitBreakerState {
    let state = this.states.get(agentId);
    if (!state) {
      state = this.createInitialState();
      this.states.set(agentId, state);
    }
    return state;
  }

  private createInitialState(): CircuitBreakerState {
    return {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastStateChangeAt: new Date(),
    };
  }

  private transitionTo(agentId: AgentId, newState: CircuitState): void {
    const state = this.getOrCreateState(agentId);
    const previousState = state.state;

    state.state = newState;
    state.lastStateChangeAt = new Date();

    switch (newState) {
      case 'closed':
        state.failures = 0;
        state.successes = 0;
        state.nextRetryAt = undefined;
        break;

      case 'open':
        state.successes = 0;
        state.nextRetryAt = new Date(Date.now() + this.config.resetTimeoutMs);
        break;

      case 'half-open':
        state.successes = 0;
        state.nextRetryAt = undefined;
        break;
    }

    log.info('Circuit breaker state transition', {
      agentId,
      from: previousState,
      to: newState,
      failures: state.failures,
      nextRetryAt: state.nextRetryAt?.toISOString(),
    });

    // Emit state change event
    events.emit(EVENT_TYPES.CIRCUIT_STATE_CHANGED, {
      agentId,
      previousState,
      newState,
      failures: state.failures,
    });

    // Record metric
    metrics.count('circuit_breaker.transition', 1, {
      agentId: agentId as string,
      from: previousState,
      to: newState,
    });
  }

  private emitEvent(
    agentId: AgentId,
    eventType: 'success' | 'failure' | 'reset',
    state: CircuitBreakerState
  ): void {
    metrics.count(`circuit_breaker.${eventType}`, 1, {
      agentId: agentId as string,
      state: state.state,
    });
  }

  private cleanup(): void {
    const now = Date.now();
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours

    for (const [agentId, state] of this.states) {
      // Remove closed circuits that haven't had activity in 24 hours
      if (
        state.state === 'closed' &&
        state.failures === 0 &&
        now - state.lastStateChangeAt.getTime() > staleThreshold
      ) {
        this.states.delete(agentId);
      }
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new circuit breaker instance.
 */
export function createCircuitBreaker(
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return new CircuitBreaker(config);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DEFAULT_CONFIG as DEFAULT_CIRCUIT_BREAKER_CONFIG };
