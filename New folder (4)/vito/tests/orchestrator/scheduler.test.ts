/**
 * OLYMPUS 2.0 - Agent Scheduler Unit Tests
 * =========================================
 * Unit tests for agent execution scheduling and queue management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock types matching the actual implementation
type BuildPhase = 'discovery' | 'architecture' | 'implementation' | 'quality' | 'deployment';
type AgentId = string;
type BuildTier = 'starter' | 'professional' | 'ultimate' | 'enterprise';

interface PhasePlan {
  phase: BuildPhase;
  agents: AgentId[];
  parallel: boolean;
  optional: boolean;
  estimatedTokens: number;
}

interface BuildPlan {
  buildId: string;
  tier: BuildTier;
  phases: PhasePlan[];
  totalAgents: number;
  estimatedTokens: number;
  estimatedCost: number;
  estimatedDuration: number;
}

interface QueueItem {
  agentId: AgentId;
  phase: BuildPhase;
  priority: number;
  dependencies: AgentId[];
  status: 'queued' | 'running' | 'completed' | 'failed';
}

// Mock agent registry
const MOCK_AGENTS: Record<string, { id: string; optional: boolean; dependencies: AgentId[] }> = {
  oracle: { id: 'oracle', optional: false, dependencies: [] },
  scope: { id: 'scope', optional: false, dependencies: ['oracle'] },
  archon: { id: 'archon', optional: false, dependencies: [] },
  datum: { id: 'datum', optional: false, dependencies: [] },
  pixel: { id: 'pixel', optional: false, dependencies: [] },
  wire: { id: 'wire', optional: false, dependencies: [] },
  nexus: { id: 'nexus', optional: false, dependencies: [] },
  forge: { id: 'forge', optional: false, dependencies: [] },
  sentinel: { id: 'sentinel', optional: true, dependencies: [] },
  guardian: { id: 'guardian', optional: true, dependencies: [] },
};

function getAgent(id: AgentId) {
  return MOCK_AGENTS[id] || null;
}

// Test implementation of AgentScheduler
class TestAgentScheduler {
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

  private initializeQueue(): void {
    let priority = 0;
    for (const phasePlan of this.plan.phases) {
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
  }

  setPhase(phase: BuildPhase): void {
    this.currentPhase = phase;
  }

  getNextAgents(): AgentId[] {
    if (!this.currentPhase) return [];

    const phasePlan = this.plan.phases.find((p) => p.phase === this.currentPhase);
    if (!phasePlan) return [];

    // Get ready agents (not running, not completed, not failed, dependencies met)
    const ready = phasePlan.agents.filter((agentId) => {
      if (this.running.has(agentId)) return false;
      if (this.completed.has(agentId)) return false;
      if (this.failed.has(agentId)) return false;

      const item = this.queue.get(agentId);
      if (!item) return false;

      // Check dependencies
      return item.dependencies.every((dep) => this.completed.has(dep));
    });

    const availableSlots = this.maxConcurrency - this.running.size;
    if (availableSlots <= 0) return [];

    if (!phasePlan.parallel) {
      return ready.slice(0, 1);
    }

    return ready.slice(0, availableSlots);
  }

  startAgent(agentId: AgentId): void {
    this.running.add(agentId);
    const item = this.queue.get(agentId);
    if (item) item.status = 'running';
  }

  completeAgent(agentId: AgentId): void {
    this.running.delete(agentId);
    this.completed.add(agentId);
    const item = this.queue.get(agentId);
    if (item) item.status = 'completed';
  }

  failAgent(agentId: AgentId): void {
    this.running.delete(agentId);
    this.failed.add(agentId);
    const item = this.queue.get(agentId);
    if (item) item.status = 'failed';
  }

  isPhaseComplete(): boolean {
    if (!this.currentPhase) return false;

    const phasePlan = this.plan.phases.find((p) => p.phase === this.currentPhase);
    if (!phasePlan) return true;

    return phasePlan.agents.every((agentId) => {
      if (this.completed.has(agentId)) return true;
      if (this.failed.has(agentId)) {
        const agent = getAgent(agentId);
        return agent?.optional || false;
      }
      return false;
    });
  }

  isComplete(): boolean {
    const totalRequired = this.plan.phases.reduce((sum, p) => {
      const requiredAgents = p.agents.filter((id) => !getAgent(id)?.optional);
      return sum + requiredAgents.length;
    }, 0);

    const completedRequired = Array.from(this.completed).filter((id) => !getAgent(id)?.optional).length;
    return completedRequired >= totalRequired;
  }

  hasCriticalFailure(): boolean {
    for (const agentId of Array.from(this.failed)) {
      const agent = getAgent(agentId);
      if (agent && !agent.optional) return true;
    }
    return false;
  }

  getRunningAgents(): AgentId[] {
    return Array.from(this.running);
  }

  getCompletedAgents(): AgentId[] {
    return Array.from(this.completed);
  }

  getFailedAgents(): AgentId[] {
    return Array.from(this.failed);
  }

  getProgress(): number {
    const total = this.queue.size;
    if (total === 0) return 100;
    return Math.round((this.completed.size / total) * 100);
  }

  getQueueStatus(): { queued: number; running: number; completed: number; failed: number } {
    return {
      queued: this.queue.size - this.completed.size - this.failed.size - this.running.size,
      running: this.running.size,
      completed: this.completed.size,
      failed: this.failed.size,
    };
  }

  reset(): void {
    this.running.clear();
    this.completed.clear();
    this.failed.clear();
    this.currentPhase = null;
    this.initializeQueue();
  }

  skipOptionalAgents(): void {
    for (const [agentId, item] of Array.from(this.queue)) {
      const agent = getAgent(agentId);
      if (agent?.optional && item.status === 'queued') {
        this.completed.add(agentId);
        item.status = 'completed';
      }
    }
  }
}

// Helper to create test plans
function createTestPlan(tier: BuildTier = 'professional'): BuildPlan {
  const TIER_AGENTS: Record<BuildTier, AgentId[]> = {
    starter: ['oracle', 'scope', 'archon', 'pixel', 'wire'],
    professional: ['oracle', 'scope', 'archon', 'datum', 'pixel', 'wire', 'nexus', 'forge'],
    ultimate: ['oracle', 'scope', 'archon', 'datum', 'pixel', 'wire', 'nexus', 'forge', 'sentinel', 'guardian'],
    enterprise: ['oracle', 'scope', 'archon', 'datum', 'pixel', 'wire', 'nexus', 'forge', 'sentinel', 'guardian'],
  };

  const PHASE_AGENTS: Record<BuildPhase, AgentId[]> = {
    discovery: ['oracle', 'scope'],
    architecture: ['archon', 'datum'],
    implementation: ['pixel', 'wire', 'nexus', 'forge'],
    quality: ['sentinel', 'guardian'],
    deployment: [],
  };

  const tierAgents = TIER_AGENTS[tier];
  const phases: PhasePlan[] = [];
  const PHASE_ORDER: BuildPhase[] = ['discovery', 'architecture', 'implementation', 'quality', 'deployment'];

  for (const phase of PHASE_ORDER) {
    const phaseAgents = PHASE_AGENTS[phase].filter((id) => tierAgents.includes(id));
    if (phaseAgents.length === 0) continue;

    phases.push({
      phase,
      agents: phaseAgents,
      parallel: phase === 'implementation',
      optional: phase === 'quality',
      estimatedTokens: phaseAgents.length * 30000,
    });
  }

  const totalAgents = phases.reduce((sum, p) => sum + p.agents.length, 0);

  return {
    buildId: 'test-build',
    tier,
    phases,
    totalAgents,
    estimatedTokens: totalAgents * 30000,
    estimatedCost: 0,
    estimatedDuration: 0,
  };
}

describe('Agent Scheduler', () => {
  describe('Constructor and Initialization', () => {
    it('should initialize with a build plan', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      expect(scheduler.getProgress()).toBe(0);
      expect(scheduler.getRunningAgents()).toHaveLength(0);
      expect(scheduler.getCompletedAgents()).toHaveLength(0);
    });

    it('should respect custom max concurrency', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan, 5);

      scheduler.setPhase('implementation');
      const next = scheduler.getNextAgents();

      // Implementation is parallel, should return up to 5 agents
      expect(next.length).toBeLessThanOrEqual(5);
    });

    it('should queue all agents from all phases', () => {
      const plan = createTestPlan('professional');
      const scheduler = new TestAgentScheduler(plan);

      const status = scheduler.getQueueStatus();
      expect(status.queued).toBe(plan.totalAgents);
    });
  });

  describe('Phase Management', () => {
    it('should return no agents when phase not set', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      expect(scheduler.getNextAgents()).toHaveLength(0);
    });

    it('should return agents for current phase', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery');
      const next = scheduler.getNextAgents();

      expect(next.length).toBeGreaterThan(0);
      expect(next[0]).toBe('oracle'); // First agent in discovery
    });

    it('should return only one agent for sequential phases', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery'); // Sequential phase
      const next = scheduler.getNextAgents();

      expect(next).toHaveLength(1);
    });

    it('should return multiple agents for parallel phases', () => {
      const plan = createTestPlan('professional');
      const scheduler = new TestAgentScheduler(plan);

      // Complete prerequisite phases
      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');
      scheduler.completeAgent('oracle');
      scheduler.startAgent('scope');
      scheduler.completeAgent('scope');

      scheduler.setPhase('architecture');
      scheduler.startAgent('archon');
      scheduler.completeAgent('archon');
      scheduler.startAgent('datum');
      scheduler.completeAgent('datum');

      // Now implementation is parallel
      scheduler.setPhase('implementation');
      const next = scheduler.getNextAgents();

      expect(next.length).toBeGreaterThan(1);
    });
  });

  describe('Agent Lifecycle', () => {
    it('should track running agents', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');

      expect(scheduler.getRunningAgents()).toContain('oracle');
    });

    it('should track completed agents', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');
      scheduler.completeAgent('oracle');

      expect(scheduler.getCompletedAgents()).toContain('oracle');
      expect(scheduler.getRunningAgents()).not.toContain('oracle');
    });

    it('should track failed agents', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');
      scheduler.failAgent('oracle');

      expect(scheduler.getFailedAgents()).toContain('oracle');
      expect(scheduler.getRunningAgents()).not.toContain('oracle');
    });

    it('should not return running agents as next', () => {
      const plan = createTestPlan('professional');
      const scheduler = new TestAgentScheduler(plan, 5);

      scheduler.setPhase('implementation');
      scheduler.startAgent('pixel');

      const next = scheduler.getNextAgents();
      expect(next).not.toContain('pixel');
    });
  });

  describe('Concurrency Control', () => {
    it('should respect max concurrency', () => {
      const plan = createTestPlan('professional');
      const scheduler = new TestAgentScheduler(plan, 2);

      scheduler.setPhase('implementation');
      scheduler.startAgent('pixel');
      scheduler.startAgent('wire');

      const next = scheduler.getNextAgents();
      expect(next).toHaveLength(0); // No slots available
    });

    it('should free slots when agents complete', () => {
      const plan = createTestPlan('professional');
      const scheduler = new TestAgentScheduler(plan, 2);

      scheduler.setPhase('implementation');
      scheduler.startAgent('pixel');
      scheduler.startAgent('wire');
      scheduler.completeAgent('pixel');

      const next = scheduler.getNextAgents();
      expect(next.length).toBeGreaterThan(0); // One slot freed
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate progress correctly', () => {
      const plan = createTestPlan('starter');
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');
      scheduler.completeAgent('oracle');

      const progress = scheduler.getProgress();
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(100);
    });

    it('should report 100% when all complete', () => {
      const plan: BuildPlan = {
        buildId: 'test',
        tier: 'starter',
        phases: [
          { phase: 'discovery', agents: ['oracle'], parallel: false, optional: false, estimatedTokens: 30000 },
        ],
        totalAgents: 1,
        estimatedTokens: 30000,
        estimatedCost: 0,
        estimatedDuration: 0,
      };

      const scheduler = new TestAgentScheduler(plan);
      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');
      scheduler.completeAgent('oracle');

      expect(scheduler.getProgress()).toBe(100);
    });

    it('should return queue status', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');

      const status = scheduler.getQueueStatus();
      expect(status.running).toBe(1);
      expect(status.queued).toBe(plan.totalAgents - 1);
      expect(status.completed).toBe(0);
      expect(status.failed).toBe(0);
    });
  });

  describe('Phase Completion', () => {
    it('should detect incomplete phase', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery');
      expect(scheduler.isPhaseComplete()).toBe(false);
    });

    it('should detect complete phase', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');
      scheduler.completeAgent('oracle');
      scheduler.startAgent('scope');
      scheduler.completeAgent('scope');

      expect(scheduler.isPhaseComplete()).toBe(true);
    });

    it('should consider optional agent failures as complete', () => {
      const plan = createTestPlan('ultimate');
      const scheduler = new TestAgentScheduler(plan);

      // Complete discovery
      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');
      scheduler.completeAgent('oracle');
      scheduler.startAgent('scope');
      scheduler.completeAgent('scope');

      // Complete architecture
      scheduler.setPhase('architecture');
      scheduler.startAgent('archon');
      scheduler.completeAgent('archon');
      scheduler.startAgent('datum');
      scheduler.completeAgent('datum');

      // Complete implementation
      scheduler.setPhase('implementation');
      scheduler.startAgent('pixel');
      scheduler.completeAgent('pixel');
      scheduler.startAgent('wire');
      scheduler.completeAgent('wire');
      scheduler.startAgent('nexus');
      scheduler.completeAgent('nexus');
      scheduler.startAgent('forge');
      scheduler.completeAgent('forge');

      // Quality phase - fail optional agents
      scheduler.setPhase('quality');
      scheduler.startAgent('sentinel');
      scheduler.failAgent('sentinel');
      scheduler.startAgent('guardian');
      scheduler.failAgent('guardian');

      // Should still be complete because they're optional
      expect(scheduler.isPhaseComplete()).toBe(true);
    });
  });

  describe('Build Completion', () => {
    it('should detect incomplete build', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      expect(scheduler.isComplete()).toBe(false);
    });

    it('should detect complete build with all required agents', () => {
      const plan: BuildPlan = {
        buildId: 'test',
        tier: 'starter',
        phases: [
          { phase: 'discovery', agents: ['oracle'], parallel: false, optional: false, estimatedTokens: 30000 },
        ],
        totalAgents: 1,
        estimatedTokens: 30000,
        estimatedCost: 0,
        estimatedDuration: 0,
      };

      const scheduler = new TestAgentScheduler(plan);
      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');
      scheduler.completeAgent('oracle');

      expect(scheduler.isComplete()).toBe(true);
    });
  });

  describe('Critical Failure Detection', () => {
    it('should detect no failure when none failed', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      expect(scheduler.hasCriticalFailure()).toBe(false);
    });

    it('should detect critical failure for required agent', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');
      scheduler.failAgent('oracle'); // oracle is required

      expect(scheduler.hasCriticalFailure()).toBe(true);
    });

    it('should not flag optional agent failure as critical', () => {
      const plan = createTestPlan('ultimate');
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('quality');
      scheduler.startAgent('sentinel');
      scheduler.failAgent('sentinel'); // sentinel is optional

      expect(scheduler.hasCriticalFailure()).toBe(false);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');
      scheduler.completeAgent('oracle');

      scheduler.reset();

      expect(scheduler.getCompletedAgents()).toHaveLength(0);
      expect(scheduler.getRunningAgents()).toHaveLength(0);
      expect(scheduler.getProgress()).toBe(0);
    });
  });

  describe('Skip Optional Agents', () => {
    it('should skip all optional agents', () => {
      const plan = createTestPlan('ultimate');
      const scheduler = new TestAgentScheduler(plan);

      scheduler.skipOptionalAgents();

      const completed = scheduler.getCompletedAgents();
      expect(completed).toContain('sentinel');
      expect(completed).toContain('guardian');
    });

    it('should not skip required agents', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.skipOptionalAgents();

      const completed = scheduler.getCompletedAgents();
      expect(completed).not.toContain('oracle');
      expect(completed).not.toContain('archon');
    });
  });

  describe('Dependency Handling', () => {
    it('should not return agent with unmet dependencies', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery');
      const next = scheduler.getNextAgents();

      // scope depends on oracle, so only oracle should be returned first
      expect(next[0]).toBe('oracle');
      expect(next).not.toContain('scope');
    });

    it('should return dependent agent after dependency completes', () => {
      const plan = createTestPlan();
      const scheduler = new TestAgentScheduler(plan);

      scheduler.setPhase('discovery');
      scheduler.startAgent('oracle');
      scheduler.completeAgent('oracle');

      const next = scheduler.getNextAgents();
      expect(next).toContain('scope');
    });
  });
});

describe('Queue Status', () => {
  it('should accurately track all states', () => {
    const plan = createTestPlan();
    const scheduler = new TestAgentScheduler(plan);

    scheduler.setPhase('discovery');
    scheduler.startAgent('oracle');

    let status = scheduler.getQueueStatus();
    expect(status.running).toBe(1);

    scheduler.completeAgent('oracle');
    status = scheduler.getQueueStatus();
    expect(status.completed).toBe(1);
    expect(status.running).toBe(0);

    scheduler.startAgent('scope');
    scheduler.failAgent('scope');
    status = scheduler.getQueueStatus();
    expect(status.failed).toBe(1);
    expect(status.completed).toBe(1);
  });
});
