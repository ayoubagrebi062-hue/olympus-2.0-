# GOVERNANCE_FLOW.md

## How Understanding Gates Are Surfaced in the UI

**Document Type:** Design Artifact
**Phase:** 2 - System Design
**Created:** 2026-01-20
**Author:** OLYMPUS Self-Build

---

## Core Governance Principle

**No user ships code they do not understand.**

This is not a suggestion. It is enforced by the system through **gates** - mandatory decision points that block pipeline progression until the operator demonstrates understanding.

---

## What Is a Gate?

A gate is:

- A pause in pipeline execution
- A presentation of artifacts requiring review
- A set of explicit choices
- A record of the decision made

A gate is NOT:

- A confirmation dialog ("Are you sure?")
- A notification to dismiss
- An optional review step
- Something that can be auto-approved

---

## Gate Types

### 1. PHASE GATE

**Triggers:** After each phase completes
**Purpose:** Confirm phase outputs before proceeding

```
┌─────────────────────────────────────────────────────────────────┐
│ GATE: Design Phase Complete                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  5 artifacts produced:                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✓ palette.json    - Color system (12 tokens)                ││
│  │ ✓ grid.json       - Layout system (8 columns, 16px gutter)  ││
│  │ ✓ blocks.json     - Component inventory (23 components)     ││
│  │ ⚠ cartographer.md - Site map (warning: 2 orphan pages)      ││
│  │ ✓ flow.json       - User flows (4 primary flows)            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Click any artifact to inspect in detail.                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   APPROVE    │  │   ITERATE    │  │    ABORT     │           │
│  │ Proceed to   │  │ Re-run with  │  │ Cancel build │           │
│  │ Architecture │  │ adjustments  │  │ Keep outputs │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  Keyboard: [A]pprove  [I]terate  [X] Abort                       │
└─────────────────────────────────────────────────────────────────┘
```

**Operator must:**

1. Review artifact list (warnings highlighted)
2. Optionally inspect each artifact
3. Choose: Approve / Iterate / Abort

**System records:**

- Which artifacts were inspected (time spent)
- Which decision was made
- Timestamp

---

### 2. CRITICAL FAILURE GATE

**Triggers:** When a critical component fails
**Purpose:** Decide how to handle unrecoverable failure

```
┌─────────────────────────────────────────────────────────────────┐
│ GATE: Critical Failure                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Agent: pixel (frontend phase)                                   │
│  Component: ContextualChat                                       │
│  Priority: CRITICAL                                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Error: Rate limit exceeded for llama-3.3-70b-versatile      ││
│  │                                                              ││
│  │ Context:                                                     ││
│  │ - 6/6 Groq API keys exhausted                                ││
│  │ - OpenAI fallback attempted: timeout after 30s               ││
│  │ - Tokens consumed this build: 67,464                         ││
│  │ - Time elapsed: 66 seconds                                   ││
│  │                                                              ││
│  │ This component is marked CRITICAL.                           ││
│  │ Build cannot complete without it.                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │    RETRY     │  │    WAIT      │  │    ABORT     │           │
│  │ Try again    │  │ Pause build  │  │ End build    │           │
│  │ immediately  │  │ retry later  │  │ save outputs │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  Keyboard: [R]etry  [W]ait  [X] Abort                            │
└─────────────────────────────────────────────────────────────────┘
```

**Operator must:**

1. Read the full error context
2. Understand why it failed
3. Choose: Retry / Wait / Abort

**System does NOT:**

- Auto-retry without asking
- Silently skip the component
- Downgrade from critical to optional

---

### 3. SHIP GATE

**Triggers:** After all phases complete successfully
**Purpose:** Final review before export/deploy

```
┌─────────────────────────────────────────────────────────────────┐
│ GATE: Ready to Ship                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Build: olympus-dashboard-1737412800000                          │
│  Duration: 4m 32s                                                │
│  Total cost: $0.47 (234,891 tokens)                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ARTIFACTS SUMMARY                                            ││
│  │                                                              ││
│  │ Discovery:    5/5 ✓    Design:       5/5 ✓                  ││
│  │ Architecture: 5/5 ✓    Frontend:     2/2 ✓                  ││
│  │ Backend:      2/2 ✓    Integration:  2/2 ✓                  ││
│  │                                                              ││
│  │ Total: 21 artifacts, 0 warnings, 0 errors                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  UNDERSTANDING CHECKLIST                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [ ] I have reviewed the generated components                 ││
│  │ [ ] I understand the API routes created                      ││
│  │ [ ] I have checked the data models                           ││
│  │ [ ] I accept responsibility for this code                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │    EXPORT    │  │   ITERATE    │  │   DISCARD    │           │
│  │ Download all │  │ Run another  │  │ Delete build │           │
│  │ artifacts    │  │ build pass   │  │ permanently  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  EXPORT disabled until all checkboxes are checked.               │
└─────────────────────────────────────────────────────────────────┘
```

**Operator must:**

1. Review build summary
2. Check all understanding checkboxes
3. Choose: Export / Iterate / Discard

**System enforces:**

- EXPORT button disabled until checklist complete
- Checklist state is logged
- No "select all" shortcut

---

