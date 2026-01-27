# FAILURE_MODEL.md

## Failure Isolation and Recovery Model

**Document Type:** Architecture Artifact
**Phase:** 3 - Architecture
**Created:** 2026-01-20
**Author:** OLYMPUS Self-Build

---

## Architectural Principle

Failure is **explicit, isolated, and recoverable**.

- No silent failures
- No cascading failures (one agent failing does not kill the build)
- No data loss on failure
- No automatic recovery without operator awareness
- Every failure produces actionable information

---

## Failure Taxonomy

### Level 1: Agent Failure (Contained)

An individual agent fails to produce output.

```
┌─────────────────────────────────────────────────────────────────┐
│ AGENT FAILURE                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Scope: Single agent                                              │
│ Impact: Agent artifact missing                                   │
│ Build status: Continues (if non-critical) or Paused (if critical)│
│ Data loss: None (previous artifacts preserved)                   │
└─────────────────────────────────────────────────────────────────┘
```

**Causes:**
- LLM rate limit exceeded
- LLM returned invalid output
- LLM timeout
- Validation failed
- Internal error in agent logic

**Response matrix:**

| Agent Priority | Failure Type | System Response |
|----------------|--------------|-----------------|
| Critical | Any | Build PAUSES, Gate opens |
| Important | Recoverable | Gate opens with retry option |
| Important | Unrecoverable | Gate opens with skip option |
| Optional | Any | Log warning, continue build |

### Level 2: Phase Failure (Propagated)

A phase cannot complete due to agent failures.

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE FAILURE                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Scope: Entire phase                                              │
│ Impact: Downstream phases affected                               │
│ Build status: Paused                                             │
│ Data loss: None (completed agents preserved)                     │
└─────────────────────────────────────────────────────────────────┘
```

**Causes:**
- Critical agent in phase failed
- Too many agents failed (> 50%)
- Phase timeout exceeded

**Response:**
- Build pauses
- Gate opens with options: Retry phase, Skip phase (if allowed), Abort build

### Level 3: Infrastructure Failure (System-wide)

Backend system becomes unavailable.

```
┌─────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE FAILURE                                           │
├─────────────────────────────────────────────────────────────────┤
│ Scope: All builds                                                │
│ Impact: No new work can proceed                                  │
│ Build status: All running builds paused                          │
│ Data loss: None (last committed state preserved)                 │
└─────────────────────────────────────────────────────────────────┘
```

**Causes:**
- Database unavailable
- Object storage unavailable
- All LLM providers unavailable
- Server crash

**Response:**
- All active builds auto-pause
- Clients receive disconnect event
- On recovery: Clients reconnect, builds can resume

### Level 4: Client Failure (Isolated)

Client loses connection or crashes.

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT FAILURE                                                   │
├─────────────────────────────────────────────────────────────────┤
│ Scope: Single client                                             │
│ Impact: Operator loses visibility                                │
│ Build status: Continues (observer) or Pauses (operator)          │
│ Data loss: None                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Causes:**
- Network disconnection
- Browser tab closed
- Client-side crash

**Response (operator disconnect):**
- Build auto-pauses after 60 seconds
- Event logged: "Operator disconnected, build paused"
- On reconnect: Full state sync, resume available

**Response (observer disconnect):**
- No impact on build
- Reconnect receives full state sync

---

## Failure Detection

### Agent-Level Detection

```typescript
interface AgentExecutionResult {
  success: boolean;
  output?: string;
  error?: AgentError;
  metrics: {
    tokensUsed: number;
    durationMs: number;
    retries: number;
  };
}

interface AgentError {
  code: AgentErrorCode;
  message: string;
  recoverable: boolean;
  retryAfter?: number; // ms
  context: Record<string, unknown>;
}

type AgentErrorCode =
  | 'RATE_LIMIT_EXCEEDED'    // Provider throttling
  | 'TIMEOUT'                 // No response in time
  | 'INVALID_OUTPUT'          // Output doesn't match schema
  | 'VALIDATION_FAILED'       // Output fails semantic validation
  | 'PROVIDER_ERROR'          // LLM returned error
  | 'INTERNAL_ERROR';         // Bug in agent code
```

### Health Checks

```typescript
// Continuous health monitoring
interface HealthStatus {
  database: 'healthy' | 'degraded' | 'unavailable';
  objectStorage: 'healthy' | 'degraded' | 'unavailable';
  llmProviders: Record<ProviderName, ProviderHealth>;
  websocket: 'healthy' | 'degraded' | 'unavailable';
}

interface ProviderHealth {
  status: 'healthy' | 'rate_limited' | 'unavailable';
  remainingQuota?: number;
  resetAt?: string;
  latencyMs?: number;
}

