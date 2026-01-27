# PANTHEON Architecture

> **Read this first.** Everything else will make sense after.

## The 30-Second Mental Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PANTHEON                                     │
│                                                                      │
│   types.ts ──────► simulator.ts ──────► oracle.ts                   │
│      │                  │                   │                        │
│   (defines)          (runs)            (verifies)                    │
│      │                  │                   │                        │
│      ▼                  ▼                   ▼                        │
│   BuildSnapshot    tick() loop      InvariantResult                 │
│   SimEvent         emit events      Anomaly detection               │
│   Invariant        state machine    Learning/adaptation             │
│                                                                      │
│   mutation.test.ts ◄─── Injects bugs to verify oracle catches them  │
│   visual-debugger.ts ◄─ Records snapshots → HTML report             │
└─────────────────────────────────────────────────────────────────────┘
```

## Why Tick-Based? (Future You will ask this)

We chose **synchronous tick-based simulation** over async because:

1. **Determinism** - Same seed = exact same execution every time
2. **Time-travel** - Can step backwards through `getHistory()`
3. **Testing** - No flaky tests from race conditions
4. **Debugging** - Can pause at any tick and inspect state

```typescript
// This is the core loop. Everything else supports it.
sim.initialize(config);
while (!sim.isComplete()) {
  sim.tick();  // One atomic state transition
  const snapshot = sim.getSnapshot();  // Inspect anytime
}
```

## File Responsibilities

| File | One-Line Purpose | Depends On |
|------|------------------|------------|
| `types.ts` | **Single source of truth** for all types | Nothing |
| `simulator.ts` | Tick-based state machine | types.ts |
| `oracle.ts` | Verifies invariants, detects anomalies | types.ts, simulator.ts |
| `mutation.test.ts` | Injects bugs to test the tests | All above |
| `visual-debugger.ts` | Records execution → HTML | types.ts |
| `index.ts` | Public API, re-exports | All above |
| `runner.ts` | CLI entry point | index.ts |

## How to Add a New Build Phase

**Current assumption:** 5 phases (discovery → architecture → implementation → quality → deployment)

**To add a "security" phase:**

1. Edit `types.ts`:
```typescript
export const BUILD_PHASES = [
  'discovery',
  'architecture',
  'implementation',
  'security',      // ← Add here (order matters!)
  'quality',
  'deployment'
] as const;
```

2. That's it. The type system propagates everywhere.

**Why it works:** `BuildPhase` is derived from `BUILD_PHASES`, so TypeScript catches any code that doesn't handle the new phase.

## How to Add a New Invariant

Invariants are rules that must **never** be violated. Add to `simulator.ts`:

```typescript
// In CORE_INVARIANTS array:
{
  name: 'MY_NEW_INVARIANT',
  description: 'Human-readable explanation',
  check: (current: BuildSnapshot, previous?: BuildSnapshot): InvariantResult => {
    // Return { passed: true } or { passed: false, violation: 'why' }
    if (somethingBad) {
      return { passed: false, violation: `Found bad thing: ${details}` };
    }
    return { passed: true };
  }
}
```

**Future refactor idea:** Move invariants to their own `invariants.ts` file. They're in simulator.ts for now because they're tightly coupled to simulation state.

## How to Add a New Mutation (for mutation testing)

Mutations are **intentional bugs** to verify tests catch them. Add to `mutation.test.ts`:

```typescript
// In MUTANTS array:
{
  id: 'my-mutation',
  name: 'Description of the bug',
  type: 'STATE_CORRUPTION',  // See MutationType
  severity: 'critical',       // critical, major, minor
  apply: (sim: MutatedSimulator) => {
    // Inject the bug
    sim.someBadBehavior = true;
  },
  revert: (sim: MutatedSimulator) => {
    // Undo it (optional but recommended)
    sim.someBadBehavior = false;
  },
}
```

## Key Design Decisions (and why)

### 1. Map<AgentId, AgentSnapshot> instead of Array

**Why:** O(1) lookup by agent ID. Builds can have 35+ agents.

**Trade-off:** Slightly more verbose iteration (`for...of agents.values()`).

### 2. Invariants return InvariantResult, not boolean

**Why:** `{ passed: false, violation: "Agent X did Y" }` is infinitely more debuggable than just `false`.

### 3. THRESHOLDS in types.ts

**Why:** All magic numbers in one place. Easy to tune for different environments.

**Future idea:** Make THRESHOLDS overridable per-build-config.

### 4. EventEmitter pattern in simulator

**Why:** Decouples event generation from event handling. Oracle and VisualDebugger can subscribe independently.

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|------------|-------|
| `tick()` | O(agents) | Iterates all agents once |
| `getSnapshot()` | O(1) | Returns reference (clone for safety) |
| `getHistory()` | O(1) | Returns array reference |
| `invariant.check()` | O(agents) | Each invariant scans agents |
| Oracle verification | O(snapshots × invariants) | Can be slow for long builds |

## Known Limitations (Future You: don't be surprised)

1. **No real parallelism** - Tick-based means sequential. Real orchestrator is async.

2. **Memory grows with history** - Every tick adds a snapshot. Long builds = memory pressure. Consider `trimHistory(keepLast: number)` if needed.

3. **Chaos is probabilistic** - Same seed + chaos can have different outcomes because chaos uses its own RNG stream.

4. **No network simulation** - Agents "run" instantly. Add `estimatedDuration` to AgentConfig if you need realistic timing.

## Extending PANTHEON

### Adding a new test type (like load testing)

1. Create `mytest.test.ts`
2. Import from `./core/simulator` and `./core/types`
3. Use the tick-based API
4. Add export to `index.ts`

### Adding new event types

1. Add to `EVENT_TYPES` in `types.ts`
2. Update `EventData` interface if new payload fields needed
3. Emit in simulator: `this.emit(type, event)`
4. Handle in oracle's temporal patterns if needed

## Questions Future You Might Have

**Q: Why doesn't Oracle extend Simulator?**
A: Separation of concerns. Simulator runs, Oracle verifies. They shouldn't know each other's internals.

**Q: Can I use this with real async code?**
A: Not directly. PANTHEON simulates builds, it doesn't run them. For real builds, you'd record events and replay through Oracle.

**Q: Why are tests in the same directory?**
A: Co-location. The tests ARE the product here - this is test infrastructure.

---

*Last updated: January 2026*
*Created during OLYMPUS 50X Build*
