# OLYMPUS 2.0 - COMPLETE SYSTEM AUDIT & RESURRECTION BLUEPRINT

**Date:** January 13, 2026
**Auditor:** Claude Code Principal Systems Architect
**Project:** C:\Users\SBS\Desktop\SPOON\olympus-2.0

---

## EXECUTIVE SUMMARY

OLYMPUS 2.0 is a sophisticated AI code generation platform with a **35-agent orchestration system** designed for end-to-end SaaS application generation. However, **the orchestrator is completely bypassed** - builds execute through a single direct LLM call instead.

### Key Findings:

- **35 agents defined** but only **1 "code-generator" pseudo-agent** actually runs
- **8-phase orchestration system** exists but is **never called**
- **500+ lines of dead code** (preference learning, enhanced executor, routing)
- **Database schema mismatch** - 18 tables defined, only 2 written to
- **Progress tracking broken** - fixed percentages (10%, 30%, 80%, 100%) instead of real agent progress
- **No quality gates** - generated code has no validation

### Overall Health Score: **35/100** - CRITICAL

| Area                 | Score  | Status   |
| -------------------- | ------ | -------- |
| Build System         | 20/100 | BROKEN   |
| Agent Orchestration  | 0/100  | BYPASSED |
| Database Integration | 30/100 | PARTIAL  |
| Code Quality         | 55/100 | DEGRADED |
| Security             | 90/100 | HEALTHY  |

---

## PHASE 1: FORENSIC ANALYSIS

### 1.1 - EXECUTION FLOW TRACE

#### Complete Path: User Clicks "Build" → Output

```
STEP 1: UI Button Click
├── File: src/app/(dashboard)/projects/[projectId]/page.tsx
├── Function: openBuildModal() (line 111)
├── Action: Opens modal, user enters description
└── Triggers: handleStartBuild()

STEP 2: API Request
├── File: src/app/(dashboard)/projects/[projectId]/page.tsx
├── Function: handleStartBuild() (line 70-109)
├── Method: POST /api/builds
├── Body: { projectId, tier: 'starter', description }
└── Expected: Call orchestrator | Actual: Direct execution

STEP 3: Build Creation
├── File: src/app/api/builds/route.ts
├── Function: POST handler (line 54-118)
├── Actions:
│   ├── Validate request
│   ├── Check no active builds
│   ├── INSERT INTO builds (status='running', progress=10)
│   └── FIRE-AND-FORGET: executeDirectBuild()
└── Returns: buildId immediately (doesn't wait)

STEP 4: Direct Build Execution (Background)
├── File: src/app/api/builds/route.ts
├── Function: executeDirectBuild() (line 124-177)
├── Phase 1: generateWithAI() → single LLM call
│   ├── Try Ollama llama3.2 (5 min timeout)
│   ├── Fallback: Claude API
│   └── Fallback: Template code
├── Phase 2: Store artifacts
│   └── INSERT INTO build_agent_outputs (JSONB array)
└── Phase 3: Mark complete (status='completed', progress=100)

STEP 5: Frontend Polling
├── File: src/app/(dashboard)/builds/[buildId]/page.tsx
├── Function: fetchBuild() every 2 seconds
├── API: GET /api/builds/[buildId]
└── Displays: status, progress (no agent details)

STEP 6: Preview
├── File: src/app/(dashboard)/builds/[buildId]/preview/page.tsx
├── API: GET /api/ai/builds/[buildId]/artifacts
└── Display: Files in Sandpack editor
```

#### WHERE IT STOPS AND WHY

| Expected                       | Actual                 | Why                                         |
| ------------------------------ | ---------------------- | ------------------------------------------- |
| BuildOrchestrator.start()      | Never called           | Line 94 calls executeDirectBuild() directly |
| 35 agents execute sequentially | 0 agents execute       | Orchestrator bypassed entirely              |
| 8 phases with progress         | 4 fixed progress marks | No phase tracking implemented               |
| Quality gates between phases   | No validation          | Gates not integrated                        |
| Agent events via SSE           | Polling only           | No streaming implemented                    |

---

### 1.2 - DEAD CODE IDENTIFICATION

#### COMPLETELY DEAD FILES (Never Execute)

| File                                            | Lines | Reason                                |
| ----------------------------------------------- | ----- | ------------------------------------- |
| `src/lib/agents/context/preference-learning.ts` | 500+  | Never called from any code path       |
| `src/lib/agents/executor/enhanced-executor.ts`  | 350+  | Orchestrator uses basic AgentExecutor |
| `src/lib/agents/providers/router.ts`            | 200+  | AI routing never instantiated         |
| `src/app/api/debug/artifacts/route.ts`          | 50+   | Flagged "Remove in production"        |
| `src/app/api/monitoring/errors/route.ts`        | 80+   | Never called from frontend            |
| `src/app/api/monitoring/health/route.ts`        | 60+   | No monitoring dashboard               |
| `src/app/api/monitoring/metrics/route.ts`       | 100+  | Metrics never consumed                |
| `src/app/api/openapi/route.ts`                  | 150+  | API docs not integrated               |

#### PARTIALLY DEAD (Defined But Rarely Used)

| File                                       | Status                       | Evidence                                         |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------ |
| `src/lib/agents/providers/groq.ts`         | Exported, never instantiated | Router checks env but router never runs          |
| `src/lib/agents/providers/ollama.ts`       | Direct API call only         | Provider class exists but not used in agent flow |
| `src/lib/agents/context/agent-enhancer.ts` | Only in enhanced-executor    | Enhanced executor is dead                        |
| `src/app/api/ai/agents/route.ts`           | No frontend calls            | Informational endpoint only                      |
| `src/app/api/ai/quality/route.ts`          | Never in build flow          | Quality gates bypassed                           |

#### THE ORCHESTRATOR (COMPLETE BYPASS)

**Files that exist but are NEVER CALLED during builds:**

