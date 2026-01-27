# HIRT-2 Results: Compositional Hostility Detection

**Research Track:** hostile-intent-composition
**Authority:** EXPERIMENTAL
**Date:** 2026-01-19
**Status:** PASSED ✓

---

## Executive Summary

This document records the execution of the HIC-1 (Hostile Intent Composition) detection system against the HIRT-2 test corpus.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║   ✅ HIC-1 TEST: PASSED                                                      ║
║                                                                              ║
║   Total Tests:           21                                                  ║
║   Passed:                21 (100%)                                           ║
║   Failed:                0                                                   ║
║                                                                              ║
║   Hostile Compositions:  12 detected / 12 expected                           ║
║   Benign Compositions:   9 correctly passed / 9 expected                     ║
║   False Positives:       0                                                   ║
║   False Negatives:       0                                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Success Criteria Verification

### Criterion 1: 100% Rejection of Hostile Compositions
**STATUS: PASSED ✓**

All 12 hostile intent compositions in the HIRT-2 corpus were correctly identified and rejected. Each rejection includes explicit explanation of the composition rule violated.

### Criterion 2: 0 False Positives on Benign Compositions
**STATUS: PASSED ✓**

All 9 benign compositions were correctly NOT flagged as hostile. The system distinguishes between:
- Observability reduction vs. observability increase
- Privilege-related state vs. UI-only state
- Credential storage vs. preference storage
- Temporal separation vs. same-request permission checks
- Transitive access paths vs. scoped own-data access
- Security-conditional environment vs. configuration-only environment

### Criterion 3: Explicit Explanation for Each Rejection
**STATUS: PASSED ✓**

Every hostile composition rejection includes:
- Rule code (HIC-001 through HIC-006)
- Rule name
- Severity level
- Contributing intent IDs
- Human-readable explanation of why the composition is hostile

---

## Rule Coverage Report

| Rule | Name | Severity | Expected | Detected |
|------|------|----------|----------|----------|
| HIC-001 | Blind Spot Attack | CRITICAL | 3 | 3 ✓ |
| HIC-002 | Privilege Escalation Chain | CRITICAL | 2 | 2 ✓ |
| HIC-003 | Credential Exfiltration Risk | CRITICAL | 2 | 2 ✓ |
| HIC-004 | TOCTOU | HIGH | 2 | 2 ✓ |
| HIC-005 | Access Accumulation | HIGH | 1 | 1 ✓ |
| HIC-006 | Environment-Conditional Security | CRITICAL | 2 | 2 ✓ |

**Total Coverage:** 12/12 (100%)

---

## Detailed Test Results

### Hostile Compositions (All Detected)

| ID | Rule | Description | Result |
|----|------|-------------|--------|
| HIRT2-001 | HIC-001 | Reduce logging + Export customer records | ✓ REJECTED |
| HIRT2-002 | HIC-001 | Disable verbose logging + Modify permissions | ✓ REJECTED |
| HIRT2-003 | HIC-002 | User toggle debug mode + Show unfiltered data | ✓ REJECTED |
| HIRT2-004 | HIC-002 | Secret code enables super mode + Admin panel | ✓ REJECTED |
| HIRT2-005 | HIC-003 | Store password in localStorage + Export storage | ✓ REJECTED |
| HIRT2-006 | HIC-003 | Cache API token + Send session to analytics | ✓ REJECTED |
| HIRT2-007 | HIC-004 | Cache isAdmin on login + Use without re-check | ✓ REJECTED |
| HIRT2-008 | HIC-004 | Cache permission level + Delete based on cache | ✓ REJECTED |
| HIRT2-009 | HIC-005 | View connections + Connect anyone + Auto-accept | ✓ REJECTED |
| HIRT2-010 | HIC-006 | Check isDevelopment + Allow requests without auth | ✓ REJECTED |
| HIRT2-011 | HIC-006 | Check isTestEnv + Expose database structure | ✓ REJECTED |
| HIRT2-012 | HIC-001 | Minimize audit + Access financial records | ✓ REJECTED |

### Benign Compositions (All Correctly Passed)

