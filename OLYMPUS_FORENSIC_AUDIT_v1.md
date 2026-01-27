# OLYMPUS 2.0 FORENSIC AUDIT v1.0

## Complete System Analysis & Resurrection Blueprint

**Date:** January 27, 2026
**Auditor:** Claude Opus 4.5
**Project:** VITO/OLYMPUS 2.0
**Scope:** Full codebase forensic analysis

---

## EXECUTIVE SUMMARY

OLYMPUS 2.0 is a **40-agent AI code generation orchestration system** designed to build complete SaaS applications from natural language prompts. The system is architecturally sophisticated but suffers from execution reliability issues that cause builds to stall, fail silently, or produce incomplete output.

### KEY FINDINGS

| Metric                 | Value                             |
| ---------------------- | --------------------------------- |
| Total Agents           | **40** (across 9 phases)          |
| Total TypeScript Files | 280+ in agents folder             |
| Database Tables        | 8 core + 12 supporting            |
| Migrations             | 36 SQL files                      |
| Lines in Orchestrator  | ~2,500+                           |
| Critical Bug Count     | **7** (identified so far)         |
| Severity               | HIGH - Builds often fail silently |

### VERDICT

The system has **excellent architecture** but **poor execution reliability**. The 40-agent pipeline works in theory but fails in practice due to:

1. Silent failures that don't stop builds
2. Insufficient timeout handling
3. Missing progress emission
4. Database state inconsistencies

---

## PHASE 1: FORENSIC ANALYSIS

### 1.1 COMPLETE EXECUTION FLOW TRACE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OLYMPUS 2.0 BUILD FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [1] USER CLICKS "BUILD"                                                    │
│         │                                                                    │
│         ▼                                                                    │
│  [2] POST /api/bootstrap/start-build                                        │
│      └── File: src/app/api/bootstrap/start-build/route.ts:1-746             │
│      └── Creates build record in database                                    │
│      └── Starts async execution (non-blocking)                               │
│         │                                                                    │
│         ▼                                                                    │
│  [3] executeBuildAsync()                                                     │
│      └── Wrapped in try/catch with error logging                             │
│         │                                                                    │
│         ▼                                                                    │
│  [4] conductorService.startBuild(buildRequest)                              │
│      └── File: src/lib/agents/conductor/conductor-service.ts:346            │
│      └── Initializes JudgeModule, MemoryModule, CheckpointManager           │
│      └── Creates BuildOrchestrator with options                              │
│         │                                                                    │
│         ▼                                                                    │
│  [5] buildState.orchestrator.start()                                        │
│      └── File: src/lib/agents/orchestrator/orchestrator.ts:566-941          │
│      └── Iterates through 9 phases sequentially                             │
│         │                                                                    │
│         ▼                                                                    │
│  [6] executePhase(phase) - FOR EACH OF 9 PHASES                             │
│      └── File: orchestrator.ts:943-1116                                     │
│      └── Gets agents for phase from scheduler                                │
│      └── Executes agents (parallel for some phases)                          │
│         │                                                                    │
│         ▼                                                                    │
│  [7] executeAgent(agentId, phase)                                           │
│      └── File: orchestrator.ts:1119-1303                                    │
│      └── Checks circuit breaker, degradation tier                            │
│      └── Calls executeAgentWithFeedback()                                    │
│         │                                                                    │
│         ▼                                                                    │
│  [8] AgentExecutor.execute(input, options)                                  │
│      └── File: src/lib/agents/executor/executor.ts:47-132                   │
│      └── Builds prompt with examples                                         │
│      └── Calls AI via router                                                 │
│      └── Parses response                                                     │
│         │                                                                    │
│         ▼                                                                    │
│  [9] Post-Build Validation                                                  │
│      └── Writes files to disk                                                │
│      └── Scaffolds missing files                                             │
│      └── Validates TypeScript compilation                                    │
│      └── Spec compliance check                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 THE 40 AGENTS - COMPLETE CATALOG