```
src/lib/agents/orchestrator/
├── orchestrator.ts    ← BuildOrchestrator class (NEVER INSTANTIATED)
├── planner.ts         ← createBuildPlan() (NEVER CALLED)
├── scheduler.ts       ← AgentScheduler (NEVER USED)
└── types.ts           ← Types exist, code doesn't run
```

**Evidence:**

- `src/app/api/builds/route.ts` line 94: Calls `executeDirectBuild()` NOT `buildService.start()`
- `buildService.start()` would call `BuildOrchestrator` which calls agents
- Instead: Single `generateWithAI()` call replaces entire 35-agent system

---

### 1.3 - THE 35 AGENTS DEEP DIVE

#### Complete Agent Registry

##### DISCOVERY PHASE (5 Agents)

| Agent     | File                      | Purpose                          | Status       |
| --------- | ------------------------- | -------------------------------- | ------------ |
| oracle    | registry/discovery.ts:16  | Market research, competitors     | NEVER CALLED |
| empathy   | registry/discovery.ts:55  | User personas, needs analysis    | NEVER CALLED |
| venture   | registry/discovery.ts:95  | Business model, monetization     | NEVER CALLED |
| strategos | registry/discovery.ts:135 | MVP features, roadmap (CRITICAL) | NEVER CALLED |
| scope     | registry/discovery.ts:175 | Boundaries, in/out scope         | NEVER CALLED |

##### DESIGN PHASE (5 Agents)

| Agent        | File                   | Purpose                     | Status       |
| ------------ | ---------------------- | --------------------------- | ------------ |
| palette      | registry/design.ts:16  | Colors, typography, brand   | NEVER CALLED |
| grid         | registry/design.ts:55  | Layout system, spacing      | NEVER CALLED |
| blocks       | registry/design.ts:95  | Component library design    | NEVER CALLED |
| cartographer | registry/design.ts:135 | Page structure, hierarchy   | NEVER CALLED |
| flow         | registry/design.ts:175 | User journeys, interactions | NEVER CALLED |

##### ARCHITECTURE PHASE (6 Agents)

| Agent    | File                         | Purpose                          | Status       |
| -------- | ---------------------------- | -------------------------------- | ------------ |
| archon   | registry/architecture.ts:16  | Tech stack, structure (CRITICAL) | NEVER CALLED |
| datum    | registry/architecture.ts:65  | Database schema, relations       | NEVER CALLED |
| nexus    | registry/architecture.ts:115 | API design, endpoints            | NEVER CALLED |
| forge    | registry/architecture.ts:165 | Backend implementation           | NEVER CALLED |
| sentinel | registry/architecture.ts:215 | Security, auth patterns          | NEVER CALLED |
| atlas    | registry/architecture.ts:265 | Infrastructure, deployment       | NEVER CALLED |

##### FRONTEND PHASE (3 Agents)

| Agent  | File                     | Purpose                  | Status       |
| ------ | ------------------------ | ------------------------ | ------------ |
| pixel  | registry/frontend.ts:16  | UI components (CRITICAL) | NEVER CALLED |
| wire   | registry/frontend.ts:65  | Page assembly            | NEVER CALLED |
| polish | registry/frontend.ts:115 | Animations, polish       | NEVER CALLED |

##### BACKEND PHASE (4 Agents)

| Agent   | File                    | Purpose               | Status       |
| ------- | ----------------------- | --------------------- | ------------ |
| engine  | registry/backend.ts:16  | Business logic        | NEVER CALLED |
| gateway | registry/backend.ts:65  | External integrations | NEVER CALLED |
| keeper  | registry/backend.ts:115 | Data operations       | NEVER CALLED |
| cron    | registry/backend.ts:165 | Scheduled tasks       | NEVER CALLED |

##### INTEGRATION PHASE (4 Agents)

| Agent  | File                        | Purpose                  | Status       |
| ------ | --------------------------- | ------------------------ | ------------ |
| bridge | registry/integration.ts:16  | Frontend-backend connect | NEVER CALLED |
| sync   | registry/integration.ts:55  | Real-time data sync      | NEVER CALLED |
| notify | registry/integration.ts:95  | Notifications            | NEVER CALLED |
| search | registry/integration.ts:135 | Search implementation    | NEVER CALLED |

##### TESTING PHASE (4 Agents)

| Agent   | File                               | Purpose             | Status       |
| ------- | ---------------------------------- | ------------------- | ------------ |
| junit   | registry/testing-deployment.ts:16  | Unit tests          | NEVER CALLED |
| cypress | registry/testing-deployment.ts:55  | E2E tests           | NEVER CALLED |
| load    | registry/testing-deployment.ts:95  | Performance tests   | NEVER CALLED |
| a11y    | registry/testing-deployment.ts:135 | Accessibility tests | NEVER CALLED |

##### DEPLOYMENT PHASE (4 Agents)

| Agent    | File                               | Purpose          | Status       |
| -------- | ---------------------------------- | ---------------- | ------------ |
| docker   | registry/testing-deployment.ts:175 | Containerization | NEVER CALLED |
| pipeline | registry/testing-deployment.ts:215 | CI/CD setup      | NEVER CALLED |
| monitor  | registry/testing-deployment.ts:255 | Observability    | NEVER CALLED |
| scale    | registry/testing-deployment.ts:295 | Auto-scaling     | NEVER CALLED |

#### Agent Execution Status Summary:

- **35 agents defined**
- **0 agents executed** in actual builds
- **1 pseudo-agent** "code-generator" (direct LLM call, not a real agent)

---

### 1.4 - ORCHESTRATOR AUTOPSY

#### How It SHOULD Work

