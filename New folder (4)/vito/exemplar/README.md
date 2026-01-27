# OLYMPUS Exemplar Build

**Status:** FROZEN
**Build ID:** `exemplar-2026-01-19-canonical`
**Verdict:** SHIP_APPROVED

---

## Purpose

This directory contains a frozen, fully compliant OLYMPUS build. It serves as:

1. **Reference** - Shows what compliant output looks like
2. **Teaching Tool** - Demonstrates all required artifacts
3. **Validation Target** - Can be compared against new builds
4. **Audit Example** - Shows complete audit trail

---

## Directory Structure

```
exemplar/
├── README.md                    ← This file
├── WHY_THIS_SHIPPED.md          ← Truth artifact (human-readable)
├── DECISION_CERTIFICATE.md      ← Certificate summary (human-readable)
├── _build-summary.json          ← Build metadata
├── _ctel-result.json            ← Constitutional test results
├── intents.json                 ← Input intents
└── .olympus/
    ├── _decision-certificate-exemplar.json  ← Full certificate
    ├── _adversarial-governance-result.json  ← AGH results
    ├── intent-fates.json                    ← Fate assignments
    └── truth-artifact-exemplar.md           ← Audit copy
```

---

## Build Characteristics

| Property | Value |
|----------|-------|
| OLYMPUS Version | 2.1-canonical |
| Governance Authority | CANONICAL |
| Pipeline Steps | 22 |
| Intents Submitted | 5 |
| Intents Satisfied | 5 |
| W-ISS-D Score | 97% |
| SSI Score | 95% |
| UVD Score | 82% |
| IAS Score | 88% |
| Hostile Blocked | 15/15 |
| Governance Exploits Blocked | 28/28 |
| Constitutional Violations | 0 |
| Override Applied | No |

---

## Compliance Verification

This exemplar demonstrates compliance with:

- [x] REQ-ARCH-001 through REQ-ARCH-004 (Pipeline structure)
- [x] REQ-CONST-001 through REQ-CONST-043 (Constitutional articles)
- [x] REQ-SCORE-001 through REQ-SCORE-014 (Scoring requirements)
- [x] REQ-OVER-001 through REQ-OVER-016 (Override requirements)
- [x] REQ-HITH-001 through REQ-HITH-013 (Hostile testing)
- [x] REQ-AGH-001 through REQ-AGH-009 (Governance testing)
- [x] REQ-OUT-001 through REQ-OUT-015 (Output requirements)

---

## Usage

### As Reference

Compare your build output against this exemplar:

```bash
diff -r your-build/.olympus exemplar/.olympus
```

### As Teaching Material

Walk through each file to understand:

1. What intents look like (`intents.json`)
2. What fate assignment looks like (`intent-fates.json`)
3. What certificates look like (`_decision-certificate-exemplar.json`)
4. What truth artifacts explain (`WHY_THIS_SHIPPED.md`)

### As Validation

Verify your implementation produces equivalent structure:

```
- Same file types present
- Same JSON schema
- Same certificate format
- Same truth artifact sections
```

---

## Frozen Status

This exemplar is FROZEN and MUST NOT be modified.

Changes require:
1. New exemplar with new build ID
2. Version increment
3. Documentation update

---

*OLYMPUS 2.1 Canonical Standard - Exemplar Build*