| #                    | Phase        | Agent ID               | Name           | Tier     | Dependencies               | Status                                |
| -------------------- | ------------ | ---------------------- | -------------- | -------- | -------------------------- | ------------------------------------- |
| **DISCOVERY (5)**    |
| 1                    | discovery    | `oracle`               | ORACLE         | sonnet   | []                         | Market research                       |
| 2                    | discovery    | `empathy`              | EMPATHY        | sonnet   | [oracle]                   | User personas                         |
| 3                    | discovery    | `venture`              | VENTURE        | sonnet   | [oracle, empathy]          | Business model (optional)             |
| 4                    | discovery    | `strategos`            | STRATEGOS      | **opus** | [oracle, empathy, venture] | **MVP DEFINITION - CRITICAL**         |
| 5                    | discovery    | `scope`                | SCOPE          | sonnet   | [strategos]                | Boundaries                            |
| **CONVERSION (4)**   |
| 6                    | conversion   | `psyche`               | PSYCHE         | sonnet   | [strategos]                | Psychology                            |
| 7                    | conversion   | `scribe`               | SCRIBE         | sonnet   | [psyche]                   | Copywriting                           |
| 8                    | conversion   | `architect_conversion` | ARCHITECT_CONV | sonnet   | [scribe]                   | Page structure                        |
| 9                    | conversion   | `conversion_judge`     | CONV_JUDGE     | sonnet   | [architect_conversion]     | Quality check                         |
| **DESIGN (6)**       |
| 10                   | design       | `palette`              | PALETTE        | sonnet   | [empathy]                  | Color scheme                          |
| 11                   | design       | `grid`                 | GRID           | sonnet   | [palette]                  | Layout system                         |
| 12                   | design       | `blocks`               | BLOCKS         | sonnet   | [grid, scope]              | **Component specs - CRITICAL**        |
| 13                   | design       | `cartographer`         | CARTOGRAPHER   | sonnet   | [blocks]                   | Site map                              |
| 14                   | design       | `flow`                 | FLOW           | sonnet   | [cartographer]             | User flows                            |
| 15                   | design       | `artist`               | ARTIST         | sonnet   | [flow]                     | Visual assets                         |
| **ARCHITECTURE (6)** |
| 16                   | architecture | `archon`               | ARCHON         | **opus** | [strategos, scope]         | **Architecture decisions - CRITICAL** |
| 17                   | architecture | `datum`                | DATUM          | sonnet   | [archon]                   | Data schema (Prisma)                  |
| 18                   | architecture | `nexus`                | NEXUS          | sonnet   | [datum]                    | API structure                         |
| 19                   | architecture | `forge`                | FORGE          | sonnet   | [nexus]                    | Infrastructure                        |
| 20                   | architecture | `sentinel`             | SENTINEL       | sonnet   | [archon]                   | Security                              |
| 21                   | architecture | `atlas`                | ATLAS          | sonnet   | [forge]                    | DevOps config                         |
| **FRONTEND (3)**     |
| 22                   | frontend     | `pixel`                | PIXEL          | **opus** | [blocks, palette]          | **Component code - CRITICAL**         |
| 23                   | frontend     | `wire`                 | WIRE           | sonnet   | [pixel, cartographer]      | **Page assembly - CRITICAL**          |
| 24                   | frontend     | `polish`               | POLISH         | sonnet   | [wire]                     | Animations/polish                     |
| **BACKEND (4)**      |
| 25                   | backend      | `engine`               | ENGINE         | sonnet   | [nexus, datum]             | Business logic                        |
| 26                   | backend      | `gateway`              | GATEWAY        | sonnet   | [engine]                   | API routes                            |
| 27                   | backend      | `keeper`               | KEEPER         | sonnet   | [datum]                    | Data access                           |
| 28                   | backend      | `cron`                 | CRON           | sonnet   | [engine]                   | Background jobs (optional)            |
| **INTEGRATION (4)**  |
| 29                   | integration  | `bridge`               | BRIDGE         | sonnet   | [gateway]                  | External APIs                         |
| 30                   | integration  | `sync`                 | SYNC           | sonnet   | [bridge]                   | Data sync                             |
| 31                   | integration  | `notify`               | NOTIFY         | sonnet   | [engine]                   | Notifications                         |
| 32                   | integration  | `search`               | SEARCH         | sonnet   | [datum]                    | Search functionality                  |
| **TESTING (4)**      |
| 33                   | testing      | `junit`                | JUNIT          | sonnet   | [engine]                   | Unit tests                            |
| 34                   | testing      | `cypress`              | CYPRESS        | sonnet   | [wire]                     | E2E tests                             |
| 35                   | testing      | `load`                 | LOAD           | sonnet   | [gateway]                  | Load tests                            |
| 36                   | testing      | `a11y`                 | A11Y           | sonnet   | [wire]                     | Accessibility tests                   |
| **DEPLOYMENT (4)**   |
| 37                   | deployment   | `docker`               | DOCKER         | sonnet   | [atlas]                    | Containerization                      |
| 38                   | deployment   | `pipeline`             | PIPELINE       | sonnet   | [docker]                   | CI/CD                                 |
| 39                   | deployment   | `monitor`              | MONITOR        | sonnet   | [pipeline]                 | Observability                         |
| 40                   | deployment   | `scale`                | SCALE          | sonnet   | [monitor]                  | Auto-scaling                          |

