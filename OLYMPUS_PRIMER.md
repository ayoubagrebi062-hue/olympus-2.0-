# OLYMPUS PRIMER

**Read time:** 10 minutes
**Prerequisite:** None

---

## What Is OLYMPUS?

OLYMPUS is a system that answers one question:

> **Does this software do what it claims to do?**

You write requirements. OLYMPUS checks if they're satisfied. If yes, you can ship. If no, you cannot.

That's it.

---

## The Core Problem

Software has a honesty problem.

We write: _"User can log in securely"_
We ship: A login page

We write: _"System handles all edge cases"_
We ship: Whatever we had time for

We write: _"Data syncs to cloud"_
We ship: An API call we hope works

The gap between what we **claim** and what we **prove** is where lies live.

OLYMPUS closes that gap.

---

## How It Works

### Step 1: You Write Intents

An intent is a statement of desired behavior. Good intents have three parts:

| Part        | Question            | Example                      |
| ----------- | ------------------- | ---------------------------- |
| **Trigger** | What causes this?   | "When user clicks Submit"    |
| **State**   | What changes?       | "The form data is validated" |
| **Outcome** | What is observable? | "Error messages appear"      |

**Good intent:**

> When user clicks 'Add to Cart', the product is added to cart state and the badge shows the new count.

**Bad intent:**

> The system should work well for all users.

### Step 2: OLYMPUS Evaluates

OLYMPUS runs your intents through 22 verification steps. Each step checks something specific:

- Does the intent make sense? (Semantic)
- Can we prove the behavior? (Behavioral)
- Do cause and effect connect? (Causal)
- Are external claims verified? (ERA)
- Are there contradictions? (IRCL)
- Would hostile intents pass? (HITH)
- And more...

### Step 3: You Get a Verdict

**SHIP** or **BLOCK**. Binary. No "mostly okay."

If shipped: You get `WHY_THIS_SHIPPED.md` explaining success.
If blocked: You get `WHY_THIS_BLOCKED.md` explaining failure.

---

## The Four Scores

OLYMPUS produces four numbers that matter:

| Score       | Measures            | Threshold     |
| ----------- | ------------------- | ------------- |
| **W-ISS-D** | Intent satisfaction | ≥ 95% to ship |
| **SSI**     | System stability    | ≥ 70% to ship |
| **UVD**     | User value          | ≥ 60% to ship |
| **IAS**     | Intent quality      | ≥ 70% to ship |

All four must pass. Fail one, fail all.

---

## The Four Fates

Every intent gets assigned a fate:

| Fate                   | Meaning              | Can Ship?          |
| ---------------------- | -------------------- | ------------------ |
| **ACCEPTED**           | Fully verified       | Yes                |
| **ACCEPTED_WITH_DEBT** | Passes but has gaps  | Yes (with warning) |
| **QUARANTINED**        | Under observation    | Depends            |
| **FORBIDDEN**          | Permanently rejected | Never              |

Fates evolve according to rules. FORBIDDEN is forever.

---

## What Makes OLYMPUS Different

### 1. Deterministic

Same input = same output. Always. No AI guessing. No random sampling. No "it depends."

### 2. Non-Negotiable Core

Some things cannot be overridden:

- Hostile intent leaked? Blocked.
- Constitution violated? Blocked.
- FORBIDDEN intent included? Blocked.

No deadline, no executive, no emergency can bypass these.

### 3. Hostile Resistance

OLYMPUS actively tests itself with known bad intents. If even one hostile intent could slip through, the build fails.

Current hostile test count: 15 intents, 8 attack patterns, 0% leak tolerance.

### 4. Auditable

Every decision is logged. Every score is explained. Every build produces a cryptographic certificate proving what was checked.

---

## What OLYMPUS Is Not

| Not This               | Because                             |
| ---------------------- | ----------------------------------- |
| A testing framework    | It verifies intents, not code       |
| A code quality tool    | Ugly code can satisfy intents       |
| A project manager      | It doesn't track sprints or effort  |
| A guarantee of success | Users might still hate your product |
| AI/ML-based            | Determinism requires no inference   |

---

## The Override System

Humans can override _some_ decisions, but:

1. **Not everything** - Constitutional violations cannot be overridden
2. **With penalty** - Overrides cost stability points (SSI)
3. **With limits** - Max 2 per build, 40% cumulative penalty
4. **With accountability** - Your name is recorded forever

