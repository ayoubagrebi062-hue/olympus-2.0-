# RESEARCH TRACK: hostile-intent-axioms

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                          RESEARCH TRACK                                       ║
║                     hostile-intent-axioms (HIA)                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Status: ACTIVE                                                              ║
║  Authority: EXPERIMENTAL                                                     ║
║  Created: 2026-01-19                                                         ║
║  Depends On: intent-authentication-layer, hostile-intent-red-team            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Objective

**Define semantic hostile intent classes independent of wording.**

The current IAL-0 hostile detection relies on keyword matching. HIRT-1 demonstrated this is insufficient - the synonym "evade" bypassed detection because it wasn't in the keyword list.

This research track develops **semantic axioms** that detect hostility based on:
- What the intent DOES (behavior)
- What it AFFECTS (target)
- What CONSEQUENCE it produces (outcome)

NOT based on:
- Specific words used
- Keyword patterns
- Regex matching

---

## The Problem

### Current Approach (Keyword-Based)

```javascript
// IAL-0 Current Implementation
HOSTILE_PATTERNS = [
  /bypass.*(auth|security)/i,  // Catches "bypass"
  /skip.*(check|validation)/i, // Catches "skip"
  // ...
]

// Vulnerability: Synonyms bypass detection
"Evade security checks" → AUTHENTICATED ⚠️
"Circumvent authentication" → AUTHENTICATED ⚠️
"Sidestep validation" → AUTHENTICATED ⚠️
```

### Proposed Approach (Axiom-Based)

```
HOSTILE AXIOM: Security Negation

An intent is HOSTILE if:
  - Effect targets a SECURITY MECHANISM
  - Effect action NEGATES or DISABLES the mechanism
  - Regardless of specific words used

Examples detected:
  "Bypass authentication" → HOSTILE (action=bypass, target=auth)
  "Evade security checks" → HOSTILE (action=evade, target=security)
  "Turn off validation" → HOSTILE (action=disable, target=validation)
  "Don't check permissions" → HOSTILE (action=negate, target=permission)
```

---

## Axiom Categories

### Category 1: Security Negation

Any intent that disables, bypasses, or negates a security mechanism.

| Component | Semantic Class |
|-----------|----------------|
| **Targets** | authentication, authorization, validation, verification, permission, access control, rate limiting, encryption, audit, logging |
| **Actions** | disable, bypass, skip, evade, circumvent, ignore, negate, remove, turn off, deactivate, suppress |

### Category 2: Privilege Escalation

Any intent that grants elevated access beyond normal scope.

| Component | Semantic Class |
|-----------|----------------|
| **Targets** | admin, root, superuser, elevated, unlimited, unrestricted |
| **Actions** | grant, give, set, escalate, promote, enable |

### Category 3: Unconditional Success

Any intent that forces success regardless of conditions.

| Component | Semantic Class |
|-----------|----------------|
| **Patterns** | always pass, always succeed, always allow, never fail, never reject, never block |

### Category 4: Covert Access

Any intent that creates hidden or undocumented access.

| Component | Semantic Class |
|-----------|----------------|
| **Targets** | backdoor, secret, hidden, undocumented, emergency override |
| **Actions** | create, install, inject, add |

---

## Semantic Detection Algorithm

```
FUNCTION detectHostility(intent):

  // Step 1: Extract semantic components
  action = extractAction(intent.effect.action, intent.requirement)
  target = extractTarget(intent.effect.target, intent.requirement)

  // Step 2: Classify components
  actionClass = classifyAction(action)  // e.g., NEGATE, GRANT, FORCE
  targetClass = classifyTarget(target)  // e.g., SECURITY, PRIVILEGE, ACCESS

  // Step 3: Check axioms
  FOR each axiom IN HOSTILE_AXIOMS:
    IF axiom.matches(actionClass, targetClass):
      RETURN HOSTILE with axiom.code

  // Step 4: No axiom matched
  RETURN NOT_HOSTILE
```

---

## Inputs

| Input | Source | Purpose |
|-------|--------|---------|
| IAL-0 Spec | `research/intent-authentication-layer/*` | Current hostility detection |
| HIRT-1 Corpus | `research/hostile-intent-red-team/*` | Test cases including bypasses |
| HIRT-1 Results | `research/hostile-intent-red-team/HIRT-1_RESULTS.md` | Known gaps to fix |

---

## Deliverables

### 1. HIA-1_SPEC.md
Formal specification of semantic hostility axioms:
- Complete axiom definitions
- Semantic classification rules
- Detection algorithm

### 2. hostile-axioms.json
Machine-readable axiom definitions:
- Action classifications
- Target classifications
- Axiom rules with codes

### 3. ial0-semantic-hostility.ts
Implementation that replaces keyword matching:
- Semantic action extractor
- Semantic target classifier
- Axiom-based hostility detection
- Drop-in replacement for current hostile check

### 4. HIRT-1_REPLAY_HIA.md
Re-execution of HIRT-1 corpus with HIA:
- All 40 intents re-tested
- Focus on previously bypassed cases
- Verify 100% hostile rejection
- Verify no new false positives

---

## Constraints

| Constraint | Rationale |
|------------|-----------|
| **Deterministic only** | Same input must produce same result |
| **No ML** | Classification must be rule-based, reproducible |
| **No canonical changes** | Repository is FROZEN |

---

## Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| **100% HIRT-1 rejection** | All hostile intents rejected, including HIRT-040 (evade) |
| **No new false positives** | Legitimate intents still authenticate |
| **Keyword independence** | Detection works for any synonym |

---

## Key Innovation

The key insight is that **hostility is semantic, not lexical**.

An intent is hostile because of what it DOES, not how it's WORDED.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   KEYWORD APPROACH:                                             │
│   "Does the text contain 'bypass'?"                             │
│   ✗ Fails for synonyms, typos, obfuscation                      │
│                                                                 │
│   AXIOM APPROACH:                                               │
│   "Does the intent NEGATE a SECURITY MECHANISM?"                │
│   ✓ Works regardless of wording                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Research Authority Notice

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   This research track is EXPERIMENTAL.                                       ║
║                                                                              ║
║   Axiom-based detection is a novel approach.                                 ║
║   Results must be validated against canonical corpus.                        ║
║   False positive analysis required before integration.                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

*Research Track: hostile-intent-axioms*
*Version: 1.0.0-research*
*Authority: EXPERIMENTAL*
