/**
 * Persistent Build State Machine
 *
 * Fixes in-memory state loss by:
 * 1. Persisting state to database on every transition
 * 2. Recovering state on startup
 * 3. Using optimistic locking to prevent race conditions
 * 4. Bounded history with automatic cleanup
 */

import { EventEmitter } from 'events';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { BuildPlan } from './build-plan-store';
import type { PhaseId } from './phase-rules';
import { validateTransition, canSkipPhase } from './phase-rules';

// ============================================================================
// TYPES
// ============================================================================

export type BuildState =
  | 'created'
  | 'planning'
  | 'running'
  | 'paused'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface PersistedState {
  id: string;
  buildId: string;
  planId: string;
  currentState: BuildState;
  currentPhase: PhaseId | null;
  currentAgent: string | null;
  version: number;
  lastTransition: string;
  lastTransitionAt: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface StateTransitionRecord {
  id: string;
  stateId: string;
  buildId: string;
  fromState: BuildState | null;
  toState: BuildState;
  trigger: string;
  phase: PhaseId | null;
  agent: string | null;
  data: Record<string, unknown>;
  error: string | null;
  createdAt: Date;
}

export interface StateTransitionResult {
  success: boolean;
  fromState: BuildState;
  toState: BuildState;
  error?: string;
  version: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_HISTORY_SIZE = 100;
const HISTORY_CLEANUP_THRESHOLD = 150;

const VALID_TRANSITIONS: Record<BuildState, { trigger: string; to: BuildState; guard?: string }[]> =
  {
    created: [
      { trigger: 'start', to: 'planning' },
      { trigger: 'cancel', to: 'cancelled' },
    ],
    planning: [
      { trigger: 'plan_complete', to: 'running', guard: 'has_agents' },
      { trigger: 'cancel', to: 'cancelled' },
    ],
    running: [
      { trigger: 'agent_complete', to: 'running' },
      { trigger: 'agent_retry', to: 'running', guard: 'can_retry' },
      { trigger: 'pause', to: 'paused' },
      { trigger: 'requires_approval', to: 'waiting_approval' },
      { trigger: 'all_agents_complete', to: 'completed', guard: 'all_complete' },
      { trigger: 'critical_failure', to: 'failed' },
      { trigger: 'cancel', to: 'cancelled' },
    ],
    paused: [
      { trigger: 'resume', to: 'running' },
      { trigger: 'cancel', to: 'cancelled' },
    ],
    waiting_approval: [
      { trigger: 'approved', to: 'running' },
      { trigger: 'rejected', to: 'cancelled' },
    ],
    completed: [],
    failed: [],
    cancelled: [],
  };

// ============================================================================
// PERSISTENT STATE MACHINE
// ============================================================================

export class PersistentStateMachine extends EventEmitter {
  private supabase: SupabaseClient;
  private buildId: string;
  private planId: string;
  private stateId: string | null = null;
  private currentState: BuildState = 'created';
  private currentPhase: PhaseId | null = null;
  private currentAgent: string | null = null;
  private version: number = 0;
  private inMemoryHistory: StateTransitionRecord[] = [];

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    super();

    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(url, key);
    this.buildId = '';
    this.planId = '';
  }

  // ==========================================================================
  // INITIALIZATION & RECOVERY
  // ==========================================================================

  /**
   * Initialize a new state machine for a build
   */
  async initialize(buildId: string, plan: BuildPlan): Promise<void> {
    this.buildId = buildId;
    this.planId = plan.id;
    this.currentState = 'created';
    this.currentPhase = null;
    this.currentAgent = null;
    this.version = 1;

    // Persist initial state
    const { data, error } = await this.supabase
      .from('build_state_machines')
      .insert({
        build_id: buildId,
        plan_id: plan.id,
        current_state: 'created',
        current_phase: null,
        current_agent: null,
        version: 1,
        last_transition: 'initialize',
        last_transition_at: new Date().toISOString(),
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to initialize state machine: ${error.message}`);
    }

    this.stateId = data.id;
    this.emit('initialized', { buildId, state: this.currentState });
  }

  /**
   * Recover state machine from database
   * Call this on server startup to resume orphaned builds
   */
  async recover(buildId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('build_state_machines')
      .select('*')
      .eq('build_id', buildId)
      .single();

    if (error || !data) {
      return false;
    }

    this.buildId = buildId;
    this.planId = data.plan_id;
    this.stateId = data.id;
    this.currentState = data.current_state as BuildState;
    this.currentPhase = data.current_phase as PhaseId | null;
    this.currentAgent = data.current_agent;
    this.version = data.version;

    this.emit('recovered', {
      buildId,
      state: this.currentState,
      phase: this.currentPhase,
      agent: this.currentAgent,
      version: this.version,
    });

    return true;
  }

  /**
   * Find all orphaned builds (running but no active connection)
   */
  static async findOrphanedBuilds(
    supabase: SupabaseClient,
    staleThresholdMinutes: number = 5
  ): Promise<string[]> {
    const staleTime = new Date(Date.now() - staleThresholdMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from('build_state_machines')
      .select('build_id')
      .in('current_state', ['running', 'paused', 'waiting_approval'])
      .lt('updated_at', staleTime.toISOString());

    if (error || !data) {
      return [];
    }

    return data.map(d => d.build_id);
  }

  // ==========================================================================
  // STATE TRANSITIONS
  // ==========================================================================

  /**
   * Trigger a state transition with optimistic locking
   */
  async trigger(event: string, data?: Record<string, unknown>): Promise<StateTransitionResult> {
    const validTransition = VALID_TRANSITIONS[this.currentState]?.find(t => t.trigger === event);

    if (!validTransition) {
      const result: StateTransitionResult = {
        success: false,
        fromState: this.currentState,
        toState: this.currentState,
        error: `Invalid transition: ${event} from ${this.currentState}`,
        version: this.version,
      };

      this.emit('invalid_transition', result);
      return result;
    }

    const fromState = this.currentState;
    const toState = validTransition.to;

    // Optimistic lock update
    const { data: updated, error } = await this.supabase
      .from('build_state_machines')
      .update({
        current_state: toState,
        current_phase: this.currentPhase,
        current_agent: this.currentAgent,
        version: this.version + 1,
        last_transition: event,
        last_transition_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.stateId)
      .eq('version', this.version) // Optimistic lock
      .select()
      .single();

    if (error || !updated) {
      const result: StateTransitionResult = {
        success: false,
        fromState,
        toState: fromState,
        error: 'Concurrent modification detected - please retry',
        version: this.version,
      };

      this.emit('optimistic_lock_failed', result);
      return result;
    }

    // Update local state
    this.currentState = toState;
    this.version = updated.version;

    // Record transition
    await this.recordTransition(fromState, toState, event, data);

    const result: StateTransitionResult = {
      success: true,
      fromState,
      toState,
      version: this.version,
    };

    this.emit('transition', result);
    return result;
  }

  /**
   * Transition to a new phase with validation
   */
  async transitionPhase(
    toPhase: PhaseId,
    context: {
      completedAgents: string[];
      agentOutputs: Map<string, Record<string, unknown>>;
      qualityScores: Map<string, number>;
      projectType: string;
    }
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const transitionContext = {
      buildId: this.buildId,
      projectType: context.projectType,
      fromPhase: this.currentPhase,
      toPhase,
      completedAgents: context.completedAgents,
      agentOutputs: context.agentOutputs,
      qualityScores: context.qualityScores,
      errors: new Map<string, string>(),
    };

    const result = await validateTransition(transitionContext);

    if (result.valid) {
      const previousPhase = this.currentPhase;
      this.currentPhase = toPhase;

      // Persist phase change
      await this.supabase
        .from('build_state_machines')
        .update({
          current_phase: toPhase,
          version: this.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.stateId)
        .eq('version', this.version);

      this.version++;

      await this.recordTransition(this.currentState, this.currentState, 'phase_transition', {
        fromPhase: previousPhase,
        toPhase,
      });

      this.emit('phase_transition', { from: previousPhase, to: toPhase });
    }

    return result;
  }

  /**
   * Update current agent
   */
  async setCurrentAgent(agentId: string | null): Promise<void> {
    this.currentAgent = agentId;

    await this.supabase
      .from('build_state_machines')
      .update({
        current_agent: agentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.stateId);
  }

  // ==========================================================================
  // HISTORY MANAGEMENT
  // ==========================================================================

  private async recordTransition(
    fromState: BuildState,
    toState: BuildState,
    trigger: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const record: Partial<StateTransitionRecord> = {
      stateId: this.stateId!,
      buildId: this.buildId,
      fromState,
      toState,
      trigger,
      phase: this.currentPhase,
      agent: this.currentAgent,
      data: data || {},
      error: null,
    };

    // Insert to database
    await this.supabase.from('build_state_transitions').insert({
      state_id: record.stateId,
      build_id: record.buildId,
      from_state: record.fromState,
      to_state: record.toState,
      trigger_event: trigger,
      phase: record.phase,
      agent: record.agent,
      data: record.data,
      error: record.error,
    });

    // Keep bounded in-memory history
    this.inMemoryHistory.push(record as StateTransitionRecord);

    if (this.inMemoryHistory.length > HISTORY_CLEANUP_THRESHOLD) {
      this.inMemoryHistory = this.inMemoryHistory.slice(-MAX_HISTORY_SIZE);
    }
  }

  /**
   * Get recent transitions from database
   */
  async getHistory(limit: number = 50): Promise<StateTransitionRecord[]> {
    const { data, error } = await this.supabase
      .from('build_state_transitions')
      .select('*')
      .eq('build_id', this.buildId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(d => ({
      id: d.id,
      stateId: d.state_id,
      buildId: d.build_id,
      fromState: d.from_state,
      toState: d.to_state,
      trigger: d.trigger_event,
      phase: d.phase,
      agent: d.agent,
      data: d.data,
      error: d.error,
      createdAt: new Date(d.created_at),
    }));
  }

  // ==========================================================================
  // STATE ACCESSORS
  // ==========================================================================

  getState(): BuildState {
    return this.currentState;
  }

  getPhase(): PhaseId | null {
    return this.currentPhase;
  }

  getAgent(): string | null {
    return this.currentAgent;
  }

  getVersion(): number {
    return this.version;
  }

  isTerminal(): boolean {
    return ['completed', 'failed', 'cancelled'].includes(this.currentState);
  }

  getAvailableTransitions(): string[] {
    return (VALID_TRANSITIONS[this.currentState] || []).map(t => t.trigger);
  }

  canTransition(trigger: string): boolean {
    return VALID_TRANSITIONS[this.currentState]?.some(t => t.trigger === trigger) ?? false;
  }

  // ==========================================================================
  // HEARTBEAT (Prevents orphan detection during long operations)
  // ==========================================================================

  async heartbeat(): Promise<void> {
    await this.supabase
      .from('build_state_machines')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', this.stateId);
  }

  /**
   * Start automatic heartbeat
   */
  startHeartbeat(intervalMs: number = 30000): NodeJS.Timeout {
    return setInterval(() => this.heartbeat(), intervalMs);
  }
}

// ============================================================================
// MIGRATION FOR STATE MACHINE TABLE
// ============================================================================

export const STATE_MACHINE_MIGRATION = `
-- Build State Machines Table (Persistent state storage)
CREATE TABLE IF NOT EXISTS build_state_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL UNIQUE,
  plan_id UUID NOT NULL,
  current_state TEXT NOT NULL DEFAULT 'created',
  current_phase TEXT,
  current_agent TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  last_transition TEXT,
  last_transition_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_state_machines_build ON build_state_machines(build_id);
CREATE INDEX idx_state_machines_state ON build_state_machines(current_state);
CREATE INDEX idx_state_machines_updated ON build_state_machines(updated_at);

-- Prevent concurrent updates with version check
CREATE OR REPLACE FUNCTION check_state_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.version != NEW.version - 1 THEN
    RAISE EXCEPTION 'Optimistic lock failed: expected version %, got %', OLD.version + 1, NEW.version;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_state_version
  BEFORE UPDATE ON build_state_machines
  FOR EACH ROW
  WHEN (OLD.version IS DISTINCT FROM NEW.version)
  EXECUTE FUNCTION check_state_version();
`;

// ============================================================================
// FACTORY
// ============================================================================

export function createPersistentStateMachine(): PersistentStateMachine {
  return new PersistentStateMachine();
}