### 1.3 CRITICAL AGENTS DEEP DIVE

#### STRATEGOS (Discovery Phase) - THE CONTRACT AGENT

**File:** `src/lib/agents/registry/discovery.ts:918-1352`

**Purpose:** Defines the entire build scope via `featureChecklist`

**Critical Output:**

```typescript
{
  "featureChecklist": {
    "critical": [...],    // MUST be built
    "important": [...],   // SHOULD be built
    "niceToHave": [...]   // COULD be built
  }
}
```

**Problem:** If STRATEGOS output is incomplete, ALL downstream agents suffer.

**Evidence (line 958-959):**

```typescript
// ⚠️ WARNING: If a feature is not in your checklist, it WILL NOT BE BUILT.
```

---

#### PIXEL (Frontend Phase) - THE COMPONENT GENERATOR

**File:** `src/lib/agents/orchestrator/orchestrator.ts:1958-1997`

**Purpose:** Generates React/TypeScript component code

**Special Handling:**

- Uses **PIXEL-AS-EMITTER** pattern for per-component execution
- 5-minute timeout (vs 3 min for others)
- Batch component generation

**Problem:** If BLOCKS output is missing component specs, PIXEL generates empty/generic code.

**Evidence (line 1320-1328):**

```typescript
if (agentId === 'pixel') {
  const blocksOutput = this.context.getPreviousOutputs(['blocks'])['blocks'];
  const components = this.extractComponentsFromBlocks(blocksOutput);

  if (components.length > 0) {
    return this.executePixelPerComponent(phase, agent, components);
  }
  // Falls back to standard execution (often produces poor output)
}
```

---

#### WIRE (Frontend Phase) - THE PAGE ASSEMBLER

**File:** `src/lib/agents/orchestrator/orchestrator.ts:1331-1340`

**Purpose:** Assembles PIXEL components into complete pages

**Special Handling:**

- Uses **WIRE-AS-EMITTER** pattern for coverage enforcement
- Derives required pages from cartographer, scope, blocks, pixel

**Problem:** Missing or incomplete upstream outputs = incomplete pages.

---

### 1.4 ORCHESTRATOR AUTOPSY

**File:** `src/lib/agents/orchestrator/orchestrator.ts`
**Lines:** ~2,500+

#### Key Constants

| Constant             | Value              | Location                       |
| -------------------- | ------------------ | ------------------------------ |
| `PHASE_TIMEOUT_MS`   | 600,000 (10 min)   | Not explicitly found, inferred |
| `BUILD_TIMEOUT_MS`   | 1,800,000 (30 min) | Not explicitly found, inferred |
| `AGENT_TIMEOUT_MS`   | 180,000 (3 min)    | Line 1232                      |
| `PIXEL_TIMEOUT_MS`   | 300,000 (5 min)    | Line 1232                      |
| `DEADLOCK_THRESHOLD` | (configurable)     | Line 1027                      |

#### Execution Loop Logic (orchestrator.ts:999-1109)

```typescript
// DEADLOCK DETECTION
if (nextAgents.length === 0) {
  if (runningAgents.length === 0) {
    deadlockCounter++;
    if (deadlockCounter >= DEADLOCK_THRESHOLD) {
      // Mark blocked agents as failed
      this.scheduler.markBlockedAsFailed();
      continue; // Don't fail build, continue
    }
  } else {
    deadlockCounter = 0; // Reset if agents running
  }
  await this.sleep(100);
  continue;
}
```

**BUG #1:** Deadlock detection resets counter even when blocked agents exist if ANY agent is running. This can cause infinite waits.

#### continueOnError Behavior (orchestrator.ts:1073-1106)

