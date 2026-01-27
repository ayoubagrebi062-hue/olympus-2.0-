# PRIMARY_SCREEN.md

## The Primary Screen and Its Permanent Panels

**Document Type:** Design Artifact
**Phase:** 2 - System Design
**Created:** 2026-01-20
**Author:** OLYMPUS Self-Build

---

## Design Constraint

There is ONE primary screen. Not multiple screens with navigation between them.

Users do not "go to" different pages. They operate from a single cockpit. Panels reveal and collapse. Context shifts. But the screen is singular.

---

## Screen Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│ HEADER (48px fixed)                                                        │
│ [Build ID] [Status] [Phase] [Agent]           [Tokens] [Cost] [Time] [●◐○]│
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ PIPELINE BAR (64px fixed)                                           │  │
│  │ [DISCOVERY][DESIGN][ARCH][FRONTEND][BACKEND][INTEGR] ══════▶ [SHIP] │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────┐  ┌────────────────────────────────────┐ │
│  │ OUTPUT STREAM (flex)         │  │ INSPECTOR (flex)                   │ │
│  │                              │  │                                    │ │
│  │ Real-time agent output       │  │ Selected artifact content          │ │
│  │ Streaming text               │  │ Or agent details                   │ │
│  │ Auto-scroll enabled          │  │ Or phase summary                   │ │
│  │                              │  │                                    │ │
│  │ [agent:pixel] Generating...  │  │ // BuildList.tsx                   │ │
│  │ > import React from 'react'  │  │ import React from 'react';         │ │
│  │ > export function BuildList  │  │ import { Build } from '@/types';   │ │
│  │ > ...                        │  │ ...                                │ │
│  │                              │  │                                    │ │
│  └──────────────────────────────┘  └────────────────────────────────────┘ │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ ARTIFACT INDEX (collapsible, 200px default)                         │  │
│  │ ▼ Discovery (5)  ▼ Design (5)  ▼ Architecture (5)  ▶ Frontend (0)   │  │
│  │   ✓ oracle.md      ✓ palette     ✓ archon.md         ○ pixel        │  │
│  │   ✓ empathy.md     ✓ grid        ✓ datum.json        ○ wire         │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ COMMAND BAR (40px fixed)                                                   │
│ > _                                                          [⏸][▶][⏹]   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Permanent Panels (Always Visible)

These panels are NEVER hidden. They compress but do not disappear.

### 1. HEADER (48px)

**Purpose:** Global status at a glance

**Contents:**
| Element | Description | Update Frequency |
|---------|-------------|------------------|
| Build ID | Current build identifier | Static per build |
| Status | `idle` `running` `paused` `completed` `failed` | Real-time |
| Phase | Current phase name | On phase change |
| Agent | Currently active agent | On agent change |
| Tokens | Total tokens consumed | Every 100 tokens |
| Cost | Estimated USD cost | Every 100 tokens |
| Time | Elapsed time | Every second |
| Connection | WebSocket status indicator | On state change |

**Interaction:** None. Display only. Users do not click header elements.

---

### 2. PIPELINE BAR (64px)

**Purpose:** Visual progress through phases

**Contents:**

- 6 phase segments + 1 ship gate
- Each segment shows: name, status (pending/active/complete/failed), agent count

**States:**

```
░░░░ = pending (gray)
████ = complete (green)
▓▓▓▓ = active (blue, animated)
xxxx = failed (red)
```

**Interaction:**

- Click phase → Inspector shows phase summary
- Click active phase → Inspector shows active agent details
- No click on pending phases (nothing to show)

---

### 3. COMMAND BAR (40px)

**Purpose:** Keyboard-first control interface

**Contents:**

- Text input for commands
- Control buttons: Pause, Resume, Cancel

**Commands:**

```
:pause          - Pause build
:resume         - Resume build
:cancel         - Cancel build (with confirmation)
:inspect <ref>  - Open artifact in inspector
:export         - Export all artifacts
:cost           - Show detailed cost breakdown
:help           - Show command list
```

**Interaction:**

- Focus with `/` or `:`
- Enter to execute
- Escape to clear
- Up/Down for command history

---

## Flexible Panels (Always Present, Resize Allowed)

### 4. OUTPUT STREAM

**Purpose:** Real-time view of agent execution

**Contents:**

- Streaming text from active agent
- Prefixed with agent name
- Timestamped entries
- Color-coded by type (info, warning, error, output)

**Behavior:**

- Auto-scrolls when at bottom
- Stops auto-scroll when user scrolls up
- "Jump to bottom" button appears when not at bottom
- Preserved across agent transitions (appended, not replaced)

**Density:** Maximum. No padding between lines. Monospace font. No syntax highlighting during stream (too expensive).

