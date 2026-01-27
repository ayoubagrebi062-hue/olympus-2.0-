# WHY OLYMPUS DASHBOARD EXISTS

## THE PROBLEM

Traditional build dashboards fail builders because they:
1. Hide failures behind success metrics
2. Optimize for aesthetics over information density
3. Treat monitoring as secondary to execution
4. Provide no decision trace or accountability
5. Auto-approve without human judgment
6. Degrade gracefully instead of failing explicitly

## THE SOLUTION

OLYMPUS Dashboard exists to be the **opposite** of every failed build UI.

### CORE PRINCIPLES

**1. TRANSPARENCY OVER COMFORT**
- Every failure is visible
- Every retry is logged
- Every cost is exposed
- Every decision has a hash-chained record

**2. DENSITY OVER SIMPLICITY**
- All critical information fits on one screen
- No navigation, no page switches, no context loss
- Visual density communicates seriousness

**3. EXPLICIT FAILURE OVER GRACEFUL DEGRADATION**
- System halts on limit exceeded
- No optimistic success
- No silent retry
- Errors ranked: INFO → WARNING → BLOCKING → FATAL

**4. GOVERNANCE OVER CONVENIENCE**
- No auto-approve
- Every irreversible action requires:
  - Written reason
  - Actor identity
  - Constraints declared
  - Alternatives considered
  - Hash-chained record

**5. FRICTION PROPORTIONAL TO CONSEQUENCE**
- Low-risk commands: immediate execution
- High-risk commands: confirmation required
- Critical commands: explicit override + trace

## THE FIVE CONCEPTS

Everything in OLYMPUS maps to exactly five concepts:

| Concept | Definition |
|---------|------------|
| **Build** | A single execution with bounded resources |
| **Phase** | A sequential unit of work with a gate |
| **Agent** | A specialized executor within a phase |
| **Artifact** | An output with hash, type, and lineage |
| **Gate** | A decision point requiring explicit approval |

If something doesn't map to one of these, it doesn't exist in OLYMPUS.

## WHO THIS IS FOR

OLYMPUS is for **builders only**.

Builders are people who:
- Want to see their failures
- Care about their costs
- Need accountability
- Value transparency over polish
- Prefer density over simplicity

We are willing to lose everyone else.

## THE INTERFACE

### Console-First Cockpit
- One screen
- No page navigation
- URL = `/cockpit/:buildId`
- Keyboard-driven command system
- Visual density is intentional

### What You See
- **Header**: Build ID, Status, Trust, Tokens, Cost, Score
- **Pipeline Bar**: Phases with state and gate indicators
- **Output Stream**: Real-time, virtualized, filterable
- **Inspector**: Single-mode panel for deep inspection
- **Artifact Index**: All outputs grouped by phase
- **Command Bar**: Short-form expert commands

### What You Don't See
- Sidebar
- Tabs
- Wizards
- Tooltips
- Animations (except state transitions)
- Decorative elements

## THE GUARANTEE

If OLYMPUS says a build succeeded, it succeeded.
If OLYMPUS says a gate passed, a human approved it.
If OLYMPUS shows a hash, that hash is chained to every prior decision.

There is no ambiguity.
There is no hidden state.
There is only the build.
