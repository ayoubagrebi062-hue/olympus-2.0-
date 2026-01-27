# OLYMPUS SYSTEM INVARIANTS

These invariants are enforced in code. Violation triggers `HARD_STOP`.

---

## SI-01: NO AUTO-APPROVE

```
INVARIANT: Every gate transition to 'passed' requires:
  - actorId !== null
  - reason.length >= 10
  - decidedAt !== null

ENFORCEMENT: requireManualApproval() in governance/enforcement.ts
VIOLATION: HARD_STOP('APPROVAL_REQUIRES_ACTOR') or HARD_STOP('APPROVAL_REQUIRES_REASON')
```

---

## SI-02: NO SILENT FAILURE

```
INVARIANT: Every error with severity FATAL must be:
  - Logged with timestamp, severity, message
  - Recorded in state.errors
  - Visible in Inspector error mode

ENFORCEMENT: recordFailure() in governance/enforcement.ts
VIOLATION: HARD_STOP(message) for FATAL severity
```

---

## SI-03: NO OPTIMISTIC SUCCESS

```
INVARIANT: State transitions must be verified before proceeding:
  - Expected state must match actual state
  - No assumptions about system state

ENFORCEMENT: verifyState() in governance/enforcement.ts
VIOLATION: HARD_STOP('STATE_MISMATCH: ...')
```

---

## SI-04: HASH-CHAINED DECISIONS

```
INVARIANT: Every irreversible action produces a DecisionTrace with:
  - hash: SHA256 of decision content
  - parentHash: hash of previous decision (or null for first)
  - timestamp: ISO 8601 datetime
  - actor: identity of decision maker
  - reason: explanation of decision
  - constraints: explicit constraints
  - alternativesConsidered: alternatives evaluated

ENFORCEMENT: hashDecision() and authorizeIrreversibleAction() in governance/enforcement.ts
VIOLATION: HARD_STOP('INSUFFICIENT_REASON') or similar
```

---

## SI-05: EXPLICIT RESOURCE LIMITS

```
INVARIANT: System enforces hard limits:
  - MAX_CONCURRENT_BUILDS: 5
  - MAX_TOKENS_PER_BUILD: 500,000
  - MAX_ARTIFACTS_PER_BUILD: 100
  - MAX_BUILD_DURATION_MS: 3,600,000 (1 hour)

ENFORCEMENT: LIMITS constant in types/core.ts, checked in build state
VIOLATION: Build terminated, no graceful degradation
```

---

## SI-06: GATE ENFORCEMENT

```
INVARIANT: Gate must be in valid state before phase transition:
  - blocked → HARD_STOP
  - failed → HARD_STOP
  - pending (non-phase) → HARD_STOP

ENFORCEMENT: enforceGate() in governance/enforcement.ts
VIOLATION: HARD_STOP('GATE_BLOCKED'), HARD_STOP('GATE_FAILED'), HARD_STOP('GATE_PENDING')
```

---

## SI-07: TRUST DEGRADATION MONITORING

```
INVARIANT: Trust score changes must be:
  - Recorded as TrustEvent
  - Visible in Inspector trust mode
  - Warned if degradation >= 10 points

ENFORCEMENT: checkTrustDegradation() in governance/enforcement.ts, BUILD_UPDATED reducer
VIOLATION: Warning logged (not HARD_STOP, but visible)
```

---

## SI-08: COMMAND RISK CLASSIFICATION

```
INVARIANT: Every command has explicit risk level:
  - low: immediate execution
  - medium: warning displayed
  - high: confirmation required
  - critical: confirmation required + written override

ENFORCEMENT: COMMANDS constant in commands/parser.ts, CommandBar component
VIOLATION: N/A (classification is exhaustive)
```

---

## SI-09: IMMUTABLE STATE TRANSITIONS

```
INVARIANT: State is never mutated, only transformed via reducer:
  - All state fields are readonly
  - Reducer returns new state object
  - No direct mutation of state

ENFORCEMENT: TypeScript readonly types, olympusReducer() in state/build-state.ts
VIOLATION: TypeScript compile error
```

