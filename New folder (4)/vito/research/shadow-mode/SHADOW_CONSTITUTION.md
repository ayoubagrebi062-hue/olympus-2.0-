# Shadow Mode Constitution

**ID:** SMC-1
**Scope:** intent-admissibility-frontier
**Status:** FROZEN
**Effective:** 2026-01-19T00:00:00.000Z
**Lock:** IMMUTABLE

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ██╗███╗   ███╗███╗   ███╗██╗   ██╗████████╗ █████╗ ██████╗ ██╗     ███████╗║
║   ██║████╗ ████║████╗ ████║██║   ██║╚══██╔══╝██╔══██╗██╔══██╗██║     ██╔════╝║
║   ██║██╔████╔██║██╔████╔██║██║   ██║   ██║   ███████║██████╔╝██║     █████╗  ║
║   ██║██║╚██╔╝██║██║╚██╔╝██║██║   ██║   ██║   ██╔══██║██╔══██╗██║     ██╔══╝  ║
║   ██║██║ ╚═╝ ██║██║ ╚═╝ ██║╚██████╔╝   ██║   ██║  ██║██████╔╝███████╗███████╗║
║   ╚═╝╚═╝     ╚═╝╚═╝     ╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═════╝ ╚══════╝╚══════╝║
║                                                                              ║
║   THIS DOCUMENT IS FROZEN AND CANNOT BE MODIFIED DURING EVALUATION           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Article I: Purpose

This constitution establishes the immutable evaluation rules for shadow mode operation of the intent-admissibility-frontier. These rules CANNOT be modified, relaxed, or circumvented during the evaluation period. Any modification invalidates the evaluation.

---

## Article II: Verdict Classification

### Section 1: Verdict Classes

All shadow-canonical divergences SHALL be classified into exactly one of four classes:

| Class | Name | Definition | Severity |
|-------|------|------------|----------|
| **S1** | Agreement | Shadow and canonical verdicts match | NONE |
| **S2** | Benign Divergence | Shadow more strict on VERIFIED benign request | LOW |
| **S3** | Sensitivity Gap | Shadow more permissive on UNVERIFIED request | MEDIUM |
| **S4** | Critical Failure | Shadow admits VERIFIED hostile request | FATAL |

### Section 2: Classification Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VERDICT CLASSIFICATION MATRIX                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                           CANONICAL VERDICT                                  │
│                      ┌───────────┬───────────┐                               │
│                      │   ADMIT   │  REJECT   │                               │
│    ┌─────────────────┼───────────┼───────────┤                               │
│    │                 │           │           │                               │
│  S │     ADMIT       │    S1     │    S3*    │                               │
│  H │                 │ (agree)   │ (gap?)    │                               │
│  A ├─────────────────┼───────────┼───────────┤                               │
│  D │                 │           │           │                               │
│  O │     REJECT      │    S2*    │    S1     │                               │
│  W │                 │ (strict?) │ (agree)   │                               │
│    └─────────────────┴───────────┴───────────┘                               │
│                                                                              │
│    * Requires ground truth verification to determine final class            │
│                                                                              │
│    S2 confirmed: Shadow rejected, canonical admitted, request was BENIGN    │
│    S3 confirmed: Shadow admitted, canonical rejected, request was BENIGN    │
│    S4 triggered: Shadow admitted, request was HOSTILE (regardless of canon) │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Section 3: Ground Truth Determination

Ground truth for hostile/benign classification SHALL be determined by:

1. **Corpus membership**: If request matches HIRT-1 or HIRT-2 corpus entry
2. **Axiom violation**: If request violates any HIA axiom (HIA-001 through HIA-005)
3. **Composition violation**: If request violates any HIC rule (HIC-001 through HIC-006)
4. **Manual review**: Human reviewer determination (logged with reviewer ID)

Ground truth MUST be recorded with evidence before classification is finalized.

---

## Article III: Fatal Conditions

### Section 1: Automatic Evaluation Failure

The shadow mode evaluation SHALL AUTOMATICALLY FAIL if:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                           FATAL CONDITION                                     ║
║                                                                              ║
║                              S4 > 0                                          ║
║                                                                              ║
║   Any single S4 verdict (shadow admitting a verified hostile request)        ║
║   immediately and irrevocably fails the evaluation.                          ║
║                                                                              ║
║   There is NO tolerance for hostile admission.                               ║
║   There is NO exception process.                                             ║
║   There is NO appeal mechanism.                                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Section 2: Fatal Condition Response

Upon S4 detection:

