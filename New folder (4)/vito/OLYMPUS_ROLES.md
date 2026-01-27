# OLYMPUS 2.1 - ROLES & AUTHORITY

**Version:** 2.1-canonical
**Status:** STEWARD MODE
**Purpose:** Document formal role separation and authority rules

---

## Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    OLYMPUS AUTHORITY MODEL                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CONSTITUTION (Highest Authority)                              │
│  ├── Cannot be overridden by any role                          │
│  ├── Defines non-negotiable guarantees                         │
│  └── Only amendable articles can be modified (formal process)  │
│                                                                 │
│  OLYMPUS SYSTEM                                                │
│  ├── Executes constitution                                     │
│  ├── Cannot be configured to violate articles                  │
│  └── Deterministic - same inputs = same outputs                │
│                                                                 │
│  AUTHORIZER (Human)                                            │
│  ├── Can approve overrides for OVERRIDABLE targets only        │
│  ├── Cannot override CONSTITUTION_VIOLATION                    │
│  ├── Accepts liability via signed justification                │
│  └── Subject to SSI penalties and limits                       │
│                                                                 │
│  DEVELOPER (Human)                                             │
│  ├── Submits intents and code                                  │
│  ├── Cannot bypass any validation layer                        │
│  ├── Can request override (authorizer must approve)            │
│  └── Receives feedback via truth artifacts                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Role: CONSTITUTION

**Type:** Document (not a human role)
**Authority Level:** ABSOLUTE

### What the Constitution Controls

| Domain | Authority | Override Possible |
|--------|-----------|-------------------|
| Non-amendable articles | ABSOLUTE | NO |
| Amendable articles | HIGH | Via formal process only |
| Override policy | ABSOLUTE | NO |
| Governance limits | ABSOLUTE | NO |

### Non-Amendable Articles (Cannot Be Changed)

| Article | Guarantee |
|---------|-----------|
| ARTICLE_1_DETERMINISM | Same input = same output |
| ARTICLE_2_MONOTONICITY | Score cannot regress without cause |
| ARTICLE_3_HOSTILE_RESISTANCE | 0% hostile leak tolerance |
| ARTICLE_4_EVOLUTION_ENFORCEMENT | Fate transitions follow rules |
| ARTICLE_6_HARD_GATE_BLOCKING | Failed gates block shipping |
| ARTICLE_7_FORBIDDEN_PERMANENCE | FORBIDDEN cannot be rehabilitated |
| ARTICLE_8_CRITICAL_MANDATORY | Critical intents cannot be excluded |
| ARTICLE_9_NO_BYPASS | Safety checks cannot be disabled |
| ARTICLE_11_GOVERNANCE_INTEGRITY | Override system resists abuse |

### Amendable Articles (Formal Process Required)

| Article | Current Setting | Amendment Requires |
|---------|-----------------|-------------------|
| ARTICLE_5_AUDIT_TRAIL | SSI penalty 5% | Version bump + regression pass |
| ARTICLE_10_TRUST_THRESHOLD | FORBIDDEN below 30% | Version bump + regression pass |
| ARTICLE_12_EXTERNAL_VERIFIABILITY | Certificate required | Version bump + regression pass |

---

## Role: OLYMPUS SYSTEM

**Type:** Automated System
**Authority Level:** EXECUTOR (of Constitution)

### System Capabilities

| Capability | Description | Constraint |
|------------|-------------|------------|
| Execute pipeline | Run all 22 steps | Cannot skip or reorder |
| Score intents | Calculate W-ISS-D, UVD, IAS | Deterministic only |
| Assign fates | ACCEPTED, WITH_DEBT, QUARANTINED, FORBIDDEN | Evolution rules enforced |
| Block builds | Refuse to ship | Cannot be overridden for violations |
| Generate certificates | Cryptographic proof | Hash chain immutable |
| Run hostile tests | HITH, governance harness | Cannot be disabled |

### System Prohibitions

The OLYMPUS system CANNOT:

| Prohibited Action | Enforcement |
|-------------------|-------------|
| Skip pipeline steps | Architecture guard |
| Use ML/AI for scoring | Determinism article |
| Apply heuristics | Determinism article |
| Ship with hostile leak | Hostile resistance article |
| Rehabilitate FORBIDDEN | Permanence article |
| Exclude critical intents | Critical mandatory article |
| Accept bypass flags | No bypass article |

---

## Role: AUTHORIZER

**Type:** Human Role
**Authority Level:** LIMITED (within override policy)

### Authorizer Capabilities

| Capability | Constraint |
|------------|------------|
| Approve overrides | Only for OVERRIDABLE targets |
| Sign justification | Min 50 characters |
| Accept SSI penalty | Automatically applied |
| Acknowledge regression | Explicit confirmation |

### What Authorizers CAN Override

| Target | SSI Penalty | Limit |
|--------|-------------|-------|
| HARD_GATE_FAILURE | 25% | 2 per build |
| MONOTONICITY_REGRESSION | 15% | With acknowledgment |
| STABILITY_WARNING | 10% | Cooldown 1 hour |
| ADEQUACY_WARNING | 8% | Cooldown 1 hour |
| UVD_WARNING | 8% | Cooldown 1 hour |

