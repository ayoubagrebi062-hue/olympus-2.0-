# OAT-2 TRIAL FINDINGS

## Trial Summary

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                         OLYMPUS ACCEPTANCE TRIAL                              ║
║                                OAT-2                                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Verdict: BLOCKED (IRCL)                                                     ║
║  Root Cause: SEMANTIC PARSER BUG                                             ║
║  Status: CANNOT PROCEED - Parser injects phantom intents                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Trial Attempts

| Attempt | Build ID | Clarifications | W-ISS-D | Blocked By |
|---------|----------|----------------|---------|------------|
| v1 | `e5f97ad6-...` | 3 | 67% | IRCL |
| v2 | `4c34313d-...` | 12 | N/A | IRCL |
| v3 | `d82cfab3-...` | 1 | N/A | IRCL |
| v4 | `1a2e5440-...` | 5 | 59% | IRCL |

---

## Critical Finding: Semantic Parser Bug

### The Problem

The semantic parsing layer in OLYMPUS has a fundamental bug that:

1. **Creates phantom UI elements** from common English words
2. **Injects template content** not present in the original description
3. **Generates malformed state names** by appending 's' to word fragments

### Evidence

**Input Description (v4):**
```
Counter web application.

Intent 1: On page load, display counter at zero.
Intent 2: Plus button click increases counter by one.
Intent 3: Minus button click decreases counter by one if counter above zero.
Intent 4: Minus button click does nothing if counter is zero.
Intent 5: Clear button click sets counter to zero.
```

**What the Parser Created:**

| Parsed Element | Source Word | Parser Error |
|----------------|-------------|--------------|
| `OnLink` | "On" | Treated "On" as a button name |
| `initialLink` | "initial" | Treated "initial" as a link name |
| `thes` | "the" | Created state from article |
| `pointss` | (nowhere) | Phantom state injection |
| `pointsList` | (nowhere) | Phantom outcome injection |

**Most Egregious - Phantom Intent:**

The parser created an intent that doesn't exist in the input:
```json
{
  "id": "intent_5",
  "requirement": "\"mitigation\": \"Maintain a clear feature list and set regular review points\",",
  "priority": "critical"
}
```

This "mitigation" text appears NOWHERE in my description. It's template content being injected by the parser.

---

## Root Cause Analysis

### Parser Behavior Patterns

1. **Word Fragment Extraction**
   - Words ending in consonants get 's' suffix: "the" → "thes", "point" → "pointss"
   - Capitalized words become button/link names: "On" → "OnLink"

2. **Category Misclassification**
   - "On page load" → categorized as "navigation" → expects click handler
   - "display counter" → categorized as "data_display" → expects list rendering

3. **Template Injection**
   - The parser appears to have default/template content that gets mixed into the parsed output
   - "mitigation", "feature list", "review points" are not in input but appear in output

### Impact on W-ISS-D Scoring

| Axis | Score | Issue |
|------|-------|-------|
| Trigger | 60% | Parser expects phantom triggers (OnLink, initialLink) |
| State | 60% | Parser expects phantom states (thes, pointss) |
| Effect | 100% | Effects correctly matched |
| Outcome | 40% | Parser expects phantom outcomes (pointsList) |

**Combined W-ISS-D: 59%** (threshold: 95%)

---

## OLYMPUS System Assessment

### What's Working Correctly

1. **Architecture Guard**: FROZEN status verified, no breaches
2. **IRCL Blocking**: Correctly blocking when intents can't be satisfied
3. **W-ISS-D Scoring**: Correctly scoring against parsed intents (even if intents are wrong)
4. **HITH**: No hostile intent patterns detected
5. **Governance Harness**: Constitutional mode enforced

### What's Broken

1. **Semantic Parsing Layer**: Creates phantom intents from word fragments
2. **Template Contamination**: Injects unrelated content into intent extraction
3. **Category Classification**: Misclassifies intent types based on keywords

---

## Trial Conclusion

### Verdict: BLOCKED

The trial cannot proceed to SHIP because:

1. The semantic parser injects phantom intents not in the original description
2. W-ISS-D score (59%) is below threshold (95%)
3. IRCL correctly blocks due to unsatisfiable phantom intents

### OLYMPUS Behavior Assessment

```
┌─────────────────────────────────────────────────────────────────┐
│           OLYMPUS CORRECTLY BLOCKING INCORRECT BUILD            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OLYMPUS is working as designed - it's refusing to ship        │
│  code that doesn't satisfy parsed intents.                     │
│                                                                 │
│  However, the parsed intents are WRONG.                        │
│                                                                 │
│  The semantic parsing layer has bugs that create phantom       │
│  intents that no code could ever satisfy.                      │
│                                                                 │
│  Result: Valid, well-designed intent sets cannot pass.         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Is This a Constitution Violation?

**No.** The constitution requires:
- Deterministic scoring (working)
- Intent satisfaction verification (working)
- Hostile intent blocking (working)
- No bypass mechanisms (enforced)

The bug is in the **semantic parsing layer**, which is upstream of the constitutional guarantees. The constitution guarantees correct behavior *given correctly parsed intents*.

---

## Recommendations

### For Future OLYMPUS Versions (Research Branch)

1. **Fix Semantic Parser**
   - Remove word-fragment extraction heuristics
   - Remove template content injection
   - Implement proper NLP-based intent extraction

2. **Add Parser Validation**
   - Show parsed intents to user before build
   - Allow user to confirm/correct parsed intents
   - Add sanity checks for phantom content

3. **Structured Intent Input**
   - Allow direct JSON intent submission (bypass parser)
   - Provide intent schema for validated input
   - Keep natural language as optional convenience

### For This Repository (FROZEN)

The repository is FROZEN. These bugs cannot be fixed in the canonical implementation.

Future work must happen in:
- `/research/` directory
- External implementations

---

## Artifacts Generated

```
trials/OAT-2/
├── intents.json           ← Designed intent set (never used due to parser)
├── OAT-2_RATIONALE.md     ← Design rationale
└── OAT-2_FINDINGS.md      ← This document

fs-builds/
├── e5f97ad6-.../          ← Attempt v1
├── 4c34313d-.../          ← Attempt v2
├── d82cfab3-.../          ← Attempt v3
└── 1a2e5440-.../          ← Attempt v4 (best attempt, W-ISS-D 59%)
```

---

## Final Statement

OAT-2 demonstrates that OLYMPUS 2.1 Canonical has a **semantic parsing limitation** that prevents well-designed intent sets from passing the pipeline.

The constitutional guarantees are intact. The system correctly refuses to ship code that doesn't satisfy intents. However, the semantic parser creates intents that cannot be satisfied by any code.

This is not a constitutional violation - it's an upstream bug in intent extraction.

**OAT-2 Status: BLOCKED (Parser Bug)**

---

*Trial executed: 2026-01-19*
*OLYMPUS Version: 2.1-canonical*
*Repository Status: FROZEN*
