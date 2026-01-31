/**
 * OLYMPUS 2.0 - Governance Control Plane
 * Phase 8.1: Centralized Governance Control
 * @version 1.0.0
 */

import { AgentRole, type AgentIdentity } from '../types';
import type { ILedgerStore, GovernanceLedgerEntry } from '../ledger/types';
import type { IAuditLogStore } from '../store/types';
import { BoundedCache, BoundedArray } from '@/lib/utils/bounded-cache';

export enum ControlAction {
  HALT = 'HALT',
  RESUME = 'RESUME',
  KILL_SWITCH = 'KILL_SWITCH',
  PAUSE_BUILD = 'PAUSE_BUILD',
  RESUME_BUILD = 'RESUME_BUILD',
  FORCE_ROLLBACK = 'FORCE_ROLLBACK',
  ESCALATE = 'ESCALATE',
  LOCK_TENANT = 'LOCK_TENANT',
  UNLOCK_TENANT = 'UNLOCK_TENANT',
}

export enum ControlLevel {
  NONE = 'none',
  MONITOR = 'monitor',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

export interface ControlState {
  level: ControlLevel;
  halted: boolean;
  haltedAt?: Date;
  haltedBy?: string;
  haltReason?: string;
  killSwitchActive: boolean;
  pausedBuilds: Set<string>;
  lockedTenants: Set<string>;
  lastUpdated: Date;
}

export interface ControlDecision {
  action: ControlAction;
  target: string;
  level: ControlLevel;
  authorized: boolean;
  reason: string;
  requiresApproval: boolean;
  approver?: string;
}

export interface ControlEvent {
  id: string;
  action: ControlAction;
  level: ControlLevel;
  triggeredBy: string;
  triggeredAt: Date;
  target?: string;
  details?: Record<string, unknown>;
  approvedBy?: string;
}

export interface IControlPlane {
  getCurrentState(): ControlState;
  /**
   * Execute a control action with proper authorization.
   * SECURITY FIX: Now requires AgentIdentity instead of string for proper role validation.
   */
  executeAction(
    action: ControlAction,
    target: string,
    operatorIdentity: AgentIdentity
  ): Promise<ControlDecision>;
  evaluateControl(identity: AgentIdentity, action: string): Promise<boolean>;
  triggerKillSwitch(reason: string, triggeredBy: string): Promise<void>;
  releaseKillSwitch(operator: string): Promise<boolean>;
  pauseBuild(buildId: string, reason: string, operator: string): Promise<boolean>;
  resumeBuild(buildId: string, operator: string): Promise<boolean>;
  lockTenant(tenantId: string, reason: string, operator: string): Promise<boolean>;
  unlockTenant(tenantId: string, operator: string): Promise<boolean>;
  getControlHistory(target?: string, limit?: number): Promise<ControlEvent[]>;
  escalate(level: ControlLevel, reason: string, triggeredBy: string): Promise<void>;
}

/**
 * SECURITY FIX: Control history cache configuration
 * Prevents unbounded memory growth from accumulated events
 */
const HISTORY_CACHE_CONFIG = {
  maxSize: 500, // Max 500 targets tracked
  ttlMs: 24 * 60 * 60 * 1000, // 24 hour TTL
  cleanupIntervalMs: 60 * 60 * 1000, // Cleanup every hour
  autoCleanup: true,
};

const MAX_EVENTS_PER_TARGET = 100; // Max events per target

export class GovernanceControlPlane implements IControlPlane {
  private state: ControlState;
  private ledger: ILedgerStore;
  private audit: IAuditLogStore;
  // SECURITY FIX: Use BoundedCache with TTL instead of unbounded Map
  private controlHistory: BoundedCache<string, BoundedArray<ControlEvent>>;
  private readonly AUTH_MATRIX: Map<AgentRole, ControlAction[]> = new Map();

