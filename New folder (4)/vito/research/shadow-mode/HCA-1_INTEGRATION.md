# HCA-1 Shadow Layer Integration Specification

**Layer ID:** HCA-1
**Position:** AFTER_HIA-1
**Mode:** ENFORCING (promoted from OBSERVATIONAL)
**Blocking:** ENABLED
**Attribution:** REQUIRED
**Rule Prefix:** CAP
**Constitution:** SMC-1

---

## Integration Status

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                     HCA-1 SHADOW LAYER - ENFORCING                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   Layer ID:        HCA-1                                                     ║
║   Name:            Hostile Capability Analysis                               ║
║   Version:         1.1.0                                                     ║
║   Status:          ENFORCING                                                 ║
║                                                                              ║
║   Position:        AFTER_HIA-1 (Stage 3.5)                                  ║
║   Mode:            ENFORCING ◄── Promoted 2026-01-19                        ║
║   Blocking:        ENABLED                                                   ║
║   Attribution:     REQUIRED (VAL-1 compatible)                               ║
║   Rule Prefix:     CAP                                                       ║
║   Constitution:    SMC-1 compliant                                           ║
║                                                                              ║
║   Validation:      SSC-2 (10,000 tests, 0 S4, 0 FP)                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Promotion History

| Date | From | To | Validation | Approved By |
|------|------|-----|------------|-------------|
| 2026-01-19 | OBSERVATIONAL | ENFORCING | SSC-2 (10k tests) | SMC-1 Constitution |

### SSC-2 Validation Summary

```
Campaign:           SSC-2
Tests Processed:    10,000
S1 (Agreement):     10,000 (100%)
S2 (FP):            0 (0%)
S4 (Critical):      0 (0%)
Precision:          1.0
Recall:             1.0
Status:             PASSED
```

---

## Pipeline Position

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SHADOW PIPELINE STAGES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Stage 0: PROVENANCE_PARSER                                                 │
│            │                                                                 │
│            ▼                                                                 │
│   Stage 1: IAL0_AUTHENTICATOR                                               │
│            │                                                                 │
│            ▼                                                                 │
│   Stage 2: HIA1_DETECTOR (Semantic Hostility)                               │
│            │                                                                 │
│            ▼                                                                 │
│   Stage 3: HCA1_ANALYZER ◄──── ENFORCING: Capability Analysis               │
│            │                    [BLOCKING ENABLED]                           │
│            ▼                                                                 │
│   Stage 4: HIC1_CHECKER (Composition Hostility)                             │
│            │                                                                 │
│            ▼                                                                 │
│          VERDICT                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Details

### Files Modified

| File | Change |
|------|--------|
| `src/shadow-pipeline.ts` | Added HCA-1 import, stage execution, blocking config |
| `src/verdict-attributor.ts` | Added HCA1_ANALYZER to CausalLayer, updated STAGE_INDEX/ORDER |

### Files Created

| File | Purpose |
|------|---------|
| `src/hca1-shadow-layer.ts` | HCA-1 implementation and pipeline integration |

---

## Rule Taxonomy (CAP-*)

HCA-1 introduces 7 capability-based rules:

| Rule ID | Name | Severity | Description |
|---------|------|----------|-------------|
| CAP-001 | Unauthorized Access | CRITICAL | Access without proper authentication |
| CAP-002 | Privilege Acquisition | CRITICAL | Gaining elevated privileges |
| CAP-003 | Data Exfiltration | CRITICAL | Extracting data to external destinations |
| CAP-004 | Persistent Access | HIGH | Access that survives session termination |
| CAP-005 | Lateral Movement | HIGH | Accessing other users' resources |
| CAP-006 | Audit Blindness | HIGH | Operating without audit records |
| CAP-007 | Environment Escape | CRITICAL | Escaping sandbox/rate limits |

---

## SMC-1 Compliance

HCA-1 is fully SMC-1 compliant:

