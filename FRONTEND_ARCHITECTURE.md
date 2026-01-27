# FRONTEND_ARCHITECTURE.md

## Frontend State Model and Event Flow

**Document Type:** Architecture Artifact
**Phase:** 3 - Architecture
**Created:** 2026-01-20
**Author:** OLYMPUS Self-Build

---

## Architectural Principle

The frontend is a **projection** of server state, not an independent system.

- Server is the source of truth
- Client derives all state from WebSocket events
- Local state exists only for UI concerns (panel sizes, focus)
- No optimistic updates for critical operations

---

## State Architecture

### State Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: UI State (local only)                                  │
│ - Panel dimensions                                              │
│ - Focus target                                                  │
│ - Scroll positions                                              │
│ - Modal visibility                                              │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ derived from
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Derived State (computed from Layer 1)                  │
│ - Current phase name                                            │
│ - Active agent name                                             │
│ - Artifact counts by phase                                      │
│ - Total cost                                                    │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ computed from
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Server State (from WebSocket)                          │
│ - Build object                                                  │
│ - Phase statuses                                                │
│ - Agent statuses                                                │
│ - Artifacts                                                     │
│ - Gates                                                         │
│ - Connection status                                             │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ events from
┌─────────────────────────────────────────────────────────────────┐
│ Layer 0: WebSocket Connection                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Tree

```typescript
interface OlympusState {
  // Layer 0: Connection
  connection: {
    status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
    lastEventAt: number | null;
    reconnectAttempts: number;
  };

  // Layer 1: Server State
  build: Build | null;
  phases: Record<PhaseName, PhaseStatus>;
  agents: Record<AgentName, AgentStatus>;
  artifacts: Record<ArtifactId, Artifact>;
  gates: Gate[];
  outputBuffer: OutputLine[];

  // Layer 2: Derived (computed, not stored)
  // currentPhase: PhaseName | null
  // currentAgent: AgentName | null
  // artifactsByPhase: Record<PhaseName, Artifact[]>
  // totalTokens: number
  // totalCost: number

  // Layer 3: UI State
  ui: {
    panels: {
      outputStream: { height: number; scrollLocked: boolean };
      inspector: { width: number };
      artifactIndex: { height: number; collapsed: boolean };
    };
    focus: 'command' | 'output' | 'inspector' | 'index';
    inspector: InspectorState;
    modal: ModalState | null;
    commandHistory: string[];
    commandHistoryIndex: number;
  };
}

interface Build {
  id: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  startedAt: string;
  endedAt: string | null;
  parameters: BuildParameters;
  tokensUsed: number;
  estimatedCost: number;
}

interface PhaseStatus {
  name: PhaseName;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string | null;
  endedAt: string | null;
  agentCount: number;
  completedAgents: number;
}

interface AgentStatus {
  name: AgentName;
  phase: PhaseName;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: string | null;
  endedAt: string | null;
  tokensUsed: number;
  artifactId: string | null;
  error: AgentError | null;
}

interface Artifact {
  id: string;
  agentName: AgentName;
  phase: PhaseName;
  type: ArtifactType;
  content: string;
  validation: {
    status: 'valid' | 'warning' | 'invalid';
    errors: ValidationError[];
  };
  createdAt: string;
  size: number;
}

interface Gate {
  id: string;
  type: 'phase' | 'critical' | 'validation' | 'ship';
  status: 'pending' | 'resolved';
  buildId: string;
  context: GateContext;
  options: GateOption[];
  decision: GateDecision | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface InspectorState {
  mode: 'empty' | 'artifact' | 'agent' | 'phase' | 'error' | 'gate';
  target: string | null; // artifact id, agent name, phase name, etc.
  splitView: boolean;
  secondaryTarget: string | null;
}

interface ModalState {
  type: 'gate' | 'command-palette' | 'settings' | 'history' | 'help';
  data: unknown;
}

type PhaseName = 'discovery' | 'design' | 'architecture' | 'frontend' | 'backend' | 'integration';

type AgentName =
  | 'oracle'
  | 'empathy'
  | 'venture'
  | 'strategos'
  | 'scope'
  | 'palette'
  | 'grid'
  | 'blocks'
  | 'cartographer'
  | 'flow'
  | 'archon'
  | 'datum'
  | 'nexus'
  | 'forge'
  | 'sentinel'
  | 'pixel'
  | 'wire'
  | 'engine'
  | 'keeper'
  | 'bridge'
  | 'notify';
```

