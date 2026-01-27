# OLYMPUS 2.1 - COMPLIANCE SPECIFICATION

**Standard Version:** 2.1-canonical
**Specification Status:** NORMATIVE
**Audience:** Auditors, Reviewers, Implementers

---

## 1. Introduction

### 1.1 Purpose

This specification defines the requirements for OLYMPUS-compliant intent verification systems. A system claiming OLYMPUS compliance MUST satisfy all MANDATORY requirements and SHOULD satisfy all RECOMMENDED requirements.

### 1.2 Terminology

| Term | Definition |
|------|------------|
| MUST | Absolute requirement for compliance |
| MUST NOT | Absolute prohibition for compliance |
| SHOULD | Recommended but not required |
| MAY | Optional behavior |
| Intent | A statement of desired software behavior |
| Fate | The disposition assigned to an intent (ACCEPTED, ACCEPTED_WITH_DEBT, QUARANTINED, FORBIDDEN) |
| Gate | A validation checkpoint that may block shipping |
| Ship | Approval for deployment/release |
| Block | Rejection preventing deployment/release |

### 1.3 Conformance Levels

| Level | Requirements |
|-------|--------------|
| OLYMPUS-CORE | All MUST requirements |
| OLYMPUS-FULL | All MUST + SHOULD requirements |
| OLYMPUS-CERTIFIED | OLYMPUS-FULL + external audit |

---

## 2. Architectural Requirements

### 2.1 Pipeline Structure

**[MUST]** The system MUST implement a sequential pipeline with the following properties:

```
REQ-ARCH-001: Pipeline steps MUST execute in defined order
REQ-ARCH-002: Pipeline steps MUST NOT be skipped
REQ-ARCH-003: Pipeline steps MUST NOT be reordered
REQ-ARCH-004: Pipeline MUST include all HARD gates defined in Section 3
```

**[MUST]** The system MUST implement exactly 22 pipeline steps as defined:

| Step | Name | Gate Type | Requirement ID |
|------|------|-----------|----------------|
| 1 | Request Parsing | - | REQ-PIPE-001 |
| 2 | Filesystem Setup | - | REQ-PIPE-002 |
| 2.1 | Architecture Guard | HARD | REQ-PIPE-002A |
| 3 | Event Subscription | - | REQ-PIPE-003 |
| 4 | Build Orchestration | - | REQ-PIPE-004 |
| 5 | Summary Generation | - | REQ-PIPE-005 |
| 6 | File Collection | - | REQ-PIPE-006 |
| 7 | Semantic Validation | HARD | REQ-PIPE-007 |
| 8 | Behavioral Validation | HARD | REQ-PIPE-008 |
| 9 | Causal Validation | HARD | REQ-PIPE-009 |
| 10 | ICG Analysis | HARD | REQ-PIPE-010 |
| 11 | ERA + RGL | HARD | REQ-PIPE-011 |
| 12 | IRCL | HARD | REQ-PIPE-012 |
| 12.5 | IRE | SOFT | REQ-PIPE-012A |
| 12.6 | IMPL | SOFT | REQ-PIPE-012B |
| 12.7 | ITGCL | HARD | REQ-PIPE-012C |
| 13 | Previous W-ISS-D | - | REQ-PIPE-013 |
| 14 | IGDE | HARD | REQ-PIPE-014 |
| 15 | Intent Graph Persistence | - | REQ-PIPE-015 |
| 16 | SCE | HARD | REQ-PIPE-016 |
| 17 | HITH | HARD | REQ-PIPE-017 |
| 18 | IAL | HARD | REQ-PIPE-018 |
| 18.1 | Hostile Minimal-Intent | HARD | REQ-PIPE-018A |
| 19 | UVDL | HARD | REQ-PIPE-019 |
| 19.1 | Hostile Low-Value | HARD | REQ-PIPE-019A |
| 20 | IGE | HARD | REQ-PIPE-020 |
| 20.1 | Governance Tests | HARD | REQ-PIPE-020A |
| 20.2 | FATE | HARD | REQ-PIPE-020B |
| 21 | CTEL | HARD | REQ-PIPE-021 |
| 22 | CGM | HARD | REQ-PIPE-022 |

