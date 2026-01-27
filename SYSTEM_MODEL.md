# SYSTEM_MODEL.md

## The ONE Mental Model Users Must Internalize

**Document Type:** Design Artifact
**Phase:** 2 - System Design
**Created:** 2026-01-20
**Author:** OLYMPUS Self-Build

---

## The Model: Build Pipeline Operator

OLYMPUS is a **pipeline**.

Not a chat. Not a file browser. Not a project manager. Not an IDE.

A **pipeline** with:

- **Phases** that execute in order
- **Agents** that produce outputs
- **Artifacts** that accumulate
- **Gates** that require operator decision
- **Failure** that halts and reports

The user is the **operator**. They do not converse with the system. They:

1. Configure the pipeline
2. Start the pipeline
3. Monitor the pipeline
4. Inspect outputs
5. Decide to ship or abort

---

## Visual Metaphor

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUILD PIPELINE                           │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬────┤
│DISCOVERY│ DESIGN  │  ARCH   │FRONTEND │ BACKEND │ INTEGR  │SHIP│
│  ████   │  ████   │  ██░░   │  ░░░░   │  ░░░░   │  ░░░░   │ ?  │
│ 5 agents│ 5 agents│ 5 agents│ 2 agents│ 2 agents│ 2 agents│GATE│
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴────┘
                          ▲
                     YOU ARE HERE
```

The pipeline progresses left to right. Each phase contains agents. Agents produce artifacts. The final gate requires operator approval.

---

## Core Concepts (Exactly 5)

Users must understand these 5 concepts. No more. No fewer.

### 1. BUILD

A single execution of the pipeline from start to finish (or failure).

- Has a unique ID
- Has a start time and end time (or ongoing)
- Has a status: `pending` | `running` | `paused` | `completed` | `failed`
- Accumulates artifacts
- Consumes tokens

**User question this answers:** "What am I running right now?"

### 2. PHASE

A stage in the pipeline containing related agents.

Six phases, always in this order:

1. **Discovery** - Understanding what to build (oracle, empathy, venture, strategos, scope)
2. **Design** - Visual and UX decisions (palette, grid, blocks, cartographer, flow)
3. **Architecture** - Technical structure (archon, datum, nexus, forge, sentinel)
4. **Frontend** - UI components (pixel, wire)
5. **Backend** - API and logic (engine, keeper)
6. **Integration** - Connecting parts (bridge, notify)

**User question this answers:** "Which part of the build is happening now?"

### 3. AGENT

A specialized AI worker that produces one type of output.

- Has a name and responsibility
- Runs within a phase
- Produces exactly one artifact type
- Can succeed, fail, or be skipped
- Consumes tokens

**User question this answers:** "Who is doing the work right now?"

### 4. ARTIFACT

A discrete output produced by an agent.

- Has a type (document, schema, component, route, etc.)
- Has content (viewable, inspectable)
- Has validation status (valid, invalid, warning)
- Belongs to exactly one agent
- Persists after build completion

**User question this answers:** "What did the build produce?"

### 5. GATE

A decision point requiring operator action.

- Cannot be bypassed
- Presents artifacts for review
- Offers explicit choices: approve, reject, iterate
- Blocks pipeline until resolved

**User question this answers:** "What do I need to decide?"

---

## What The Model Excludes

These concepts are **not** part of the mental model:

| Excluded Concept | Why                                              |
| ---------------- | ------------------------------------------------ |
| Conversation     | OLYMPUS is not a chat partner                    |
| Project          | Builds are atomic; no persistent "project" state |
| File             | Artifacts are not files until exported           |
| Version          | No branching; each build is independent          |
| Collaboration    | Single operator per build                        |

If users ask about these, redirect to the 5 core concepts.

---

## Interaction Patterns

### Starting a Build

```
User provides: Build parameters (explicit configuration)
System does: Validates parameters, creates build, begins Phase 1
User sees: Pipeline view with Phase 1 active
```

### During a Build

```
User sees: Current phase, active agent, live output stream, token counter
User can: Pause, cancel, inspect completed artifacts
User cannot: Modify parameters mid-build, skip agents, force completion
```

### At a Gate

```
User sees: Artifacts requiring review, explicit options
User must: Choose an action (approve, reject, iterate)
System does: Proceeds or halts based on choice
User cannot: Ignore the gate, auto-approve, dismiss without action
```

### After Completion

```
User sees: Full artifact list, total cost, success/failure status
User can: Inspect any artifact, export, start new build
User cannot: Modify artifacts, partial export, "undo"
```

---

## Console-First Implementation

The mental model is the same whether in GUI or CLI.

**GUI renders:**

- Pipeline as horizontal progress bar with phase segments
- Agents as rows within phase panels
- Artifacts as expandable items
- Gates as modal overlays requiring action

**CLI renders:**

- Pipeline as text progress indicator
- Agents as streaming log lines
- Artifacts as file paths or inline content
- Gates as prompts requiring input

Same model. Different rendering.

---

## WebSocket Contract

Real-time updates follow this event model:

```typescript
type PipelineEvent =
  | { type: 'phase:start'; phase: PhaseName }
  | { type: 'phase:complete'; phase: PhaseName }
  | { type: 'agent:start'; agent: AgentName; phase: PhaseName }
  | { type: 'agent:output'; agent: AgentName; chunk: string }
  | { type: 'agent:complete'; agent: AgentName; artifact: Artifact }
  | { type: 'agent:failed'; agent: AgentName; error: Error }
  | { type: 'gate:pending'; gate: GateName; artifacts: Artifact[] }
  | { type: 'gate:resolved'; gate: GateName; decision: Decision }
  | { type: 'build:complete'; status: 'success' | 'failed' }
  | { type: 'cost:update'; tokens: number; cost: number };
```

Every UI state is derived from these events. No polling. No HTTP refresh.

---

## Failure Model

Failure is explicit, never hidden.

```
Agent fails → Build pauses → Gate appears → User decides:
  - Retry agent (same parameters)
  - Skip agent (if non-critical)
  - Abort build (preserve artifacts so far)

No silent retry. No auto-skip. No "something went wrong."
```

---

## Single Sentence Summary

**OLYMPUS is a pipeline you operate, not an assistant you converse with.**

If a user doesn't understand this sentence, they will misuse the system.

---

## Uncertainty Statement

**What remains uncertain:**

1. Whether 5 concepts is the right number (could be 4 or 6)
2. Whether "Gate" is the right term (alternatives: checkpoint, review, approval)
3. Whether excluding "Project" frustrates users who want continuity between builds

These uncertainties do not block Phase 2. They may inform Phase 3 terminology.

---

_This model is the foundation. All UI decisions must reinforce this model, never contradict it._
