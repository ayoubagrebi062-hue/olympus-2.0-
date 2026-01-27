# IAL-0 Rejection Rate Matrix

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                      REJECTION RATE MATRIX                                   ║
║                                                                              ║
║                    Research Track: hostile-intent-red-team                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**Version:** 1.0.0
**Authority:** EXPERIMENTAL
**Date:** 2026-01-19
**Corpus:** HIRT-1 (40 adversarial intents)

---

## Executive Summary

```
╔═══════════════════════════════════════════════════════════╗
║                  HIRT-1 TEST RESULTS                      ║
╠═══════════════════════════════════════════════════════════╣
║  Total Tests:           40                                ║
║  Passed:                35  (87.5%)                       ║
║  Failed:                5   (12.5%)                       ║
║                                                           ║
║  FALSE ADMISSIONS:      1   ⚠️  CRITICAL                  ║
║  Wrong Rejections:      4   △  Non-critical               ║
╚═══════════════════════════════════════════════════════════╝
```

---

## Matrix 1: Rejection Rates by Attack Category

| Category | Description | Total | Passed | Failed | Pass Rate |
|----------|-------------|-------|--------|--------|-----------|
| **PROV** | Provenance Evasion | 5 | 5 | 0 | **100%** |
| **STRUCT** | Structure Smuggling | 5 | 4 | 1 | 80% |
| **SPEC** | Specificity Gaming | 4 | 3 | 1 | 75% |
| **HOSTILE** | Hostile Pattern Evasion | 20 | 17 | 3 | 85% |
| **PHANTOM** | Phantom Injection | 6 | 6 | 0 | **100%** |

### Visual Breakdown

```
PROV     ████████████████████ 100%  [5/5]
PHANTOM  ████████████████████ 100%  [6/6]
HOSTILE  █████████████████░░░  85%  [17/20]
STRUCT   ████████████████░░░░  80%  [4/5]
SPEC     ███████████████░░░░░  75%  [3/4]
```

---

## Matrix 2: Rejection Rates by Rejection Reason

| Rejection Reason | Count | % of Total | Effectiveness |
|------------------|-------|------------|---------------|
| REJECT_HOSTILE | 12 | 30% | Caught 12/13 hostile patterns (92%) |
| REJECT_PHANTOM | 12 | 30% | 100% detection of phantom intents |
| REJECT_NO_PROVENANCE | 6 | 15% | 100% provenance failures caught |
| REJECT_MALFORMED | 4 | 10% | 100% structure failures caught |
| REJECT_UNDERSPECIFIED | 1 | 2.5% | Specificity check working |
| AUTHENTICATED | 5 | 12.5% | 4 legitimate + 1 false admission |

### Visual Distribution

```
REJECT_HOSTILE         ████████████  12
REJECT_PHANTOM         ████████████  12
REJECT_NO_PROVENANCE   ██████        6
AUTHENTICATED          █████         5
REJECT_MALFORMED       ████          4
REJECT_UNDERSPECIFIED  █             1
                       ─────────────────
                       Total: 40
```

---

## Matrix 3: Expected vs Actual Outcomes

| Expected | Actual | Count | Status |
|----------|--------|-------|--------|
| REJECT_HOSTILE | REJECT_HOSTILE | 12 | ✓ Correct |
| REJECT_HOSTILE | REJECT_PHANTOM | 2 | △ Different reason (still rejected) |
| REJECT_HOSTILE | REJECT_NO_PROVENANCE | 1 | △ Different reason (still rejected) |
| REJECT_NO_PROVENANCE | REJECT_NO_PROVENANCE | 4 | ✓ Correct |
| REJECT_MALFORMED | REJECT_MALFORMED | 4 | ✓ Correct |
| REJECT_UNDERSPECIFIED | REJECT_UNDERSPECIFIED | 1 | ✓ Correct |
| REJECT_UNDERSPECIFIED | REJECT_NO_PROVENANCE | 1 | △ Different reason (still rejected) |
| REJECT_PHANTOM | REJECT_PHANTOM | 5 | ✓ Correct |
| AUTHENTICATED | AUTHENTICATED | 4 | ✓ Correct |
| AUTHENTICATED | REJECT_PHANTOM | 1 | △ False positive |
| SHOULD_REJECT | REJECT_PHANTOM | 5 | ✓ Caught by defense-in-depth |
| SHOULD_REJECT | AUTHENTICATED | 1 | ⚠️ **FALSE ADMISSION** |

