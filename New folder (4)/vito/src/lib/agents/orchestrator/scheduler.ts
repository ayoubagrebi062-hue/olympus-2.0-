/**
 * OLYMPUS 2.0 - Agent Scheduler
 */

import type { AgentId, BuildPhase, AgentOutput } from '../types';
import type { BuildPlan, QueueItem, OrchestrationOptions } from './types';
import { getAgent } from '../registry';
import { getReadyAgents } from './planner';

/** Agent scheduler - manages execution queue and concurrency */
export class AgentScheduler {
  private queue: Map<AgentId, QueueItem> = new Map();
  private running: Set<AgentId> = new Set();
  private completed: Set<AgentId> = new Set();
  private failed: Set<AgentId> = new Set();
  private maxConcurrency: number;
  private currentPhase: BuildPhase | null = null;
  private plan: BuildPlan;

  constructor(plan: BuildPlan, maxConcurrency: number = 3) {
    this.plan = plan;
    this.maxConcurrency = maxConcurrency;
    this.initializeQueue();
  }

  /** Initialize queue from plan */
  private initializeQueue(): void {
    console.log(`[Scheduler] Initializing queue from plan with ${this.plan.phases.length} phases`);
    let priority = 0;
    for (const phasePlan of this.plan.phases) {
      console.log(`[Scheduler] Queueing phase ${phasePlan.phase} with ${phasePlan.agents.length} agents: ${phasePlan.agents.join(', ')}`);
      for (const agentId of phasePlan.agents) {
        const agent = getAgent(agentId);
        this.queue.set(agentId, {
          agentId,
          phase: phasePlan.phase,
          priority: priority++,
          dependencies: agent?.dependencies || [],
          status: 'queued',
        });
      }
    }
    console.log(`[Scheduler] Queue initialized with ${this.queue.size} agents total`);
  }

  /** Set current phase */
  setPhase(phase: BuildPhase): void {
    this.currentPhase = phase;
  }

  /** Get next agents to execute */
  getNextAgents(): AgentId[] {
    if (!this.currentPhase) return [];

    const phasePlan = this.plan.phases.find((p) => p.phase === this.currentPhase);
    if (!phasePlan) return [];

    // Get ready agents - pass failed set so failed deps don't block downstream agents
    const ready = getReadyAgents(this.plan, this.completed, this.running, this.currentPhase, this.failed);

    // Limit by concurrency
    const availableSlots = this.maxConcurrency - this.running.size;
    if (availableSlots <= 0) return [];

    // For sequential phases, only return one
    if (!phasePlan.parallel) {
      return ready.slice(0, 1);
    }

    return ready.slice(0, availableSlots);
  }

  /** Mark agent as started */
  startAgent(agentId: AgentId): void {
    this.running.add(agentId);
    const item = this.queue.get(agentId);
    if (item) item.status = 'running';
  }

  /** Mark agent as completed */
  completeAgent(agentId: AgentId): void {
    this.running.delete(agentId);
    this.completed.add(agentId);
    const item = this.queue.get(agentId);
    if (item) item.status = 'completed';
  }

  /** Mark agent as failed */
  failAgent(agentId: AgentId): void {
    this.running.delete(agentId);
    this.failed.add(agentId);
    const item = this.queue.get(agentId);
    if (item) item.status = 'failed';
  }

  /** Check if phase is complete */
  isPhaseComplete(): boolean {
    if (!this.currentPhase) {
      console.log(`[Scheduler] isPhaseComplete: No current phase set`);
      return false;
    }

    const phasePlan = this.plan.phases.find((p) => p.phase === this.currentPhase);
    if (!phasePlan) {
      console.log(`[Scheduler] isPhaseComplete: Phase ${this.currentPhase} NOT FOUND in plan! Plan phases: ${this.plan.phases.map(p => p.phase).join(', ')}`);
      return true;
    }

    const completionStatus = phasePlan.agents.map((agentId) => ({
      agentId,
      completed: this.completed.has(agentId),
      failed: this.failed.has(agentId),
      optional: getAgent(agentId)?.optional || false,
    }));

    const allDone = completionStatus.every((s) => {
      if (s.completed) return true;
      if (s.failed) return s.optional;
      return false;
    });

    if (allDone) {
      console.log(`[Scheduler] Phase ${this.currentPhase} COMPLETE. Status: ${JSON.stringify(completionStatus)}`);
    }

    return allDone;
  }

