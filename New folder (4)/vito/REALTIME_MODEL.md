# REALTIME_MODEL.md

## WebSocket Topology and Event Routing

**Document Type:** Architecture Artifact
**Phase:** 3 - Architecture
**Created:** 2026-01-20
**Author:** OLYMPUS Self-Build

---

## Architectural Principle

WebSocket is the **primary data channel**, not a supplement to HTTP.

- All build state flows through WebSocket
- HTTP is used only for: authentication, file upload, artifact download
- No polling. No HTTP-based state checks.
- Client trusts WebSocket events as source of truth

---

## Connection Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              OLYMPUS SERVER                              │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                         Build Orchestrator                          ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ││
│  │  │ Phase 1 │─▶│ Phase 2 │─▶│ Phase 3 │─▶│ Phase 4 │─▶│ Phase N │  ││
│  │  │Agents   │  │Agents   │  │Agents   │  │Agents   │  │Agents   │  ││
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  ││
│  │       │            │            │            │            │        ││
│  │       └────────────┴────────────┴────────────┴────────────┘        ││
│  │                              │                                      ││
│  │                              ▼                                      ││
│  │                    ┌─────────────────┐                              ││
│  │                    │  Event Emitter  │                              ││
│  │                    └────────┬────────┘                              ││
│  └─────────────────────────────┼───────────────────────────────────────┘│
│                                │                                         │
│                                ▼                                         │
│                    ┌─────────────────────┐                              │
│                    │  WebSocket Manager  │                              │
│                    │  (per-build rooms)  │                              │
│                    └──────────┬──────────┘                              │
│                               │                                         │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
           ▼                    ▼                    ▼
    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
    │  Client 1   │      │  Client 2   │      │  Client N   │
    │ (operator)  │      │ (observer)  │      │ (observer)  │
    └─────────────┘      └─────────────┘      └─────────────┘
```

---

## Connection Lifecycle

### 1. Connection Establishment

```typescript
// Client initiates connection with build ID
const ws = new WebSocket(`wss://olympus.app/ws/build/${buildId}`);

// Server response: connection accepted
{
  type: 'connection:established',
  connectionId: 'conn-abc123',
  buildId: 'build-xyz789',
  role: 'operator' | 'observer',
  serverTime: '2026-01-20T12:00:00Z'
}
```

### 2. State Synchronization

Immediately after connection, server sends full state snapshot:

```typescript
{
  type: 'sync:full',
  build: Build,
  phases: Record<PhaseName, PhaseStatus>,
  agents: Record<AgentName, AgentStatus>,
  artifacts: Artifact[], // metadata only, not content
  gates: Gate[],
  outputBuffer: OutputLine[] // last 1000 lines
}
```

Client replaces all local state with snapshot. No merge logic.

### 3. Event Streaming

After sync, server sends incremental events:

```typescript
// Events are ordered and sequenced
{
  type: 'event',
  sequence: 12345, // monotonically increasing
  timestamp: '2026-01-20T12:00:01.234Z',
  payload: ServerEvent
}
```

### 4. Heartbeat

```typescript
// Server sends heartbeat every 30 seconds
{ type: 'heartbeat', serverTime: '2026-01-20T12:00:30Z' }

// Client must respond within 10 seconds
{ type: 'heartbeat:ack' }

// No response → server closes connection
```

### 5. Disconnection

```typescript
// Clean disconnection
{ type: 'connection:closing', reason: 'client_request' | 'build_complete' | 'idle_timeout' }

// Unexpected disconnection → client handles via onerror/onclose
```

---

## Event Types (Server → Client)

### Build Events

```typescript
interface BuildStartedEvent {
  type: 'build:started';
  build: Build;
}

interface BuildStatusChangedEvent {
  type: 'build:status';
  status: 'running' | 'paused' | 'completed' | 'failed';
  reason?: string;
}

interface BuildCompletedEvent {
  type: 'build:completed';
  status: 'success' | 'partial' | 'failed';
  summary: BuildSummary;
}
```

### Phase Events

```typescript
interface PhaseStartEvent {
  type: 'phase:start';
  phase: PhaseName;
  agentCount: number;
}

interface PhaseCompleteEvent {
  type: 'phase:complete';
  phase: PhaseName;
  duration: number;
  tokensUsed: number;
}

