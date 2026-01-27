# OLYMPUS 2.0 CANONICAL FREEZE

**Effective Date:** 2026-01-19
**Status:** ACTIVE
**Authority:** PERMANENT

---

## Freeze Declaration

OLYMPUS 2.0 is hereby frozen as the canonical reference implementation.

This freeze means:

- The architecture is complete
- The pipeline is final
- The guarantees are binding

---

## What Is Permitted

### 1. Bug Fixes

- Correct incorrect behavior that violates documented guarantees
- Fix edge cases that cause incorrect scores
- Resolve crashes or hangs

**Requirement:** Bug fixes must not change:

- Pipeline step order
- Scoring formulas
- Fate assignment logic
- Ship/block decision criteria

### 2. Security Hardening

- Fix vulnerabilities in file I/O
- Harden against injection attacks
- Improve error handling for malformed input

**Requirement:** Security fixes must not introduce:

- New dependencies
- External network calls
- Non-deterministic behavior

### 3. Performance Optimization

- Reduce computation time
- Improve memory usage
- Optimize file operations

**Requirement:** Optimizations must maintain:

- Identical outputs for identical inputs
- Same gate pass/fail decisions
- Same fate assignments

---

## What Is FORBIDDEN

### 1. No Experimental Logic

Experimental features are prohibited in canonical code.

**Violations include:**

- A/B testing of scoring algorithms
- Feature flags for behavior changes
- Conditional execution based on environment
- "Try this new approach" code paths

### 2. No Machine Learning

ML/AI inference is prohibited in canonical scoring.

**Violations include:**

- Neural network scoring
- LLM-based intent classification
- Embedding similarity for matching
- Probabilistic classifiers
- Learned thresholds

### 3. No Heuristics

Heuristic approximations are prohibited.

**Violations include:**

- "Good enough" matching
- Fuzzy thresholds
- Adaptive scoring
- Sampling-based estimation
- Statistical inference

### 4. No Bypass Mechanisms

Safety bypass mechanisms are prohibited.

**Violations include:**

- `--skip-hostile-tests` flags
- `OLYMPUS_DISABLE_CHECKS=1` env vars
- Admin override for blocked builds
- "Force ship" options
- Debug modes that skip gates

---

## Enforcement

### Code Review Requirements

All changes to canonical code must:

1. State which permitted category they fall under
2. Prove they do not violate forbidden categories
3. Include before/after test output comparison
4. Pass all existing hostile intent tests

### Automated Checks

The build system must verify:

- No imports from `/research`
- No new scoring formulas
- No ML library dependencies
- No random number generation
- No network calls during scoring

### Violation Handling

If a violation is detected:

1. Build fails immediately
2. Error logged as `CANONICAL_FREEZE_VIOLATION`
3. Change cannot be merged
4. No exceptions granted

---

## Escape Hatch: Research Track

If you need to experiment with:

- New scoring approaches
- ML-based classification
- Heuristic optimizations
- Alternative architectures

Use the `/research` track. See `research/RESEARCH_CHARTER.md`.

Research code:

- Cannot affect canonical builds
- Cannot claim authority
- Cannot ship by definition
- Must graduate through protocol to become canonical

---

## Freeze Integrity

This document itself is frozen.

Changes to `CANONICAL_FREEZE.md` require:

1. Explicit user approval
2. Documented justification
3. Version bump to OLYMPUS 3.0

The freeze cannot be weakened, only replaced.

---

## Attestation

By using OLYMPUS 2.0 canonical, you attest that:

- You will not circumvent freeze rules
- You understand experimental code belongs in `/research`
- You accept that blocked builds cannot be forced
- You will report freeze violations

---

_OLYMPUS 2.0 - Frozen by design, not by neglect._
