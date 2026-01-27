# IAL-0: Intent Authentication Layer Specification

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                      INTENT AUTHENTICATION LAYER                             ║
║                            VERSION 0 (IAL-0)                                 ║
║                                                                              ║
║                         FORMAL SPECIFICATION                                 ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**Status:** RESEARCH DRAFT
**Authority:** EXPERIMENTAL
**Version:** 0.1.0

---

## 1. Overview

### 1.1 Purpose

The Intent Authentication Layer (IAL-0) determines whether an intent is **admissible** for constitutional evaluation by OLYMPUS. It acts as a pre-filter that rejects intents which cannot be meaningfully judged.

### 1.2 Scope

IAL-0 applies to:
- All intents derived from user descriptions
- All intents submitted via API
- All intents loaded from intent files

IAL-0 does NOT apply to:
- Constitutional articles (these are meta-intents)
- System-generated clarification requests
- Audit records

### 1.3 Position in Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   User Description                                                          │
│         │                                                                   │
│         ▼                                                                   │
│   ┌───────────────────┐                                                     │
│   │ Provenance Parser │  ← Extracts intents with source tracking            │
│   └─────────┬─────────┘                                                     │
│             │                                                               │
│             ▼                                                               │
│   ┌───────────────────┐                                                     │
│   │      IAL-0        │  ← THIS SPECIFICATION                               │
│   │  (Authentication) │                                                     │
│   └─────────┬─────────┘                                                     │
│             │                                                               │
│        ┌────┴────┐                                                          │
│        ▼         ▼                                                          │
│   REJECTED   AUTHENTICATED                                                  │
│   (returned    (passes to                                                   │
│   to user)     OLYMPUS)                                                     │
│                  │                                                          │
│                  ▼                                                          │
│         ┌─────────────────┐                                                 │
│         │ OLYMPUS Pipeline │                                                │
│         │ (Steps 1-22)     │                                                │
│         └─────────────────┘                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Admissibility Criteria

An intent is **admissible** if and only if it passes ALL of the following checks:

### 2.1 Provenance Check (IAL-0-PROV)

**Requirement:** Every intent MUST have valid provenance linking it to source text.

| Field | Required | Description |
|-------|----------|-------------|
| `provenance.source` | YES | Must be "input" (not "default" or "template") |
| `provenance.span.start` | YES | Start character index in source |
| `provenance.span.end` | YES | End character index in source |
| `provenance.span.text` | YES | Actual text at span (for verification) |
| `provenance.rule` | YES | Extraction rule that produced this intent |
| `provenance.confidence` | YES | Must be ≥ 0.5 |

**Rejection:** `REJECT_NO_PROVENANCE` — Intent cannot be traced to source.

### 2.2 Structure Check (IAL-0-STRUCT)

**Requirement:** Every intent MUST have required structural fields.

| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `id` | YES | string | Non-empty, unique within set |
| `requirement` | YES | string | Length ≥ 10 characters |
| `category` | YES | enum | One of: functional, constraint, initialization, navigation, validation |
| `priority` | YES | enum | One of: critical, high, medium, low |

**Rejection:** `REJECT_MALFORMED` — Intent missing required structure.

### 2.3 Specificity Check (IAL-0-SPEC)

**Requirement:** Every intent MUST specify at least 2 of the 4 W-ISS-D axes.

| Axis | How Specified |
|------|---------------|
| **Trigger** | `trigger.type` is defined |
| **State** | `state.name` is defined OR `effect.target` is defined |
| **Effect** | `effect.action` is defined |
| **Outcome** | `outcome.description` is defined OR effect implies outcome |

**Minimum Axes:** 2 of 4

**Rejection:** `REJECT_UNDERSPECIFIED` — Intent does not specify enough axes for evaluation.

### 2.4 Hostile Check (IAL-0-HOSTILE)

**Requirement:** Intent MUST NOT match known hostile patterns.

Hostile patterns (from HITH):
- Contains "bypass" + safety-related terms
- Contains "ignore" + constraint terms
- Contains "disable" + validation terms
- Contains "skip" + check terms
- Contains "override" + security terms

**Rejection:** `REJECT_HOSTILE` — Intent matches hostile pattern.

### 2.5 Phantom Check (IAL-0-PHANTOM)

**Requirement:** Intent elements MUST NOT be phantoms.

A phantom is detected if:
- `trigger.target` does not appear in source text
- `state.name` ends in suspicious suffix (s, ss, Link, Button) AND does not appear in source
- `effect.target` does not appear in source text
- Any element was derived from template injection

**Rejection:** `REJECT_PHANTOM` — Intent contains phantom elements.

---

## 3. Authentication Process

### 3.1 Algorithm