---

### 5. INSPECTOR

**Purpose:** Deep view of selected item

**Contents vary by selection:**

| Selection        | Inspector Shows                                              |
| ---------------- | ------------------------------------------------------------ |
| Nothing selected | Current agent details + live output                          |
| Artifact         | Full artifact content with syntax highlighting               |
| Phase            | Phase summary: agents, status, token usage                   |
| Agent            | Agent details: responsibility, output schema, current status |
| Error            | Full error details, stack trace, context                     |

**Behavior:**

- Selection persists until explicitly changed
- Split view available (Cmd+\) for comparing two artifacts
- Copy button always visible
- Expand to full-screen (Cmd+Shift+F)

---

### 6. ARTIFACT INDEX

**Purpose:** Inventory of all produced artifacts

**Contents:**

- Grouped by phase
- Each artifact: name, type, status icon, size
- Status icons: ✓ valid, ⚠ warning, ✗ invalid, ○ pending, ◐ generating

**Behavior:**

- Collapsible groups
- Click artifact → opens in Inspector
- Keyboard navigation (j/k)
- Search filter (/)

**Density:** Compact list. No thumbnails. No previews. Names only.

---

## Panel Resizing Rules

```
┌─────────────────────────────────────────┐
│ Header: FIXED 48px                      │
├─────────────────────────────────────────┤
│ Pipeline Bar: FIXED 64px                │
├─────────────────────────────────────────┤
│                                         │
│ Output Stream: MIN 200px, FLEX          │
│           ↔                             │
│ Inspector: MIN 300px, FLEX              │
│                                         │
├─────────────────────────────────────────┤
│ Artifact Index: MIN 100px, MAX 400px    │
├─────────────────────────────────────────┤
│ Command Bar: FIXED 40px                 │
└─────────────────────────────────────────┘
```

- Drag handle between Output Stream and Inspector (horizontal resize)
- Drag handle above Artifact Index (vertical resize)
- Double-click handle to reset to default
- Cmd+1/2/3 to focus Output/Inspector/Index

---

## Information Density Contract

Every pixel must earn its place.

| Forbidden                       | Required Instead                 |
| ------------------------------- | -------------------------------- |
| Whitespace > 16px               | Functional spacing only          |
| Icons without labels            | Text labels (icons optional)     |
| Tooltips hiding critical info   | Inline display                   |
| Scrolling to see status         | Status always visible in header  |
| Empty states with illustrations | Minimal text: "No artifacts yet" |

---

## Screen States

### State: IDLE (no build)

- Pipeline bar: all phases gray
- Output stream: empty or shows last build summary
- Inspector: empty or shows configuration form
- Command bar: ready for `:start` command

### State: RUNNING

- Pipeline bar: phases progress left to right
- Output stream: live agent output
- Inspector: current agent or selected artifact
- Command bar: `:pause` and `:cancel` available

### State: PAUSED

- Pipeline bar: active phase pulsing
- Output stream: frozen at pause point
- Inspector: unchanged
- Command bar: `:resume` and `:cancel` available

### State: GATE (awaiting decision)

- Pipeline bar: gate segment highlighted
- Output stream: gate prompt displayed
- Inspector: artifacts requiring review
- Command bar: gate-specific commands

### State: COMPLETED

- Pipeline bar: all phases green (or mixed if partial)
- Output stream: completion summary
- Inspector: any artifact selectable
- Command bar: `:export` and `:start` available

### State: FAILED

- Pipeline bar: failed phase marked red
- Output stream: error details
- Inspector: error context and stack trace
- Command bar: `:retry`, `:skip`, `:abort` available

---

## Keyboard Shortcuts

| Shortcut      | Action                  |
| ------------- | ----------------------- |
| `/` or `:`    | Focus command bar       |
| `Escape`      | Unfocus / close modal   |
| `Space`       | Pause/Resume build      |
| `j/k`         | Navigate artifact index |
| `Enter`       | Open selected artifact  |
| `Cmd+1`       | Focus output stream     |
| `Cmd+2`       | Focus inspector         |
| `Cmd+3`       | Focus artifact index    |
| `Cmd+\`       | Split inspector view    |
| `Cmd+Shift+F` | Inspector full-screen   |
| `Cmd+K`       | Command palette         |

---

## Uncertainty Statement

**What remains uncertain:**

1. Whether horizontal split (Output | Inspector) is better than vertical (Output above Inspector)
2. Whether Artifact Index should be a sidebar instead of bottom panel
3. Optimal default panel proportions
4. Whether command bar should support natural language (violates console-first?)

These are testable with prototypes. They do not block artifact creation.

---

_This screen is the cockpit. Users operate from here. They do not navigate away._
