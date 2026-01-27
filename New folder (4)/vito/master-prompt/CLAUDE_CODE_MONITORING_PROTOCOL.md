# 🔍 CLAUDE CODE MONITORING PROTOCOL
## Your Role: Analyst & Source Fixer (NOT Builder)

---

## ⚠️ CRITICAL UNDERSTANDING

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   YOU (CLAUDE CODE) DO NOT BUILD THE UI.                                             ║
║   OLYMPUS BUILDS THE UI.                                                             ║
║                                                                                       ║
║   YOUR JOB:                                                                          ║
║   1. Feed the master prompt to OLYMPUS                                               ║
║   2. Watch OLYMPUS build                                                             ║
║   3. Catch errors and failures                                                       ║
║   4. Analyze WHY agents failed                                                       ║
║   5. Fix the AGENT CODE (the source), not the output                                ║
║   6. Re-run OLYMPUS with fixed agents                                                ║
║   7. Repeat until 100% success                                                       ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 🎯 THE SEPARATION OF CONCERNS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            OLYMPUS (The Engine)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   INPUT:  Master prompt (22-section spec)                                  │
│   PROCESS: 40 agents × 9 phases                                            │
│   OUTPUT: Complete UI code                                                 │
│                                                                             │
│   OLYMPUS DOES NOT THINK. OLYMPUS EXECUTES.                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                            (produces output)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLAUDE CODE (The Analyst)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   WATCHES: Build progress, agent outputs, errors                           │
│   ANALYZES: Why did it fail? What's the root cause?                        │
│   FIXES: Agent code, prompts, configurations (THE SOURCE)                  │
│   DOES NOT FIX: The generated UI code (that's OLYMPUS's job)              │
│                                                                             │
│   CLAUDE CODE DOES NOT BUILD. CLAUDE CODE DEBUGS THE BUILDER.              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 STEP-BY-STEP PROTOCOL

### STEP 1: Start the Build

```bash
# Feed the master prompt to OLYMPUS
curl -X POST "http://localhost:3000/api/bootstrap/start-build" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "[PASTE ENTIRE MASTER PROMPT HERE]",
    "projectType": "marketing_website_with_dashboard",
    "techStack": "nextjs_14_typescript_tailwind_shadcn"
  }'
```

### STEP 2: Monitor the Build

```bash
# Watch build progress every 10 seconds
while true; do
  curl -s "http://localhost:3000/api/bootstrap/start-build" | python -c "
import sys, json
data = json.load(sys.stdin)
print(f\"Progress: {data.get('progress', 0)}%\")
print(f\"Phase: {data.get('currentPhase', 'N/A')}\")
print(f\"Agent: {data.get('currentAgent', 'N/A')}\")
print(f\"Failed: {data.get('failedAgents', [])}\")
print('---')
"
  sleep 10
done
```

### STEP 3: When Build Completes, Analyze Results

```
ANALYSIS TEMPLATE:

BUILD COMPLETED
===============

Overall Status: [SUCCESS / PARTIAL / FAILED]
Progress: [X]%
Duration: [X] minutes

PHASE RESULTS:
─────────────────────────────────────────────────────────────
Phase 1 (Discovery):    [✅/❌] - [X] agents succeeded, [X] failed
Phase 2 (Conversion):   [✅/❌] - [X] agents succeeded, [X] failed
Phase 3 (Design):       [✅/❌] - [X] agents succeeded, [X] failed
Phase 4 (Architecture): [✅/❌] - [X] agents succeeded, [X] failed
Phase 5 (Frontend):     [✅/❌] - [X] agents succeeded, [X] failed
Phase 6 (Backend):      [✅/❌] - [X] agents succeeded, [X] failed
Phase 7 (Integration):  [✅/❌] - [X] agents succeeded, [X] failed
Phase 8 (Testing):      [✅/❌] - [X] agents succeeded, [X] failed
Phase 9 (Deployment):   [✅/❌] - [X] agents succeeded, [X] failed

FAILED AGENTS:
─────────────────────────────────────────────────────────────
Agent: [name]
Phase: [phase]
Error: [error message]
Root Cause: [your analysis]
Fix Location: [file:line in AGENT code]

OUTPUT QUALITY:
─────────────────────────────────────────────────────────────
Pages Generated: [X] / 18
Components Generated: [X] / 45+
All Links Working: [YES/NO]
Responsive: [YES/NO]
Glassmorphism Applied: [YES/NO]
Typography Correct: [YES/NO]
```