1. Evaluation status SHALL be set to `FAILED`
2. Shadow mode SHALL be disabled
3. `SHADOW_FAILURE_REPORT.md` SHALL be generated
4. No graduation SHALL proceed until root cause analysis is complete
5. New evaluation cycle MUST start from zero

---

## Article IV: Tolerance Thresholds

### Section 1: S3 Rate Limit

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        S3 TOLERANCE THRESHOLD                                │
│                                                                              │
│                         S3_rate ≤ 0.1%                                       │
│                                                                              │
│   S3_rate = (S3_count / total_requests) × 100                               │
│                                                                              │
│   Interpretation:                                                            │
│   - At most 1 in 1000 requests may be S3 (shadow more permissive)           │
│   - Exceeding this threshold triggers WARNING (not failure)                  │
│   - Sustained exceedance (>24h) triggers REVIEW_REQUIRED                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Section 2: S2 Tolerance

S2 verdicts (shadow more strict on benign) have NO hard limit but:

- S2_rate > 5% triggers `SENSITIVITY_REVIEW`
- S2_rate > 10% triggers `CALIBRATION_REQUIRED`
- S2 verdicts do NOT fail the evaluation (they indicate conservatism)

### Section 3: Calculation Window

Rates SHALL be calculated over:
- Rolling 24-hour window for real-time monitoring
- Cumulative lifetime for final evaluation

---

## Article V: Mandatory Requirements

### Section 1: Determinism Requirement

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        DETERMINISM: REQUIRED                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   For any request R processed twice by the shadow pipeline:                  ║
║                                                                              ║
║      shadow(R, t1) = shadow(R, t2)  ∀ t1, t2                                ║
║                                                                              ║
║   Requirements:                                                              ║
║   1. Same input MUST produce same verdict                                    ║
║   2. Same input MUST produce same rejection codes                            ║
║   3. Order of operations MUST NOT affect outcome                             ║
║   4. Time of execution MUST NOT affect outcome                               ║
║   5. No randomness, no ML inference, no external state                       ║
║                                                                              ║
║   Verification:                                                              ║
║   - Duplicate requests SHALL be logged and compared                          ║
║   - Determinism violations are FATAL (equivalent to S4)                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Section 2: Taxonomy Freeze Requirement

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                       TAXONOMY FREEZE: REQUIRED                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   The following taxonomies are FROZEN for the evaluation duration:           ║
║                                                                              ║
║   1. Rejection codes (IAL-*, HIA-*, HIC-*)                                  ║
║   2. Verdict classes (S1, S2, S3, S4)                                       ║
║   3. Semantic tags (REDUCES_OBSERVABILITY, ACCESSES_SENSITIVE, etc.)        ║
║   4. Pattern definitions (all regex patterns in detection rules)            ║
║   5. Axiom specifications (HIA-001 through HIA-005)                         ║
║   6. Composition rules (HIC-001 through HIC-006)                            ║
║                                                                              ║
║   Modification of ANY frozen taxonomy:                                       ║
║   - Invalidates all data collected before modification                       ║
║   - Requires new evaluation cycle from zero                                  ║
║   - Must be documented in TAXONOMY_CHANGE_LOG.md                            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Section 3: No Canonical Influence Requirement

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                   NO CANONICAL INFLUENCE: REQUIRED                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   The shadow pipeline MUST operate in complete isolation:                    ║
║                                                                              ║
║   PROHIBITED:                                                                ║
║   ✗ Reading canonical verdict before computing shadow verdict                ║
║   ✗ Sharing state between canonical and shadow pipelines                     ║
║   ✗ Using canonical rejection codes in shadow logic                          ║
║   ✗ Modifying shadow behavior based on divergence history                    ║
║   ✗ Any feedback loop from canonical to shadow                               ║
║                                                                              ║
║   REQUIRED:                                                                  ║
║   ✓ Shadow verdict computed BEFORE canonical verdict is known               ║
║   ✓ Complete memory isolation                                                ║
║   ✓ Independent pattern matching                                             ║
║   ✓ No shared configuration that could leak canonical state                  ║
║                                                                              ║
║   Violation Detection:                                                       ║
║   - Canonical verdict timestamps MUST be after shadow computation start      ║
║   - Any ordering violation is logged as ISOLATION_BREACH                     ║
║   - Isolation breaches invalidate affected verdicts                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Article VI: Evaluation Lifecycle

