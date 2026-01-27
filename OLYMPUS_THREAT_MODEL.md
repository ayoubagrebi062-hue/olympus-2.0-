# OLYMPUS 2.1 - THREAT MODEL

**Version:** 2.1-canonical
**Status:** STEWARD MODE
**Purpose:** Document existing threats and mitigations

---

## Explicit Adversaries

### ADV-1: The Vague Intent Author

**Profile:** Developer who writes intents that sound meaningful but contain no verifiable behavior.

**Motivation:** Ship quickly without specifying actual requirements.

**Attack Pattern:**

- Uses superlatives: "all", "every", "perfectly", "optimally"
- Uses subjective terms: "good experience", "fast", "secure"
- Claims infinite scope: "handles all edge cases"

**Example:**

> "The system should work perfectly for all users."

**Mitigations:**
| Layer | Detection | Enforcement |
|-------|-----------|-------------|
| ICG (W-ISS-D) | Missing T/S/O axes | Score < 95% blocks |
| IRCL | Ambiguity detected | BLOCKED status |
| HITH | Matches hostile pattern | HARD FAIL |

---

### ADV-2: The Scope Creeper

**Profile:** Stakeholder who adds unbounded requirements disguised as simple features.

**Motivation:** Get more functionality without explicit commitment.

**Attack Pattern:**

- Parenthetical expansion: "display data (and allow editing)"
- Implicit state: "user sees their dashboard" (implies auth, persistence)
- Hidden dependencies: "integrate with third-party services"

**Example:**

> "Show user profile (with ability to manage all settings)."

**Mitigations:**
| Layer | Detection | Enforcement |
|-------|-----------|-------------|
| IRCL | Contradiction detection | CONTRADICTORY status |
| ITGCL | Cross-intent inconsistency | Global violation |
| Behavioral | State mutation without spec | Proof failure |

---

### ADV-3: The External Claimer

**Profile:** Developer who claims external system behavior without verification.

**Motivation:** Avoid integration complexity by asserting outcomes.

**Attack Pattern:**

- Claims API responses without ERA anchors
- Assumes third-party behavior
- Declares "real-time" without push mechanism

**Example:**

> "Data syncs automatically to the cloud."

**Mitigations:**
| Layer | Detection | Enforcement |
|-------|-----------|-------------|
| ERA | Missing external anchor | Trust score < 30% |
| RGL | Unverified external claim | Governance failure |
| Causal | Missing cause-effect chain | Chain broken |

---

### ADV-4: The Override Abuser

**Profile:** Project manager or lead who attempts to bypass safety for deadlines.

**Motivation:** Ship regardless of quality gates.

**Attack Pattern:**

- Requests override of non-overridable targets
- Chains multiple overrides to erode SSI
- Provides minimal justification
- Attempts cooldown bypass

**Example:**

> "Override CONSTITUTION_VIOLATION - we need to ship today."

**Mitigations:**
| Layer | Detection | Enforcement |
|-------|-----------|-------------|
| Human Override | Non-overridable check | REJECTED |
| Governance Harness | Override abuse scenario | BLOCKED |
| Constitution | Article 9 (No Bypass) | VIOLATION |

---

### ADV-5: The Policy Manipulator

**Profile:** Technical lead attempting to weaken constitutional guarantees.

**Motivation:** Reduce verification burden for team.

**Attack Pattern:**

- Attempts to modify non-amendable articles
- Tries to lower thresholds (trust, SSI)
- Adds bypass patterns to allowed list

**Example:**

> "Lower hostile leak tolerance to 5% for faster builds."

**Mitigations:**
| Layer | Detection | Enforcement |
|-------|-----------|-------------|
| Governance Harness | Policy capture scenario | BLOCKED |
| Constitution | Non-amendable articles | IMMUTABLE |
| Architecture Guard | Breach detection | ARCHITECTURE_BREACH |

---

### ADV-6: The Fate Rehabilitator

**Profile:** Developer who wants to resurrect forbidden intents.

**Motivation:** Reuse blocked code/requirements.

**Attack Pattern:**