### 2.2 Gate Classification

**[MUST]** Gates MUST be classified as HARD or SOFT:

```
REQ-GATE-001: HARD gate failure MUST block shipping
REQ-GATE-002: HARD gate failure MUST NOT be bypassed via configuration
REQ-GATE-003: SOFT gate failure MUST be logged
REQ-GATE-004: SOFT gate failure MAY proceed with constraints
```

### 2.3 Version Identity

**[MUST]** All build outputs MUST include version identity:

```
REQ-VER-001: Output MUST include olympusVersion string
REQ-VER-002: Output MUST include governanceAuthority (CANONICAL or EXPERIMENTAL)
REQ-VER-003: Output MUST include pipelineSteps count
REQ-VER-004: Output MUST include buildTimestamp in ISO 8601 format
```

---

## 3. Constitutional Requirements

### 3.1 Article Compliance

**[MUST]** The system MUST enforce all 12 constitutional articles:

#### Article 1: Determinism

```
REQ-CONST-001: Given identical inputs, system MUST produce identical outputs
REQ-CONST-002: System MUST NOT use randomness in scoring decisions
REQ-CONST-003: System MUST NOT use ML inference in scoring decisions
REQ-CONST-004: System MUST NOT use heuristic sampling in scoring decisions
```

**Verification Method:** Submit identical build requests; compare outputs byte-for-byte.

#### Article 2: Monotonicity

```
REQ-CONST-005: W-ISS-D score MUST NOT regress without explicit cause
REQ-CONST-006: Regression MUST be permitted only for: new intent, external change, or acknowledgment
REQ-CONST-007: Unexplained regression MUST block shipping
```

**Verification Method:** Compare consecutive build scores; verify regression causes.

#### Article 3: Hostile Resistance

```
REQ-CONST-008: System MUST execute hostile intent testing
REQ-CONST-009: Hostile leak tolerance MUST be exactly 0%
REQ-CONST-010: Any hostile leak MUST block shipping
REQ-CONST-011: System MUST test minimum 10 hostile cases
```

**Verification Method:** Submit known hostile intents; verify all blocked.

#### Article 4: Evolution Enforcement

```
REQ-CONST-012: Fate transitions MUST follow allowed paths
REQ-CONST-013: ACCEPTED MAY transition to: ACCEPTED, ACCEPTED_WITH_DEBT, QUARANTINED
REQ-CONST-014: ACCEPTED_WITH_DEBT MAY transition to: ACCEPTED, ACCEPTED_WITH_DEBT, QUARANTINED
REQ-CONST-015: QUARANTINED MAY transition to: ACCEPTED, ACCEPTED_WITH_DEBT, QUARANTINED, FORBIDDEN
REQ-CONST-016: FORBIDDEN MUST only transition to: FORBIDDEN
REQ-CONST-017: Evolution violation MUST block shipping
```

**Verification Method:** Attempt invalid fate transitions; verify blocked.

#### Article 5: Audit Trail

```
REQ-CONST-018: All decisions MUST be logged with reason
REQ-CONST-019: All decisions MUST be persisted to filesystem
REQ-CONST-020: Audit files MUST be append-only
REQ-CONST-021: Minimum audit files: _build-summary.json, _ctel-result.json
```

**Verification Method:** Inspect build output directory; verify audit files exist.

#### Article 6: Hard Gate Blocking

```
REQ-CONST-022: HARD gate failure MUST block shipping
REQ-CONST-023: No override mechanism MAY exist for HARD gate with CONSTITUTION_VIOLATION
REQ-CONST-024: All gates listed as HARD in Section 2.1 MUST block on failure
```

**Verification Method:** Cause each HARD gate to fail; verify build blocked.

#### Article 7: Forbidden Permanence

