# KNOWN LIMITATIONS

## Build Status: INCOMPLETE (71%)

This document records the actual limitations discovered during the OLYMPUS self-build.

---

## Critical Issues

### 1. Groq API Rate Limiting
**Impact:** BUILD FAILURE
**Details:**
- All 6 Groq API keys exhausted during frontend phase
- Rate limit: 12,000 tokens per minute per key
- Keys rotated successfully but all hit limits within 66 seconds
- Error: `Rate limit reached for model llama-3.3-70b-versatile`

**Mitigation:** OpenAI fallback activated successfully for later batches, but too late for critical components.

### 2. Critical Component Failed: ContextualChat
**Impact:** BUILD HALTED
**Details:**
- ContextualChat marked as "critical" priority
- Failed during pixel batch 1
- Build cannot complete without critical components

---

## Non-Fatal Issues (Build Continued)

### 3. Persistence Layer UUID Mismatch
**Impact:** Warnings only, non-blocking
**Details:**
- Build ID format: `olympus-dashboard-1768863027493` (timestamp-based)
- Database expects UUID format
- All persistence operations failed with: `invalid input syntax for type uuid`
- Agent outputs logged to file instead of database

**Fix Needed:** Generate proper UUIDs or modify schema to accept string IDs.

### 4. Agent Validation Mismatches
**Impact:** Degraded quality data
**Affected Agents:**
- `empathy`: 1 type mismatch
- `venture`: 1 type mismatch
- `strategos`: 2 errors (type mismatch, expected array)
- `sentinel`: Invalid JSON ("undefined" not valid JSON)

**Cause:** Agent output schemas don't match validation expectations.

### 5. Token Tracking Failure
**Impact:** Incomplete cost tracking
**Details:**
- `TypeError: Cannot read properties of undefined (reading 'costPer1kInput')`
- Provider cost config missing for some model variants

---

## Components Generated Successfully

| Component | Status | Source |
|-----------|--------|--------|
| BuildList.tsx | Cached | Groq (pre-failure) |
| UnderstandingPanel.tsx | Generated | OpenAI fallback |

## Components Failed/Skipped

| Component | Priority | Status | Reason |
|-----------|----------|--------|--------|
| ContextualChat | Critical | FAILED | Rate limit + no retry budget |
| AgentRoster | Important | DEGRADED | Validation failures |
| PhaseProgression | Optional | SKIPPED | Rate limits |
| ConstitutionalStatus | Optional | SKIPPED | Rate limits |

---

## Architectural Observations

### Provider Fallback Chain
```
Primary: Groq (6 keys, sequential rotation)
Fallback: OpenAI (gpt-4o-mini)
Result: Fallback worked but activated too late
```

### Build Plan (What Should Have Happened)
- **discovery phase**: 5 agents (oracle, empathy, venture, strategos, scope)
- **design phase**: 5 agents (palette, grid, blocks, cartographer, flow)
- **architecture phase**: 5 agents (archon, datum, nexus, forge, sentinel)
- **frontend phase**: 2 agents (pixel, wire)
- **backend phase**: 2 agents (engine, keeper)
- **integration phase**: 2 agents (bridge, notify)

### Actual Execution
- Phases completed: discovery, design, architecture (100%)
- Frontend phase: Started, failed at pixel agent
- Remaining phases: Not started

---

## Lessons Learned

1. **Rate limit awareness**: 6 Groq keys at 12k TPM = 72k tokens/minute theoretical max. Build consumed 67k tokens in 66 seconds, hitting limits.

2. **Critical vs optional**: Component prioritization works - optional components were skipped gracefully while critical failure halted the build.

3. **Fallback timing**: OpenAI fallback activates per-call after Groq exhaustion. Earlier activation threshold would help.

4. **Persistence resilience**: Build continued despite all database writes failing. File-based logging preserved full output.

5. **Validation flexibility**: Strict schema validation catches real issues but also blocks valid outputs with minor format differences.

---

## Recommendations for Retry

1. **Wait 15 minutes** for Groq rate limits to reset
2. **Increase fallback eagerness** - activate OpenAI after 3 Groq failures, not 6
3. **Fix UUID generation** in build script for proper persistence
4. **Consider smaller model** for non-critical components (faster, fewer tokens)

---

*Document generated: 2026-01-19T22:51:33Z*
*Build ID: olympus-dashboard-1768863027493*
*Tokens consumed: 67,464*
*Duration: 66 seconds*
