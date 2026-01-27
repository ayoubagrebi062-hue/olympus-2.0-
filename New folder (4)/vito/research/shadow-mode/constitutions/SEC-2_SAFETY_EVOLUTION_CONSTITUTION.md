# SEC-2: Safety Evolution Constitution v2

**Constitution ID:** SEC-2
**Version:** 2.0.0
**Status:** RATIFIED
**Date:** 2026-01-19
**Scope:** Safety Evolution
**Predecessor:** SEC-1
**Parent:** SMC-1 (Shadow Mode Constitution)

---

## Amendment Record

| Field | Value |
|-------|-------|
| From | SEC-1 |
| To | SEC-2 |
| Amended At | 2026-01-19T11:30:00.000Z |

### Added Bindings
- `META_INVARIANT_PRESERVATION` (BIND-005)
- `METRIC_AUDITABILITY_REQUIRED` (BIND-006)
- `ORACLE_REDUNDANCY_REQUIRED` (BIND-007)

### Preserved Bindings
- `INVARIANT_PRESERVATION` (BIND-001)
- `RECERTIFICATION_ON_CHANGE` (BIND-002)
- `SHADOW_BEFORE_ENFORCE` (BIND-003)
- `TEMPORAL_INVARIANCE_REQUIRED` (BIND-004)

---

## Preamble

This constitution establishes binding principles governing the evolution of safety layers while preserving core invariants and meta-invariants. Authority is derived from SEC-1 with additions for meta-safety and oracle redundancy. This constitution is **binding** and **immutable**.

---

## Bindings (Inherited from SEC-1)

### BIND-001: Invariant Preservation
> All global safety invariants must remain satisfied through any evolutionary change.

### BIND-002: Recertification on Change
> Any modification to safety layer rules, patterns, or topology requires full recertification campaign.

### BIND-003: Shadow Before Enforce
> All new safety components must progress through shadow mode before enforcement.

### BIND-004: Temporal Invariance Required
> Safety properties must remain stable under temporal drift and evolutionary pressure.

---

## New Bindings (Added in SEC-2)

### BIND-005: Meta-Invariant Preservation

> All meta-safety invariants must remain satisfied to prevent Goodhart attacks.

**Meta-Invariants:**

| ID | Name | Description |
|----|------|-------------|
| MSI-001 | NO_PROXY_SATISFACTION | Invariants must be satisfied directly, not via correlated metrics |
| MSI-002 | EXPLANATION_NON_RECURSIVE | Explanations cannot reference derived safety outputs |
| MSI-003 | METRIC_INDEPENDENCE | No single metric may serve as both trigger and justification |
| MSI-004 | INVARIANT_OBSERVABILITY | Every invariant must have an independent audit signal |

**Verification:** MAC (Metric Adversarial Campaign) with attacks:
- Dominance inflation
- Explanation padding
- Capability aliasing
- Metric correlation

**Enforcement:** BLOCKING
**Exceptions:** NONE

---

### BIND-006: Metric Auditability Required

> All metrics used in safety decisions must have complete audit trails with independent verification.

**Requirements:**

| Requirement | Description |
|-------------|-------------|
| AUDIT_TRAIL | Every metric computation logged with inputs and outputs |
| CAUSAL_ATTRIBUTION | Every metric traces to source data and computation steps |
| INDEPENDENT_VERIFICATION | Metrics verifiable by at least 2 independent oracles |
| NO_SELF_REFERENCE | Metrics cannot depend on their own previous values circularly |

**Enforcement:** BLOCKING
**Exceptions:** NONE

---

### BIND-007: Oracle Redundancy Required

> Safety invariants must be verified by redundant independent oracles with cross-check agreement.

**Oracle System:**

| Oracle | Type | Verifies |
|--------|------|----------|
| SCO-1 (Symbolic Capability) | SYMBOLIC | Pattern matching, formal reasoning |
| SAO-1 (Statistical Anomaly) | STATISTICAL | Distribution monitoring, anomaly detection |
| HRO-1 (Historical Regression) | TEMPORAL | Baseline comparison, regression detection |

**Cross-Check:**
- Required Agreement: **2 of 3**
- Veto Condition: S4 detected by any oracle
- Tie Breaker: REJECT

**On Disagreement:**
- Action: ESCALATE_TO_SHADOW_REVIEW
- Default Decision: REJECT
- Time Limit: 24 hours

**Enforcement:** BLOCKING
**Exceptions:** NONE

---

## Principles

| ID | Principle | Source |
|----|-----------|--------|
| PRIN-001 | Determinism | SEC-1 |
| PRIN-002 | Transparency | SEC-1 |
| PRIN-003 | Immutability | SEC-1 |
| PRIN-004 | Fail-Safe | SEC-1 |
| PRIN-005 | Goodhart Resistance | SEC-2 (NEW) |
| PRIN-006 | Redundant Verification | SEC-2 (NEW) |

### PRIN-005: Goodhart Resistance (NEW)
> Metrics must not become targets that can be gamed separately from genuine safety.

Constraints: proxy_detection, causal_verification, adversarial_testing

### PRIN-006: Redundant Verification (NEW)
> No single point of verification failure may compromise safety.

Constraints: multi_oracle, independent_codebases, diverse_methods

---

## Validation Evidence

| Campaign | Status | Validates |
|----------|--------|-----------|
| SSC-3 | PASSED | Shadow Before Enforce |
| TIC-1 | PASSED | Order Invariance |
| TDS-1 | PASSED | Temporal Invariance |
| MAC-1 | PASSED | Meta-Invariant Preservation |

---

## Artifacts

| Artifact | Path |
|----------|------|
| Global Invariants | `invariants/GLOBAL_SAFETY_INVARIANTS.json` |
| Meta-Invariants | `invariants/META_SAFETY_INVARIANTS.json` |
| Regression Budget | `governance/REGRESSION_BUDGET.json` |
| Topology Freeze | `topology/PIPELINE_TOPOLOGY_FREEZE.json` |
| Oracle System | `oracles/REDUNDANT_ORACLE_SYSTEM.json` |
| Predecessor | `constitutions/SEC-1_SAFETY_EVOLUTION_CONSTITUTION.json` |

---

## Constitution Hash

```
sha256:18116da1c85a50cc80e4d618c974a30139cc64373b639ec5899874dda3e0d3b2
```

---

## Amendments

**Allowed:** NO

SEC-2 is immutable once ratified. A successor constitution is required for any changes.

---

## Ratification

**Ratified By:** Safety Governance Framework
**Ratified At:** 2026-01-19T11:30:00.000Z
**Valid From:** 2026-01-19
**Valid Until:** PERMANENT
**Supersedes:** SEC-1

---

*This constitution is binding on all safety layer evolution activities.*
