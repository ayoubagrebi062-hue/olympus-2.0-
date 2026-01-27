/**
 * OLYMPUS 2.0 - Agent Lifecycle Postgres Store
 * Version 8.0.0
 * PostgreSQL implementation of lifecycle persistence
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  IAgentLifecycleStore,
  AgentLifecycleRecord,
  AgentLifecycleState,
  AgentLifecycleTransition
} from './store';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

/**
 * Database row type for agent_lifecycle table
 */
interface AgentLifecycleRow {
  id?: string;
  agent_id: string;
  state: string;
  since: string;
  previous_state: string | null;
  changed_by: string;
  reason: string | null;
}

/**
 * Map database row to lifecycle record
 */
function rowToRecord(row: AgentLifecycleRow): AgentLifecycleRecord {
  return {
    agentId: row.agent_id,
    currentState: row.state as AgentLifecycleState,
    since: new Date(row.since),
    previousState: row.previous_state ? (row.previous_state as AgentLifecycleState) : undefined,
    changedBy: row.changed_by,
    reason: row.reason || undefined
  };
}

/**
 * Map lifecycle record to database row
 */
function recordToRow(record: AgentLifecycleRecord): AgentLifecycleRow {
  return {
    agent_id: record.agentId,
    state: record.currentState,
    since: record.since.toISOString(),
    previous_state: record.previousState || null,
    changed_by: record.changedBy,
    reason: record.reason || null
  };
}

/**
 * Validate transition is legal
 * 
 * @param from - Current state
 * @param to - Target state
 * @returns true if transition is in AgentLifecycleTransition union
 */
function isLegalTransition(from: AgentLifecycleState, to: AgentLifecycleState): boolean {
  const validTransitions: Record<AgentLifecycleState, AgentLifecycleState[]> = {
    [AgentLifecycleState.CREATED]: [AgentLifecycleState.REGISTERED],
    [AgentLifecycleState.REGISTERED]: [AgentLifecycleState.ACTIVE],
    [AgentLifecycleState.ACTIVE]: [AgentLifecycleState.SUSPENDED, AgentLifecycleState.RETIRED],
    [AgentLifecycleState.SUSPENDED]: [AgentLifecycleState.ACTIVE, AgentLifecycleState.RETIRED],
    [AgentLifecycleState.RETIRED]: []
  };

  return validTransitions[from]?.includes(to) || false;
}

/**
 * POSTGRES AGENT LIFECYCLE STORE
 * 
 * Implements IAgentLifecycleStore with PostgreSQL backend.
 * Enforces all persistence rules defined in store.ts.
 * 
 * ZERO RUNTIME LOGIC:
 * - No execution checks
 * - No governance logic
 * - No side effects beyond persistence
 * - Deterministic, pure persistence
 */
export class PostgresAgentLifecycleStore implements IAgentLifecycleStore {
  /**
   * Create new lifecycle record
   * 
   * @throws Error if record with agentId already exists
   */
  async create(record: AgentLifecycleRecord): Promise<void> {
    const row = recordToRow(record);

    const { error, count } = await supabase
      .from('agent_lifecycle')
      .select('*', { count: 'exact', head: false })
      .eq('agent_id', record.agentId);

    if (error) {
      throw new Error(`Failed to check existing record: ${error.message}`);
    }

    if (count && count > 0) {
      throw new Error(
        `Lifecycle record for agent ${record.agentId} already exists. ` +
        `Only ONE record per agentId may exist.`
      );
    }

    const { error: insertError } = await supabase
      .from('agent_lifecycle')
      .insert(row)
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Failed to create lifecycle record: ${insertError.message}`);
    }
  }

  /**
   * Update existing lifecycle record
   * 
   * @throws Error if transition is illegal or record is RETIRED
   */
  async update(record: AgentLifecycleRecord): Promise<void> {
    const row = recordToRow(record);

    const { data: existing, error: fetchError } = await supabase
      .from('agent_lifecycle')
      .select('*')
      .eq('agent_id', record.agentId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch existing record: ${fetchError.message}`);
    }

    if (!existing) {
      throw new Error(
        `No lifecycle record found for agent ${record.agentId}. ` +
        `Cannot update non-existent record.`
      );
    }

    const existingRecord = rowToRecord(existing as AgentLifecycleRow);

    if (existingRecord.currentState === AgentLifecycleState.RETIRED) {
      throw new Error(
        `Cannot update RETIRED agent ${record.agentId}. ` +
        `RETIRED records are immutable. Terminal state is irreversible.`
      );
    }

    if (record.currentState === AgentLifecycleState.RETIRED) {
      throw new Error(
        `Cannot transition agent ${record.agentId} to RETIRED. ` +
        `RETIRED records are immutable. Terminal state is irreversible.`
      );
    }

    const isLegal = isLegalTransition(
      existingRecord.currentState,
      record.currentState
    );

    if (!isLegal) {
      throw new Error(
        `Illegal lifecycle transition for agent ${record.agentId}: ` +
        `${existingRecord.currentState} → ${record.currentState}. ` +
        `Only 5 specific transitions are allowed by contract.`
      );
    }

    const { error: updateError } = await supabase
      .from('agent_lifecycle')
      .update({
        state: record.currentState,
        since: record.since.toISOString(),
        previous_state: record.previousState || null,
        changed_by: record.changedBy,
        reason: record.reason || null
      })
      .eq('agent_id', record.agentId)
      .select('id')
      .single();

    if (updateError) {
      throw new Error(`Failed to update lifecycle record: ${updateError.message}`);
    }
  }

  /**
   * Get lifecycle record for agent
   * 
   * @returns Lifecycle record or null if not found
   */
  async get(agentId: string): Promise<AgentLifecycleRecord | null> {
    const { data, error } = await supabase
      .from('agent_lifecycle')
      .select('*')
      .eq('agent_id', agentId)
      .order('since', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch lifecycle record: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return rowToRecord(data as AgentLifecycleRow);
  }
}
