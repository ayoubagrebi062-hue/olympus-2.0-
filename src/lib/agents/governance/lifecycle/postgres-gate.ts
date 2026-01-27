/**
 * OLYMPUS 2.0 - Agent Lifecycle Postgres Gate
 * Version 8.0.0
 * PostgreSQL implementation of lifecycle runtime gate
 */

import { IAgentLifecycleGate, LifecycleExecutionDenied } from './gate';
import { IAgentLifecycleStore } from './store';
import { AgentLifecycleState } from './contract';

/**
 * POSTGRES AGENT LIFECYCLE GATE
 *
 * Implements IAgentLifecycleGate with PostgreSQL store backend.
 * Enforces all execution rules defined in gate.ts.
 *
 * ZERO RUNTIME LOGIC:
 * - No writes
 * - No updates
 * - No side effects beyond throwing
 * - Deterministic, read-only validation
 */
export class PostgresAgentLifecycleGate implements IAgentLifecycleGate {
  constructor(private readonly store: IAgentLifecycleStore) {}

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
  async assertExecutable(agentId: string): Promise<void> {
    const record = await this.store.get(agentId);

    if (!record) {
      throw new Error(
        `Lifecycle record not found for agent ${agentId}. ` + `Unknown agent cannot execute.`
      );
    }

    if (record.currentState !== AgentLifecycleState.ACTIVE) {
      const reasonMap = {
        [AgentLifecycleState.CREATED]: 'Agent is not yet registered',
        [AgentLifecycleState.REGISTERED]: 'Agent is registered but not yet activated',
        [AgentLifecycleState.SUSPENDED]: 'Agent is suspended',
        [AgentLifecycleState.RETIRED]: 'Agent is retired and cannot execute',
        [AgentLifecycleState.ACTIVE]: 'Agent is active',
      };

      const reason = reasonMap[record.currentState] || 'Unknown state';

      throw new LifecycleExecutionDenied(agentId, record.currentState, reason);
    }

    return;
  }
}