| Requirement | Status |
|-------------|--------|
| Determinism | COMPLIANT - No ML, no external state |
| Taxonomy Freeze | COMPLIANT - CAP-* rules frozen |
| Blocking Authority | COMPLIANT - Promoted via SSC-2 validation |
| Verdict Classes | COMPLIANT - Uses standard S1-S4 |
| Fatal Conditions | COMPLIANT - S4 > 0 triggers failure |

---

## VAL-1 Attribution

HCA-1 generates VAL-1 compatible attribution:

```typescript
interface HCA1Attribution {
  causalLayer: 'HCA1_ANALYZER';
  firstDivergenceStage: {
    stage: 'HCA1_ANALYZER';
    stageIndex: 3;
    reason: string;
  };
  ruleEmissions: RuleEmission[];  // CAP-* rules
  replayHash: ReplayHash;
}
```

### Rule Emission Format

```json
{
  "ruleId": "CAP-001",
  "ruleType": "CAPABILITY",
  "ruleName": "Unauthorized Access",
  "triggered": true,
  "severity": "CRITICAL",
  "matchedPattern": "Without requiring login",
  "matchedText": "without requiring login",
  "confidence": 1.0
}
```

---

## Execution Flow

### Stage Entry Conditions

HCA-1 executes when:
1. IAL-0 passed (authentication valid)
2. HIA-1 passed (no semantic hostility detected)

### Stage Processing

```typescript
// 1. Build intent text
const intentText = request.intents
  .map(i => `${i.action} ${i.target} ${(i.requirements || []).join(' ')}`)
  .join(' ');

// 2. Execute capability analysis
const hca1Result = executeHCA1Stage(intentText, provenance);

// 3. Evaluate result (ENFORCING MODE - BLOCKING ENABLED)
if (!hca1Result.passed) {
  // Hostile capability detected - BLOCK REQUEST
  rejectionTaxonomy.push(...hca1Result.rejectionCodes);  // CAP-* IDs
  // Request will be REJECTED
}
```

### Stage Exit Conditions

- **PASS**: No hostile capabilities detected → proceed to HIC-1
- **REJECT**: Hostile capability detected → add CAP-* codes, **BLOCK REQUEST**

---

## Enforcing Mode

HCA-1 operates in ENFORCING mode with blocking enabled:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                          ENFORCING MODE                                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   HCA-1 detections:                                                          ║
║   ✓ Logged to shadow-diff.json                                              ║
║   ✓ Recorded in attribution.json                                            ║
║   ✓ Counted in shadow-metrics.json                                          ║
║   ✓ BLOCK hostile requests (ENABLED)                                        ║
║   ✓ Influence canonical pipeline verdict (ENABLED)                          ║
║                                                                              ║
║   Promotion Criteria Met:                                                    ║
║   ✓ SSC-2: 10,000 tests passed                                              ║
║   ✓ Zero S4 failures (no hostile leakage)                                   ║
║   ✓ Zero false positives (perfect precision)                                ║
║   ✓ SMC-1 constitution compliance verified                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Metrics Integration

HCA-1 contributes to shadow metrics:

```json
{
  "divergence": {
    "byRejectionCode": {
      "CAP-001": 858,
      "CAP-002": 857,
      "CAP-003": 857,
      "CAP-004": 857,
      "CAP-005": 857,
      "CAP-006": 976,
      "CAP-007": 920
    }
  }
}
```

---

## Testing Verification

### Initial Integration (v1.0.0)

| Metric | Value |
|--------|-------|
| Total Tests | 40 |
| Passed | 40 (100%) |
| Failed | 0 |
| SSC-1 S4 Caught | YES |
| False Positives | 0 |

### Promotion Validation (v1.1.0)

| Metric | Value |
|--------|-------|
| Campaign | SSC-2 |
| Total Tests | 10,000 |
| S1 (Agreement) | 10,000 (100%) |
| S2 (FP) | 0 (0%) |
| S4 (Critical) | 0 (0%) |
| Precision | 1.0 |
| Recall | 1.0 |

