/**
 * OLYMPUS 2.0 - Agent Lifecycle Authority Interface
 * Version 8.0.0
 * Authoritative interface for lifecycle transition authority
 */

import { AgentLifecycleState, AgentLifecycleTransition } from '../contract';
import { IAgentLifecycleStore } from '../store';
import type { ILedgerStore } from '../../ledger/types';
import { TransitionRequest, TransitionResult, LifecycleTransitionError } from './types';

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
   *
   * @param agentId - Agent identifier
   * @returns Array of AgentLifecycleState representing legal transitions
   */
  listAllowedTransitions(agentId: string): AgentLifecycleState[];
}

/**
 * ENFORCEMENT RULES
 *
 * These rules are ENFORCED BY IMPLEMENTER, not by this interface.
 * Contract defines WHAT must be enforced, not HOW.
 *
 * RULE 1: NO OTHER MODULE MAY WRITE LIFECYCLE STATE
 * - Runtime gate remains READ-ONLY
 * - Store is ONLY accessed via this authority
 * - Direct store updates are FORBIDDEN
 * - All state changes go through requestTransition()
 *
 * RULE 2: MISSING AGENT = DENY
 * - If agent record not found → transition denied
 * - Default to DENY, not allow
 * - Secure by design (unknown agents don't execute)
 *
 * RULE 3: RETIRED IS TERMINAL (NO EXIT)
 * - No transitions from RETIRED are legal per contract
 * - validateTransition() must return false for any fromState=RETIRED
 * - requestTransition() must throw for any attempt to transition from RETIRED
 * - Terminal state is IRREVERSIBLE
 *
 * RULE 4: ALL TRANSITIONS REQUIRE EXPLICIT REASON + AUTHORITY
 * - reason is REQUIRED (not optional in request)
 * - requestedBy is REQUIRED (not optional in request)
 * - Deny requests without complete context
 *
 * RULE 5: WRITE EVERY TRANSITION TO GOVERNANCE LEDGER
 * - requestTransition() MUST append to ledger (via injected ILedgerStore)
 * - Ledger entry must include: agentId, fromState, toState, requestedBy, reason
 * - Ledger entry type: 'LIFECYCLE_TRANSITION'
 * - Audit trail is REQUIRED for all lifecycle operations
 *
 * RULE 6: DETERMINISTIC, NO SIDE EFFECTS
 * - Same input = same output/error
 * - No external API calls
 * - No business logic
 * - No logging beyond what store/ledger require
 * - Pure state machine enforcement
 *
 * ENFORCEMENT RESPONSIBILITY:
 * - These rules are NOT enforced by this interface
 * - Implementers of IAgentLifecycleAuthority MUST enforce these rules
 * - Governance runtime MUST reject operations violating these rules
 * - Seal invariant MUST fail if lifecycle authority rules are violated
 */
