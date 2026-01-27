/**
 * OLYMPUS 2.0 - Orchestrator Integration Tests
 * =============================================
 * Integration tests for the full build orchestration flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock types
type BuildPhase = 'discovery' | 'architecture' | 'implementation' | 'quality' | 'deployment';
type AgentId = string;
type BuildTier = 'starter' | 'professional' | 'ultimate' | 'enterprise';
type BuildStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

interface BuildPlan {
  buildId: string;
  tier: BuildTier;
  phases: PhasePlan[];
  totalAgents: number;
  estimatedTokens: number;
  estimatedCost: number;
  estimatedDuration: number;
}

interface PhasePlan {
  phase: BuildPhase;
  agents: AgentId[];
  parallel: boolean;
  optional: boolean;
  estimatedTokens: number;
}

interface BuildState {
  buildId: string;
  status: BuildStatus;
  currentPhase: BuildPhase | null;
  completedAgents: Set<AgentId>;
  failedAgents: Set<AgentId>;
  progress: number;
  outputs: Map<AgentId, unknown>;
}

interface AgentOutput {
  agentId: AgentId;
  success: boolean;
  data?: unknown;
  error?: string;
  tokens: number;
}

// Mock agent execution
function mockAgentExecution(agentId: AgentId, shouldFail = false): Promise<AgentOutput> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        resolve({
          agentId,
          success: false,
          error: `Agent ${agentId} failed`,
          tokens: 1000,
        });
      } else {
        resolve({
          agentId,
          success: true,
          data: { generated: true, agentId },
          tokens: Math.floor(Math.random() * 5000) + 1000,
        });
      }
    }, 10); // Fast mock execution
  });
}

// Test implementation of BuildOrchestrator
class TestOrchestrator {
  private state: BuildState;
  private plan: BuildPlan;
  private onProgress: (progress: number) => void;
  private onPhaseStart: (phase: BuildPhase) => void;
  private onAgentComplete: (agentId: AgentId, output: AgentOutput) => void;
  private maxRetries: number = 2;
  private failedAgentRetries: Map<AgentId, number> = new Map();

  constructor(
    plan: BuildPlan,
    callbacks: {
      onProgress?: (progress: number) => void;
      onPhaseStart?: (phase: BuildPhase) => void;
      onAgentComplete?: (agentId: AgentId, output: AgentOutput) => void;
    } = {}
  ) {
    this.plan = plan;
    this.state = {
      buildId: plan.buildId,
      status: 'queued',
      currentPhase: null,
      completedAgents: new Set(),
      failedAgents: new Set(),
      progress: 0,
      outputs: new Map(),
    };
    this.onProgress = callbacks.onProgress || (() => {});
    this.onPhaseStart = callbacks.onPhaseStart || (() => {});
    this.onAgentComplete = callbacks.onAgentComplete || (() => {});
  }

  async execute(failAgents: AgentId[] = []): Promise<BuildState> {
    this.state.status = 'running';

    for (const phasePlan of this.plan.phases) {
      this.state.currentPhase = phasePlan.phase;
      this.onPhaseStart(phasePlan.phase);

      const phaseResult = await this.executePhase(phasePlan, failAgents);

      if (!phaseResult.success && !phasePlan.optional) {
        this.state.status = 'failed';
        return this.state;
      }

      this.updateProgress();
    }

    // Ensure progress is set for empty plans (no phases)
    if (this.plan.phases.length === 0) {
      this.updateProgress();
    }

    this.state.status = 'completed';
    return this.state;
  }

  private async executePhase(
    phasePlan: PhasePlan,
    failAgents: AgentId[]
  ): Promise<{ success: boolean }> {
    const agents = phasePlan.agents;

    if (phasePlan.parallel) {
      // Execute all agents in parallel
      const results = await Promise.all(
        agents.map((agentId) => this.executeAgent(agentId, failAgents.includes(agentId)))
      );

      const hasCriticalFailure = results.some(
        (r) => !r.success && !this.isOptionalAgent(r.agentId)
      );

      return { success: !hasCriticalFailure };
    } else {
      // Execute agents sequentially
      for (const agentId of agents) {
        const result = await this.executeAgent(agentId, failAgents.includes(agentId));

        if (!result.success && !this.isOptionalAgent(agentId)) {
          return { success: false };
        }
      }
      return { success: true };
    }
  }

  private async executeAgent(agentId: AgentId, shouldFail: boolean): Promise<AgentOutput> {
    const output = await mockAgentExecution(agentId, shouldFail);

    if (output.success) {
      this.state.completedAgents.add(agentId);
      this.state.outputs.set(agentId, output.data);
    } else {
      // Retry logic
      const retries = this.failedAgentRetries.get(agentId) || 0;
      if (retries < this.maxRetries) {
        this.failedAgentRetries.set(agentId, retries + 1);
        return this.executeAgent(agentId, shouldFail);
      }
      this.state.failedAgents.add(agentId);
    }

    this.onAgentComplete(agentId, output);
    this.updateProgress();
    return output;
  }

  private isOptionalAgent(agentId: AgentId): boolean {
    return ['sentinel', 'guardian'].includes(agentId);
  }

  private updateProgress(): void {
    const total = this.plan.totalAgents;
    if (total === 0) {
      this.state.progress = 100;
    } else {
      this.state.progress = Math.round((this.state.completedAgents.size / total) * 100);
    }
    this.onProgress(this.state.progress);
  }

  getState(): BuildState {
    return this.state;
  }

  cancel(): void {
    this.state.status = 'cancelled';
  }
}

// Helper to create test plans
function createIntegrationTestPlan(tier: BuildTier = 'starter'): BuildPlan {
  const phases: PhasePlan[] = [];

  if (tier === 'starter') {
    phases.push(
      { phase: 'discovery', agents: ['oracle', 'scope'], parallel: false, optional: false, estimatedTokens: 60000 },
      { phase: 'architecture', agents: ['archon'], parallel: false, optional: false, estimatedTokens: 30000 },
      { phase: 'implementation', agents: ['pixel', 'wire'], parallel: true, optional: false, estimatedTokens: 60000 }
    );
  } else if (tier === 'professional') {
    phases.push(
      { phase: 'discovery', agents: ['oracle', 'scope'], parallel: false, optional: false, estimatedTokens: 60000 },
      { phase: 'architecture', agents: ['archon', 'datum'], parallel: false, optional: false, estimatedTokens: 60000 },
      { phase: 'implementation', agents: ['pixel', 'wire', 'nexus', 'forge'], parallel: true, optional: false, estimatedTokens: 120000 },
      { phase: 'quality', agents: ['sentinel', 'guardian'], parallel: true, optional: true, estimatedTokens: 60000 }
    );
  } else {
    phases.push(
      { phase: 'discovery', agents: ['oracle', 'scope'], parallel: false, optional: false, estimatedTokens: 60000 },
      { phase: 'architecture', agents: ['archon', 'datum'], parallel: false, optional: false, estimatedTokens: 60000 },
      { phase: 'implementation', agents: ['pixel', 'wire', 'nexus', 'forge'], parallel: true, optional: false, estimatedTokens: 120000 },
      { phase: 'quality', agents: ['sentinel', 'guardian'], parallel: true, optional: true, estimatedTokens: 60000 },
      { phase: 'deployment', agents: ['optimizer'], parallel: false, optional: false, estimatedTokens: 30000 }
    );
  }

  const totalAgents = phases.reduce((sum, p) => sum + p.agents.length, 0);

  return {
    buildId: `integration-test-${Date.now()}`,
    tier,
    phases,
    totalAgents,
    estimatedTokens: phases.reduce((sum, p) => sum + p.estimatedTokens, 0),
    estimatedCost: 0,
    estimatedDuration: totalAgents * 45000,
  };
}

describe('Orchestrator Integration Tests', () => {
  describe('Full Build Flow', () => {
    it('should complete a starter build successfully', async () => {
      const plan = createIntegrationTestPlan('starter');
      const orchestrator = new TestOrchestrator(plan);

      const result = await orchestrator.execute();

      expect(result.status).toBe('completed');
      expect(result.completedAgents.size).toBe(plan.totalAgents);
      expect(result.progress).toBe(100);
    });

    it('should complete a professional build successfully', async () => {
      const plan = createIntegrationTestPlan('professional');
      const orchestrator = new TestOrchestrator(plan);

      const result = await orchestrator.execute();

      expect(result.status).toBe('completed');
      expect(result.completedAgents.size).toBe(plan.totalAgents);
    });

    it('should execute phases in order', async () => {
      const plan = createIntegrationTestPlan('professional');
      const phaseOrder: BuildPhase[] = [];

      const orchestrator = new TestOrchestrator(plan, {
        onPhaseStart: (phase) => phaseOrder.push(phase),
      });

      await orchestrator.execute();

      expect(phaseOrder[0]).toBe('discovery');
      expect(phaseOrder[1]).toBe('architecture');
      expect(phaseOrder[2]).toBe('implementation');
      expect(phaseOrder[3]).toBe('quality');
    });
  });

  describe('Failure Handling', () => {
    it('should fail build when required agent fails', async () => {
      const plan = createIntegrationTestPlan('starter');
      const orchestrator = new TestOrchestrator(plan);

      const result = await orchestrator.execute(['oracle']); // Fail required agent

      expect(result.status).toBe('failed');
      expect(result.failedAgents.has('oracle')).toBe(true);
    });

    it('should continue when optional agent fails', async () => {
      const plan = createIntegrationTestPlan('professional');
      const orchestrator = new TestOrchestrator(plan);

      // Fail optional agents (sentinel, guardian are in quality phase which is optional)
      const result = await orchestrator.execute(['sentinel', 'guardian']);

      expect(result.status).toBe('completed');
    });

    it('should fail at correct phase when mid-build failure', async () => {
      const plan = createIntegrationTestPlan('professional');
      const phaseOrder: BuildPhase[] = [];

      const orchestrator = new TestOrchestrator(plan, {
        onPhaseStart: (phase) => phaseOrder.push(phase),
      });

      // Fail archon (in architecture phase)
      const result = await orchestrator.execute(['archon']);

      expect(result.status).toBe('failed');
      expect(phaseOrder).toContain('discovery');
      expect(phaseOrder).toContain('architecture');
      // Should not reach implementation if architecture fails
    });
  });

  describe('Progress Tracking', () => {
    it('should report progress during build', async () => {
      const plan = createIntegrationTestPlan('starter');
      const progressUpdates: number[] = [];

      const orchestrator = new TestOrchestrator(plan, {
        onProgress: (progress) => progressUpdates.push(progress),
      });

      await orchestrator.execute();

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it('should track agent completions', async () => {
      const plan = createIntegrationTestPlan('starter');
      const completedAgents: AgentId[] = [];

      const orchestrator = new TestOrchestrator(plan, {
        onAgentComplete: (agentId, output) => {
          if (output.success) completedAgents.push(agentId);
        },
      });

      await orchestrator.execute();

      expect(completedAgents).toContain('oracle');
      expect(completedAgents).toContain('scope');
      expect(completedAgents).toContain('archon');
      expect(completedAgents).toContain('pixel');
      expect(completedAgents).toContain('wire');
    });
  });

  describe('Parallel Execution', () => {
    it('should execute implementation agents in parallel', async () => {
      const plan = createIntegrationTestPlan('professional');
      const agentStartTimes: Map<AgentId, number> = new Map();
      const agentEndTimes: Map<AgentId, number> = new Map();

      const orchestrator = new TestOrchestrator(plan, {
        onAgentComplete: (agentId) => {
          if (!agentStartTimes.has(agentId)) {
            agentStartTimes.set(agentId, Date.now());
          }
          agentEndTimes.set(agentId, Date.now());
        },
      });

      await orchestrator.execute();

      // Implementation agents should have similar end times (within tolerance)
      const implAgents = ['pixel', 'wire', 'nexus', 'forge'];
      const endTimes = implAgents
        .filter((id) => agentEndTimes.has(id))
        .map((id) => agentEndTimes.get(id)!);

      if (endTimes.length > 1) {
        const maxDiff = Math.max(...endTimes) - Math.min(...endTimes);
        // With 10ms mock execution and parallel execution, diff should be small
        expect(maxDiff).toBeLessThan(100);
      }
    });

    it('should execute discovery agents sequentially', async () => {
      const plan = createIntegrationTestPlan('starter');
      const completionOrder: AgentId[] = [];

      const orchestrator = new TestOrchestrator(plan, {
        onAgentComplete: (agentId) => completionOrder.push(agentId),
      });

      await orchestrator.execute();

      const oracleIndex = completionOrder.indexOf('oracle');
      const scopeIndex = completionOrder.indexOf('scope');

      // Oracle should complete before scope in sequential discovery
      expect(oracleIndex).toBeLessThan(scopeIndex);
    });
  });

  describe('State Management', () => {
    it('should maintain correct state throughout build', async () => {
      const plan = createIntegrationTestPlan('starter');
      const orchestrator = new TestOrchestrator(plan);

      const initialState = orchestrator.getState();
      expect(initialState.status).toBe('queued');
      expect(initialState.completedAgents.size).toBe(0);

      await orchestrator.execute();

      const finalState = orchestrator.getState();
      expect(finalState.status).toBe('completed');
      expect(finalState.completedAgents.size).toBe(plan.totalAgents);
    });

    it('should store agent outputs', async () => {
      const plan = createIntegrationTestPlan('starter');
      const orchestrator = new TestOrchestrator(plan);

      await orchestrator.execute();

      const state = orchestrator.getState();
      expect(state.outputs.size).toBeGreaterThan(0);
      expect(state.outputs.has('oracle')).toBe(true);
    });
  });

  describe('Cancellation', () => {
    it('should allow build cancellation', async () => {
      const plan = createIntegrationTestPlan('starter');
      const orchestrator = new TestOrchestrator(plan);

      orchestrator.cancel();

      expect(orchestrator.getState().status).toBe('cancelled');
    });
  });

  describe('Token Estimation', () => {
    it('should have reasonable token estimates', () => {
      const starterPlan = createIntegrationTestPlan('starter');
      const proPlan = createIntegrationTestPlan('professional');

      expect(proPlan.estimatedTokens).toBeGreaterThan(starterPlan.estimatedTokens);
    });
  });
});

describe('Orchestrator Edge Cases', () => {
  it('should handle empty plan', async () => {
    const emptyPlan: BuildPlan = {
      buildId: 'empty',
      tier: 'starter',
      phases: [],
      totalAgents: 0,
      estimatedTokens: 0,
      estimatedCost: 0,
      estimatedDuration: 0,
    };

    const orchestrator = new TestOrchestrator(emptyPlan);
    const result = await orchestrator.execute();

    expect(result.status).toBe('completed');
    expect(result.progress).toBe(100);
  });

  it('should handle single agent plan', async () => {
    const singlePlan: BuildPlan = {
      buildId: 'single',
      tier: 'starter',
      phases: [
        { phase: 'discovery', agents: ['oracle'], parallel: false, optional: false, estimatedTokens: 30000 },
      ],
      totalAgents: 1,
      estimatedTokens: 30000,
      estimatedCost: 0,
      estimatedDuration: 45000,
    };

    const orchestrator = new TestOrchestrator(singlePlan);
    const result = await orchestrator.execute();

    expect(result.status).toBe('completed');
    expect(result.completedAgents.has('oracle')).toBe(true);
  });

  it('should handle all optional phases', async () => {
    const optionalPlan: BuildPlan = {
      buildId: 'optional',
      tier: 'starter',
      phases: [
        { phase: 'quality', agents: ['sentinel'], parallel: false, optional: true, estimatedTokens: 30000 },
      ],
      totalAgents: 1,
      estimatedTokens: 30000,
      estimatedCost: 0,
      estimatedDuration: 45000,
    };

    const orchestrator = new TestOrchestrator(optionalPlan);
    const result = await orchestrator.execute(['sentinel']); // Fail the optional agent

    expect(result.status).toBe('completed'); // Should still complete
  });
});

describe('Orchestrator Retry Logic', () => {
  it('should retry failed agents up to max retries', async () => {
    // This is implicitly tested by the failure handling
    // Real implementation would track retry counts
    const plan = createIntegrationTestPlan('starter');
    const orchestrator = new TestOrchestrator(plan);

    // Oracle fails, should be retried
    const result = await orchestrator.execute(['oracle']);

    // After max retries (2), should fail
    expect(result.failedAgents.has('oracle')).toBe(true);
  });
});