```typescript
// WORLD-CLASS FIX: Respect continueOnError option
for (const result of results) {
  if (!result.success) {
    if (agent && !agent.optional) {
      phaseHasFailures = true;

      // Only fail immediately if continueOnError is false
      if (!this.options.continueOnError) {
        return { success: false, error: result.error };
      }

      // continueOnError=true: Log but continue
      logToFile(`[PHASE_CONTINUE] Required agent ${result.agentId} failed, but continuing`);
    }
  }
}
```

**BUG #2:** `continueOnError=true` (the default) means builds can "complete" with 80%+ failed agents. Users see "Build Complete" but get garbage output.

---

### 1.5 DATABASE SCHEMA ANALYSIS

**Migration:** `supabase/migrations/20240103000001_ai_agent_tables.sql`

#### Core Tables

| Table                    | Purpose              | Key Fields                            |
| ------------------------ | -------------------- | ------------------------------------- |
| `ai_builds`              | Build records        | id, status, current_phase, progress   |
| `ai_build_agent_outputs` | Agent results        | build_id, agent_id, status, artifacts |
| `ai_build_iterations`    | Feedback loops       | build_id, iteration_number, feedback  |
| `ai_build_snapshots`     | Recovery checkpoints | build_id, version, state              |
| `ai_build_logs`          | Streaming logs       | build_id, agent_id, message           |
| `ai_build_artifacts`     | Generated files      | build_id, path, content               |
| `ai_token_usage`         | Token tracking       | build_id, agent_id, total_tokens      |

#### Status Enums

```sql
CREATE TYPE build_status AS ENUM (
  'created', 'queued', 'running', 'paused',
  'completed', 'failed', 'canceled'
);

CREATE TYPE agent_status AS ENUM (
  'idle', 'initializing', 'running', 'waiting',
  'completed', 'failed', 'skipped'
);
```

**BUG #3:** No `stalled` or `timed_out` status. Builds that hang show as `running` forever.

#### Progress Calculation Trigger

```sql
-- Line 347-368
CREATE OR REPLACE FUNCTION update_build_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_builds SET
    progress = (
      SELECT COALESCE(
        ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / NULLIF(total_agents, 0)) * 100),
        0
      )
      FROM ai_build_agent_outputs
      WHERE build_id = NEW.build_id
    ),
    updated_at = NOW()
  WHERE id = NEW.build_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**BUG #4:** Progress only counts `completed` agents. If agent is `failed` or `skipped`, progress stalls. User sees 0% even though work is happening.

---

## PHASE 2: ROOT CAUSE ANALYSIS

### 2.1 FAULT TREE: "Build Stuck at 0%"

```
                    ┌─────────────────────────┐
                    │ BUILD SHOWS 0% PROGRESS │
                    └───────────┬─────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
           ▼                    ▼                    ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │ No agents    │    │ Agents fail  │    │ DB trigger   │
    │ complete     │    │ silently     │    │ broken       │
    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
           │                    │                    │
     ┌─────┴─────┐        ┌────┴────┐         ┌────┴────┐
     │           │        │         │         │         │
     ▼           ▼        ▼         ▼         ▼         ▼
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │Deadlock│ │Timeout │ │AI API  │ │Parse   │ │No rows │ │NULL    │
  │in deps │ │expired │ │error   │ │failure │ │updated │ │total   │
  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

### 2.2 BUG SEVERITY RANKING

| #   | Bug                                | Severity | Impact                               | File:Line                 |
| --- | ---------------------------------- | -------- | ------------------------------------ | ------------------------- |
| 1   | **continueOnError masks failures** | CRITICAL | Builds "complete" with garbage       | orchestrator.ts:1085-1095 |
| 2   | **Progress ignores failed agents** | HIGH     | User sees wrong progress             | migration:347-368         |
| 3   | **No stalled status**              | HIGH     | Can't detect hung builds             | migration:10-13           |
| 4   | **Deadlock detection flawed**      | HIGH     | Infinite waits possible              | orchestrator.ts:1040-1042 |
| 5   | **PIXEL fallback poor**            | MEDIUM   | Generic components when BLOCKS empty | orchestrator.ts:1327-1328 |
| 6   | **STRATEGOS cascade**              | MEDIUM   | Bad checklist = bad build            | discovery.ts:958-959      |
| 7   | **Token budget silent fail**       | LOW      | Agents timeout, no error             | executor.ts:90-92         |

