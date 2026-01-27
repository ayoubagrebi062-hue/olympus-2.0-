# PANTHEON

**Production-grade test infrastructure for build orchestrators.**

```
██████╗  █████╗ ███╗   ██╗████████╗██╗  ██╗███████╗ ██████╗ ███╗   ██╗
██╔══██╗██╔══██╗████╗  ██║╚══██╔══╝██║  ██║██╔════╝██╔═══██╗████╗  ██║
██████╔╝███████║██╔██╗ ██║   ██║   ███████║█████╗  ██║   ██║██╔██╗ ██║
██╔═══╝ ██╔══██║██║╚██╗██║   ██║   ██╔══██║██╔══╝  ██║   ██║██║╚██╗██║
██║     ██║  ██║██║ ╚████║   ██║   ██║  ██║███████╗╚██████╔╝██║ ╚████║
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝
```

[![Version](https://img.shields.io/badge/version-3.1.0_APOLLO-blue.svg)]()
[![Tests](https://img.shields.io/badge/tests-22%20passed-green.svg)]()
[![Mutation Score](https://img.shields.io/badge/mutation%20score-78%25-yellow.svg)]()
[![API](https://img.shields.io/badge/API-World_Class-gold.svg)]()

---

## 🏆 World-Class Fluent API (v3.1)

```typescript
import { pantheon } from './pantheon';

// Zero-config - sensible defaults
const results = await pantheon().run();

// Presets for common scenarios
await pantheon.quick();   // Fast validation (~1s)
await pantheon.ci();      // CI-optimized (fails on regression)
await pantheon.full();    // Everything enabled
await pantheon.stress();  // Maximum chaos
await pantheon.report();  // Generate HTML report

// Chainable for customization
const results = await pantheon()
  .chaos('high')
  .iterations(50)
  .insights()
  .flakiness(30)
  .report()
  .verbose()
  .run();
```

---

## Quick Start (CLI)

```bash
# Run full test suite
npx tsx tests/orchestrator/pantheon/runner.ts

# Quick CI validation
npx tsx tests/orchestrator/pantheon/runner.ts --quick

# With regression detection (fails on regression)
npx tsx tests/orchestrator/pantheon/runner.ts --ci

# 10X MODE - ALL advanced features enabled
npx tsx tests/orchestrator/pantheon/runner.ts --10x --verbose
```

---

## What It Does

PANTHEON tests your build orchestrator by:

1. **Simulating builds** with deterministic, reproducible execution
2. **Verifying invariants** that should never be violated
3. **Injecting chaos** to test resilience
4. **Mutating tests** to verify test quality
5. **Detecting regressions** against baselines

---

## Example Output

```
╔══════════════════════════════════════════════════════════════╗
║         PANTHEON TEST INFRASTRUCTURE v2.1.0                  ║
╚══════════════════════════════════════════════════════════════╝

[1/4] █████░░░░░░░░░░░░░░░ Testing starter...        0.3s
[2/4] ██████████░░░░░░░░░░ Run 5/10...              2.1s
[3/4] ███████████████░░░░░ high intensity...        4.8s
[4/4] ████████████████████ Analyzing results...     6.2s
████████████████████ Complete in 7.1s

══════════════════════════════════════════════════════════════
                         PANTHEON SUMMARY
══════════════════════════════════════════════════════════════
  Overall Score: 85.0%
  Status: ✅ PASSED
──────────────────────────────────────────────────────────────

══════════════════════════════════════════════════════════════
                    REGRESSION ANALYSIS
══════════════════════════════════════════════════════════════
  Baseline: 2026-01-20
──────────────────────────────────────────────────────────────
  ✅ Overall Score        82.5% → 85.0%
  ✅ Mutation Score       75.0% → 78.3%
  ➖ Chaos Resilience     75.0% → 75.0%
  ✅ Violations              8  →    5
──────────────────────────────────────────────────────────────
  Verdict: 🚀 IMPROVED
  Trend: [▅▅▇▇▇█▇██] (last 9 runs)
══════════════════════════════════════════════════════════════

🏆 PANTHEON: All tests passed!
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Tick-Based Simulation** | Deterministic execution. Same seed = same results. |
| **Time-Travel Debugging** | Step backwards through any execution. |
| **7 Core Invariants** | Rules that must never be violated. |
| **Chaos Engineering** | Inject failures, delays, timeouts. |
| **Mutation Testing** | Verify your tests catch bugs. |
| **Regression Detection** | Compare against baselines. Fail CI on regression. |
| **Visual Debugger** | Generate HTML reports for debugging. |

---

## 10X Features (v3.0)

The 10X upgrade adds three powerful analysis capabilities:

### Insights Engine (--insights)
AI-powered pattern analysis that detects:
- Progress regressions and stalls
- Low parallelism and bottleneck agents
- Cascade failures and retry exhaustion
- Score trends and improvement streaks

### Flakiness Detection (--flakiness)
Statistical analysis that runs tests N times:
- Wilson confidence intervals for success rate
- Flakiness score (0% = stable, 100% = coin flip)
- Pattern detection in failures
- Recommendations for improvement

### Interactive Reports (--interactive-report)
Beautiful self-contained HTML reports with:
- Zoomable progress timeline
- Agent swimlane visualization
- Build replay functionality
- Dark/light theme support

**Enable all 10X features:**
```bash
npx tsx runner.ts --10x --verbose
```

---

## CLI Options

```
OPTIONS:
  --verbose, -v         Show detailed output
  --seed <number>       Set random seed for reproducibility
  --iterations <n>      Number of test iterations (default: 10)
  --chaos <level>       Chaos intensity: low, medium, high, extreme
  --quick               Quick validation only
  --report              Generate HTML debug report
  --mutation            Run mutation testing only

REGRESSION DETECTION:
  --save-baseline       Save current results as new baseline
  --no-baseline         Skip baseline comparison
  --ci                  Fail on regression (for CI pipelines)

10X FEATURES:
  --insights            Run AI-powered insights engine
  --flakiness           Run statistical flakiness detection
  --flakiness-runs <n>  Number of flakiness runs (default: 10)
  --interactive-report  Generate interactive HTML report
  --10x, --full         Enable ALL 10X features at once
```

---

## Programmatic Usage

```typescript
import { pantheon, BuildSimulator, TestOracle } from './pantheon';

// 🏆 WORLD-CLASS FLUENT API (Recommended)
const results = await pantheon()
  .chaos('high')
  .iterations(20)
  .failOnRegression()
  .tenX()
  .run();

console.log(`Score: ${results.overall.score * 100}%`);
console.log(`Passed: ${results.overall.passed}`);

// Or use presets
await pantheon.ci();     // CI pipeline (fails on regression)
await pantheon.quick();  // Fast validation
await pantheon.full();   // Everything enabled

// Or use components directly
const sim = new BuildSimulator(42);  // Seed for reproducibility
sim.initialize(config);

while (!sim.isComplete()) {
  sim.tick();
  const snapshot = sim.getSnapshot();
  // Inspect state at any point
}

// Verify with oracle
const oracle = new TestOracle();
const verdict = oracle.verify(sim.getHistory(), sim.getEventLog());
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         PANTHEON                             │
│                                                              │
│   types.ts ──────► simulator.ts ──────► oracle.ts           │
│      │                  │                   │                │
│   (defines)          (runs)            (verifies)            │
│      │                  │                   │                │
│      ▼                  ▼                   ▼                │
│   BuildSnapshot    tick() loop      InvariantResult         │
│   SimEvent         emit events      Anomaly detection       │
│   Invariant        state machine    Learning/adaptation     │
│                                                              │
│   mutation.test.ts ◄─── Injects bugs to verify tests        │
│   visual-debugger.ts ◄─ Records snapshots → HTML report     │
└─────────────────────────────────────────────────────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design documentation.

---

## Files

| File | Purpose |
|------|---------|
| `core/types.ts` | Single source of truth for all types |
| `core/simulator.ts` | Tick-based build simulation |
| `core/oracle.ts` | Invariant verification & anomaly detection |
| `mutation.test.ts` | Mutation testing engine |
| `visual-debugger.ts` | HTML report generation |
| `chaos-destruction.test.ts` | 22 chaos/security tests |
| `index.ts` | Public API |
| `runner.ts` | CLI entry point |
| **10X Features:** | |
| `insights-engine.ts` | AI-powered pattern analysis (12+ patterns) |
| `flakiness-detector.ts` | Statistical flakiness detection with CI |
| `interactive-report.ts` | Beautiful HTML reports with timeline & replay |

---

## Testing PANTHEON Itself

```bash
# Run all PANTHEON tests
npx vitest run tests/orchestrator/pantheon/

# Run chaos tests only
npx vitest run tests/orchestrator/pantheon/chaos-destruction.test.ts

# Run mutation tests only
npx vitest run tests/orchestrator/pantheon/mutation.test.ts
```

---

## Performance

| Operation | Time |
|-----------|------|
| Quick validation | ~1s |
| Full suite (10 iterations) | ~7s |
| Mutation testing | ~3s |
| 1000 agents simulation | ~17s |

---

## License

MIT

---

*Built during OLYMPUS 50X Build | January 2026*
