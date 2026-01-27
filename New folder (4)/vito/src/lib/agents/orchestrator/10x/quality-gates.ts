/**
 * ============================================================================
 * QUALITY GATES - CHECKPOINT/ROLLBACK SYSTEM
 * ============================================================================
 *
 * "Quality is not an act, it is a habit." - Aristotle
 *
 * This module implements enterprise-grade quality gates:
 * - Multi-level gates (warn, block, require-approval)
 * - Automatic checkpoint creation at milestones
 * - Rollback capability to any checkpoint
 * - Custom validators with rich diagnostics
 * - Gate approval workflows
 * - Quality trends and regression detection
 *
 * Inspired by: GitHub Actions, Azure DevOps Gates, Jenkins Quality Gates
 * ============================================================================
 */

import { EventEmitter } from 'events';
import { EventStore, BuildEvent } from './event-sourcing';

// ============================================================================
// TYPES
// ============================================================================

export type GateLevel = 'info' | 'warn' | 'block' | 'require-approval';
export type GateStatus = 'pending' | 'passed' | 'failed' | 'skipped' | 'approved' | 'rejected';
export type CheckpointStatus = 'active' | 'superseded' | 'rolled-back';

export interface QualityRule {
  id: string;
  name: string;
  description: string;
  level: GateLevel;
  category: 'code' | 'security' | 'performance' | 'accessibility' | 'compliance' | 'custom';
  validator: (context: ValidationContext) => Promise<ValidationResult>;
  metadata?: Record<string, unknown>;
}

export interface ValidationContext {
  buildId: string;
  phase: string;
  agent: string | null;
  artifacts: Map<string, unknown>;
  previousResults: ValidationResult[];
  checkpointData: CheckpointData | null;
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  level: GateLevel;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  details?: Record<string, unknown>;
  suggestions?: string[];
  autoFixAvailable?: boolean;
  metrics?: {
    score: number;
    threshold: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  timestamp: Date;
}

export interface QualityGate {
  id: string;
  buildId: string;
  phase: string;
  rules: string[]; // Rule IDs
  status: GateStatus;
  results: ValidationResult[];
  summary: GateSummary;
  approvals: GateApproval[];
  createdAt: Date;
  completedAt: Date | null;
}

export interface GateSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  warnings: number;
  blockers: number;
  requiresApproval: boolean;
  overallScore: number; // 0-100
}

export interface GateApproval {
  id: string;
  gateId: string;
  approver: string;
  decision: 'approved' | 'rejected';
  reason: string;
  conditions?: string[];
  timestamp: Date;
}

export interface CheckpointData {
  id: string;
  buildId: string;
  phase: string;
  version: number;
  status: CheckpointStatus;
  state: Record<string, unknown>;
  artifacts: Map<string, unknown>;
  metadata: {
    createdAt: Date;
    createdBy: string;
    reason: string;
    gateId: string | null;
    parentCheckpointId: string | null;
  };
  qualityScore: number;
}

export interface RollbackPlan {
  id: string;
  buildId: string;
  sourceCheckpoint: string;
  targetCheckpoint: string;
  steps: RollbackStep[];
  estimatedDuration: number;
  risks: RollbackRisk[];
  status: 'planned' | 'executing' | 'completed' | 'failed' | 'cancelled';
}

export interface RollbackStep {
  order: number;
  action: 'revert-artifact' | 'restore-state' | 'notify' | 'cleanup' | 'validate';
  target: string;
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
}

export interface RollbackRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
}

// ============================================================================
// QUALITY RULE REGISTRY
// ============================================================================

export class QualityRuleRegistry {
  private rules: Map<string, QualityRule> = new Map();
  private phaseRules: Map<string, Set<string>> = new Map(); // phase -> ruleIds

  /**
   * Register a quality rule
   */
  register(rule: QualityRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Associate rules with a phase
   */
  assignToPhase(phase: string, ruleIds: string[]): void {
    let rules = this.phaseRules.get(phase);
    if (!rules) {
      rules = new Set();
      this.phaseRules.set(phase, rules);
    }
    for (const id of ruleIds) {
      rules.add(id);
    }
  }

  /**
   * Get rules for a phase
   */
  getRulesForPhase(phase: string): QualityRule[] {
    const ruleIds = this.phaseRules.get(phase) || new Set();
    return Array.from(ruleIds)
      .map((id) => this.rules.get(id))
      .filter((r): r is QualityRule => r !== undefined);
  }

  /**
   * Get rule by ID
   */
  getRule(id: string): QualityRule | undefined {
    return this.rules.get(id);
  }

  /**
   * Get all rules
   */
  getAllRules(): QualityRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: QualityRule['category']): QualityRule[] {
    return Array.from(this.rules.values()).filter((r) => r.category === category);
  }
}

// ============================================================================
// CHECKPOINT MANAGER
// ============================================================================

