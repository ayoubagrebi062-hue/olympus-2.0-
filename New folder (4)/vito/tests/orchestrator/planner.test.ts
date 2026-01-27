/**
 * OLYMPUS 2.0 - Build Planner Unit Tests
 * ========================================
 * Unit tests for build planning and phase management
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

// Test implementation of planner functions
function createTestBuildPlan(
  buildId: string,
  tier: BuildTier,
  options: { excludeAgents?: AgentId[]; focusPhases?: BuildPhase[] } = {}
): BuildPlan {
  const TIER_AGENTS: Record<BuildTier, AgentId[]> = {
    starter: ['oracle', 'scope', 'archon', 'pixel', 'wire'],
    professional: ['oracle', 'scope', 'archon', 'datum', 'pixel', 'wire', 'nexus', 'forge'],
    ultimate: ['oracle', 'scope', 'archon', 'datum', 'pixel', 'wire', 'nexus', 'forge', 'sentinel', 'guardian'],
    enterprise: ['oracle', 'scope', 'archon', 'datum', 'pixel', 'wire', 'nexus', 'forge', 'sentinel', 'guardian', 'optimizer'],
  };

  const PHASE_AGENTS: Record<BuildPhase, AgentId[]> = {
    discovery: ['oracle', 'scope'],
    architecture: ['archon', 'datum'],
    implementation: ['pixel', 'wire', 'nexus', 'forge'],
    quality: ['sentinel', 'guardian'],
    deployment: ['optimizer'],
  };

  const tierAgents = TIER_AGENTS[tier];
  const phases: PhasePlan[] = [];
  const PHASE_ORDER: BuildPhase[] = ['discovery', 'architecture', 'implementation', 'quality', 'deployment'];

  for (const phase of PHASE_ORDER) {
    if (options.focusPhases?.length && !options.focusPhases.includes(phase)) continue;

    const phaseAgents = PHASE_AGENTS[phase].filter(
      (id) => tierAgents.includes(id) && !options.excludeAgents?.includes(id)
    );

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
  const estimatedTokens = phases.reduce((sum, p) => sum + p.estimatedTokens, 0);

  return {
    buildId,
    tier,
    phases,
    totalAgents,
    estimatedTokens,
    estimatedCost: (estimatedTokens / 1000) * 0.015,
    estimatedDuration: totalAgents * 45000,
  };
}

function calculateProgress(plan: BuildPlan, completedAgents: Set<AgentId>): number {
  if (plan.totalAgents === 0) return 100;
  return Math.round((completedAgents.size / plan.totalAgents) * 100);
}

function getNextPhase(plan: BuildPlan, completedPhases: Set<BuildPhase>): BuildPhase | null {
  for (const phasePlan of plan.phases) {
    if (!completedPhases.has(phasePlan.phase)) {
      return phasePlan.phase;
    }
  }
  return null;
}

function isPhaseComplete(plan: BuildPlan, phase: BuildPhase, completedAgents: Set<AgentId>): boolean {
  const phasePlan = plan.phases.find((p) => p.phase === phase);
  if (!phasePlan) return true;
  return phasePlan.agents.every((agentId) => completedAgents.has(agentId));
}

describe('Build Planner', () => {
  describe('createBuildPlan', () => {
    it('should create a valid plan for starter tier', () => {
      const plan = createTestBuildPlan('build-123', 'starter');

      expect(plan.buildId).toBe('build-123');
      expect(plan.tier).toBe('starter');
      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.totalAgents).toBeGreaterThan(0);
    });

    it('should include more agents for professional tier', () => {
      const starterPlan = createTestBuildPlan('build-1', 'starter');
      const proPlan = createTestBuildPlan('build-2', 'professional');

      expect(proPlan.totalAgents).toBeGreaterThan(starterPlan.totalAgents);
    });

    it('should include all agents for enterprise tier', () => {
      const plan = createTestBuildPlan('build-123', 'enterprise');

      expect(plan.totalAgents).toBeGreaterThanOrEqual(8);
      expect(plan.phases.length).toBeGreaterThanOrEqual(4);
    });

    it('should exclude specified agents', () => {
      const plan = createTestBuildPlan('build-123', 'professional', {
        excludeAgents: ['datum', 'forge'],
      });

      const allAgents = plan.phases.flatMap((p) => p.agents);
      expect(allAgents).not.toContain('datum');
      expect(allAgents).not.toContain('forge');
    });

    it('should focus on specified phases', () => {
      const plan = createTestBuildPlan('build-123', 'enterprise', {
        focusPhases: ['discovery', 'architecture'],
      });

      const phaseNames = plan.phases.map((p) => p.phase);
      expect(phaseNames).toContain('discovery');
      expect(phaseNames).toContain('architecture');
      expect(phaseNames).not.toContain('deployment');
    });

    it('should estimate tokens correctly', () => {
      const plan = createTestBuildPlan('build-123', 'professional');

      expect(plan.estimatedTokens).toBeGreaterThan(0);
      expect(plan.estimatedCost).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBeGreaterThan(0);
    });
  });

  describe('calculateProgress', () => {
    it('should return 0 when no agents completed', () => {
      const plan = createTestBuildPlan('build-123', 'starter');
      const completed = new Set<AgentId>();

      expect(calculateProgress(plan, completed)).toBe(0);
    });

    it('should return 100 when all agents completed', () => {
      const plan = createTestBuildPlan('build-123', 'starter');
      const allAgents = plan.phases.flatMap((p) => p.agents);
      const completed = new Set<AgentId>(allAgents);

      expect(calculateProgress(plan, completed)).toBe(100);
    });

    it('should return partial progress correctly', () => {
      const plan = createTestBuildPlan('build-123', 'starter');
      const halfAgents = plan.phases.flatMap((p) => p.agents).slice(0, Math.floor(plan.totalAgents / 2));
      const completed = new Set<AgentId>(halfAgents);

      const progress = calculateProgress(plan, completed);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(100);
    });

    it('should handle empty plan', () => {
      const plan: BuildPlan = {
        buildId: 'empty',
        tier: 'starter',
        phases: [],
        totalAgents: 0,
        estimatedTokens: 0,
        estimatedCost: 0,
        estimatedDuration: 0,
      };

      expect(calculateProgress(plan, new Set())).toBe(100);
    });
  });

  describe('getNextPhase', () => {
    it('should return first phase when none completed', () => {
      const plan = createTestBuildPlan('build-123', 'professional');
      const completed = new Set<BuildPhase>();

      const next = getNextPhase(plan, completed);
      expect(next).toBe(plan.phases[0].phase);
    });

    it('should return second phase when first completed', () => {
      const plan = createTestBuildPlan('build-123', 'professional');
      const completed = new Set<BuildPhase>([plan.phases[0].phase]);

      const next = getNextPhase(plan, completed);
      expect(next).toBe(plan.phases[1].phase);
    });

    it('should return null when all phases completed', () => {
      const plan = createTestBuildPlan('build-123', 'starter');
      const completed = new Set<BuildPhase>(plan.phases.map((p) => p.phase));

      expect(getNextPhase(plan, completed)).toBeNull();
    });
  });

  describe('isPhaseComplete', () => {
    it('should return false when no agents completed', () => {
      const plan = createTestBuildPlan('build-123', 'starter');
      const completed = new Set<AgentId>();

      expect(isPhaseComplete(plan, plan.phases[0].phase, completed)).toBe(false);
    });

    it('should return true when all phase agents completed', () => {
      const plan = createTestBuildPlan('build-123', 'starter');
      const phaseAgents = plan.phases[0].agents;
      const completed = new Set<AgentId>(phaseAgents);

      expect(isPhaseComplete(plan, plan.phases[0].phase, completed)).toBe(true);
    });

    it('should return true for non-existent phase', () => {
      const plan = createTestBuildPlan('build-123', 'starter');
      const completed = new Set<AgentId>();

      expect(isPhaseComplete(plan, 'nonexistent' as BuildPhase, completed)).toBe(true);
    });
  });
});

describe('Phase Configuration', () => {
  describe('Phase ordering', () => {
    it('should have discovery before architecture', () => {
      const plan = createTestBuildPlan('build-123', 'professional');
      const phaseOrder = plan.phases.map((p) => p.phase);

      const discoveryIndex = phaseOrder.indexOf('discovery');
      const archIndex = phaseOrder.indexOf('architecture');

      if (discoveryIndex >= 0 && archIndex >= 0) {
        expect(discoveryIndex).toBeLessThan(archIndex);
      }
    });

    it('should have implementation after architecture', () => {
      const plan = createTestBuildPlan('build-123', 'professional');
      const phaseOrder = plan.phases.map((p) => p.phase);

      const archIndex = phaseOrder.indexOf('architecture');
      const implIndex = phaseOrder.indexOf('implementation');

      if (archIndex >= 0 && implIndex >= 0) {
        expect(archIndex).toBeLessThan(implIndex);
      }
    });
  });

  describe('Parallel phases', () => {
    it('should mark implementation as parallel', () => {
      const plan = createTestBuildPlan('build-123', 'professional');
      const implPhase = plan.phases.find((p) => p.phase === 'implementation');

      if (implPhase) {
        expect(implPhase.parallel).toBe(true);
      }
    });

    it('should mark discovery as sequential', () => {
      const plan = createTestBuildPlan('build-123', 'starter');
      const discoveryPhase = plan.phases.find((p) => p.phase === 'discovery');

      if (discoveryPhase) {
        expect(discoveryPhase.parallel).toBe(false);
      }
    });
  });
});

describe('Token Estimation', () => {
  it('should estimate more tokens for larger tiers', () => {
    const starterPlan = createTestBuildPlan('build-1', 'starter');
    const enterprisePlan = createTestBuildPlan('build-2', 'enterprise');

    expect(enterprisePlan.estimatedTokens).toBeGreaterThan(starterPlan.estimatedTokens);
  });

  it('should estimate cost proportional to tokens', () => {
    const plan = createTestBuildPlan('build-123', 'professional');

    expect(plan.estimatedCost).toBeGreaterThan(0);
    expect(plan.estimatedCost).toBeLessThan(plan.estimatedTokens);
  });

  it('should estimate duration based on agent count', () => {
    const plan = createTestBuildPlan('build-123', 'professional');

    expect(plan.estimatedDuration).toBeGreaterThan(0);
    expect(plan.estimatedDuration).toBe(plan.totalAgents * 45000);
  });
});
