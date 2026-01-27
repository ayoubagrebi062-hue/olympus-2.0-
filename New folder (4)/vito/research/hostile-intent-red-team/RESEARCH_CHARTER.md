# RESEARCH TRACK: hostile-intent-red-team

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                          RESEARCH TRACK                                       ║
║                    hostile-intent-red-team (HIRT)                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Status: ACTIVE                                                              ║
║  Authority: EXPERIMENTAL                                                     ║
║  Created: 2026-01-19                                                         ║
║  Depends On: intent-authentication-layer, semantic-intent-fidelity           ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Objective

**Break IAL-0 under adversarial intent input.**

This research track applies red team methodology to test the Intent Authentication Layer. We will craft adversarial intents specifically designed to:
1. Bypass IAL-0 checks
2. Smuggle hostile content through authentication
3. Exploit edge cases in phantom detection
4. Circumvent specificity requirements

---

## Adversarial Mindset

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   "If we can't break it, we can't trust it."                    │
│                                                                 │
│   The goal is NOT to prove IAL-0 works.                         │
│   The goal is to find every way it can fail.                    │
│                                                                 │
│   A single false admission = system compromise.                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Attack Vectors to Test

### Category 1: Provenance Evasion
- Fake provenance with valid-looking structure
- Confidence score manipulation
- Span text that technically matches but semantically differs

### Category 2: Structure Smuggling
- Minimum-length requirements that are malicious
- Valid category/priority with hostile content
- Unicode homoglyphs in IDs

### Category 3: Specificity Gaming
- Exactly 2 axes with hostile content
- Axes that pass check but are meaningless
- Trigger/effect pairs that bypass validation

### Category 4: Hostile Pattern Evasion
- Obfuscated hostile terms (typos, synonyms)
- Split hostile patterns across intents
- Context-dependent hostile behavior

### Category 5: Phantom Injection
- Elements that exist in source but have different meaning
- Case manipulation to bypass detection
- Partial matches that slip through

---

## Inputs

| Input | Source | Purpose |
|-------|--------|---------|
| IAL-0 Spec | `research/intent-authentication-layer/*` | Understand checks to bypass |
| Provenance Parser | `research/semantic-intent-fidelity/*` | Understand provenance format |
| Canonical Corpus | `corpus/*` | Baseline for comparison |

---

## Deliverables

### 1. HIRT-1_CORPUS.json
Hostile intent corpus containing:
- 50+ adversarial intents across all attack categories
- Each intent labeled with attack vector
- Expected rejection type (or SHOULD_REJECT if bypass found)

### 2. HIRT-1_RESULTS.md
Test execution results:
- Pass/fail for each hostile intent
- Any false admissions documented
- Recommendations for IAL-0 hardening

### 3. IAL-0_ATTACK_SURFACE.md
Attack surface analysis:
- Each IAL-0 check mapped to attack vectors
- Weakness assessment
- Mitigation recommendations

### 4. REJECT_RATE_MATRIX.md
Matrix showing:
- Rejection rates by attack category
- Rejection rates by rejection type
- Coverage analysis

---

## Constraints

| Constraint | Rationale |
|------------|-----------|
| **Deterministic only** | Same input must produce same result |
| **No ML** | Adversarial testing must be reproducible |
| **No canonical changes** | Repository is FROZEN |

---

## Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| **100% hostile rejection** | Every crafted hostile intent must be rejected or quarantined |
| **Zero false admissions** | No hostile intent passes through to OLYMPUS |
| **Taxonomy coverage** | Every failure has explicit category in rejection taxonomy |

---

## Failure Conditions

If ANY of these occur, HIRT-1 has identified a vulnerability:

1. **False Admission**: Hostile intent passes IAL-0
2. **Wrong Rejection**: Intent rejected for wrong reason (suggests detection gap)
3. **Undefined Behavior**: Intent causes crash or unexpected state
4. **Coverage Gap**: Hostile intent type not covered by rejection taxonomy

---

## Red Team Methodology

### Phase 1: Reconnaissance
- Study IAL-0 spec and implementation
- Identify check boundaries
- Map rejection paths

### Phase 2: Corpus Development
- Create adversarial intents for each attack vector
- Label expected outcomes
- Include edge cases

### Phase 3: Execution
- Run corpus through IAL-0
- Record all results
- Document any bypasses

### Phase 4: Analysis
- Calculate rejection rates
- Identify weaknesses
- Recommend mitigations

---

## Research Authority Notice

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   This research track is EXPERIMENTAL.                                       ║
║                                                                              ║
║   Red team testing is authorized within research boundaries.                 ║
║   Findings must be documented, not exploited.                                ║
║   Vulnerabilities must be reported with mitigations.                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

*Research Track: hostile-intent-red-team*
*Version: 1.0.0-research*
*Authority: EXPERIMENTAL*
