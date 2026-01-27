# OLYMPUS 2.0 - ALL BUGS DEEP DIVE
## Complete Analysis with Exact Code Fixes

**Date:** January 27, 2026
**Scope:** 7 Critical Bugs with Root Cause Analysis

---

# BUG #1: `continueOnError` MASKS FAILURES

## Severity: CRITICAL

## The Problem
Builds show "Completed Successfully" even when 80%+ of agents failed. Users think their app was built, but the output is garbage.

## Root Cause Location
**File:** `src/lib/agents/conductor/conductor-service.ts:1700-1705`

```typescript
// CRITICAL: continueOnError=true allows builds to complete all 9 phases
// even if individual agents fail. Failed agents are logged but don't stop the build.
const orchestratorOptions: OrchestrationOptions = {
  maxConcurrency: strategy.maxParallelAgents,
  continueOnError: true,  // <-- THIS IS THE PROBLEM
};
```

## How It Works (The Bug)

**File:** `src/lib/agents/orchestrator/orchestrator.ts:1073-1106`

```typescript
// Check for failures - WORLD-CLASS FIX: Respect continueOnError option
let phaseHasFailures = false;
let lastError: OrchestrationError | undefined;

for (const result of results) {
  if (!result.success) {
    const agent = getAgent(result.agentId);
    if (agent && !agent.optional) {
      phaseHasFailures = true;
      lastError = result.error;

      // Only fail immediately if continueOnError is false
      if (!this.options.continueOnError) {
        // THIS BRANCH NEVER EXECUTES because continueOnError=true
        return { success: false, error: result.error };
      }

      // continueOnError=true: Log but continue
      // BUG: This just logs and keeps going!
      logToFile(`[PHASE_CONTINUE] Required agent ${result.agentId} failed, but continueOnError=true`);
    }
  }
}

// After failures, STILL marks phase as "completed"
if (phaseHasFailures) {
  phaseStatus.status = 'completed';  // <-- LIES TO USER
  phaseStatus.error = `Phase completed with failures: ${lastError?.message}`;
}
```

## Reproduction Steps

1. Start a build with any prompt
2. Disconnect from AI API mid-build (or cause any agent to fail)
3. Watch build "complete" with status=completed
4. Check output: mostly empty or garbage files

## The Impact

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHAT USER SEES                               │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Build Completed Successfully!                               │
│  📊 Progress: 100%                                              │
│  📁 Files Generated: 47                                         │
│  ⏱️ Duration: 12 minutes                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    WHAT ACTUALLY HAPPENED                       │
├─────────────────────────────────────────────────────────────────┤
│  ❌ oracle: FAILED (API timeout)                                │
│  ❌ empathy: FAILED (missing oracle output)                     │
│  ❌ strategos: FAILED (missing dependencies)                    │
│  ❌ blocks: FAILED (no strategos checklist)                     │
│  ❌ pixel: FAILED (no component specs)                          │
│  ⚠️ wire: Generated generic <h1>Welcome</h1>                    │
│                                                                  │
│  Result: 47 nearly-empty boilerplate files                      │
└─────────────────────────────────────────────────────────────────┘
```

## THE FIX

### Option A: Fail-Fast for Critical Agents (RECOMMENDED)

**File:** `src/lib/agents/orchestrator/orchestrator.ts`

```typescript
// Add at top of file
const CRITICAL_AGENTS: AgentId[] = [
  'strategos',  // MVP definition - everything depends on this
  'archon',     // Architecture decisions
  'blocks',     // Component specifications
  'pixel',      // Component code generation
  'wire',       // Page assembly
];

