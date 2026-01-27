# IAL-0 Rejection Taxonomy

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                         REJECTION TAXONOMY                                   ║
║                      Intent Authentication Layer                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**Version:** 0.1.0
**Authority:** EXPERIMENTAL

---

## Overview

This document classifies all reasons an intent may be rejected by IAL-0 before reaching OLYMPUS constitutional evaluation.

---

## Rejection Categories

```
REJECTIONS
├── REJECT_NO_PROVENANCE     (Provenance failures)
├── REJECT_MALFORMED         (Structural failures)
├── REJECT_UNDERSPECIFIED    (Specificity failures)
├── REJECT_HOSTILE           (Hostile pattern matches)
└── REJECT_PHANTOM           (Phantom element detection)
```

---

## 1. REJECT_NO_PROVENANCE

### Definition

Intent cannot be traced to source text.

### Sub-Categories

| Code | Description | Severity |
|------|-------------|----------|
| PROV-001 | Provenance object is null | HARD |
| PROV-002 | Provenance source is not "input" | HARD |
| PROV-003 | Provenance confidence below 0.5 | HARD |
| PROV-004 | Span text doesn't match source | HARD |
| PROV-005 | Span indices out of bounds | HARD |
| PROV-006 | Missing extraction rule | SOFT |

### Examples

**PROV-001: Null provenance**
```json
{
  "id": "INT-001",
  "requirement": "Display dashboard",
  "provenance": null  // ← REJECTED
}
```

**PROV-002: Non-input source**
```json
{
  "provenance": {
    "source": "template",  // ← REJECTED (must be "input")
    "span": { "start": 0, "end": 10, "text": "..." }
  }
}
```

**PROV-004: Text mismatch**
```
Source: "On page load, display counter"
Span: { start: 0, end: 7, text: "When pa" }  // ← REJECTED (doesn't match)
```

### Recovery

- Use provenance parser instead of free-form submission
- Ensure span indices are correct
- Verify text at span matches intent derivation

---

## 2. REJECT_MALFORMED

### Definition

Intent is missing required structural fields or has invalid values.

### Sub-Categories

| Code | Description | Severity |
|------|-------------|----------|
| STRUCT-001 | Missing or empty ID | HARD |
| STRUCT-002 | ID format invalid | SOFT |
| STRUCT-003 | Missing requirement | HARD |
| STRUCT-004 | Requirement too short (< 10 chars) | HARD |
| STRUCT-005 | Invalid category | HARD |
| STRUCT-006 | Invalid priority | HARD |
| STRUCT-007 | Duplicate ID in set | HARD |

### Examples

**STRUCT-001: Missing ID**
```json
{
  "requirement": "Display counter"
  // Missing "id" field ← REJECTED
}
```

**STRUCT-004: Requirement too short**
```json
{
  "id": "INT-001",
  "requirement": "Show x"  // ← REJECTED (only 6 chars, need 10)
}
```

**STRUCT-005: Invalid category**
```json
{
  "id": "INT-001",
  "requirement": "Display counter",
  "category": "display"  // ← REJECTED (not in enum)
}
```

### Valid Categories
- `functional` — Core behavior
- `constraint` — Restriction or guard
- `initialization` — Startup behavior
- `navigation` — Routing/navigation
- `validation` — Input validation

### Valid Priorities
- `critical` — Must be satisfied, blocks ship
- `high` — Important, affects quality
- `medium` — Standard priority
- `low` — Nice to have

### Recovery

- Ensure all required fields are present
- Use valid enum values for category and priority
- Write requirements with minimum 10 characters

---

## 3. REJECT_UNDERSPECIFIED

### Definition

Intent does not specify enough W-ISS-D axes for meaningful evaluation.

### Sub-Categories

| Code | Description | Severity |
|------|-------------|----------|
| SPEC-001 | Zero axes specified | HARD |
| SPEC-002 | Only 1 axis specified (need 2) | HARD |
| SPEC-003 | Axes specified but empty | SOFT |

### Axis Definitions

| Axis | How Specified | Examples |
|------|---------------|----------|
| **Trigger** | `trigger.type` is defined | click, lifecycle, input |
| **State** | `state.name` OR `effect.target` | counter, userList |
| **Effect** | `effect.action` is defined | set, increment, display |
| **Outcome** | `outcome.description` | "User sees counter" |

### Minimum Requirement

**At least 2 of 4 axes must be specified.**

### Examples