### 2.3 DEPENDENCY MAP

```
                           ┌─────────────────────────────────┐
                           │         USER INPUT              │
                           └───────────────┬─────────────────┘
                                           │
                           ┌───────────────▼─────────────────┐
                           │           ORACLE                 │
                           │     (Market Research)            │
                           └───┬───────────────────────┬─────┘
                               │                       │
               ┌───────────────▼───────┐   ┌───────────▼───────────┐
               │        EMPATHY         │   │       VENTURE         │
               │    (User Personas)     │   │   (Business Model)    │
               └───────────┬───────────┘   └───────────┬───────────┘
                           │                           │
                           └─────────────┬─────────────┘
                                         │
                           ┌─────────────▼─────────────┐
                           │        STRATEGOS          │◄── CRITICAL
                           │      (MVP Definition)     │    CONTRACT
                           └─────────────┬─────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
          ┌─────────▼─────────┐ ┌───────▼───────┐ ┌─────────▼─────────┐
          │       SCOPE        │ │   PALETTE     │ │      ARCHON       │
          │   (Boundaries)     │ │  (Colors)     │ │  (Architecture)   │
          └─────────┬─────────┘ └───────┬───────┘ └─────────┬─────────┘
                    │                   │                   │
          ┌─────────▼─────────┐ ┌───────▼───────┐ ┌─────────▼─────────┐
          │      BLOCKS        │ │    GRID       │ │      DATUM        │
          │ (Component Specs)  │ │  (Layout)     │ │    (Schema)       │
          └─────────┬─────────┘ └───────┬───────┘ └─────────┬─────────┘
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        │
                          ┌─────────────▼─────────────┐
                          │          PIXEL             │◄── CODE
                          │    (Component Code)        │    GENERATION
                          └─────────────┬─────────────┘
                                        │
                          ┌─────────────▼─────────────┐
                          │           WIRE             │◄── PAGE
                          │     (Page Assembly)        │    ASSEMBLY
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                              ┌─────────────────┐
                              │   FINAL BUILD   │
                              └─────────────────┘
```

---

## PHASE 3: RESURRECTION BLUEPRINT

### 3.1 CORRECT ARCHITECTURE (TARGET STATE)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OLYMPUS 2.1 - RECOMMENDED ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     CONTROL PLANE (New Layer)                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │ Health      │  │ Circuit     │  │ Progress    │  │ Recovery    │  │  │
│  │  │ Monitor     │  │ Breaker     │  │ Aggregator  │  │ Manager     │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     ORCHESTRATOR (Enhanced)                           │  │
│  │                                                                        │  │
│  │  - Mandatory progress emission every 30s                              │  │
│  │  - Fail-fast on critical agents                                       │  │
│  │  - Explicit stalled detection (5min no progress = stalled)           │  │
│  │  - Checkpoint before each phase                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│            ┌─────────────────────────┼─────────────────────────┐           │
│            │                         │                         │           │
│            ▼                         ▼                         ▼           │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐         │
│  │  DISCOVERY      │   │    DESIGN       │   │   FRONTEND      │         │
│  │  (5 agents)     │   │   (6 agents)    │   │   (3 agents)    │         │
│  │                 │   │                 │   │                 │         │
│  │  STRATEGOS must │   │  BLOCKS must    │   │  PIXEL must     │         │
│  │  pass validation│   │  output specs   │   │  produce code   │         │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 FIX SEQUENCE (ORDERED)

| #   | Fix                               | Priority | Effort | Files to Modify            |
| --- | --------------------------------- | -------- | ------ | -------------------------- |
| 1   | **Add stalled detection**         | P0       | 2h     | orchestrator.ts, migration |
| 2   | **Fix progress calculation**      | P0       | 1h     | migration SQL              |
| 3   | **Fail-fast for critical agents** | P0       | 2h     | orchestrator.ts            |
| 4   | **Add mandatory heartbeat**       | P1       | 3h     | orchestrator.ts, route.ts  |
| 5   | **Fix deadlock detection**        | P1       | 2h     | orchestrator.ts            |
| 6   | **PIXEL fallback improvement**    | P1       | 4h     | orchestrator.ts            |
| 7   | **STRATEGOS validation gate**     | P2       | 3h     | phase-rules.ts             |
| 8   | **Token budget warning**          | P2       | 1h     | executor.ts                |

