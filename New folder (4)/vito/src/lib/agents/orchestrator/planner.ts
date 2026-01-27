/**
 * OLYMPUS 2.0 - Build Planner
 */

import type { AgentId, BuildPhase } from '../types';
import type { BuildPlan, PhasePlan } from './types';
import { TIER_CONFIGS, PHASE_CONFIGS, getAgent, PHASE_ORDER } from '../registry';
import { MODEL_CAPABILITIES, TIER_MODEL_MAP } from '../providers';

/** Create execution plan for a build */
export function createBuildPlan(
  buildId: string,
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise',
  options: { excludeAgents?: AgentId[]; focusPhases?: BuildPhase[] } = {}
): BuildPlan {
  const tierConfig = TIER_CONFIGS[tier];
  if (!tierConfig) throw new Error(`Unknown tier: ${tier}`);

  console.log(`[createBuildPlan] Creating plan for tier: ${tier}`);
  console.log(`[createBuildPlan] Tier config phases: ${tierConfig.phases.join(', ')}`);
  console.log(`[createBuildPlan] Tier config agents count: ${tierConfig.agents.length}`);
  console.log(`[createBuildPlan] PHASE_ORDER: ${PHASE_ORDER.join(', ')}`);

  const phases: PhasePlan[] = [];
  let totalAgents = 0;
  let totalTokens = 0;

  for (const phase of PHASE_ORDER) {
    // Skip phases not in tier
    if (!tierConfig.phases.includes(phase)) {
      console.log(`[createBuildPlan] SKIPPING phase ${phase} - not in tier`);
      continue;
    }

    // Skip if focusing on specific phases
    if (options.focusPhases?.length && !options.focusPhases.includes(phase)) {
      console.log(`[createBuildPlan] SKIPPING phase ${phase} - not in focus phases`);
      continue;
    }

    const phaseConfig = PHASE_CONFIGS.find((p) => p.phase === phase);
    if (!phaseConfig) {
      console.log(`[createBuildPlan] SKIPPING phase ${phase} - no phase config found`);
      continue;
    }

    // Filter agents for this phase that are in the tier
    const phaseAgents = phaseConfig.agents.filter((agentId) => {
      if (!tierConfig.agents.includes(agentId)) {
        console.log(`[createBuildPlan] Agent ${agentId} filtered out - not in tier agents`);
        return false;
      }
      if (options.excludeAgents?.includes(agentId)) return false;
      return true;
    });

    if (phaseAgents.length === 0) {
      console.log(`[createBuildPlan] SKIPPING phase ${phase} - no agents after filtering`);
      continue;
    }

    console.log(`[createBuildPlan] ADDING phase ${phase} with ${phaseAgents.length} agents: ${phaseAgents.join(', ')}`);


    // Estimate tokens for phase
    const phaseTokens = estimatePhaseTokens(phaseAgents);

    phases.push({
      phase,
      agents: phaseAgents,
      parallel: phaseConfig.parallel,
      optional: phaseConfig.optional,
      estimatedTokens: phaseTokens,
    });

    totalAgents += phaseAgents.length;
    totalTokens += phaseTokens;
  }

  const estimatedCost = estimateCost(totalTokens, tier);
  const estimatedDuration = estimateDuration(phases, tierConfig.maxConcurrency);

  console.log(`[createBuildPlan] ===== PLAN SUMMARY =====`);
  console.log(`[createBuildPlan] Tier: ${tier}`);
  console.log(`[createBuildPlan] Total phases: ${phases.length}`);
  console.log(`[createBuildPlan] Total agents: ${totalAgents}`);
  console.log(`[createBuildPlan] Phases: ${phases.map(p => `${p.phase}(${p.agents.length})`).join(', ')}`);

  return {
    buildId,
    tier,
    phases,
    totalAgents,
    estimatedTokens: totalTokens,
    estimatedCost,
    estimatedDuration,
  };
}

/** Estimate tokens for a set of agents */
function estimatePhaseTokens(agents: AgentId[]): number {
  let total = 0;

  for (const agentId of agents) {
    const agent = getAgent(agentId);
    if (!agent) continue;

    // Base tokens per agent tier
    const baseTokens: Record<string, number> = {
      opus: 50000,
      sonnet: 30000,
      haiku: 15000,
    };

    total += baseTokens[agent.tier] || 20000;
  }

  return total;
}

/** Estimate cost for token usage */
function estimateCost(tokens: number, tier: string): number {
  // Use average of tier models
  const inputTokens = tokens * 0.6;
  const outputTokens = tokens * 0.4;

  // Get primary model for tier
  const model = TIER_MODEL_MAP[tier === 'starter' ? 'sonnet' : 'opus'];
  const caps = MODEL_CAPABILITIES[model];

  return (inputTokens / 1000) * caps.costPer1kInput + (outputTokens / 1000) * caps.costPer1kOutput;
}

/** Estimate duration for build */
function estimateDuration(phases: PhasePlan[], maxConcurrency: number): number {
  let totalMs = 0;

  for (const phase of phases) {
    // Base duration per agent (seconds)
    const avgDuration = 45000; // 45 seconds average

    if (phase.parallel) {
      // Parallel execution - divide by concurrency
      const batches = Math.ceil(phase.agents.length / maxConcurrency);
      totalMs += batches * avgDuration;
    } else {
      // Sequential execution
      totalMs += phase.agents.length * avgDuration;
    }
  }

  return totalMs;
}

/** Get agents ready to execute (dependencies met) */
export function getReadyAgents(
  plan: BuildPlan,
  completedAgents: Set<AgentId>,
  runningAgents: Set<AgentId>,
  currentPhase: BuildPhase,
  failedAgents?: Set<AgentId>
): AgentId[] {
  const phasePlan = plan.phases.find((p) => p.phase === currentPhase);
  if (!phasePlan) return [];

  const ready: AgentId[] = [];

  for (const agentId of phasePlan.agents) {
    // Skip if already completed, running, or failed
    // Failed agents should NOT be retried endlessly
    if (completedAgents.has(agentId) || runningAgents.has(agentId)) continue;
    if (failedAgents?.has(agentId)) continue;

    // Check dependencies - a dependency is "satisfied" if:
    // 1. It completed successfully, OR
    // 2. It's marked as optional, OR
    // 3. It failed (so we don't block downstream agents forever)
    const agent = getAgent(agentId);
    if (!agent) continue;

    const depsComplete = agent.dependencies.every(
      (depId) => completedAgents.has(depId) || getAgent(depId)?.optional || failedAgents?.has(depId)
    );

    if (depsComplete) {
      ready.push(agentId);
    }
  }

  return ready;
}

/** Check if phase is complete */
export function isPhaseComplete(plan: BuildPlan, phase: BuildPhase, completedAgents: Set<AgentId>): boolean {
  const phasePlan = plan.phases.find((p) => p.phase === phase);
  if (!phasePlan) return true;

  return phasePlan.agents.every((agentId) => {
    if (completedAgents.has(agentId)) return true;
    const agent = getAgent(agentId);
    return agent?.optional || false;
  });
}

/** Get next phase to execute */
export function getNextPhase(plan: BuildPlan, completedPhases: Set<BuildPhase>): BuildPhase | null {
  for (const phasePlan of plan.phases) {
    if (!completedPhases.has(phasePlan.phase)) {
      return phasePlan.phase;
    }
  }
  return null;
}

/** Calculate overall progress */
export function calculateProgress(plan: BuildPlan, completedAgents: Set<AgentId>): number {
  if (plan.totalAgents === 0) return 100;
  return Math.round((completedAgents.size / plan.totalAgents) * 100);
}
