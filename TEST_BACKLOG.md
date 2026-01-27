# Test Coverage Backlog - OLYMPUS 2.0

## Current State (January 27, 2026)

| Metric                 | Value         |
| ---------------------- | ------------- |
| **Statement Coverage** | 64.68%        |
| **Branch Coverage**    | 52.44%        |
| **Function Coverage**  | 65.31%        |
| **Line Coverage**      | 65.59%        |
| **Test Files**         | 43 passing    |
| **Total Tests**        | 1,717 passing |
| **Source Files**       | 626           |

---

## Target: 80% Coverage

Gap to close: ~15% (approximately 100 critical functions need tests)

---

## CRITICAL (P0) - Under 20% Coverage

These modules have almost no test coverage and represent significant risk.

| Module                                               | Coverage   | Lines | Risk     | Priority | Status     |
| ---------------------------------------------------- | ---------- | ----- | -------- | -------- | ---------- |
| `src/lib/agents/design/inject-tokens.ts`             | **100%**   | 592   | HIGH     | 1        | ✅ DONE    |
| `src/lib/agents/design/design-provider.ts`           | **100%**   | 744   | HIGH     | 2        | ✅ DONE    |
| `src/lib/recovery/self-healing-engine.ts`            | **83.05%** | 1392  | CRITICAL | 3        | ✅ DONE    |
| `src/utils/safe-json.ts`                             | **93.93%** | 107   | MEDIUM   | 4        | ✅ DONE    |
| `src/lib/agents/coordination/critical-summarizer.ts` | **98.66%** | 761   | HIGH     | 5        | ✅ DONE    |
| `src/lib/agents/orchestrator/action-plan-store.ts`   | 18.07%     | 579   | HIGH     | 6        | NEEDS TEST |

### Why These Matter:

- **inject-tokens.ts** - Token injection for design system (security sensitive)
- **design-provider.ts** - Design system provider (foundational)
- **self-healing-engine.ts** - Automatic recovery (reliability critical)
- **safe-json.ts** - JSON parsing safety (security sensitive)
- **critical-summarizer.ts** - Critical decision extraction (data integrity)
- **action-plan-store.ts** - Build plan persistence (data integrity)

---

## HIGH (P1) - 20-40% Coverage

| Module                                               | Coverage | Lines | Status     |
| ---------------------------------------------------- | -------- | ----- | ---------- |
| `src/lib/auth/security/session.ts`                   | 29.68%   | 180   | NEEDS TEST |
| `src/lib/agents/conductor/prompts/hardcoded.ts`      | 30.43%   | 235   | NEEDS TEST |
| `src/lib/agents/coordination/constraint-injector.ts` | 34.41%   | 1134  | NEEDS TEST |
| `src/lib/recovery/sdk/validation.ts`                 | 34.78%   | 276   | NEEDS TEST |
| `src/lib/recovery/sdk/bulkhead.ts`                   | 36.73%   | 412   | NEEDS TEST |
| `src/lib/recovery/sdk/metrics.ts`                    | 37.73%   | 574   | NEEDS TEST |
| `src/lib/agents/orchestrator/state-plan-store.ts`    | 42.18%   | 556   | NEEDS TEST |
| `src/lib/architecture/orchestrator.ts`               | 43.61%   | 280   | NEEDS TEST |
| `src/lib/validation/validators/api-validator.ts`     | 44.44%   | 136   | NEEDS TEST |

---

## MEDIUM (P2) - 40-60% Coverage

| Module                                            | Coverage | Lines | Status  |
| ------------------------------------------------- | -------- | ----- | ------- |
| `src/lib/agents/conductor/prompts/service.ts`     | 52.94%   | 623   | PARTIAL |
| `src/lib/agents/conductor/prompts/store.ts`       | 57.14%   | 592   | PARTIAL |
| `src/lib/agents/orchestrator/phase-rules.ts`      | 58.10%   | 885   | PARTIAL |
| `src/lib/auth/constants.ts`                       | 58.13%   | 330   | PARTIAL |
| `src/lib/vision/core/dedup.ts`                    | 58.00%   | 262   | PARTIAL |
| `src/lib/validation/validators/code-validator.ts` | 60.46%   | 154   | PARTIAL |
| `src/lib/vision/core/advanced.ts`                 | 79.16%   | 327   | PARTIAL |

---

## Well-Tested Modules (Reference)

These modules have good coverage and can serve as testing patterns:

| Module                                        | Coverage | Tests       |
| --------------------------------------------- | -------- | ----------- |
| `src/lib/agents/intelligence/`                | 88.12%   | 245 tests   |
| `src/lib/agents/quality/conversion-scorer.ts` | 94.61%   | Integration |
| `src/lib/architecture/gates/`                 | 91.58%   | Unit        |
| `src/lib/agents/knowledge/`                   | 91.82%   | Unit        |
| `src/lib/agents/intelligence/dimensions/`     | 97.98%   | Unit        |

---

## Testing Strategy by Week

### Week 1: Critical Recovery & Security

1. ✅ `self-healing-engine.ts` - **62 tests added** (7.58% → 83.05%)
2. ✅ `safe-json.ts` - **42 tests added** (9.09% → 93.93%)
3. `session.ts` - Add 10+ tests for auth security

### Week 2: Design System & Orchestration

1. ✅ `inject-tokens.ts` - **96 tests added** (1.02% → 100%)
2. ✅ `design-provider.ts` - **116 tests added** (5.55% → 100%)
3. `action-plan-store.ts` - Add 15+ tests for plan persistence

### Week 3: Coordination & Prompts

1. ✅ `critical-summarizer.ts` - **80 tests added** (16.07% → 98.66%)
2. `constraint-injector.ts` - Add 25+ tests for constraint system
3. `prompts/hardcoded.ts` - Add 10+ tests for prompt templates

### Week 4: Validation & Metrics

1. `validation.ts` - Add 15+ tests for input validation
2. `bulkhead.ts` - Add 10+ tests for isolation patterns
3. `metrics.ts` - Add 15+ tests for metric collection

---

## Test File Naming Convention

```
src/lib/[module]/[file].ts → src/lib/[module]/__tests__/[file].test.ts
```

Example:

```
src/lib/recovery/self-healing-engine.ts
→ src/lib/recovery/__tests__/self-healing-engine.test.ts
```

---

## Quick Wins (Easy to Test)

These files are small and should be quick to reach 100%:

| File               | Lines   | Current    | Gap             |
| ------------------ | ------- | ---------- | --------------- |
| `types.ts` files   | Various | 100%       | Done            |
| ✅ `safe-json.ts`  | 107     | **93.93%** | Done (42 tests) |
| `constants.ts`     | 330     | 58%        | ~5 tests        |
| `index.ts` exports | Various | Varies     | ~2 tests each   |

---

## Commands

```bash
# Run all tests with coverage
npx vitest run --coverage --coverage.enabled=true

# Run specific module tests
npx vitest run src/lib/recovery/__tests__/

# Watch mode for TDD
npx vitest --coverage --watch

# Generate HTML report
npx vitest run --coverage --coverage.reporter=html
open coverage/index.html
```

---

_Last Updated: January 27, 2026_
_Next Review: February 3, 2026_
