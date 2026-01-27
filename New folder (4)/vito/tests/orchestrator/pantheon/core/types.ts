/**
 * PANTHEON - Single Source of Truth for Types
 * ============================================
 * Every other file imports from HERE. No exceptions.
 */

// ============================================================================
// THRESHOLDS (No magic numbers - all tunable from here)
// ============================================================================

export const THRESHOLDS = {
  /** Minimum agent utilization before flagging inefficiency */
  MIN_AGENT_UTILIZATION: 0.3,
  /** Minimum concurrency efficiency before flagging */
  MIN_CONCURRENCY_EFFICIENCY: 0.5,
  /** Minimum chaos resilience score */
  MIN_CHAOS_RESILIENCE: 0.5,
  /** Failure ratio threshold for critical impact */
  CRITICAL_FAILURE_RATIO: 0.6,
  /** Failure ratio threshold for major impact */
  MAJOR_FAILURE_RATIO: 0.4,
  /** Minimum running agents ratio before flagging starvation */
  MIN_RUNNING_RATIO: 0.1,
  /** Confidence penalty per critical violation */
  CRITICAL_VIOLATION_PENALTY: 0.3,
  /** Default mutation testing iterations */
  DEFAULT_MUTATION_ITERATIONS: 10,
  /** Passing mutation score threshold */
  PASSING_MUTATION_SCORE: 0.7,
} as const;

// ============================================================================
// PRIMITIVES
// ============================================================================

export type AgentId = string;
export type BuildId = string;
export type Timestamp = number;

// ============================================================================
// ENUMS (as const unions for better inference)
// ============================================================================

export const BUILD_PHASES = ['discovery', 'architecture', 'implementation', 'quality', 'deployment'] as const;
export type BuildPhase = typeof BUILD_PHASES[number];

export const AGENT_STATES = ['pending', 'running', 'completed', 'failed', 'skipped'] as const;
export type AgentState = typeof AGENT_STATES[number];

export const BUILD_STATES = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;
export type BuildState = typeof BUILD_STATES[number];

export const BUILD_TIERS = ['starter', 'professional', 'ultimate', 'enterprise'] as const;
export type BuildTier = typeof BUILD_TIERS[number];

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AgentConfig {
  id: AgentId;
  phase: BuildPhase;
  dependencies: AgentId[];
  optional: boolean;
  estimatedDuration: number; // ms
  estimatedTokens?: number;
  minDuration?: number;
  maxDuration?: number;
  failureRate: number; // 0-1
}

export interface BuildConfig {
  id: BuildId;
  buildId?: BuildId;
  tier: BuildTier;
  agents: AgentConfig[];
  maxConcurrency: number;
  maxRetries: number;
  seed?: number;
  chaos?: ChaosConfig;
}

export interface ChaosConfig {
  enabled: boolean;
  failureRate: number; // 0-1, chance any agent fails
  delayRate: number; // 0-1, chance of random delay
  maxDelay: number; // ms
  agentFailureRate?: number;
  timeoutRate?: number;
  randomDelayMax?: number;
  networkFailureRate?: number;
  memoryPressure?: boolean;
}

// ============================================================================
// STATE
// ============================================================================

export interface AgentSnapshot {
  id: AgentId;
  state: AgentState;
  phase: BuildPhase;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  retries: number;
  error?: string;
}

export interface BuildSnapshot {
  id: BuildId;
  state: BuildState;
  status?: BuildState;
  phase: BuildPhase | null;
  progress: number; // 0-100
  tokensUsed?: number;
  agents: Map<AgentId, AgentSnapshot>;
  runningAgents?: AgentId[];
  completedAgents?: AgentId[];
  failedAgents?: AgentId[];
  skippedAgents?: AgentId[];
  startedAt: Timestamp;
  updatedAt: Timestamp;
  config: BuildConfig;
}

// ============================================================================
// EVENTS
// ============================================================================

