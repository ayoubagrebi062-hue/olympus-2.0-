# Shadow Stress Campaign SSC-1: Summary Report

**Campaign ID:** SSC-1
**Status:** ABORTED
**Start:** 2026-01-19T07:42:14.426Z
**End:** 2026-01-19T07:42:14.429Z

---

## Executive Summary

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                         SSC-1 CAMPAIGN RESULTS                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Total Processed:     2          / 10,000                          ║
║  Campaign Status:     ABORTED (S4 detected)                          ║
║  S4 Count:            1          (Fatal Threshold: 0)               ║
║  S3 Rate:             0.0000    % (Threshold: 0.1%)                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Verdict Distribution

| Class | Count | Percentage | Description |
|-------|-------|------------|-------------|
| S1 | 1 | 50.00% | Agreement |
| S2 | 0 | 0.00% | Benign Divergence (shadow stricter) |
| S3 | 0 | 0.00% | Sensitivity Gap (shadow permissive) |
| S4 | 1 | 50.00% | Critical Failure |

**Total Divergence Rate:** 50.00%

---

## Causal Layer Frequency

| Layer | Rejections | Percentage |
|-------|------------|------------|
| IAL0_AUTHENTICATOR | 0 | 0.00% |
| HIA1_DETECTOR | 0 | 0.00% |
| HIC1_CHECKER | 0 | 0.00% |
| AGREEMENT | 2 | 100.00% |

---

## Rule Trigger Ranking

| Rank | Rule ID | Triggers | Percentage |
|------|---------|----------|------------|


---

## Source Breakdown

| Source | Total | S1 | S2 | S3 | S4 |
|--------|-------|----|----|----|----|
| production-mirror | 0 | 0 | 0 | 0 | 0 |
| synthetic-adversarial | 2 | 1 | 0 | 0 | 1 |
| canonical-rejects | 0 | 0 | 0 | 0 | 0 |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Average Latency | 1.00 ms |
| Replay Hash Collisions | 0 |
| Unique Inputs | 2 |
| Determinism Rate | 100% |

---

## Constraint Verification

| Constraint | Status |
|------------|--------|
| SMC-1 Locked | ✓ VERIFIED |
| VAL-1 Required | ✓ VERIFIED |
| No Logic Changes | ✓ VERIFIED |

---


## Abort Details

**Reason:** S4 detected on request 43378546-e6ed-4e77-85ab-61ecba7ea207

Campaign was immediately aborted per SMC-1 Article III (Fatal Conditions).


*Report generated: 2026-01-19T07:42:14.429Z*
*Campaign: SSC-1*
