/**
 * OLYMPUS WebSocket Protocol
 *
 * Defines all event types for bidirectional communication.
 * This is the contract. Do not deviate.
 */

// =============================================================================
// PHASE AND AGENT NAMES (CANONICAL)
// =============================================================================

export type PhaseName =
  | 'discovery'
  | 'design'
  | 'architecture'
  | 'frontend'
  | 'backend'
  | 'integration';

export type AgentName =
  | 'oracle' | 'empathy' | 'venture' | 'strategos' | 'scope'
  | 'palette' | 'grid' | 'blocks' | 'cartographer' | 'flow'
  | 'archon' | 'datum' | 'nexus' | 'forge' | 'sentinel'
  | 'pixel' | 'wire'
  | 'engine' | 'keeper'
  | 'bridge' | 'notify';

export const PHASES: PhaseName[] = [
  'discovery', 'design', 'architecture', 'frontend', 'backend', 'integration'
];

export const AGENTS_BY_PHASE: Record<PhaseName, AgentName[]> = {
  discovery: ['oracle', 'empathy', 'venture', 'strategos', 'scope'],
  design: ['palette', 'grid', 'blocks', 'cartographer', 'flow'],
  architecture: ['archon', 'datum', 'nexus', 'forge', 'sentinel'],
  frontend: ['pixel', 'wire'],
  backend: ['engine', 'keeper'],
  integration: ['bridge', 'notify'],
};

// =============================================================================
// CORE TYPES
// =============================================================================

export type BuildStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed';
export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type ValidationStatus = 'valid' | 'warning' | 'invalid' | 'pending';
export type GateType = 'phase' | 'critical' | 'validation' | 'ship';
export type GateStatus = 'pending' | 'resolved';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface Build {
  id: string;
  tenantId: string;
  operatorId: string;
  status: BuildStatus;
  parameters: BuildParameters;
  tokensUsed: number;
  estimatedCost: number;
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  error: BuildError | null;
}

export interface BuildParameters {
  name: string;
  description: string;
  model: string;
  fallbackModel: string;
  tokenBudget: number;
}

export interface BuildError {
  code: string;
  message: string;
  agentId?: string;
  phase?: PhaseName;
  recoverable: boolean;
}

export interface Phase {
  name: PhaseName;
  status: PhaseStatus;
  agentCount: number;
  completedAgents: number;
  tokensUsed: number;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
}

export interface Agent {
  name: AgentName;
  phase: PhaseName;
  status: AgentStatus;
  tokensUsed: number;
  durationMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  artifactId: string | null;
  error: AgentError | null;
}

export interface AgentError {
  code: string;
  message: string;
  recoverable: boolean;
  retryAfter?: number;
  context: Record<string, unknown>;
}