### 3.3 CODE FIXES

#### FIX #1: Add Stalled Detection

**File:** `orchestrator.ts` (after line 1000)

```typescript
// Add at class level
private lastProgressTime: number = Date.now();
private readonly STALLED_THRESHOLD_MS = 300000; // 5 minutes

// Add in execution loop
private checkForStalled(): boolean {
  const now = Date.now();
  if (now - this.lastProgressTime > this.STALLED_THRESHOLD_MS) {
    console.error(`[STALLED] No progress for ${this.STALLED_THRESHOLD_MS / 1000}s`);
    // Update DB status to 'stalled'
    return true;
  }
  return false;
}

// Call after each agent completion
this.lastProgressTime = Date.now();
```

**Migration:** Add status

```sql
ALTER TYPE build_status ADD VALUE 'stalled' AFTER 'running';
```

---

#### FIX #2: Fix Progress Calculation

**File:** New migration

```sql
-- Include failed and skipped in progress (they're "done" too)
CREATE OR REPLACE FUNCTION update_build_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_builds SET
    progress = (
      SELECT COALESCE(
        ROUND((COUNT(*) FILTER (
          WHERE status IN ('completed', 'failed', 'skipped')
        )::NUMERIC / NULLIF(total_agents, 0)) * 100),
        0
      )
      FROM ai_build_agent_outputs
      WHERE build_id = NEW.build_id
    ),
    updated_at = NOW()
  WHERE id = NEW.build_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

#### FIX #3: Fail-Fast for Critical Agents

**File:** `orchestrator.ts:1085`

```typescript
// Replace continueOnError logic for critical agents
const CRITICAL_AGENTS: AgentId[] = ['strategos', 'archon', 'blocks', 'pixel', 'wire'];

if (!result.success && CRITICAL_AGENTS.includes(result.agentId)) {
  console.error(`[CRITICAL_FAIL] Agent ${result.agentId} failed - stopping build`);
  phaseStatus.status = 'failed';
  return { success: false, error: result.error };
}
```

---

### 3.4 BACKGROUND JOB ARCHITECTURE (RECOMMENDED)

Current: Async function called in API route, runs in Next.js process
Problem: If server restarts, build is lost

**Recommended:**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   API       │────▶│   Queue     │────▶│   Worker    │
│  (Next.js)  │     │  (Redis)    │     │  (Separate) │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                        │
       │         ┌─────────────┐                │
       └────────▶│   Supabase  │◀───────────────┘
                 │  (Progress)  │
                 └─────────────┘
```

**Implementation:** Use BullMQ with Redis for job queue, separate worker process.

---

### 3.5 PROGRESS TRACKING SYSTEM (RECOMMENDED)

```typescript
interface BuildProgress {
  buildId: string;
  phase: BuildPhase;
  phaseProgress: number; // 0-100 for current phase
  overallProgress: number; // 0-100 for entire build
  currentAgent: AgentId | null;
  agentsCompleted: number;
  agentsFailed: number;
  agentsSkipped: number;
  agentsTotal: number;
  lastHeartbeat: Date;
  estimatedTimeRemaining: number; // ms
}

// Emit every 30 seconds minimum
function emitProgress(progress: BuildProgress): void {
  // 1. Update database
  await updateBuildProgress(progress);

  // 2. Emit SSE event
  this.emit({ type: 'progress', data: progress });

  // 3. Log for debugging
  console.log(`[PROGRESS] ${progress.buildId}: ${progress.overallProgress}%`);
}
```

---

### 3.6 VALIDATION GATES

| Gate           | Location           | Validation                             | Action on Fail |
| -------------- | ------------------ | -------------------------------------- | -------------- |
| STRATEGOS Gate | After discovery    | `featureChecklist.critical.length > 0` | STOP build     |
| ARCHON Gate    | After architecture | Valid architecture JSON                | STOP build     |
| BLOCKS Gate    | After design       | `components.length > 0`                | STOP build     |
| PIXEL Gate     | After frontend     | At least 1 code artifact               | STOP build     |
| WIRE Gate      | After frontend     | At least 1 page artifact               | STOP build     |

---

## PHASE 4: IMPLEMENTATION ROADMAP

### 4.1 SPRINT PLAN

