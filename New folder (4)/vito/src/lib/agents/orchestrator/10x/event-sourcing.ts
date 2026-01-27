/**
 * ============================================================================
 * EVENT SOURCING CORE - TIME TRAVEL DEBUGGING
 * ============================================================================
 *
 * "The best debugging is being able to go back in time."
 *
 * This module implements full event sourcing for builds:
 * - Every state change is an immutable event
 * - Rebuild state at any point in time
 * - Replay builds from any checkpoint
 * - Full audit trail for compliance
 * - Event-driven architecture for scalability
 *
 * Inspired by: Kafka, EventStore, Datomic
 * ============================================================================
 */

import { EventEmitter } from 'events';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// EVENT TYPES - The DNA of every build
// ============================================================================

export type BuildEventType =
  // Lifecycle Events
  | 'BUILD_CREATED'
  | 'BUILD_STARTED'
  | 'BUILD_PAUSED'
  | 'BUILD_RESUMED'
  | 'BUILD_COMPLETED'
  | 'BUILD_FAILED'
  | 'BUILD_CANCELLED'
  // Phase Events
  | 'PHASE_STARTED'
  | 'PHASE_COMPLETED'
  | 'PHASE_FAILED'
  | 'PHASE_SKIPPED'
  | 'PHASE_ROLLED_BACK'
  // Agent Events
  | 'AGENT_QUEUED'
  | 'AGENT_STARTED'
  | 'AGENT_COMPLETED'
  | 'AGENT_FAILED'
  | 'AGENT_RETRIED'
  | 'AGENT_SKIPPED'
  | 'AGENT_TIMEOUT'
  | 'AGENT_CIRCUIT_OPENED'
  | 'AGENT_CIRCUIT_CLOSED'
  // Quality Events
  | 'QUALITY_GATE_PASSED'
  | 'QUALITY_GATE_FAILED'
  | 'CHECKPOINT_CREATED'
  | 'CHECKPOINT_RESTORED'
  // Resource Events
  | 'TOKENS_CONSUMED'
  | 'COST_RECORDED'
  | 'RESOURCE_ALLOCATED'
  | 'RESOURCE_RELEASED'
  // Intelligence Events
  | 'ANOMALY_DETECTED'
  | 'PREDICTION_MADE'
  | 'OPTIMIZATION_SUGGESTED'
  | 'PATTERN_RECOGNIZED';

export interface BuildEvent<T = unknown> {
  id: string;
  buildId: string;
  streamId: string; // For event stream partitioning
  type: BuildEventType;
  version: number; // Event version for this build
  timestamp: Date;
  correlationId: string; // Track related events
  causationId: string | null; // What event caused this one
  actorId: string; // Who/what triggered this event
  actorType: 'system' | 'user' | 'agent' | 'scheduler';
  payload: T;
  metadata: {
    schemaVersion: number;
    environment: string;
    serverInstance: string;
    processingTime?: number;
  };
}

// ============================================================================
// EVENT PAYLOADS - Strongly typed event data
// ============================================================================

export interface BuildCreatedPayload {
  projectType: string;
  userId: string;
  tenantId: string;
  config: Record<string, unknown>;
  estimatedDuration?: number;
  priority: number;
}

export interface AgentCompletedPayload {
  agentId: string;
  phaseId: string;
  duration: number;
  tokensUsed: number;
  qualityScore: number;
  output: Record<string, unknown>;
  artifacts: string[];
}

export interface AgentFailedPayload {
  agentId: string;
  phaseId: string;
  error: string;
  errorCode: string;
  stackTrace?: string;
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface CheckpointCreatedPayload {
  checkpointId: string;
  phaseId: string;
  state: Record<string, unknown>;
  artifacts: string[];
  canRollback: boolean;
}

export interface AnomalyDetectedPayload {
  type: 'slow_agent' | 'high_failure_rate' | 'resource_spike' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedAgents: string[];
  suggestedAction: string;
}

// ============================================================================
// EVENT STORE - Immutable append-only log
// ============================================================================

export class EventStore {
  private supabase: SupabaseClient;
  private emitter: EventEmitter;
  private serverInstance: string;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(url, key);
    this.emitter = new EventEmitter();
    this.serverInstance = `server-${process.pid}-${Date.now()}`;
  }