---

## State Management

### Technology Choice: Zustand

Why Zustand over alternatives:

| Requirement           | Redux | Context | Zustand |
| --------------------- | ----- | ------- | ------- |
| Minimal boilerplate   | ✗     | ✓       | ✓       |
| Selector performance  | ✓     | ✗       | ✓       |
| DevTools support      | ✓     | ✗       | ✓       |
| TypeScript ergonomics | ✗     | ✓       | ✓       |
| Works outside React   | ✗     | ✗       | ✓       |

Zustand allows WebSocket handlers to update state without React context.

### Store Structure

```typescript
// Single store, sliced by concern
const useStore = create<OlympusState>((set, get) => ({
  // Initial state
  connection: { status: 'disconnected', lastEventAt: null, reconnectAttempts: 0 },
  build: null,
  phases: initialPhaseStatuses(),
  agents: initialAgentStatuses(),
  artifacts: {},
  gates: [],
  outputBuffer: [],
  ui: initialUIState(),

  // Actions grouped by domain
  actions: {
    connection: {
      setConnected: () => set({ connection: { ...get().connection, status: 'connected' } }),
      setDisconnected: () => set({ connection: { ...get().connection, status: 'disconnected' } }),
      // ...
    },
    build: {
      setBuild: (build: Build) => set({ build }),
      updateBuildStatus: (status: Build['status']) =>
        set(state => ({ build: state.build ? { ...state.build, status } : null })),
      // ...
    },
    // ...
  },
}));
```

### Selectors (Derived State)

```typescript
// Selectors are pure functions, memoized with shallow comparison
const selectCurrentPhase = (state: OlympusState): PhaseName | null => {
  const running = Object.values(state.phases).find(p => p.status === 'running');
  return running?.name ?? null;
};

const selectCurrentAgent = (state: OlympusState): AgentName | null => {
  const running = Object.values(state.agents).find(a => a.status === 'running');
  return running?.name ?? null;
};

const selectArtifactsByPhase = (state: OlympusState): Record<PhaseName, Artifact[]> => {
  const result: Record<PhaseName, Artifact[]> = {
    discovery: [],
    design: [],
    architecture: [],
    frontend: [],
    backend: [],
    integration: [],
  };
  Object.values(state.artifacts).forEach(a => {
    result[a.phase].push(a);
  });
  return result;
};

const selectTotalCost = (state: OlympusState): number => {
  return state.build?.estimatedCost ?? 0;
};

const selectPendingGate = (state: OlympusState): Gate | null => {
  return state.gates.find(g => g.status === 'pending') ?? null;
};
```

---

## Event Flow

### Inbound Events (WebSocket → State)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   WebSocket     │────▶│  Event Router   │────▶│   State Store   │
│   Connection    │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   Side Effects  │
                        │  (notifications,│
                        │   sounds, etc)  │
                        └─────────────────┘