- Attempts FORBIDDEN → any transition
- Tries to clear fate history
- Backdates fate assignments
- Skips evolution steps

**Example:**

> "The forbidden intent was refactored, mark it ACCEPTED."

**Mitigations:**
| Layer | Detection | Enforcement |
|-------|-----------|-------------|
| FATE | Evolution rule check | EVOLUTION_VIOLATION |
| Constitution | Article 7 (Permanence) | VIOLATION |
| Governance Harness | Fate manipulation scenario | BLOCKED |

---

### ADV-7: The Audit Tamperer

**Profile:** Bad actor attempting to hide evidence of violations.

**Motivation:** Remove traces of blocked decisions.

**Attack Pattern:**

- Deletes audit files
- Modifies existing entries
- Skips audit file creation

**Example:**

> "Clean up old override records to save storage."

**Mitigations:**
| Layer | Detection | Enforcement |
|-------|-----------|-------------|
| Constitution | Article 5 (Audit Trail) | SSI penalty |
| Governance Harness | Audit tampering scenario | DETECTED |
| Decision Certificate | Immutable hash chain | Tamper-evident |

---

### ADV-8: The Privilege Escalator

**Profile:** Unauthorized user attempting to gain override authority.

**Motivation:** Bypass approval processes.

**Attack Pattern:**

- Self-grants override authority
- Modifies governance limits
- Bypasses authorization requirement

**Example:**

> "Grant myself override authority for this project."

**Mitigations:**
| Layer | Detection | Enforcement |
|-------|-----------|-------------|
| Governance Harness | Privilege escalation scenario | BLOCKED |
| Human Override | Authorizer validation | REJECTED |
| Constitution | Article 11 (Integrity) | VIOLATION |

---

## Non-Goals

OLYMPUS explicitly does NOT attempt to:

| Non-Goal                             | Reason                                                   |
| ------------------------------------ | -------------------------------------------------------- |
| Guarantee bug-free code              | OLYMPUS verifies intents, not implementation correctness |
| Ensure business success              | User value is measured, not market fit                   |
| Replace testing                      | Behavioral proofs complement, not replace, tests         |
| Verify all external systems          | Only anchored externals are checked                      |
| Prevent all security vulnerabilities | Security intents must be explicitly stated               |
| Optimize performance                 | Performance is not an intent axis                        |
| Guarantee user satisfaction          | UVD measures observable outcomes, not happiness          |

---

## Assumptions

### A-1: Intent Authors Act in Good Faith (Eventually)

OLYMPUS assumes that after a hostile intent is blocked, the author will reformulate rather than infinitely retry. The system does not prevent repeated submission but does not learn from individual users.

### A-2: Authorizers Are Accountable

Human overrides require an authorizer. OLYMPUS assumes the authorizer exists and accepts liability. No identity verification is performed.

### A-3: External Reality Can Be Sampled

ERA assumes that external systems can be queried and will return representative results. Adversarial external systems are not modeled.

### A-4: The Filesystem Is Trusted

Audit trails and certificates are stored on the local filesystem. OLYMPUS assumes the filesystem is not compromised. No encryption at rest.

### A-5: The Constitution Is Loaded Correctly

The constitution file is read at runtime. OLYMPUS assumes the file has not been tampered with between builds. The constitution hash in certificates enables post-hoc detection but not prevention.

### A-6: Pipeline Execution Order Is Enforced

OLYMPUS assumes steps execute in order and cannot be reordered by external actors. The architecture guard detects but does not prevent runtime manipulation.

### A-7: Determinism Holds Under Same Inputs

OLYMPUS guarantees deterministic outputs for identical inputs. If external state changes between runs (ERA anchors return different values), outputs may differ.

---

## Threat → Mitigation Mapping