---

## 🔧 HOW TO FIX THE SOURCE

### When an Agent Fails, Ask These Questions:

```
1. WHAT failed?
   - Which agent?
   - Which phase?
   - What was the error message?

2. WHY did it fail?
   - Bad input data?
   - Bug in agent code?
   - Missing dependency?
   - Timeout?
   - API error?

3. WHERE is the source?
   - Agent file: src/agents/[agent-name]/
   - Agent prompt: src/agents/[agent-name]/prompts/
   - Agent config: src/agents/[agent-name]/config.ts

4. HOW to fix?
   - If bad input: Fix the upstream agent that produces the input
   - If bug in agent: Fix the agent code
   - If bad prompt: Fix the agent's prompt template
   - If timeout: Increase timeout or simplify task
```

### Example: Fixing the PIXEL Agent

```
PROBLEM:
Agent: pixel
Error: "e.variants?.sort is not a function"

ANALYSIS:
- pixel agent expects variants to be an array
- But it received an object
- Upstream agent (palette) sends wrong data structure

ROOT CAUSE:
File: src/agents/palette/index.ts
Line: 127
Code: return { variants: { primary: '...', secondary: '...' } }
Problem: Returns object, should return array

FIX (in SOURCE, not output):
File: src/agents/palette/index.ts
Line: 127
Change:
  return { variants: { primary: '...', secondary: '...' } }
To:
  return { variants: [{ name: 'primary', ... }, { name: 'secondary', ... }] }

OR fix pixel to handle both:
File: src/agents/pixel/index.ts
Add:
  const variants = Array.isArray(input.variants) 
    ? input.variants 
    : Object.entries(input.variants).map(([k, v]) => ({ name: k, ...v }));
```

---

## 📊 ERROR PATTERN DATABASE

### Build This Over Time

```
┌────────────────────┬─────────────────────────┬────────────────────────────────┐
│ Error Pattern      │ Root Cause              │ Fix Location                   │
├────────────────────┼─────────────────────────┼────────────────────────────────┤
│ "X is not a        │ Data type mismatch      │ Fix upstream agent output      │
│ function"          │ (expected array, got    │ OR fix agent to handle both    │
│                    │ object)                 │                                │
├────────────────────┼─────────────────────────┼────────────────────────────────┤
│ "Cannot read       │ Missing data in         │ Add null checks in agent       │
│ property of        │ input                   │ OR fix upstream to always      │
│ undefined"         │                         │ provide data                   │
├────────────────────┼─────────────────────────┼────────────────────────────────┤
│ "Agent X timed     │ Task too complex OR     │ Increase timeout OR            │
│ out"               │ API slow                │ simplify agent task            │
├────────────────────┼─────────────────────────┼────────────────────────────────┤
│ "Rate limit"       │ Too many API calls      │ Add delay between calls OR     │
│                    │                         │ batch requests                 │
├────────────────────┼─────────────────────────┼────────────────────────────────┤
│ Agent produces     │ Bad prompt in agent     │ Fix agent's prompt template    │
│ wrong output       │                         │ in src/agents/X/prompts/       │
├────────────────────┼─────────────────────────┼────────────────────────────────┤
│ Missing component  │ Agent skipped due to    │ Fix dependency chain OR        │
│ in output          │ dependency failure      │ fix the upstream agent         │
├────────────────────┼─────────────────────────┼────────────────────────────────┤
│ Styling incorrect  │ Design system not       │ Fix palette/grid agent         │
│                    │ properly passed         │ output format                  │
├────────────────────┼─────────────────────────┼────────────────────────────────┤
│ Links broken       │ Router/navigation       │ Fix the agent that generates   │
│                    │ agent failed            │ routes (cartographer?)         │
└────────────────────┴─────────────────────────┴────────────────────────────────┘
```