```

```typescript
// Event router maps server events to state updates
function routeEvent(event: ServerEvent): void {
  const { actions } = useStore.getState();

  switch (event.type) {
    case 'build:started':
      actions.build.setBuild(event.build);
      break;

    case 'phase:start':
      actions.phases.setPhaseRunning(event.phase);
      break;

    case 'phase:complete':
      actions.phases.setPhaseCompleted(event.phase);
      break;

    case 'agent:start':
      actions.agents.setAgentRunning(event.agent);
      actions.output.append({ type: 'system', text: `[${event.agent}] Starting...` });
      break;

    case 'agent:output':
      actions.output.append({ type: 'agent', agent: event.agent, text: event.chunk });
      break;

    case 'agent:complete':
      actions.agents.setAgentCompleted(event.agent, event.artifactId);
      actions.artifacts.add(event.artifact);
      break;

    case 'agent:failed':
      actions.agents.setAgentFailed(event.agent, event.error);
      actions.output.append({
        type: 'error',
        text: `[${event.agent}] FAILED: ${event.error.message}`,
      });
      break;

    case 'gate:pending':
      actions.gates.addPending(event.gate);
      actions.ui.showModal({ type: 'gate', data: event.gate });
      break;

    case 'cost:update':
      actions.build.updateCost(event.tokens, event.cost);
      break;

    // ... etc
  }
}
```

### Outbound Events (User → Server)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User Action   │────▶│ Command Handler │────▶│   WebSocket     │
│  (click, key)   │     │                 │     │   Connection    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │  Optimistic UI  │
                        │ (where safe)    │
                        └─────────────────┘
```

```typescript
// Commands that affect server state
interface ClientCommand {
  type: 'build:start' | 'build:pause' | 'build:resume' | 'build:cancel' | 'gate:resolve';
  payload: unknown;
}

// Command handler validates and sends
function executeCommand(command: ClientCommand): void {
  const state = useStore.getState();

  // Validate command is valid in current state
  if (!isCommandValid(command, state)) {
    // Show error in command bar
    return;
  }

  // Send to server
  websocket.send(JSON.stringify(command));

  // Optimistic update ONLY for non-critical operations
  if (command.type === 'build:pause') {
    // Safe to show "pausing..." immediately
    useStore.getState().actions.build.updateBuildStatus('pausing');
  }
  // Gate resolutions are NOT optimistic - wait for server confirmation
}
```

---

## Inspector Mode Architecture

The Inspector is a single component with multiple render modes.

### Mode Definition

```typescript
type InspectorMode =
  | { mode: 'empty' }
  | { mode: 'artifact'; artifactId: string }
  | { mode: 'agent'; agentName: AgentName }
  | { mode: 'phase'; phaseName: PhaseName }
  | { mode: 'error'; error: AgentError }
  | { mode: 'gate'; gate: Gate };

// Modes are mutually exclusive - exactly one active at a time
```

### Mode Transitions

```
User clicks artifact in Index ──────▶ Inspector mode = 'artifact'
User clicks phase in Pipeline ──────▶ Inspector mode = 'phase'
User clicks agent in Output ────────▶ Inspector mode = 'agent'
Error occurs ───────────────────────▶ Inspector mode = 'error' (auto)
Gate pending ───────────────────────▶ Inspector mode = 'gate' (auto)
User presses Escape ────────────────▶ Inspector mode = previous or 'empty'
```

### Mode Isolation

Each mode has:

- Its own data requirements (selector)
- Its own render function
- Its own keyboard bindings
- No shared internal state

```typescript
// Inspector component
function Inspector() {
  const inspectorState = useStore(state => state.ui.inspector);

  switch (inspectorState.mode) {
    case 'empty':
      return <EmptyInspector />;
    case 'artifact':
      return <ArtifactInspector artifactId={inspectorState.target!} />;
    case 'agent':
      return <AgentInspector agentName={inspectorState.target as AgentName} />;
    case 'phase':
      return <PhaseInspector phaseName={inspectorState.target as PhaseName} />;
    case 'error':
      return <ErrorInspector />;
    case 'gate':
      return <GateInspector />;
  }
}
```

---

## Component Hierarchy

```
<App>
  <WebSocketProvider>
    <StoreProvider>
      <Cockpit>
        <Header />
        <PipelineBar />
        <MainArea>
          <OutputStream />
          <Resizer orientation="horizontal" />
          <Inspector />
        </MainArea>
        <Resizer orientation="vertical" />
        <ArtifactIndex />
        <CommandBar />
        <ModalOverlay />  {/* Gate, CommandPalette, etc */}
      </Cockpit>
    </StoreProvider>
  </WebSocketProvider>
</App>
```