  /**
   * Append an event to the store (NEVER mutate, only append)
   */
  async append<T>(
    buildId: string,
    type: BuildEventType,
    payload: T,
    options: {
      correlationId?: string;
      causationId?: string;
      actorId?: string;
      actorType?: 'system' | 'user' | 'agent' | 'scheduler';
    } = {}
  ): Promise<BuildEvent<T>> {
    const startTime = Date.now();

    // Get next version for this build
    const version = await this.getNextVersion(buildId);

    const event: BuildEvent<T> = {
      id: uuidv4(),
      buildId,
      streamId: `build-${buildId}`,
      type,
      version,
      timestamp: new Date(),
      correlationId: options.correlationId || uuidv4(),
      causationId: options.causationId || null,
      actorId: options.actorId || 'system',
      actorType: options.actorType || 'system',
      payload,
      metadata: {
        schemaVersion: 1,
        environment: process.env.NODE_ENV || 'development',
        serverInstance: this.serverInstance,
      },
    };

    // Persist to database
    const { error } = await this.supabase.from('build_events').insert({
      id: event.id,
      build_id: event.buildId,
      stream_id: event.streamId,
      event_type: event.type,
      version: event.version,
      timestamp: event.timestamp.toISOString(),
      correlation_id: event.correlationId,
      causation_id: event.causationId,
      actor_id: event.actorId,
      actor_type: event.actorType,
      payload: event.payload,
      metadata: {
        ...event.metadata,
        processingTime: Date.now() - startTime,
      },
    });

    if (error) {
      throw new Error(`Failed to append event: ${error.message}`);
    }

    // Emit for real-time subscribers
    this.emitter.emit('event', event);
    this.emitter.emit(event.type, event);

    return event;
  }

  /**
   * Get all events for a build (full history)
   */
  async getEvents(
    buildId: string,
    options: {
      fromVersion?: number;
      toVersion?: number;
      types?: BuildEventType[];
      limit?: number;
    } = {}
  ): Promise<BuildEvent[]> {
    let query = this.supabase
      .from('build_events')
      .select('*')
      .eq('build_id', buildId)
      .order('version', { ascending: true });

    if (options.fromVersion !== undefined) {
      query = query.gte('version', options.fromVersion);
    }
    if (options.toVersion !== undefined) {
      query = query.lte('version', options.toVersion);
    }
    if (options.types && options.types.length > 0) {
      query = query.in('event_type', options.types);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get events: ${error.message}`);
    }

    return data.map(this.mapEventFromDb);
  }

  /**
   * Get events by correlation ID (trace related events)
   */
  async getCorrelatedEvents(correlationId: string): Promise<BuildEvent[]> {
    const { data, error } = await this.supabase
      .from('build_events')
      .select('*')
      .eq('correlation_id', correlationId)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to get correlated events: ${error.message}`);
    }