### What Authorizers CANNOT Override

| Target | Reason |
|--------|--------|
| CONSTITUTION_VIOLATION | Non-negotiable |
| HOSTILE_INTENT_LEAK | Security guarantee |
| EVOLUTION_VIOLATION | Fate rules |
| FORBIDDEN_INTENT | Permanence article |
| ARCHITECTURE_BREACH | System integrity |
| GOVERNANCE_EXPLOIT | Self-protection |

### Authorizer Limits

| Limit | Value | Enforcement |
|-------|-------|-------------|
| Max consecutive overrides | 3 | Governance harness |
| Max overrides per build | 2 | Override system |
| Max cumulative SSI penalty | 40% | Override system |
| Max SSI erosion | 50% | Governance harness |
| Override cooldown | 1 hour | Override system |
| Min justification length | 50 chars | Override system |

### Authorizer Liability

When an authorizer approves an override:

1. **Their identity is recorded** in the audit trail
2. **Their justification is permanently stored**
3. **The SSI penalty is applied** to the build
4. **The override does NOT set precedent** for future builds
5. **The certificate includes their decision**

---

## Role: DEVELOPER

**Type:** Human Role
**Authority Level:** SUBMITTER (no override authority)

### Developer Capabilities

| Capability | Description |
|------------|-------------|
| Submit intents | Via build request |
| Submit code | Generated or written |
| Receive feedback | Truth artifacts |
| Request override | Must be approved by authorizer |
| View audit trail | Read-only access |

### Developer Prohibitions

Developers CANNOT:

| Prohibited Action | Enforcement |
|-------------------|-------------|
| Bypass validation | No bypass article |
| Self-approve overrides | Requires separate authorizer |
| Modify audit trail | Append-only |
| Change fate directly | Must go through IGE |
| Skip hostile tests | Mandatory HITH |
| Force ship | No FORCE_SHIP flag |

### Developer Feedback

Developers receive:

| Artifact | Content |
|----------|---------|
| `WHY_THIS_SHIPPED.md` | Success explanation, metrics, warnings |
| `WHY_THIS_BLOCKED.md` | Failure explanation, fix guidance |
| `DECISION_CERTIFICATE.md` | Cryptographic proof of decision |
| `_build-summary.json` | Machine-readable results |
| `_ctel-result.json` | Constitutional test results |

---

## Authority Matrix

| Action | Constitution | System | Authorizer | Developer |
|--------|--------------|--------|------------|-----------|
| Define guarantees | YES | NO | NO | NO |
| Execute pipeline | NO | YES | NO | NO |
| Score intents | NO | YES | NO | NO |
| Block build | NO | YES | NO | NO |
| Override gate failure | NO | NO | YES* | NO |
| Override violation | NO | NO | NO | NO |
| Submit intents | NO | NO | NO | YES |
| Request override | NO | NO | NO | YES |
| Approve override | NO | NO | YES | NO |
| View audit | NO | YES | YES | YES |
| Modify audit | NO | NO | NO | NO |

*Within limits and for overridable targets only

---

## Separation of Concerns

### Why Roles Are Separated

| Separation | Purpose |
|------------|---------|
| Constitution vs System | System cannot weaken guarantees |
| System vs Authorizer | Automated enforcement, human judgment |
| Authorizer vs Developer | Prevent self-approval |
| Override vs Violation | Some things are negotiable, some are not |

### Accountability Chain

```
Intent Author (Developer)
    ↓ submits
OLYMPUS System
    ↓ evaluates
Build Decision
    ↓ if blocked
Override Request (Developer)
    ↓ reviews
Authorizer
    ↓ approves with penalty
Build Ships (with SSI reduction)
    ↓ recorded in
Audit Trail + Certificate
```

---

## Role Verification

The governance harness tests role boundaries:

| Scenario | Tests |
|----------|-------|
| OA-001 | Developer cannot override CONSTITUTION_VIOLATION |
| OA-003 | Authorizer cannot exceed consecutive override limit |
| PE-001 | Developer cannot grant self override authority |
| PE-003 | Override requires authorizer (cannot be null) |

---

## Emergency Procedures

### What If Build Is Wrongly Blocked?

1. **Authorizer reviews** the block reason
2. **If overridable**, authorizer approves with penalty
3. **If violation**, the underlying issue MUST be fixed
4. **No emergency bypass** exists for violations

### What If Authorizer Is Unavailable?

1. **Build remains blocked** until authorizer available
2. **No fallback authority** - this is intentional
3. **Plan builds in advance** to avoid deadline conflicts

### What If System Is Compromised?

1. **Constitution hash** in certificates enables detection
2. **Audit trail** shows anomalies
3. **Rebuild from canonical source** required
4. **No runtime override** can fix compromised system

---

## Liability Summary

| Role | Liable For |
|------|------------|
| Constitution | Defining correct guarantees |
| System | Executing constitution correctly |
| Authorizer | Override decisions and justifications |
| Developer | Intent quality and code correctness |

---

*STEWARD MODE: This document describes existing role enforcement. No new authorities defined.*