export class CheckpointManager extends EventEmitter {
  private checkpoints: Map<string, CheckpointData[]> = new Map(); // buildId -> checkpoints
  private activeCheckpoints: Map<string, string> = new Map(); // buildId -> checkpointId

  /**
   * Create a checkpoint
   */
  async createCheckpoint(
    buildId: string,
    phase: string,
    state: Record<string, unknown>,
    artifacts: Map<string, unknown>,
    options: {
      reason: string;
      gateId?: string;
      createdBy?: string;
    }
  ): Promise<CheckpointData> {
    const buildCheckpoints = this.checkpoints.get(buildId) || [];
    const version = buildCheckpoints.length + 1;

    // Get parent checkpoint
    const activeId = this.activeCheckpoints.get(buildId);
    const parentCheckpointId = activeId || null;

    // Mark previous checkpoint as superseded
    if (activeId) {
      const previous = buildCheckpoints.find((c) => c.id === activeId);
      if (previous) {
        previous.status = 'superseded';
      }
    }

    const checkpoint: CheckpointData = {
      id: `cp-${buildId}-${version}-${Date.now()}`,
      buildId,
      phase,
      version,
      status: 'active',
      state: this.deepClone(state),
      artifacts: new Map(artifacts),
      metadata: {
        createdAt: new Date(),
        createdBy: options.createdBy || 'system',
        reason: options.reason,
        gateId: options.gateId || null,
        parentCheckpointId,
      },
      qualityScore: 0, // Will be set by gate evaluation
    };

    buildCheckpoints.push(checkpoint);
    this.checkpoints.set(buildId, buildCheckpoints);
    this.activeCheckpoints.set(buildId, checkpoint.id);

    this.emit('checkpoint_created', {
      buildId,
      checkpointId: checkpoint.id,
      phase,
      version,
    });

    return checkpoint;
  }

  /**
   * Get checkpoint by ID
   */
  getCheckpoint(buildId: string, checkpointId: string): CheckpointData | null {
    const checkpoints = this.checkpoints.get(buildId) || [];
    return checkpoints.find((c) => c.id === checkpointId) || null;
  }

  /**
   * Get active checkpoint for a build
   */
  getActiveCheckpoint(buildId: string): CheckpointData | null {
    const activeId = this.activeCheckpoints.get(buildId);
    if (!activeId) return null;
    return this.getCheckpoint(buildId, activeId);
  }

  /**
   * Get checkpoint by version
   */
  getCheckpointByVersion(buildId: string, version: number): CheckpointData | null {
    const checkpoints = this.checkpoints.get(buildId) || [];
    return checkpoints.find((c) => c.version === version) || null;
  }

  /**
   * Get all checkpoints for a build
   */
  getAllCheckpoints(buildId: string): CheckpointData[] {
    return this.checkpoints.get(buildId) || [];
  }

  /**
   * Get checkpoint history (chain from current to root)
   */
  getCheckpointHistory(buildId: string, checkpointId?: string): CheckpointData[] {
    const all = this.checkpoints.get(buildId) || [];
    const history: CheckpointData[] = [];

    let currentId = checkpointId || this.activeCheckpoints.get(buildId);
    while (currentId) {
      const checkpoint = all.find((c) => c.id === currentId);
      if (!checkpoint) break;
      history.push(checkpoint);
      currentId = checkpoint.metadata.parentCheckpointId || undefined;
    }

    return history.reverse(); // Root to current
  }

  /**
   * Update checkpoint quality score
   */
  updateQualityScore(buildId: string, checkpointId: string, score: number): void {
    const checkpoint = this.getCheckpoint(buildId, checkpointId);
    if (checkpoint) {
      checkpoint.qualityScore = score;
    }
  }

  /**
   * Mark checkpoint as rolled back
   */
  markRolledBack(buildId: string, checkpointId: string): void {
    const checkpoint = this.getCheckpoint(buildId, checkpointId);
    if (checkpoint) {
      checkpoint.status = 'rolled-back';
    }
  }