### 4. VALIDATION GATE

**Triggers:** When artifact validation fails
**Purpose:** Decide whether to accept degraded output

```
┌─────────────────────────────────────────────────────────────────┐
│ GATE: Validation Warning                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Agent: strategos                                                │
│  Artifact: strategos.json                                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Validation errors:                                           ││
│  │                                                              ││
│  │ 1. competitorAnalysis: expected array, got object            ││
│  │    Line 45: "competitorAnalysis": { "main": "..." }          ││
│  │    Expected: "competitorAnalysis": [{ "name": "..." }]       ││
│  │                                                              ││
│  │ 2. marketSize: missing required field                        ││
│  │    Expected field 'marketSize' not present in output         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Impact: Downstream agents may receive incomplete data.          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   ACCEPT     │  │  RE-GENERATE │  │    ABORT     │           │
│  │ Use as-is    │  │ Try agent    │  │ Cancel build │           │
│  │ (degraded)   │  │ again        │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  Keyboard: [A]ccept  [R]e-generate  [X] Abort                    │
└─────────────────────────────────────────────────────────────────┘
```

**Operator must:**

1. Read validation errors
2. Understand the impact
3. Choose: Accept (degraded) / Re-generate / Abort

---

## Gate Presentation Rules

### Visual Hierarchy

1. Gate modal overlays entire screen (no interaction with background)
2. Dim background to 30% opacity
3. Gate modal centered, max-width 800px
4. Primary action (if safe) on the right
5. Destructive action (abort/discard) styled differently (red outline, not filled)

### Information Density in Gates

- Full artifact list visible without scrolling (if < 10)
- Scrollable artifact list if > 10
- Error details fully visible (no truncation)
- Expand/collapse for stack traces

### Keyboard Navigation

- Tab cycles through options
- Enter activates focused option
- Single-letter shortcuts for each option (shown in brackets)
- Escape does NOT dismiss (gates cannot be dismissed without decision)

---

## Understanding Enforcement Mechanisms

### 1. Inspection Tracking

System records when operator inspects an artifact:

```typescript
{
  artifactId: "palette.json",
  inspectedAt: "2026-01-20T12:34:56Z",
  inspectionDuration: 45, // seconds
  scrolledToEnd: true
}
```

This data is NOT used to block gates, but IS included in audit logs.

### 2. Checklist Enforcement

Ship gate checklist cannot be bypassed:

- Each checkbox requires individual click
- No "check all" button
- Checkboxes reset if operator navigates away and returns
- Checking a box logs the action

### 3. Decision Recording

Every gate decision is permanently recorded:

```typescript
{
  gateId: "phase-gate-design",
  buildId: "build-123",
  decision: "approve",
  decidedAt: "2026-01-20T12:35:00Z",
  artifactsInspected: ["palette.json", "grid.json"],
  timeAtGate: 120 // seconds spent at gate before decision
}
```

### 4. No Automation Bypass

There is no API to programmatically approve gates. Gates require human interaction through the UI. This is intentional. Automated pipelines that call OLYMPUS must either:

- Operate in "draft mode" (no ship gate)
- Have a human approve the ship gate manually

---

## Gate Timeout Behavior

Gates do NOT timeout. A gate will wait indefinitely.

If the WebSocket disconnects while at a gate:

- Build remains paused
- Gate state preserved server-side
- Reconnection restores gate modal
- No automatic abort on disconnect

---

## Failure of Gates Themselves

If the gate UI fails to render:

1. Build remains paused
2. Error logged to Output Stream
3. `:gate` command available to re-trigger gate modal
4. Manual decision via command: `:gate approve` / `:gate abort`

Gate failure does NOT auto-approve or auto-abort.

---

## Audit Trail

All governance decisions are immutable records:

```
BUILD AUDIT: olympus-dashboard-1737412800000
────────────────────────────────────────────────────────────────
12:30:00  BUILD_START    operator=ayoub
12:31:15  PHASE_GATE     phase=discovery  decision=approve  time_at_gate=45s
12:32:30  PHASE_GATE     phase=design     decision=approve  time_at_gate=30s
12:33:45  VALIDATION_GATE agent=strategos decision=accept   time_at_gate=60s
12:35:00  PHASE_GATE     phase=arch       decision=approve  time_at_gate=20s
12:36:15  CRITICAL_GATE  agent=pixel      decision=retry    time_at_gate=90s
12:37:30  CRITICAL_GATE  agent=pixel      decision=abort    time_at_gate=45s
12:37:30  BUILD_END      status=aborted   artifacts=15/21
────────────────────────────────────────────────────────────────
```

This audit is:

- Stored with the build
- Exportable
- Immutable (append-only)
- Human-readable

---

## Uncertainty Statement

**What remains uncertain:**

1. Whether phase gates should be optional for experienced users (trust mode)
2. Whether checklist items should be customizable per build type
3. Optimal time threshold for "meaningful inspection" tracking
4. Whether to surface inspection metrics to the operator (gamification risk)

These uncertainties are acknowledged. The default is maximum friction. Relaxation requires explicit justification.

---

_Gates are not speed bumps. They are checkpoints. The system cannot proceed without operator understanding._