```
FUNCTION authenticate(intent, sourceText):

  // Check 1: Provenance
  IF intent.provenance IS NULL:
    RETURN REJECT_NO_PROVENANCE

  IF intent.provenance.source != "input":
    RETURN REJECT_NO_PROVENANCE

  IF intent.provenance.confidence < 0.5:
    RETURN REJECT_NO_PROVENANCE

  // Verify span text matches source
  actualText = sourceText.substring(intent.provenance.span.start, intent.provenance.span.end)
  IF actualText != intent.provenance.span.text:
    RETURN REJECT_NO_PROVENANCE

  // Check 2: Structure
  IF intent.id IS EMPTY:
    RETURN REJECT_MALFORMED

  IF intent.requirement IS NULL OR length(intent.requirement) < 10:
    RETURN REJECT_MALFORMED

  IF intent.category NOT IN [functional, constraint, initialization, navigation, validation]:
    RETURN REJECT_MALFORMED

  IF intent.priority NOT IN [critical, high, medium, low]:
    RETURN REJECT_MALFORMED

  // Check 3: Specificity
  axisCount = 0
  IF intent.trigger IS NOT NULL AND intent.trigger.type IS NOT NULL:
    axisCount += 1
  IF intent.state IS NOT NULL OR (intent.effect IS NOT NULL AND intent.effect.target IS NOT NULL):
    axisCount += 1
  IF intent.effect IS NOT NULL AND intent.effect.action IS NOT NULL:
    axisCount += 1
  IF intent.outcome IS NOT NULL AND intent.outcome.description IS NOT NULL:
    axisCount += 1

  IF axisCount < 2:
    RETURN REJECT_UNDERSPECIFIED

  // Check 4: Hostile
  requirementLower = lowercase(intent.requirement)
  FOR pattern IN HOSTILE_PATTERNS:
    IF pattern.matches(requirementLower):
      RETURN REJECT_HOSTILE

  // Check 5: Phantom
  sourceLower = lowercase(sourceText)

  IF intent.trigger.target IS NOT NULL:
    IF lowercase(intent.trigger.target) NOT IN sourceLower:
      RETURN REJECT_PHANTOM

  IF intent.state.name IS NOT NULL:
    IF isPhantomName(intent.state.name) AND lowercase(intent.state.name) NOT IN sourceLower:
      RETURN REJECT_PHANTOM

  // All checks passed
  RETURN AUTHENTICATED

FUNCTION isPhantomName(name):
  // Detect suspicious suffixes from word-fragment extraction
  suspiciousPatterns = ["thes", "ons", "ats", "ifs", "pointss", "updatess"]
  linkPatterns = [name ends with "Link", name ends with "Button" AND not in source]
  RETURN name IN suspiciousPatterns OR any linkPatterns match
```

### 3.2 Batch Authentication

When authenticating a set of intents:

```
FUNCTION authenticateBatch(intents, sourceText):
  authenticated = []
  rejected = []

  FOR intent IN intents:
    result = authenticate(intent, sourceText)

    IF result == AUTHENTICATED:
      authenticated.append(intent)
    ELSE:
      rejected.append({
        intent: intent,
        reason: result,
        timestamp: now()
      })

  RETURN {
    authenticated: authenticated,
    rejected: rejected,
    summary: {
      total: length(intents),
      authenticated: length(authenticated),
      rejected: length(rejected),
      authenticationRate: length(authenticated) / length(intents)
    }
  }
```

---

## 4. Rejection Handling

### 4.1 Rejection Response

When an intent is rejected, IAL-0 returns:

```json
{
  "intentId": "INT-001",
  "status": "REJECTED",
  "reason": "REJECT_UNDERSPECIFIED",
  "details": {
    "check": "IAL-0-SPEC",
    "message": "Intent specifies only 1 of 4 required axes (minimum: 2)",
    "axesFound": ["trigger"],
    "axesMissing": ["state", "effect", "outcome"],
    "suggestion": "Add effect or outcome specification to make intent evaluable"
  },
  "timestamp": "2026-01-19T06:30:00.000Z"
}
```

### 4.2 Rejection is NOT Failure

Rejection by IAL-0 is different from OLYMPUS failure:

| IAL-0 Rejection | OLYMPUS Failure |
|-----------------|-----------------|
| Intent not evaluable | Intent evaluable but not satisfied |
| Happens before pipeline | Happens during pipeline |
| User can fix and resubmit | May require code changes |
| No constitutional overhead | Full pipeline executed |
| Immediate feedback | Delayed feedback |

### 4.3 Rejection Recovery

Users can recover from rejection by:

1. **REJECT_NO_PROVENANCE**: Use provenance parser instead of free-form text
2. **REJECT_MALFORMED**: Add required fields (id, requirement, category, priority)
3. **REJECT_UNDERSPECIFIED**: Add trigger, state, effect, or outcome details
4. **REJECT_HOSTILE**: Remove hostile language patterns
5. **REJECT_PHANTOM**: Ensure all referenced elements appear in source text

---

## 5. Guarantees

### 5.1 What IAL-0 Guarantees