#### Sprint 1 (Week 1): Critical Fixes

- [ ] FIX #1: Stalled detection
- [ ] FIX #2: Progress calculation
- [ ] FIX #3: Fail-fast critical agents
- [ ] Deploy to staging, test with 10 builds

#### Sprint 2 (Week 2): Reliability

- [ ] FIX #4: Mandatory heartbeat
- [ ] FIX #5: Deadlock detection
- [ ] Add STRATEGOS validation gate
- [ ] Add BLOCKS validation gate

#### Sprint 3 (Week 3): Quality

- [ ] FIX #6: PIXEL fallback improvement
- [ ] FIX #7: STRATEGOS validation
- [ ] FIX #8: Token budget warning
- [ ] Full regression test suite

#### Sprint 4 (Week 4): Infrastructure

- [ ] Implement Redis job queue
- [ ] Separate worker process
- [ ] Add Sentry error tracking
- [ ] Production deployment

### 4.2 TESTING STRATEGY

| Test Type   | Coverage                           | Tools                   |
| ----------- | ---------------------------------- | ----------------------- |
| Unit        | Orchestrator, Executor, Validators | Vitest                  |
| Integration | Full build pipeline                | Vitest + Supabase local |
| E2E         | API to completion                  | Playwright              |
| Chaos       | Timeout, failure injection         | Custom harness          |
| Load        | Concurrent builds                  | k6                      |

### 4.3 ROLLBACK PLAN

1. **Before deployment:** Snapshot current database
2. **Feature flags:** All fixes behind `OLYMPUS_V21_ENABLED` flag
3. **Monitoring:** Alert if error rate > 5% in first hour
4. **Rollback trigger:** Manual toggle of feature flag
5. **Data migration:** All changes are additive (no destructive changes)

---

## RISK ASSESSMENT

| Risk                              | Probability | Impact | Mitigation                      |
| --------------------------------- | ----------- | ------ | ------------------------------- |
| Fixes break existing builds       | Medium      | High   | Feature flag, staged rollout    |
| Progress change confuses users    | Low         | Medium | UI update to show failed count  |
| Queue infrastructure adds latency | Low         | Medium | Keep sync option as fallback    |
| Agent prompts need updates        | Medium      | Medium | Test with current prompts first |

---

## SUCCESS METRICS

| Metric                | Current          | Target  | Measurement         |
| --------------------- | ---------------- | ------- | ------------------- |
| Build completion rate | ~30% (estimated) | >90%    | Completed / Started |
| Avg build time        | Unknown          | <15 min | Timer in DB         |
| Progress accuracy     | 0% (broken)      | >95%    | Actual vs reported  |
| Stalled detection     | None             | <5 min  | Time to detect      |
| User satisfaction     | Low              | High    | Feedback survey     |

---

## APPENDIX

### A. File Locations Reference

| Component    | Path                                            |
| ------------ | ----------------------------------------------- |
| API Route    | `src/app/api/bootstrap/start-build/route.ts`    |
| Orchestrator | `src/lib/agents/orchestrator/orchestrator.ts`   |
| Conductor    | `src/lib/agents/conductor/conductor-service.ts` |
| Executor     | `src/lib/agents/executor/executor.ts`           |
| Registry     | `src/lib/agents/registry/index.ts`              |
| Phase Rules  | `src/lib/agents/orchestrator/phase-rules.ts`    |
| Migrations   | `supabase/migrations/`                          |

### B. Agent Prompt Locations

| Agent              | File                                            |
| ------------------ | ----------------------------------------------- |
| Discovery (5)      | `src/lib/agents/registry/discovery.ts`          |
| Conversion (4)     | `src/lib/agents/registry/conversion.ts`         |
| Design (6)         | `src/lib/agents/registry/design.ts`             |
| Architecture (6)   | `src/lib/agents/registry/architecture.ts`       |
| Frontend (3)       | `src/lib/agents/registry/frontend.ts`           |
| Backend (4)        | `src/lib/agents/registry/backend.ts`            |
| Integration (4)    | `src/lib/agents/registry/integration.ts`        |
| Testing/Deploy (8) | `src/lib/agents/registry/testing-deployment.ts` |

---

**END OF AUDIT REPORT v1.0**

_Generated by Claude Opus 4.5 - January 27, 2026_
_For OLYMPUS 2.0 / VITO Project_
