/**
 * OLYMPUS 2.0 - Agent Lifecycle Authority
 * Version 8.0.0
 * Authoritative implementation of lifecycle transition authority
 */

import {
  IAgentLifecycleAuthority,
  TransitionRequest,
  TransitionResult,
  LifecycleTransitionError,
} from './types';
import { IAgentLifecycleStore } from '../store';
import { AgentLifecycleState } from '../contract';
import type { ILedgerStore, GovernanceLedgerEntry } from '../../ledger/types';

/**
 * AGENT LIFECYCLE AUTHORITY
 *
 * SINGLE AUTHORITATIVE ENTITY for lifecycle state changes.
 * ONLY this component may write lifecycle state in sealed system.
 *
 * ZERO RUNTIME LOGIC:
 * - No execution checks
 * - No governance validation
 * - No side effects beyond store + ledger
 * - Deterministic state machine enforcement
 */
export class AgentLifecycleAuthority implements IAgentLifecycleAuthority {
  private readonly store: IAgentLifecycleStore;
  private readonly ledger: ILedgerStore;

  constructor(store: IAgentLifecycleStore, ledger: ILedgerStore) {
    this.store = store;
    this.ledger = ledger;
  }

  /**
   * Request lifecycle state transition
   *
   * Validates, executes, and audits transition.
   */
  async requestTransition(request: TransitionRequest): Promise<TransitionResult> {
    const existing = await this.store.get(request.agentId);

    if (!existing) {
      const error = 'Lifecycle record not found';
      return {
        success: false,
        error,
      };
    }

    const record = existing;

    if (record.currentState === AgentLifecycleState.RETIRED) {
      throw new LifecycleTransitionError(
        request.agentId,
        record.currentState,
        request.toState,
        'Cannot transition from RETIRED: terminal state is irreversible'
      );
    }

    if (!this.validateTransition(request.agentId, record.currentState, request.toState)) {
      throw new LifecycleTransitionError(
        request.agentId,
        record.currentState,
        request.toState,
        'Transition is not legal per lifecycle contract'
      );
    }

    const newRecord = {
      agentId: request.agentId,
      currentState: request.toState,
      since: new Date(),
      previousState: record.currentState,
      changedBy: request.requestedBy,
      reason: request.reason,
    };

    await this.store.update(newRecord);

    const ledgerEntry: GovernanceLedgerEntry = {
      buildId: 'lifecycle',
      agentId: request.agentId,
      actionType: 'IDENTITY_VERIFICATION',
      actionData: {
        passed: true,
        reason: `Lifecycle transition: ${request.reason}`,
        details: {
          fromState: record.currentState,
          toState: request.toState,
          authority: request.requestedBy,
        },
      },
      timestamp: new Date(),
      ledgerHash: '',
      previousHash: '',
      immutable: true,
    };

    await this.ledger.append(ledgerEntry);

    return {
      success: true,
      record: newRecord,
    };
  }

  /**
   * Validate transition without executing
   *
   * Checks if transition is legal per contract.
   * Does NOT write to store or ledger.
   */
  validateTransition(
    agentId: string,
    fromState: AgentLifecycleState,
    toState: AgentLifecycleState
  ): boolean {
    const validTransitions: Record<AgentLifecycleState, AgentLifecycleState[]> = {
      [AgentLifecycleState.CREATED]: [AgentLifecycleState.REGISTERED],
      [AgentLifecycleState.REGISTERED]: [AgentLifecycleState.ACTIVE],
      [AgentLifecycleState.ACTIVE]: [AgentLifecycleState.SUSPENDED, AgentLifecycleState.RETIRED],
      [AgentLifecycleState.SUSPENDED]: [AgentLifecycleState.ACTIVE, AgentLifecycleState.RETIRED],
      [AgentLifecycleState.RETIRED]: [],
    };

    return validTransitions[fromState]?.includes(toState) || false;
  }

  /**
   * List allowed transitions from current state
   *
   * Returns array of legal next states for given agent.
   * Empty array if current state is RETIRED (terminal).
   */
  async listAllowedTransitions(agentId: string): Promise<AgentLifecycleState[]> {
    const record = await this.store.get(agentId);

    if (!record) {
      return [];
    }

    const validTransitions: Record<AgentLifecycleState, AgentLifecycleState[]> = {
      [AgentLifecycleState.CREATED]: [AgentLifecycleState.REGISTERED],
      [AgentLifecycleState.REGISTERED]: [AgentLifecycleState.ACTIVE],
      [AgentLifecycleState.ACTIVE]: [AgentLifecycleState.SUSPENDED, AgentLifecycleState.RETIRED],
      [AgentLifecycleState.SUSPENDED]: [AgentLifecycleState.ACTIVE, AgentLifecycleState.RETIRED],
      [AgentLifecycleState.RETIRED]: [],
    };

    const fromState = record.currentState;
    return validTransitions[fromState] || [];
  }
}
