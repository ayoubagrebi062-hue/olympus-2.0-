/**
 * OLYMPUS Cost Attribution
 *
 * Track costs per phase, agent, artifact.
 * Full transparency on where money goes.
 * No hidden costs. Every token accounted.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface CostBreakdown {
  tokens: TokenUsage;
  cost: number;
  costPerToken: number;
  provider: string;
  model: string;
}

export interface AgentCost {
  agentName: string;
  phase: string;
  usage: TokenUsage;
  cost: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  efficiency: number; // tokens per second
}

export interface PhaseCost {
  phaseName: string;
  agents: AgentCost[];
  totalUsage: TokenUsage;
  totalCost: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

export interface ArtifactCost {
  artifactId: string;
  artifactName: string;
  agentName: string;
  phase: string;
  usage: TokenUsage;
  cost: number;
  sizeBytes: number;
  costPerByte: number;
}

export interface BuildCostSummary {
  buildId: string;
  phases: PhaseCost[];
  artifacts: ArtifactCost[];
  total: {
    usage: TokenUsage;
    cost: number;
    durationMs: number;
  };
  breakdown: {
    byPhase: Record<string, number>;
    byAgent: Record<string, number>;
    byModel: Record<string, number>;
  };
  projections: {
    estimatedFinalCost: number;
    completionPercentage: number;
    burnRate: number; // tokens per minute
  };
  warnings: CostWarning[];
}

export interface CostWarning {
  type: 'BUDGET_EXCEEDED' | 'HIGH_BURN_RATE' | 'INEFFICIENT_AGENT' | 'COST_SPIKE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  details: Record<string, unknown>;
}

// =============================================================================
// PRICING (Per million tokens)
// =============================================================================

interface ModelPricing {
  input: number;
  output: number;
  name: string;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-3-5-sonnet-20241022': {
    input: 3.0,
    output: 15.0,
    name: 'Claude 3.5 Sonnet',
  },
  'claude-3-opus-20240229': {
    input: 15.0,
    output: 75.0,
    name: 'Claude 3 Opus',
  },
  'claude-3-haiku-20240307': {
    input: 0.25,
    output: 1.25,
    name: 'Claude 3 Haiku',
  },
  'gpt-4-turbo': {
    input: 10.0,
    output: 30.0,
    name: 'GPT-4 Turbo',
  },
  'gpt-4o': {
    input: 5.0,
    output: 15.0,
    name: 'GPT-4o',
  },
  default: {
    input: 3.0,
    output: 15.0,
    name: 'Default',
  },
};

// =============================================================================
// COST TRACKING STATE
// =============================================================================

interface CostState {
  buildId: string;
  model: string;
  budget: number;
  phases: Map<string, PhaseCostState>;
  agents: Map<string, AgentCostState>;
  artifacts: Map<string, ArtifactCost>;
  totalInput: number;
  totalOutput: number;
  startedAt: string;
}

interface PhaseCostState {
  phaseName: string;
  inputTokens: number;
  outputTokens: number;
  startedAt: string;
  completedAt: string | null;
  agentNames: string[];
}

interface AgentCostState {
  agentName: string;
  phase: string;
  inputTokens: number;
  outputTokens: number;
  startedAt: string;
  completedAt: string | null;
  artifactIds: string[];
}

const costStates: Map<string, CostState> = new Map();

// =============================================================================
// COST TRACKING FUNCTIONS
// =============================================================================

/**
 * Initialize cost tracking for a build.
 */
export function initializeCostTracking(buildId: string, model: string, budget: number): void {
  costStates.set(buildId, {
    buildId,
    model,
    budget,
    phases: new Map(),
    agents: new Map(),
    artifacts: new Map(),
    totalInput: 0,
    totalOutput: 0,
    startedAt: new Date().toISOString(),
  });

  console.log(`[COST] Initialized tracking for build ${buildId}. Budget: ${budget} tokens`);
}