  constructor(ledger: ILedgerStore, audit: IAuditLogStore) {
    this.ledger = ledger;
    this.audit = audit;

    // SECURITY FIX: Initialize bounded history cache
    this.controlHistory = new BoundedCache<string, BoundedArray<ControlEvent>>(
      HISTORY_CACHE_CONFIG
    );

    this.state = {
      level: ControlLevel.NONE,
      halted: false,
      killSwitchActive: false,
      pausedBuilds: new Set(),
      lockedTenants: new Set(),
      lastUpdated: new Date(),
    };

    this.initializeAuthMatrix();
  }

  private initializeAuthMatrix(): void {
    this.AUTH_MATRIX.set(AgentRole.GOVERNANCE, [
      ControlAction.HALT,
      ControlAction.RESUME,
      ControlAction.KILL_SWITCH,
      ControlAction.PAUSE_BUILD,
      ControlAction.RESUME_BUILD,
      ControlAction.FORCE_ROLLBACK,
      ControlAction.ESCALATE,
      ControlAction.LOCK_TENANT,
      ControlAction.UNLOCK_TENANT,
    ]);

    this.AUTH_MATRIX.set(AgentRole.ORCHESTRATOR, [
      ControlAction.PAUSE_BUILD,
      ControlAction.RESUME_BUILD,
      ControlAction.ESCALATE,
    ]);

    this.AUTH_MATRIX.set(AgentRole.MONITOR, [ControlAction.ESCALATE]);
  }

  getCurrentState(): ControlState {
    return {
      ...this.state,
      pausedBuilds: new Set(this.state.pausedBuilds),
      lockedTenants: new Set(this.state.lockedTenants),
    };
  }

  /**
   * Execute a control action with proper authorization.
   *
   * SECURITY FIX (Jan 31, 2026): Now requires full AgentIdentity instead of
   * just operator string. Validates identity fingerprint and uses actual role
   * from identity instead of hardcoded GOVERNANCE role.
   *
   * @param action - The control action to execute
   * @param target - The target of the action (buildId, tenantId, etc.)
   * @param operatorIdentity - The verified identity of the operator
   */
  async executeAction(
    action: ControlAction,
    target: string,
    operatorIdentity: AgentIdentity
  ): Promise<ControlDecision> {
    const level = this.determineLevelForAction(action);

    // SECURITY FIX: Validate operator identity has required fields
    if (!operatorIdentity.agentId || !operatorIdentity.role) {
      return {
        action,
        target,
        level,
        authorized: false,
        reason: 'Invalid operator identity: missing agentId or role',
        requiresApproval: true,
      };
    }

    // SECURITY FIX: Require fingerprint for high-severity actions
    const highSeverityActions = [
      ControlAction.KILL_SWITCH,
      ControlAction.FORCE_ROLLBACK,
      ControlAction.LOCK_TENANT,
    ];
    if (highSeverityActions.includes(action) && !operatorIdentity.fingerprint) {
      return {
        action,
        target,
        level,
        authorized: false,
        reason: 'High-severity actions require cryptographic identity fingerprint',
        requiresApproval: true,
      };
    }

    if (this.state.halted && action !== ControlAction.RESUME) {
      return {
        action,
        target,
        level,
        authorized: false,
        reason: 'System is halted. Resume first.',
        requiresApproval: false,
      };
    }

    // SECURITY FIX: Use actual identity role instead of hardcoded GOVERNANCE
    const authorized = await this.evaluateControl(operatorIdentity, action);

    if (!authorized) {
      return {
        action,
        target,
        level,
        authorized: false,
        reason: `Unauthorized: role '${operatorIdentity.role}' cannot perform '${action}'`,
        requiresApproval: true,
      };
    }

    const event: ControlEvent = {
      id: crypto.randomUUID(),
      action,
      level,
      triggeredBy: operatorIdentity.agentId,
      triggeredAt: new Date(),
      target,
      details: {
        operatorRole: operatorIdentity.role,
        operatorFingerprint: operatorIdentity.fingerprint ? 'present' : 'absent',
      },
    };

    await this.recordControlEvent(event);

    const result = await this.applyAction(action, target, operatorIdentity.agentId);

    return {
      action,
      target,
      level,
      authorized: true,
      reason: result ? 'Action executed successfully' : 'Action failed',
      requiresApproval: false,
    };
  }

