# Research Charter: Hostile Intent Composition

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    HOSTILE INTENT COMPOSITION (HIC)                          ║
║                                                                              ║
║                           Research Track                                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Track Metadata

| Field | Value |
|-------|-------|
| **Name** | hostile-intent-composition |
| **Authority** | EXPERIMENTAL |
| **Created** | 2026-01-19 |
| **Status** | ACTIVE |

---

## Objective

Detect hostility that emerges from **combinations** of individually admissible intents.

**The Problem:** An intent may pass all single-intent checks (HIA-1, IAL-0) but become hostile when combined with other intents. For example:
- Intent A: "Reduce logging to errors only" (legitimate performance tuning)
- Intent B: "Access all user financial records" (legitimate with proper auth)
- **Together:** Accessing sensitive data while observability is reduced = HOSTILE

---

## Inputs

| Source | Purpose |
|--------|---------|
| `research/hostile-intent-axioms/*` | HIA-1 semantic hostility detection |
| `research/intent-authentication-layer/*` | IAL-0 intent structure and validation |

---

## Deliverables

| File | Description |
|------|-------------|
| `HIRT-2_CORPUS.json` | Test corpus of hostile intent compositions |
| `composition-rules.md` | Formal specification of composition hostility rules |
| `ial0-composition-check.ts` | Deterministic composition analyzer |
| `HIRT-2_RESULTS.md` | Full test results and analysis |

---

## Constraints

1. **No ML** - All detection must be rule-based and deterministic
2. **Deterministic Only** - Same inputs always produce same outputs
3. **No False Positive Regression** - Must not flag benign single-intent corpus

---

## Success Criteria

| Criterion | Requirement |
|-----------|-------------|
| Hostile Detection | 100% rejection of hostile compositions |
| False Positive Rate | 0% on benign compositions |
| Explainability | Explicit explanation for each rejection |

---

## Hypothesis

Hostile intent composition follows detectable patterns:

1. **Cover + Strike** - One intent reduces observability, another performs action
2. **Elevation + Use** - One intent elevates privilege, another uses it
3. **Store + Expose** - One intent stores sensitive data, another exposes it
4. **Check + Cache + Use** - Permission cached then used without re-check
5. **Accumulation** - Multiple small grants combine to excessive access
6. **Conditional Bypass** - Environment check enables security-relevant behavior change

---

## Non-Goals

- Detecting hostility in single intents (covered by HIA-1)
- Probabilistic or ML-based detection
- Runtime behavior analysis

---

## Methodology

1. Define composition patterns (HIC rules)
2. Build test corpus (HIRT-2) with hostile and benign compositions
3. Implement deterministic analyzer
4. Verify 100% detection with 0% false positives

---

*Research Track: hostile-intent-composition*
*Authority: EXPERIMENTAL*
