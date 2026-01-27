/**
 * Build State Machine
 * Phase 3 of OLYMPUS 50X - Build Plan Integration
 *
 * Manages build state transitions with validation.
 * Implements a finite state machine pattern for build lifecycle.
 */

import { EventEmitter } from 'events';
import {
  BuildPlanStore,
  BuildPlan,
  BuildPhase,
  AgentPlan,
  BuildPlanStatus,
} from './build-plan-store';
import {
  validateTransition,
  PhaseId,
  TransitionContext,
  TransitionResult,
  canSkipPhase,
  getPhaseAgents,
  transitionRequiresApproval,
} from './phase-rules';

// ============================================================================
// TYPES
// ============================================================================

export type BuildState =
  | 'created'
  | 'planning'
  | 'running'
  | 'paused'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface StateTransition {
  from: BuildState | BuildState[];
  to: BuildState;
  trigger: string;
  guard?: (context: StateMachineContext) => Promise<boolean>;
  action?: (context: StateMachineContext, data?: Record<string, unknown>) => Promise<void>;
}

export interface StateMachineContext {
  buildId: string;
  plan: BuildPlan;
  currentState: BuildState;
  currentPhase: PhaseId | null;
  currentAgent: string | null;
  error?: Error;
  metadata: Record<string, unknown>;
}

export interface StateEvent {
  type: string;
  buildId: string;
  from?: BuildState;
  to?: BuildState;
  trigger?: string;
  phase?: PhaseId | null;
  agent?: string | null;
  data?: Record<string, unknown>;
  error?: Error;
  timestamp: Date;
}

// ============================================================================
// STATE MACHINE
// ============================================================================

export class BuildStateMachine extends EventEmitter {
  private store: BuildPlanStore;
  private state: BuildState;
  private context: StateMachineContext;
  private transitions: StateTransition[];
  private history: StateEvent[];

  constructor(store: BuildPlanStore) {
    super();
    this.store = store;
    this.state = 'created';
    this.history = [];
    this.context = {
      buildId: '',
      plan: {} as BuildPlan,
      currentState: 'created',
      currentPhase: null,
      currentAgent: null,
      metadata: {},
    };

    this.transitions = this.defineTransitions();
  }

  // ==========================================================================
  // TRANSITION DEFINITIONS
  // ==========================================================================

