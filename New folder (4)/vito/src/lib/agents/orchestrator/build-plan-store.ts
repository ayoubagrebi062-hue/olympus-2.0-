/**
 * BuildPlanStore
 * Phase 3 of OLYMPUS 50X - Build Plan Integration
 *
 * Stores and manages build plans with:
 * - Plan creation and retrieval
 * - Phase tracking
 * - Agent execution order
 * - Plan versioning
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface BuildPlan {
  id: string;
  buildId: string;
  projectType: string;
  phases: BuildPhase[];
  agents: AgentPlan[];
  currentPhase: string | null;
  currentAgent: string | null;
  status: BuildPlanStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type BuildPlanStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface BuildPhase {
  id: string;
  name: string;
  order: number;
  agents: string[];
  status: PhaseStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export type PhaseStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

export interface AgentPlan {
  agentId: string;
  phase: string;
  order: number;
  required: boolean;
  dependencies: string[];
  status: AgentPlanStatus;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
  output?: Record<string, unknown>;
  error?: string;
}

export type AgentPlanStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

export interface CreatePlanInput {
  buildId: string;
  projectType: string;
  phases: Omit<BuildPhase, 'status' | 'startedAt' | 'completedAt'>[];
  agents: Omit<AgentPlan, 'status' | 'startedAt' | 'completedAt' | 'retryCount' | 'output' | 'error'>[];
  metadata?: Record<string, unknown>;
}

export interface PlanQueryOptions {
  status?: BuildPlanStatus | BuildPlanStatus[];
  projectType?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

// ============================================================================
// BUILD PLAN STORE
// ============================================================================

export class BuildPlanStore {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(url, key);
  }

  // ==========================================================================
  // PLAN CRUD
  // ==========================================================================

  /**
   * Create a new build plan
   */
  async create(input: CreatePlanInput): Promise<BuildPlan> {
    const phases: BuildPhase[] = input.phases.map((p) => ({
      ...p,
      status: 'pending' as PhaseStatus,
    }));

    const agents: AgentPlan[] = input.agents.map((a) => ({
      ...a,
      status: 'pending' as AgentPlanStatus,
      retryCount: 0,
      maxRetries: a.maxRetries || 3,
    }));

    const { data, error } = await this.supabase
      .from('build_plans')
      .insert({
        build_id: input.buildId,
        project_type: input.projectType,
        phases: phases,
        agents: agents,
        current_phase: null,
        current_agent: null,
        status: 'pending',
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create build plan: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * Get build plan by ID
   */
  async getById(id: string): Promise<BuildPlan | null> {
    const { data, error } = await this.supabase
      .from('build_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapFromDb(data);
  }

  /**
   * Get build plan by build ID
   */
  async getByBuildId(buildId: string): Promise<BuildPlan | null> {
    const { data, error } = await this.supabase
      .from('build_plans')
      .select('*')
      .eq('build_id', buildId)
      .single();

    if (error || !data) return null;
    return this.mapFromDb(data);
  }

  /**
   * Query build plans with filters
   */
  async query(options: PlanQueryOptions = {}): Promise<BuildPlan[]> {
    let query = this.supabase.from('build_plans').select('*');

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      query = query.in('status', statuses);
    }

    if (options.projectType) {
      query = query.eq('project_type', options.projectType);
    }

    const orderBy = options.orderBy === 'updatedAt' ? 'updated_at' : 'created_at';
    const orderDirection = options.orderDirection || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to query build plans: ${error.message}`);
    }

    return (data || []).map(this.mapFromDb);
  }

  /**
   * Update build plan status
   */
  async updateStatus(planId: string, status: BuildPlanStatus): Promise<void> {
    const { error } = await this.supabase
      .from('build_plans')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) {
      throw new Error(`Failed to update plan status: ${error.message}`);
    }
  }

  /**
   * Delete build plan
   */
  async delete(planId: string): Promise<void> {
    const { error } = await this.supabase.from('build_plans').delete().eq('id', planId);

    if (error) {
      throw new Error(`Failed to delete build plan: ${error.message}`);
    }
  }

  // ==========================================================================
  // PHASE MANAGEMENT
  // ==========================================================================

  /**
   * Update phase status
   */
  async updatePhaseStatus(
    planId: string,
    phaseId: string,
    status: PhaseStatus,
    error?: string
  ): Promise<void> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const phases = plan.phases.map((p) =>
      p.id === phaseId
        ? {
            ...p,
            status,
            ...(status === 'running' ? { startedAt: new Date() } : {}),
            ...(status === 'completed' || status === 'failed' ? { completedAt: new Date() } : {}),
            ...(error ? { error } : {}),
          }
        : p
    );

    const updates: Record<string, unknown> = {
      phases,
      updated_at: new Date().toISOString(),
    };

    // Update current phase if running
    if (status === 'running') {
      updates.current_phase = phaseId;
    }

    const { error: updateError } = await this.supabase
      .from('build_plans')
      .update(updates)
      .eq('id', planId);

    if (updateError) {
      throw new Error(`Failed to update phase status: ${updateError.message}`);
    }
  }

  /**
   * Get current phase
   */
  async getCurrentPhase(planId: string): Promise<BuildPhase | null> {
    const plan = await this.getById(planId);
    if (!plan || !plan.currentPhase) return null;

    return plan.phases.find((p) => p.id === plan.currentPhase) || null;
  }

  /**
   * Check if phase is complete
   */
  async isPhaseComplete(planId: string, phaseId: string): Promise<boolean> {
    const plan = await this.getById(planId);
    if (!plan) return false;

    const phase = plan.phases.find((p) => p.id === phaseId);
    if (!phase) return false;

    return phase.agents.every((agentId) => {
      const agent = plan.agents.find((a) => a.agentId === agentId);
      return agent?.status === 'completed' || agent?.status === 'skipped';
    });
  }

  /**
   * Get next phase
   */
  async getNextPhase(planId: string): Promise<BuildPhase | null> {
    const plan = await this.getById(planId);
    if (!plan) return null;

    const sortedPhases = [...plan.phases].sort((a, b) => a.order - b.order);

    for (const phase of sortedPhases) {
      if (phase.status === 'pending') {
        return phase;
      }
    }

    return null;
  }

  // ==========================================================================
  // AGENT MANAGEMENT
  // ==========================================================================

  /**
   * Update agent status
   */
  async updateAgentStatus(
    planId: string,
    agentId: string,
    status: AgentPlanStatus,
    options?: {
      retryCount?: number;
      output?: Record<string, unknown>;
      error?: string;
    }
  ): Promise<void> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const agents = plan.agents.map((a) =>
      a.agentId === agentId
        ? {
            ...a,
            status,
            ...(status === 'running' ? { startedAt: new Date() } : {}),
            ...(status === 'completed' || status === 'failed' ? { completedAt: new Date() } : {}),
            ...(options?.retryCount !== undefined ? { retryCount: options.retryCount } : {}),
            ...(options?.output ? { output: options.output } : {}),
            ...(options?.error ? { error: options.error } : {}),
          }
        : a
    );

    const updates: Record<string, unknown> = {
      agents,
      updated_at: new Date().toISOString(),
    };

    // Update current agent if running
    if (status === 'running') {
      updates.current_agent = agentId;
    }

    const { error: updateError } = await this.supabase
      .from('build_plans')
      .update(updates)
      .eq('id', planId);

    if (updateError) {
      throw new Error(`Failed to update agent status: ${updateError.message}`);
    }
  }

  /**
   * Get next agent to execute
   */
  async getNextAgent(planId: string): Promise<AgentPlan | null> {
    const plan = await this.getById(planId);
    if (!plan) return null;

    // Sort agents by phase order then agent order
    const sortedAgents = [...plan.agents].sort((a, b) => {
      const phaseA = plan.phases.find((p) => p.id === a.phase);
      const phaseB = plan.phases.find((p) => p.id === b.phase);
      const phaseOrderDiff = (phaseA?.order || 0) - (phaseB?.order || 0);
      return phaseOrderDiff !== 0 ? phaseOrderDiff : a.order - b.order;
    });

    // Find first pending agent whose dependencies are met
    for (const agent of sortedAgents) {
      if (agent.status !== 'pending') continue;

      const dependenciesMet = agent.dependencies.every((dep) => {
        const depAgent = plan.agents.find((a) => a.agentId === dep);
        return depAgent?.status === 'completed';
      });

      if (dependenciesMet) {
        // Also check that the phase is ready
        const phase = plan.phases.find((p) => p.id === agent.phase);
        if (phase && (phase.status === 'pending' || phase.status === 'running')) {
          return agent;
        }
      }
    }

    return null;
  }

  /**
   * Get agent by ID
   */
  async getAgent(planId: string, agentId: string): Promise<AgentPlan | null> {
    const plan = await this.getById(planId);
    if (!plan) return null;

    return plan.agents.find((a) => a.agentId === agentId) || null;
  }

  /**
   * Increment agent retry count
   */
  async incrementRetryCount(planId: string, agentId: string): Promise<number> {
    const agent = await this.getAgent(planId, agentId);
    if (!agent) throw new Error('Agent not found');

    const newCount = agent.retryCount + 1;
    await this.updateAgentStatus(planId, agentId, agent.status, { retryCount: newCount });
    return newCount;
  }

  /**
   * Check if agent can retry
   */
  async canAgentRetry(planId: string, agentId: string): Promise<boolean> {
    const agent = await this.getAgent(planId, agentId);
    if (!agent) return false;
    return agent.retryCount < agent.maxRetries;
  }

  /**
   * Get agents by phase
   */
  async getAgentsByPhase(planId: string, phaseId: string): Promise<AgentPlan[]> {
    const plan = await this.getById(planId);
    if (!plan) return [];

    return plan.agents.filter((a) => a.phase === phaseId).sort((a, b) => a.order - b.order);
  }

  /**
   * Get completed agents
   */
  async getCompletedAgents(planId: string): Promise<AgentPlan[]> {
    const plan = await this.getById(planId);
    if (!plan) return [];

    return plan.agents.filter((a) => a.status === 'completed');
  }

  /**
   * Get failed agents
   */
  async getFailedAgents(planId: string): Promise<AgentPlan[]> {
    const plan = await this.getById(planId);
    if (!plan) return [];

    return plan.agents.filter((a) => a.status === 'failed');
  }

  // ==========================================================================
  // PLAN ANALYSIS
  // ==========================================================================

  /**
   * Get plan progress
   */
  async getProgress(planId: string): Promise<{
    totalAgents: number;
    completedAgents: number;
    failedAgents: number;
    pendingAgents: number;
    runningAgents: number;
    skippedAgents: number;
    progressPercent: number;
    totalPhases: number;
    completedPhases: number;
    currentPhase: string | null;
    currentAgent: string | null;
  }> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const agents = plan.agents;
    const completedAgents = agents.filter((a) => a.status === 'completed').length;
    const failedAgents = agents.filter((a) => a.status === 'failed').length;
    const pendingAgents = agents.filter((a) => a.status === 'pending').length;
    const runningAgents = agents.filter((a) => a.status === 'running').length;
    const skippedAgents = agents.filter((a) => a.status === 'skipped').length;

    const completedPhases = plan.phases.filter(
      (p) => p.status === 'completed' || p.status === 'skipped'
    ).length;

    return {
      totalAgents: agents.length,
      completedAgents,
      failedAgents,
      pendingAgents,
      runningAgents,
      skippedAgents,
      progressPercent:
        agents.length > 0
          ? Math.round(((completedAgents + skippedAgents) / agents.length) * 100)
          : 0,
      totalPhases: plan.phases.length,
      completedPhases,
      currentPhase: plan.currentPhase,
      currentAgent: plan.currentAgent,
    };
  }

  /**
   * Check if plan is complete
   */
  async isPlanComplete(planId: string): Promise<boolean> {
    const plan = await this.getById(planId);
    if (!plan) return false;

    return plan.agents.every((a) => a.status === 'completed' || a.status === 'skipped');
  }

  /**
   * Check if plan has failed
   */
  async hasPlanFailed(planId: string): Promise<boolean> {
    const plan = await this.getById(planId);
    if (!plan) return false;

    // Plan fails if any required agent fails without retry options
    return plan.agents.some(
      (a) => a.status === 'failed' && a.required && a.retryCount >= a.maxRetries
    );
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private mapFromDb(data: Record<string, unknown>): BuildPlan {
    return {
      id: data.id as string,
      buildId: data.build_id as string,
      projectType: data.project_type as string,
      phases: (data.phases as BuildPhase[]) || [],
      agents: (data.agents as AgentPlan[]) || [],
      currentPhase: data.current_phase as string | null,
      currentAgent: data.current_agent as string | null,
      status: data.status as BuildPlanStatus,
      metadata: data.metadata as Record<string, unknown>,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let storeInstance: BuildPlanStore | null = null;

export function getBuildPlanStore(): BuildPlanStore {
  if (!storeInstance) {
    storeInstance = new BuildPlanStore();
  }
  return storeInstance;
}