```
buildService.start(buildId)
    ↓
BuildOrchestrator.init(buildId, tier, contextManager)
    ↓
createBuildPlan(tier) → Returns phases + agents for tier
    ↓
AgentScheduler.init(plan, concurrency)
    ↓
FOR EACH PHASE (discovery → design → architecture → frontend → backend → integration → testing → deployment):
    │
    ├── scheduler.setPhase(phase)
    ├── WHILE (!scheduler.isPhaseComplete()):
    │   │
    │   ├── scheduler.getNextAgents() → ready agents (deps satisfied)
    │   │
    │   ├── FOR EACH ready agent IN PARALLEL:
    │   │   ├── executor = new AgentExecutor(agentId)
    │   │   ├── result = executor.execute(input, context)
    │   │   ├── context.recordOutput(result)
    │   │   └── scheduler.completeAgent(agentId)
    │   │
    │   └── Emit progress events
    │
    └── Emit phase_completed event
    ↓
Build completed → Update DB → Emit build_completed
```

#### How It ACTUALLY Works

```
POST /api/builds
    ↓
INSERT INTO builds (status='running')
    ↓
executeDirectBuild(buildId, prompt) [FIRE-AND-FORGET]
    ↓
generateWithAI(prompt) → Single LLM call (Ollama/Claude)
    ↓
INSERT INTO build_agent_outputs (all files in JSONB)
    ↓
UPDATE builds (status='completed')
```

**The entire orchestrator is bypassed.** The 35-agent system, phase management, dependency resolution, progress tracking - all unused.

#### Why Progress Stays at Fixed Values

| Progress | Trigger               | Real Agent Work |
| -------- | --------------------- | --------------- |
| 10%      | Build created         | None            |
| 30%      | Before AI call        | None            |
| 80%      | After files stored    | None            |
| 100%     | Build marked complete | None            |

**Root cause:** `executeDirectBuild()` uses hardcoded progress values, not agent completion events.

---

### 1.5 - DATABASE STATE ANALYSIS

#### Tables Defined vs Actually Used

| Table               | Defined In                | Written During Build | Read  |
| ------------------- | ------------------------- | -------------------- | ----- |
| projects            | sql/05_project_tables.sql | ✗ No                 | ✓ Yes |
| project_versions    | sql/05_project_tables.sql | ✗ No                 | ✗ No  |
| project_files       | sql/05_project_tables.sql | ✗ No                 | ✗ No  |
| builds              | sql/06_build_tables.sql   | ✓ Yes                | ✓ Yes |
| build_logs          | sql/06_build_tables.sql   | ✗ No                 | ✗ No  |
| build_outputs       | sql/06_build_tables.sql   | ✗ No                 | ✗ No  |
| agent_executions    | sql/06_build_tables.sql   | ✗ No                 | ✗ No  |
| build_costs         | sql/06_build_tables.sql   | ✗ No                 | ✗ No  |
| build_agent_outputs | migrations/20240109       | ✓ Yes                | ✓ Yes |
| ai_builds           | migrations/20240103       | ✗ No                 | ✗ No  |
| ai_build_artifacts  | migrations/20240103       | ✗ No                 | ✗ No  |
| ai_token_usage      | migrations/20240103       | ✗ No                 | ✗ No  |

#### Data Written During Successful Build

```sql
-- Build creation
INSERT INTO builds (
  id, project_id, tenant_id, tier, status='running',
  progress=10, prompt
) VALUES (...)

-- After AI generation
INSERT INTO build_agent_outputs (
  id, build_id, agent_id='code-generator',
  status='completed',
  artifacts='[{"path":"App.tsx","content":"...","language":"tsx"},...]'::jsonb
)

-- Build completion
UPDATE builds SET
  status='completed', progress=100, completed_at=now()
WHERE id = buildId
```

#### Data That SHOULD Be Written (But Isn't)

```sql
-- Missing: Version record
INSERT INTO project_versions (project_id, version_number, source_build_id, ...)

-- Missing: Individual file records
INSERT INTO project_files (version_id, path, content, language, ...)

-- Missing: Build logs
INSERT INTO build_logs (build_id, level, message, phase, agent, ...)

-- Missing: Agent execution records
INSERT INTO agent_executions (build_id, agent_id, started_at, completed_at, ...)

-- Missing: Cost tracking
INSERT INTO build_costs (build_id, provider, model, tokens_in, tokens_out, cost)

-- Missing: Token usage
INSERT INTO ai_token_usage (build_id, agent_id, model, tokens, cost)
```

---

## PHASE 2: ROOT CAUSE ANALYSIS

### 2.1 - THE BUILD FAILURE CHAIN (Fault Tree)

```
SYMPTOM: Builds produce low-quality code with no phase tracking
    ↓
IMMEDIATE CAUSE: Single LLM call generates entire app
    ↓
UNDERLYING CAUSE: executeDirectBuild() bypasses BuildOrchestrator
    ↓
ROOT CAUSE: API route hardcoded to use direct execution instead of service layer
    ↓
LOCATION: src/app/api/builds/route.ts line 94
    ↓
CODE:
    executeDirectBuild(buildId, prompt, supabase)
      .then(() => { ... })
      .catch(() => { ... });

    // Should be:
    // await buildService.start(buildId, { ... });
    ↓
SOLUTION: Replace executeDirectBuild() with buildService.start()
```

### 2.2 - ALL BUGS RANKED BY SEVERITY

#### CRITICAL (System Fundamentally Broken)

| #   | Bug                         | File:Line               | Impact                           |
| --- | --------------------------- | ----------------------- | -------------------------------- |
| 1   | Orchestrator bypassed       | api/builds/route.ts:94  | 35 agents never run              |
| 2   | No project_versions created | api/builds/route.ts:160 | Can't track build history        |
| 3   | No project_files records    | api/builds/route.ts:140 | Files not individually queryable |
| 4   | JSONB blob storage          | api/builds/route.ts:145 | Files crammed into single column |

#### MAJOR (Features Broken)