```
REQ-CONST-025: FORBIDDEN fate MUST NOT be changed to any other fate
REQ-CONST-026: Rehabilitation attempt MUST block shipping
REQ-CONST-027: FORBIDDEN intents MUST remain FORBIDDEN across all builds
```

**Verification Method:** Attempt to change FORBIDDEN intent; verify blocked.

#### Article 8: Critical Mandatory

```
REQ-CONST-028: Critical intents MUST NOT be excluded by optimization
REQ-CONST-029: Critical intent exclusion attempt MUST block shipping
REQ-CONST-030: criticalMandatory flag MUST be true for critical intents
```

**Verification Method:** Mark intent critical; verify cannot be excluded.

#### Article 9: No Bypass

```
REQ-CONST-031: System MUST NOT accept configuration flags that disable safety
REQ-CONST-032: Prohibited patterns: SKIP_*, DISABLE_*, BYPASS_*, FORCE_SHIP, NO_VERIFY
REQ-CONST-033: Detection of bypass attempt MUST result in ARCHITECTURE_BREACH
```

**Verification Method:** Attempt bypass configuration; verify rejected.

#### Article 10: Trust Threshold

```
REQ-CONST-034: External anchor trust below 30% MUST result in FORBIDDEN fate
REQ-CONST-035: External anchor trust below 50% SHOULD result in warning
```

**Verification Method:** Configure low-trust anchor; verify FORBIDDEN assignment.

#### Article 11: Governance Integrity

```
REQ-CONST-036: Override system MUST resist abuse
REQ-CONST-037: Maximum consecutive overrides MUST be 3
REQ-CONST-038: Maximum SSI erosion MUST be 50%
REQ-CONST-039: Override cooldown MUST be 1 hour minimum
REQ-CONST-040: Justification length MUST be 50 characters minimum
```

**Verification Method:** Run adversarial governance harness; verify all blocked.

#### Article 12: External Verifiability

```
REQ-CONST-041: Decision certificate MUST be generated
REQ-CONST-042: Certificate MUST include constitution hash
REQ-CONST-043: Certificate MUST include cryptographic signature
```

**Verification Method:** Verify certificate present and signature valid.

### 3.2 Non-Amendable Articles

**[MUST]** The following articles MUST NOT be modified:

```
REQ-AMEND-001: Articles 1, 2, 3, 4, 6, 7, 8, 9, 11 are non-amendable
REQ-AMEND-002: Non-amendable article modification MUST be rejected
```

### 3.3 Amendment Process

**[MUST]** Amendable articles (5, 10, 12) MAY only be modified via:

```
REQ-AMEND-003: Formal proposal with justification
REQ-AMEND-004: Proof that guarantees are not weakened
REQ-AMEND-005: Constitution version increment
REQ-AMEND-006: Full regression test pass
REQ-AMEND-007: Hostile governance harness pass
```

---

## 4. Scoring Requirements

### 4.1 W-ISS-D Scoring

**[MUST]** Intent satisfaction MUST be scored using W-ISS-D:

```
REQ-SCORE-001: W-ISS-D MUST evaluate Trigger, State, and Outcome axes
REQ-SCORE-002: W-ISS-D threshold for shipping MUST be 95%
REQ-SCORE-003: W-ISS-D calculation MUST be deterministic
REQ-SCORE-004: W-ISS-D MUST NOT use ML/AI inference
```

### 4.2 Stability Scoring (SSI)

**[MUST]** System stability MUST be scored:

```
REQ-SCORE-005: SSI MUST track stability over time
REQ-SCORE-006: SSI threshold for shipping MUST be 70%
REQ-SCORE-007: Override penalties MUST reduce SSI
REQ-SCORE-008: SSI calculation MUST be deterministic
```

### 4.3 User Value Density (UVD)

**[MUST]** User value MUST be scored:

```
REQ-SCORE-009: UVD MUST measure observable user outcomes
REQ-SCORE-010: UVD threshold for shipping MUST be 60%
REQ-SCORE-011: UVD calculation MUST be deterministic
```

