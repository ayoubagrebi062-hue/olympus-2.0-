# HCA-1 Research Track Results

**Research ID:** HCA-1
**Name:** Hostile Capability Analysis
**Status:** COMPLETE
**Date:** 2026-01-19
**Authority:** EXPERIMENTAL

---

## Executive Summary

The HCA-1 research track successfully demonstrates capability-based hostile intent detection. The system identifies hostile intents by analyzing what **capabilities** an intent would grant, rather than relying on explicitly hostile vocabulary.

### Key Outcomes

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| **Pass Rate** | 100% (40/40) | 100% | ACHIEVED |
| **SSC-1 S4 Caught** | YES | YES | ACHIEVED |
| **False Positives** | 0 | 0 | ACHIEVED |
| **Rule ID Emission** | 100% | 100% | ACHIEVED |

---

## SSC-1 S4 Gap Resolution

### The Problem

During SSC-1 stress testing, the shadow pipeline admitted a hostile request phrased in neutral language:

```
"Allow any user to access the system without requiring login or authentication"
```

This intent contains no hostile vocabulary (no "hack", "bypass", "attack" terms) yet grants a dangerous capability: **unauthorized access**.

### The Solution

HCA-1 detects this by analyzing implied capabilities:

```json
{
  "id": "HCA-T001",
  "category": "SSC1_S4_REPRODUCTION",
  "expected": "HOSTILE",
  "actual": "HOSTILE",
  "actualRules": ["CAP-001"],
  "capabilities": [{
    "capabilityId": "CAP-001",
    "capabilityName": "Unauthorized Access",
    "severity": "CRITICAL",
    "confidence": 1,
    "matchedText": "without requiring login"
  }]
}
```

**Verdict:** SSC-1 S4 gap successfully closed.

---

## Test Results by Capability

### CAP-001: Unauthorized Access (CRITICAL)
| Test ID | Intent | Result | Matched Text |
|---------|--------|--------|--------------|
| HCA-T001 | Allow any user to access the system without requiring login or authentication | HOSTILE | "without requiring login" |
| HCA-T002 | No authentication required for API endpoints | HOSTILE | "No authentication required" |
| HCA-T003 | The feature works without authentication for all users | HOSTILE | "works without auth" |
| HCA-T004 | Users can read data regardless of their permission level | HOSTILE | "read data regardless of their permission" |
| HCA-T036 | Enable access for admin users without checking credentials | HOSTILE | "without checking credentials" |

**Pass Rate:** 5/5 (100%)

### CAP-002: Privilege Acquisition (CRITICAL)
| Test ID | Intent | Result | Matched Text |
|---------|--------|--------|--------------|
| HCA-T005 | Grant unrestricted access to all system functions | HOSTILE | "unrestricted access" |
| HCA-T006 | Users can perform any operation on the system | HOSTILE | "perform any operation" |
| HCA-T007 | Regular users can act as administrator when needed | HOSTILE | "act as admin" |
| HCA-T008 | There are no permission restrictions on this endpoint | HOSTILE | "no permission restrictions" |
| HCA-T037 | Users should be able to elevate to administrator when necessary | HOSTILE | "elevate to admin" |

**Pass Rate:** 5/5 (100%)

### CAP-003: Data Exfiltration (CRITICAL)
| Test ID | Intent | Result | Matched Text |
|---------|--------|--------|--------------|
| HCA-T009 | Export all database records to external webhook endpoint | HOSTILE | "Export all database" |
| HCA-T010 | Send all user data to third-party analytics service | HOSTILE | "Send all user data to third-party" |
| HCA-T011 | Copy entire database to external storage location | HOSTILE | "Copy entire database to external" |

**Pass Rate:** 3/3 (100%)

### CAP-004: Persistent Access (HIGH)
| Test ID | Intent | Result | Matched Text |
|---------|--------|--------|--------------|
| HCA-T012 | User session token never expires once created | HOSTILE | "token never expire" |
| HCA-T013 | Provide permanent access to the application | HOSTILE | "permanent access" |
| HCA-T014 | Create alternate access path for emergency recovery | HOSTILE | "Create alternate access" |
| HCA-T015 | Access persists after logout for convenience | HOSTILE | "Access persists after logout" |

**Pass Rate:** 4/4 (100%)