export const EVENT_TYPES = [
  'BUILD_STARTED',
  'BUILD_COMPLETED',
  'BUILD_FAILED',
  'BUILD_CANCELLED',
  'PHASE_START',
  'PHASE_STARTED',
  'PHASE_COMPLETED',
  'AGENT_START',
  'AGENT_STARTED',
  'AGENT_COMPLETED',
  'AGENT_FAILED',
  'AGENT_RETRIED',
  'AGENT_RETRY',
  'CHAOS_INJECTED',
] as const;
export type EventType = typeof EVENT_TYPES[number];

/** Typed event data payloads for different event types */
export interface EventData {
  error?: string;
  reason?: string;
  retryCount?: number;
  duration?: number;
  chaosType?: 'failure' | 'delay' | 'timeout';
}

export interface SimEvent {
  /** Sequence number for ordering */
  seq: number;
  /** Event type from EVENT_TYPES */
  type: EventType;
  /** Unix timestamp in milliseconds */
  timestamp: Timestamp;
  /** Agent ID if event is agent-related */
  agentId?: AgentId;
  /** Build phase if event is phase-related */
  phase?: BuildPhase;
  /** Additional typed payload data */
  data?: EventData;
}

// ============================================================================
// INVARIANTS
// ============================================================================

export interface Invariant {
  name: string;
  description: string;
  check: (current: BuildSnapshot, previous?: BuildSnapshot) => InvariantResult;
}

export interface InvariantResult {
  passed: boolean;
  violation?: string;
}

// ============================================================================
// ORACLE
// ============================================================================

export interface OracleVerdict {
  valid: boolean;
  violations: Array<{
    invariant: string;
    message: string;
    snapshot: number;
  }>;
  score: number; // 0-1
}

// ============================================================================
// HELPERS
// ============================================================================

export function createEmptySnapshot(config: BuildConfig): BuildSnapshot {
  const agents = new Map<AgentId, AgentSnapshot>();

  for (const agent of config.agents) {
    agents.set(agent.id, {
      id: agent.id,
      state: 'pending',
      phase: agent.phase,
      retries: 0,
    });
  }

  return {
    id: config.id,
    state: 'pending',
    status: 'pending',
    phase: null,
    progress: 0,
    tokensUsed: 0,
    agents,
    runningAgents: [],
    completedAgents: [],
    failedAgents: [],
    skippedAgents: [],
    startedAt: Date.now(),
    updatedAt: Date.now(),
    config,
  };
}

export function cloneSnapshot(snapshot: BuildSnapshot): BuildSnapshot {
  // Guard against undefined/null snapshot
  if (!snapshot || !snapshot.agents) {
    // Return a minimal empty snapshot
    return {
      id: 'uninitialized',
      state: 'pending',
      status: 'pending',
      phase: null,
      progress: 0,
      tokensUsed: 0,
      agents: new Map(),
      runningAgents: [],
      completedAgents: [],
      failedAgents: [],
      skippedAgents: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      config: {
        id: 'uninitialized',
        tier: 'starter',
        agents: [],
        maxConcurrency: 1,
        maxRetries: 0,
      },
    };
  }

  const runningAgents: AgentId[] = [];
  const completedAgents: AgentId[] = [];
  const failedAgents: AgentId[] = [];
  const skippedAgents: AgentId[] = [];

  for (const [id, agent] of snapshot.agents.entries()) {
    if (agent.state === 'running') runningAgents.push(id);
    if (agent.state === 'completed') completedAgents.push(id);
    if (agent.state === 'failed') failedAgents.push(id);
    if (agent.state === 'skipped') skippedAgents.push(id);
  }

  return {
    ...snapshot,
    agents: new Map(
      Array.from(snapshot.agents.entries()).map(([id, agent]) => [
        id,
        { ...agent },
      ])
    ),
    status: snapshot.state,
    tokensUsed: snapshot.tokensUsed ?? 0,
    runningAgents,
    completedAgents,
    failedAgents,
    skippedAgents,
    updatedAt: Date.now(),
  };
}