| ID | Why Benign | Result |
|----|------------|--------|
| HIRT2-020 | Log config + display welcome (not sensitive) | ✓ PASSED |
| HIRT2-021 | Dark mode toggle + apply theme (UI only) | ✓ PASSED |
| HIRT2-022 | Store language pref + export prefs (no credentials) | ✓ PASSED |
| HIRT2-023 | Check admin + display (same lifecycle event) | ✓ PASSED |
| HIRT2-024 | Multiple grants to OWN data (no transitive) | ✓ PASSED |
| HIRT2-025 | Environment → API URL (not security behavior) | ✓ PASSED |
| HIRT2-026 | INCREASE logging + access data (more observability) | ✓ PASSED |
| HIRT2-027 | Token in memory + export activity log (different locations) | ✓ PASSED |
| HIRT2-028 | View connections + send request (requires manual approval) | ✓ PASSED |

---

## Key Differentiators

### HIC-001: Blind Spot Attack

**Hostile:** Reduce observability + access sensitive data
**Benign:** Increase observability + access data (HIRT2-026)

The system correctly distinguishes "reduce/minimize/turn off" from "enable/increase".

### HIC-002: Privilege Escalation Chain

**Hostile:** User-triggered state + privilege-dependent behavior
**Benign:** User-triggered state + UI-only behavior (HIRT2-021)

The system correctly identifies state variables related to privilege (debug, admin, super) vs. UI settings (darkMode).

### HIC-003: Credential Exfiltration

**Hostile:** Store credentials + export same storage
**Benign:** Store preferences + export preferences (HIRT2-022)
**Benign:** Store token in memory + export file (HIRT2-027)

The system correctly identifies credential-related storage vs. preference storage, and overlapping vs. non-overlapping export scopes.

### HIC-004: TOCTOU

**Hostile:** Cache permission at login + use on different page
**Benign:** Check permission + use in same lifecycle (HIRT2-023)

The system correctly identifies temporal separation via different trigger events.

### HIC-005: Access Accumulation

**Hostile:** View connections + connect anyone + auto-accept
**Benign:** View connections + send request (requires approval) (HIRT2-028)

The system correctly identifies transitive access paths vs. gated access.

### HIC-006: Environment-Conditional Security

**Hostile:** Check environment + change security behavior
**Benign:** Check environment + change API URL (HIRT2-025)

The system correctly identifies security-relevant behavior (auth, data exposure) vs. configuration (API endpoints).

---

## Semantic Tags Used

The system extracts semantic tags from intent requirements:

| Tag | Purpose | Example Match |
|-----|---------|---------------|
| REDUCES_OBSERVABILITY | Logging/audit reduction | "reduce logging to errors" |
| ACCESSES_SENSITIVE | Reading sensitive data | "export all customer records" |
| MODIFIES_SENSITIVE | Writing sensitive data | "modify user permissions" |
| STORES_CREDENTIAL | Handling credentials | "store password in localStorage" |
| EXPORTS_DATA | Exporting data | "download backup file" |
| TRANSMITS_DATA | External transmission | "send to analytics service" |
| CHECKS_PERMISSION | Permission validation | "check if user is admin" |
| CACHES_RESULT | Storing computed result | "store result in isAdmin" |
| USES_CACHED | Reading cached data | "use cached isAdmin" |
| CHECKS_ENVIRONMENT | Environment reading | "check NODE_ENV" |
| CONDITIONAL_BEHAVIOR | Condition-dependent | "if isDevelopment is true" |
| GRANTS_ACCESS | Access provisioning | "allow user to view" |
| USER_TRIGGERED | User-initiated action | trigger.type = "click" |

---

## Conclusion

The HIC-1 compositional hostility detection system successfully achieves all success criteria:

1. ✅ **100% rejection of hostile compositions** (12/12)
2. ✅ **Zero false positives** on benign compositions (9/9)
3. ✅ **Explicit explanations** for each rejection

The system detects emergent hostility from individually admissible intents across 6 distinct composition patterns.

---

## Files

| File | Description |
|------|-------------|
| `RESEARCH_CHARTER.md` | Track definition |
| `composition-rules.md` | Formal rule specification |
| `HIRT-2_CORPUS.json` | Test corpus (21 cases) |
| `src/ial0-composition-check.ts` | TypeScript implementation |
| `hic-test-runner.js` | Test runner |
| `HIC-1_EXECUTION_RESULTS.json` | Raw execution results |
| `HIRT-2_RESULTS.md` | This document |

---

*HIC-1 Test Results v1.0.0*
*Research Track: hostile-intent-composition*
*Authority: EXPERIMENTAL*