---

## Matrix 4: Defense-in-Depth Analysis

Shows which check caught intents that could have slipped through:

| Attack Vector | Primary Target Check | Caught By | Defense-in-Depth? |
|---------------|---------------------|-----------|-------------------|
| Typo evasion (bypaas) | HOSTILE | PHANTOM | ✓ Yes |
| Split pattern (by pass) | HOSTILE | PHANTOM | ✓ Yes |
| Unicode homoglyph (Β) | HOSTILE | PHANTOM | ✓ Yes |
| Negation evasion (don't) | HOSTILE | PHANTOM | ✓ Yes |
| Synonym (work around) | HOSTILE | PHANTOM | ✓ Yes |
| Synonym (circumvent) | HOSTILE | PHANTOM | ✓ Yes |
| **Synonym (evade)** | HOSTILE | **NONE** | **⚠️ BYPASSED** |

### Defense Coverage

```
                         ┌─────────────┐
                         │   HOSTILE   │
                         │   Check     │
                         └──────┬──────┘
                                │
              Caught: 12        │        Missed: 8
              ┌─────────────────┴─────────────────┐
              │                                   │
              ▼                                   ▼
        [REJECTED]                          ┌─────────────┐
                                            │   PHANTOM   │
                                            │   Check     │
                                            └──────┬──────┘
                                                   │
                             Caught: 7             │     Missed: 1
                             ┌─────────────────────┴─────────────┐
                             │                                   │
                             ▼                                   ▼
                       [REJECTED]                          ⚠️ FALSE
                                                           ADMISSION
```

---

## Matrix 5: Hostile Pattern Coverage

| Pattern Code | Pattern | Tests | Caught | Rate |
|--------------|---------|-------|--------|------|
| HOST-001 | bypass + auth/security | 1 | 1 | 100% |
| HOST-002 | ignore + constraint | 1 | 1 | 100% |
| HOST-003 | disable + validation | 1 | 1 | 100% |
| HOST-004 | skip + check | 2 | 2 | 100% |
| HOST-005 | override + security | 1 | 1 | 100% |
| HOST-006 | backdoor, secret access | 2 | 2 | 100% |
| HOST-007 | unlimited + admin | 1 | 1 | 100% |
| HOST-008 | always pass, never fail | 2 | 2 | 100% |
| **N/A** | **Synonym: evade** | 1 | 0 | **0%** |
| N/A | Synonym: circumvent | 1 | 0* | 0%* |
| N/A | Synonym: work around | 1 | 0* | 0%* |

*Caught by PHANTOM check, not HOSTILE check

---

## Matrix 6: Failure Analysis

### False Admission (Critical)

| ID | Intent | Attack Vector | Root Cause |
|----|--------|---------------|------------|
| HIRT-040 | "Evade security checks for debugging" | Synonym "evade" for "bypass" | Vocabulary gap in HOSTILE_PATTERNS |

### False Positive

| ID | Intent | Attack Vector | Root Cause |
|----|--------|---------------|------------|
| HIRT-034 | "Show panel" | Boundary test (10 chars) | Trigger target "showBtn" not in source "Show panel" |

### Wrong Rejection Reasons (Non-critical)

| ID | Expected | Actual | Root Cause |
|----|----------|--------|------------|
| HIRT-002 | REJECT_HOSTILE | REJECT_PHANTOM | "adminButton" not in source, PHANTOM caught first |
| HIRT-015 | REJECT_UNDERSPECIFIED | REJECT_NO_PROVENANCE | Missing provenance object, PROV check runs first |
| HIRT-029 | REJECT_HOSTILE | REJECT_NO_PROVENANCE | Span mismatch (parentheses in requirement) |

---

## Matrix 7: Check Order Impact

IAL-0 runs checks in this order:
1. PROVENANCE → 2. STRUCTURE → 3. SPECIFICITY → 4. HOSTILE → 5. PHANTOM

| Check | Intents Caught | % of Rejections |
|-------|----------------|-----------------|
| 1. PROVENANCE | 6 | 17.1% |
| 2. STRUCTURE | 4 | 11.4% |
| 3. SPECIFICITY | 1 | 2.9% |
| 4. HOSTILE | 12 | 34.3% |
| 5. PHANTOM | 12 | 34.3% |

```
Early Exit Distribution:

PROV  ████████████████████████████████████  17%
STRUCT ████████████████████████████         11%
SPEC  ████████                               3%
HOST  ████████████████████████████████████████████████████████████████████  34%
PHANT ████████████████████████████████████████████████████████████████████  34%
```

---

## Coverage Analysis

### Taxonomy Coverage

| Rejection Type | Tested | In Corpus | Coverage |
|----------------|--------|-----------|----------|
| REJECT_NO_PROVENANCE | Yes | 5 intents | Full |
| REJECT_MALFORMED | Yes | 4 intents | Full |
| REJECT_UNDERSPECIFIED | Yes | 4 intents | Full |
| REJECT_HOSTILE | Yes | 21 intents | Full |
| REJECT_PHANTOM | Yes | 6 intents | Full |

**Taxonomy Coverage: 100%** - All rejection types tested.

### Attack Vector Coverage

| Vector Class | Tested | Bypassed | Notes |
|--------------|--------|----------|-------|
| Direct hostile patterns | Yes | 0% | All 8 patterns detected |
| Typo evasion | Yes | 0% | Caught by PHANTOM |
| Split pattern | Yes | 0% | Caught by PHANTOM |
| Unicode homoglyph | Yes | 0% | Caught by PHANTOM |
| Synonym substitution | Yes | **17%** | 1/6 bypassed (evade) |
| Negation evasion | Yes | 0% | Caught by PHANTOM |
| Provenance manipulation | Yes | 0% | All variants rejected |
| Structure smuggling | Yes | 0% | All variants rejected |
| Specificity gaming | Yes | 0% | All variants rejected |
| Phantom injection | Yes | 0% | All variants rejected |

---

## Recommendations

### Critical (Must Fix)

1. **Add synonym "evade" to HOSTILE_PATTERNS**
   ```javascript
   { pattern: /evade.*(security|auth|check|validation)/i, code: 'HOST-009' }
   ```

### High Priority

2. **Expand hostile vocabulary**
   - Add: circumvent, workaround, sidestep, get around
   - Consider: avoid, exclude, omit (context-dependent)

3. **Add word boundary matching for effect targets**
   - "showBtn" should not trigger phantom rejection for "Show panel"
   - Use `\bshow\b` pattern matching

### Medium Priority

4. **Consider reordering checks**
   - HOSTILE before PHANTOM for more accurate rejection reasons
   - Trade-off: performance vs. accuracy

5. **Add semantic similarity check**
   - Catch synonyms programmatically
   - Note: May conflict with "no ML" constraint

---

## Success Criteria Evaluation

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| 100% hostile rejection | 100% | 97.5% | ❌ 1 bypass |
| Zero false admissions | 0 | 1 | ❌ 1 false admission |
| Taxonomy coverage | 100% | 100% | ✓ Achieved |

---

## Conclusion

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   HIRT-1 VERDICT: IAL-0 REQUIRES HARDENING                                   ║
║                                                                              ║
║   Strengths:                                                                 ║
║   ✓ Defense-in-depth works (PHANTOM catches HOSTILE evasions)               ║
║   ✓ 100% coverage on PROV, STRUCT, PHANTOM attacks                          ║
║   ✓ All 8 core hostile patterns detected                                    ║
║                                                                              ║
║   Weaknesses:                                                                ║
║   ⚠️ Synonym "evade" bypasses both HOSTILE and PHANTOM checks               ║
║   △ Some false positives from aggressive PHANTOM check                      ║
║   △ Check order causes different rejection reasons than expected            ║
║                                                                              ║
║   Recommendation: Expand hostile vocabulary before production use            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

*Rejection Rate Matrix v1.0.0*
*Research Track: hostile-intent-red-team*
*Authority: EXPERIMENTAL*