### 4.4 Intent Adequacy Score (IAS)

**[MUST]** Intent adequacy MUST be scored:

```
REQ-SCORE-012: IAS MUST measure intent specification quality
REQ-SCORE-013: IAS threshold for shipping MUST be 70%
REQ-SCORE-014: IAS calculation MUST be deterministic
```

---

## 5. Override Requirements

### 5.1 Overridable Targets

**[MUST]** Only the following targets MAY be overridden:

```
REQ-OVER-001: HARD_GATE_FAILURE - 25% SSI penalty
REQ-OVER-002: MONOTONICITY_REGRESSION - 15% SSI penalty
REQ-OVER-003: STABILITY_WARNING - 10% SSI penalty
REQ-OVER-004: ADEQUACY_WARNING - 8% SSI penalty
REQ-OVER-005: UVD_WARNING - 8% SSI penalty
```

### 5.2 Non-Overridable Targets

**[MUST]** The following targets MUST NOT be overridable:

```
REQ-OVER-006: CONSTITUTION_VIOLATION - MUST NOT override
REQ-OVER-007: HOSTILE_INTENT_LEAK - MUST NOT override
REQ-OVER-008: EVOLUTION_VIOLATION - MUST NOT override
REQ-OVER-009: FORBIDDEN_INTENT - MUST NOT override
REQ-OVER-010: ARCHITECTURE_BREACH - MUST NOT override
REQ-OVER-011: GOVERNANCE_EXPLOIT - MUST NOT override
```

### 5.3 Override Limits

**[MUST]** Overrides MUST be limited:

```
REQ-OVER-012: Maximum 2 overrides per build
REQ-OVER-013: Maximum 40% cumulative SSI penalty
REQ-OVER-014: 1 hour cooldown between overrides
REQ-OVER-015: Minimum 50 character justification
REQ-OVER-016: Authorizer identity MUST be recorded
```

---

## 6. Hostile Testing Requirements

### 6.1 HITH (Hostile Intent Test Harness)

**[MUST]** Hostile intent testing MUST be performed:

```
REQ-HITH-001: HITH MUST be mandatory for all builds
REQ-HITH-002: HITH MUST NOT be disableable
REQ-HITH-003: HITH MUST test minimum 10 hostile patterns
REQ-HITH-004: HITH leak rate MUST be exactly 0%
REQ-HITH-005: Any HITH leak MUST block shipping
```

### 6.2 Hostile Pattern Categories

**[MUST]** HITH MUST detect the following hostile patterns:

| Pattern | ID | Description |
|---------|---|----|
| SEMANTIC_VOID | REQ-HITH-006 | No concrete meaning |
| UNBOUNDED_CLAIM | REQ-HITH-007 | "All", "every" without enumeration |
| EXTERNAL_CLAIM | REQ-HITH-008 | Unverified external behavior |
| SCOPE_CREEP | REQ-HITH-009 | Parenthetical expansion |
| EXISTENCE_NOT_PROOF | REQ-HITH-010 | UI existence ≠ functionality |
| INFINITE_CLAIM | REQ-HITH-011 | Infinite verification required |
| TEMPORAL_CLAIM | REQ-HITH-012 | Time behavior without mechanism |
| COMPARATIVE_CLAIM | REQ-HITH-013 | Relative without baseline |

### 6.3 Adversarial Governance Harness

**[MUST]** Governance testing MUST be performed:

```
REQ-AGH-001: AGH MUST test override abuse scenarios
REQ-AGH-002: AGH MUST test policy capture scenarios
REQ-AGH-003: AGH MUST test SSI erosion scenarios
REQ-AGH-004: AGH MUST test intent gaming scenarios
REQ-AGH-005: AGH MUST test constitutional bypass scenarios
REQ-AGH-006: AGH MUST test privilege escalation scenarios
REQ-AGH-007: AGH MUST test audit tampering scenarios
REQ-AGH-008: AGH MUST test fate manipulation scenarios
REQ-AGH-009: AGH leak rate MUST be exactly 0%
```

