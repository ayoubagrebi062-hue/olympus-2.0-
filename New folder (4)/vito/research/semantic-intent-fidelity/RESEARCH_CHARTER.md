# RESEARCH TRACK: semantic-intent-fidelity

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                          RESEARCH TRACK                                       ║
║                     semantic-intent-fidelity                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Status: ACTIVE                                                              ║
║  Authority: EXPERIMENTAL (cannot ship)                                       ║
║  Created: 2026-01-19                                                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Objective

**Eliminate phantom intent injection** in the semantic parsing layer.

The canonical OLYMPUS 2.1 semantic parser has bugs that:
1. Create phantom UI elements from word fragments
2. Inject template content not in the original description
3. Generate malformed state names

This research track will create a replacement parser that guarantees **every derived intent has provenance** back to the original input.

---

## Problem Statement

### Current Behavior (Broken)

Input:
```
On page load, display counter at zero.
```

Parser Output:
```json
{
  "expectedTrigger": { "type": "click", "target": "OnLink" },
  "expectedState": { "stateName": "thes" },
  "requirement": "mitigation: Maintain a clear feature list..."  // PHANTOM!
}
```

### Desired Behavior

Input:
```
On page load, display counter at zero.
```

Parser Output:
```json
{
  "trigger": {
    "type": "lifecycle",
    "event": "page_load",
    "provenance": { "source": "input", "span": [0, 12], "text": "On page load" }
  },
  "effect": {
    "action": "display",
    "target": "counter",
    "value": "zero",
    "provenance": { "source": "input", "span": [14, 37], "text": "display counter at zero" }
  }
}
```

---

## Constraints

| Constraint | Rationale |
|------------|-----------|
| **No ML** | OLYMPUS Article 1 requires determinism. ML inference is non-deterministic. |
| **Deterministic only** | Same input must produce same output, always. |
| **Provenance required** | Every derived intent element must trace to source text. |

---

## Deliverables

### 1. Intent Provenance Schema

JSON schema defining how intent elements link to source text:
- Span-based source references
- Derivation chain tracking
- Confidence scores (rule-based, not ML)

### 2. Parser Rewrite

Deterministic parser implementation:
- Pattern-based extraction (regex, grammar rules)
- No template injection
- No word-fragment heuristics
- Full provenance tracking

### 3. OAT-2 Replay

Successful execution of OAT-2 with:
- IRCL status: CLEAR
- W-ISS-D: ≥ 95%
- No clarifications
- No phantom intents

---

## Success Criteria

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUCCESS DEFINITION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Parser produces ZERO phantom intents                        │
│  2. Every intent element has provenance to source               │
│  3. OAT-2 passes with W-ISS-D ≥ 95%                            │
│  4. Parser is deterministic (hash-verifiable)                   │
│  5. No ML or heuristic sampling                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Research Boundaries

Per OLYMPUS governance:

| Action | Permitted |
|--------|-----------|
| Create new parser in /research/ | YES |
| Test against canonical pipeline | YES |
| Claim CANONICAL authority | NO |
| Set canShip: true | NO |
| Modify canonical code | NO |

---

## Directory Structure

```
research/semantic-intent-fidelity/
├── RESEARCH_CHARTER.md          ← This file
├── schemas/
│   └── intent-provenance.schema.json
├── src/
│   ├── provenance-parser.ts     ← New parser implementation
│   ├── pattern-rules.ts         ← Extraction rules
│   └── provenance-types.ts      ← Type definitions
├── tests/
│   └── parser.test.ts
└── trials/
    └── OAT-2-replay/
```

---

## Timeline

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1 | Provenance schema | PENDING |
| 2 | Parser implementation | PENDING |
| 3 | Integration | PENDING |
| 4 | OAT-2 replay | PENDING |

---

*Research Track: semantic-intent-fidelity*
*Authority: EXPERIMENTAL*
*Cannot ship to production*