    return data.map(this.mapEventFromDb);
  }

  /**
   * Subscribe to events in real-time
   */
  subscribe(
    callback: (event: BuildEvent) => void,
    filter?: { buildId?: string; types?: BuildEventType[] }
  ): () => void {
    const handler = (event: BuildEvent) => {
      if (filter?.buildId && event.buildId !== filter.buildId) return;
      if (filter?.types && !filter.types.includes(event.type)) return;
      callback(event);
    };

    this.emitter.on('event', handler);

    // Return unsubscribe function
    return () => this.emitter.off('event', handler);
  }

  private async getNextVersion(buildId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('build_events')
      .select('version')
      .eq('build_id', buildId)
      .order('version', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to get version: ${error.message}`);
    }

    return data.length > 0 ? data[0].version + 1 : 1;
  }

  private mapEventFromDb(row: Record<string, unknown>): BuildEvent {
    return {
      id: row.id as string,
      buildId: row.build_id as string,
      streamId: row.stream_id as string,
      type: row.event_type as BuildEventType,
      version: row.version as number,
      timestamp: new Date(row.timestamp as string),
      correlationId: row.correlation_id as string,
      causationId: row.causation_id as string | null,
      actorId: row.actor_id as string,
      actorType: row.actor_type as 'system' | 'user' | 'agent' | 'scheduler',
      payload: row.payload as unknown,
      metadata: row.metadata as BuildEvent['metadata'],
    };
  }
}

// ============================================================================
// STATE PROJECTOR - Rebuild state from events
// ============================================================================

export interface ProjectedBuildState {
  buildId: string;
  status: 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentPhase: string | null;
  currentAgent: string | null;
  phases: Map<string, PhaseState>;
  agents: Map<string, AgentState>;
  checkpoints: CheckpointState[];
  metrics: BuildMetrics;
  timeline: TimelineEntry[];
  version: number;
  lastEventAt: Date;
}

export interface PhaseState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: Date | null;
  completedAt: Date | null;
  duration: number;
  agentCount: number;
  completedAgents: number;
  failedAgents: number;
}

export interface AgentState {
  id: string;
  phaseId: string;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: Date | null;
  completedAt: Date | null;
  duration: number;
  retryCount: number;
  tokensUsed: number;
  qualityScore: number | null;
  output: Record<string, unknown> | null;
  error: string | null;
}

export interface CheckpointState {
  id: string;
  phaseId: string;
  createdAt: Date;
  state: Record<string, unknown>;
  canRollback: boolean;
}

export interface BuildMetrics {
  totalDuration: number;
  totalTokens: number;
  totalCost: number;
  agentSuccessRate: number;
  averageQualityScore: number;
  phasesDuration: Map<string, number>;
}

export interface TimelineEntry {
  timestamp: Date;
  type: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export class StateProjector {
  /**
   * Project current state from events (THE MAGIC - time travel enabled!)
   */
  project(events: BuildEvent[]): ProjectedBuildState {
    const state: ProjectedBuildState = {
      buildId: events[0]?.buildId || '',
      status: 'created',
      currentPhase: null,
      currentAgent: null,
      phases: new Map(),
      agents: new Map(),
      checkpoints: [],
      metrics: {
        totalDuration: 0,
        totalTokens: 0,
        totalCost: 0,
        agentSuccessRate: 0,
        averageQualityScore: 0,
        phasesDuration: new Map(),
      },
      timeline: [],
      version: 0,
      lastEventAt: new Date(),
    };

    // Apply each event in order
    for (const event of events) {
      this.applyEvent(state, event);
    }

    // Calculate final metrics
    this.calculateMetrics(state);

    return state;
  }

  /**
   * Project state at a specific point in time
   */
  projectAt(events: BuildEvent[], targetVersion: number): ProjectedBuildState {
    const filteredEvents = events.filter((e) => e.version <= targetVersion);
    return this.project(filteredEvents);
  }

  /**
   * Project state at a specific timestamp
   */
  projectAtTime(events: BuildEvent[], targetTime: Date): ProjectedBuildState {
    const filteredEvents = events.filter((e) => e.timestamp <= targetTime);
    return this.project(filteredEvents);
  }

  private applyEvent(state: ProjectedBuildState, event: BuildEvent): void {
    state.version = event.version;
    state.lastEventAt = event.timestamp;

    // Add to timeline
    state.timeline.push({
      timestamp: event.timestamp,
      type: event.type,
      description: this.getEventDescription(event),
      severity: this.getEventSeverity(event.type),
    });

    switch (event.type) {
      case 'BUILD_CREATED':
        state.status = 'created';
        break;

      case 'BUILD_STARTED':
        state.status = 'running';
        break;

      case 'BUILD_PAUSED':
        state.status = 'paused';
        break;

      case 'BUILD_RESUMED':
        state.status = 'running';
        break;

      case 'BUILD_COMPLETED':
        state.status = 'completed';
        break;

      case 'BUILD_FAILED':
        state.status = 'failed';
        break;

      case 'BUILD_CANCELLED':
        state.status = 'cancelled';
        break;

      case 'PHASE_STARTED': {
        const payload = event.payload as { phaseId: string; name: string };
        state.currentPhase = payload.phaseId;
        state.phases.set(payload.phaseId, {
          id: payload.phaseId,
          status: 'running',
          startedAt: event.timestamp,
          completedAt: null,
          duration: 0,
          agentCount: 0,
          completedAgents: 0,
          failedAgents: 0,
        });
        break;
      }

      case 'PHASE_COMPLETED': {
        const payload = event.payload as { phaseId: string };
        const phase = state.phases.get(payload.phaseId);
        if (phase) {
          phase.status = 'completed';
          phase.completedAt = event.timestamp;
          phase.duration = phase.startedAt
            ? event.timestamp.getTime() - phase.startedAt.getTime()
            : 0;
        }
        break;
      }

      case 'AGENT_STARTED': {
        const payload = event.payload as { agentId: string; phaseId: string };
        state.currentAgent = payload.agentId;
        state.agents.set(payload.agentId, {
          id: payload.agentId,
          phaseId: payload.phaseId,
          status: 'running',
          startedAt: event.timestamp,
          completedAt: null,
          duration: 0,
          retryCount: 0,
          tokensUsed: 0,
          qualityScore: null,
          output: null,
          error: null,
        });
        const phase = state.phases.get(payload.phaseId);
        if (phase) phase.agentCount++;
        break;
      }

      case 'AGENT_COMPLETED': {
        const payload = event.payload as AgentCompletedPayload;
        const agent = state.agents.get(payload.agentId);
        if (agent) {
          agent.status = 'completed';
          agent.completedAt = event.timestamp;
          agent.duration = payload.duration;
          agent.tokensUsed = payload.tokensUsed;
          agent.qualityScore = payload.qualityScore;
          agent.output = payload.output;
        }
        const phase = state.phases.get(payload.phaseId);
        if (phase) phase.completedAgents++;
        state.metrics.totalTokens += payload.tokensUsed;
        break;
      }

      case 'AGENT_FAILED': {
        const payload = event.payload as AgentFailedPayload;
        const agent = state.agents.get(payload.agentId);
        if (agent) {
          agent.status = 'failed';
          agent.completedAt = event.timestamp;
          agent.error = payload.error;
          agent.retryCount = payload.retryCount;
        }
        const phase = state.phases.get(payload.phaseId);
        if (phase) phase.failedAgents++;
        break;
      }

      case 'CHECKPOINT_CREATED': {
        const payload = event.payload as CheckpointCreatedPayload;
        state.checkpoints.push({
          id: payload.checkpointId,
          phaseId: payload.phaseId,
          createdAt: event.timestamp,
          state: payload.state,
          canRollback: payload.canRollback,
        });
        break;
      }

      case 'TOKENS_CONSUMED': {
        const payload = event.payload as { tokens: number; cost: number };
        state.metrics.totalTokens += payload.tokens;
        state.metrics.totalCost += payload.cost;
        break;
      }
    }
  }

  private calculateMetrics(state: ProjectedBuildState): void {
    const agents = Array.from(state.agents.values());
    const completedAgents = agents.filter((a) => a.status === 'completed');
    const failedAgents = agents.filter((a) => a.status === 'failed');

    state.metrics.agentSuccessRate =
      agents.length > 0 ? completedAgents.length / agents.length : 0;

    const qualityScores = completedAgents
      .map((a) => a.qualityScore)
      .filter((s): s is number => s !== null);

    state.metrics.averageQualityScore =
      qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0;

    // Calculate total duration
    if (state.timeline.length > 1) {
      const first = state.timeline[0].timestamp;
      const last = state.timeline[state.timeline.length - 1].timestamp;
      state.metrics.totalDuration = last.getTime() - first.getTime();
    }

    // Phase durations
    for (const [phaseId, phase] of state.phases) {
      state.metrics.phasesDuration.set(phaseId, phase.duration);
    }
  }

  private getEventDescription(event: BuildEvent): string {
    const payload = event.payload as Record<string, unknown>;
    switch (event.type) {
      case 'BUILD_CREATED':
        return `Build created for ${payload.projectType}`;
      case 'BUILD_STARTED':
        return 'Build execution started';
      case 'PHASE_STARTED':
        return `Phase "${payload.phaseId}" started`;
      case 'PHASE_COMPLETED':
        return `Phase "${payload.phaseId}" completed`;
      case 'AGENT_STARTED':
        return `Agent "${payload.agentId}" started`;
      case 'AGENT_COMPLETED':
        return `Agent "${payload.agentId}" completed (${(payload as AgentCompletedPayload).qualityScore}/10)`;
      case 'AGENT_FAILED':
        return `Agent "${payload.agentId}" failed: ${(payload as AgentFailedPayload).error}`;
      case 'CHECKPOINT_CREATED':
        return `Checkpoint created at ${payload.phaseId}`;
      default:
        return event.type.replace(/_/g, ' ').toLowerCase();
    }
  }

  private getEventSeverity(
    type: BuildEventType
  ): 'info' | 'warning' | 'error' | 'success' {
    if (type.includes('FAILED') || type.includes('TIMEOUT')) return 'error';
    if (type.includes('COMPLETED') || type.includes('PASSED')) return 'success';
    if (type.includes('ANOMALY') || type.includes('CIRCUIT')) return 'warning';
    return 'info';
  }
}

// ============================================================================
// TIME MACHINE - Debug any build at any point
// ============================================================================

export class TimeMachine {
  private eventStore: EventStore;
  private projector: StateProjector;

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
    this.projector = new StateProjector();
  }

  /**
   * Travel to a specific version of the build
   */
  async travelToVersion(buildId: string, version: number): Promise<ProjectedBuildState> {
    const events = await this.eventStore.getEvents(buildId, { toVersion: version });
    return this.projector.projectAt(events, version);
  }

  /**
   * Travel to a specific point in time
   */
  async travelToTime(buildId: string, timestamp: Date): Promise<ProjectedBuildState> {
    const events = await this.eventStore.getEvents(buildId);
    return this.projector.projectAtTime(events, timestamp);
  }

  /**
   * Get state before a specific event
   */
  async getStateBefore(buildId: string, eventId: string): Promise<ProjectedBuildState> {
    const events = await this.eventStore.getEvents(buildId);
    const targetIndex = events.findIndex((e) => e.id === eventId);

    if (targetIndex <= 0) {
      throw new Error('Cannot get state before first event');
    }

    return this.projector.project(events.slice(0, targetIndex));
  }

  /**
   * Compare two versions side by side
   */
  async diff(
    buildId: string,
    versionA: number,
    versionB: number
  ): Promise<{
    stateA: ProjectedBuildState;
    stateB: ProjectedBuildState;
    eventsBetween: BuildEvent[];
    changes: StateChange[];
  }> {
    const events = await this.eventStore.getEvents(buildId);

    const stateA = this.projector.projectAt(events, versionA);
    const stateB = this.projector.projectAt(events, versionB);

    const eventsBetween = events.filter(
      (e) => e.version > versionA && e.version <= versionB
    );

    const changes = this.computeChanges(stateA, stateB);

    return { stateA, stateB, eventsBetween, changes };
  }

  /**
   * Find when a specific condition became true
   */
  async findWhen(
    buildId: string,
    condition: (state: ProjectedBuildState) => boolean
  ): Promise<{ version: number; event: BuildEvent; state: ProjectedBuildState } | null> {
    const events = await this.eventStore.getEvents(buildId);

    for (let i = 1; i <= events.length; i++) {
      const state = this.projector.projectAt(events, i);
      if (condition(state)) {
        return {
          version: i,
          event: events[i - 1],
          state,
        };
      }
    }

    return null;
  }

  /**
   * Replay build from a checkpoint
   */
  async replayFrom(
    buildId: string,
    checkpointVersion: number
  ): Promise<{
    startState: ProjectedBuildState;
    replayEvents: BuildEvent[];
  }> {
    const events = await this.eventStore.getEvents(buildId);
    const startState = this.projector.projectAt(events, checkpointVersion);
    const replayEvents = events.filter((e) => e.version > checkpointVersion);

    return { startState, replayEvents };
  }

  private computeChanges(
    stateA: ProjectedBuildState,
    stateB: ProjectedBuildState
  ): StateChange[] {
    const changes: StateChange[] = [];

    // Status change
    if (stateA.status !== stateB.status) {
      changes.push({
        field: 'status',
        from: stateA.status,
        to: stateB.status,
        type: 'modified',
      });
    }

    // Phase changes
    for (const [phaseId, phaseB] of stateB.phases) {
      const phaseA = stateA.phases.get(phaseId);
      if (!phaseA) {
        changes.push({ field: `phase.${phaseId}`, from: null, to: phaseB, type: 'added' });
      } else if (phaseA.status !== phaseB.status) {
        changes.push({
          field: `phase.${phaseId}.status`,
          from: phaseA.status,
          to: phaseB.status,
          type: 'modified',
        });
      }
    }

    // Agent changes
    for (const [agentId, agentB] of stateB.agents) {
      const agentA = stateA.agents.get(agentId);
      if (!agentA) {
        changes.push({ field: `agent.${agentId}`, from: null, to: agentB, type: 'added' });
      } else if (agentA.status !== agentB.status) {
        changes.push({
          field: `agent.${agentId}.status`,
          from: agentA.status,
          to: agentB.status,
          type: 'modified',
        });
      }
    }

    // Metrics changes
    if (stateA.metrics.totalTokens !== stateB.metrics.totalTokens) {
      changes.push({
        field: 'metrics.totalTokens',
        from: stateA.metrics.totalTokens,
        to: stateB.metrics.totalTokens,
        type: 'modified',
      });
    }

    return changes;
  }
}

export interface StateChange {
  field: string;
  from: unknown;
  to: unknown;
  type: 'added' | 'modified' | 'removed';
}

// ============================================================================
// FACTORY
// ============================================================================

export function createEventStore(): EventStore {
  return new EventStore();
}

export function createStateProjector(): StateProjector {
  return new StateProjector();
}

export function createTimeMachine(eventStore?: EventStore): TimeMachine {
  return new TimeMachine(eventStore || createEventStore());
}
