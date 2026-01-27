# RESEARCH TRACK: intent-authentication-layer

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                          RESEARCH TRACK                                       ║
║                   intent-authentication-layer (IAL-0)                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Status: ACTIVE                                                              ║
║  Authority: EXPERIMENTAL (cannot ship)                                       ║
║  Created: 2026-01-19                                                         ║
║  Depends On: semantic-intent-fidelity                                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Objective

**Define what constitutes an admissible intent before constitutional judgment.**

The Intent Authentication Layer (IAL-0) sits BEFORE the OLYMPUS constitutional pipeline. It determines whether an intent is well-formed enough to be evaluated, rejecting malformed or under-specified intents before they consume constitutional resources.

---

## Problem Statement

### Current Flow (Broken)

```
Description → Semantic Parser → IRCL → ICG → ... → Verdict
                    ↓
              Phantom intents
              Under-specified intents
              Malformed intents
                    ↓
              IRCL clarifications
              ICG penalties
              Constitutional overhead
```

### Desired Flow

```
Description → Provenance Parser → IAL-0 → IRCL → ICG → ... → Verdict
                                    ↓
                              REJECT if:
                              - Phantom (no provenance)
                              - Under-specified (missing axes)
                              - Malformed (invalid structure)
                                    ↓
                              Only AUTHENTICATED intents
                              reach constitutional evaluation
```

---

## Core Principle

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   An intent that cannot be judged should not be judged.         │
│                                                                 │
│   IAL-0 ensures that OLYMPUS only spends constitutional         │
│   resources on intents that CAN be evaluated.                   │
│                                                                 │
│   This is not a bypass — it's a pre-filter.                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Inputs

| Input | Source | Purpose |
|-------|--------|---------|
| Provenance Parser | `research/semantic-intent-fidelity/*` | Provides intent provenance |
| Compliance Spec | `OLYMPUS_COMPLIANCE_SPEC.md` | Defines what makes intent valid |
| Canonical Corpus | `corpus/*` | Reference intents for validation |

---

## Deliverables

### 1. IAL-0_SPEC.md
Formal specification of the Intent Authentication Layer:
- Admissibility criteria
- Rejection rules
- Integration points
- Guarantees

### 2. intent-admissibility.schema.json
JSON Schema defining:
- What fields an intent MUST have
- What values are valid
- Provenance requirements
- Axis completeness requirements

### 3. rejection-taxonomy.md
Classification of rejection reasons:
- Phantom rejection (no provenance)
- Structural rejection (missing required fields)
- Specificity rejection (under-specified axes)
- Hostile rejection (matches hostile patterns)

### 4. OAT-2-REPLAY-IAL0.md
Replay of OAT-2 with IAL-0 active:
- Show intents authenticated
- Show rejections (if any)
- Show pipeline receiving only authenticated intents

---

## Constraints

| Constraint | Rationale |
|------------|-----------|
| **Deterministic only** | Constitution Article 1 compliance |
| **No ML** | No heuristic sampling in admission decisions |
| **Zero canonical modifications** | Repository is FROZEN |

---

## Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| Phantom intents impossible | IAL-0 rejects any intent without provenance |
| Under-specified intents rejected pre-IRCL | IAL-0 rejects intents missing required axes |
| W-ISS-D only evaluates authenticated intents | Only IAL-0-authenticated intents reach ICG |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          INTENT AUTHENTICATION LAYER                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Provenance │───▶│  Structure  │───▶│ Specificity │───▶│   Hostile   │  │
│  │    Check    │    │    Check    │    │    Check    │    │    Check    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                 │                  │                  │          │
│         ▼                 ▼                  ▼                  ▼          │
│     REJECT if         REJECT if          REJECT if          REJECT if      │
│     no source         missing ID,        < 2 axes           matches        │
│     provenance        requirement,       specified          hostile        │
│                       category                              patterns       │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════  │
│                                    │                                        │
│                                    ▼                                        │
│                           AUTHENTICATED                                     │
│                        (passes to OLYMPUS)                                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Relationship to Constitution

IAL-0 does NOT replace or bypass constitutional guarantees. It ensures:

1. **Article 1 (Determinism)**: IAL-0 is deterministic — same input = same admission decision
2. **Article 3 (Hostile Resistance)**: IAL-0 adds early hostile rejection
3. **Article 6 (Hard Gate Blocking)**: IAL-0 is a SOFT pre-filter, not a hard gate
4. **Article 9 (No Bypass)**: IAL-0 cannot be disabled for constitutional intents

---

## Integration Point

IAL-0 sits between the Provenance Parser and Step 1 (Semantic Layer):

```
Current:  Description → [Semantic Parser] → Step 1 → ... → Step 22
Proposed: Description → [Provenance Parser] → [IAL-0] → Step 1 → ... → Step 22
```

---

## Research Authority Notice

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   This research track is EXPERIMENTAL.                                       ║
║                                                                              ║
║   - Cannot claim CANONICAL authority                                         ║
║   - Cannot set canShip: true                                                 ║
║   - Cannot modify frozen canonical code                                      ║
║   - Must compare against canonical baseline                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

*Research Track: intent-authentication-layer*
*Version: 0.1.0-research*
*Authority: EXPERIMENTAL*