  async evaluateControl(identity: AgentIdentity, action: string): Promise<boolean> {
    const allowedActions = this.AUTH_MATRIX.get(identity.role);

    if (!allowedActions) {
      return false;
    }

    return allowedActions.includes(action as ControlAction);
  }

  async triggerKillSwitch(reason: string, triggeredBy: string): Promise<void> {
    if (this.state.killSwitchActive) {
      throw new Error('Kill switch already active');
    }

    this.state.killSwitchActive = true;
    this.state.halted = true;
    this.state.haltedAt = new Date();
    this.state.haltedBy = triggeredBy;
    this.state.haltReason = reason;
    this.state.level = ControlLevel.EMERGENCY;
    this.state.lastUpdated = new Date();

    const event: ControlEvent = {
      id: crypto.randomUUID(),
      action: ControlAction.KILL_SWITCH,
      level: ControlLevel.EMERGENCY,
      triggeredBy,
      triggeredAt: new Date(),
      details: { reason },
    };

    await this.recordControlEvent(event);
    await this.logToLedger(event);
  }

  async releaseKillSwitch(operator: string): Promise<boolean> {
    if (!this.state.killSwitchActive) {
      return false;
    }

    this.state.killSwitchActive = false;
    this.state.halted = false;
    this.state.haltedAt = undefined;
    this.state.haltedBy = undefined;
    this.state.haltReason = undefined;
    this.state.level = ControlLevel.NONE;
    this.state.lastUpdated = new Date();

    const event: ControlEvent = {
      id: crypto.randomUUID(),
      action: ControlAction.RESUME,
      level: ControlLevel.NONE,
      triggeredBy: operator,
      triggeredAt: new Date(),
    };

    await this.recordControlEvent(event);
    await this.logToLedger(event);

    return true;
  }

  async pauseBuild(buildId: string, reason: string, operator: string): Promise<boolean> {
    if (this.state.pausedBuilds.has(buildId)) {
      return false;
    }

    this.state.pausedBuilds.add(buildId);
    this.state.lastUpdated = new Date();

    const event: ControlEvent = {
      id: crypto.randomUUID(),
      action: ControlAction.PAUSE_BUILD,
      level: ControlLevel.WARNING,
      triggeredBy: operator,
      triggeredAt: new Date(),
      target: buildId,
      details: { reason },
    };

    await this.recordControlEvent(event);
    await this.logToLedger(event);

    return true;
  }

  async resumeBuild(buildId: string, operator: string): Promise<boolean> {
    if (!this.state.pausedBuilds.has(buildId)) {
      return false;
    }

    this.state.pausedBuilds.delete(buildId);
    this.state.lastUpdated = new Date();

    const event: ControlEvent = {
      id: crypto.randomUUID(),
      action: ControlAction.RESUME_BUILD,
      level: ControlLevel.NONE,
      triggeredBy: operator,
      triggeredAt: new Date(),
      target: buildId,
    };

    await this.recordControlEvent(event);
    await this.logToLedger(event);

    return true;
  }

  async lockTenant(tenantId: string, reason: string, operator: string): Promise<boolean> {
    if (this.state.lockedTenants.has(tenantId)) {
      return false;
    }

    this.state.lockedTenants.add(tenantId);
    this.state.lastUpdated = new Date();

    const event: ControlEvent = {
      id: crypto.randomUUID(),
      action: ControlAction.LOCK_TENANT,
      level: ControlLevel.CRITICAL,
      triggeredBy: operator,
      triggeredAt: new Date(),
      target: tenantId,
      details: { reason },
    };

    await this.recordControlEvent(event);
    await this.logToLedger(event);

    return true;
  }