Override is an escape valve, not a skip button.

---

## The 22-Step Pipeline

Every build runs these steps in order. No skipping. No reordering.

```
1.  Request Parsing
2.  Filesystem Setup
2.1 Architecture Guard (HARD)
3.  Event Subscription
4.  Build Orchestration
5.  Summary Generation
6.  File Collection
7.  Semantic Validation (HARD)
8.  Behavioral Validation (HARD)
9.  Causal Validation (HARD)
10. ICG Analysis (HARD)
11. ERA + RGL (HARD)
12. IRCL (HARD)
12.5 IRE (soft)
12.6 IMPL (soft)
12.7 ITGCL (HARD)
13. Previous W-ISS-D
14. IGDE (HARD)
15. Intent Graph Persistence
16. SCE (HARD)
17. HITH (HARD)
18. IAL (HARD)
18.1 Hostile Minimal-Intent (HARD)
19. UVDL (HARD)
19.1 Hostile Low-Value (HARD)
20. IGE (HARD)
20.1 Governance Tests (HARD)
20.2 FATE (HARD)
21. CTEL (HARD)
22. CGM (HARD)
```

**HARD** = Failure blocks shipping. No exceptions.

---

## The Constitution

OLYMPUS has 12 articles that cannot be violated:

1. **Determinism** - Same input, same output
2. **Monotonicity** - Scores don't regress without cause
3. **Hostile Resistance** - Zero hostile leaks allowed
4. **Evolution Enforcement** - Fate transitions follow rules
5. **Audit Trail** - All decisions logged
6. **Hard Gate Blocking** - Failed gates block shipping
7. **Forbidden Permanence** - FORBIDDEN stays FORBIDDEN
8. **Critical Mandatory** - Critical intents can't be excluded
9. **No Bypass** - Safety can't be disabled
10. **Trust Threshold** - Low-trust externals are forbidden
11. **Governance Integrity** - Override system resists abuse
12. **External Verifiability** - Certificates enable verification

Nine are non-amendable. Three can be amended via formal process.

---

## Quick Reference

### Good Intent Patterns

```
✓ "When user clicks X, Y happens and Z is visible"
✓ "The page displays A at B pixels with C format"
✓ "After 300ms delay, the search filters to show matching items"
```

### Bad Intent Patterns

```
✗ "System works perfectly" (what does "perfectly" mean?)
✗ "Handles all edge cases" (infinite scope)
✗ "Users have good experience" (unmeasurable)
✗ "Data syncs to cloud" (unverified external claim)
```

### Hostile Patterns That Always Fail

| Pattern         | Example               |
| --------------- | --------------------- |
| Semantic void   | "Works well"          |
| Unbounded claim | "Handles everything"  |
| External claim  | "Syncs automatically" |
| Infinite scope  | "All edge cases"      |
| Comparative     | "Faster than before"  |

---

## Getting Started

1. **Write intents** with trigger, state, and outcome
2. **Run OLYMPUS** on your build
3. **Read the verdict** (WHY_THIS_SHIPPED or WHY_THIS_BLOCKED)
4. **Fix issues** if blocked
5. **Ship** if approved

That's the entire workflow.

---

## Key Files

| File                      | Purpose                     |
| ------------------------- | --------------------------- |
| `WHY_THIS_SHIPPED.md`     | Explains why you can ship   |
| `WHY_THIS_BLOCKED.md`     | Explains why you can't ship |
| `DECISION_CERTIFICATE.md` | Cryptographic proof         |
| `.olympus/`               | Full audit trail            |

---

## One Sentence Summary

**OLYMPUS verifies that software does what it claims to do, and refuses to ship if it doesn't.**

---

## Further Reading

| Document                     | For                                     |
| ---------------------------- | --------------------------------------- |
| `OLYMPUS_PHILOSOPHY.md`      | Understanding the "why"                 |
| `OLYMPUS_COMPLIANCE_SPEC.md` | Implementing or auditing                |
| `OLYMPUS_THREAT_MODEL.md`    | Security considerations                 |
| `OLYMPUS_ROLES.md`           | Authority and accountability            |
| `/corpus/`                   | Example intents (good, bad, borderline) |
| `/exemplar/`                 | Example compliant build                 |

---

_OLYMPUS 2.1 - The system that refuses to ship lies._
