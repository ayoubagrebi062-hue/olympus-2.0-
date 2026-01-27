/**
 * OLYMPUS 2.0 - Epoch-Based Governance
 * Phase 8.2: Time-Based Governance Periods
 * @version 1.0.0
 */

export enum EpochPhase {
  PREPARATION = 'preparation',
  ACTIVE = 'active',
  REVIEW = 'review',
  SETTLEMENT = 'settlement',
  CLOSED = 'closed',
}

export enum EpochType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export interface EpochConfig {
  id: string;
  name: string;
  type: EpochType;
  startTime: Date;
  endTime: Date;
  currentPhase: EpochPhase;
  maxBuildsPerEpoch?: number;
  maxActionsPerEpoch?: number;
  autoRollbackEnabled: boolean;
  quorumRequired: boolean;
  minQuorumPercentage: number;
}

export interface EpochMetrics {
  epochId: string;
  buildsCompleted: number;
  buildsFailed: number;
  buildsRolledBack: number;
  actionsExecuted: number;
  actionsBlocked: number;
  violationsReported: number;
  averageBuildDuration: number;
  successRate: number;
}

export interface EpochState {
  config: EpochConfig;
  currentPhase: EpochPhase;
  phaseStartTime: Date;
  buildCounter: number;
  actionCounter: number;
  metrics: EpochMetrics;
  activeAgents: Set<string>;
  completedActions: Set<string>;
}

export interface EpochTransition {
  fromPhase: EpochPhase;
  toPhase: EpochPhase;
  triggeredAt: Date;
  triggeredBy: string;
  reason: string;
  approved?: boolean;
  approvedBy?: string;
}

export interface IEpochManager {
  createEpoch(config: Partial<EpochConfig>): Promise<EpochState>;
  getEpoch(epochId: string): Promise<EpochState | null>;
  getCurrentEpoch(): Promise<EpochState | null>;
  advancePhase(
    epochId: string,
    targetPhase: EpochPhase,
    operator: string
  ): Promise<EpochTransition>;
  recordBuildCompletion(epochId: string, buildId: string, success: boolean): Promise<void>;
  recordActionExecution(epochId: string, actionId: string, allowed: boolean): Promise<void>;
  recordViolation(epochId: string, violation: ViolationRecord): Promise<void>;
  getEpochMetrics(epochId: string): Promise<EpochMetrics>;
  getEpochHistory(limit?: number): Promise<EpochState[]>;
  canExecuteAction(epochId: string): Promise<boolean>;
  shouldAutoRollback(epochId: string): Promise<boolean>;
  checkQuorum(epochId: string): Promise<boolean>;
}