  /** Check if all agents are done */
  isComplete(): boolean {
    const totalRequired = this.plan.phases.reduce((sum, p) => {
      const requiredAgents = p.agents.filter((id) => !getAgent(id)?.optional);
      return sum + requiredAgents.length;
    }, 0);

    const completedRequired = Array.from(this.completed).filter((id) => !getAgent(id)?.optional).length;
    return completedRequired >= totalRequired;
  }

  /** Check if any critical agent failed */
  hasCriticalFailure(): boolean {
    for (const agentId of Array.from(this.failed)) {
      const agent = getAgent(agentId);
      if (agent && !agent.optional) return true;
    }
    return false;
  }

  /** Get currently running agents */
  getRunningAgents(): AgentId[] {
    return Array.from(this.running);
  }

  /** Get completed agents */
  getCompletedAgents(): AgentId[] {
    return Array.from(this.completed);
  }

  /** Get failed agents */
  getFailedAgents(): AgentId[] {
    return Array.from(this.failed);
  }

  /** Get progress percentage */
  getProgress(): number {
    const total = this.queue.size;
    if (total === 0) return 100;
    return Math.round((this.completed.size / total) * 100);
  }

  /** Get queue status */
  getQueueStatus(): { queued: number; running: number; completed: number; failed: number } {
    return {
      queued: this.queue.size - this.completed.size - this.failed.size - this.running.size,
      running: this.running.size,
      completed: this.completed.size,
      failed: this.failed.size,
    };
  }

  /** Reset scheduler state */
  reset(): void {
    this.running.clear();
    this.completed.clear();
    this.failed.clear();
    this.currentPhase = null;
    this.initializeQueue();
  }

  /** Skip optional agents */
  skipOptionalAgents(): void {
    for (const [agentId, item] of Array.from(this.queue)) {
      const agent = getAgent(agentId);
      if (agent?.optional && item.status === 'queued') {
        this.completed.add(agentId);
        item.status = 'completed';
      }
    }
  }

  /**
   * Get agents that are blocked due to unsatisfiable dependencies
   * These are agents in the current phase that:
   * - Are not completed, not running, not failed
   * - Have dependencies that will never be satisfied (not in completed, not optional, not in failed)
   */
  getBlockedAgents(): AgentId[] {
    if (!this.currentPhase) return [];

    const phasePlan = this.plan.phases.find((p) => p.phase === this.currentPhase);
    if (!phasePlan) return [];

    const blocked: AgentId[] = [];
    for (const agentId of phasePlan.agents) {
      // Skip if already processed
      if (this.completed.has(agentId) || this.running.has(agentId) || this.failed.has(agentId)) {
        continue;
      }

      // Check if any dependency is unsatisfiable
      const agent = getAgent(agentId);
      if (!agent) continue;

      const hasUnsatisfiableDep = agent.dependencies.some((depId) => {
        const dep = getAgent(depId);
        // Dep is unsatisfiable if: not completed, not optional, AND not failed
        // (If it failed, our fix treats it as satisfied)
        // The issue is deps that were NEVER RUN (not in any set)
        const isCompleted = this.completed.has(depId);
        const isFailed = this.failed.has(depId);
        const isOptional = dep?.optional || false;

        // If dep is not completed AND not failed AND not optional, it's blocking
        return !isCompleted && !isFailed && !isOptional;
      });

      if (hasUnsatisfiableDep) {
        blocked.push(agentId);
      }
    }

    return blocked;
  }

  /**
   * Mark blocked agents as failed so the phase can complete
   * This is called when deadlock is detected
   */
  markBlockedAsFailed(): void {
    const blocked = this.getBlockedAgents();
    console.log(`[Scheduler] Marking ${blocked.length} blocked agents as failed: ${blocked.join(', ')}`);
    for (const agentId of blocked) {
      this.failed.add(agentId);
      const item = this.queue.get(agentId);
      if (item) item.status = 'failed';
    }
  }
}
