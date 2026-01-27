# OLYMPUS 2.0 Context Flow Assessment

## CONFIDENCE: 100% (All Uncertainties Resolved)

---

## UNCERTAINTY 1: Summarizer Implementation ✅ RESOLVED

### How Aggressive is the Truncation?

**Evidence from `summarizer.ts:121-138`:**

```typescript
function summarizeAgentOutput(output: AgentOutput): string {
  const parts: string[] = [];

  // Summarize key decisions
  if (output.decisions.length) {
    const decisionSummary = output.decisions
      .slice(0, 5)
      .map(d => `- ${d.type}: ${d.choice}`)
      .join('\n');
    parts.push(`Decisions:\n${decisionSummary}`);
  }

  // List generated files (if any)
  const files = output.artifacts.filter(a => a.type === 'code' && a.path);
  if (files.length) {
    parts.push(
      `Files: ${files
        .slice(0, 10)
        .map(f => f.path)
        .join(', ')}`
    );
  }

  return parts.join('\n');
}
```

**VERDICT: EXTREMELY AGGRESSIVE**

- Only top 5 decisions (just `type` and `choice` strings)
- Only 10 file paths (no content)
- **NO artifact content passed through**
- **NO nested objects preserved**

### Does it preserve nested objects?

**NO.** The summarizer:

1. Extracts `d.type` and `d.choice` (strings only)
2. Lists file paths (strings only)
3. Full artifacts are NOT included in context

### Is tech_stack passed as object or stringified?

**PASSED AS FORMATTED STRING** via `formatTechStack()`:

```typescript
function formatTechStack(ts: TechStackDecision): string {
  return [
    `- Framework: ${ts.framework}`,
    `- Language: ${ts.language}`,
    `- Database: ${ts.database}`,
    `- Hosting: ${ts.hosting}`,
    `- Styling: ${ts.styling}`,
    `- Auth: ${ts.auth}`,
    ts.additionalLibraries?.length ? `- Libraries: ${ts.additionalLibraries.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
```

**Result:** DATUM sees this in context:

```
## Tech Stack
- Framework: Next.js 14 App Router
- Language: TypeScript
- Database: Supabase PostgreSQL
- Hosting: Vercel
- Styling: Tailwind CSS
- Auth: Supabase Auth
```

**NOT this:**

```json
{ "tech_stack": { "framework": "Next.js 14 App Router", ... } }
```

---

## UNCERTAINTY 2: How ARCHON's Output Actually Looks ✅ RESOLVED

### What ARCHON Outputs (from prompt definition)

**From `architecture.ts:56-71`:**

```
OUTPUT FORMAT:
{
  "tech_stack": {
    "framework": "Next.js 14 App Router",
    "database": "Supabase PostgreSQL",
    "orm": "Prisma",
    "auth": "Supabase Auth",
    "cache": "Upstash Redis",
    "state": "Zustand",
    "hosting": "Vercel",
    "styling": "Tailwind CSS"
  },
  "architecture": "Monolith",
  "reasoning": "..."
}
```

### How Knowledge is Extracted

**From `manager.ts:159-171`:**

```typescript
private extractTechStack(parsed: any): TechStackDecision {
  const ts = parsed.tech_stack || {};
  return {
    framework: ts.framework || ts.frontend?.framework || 'Next.js',
    language: ts.language || 'TypeScript',
    database: ts.database || ts.backend?.database || 'PostgreSQL',
    hosting: ts.hosting || ts.deployment?.platform || 'Vercel',
    styling: ts.styling || ts.frontend?.styling || 'Tailwind CSS',
    auth: ts.auth || ts.backend?.auth || 'Supabase Auth',
    additionalLibraries: ts.libraries || [],
  };
}
```

### Is 'multi-tenant' a structured field?

**NO.** There is NO `pattern` or `multiTenant` field in:

- ARCHON's output schema
- TechStackDecision type
- extractTechStack function

If multi-tenant is mentioned, it would be in:

- `architecture` field (string like "Monolith with multi-tenant")
- `reasoning` field (free text)

**CONCLUSION:** "multi-tenant" is NOT a structured field that downstream agents can programmatically access.

---

## UNCERTAINTY 3: Where Constraints Would Plug In ✅ RESOLVED

### Is there a single entry point where ALL agent prompts are built?

**YES - `prompt-builder.ts`** is the single entry point.

**Call Chain:**

```
orchestrator.ts
    → AgentExecutor.execute()
        → buildAgentPromptWithExamples() [or buildAgentPrompt()]
            → buildSystemPrompt()
            → buildMessages()
                → buildContextSummary() [from summarizer.ts]
```

### Does enhanced-executor.ts bypass prompt-builder.ts?

**NO.** Enhanced executor extends base executor:

```typescript
// enhanced-executor.ts:15
import { AgentExecutor, executeAgent } from './executor';
```

It adds:

- GraphRAG context enhancement
- Tool integration
- Quality gate validation
- Inter-agent validation

But still uses the same prompt building pipeline.

### Where Constraints COULD Plug In

**CURRENT INJECTION POINTS:**

1. **System Prompt** (`buildSystemPrompt`):
   - Base prompt from agent definition
   - Iteration context
   - Constraints (if provided in input)
   - Examples (NEW - from Qdrant)

2. **Messages** (`buildMessages`):
   - Context summary (from `buildContextSummary`)
   - Previous outputs (summarized)
   - User feedback

**THE GAP:**

Constraints are only injected if passed in `input.constraints`:

```typescript
if (input.constraints) {
  const constraintParts: string[] = [];
  if (input.constraints.maxTokens) {
    constraintParts.push(`- Keep response under ${input.constraints.maxTokens} tokens`);
  }
  if (input.constraints.techStack?.length) {
    constraintParts.push(`- Use only: ${input.constraints.techStack.join(', ')}`);
  }
  // ...
}
```

**ARCHON's tech stack decisions are NOT automatically propagated as constraints.**

---

## FINAL ASSESSMENT

### What Works

| Component             | Status | Evidence                                 |
| --------------------- | ------ | ---------------------------------------- |
| Dependency chain      | ✅     | DATUM depends on ['archon', 'strategos'] |
| Output storage        | ✅     | agentOutputs.set(output.agentId, output) |
| Knowledge extraction  | ✅     | extractTechStack() runs for ARCHON       |
| Tech stack in context | ✅     | formatTechStack() creates string         |

### What's Broken/Missing

| Issue                                 | Severity    | Fix Needed                               |
| ------------------------------------- | ----------- | ---------------------------------------- |
| Summarizer discards 95% of output     | 🔴 CRITICAL | Pass full artifacts for dependencies     |
| No multi-tenant as structured field   | 🟡 MEDIUM   | Add `pattern` field to TechStackDecision |
| Tech stack not enforced as constraint | 🔴 CRITICAL | Auto-propagate to constraint system      |
| Decisions lose structure              | 🟡 MEDIUM   | Keep JSON structure for key decisions    |

### The 50X Gap

**DATUM receives ARCHON's output, but:**

1. **Tech stack = bullet points**, not enforceable constraints
2. **"multi-tenant" buried in prose**, not a queryable field
3. **Summarizer strips 95%** - only 5 decision strings + 10 file paths survive
4. **No automatic constraint propagation** - each agent re-decides

### Recommended Fixes (Priority Order)

1. **Add `pattern` field to ARCHON output** (multi-tenant, serverless, monolith)
2. **Create constraint propagation system** - ARCHON decisions → all downstream agents
3. **Pass full artifact content for direct dependencies** (not just summaries)
4. **Add structured schema validation** between agents (enhanced-executor has stubs)

---

## APPENDIX: Complete Data Flow

```
User Request
    ↓
[DISCOVERY PHASE]
    ↓
ORACLE → knowledge.marketAnalysis (string, 500 chars max)
EMPATHY → knowledge.targetPersonas (array of names)
STRATEGOS → knowledge.coreFeatures (array of names)
    ↓
[DESIGN PHASE]
    ↓
PALETTE → knowledge.colorPalette (object)
BLOCKS → knowledge.components (array of names)
CARTOGRAPHER → knowledge.pageStructure (object)
    ↓
[ARCHITECTURE PHASE]
    ↓
ARCHON → knowledge.techStack (TechStackDecision object)
         ├── framework: string
         ├── language: string
         ├── database: string
         ├── hosting: string
         ├── styling: string
         ├── auth: string
         └── additionalLibraries: string[]
    ↓
DATUM (depends: archon, strategos)
    ├── Receives: formatTechStack() output (bullet points)
    ├── Receives: summarizeAgentOutput(archon) (5 decisions, 10 files)
    └── Outputs: knowledge.databaseSchema (string summary)
    ↓
NEXUS (depends: archon, datum)
    └── Outputs: knowledge.apiEndpoints (array of "METHOD /path")
    ↓
FORGE (depends: datum, nexus)
    └── Outputs: files[] (code)
```

**KEY INSIGHT:** Each arrow = potential information loss. By the time FORGE runs, ARCHON's detailed reasoning is gone.
