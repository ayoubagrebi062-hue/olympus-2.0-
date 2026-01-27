/**
 * OLYMPUS 2.0 - Context Persistence
 */

import type { AgentId, AgentOutput, Artifact, Decision } from '../types';
import type { BuildContextData, BuildKnowledge, ContextSnapshot } from './types';
import { createServiceRoleClient } from '@/lib/auth/clients';
import type { Tables } from '@/types/database.types';
import { safeJsonParse } from '@/lib/utils/safe-json';

type BuildAgentOutput = Tables<'build_agent_outputs'>;
type BuildSnapshot = Tables<'build_snapshots'>;

/** Serialize context for database storage */
export function serializeContext(data: Partial<BuildContextData>): Record<string, unknown> {
  return {
    state: data.state,
    current_phase: data.currentPhase,
    current_agent: data.currentAgent,
    iteration: data.iteration,
    knowledge: data.knowledge,
    user_feedback: data.userFeedback,
    focus_areas: data.focusAreas,
    tokens_used: data.tokensUsed,
    estimated_cost: data.estimatedCost,
  };
}

/** Deserialize context from database */
export function deserializeContext(row: Record<string, unknown>): Partial<BuildContextData> {
  return {
    state: row.state as BuildContextData['state'],
    currentPhase: row.current_phase as BuildContextData['currentPhase'],
    currentAgent: row.current_agent as BuildContextData['currentAgent'],
    iteration: row.iteration as number,
    knowledge: row.knowledge as BuildKnowledge,
    userFeedback: row.user_feedback as string[],
    focusAreas: row.focus_areas as string[],
    tokensUsed: row.tokens_used as number,
    estimatedCost: row.estimated_cost as number,
  };
}

/** Save build context to database (gracefully handles connection failures) */
export async function saveContext(buildId: string, data: Partial<BuildContextData>): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const serialized = serializeContext(data);

    const { error } = await (supabase.from('builds') as any).update(serialized).eq('id', buildId);
    if (error) {
      console.warn(`[PERSISTENCE] Failed to save context (non-fatal): ${error.message}`);
      // Don't throw - allow builds to continue without DB
    }
  } catch (err) {
    console.warn(`[PERSISTENCE] Database connection failed (non-fatal):`, err);
    // Don't throw - allow builds to continue without DB
  }
}

/** Load build context from database */
export async function loadContext(buildId: string): Promise<Partial<BuildContextData> | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.from('builds').select('*').eq('id', buildId).single();
  if (error || !data) return null;

  return deserializeContext(data);
}

/** Save agent output to database (gracefully handles connection failures) */
export async function saveAgentOutput(buildId: string, output: AgentOutput): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase.from('build_agent_outputs').upsert({
      build_id: buildId,
      agent_id: output.agentId,
      status: output.status,
      artifacts: output.artifacts,
      decisions: output.decisions,
      metrics: output.metrics,
      errors: output.errors,
      duration: output.duration,
      tokens_used: output.tokensUsed,
    } as any, { onConflict: 'build_id,agent_id' });

    if (error) {
      console.warn(`[PERSISTENCE] Failed to save agent output (non-fatal): ${error.message}`);
      // Don't throw - allow builds to continue without DB
    }
  } catch (err) {
    console.warn(`[PERSISTENCE] Database connection failed (non-fatal):`, err);
    // Don't throw - allow builds to continue without DB
  }
}

/** Load agent outputs for build */
export async function loadAgentOutputs(buildId: string): Promise<Map<AgentId, AgentOutput>> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.from('build_agent_outputs').select('*').eq('build_id', buildId);
  if (error) throw new Error(`Failed to load agent outputs: ${error.message}`);

  const rows = (data || []) as BuildAgentOutput[];
  const outputs = new Map<AgentId, AgentOutput>();
  for (const row of rows) {
    outputs.set(row.agent_id as AgentId, {
      agentId: row.agent_id as AgentId,
      status: row.status as AgentOutput['status'],
      artifacts: row.artifacts as any,
      decisions: row.decisions as any,
      metrics: row.metrics as any,
      errors: row.errors as any,
      duration: row.duration || 0,
      tokensUsed: row.tokens_used,
    });
  }
  return outputs;
}

/** Save context snapshot */
export async function saveSnapshot(snapshot: ContextSnapshot): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from('build_snapshots').insert({
    build_id: snapshot.buildId,
    version: snapshot.version,
    state: snapshot.state,
    current_phase: snapshot.currentPhase,
    current_agent: snapshot.currentAgent,
    iteration: snapshot.iteration,
    knowledge: snapshot.knowledge,
    agent_output_ids: snapshot.agentOutputIds,
    tokens_used: snapshot.tokensUsed,
    checksum: snapshot.checksum,
  } as any);

  if (error) throw new Error(`Failed to save snapshot: ${error.message}`);
}

