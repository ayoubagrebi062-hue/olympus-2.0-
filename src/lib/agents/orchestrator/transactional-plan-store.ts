/**
 * Transactional Build Plan Store
 *
 * Fixes transaction boundary issues by:
 * 1. Using proper PostgreSQL transactions
 * 2. Atomic batch operations
 * 3. Rollback on partial failures
 * 4. Optimistic locking for concurrent access
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface BuildPlanRecord {
  id: string;
  buildId: string;
  projectType: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentPhase: string | null;
  currentAgent: string | null;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhaseRecord {
  id: string;
  planId: string;
  phaseId: string;
  name: string;
  order: number;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}

export interface AgentRecord {
  id: string;
  planId: string;
  phaseId: string;
  agentId: string;
  order: number;
  isRequired: boolean;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  retryCount: number;
  maxRetries: number;
  output: Record<string, unknown> | null;
  error: string | null;
  version: number;
}

export interface CreatePlanInput {
  buildId: string;
  projectType: string;
  phases: Array<{
    phaseId: string;
    name: string;
    order: number;
  }>;
  agents: Array<{
    agentId: string;
    phaseId: string;
    order: number;
    isRequired: boolean;
    dependencies: string[];
    maxRetries?: number;
  }>;
  metadata?: Record<string, unknown>;
}

export interface TransactionContext {
  planId: string;
  operations: Array<{
    type: 'update_plan' | 'update_phase' | 'update_agent';
    data: Record<string, unknown>;
    condition?: Record<string, unknown>;
  }>;
}

// ============================================================================
// TRANSACTIONAL STORE
// ============================================================================

export class TransactionalPlanStore {
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
  // ATOMIC CREATE (Plan + Phases + Agents in one transaction)
  // ==========================================================================

  /**
   * Create a complete build plan atomically
   * Uses a database function to ensure all-or-nothing
   */
  async createPlan(input: CreatePlanInput): Promise<BuildPlanRecord> {
    const { data, error } = await this.supabase.rpc('create_build_plan_atomic', {
      p_build_id: input.buildId,
      p_project_type: input.projectType,
      p_metadata: input.metadata || {},
      p_phases: input.phases,
      p_agents: input.agents.map(a => ({
        ...a,
        maxRetries: a.maxRetries || 3,
      })),
    });

    if (error) {
      throw new Error(`Failed to create plan: ${error.message}`);
    }

    return this.mapPlanFromDb(data);
  }

  // ==========================================================================
  // ATOMIC UPDATES
  // ==========================================================================

  /**
   * Update agent status with optimistic locking
   * Returns new version or throws on conflict
   */
  async updateAgentStatus(
    planId: string,
    agentId: string,
    status: AgentRecord['status'],
    expectedVersion: number,
    options?: {
      output?: Record<string, unknown>;
      error?: string;
      incrementRetry?: boolean;
    }
  ): Promise<{ success: boolean; newVersion: number; message: string }> {
    const { data, error } = await this.supabase.rpc('update_agent_with_lock', {
      p_plan_id: planId,
      p_agent_id: agentId,
      p_status: status,
      p_expected_version: expectedVersion,
      p_output: options?.output || null,
      p_error: options?.error || null,
    });

    if (error) {
      throw new Error(`Failed to update agent: ${error.message}`);
    }

    return {
      success: data[0].success,
      newVersion: data[0].new_version,
      message: data[0].message,
    };
  }

  /**
   * Batch update multiple agents atomically
   * All succeed or all fail
   */
  async batchUpdateAgents(
    planId: string,
    updates: Array<{
      agentId: string;
      status: AgentRecord['status'];
      output?: Record<string, unknown>;
      error?: string;
    }>
  ): Promise<Array<{ agentId: string; success: boolean; newVersion: number }>> {
    const { data, error } = await this.supabase.rpc('batch_update_agents', {
      p_plan_id: planId,
      p_updates: updates,
    });

    if (error) {
      throw new Error(`Failed to batch update agents: ${error.message}`);
    }

    return data;
  }

  /**
   * Complete a phase and advance to next atomically
   */
  async completePhaseAndAdvance(
    planId: string,
    currentPhaseId: string,
    nextPhaseId: string | null
  ): Promise<void> {
    const { error } = await this.supabase.rpc('complete_phase_and_advance', {
      p_plan_id: planId,
      p_current_phase: currentPhaseId,
      p_next_phase: nextPhaseId,
    });

    if (error) {
      throw new Error(`Failed to advance phase: ${error.message}`);
    }
  }

  // ==========================================================================
  // OPTIMIZED QUERIES (Single roundtrip)
  // ==========================================================================

  /**
   * Get next executable agent (dependencies met, status pending)
   * Single query instead of N+1
   */
  async getNextAgent(planId: string): Promise<AgentRecord | null> {
    const { data, error } = await this.supabase.rpc('get_next_executable_agent', {
      p_plan_id: planId,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      id: '',
      planId,
      phaseId: row.phase_id,
      agentId: row.agent_id,
      order: row.agent_order,
      isRequired: row.is_required,
      dependencies: row.dependencies || [],
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      output: null,
      error: null,
      version: row.version,
    };
  }

  /**
   * Get complete progress in single query
   */
  async getProgress(planId: string): Promise<{
    totalAgents: number;
    completedAgents: number;
    failedAgents: number;
    runningAgents: number;
    pendingAgents: number;
    skippedAgents: number;
    progressPercent: number;
    currentPhase: string | null;
    currentAgent: string | null;
  }> {
    const { data, error } = await this.supabase.rpc('get_plan_progress_fast', {
      p_plan_id: planId,
    });

    if (error || !data || data.length === 0) {
      return {
        totalAgents: 0,
        completedAgents: 0,
        failedAgents: 0,
        runningAgents: 0,
        pendingAgents: 0,
        skippedAgents: 0,
        progressPercent: 0,
        currentPhase: null,
        currentAgent: null,
      };
    }

    const row = data[0];
    return {
      totalAgents: Number(row.total_agents),
      completedAgents: Number(row.completed_agents),
      failedAgents: Number(row.failed_agents),
      runningAgents: Number(row.running_agents),
      pendingAgents: Number(row.pending_agents),
      skippedAgents: Number(row.skipped_agents),
      progressPercent: Number(row.progress_percent) || 0,
      currentPhase: row.current_phase,
      currentAgent: row.current_agent,
    };
  }

  /**
   * Check if all agents are complete (single query)
   */
  async isPlanComplete(planId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('build_plan_agents')
      .select('status')
      .eq('plan_id', planId)
      .not('status', 'in', '("completed","skipped")')
      .limit(1);

    if (error) {
      throw new Error(`Failed to check completion: ${error.message}`);
    }

    return data.length === 0;
  }

  /**
   * Check if plan has failed (any required agent failed)
   */
  async hasPlanFailed(planId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('build_plan_agents')
      .select('agent_id')
      .eq('plan_id', planId)
      .eq('status', 'failed')
      .eq('is_required', true)
      .limit(1);

    if (error) {
      throw new Error(`Failed to check failure: ${error.message}`);
    }

    return data.length > 0;
  }

  // ==========================================================================
  // BASIC OPERATIONS
  // ==========================================================================

  async getPlan(planId: string): Promise<BuildPlanRecord | null> {
    const { data, error } = await this.supabase
      .from('build_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error || !data) return null;
    return this.mapPlanFromDb(data);
  }

  async getPlanByBuildId(buildId: string): Promise<BuildPlanRecord | null> {
    const { data, error } = await this.supabase
      .from('build_plans')
      .select('*')
      .eq('build_id', buildId)
      .single();

    if (error || !data) return null;
    return this.mapPlanFromDb(data);
  }

  async getPhases(planId: string): Promise<PhaseRecord[]> {
    const { data, error } = await this.supabase
      .from('build_plan_phases')
      .select('*')
      .eq('plan_id', planId)
      .order('phase_order', { ascending: true });

    if (error || !data) return [];
    return data.map(this.mapPhaseFromDb);
  }

  async getAgents(planId: string): Promise<AgentRecord[]> {
    const { data, error } = await this.supabase
      .from('build_plan_agents')
      .select('*')
      .eq('plan_id', planId)
      .order('agent_order', { ascending: true });

    if (error || !data) return [];
    return data.map(this.mapAgentFromDb);
  }

  async getAgentsByPhase(planId: string, phaseId: string): Promise<AgentRecord[]> {
    const { data, error } = await this.supabase
      .from('build_plan_agents')
      .select('*')
      .eq('plan_id', planId)
      .eq('phase_id', phaseId)
      .order('agent_order', { ascending: true });

    if (error || !data) return [];
    return data.map(this.mapAgentFromDb);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private mapPlanFromDb(data: Record<string, unknown>): BuildPlanRecord {
    return {
      id: data.id as string,
      buildId: data.build_id as string,
      projectType: data.project_type as string,
      status: data.status as BuildPlanRecord['status'],
      currentPhase: data.current_phase as string | null,
      currentAgent: data.current_agent as string | null,
      version: data.version as number,
      metadata: (data.metadata as Record<string, unknown>) || {},
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private mapPhaseFromDb(data: Record<string, unknown>): PhaseRecord {
    return {
      id: data.id as string,
      planId: data.plan_id as string,
      phaseId: data.phase_id as string,
      name: data.name as string,
      order: data.phase_order as number,
      status: data.status as PhaseRecord['status'],
      startedAt: data.started_at ? new Date(data.started_at as string) : null,
      completedAt: data.completed_at ? new Date(data.completed_at as string) : null,
      error: data.error as string | null,
    };
  }

  private mapAgentFromDb(data: Record<string, unknown>): AgentRecord {
    return {
      id: data.id as string,
      planId: data.plan_id as string,
      phaseId: data.phase_id as string,
      agentId: data.agent_id as string,
      order: data.agent_order as number,
      isRequired: data.is_required as boolean,
      dependencies: (data.dependencies as string[]) || [],
      status: data.status as AgentRecord['status'],
      retryCount: data.retry_count as number,
      maxRetries: data.max_retries as number,
      output: data.output as Record<string, unknown> | null,
      error: data.error as string | null,
      version: data.version as number,
    };
  }
}

// ============================================================================
// ATOMIC CREATE FUNCTION (Add to migration)
// ============================================================================

export const ATOMIC_CREATE_FUNCTION = `
CREATE OR REPLACE FUNCTION create_build_plan_atomic(
  p_build_id UUID,
  p_project_type TEXT,
  p_metadata JSONB,
  p_phases JSONB,
  p_agents JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_plan_id UUID;
  v_phase JSONB;
  v_agent JSONB;
BEGIN
  -- Insert plan
  INSERT INTO build_plans (build_id, project_type, status, version, metadata)
  VALUES (p_build_id, p_project_type, 'pending', 1, p_metadata)
  RETURNING id INTO v_plan_id;

  -- Insert phases
  FOR v_phase IN SELECT * FROM jsonb_array_elements(p_phases)
  LOOP
    INSERT INTO build_plan_phases (plan_id, phase_id, name, phase_order, status)
    VALUES (
      v_plan_id,
      v_phase->>'phaseId',
      v_phase->>'name',
      (v_phase->>'order')::INTEGER,
      'pending'
    );
  END LOOP;

  -- Insert agents
  FOR v_agent IN SELECT * FROM jsonb_array_elements(p_agents)
  LOOP
    INSERT INTO build_plan_agents (
      plan_id, phase_id, agent_id, agent_order,
      is_required, dependencies, max_retries, status, version
    )
    VALUES (
      v_plan_id,
      v_agent->>'phaseId',
      v_agent->>'agentId',
      (v_agent->>'order')::INTEGER,
      (v_agent->>'isRequired')::BOOLEAN,
      ARRAY(SELECT jsonb_array_elements_text(v_agent->'dependencies')),
      COALESCE((v_agent->>'maxRetries')::INTEGER, 3),
      'pending',
      1
    );
  END LOOP;

  -- Return the created plan
  RETURN (
    SELECT row_to_json(bp.*)
    FROM build_plans bp
    WHERE bp.id = v_plan_id
  );
END;
$$ LANGUAGE plpgsql;

-- Phase advancement function
CREATE OR REPLACE FUNCTION complete_phase_and_advance(
  p_plan_id UUID,
  p_current_phase TEXT,
  p_next_phase TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Complete current phase
  UPDATE build_plan_phases
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE plan_id = p_plan_id AND phase_id = p_current_phase;

  -- Start next phase if provided
  IF p_next_phase IS NOT NULL THEN
    UPDATE build_plan_phases
    SET
      status = 'running',
      started_at = NOW(),
      updated_at = NOW()
    WHERE plan_id = p_plan_id AND phase_id = p_next_phase;

    UPDATE build_plans
    SET
      current_phase = p_next_phase,
      updated_at = NOW()
    WHERE id = p_plan_id;
  ELSE
    -- No next phase - mark plan as completing
    UPDATE build_plans
    SET
      current_phase = NULL,
      updated_at = NOW()
    WHERE id = p_plan_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
`;

// ============================================================================
// FACTORY
// ============================================================================

export function createTransactionalStore(): TransactionalPlanStore {
  return new TransactionalPlanStore();
}