interface PhaseFailedEvent {
  type: 'phase:failed';
  phase: PhaseName;
  reason: string;
  failedAgent: AgentName;
}
```

### Agent Events

```typescript
interface AgentStartEvent {
  type: 'agent:start';
  agent: AgentName;
  phase: PhaseName;
}

interface AgentOutputEvent {
  type: 'agent:output';
  agent: AgentName;
  chunk: string; // streaming text
  tokensDelta: number;
}

interface AgentCompleteEvent {
  type: 'agent:complete';
  agent: AgentName;
  artifact: ArtifactMetadata;
  tokensUsed: number;
  duration: number;
}

interface AgentFailedEvent {
  type: 'agent:failed';
  agent: AgentName;
  error: {
    code: string;
    message: string;
    recoverable: boolean;
    context: Record<string, unknown>;
  };
}
```

### Gate Events

```typescript
interface GatePendingEvent {
  type: 'gate:pending';
  gate: Gate;
}

interface GateResolvedEvent {
  type: 'gate:resolved';
  gateId: string;
  decision: GateDecision;
  resolvedBy: string; // operator ID
}
```

### Cost Events

```typescript
interface CostUpdateEvent {
  type: 'cost:update';
  tokensUsed: number;
  estimatedCost: number;
  provider: 'groq' | 'openai';
  breakdown: {
    input: number;
    output: number;
  };
}
```

### System Events

```typescript
interface RateLimitWarningEvent {
  type: 'system:rate_limit_warning';
  provider: string;
  remaining: number;
  resetAt: string;
}

interface ProviderFallbackEvent {
  type: 'system:provider_fallback';
  from: string;
  to: string;
  reason: string;
}
```

---

## Command Types (Client → Server)

### Build Commands

```typescript
interface StartBuildCommand {
  type: 'build:start';
  parameters: BuildParameters;
}

interface PauseBuildCommand {
  type: 'build:pause';
}

interface ResumeBuildCommand {
  type: 'build:resume';
}

interface CancelBuildCommand {
  type: 'build:cancel';
  preserveArtifacts: boolean;
}
```

### Gate Commands

```typescript
interface ResolveGateCommand {
  type: 'gate:resolve';
  gateId: string;
  decision: 'approve' | 'reject' | 'iterate' | 'abort' | 'retry' | 'skip' | 'accept';
  metadata?: {
    artifactsInspected: string[];
    checklistCompleted: boolean;
    timeAtGate: number;
  };
}
```

### Artifact Commands

```typescript
interface RequestArtifactContentCommand {
  type: 'artifact:request_content';
  artifactId: string;
}
```

---

## Event Ordering Guarantees

### Sequence Numbers

Every event has a monotonically increasing sequence number.

```typescript
// Client tracks last received sequence
let lastSequence = 0;

function handleEvent(event: SequencedEvent) {
  if (event.sequence <= lastSequence) {
    // Duplicate or out-of-order, ignore
    console.warn(`Ignoring event ${event.sequence}, last was ${lastSequence}`);
    return;
  }

  if (event.sequence > lastSequence + 1) {
    // Gap detected, request resync
    requestResync(lastSequence + 1, event.sequence - 1);
  }

  lastSequence = event.sequence;
  processEvent(event.payload);
}
```

### Gap Recovery

If client detects sequence gap:

```typescript
// Client requests missing events
{ type: 'sync:request_range', from: 100, to: 105 }

// Server responds with missing events
{
  type: 'sync:range',
  events: [
    { sequence: 100, payload: {...} },
    { sequence: 101, payload: {...} },
    // ...
  ]
}
```

If gap is too large (> 100 events), server sends full resync instead.

---

## Reconnection Strategy

### Client-Side Reconnection

```typescript
class WebSocketManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000; // 1 second
  private maxDelay = 30000; // 30 seconds

  private getReconnectDelay(): number {
    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxDelay
    );
    const jitter = delay * 0.2 * Math.random();
    return delay + jitter;
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnect:failed');
      return;
    }

    this.reconnectAttempts++;
    this.emit('reconnect:attempting', { attempt: this.reconnectAttempts });

    await sleep(this.getReconnectDelay());

    try {
      await this.connect();
      this.reconnectAttempts = 0;
      this.emit('reconnect:success');
    } catch (e) {
      this.reconnect(); // Try again
    }
  }
}
```

### State Recovery After Reconnect

```typescript
// After reconnection, client sends last known sequence
{ type: 'sync:recover', lastSequence: 12345 }