/**
 * Record phase start.
 */
export function recordPhaseStart(buildId: string, phaseName: string): void {
  const state = costStates.get(buildId);
  if (!state) {
    console.warn(`[COST] No cost state for build ${buildId}`);
    return;
  }

  state.phases.set(phaseName, {
    phaseName,
    inputTokens: 0,
    outputTokens: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    agentNames: [],
  });
}

/**
 * Record phase completion.
 */
export function recordPhaseComplete(buildId: string, phaseName: string): void {
  const state = costStates.get(buildId);
  if (!state) return;

  const phase = state.phases.get(phaseName);
  if (phase) {
    phase.completedAt = new Date().toISOString();
  }
}

/**
 * Record agent start.
 */
export function recordAgentStart(buildId: string, agentName: string, phase: string): void {
  const state = costStates.get(buildId);
  if (!state) return;

  state.agents.set(agentName, {
    agentName,
    phase,
    inputTokens: 0,
    outputTokens: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    artifactIds: [],
  });

  // Add agent to phase
  const phaseState = state.phases.get(phase);
  if (phaseState) {
    phaseState.agentNames.push(agentName);
  }
}

/**
 * Record token usage for an agent.
 */
export function recordAgentTokens(
  buildId: string,
  agentName: string,
  inputTokens: number,
  outputTokens: number
): CostWarning | null {
  const state = costStates.get(buildId);
  if (!state) return null;

  const agent = state.agents.get(agentName);
  if (agent) {
    agent.inputTokens += inputTokens;
    agent.outputTokens += outputTokens;
  }

  // Update phase totals
  const phase = agent ? state.phases.get(agent.phase) : null;
  if (phase) {
    phase.inputTokens += inputTokens;
    phase.outputTokens += outputTokens;
  }

  // Update build totals
  state.totalInput += inputTokens;
  state.totalOutput += outputTokens;

  // Check for budget warnings
  const totalTokens = state.totalInput + state.totalOutput;
  if (totalTokens > state.budget * 0.9) {
    return {
      type: 'BUDGET_EXCEEDED',
      severity: totalTokens > state.budget ? 'CRITICAL' : 'WARNING',
      message: `Token usage at ${Math.round((totalTokens / state.budget) * 100)}% of budget`,
      details: {
        used: totalTokens,
        budget: state.budget,
        remaining: state.budget - totalTokens,
      },
    };
  }

  return null;
}

/**
 * Record agent completion.
 */
export function recordAgentComplete(buildId: string, agentName: string): void {
  const state = costStates.get(buildId);
  if (!state) return;

  const agent = state.agents.get(agentName);
  if (agent) {
    agent.completedAt = new Date().toISOString();
  }
}

/**
 * Record artifact cost attribution.
 */
export function recordArtifactCost(
  buildId: string,
  artifactId: string,
  artifactName: string,
  agentName: string,
  phase: string,
  inputTokens: number,
  outputTokens: number,
  sizeBytes: number
): void {
  const state = costStates.get(buildId);
  if (!state) return;

  const pricing = MODEL_PRICING[state.model] || MODEL_PRICING['default'];
  const cost = calculateCost(inputTokens, outputTokens, pricing);

  state.artifacts.set(artifactId, {
    artifactId,
    artifactName,
    agentName,
    phase,
    usage: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens,
    },
    cost,
    sizeBytes,
    costPerByte: sizeBytes > 0 ? cost / sizeBytes : 0,
  });

  // Link artifact to agent
  const agent = state.agents.get(agentName);
  if (agent) {
    agent.artifactIds.push(artifactId);
  }
}

// =============================================================================
// COST CALCULATION
// =============================================================================

function calculateCost(inputTokens: number, outputTokens: number, pricing: ModelPricing): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Get full cost summary for a build.
 */