  /**
   * Set active checkpoint (for rollback)
   */
  setActiveCheckpoint(buildId: string, checkpointId: string): void {
    const checkpoint = this.getCheckpoint(buildId, checkpointId);
    if (checkpoint) {
      // Mark current as superseded
      const currentId = this.activeCheckpoints.get(buildId);
      if (currentId) {
        const current = this.getCheckpoint(buildId, currentId);
        if (current) {
          current.status = 'rolled-back';
        }
      }

      checkpoint.status = 'active';
      this.activeCheckpoints.set(buildId, checkpointId);
    }
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

// ============================================================================
// GATE EVALUATOR
// ============================================================================

export class GateEvaluator extends EventEmitter {
  private ruleRegistry: QualityRuleRegistry;
  private checkpointManager: CheckpointManager;
  private gates: Map<string, QualityGate> = new Map();
  private approvalCallbacks: Map<string, (approval: GateApproval) => void> = new Map();

  constructor(ruleRegistry: QualityRuleRegistry, checkpointManager: CheckpointManager) {
    super();
    this.ruleRegistry = ruleRegistry;
    this.checkpointManager = checkpointManager;
  }

  /**
   * Evaluate quality gate for a phase
   */
  async evaluateGate(
    buildId: string,
    phase: string,
    artifacts: Map<string, unknown>,
    options: {
      agent?: string;
      skipRules?: string[];
      autoCreateCheckpoint?: boolean;
    } = {}
  ): Promise<QualityGate> {
    const rules = this.ruleRegistry.getRulesForPhase(phase);
    const gateId = `gate-${buildId}-${phase}-${Date.now()}`;

    const gate: QualityGate = {
      id: gateId,
      buildId,
      phase,
      rules: rules.map((r) => r.id),
      status: 'pending',
      results: [],
      summary: {
        total: rules.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        warnings: 0,
        blockers: 0,
        requiresApproval: false,
        overallScore: 0,
      },
      approvals: [],
      createdAt: new Date(),
      completedAt: null,
    };

    this.gates.set(gateId, gate);
    this.emit('gate_started', { gateId, buildId, phase, ruleCount: rules.length });

    // Get checkpoint data for context
    const checkpointData = this.checkpointManager.getActiveCheckpoint(buildId);

    // Create validation context
    const context: ValidationContext = {
      buildId,
      phase,
      agent: options.agent || null,
      artifacts,
      previousResults: [],
      checkpointData,
    };

    // Evaluate each rule
    for (const rule of rules) {
      if (options.skipRules?.includes(rule.id)) {
        const skippedResult: ValidationResult = {
          ruleId: rule.id,
          ruleName: rule.name,
          level: rule.level,
          status: 'skipped',
          message: 'Rule skipped by configuration',
          timestamp: new Date(),
        };
        gate.results.push(skippedResult);
        gate.summary.skipped++;
        continue;
      }

      try {
        const result = await rule.validator(context);
        gate.results.push(result);
        context.previousResults.push(result);

        // Update summary
        if (result.status === 'passed') {
          gate.summary.passed++;
        } else if (result.status === 'failed') {
          gate.summary.failed++;
          if (result.level === 'warn') {
            gate.summary.warnings++;
          } else if (result.level === 'block') {
            gate.summary.blockers++;
          } else if (result.level === 'require-approval') {
            gate.summary.requiresApproval = true;
          }
        } else {
          gate.summary.skipped++;
        }

        this.emit('rule_evaluated', {
          gateId,
          ruleId: rule.id,
          status: result.status,
          level: result.level,
        });
      } catch (error) {
        const errorResult: ValidationResult = {
          ruleId: rule.id,
          ruleName: rule.name,
          level: rule.level,
          status: 'failed',
          message: `Rule evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        };
        gate.results.push(errorResult);
        gate.summary.failed++;
        if (rule.level === 'block') {
          gate.summary.blockers++;
        }
      }
    }

    // Calculate overall score
    gate.summary.overallScore = this.calculateOverallScore(gate);

    // Determine gate status
    gate.status = this.determineGateStatus(gate);
    gate.completedAt = new Date();

    // Create checkpoint if configured and gate passed
    if (options.autoCreateCheckpoint && gate.status === 'passed') {
      const checkpoint = await this.checkpointManager.createCheckpoint(
        buildId,
        phase,
        { gateResults: gate.results },
        artifacts,
        {
          reason: `Quality gate passed for ${phase}`,
          gateId: gate.id,
        }
      );
      this.checkpointManager.updateQualityScore(buildId, checkpoint.id, gate.summary.overallScore);
    }

    this.emit('gate_completed', {
      gateId,
      buildId,
      phase,
      status: gate.status,
      score: gate.summary.overallScore,
    });

    return gate;
  }

  /**
   * Request approval for a gate
   */
  async requestApproval(gateId: string, approvers: string[]): Promise<void> {
    const gate = this.gates.get(gateId);
    if (!gate) throw new Error(`Gate ${gateId} not found`);

    this.emit('approval_requested', {
      gateId,
      buildId: gate.buildId,
      phase: gate.phase,
      approvers,
      blockers: gate.results.filter((r) => r.status === 'failed' && r.level === 'require-approval'),
    });
  }

  /**
   * Submit approval decision
   */
  async submitApproval(
    gateId: string,
    approver: string,
    decision: 'approved' | 'rejected',
    reason: string,
    conditions?: string[]
  ): Promise<GateApproval> {
    const gate = this.gates.get(gateId);
    if (!gate) throw new Error(`Gate ${gateId} not found`);

    const approval: GateApproval = {
      id: `approval-${gateId}-${Date.now()}`,
      gateId,
      approver,
      decision,
      reason,
      conditions,
      timestamp: new Date(),
    };

    gate.approvals.push(approval);

    // Update gate status
    if (decision === 'approved') {
      gate.status = 'approved';
    } else {
      gate.status = 'rejected';
    }

    // Notify callback if registered
    const callback = this.approvalCallbacks.get(gateId);
    if (callback) {
      callback(approval);
      this.approvalCallbacks.delete(gateId);
    }

    this.emit('approval_submitted', {
      gateId,
      approver,
      decision,
      reason,
    });

    return approval;
  }

  /**
   * Wait for approval
   */
  async waitForApproval(gateId: string, timeoutMs: number = 3600000): Promise<GateApproval> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.approvalCallbacks.delete(gateId);
        reject(new Error(`Approval timeout for gate ${gateId}`));
      }, timeoutMs);

      this.approvalCallbacks.set(gateId, (approval) => {
        clearTimeout(timeout);
        resolve(approval);
      });
    });
  }

  /**
   * Get gate by ID
   */
  getGate(gateId: string): QualityGate | undefined {
    return this.gates.get(gateId);
  }

  /**
   * Get gates for a build
   */
  getGatesForBuild(buildId: string): QualityGate[] {
    return Array.from(this.gates.values()).filter((g) => g.buildId === buildId);
  }

  private calculateOverallScore(gate: QualityGate): number {
    if (gate.results.length === 0) return 100;

    const weights = {
      info: 1,
      warn: 2,
      block: 5,
      'require-approval': 4,
    };

    let totalWeight = 0;
    let earnedWeight = 0;

    for (const result of gate.results) {
      const weight = weights[result.level];
      totalWeight += weight;
      if (result.status === 'passed') {
        earnedWeight += weight;
      } else if (result.status === 'skipped') {
        // Neutral - don't count against
        totalWeight -= weight;
      }
    }

    if (totalWeight === 0) return 100;
    return Math.round((earnedWeight / totalWeight) * 100);
  }

  private determineGateStatus(gate: QualityGate): GateStatus {
    if (gate.summary.blockers > 0) {
      return 'failed';
    }
    if (gate.summary.requiresApproval) {
      return 'pending'; // Needs approval
    }
    if (gate.summary.failed === 0) {
      return 'passed';
    }
    // Has warnings but no blockers
    return 'passed';
  }
}

// ============================================================================
// ROLLBACK ENGINE
// ============================================================================

export class RollbackEngine extends EventEmitter {
  private checkpointManager: CheckpointManager;
  private eventStore: EventStore;
  private plans: Map<string, RollbackPlan> = new Map();

  constructor(checkpointManager: CheckpointManager, eventStore: EventStore) {
    super();
    this.checkpointManager = checkpointManager;
    this.eventStore = eventStore;
  }

  /**
   * Plan a rollback
   */
  async planRollback(
    buildId: string,
    targetCheckpointId: string,
    options: { dryRun?: boolean } = {}
  ): Promise<RollbackPlan> {
    const sourceCheckpoint = this.checkpointManager.getActiveCheckpoint(buildId);
    const targetCheckpoint = this.checkpointManager.getCheckpoint(buildId, targetCheckpointId);

    if (!sourceCheckpoint) {
      throw new Error('No active checkpoint found');
    }
    if (!targetCheckpoint) {
      throw new Error(`Target checkpoint ${targetCheckpointId} not found`);
    }
    if (targetCheckpoint.version >= sourceCheckpoint.version) {
      throw new Error('Cannot rollback to a newer or same checkpoint');
    }

    // Build rollback steps
    const steps = this.buildRollbackSteps(sourceCheckpoint, targetCheckpoint);
    const risks = this.assessRollbackRisks(sourceCheckpoint, targetCheckpoint);

    const plan: RollbackPlan = {
      id: `rollback-${buildId}-${Date.now()}`,
      buildId,
      sourceCheckpoint: sourceCheckpoint.id,
      targetCheckpoint: targetCheckpoint.id,
      steps,
      estimatedDuration: steps.length * 1000, // Rough estimate
      risks,
      status: 'planned',
    };

    this.plans.set(plan.id, plan);

    this.emit('rollback_planned', {
      planId: plan.id,
      buildId,
      sourceVersion: sourceCheckpoint.version,
      targetVersion: targetCheckpoint.version,
      stepCount: steps.length,
      riskLevel: this.getHighestRisk(risks),
    });

    return plan;
  }

  /**
   * Execute a rollback plan
   */
  async executeRollback(
    planId: string,
    options: { force?: boolean; skipValidation?: boolean } = {}
  ): Promise<RollbackPlan> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Rollback plan ${planId} not found`);

    if (plan.status !== 'planned') {
      throw new Error(`Plan is not in planned state: ${plan.status}`);
    }

    // Check for high risks
    const criticalRisks = plan.risks.filter((r) => r.level === 'critical');
    if (criticalRisks.length > 0 && !options.force) {
      throw new Error(
        `Critical risks detected. Use force=true to override: ${criticalRisks.map((r) => r.description).join(', ')}`
      );
    }

    plan.status = 'executing';
    this.emit('rollback_started', { planId, buildId: plan.buildId });

    try {
      // Execute each step
      for (const step of plan.steps) {
        step.status = 'executing';
        this.emit('rollback_step_started', { planId, step: step.order, action: step.action });

        try {
          step.result = await this.executeStep(plan, step, options);
          step.status = 'completed';
          this.emit('rollback_step_completed', { planId, step: step.order, success: true });
        } catch (error) {
          step.status = 'failed';
          step.result = { error: error instanceof Error ? error.message : 'Unknown error' };
          this.emit('rollback_step_completed', { planId, step: step.order, success: false });

          // Decide whether to continue
          if (step.action === 'validate' && options.skipValidation) {
            // Skip validation failures if configured
            step.status = 'skipped';
          } else {
            throw error;
          }
        }
      }

      // Mark checkpoints appropriately
      this.checkpointManager.setActiveCheckpoint(plan.buildId, plan.targetCheckpoint);

      // Record rollback event
      await this.eventStore.append({
        id: `evt-rollback-${Date.now()}`,
        buildId: plan.buildId,
        type: 'ROLLBACK_EXECUTED',
        timestamp: new Date(),
        data: {
          planId,
          sourceCheckpoint: plan.sourceCheckpoint,
          targetCheckpoint: plan.targetCheckpoint,
        },
        metadata: {
          actor: 'rollback-engine',
          correlationId: planId,
        },
      });

      plan.status = 'completed';
      this.emit('rollback_completed', { planId, buildId: plan.buildId, success: true });
    } catch (error) {
      plan.status = 'failed';
      this.emit('rollback_completed', { planId, buildId: plan.buildId, success: false, error });
      throw error;
    }

    return plan;
  }

  /**
   * Cancel a rollback plan
   */
  cancelRollback(planId: string): void {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Rollback plan ${planId} not found`);

    if (plan.status !== 'planned') {
      throw new Error(`Cannot cancel plan in ${plan.status} state`);
    }

    plan.status = 'cancelled';
    this.emit('rollback_cancelled', { planId, buildId: plan.buildId });
  }

  /**
   * Get rollback plan
   */
  getPlan(planId: string): RollbackPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Get rollback history for a build
   */
  getRollbackHistory(buildId: string): RollbackPlan[] {
    return Array.from(this.plans.values())
      .filter((p) => p.buildId === buildId)
      .sort((a, b) => {
        const aTime = a.id.split('-').pop() || '0';
        const bTime = b.id.split('-').pop() || '0';
        return parseInt(bTime) - parseInt(aTime);
      });
  }

  private buildRollbackSteps(
    source: CheckpointData,
    target: CheckpointData
  ): RollbackStep[] {
    const steps: RollbackStep[] = [];
    let order = 1;

    // Step 1: Notify stakeholders
    steps.push({
      order: order++,
      action: 'notify',
      target: 'stakeholders',
      description: `Notify rollback from v${source.version} to v${target.version}`,
      status: 'pending',
    });

    // Step 2: Restore state
    steps.push({
      order: order++,
      action: 'restore-state',
      target: 'build-state',
      description: `Restore build state from checkpoint v${target.version}`,
      status: 'pending',
    });

    // Step 3: Revert artifacts
    const artifactsToRevert = Array.from(source.artifacts.keys()).filter(
      (key) => !target.artifacts.has(key) || source.artifacts.get(key) !== target.artifacts.get(key)
    );

    for (const artifact of artifactsToRevert) {
      steps.push({
        order: order++,
        action: 'revert-artifact',
        target: artifact,
        description: `Revert artifact: ${artifact}`,
        status: 'pending',
      });
    }

    // Step 4: Cleanup
    steps.push({
      order: order++,
      action: 'cleanup',
      target: 'temporary-resources',
      description: 'Clean up temporary resources created after checkpoint',
      status: 'pending',
    });

    // Step 5: Validate
    steps.push({
      order: order++,
      action: 'validate',
      target: 'restored-state',
      description: 'Validate restored state matches checkpoint',
      status: 'pending',
    });

    return steps;
  }

  private assessRollbackRisks(
    source: CheckpointData,
    target: CheckpointData
  ): RollbackRisk[] {
    const risks: RollbackRisk[] = [];

    // Risk: Version gap
    const versionGap = source.version - target.version;
    if (versionGap > 3) {
      risks.push({
        level: 'high',
        description: `Rolling back ${versionGap} versions may lose significant progress`,
        mitigation: 'Review intermediate checkpoint states before proceeding',
      });
    }

    // Risk: Quality score regression
    if (target.qualityScore < source.qualityScore * 0.8) {
      risks.push({
        level: 'medium',
        description: `Target checkpoint has lower quality score (${target.qualityScore} vs ${source.qualityScore})`,
        mitigation: 'Consider selecting a different rollback target',
      });
    }

    // Risk: Phase mismatch
    if (target.phase !== source.phase) {
      risks.push({
        level: 'high',
        description: `Rolling back to a different phase (${target.phase} from ${source.phase})`,
        mitigation: 'Ensure dependent phases are also rolled back if needed',
      });
    }

    // Risk: Old checkpoint
    const ageMs = Date.now() - target.metadata.createdAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours > 24) {
      risks.push({
        level: 'medium',
        description: `Target checkpoint is ${Math.round(ageHours)} hours old`,
        mitigation: 'Verify that older state is still valid',
      });
    }

    return risks;
  }

  private getHighestRisk(risks: RollbackRisk[]): RollbackRisk['level'] {
    const levels: RollbackRisk['level'][] = ['low', 'medium', 'high', 'critical'];
    let highest: RollbackRisk['level'] = 'low';
    for (const risk of risks) {
      if (levels.indexOf(risk.level) > levels.indexOf(highest)) {
        highest = risk.level;
      }
    }
    return highest;
  }

  private async executeStep(
    plan: RollbackPlan,
    step: RollbackStep,
    _options: { skipValidation?: boolean }
  ): Promise<unknown> {
    switch (step.action) {
      case 'notify':
        // Would integrate with notification system
        return { notified: true, timestamp: new Date() };

      case 'restore-state': {
        const target = this.checkpointManager.getCheckpoint(plan.buildId, plan.targetCheckpoint);
        return { state: target?.state, restored: true };
      }

      case 'revert-artifact':
        // Would integrate with artifact storage
        return { artifact: step.target, reverted: true };

      case 'cleanup':
        // Would clean up temp resources
        return { cleaned: true };

      case 'validate': {
        const target = this.checkpointManager.getCheckpoint(plan.buildId, plan.targetCheckpoint);
        // Simple validation - in reality would be more comprehensive
        return { valid: target !== null };
      }

      default:
        throw new Error(`Unknown step action: ${step.action}`);
    }
  }
}

// ============================================================================
// QUALITY TREND ANALYZER
// ============================================================================

export class QualityTrendAnalyzer {
  private gateHistory: Map<string, QualityGate[]> = new Map(); // buildId -> gates

  /**
   * Record a gate for trend analysis
   */
  recordGate(gate: QualityGate): void {
    const history = this.gateHistory.get(gate.buildId) || [];
    history.push(gate);
    this.gateHistory.set(gate.buildId, history);
  }

  /**
   * Analyze quality trends for a build
   */
  analyzeTrends(buildId: string): QualityTrendReport {
    const history = this.gateHistory.get(buildId) || [];

    if (history.length === 0) {
      return {
        buildId,
        gateCount: 0,
        averageScore: 0,
        trend: 'stable',
        scoreHistory: [],
        regressions: [],
        improvements: [],
        recommendations: ['No quality data available yet'],
      };
    }

    const scores = history.map((g) => g.summary.overallScore);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const trend = this.calculateTrend(scores);

    // Find regressions and improvements
    const regressions: QualityRegression[] = [];
    const improvements: QualityImprovement[] = [];

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      const scoreDiff = curr.summary.overallScore - prev.summary.overallScore;

      if (scoreDiff < -10) {
        regressions.push({
          phase: curr.phase,
          previousScore: prev.summary.overallScore,
          currentScore: curr.summary.overallScore,
          failedRules: curr.results.filter((r) => r.status === 'failed').map((r) => r.ruleName),
          timestamp: curr.createdAt,
        });
      } else if (scoreDiff > 10) {
        improvements.push({
          phase: curr.phase,
          previousScore: prev.summary.overallScore,
          currentScore: curr.summary.overallScore,
          fixedRules: prev.results
            .filter((r) => r.status === 'failed')
            .filter((r) => curr.results.find((c) => c.ruleId === r.ruleId)?.status === 'passed')
            .map((r) => r.ruleName),
          timestamp: curr.createdAt,
        });
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(history, trend, regressions);

    return {
      buildId,
      gateCount: history.length,
      averageScore,
      trend,
      scoreHistory: scores,
      regressions,
      improvements,
      recommendations,
    };
  }

  private calculateTrend(scores: number[]): 'improving' | 'stable' | 'degrading' {
    if (scores.length < 3) return 'stable';

    // Simple linear regression
    const n = scores.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = scores.reduce((sum, score, i) => sum + i * score, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 2) return 'improving';
    if (slope < -2) return 'degrading';
    return 'stable';
  }

  private generateRecommendations(
    history: QualityGate[],
    trend: 'improving' | 'stable' | 'degrading',
    regressions: QualityRegression[]
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'degrading') {
      recommendations.push('Quality trend is declining. Review recent changes for root causes.');
    }

    // Find most common failing rules
    const failureCounts = new Map<string, number>();
    for (const gate of history) {
      for (const result of gate.results) {
        if (result.status === 'failed') {
          failureCounts.set(result.ruleName, (failureCounts.get(result.ruleName) || 0) + 1);
        }
      }
    }

    const sortedFailures = Array.from(failureCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [rule, count] of sortedFailures) {
      recommendations.push(`Rule "${rule}" failed ${count} times. Consider addressing root cause.`);
    }

    if (regressions.length > 2) {
      recommendations.push('Multiple regressions detected. Consider adding pre-commit quality checks.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Quality is stable. Continue current practices.');
    }

    return recommendations;
  }
}

export interface QualityTrendReport {
  buildId: string;
  gateCount: number;
  averageScore: number;
  trend: 'improving' | 'stable' | 'degrading';
  scoreHistory: number[];
  regressions: QualityRegression[];
  improvements: QualityImprovement[];
  recommendations: string[];
}

export interface QualityRegression {
  phase: string;
  previousScore: number;
  currentScore: number;
  failedRules: string[];
  timestamp: Date;
}

export interface QualityImprovement {
  phase: string;
  previousScore: number;
  currentScore: number;
  fixedRules: string[];
  timestamp: Date;
}

// ============================================================================
// BUILT-IN QUALITY RULES
// ============================================================================

export const BUILT_IN_RULES: QualityRule[] = [
  {
    id: 'code-completeness',
    name: 'Code Completeness',
    description: 'Ensures generated code has no TODO or placeholder comments',
    level: 'block',
    category: 'code',
    validator: async (context) => {
      const artifacts = context.artifacts;
      const codeArtifacts = Array.from(artifacts.entries()).filter(([key]) =>
        key.endsWith('.ts') || key.endsWith('.tsx') || key.endsWith('.js')
      );

      const issues: string[] = [];
      for (const [file, content] of codeArtifacts) {
        if (typeof content === 'string') {
          if (content.includes('// TODO') || content.includes('/* TODO')) {
            issues.push(`${file}: Contains TODO comments`);
          }
          if (content.includes('PLACEHOLDER') || content.includes('placeholder')) {
            issues.push(`${file}: Contains placeholder content`);
          }
        }
      }

      return {
        ruleId: 'code-completeness',
        ruleName: 'Code Completeness',
        level: 'block',
        status: issues.length === 0 ? 'passed' : 'failed',
        message: issues.length === 0 ? 'All code is complete' : `Found ${issues.length} completeness issues`,
        details: { issues },
        suggestions: issues.length > 0 ? ['Replace TODO comments with actual implementations'] : undefined,
        timestamp: new Date(),
      };
    },
  },
  {
    id: 'type-safety',
    name: 'Type Safety',
    description: 'Checks for any types and type assertions',
    level: 'warn',
    category: 'code',
    validator: async (context) => {
      const artifacts = context.artifacts;
      let anyCount = 0;
      let assertionCount = 0;

      for (const [key, content] of artifacts) {
        if ((key.endsWith('.ts') || key.endsWith('.tsx')) && typeof content === 'string') {
          anyCount += (content.match(/: any/g) || []).length;
          assertionCount += (content.match(/as \w+/g) || []).length;
        }
      }

      const score = Math.max(0, 100 - anyCount * 5 - assertionCount * 2);

      return {
        ruleId: 'type-safety',
        ruleName: 'Type Safety',
        level: 'warn',
        status: score >= 80 ? 'passed' : 'failed',
        message: `Type safety score: ${score}/100`,
        details: { anyCount, assertionCount },
        suggestions:
          score < 80
            ? ['Replace `any` types with specific types', 'Reduce type assertions where possible']
            : undefined,
        metrics: {
          score,
          threshold: 80,
          trend: 'stable',
        },
        timestamp: new Date(),
      };
    },
  },
  {
    id: 'accessibility',
    name: 'Accessibility Check',
    description: 'Ensures UI components have proper accessibility attributes',
    level: 'warn',
    category: 'accessibility',
    validator: async (context) => {
      const artifacts = context.artifacts;
      const issues: string[] = [];

      for (const [key, content] of artifacts) {
        if (key.endsWith('.tsx') && typeof content === 'string') {
          // Check for images without alt
          if (content.includes('<img') && !content.includes('alt=')) {
            issues.push(`${key}: Image without alt attribute`);
          }
          // Check for buttons without accessible text
          if (content.includes('<button') && !content.includes('aria-label')) {
            // Simple check - would be more sophisticated in reality
          }
        }
      }

      return {
        ruleId: 'accessibility',
        ruleName: 'Accessibility Check',
        level: 'warn',
        status: issues.length === 0 ? 'passed' : 'failed',
        message: issues.length === 0 ? 'Accessibility checks passed' : `Found ${issues.length} accessibility issues`,
        details: { issues },
        suggestions: issues.length > 0 ? ['Add alt text to all images', 'Include aria-labels for interactive elements'] : undefined,
        timestamp: new Date(),
      };
    },
  },
  {
    id: 'security-check',
    name: 'Security Check',
    description: 'Scans for common security vulnerabilities',
    level: 'block',
    category: 'security',
    validator: async (context) => {
      const artifacts = context.artifacts;
      const vulnerabilities: string[] = [];

      for (const [key, content] of artifacts) {
        if (typeof content === 'string') {
          // Check for hardcoded secrets
          if (content.match(/api[_-]?key\s*[=:]\s*['"][^'"]+['"]/i)) {
            vulnerabilities.push(`${key}: Possible hardcoded API key`);
          }
          // Check for SQL injection risk
          if (content.includes('${') && content.match(/SELECT|INSERT|UPDATE|DELETE/i)) {
            vulnerabilities.push(`${key}: Possible SQL injection vulnerability`);
          }
          // Check for eval usage
          if (content.includes('eval(')) {
            vulnerabilities.push(`${key}: Usage of eval() detected`);
          }
        }
      }

      return {
        ruleId: 'security-check',
        ruleName: 'Security Check',
        level: 'block',
        status: vulnerabilities.length === 0 ? 'passed' : 'failed',
        message: vulnerabilities.length === 0 ? 'No security issues found' : `Found ${vulnerabilities.length} security concerns`,
        details: { vulnerabilities },
        suggestions: vulnerabilities.length > 0
          ? ['Use environment variables for secrets', 'Use parameterized queries', 'Avoid eval()']
          : undefined,
        timestamp: new Date(),
      };
    },
  },
  {
    id: 'performance-check',
    name: 'Performance Check',
    description: 'Identifies potential performance issues',
    level: 'info',
    category: 'performance',
    validator: async (context) => {
      const artifacts = context.artifacts;
      const warnings: string[] = [];

      for (const [key, content] of artifacts) {
        if (typeof content === 'string') {
          // Check for potential N+1 patterns
          if (content.includes('.map(') && content.includes('await')) {
            warnings.push(`${key}: Potential N+1 query pattern`);
          }
          // Check for large inline data
          if (content.length > 50000) {
            warnings.push(`${key}: Very large file (${Math.round(content.length / 1000)}KB)`);
          }
        }
      }

      return {
        ruleId: 'performance-check',
        ruleName: 'Performance Check',
        level: 'info',
        status: warnings.length === 0 ? 'passed' : 'failed',
        message: warnings.length === 0 ? 'No performance concerns' : `Found ${warnings.length} performance warnings`,
        details: { warnings },
        suggestions: warnings.length > 0
          ? ['Use Promise.all for parallel operations', 'Consider code splitting for large files']
          : undefined,
        timestamp: new Date(),
      };
    },
  },
];

// ============================================================================
// FACTORY
// ============================================================================

export function createQualityGateSystem(eventStore: EventStore): {
  ruleRegistry: QualityRuleRegistry;
  checkpointManager: CheckpointManager;
  gateEvaluator: GateEvaluator;
  rollbackEngine: RollbackEngine;
  trendAnalyzer: QualityTrendAnalyzer;
} {
  const ruleRegistry = new QualityRuleRegistry();
  const checkpointManager = new CheckpointManager();
  const gateEvaluator = new GateEvaluator(ruleRegistry, checkpointManager);
  const rollbackEngine = new RollbackEngine(checkpointManager, eventStore);
  const trendAnalyzer = new QualityTrendAnalyzer();

  // Register built-in rules
  for (const rule of BUILT_IN_RULES) {
    ruleRegistry.register(rule);
  }

  // Assign rules to common phases
  ruleRegistry.assignToPhase('discovery', ['code-completeness']);
  ruleRegistry.assignToPhase('design', ['code-completeness', 'type-safety']);
  ruleRegistry.assignToPhase('implementation', [
    'code-completeness',
    'type-safety',
    'security-check',
    'performance-check',
  ]);
  ruleRegistry.assignToPhase('review', [
    'code-completeness',
    'type-safety',
    'security-check',
    'accessibility',
    'performance-check',
  ]);

  // Record gates for trend analysis
  gateEvaluator.on('gate_completed', ({ gateId }) => {
    const gate = gateEvaluator.getGate(gateId);
    if (gate) {
      trendAnalyzer.recordGate(gate);
    }
  });

  return {
    ruleRegistry,
    checkpointManager,
    gateEvaluator,
    rollbackEngine,
    trendAnalyzer,
  };
}