### Component Responsibilities

| Component     | Responsibilities                      | State Dependencies                          |
| ------------- | ------------------------------------- | ------------------------------------------- |
| Header        | Display status, tokens, cost, time    | build, connection                           |
| PipelineBar   | Display phase progress, handle clicks | phases                                      |
| OutputStream  | Display streaming text, auto-scroll   | outputBuffer                                |
| Inspector     | Display selected item details         | ui.inspector, artifacts/agents/phases/gates |
| ArtifactIndex | List artifacts, handle selection      | artifacts, phases                           |
| CommandBar    | Input commands, show history          | ui.commandHistory                           |
| ModalOverlay  | Display gates, command palette        | ui.modal, gates                             |

---

## Performance Constraints

### Output Stream Virtualization

Output buffer can grow to thousands of lines. Must virtualize.

```typescript
// Only render visible lines + buffer
const VISIBLE_BUFFER = 100; // lines above/below viewport

function OutputStream() {
  const outputBuffer = useStore(state => state.outputBuffer);
  const [scrollTop, setScrollTop] = useState(0);
  const lineHeight = 20; // fixed, monospace

  const startIndex = Math.max(0, Math.floor(scrollTop / lineHeight) - VISIBLE_BUFFER);
  const endIndex = Math.min(outputBuffer.length, startIndex + visibleLines + VISIBLE_BUFFER * 2);
  const visibleLines = outputBuffer.slice(startIndex, endIndex);

  return (
    <div style={{ height: outputBuffer.length * lineHeight }}>
      <div style={{ transform: `translateY(${startIndex * lineHeight}px)` }}>
        {visibleLines.map((line, i) => <OutputLine key={startIndex + i} line={line} />)}
      </div>
    </div>
  );
}
```

### Artifact Content Lazy Loading

Large artifacts are not loaded until inspected.

```typescript
interface Artifact {
  // ... other fields
  content: string | null; // null until loaded
  contentUrl: string; // always present
}

// Load content when artifact is selected
function ArtifactInspector({ artifactId }: { artifactId: string }) {
  const artifact = useStore(state => state.artifacts[artifactId]);
  const [content, setContent] = useState<string | null>(artifact.content);

  useEffect(() => {
    if (!content) {
      fetch(artifact.contentUrl)
        .then(r => r.text())
        .then(setContent);
    }
  }, [artifactId]);

  if (!content) return <Loading />;
  return <CodeViewer content={content} />;
}
```

### State Update Batching

WebSocket events arrive rapidly. Batch updates.

```typescript
// Batch multiple events into single state update
let eventQueue: ServerEvent[] = [];
let flushScheduled = false;

function queueEvent(event: ServerEvent) {
  eventQueue.push(event);
  if (!flushScheduled) {
    flushScheduled = true;
    requestAnimationFrame(flushEvents);
  }
}

function flushEvents() {
  const events = eventQueue;
  eventQueue = [];
  flushScheduled = false;

  // Single state update for all queued events
  useStore.setState(state => {
    let newState = state;
    for (const event of events) {
      newState = applyEvent(newState, event);
    }
    return newState;
  });
}
```

---

## Testing Strategy

### Unit Tests

- Selectors: pure functions, easy to test
- Event routing: given event, assert state change
- Command validation: given state, assert command validity

### Integration Tests

- WebSocket mock: simulate server event sequences
- Assert UI state matches expected after event sequence

### E2E Tests

- Full flow: start build, receive events, resolve gates, complete
- Failure scenarios: disconnect, error recovery

---

## Uncertainty Statement

**What remains uncertain:**

1. Zustand vs Jotai - both fit requirements, need prototype to compare DX
2. Output buffer max size before performance degrades - need benchmarking
3. Whether to use React Server Components for initial state hydration
4. Syntax highlighting library choice (Prism vs Shiki vs Monaco)

These do not block implementation. They are resolved through prototyping.

---

_The frontend is a lens, not a brain. It shows what the server knows._