---

## SI-10: SINGLE INSPECTOR MODE

```
INVARIANT: Inspector displays exactly one mode at a time:
  - mode: InspectorMode (one of 8 modes)
  - targetId: string | null
  - No mixed views, no split panels

ENFORCEMENT: INSPECTOR_MODE_CHANGED action, Inspector component
VIOLATION: N/A (UI enforces single mode)
```

---

## SI-11: VIRTUALIZED OUTPUT STREAM

```
INVARIANT: Output stream is virtualized and bounded:
  - Max 10,000 entries in memory
  - Older entries trimmed on overflow
  - Visible entries computed from scroll position

ENFORCEMENT: OUTPUT_RECEIVED reducer, OutputStream component with ENTRY_HEIGHT and OVERSCAN
VIOLATION: N/A (automatic trimming)
```

---

## SI-12: DARK MODE ONLY

```
INVARIANT: UI is dark mode only:
  - bg.primary: #0a0a0a
  - No light mode
  - No theme switching

ENFORCEMENT: TOKENS constant in components/tokens.ts, CockpitLayout styles
VIOLATION: N/A (no toggle exists)
```

---

## SI-13: SYSTEM MONOSPACE ONLY

```
INVARIANT: All text uses system monospace font stack:
  - font.family: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
  - No variable fonts
  - No decorative fonts

ENFORCEMENT: TOKENS.font.family in components/tokens.ts
VIOLATION: N/A (no font switching)
```

---

## SI-14: FIXED TYPOGRAPHY SCALE

```
INVARIANT: Typography uses fixed sizes:
  - xs: 10px
  - sm: 11px
  - base: 12px
  - md: 13px
  - lg: 14px
  - xl: 16px

ENFORCEMENT: TOKENS.font.size in components/tokens.ts
VIOLATION: N/A (sizes are constants)
```

---

## SI-15: 4PX SPACING GRID

```
INVARIANT: All spacing uses 4px grid:
  - space.1: 4px
  - space.2: 8px
  - space.3: 12px
  - etc.

ENFORCEMENT: TOKENS.space in components/tokens.ts
VIOLATION: N/A (developer discipline)
```

---

## SI-16: MAX RADIUS 4PX

```
INVARIANT: Border radius never exceeds 4px:
  - radius.none: 0px
  - radius.sm: 2px
  - radius.default: 4px

ENFORCEMENT: TOKENS.radius in components/tokens.ts
VIOLATION: N/A (no larger radii defined)
```

---

## SI-17: NO DECORATIVE ANIMATIONS

```
INVARIANT: Only state transition animations allowed:
  - max-height transition for collapse
  - border-color transition for hover
  - No loading spinners, no progress bars, no bounces

ENFORCEMENT: Inline styles with specific transitions only
VIOLATION: N/A (no animation keyframes defined)
```

---

## SI-18: ONE SCREEN RULE

```
INVARIANT: Dashboard is one screen:
  - URL: /cockpit/:buildId
  - No page navigation
  - No routing between views
  - Inspector mode changes within same page

ENFORCEMENT: Single page component, no Link components
VIOLATION: N/A (no navigation exists)
```

---

## SI-19: KEYBOARD-FIRST COMMANDS

```
INVARIANT: All actions accessible via keyboard commands:
  - : prefix for commands
  - TAB for help
  - ESC to cancel
  - Arrow keys for history

ENFORCEMENT: CommandBar component with onKeyDown handler
VIOLATION: N/A (mouse is secondary)
```

---

## SI-20: EXPLICIT BUILD ID IN URL

```
INVARIANT: Build ID is always visible in URL:
  - /cockpit/:buildId
  - No default build
  - No build selector within cockpit

ENFORCEMENT: Dynamic route segment [buildId]
VIOLATION: N/A (Next.js enforces route structure)
```