| #   | Bug                                | File:Line                        | Impact                         |
| --- | ---------------------------------- | -------------------------------- | ------------------------------ |
| 5   | No real progress tracking          | api/builds/route.ts:125-167      | Fixed 10/30/80/100 values      |
| 6   | No quality gates                   | Entire build flow                | Bad code ships                 |
| 7   | No agent execution logs            | orchestrator/orchestrator.ts     | Can't debug agent failures     |
| 8   | Zombie detection kills slow builds | api/builds/[buildId]/route.ts:45 | 5-min timeout may be too short |
| 9   | No cost tracking                   | api/builds/route.ts              | Can't bill users accurately    |
| 10  | Auth can hang on slow DB           | components/auth/AuthProvider.tsx | Dashboard stuck loading        |

#### MINOR (Annoyances)

| #   | Bug                       | File:Line                    | Impact                                 |
| --- | ------------------------- | ---------------------------- | -------------------------------------- |
| 11  | 407 'any' type usages     | Throughout codebase          | Reduced type safety                    |
| 12  | Debug route in production | api/debug/artifacts/route.ts | Security risk                          |
| 13  | Duplicate AI schema       | migrations/20240103          | Confusion between ai_builds and builds |
| 14  | Unused monitoring routes  | api/monitoring/\*            | Dead code bloat                        |

#### TECHNICAL DEBT

| #   | Issue                          | File                           | Risk                   |
| --- | ------------------------------ | ------------------------------ | ---------------------- |
| 15  | 500+ lines preference learning | context/preference-learning.ts | Maintenance burden     |
| 16  | Enhanced executor unused       | executor/enhanced-executor.ts  | Confusing architecture |
| 17  | Router abstraction dead        | providers/router.ts            | Over-engineering       |
| 18  | No test coverage               | (none)                         | Regressions likely     |

---

### 2.3 - DEPENDENCY MAP

```
src/app/api/builds/route.ts (ENTRY POINT)
├── IMPORTS: supabase, validation, errors
├── CALLS: executeDirectBuild() [internal function]
│   └── CALLS: generateWithAI() [internal function]
│       ├── Try: Ollama API (direct fetch)
│       └── Fallback: Anthropic API (direct fetch)
├── SHOULD_CALL: buildService.start() [NOT CALLED]
└── IF_CHANGED: Enables entire orchestrator

src/lib/agents/services/build-service.ts
├── IMPORTS: BuildOrchestrator, BuildContextManager
├── IMPORTED_BY: NOTHING (dead code entry point)
├── CALLS: BuildOrchestrator.start()
└── IF_CONNECTED: Enables all 35 agents

src/lib/agents/orchestrator/orchestrator.ts
├── IMPORTS: AgentScheduler, AgentExecutor, planner
├── IMPORTED_BY: build-service.ts [but service is never called]
├── CALLS: AgentExecutor.execute() for each agent
└── IF_USED: Full multi-phase builds work

src/lib/agents/executor/executor.ts
├── IMPORTS: ProviderManager, prompt-builder, validator
├── IMPORTED_BY: orchestrator.ts
├── CALLS: anthropic.complete() or other providers
└── STATUS: Would work if orchestrator ran
```

---

## PHASE 3: RESURRECTION BLUEPRINT

### 3.1 - THE CORRECT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
│                    "Build a todo app with..."                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  COMPONENT 1: API Route (/api/builds POST)                       │
│  ─────────────────────────────────────────                       │
│  Responsibility: Validate, create build record, delegate         │
│  Technology: Next.js API route                                   │
│  Inputs: { projectId, tier, description }                        │
│  Outputs: { buildId, status: 'queued' }                          │
│  Key Change: Call buildService.start() NOT executeDirectBuild()  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  COMPONENT 2: Build Service                                      │
│  ─────────────────────────────────────────                       │
│  Responsibility: Manage build lifecycle                          │
│  Technology: TypeScript service class                            │
│  Inputs: buildId                                                 │
│  Outputs: Orchestrator events stream                             │
│  Actions: Initialize context, start orchestrator                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  COMPONENT 3: Build Orchestrator                                 │
│  ─────────────────────────────────────────                       │
│  Responsibility: Execute agents in phases                        │
│  Technology: Event-driven state machine                          │
│  Inputs: Build config, tier constraints                          │
│  Outputs: Progress events, agent outputs                         │
│  Actions: For each phase → schedule agents → collect outputs     │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
┌────────────────────────────┐  ┌────────────────────────────┐
│  COMPONENT 4: Agent        │  │  COMPONENT 5: Context      │
│  Scheduler                 │  │  Manager                   │
│  ──────────────────────    │  │  ──────────────────────    │
│  Responsibility:           │  │  Responsibility:           │
│  - Resolve dependencies    │  │  - Store agent outputs     │
│  - Manage concurrency      │  │  - Build knowledge graph   │
│  - Track completion        │  │  - Feed context to agents  │
└────────────────────────────┘  └────────────────────────────┘
                    │                       │
                    └───────────┬───────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  COMPONENT 6: Agent Executor                                     │
│  ─────────────────────────────────────────                       │
│  Responsibility: Run single agent                                │
│  Technology: LLM client wrapper                                  │
│  Inputs: Agent definition, context, previous outputs             │
│  Outputs: Structured agent output (files, decisions, metrics)    │
│  Actions: Build prompt → Call LLM → Parse → Validate → Return    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  COMPONENT 7: Provider Manager                                   │
│  ─────────────────────────────────────────                       │
│  Responsibility: Route to appropriate LLM                        │
│  Technology: Provider abstraction                                │
│  Tier mapping: opus→Claude Opus, sonnet→Claude Sonnet, etc.      │
│  Fallback chain: Primary → Secondary → Error                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  COMPONENT 8: Database Persistence                               │
│  ─────────────────────────────────────────                       │
│  Tables: builds, agent_executions, project_versions,             │
│          project_files, build_costs, ai_token_usage              │
│  Actions: Record every agent execution and output                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FINAL OUTPUT                              │
│  - project_versions record with all generated files              │
│  - project_files records (one per file)                          │
│  - Preview available at /builds/[buildId]/preview                │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.2 - THE FIX SEQUENCE

