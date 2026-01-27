/**
 * OLYMPUS 2.0 - Agent Lifecycle Authority Types
 * Version 8.0.0
 * Authoritative types for lifecycle transition authority
 */

import { AgentLifecycleState, AgentLifecycleTransition } from '../contract';

/**
 * AGENT LIFECYCLE AUTHORITY INTERFACE
 *
 * SINGLE AUTHORITATIVE ENTITY for lifecycle state changes.
 * ONLY this component may write lifecycle state in sealed system.
 */
export interface IAgentLifecycleAuthority {
  /**
   * Request lifecycle state transition
   *
   * Validates transition, executes it if valid, appends to ledger.
   * Throws LifecycleTransitionError if transition is invalid.
   *
   * @param request - Complete transition request
   * @returns Transition result with new record
   * @throws LifecycleTransitionError if transition is illegal or agent is RETIRED
   * @throws Error if store or ledger access fails
   */
  requestTransition(request: TransitionRequest): Promise<TransitionResult>;

  /**
   * Validate transition without executing
   *
   * Checks if transition is legal per contract.
   * Does NOT write to store or ledger.
   *
   * @param agentId - Agent identifier
   * @param fromState - Current state
   * @param toState - Target state
   * @returns true if transition is in AgentLifecycleTransition union
   */
  validateTransition(
    agentId: string,
    fromState: AgentLifecycleState,
    toState: AgentLifecycleState
  ): boolean;

  /**
   * List allowed transitions from current state
   *
   * Returns array of legal next states for given agent.
   * Empty array if current state is RETIRED (terminal).
   */
  listAllowedTransitions(agentId: string): Promise<AgentLifecycleState[]>;
}

/**
 * TRANSITION REQUEST
 *
 * Request to change agent lifecycle state.
 * All fields are required (no optional).
 */
export interface TransitionRequest {
  /**
   * Agent identifier
   */
  agentId: string;

  /**
   * Current state (must match actual stored state)
   */
  fromState: AgentLifecycleState;

  /**
   * Target state (must be legal transition)
   */
  toState: AgentLifecycleState;

  /**
   * Human-readable reason for transition
   */
  reason: string;

  /**
   * Authority identifier requesting transition
   */
  requestedBy: string;
}

/**
 * TRANSITION RESULT
 *
 * Result of lifecycle transition request.
 */
export interface TransitionResult {
  /**
   * Transition succeeded
   */
  success: boolean;

  /**
   * New lifecycle record (if success)
   * Import from store to avoid circular dependency
   */
  record?: {
    agentId: string;
    currentState: AgentLifecycleState;
    since: Date;
    previousState?: AgentLifecycleState;
    changedBy: string;
    reason?: string;
  };

  /**
   * Error message (if failed)
   */
  error?: string;
}

/**
 * LIFECYCLE TRANSITION ERROR
 *
 * Typed, explicit error for failed transitions.
 * Always contains agentId, transition, and reason.
 */
export class LifecycleTransitionError extends Error {
  constructor(
    public readonly agentId: string,
    public readonly fromState: AgentLifecycleState,
    public readonly toState: AgentLifecycleState,
    public readonly reason: string
  ) {
    super(
      `Lifecycle transition denied for agent ${agentId}: ` +
        `${fromState} → ${toState}. Reason: ${reason}`
    );
    this.name = 'LifecycleTransitionError';
  }
}