// Health check runs every 10 seconds
// Degraded → Warning in UI
// Unavailable → Builds pause
```

---

## Recovery Procedures

### Agent Recovery

```typescript
async function recoverAgent(buildId: string, agentName: string, decision: 'retry' | 'skip'): Promise<void> {
  if (decision === 'retry') {
    // Reset agent state
    await db.agents.update(buildId, agentName, { status: 'pending', error: null });

    // Re-queue for execution
    await orchestrator.queueAgent(buildId, agentName);

    // Emit event
    emit({ type: 'agent:retry', buildId, agentName });
  } else {
    // Mark as skipped
    await db.agents.update(buildId, agentName, { status: 'skipped' });

    // Create placeholder artifact (if needed by downstream)
    await createPlaceholderArtifact(buildId, agentName);

    // Emit event
    emit({ type: 'agent:skipped', buildId, agentName });
  }
}
```

### Build Recovery (after crash)

```typescript
async function recoverBuild(buildId: string): Promise<BuildRecoveryResult> {
  // 1. Load last known state from database
  const build = await db.builds.findById(buildId);
  const phases = await db.phases.findByBuild(buildId);
  const agents = await db.agents.findByBuild(buildId);

  // 2. Determine recovery point
  const lastCompletedPhase = phases
    .filter(p => p.status === 'completed')
    .sort((a, b) => a.order - b.order)
    .pop();

  const currentPhase = phases.find(p => p.status === 'running');

  // 3. Identify incomplete agents
  const incompleteAgents = agents.filter(a =>
    a.status === 'running' || (a.status === 'pending' && a.phase === currentPhase?.name)
  );

  // 4. Return recovery options
  return {
    buildId,
    lastCompletedPhase: lastCompletedPhase?.name,
    currentPhase: currentPhase?.name,
    incompleteAgents: incompleteAgents.map(a => a.name),
    options: [
      { action: 'resume', description: 'Continue from last checkpoint' },
      { action: 'restart_phase', description: `Restart ${currentPhase?.name} phase` },
      { action: 'abort', description: 'Abort and keep artifacts' },
    ],
  };
}
```

### WebSocket Recovery

```typescript
class ResilientWebSocket {
  private socket: WebSocket | null = null;
  private lastSequence = 0;
  private reconnecting = false;

  async connect(): Promise<void> {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = async () => {
      if (this.lastSequence > 0) {
        // Recovering from disconnect
        this.socket.send(JSON.stringify({
          type: 'sync:recover',
          lastSequence: this.lastSequence,
        }));
      }
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'sync:full' || data.type === 'sync:incremental') {
        // State recovery
        this.handleSync(data);
      } else if (data.type === 'event') {
        // Normal event
        if (data.sequence > this.lastSequence) {
          this.lastSequence = data.sequence;
          this.handleEvent(data.payload);
        }
      }
    };

    this.socket.onclose = () => {
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };
  }
}
```

---

## Failure Communication

### Error Message Contract

Every error shown to the user must include:

```typescript
interface UserFacingError {
  // What happened (past tense, factual)
  what: string;

  // Why it happened (if known)
  why: string | null;

  // What the user can do
  options: ErrorOption[];

  // Technical details (expandable)
  technical: {
    code: string;
    timestamp: string;
    buildId: string;
    agentId?: string;
    stackTrace?: string;
  };
}

interface ErrorOption {
  action: string;
  label: string;
  description: string;
  recommended: boolean;
}
```

### Example Error Messages

**Good:**
```
WHAT: Agent "pixel" failed to generate ContextualChat component.
WHY: Groq API rate limit exceeded. All 6 API keys exhausted within 66 seconds.

OPTIONS:
  [Retry] - Wait 60 seconds, then retry with fresh quota (recommended)
  [Skip] - Continue without ContextualChat (build may be incomplete)
  [Abort] - End build, keep 15 completed artifacts

TECHNICAL:
  Code: RATE_LIMIT_EXCEEDED
  Provider: groq
  Model: llama-3.3-70b-versatile
  Tokens consumed: 67,464