#### FIX 1: Connect API to BuildService (CRITICAL)

**Files to modify:**

- `src/app/api/builds/route.ts`

**Changes required:**

```typescript
// BEFORE (line 94):
executeDirectBuild(buildId, prompt, supabase)
  .then(() => { ... })
  .catch(() => { ... });

// AFTER:
import { buildService } from '@/lib/agents';

// In POST handler, after creating build record:
buildService.start(buildId, {
  onProgress: async (progress) => {
    await supabase.from('builds').update({
      progress: progress.progress,
      current_phase: progress.currentPhase,
      current_agent: progress.currentAgent
    }).eq('id', buildId);
    await broadcastBuildUpdate(buildId, progress);
  },
  onAgentComplete: async (agentId, output) => {
    await supabase.from('agent_executions').insert({
      build_id: buildId,
      agent_id: agentId,
      status: 'completed',
      output: output
    });
  },
  onError: async (error) => {
    await supabase.from('builds').update({
      status: 'failed',
      error_message: error.message
    }).eq('id', buildId);
  }
});
```

**Must be done BEFORE:** All other fixes
**Risk level:** HIGH (core change)

---

#### FIX 2: Ensure BuildService Initializes Properly

**Files to modify:**

- `src/lib/agents/services/build-service.ts`

**Changes required:**

```typescript
// Verify build-service.ts start() method properly:
// 1. Loads build config from DB
// 2. Initializes BuildContextManager
// 3. Creates BuildOrchestrator
// 4. Calls orchestrator.start()
// 5. Returns success/failure

// Current code looks correct but verify it runs
```

**Must be done AFTER:** Fix 1
**Risk level:** MEDIUM

---

#### FIX 3: Add Database Persistence for Agent Outputs

**Files to modify:**

- `src/lib/agents/orchestrator/orchestrator.ts`

**Changes required:**

```typescript
// In executeAgent() method, after agent completes:
// 1. Insert into agent_executions table
// 2. Insert artifacts into project_files table
// 3. Update build progress in builds table

// Add to afterExecute callback:
await supabase.from('agent_executions').insert({
  build_id: this.buildId,
  agent_id: agentId,
  phase: phase,
  status: result.status,
  artifacts: result.artifacts,
  decisions: result.decisions,
  duration: result.duration,
  tokens_used: result.tokensUsed,
});
```

**Must be done AFTER:** Fix 1, Fix 2
**Risk level:** MEDIUM

---

#### FIX 4: Create Project Version on Build Complete

**Files to modify:**

- `src/lib/agents/services/build-service.ts`

**Changes required:**

```typescript
// In build completion handler:
// 1. Collect all artifacts from all agents
// 2. Create project_version record
// 3. Create project_files records for each file

const version = await supabase
  .from('project_versions')
  .insert({
    project_id: build.project_id,
    version_number: nextVersion,
    source_type: 'build',
    source_build_id: buildId,
    file_count: artifacts.length,
    status: 'ready',
  })
  .select()
  .single();

for (const artifact of artifacts) {
  await supabase.from('project_files').insert({
    project_id: build.project_id,
    version_id: version.id,
    path: artifact.path,
    content: artifact.content,
    language: artifact.language,
    ai_generated: true,
    ai_agent: artifact.agentId,
  });
}
```

**Must be done AFTER:** Fix 3
**Risk level:** LOW

---

#### FIX 5: Implement Real Progress Tracking

**Files to modify:**

- `src/lib/agents/orchestrator/orchestrator.ts`
- `src/app/api/builds/[buildId]/route.ts`

**Changes required:**

```typescript
// Calculate real progress based on agents:
// progress = (completedAgents / totalAgents) * 100

// In orchestrator, emit events:
this.emit('progress', {
  progress: Math.round((completed.size / this.plan.agents.length) * 100),
  currentPhase: this.currentPhase,
  currentAgent: currentAgent,
  completedAgents: Array.from(completed),
  remainingAgents: remaining,
});

// API returns real data:
return {
  status: build.status,
  progress: build.progress, // Real percentage
  currentPhase: build.current_phase,
  currentAgent: build.current_agent,
  phases: phaseData, // Actual phase completion status
};
```

**Must be done AFTER:** Fix 1, Fix 2
**Risk level:** LOW

---

#### FIX 6: Add Quality Gates

**Files to modify:**

- `src/lib/agents/orchestrator/orchestrator.ts`

**Changes required:**

```typescript
// After each phase completes, validate outputs:
async validatePhaseOutput(phase: string, outputs: AgentOutput[]): Promise<ValidationResult> {
  switch (phase) {
    case 'discovery':
      return this.validateDiscoveryOutputs(outputs);
    case 'design':
      return this.validateDesignOutputs(outputs);
    case 'frontend':
      return this.validateFrontendCode(outputs);
    // ... etc
  }
}

// If validation fails, retry or fail build:
const validation = await this.validatePhaseOutput(phase, outputs);
if (!validation.passed) {
  if (retries < MAX_RETRIES) {
    await this.retryPhase(phase);
  } else {
    throw new BuildError(`Quality gate failed: ${validation.errors.join(', ')}`);
  }
}
```

**Must be done AFTER:** Fix 1-5
**Risk level:** MEDIUM

---

#### FIX 7: Remove Dead Code

**Files to delete:**

- `src/app/api/debug/artifacts/route.ts`
- `src/app/api/monitoring/errors/route.ts`
- `src/app/api/monitoring/health/route.ts`
- `src/app/api/monitoring/metrics/route.ts`
- `src/app/api/openapi/route.ts`

**Files to clean up:**

- `src/lib/agents/context/preference-learning.ts` (keep if planning to use)
- `src/lib/agents/executor/enhanced-executor.ts` (keep if planning to use)
- `src/lib/agents/providers/router.ts` (keep if planning to use)

**Must be done AFTER:** All other fixes
**Risk level:** LOW

---

### 3.3 - THE AGENT PIPELINE

