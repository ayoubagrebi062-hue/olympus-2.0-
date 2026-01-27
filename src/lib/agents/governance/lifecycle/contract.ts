/**
 * OLYMPUS 2.0 - Agent Lifecycle Contract
 * Version 8.0.0
 * Authoritative lifecycle contract for sealed governance system
 */

/**
 * 1. LIFECYCLE STATES
 *
 * Exact states for agent lifecycle. No additional states. No aliases. No flags.
 */
export enum AgentLifecycleState {
  CREATED = 'CREATED',
  REGISTERED = 'REGISTERED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  RETIRED = 'RETIRED',
}

/**
 * 2. LIFECYCLE TRANSITION TYPE
 *
 * Explicitly encodes valid state transitions.
 * All other transitions are IMPOSSIBLE by type design.
 *
 * Valid transitions:
 * - CREATED → REGISTERED (initial registration)
 * - REGISTERED → ACTIVE (activation)
 * - ACTIVE → SUSPENDED (temporary suspension)
 * - SUSPENDED → ACTIVE (reactivation)
 * - ACTIVE → RETIRED (terminal retirement)
 * - SUSPENDED → RETIRED (terminal retirement)
 */
export type AgentLifecycleTransition =
  | { from: AgentLifecycleState.CREATED; to: AgentLifecycleState.REGISTERED }
  | { from: AgentLifecycleState.REGISTERED; to: AgentLifecycleState.ACTIVE }
  | { from: AgentLifecycleState.ACTIVE; to: AgentLifecycleState.SUSPENDED }
  | { from: AgentLifecycleState.SUSPENDED; to: AgentLifecycleState.ACTIVE }
  | { from: AgentLifecycleState.ACTIVE; to: AgentLifecycleState.RETIRED }
  | { from: AgentLifecycleState.SUSPENDED; to: AgentLifecycleState.RETIRED };

/**
 * 3. LIFECYCLE RECORD
 *
 * Immutable record of state change.
 * Once created, record cannot be modified.
 */
export interface AgentLifecycleRecord {
  /**
   * Agent identifier from registry
   */
  agentId: string;
  /**
   * Current state after transition
   */
  currentState: AgentLifecycleState;
  /**
   * Timestamp when state became effective
   */
  since: Date;
  /**
   * Previous state before transition (undefined for CREATED)
   */
  previousState?: AgentLifecycleState;
  /**
   * Authority identifier that caused transition
   */
  changedBy: string;
  /**
   * Optional reason for transition
   */
  reason?: string;
}

/**
 * 4. LIFECYCLE AUTHORITY INTERFACE
 *
 * Contract for lifecycle management operations.
 * Implementers enforce lifecycle rules and auditability.
 */
export interface IAgentLifecycleAuthority {
  /**
   * Request lifecycle state transition
   *
   * @param agentId - Agent identifier
   * @param fromState - Current state
   * @param toState - Target state
   * @param reason - Reason for transition
   * @param requestedBy - Authority requesting transition
   * @returns Lifecycle record with new state
   * @throws LifecycleTransitionError if transition is illegal or agent is RETIRED
   */
  requestTransition(
    agentId: string,
    fromState: AgentLifecycleState,
    toState: AgentLifecycleState,
    reason: string,
    requestedBy: string
  ): Promise<AgentLifecycleRecord>;

  /**
   * Validate transition without executing
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
   * @param agentId - Agent identifier
   * @returns Array of AgentLifecycleState representing legal transitions
   */
  listAllowedTransitions(agentId: string): Promise<AgentLifecycleState[]>;
}

/**
 * 5. HARD INVARIANTS (documented as comments)
 *
 * These invariants are ENFORCED BY CALLER, not by this contract.
 * Contract defines WHAT must be enforced, not HOW.
 *
 * INVARIANT 1: RETIRED IS TERMINAL AND IRREVERSIBLE
 * - No transitions FROM RETIRED exist in AgentLifecycleTransition type
 * - Once RETIRED, agent remains RETIRED forever
 * - Type system prevents any transition from RETIRED
 *
 * INVARIANT 2: ONLY ACTIVE AGENTS MAY EXECUTE
 * - CREATED agents: Not yet registered, cannot execute
 * - REGISTERED agents: Not yet activated, cannot execute
 * - SUSPENDED agents: Temporarily disabled, cannot execute
 * - ACTIVE agents: Only state allowing execution
 * - RETIRED agents: Terminated, cannot execute
 * - Caller MUST check state === ACTIVE before allowing execution
 *
 * INVARIANT 3: LIFECYCLE CHECKS OCCUR BEFORE GOVERNANCE, LEASES, OR POLICY
 * - State validation is PREREQUISITE to all other governance operations
 * - If state check fails, ALL governance checks must be rejected
 * - Governance invariants, lease validation, policy enforcement ALL depend on valid lifecycle state
 * - Invalid state causes immediate rejection of all operations
 *
 * INVARIANT 4: ALL TRANSITIONS MUST BE LEDGER-AUDITABLE (but do NOT implement ledger)
 * - Every lifecycle change MUST create ledger entry
 * - Ledger entry MUST reference: agentId, fromState, toState
 * - Ledger entry MUST include: changedBy authority, reason
 * - Ledger entry MUST be IMMUTABLE (no updates, only appends)
 * - This contract does NOT implement ledger - CALLER must integrate with ledger
 * - Ledger audit trail is REQUIRED for all lifecycle operations
 */
