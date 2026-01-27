# Bug Registry - OLYMPUS 2.0
Generated: 2026-01-27
Baseline: 0 TypeScript errors, 1 Test failure

## CRITICAL (Fix First)
| ID | File | Line | Description | Status |
|----|------|------|-------------|--------|
| C001 | tests/orchestrator/pantheon/chaos.test.ts | 237 | Apocalypse chaos test fails - 0% success rate (expects >= 2%) | 🔴 OPEN |
| C002 | src/lib/agents/orchestrator/orchestrator.ts | 1259 | Pixel agent 5min timeout too short for complex UI generation | 🔴 OPEN |

## HIGH (Fix Second)
| ID | File | Line | Description | Status |
|----|------|------|-------------|--------|
| H001 | src/lib/agents/services/build-service.ts | 354-375 | Unhandled promise chains (.then without proper error handling) | 🔴 OPEN |
| H002 | src/lib/agents/services/iteration-service.ts | 145-158 | Unhandled promise chains (.then without proper error handling) | 🔴 OPEN |
| H003 | src/lib/agents/orchestrator/conductor/hardened.ts | 747 | TODO comment: "Implement when service recovers" - incomplete recovery logic | 🔴 OPEN |
| H004 | src/lib/agents/orchestrator/conductor/experience.ts | 788 | TODO: totalTimeSaved not added to GrowthProfile interface | 🔴 OPEN |
| H005 | src/lib/agents/orchestrator/resilience-engine.ts | 1625 | TODO: Agent-level caching not implemented | 🔴 OPEN |

## MEDIUM (Fix Third)
| ID | File | Line | Description | Status |
|----|------|------|-------------|--------|
| M001 | Multiple files | - | 330 instances of `as any` type bypasses | 🟡 DEFER |
| M002 | Multiple files | - | 84 instances of `!.` null assertions | 🟡 DEFER |
| M003 | Multiple files | - | 1894 console.log statements in production code | 🟡 DEFER |
| M004 | src/lib/agents/intelligence/fluent.ts | 145 | TODO: Connect to real analytics pipeline | 🔴 OPEN |
| M005 | src/lib/agents/intelligence/scoring-config.ts | 24 | TODO: Add A/B testing framework | 🔴 OPEN |

## LOW (Fix Last)
| ID | File | Line | Description | Status |
|----|------|------|-------------|--------|
| L001 | src/lib/agents/intelligence/fluent.ts | 2316 | Fire-and-forget promise without error handling | 🔴 OPEN |
| L002 | src/lib/db/index.ts | 27-28 | Dynamic import promises not properly awaited | 🔴 OPEN |

---

## BUG DETAILS

### C001: Apocalypse Chaos Test Failure
**Root Cause:** The "Apocalypse" scenario (50% agent failure, 25% timeout, 20% network failure) expects at least 2% success but got 0%.
**Analysis:** With such extreme chaos parameters, the simulator may need:
1. More iterations (currently 30) to get statistical significance
2. Lower expected success rate threshold
3. Better retry/recovery mechanisms in the simulator

### C002: Pixel Agent Timeout
**Root Cause:** Pixel agent has 300s (5min) timeout but complex UI generation can take longer.
**Evidence:** Build `olympus-dashboard-1769514893426` failed with `AGENT_TIMEOUT: Agent pixel timed out after 300s`
**Fix:** Increase pixel timeout to 600s (10min) or implement streaming/chunked generation.

### H001-H002: Unhandled Promise Chains
**Pattern:**
```typescript
orchestrator.start().then(async (result) => {
  // Success handling
}).eq('id', buildId).then(() => {
  // No catch block!
})
```
**Fix:** Add `.catch()` blocks or use try/catch with async/await.

---

## STATISTICS

| Category | Count | Status |
|----------|-------|--------|
| CRITICAL | 2 | 🔴 OPEN |
| HIGH | 5 | 🔴 OPEN |
| MEDIUM | 5 | 3 DEFER, 2 OPEN |
| LOW | 2 | 🔴 OPEN |
| **TOTAL** | **14** | **11 actionable** |

---

## FIX PRIORITY ORDER

1. **C001** - Fix chaos test (blocking CI)
2. **C002** - Fix pixel timeout (caused build failure)
3. **H001** - Fix build-service promise handling
4. **H002** - Fix iteration-service promise handling
5. **H003-H005** - Complete TODO implementations
6. **L001-L002** - Fix remaining promise issues