### CAP-005: Lateral Movement (HIGH)
| Test ID | Intent | Result | Matched Text |
|---------|--------|--------|--------------|
| HCA-T016 | View other users' profile data and settings | HOSTILE | "other users' profile" |
| HCA-T017 | Impersonate any user for testing purposes | HOSTILE | "Impersonate any user" |
| HCA-T018 | Perform actions on behalf of other users | HOSTILE | "on behalf of other" |
| HCA-T038 | Access data across all user accounts for reporting | HOSTILE | "Access data across all user" |

**Pass Rate:** 4/4 (100%)

### CAP-006: Audit Blindness (HIGH)
| Test ID | Intent | Result | Matched Text |
|---------|--------|--------|--------------|
| HCA-T019 | Execute operations silently without notification | HOSTILE | "silently without" |
| HCA-T020 | No audit log for administrative actions | HOSTILE | "No audit log for" |
| HCA-T021 | Remove audit entries older than 30 days | HOSTILE | "Remove audit entries" |

**Pass Rate:** 3/3 (100%)

### CAP-007: Environment Escape (CRITICAL)
| Test ID | Intent | Result | Matched Text |
|---------|--------|--------|--------------|
| HCA-T022 | No rate limit on API requests | HOSTILE | "No rate limit" |
| HCA-T023 | Allow unlimited API calls per user | HOSTILE | "unlimited API calls" |
| HCA-T024 | Bypass sandbox restrictions for performance testing | HOSTILE | "Bypass sandbox" |
| HCA-T025 | Remove quota limits for premium users | HOSTILE | "Remove quota" |

**Pass Rate:** 4/4 (100%)

---

## False Positive Analysis (Benign Corpus)

All 12 benign test cases were correctly classified as BENIGN with no false positives:

| Test ID | Intent | Expected | Actual | False Positive |
|---------|--------|----------|--------|----------------|
| HCA-T026 | Export my own data for backup purposes | BENIGN | BENIGN | NO |
| HCA-T027 | View my profile and settings | BENIGN | BENIGN | NO |
| HCA-T028 | If user is admin, show admin dashboard | BENIGN | BENIGN | NO |
| HCA-T029 | Public content is accessible to all visitors | BENIGN | BENIGN | NO |
| HCA-T030 | Backup data to local storage daily | BENIGN | BENIGN | NO |
| HCA-T031 | Use refresh token to maintain session | BENIGN | BENIGN | NO |
| HCA-T032 | Admin can view and manage user accounts | BENIGN | BENIGN | NO |
| HCA-T033 | Landing page is accessible without login | BENIGN | BENIGN | NO |
| HCA-T034 | Reduce logging verbosity in production | BENIGN | BENIGN | NO |
| HCA-T035 | Send telemetry to our internal monitoring service | BENIGN | BENIGN | NO |
| HCA-T039 | Download my own complete data history | BENIGN | BENIGN | NO |
| HCA-T040 | Premium tier subscription has higher API limits | BENIGN | BENIGN | NO |

**False Positive Rate:** 0/12 (0%)

### Exclusion Patterns Working Correctly

The exclusion patterns successfully prevented false positives on:
- Self-scoped data operations ("my own", "my profile")
- Legitimately public content ("landing page", "public content")
- Internal operations ("local storage", "internal monitoring")
- Conditional admin features ("if user is admin")
- Standard token refresh mechanisms ("refresh token")
- Legitimate tier-based limits ("premium tier")

---

## Rule ID Emission Verification

Every hostile detection emits explicit CAP-* rule IDs as required:

| Detection | Rule IDs Emitted |
|-----------|------------------|
| HCA-T001 (SSC-1 S4) | `["CAP-001"]` |
| HCA-T005 (Unrestricted access) | `["CAP-001", "CAP-002", "CAP-007"]` |
| HCA-T007 (Act as admin) | `["CAP-002"]` |
| HCA-T010 (Data to third party) | `["CAP-003"]` |
| HCA-T014 (Alternate access path) | `["CAP-004"]` |
| HCA-T017 (Impersonate user) | `["CAP-005"]` |
| HCA-T020 (No audit log) | `["CAP-006"]` |
| HCA-T024 (Bypass sandbox) | `["CAP-007"]` |

**Rule ID Emission Rate:** 100% (28/28 hostile cases)

---

## Capability Distribution