| Guarantee | Description |
|-----------|-------------|
| **G1: No Phantoms Pass** | Any intent with phantom elements is rejected |
| **G2: Minimum Specificity** | Only intents with ≥2 axes reach OLYMPUS |
| **G3: Deterministic** | Same intent + source always produces same decision |
| **G4: Traceable** | Every rejection includes reason and suggestion |
| **G5: Fast Fail** | Under-specified intents fail immediately, not after pipeline |

### 5.2 What IAL-0 Does NOT Guarantee

| Non-Guarantee | Explanation |
|---------------|-------------|
| Intent satisfaction | IAL-0 doesn't verify code implements intent |
| W-ISS-D score | IAL-0 doesn't predict score, only admissibility |
| Build success | Authenticated intents may still cause build failure |
| Intent quality | IAL-0 checks form, not semantic quality |

---

## 6. Integration with OLYMPUS

### 6.1 Pipeline Modification

IAL-0 sits between parsing and Step 1:

```
CURRENT PIPELINE:
  Step 0:  Parse description → intents
  Step 1:  Semantic validation
  ...
  Step 22: Governance mode

PROPOSED PIPELINE:
  Step 0:  Parse description → intents (provenance parser)
  Step 0.5: IAL-0 authentication ← NEW
  Step 1:  Semantic validation (only authenticated intents)
  ...
  Step 22: Governance mode
```

### 6.2 Output Format

IAL-0 adds to build output:

```json
{
  "ial0": {
    "version": "0.1.0",
    "executed": true,
    "inputIntents": 5,
    "authenticatedIntents": 5,
    "rejectedIntents": 0,
    "rejections": [],
    "authenticationRate": 1.0,
    "guarantees": {
      "noPhantoms": true,
      "minimumSpecificity": true,
      "deterministic": true
    }
  }
}
```

### 6.3 Failure Mode

If IAL-0 rejects ALL intents:

```json
{
  "success": false,
  "blocked": true,
  "blockedBy": "IAL-0",
  "blockedReason": "ALL_INTENTS_REJECTED",
  "ial0": {
    "inputIntents": 5,
    "authenticatedIntents": 0,
    "rejectedIntents": 5,
    "rejections": [...]
  },
  "suggestion": "Review rejection reasons and resubmit with corrected intents"
}
```

---

## 7. Compliance

### 7.1 Constitutional Compliance

IAL-0 complies with OLYMPUS Constitution:

| Article | Compliance |
|---------|------------|
| Article 1 (Determinism) | IAL-0 is deterministic |
| Article 3 (Hostile Resistance) | IAL-0 adds early hostile rejection |
| Article 5 (Audit Trail) | IAL-0 logs all rejections |
| Article 9 (No Bypass) | IAL-0 cannot be disabled |

### 7.2 Compliance Spec Requirements

IAL-0 satisfies these OLYMPUS_COMPLIANCE_SPEC.md requirements:

- REQ-SEM-001: Intent parsing produces valid intent objects (enforced by IAL-0-STRUCT)
- REQ-SEM-003: No phantom intents (enforced by IAL-0-PHANTOM)
- REQ-HITH-001: Hostile intents detected (enforced by IAL-0-HOSTILE)

---

## 8. Test Cases

### 8.1 Must Authenticate

```
"On page load, display counter at zero."
→ AUTHENTICATED
  Reason: Has provenance, trigger (lifecycle), effect (display), value (zero)
```

### 8.2 Must Reject: No Provenance

```
{
  "id": "INT-001",
  "requirement": "Display the dashboard",
  "provenance": null
}
→ REJECT_NO_PROVENANCE
```

### 8.3 Must Reject: Malformed

```
{
  "id": "",
  "requirement": "x"
}
→ REJECT_MALFORMED
  Reason: Empty ID, requirement too short
```

### 8.4 Must Reject: Underspecified

```
"The system should be fast."
→ REJECT_UNDERSPECIFIED
  Reason: No trigger, no state, no effect, no outcome
  Axes: 0 of 4
```

### 8.5 Must Reject: Hostile

```
"Bypass authentication for admin users."
→ REJECT_HOSTILE
  Reason: Contains "bypass" + "authentication"
```

### 8.6 Must Reject: Phantom

```
{
  "id": "INT-001",
  "requirement": "Click the OnLink button",
  "trigger": { "target": "OnLink" },
  "provenance": { "span": { "text": "On page load" } }
}
→ REJECT_PHANTOM
  Reason: "OnLink" not in source text, derived from "On"
```

---

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-01-19 | Initial research draft |

---

## 10. References

- `OLYMPUS_COMPLIANCE_SPEC.md` — Compliance requirements
- `OLYMPUS_CONSTITUTION_v2.0.json` — Constitutional articles
- `research/semantic-intent-fidelity/` — Provenance parser
- `corpus/` — Canonical intent examples

---

*IAL-0 Specification*
*Authority: EXPERIMENTAL*
*Status: RESEARCH DRAFT*