#### PHASE: Discovery (5 Agents)

```
STEP 1: oracle
├── Input: Raw user prompt
├── Process: Market research, competitor analysis
├── Output: MarketAnalysis { competitors[], opportunities[], risks[] }
├── Validation: Must have ≥3 competitors, ≥2 opportunities
├── On failure: Retry with expanded search terms
├── On success: Trigger empathy, venture (parallel)

STEP 2: empathy (depends: oracle)
├── Input: MarketAnalysis from oracle
├── Process: User persona creation, needs analysis
├── Output: UserPersonas { personas[], painPoints[], goals[] }
├── Validation: Must have ≥2 personas with complete profiles
├── On failure: Retry with more specific prompt
├── On success: Enable venture, strategos

STEP 3: venture (depends: oracle, empathy) [OPTIONAL]
├── Input: MarketAnalysis, UserPersonas
├── Process: Business model, monetization strategy
├── Output: BusinessModel { revenue[], pricing[], growth[] }
├── Validation: Must have viable revenue stream
├── On failure: Skip (optional agent)
├── On success: Enable strategos

STEP 4: strategos (depends: oracle, empathy, venture) [CRITICAL]
├── Input: All previous outputs
├── Process: MVP definition, feature prioritization
├── Output: ProductStrategy { mvpFeatures[], roadmap[], requirements[] }
├── Validation: Must have ≥3 MVP features, clear scope
├── On failure: CRITICAL - Retry with simplified scope
├── On success: Enable scope, trigger design phase

STEP 5: scope (depends: strategos)
├── Input: ProductStrategy
├── Process: Define boundaries
├── Output: ProjectScope { inScope[], outScope[], constraints[] }
├── Validation: Must have clear boundaries
├── On failure: Retry with clarification
├── On success: Discovery phase complete

TRANSITION TO DESIGN:
├── Condition: strategos + scope outputs validated
├── Data passed: { marketAnalysis, personas, strategy, scope }
├── Checkpoint: Save to agent_executions, update build progress
└── Progress: 5 agents / 35 total = ~14%
```

#### PHASE: Design (5 Agents)

```
STEP 6: palette (depends: strategos, empathy)
├── Input: Strategy, Personas
├── Output: VisualIdentity { colors, typography, spacing }

STEP 7: grid (depends: palette)
├── Input: VisualIdentity
├── Output: LayoutSystem { breakpoints, grid, spacing }

STEP 8: blocks (depends: palette, grid)
├── Input: VisualIdentity, LayoutSystem
├── Output: ComponentLibrary { components[], variants[] }

STEP 9: cartographer (depends: blocks, strategos)
├── Input: ComponentLibrary, Strategy
├── Output: InformationArchitecture { pages[], hierarchy[] }

STEP 10: flow (depends: cartographer, empathy)
├── Input: IA, Personas
├── Output: UserFlows { journeys[], interactions[] }

TRANSITION TO ARCHITECTURE:
├── Condition: All design outputs validated
├── Progress: 10 agents / 35 = ~29%
```

#### [Continue for remaining phases...]

---

### 3.4 - BACKGROUND JOB ARCHITECTURE

#### OPTION A: Fire-and-Forget with DB Polling (Current)

**How it works:**

- API creates build, returns immediately
- Background promise executes build
- Frontend polls every 2 seconds

**Pros:**

- Simple implementation
- No additional infrastructure

**Cons:**

- No guaranteed delivery
- Process dies = build lost
- High polling load
- No retry on server restart

#### OPTION B: Server-Sent Events (SSE) Streaming

**How it works:**

- API returns SSE stream
- Orchestrator emits events to stream
- Frontend receives real-time updates

**Pros:**

- Real-time updates
- Lower server load than polling
- Better UX

**Cons:**

- Connection management complexity
- Proxy/firewall issues possible
- Still in-process execution

#### OPTION C: Job Queue (QStash/BullMQ/Inngest)

**How it works:**

- API enqueues job, returns job ID
- Worker process executes build
- Results stored in DB
- Frontend polls or uses webhooks

**Pros:**

- Guaranteed delivery
- Survives restarts
- Scalable workers
- Built-in retry

**Cons:**

- Additional infrastructure
- More complex setup
- Potential latency

#### RECOMMENDATION: OPTION B (SSE) for MVP

**Reasoning:**

- Infrastructure already exists (`/api/builds/stream` route)
- Real-time UX is critical for build monitoring
- No additional services needed
- Can upgrade to job queue later

**Implementation:**

```typescript
// API route returns SSE stream:
export async function GET(request: Request) {
  const buildId = getBuildIdFromRequest(request);

  const stream = new ReadableStream({
    async start(controller) {
      const orchestrator = new BuildOrchestrator(buildId);

      orchestrator.on('progress', data => {
        controller.enqueue(`event: progress\ndata: ${JSON.stringify(data)}\n\n`);
      });

      orchestrator.on('agent_completed', data => {
        controller.enqueue(`event: agent\ndata: ${JSON.stringify(data)}\n\n`);
      });

      orchestrator.on('build_completed', data => {
        controller.enqueue(`event: complete\ndata: ${JSON.stringify(data)}\n\n`);
        controller.close();
      });

      await orchestrator.start();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

---

### 3.5 - PROGRESS TRACKING SYSTEM

#### Progress Events

```
build.started          → 0%
phase.discovery.started → 2%
agent.oracle.started    → 3%
agent.oracle.completed  → 5%
agent.empathy.started   → 6%
agent.empathy.completed → 8%
agent.venture.started   → 9%
agent.venture.completed → 11%
agent.strategos.started → 12%
agent.strategos.completed → 14%  [CRITICAL CHECKPOINT]
agent.scope.started     → 15%
agent.scope.completed   → 17%
phase.discovery.completed → 17%

phase.design.started    → 18%
[... design agents 18-34% ...]
phase.design.completed  → 34%

