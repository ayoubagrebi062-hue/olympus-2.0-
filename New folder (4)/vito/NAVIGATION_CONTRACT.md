# NAVIGATION_CONTRACT.md

## What Is Always Visible vs. Contextual

**Document Type:** Design Artifact
**Phase:** 2 - System Design
**Created:** 2026-01-20
**Author:** OLYMPUS Self-Build

---

## Core Principle

There is no navigation. There is only **context switching within a single view**.

Users do not:
- Click links to other pages
- Use browser back/forward
- Have multiple tabs for different sections
- Navigate a menu hierarchy

Users do:
- Change what the Inspector shows
- Collapse/expand panels
- Filter the artifact index
- Switch between build history (if viewing past builds)

---

## Visibility Tiers

### Tier 1: PERMANENT (Never Hidden)

These elements are visible in every state, at all times.

| Element | Justification |
|---------|---------------|
| Build status | User must always know: is something running? |
| Token count | User must always know: what am I spending? |
| Connection indicator | User must always know: am I connected? |
| Pipeline bar | User must always know: where am I in the process? |
| Command bar | User must always have input capability |

**Rule:** If a user looks away for 10 seconds and looks back, they must immediately know system state from Tier 1 elements alone.

---

### Tier 2: PERSISTENT (Always Present, May Collapse)

These panels exist on screen but can be resized to minimum.

| Panel | Minimum State | Full State |
|-------|---------------|------------|
| Output Stream | 200px height, scrollable | Full flex space |
| Inspector | 300px width | Full flex space |
| Artifact Index | 100px height, collapsed groups | 400px, expanded groups |

**Rule:** Collapsing to minimum is allowed. Hiding entirely is not.

**Implementation:**
- Double-click divider = toggle between min and default
- Drag divider = custom sizing
- No "close" button on any panel

---

### Tier 3: CONTEXTUAL (Shown Based on State)

These elements appear only when relevant.

| Element | Appears When | Disappears When |
|---------|--------------|-----------------|
| Gate modal | Gate pending | Gate resolved |
| Error details | Build failed | New build starts |
| Export options | Build complete | Export finished or cancelled |
| Cost breakdown | User requests `:cost` | User dismisses |
| Command palette | User presses Cmd+K | Selection made or Escape |
| Search filter | User presses `/` in index | Escape or selection |

**Rule:** Contextual elements overlay; they do not replace persistent panels.

---

### Tier 4: ON-DEMAND (Explicitly Requested)

These views require explicit user action and replace the default layout.

| View | Trigger | Return |
|------|---------|--------|
| Settings | `:settings` command | Escape or save |
| Build history | `:history` command | Select build or Escape |
| Help | `:help` command | Escape |
| Full-screen Inspector | Cmd+Shift+F | Escape |

**Rule:** On-demand views are modal. They block other interaction until dismissed. This is intentional friction.

---

## Navigation Anti-Patterns (Forbidden)

### 1. No Tab Bar
```
FORBIDDEN:
┌─────┬─────────┬──────────┬──────────┐
│Builds│ Agents │ Settings │  Help    │
└─────┴─────────┴──────────┴──────────┘

REASON: Implies multiple "places" to be. There is one place.
```

### 2. No Sidebar Menu
```
FORBIDDEN:
┌────────┬───────────────────────────┐
│ Home   │                           │
│ Builds │                           │
│ Config │                           │
│ Docs   │                           │
└────────┴───────────────────────────┘

REASON: Creates hierarchy. OLYMPUS is flat.
```

### 3. No Breadcrumbs
```
FORBIDDEN:
Home > Builds > build-123 > Agents > pixel

REASON: Implies depth. There is no depth.
```

### 4. No Browser History Manipulation
```
FORBIDDEN:
- pushState on panel changes
- Different URLs for different views
- Back button behavior

REASON: The URL is the build. /build/123 is the only meaningful URL.
```

---

## URL Contract

```
/                     → Primary screen (idle state)
/build/:id            → Primary screen (viewing build :id)
/build/:id/artifact/:ref → Primary screen with artifact open in inspector

No other routes exist.
```

Query parameters for UI state (panel sizes, selections) are acceptable but not required:
```
/build/123?inspector=artifact:oracle.md&output=collapsed
```

---

## Focus Management

At any moment, exactly ONE panel has keyboard focus.

| Focus State | Keyboard Behavior |
|-------------|-------------------|
| Command bar | Typing enters commands |
| Output stream | j/k scroll, / search |
| Inspector | j/k navigate content, / search |
| Artifact index | j/k navigate, Enter select |
| Modal | Tab cycles options, Enter confirms, Escape dismisses |

**Focus indicators:**
- Subtle border highlight (2px, accent color)
- No focus ring that obscures content

**Focus transfer:**
- Tab cycles: Command → Output → Inspector → Index → Command
- Cmd+1/2/3 jumps directly
- Escape returns focus to Command bar

---

## Context Preservation

When context changes, preserve user state where sensible.

| Action | Preserved | Reset |
|--------|-----------|-------|
| Start new build | Panel sizes | Selections, scroll positions |
| View different build | Panel sizes, focus | Selections, filters |
| Refresh page | Nothing | Everything (WebSocket reconnects, state rehydrates) |
| Return from modal | Everything | Modal-specific state |

---

## What "Chat Secondary" Means

Chat exists but is subordinate to the console paradigm.

**Chat panel rules:**
- Not visible by default
- Activated via `:chat` command
- Appears as overlay on Inspector panel (does not create new panel)
- Messages are logged to Output Stream as well
- Chat cannot initiate builds (must use `:start` command)
- Chat can answer questions about current build state
- Chat cannot modify artifacts

**Chat is for:**
- "What does this error mean?"
- "Explain what archon agent does"
- "Why did the build fail?"

**Chat is NOT for:**
- "Build me an app"
- "Change the color scheme"
- "Deploy this"

If user attempts build commands in chat, response is: "Use `:start` command to initiate builds."

---

## Visibility State Machine

```
                    ┌──────────┐
                    │   IDLE   │
                    └────┬─────┘
                         │ :start
                         ▼
                    ┌──────────┐
            ┌───────│ RUNNING  │───────┐
            │       └────┬─────┘       │
            │ :pause     │ gate        │ complete
            ▼            ▼             ▼
       ┌────────┐   ┌────────┐   ┌───────────┐
       │ PAUSED │   │  GATE  │   │ COMPLETED │
       └───┬────┘   └───┬────┘   └───────────┘
           │ :resume    │ decision
           └────────────┴──────────┐
                                   ▼
                              ┌──────────┐
                         ┌────│ RUNNING  │
                         │    └──────────┘
                         │ error
                         ▼
                    ┌──────────┐
                    │  FAILED  │
                    └──────────┘
```

Each state determines:
- Which Tier 3 elements appear
- Which commands are valid
- What Inspector shows by default

---

## Uncertainty Statement

**What remains uncertain:**

1. Whether chat overlay is the right approach (vs. dedicated panel)
2. Whether URL state for UI preferences adds value or complexity
3. Whether `:history` should be inline (filtered index) vs. overlay
4. How to handle multiple monitors (duplicate view? extended view?)

These do not block implementation. They can be resolved through user testing.

---

*Navigation is not a feature. It's a failure mode. Every "where am I?" question is a design bug.*