---

## 7. Output Requirements

### 7.1 Truth Artifacts

**[MUST]** Human-readable truth artifacts MUST be generated:

```
REQ-OUT-001: Shipped builds MUST produce WHY_THIS_SHIPPED.md
REQ-OUT-002: Blocked builds MUST produce WHY_THIS_BLOCKED.md
REQ-OUT-003: Truth artifacts MUST include all gate results
REQ-OUT-004: Truth artifacts MUST include all metrics
REQ-OUT-005: Truth artifacts MUST include block/ship reason
```

### 7.2 Decision Certificates

**[MUST]** Cryptographic certificates MUST be generated:

```
REQ-OUT-006: Certificate MUST include buildId
REQ-OUT-007: Certificate MUST include verdict (SHIP_APPROVED or SHIP_BLOCKED)
REQ-OUT-008: Certificate MUST include constitutionHash
REQ-OUT-009: Certificate MUST include certificateHash
REQ-OUT-010: Certificate MUST include signature
REQ-OUT-011: Certificate MUST be verifiable
```

### 7.3 Audit Files

**[MUST]** Audit files MUST be generated:

```
REQ-OUT-012: _build-summary.json MUST be generated
REQ-OUT-013: _ctel-result.json MUST be generated
REQ-OUT-014: _adversarial-governance-result.json MUST be generated
REQ-OUT-015: _decision-certificate-{buildId}.json MUST be generated
```

---

## 8. Compliance Verification

### 8.1 Self-Assessment Checklist

For OLYMPUS-CORE compliance, verify:

- [ ] All 22 pipeline steps implemented
- [ ] All HARD gates block on failure
- [ ] All 12 constitutional articles enforced
- [ ] W-ISS-D scoring implemented (threshold 95%)
- [ ] HITH implemented (0% leak tolerance)
- [ ] AGH implemented (0% leak tolerance)
- [ ] Override limits enforced
- [ ] Non-overridable targets rejected
- [ ] Truth artifacts generated
- [ ] Decision certificates generated

### 8.2 Test Corpus

Compliance MAY be verified using the canonical corpus:

```
/corpus/good-intents.json    - 10 intents, all MUST ship
/corpus/bad-intents.json     - 15 intents, all MUST block
/corpus/borderline-intents.json - 12 intents, conditions apply
```

### 8.3 Compliance Statement

Compliant systems SHOULD include:

```json
{
  "olympusCompliance": {
    "level": "OLYMPUS-CORE | OLYMPUS-FULL | OLYMPUS-CERTIFIED",
    "version": "2.1",
    "verificationDate": "YYYY-MM-DD",
    "auditor": "Self | Organization Name"
  }
}
```

---

## 9. Reference Implementation

The canonical reference implementation is located at:

```
Source: src/lib/quality/
Constitution: .olympus/OLYMPUS_CONSTITUTION_v2.0.json
Pipeline: src/app/api/debug/run-build/route.ts
```

Key modules:

| Module | Implements |
|--------|------------|
| `intent-graph.ts` | W-ISS-D scoring (REQ-SCORE-001 through 004) |
| `hostile-intent-harness.ts` | HITH (REQ-HITH-*) |
| `adversarial-governance-harness.ts` | AGH (REQ-AGH-*) |
| `constitutional-tests.ts` | Article enforcement (REQ-CONST-*) |
| `human-override.ts` | Override system (REQ-OVER-*) |
| `truth-artifact.ts` | Output generation (REQ-OUT-001 through 005) |
| `decision-certificate.ts` | Certificates (REQ-OUT-006 through 011) |
| `architecture-guard.ts` | Pipeline protection (REQ-ARCH-*) |

---

## 10. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 2.1 | 2026-01-19 | Initial compliance specification |

---

*This specification is NORMATIVE. Implementations claiming OLYMPUS compliance MUST satisfy all MUST requirements.*