**SPEC-001: Zero axes**
```json
{
  "id": "INT-001",
  "requirement": "The system should be fast",
  "category": "functional",
  "priority": "high"
  // No trigger, state, effect, or outcome ← REJECTED
}
```

**SPEC-002: Only 1 axis**
```json
{
  "id": "INT-001",
  "requirement": "When button clicked",
  "trigger": { "type": "click" }
  // Only trigger, no effect/state/outcome ← REJECTED
}
```

**Valid: 2 axes**
```json
{
  "id": "INT-001",
  "requirement": "When button clicked, counter increases",
  "trigger": { "type": "click" },  // Axis 1
  "effect": { "action": "increment" }  // Axis 2
  // ← AUTHENTICATED (2 axes)
}
```

### Common Under-Specified Patterns

| Pattern | Axes | Status |
|---------|------|--------|
| "System should be fast" | 0 | REJECTED |
| "Display dashboard" | 1 (effect) | REJECTED |
| "When clicked, show modal" | 2 (trigger + effect) | OK |
| "Counter starts at zero and increments on click" | 3 | OK |

### Recovery

- Add trigger: What causes this?
- Add state: What data is involved?
- Add effect: What changes?
- Add outcome: What does user see?

---

## 4. REJECT_HOSTILE

### Definition

Intent matches known hostile patterns from HITH (Hostile Intent Test Harness).

### Sub-Categories

| Code | Pattern | Severity |
|------|---------|----------|
| HOST-001 | bypass + safety/security/auth | CRITICAL |
| HOST-002 | ignore + constraint/rule/check | CRITICAL |
| HOST-003 | disable + validation/verification | CRITICAL |
| HOST-004 | skip + check/test/verification | CRITICAL |
| HOST-005 | override + security/permission | CRITICAL |
| HOST-006 | backdoor / secret access | CRITICAL |
| HOST-007 | unlimited + admin/access | HIGH |
| HOST-008 | always succeed / never fail | HIGH |

### Pattern Matching Rules

```
HOSTILE if requirement matches ANY:
  /bypass.*(auth|security|safety|check|validation)/i
  /ignore.*(constraint|rule|check|limit)/i
  /disable.*(validation|verification|check|safety)/i
  /skip.*(check|test|verification|validation)/i
  /override.*(security|permission|access|limit)/i
  /backdoor|secret.*(access|entry|admin)/i
  /unlimited.*(admin|access|permission)/i
  /always.*(succeed|pass|allow)|never.*(fail|reject|block)/i
```

### Examples

**HOST-001: Bypass**
```
"Bypass authentication for admin users"
→ REJECT_HOSTILE (bypass + auth)
```

**HOST-003: Disable**
```
"Disable input validation on forms"
→ REJECT_HOSTILE (disable + validation)
```

**HOST-006: Backdoor**
```
"Create backdoor admin access"
→ REJECT_HOSTILE (backdoor + admin + access)
```

### False Positive Handling

Some legitimate intents may trigger hostile patterns. Recovery options:

1. Rephrase without hostile terms
2. Split into non-hostile components
3. Request manual review (future feature)

**False positive example:**
```
"Skip loading animation for fast connections"
// Contains "skip" but is legitimate
// Rephrase: "Omit loading animation for fast connections"
```

### Recovery

- Rephrase requirement without hostile terms
- Split intent into smaller, non-hostile parts
- Review against HITH patterns before submission

---

## 5. REJECT_PHANTOM

### Definition

Intent contains elements that don't exist in the source text (phantom elements).

### Sub-Categories

| Code | Description | Severity |
|------|-------------|----------|
| PHANT-001 | Trigger target not in source | HARD |
| PHANT-002 | State name is word fragment | HARD |
| PHANT-003 | Effect target not in source | HARD |
| PHANT-004 | Template-injected content | CRITICAL |
| PHANT-005 | Suspicious suffix pattern | HARD |

### Phantom Detection Rules

**PHANT-001/003: Target not in source**
```
Source: "On page load, display counter"
Intent: { trigger: { target: "OnLink" } }  // "OnLink" not in source
→ REJECT_PHANTOM
```

**PHANT-002/005: Word fragment state names**
```
Suspicious patterns:
- "thes" (from "the")
- "ons" (from "on")
- "ats" (from "at")
- "pointss" (double s suffix)
- "updatess" (double s suffix)
- "*Link" (from word + "Link")
- "*Button" (from word + "Button" if not in source)
```