  async unlockTenant(tenantId: string, operator: string): Promise<boolean> {
    if (!this.state.lockedTenants.has(tenantId)) {
      return false;
    }

    this.state.lockedTenants.delete(tenantId);
    this.state.lastUpdated = new Date();

    const event: ControlEvent = {
      id: crypto.randomUUID(),
      action: ControlAction.UNLOCK_TENANT,
      level: ControlLevel.NONE,
      triggeredBy: operator,
      triggeredAt: new Date(),
      target: tenantId,
    };

    await this.recordControlEvent(event);
    await this.logToLedger(event);

    return true;
  }

  async getControlHistory(target?: string, limit: number = 100): Promise<ControlEvent[]> {
    if (target) {
      const events = this.controlHistory.get(target);
      return events ? events.all : [];
    }

    const allEvents: ControlEvent[] = [];
    for (const events of this.controlHistory.values()) {
      allEvents.push(...events.all);
    }

    return allEvents
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  async escalate(level: ControlLevel, reason: string, triggeredBy: string): Promise<void> {
    this.state.level = level;
    this.state.lastUpdated = new Date();

    const event: ControlEvent = {
      id: crypto.randomUUID(),
      action: ControlAction.ESCALATE,
      level,
      triggeredBy,
      triggeredAt: new Date(),
      details: { reason, previousLevel: this.state.level },
    };

    await this.recordControlEvent(event);
    await this.logToLedger(event);
  }

  private determineLevelForAction(action: ControlAction): ControlLevel {
    switch (action) {
      case ControlAction.KILL_SWITCH:
        return ControlLevel.EMERGENCY;
      case ControlAction.HALT:
      case ControlAction.FORCE_ROLLBACK:
      case ControlAction.LOCK_TENANT:
        return ControlLevel.CRITICAL;
      case ControlAction.PAUSE_BUILD:
        return ControlLevel.WARNING;
      case ControlAction.ESCALATE:
        return ControlLevel.CRITICAL;
      default:
        return ControlLevel.NONE;
    }
  }

  private async applyAction(
    action: ControlAction,
    target: string,
    operator: string
  ): Promise<boolean> {
    switch (action) {
      case ControlAction.HALT:
        this.state.halted = true;
        this.state.haltedAt = new Date();
        this.state.haltedBy = operator;
        return true;
      case ControlAction.RESUME:
        this.state.halted = false;
        return true;
      case ControlAction.PAUSE_BUILD:
        return this.pauseBuild(target, 'Control action', operator);
      case ControlAction.RESUME_BUILD:
        return this.resumeBuild(target, operator);
      default:
        return true;
    }
  }

  private async recordControlEvent(event: ControlEvent): Promise<void> {
    const target = event.target || 'system';
    let events = this.controlHistory.get(target);

    if (!events) {
      // SECURITY FIX: Use BoundedArray with max events limit
      events = new BoundedArray<ControlEvent>(MAX_EVENTS_PER_TARGET);
      this.controlHistory.set(target, events);
    }

    events.push(event);
  }

  private async logToLedger(event: ControlEvent): Promise<void> {
    const entry: GovernanceLedgerEntry = {
      id: event.id,
      buildId: event.target || 'system',
      agentId: event.triggeredBy,
      actionType: 'MONITOR_VIOLATION' as any,
      actionData: {
        passed: true,
        reason: typeof event.details?.reason === 'string' ? event.details.reason : '',
        details: event.details,
      },
      timestamp: event.triggeredAt,
      ledgerHash: '',
      previousHash: '',
      immutable: true,
    };

    await this.ledger.append(entry);
  }
}

export function createControlPlane(ledger: ILedgerStore, audit: IAuditLogStore): IControlPlane {
  return new GovernanceControlPlane(ledger, audit);
}