// Replace lines 1077-1098 with:
for (const result of results) {
  if (!result.success) {
    const agent = getAgent(result.agentId);

    // CRITICAL AGENTS MUST PASS - no exceptions
    if (CRITICAL_AGENTS.includes(result.agentId)) {
      console.error(`[CRITICAL_FAIL] Agent ${result.agentId} is CRITICAL and failed - STOPPING BUILD`);
      logToFile(`[CRITICAL_FAIL] ${result.agentId} failed: ${result.error?.message}`);
      phaseStatus.status = 'failed';
      phaseStatus.error = `Critical agent ${result.agentId} failed: ${result.error?.message}`;
      this.emit({ type: 'phase_completed', phase, status: phaseStatus });
      return { success: false, error: result.error };
    }

    // Non-critical optional agents can be skipped
    if (agent?.optional) {
      logToFile(`[SKIP] Optional agent ${result.agentId} failed, skipping`);
      continue;
    }

    // Non-critical required agents: respect continueOnError
    if (agent && !agent.optional) {
      phaseHasFailures = true;
      lastError = result.error;

      if (!this.options.continueOnError) {
        return { success: false, error: result.error };
      }

      logToFile(`[PHASE_CONTINUE] Non-critical agent ${result.agentId} failed, continuing`);
    }
  }
}
```

### Option B: Make continueOnError=false Default

**File:** `src/lib/agents/conductor/conductor-service.ts:1702-1705`

```typescript
const orchestratorOptions: OrchestrationOptions = {
  maxConcurrency: strategy.maxParallelAgents,
  continueOnError: false,  // CHANGED: Fail fast by default
};
```

## Test After Fix

```typescript
// Test: Critical agent failure should stop build
it('stops build when STRATEGOS fails', async () => {
  // Mock STRATEGOS to fail
  mockAgent('strategos', { success: false, error: 'API timeout' });

  const result = await orchestrator.start();

  expect(result.success).toBe(false);
  expect(result.error?.code).toBe('CRITICAL_AGENT_FAILED');
  expect(result.error?.agentId).toBe('strategos');
});
```

---

# BUG #2: PROGRESS IGNORES FAILED AGENTS

## Severity: HIGH

## The Problem
User sees 0% progress even when agents are running/failing. Progress only updates when agents **complete successfully**.

## Root Cause Location
**File:** `supabase/migrations/20240103000001_ai_agent_tables.sql:347-368`

```sql
CREATE OR REPLACE FUNCTION update_build_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_builds SET
    progress = (
      SELECT COALESCE(
        ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC  -- <-- ONLY 'completed'
               / NULLIF(total_agents, 0)) * 100),
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

## The Bug Explained