export interface ViolationRecord {
  id: string;
  epochId: string;
  buildId: string;
  agentId: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedAt: Date;
  description: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export class EpochManager implements IEpochManager {
  private epochs: Map<string, EpochState> = new Map();
  private epochHistory: EpochState[] = [];
  private violations: Map<string, ViolationRecord[]> = new Map();
  private transitions: Map<string, EpochTransition[]> = new Map();
  private currentEpochId: string | null = null;

  async createEpoch(config: Partial<EpochConfig>): Promise<EpochState> {
    const epochId = crypto.randomUUID();

    const defaultConfig: EpochConfig = {
      id: epochId,
      name: config.name || `Epoch ${new Date().toISOString()}`,
      type: config.type || EpochType.DAILY,
      startTime: config.startTime || new Date(),
      endTime: config.endTime || new Date(Date.now() + 24 * 60 * 60 * 1000),
      currentPhase: EpochPhase.PREPARATION,
      maxBuildsPerEpoch: config.maxBuildsPerEpoch || 1000,
      maxActionsPerEpoch: config.maxActionsPerEpoch || 10000,
      autoRollbackEnabled: config.autoRollbackEnabled ?? true,
      quorumRequired: config.quorumRequired ?? false,
      minQuorumPercentage: config.minQuorumPercentage || 0.66,
    };

    const state: EpochState = {
      config: defaultConfig,
      currentPhase: EpochPhase.PREPARATION,
      phaseStartTime: defaultConfig.startTime,
      buildCounter: 0,
      actionCounter: 0,
      activeAgents: new Set(),
      completedActions: new Set(),
      metrics: this.initializeMetrics(epochId),
    };

    this.epochs.set(epochId, state);
    this.violations.set(epochId, []);
    this.transitions.set(epochId, []);
    this.currentEpochId = epochId;

    console.log(`[EpochManager] Created epoch ${epochId}: ${defaultConfig.name}`);

    return state;
  }

  async getEpoch(epochId: string): Promise<EpochState | null> {
    return this.epochs.get(epochId) || null;
  }

  async getCurrentEpoch(): Promise<EpochState | null> {
    if (!this.currentEpochId) {
      return null;
    }

    return await this.getEpoch(this.currentEpochId);
  }

  async advancePhase(
    epochId: string,
    targetPhase: EpochPhase,
    operator: string
  ): Promise<EpochTransition> {
    const epoch = this.epochs.get(epochId);

    if (!epoch) {
      throw new Error(`Epoch ${epochId} not found`);
    }

    const currentPhase = epoch.currentPhase;
    const transition: EpochTransition = {
      fromPhase: currentPhase,
      toPhase: targetPhase,
      triggeredAt: new Date(),
      triggeredBy: operator,
      reason: 'Manual phase advancement',
      approved: true,
      approvedBy: operator,
    };

    epoch.currentPhase = targetPhase;
    epoch.phaseStartTime = new Date();

    const transitions = this.transitions.get(epochId) || [];
    transitions.push(transition);
    this.transitions.set(epochId, transitions);

    console.log(`[EpochManager] Epoch ${epochId} advanced from ${currentPhase} to ${targetPhase}`);

    if (targetPhase === EpochPhase.CLOSED) {
      this.epochHistory.push({ ...epoch });
      this.epochs.delete(epochId);
      this.currentEpochId = null;
    }

    return transition;
  }

  async recordBuildCompletion(epochId: string, buildId: string, success: boolean): Promise<void> {
    const epoch = this.epochs.get(epochId);

    if (!epoch) {
      return;
    }

    epoch.buildCounter++;

    if (success) {
      epoch.metrics.buildsCompleted++;
    } else {
      epoch.metrics.buildsFailed++;
    }

    epoch.metrics.successRate = epoch.metrics.buildsCompleted / epoch.buildCounter;
  }

  async recordActionExecution(epochId: string, actionId: string, allowed: boolean): Promise<void> {
    const epoch = this.epochs.get(epochId);

    if (!epoch) {
      return;
    }

    epoch.actionCounter++;

    if (allowed) {
      epoch.metrics.actionsExecuted++;
      epoch.completedActions.add(actionId);
    } else {
      epoch.metrics.actionsBlocked++;
    }
  }

  async recordViolation(epochId: string, violation: ViolationRecord): Promise<void> {
    const violations = this.violations.get(epochId) || [];
    violations.push(violation);
    this.violations.set(epochId, violations);

    const epoch = this.epochs.get(epochId);

    if (epoch) {
      epoch.metrics.violationsReported++;
    }
  }

  async getEpochMetrics(epochId: string): Promise<EpochMetrics> {
    const epoch = this.epochs.get(epochId);

    if (!epoch) {
      const historical = this.epochHistory.find(e => e.config.id === epochId);

      if (historical) {
        return historical.metrics;
      }

      throw new Error(`Epoch ${epochId} not found`);
    }

    return { ...epoch.metrics };
  }

  async getEpochHistory(limit: number = 10): Promise<EpochState[]> {
    return this.epochHistory.slice(-limit);
  }

  async canExecuteAction(epochId: string): Promise<boolean> {
    const epoch = this.epochs.get(epochId);

    if (!epoch) {
      return false;
    }

    if (epoch.currentPhase !== EpochPhase.ACTIVE) {
      return false;
    }

    if (epoch.config.maxActionsPerEpoch && epoch.actionCounter >= epoch.config.maxActionsPerEpoch) {
      return false;
    }

    return true;
  }

  async shouldAutoRollback(epochId: string): Promise<boolean> {
    const epoch = this.epochs.get(epochId);

    if (!epoch || !epoch.config.autoRollbackEnabled) {
      return false;
    }

    const failureRate = epoch.metrics.buildsFailed / epoch.buildCounter;
    const violations = this.violations.get(epochId) || [];
    const criticalViolations = violations.filter(v => v.severity === 'critical');

    if (failureRate > 0.5) {
      return true;
    }

    if (criticalViolations.length >= 3) {
      return true;
    }

    return false;
  }

  async checkQuorum(epochId: string): Promise<boolean> {
    const epoch = this.epochs.get(epochId);

    if (!epoch || !epoch.config.quorumRequired) {
      return true;
    }

    const requiredAgents = Math.ceil(epoch.activeAgents.size * epoch.config.minQuorumPercentage);
    const activeCount = epoch.activeAgents.size;

    return activeCount >= requiredAgents;
  }

  private initializeMetrics(epochId: string): EpochMetrics {
    return {
      epochId,
      buildsCompleted: 0,
      buildsFailed: 0,
      buildsRolledBack: 0,
      actionsExecuted: 0,
      actionsBlocked: 0,
      violationsReported: 0,
      averageBuildDuration: 0,
      successRate: 1.0,
    };
  }
}

export function createEpochManager(): IEpochManager {
  return new EpochManager();
}
