/**
 * OLYMPUS 2.0 - Agent Lifecycle Persistence
 * Version 8.0.0
 * Storage layer for agent lifecycle records
 */

import { AgentLifecycleRecord, AgentLifecycleState, AgentLifecycleTransition } from '../contract';

/**
 * STORAGE INTERFACE
 * 
 * Contract for lifecycle record persistence.
 * Implementers must enforce persistence rules defined below.
 */
export interface IAgentLifecycleStore {
  /**
   * Create new lifecycle record
   * 
   * @param record - Lifecycle record to persist
   * @throws Error if record with agentId already exists
   */
  create(record: AgentLifecycleRecord): Promise<void>;

  /**
   * Update existing lifecycle record
   * 
   * @param record - Lifecycle record with updated state
   * @throws Error if transition is illegal or record is RETIRED
   */
  update(record: AgentLifecycleRecord): Promise<void>;

  /**
   * Get lifecycle record for agent
   * 
   * @param agentId - Agent identifier
   * @returns Lifecycle record or null if not found
   */
  get(agentId: string): Promise<AgentLifecycleRecord | null>;
}

/**
 * PERSISTENCE RULES
 * 
 * These rules are ENFORCED BY IMPLEMENTER, not by this interface.
 * Contract defines WHAT must be enforced, not HOW to enforce.
 * 
 * RULE 1: ONLY ONE RECORD PER AGENTID MAY EXIST
 * - create() MUST reject if record with same agentId already exists
 * - update() MUST modify existing record, not create duplicate
 * - get() MUST return at most one record (latest)
 * 
 * RULE 2: RETIRED RECORDS ARE IMMUTABLE
 * - Once currentState = RETIRED, no further updates allowed
 * - update() MUST reject if input record.currentState = RETIRED
 * - update() MUST reject if existing record.currentState = RETIRED
 * - RETIRED is terminal state - type system prevents further transitions
 * 
 * RULE 3: CURRENTSTATE MUST MATCH LAST PERSISTED TRANSITION
 * - update() MUST validate transition is legal per AgentLifecycleTransition type
 * - Transition {from, to} must match existing.currentState → new.currentState
 * - Illegal transitions MUST be rejected (throw error or return failure)
 * - Type system only allows 5 specific transitions - all others are compile-time impossible
 * 
 * RULE 4: UPDATE() MUST REJECT ILLEGAL TRANSITIONS
 * - Caller may attempt illegal transition (compile-time type circumvention)
 * - update() MUST validate transition before persisting
 * - Illegal transition = not in AgentLifecycleTransition union
 * - Reject with descriptive error indicating illegal from→to
 * 
 * ENFORCEMENT RESPONSIBILITY:
 * - These rules are NOT enforced by this interface
 * - Implementers of IAgentLifecycleStore MUST enforce these rules
 * - Governance runtime MUST reject operations violating these rules
 * - Seal invariant MUST fail if lifecycle invariants are violated
 */