**PHANT-004: Template injection**
```
Source: "Display counter"
Intent: { requirement: "mitigation: Maintain feature list" }
// "mitigation" NEVER appears in source
→ REJECT_PHANTOM
```

### Known Phantom Patterns (from OAT-2)

| Phantom | Source | How Generated |
|---------|--------|---------------|
| `OnLink` | "On" | Word + "Link" suffix |
| `initialLink` | "initial" | Word + "Link" suffix |
| `thes` | "the" | Article + "s" suffix |
| `pointss` | (none) | Template injection |
| `withoutLink` | "without" | Word + "Link" suffix |
| `mitigation` | (none) | Template injection |

### Examples

**PHANT-001: Trigger target phantom**
```
Source: "When user clicks plus button"
Intent: {
  trigger: {
    target: "PlusLink"  // ← PHANTOM (source has "plus button", not "PlusLink")
  }
}
→ REJECT_PHANTOM
```

**PHANT-002: Word fragment state**
```
Source: "Display the counter"
Intent: {
  state: {
    name: "thes"  // ← PHANTOM (extracted "the" + "s")
  }
}
→ REJECT_PHANTOM
```

### Recovery

- Use provenance parser (eliminates phantoms by design)
- Verify all targets/states appear in source text
- Remove template content not from source

---

## Rejection Decision Tree

```
                        ┌─────────────────┐
                        │  Intent Input   │
                        └────────┬────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Has provenance?       │
                    └────────────┬───────────┘
                          NO │         │ YES
                             ▼         ▼
                   REJECT_NO_PROVENANCE │
                                        │
                                        ▼
                    ┌────────────────────────┐
                    │  Provenance valid?     │
                    │  (source=input,        │
                    │   confidence>=0.5,     │
                    │   text matches)        │
                    └────────────┬───────────┘
                          NO │         │ YES
                             ▼         ▼
                   REJECT_NO_PROVENANCE │
                                        │
                                        ▼
                    ┌────────────────────────┐
                    │  Structure valid?      │
                    │  (id, requirement,     │
                    │   category, priority)  │
                    └────────────┬───────────┘
                          NO │         │ YES
                             ▼         ▼
                   REJECT_MALFORMED     │
                                        │
                                        ▼
                    ┌────────────────────────┐
                    │  Has ≥2 axes?          │
                    └────────────┬───────────┘
                          NO │         │ YES
                             ▼         ▼
                   REJECT_UNDERSPECIFIED │
                                        │
                                        ▼
                    ┌────────────────────────┐
                    │  Matches hostile       │
                    │  pattern?              │
                    └────────────┬───────────┘
                         YES │         │ NO
                             ▼         ▼
                   REJECT_HOSTILE       │
                                        │
                                        ▼
                    ┌────────────────────────┐
                    │  Contains phantoms?    │
                    └────────────┬───────────┘
                         YES │         │ NO
                             ▼         ▼
                   REJECT_PHANTOM       │
                                        │
                                        ▼
                            ┌───────────────────┐
                            │   AUTHENTICATED   │
                            │  (passes to       │
                            │   OLYMPUS)        │
                            └───────────────────┘
```

---

## Rejection Statistics Template

When reporting rejections, use this format:

```json
{
  "summary": {
    "total": 10,
    "authenticated": 7,
    "rejected": 3,
    "authenticationRate": 0.70,
    "rejectionsByReason": {
      "REJECT_NO_PROVENANCE": 0,
      "REJECT_MALFORMED": 1,
      "REJECT_UNDERSPECIFIED": 1,
      "REJECT_HOSTILE": 0,
      "REJECT_PHANTOM": 1
    }
  }
}
```

---

## Severity Levels

| Severity | Description | User Impact |
|----------|-------------|-------------|
| CRITICAL | Security or integrity risk | Must fix before any submission |
| HARD | Cannot proceed | Fix required for authentication |
| SOFT | Possible issue | Warning, may still authenticate |

---

## Future Extensions

Potential additional rejection categories:

| Code | Description | Status |
|------|-------------|--------|
| REJECT_CIRCULAR | Circular dependencies in intents | PLANNED |
| REJECT_CONTRADICTORY | Intent contradicts another | PLANNED |
| REJECT_DUPLICATE | Duplicate of existing intent | PLANNED |
| REJECT_SCOPE_EXCEEDED | Intent too broad for single eval | FUTURE |

---

*Rejection Taxonomy v0.1.0*
*Authority: EXPERIMENTAL*