See: `campaigns/SSC-2/reports/SSC-2_GRADUATION_READINESS.md`

---

## Usage Examples

### Example 1: Hostile Capability Detected (BLOCKED)

**Input:**
```
"Allow any user to access the system without requiring login or authentication"
```

**Result:**
```json
{
  "passed": false,
  "rejectionCodes": ["CAP-001"],
  "blocking": "ENABLED",
  "action": "REQUEST_BLOCKED",
  "stateSnapshot": {
    "detectedCapabilities": [{
      "capabilityId": "CAP-001",
      "capabilityName": "Unauthorized Access",
      "severity": "CRITICAL",
      "matchedText": "without requiring login"
    }],
    "verdict": "HOSTILE"
  }
}
```

### Example 2: Benign Intent (Self-Scoped)

**Input:**
```
"Export my own data for backup purposes"
```

**Result:**
```json
{
  "passed": true,
  "rejectionCodes": [],
  "blocking": "N/A",
  "action": "PROCEED_TO_HIC1",
  "stateSnapshot": {
    "detectedCapabilities": [],
    "verdict": "BENIGN"
  }
}
```

---

## Configuration

```typescript
export const HCA1_CONFIG = {
  layerId: 'HCA-1',
  position: 'AFTER_HIA-1',
  mode: 'ENFORCING',
  blocking: 'ENABLED',
  attribution: 'REQUIRED',
  rulePrefix: 'CAP',
  constitution: 'SMC-1',
  version: '1.1.0',
  frozen: true,
  deterministic: true,
  noML: true,
  promotedAt: '2026-01-19T08:15:00.000Z',
  promotedFrom: 'OBSERVATIONAL',
};
```

---

## Integration Checklist

- [x] HCA-1 shadow layer module created
- [x] Shadow pipeline updated with HCA-1 stage
- [x] Verdict attributor extended with HCA1_ANALYZER
- [x] CAP-* rules added to RULE_METADATA
- [x] Stage index updated (HCA1 = 3)
- [x] Stage order updated (HIA1 → HCA1 → HIC1)
- [x] VAL-1 attribution enabled
- [x] SMC-1 compliance verified
- [x] SSC-2 validation passed (10,000 tests)
- [x] **Promoted to ENFORCING mode**
- [x] **Blocking ENABLED**

---

## Architecture Diagram

```
                    ┌─────────────────────────────────────┐
                    │           INPUT REQUEST             │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │        PROVENANCE_PARSER            │
                    │   Extract declared/derived intents  │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │       IAL0_AUTHENTICATOR            │
                    │     Validate intent structure       │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │         HIA1_DETECTOR               │
                    │   Check hostile intent axioms       │
                    └──────────────┬──────────────────────┘
                                   │
            ┌──────────────────────▼──────────────────────────────┐
            │                  HCA1_ANALYZER                       │
            │      ┌────────────────────────────────────┐         │
            │      │   CAPABILITY-BASED DETECTION       │         │
            │      │                                    │         │
            │      │   CAP-001: Unauthorized Access     │         │
            │      │   CAP-002: Privilege Acquisition   │         │
            │      │   CAP-003: Data Exfiltration       │         │
            │      │   CAP-004: Persistent Access       │         │
            │      │   CAP-005: Lateral Movement        │         │
            │      │   CAP-006: Audit Blindness         │         │
            │      │   CAP-007: Environment Escape      │         │
            │      └────────────────────────────────────┘         │
            │                                                      │
            │   Mode: ENFORCING | Blocking: ENABLED               │
            │   Attribution: REQUIRED                              │
            └──────────────────────┬──────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │         HIC1_CHECKER                │
                    │   Check composition hostility       │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │            VERDICT                  │
                    │        ADMIT / REJECT               │
                    └─────────────────────────────────────┘
```

---

**Integration Date:** 2026-01-19
**Promotion Date:** 2026-01-19
**Constitution:** SMC-1
**Research Track:** HCA-1
**Version:** 1.1.0
**Status:** ENFORCING