export interface Artifact {
  id: string;
  agentName: AgentName;
  phase: PhaseName;
  type: string;
  name: string;
  contentUrl: string;
  sizeBytes: number;
  contentHash: string;
  validationStatus: ValidationStatus;
  validationErrors: ValidationError[];
  preview: string;
  createdAt: string;
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface Gate {
  id: string;
  buildId: string;
  type: GateType;
  status: GateStatus;
  context: GateContext;
  options: GateOption[];
  decision: string | null;
  decisionMetadata: GateDecisionMetadata | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface GateContext {
  phase?: PhaseName;
  agent?: AgentName;
  artifacts?: string[];
  error?: AgentError;
  validationErrors?: ValidationError[];
  summary?: BuildSummary;
}

export interface GateOption {
  id: string;
  label: string;
  description: string;
  destructive: boolean;
  requiresConfirmation: boolean;
}

export interface GateDecisionMetadata {
  artifactsInspected: string[];
  checklistCompleted: boolean;
  timeAtGateMs: number;
}

export interface BuildSummary {
  phases: number;
  agents: number;
  artifacts: number;
  tokensUsed: number;
  estimatedCost: number;
  durationMs: number;
}

export interface OutputLine {
  sequence: number;
  type: 'system' | 'agent' | 'error' | 'warning';
  agentName: AgentName | null;
  content: string;
  timestamp: string;
}

// =============================================================================
// SERVER → CLIENT EVENTS
// =============================================================================

export interface ConnectionEstablishedEvent {
  type: 'connection:established';
  connectionId: string;
  buildId: string;
  role: 'operator' | 'observer';
  serverTime: string;
}

export interface SyncFullEvent {
  type: 'sync:full';
  build: Build;
  phases: Record<PhaseName, Phase>;
  agents: Record<AgentName, Agent>;
  artifacts: Artifact[];
  gates: Gate[];
  outputBuffer: OutputLine[];
}

export interface SyncIncrementalEvent {
  type: 'sync:incremental';
  events: SequencedEvent[];
}

export interface HeartbeatEvent {
  type: 'heartbeat';
  serverTime: string;
}

export interface BuildStartedEvent {
  type: 'build:started';
  build: Build;
}

export interface BuildStatusEvent {
  type: 'build:status';
  status: BuildStatus;
  reason?: string;
}

export interface BuildCompletedEvent {
  type: 'build:completed';
  status: 'success' | 'partial' | 'failed';
  summary: BuildSummary;
}

export interface PhaseStartEvent {
  type: 'phase:start';
  phase: PhaseName;
  agentCount: number;
}

export interface PhaseCompleteEvent {
  type: 'phase:complete';
  phase: PhaseName;
  duration: number;
  tokensUsed: number;
}

export interface PhaseFailedEvent {
  type: 'phase:failed';
  phase: PhaseName;
  reason: string;
  failedAgent: AgentName;
}

export interface AgentStartEvent {
  type: 'agent:start';
  agent: AgentName;
  phase: PhaseName;
}

export interface AgentOutputEvent {
  type: 'agent:output';
  agent: AgentName;
  chunk: string;
  tokensDelta: number;
}

export interface AgentCompleteEvent {
  type: 'agent:complete';
  agent: AgentName;
  artifact: Artifact;
  tokensUsed: number;
  duration: number;
}

export interface AgentFailedEvent {
  type: 'agent:failed';
  agent: AgentName;
  error: AgentError;
}

export interface GatePendingEvent {
  type: 'gate:pending';
  gate: Gate;
}

export interface GateResolvedEvent {
  type: 'gate:resolved';
  gateId: string;
  decision: string;
  resolvedBy: string;
}

export interface CostUpdateEvent {
  type: 'cost:update';
  tokensUsed: number;
  estimatedCost: number;
  provider: string;
  breakdown: { input: number; output: number };
}

export interface SystemErrorEvent {
  type: 'system:error';
  code: string;
  message: string;
  fatal: boolean;
}

export type ServerEvent =
  | ConnectionEstablishedEvent
  | SyncFullEvent
  | SyncIncrementalEvent
  | HeartbeatEvent
  | BuildStartedEvent
  | BuildStatusEvent
  | BuildCompletedEvent
  | PhaseStartEvent
  | PhaseCompleteEvent
  | PhaseFailedEvent
  | AgentStartEvent
  | AgentOutputEvent
  | AgentCompleteEvent
  | AgentFailedEvent
  | GatePendingEvent
  | GateResolvedEvent
  | CostUpdateEvent
  | SystemErrorEvent;

export interface SequencedEvent {
  sequence: number;
  timestamp: string;
  payload: ServerEvent;
}

// =============================================================================
// CLIENT → SERVER COMMANDS
// =============================================================================

export interface StartBuildCommand {
  type: 'build:start';
  parameters: BuildParameters;
}

export interface PauseBuildCommand {
  type: 'build:pause';
}

export interface ResumeBuildCommand {
  type: 'build:resume';
}

export interface CancelBuildCommand {
  type: 'build:cancel';
  preserveArtifacts: boolean;
}

export interface ResolveGateCommand {
  type: 'gate:resolve';
  gateId: string;
  decision: string;
  metadata?: GateDecisionMetadata;
}

export interface HeartbeatAckCommand {
  type: 'heartbeat:ack';
}

export interface SyncRecoverCommand {
  type: 'sync:recover';
  lastSequence: number;
}

export interface RequestArtifactCommand {
  type: 'artifact:request';
  artifactId: string;
}

export type ClientCommand =
  | StartBuildCommand
  | PauseBuildCommand
  | ResumeBuildCommand
  | CancelBuildCommand
  | ResolveGateCommand
  | HeartbeatAckCommand
  | SyncRecoverCommand
  | RequestArtifactCommand;

// =============================================================================
// AUTHORITY LEDGER TYPES
// =============================================================================

export type AuthorityEventType =
  | 'BUILD_START'
  | 'BUILD_PAUSE'
  | 'BUILD_RESUME'
  | 'BUILD_CANCEL'
  | 'BUILD_COMPLETE'
  | 'BUILD_FAIL'
  | 'PHASE_START'
  | 'PHASE_COMPLETE'
  | 'PHASE_FAIL'
  | 'AGENT_START'
  | 'AGENT_COMPLETE'
  | 'AGENT_FAIL'
  | 'AGENT_SKIP'
  | 'GATE_OPEN'
  | 'GATE_RESOLVE'
  | 'ARTIFACT_CREATE'
  | 'COST_UPDATE'
  | 'ERROR';

export interface AuthorityEntry {
  id: string;
  buildId: string;
  eventType: AuthorityEventType;
  actorId: string | null;
  details: Record<string, unknown>;
  timestamp: string;
  sequence: number;
}