---

## 🔄 THE IMPROVEMENT LOOP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   1. OLYMPUS runs build with master prompt                                 │
│                           │                                                 │
│                           ▼                                                 │
│   2. Build completes (success, partial, or failed)                         │
│                           │                                                 │
│                           ▼                                                 │
│   3. Claude Code analyzes results                                          │
│      - What failed?                                                        │
│      - Why did it fail?                                                    │
│      - Where is the source of the problem?                                 │
│                           │                                                 │
│                           ▼                                                 │
│   4. Claude Code fixes the SOURCE (agent code/prompts)                     │
│      - NOT the generated output                                            │
│      - The actual agent that produced bad output                           │
│                           │                                                 │
│                           ▼                                                 │
│   5. Rebuild OLYMPUS (npm run build)                                       │
│                           │                                                 │
│                           ▼                                                 │
│   6. Re-run the build with same master prompt                              │
│                           │                                                 │
│                           ▼                                                 │
│   7. Repeat until 100% success                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ❌ WHAT YOU MUST NOT DO

```
DO NOT:
─────────────────────────────────────────────────────────────

1. DO NOT manually write UI code
   - OLYMPUS writes the UI
   - You fix OLYMPUS when it fails

2. DO NOT make design decisions
   - The master prompt has all design specs
   - OLYMPUS follows the spec
   - If output doesn't match spec, fix the agent

3. DO NOT skip sections of the master prompt
   - All 22 sections must be executed
   - If OLYMPUS skips something, find out why

4. DO NOT fix the generated output directly
   - If a component is wrong, fix the agent that generated it
   - Re-run the build to get correct output

5. DO NOT guess at fixes
   - Always analyze the actual error
   - Find the actual root cause
   - Fix the actual source
```

---

## ✅ WHAT YOU MUST DO

```
DO:
─────────────────────────────────────────────────────────────

1. Feed the complete master prompt to OLYMPUS
   - No modifications
   - No shortcuts
   - All 22 sections

2. Monitor the build continuously
   - Watch progress
   - Track failed agents
   - Note error messages

3. Analyze failures systematically
   - What failed?
   - Why did it fail?
   - Where is the source?

4. Fix the SOURCE
   - Agent code in src/agents/
   - Agent prompts in src/agents/X/prompts/
   - Configuration in src/agents/X/config.ts
   - Orchestrator if needed

5. Document patterns
   - Build an error database
   - Note common failures
   - Create permanent fixes

6. Re-run until success
   - Same master prompt
   - Fixed agents
   - 100% completion
```

---

## 📈 SUCCESS CRITERIA

```
BUILD IS SUCCESSFUL WHEN:
─────────────────────────────────────────────────────────────

□ All 9 phases completed
□ All 40 agents executed (or skipped with reason)
□ 0 failed agents (or acceptable failures documented)
□ All 18 pages generated
□ All 45+ components generated
□ All footer links working
□ Glassmorphism applied to all cards
□ Typography matches spec (body ≥ 18px)
□ Responsive design working
□ No console errors
□ Quality score ≥ 80/100

IF NOT MET:
- Analyze what's wrong
- Fix the SOURCE (agents)
- Re-run build
- Repeat
```

---

## 🎯 YOUR MISSION

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   DISCOVER THE WEAKNESSES IN OLYMPUS.                                                ║
║   FIX THE SOURCE.                                                                    ║
║   MAKE OLYMPUS STRONGER.                                                             ║
║                                                                                       ║
║   Every error you fix in an agent makes OLYMPUS better for ALL future builds.       ║
║   You're not building one UI. You're improving the entire system.                   ║
║                                                                                       ║
║   THE GOAL: OLYMPUS delivers 100% complete projects with zero intervention.         ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# THIS IS YOUR ROLE. ANALYST. DEBUGGER. SOURCE FIXER.
# NOT BUILDER. OLYMPUS BUILDS. YOU IMPROVE OLYMPUS.