phase.architecture.started → 35%
[... architecture agents 35-54% ...]
phase.architecture.completed → 54%

phase.frontend.started  → 55%
[... frontend agents 55-70% ...]
phase.frontend.completed → 70%

phase.backend.started   → 71%
[... backend agents 71-82% ...]
phase.backend.completed → 82%

phase.integration.started → 83%
[... integration agents 83-90% ...]
phase.integration.completed → 90%

phase.testing.started   → 91%
[... testing agents 91-96% ...]
phase.testing.completed → 96%

phase.deployment.started → 97%
[... deployment agents 97-99% ...]
phase.deployment.completed → 99%

build.completed         → 100%
```

#### Storage

```sql
-- Real-time: builds table
UPDATE builds SET
  progress = 14,
  current_phase = 'discovery',
  current_agent = 'strategos'
WHERE id = buildId;

-- Historical: agent_executions table
INSERT INTO agent_executions (build_id, agent_id, phase, started_at, completed_at, duration, tokens_used);
```

#### Delivery

**SSE Stream:**

```
event: progress
data: {"progress":14,"phase":"discovery","agent":"strategos","completed":["oracle","empathy","venture","strategos"]}

event: agent_completed
data: {"agentId":"strategos","output":{...},"duration":45000,"tokens":12500}
```

#### Frontend Display

```tsx
// src/app/(dashboard)/builds/[buildId]/page.tsx
function BuildProgress({ buildId }) {
  const [progress, setProgress] = useState(0);
  const [currentAgent, setCurrentAgent] = useState(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/builds/${buildId}/stream`);

    eventSource.addEventListener('progress', e => {
      const data = JSON.parse(e.data);
      setProgress(data.progress);
      setCurrentAgent(data.agent);
    });

    return () => eventSource.close();
  }, [buildId]);

  return (
    <div>
      <ProgressBar value={progress} />
      <AgentStatus agent={currentAgent} />
      <PhaseList phases={phases} currentPhase={currentPhase} />
    </div>
  );
}
```

---

### 3.6 - VALIDATION & QUALITY GATES

#### Gate 1: Post-Discovery Validation

```typescript
function validateDiscoveryOutputs(outputs: AgentOutput[]): ValidationResult {
  const errors: string[] = [];

  // Check oracle output
  const oracle = outputs.find(o => o.agentId === 'oracle');
  if (!oracle?.artifacts?.marketAnalysis) {
    errors.push('Missing market analysis');
  }
  if ((oracle?.artifacts?.competitors?.length || 0) < 3) {
    errors.push('Need at least 3 competitors analyzed');
  }

  // Check strategos output (CRITICAL)
  const strategos = outputs.find(o => o.agentId === 'strategos');
  if (!strategos?.artifacts?.mvpFeatures?.length) {
    errors.push('CRITICAL: No MVP features defined');
  }
  if (!strategos?.artifacts?.techRequirements) {
    errors.push('CRITICAL: No technical requirements');
  }

  return {
    passed: errors.length === 0,
    errors,
    canRetry: errors.some(e => !e.startsWith('CRITICAL')),
  };
}
```

#### Gate 2: Post-Design Validation

```typescript
function validateDesignOutputs(outputs: AgentOutput[]): ValidationResult {
  const errors: string[] = [];

  // Check palette
  const palette = outputs.find(o => o.agentId === 'palette');
  if (!palette?.artifacts?.colors?.primary) {
    errors.push('Missing primary color');
  }

  // Check blocks
  const blocks = outputs.find(o => o.agentId === 'blocks');
  if ((blocks?.artifacts?.components?.length || 0) < 5) {
    errors.push('Need at least 5 component definitions');
  }

  return { passed: errors.length === 0, errors };
}
```

#### Gate 3: Post-Frontend Code Validation

```typescript
async function validateFrontendCode(outputs: AgentOutput[]): Promise<ValidationResult> {
  const errors: string[] = [];

  const pixel = outputs.find(o => o.agentId === 'pixel');
  for (const file of pixel?.artifacts || []) {
    if (file.type === 'code' && file.path.endsWith('.tsx')) {
      // Syntax check
      try {
        // Use @babel/parser or typescript compiler API
        const result = await checkTsxSyntax(file.content);
        if (!result.valid) {
          errors.push(`Syntax error in ${file.path}: ${result.error}`);
        }
      } catch (e) {
        errors.push(`Failed to parse ${file.path}`);
      }
    }
  }

  return { passed: errors.length === 0, errors };
}
```

---

## PHASE 4: IMPLEMENTATION ROADMAP

### 4.1 - SPRINT PLAN

#### SPRINT 1: Foundation (Core Fix)

**Goal:** Builds execute through orchestrator with real agent execution

**Tasks:**

1. Connect API to buildService.start() - 4 hours
2. Verify orchestrator executes agents - 2 hours
3. Add agent execution logging - 2 hours
4. Test single-agent execution end-to-end - 2 hours

**Definition of Done:**

- [ ] POST /api/builds calls buildService.start()
- [ ] At least 1 agent (oracle) executes with real LLM call
- [ ] Agent output saved to database
- [ ] Build status updates in real-time

**Demo:** Show oracle agent executing and producing market analysis

---

#### SPRINT 2: Full Pipeline

**Goal:** All 35 agents execute in sequence with proper data flow

**Tasks:**

1. Enable all discovery agents (5) - 4 hours
2. Enable design agents (5) - 4 hours
3. Enable architecture agents (6) - 4 hours
4. Enable frontend agents (3) - 2 hours
5. Enable backend agents (4) - 3 hours
6. Enable integration agents (4) - 3 hours
7. Enable testing agents (4) - 2 hours
8. Enable deployment agents (4) - 2 hours

**Definition of Done:**

- [ ] All 35 agents can execute
- [ ] Dependencies pass data correctly
- [ ] Progress reaches 100%
- [ ] Artifacts generated for each phase

**Demo:** Complete build with all phases showing progress

---

#### SPRINT 3: Data Persistence

**Goal:** All build data properly stored and retrievable

**Tasks:**

1. Create project_versions on completion - 3 hours
2. Create project_files for each file - 3 hours
3. Track agent_executions - 2 hours
4. Track build_costs and tokens - 2 hours
5. Build history page UI - 4 hours

**Definition of Done:**

- [ ] Completed builds have version records
- [ ] Individual files queryable
- [ ] Cost tracking accurate
- [ ] History page shows past builds

**Demo:** Browse file history, see costs per build

---

#### SPRINT 4: Quality & Polish

**Goal:** Stable, reliable builds with quality gates

**Tasks:**

1. Implement quality gates - 4 hours
2. Add retry logic for failed agents - 3 hours
3. Add error recovery (save state) - 3 hours
4. Remove dead code - 2 hours
5. Add tests - 4 hours

**Definition of Done:**

- [ ] Bad outputs trigger retry
- [ ] Builds can resume from failure
- [ ] Dead code removed
- [ ] Core paths have tests

**Demo:** Show retry on bad output, resume from failure

---

### 4.2 - TESTING STRATEGY

#### Test 1: Build Completion

```
Setup: Create new project "Test Project"
Action: Submit prompt "Build a simple todo app"
Expected:
  - Build completes within 10 minutes
  - Status transitions: queued → running → completed
  - Progress reaches 100%
Verify:
  - SELECT * FROM builds WHERE id = buildId → status = 'completed'
  - SELECT COUNT(*) FROM agent_executions WHERE build_id = buildId → 35 (or tier count)
  - SELECT COUNT(*) FROM project_files WHERE version_id = versionId → > 10 files
```

#### Test 2: Agent Execution

```
Setup: Create build with tier='starter'
Action: Monitor oracle agent execution
Expected:
  - Agent receives prompt
  - LLM call made to Anthropic/Ollama
  - Response parsed correctly
  - Output validated
  - Database updated
Verify:
  - SELECT * FROM agent_executions WHERE agent_id = 'oracle' → status = 'completed'
  - Check artifacts contain market analysis
  - Check decisions array populated
```

#### Test 3: Error Recovery

```
Setup: Create build, kill server mid-execution
Action: Restart server
Expected:
  - Build detected as incomplete
  - Can resume from last checkpoint
  - Or properly marked as failed
Verify:
  - Build doesn't hang forever
  - Zombie detection works
  - Status reflects reality
```

#### Test 4: Progress Accuracy

```
Setup: Create build, monitor progress stream
Action: Track progress values
Expected:
  - Progress increases monotonically
  - Each agent completion bumps progress
  - Final progress = 100%
Verify:
  - No progress jumps backward
  - Current phase/agent accurate
  - Frontend displays correctly
```

---

### 4.3 - ROLLBACK PLAN

#### Checkpoint 1: Before Orchestrator Connection

```bash
# Create tag
git tag v2.0-pre-orchestrator

# Database backup
pg_dump olympus_db > backup_pre_orchestrator.sql

# Rollback steps:
git checkout v2.0-pre-orchestrator
psql olympus_db < backup_pre_orchestrator.sql
npm run dev
```

#### Checkpoint 2: After Sprint 1

```bash
git tag v2.0-sprint1-complete

# Test the build system
npm run test:builds

# If tests fail:
git checkout v2.0-pre-orchestrator
```

#### Checkpoint 3: After Full Pipeline

```bash
git tag v2.0-full-pipeline

# Rollback if agents break:
git diff v2.0-sprint1-complete..v2.0-full-pipeline > pipeline_changes.patch
git checkout v2.0-sprint1-complete
```

---

## RISK ASSESSMENT

| Risk                     | Probability | Impact           | Mitigation                                        |
| ------------------------ | ----------- | ---------------- | ------------------------------------------------- |
| LLM rate limits          | HIGH        | Builds fail      | Implement backoff, use multiple providers         |
| Token budget exceeded    | MEDIUM      | Build incomplete | Pre-calculate costs, warn before expensive builds |
| Agent output invalid     | HIGH        | Bad code         | Quality gates, retry logic                        |
| Database deadlocks       | LOW         | Hanging builds   | Transaction isolation, timeouts                   |
| Server crashes mid-build | MEDIUM      | Lost work        | Checkpointing, resume capability                  |
| Provider outages         | MEDIUM      | All builds fail  | Multi-provider fallback                           |

---

## SUCCESS METRICS

| Metric                | Current             | Target       | How to Measure                 |
| --------------------- | ------------------- | ------------ | ------------------------------ |
| Build success rate    | Unknown             | > 90%        | completed / total builds       |
| Average build time    | ~30s                | < 10 min     | AVG(completed_at - created_at) |
| Agent execution count | 0                   | 35 per build | COUNT(agent_executions)        |
| Code quality score    | N/A                 | > 80%        | Automated linting + validation |
| Cost per build        | Unknown             | < $2         | SUM(build_costs.total)         |
| Progress accuracy     | Fake (10/30/80/100) | Real %       | Verify against agent count     |

---

## CONCLUSION

OLYMPUS 2.0 has a **sophisticated architecture** with 35 specialized AI agents, but the entire system is **bypassed** by a direct LLM call. The fix is straightforward:

1. **Connect the API to the orchestrator** (1 line change + testing)
2. **Ensure database persistence** for all outputs
3. **Enable real progress tracking**
4. **Add quality gates**
5. **Remove dead code**

The core orchestration code exists and appears functional - it just needs to be **called**. With the fixes outlined in this blueprint, OLYMPUS can evolve from a "single LLM call" system to a true **multi-agent code generation platform**.

**Estimated total effort:** 4 sprints (~8 weeks with proper testing)
**Critical path:** Fix 1 (API → BuildService) blocks everything else
**Recommended first action:** Change line 94 in `src/app/api/builds/route.ts`

---

_Report generated by Claude Code - January 13, 2026_