// Server responds with:
// Option A: Events since that sequence (if < 100 events)
{ type: 'sync:incremental', events: [...] }

// Option B: Full resync (if too many events missed)
{ type: 'sync:full', ... }
```

---

## Room Model

Each build has a "room" - a logical channel for events.

### Room Lifecycle

```
Build created ──────▶ Room created (empty)
                           │
Client connects ──────────▶│ Client joins room
                           │
Build runs ───────────────▶│ Events broadcast to room
                           │
Build completes ──────────▶│ Room marked "completed"
                           │
All clients disconnect ───▶│ Room archived (events preserved)
                           │
24 hours pass ────────────▶│ Room deleted (build data remains in DB)
```

### Room Membership

| Role | Capabilities |
|------|--------------|
| Operator | Send commands, receive events |
| Observer | Receive events only |

Only one operator per room. Multiple observers allowed.

### Room Events (Internal)

```typescript
// When operator disconnects with build running
{
  type: 'room:operator_disconnected',
  buildId: string,
  action: 'pause_build' // build auto-pauses
}

// When operator reconnects
{
  type: 'room:operator_reconnected',
  buildId: string,
  action: 'resume_available' // can resume
}
```

---

## Bandwidth Management

### Output Streaming Throttling

Agent output can be verbose. Throttle to prevent client overload.

```typescript
// Server-side throttling
class OutputThrottler {
  private buffer: string = '';
  private lastFlush = Date.now();
  private minInterval = 50; // ms

  append(chunk: string): void {
    this.buffer += chunk;
    this.maybeFlush();
  }

  private maybeFlush(): void {
    const now = Date.now();
    if (now - this.lastFlush >= this.minInterval) {
      this.emit('output', this.buffer);
      this.buffer = '';
      this.lastFlush = now;
    }
  }
}
```

### Large Artifact Handling

Artifacts > 100KB are not sent via WebSocket.

```typescript
// Event includes URL, not content
{
  type: 'agent:complete',
  agent: 'pixel',
  artifact: {
    id: 'artifact-123',
    type: 'component',
    size: 245000, // bytes
    contentUrl: '/api/artifacts/artifact-123/content', // fetch via HTTP
    preview: '// First 500 characters...' // small preview for UI
  }
}
```

---

## Security

### Authentication

WebSocket connections require authentication token.

```typescript
// Token passed as query parameter (HTTPS encrypts)
const ws = new WebSocket(`wss://olympus.app/ws/build/${buildId}?token=${authToken}`);

// Server validates token before accepting connection
// Invalid token → immediate close with 4001 code
```

### Authorization

```typescript
// Server checks on every command
function authorizeCommand(connectionId: string, command: ClientCommand): boolean {
  const connection = connections.get(connectionId);

  // Only operators can send commands
  if (connection.role !== 'operator') {
    return false;
  }

  // Command must be for the connected build
  if (command.buildId !== connection.buildId) {
    return false;
  }

  return true;
}
```

### Rate Limiting

```typescript
// Per-connection command rate limit
const commandLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 1000, // 10 commands per second
});

function handleCommand(connectionId: string, command: ClientCommand): void {
  if (!commandLimiter.check(connectionId)) {
    sendError(connectionId, { code: 'RATE_LIMITED', retryAfter: 1000 });
    return;
  }
  // process command
}
```

---

## Monitoring

### Metrics Exposed

| Metric | Description |
|--------|-------------|
| `ws_connections_active` | Current open connections |
| `ws_messages_sent_total` | Total messages sent (by type) |
| `ws_messages_received_total` | Total messages received (by type) |
| `ws_reconnections_total` | Total reconnection attempts |
| `ws_latency_ms` | Round-trip latency (heartbeat) |
| `ws_rooms_active` | Active build rooms |

### Health Check

```typescript
// HTTP endpoint for load balancer
GET /health/ws

{
  "status": "healthy",
  "connections": 42,
  "rooms": 5,
  "oldestConnection": "2026-01-20T11:00:00Z"
}
```

---

## Uncertainty Statement

**What remains uncertain:**

1. Whether to use Socket.io (features) vs raw WebSocket (simplicity)
2. Optimal output throttle interval (50ms may be too fast or slow)
3. Whether to support WebSocket compression (CPU vs bandwidth tradeoff)
4. Room persistence strategy (Redis vs in-memory with recovery)

These are implementation details. The contract is stable.

---

*The WebSocket is the nervous system. Every thought in the server reaches the client through this channel.*