| Threat ID | Threat Description         | Primary Mitigation           | Secondary Mitigation    | Enforcement Layer     |
| --------- | -------------------------- | ---------------------------- | ----------------------- | --------------------- |
| T-001     | Vague intent ships         | W-ISS-D score threshold      | HITH hostile patterns   | ICG (Step 10)         |
| T-002     | Ambiguous intent passes    | IRCL ambiguity detection     | ITGCL global check      | IRCL (Step 12)        |
| T-003     | Contradictory intents ship | IRCL contradiction detection | ITGCL topology          | IRCL (Step 12)        |
| T-004     | Unverified external claim  | ERA anchor execution         | RGL trust scoring       | ERA (Step 11)         |
| T-005     | Low-trust external         | Trust threshold (30%)        | FORBIDDEN fate          | ERA (Step 11)         |
| T-006     | Stability degradation      | SSI envelope                 | Override penalty        | SCE (Step 16)         |
| T-007     | Hostile intent leak        | HITH harness                 | 0% leak tolerance       | HITH (Step 17)        |
| T-008     | Minimal intent value       | IAL adequacy score           | Hostile minimal-intent  | IAL (Step 18)         |
| T-009     | Low user value             | UVD threshold                | Hostile low-value       | UVDL (Step 19)        |
| T-010     | Override abuse             | Non-overridable list         | Governance harness      | Override (Step 21)    |
| T-011     | Constitution violation     | Constitutional tests         | No override possible    | CTEL (Step 21)        |
| T-012     | Governance exploit         | Adversarial harness          | 0% leak tolerance       | CGM (Step 22)         |
| T-013     | Fate manipulation          | Evolution rules              | Article 7 permanence    | FATE (Step 20.2)      |
| T-014     | Audit tampering            | Append-only trail            | Certificate hash        | CTEL (Step 21)        |
| T-015     | Policy capture             | Non-amendable articles       | Governance harness      | CGM (Step 22)         |
| T-016     | SSI erosion                | Max erosion limit (50%)      | Max penalty limit (40%) | Override (Step 21)    |
| T-017     | Privilege escalation       | Authorizer validation        | Governance harness      | CGM (Step 22)         |
| T-018     | Architecture breach        | Import scanning              | Research boundary       | Arch Guard (Step 2.1) |
| T-019     | Monotonicity regression    | Baseline comparison          | Explicit acknowledgment | IGDE (Step 14)        |
| T-020     | Critical intent exclusion  | Critical mandatory flag      | Article 8               | IGE (Step 20)         |

---

## Attack Surface Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    OLYMPUS ATTACK SURFACE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT LAYER (Steps 1-6)                                       │
│  ├── Description text                    → Semantic validation │
│  ├── Tier selection                      → Config validation   │
│  └── External files                      → File collection     │
│                                                                 │
│  INTENT LAYER (Steps 7-15)                                     │
│  ├── Intent extraction                   → ICG scoring         │
│  ├── External claims                     → ERA anchoring       │
│  ├── Contradictions                      → IRCL detection      │
│  └── Cross-intent conflicts              → ITGCL topology      │
│                                                                 │
│  VALIDATION LAYER (Steps 16-20)                                │
│  ├── Stability                           → SCE envelope        │
│  ├── Hostile patterns                    → HITH harness        │
│  ├── Adequacy                            → IAL scoring         │
│  ├── User value                          → UVDL scoring        │
│  └── Governance                          → IGE + FATE          │
│                                                                 │
│  CONSTITUTIONAL LAYER (Steps 21-22)                            │
│  ├── Article compliance                  → CTEL tests          │
│  ├── Override integrity                  → Override system     │
│  ├── Governance resistance               → Adversarial harness │
│  └── Decision integrity                  → Certificate         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Residual Risk

| Risk                              | Likelihood | Impact   | Mitigation Status                     |
| --------------------------------- | ---------- | -------- | ------------------------------------- |
| Novel hostile pattern not in HITH | Medium     | High     | ACCEPTED - HITH covers known patterns |
| Compromised filesystem            | Low        | Critical | ACCEPTED - Out of scope               |
| Collusion (author + authorizer)   | Low        | High     | ACCEPTED - Audit trail exists         |
| Side-channel timing attacks       | Very Low   | Low      | ACCEPTED - Not a security system      |
| External system adversarial       | Low        | Medium   | PARTIAL - Trust scoring mitigates     |

---

_STEWARD MODE: This document describes existing enforcement. No new mitigations defined._