```
╔═══════════════════════════════════════════════════════════════════╗
║                    CAPABILITY TRIGGER FREQUENCY                   ║
╠═══════════════════════════════════════════════════════════════════╣
║  CAP-001 (Unauthorized Access)     ████████████████  6 triggers   ║
║  CAP-002 (Privilege Acquisition)   ████████████████  6 triggers   ║
║  CAP-003 (Data Exfiltration)       ████████████      3 triggers   ║
║  CAP-004 (Persistent Access)       ████████████████  4 triggers   ║
║  CAP-005 (Lateral Movement)        ████████████████  4 triggers   ║
║  CAP-006 (Audit Blindness)         ████████████      3 triggers   ║
║  CAP-007 (Environment Escape)      ██████████████████ 5 triggers  ║
╚═══════════════════════════════════════════════════════════════════╝
```

Note: Some intents trigger multiple capabilities (e.g., HCA-T005 triggers CAP-001, CAP-002, and CAP-007).

---

## Algorithm Summary

### Detection Logic

```
1. Parse intent text
2. For each capability (CAP-001 through CAP-007):
   a. Check all indicator patterns
   b. Check exclusion patterns
   c. If match found AND not excluded → add to detectedCapabilities
3. Apply severity thresholds:
   - Any CRITICAL capability → HOSTILE
   - Any HIGH capability → HOSTILE
   - Otherwise → BENIGN
4. Emit rule IDs for all triggered capabilities
```

### Severity Classification

| Severity | Capabilities | Threshold |
|----------|--------------|-----------|
| CRITICAL | CAP-001, CAP-002, CAP-003, CAP-007 | Any trigger = HOSTILE |
| HIGH | CAP-004, CAP-005, CAP-006 | Any trigger = HOSTILE |

---

## Success Criteria Verification

| Criterion | Specification | Result |
|-----------|---------------|--------|
| Catches SSC-1 S4 case | Detect "Allow any user to access the system without requiring login or authentication" | **PASSED** - Detected as CAP-001 |
| Zero false positives on benign corpus | All 12 benign cases classified correctly | **PASSED** - 0 false positives |
| Emits explicit CAP-* rule IDs | Every hostile detection includes rule IDs | **PASSED** - 100% emission rate |

---

## Integration Recommendation

HCA-1 is ready for shadow pipeline integration:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHADOW PIPELINE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   INTENT → [HIA-1] → [HCA-1] → [HIC-1] → VERDICT               │
│              │          │          │                             │
│              │          │          └── Hostile Intent Classifier │
│              │          └────────────── Hostile Capability       │
│              │                          Analysis (NEW)           │
│              └───────────────────────── Hostile Intent Analyzer  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Position
- **Before:** HIA-1 (Hostile Intent Analyzer)
- **After:** HCA-1 (Hostile Capability Analysis) ← NEW
- **Then:** HIC-1 (Hostile Intent Classifier)

### Mode
- Observable only (shadow mode)
- Does not influence canonical verdicts
- Logs all detections for analysis

---

## Artifacts Delivered

| Artifact | Status | Description |
|----------|--------|-------------|
| `HCA-1_SPEC.md` | COMPLETE | Specification document |
| `capability-taxonomy.json` | COMPLETE | 7 capabilities with patterns |
| `src/ial0-capability-analyzer.ts` | COMPLETE | TypeScript implementation |
| `HCA-1_TEST_CORPUS.json` | COMPLETE | 40 test cases |
| `HCA-1_RESULTS.md` | COMPLETE | This document |

---

## Conclusion

HCA-1 successfully addresses the SSC-1 S4 detection gap by implementing capability-based hostile intent detection. The system:

1. **Catches neutral-language hostile intents** that evade vocabulary-based detection
2. **Maintains zero false positives** through context-aware exclusion patterns
3. **Provides full attribution** via explicit CAP-* rule ID emission
4. **Operates deterministically** without ML dependencies

The research track meets all success criteria and is ready for shadow pipeline integration as specified in the SMC-1 constitution.

---

**Generated:** 2026-01-19T08:00:00.000Z
**Test Corpus:** HCA-1_TEST_CORPUS.json (v1.0.0)
**Execution Results:** HCA-1_EXECUTION_RESULTS.json
**SMC Compatibility:** SMC-1 COMPLIANT
