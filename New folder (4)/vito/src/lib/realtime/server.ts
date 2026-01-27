/**
 * OLYMPUS WebSocket Server
 *
 * Real-time communication backbone.
 * One room per build. One operator per room.
 * Fail loudly on protocol violations.
 */

import {
  ServerEvent,
  ClientCommand,
  SequencedEvent,
  Build,
  Phase,
  Agent,
  Artifact,
  Gate,
  OutputLine,
  PhaseName,
  AgentName,
  PHASES,
  AGENTS_BY_PHASE,
  BuildParameters,
} from './protocol';
import { Authority, readBuildLedger, getLatestSequence } from '../authority/ledger';

// =============================================================================
// TYPES
// =============================================================================

interface Connection {
  id: string;
  buildId: string;
  role: 'operator' | 'observer';
  lastHeartbeat: number;
  send: (event: ServerEvent) => void;
}

interface Room {
  buildId: string;
  operator: Connection | null;
  observers: Connection[];
  eventSequence: number;
  build: Build | null;
  phases: Record<PhaseName, Phase>;
  agents: Record<AgentName, Agent>;
  artifacts: Artifact[];
  gates: Gate[];
  outputBuffer: OutputLine[];
}

// =============================================================================
// STATE
// =============================================================================

const rooms: Map<string, Room> = new Map();
const connections: Map<string, Connection> = new Map();

// =============================================================================
// ROOM MANAGEMENT
// =============================================================================

function createRoom(buildId: string): Room {
  const phases = {} as Record<PhaseName, Phase>;
  for (const phase of PHASES) {
    phases[phase] = {
      name: phase,
      status: 'pending',
      agentCount: AGENTS_BY_PHASE[phase].length,
      completedAgents: 0,
      tokensUsed: 0,
      startedAt: null,
      completedAt: null,
      failedAt: null,
    };
  }

  const agents = {} as Record<AgentName, Agent>;
  for (const phase of PHASES) {
    for (const agent of AGENTS_BY_PHASE[phase]) {
      agents[agent] = {
        name: agent,
        phase,
        status: 'pending',
        tokensUsed: 0,
        durationMs: null,
        startedAt: null,
        completedAt: null,
        failedAt: null,
        artifactId: null,
        error: null,
      };
    }
  }

  return {
    buildId,
    operator: null,
    observers: [],
    eventSequence: 0,
    build: null,
    phases,
    agents,
    artifacts: [],
    gates: [],
    outputBuffer: [],
  };
}

function getOrCreateRoom(buildId: string): Room {
  if (!rooms.has(buildId)) {
    rooms.set(buildId, createRoom(buildId));
  }
  return rooms.get(buildId)!;
}

/**
 * Extract tenantId from buildId format: {tenantId}_{uuid}
 * Falls back to null if format doesn't match
 */
function extractTenantFromBuildId(buildId: string): string | null {
  // Build IDs are formatted as: {tenantId}_{uuid} or just uuid
  const parts = buildId.split('_');
  if (parts.length >= 2) {
    // First part might be tenantId
    const potentialTenantId = parts[0];
    // Validate it's not just a UUID segment
    if (potentialTenantId.length > 8 && !potentialTenantId.includes('-')) {
      return potentialTenantId;
    }
  }
  return null;
}

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

export function handleConnection(
  buildId: string,
  connectionId: string,
  sendFn: (event: ServerEvent) => void
): { success: boolean; error?: string } {
  const room = getOrCreateRoom(buildId);

  // Determine role
  let role: 'operator' | 'observer';
  if (room.operator === null) {
    role = 'operator';
  } else {
    role = 'observer';
  }

  const connection: Connection = {
    id: connectionId,
    buildId,
    role,
    lastHeartbeat: Date.now(),
    send: sendFn,
  };

  connections.set(connectionId, connection);

  if (role === 'operator') {
    room.operator = connection;
  } else {
    room.observers.push(connection);
  }

  // Send connection established
  connection.send({
    type: 'connection:established',
    connectionId,
    buildId,
    role,
    serverTime: new Date().toISOString(),
  });

  // Send full state sync
  connection.send({
    type: 'sync:full',
    build: room.build!,
    phases: room.phases,
    agents: room.agents,
    artifacts: room.artifacts,
    gates: room.gates,
    outputBuffer: room.outputBuffer.slice(-1000), // Last 1000 lines
  });

  console.log(`[WS] Connection ${connectionId} joined room ${buildId} as ${role}`);
  return { success: true };
}