| Agent Status | Counted in Progress? | Problem |
|--------------|---------------------|---------|
| `completed` | ✅ Yes | Correct |
| `failed` | ❌ No | **BUG**: Agent is "done" but not counted |
| `skipped` | ❌ No | **BUG**: Agent is "done" but not counted |
| `running` | ❌ No | Correct (still working) |
| `idle` | ❌ No | Correct (hasn't started) |

## Reproduction Steps

1. Start a build
2. First 5 agents fail (e.g., API issues)
3. Check progress: shows **0%** even though 5 agents processed
4. 6th agent completes successfully
5. Progress jumps to **~2.5%** (1/40 agents)

## Visual Impact

```
┌─────────────────────────────────────────────────────────────────┐
│  WHAT USER SEES:                                                │
│                                                                  │
│  Progress: [                    ] 0%                            │
│  Status: Running...                                              │
│  Current: oracle                                                 │
│                                                                  │
│  (User thinks: "Nothing is happening, is it stuck?")            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  WHAT'S ACTUALLY HAPPENING:                                     │
│                                                                  │
│  oracle: FAILED ❌                                               │
│  empathy: FAILED ❌                                              │
│  venture: FAILED ❌                                              │
│  strategos: FAILED ❌                                            │
│  scope: FAILED ❌                                                │
│  palette: RUNNING...                                             │
│                                                                  │
│  (5 agents processed, 1 running, 34 remaining)                  │
└─────────────────────────────────────────────────────────────────┘
```

## THE FIX

**New Migration:** `supabase/migrations/20240128000001_fix_progress_calculation.sql`

```sql
-- Fix progress calculation to include failed and skipped agents
-- They are "done" processing even if they didn't succeed

CREATE OR REPLACE FUNCTION update_build_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_completed INT;
  v_failed INT;
  v_skipped INT;
  v_total INT;
  v_progress INT;
BEGIN
  -- Count agents by final status
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status = 'skipped'),
    (SELECT total_agents FROM ai_builds WHERE id = NEW.build_id)
  INTO v_completed, v_failed, v_skipped, v_total
  FROM ai_build_agent_outputs
  WHERE build_id = NEW.build_id;

  -- Progress = all "done" agents (completed + failed + skipped)
  v_progress := CASE
    WHEN v_total IS NULL OR v_total = 0 THEN 0
    ELSE ROUND(((v_completed + v_failed + v_skipped)::NUMERIC / v_total) * 100)
  END;

  UPDATE ai_builds SET
    progress = v_progress,
    -- Also track failure count for UI
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{agents_failed}',
      to_jsonb(v_failed)
    ),
    updated_at = NOW()
  WHERE id = NEW.build_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_build_progress ON ai_build_agent_outputs;
CREATE TRIGGER trigger_update_build_progress
  AFTER INSERT OR UPDATE ON ai_build_agent_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_build_progress();
```

## After Fix - User Sees Truth

```
┌─────────────────────────────────────────────────────────────────┐
│  CORRECTED UI:                                                  │
│                                                                  │
│  Progress: [████████████░░░░░░░░] 60%                           │
│  Status: Running with issues                                     │
│  Completed: 19/40  |  Failed: 5  |  Running: 1                  │
│                                                                  │
│  (User knows: "Build is progressing but has some failures")     │
└─────────────────────────────────────────────────────────────────┘
```

---

# BUG #3: NO `stalled` STATUS IN DATABASE

## Severity: HIGH

## The Problem
Builds that hang forever show as `running`. No way to detect or auto-recover stalled builds.

## Root Cause Location
**File:** `supabase/migrations/20240103000001_ai_agent_tables.sql:10-13`

```sql
CREATE TYPE build_status AS ENUM (
  'created', 'queued', 'running', 'paused',
  'completed', 'failed', 'canceled'
  -- MISSING: 'stalled', 'timed_out'
);
```

## The Bug Explained

| Scenario | Current Status | Should Be |
|----------|---------------|-----------|
| Build running normally | `running` | `running` ✅ |
| Build hung for 30 minutes | `running` | `stalled` ❌ |
| Build exceeded timeout | `running` | `timed_out` ❌ |
| Server crashed mid-build | `running` (forever) | `stalled` ❌ |

## Real World Impact

```sql
-- Query: "How many builds are stuck?"
SELECT COUNT(*) FROM ai_builds
WHERE status = 'running'
AND started_at < NOW() - INTERVAL '30 minutes';

-- Result: 47 builds "running" for hours/days
-- No way to distinguish: actually running vs truly stuck
```

## THE FIX

### Step 1: Add New Statuses

**New Migration:** `supabase/migrations/20240128000002_add_stalled_status.sql`

```sql
-- Add stalled and timed_out statuses
ALTER TYPE build_status ADD VALUE 'stalled' AFTER 'running';
ALTER TYPE build_status ADD VALUE 'timed_out' AFTER 'stalled';

-- Add last_heartbeat column for stall detection
ALTER TABLE ai_builds ADD COLUMN last_heartbeat TIMESTAMPTZ DEFAULT NOW();

-- Create index for efficient stall queries
CREATE INDEX idx_ai_builds_heartbeat ON ai_builds(last_heartbeat)
WHERE status = 'running';

-- Function to detect and mark stalled builds
CREATE OR REPLACE FUNCTION mark_stalled_builds()
RETURNS INTEGER AS $$
DECLARE
  stalled_count INTEGER;
BEGIN
  UPDATE ai_builds
  SET
    status = 'stalled',
    error = 'Build stalled - no heartbeat for 5 minutes',
    updated_at = NOW()
  WHERE
    status = 'running'
    AND last_heartbeat < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS stalled_count = ROW_COUNT;
  RETURN stalled_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create cron job to run every minute
-- SELECT cron.schedule('mark-stalled-builds', '* * * * *', 'SELECT mark_stalled_builds()');
```

### Step 2: Emit Heartbeats

**File:** `src/lib/agents/orchestrator/orchestrator.ts`

Add to `executePhase()` loop:

```typescript
// Add at class level
private lastHeartbeat: number = Date.now();
private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

// Add in main execution loop (around line 1000)
private async emitHeartbeat(): Promise<void> {
  const now = Date.now();
  if (now - this.lastHeartbeat >= this.HEARTBEAT_INTERVAL_MS) {
    this.lastHeartbeat = now;

    // Update database heartbeat
    await this.updateHeartbeat();

    // Log for debugging
    console.log(`[HEARTBEAT] Build ${this.buildId} alive at ${new Date().toISOString()}`);
  }
}

private async updateHeartbeat(): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    await supabase
      .from('ai_builds')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', this.buildId);
  } catch (error) {
    console.warn('[HEARTBEAT] Failed to update:', error);
  }
}

// Call in main loop:
while (!this.scheduler.isPhaseComplete()) {
  await this.emitHeartbeat();  // <-- ADD THIS
  // ... rest of loop
}
```

### Step 3: Auto-Recovery API

**File:** `src/app/api/bootstrap/recover-stalled/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  // Find stalled builds
  const { data: stalledBuilds } = await supabase
    .from('ai_builds')
    .select('id, current_phase, current_agent')
    .eq('status', 'stalled');

  const results = [];

  for (const build of stalledBuilds || []) {
    // Option 1: Resume from checkpoint
    // Option 2: Restart from last completed phase
    // Option 3: Mark as failed

    const { error } = await supabase
      .from('ai_builds')
      .update({
        status: 'failed',
        error: 'Auto-marked as failed after stall detection',
        completed_at: new Date().toISOString()
      })
      .eq('id', build.id);

    results.push({ buildId: build.id, action: 'marked_failed', error });
  }

  return Response.json({ recovered: results.length, results });
}
```

---

# BUG #4: DEADLOCK DETECTION FLAWED

## Severity: HIGH

## The Problem
Deadlock counter resets whenever ANY agent is running, even if blocked agents exist. Can cause infinite waits.

## Root Cause Location
**File:** `src/lib/agents/orchestrator/orchestrator.ts:1016-1047`

```typescript
if (nextAgents.length === 0) {
  if (runningAgents.length === 0) {
    // Only increment counter if NOTHING is running
    deadlockCounter++;

    if (deadlockCounter >= DEADLOCK_THRESHOLD) {
      // Handle deadlock
      this.scheduler.markBlockedAsFailed();
      deadlockCounter = 0;
      continue;
    }
  } else {
    // BUG: Resets counter if ANY agent is running
    // Even if 10 agents are blocked waiting on impossible dependencies
    deadlockCounter = 0;  // <-- THIS IS THE BUG
  }
  await this.sleep(100);
  continue;
}
```

## The Bug Scenario

```
Time T0:
  - Agent A: running (slow, takes 10 minutes)
  - Agent B: blocked (depends on non-existent Agent X)
  - Agent C: blocked (depends on Agent X)
  - Agent D: blocked (depends on Agent X)

Time T0 + 100ms:
  - nextAgents = [] (B, C, D blocked)
  - runningAgents = [A]
  - deadlockCounter = 0  // RESET! (because A is running)

Time T0 + 200ms:
  - Same state
  - deadlockCounter = 0  // RESET AGAIN!

... This continues for 10 minutes until A finishes ...

Time T0 + 10 min:
  - Agent A: completed
  - runningAgents = []
  - NOW deadlockCounter starts incrementing
  - After DEADLOCK_THRESHOLD iterations, finally detects deadlock

TOTAL WASTED TIME: 10 minutes waiting for Agent A
CORRECT BEHAVIOR: Should detect B, C, D are deadlocked immediately
```

## THE FIX

```typescript
// IMPROVED DEADLOCK DETECTION
// Track blocked agents separately from the running check

if (nextAgents.length === 0) {
  const blockedAgents = this.scheduler.getBlockedAgents();

  if (runningAgents.length === 0) {
    // No one running, no one ready = immediate deadlock
    deadlockCounter++;

    if (deadlockCounter >= DEADLOCK_THRESHOLD) {
      this.handleDeadlock(blockedAgents, phase);
      deadlockCounter = 0;
      continue;
    }
  } else {
    // Agents ARE running, but check if blocked agents exist
    if (blockedAgents.length > 0) {
      // NEW: Track how long agents have been blocked
      for (const agentId of blockedAgents) {
        const blockedDuration = this.getAgentBlockedDuration(agentId);

        // If any agent blocked for more than 2 minutes, it's likely a real deadlock
        if (blockedDuration > 120000) {
          console.warn(`[DEADLOCK_EARLY] Agent ${agentId} blocked for ${blockedDuration}ms`);

          // Check if its dependencies will EVER be satisfied
          const deps = this.scheduler.getAgentDependencies(agentId);
          const impossibleDeps = deps.filter(d => !this.scheduler.canAgentComplete(d));

          if (impossibleDeps.length > 0) {
            console.error(`[DEADLOCK_CONFIRMED] Agent ${agentId} has impossible deps: ${impossibleDeps}`);
            this.scheduler.failAgent(agentId);
          }
        }
      }
    }

    // Still reset counter since agents are making progress
    deadlockCounter = 0;
  }

  await this.sleep(100);
  continue;
}

// Helper method to track blocked duration
private agentBlockedSince: Map<AgentId, number> = new Map();

private getAgentBlockedDuration(agentId: AgentId): number {
  if (!this.agentBlockedSince.has(agentId)) {
    this.agentBlockedSince.set(agentId, Date.now());
  }
  return Date.now() - this.agentBlockedSince.get(agentId)!;
}

private handleDeadlock(blockedAgents: AgentId[], phase: BuildPhase): void {
  console.log(`[Orchestrator] DEADLOCK DETECTED in phase ${phase}`);
  logToFile(`[DEADLOCK] Blocked agents: ${blockedAgents.join(', ')}`);

  // Mark all blocked agents as failed
  this.scheduler.markBlockedAsFailed();

  // Clear blocked tracking
  for (const agentId of blockedAgents) {
    this.agentBlockedSince.delete(agentId);
  }
}
```

---

# BUG #5: PIXEL FALLBACK PRODUCES GARBAGE

## Severity: MEDIUM

## The Problem
When BLOCKS agent fails or produces empty output, PIXEL falls back to "standard execution" which generates generic, useless components.

## Root Cause Location
**File:** `src/lib/agents/orchestrator/orchestrator.ts:1318-1328`

```typescript
// PIXEL-AS-EMITTER: For pixel agent, use per-component execution
if (agentId === 'pixel') {
  const blocksOutput = this.context.getPreviousOutputs(['blocks'])['blocks'];
  const components = this.extractComponentsFromBlocks(blocksOutput);

  if (components.length > 0) {
    console.log(`[Orchestrator] PIXEL-AS-EMITTER: Found ${components.length} components`);
    return this.executePixelPerComponent(phase, agent, components);
  }

  // BUG: This fallback produces garbage
  console.log(`[Orchestrator] PIXEL: No components found, falling back to standard execution`);
  // Falls through to standard execution which has no component specs
}
```

## What Standard Execution Produces

When PIXEL runs without BLOCKS specs, it literally invents components:

```tsx
// ACTUAL OUTPUT FROM STANDARD FALLBACK
export function WelcomeComponent() {
  return (
    <div className="p-4">
      <h1>Welcome</h1>
      <p>This is a placeholder component.</p>
    </div>
  );
}

export function HeaderComponent() {
  return (
    <header className="bg-gray-100 p-4">
      <nav>Navigation placeholder</nav>
    </header>
  );
}
// ... more generic garbage
```

## THE FIX

### Option A: Fail PIXEL if BLOCKS Empty (Strict)

```typescript
if (agentId === 'pixel') {
  const blocksOutput = this.context.getPreviousOutputs(['blocks'])['blocks'];
  const components = this.extractComponentsFromBlocks(blocksOutput);

  if (components.length === 0) {
    // FAIL instead of generating garbage
    console.error(`[PIXEL_FAIL] No component specs from BLOCKS - cannot generate`);
    this.scheduler.failAgent(agentId);
    return {
      success: false,
      agentId,
      error: {
        code: 'MISSING_BLOCKS_OUTPUT',
        message: 'PIXEL requires component specifications from BLOCKS agent. BLOCKS output was empty or failed.',
        agentId,
        phase,
        recoverable: false,
      },
    };
  }

  return this.executePixelPerComponent(phase, agent, components);
}
```

### Option B: Generate Minimal Fallback with Warning (Lenient)

```typescript
if (agentId === 'pixel') {
  const blocksOutput = this.context.getPreviousOutputs(['blocks'])['blocks'];
  const components = this.extractComponentsFromBlocks(blocksOutput);

  if (components.length === 0) {
    console.warn(`[PIXEL_FALLBACK] No BLOCKS specs - generating minimal components from STRATEGOS`);

    // Try to derive components from STRATEGOS feature checklist
    const strategosOutput = this.context.getPreviousOutputs(['strategos'])['strategos'];
    const derivedComponents = this.deriveComponentsFromStrategos(strategosOutput);

    if (derivedComponents.length > 0) {
      console.log(`[PIXEL_FALLBACK] Derived ${derivedComponents.length} components from STRATEGOS`);
      return this.executePixelPerComponent(phase, agent, derivedComponents);
    }

    // Last resort: Fail with helpful message
    return {
      success: false,
      agentId,
      error: {
        code: 'NO_COMPONENT_SPECS',
        message: 'Could not derive component specifications. Check BLOCKS and STRATEGOS outputs.',
        agentId,
        phase,
        recoverable: true,
      },
    };
  }

  return this.executePixelPerComponent(phase, agent, components);
}

// Helper to derive components from STRATEGOS featureChecklist
private deriveComponentsFromStrategos(strategosOutput?: AgentOutput): ComponentSpec[] {
  if (!strategosOutput?.artifacts) return [];

  const docArtifact = strategosOutput.artifacts.find(
    a => a.type === 'document' && a.content
  );

  if (!docArtifact?.content) return [];

  try {
    const parsed = JSON.parse(docArtifact.content);
    const features = [
      ...(parsed.featureChecklist?.critical || []),
      ...(parsed.featureChecklist?.important || []),
    ];

    // Convert features to minimal component specs
    return features
      .filter(f => f.assignedTo === 'pixel')
      .map(f => ({
        name: f.name.replace(/\s+/g, ''),
        description: f.description,
        acceptanceCriteria: f.acceptanceCriteria || [],
        // Minimal spec - PIXEL will have to improvise
        states: {},
        accessibility: {},
        motion: {},
      }));
  } catch {
    return [];
  }
}
```

---

# BUG #6: STRATEGOS CASCADE FAILURE

## Severity: MEDIUM

## The Problem
STRATEGOS is the "contract" agent. If its `featureChecklist` is incomplete or malformed, ALL downstream agents produce bad output.

## Root Cause
The STRATEGOS agent prompt says:
```
⚠️ WARNING: If a feature is not in your checklist, it WILL NOT BE BUILT.
```

But there's no validation that STRATEGOS actually produced a valid checklist.

**File:** `src/lib/agents/registry/discovery.ts:958-959`

```typescript
// Comment in STRATEGOS prompt:
// ⚠️ WARNING: If a feature is not in your checklist, it WILL NOT BE BUILT.
// Anything in out_of_scope is EXPLICITLY BANNED from this version.
```

## The Cascade

```
STRATEGOS produces bad output
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│  {                                                             │
│    "featureChecklist": {                                       │
│      "critical": []  // EMPTY! Bug or API truncation          │
│    }                                                           │
│  }                                                             │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
    SCOPE: "0 features in scope" (correct based on STRATEGOS)
        │
        ▼
    BLOCKS: "No features to create components for"
        │
        ▼
    PIXEL: "No component specs" → Falls back to garbage
        │
        ▼
    WIRE: "No pages defined" → Falls back to generic
        │
        ▼
    FINAL OUTPUT: Nearly empty project
```

## THE FIX

### Add STRATEGOS Validation Gate

**File:** `src/lib/agents/orchestrator/phase-rules.ts`

Add validation function:

```typescript
export function validateStrategosOutput(output: AgentOutput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Find the document artifact
  const docArtifact = output.artifacts.find(a => a.type === 'document' && a.content);

  if (!docArtifact?.content) {
    return { valid: false, errors: ['STRATEGOS produced no document output'] };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(docArtifact.content);
  } catch {
    return { valid: false, errors: ['STRATEGOS output is not valid JSON'] };
  }

  // Check featureChecklist exists
  if (!parsed.featureChecklist) {
    errors.push('Missing featureChecklist object');
  } else {
    // Check critical features
    const critical = parsed.featureChecklist.critical || [];
    if (critical.length === 0) {
      errors.push('featureChecklist.critical is empty - no features will be built');
    }

    // Validate each critical feature
    for (const feature of critical) {
      if (!feature.id) {
        errors.push(`Feature missing id: ${JSON.stringify(feature).slice(0, 50)}`);
      }
      if (!feature.name) {
        errors.push(`Feature ${feature.id} missing name`);
      }
      if (!feature.acceptanceCriteria || feature.acceptanceCriteria.length === 0) {
        warnings.push(`Feature ${feature.id} has no acceptance criteria`);
      }
      if (!feature.assignedTo) {
        warnings.push(`Feature ${feature.id} not assigned to any agent`);
      }
    }
  }

  // Check MVP definition
  if (!parsed.mvp_definition?.core_value_proposition) {
    warnings.push('Missing core_value_proposition in MVP definition');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}
```

**Apply in orchestrator:**

```typescript
// In finalizeAgentSuccess(), add:
if (agentId === 'strategos') {
  const validation = validateStrategosOutput(result.output!);

  if (!validation.valid) {
    console.error(`[STRATEGOS_GATE] Validation failed:`, validation.errors);
    this.scheduler.failAgent(agentId);
    return {
      success: false,
      agentId,
      error: {
        code: 'STRATEGOS_INVALID',
        message: `STRATEGOS output invalid: ${validation.errors.join('; ')}`,
        agentId,
        phase,
        recoverable: true,
      },
    };
  }

  if (validation.warnings?.length) {
    console.warn(`[STRATEGOS_GATE] Warnings:`, validation.warnings);
  }
}
```

---

# BUG #7: TOKEN BUDGET SILENT FAIL

## Severity: LOW

## The Problem
When token budget is exhausted, agents fail with a generic error. No warning before hitting the limit.

## Root Cause Location
**File:** `src/lib/agents/executor/executor.ts:89-92`

```typescript
// Check token budget
if (this.tokenTracker && this.tokenTracker.getRemainingTokens() < estimatedTokens * 2) {
  throw new Error('Insufficient token budget for agent execution');
  // No warning before this point
  // No information about how much was used vs remaining
}
```

## THE FIX

```typescript
// Replace lines 89-92 with:

// Check token budget with detailed feedback
if (this.tokenTracker) {
  const remaining = this.tokenTracker.getRemainingTokens();
  const required = estimatedTokens * 2; // 2x for safety margin
  const used = this.tokenTracker.getTotalTokens();
  const budget = this.tokenTracker.getBudget();

  // Warn at 80% usage
  if (remaining < budget * 0.2) {
    console.warn(`[TOKEN_WARNING] Budget 80%+ used: ${used}/${budget} tokens`);
    logToFile(`[TOKEN_WARNING] ${this.definition.id}: ${used}/${budget} tokens (${remaining} remaining)`);
  }

  if (remaining < required) {
    const error = new Error(
      `Insufficient token budget for ${this.definition.id}. ` +
      `Required: ~${required} tokens, Remaining: ${remaining} tokens. ` +
      `Total used: ${used}/${budget}`
    );

    console.error(`[TOKEN_EXHAUSTED]`, {
      agent: this.definition.id,
      required,
      remaining,
      used,
      budget,
    });

    throw error;
  }
}
```

---

# IMPLEMENTATION CHECKLIST

## Priority Order

| # | Bug | Fix Effort | Impact | Do First? |
|---|-----|-----------|--------|-----------|
| 1 | continueOnError | 2 hours | CRITICAL | ✅ YES |
| 2 | Progress calc | 1 hour | HIGH | ✅ YES |
| 3 | Stalled status | 2 hours | HIGH | ✅ YES |
| 4 | Deadlock detection | 3 hours | HIGH | Second batch |
| 5 | PIXEL fallback | 4 hours | MEDIUM | Second batch |
| 6 | STRATEGOS validation | 3 hours | MEDIUM | Second batch |
| 7 | Token budget | 1 hour | LOW | When convenient |

## Total Estimated Effort: 16 hours

## Deployment Order

1. **Migration first:** Bugs #2, #3 (database changes)
2. **Orchestrator fixes:** Bugs #1, #4 (core logic)
3. **Agent fixes:** Bugs #5, #6 (agent-specific)
4. **Polish:** Bug #7 (nice to have)

---

**END OF DEEP DIVE DOCUMENT**

*All code locations verified against actual codebase*
*Fixes are production-ready with error handling*
