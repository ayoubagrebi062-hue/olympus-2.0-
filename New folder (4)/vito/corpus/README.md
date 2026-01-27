# OLYMPUS Canonical Evaluation Corpus

**Version:** 2.1-canonical
**Status:** STEWARD MODE

---

## Purpose

This corpus defines the canonical set of intents for evaluating OLYMPUS enforcement. These are **ground truth examples** that the system must handle correctly.

## Files

| File | Description | Expected Fate |
|------|-------------|---------------|
| `good-intents.json` | Intents that MUST ship | ACCEPTED |
| `bad-intents.json` | Intents that MUST block | FORBIDDEN |
| `borderline-intents.json` | Intents that pass conditionally | ACCEPTED_WITH_DEBT or QUARANTINED |

---

## Good Intents (10)

These intents have all required axes:
- **Trigger:** Clear user action or system event
- **State:** Explicit or strongly implied state mutation
- **Outcome:** Observable, verifiable result

**Expected W-ISS-D:** ≥ 95%
**Expected Fate:** ACCEPTED
**Expected Blocking Layer:** None

### Characteristics
- Specific user actions ("clicks", "submits", "toggles")
- Explicit state changes ("added to cart", "updates to show")
- Measurable outcomes (specific text, colors, dimensions)
- Bounded scope (enumerated items, specific values)

---

## Bad Intents (15)

These intents match hostile patterns in HITH:

| Attack Type | Count | Description |
|-------------|-------|-------------|
| SEMANTIC_VOID | 3 | No concrete meaning at all |
| UNBOUNDED_CLAIM | 3 | "All", "every" without enumeration |
| EXTERNAL_CLAIM | 2 | Claims external behavior without anchor |
| SCOPE_CREEP | 1 | Parenthetical expansion |
| EXISTENCE_NOT_PROOF | 1 | UI presence ≠ functionality |
| INFINITE_CLAIM | 2 | Infinite verification required |
| TEMPORAL_CLAIM | 2 | Time behavior without mechanism |
| COMPARATIVE_CLAIM | 1 | Relative without baseline |

**Expected W-ISS-D:** < 60%
**Expected Fate:** FORBIDDEN
**Expected Blocking Layer:** ICG, IRCL, ERA, or BEHAVIORAL

### Red Flags
- Superlatives: "all", "every", "always", "perfectly"
- Subjective: "good", "fast", "secure", "optimal"
- Unbounded: "everything", "all edge cases"
- External: "syncs to cloud", "sends notifications" (without ERA)

---

## Borderline Intents (12)

These intents are not hostile but not fully specified:

| Expected Fate | Count | Typical Issue |
|---------------|-------|---------------|
| ACCEPTED_WITH_DEBT | 8 | Missing visual/UI specification |
| QUARANTINED | 4 | External verification required |

**Expected W-ISS-D:** 60-94%
**Expected Blocking Layer:** Varies (often ERA for QUARANTINED)

### Debt Types
- Visual specification missing (colors, dimensions, styles)
- Error message content unspecified
- Implementation details missing
- External verification required but achievable

### Quarantine Triggers
- External service claims (Stripe, email providers)
- Compliance claims (PCI-DSS, GDPR)
- Performance claims (load times, response times)

---

## Usage in Testing

### Regression Testing
```bash
# All good intents must ship
for intent in good-intents.json; do
  assert fate == ACCEPTED
done

# All bad intents must block
for intent in bad-intents.json; do
  assert fate == FORBIDDEN
done

# Borderline intents must not be ACCEPTED without debt
for intent in borderline-intents.json; do
  assert fate in [ACCEPTED_WITH_DEBT, QUARANTINED]
done
```

### Smoke Testing
Run the 10 good intents + 15 bad intents before every release:
- 10/10 good intents ship = PASS
- 15/15 bad intents block = PASS
- Any leak = FAIL

---

## Modification Rules

This corpus is in **STEWARD MODE**:

1. **NO NEW PATTERNS** - Only document existing hostile types
2. **NO REMOVED PATTERNS** - All 15 bad intents must remain
3. **VERSION BUMP** - Any change requires version increment
4. **AUDIT TRAIL** - Changes must include justification

### Adding New Examples
New examples may be added if they:
- Fit existing attack types (no new types)
- Are clearly good, bad, or borderline (no ambiguity)
- Include full analysis and expected scores

---

## Corpus Integrity

The corpus is signed by the constitution hash. If the corpus changes without a corresponding constitution update, this indicates unauthorized modification.

```
Corpus Version: 2.1-canonical
Constitution Hash: (calculated at runtime)
Last Validated: 2026-01-19
```

---

*STEWARD MODE: This corpus documents existing patterns. No new enforcement defined.*
