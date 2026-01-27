/**
 * OLYMPUS 2.0 - Agent Lifecycle Runtime Gate
 * Version 8.0.0
 * Runtime gate preventing execution of non-ACTIVE agents
 */

import { AgentLifecycleState } from './contract';
import { IAgentLifecycleStore } from './store';

/**
 * LIFECYCLE EXECUTION DENIED ERROR
 *
 * Thrown when agent execution is denied by lifecycle gate.
 * Contains agentId, state, and reason for denial.
 */
export class LifecycleExecutionDenied extends Error {
  constructor(
    public readonly agentId: string,
    public readonly lifecycleState: AgentLifecycleState,
    public readonly reason: string
  ) {
    super(`Lifecycle execution denied for agent ${agentId}: ${reason}`);
    this.name = 'LifecycleExecutionDenied';
  }
}

/**
 * RUNTIME GATE INTERFACE
 *
 * Contract for lifecycle state validation before agent execution.
 * Implementers enforce execution rules defined below.
 */
export interface IAgentLifecycleGate {
  /**
   * Assert agent is executable
   *
   * Fetches lifecycle record and validates state.
   * Throws LifecycleExecutionDenied if agent cannot execute.
   *
   * @param agentId - Agent identifier to validate
   * @throws LifecycleExecutionDenied if state !== ACTIVE
   * @throws Error if lifecycle record not found
   * @throws Error if store access fails
   */
  assertExecutable(agentId: string): Promise<void>;
}

/**
 * ENFORCEMENT RULES
 *
 * These rules are ENFORCED BY IMPLEMENTER, not by this interface.
 * Contract defines WHAT must be enforced, not HOW.
 *
 * RULE 1: FETCH LIFECYCLE RECORD VIA IAGENTLIFECYCLESTORE
 * - gate.fetch() MUST use injected store instance
 * - gate.fetch() MUST call store.get(agentId)
 * - No direct database access (go through store abstraction)
 *
 * RULE 2: IF STATE !== ACTIVE → THROW LIFECYCLEEXECUTIONDENIED
 * - CREATED: Cannot execute (not yet registered)
 * - REGISTERED: Cannot execute (not yet activated)
 * - SUSPENDED: Cannot execute (temporarily disabled)
 * - RETIRED: Cannot execute (terminating is irreversible)
 * - Only ACTIVE: Execute allowed
 *
 * RULE 3: RETIRED OR SUSPENDED IS ALWAYS DENY
 * - RETIRED: Terminal state, no transitions from RETIRED exist
 * - SUSPENDED: Requires explicit reactivation before execution
 * - Both states MUST throw LifecycleExecutionDenied
 * - No exceptions, no bypasses
 *
 * RULE 4: MISSING RECORD = DENY (SECURE BY DEFAULT)
 * - If store.get(agentId) returns null → throw Error
 * - Deny rather than allow execution of unknown agent
 * - Security: Unknown agents default to DENY
 *
 * RULE 5: GATE MUST BE EXECUTED BEFORE GOVERNEDTOOLEXECUTIONGATE
 * - Agent execution workflow MUST call lifecycle gate FIRST
 * - Lifecycle gate PASS → proceed to GovernedToolExecutionGate
 * - Lifecycle gate FAIL → halt execution immediately
 * - No tool execution allowed without passing lifecycle gate
 * - This is REQUIRED gating order, not optional
 *
 * RULE 6: ZERO MUTATION
 * - No writes to store
 * - No updates to lifecycle state
 * - No side effects beyond throwing
 * - Pure read-only validation
 * - Deterministic behavior (same input = same output/error)
 *
 * ENFORCEMENT RESPONSIBILITY:
 * - These rules are NOT enforced by this interface
 * - Implementers of IAgentLifecycleGate MUST enforce these rules
 * - Governance runtime MUST reject operations violating these rules
 * - Seal invariant MUST fail if lifecycle gate rules are violated
 */
