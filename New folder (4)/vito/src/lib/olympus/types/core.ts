// OLYMPUS CORE TYPES — THE ONLY FIVE CONCEPTS

export type PhaseState = 'pending' | 'running' | 'blocked' | 'failed' | 'complete'
export type GateState = 'open' | 'pending' | 'blocked' | 'passed' | 'failed'
export type AgentState = 'idle' | 'working' | 'blocked' | 'failed' | 'done'
export type ArtifactState = 'pending' | 'generating' | 'complete' | 'failed'
export type BuildState = 'pending' | 'running' | 'blocked' | 'failed' | 'complete'
export type Severity = 'INFO' | 'WARNING' | 'BLOCKING' | 'FATAL'

// 1. BUILD
export interface Build {
  readonly id: string
  readonly state: BuildState
  readonly trustScore: number // 0-100
  readonly tokenUsage: number
  readonly tokenLimit: number
  readonly costBurnRate: number // tokens/second
  readonly totalCost: number
  readonly olympusScore: number // 0-100
  readonly startedAt: string
  readonly phases: readonly Phase[]
  readonly artifacts: readonly Artifact[]
  readonly activeAgents: readonly string[]
  readonly failureCount: number
  readonly retryCount: number
}

// 2. PHASE
export interface Phase {
  readonly id: string
  readonly name: string
  readonly order: number
  readonly state: PhaseState
  readonly gate: Gate
  readonly agents: readonly string[]
  readonly artifacts: readonly string[]
  readonly startedAt: string | null
  readonly completedAt: string | null
  readonly tokenUsage: number
  readonly failureReason: string | null
}

// 3. AGENT
export interface Agent {
  readonly id: string
  readonly name: string
  readonly state: AgentState
  readonly currentPhase: string | null
  readonly tokenUsage: number
  readonly outputCount: number
  readonly failureCount: number
  readonly lastOutput: string | null
  readonly lastOutputAt: string | null
}

// 4. ARTIFACT
export interface Artifact {
  readonly id: string
  readonly name: string
  readonly type: string
  readonly phaseId: string
  readonly agentId: string
  readonly state: ArtifactState
  readonly hash: string | null
  readonly size: number
  readonly createdAt: string | null
  readonly path: string
}

// 5. GATE
export interface Gate {
  readonly id: string
  readonly type: 'phase' | 'critical_failure' | 'ship' | 'trust_degradation'
  readonly state: GateState
  readonly reason: string | null
  readonly actorId: string | null
  readonly constraints: readonly string[]
  readonly alternativesConsidered: readonly string[]
  readonly hash: string | null
  readonly decidedAt: string | null
}

// OUTPUT STREAM ENTRY
export interface OutputEntry {
  readonly id: string
  readonly timestamp: string
  readonly agentId: string
  readonly agentName: string
  readonly phaseId: string
  readonly severity: Severity
  readonly message: string
  readonly metadata: Record<string, unknown> | null
}

// DECISION TRACE (WHY)
export interface DecisionTrace {
  readonly id: string
  readonly timestamp: string
  readonly actor: string
  readonly action: string
  readonly reason: string
  readonly constraints: readonly string[]
  readonly alternativesConsidered: readonly string[]
  readonly hash: string
  readonly parentHash: string | null
}

// TRUST EVENT
export interface TrustEvent {
  readonly id: string
  readonly timestamp: string
  readonly delta: number
  readonly reason: string
  readonly actor: string
  readonly previousScore: number
  readonly newScore: number
}

// COST EVENT
export interface CostEvent {
  readonly id: string
  readonly timestamp: string
  readonly tokens: number
  readonly agentId: string
  readonly phaseId: string
  readonly cumulative: number
}

// ERROR
export interface BuildError {
  readonly id: string
  readonly timestamp: string
  readonly severity: Severity
  readonly message: string
  readonly agentId: string | null
  readonly phaseId: string | null
  readonly stack: string | null
  readonly recoverable: boolean
}

// INSPECTOR MODES
export type InspectorMode = 'artifact' | 'agent' | 'phase' | 'gate' | 'error' | 'why' | 'trust' | 'cost'

// COMMAND
export interface Command {
  readonly raw: string
  readonly parsed: {
    readonly action: string
    readonly target: string | null
    readonly flags: readonly string[]
  }
  readonly risk: 'low' | 'medium' | 'high' | 'critical'
  readonly requiresConfirmation: boolean
}

// SYSTEM LIMITS
export const LIMITS = {
  MAX_CONCURRENT_BUILDS: 5,
  MAX_TOKENS_PER_BUILD: 500_000,
  MAX_ARTIFACTS_PER_BUILD: 100,
  MAX_BUILD_DURATION_MS: 60 * 60 * 1000, // 1 hour
} as const