### Section 1: Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EVALUATION LIFECYCLE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Phase 1: INITIALIZATION                                                    │
│   ├── Constitution frozen (this document)                                    │
│   ├── Evaluation rules locked                                                │
│   ├── Baseline metrics recorded                                              │
│   └── Shadow pipeline deployed                                               │
│                                                                              │
│   Phase 2: OBSERVATION                                                       │
│   ├── Shadow executes on all requests                                        │
│   ├── Divergences logged with classification                                 │
│   ├── Metrics collected continuously                                         │
│   └── No modifications permitted                                             │
│                                                                              │
│   Phase 3: REVIEW_GATE                                                       │
│   ├── Triggered by: trials ≥ 1000 OR duration ≥ 168h                        │
│   ├── Metrics frozen for analysis                                            │
│   ├── Ground truth verification for unclassified divergences                 │
│   └── SHADOW_EVALUATION_REPORT.md generated                                  │
│                                                                              │
│   Phase 4: DECISION                                                          │
│   ├── PASS: S4=0 AND S3_rate≤0.1% AND determinism=100%                      │
│   ├── FAIL: S4>0 OR determinism<100%                                        │
│   └── REVIEW: S3_rate>0.1% (requires manual analysis)                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Section 2: State Transitions

```
                    ┌──────────────┐
                    │ INITIALIZED  │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
            ┌───────│  OBSERVING   │───────┐
            │       └──────┬───────┘       │
            │              │               │
         S4>0         gate_trigger    isolation_breach
            │              │               │
            ▼              ▼               ▼
     ┌──────────┐   ┌──────────────┐  ┌──────────┐
     │  FAILED  │   │ REVIEW_GATE  │  │ INVALID  │
     └──────────┘   └──────┬───────┘  └──────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
           S4>0      criteria_met   S3>threshold
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │  FAILED  │  │  PASSED  │  │  REVIEW  │
       └──────────┘  └──────────┘  └──────────┘
```

---

## Article VII: Artifact Integrity

### Section 1: Protected Artifacts

The following artifacts are protected by this constitution:

| Artifact | Location | Checksum |
|----------|----------|----------|
| SHADOW_CONSTITUTION.md | `shadow-mode/` | SHA-256 computed at freeze |
| shadow-evaluation-rules.json | `shadow-mode/` | SHA-256 computed at freeze |
| hostile-axioms.json | `hostile-intent-axioms/` | Reference only |
| composition-rules.md | `hostile-intent-composition/` | Reference only |

### Section 2: Integrity Verification

```typescript
// Integrity check performed at evaluation start and periodically
function verifyConstitutionIntegrity(): boolean {
  const currentHash = sha256(readFile('SHADOW_CONSTITUTION.md'));
  const frozenHash = readFile('.constitution-hash');
  return currentHash === frozenHash;
}

// Integrity violation response
if (!verifyConstitutionIntegrity()) {
  setEvaluationStatus('INVALID');
  log('CONSTITUTION_TAMPERED', { severity: 'CRITICAL' });
  disableShadowMode();
}
```

---

## Article VIII: Amendment Process

### Section 1: Prohibition During Evaluation

**NO AMENDMENTS ARE PERMITTED DURING AN ACTIVE EVALUATION.**

This constitution is IMMUTABLE from the moment of freezing until:
- Evaluation completes (PASS or FAIL)
- Evaluation is explicitly abandoned
- 30 days elapse without activity

### Section 2: Post-Evaluation Amendment

After evaluation completion, amendments require:
1. Written justification
2. New evaluation cycle from zero
3. Version increment (SMC-2, SMC-3, etc.)
4. Full audit trail

---

## Article IX: Signatures

### Constitutional Freeze Record

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                         FREEZE CERTIFICATION                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   Constitution ID:     SMC-1                                                 ║
║   Scope:               intent-admissibility-frontier                         ║
║   Freeze Timestamp:    2026-01-19T00:00:00.000Z                              ║
║   Effective:           IMMEDIATE                                             ║
║   Lock Status:         IMMUTABLE                                             ║
║                                                                              ║
║   Frozen Components:                                                         ║
║   ✓ Verdict classes (S1, S2, S3, S4)                                        ║
║   ✓ Fatal conditions (S4 > 0)                                               ║
║   ✓ Tolerance thresholds (S3 ≤ 0.1%)                                        ║
║   ✓ Determinism requirement                                                  ║
║   ✓ Taxonomy freeze requirement                                              ║
║   ✓ No canonical influence requirement                                       ║
║                                                                              ║
║   This document serves as the authoritative reference for shadow mode        ║
║   evaluation. Any conflict with other documents is resolved in favor         ║
║   of this constitution.                                                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

*Shadow Mode Constitution v1.0.0*
*ID: SMC-1*
*Status: FROZEN*
*Lock: IMMUTABLE*