  private defineTransitions(): StateTransition[] {
    return [
      // created -> planning
      {
        from: 'created',
        to: 'planning',
        trigger: 'start',
        action: async ctx => {
          this.emitEvent('planning_started', { buildId: ctx.buildId });
        },
      },

      // planning -> running
      {
        from: 'planning',
        to: 'running',
        trigger: 'plan_complete',
        guard: async ctx => ctx.plan.agents.length > 0,
        action: async ctx => {
          await this.store.updateStatus(ctx.plan.id, 'running');
          this.emitEvent('execution_started', { buildId: ctx.buildId });
        },
      },

      // running -> running (agent complete, move to next)
      {
        from: 'running',
        to: 'running',
        trigger: 'agent_complete',
        action: async (ctx, data) => {
          const agentId = data?.agentId as string;
          if (agentId) {
            await this.store.updateAgentStatus(ctx.plan.id, agentId, 'completed', {
              output: data?.output as Record<string, unknown>,
            });
          }
          await this.advanceToNextAgent(ctx);
        },
      },

      // running -> running (agent failed but can retry)
      {
        from: 'running',
        to: 'running',
        trigger: 'agent_retry',
        guard: async ctx => {
          if (!ctx.currentAgent) return false;
          return this.store.canAgentRetry(ctx.plan.id, ctx.currentAgent);
        },
        action: async (ctx, data) => {
          const agentId = ctx.currentAgent;
          if (agentId) {
            const newCount = await this.store.incrementRetryCount(ctx.plan.id, agentId);
            this.emitEvent('agent_retrying', {
              buildId: ctx.buildId,
              agentId,
              retryCount: newCount,
              error: data?.error,
            });
          }
        },
      },

      // running -> paused
      {
        from: 'running',
        to: 'paused',
        trigger: 'pause',
        action: async ctx => {
          await this.store.updateStatus(ctx.plan.id, 'paused');
          this.emitEvent('execution_paused', { buildId: ctx.buildId });
        },
      },

      // paused -> running
      {
        from: 'paused',
        to: 'running',
        trigger: 'resume',
        action: async ctx => {
          await this.store.updateStatus(ctx.plan.id, 'running');
          this.emitEvent('execution_resumed', { buildId: ctx.buildId });
        },
      },

      // running -> waiting_approval (for dangerous operations)
      {
        from: 'running',
        to: 'waiting_approval',
        trigger: 'requires_approval',
        action: async (ctx, data) => {
          this.emitEvent('approval_required', {
            buildId: ctx.buildId,
            reason: data?.reason,
            phase: ctx.currentPhase,
          });
        },
      },

      // waiting_approval -> running
      {
        from: 'waiting_approval',
        to: 'running',
        trigger: 'approved',
        action: async (ctx, data) => {
          this.emitEvent('approval_granted', {
            buildId: ctx.buildId,
            approvedBy: data?.approvedBy,
          });
        },
      },

      // waiting_approval -> cancelled
      {
        from: 'waiting_approval',
        to: 'cancelled',
        trigger: 'rejected',
        action: async (ctx, data) => {
          await this.store.updateStatus(ctx.plan.id, 'cancelled');
          this.emitEvent('approval_rejected', {
            buildId: ctx.buildId,
            rejectedBy: data?.rejectedBy,
            reason: data?.reason,
          });
        },
      },

      // running -> completed
      {
        from: 'running',
        to: 'completed',
        trigger: 'all_agents_complete',
        guard: async ctx => {
          return ctx.plan.agents.every(a => a.status === 'completed' || a.status === 'skipped');
        },
        action: async ctx => {
          await this.store.updateStatus(ctx.plan.id, 'completed');
          this.emitEvent('build_completed', {
            buildId: ctx.buildId,
            duration: Date.now() - ctx.plan.createdAt.getTime(),
          });
        },
      },

      // running -> failed
      {
        from: 'running',
        to: 'failed',
        trigger: 'critical_failure',
        action: async (ctx, data) => {
          await this.store.updateStatus(ctx.plan.id, 'failed');
          this.emitEvent('build_failed', {
            buildId: ctx.buildId,
            error: data?.error,
            agent: ctx.currentAgent,
            phase: ctx.currentPhase,
          });
        },
      },

      // any (except completed/failed) -> cancelled
      {
        from: ['created', 'planning', 'running', 'paused', 'waiting_approval'],
        to: 'cancelled',
        trigger: 'cancel',
        action: async (ctx, data) => {
          await this.store.updateStatus(ctx.plan.id, 'cancelled');
          this.emitEvent('build_cancelled', {
            buildId: ctx.buildId,
            reason: data?.reason,
          });
        },
      },
    ];
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Initialize state machine for a build
   */
  async initialize(buildId: string, plan: BuildPlan): Promise<void> {
    this.state = 'created';
    this.history = [];
    this.context = {
      buildId,
      plan,
      currentState: 'created',
      currentPhase: null,
      currentAgent: null,
      metadata: {},
    };

    this.emitEvent('initialized', { buildId, state: this.state });
  }

  /**
   * Trigger a state transition
   */
  async trigger(event: string, data?: Record<string, unknown>): Promise<boolean> {
    const transition = this.findTransition(event);

    if (!transition) {
      this.emitEvent('invalid_transition', {
        buildId: this.context.buildId,
        from: this.state,
        trigger: event,
        message: `No transition from ${this.state} on ${event}`,
      });
      return false;
    }

    // Check guard
    if (transition.guard) {
      const allowed = await transition.guard(this.context);
      if (!allowed) {
        this.emitEvent('transition_blocked', {
          buildId: this.context.buildId,
          from: this.state,
          to: transition.to,
          trigger: event,
          reason: 'Guard condition failed',
        });
        return false;
      }
    }

    // Execute transition
    const previousState = this.state;
    this.state = transition.to;
    this.context.currentState = transition.to;

    // Record in history
    this.history.push({
      type: 'transition',
      buildId: this.context.buildId,
      from: previousState,
      to: this.state,
      trigger: event,
      data,
      timestamp: new Date(),
    });

    // Execute action
    if (transition.action) {
      try {
        await transition.action(this.context, data);
      } catch (error) {
        // Rollback on action failure
        this.state = previousState;
        this.context.currentState = previousState;
        this.emitEvent('action_failed', {
          buildId: this.context.buildId,
          error: error instanceof Error ? error.message : String(error),
          transition: { from: previousState, to: transition.to, trigger: event },
        });
        return false;
      }
    }

    this.emitEvent('transition', {
      buildId: this.context.buildId,
      from: previousState,
      to: this.state,
      trigger: event,
      data,
    });

    return true;
  }

  /**
   * Transition to next phase
   */
  async transitionPhase(toPhase: PhaseId): Promise<TransitionResult> {
    // Refresh plan from store
    const freshPlan = await this.store.getByBuildId(this.context.buildId);
    if (freshPlan) {
      this.context.plan = freshPlan;
    }

    // Check if approval is required
    if (transitionRequiresApproval(this.context.currentPhase, toPhase)) {
      await this.trigger('requires_approval', {
        reason: `Transition to ${toPhase} requires approval`,
        toPhase,
      });
    }

    // Build transition context
    const transitionContext: TransitionContext = {
      buildId: this.context.buildId,
      projectType: this.context.plan.projectType,
      fromPhase: this.context.currentPhase,
      toPhase,
      completedAgents: this.context.plan.agents
        .filter(a => a.status === 'completed')
        .map(a => a.agentId),
      agentOutputs: new Map(
        this.context.plan.agents
          .filter(a => a.output)
          .map(a => [a.agentId, a.output as Record<string, unknown>])
      ),
      qualityScores: new Map(), // Would load from judge store
      errors: new Map(
        this.context.plan.agents.filter(a => a.error).map(a => [a.agentId, a.error as string])
      ),
    };

    const result = await validateTransition(transitionContext);

    if (result.valid) {
      // Complete current phase if exists
      if (this.context.currentPhase) {
        await this.store.updatePhaseStatus(
          this.context.plan.id,
          this.context.currentPhase,
          'completed'
        );
      }

      // Start new phase
      this.context.currentPhase = toPhase;
      await this.store.updatePhaseStatus(this.context.plan.id, toPhase, 'running');

      this.emitEvent('phase_transition', {
        buildId: this.context.buildId,
        from: transitionContext.fromPhase,
        to: toPhase,
        warnings: result.warnings,
      });
    } else {
      this.emitEvent('phase_transition_blocked', {
        buildId: this.context.buildId,
        from: transitionContext.fromPhase,
        to: toPhase,
        errors: result.errors,
      });
    }

    return result;
  }

  /**
   * Skip a phase
   */
  async skipPhase(phase: PhaseId): Promise<boolean> {
    if (!canSkipPhase(phase, this.context.plan.projectType)) {
      this.emitEvent('phase_skip_denied', {
        buildId: this.context.buildId,
        phase,
        reason: 'Phase cannot be skipped for this project type',
      });
      return false;
    }

    await this.store.updatePhaseStatus(this.context.plan.id, phase, 'skipped');

    // Skip all agents in this phase
    const phaseAgents = getPhaseAgents(phase);
    for (const agentId of phaseAgents) {
      const agent = this.context.plan.agents.find(a => a.agentId === agentId);
      if (agent && agent.status === 'pending') {
        await this.store.updateAgentStatus(this.context.plan.id, agentId, 'skipped');
      }
    }

    this.emitEvent('phase_skipped', {
      buildId: this.context.buildId,
      phase,
    });

    return true;
  }

  /**
   * Get current state
   */
  getState(): BuildState {
    return this.state;
  }

  /**
   * Get current context
   */
  getContext(): StateMachineContext {
    return { ...this.context };
  }

  /**
   * Get transition history
   */
  getHistory(): StateEvent[] {
    return [...this.history];
  }

  /**
   * Get available transitions from current state
   */
  getAvailableTransitions(): string[] {
    return this.transitions
      .filter(t => {
        const fromStates = Array.isArray(t.from) ? t.from : [t.from];
        return fromStates.includes(this.state);
      })
      .map(t => t.trigger);
  }

  /**
   * Check if transition is valid
   */
  canTransition(event: string): boolean {
    return this.findTransition(event) !== undefined;
  }

  /**
   * Check if in terminal state
   */
  isTerminal(): boolean {
    return ['completed', 'failed', 'cancelled'].includes(this.state);
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private findTransition(trigger: string): StateTransition | undefined {
    return this.transitions.find(t => {
      const fromStates = Array.isArray(t.from) ? t.from : [t.from];
      return fromStates.includes(this.state) && t.trigger === trigger;
    });
  }

  private async advanceToNextAgent(ctx: StateMachineContext): Promise<void> {
    // Refresh plan
    const freshPlan = await this.store.getByBuildId(ctx.buildId);
    if (freshPlan) {
      ctx.plan = freshPlan;
    }

    const nextAgent = await this.store.getNextAgent(ctx.plan.id);

    if (nextAgent) {
      ctx.currentAgent = nextAgent.agentId;
      await this.store.updateAgentStatus(ctx.plan.id, nextAgent.agentId, 'running');

      // Check if we need to transition phases
      const agentPhase = nextAgent.phase as PhaseId;
      if (agentPhase !== ctx.currentPhase) {
        const result = await this.transitionPhase(agentPhase);
        if (!result.valid) {
          // Phase transition blocked - check if can skip
          if (canSkipPhase(agentPhase, ctx.plan.projectType)) {
            await this.skipPhase(agentPhase);
            await this.advanceToNextAgent(ctx); // Try next
          } else {
            await this.trigger('critical_failure', {
              error: `Phase transition blocked: ${result.errors.join(', ')}`,
            });
          }
        }
      }

      this.emitEvent('agent_started', {
        buildId: ctx.buildId,
        agentId: nextAgent.agentId,
        phase: ctx.currentPhase,
      });
    } else {
      // No more agents - check if complete
      const isComplete = await this.store.isPlanComplete(ctx.plan.id);
      if (isComplete) {
        await this.trigger('all_agents_complete');
      } else {
        // Check if failed
        const hasFailed = await this.store.hasPlanFailed(ctx.plan.id);
        if (hasFailed) {
          await this.trigger('critical_failure', {
            error: 'Required agent(s) failed without retry options',
          });
        }
      }
    }
  }

  private emitEvent(type: string, data: Record<string, unknown>): void {
    const event: StateEvent = {
      type,
      buildId: this.context.buildId,
      timestamp: new Date(),
      ...data,
    };

    this.history.push(event);
    this.emit(type, event);
    this.emit('stateEvent', event);
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createStateMachine(store: BuildPlanStore): BuildStateMachine {
  return new BuildStateMachine(store);
}