export function getBuildCostSummary(buildId: string): BuildCostSummary | null {
  const state = costStates.get(buildId);
  if (!state) return null;

  const pricing = MODEL_PRICING[state.model] || MODEL_PRICING['default'];

  // Build phase costs
  const phases: PhaseCost[] = [];
  const byPhase: Record<string, number> = {};

  for (const [phaseName, phaseState] of state.phases) {
    const phaseCost = calculateCost(phaseState.inputTokens, phaseState.outputTokens, pricing);
    byPhase[phaseName] = phaseCost;

    // Build agent costs for this phase
    const agents: AgentCost[] = [];
    for (const agentName of phaseState.agentNames) {
      const agentState = state.agents.get(agentName);
      if (agentState) {
        const agentCost = calculateCost(agentState.inputTokens, agentState.outputTokens, pricing);
        const durationMs = agentState.completedAt
          ? new Date(agentState.completedAt).getTime() - new Date(agentState.startedAt).getTime()
          : null;

        agents.push({
          agentName,
          phase: phaseName,
          usage: {
            input: agentState.inputTokens,
            output: agentState.outputTokens,
            total: agentState.inputTokens + agentState.outputTokens,
          },
          cost: agentCost,
          startedAt: agentState.startedAt,
          completedAt: agentState.completedAt,
          durationMs,
          efficiency: durationMs
            ? (agentState.inputTokens + agentState.outputTokens) / (durationMs / 1000)
            : 0,
        });
      }
    }

    const phaseDurationMs = phaseState.completedAt
      ? new Date(phaseState.completedAt).getTime() - new Date(phaseState.startedAt).getTime()
      : null;

    phases.push({
      phaseName,
      agents,
      totalUsage: {
        input: phaseState.inputTokens,
        output: phaseState.outputTokens,
        total: phaseState.inputTokens + phaseState.outputTokens,
      },
      totalCost: phaseCost,
      startedAt: phaseState.startedAt,
      completedAt: phaseState.completedAt,
      durationMs: phaseDurationMs,
    });
  }

  // Build agent breakdown
  const byAgent: Record<string, number> = {};
  for (const [agentName, agentState] of state.agents) {
    byAgent[agentName] = calculateCost(agentState.inputTokens, agentState.outputTokens, pricing);
  }

  // Build artifact list
  const artifacts = Array.from(state.artifacts.values());

  // Calculate totals
  const totalCost = calculateCost(state.totalInput, state.totalOutput, pricing);
  const elapsedMs = Date.now() - new Date(state.startedAt).getTime();

  // Calculate projections
  const completedPhases = phases.filter(p => p.completedAt !== null).length;
  const totalPhases = 6; // Fixed for OLYMPUS
  const completionPercentage = (completedPhases / totalPhases) * 100;

  const burnRate = elapsedMs > 0 ? (state.totalInput + state.totalOutput) / (elapsedMs / 60000) : 0;

  const estimatedFinalCost =
    completionPercentage > 0 ? totalCost / (completionPercentage / 100) : totalCost * 6; // Rough estimate

  // Check for warnings
  const warnings: CostWarning[] = [];

  const totalTokens = state.totalInput + state.totalOutput;
  if (totalTokens > state.budget) {
    warnings.push({
      type: 'BUDGET_EXCEEDED',
      severity: 'CRITICAL',
      message: `Budget exceeded: ${totalTokens.toLocaleString()} tokens used of ${state.budget.toLocaleString()} budget`,
      details: { used: totalTokens, budget: state.budget },
    });
  } else if (totalTokens > state.budget * 0.8) {
    warnings.push({
      type: 'BUDGET_EXCEEDED',
      severity: 'WARNING',
      message: `Approaching budget limit: ${Math.round((totalTokens / state.budget) * 100)}% used`,
      details: { used: totalTokens, budget: state.budget },
    });
  }

  if (burnRate > 50000) {
    warnings.push({
      type: 'HIGH_BURN_RATE',
      severity: 'WARNING',
      message: `High token burn rate: ${Math.round(burnRate).toLocaleString()} tokens/minute`,
      details: { burnRate },
    });
  }

  // Check for inefficient agents
  for (const agent of Object.values(byAgent)) {
    // This is a placeholder - real logic would compare to historical averages
  }

  return {
    buildId,
    phases,
    artifacts,
    total: {
      usage: {
        input: state.totalInput,
        output: state.totalOutput,
        total: state.totalInput + state.totalOutput,
      },
      cost: totalCost,
      durationMs: elapsedMs,
    },
    breakdown: {
      byPhase,
      byAgent,
      byModel: { [state.model]: totalCost },
    },
    projections: {
      estimatedFinalCost,
      completionPercentage,
      burnRate,
    },
    warnings,
  };
}

