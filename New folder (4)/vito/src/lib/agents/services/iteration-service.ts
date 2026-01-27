/**
 * OLYMPUS 2.0 - Iteration Service
 */

import type { AgentId, BuildPhase } from '../types';
import { BuildContextManager, loadContext, loadAgentOutputs } from '../context';
import { BuildOrchestrator } from '../orchestrator';
import { createServiceRoleClient } from '@/lib/auth/clients';
import type { Tables } from '@/types/database.types';

type Build = Tables<'builds'>;
type BuildIteration = Tables<'build_iterations'>;

/** Iteration params */
export interface IterationParams {
  buildId: string;
  feedback: string;
  focusAreas?: string[];
  rerunAgents?: AgentId[];
  rerunPhases?: BuildPhase[];
}

/** Iteration service response */
export interface IterationResponse {
  success: boolean;
  iterationNumber?: number;
  error?: { code: string; message: string };
}

/** Iteration service */
export const iterationService = {
  /** Create new iteration from feedback */
  async iterate(params: IterationParams): Promise<IterationResponse> {
    const supabase = createServiceRoleClient();

    // Get original build
    const { data: buildData, error } = await supabase
      .from('builds')
      .select('*')
      .eq('id', params.buildId)
      .single();

    const build = buildData as Build | null;
    if (error || !build) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Build not found' } };
    }

    if (build.status !== 'completed') {
      return { success: false, error: { code: 'INVALID_STATUS', message: 'Can only iterate on completed builds' } };
    }

    // Create iteration record
    const iterationNumber = (build.iteration || 1) + 1;

    const { data: iterationData, error: insertError } = await supabase
      .from('build_iterations')
      .insert({
        build_id: params.buildId,
        iteration_number: iterationNumber,
        feedback: params.feedback,
        focus_areas: params.focusAreas,
        rerun_agents: params.rerunAgents,
        rerun_phases: params.rerunPhases,
        status: 'pending',
      } as any)
      .select('id')
      .single();

    const iteration = iterationData as { id: string } | null;
    if (insertError || !iteration) {
      return { success: false, error: { code: 'CREATE_FAILED', message: insertError?.message || 'Failed to create iteration' } };
    }

    // Update build with new iteration
    await (supabase.from('builds') as any).update({
      iteration: iterationNumber,
      status: 'queued',
      current_phase: null,
      current_agent: null,
    }).eq('id', params.buildId);

    return { success: true, iterationNumber };
  },

  /** Start iteration execution */
  async startIteration(buildId: string, iterationNumber: number): Promise<IterationResponse> {
    const supabase = createServiceRoleClient();

    // Get build and iteration
    const { data: buildData } = await supabase.from('builds').select('*').eq('id', buildId).single();
    const { data: iterationData } = await supabase
      .from('build_iterations')
      .select('*')
      .eq('build_id', buildId)
      .eq('iteration_number', iterationNumber)
      .single();

    const build = buildData as Build | null;
    const iteration = iterationData as BuildIteration | null;
    if (!build || !iteration) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Build or iteration not found' } };
    }

    // Load previous context
    const previousOutputs = await loadAgentOutputs(buildId);

    // Create context with feedback
    const context = new BuildContextManager({
      buildId,
      projectId: build.project_id,
      tenantId: build.tenant_id,
      tier: build.tier,
      description: build.description || '',
      targetUsers: build.target_users || undefined,
      techConstraints: build.tech_constraints || undefined,
      businessRequirements: build.business_requirements || undefined,
      designPreferences: build.design_preferences || undefined,
      integrations: build.integrations || undefined,
    });

    // Add feedback
    context.addFeedback(iteration.feedback, iteration.focus_areas || undefined);

    // Restore previous outputs (for agents not being rerun)
    for (const [agentId, output] of previousOutputs) {
      if (!iteration.rerun_agents?.includes(agentId)) {
        context.recordOutput(output);
      }
    }

    // Determine which agents to run
    const excludeAgents = Array.from(previousOutputs.keys()).filter(
      (id) => !iteration.rerun_agents?.includes(id)
    );

    // Create orchestrator with exclusions
    const orchestrator = new BuildOrchestrator(buildId, context, build.tier, {
      // Will need to enhance planner to support exclude/focus
    });

    // Update iteration status
    await (supabase.from('build_iterations') as any).update({ status: 'running', started_at: new Date().toISOString() }).eq('id', iteration.id);

    // Start execution - 50X RELIABILITY: Added .catch() for error handling
    orchestrator.start().then(async (result) => {
      await (supabase.from('build_iterations') as any).update({
        status: result.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        error: result.error?.message,
      }).eq('id', iteration.id);
    }).catch((error) => {
      // 50X RELIABILITY: Ensure errors are logged and iteration is marked failed
      console.error(`[IterationService] CRITICAL: Failed to finalize iteration ${iteration.id}:`, error);
      (supabase.from('build_iterations') as any).update({
        status: 'failed',
        error: `Iteration finalization error: ${error instanceof Error ? error.message : String(error)}`,
        completed_at: new Date().toISOString(),
      }).eq('id', iteration.id).then(() => {
        console.log(`[IterationService] Marked iteration ${iteration.id} as failed after error`);
      }).catch((dbError: unknown) => {
        console.error(`[IterationService] Could not update iteration status for ${iteration.id}:`, dbError);
      });
    });

    return { success: true, iterationNumber };
  },

  /** Get iteration history */
  async getHistory(buildId: string): Promise<{ iterations: any[] }> {
    const supabase = createServiceRoleClient();

    const { data } = await supabase
      .from('build_iterations')
      .select('*')
      .eq('build_id', buildId)
      .order('iteration_number', { ascending: true });

    return { iterations: data || [] };
  },
};