/** Load latest snapshot */
export async function loadLatestSnapshot(buildId: string): Promise<ContextSnapshot | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('build_snapshots')
    .select('*')
    .eq('build_id', buildId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  const row = data as BuildSnapshot;
  return {
    buildId: row.build_id,
    version: row.version,
    timestamp: new Date(row.created_at),
    state: row.state as any,
    currentPhase: row.current_phase as any,
    currentAgent: row.current_agent as any,
    iteration: row.iteration,
    knowledge: row.knowledge as any,
    agentOutputIds: row.agent_output_ids as AgentId[],
    tokensUsed: row.tokens_used,
    checksum: row.checksum || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 50X COORDINATION FIX: CriticalDecisions Persistence
// ═══════════════════════════════════════════════════════════════════════════════

import type { CriticalDecisions } from '../coordination';

/**
 * Save CriticalDecisions to database
 * Called after ARCHON completes and after each agent that updates decisions
 *
 * CRITICAL: This fixes the "restart loses decisions" bug
 */
export async function saveCriticalDecisions(
  buildId: string,
  decisions: CriticalDecisions
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    // Store in builds table as JSON column
    const { error } = await (supabase.from('builds') as any).update({
      critical_decisions: JSON.stringify(decisions),
      critical_decisions_updated_at: new Date().toISOString(),
    }).eq('id', buildId);

    if (error) {
      console.warn(`[PERSISTENCE] Failed to save critical decisions (non-fatal): ${error.message}`);
      // Also try to save to a separate table as backup
      await saveCriticalDecisionsBackup(buildId, decisions);
    } else {
      console.log(`[PERSISTENCE] ✓ CriticalDecisions saved for build ${buildId}`);
    }
  } catch (err) {
    console.warn(`[PERSISTENCE] Database connection failed for critical decisions:`, err);
    // Try file-based backup as last resort
    await saveCriticalDecisionsToFile(buildId, decisions);
  }
}

/**
 * Load CriticalDecisions from database
 * Called on build resume after restart
 */
export async function loadCriticalDecisions(
  buildId: string
): Promise<CriticalDecisions | null> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('builds')
      .select('critical_decisions')
      .eq('id', buildId)
      .single();

    if (error || !data) {
      console.warn(`[PERSISTENCE] No critical decisions found for build ${buildId}, trying backup`);
      return await loadCriticalDecisionsBackup(buildId);
    }

    const row = data as { critical_decisions: string | null };
    if (!row.critical_decisions) {
      return await loadCriticalDecisionsBackup(buildId);
    }

    // 50X RELIABILITY: Safe JSON parse for critical decisions
    const decisions = safeJsonParse<CriticalDecisions | null>(
      row.critical_decisions, null, 'persistence:criticalDecisions'
    );
    if (!decisions) {
      return await loadCriticalDecisionsBackup(buildId);
    }
    // Restore Date object
    decisions.extractedAt = new Date(decisions.extractedAt);

    console.log(`[PERSISTENCE] ✓ CriticalDecisions loaded for build ${buildId}`);
    return decisions;
  } catch (err) {
    console.warn(`[PERSISTENCE] Failed to load critical decisions:`, err);
    return await loadCriticalDecisionsFromFile(buildId);
  }
}

/**
 * Backup: Save to build_critical_decisions table
 */
async function saveCriticalDecisionsBackup(
  buildId: string,
  decisions: CriticalDecisions
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    await supabase.from('build_critical_decisions').upsert({
      build_id: buildId,
      decisions: JSON.stringify(decisions),
      tier: decisions.tier,
      sources: decisions.sources,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: 'build_id' });
  } catch (err) {
    console.warn(`[PERSISTENCE] Backup table save failed:`, err);
  }
}

/**
 * Backup: Load from build_critical_decisions table
 */
async function loadCriticalDecisionsBackup(
  buildId: string
): Promise<CriticalDecisions | null> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('build_critical_decisions')
      .select('decisions')
      .eq('build_id', buildId)
      .single();

    if (error || !data) return null;

    const row = data as { decisions: string };
    // 50X RELIABILITY: Safe JSON parse for backup decisions
    const decisions = safeJsonParse<CriticalDecisions | null>(
      row.decisions, null, 'persistence:backupDecisions'
    );
    if (!decisions) return null;
    decisions.extractedAt = new Date(decisions.extractedAt);
    return decisions;
  } catch {
    return null;
  }
}

/**
 * Last resort: Save to file system
 */
async function saveCriticalDecisionsToFile(
  buildId: string,
  decisions: CriticalDecisions
): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const dir = path.join(process.cwd(), '.olympus', 'decisions');
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `${buildId}.json`);
    await fs.writeFile(filePath, JSON.stringify(decisions, null, 2));

    console.log(`[PERSISTENCE] ✓ CriticalDecisions saved to file: ${filePath}`);
  } catch (err) {
    console.error(`[PERSISTENCE] ✗ File save failed:`, err);
  }
}

/**
 * Last resort: Load from file system
 */
async function loadCriticalDecisionsFromFile(
  buildId: string
): Promise<CriticalDecisions | null> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(process.cwd(), '.olympus', 'decisions', `${buildId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');

    // 50X RELIABILITY: Safe JSON parse for file-based decisions
    const decisions = safeJsonParse<CriticalDecisions | null>(
      content, null, 'persistence:fileDecisions'
    );
    if (!decisions) return null;
    decisions.extractedAt = new Date(decisions.extractedAt);

    console.log(`[PERSISTENCE] ✓ CriticalDecisions loaded from file: ${filePath}`);
    return decisions;
  } catch {
    return null;
  }
}

/**
 * FIX #3: Heartbeat build to prevent stall detection
 * Call this periodically during build execution to signal activity
 */
export async function heartbeatBuild(buildId: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();

    // Call the database heartbeat function
    // Note: Type cast needed until migration is applied and types regenerated
    const { error } = await (supabase.rpc as any)('heartbeat_build', {
      p_build_id: buildId,
    });

    if (error) {
      // Graceful degradation - heartbeat failure shouldn't stop builds
      console.warn(`[PERSISTENCE] Heartbeat failed (non-fatal): ${error.message}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[PERSISTENCE] Heartbeat error (non-fatal):`, err);
    return false;
  }
}
