/**
 * PROMPT STORE
 * Phase 5 of OLYMPUS 50X - CRITICAL for Level 5 (EVOLUTION MODULE)
 *
 * Handles database operations for prompts including:
 * - CRUD operations for prompts
 * - A/B testing experiments
 * - Performance tracking
 * - History logging
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  PromptRecord,
  CreatePromptInput,
  UpdatePromptInput,
  LoadedPrompt,
  PromptExperiment,
  PromptPerformance,
  PromptHistoryEntry,
  AgentPromptRow,
  PromptExperimentRow,
  PromptPerformanceRow,
  PromptHistoryRow,
  ExperimentResults,
  PromptStatus,
  RecordPerformanceInput,
} from './types';

export class PromptStore {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // =========================================================================
  // PROMPT CRUD
  // =========================================================================

  /**
   * Get active prompt for an agent (considering A/B tests)
   */
  async getActivePrompt(agentId: string): Promise<LoadedPrompt | null> {
    const { data, error } = await this.supabase.rpc('get_active_prompt', {
      p_agent_id: agentId,
      p_experiment_random: Math.random(),
    });

    if (error) {
      console.error(`Error getting active prompt for ${agentId}:`, error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`No active prompt found for agent ${agentId}`);
      return null;
    }

    const row = data[0];
    return {
      promptId: row.prompt_id,
      agentId,
      version: row.version,
      systemPrompt: row.system_prompt,
      outputSchema: row.output_schema,
      examples: row.examples || [],
      experimentId: row.experiment_id,
    };
  }

  /**
   * Get specific prompt by ID
   */
  async getPrompt(promptId: string): Promise<PromptRecord | null> {
    const { data, error } = await this.supabase
      .from('agent_prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    if (error || !data) {
      if (error?.code !== 'PGRST116') {
        // Not a "no rows" error
        console.error(`Error getting prompt ${promptId}:`, error);
      }
      return null;
    }

    return this.mapToPromptRecord(data as AgentPromptRow);
  }

  /**
   * Get all prompts for an agent
   */
  async getPromptsForAgent(agentId: string): Promise<PromptRecord[]> {
    const { data, error } = await this.supabase
      .from('agent_prompts')
      .select('*')
      .eq('agent_id', agentId)
      .order('version', { ascending: false });

    if (error) {
      console.error(`Error getting prompts for agent ${agentId}:`, error);
      return [];
    }

    return (data || []).map((row) => this.mapToPromptRecord(row as AgentPromptRow));
  }

  /**
   * Get all active prompts (for bulk loading)
   */
  async getAllActivePrompts(): Promise<LoadedPrompt[]> {
    const { data, error } = await this.supabase
      .from('agent_prompts')
      .select('*')
      .eq('is_default', true)
      .eq('status', 'active');

    if (error) {
      console.error('Error getting all active prompts:', error);
      return [];
    }

    return (data || []).map((row: AgentPromptRow) => ({
      promptId: row.id,
      agentId: row.agent_id,
      version: row.version,
      systemPrompt: row.system_prompt,
      outputSchema: row.output_schema || undefined,
      examples: row.examples || [],
    }));
  }

  /**
   * Create new prompt version
   */
  async createPrompt(input: CreatePromptInput): Promise<PromptRecord> {
    // Get next version number
    const { data: existing } = await this.supabase
      .from('agent_prompts')
      .select('version')
      .eq('agent_id', input.agentId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;

    const { data, error } = await this.supabase
      .from('agent_prompts')
      .insert({
        agent_id: input.agentId,
        version: nextVersion,
        name: input.name || `Version ${nextVersion}`,
        system_prompt: input.systemPrompt,
        output_schema: input.outputSchema,
        examples: input.examples || [],
        change_notes: input.changeNotes,
        metadata: input.metadata || {},
        status: 'draft',
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create prompt: ${error.message}`);
    }

    // Log history
    await this.logHistory(data.id, 'created', null, input.systemPrompt, input.changeNotes);

    return this.mapToPromptRecord(data as AgentPromptRow);
  }

  /**
   * Update existing prompt
   */
  async updatePrompt(promptId: string, input: UpdatePromptInput): Promise<PromptRecord> {
    // Get current prompt for history
    const current = await this.getPrompt(promptId);
    if (!current) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    const updateData: Record<string, unknown> = {};

    if (input.systemPrompt !== undefined) {
      updateData.system_prompt = input.systemPrompt;
    }
    if (input.name !== undefined) updateData.name = input.name;
    if (input.outputSchema !== undefined) updateData.output_schema = input.outputSchema;
    if (input.examples !== undefined) updateData.examples = input.examples;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.changeNotes !== undefined) updateData.change_notes = input.changeNotes;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const { data, error } = await this.supabase
      .from('agent_prompts')
      .update(updateData)
      .eq('id', promptId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update prompt: ${error.message}`);
    }

    // Log history if prompt text changed
    if (input.systemPrompt && input.systemPrompt !== current.systemPrompt) {
      await this.logHistory(
        promptId,
        'updated',
        current.systemPrompt,
        input.systemPrompt,
        input.changeNotes
      );
    }

    return this.mapToPromptRecord(data as AgentPromptRow);
  }

  /**
   * Activate a prompt (make it the default for its agent)
   */
  async activatePrompt(promptId: string, changedBy?: string): Promise<void> {
    const { error } = await this.supabase.rpc('activate_prompt', {
      p_prompt_id: promptId,
      p_changed_by: changedBy || null,
    });

    if (error) {
      throw new Error(`Failed to activate prompt: ${error.message}`);
    }
  }

  /**
   * Archive a prompt
   */
  async archivePrompt(promptId: string): Promise<void> {
    const { error } = await this.supabase
      .from('agent_prompts')
      .update({
        status: 'archived',
        is_default: false,
        archived_at: new Date().toISOString(),
      })
      .eq('id', promptId);

    if (error) {
      throw new Error(`Failed to archive prompt: ${error.message}`);
    }

    await this.logHistory(promptId, 'archived', null, null, 'Prompt archived');
  }

  /**
   * Delete a prompt (hard delete - use with caution)
   */
  async deletePrompt(promptId: string): Promise<void> {
    const { error } = await this.supabase.from('agent_prompts').delete().eq('id', promptId);

    if (error) {
      throw new Error(`Failed to delete prompt: ${error.message}`);
    }
  }

  // =========================================================================
  // PERFORMANCE TRACKING
  // =========================================================================

  /**
   * Record prompt performance
   */
  async recordPerformance(performance: RecordPerformanceInput): Promise<void> {
    const { error } = await this.supabase.from('prompt_performance').insert({
      prompt_id: performance.promptId,
      build_id: performance.buildId,
      quality_score: performance.qualityScore,
      tokens_used: performance.tokensUsed,
      latency_ms: performance.latencyMs,
      passed_validation: performance.passedValidation,
      retry_count: performance.retryCount,
    });

    if (error) {
      console.error(`Failed to record performance: ${error.message}`);
      return;
    }

    // Update aggregate stats
    await this.supabase.rpc('update_prompt_stats', { p_prompt_id: performance.promptId });
  }

  /**
   * Get performance history for a prompt
   */
  async getPerformanceHistory(promptId: string, limit: number = 100): Promise<PromptPerformance[]> {
    const { data, error } = await this.supabase
      .from('prompt_performance')
      .select('*')
      .eq('prompt_id', promptId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`Error getting performance history: ${error.message}`);
      return [];
    }

    return (data || []).map((row: PromptPerformanceRow) => ({
      id: row.id,
      promptId: row.prompt_id,
      buildId: row.build_id,
      qualityScore: row.quality_score || 0,
      tokensUsed: row.tokens_used || 0,
      latencyMs: row.latency_ms || 0,
      passedValidation: row.passed_validation || false,
      retryCount: row.retry_count || 0,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Get aggregate performance stats for a prompt
   */
  async getPerformanceStats(promptId: string): Promise<{
    count: number;
    avgQualityScore: number;
    successRate: number;
    avgTokensUsed: number;
    avgLatencyMs: number;
  }> {
    const { data, error } = await this.supabase
      .from('prompt_performance')
      .select('quality_score, tokens_used, latency_ms, passed_validation')
      .eq('prompt_id', promptId);

    if (error || !data || data.length === 0) {
      return {
        count: 0,
        avgQualityScore: 0,
        successRate: 0,
        avgTokensUsed: 0,
        avgLatencyMs: 0,
      };
    }

    const count = data.length;
    const sumQuality = data.reduce((sum, r) => sum + (r.quality_score || 0), 0);
    const sumTokens = data.reduce((sum, r) => sum + (r.tokens_used || 0), 0);
    const sumLatency = data.reduce((sum, r) => sum + (r.latency_ms || 0), 0);
    const passedCount = data.filter((r) => r.passed_validation).length;

    return {
      count,
      avgQualityScore: sumQuality / count,
      successRate: (passedCount / count) * 100,
      avgTokensUsed: Math.round(sumTokens / count),
      avgLatencyMs: Math.round(sumLatency / count),
    };
  }

  // =========================================================================
  // A/B TESTING
  // =========================================================================

  /**
   * Create experiment
   */
  async createExperiment(
    experiment: Omit<PromptExperiment, 'id' | 'createdAt'>
  ): Promise<PromptExperiment> {
    const { data, error } = await this.supabase
      .from('prompt_experiments')
      .insert({
        agent_id: experiment.agentId,
        name: experiment.name,
        description: experiment.description,
        control_prompt_id: experiment.controlPromptId,
        variant_prompt_ids: experiment.variantPromptIds,
        traffic_split: experiment.trafficSplit,
        min_sample_size: experiment.minSampleSize,
        status: 'draft',
        created_by: experiment.createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create experiment: ${error.message}`);
    }

    return this.mapToExperiment(data as PromptExperimentRow);
  }

  /**
   * Start experiment
   */
  async startExperiment(experimentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('prompt_experiments')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', experimentId);

    if (error) {
      throw new Error(`Failed to start experiment: ${error.message}`);
    }

    // Set prompts to testing status
    const exp = await this.getExperiment(experimentId);
    if (exp) {
      const allPromptIds = [exp.controlPromptId, ...exp.variantPromptIds];
      await this.supabase
        .from('agent_prompts')
        .update({
          status: 'testing',
          experiment_id: experimentId,
        })
        .in('id', allPromptIds);
    }
  }

  /**
   * End experiment with winner
   */
  async endExperiment(
    experimentId: string,
    winnerPromptId: string,
    results: ExperimentResults
  ): Promise<void> {
    const { error } = await this.supabase
      .from('prompt_experiments')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        winner_prompt_id: winnerPromptId,
        results,
      })
      .eq('id', experimentId);

    if (error) {
      throw new Error(`Failed to end experiment: ${error.message}`);
    }

    // Reset prompt statuses
    const exp = await this.getExperiment(experimentId);
    if (exp) {
      const allPromptIds = [exp.controlPromptId, ...exp.variantPromptIds];
      await this.supabase
        .from('agent_prompts')
        .update({
          status: 'active',
          experiment_id: null,
        })
        .in('id', allPromptIds);
    }
  }

  /**
   * Cancel experiment
   */
  async cancelExperiment(experimentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('prompt_experiments')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString(),
      })
      .eq('id', experimentId);

    if (error) {
      throw new Error(`Failed to cancel experiment: ${error.message}`);
    }

    // Reset prompt statuses
    const exp = await this.getExperiment(experimentId);
    if (exp) {
      const allPromptIds = [exp.controlPromptId, ...exp.variantPromptIds];
      await this.supabase
        .from('agent_prompts')
        .update({
          status: 'active',
          experiment_id: null,
        })
        .in('id', allPromptIds);
    }
  }

  /**
   * Get experiment
   */
  async getExperiment(experimentId: string): Promise<PromptExperiment | null> {
    const { data, error } = await this.supabase
      .from('prompt_experiments')
      .select('*')
      .eq('id', experimentId)
      .single();

    if (error || !data) {
      if (error?.code !== 'PGRST116') {
        console.error(`Error getting experiment ${experimentId}:`, error);
      }
      return null;
    }

    return this.mapToExperiment(data as PromptExperimentRow);
  }

  /**
   * Get running experiments for an agent
   */
  async getRunningExperiments(agentId: string): Promise<PromptExperiment[]> {
    const { data, error } = await this.supabase
      .from('prompt_experiments')
      .select('*')
      .eq('agent_id', agentId)
      .eq('status', 'running');

    if (error) {
      console.error(`Error getting running experiments for ${agentId}:`, error);
      return [];
    }

    return (data || []).map((row) => this.mapToExperiment(row as PromptExperimentRow));
  }

  /**
   * Get all experiments for an agent
   */
  async getExperimentsForAgent(agentId: string): Promise<PromptExperiment[]> {
    const { data, error } = await this.supabase
      .from('prompt_experiments')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error getting experiments for ${agentId}:`, error);
      return [];
    }

    return (data || []).map((row) => this.mapToExperiment(row as PromptExperimentRow));
  }

  // =========================================================================
  // HISTORY
  // =========================================================================

  /**
   * Log a history entry
   */
  private async logHistory(
    promptId: string,
    action: string,
    previousContent: string | null,
    newContent: string | null,
    reason?: string
  ): Promise<void> {
    const { error } = await this.supabase.from('prompt_history').insert({
      prompt_id: promptId,
      action,
      previous_content: previousContent,
      new_content: newContent,
      reason,
    });

    if (error) {
      console.error(`Failed to log history: ${error.message}`);
    }
  }

  /**
   * Get change history for a prompt
   */
  async getHistory(promptId: string): Promise<PromptHistoryEntry[]> {
    const { data, error } = await this.supabase
      .from('prompt_history')
      .select('*')
      .eq('prompt_id', promptId)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error(`Error getting history for ${promptId}:`, error);
      return [];
    }

    return (data || []).map((row: PromptHistoryRow) => ({
      id: row.id,
      promptId: row.prompt_id,
      action: row.action as 'created' | 'updated' | 'activated' | 'archived',
      previousContent: row.previous_content || undefined,
      newContent: row.new_content || undefined,
      changedBy: row.changed_by || undefined,
      changedAt: new Date(row.changed_at),
      reason: row.reason || undefined,
      metadata: row.metadata || undefined,
    }));
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  /**
   * Map database row to PromptRecord
   */
  private mapToPromptRecord(row: AgentPromptRow): PromptRecord {
    return {
      id: row.id,
      agentId: row.agent_id,
      version: row.version,
      name: row.name || undefined,
      systemPrompt: row.system_prompt,
      outputSchema: row.output_schema || undefined,
      examples: row.examples || [],
      status: row.status as PromptStatus,
      isDefault: row.is_default,
      experimentId: row.experiment_id || undefined,
      trafficPercentage: row.traffic_percentage || 0,
      usageCount: row.usage_count || 0,
      avgQualityScore: row.avg_quality_score || undefined,
      successRate: row.success_rate || undefined,
      avgTokensUsed: row.avg_tokens_used || undefined,
      avgLatencyMs: row.avg_latency_ms || undefined,
      createdBy: row.created_by || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      activatedAt: row.activated_at ? new Date(row.activated_at) : undefined,
      archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
      changeNotes: row.change_notes || undefined,
      metadata: row.metadata || undefined,
    };
  }

  /**
   * Map database row to PromptExperiment
   */
  private mapToExperiment(row: PromptExperimentRow): PromptExperiment {
    return {
      id: row.id,
      agentId: row.agent_id,
      name: row.name,
      description: row.description || undefined,
      controlPromptId: row.control_prompt_id,
      variantPromptIds: row.variant_prompt_ids || [],
      trafficSplit: row.traffic_split,
      minSampleSize: row.min_sample_size,
      status: row.status as 'draft' | 'running' | 'completed' | 'cancelled',
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      winnerPromptId: row.winner_prompt_id || undefined,
      results: row.results || undefined,
      createdBy: row.created_by || undefined,
      createdAt: new Date(row.created_at),
    };
  }
}