export function handleDisconnection(connectionId: string): void {
  const connection = connections.get(connectionId);
  if (!connection) return;

  const room = rooms.get(connection.buildId);
  if (!room) return;

  if (connection.role === 'operator') {
    room.operator = null;

    // Auto-pause build if running
    if (room.build && room.build.status === 'running') {
      room.build.status = 'paused';
      room.build.pausedAt = new Date().toISOString();
      Authority.buildPause(room.buildId, connection.id, 'operator_disconnected');

      broadcastToRoom(room.buildId, {
        type: 'build:status',
        status: 'paused',
        reason: 'Operator disconnected',
      });
    }
  } else {
    room.observers = room.observers.filter(o => o.id !== connectionId);
  }

  connections.delete(connectionId);
  console.log(`[WS] Connection ${connectionId} left room ${connection.buildId}`);
}

// =============================================================================
// COMMAND HANDLING
// =============================================================================

export function handleCommand(connectionId: string, command: ClientCommand): { success: boolean; error?: string } {
  const connection = connections.get(connectionId);
  if (!connection) {
    return { success: false, error: 'Connection not found' };
  }

  const room = rooms.get(connection.buildId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  // Only operators can send commands (except heartbeat)
  if (command.type !== 'heartbeat:ack' && connection.role !== 'operator') {
    return { success: false, error: 'Only operators can send commands' };
  }

  switch (command.type) {
    case 'build:start':
      return handleStartBuild(room, connection, command.parameters);

    case 'build:pause':
      return handlePauseBuild(room, connection);

    case 'build:resume':
      return handleResumeBuild(room, connection);

    case 'build:cancel':
      return handleCancelBuild(room, connection, command.preserveArtifacts);

    case 'gate:resolve':
      return handleResolveGate(room, connection, command.gateId, command.decision, command.metadata);

    case 'heartbeat:ack':
      connection.lastHeartbeat = Date.now();
      return { success: true };

    case 'sync:recover':
      return handleSyncRecover(connection, command.lastSequence);

    default:
      return { success: false, error: `Unknown command type: ${(command as any).type}` };
  }
}

// =============================================================================
// COMMAND HANDLERS
// =============================================================================

function handleStartBuild(
  room: Room,
  connection: Connection,
  parameters: BuildParameters
): { success: boolean; error?: string } {
  if (room.build && room.build.status === 'running') {
    return { success: false, error: 'Build already running' };
  }

  const buildId = room.buildId;
  const operatorId = connection.id;

  // AUTHORITY: Write before action
  Authority.buildStart(buildId, operatorId, parameters as unknown as Record<string, unknown>);

  // Extract tenantId from parameters or use connection context
  const tenantId = (parameters as unknown as { tenantId?: string }).tenantId ||
                   extractTenantFromBuildId(buildId) ||
                   'default';

  // Create build
  room.build = {
    id: buildId,
    tenantId,
    operatorId,
    status: 'running',
    parameters,
    tokensUsed: 0,
    estimatedCost: 0,
    startedAt: new Date().toISOString(),
    pausedAt: null,
    completedAt: null,
    failedAt: null,
    error: null,
  };

  // Reset phases and agents
  for (const phase of PHASES) {
    room.phases[phase].status = 'pending';
    room.phases[phase].completedAgents = 0;
    room.phases[phase].tokensUsed = 0;
    room.phases[phase].startedAt = null;
    room.phases[phase].completedAt = null;
    room.phases[phase].failedAt = null;
  }

  for (const phase of PHASES) {
    for (const agent of AGENTS_BY_PHASE[phase]) {
      room.agents[agent].status = 'pending';
      room.agents[agent].tokensUsed = 0;
      room.agents[agent].durationMs = null;
      room.agents[agent].startedAt = null;
      room.agents[agent].completedAt = null;
      room.agents[agent].failedAt = null;
      room.agents[agent].artifactId = null;
      room.agents[agent].error = null;
    }
  }

  room.artifacts = [];
  room.gates = [];
  room.outputBuffer = [];

  broadcastToRoom(buildId, {
    type: 'build:started',
    build: room.build,
  });

  appendOutput(room, 'system', null, `Build started: ${parameters.name}`);

  // Start first phase (simulated for now)
  setTimeout(() => simulatePhaseStart(room, 'discovery'), 100);

  return { success: true };
}

function handlePauseBuild(room: Room, connection: Connection): { success: boolean; error?: string } {
  if (!room.build || room.build.status !== 'running') {
    return { success: false, error: 'No running build to pause' };
  }

  // AUTHORITY: Write before action
  Authority.buildPause(room.buildId, connection.id);

  room.build.status = 'paused';
  room.build.pausedAt = new Date().toISOString();

  broadcastToRoom(room.buildId, {
    type: 'build:status',
    status: 'paused',
    reason: 'Paused by operator',
  });

  appendOutput(room, 'system', null, 'Build paused');

  return { success: true };
}

function handleResumeBuild(room: Room, connection: Connection): { success: boolean; error?: string } {
  if (!room.build || room.build.status !== 'paused') {
    return { success: false, error: 'No paused build to resume' };
  }

  // AUTHORITY: Write before action
  Authority.buildResume(room.buildId, connection.id);

  room.build.status = 'running';
  room.build.pausedAt = null;

  broadcastToRoom(room.buildId, {
    type: 'build:status',
    status: 'running',
  });

  appendOutput(room, 'system', null, 'Build resumed');

  return { success: true };
}

function handleCancelBuild(
  room: Room,
  connection: Connection,
  preserveArtifacts: boolean
): { success: boolean; error?: string } {
  if (!room.build) {
    return { success: false, error: 'No build to cancel' };
  }

  // AUTHORITY: Write before action
  Authority.buildCancel(room.buildId, connection.id, preserveArtifacts);

  room.build.status = 'failed';
  room.build.failedAt = new Date().toISOString();
  room.build.error = {
    code: 'CANCELLED',
    message: 'Build cancelled by operator',
    recoverable: false,
  };

  if (!preserveArtifacts) {
    room.artifacts = [];
  }

  broadcastToRoom(room.buildId, {
    type: 'build:completed',
    status: 'failed',
    summary: {
      phases: PHASES.filter(p => room.phases[p].status === 'completed').length,
      agents: Object.values(room.agents).filter(a => a.status === 'completed').length,
      artifacts: room.artifacts.length,
      tokensUsed: room.build.tokensUsed,
      estimatedCost: room.build.estimatedCost,
      durationMs: Date.now() - new Date(room.build.startedAt!).getTime(),
    },
  });

  appendOutput(room, 'system', null, 'Build cancelled');

  return { success: true };
}

function handleResolveGate(
  room: Room,
  connection: Connection,
  gateId: string,
  decision: string,
  metadata?: { artifactsInspected: string[]; checklistCompleted: boolean; timeAtGateMs: number }
): { success: boolean; error?: string } {
  const gate = room.gates.find(g => g.id === gateId);
  if (!gate) {
    return { success: false, error: 'Gate not found' };
  }

  if (gate.status === 'resolved') {
    return { success: false, error: 'Gate already resolved' };
  }

  // AUTHORITY: Write before action
  Authority.gateResolve(room.buildId, gateId, connection.id, decision, metadata);

  gate.status = 'resolved';
  gate.decision = decision;
  gate.decisionMetadata = metadata || null;
  gate.resolvedBy = connection.id;
  gate.resolvedAt = new Date().toISOString();

  broadcastToRoom(room.buildId, {
    type: 'gate:resolved',
    gateId,
    decision,
    resolvedBy: connection.id,
  });

  appendOutput(room, 'system', null, `Gate resolved: ${decision}`);

  // Handle decision consequences
  if (decision === 'approve') {
    // Continue to next phase
    const currentPhaseIndex = PHASES.findIndex(p => room.phases[p].status === 'running' || room.phases[p].status === 'completed');
    if (currentPhaseIndex < PHASES.length - 1) {
      setTimeout(() => simulatePhaseStart(room, PHASES[currentPhaseIndex + 1]), 100);
    } else {
      completeBuild(room);
    }
  } else if (decision === 'abort') {
    room.build!.status = 'failed';
    room.build!.failedAt = new Date().toISOString();
    Authority.buildFail(room.buildId, { reason: 'Aborted at gate' });
  }

  return { success: true };
}

function handleSyncRecover(connection: Connection, lastSequence: number): { success: boolean; error?: string } {
  const room = rooms.get(connection.buildId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  // For now, just send full sync
  // In production, would send incremental if gap is small
  connection.send({
    type: 'sync:full',
    build: room.build!,
    phases: room.phases,
    agents: room.agents,
    artifacts: room.artifacts,
    gates: room.gates,
    outputBuffer: room.outputBuffer.slice(-1000),
  });

  return { success: true };
}

// =============================================================================
// SIMULATION (Replace with real orchestrator)
// =============================================================================

function simulatePhaseStart(room: Room, phase: PhaseName): void {
  if (!room.build || room.build.status !== 'running') return;

  Authority.phaseStart(room.buildId, phase, AGENTS_BY_PHASE[phase].length);

  room.phases[phase].status = 'running';
  room.phases[phase].startedAt = new Date().toISOString();

  broadcastToRoom(room.buildId, {
    type: 'phase:start',
    phase,
    agentCount: AGENTS_BY_PHASE[phase].length,
  });

  appendOutput(room, 'system', null, `Phase started: ${phase}`);

  // Start first agent
  const agents = AGENTS_BY_PHASE[phase];
  if (agents.length > 0) {
    setTimeout(() => simulateAgentStart(room, agents[0]), 500);
  }
}

function simulateAgentStart(room: Room, agent: AgentName): void {
  if (!room.build || room.build.status !== 'running') return;

  const phase = room.agents[agent].phase;
  Authority.agentStart(room.buildId, agent, phase);

  room.agents[agent].status = 'running';
  room.agents[agent].startedAt = new Date().toISOString();

  broadcastToRoom(room.buildId, {
    type: 'agent:start',
    agent,
    phase,
  });

  appendOutput(room, 'agent', agent, `Starting...`);

  // Simulate agent output
  let outputCount = 0;
  const outputInterval = setInterval(() => {
    if (!room.build || room.build.status !== 'running') {
      clearInterval(outputInterval);
      return;
    }

    outputCount++;
    const chunk = `[${agent}] Processing step ${outputCount}...\n`;

    broadcastToRoom(room.buildId, {
      type: 'agent:output',
      agent,
      chunk,
      tokensDelta: 100,
    });

    room.build.tokensUsed += 100;
    room.build.estimatedCost = room.build.tokensUsed * 0.000001;

    appendOutput(room, 'agent', agent, `Processing step ${outputCount}...`);

    if (outputCount >= 3) {
      clearInterval(outputInterval);
      setTimeout(() => simulateAgentComplete(room, agent), 500);
    }
  }, 1000);
}

function simulateAgentComplete(room: Room, agent: AgentName): void {
  if (!room.build || room.build.status !== 'running') return;

  const phase = room.agents[agent].phase;
  const artifactId = `artifact_${agent}_${Date.now()}`;

  Authority.agentComplete(room.buildId, agent, artifactId, room.agents[agent].tokensUsed);
  Authority.artifactCreate(room.buildId, artifactId, agent, 'document', `${agent}.md`);

  room.agents[agent].status = 'completed';
  room.agents[agent].completedAt = new Date().toISOString();
  room.agents[agent].durationMs = Date.now() - new Date(room.agents[agent].startedAt!).getTime();
  room.agents[agent].artifactId = artifactId;
  room.agents[agent].tokensUsed = 300; // Simulated

  const artifact: Artifact = {
    id: artifactId,
    agentName: agent,
    phase,
    type: 'document',
    name: `${agent}.md`,
    contentUrl: `/api/artifacts/${artifactId}`,
    sizeBytes: 1024,
    contentHash: 'sha256_placeholder',
    validationStatus: 'valid',
    validationErrors: [],
    preview: `# ${agent} Output\n\nGenerated content...`,
    createdAt: new Date().toISOString(),
  };

  room.artifacts.push(artifact);
  room.phases[phase].completedAgents++;
  room.phases[phase].tokensUsed += 300;

  broadcastToRoom(room.buildId, {
    type: 'agent:complete',
    agent,
    artifact,
    tokensUsed: 300,
    duration: room.agents[agent].durationMs!,
  });

  broadcastToRoom(room.buildId, {
    type: 'cost:update',
    tokensUsed: room.build.tokensUsed,
    estimatedCost: room.build.estimatedCost,
    provider: 'groq',
    breakdown: { input: 200, output: 100 },
  });

  appendOutput(room, 'agent', agent, `Completed. Artifact: ${artifact.name}`);

  // Check if phase is complete
  const phaseAgents = AGENTS_BY_PHASE[phase];
  const agentIndex = phaseAgents.indexOf(agent);

  if (agentIndex < phaseAgents.length - 1) {
    // Start next agent
    setTimeout(() => simulateAgentStart(room, phaseAgents[agentIndex + 1]), 500);
  } else {
    // Phase complete - open gate
    completePhaseAndOpenGate(room, phase);
  }
}

function completePhaseAndOpenGate(room: Room, phase: PhaseName): void {
  Authority.phaseComplete(room.buildId, phase, room.phases[phase].tokensUsed, Date.now() - new Date(room.phases[phase].startedAt!).getTime());

  room.phases[phase].status = 'completed';
  room.phases[phase].completedAt = new Date().toISOString();

  broadcastToRoom(room.buildId, {
    type: 'phase:complete',
    phase,
    duration: Date.now() - new Date(room.phases[phase].startedAt!).getTime(),
    tokensUsed: room.phases[phase].tokensUsed,
  });

  appendOutput(room, 'system', null, `Phase completed: ${phase}`);

  // Open phase gate
  const gateId = `gate_${phase}_${Date.now()}`;
  const phaseIndex = PHASES.indexOf(phase);
  const isLastPhase = phaseIndex === PHASES.length - 1;

  Authority.gateOpen(room.buildId, gateId, isLastPhase ? 'ship' : 'phase', { phase });

  const gate: Gate = {
    id: gateId,
    buildId: room.buildId,
    type: isLastPhase ? 'ship' : 'phase',
    status: 'pending',
    context: {
      phase,
      artifacts: room.artifacts.filter(a => a.phase === phase).map(a => a.id),
    },
    options: isLastPhase
      ? [
          { id: 'export', label: 'Export', description: 'Download all artifacts', destructive: false, requiresConfirmation: true },
          { id: 'iterate', label: 'Iterate', description: 'Run another build pass', destructive: false, requiresConfirmation: false },
          { id: 'discard', label: 'Discard', description: 'Delete build permanently', destructive: true, requiresConfirmation: true },
        ]
      : [
          { id: 'approve', label: 'Approve', description: `Proceed to next phase`, destructive: false, requiresConfirmation: true },
          { id: 'iterate', label: 'Iterate', description: 'Re-run this phase', destructive: false, requiresConfirmation: false },
          { id: 'abort', label: 'Abort', description: 'Cancel build', destructive: true, requiresConfirmation: true },
        ],
    decision: null,
    decisionMetadata: null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
  };

  room.gates.push(gate);

  broadcastToRoom(room.buildId, {
    type: 'gate:pending',
    gate,
  });

  appendOutput(room, 'system', null, `Gate opened: ${isLastPhase ? 'Ship gate' : `Phase ${phase} gate`}`);
}

function completeBuild(room: Room): void {
  const summary = {
    phases: PHASES.filter(p => room.phases[p].status === 'completed').length,
    agents: Object.values(room.agents).filter(a => a.status === 'completed').length,
    artifacts: room.artifacts.length,
    tokensUsed: room.build!.tokensUsed,
    estimatedCost: room.build!.estimatedCost,
    durationMs: Date.now() - new Date(room.build!.startedAt!).getTime(),
  };

  Authority.buildComplete(room.buildId, summary);

  room.build!.status = 'completed';
  room.build!.completedAt = new Date().toISOString();

  broadcastToRoom(room.buildId, {
    type: 'build:completed',
    status: 'success',
    summary,
  });

  appendOutput(room, 'system', null, `Build completed successfully`);
}

// =============================================================================
// UTILITIES
// =============================================================================

function broadcastToRoom(buildId: string, event: ServerEvent): void {
  const room = rooms.get(buildId);
  if (!room) return;

  const sequenced: SequencedEvent = {
    sequence: ++room.eventSequence,
    timestamp: new Date().toISOString(),
    payload: event,
  };

  if (room.operator) {
    room.operator.send(event);
  }

  for (const observer of room.observers) {
    observer.send(event);
  }
}

function appendOutput(room: Room, type: OutputLine['type'], agentName: AgentName | null, content: string): void {
  const line: OutputLine = {
    sequence: room.outputBuffer.length + 1,
    type,
    agentName,
    content,
    timestamp: new Date().toISOString(),
  };

  room.outputBuffer.push(line);

  // Cap at 50000 lines
  if (room.outputBuffer.length > 50000) {
    room.outputBuffer = room.outputBuffer.slice(-50000);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { rooms, connections };

export function getBuildState(buildId: string): Room | undefined {
  return rooms.get(buildId);
}

export function createBuild(buildId: string): Room {
  return getOrCreateRoom(buildId);
}