```

**Bad:**
```
Something went wrong. Please try again.
```

---

## Failure Isolation Boundaries

### Agent Isolation

Agents run in isolated execution contexts.

```typescript
// Each agent execution is independent
async function executeAgent(agent: AgentConfig, context: BuildContext): Promise<AgentResult> {
  const timeout = agent.timeoutMs || 120000; // 2 minutes default

  try {
    // Timeout wrapper
    const result = await withTimeout(
      agent.execute(context),
      timeout,
      new TimeoutError(`Agent ${agent.name} exceeded ${timeout}ms timeout`)
    );

    // Validate output
    const validation = await validateAgentOutput(agent.schema, result.output);

    return {
      success: validation.valid,
      output: result.output,
      validation,
      metrics: result.metrics,
    };
  } catch (error) {
    // Error is contained to this agent
    return {
      success: false,
      error: normalizeError(error),
      metrics: { tokensUsed: 0, durationMs: 0, retries: 0 },
    };
  }
}
```

### Phase Isolation

Phases are checkpoints. Completing a phase commits progress.

```typescript
async function executePhase(phase: PhaseName, buildContext: BuildContext): Promise<PhaseResult> {
  const agents = getAgentsForPhase(phase);
  const results: Map<AgentName, AgentResult> = new Map();

  for (const agent of agents) {
    const result = await executeAgent(agent, buildContext);
    results.set(agent.name, result);

    // Persist immediately after each agent
    await persistAgentResult(buildContext.buildId, agent.name, result);

    // Check if we should stop
    if (!result.success && agent.priority === 'critical') {
      // Phase cannot continue
      return {
        success: false,
        completedAgents: Array.from(results.keys()),
        failedAgent: agent.name,
        reason: 'CRITICAL_AGENT_FAILED',
      };
    }
  }

  // Phase complete - commit checkpoint
  await commitPhaseCheckpoint(buildContext.buildId, phase);

  return {
    success: true,
    completedAgents: Array.from(results.keys()),
  };
}
```

### Build Isolation

Builds are fully isolated from each other.

```typescript
// Each build has its own:
// - Database records (build_id foreign key on everything)
// - Object storage prefix (builds/{build_id}/*)
// - WebSocket room
// - Execution context

// One build failing does not affect other builds
// One build's rate limits do not affect other builds (different quotas)
```

---

## Graceful Degradation (Forbidden)

OLYMPUS does **not** gracefully degrade. Here's why:

| Scenario | Graceful Degradation | OLYMPUS Approach |
|----------|---------------------|------------------|
| LLM slow | Use cached result | PAUSE, wait for operator |
| Agent fails | Use placeholder | PAUSE, gate opens |
| Provider down | Silent fallback | PAUSE, explicit fallback decision |
| Validation fails | Accept anyway | PAUSE, operator decides |

**Rationale:** Graceful degradation hides problems. Users don't know what they're getting. OLYMPUS surfaces every decision point.

---

## Failure Audit Trail

Every failure is permanently logged.

```typescript
interface FailureAuditEntry {
  id: string;
  buildId: string;
  timestamp: string;

  level: 'agent' | 'phase' | 'infrastructure' | 'client';
  severity: 'warning' | 'error' | 'critical';

  what: string;
  why: string | null;
  context: Record<string, unknown>;

  resolution: {
    action: string;
    resolvedBy: string | null; // null for auto-recovery
    resolvedAt: string;
  } | null;
}

// Query: "Show me all failures for this build"
// Query: "Show me all unresolved failures"
// Query: "Show me rate limit failures in the last hour"
```

---

## Recovery Testing

### Chaos Engineering Scenarios

| Scenario | Injection | Expected Behavior |
|----------|-----------|-------------------|
| Database fails mid-build | Kill PostgreSQL connection | Build pauses, resumes on reconnect |
| LLM provider fails | Return 500 for all requests | Fallback to next provider |
| All providers fail | Block all LLM requests | Build pauses with explicit message |
| Server crashes | Kill process | Builds pause, recoverable on restart |
| Client disconnects | Close WebSocket | Operator build pauses, observer no impact |
| Network partition | Block all traffic | Timeouts trigger appropriate failures |

### Recovery Verification

```typescript
// Automated test: crash and recover
async function testCrashRecovery() {
  // 1. Start a build
  const buildId = await startBuild(testParams);

  // 2. Wait until phase 2
  await waitForPhase(buildId, 'design');

  // 3. Simulate crash
  await crashServer();

  // 4. Restart server
  await startServer();

  // 5. Verify recovery
  const recovered = await recoverBuild(buildId);
  assert(recovered.lastCompletedPhase === 'discovery');
  assert(recovered.incompleteAgents.length > 0);

  // 6. Resume and complete
  await resumeBuild(buildId);
  await waitForCompletion(buildId);

  // 7. Verify no data loss
  const artifacts = await getArtifacts(buildId);
  assert(artifacts.length === 21);
}
```

---

## Uncertainty Statement

**What remains uncertain:**

1. Optimal timeout values for agents (too short = false failures, too long = wasted time)
2. Whether to auto-pause on operator disconnect or continue for N minutes
3. How long to retain failure audit logs (storage cost vs. debugging value)
4. Whether to expose failure metrics to users (could be overwhelming)

These are tunable parameters. The failure model is fixed.

---

*Failure is not the enemy. Hidden failure is the enemy.*
