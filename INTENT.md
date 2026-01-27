# INTENT.md

## What This Dashboard Exists To Do

**Document Type:** Truth Artifact
**Phase:** 1 - Truth Discovery
**Created:** 2026-01-20
**Author:** OLYMPUS Self-Build

---

## Primary Intent

The OLYMPUS Dashboard is a **control surface** for a multi-agent build system.

It exists to:

1. **Expose the build engine** - Show exactly what 21 agents are doing, in real-time
2. **Provide orchestration controls** - Start, pause, cancel, configure builds
3. **Enforce understanding** - No user ships code they cannot explain
4. **Display truth** - Every failure, every warning, every cost, every token

---

## What "Dashboard" Means Here

This is NOT:

- A chat interface with a sidebar
- A "project management" tool
- A place to browse templates
- A simplified wrapper around complexity

This IS:

- A terminal with visibility
- A build monitor with controls
- A transparency engine
- A system that respects the operator

---

## Core Functions

### 1. Build Orchestration

- Initiate builds with explicit parameters
- Monitor phase progression (discovery → design → architecture → frontend → backend → integration)
- See which agent is active, what it's producing, what it costs

### 2. Agent Visibility

- 21 agents, each with defined responsibilities
- Real-time output streaming
- Validation status per agent
- Token consumption per agent

### 3. Artifact Inspection

- Every agent produces artifacts
- Artifacts are inspectable, not hidden
- User can read what each agent decided and why

### 4. Failure Transparency

- Failures are first-class citizens
- No "something went wrong" messages
- Exact error, exact agent, exact phase, exact mitigation

### 5. Cost Accounting

- Token usage visible at all times
- Provider routing visible (Groq vs OpenAI)
- Rate limit status visible

---

## The User This Serves

**Power users who:**

- Want to see the machine work
- Expect to read logs
- Understand that AI output requires review
- Prefer control over convenience
- Will not ship code they don't understand

**Not for:**

- Users who want "one click" solutions
- Users who expect AI to "just work"
- Users who skip reading output
- Users who want the system to hide complexity

---

## Success Criteria

The dashboard succeeds if:

1. A user can start a build and know exactly what's happening at every moment
2. A user can stop a build and know exactly what was produced
3. A user can inspect any agent's output without navigating away
4. A user never sees a generic error message
5. A user always knows the cost of what they're doing

---

## Uncertainty Statement

**What I am uncertain about:**

1. Whether SSE streaming is the right mechanism for real-time updates (vs WebSocket)
2. The optimal information density - how much to show at once
3. Whether mobile support matters for this user profile
4. The right balance between "everything visible" and "cognitive overload"

These uncertainties will be resolved in Phase 2 (Design) through explicit tradeoff decisions.

---

_This document is a contract. The dashboard must fulfill these intents or explicitly document why it cannot._