/**
 * Get cost for a specific phase.
 */
export function getPhaseCost(buildId: string, phaseName: string): PhaseCost | null {
  const summary = getBuildCostSummary(buildId);
  if (!summary) return null;

  return summary.phases.find(p => p.phaseName === phaseName) || null;
}

/**
 * Get cost for a specific agent.
 */
export function getAgentCost(buildId: string, agentName: string): AgentCost | null {
  const summary = getBuildCostSummary(buildId);
  if (!summary) return null;

  for (const phase of summary.phases) {
    const agent = phase.agents.find(a => a.agentName === agentName);
    if (agent) return agent;
  }

  return null;
}

/**
 * Get cost for a specific artifact.
 */
export function getArtifactCost(buildId: string, artifactId: string): ArtifactCost | null {
  const state = costStates.get(buildId);
  if (!state) return null;

  return state.artifacts.get(artifactId) || null;
}

// =============================================================================
// FORMATTING
// =============================================================================

export function formatCostSummary(summary: BuildCostSummary): string {
  const lines: string[] = [];

  lines.push('=== BUILD COST SUMMARY ===');
  lines.push('');
  lines.push(`Build: ${summary.buildId}`);
  lines.push(`Duration: ${formatDuration(summary.total.durationMs)}`);
  lines.push(`Completion: ${summary.projections.completionPercentage.toFixed(0)}%`);
  lines.push('');

  lines.push('TOTALS:');
  lines.push(`  Input tokens:  ${summary.total.usage.input.toLocaleString()}`);
  lines.push(`  Output tokens: ${summary.total.usage.output.toLocaleString()}`);
  lines.push(`  Total tokens:  ${summary.total.usage.total.toLocaleString()}`);
  lines.push(`  Total cost:    $${summary.total.cost.toFixed(4)}`);
  lines.push('');

  lines.push('BY PHASE:');
  for (const phase of summary.phases) {
    const percentage =
      summary.total.cost > 0 ? ((phase.totalCost / summary.total.cost) * 100).toFixed(1) : '0.0';
    lines.push(`  ${phase.phaseName.padEnd(12)} $${phase.totalCost.toFixed(4)} (${percentage}%)`);
  }
  lines.push('');

  lines.push('TOP AGENTS BY COST:');
  const sortedAgents = Object.entries(summary.breakdown.byAgent)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  for (const [agent, cost] of sortedAgents) {
    lines.push(`  ${agent.padEnd(12)} $${cost.toFixed(4)}`);
  }
  lines.push('');

  lines.push('PROJECTIONS:');
  lines.push(`  Estimated final cost: $${summary.projections.estimatedFinalCost.toFixed(4)}`);
  lines.push(
    `  Burn rate: ${Math.round(summary.projections.burnRate).toLocaleString()} tokens/min`
  );
  lines.push('');

  if (summary.warnings.length > 0) {
    lines.push('WARNINGS:');
    for (const warning of summary.warnings) {
      lines.push(`  [${warning.severity}] ${warning.message}`);
    }
  }

  return lines.join('\n');
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
