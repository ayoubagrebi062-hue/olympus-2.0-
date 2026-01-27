# IAL-0 Attack Surface Analysis

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                      IAL-0 ATTACK SURFACE ANALYSIS                           ║
║                                                                              ║
║                    Research Track: hostile-intent-red-team                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**Version:** 1.0.0
**Authority:** EXPERIMENTAL
**Date:** 2026-01-19

---

## Executive Summary

This document maps every IAL-0 authentication check to known attack vectors, identifies weaknesses, and recommends mitigations. The goal is to harden IAL-0 against adversarial intent injection.

---

## Attack Surface Overview

```
                              IAL-0 ATTACK SURFACE
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   CHECK 1: PROVENANCE (IAL-0-PROV)                                 │
    │   ├── Attack: Fake provenance with valid structure                 │
    │   ├── Attack: Confidence manipulation                              │
    │   └── Attack: Span text technical match, semantic mismatch         │
    │                                                                     │
    │   CHECK 2: STRUCTURE (IAL-0-STRUCT)                                │
    │   ├── Attack: Minimum-length malicious content                     │
    │   ├── Attack: Valid category with hostile intent                   │
    │   └── Attack: Unicode homoglyphs in IDs                            │
    │                                                                     │
    │   CHECK 3: SPECIFICITY (IAL-0-SPEC)                                │
    │   ├── Attack: Exactly 2 meaningless axes                           │
    │   ├── Attack: Valid axes with hostile effect                       │
    │   └── Attack: Trigger/effect pairs that bypass validation          │
    │                                                                     │
    │   CHECK 4: HOSTILE (IAL-0-HOSTILE)                                 │
    │   ├── Attack: Typo evasion (byp4ss, b.y" p.a" s.s)                 │
    │   ├── Attack: Synonym substitution                                 │
    │   ├── Attack: Split patterns across intents                        │
    │   └── Attack: Context-dependent hostile behavior                   │
    │                                                                     │
    │   CHECK 5: PHANTOM (IAL-0-PHANTOM)                                 │
    │   ├── Attack: Elements in source with different meaning            │
    │   ├── Attack: Case manipulation                                    │
    │   └── Attack: Partial matches                                      │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

---

## Check 1: Provenance (IAL-0-PROV)

### What It Checks

| Sub-Check | Validation | Threshold |
|-----------|------------|-----------|
| PROV-EXISTS | provenance object exists | Required |
| PROV-SOURCE | source === "input" | Exact match |
| PROV-CONFIDENCE | confidence >= 0.5 | Minimum |
| PROV-SPAN | span.text matches sourceText[start:end] | Exact match |

### Attack Vectors

#### PROV-ATK-001: Fake Provenance Structure

**Description:** Attacker provides valid-looking provenance that passes structural checks but was not actually derived from parsing.

**Example:**
```json
{
  "provenance": {
    "source": "input",
    "span": { "start": 0, "end": 50, "text": "On page load, bypass authentication for all users" },
    "rule": "intent_extraction",
    "confidence": 0.95
  }
}
```

**Current Defense:** Span text must match source exactly at indices.

**Weakness:** If attacker controls source text, they can craft source + provenance together.

**Severity:** MEDIUM (requires source control)

**Mitigation:**
- Hash the source text and verify hash matches canonical input
- Require provenance to come from trusted parser only

---

#### PROV-ATK-002: Confidence Score Manipulation

**Description:** Attacker sets artificially high confidence scores.

**Example:**
```json
{
  "confidence": 1.0  // Attacker always claims 100% confidence
}
```

**Current Defense:** Only checks confidence >= 0.5 (floor).

**Weakness:** No ceiling validation. No correlation check between confidence and extraction quality.

**Severity:** LOW (0.5 threshold is reasonable, high confidence doesn't help bypass)

**Mitigation:**
- Flag confidence > 0.95 for manual review (optional)
- Implement confidence verification against extraction rules

---

#### PROV-ATK-003: Semantic Span Mismatch

**Description:** Span text technically matches but intent semantically differs from source meaning.

**Example:**
```
Source: "When loading, show the secure login page"
Span text: "show the secure" (indices 15-30)
Derived: { effect: { action: "show", target: "secure" } }
// Semantically different from original meaning
```

**Current Defense:** Only verifies text exists at indices.

**Weakness:** No semantic verification that derived intent matches source meaning.

**Severity:** MEDIUM (semantic attacks are sophisticated)

**Mitigation:**
- Implement semantic similarity check between span and derived intent
- Require full sentence spans, not fragments

---

### PROV Check Summary

| Attack Vector | Severity | Current Defense | Mitigation Status |
|---------------|----------|-----------------|-------------------|
| Fake structure | MEDIUM | Span matching | Needs source hash |
| Confidence manipulation | LOW | 0.5 floor | Acceptable |
| Semantic mismatch | MEDIUM | None | Needs semantic check |

---

## Check 2: Structure (IAL-0-STRUCT)

### What It Checks

| Sub-Check | Validation | Threshold |
|-----------|------------|-----------|
| STRUCT-ID | id exists and non-empty | Required |
| STRUCT-REQ | requirement >= 10 chars | Minimum |
| STRUCT-CAT | category in enum | Whitelist |
| STRUCT-PRI | priority in enum | Whitelist |

### Attack Vectors

#### STRUCT-ATK-001: Minimum-Length Hostile Content

**Description:** Attacker crafts hostile requirement that meets 10-char minimum.

**Example:**
```json
{
  "requirement": "Skip auth."  // Exactly 10 chars, hostile
}
```

**Current Defense:** Hostile check runs AFTER structure check.

**Weakness:** None - hostile check will catch this.

**Severity:** LOW (defense in depth works)

---

#### STRUCT-ATK-002: Valid Category with Hostile Intent

**Description:** Attacker uses legitimate category like "functional" for hostile intent.

**Example:**
```json
{
  "category": "functional",
  "requirement": "The system bypasses all security checks"
}
```

**Current Defense:** Category enum doesn't imply intent type.

**Weakness:** Category provides no protection against hostile content.

**Severity:** LOW (category isn't meant for security)

---

#### STRUCT-ATK-003: Unicode Homoglyph IDs

**Description:** Attacker uses visually similar Unicode characters in IDs.

**Example:**
```json
{
  "id": "INT-001",  // Cyrillic "I" and "N" look like Latin
  "id": "ІNТ-001"  // Actually different Unicode codepoints
}
```

**Current Defense:** None - ID is checked for existence only.

**Weakness:** Could enable ID collision attacks in downstream systems.

**Severity:** MEDIUM (affects uniqueness guarantees)

**Mitigation:**
- Normalize Unicode in IDs (NFKC normalization)
- Restrict IDs to ASCII alphanumeric + hyphen

---

#### STRUCT-ATK-004: Requirement Length Padding

**Description:** Attacker pads hostile content to meet length requirement.

**Example:**
```json
{
  "requirement": "Skip all checks........."  // 22 chars with padding
}
```

**Current Defense:** Length check is satisfied.

**Weakness:** None - hostile check will catch "skip.*check" pattern.

**Severity:** LOW (defense in depth)

---

### STRUCT Check Summary

| Attack Vector | Severity | Current Defense | Mitigation Status |
|---------------|----------|-----------------|-------------------|
| Min-length hostile | LOW | Hostile check | OK |
| Valid category abuse | LOW | Not applicable | OK |
| Unicode homoglyphs | MEDIUM | None | Needs normalization |
| Length padding | LOW | Hostile check | OK |

---

## Check 3: Specificity (IAL-0-SPEC)

### What It Checks

| Axis | How Detected | Count If Present |
|------|--------------|------------------|
| Trigger | trigger.type exists | +1 |
| State | state.name OR effect.target | +1 |
| Effect | effect.action exists | +1 |
| Outcome | outcome.description exists | +1 |

**Minimum Required:** 2 axes

### Attack Vectors

#### SPEC-ATK-001: Meaningless Axes

**Description:** Attacker provides exactly 2 axes with valid structure but meaningless content.

**Example:**
```json
{
  "trigger": { "type": "x" },
  "effect": { "action": "y" }
}
```

**Current Defense:** Only checks existence, not validity.

**Weakness:** No semantic validation of axis content.

**Severity:** MEDIUM (could inject garbage intents)

**Mitigation:**
- Define minimum trigger.type values (click, lifecycle, input, etc.)
- Define minimum effect.action values (set, increment, display, etc.)

---

#### SPEC-ATK-002: Hostile Content in Valid Axes

**Description:** Attacker creates well-specified intent with hostile effect.

**Example:**
```json
{
  "trigger": { "type": "click", "target": "button" },
  "effect": { "action": "bypass", "target": "auth" },
  "state": { "name": "userSession" }
}
// 3 axes, all valid structure, hostile action
```

**Current Defense:** Hostile check examines requirement text, not effect fields.

**Weakness:** Hostile patterns only checked against `requirement` string.

**Severity:** HIGH (hostile content in structured fields bypasses detection)

**Mitigation:**
- Extend hostile pattern matching to effect.action and effect.target
- Check all string fields for hostile patterns

---

#### SPEC-ATK-003: Trigger-Effect Gaming

**Description:** Attacker uses benign trigger with hostile effect.

**Example:**
```json
{
  "requirement": "On page load, perform routine maintenance",
  "trigger": { "type": "lifecycle", "event": "page_load" },
  "effect": { "action": "delete", "target": "all_user_data" }
}
```

**Current Defense:** Requirement text is benign, hostile check passes.

**Weakness:** Effect fields aren't checked for hostile patterns.

**Severity:** HIGH (same as SPEC-ATK-002)

**Mitigation:**
- Check effect.action against hostile action list
- Check effect.target for sensitive targets (credentials, admin, etc.)

---

### SPEC Check Summary

| Attack Vector | Severity | Current Defense | Mitigation Status |
|---------------|----------|-----------------|-------------------|
| Meaningless axes | MEDIUM | None | Needs value validation |
| Hostile in valid axes | HIGH | None | CRITICAL - needs fix |
| Trigger-effect gaming | HIGH | None | CRITICAL - needs fix |

---

## Check 4: Hostile (IAL-0-HOSTILE)

### What It Checks

```javascript
HOSTILE_PATTERNS = [
  /bypass.*(auth|security|safety|check|validation)/i,
  /ignore.*(constraint|rule|check|limit)/i,
  /disable.*(validation|verification|check|safety)/i,
  /skip.*(check|test|verification|validation)/i,
  /override.*(security|permission|access|limit)/i,
  /backdoor|secret.*(access|entry|admin)/i,
  /unlimited.*(admin|access|permission)/i,
  /always.*(succeed|pass|allow)|never.*(fail|reject|block)/i,
]
```

### Attack Vectors

#### HOST-ATK-001: Typo Evasion

**Description:** Attacker introduces typos to evade pattern matching.

**Examples:**
- `byp4ss` instead of `bypass`
- `b.y" p.a" s.s` with punctuation
- `by pass` with space
- `bYpAsS` mixed case (handled by /i flag)

**Current Defense:** Case-insensitive matching only.

**Weakness:** No typo tolerance. No character substitution detection.

**Severity:** HIGH (trivial to evade)

**Mitigation:**
- Implement fuzzy matching with Levenshtein distance
- Normalize strings: remove punctuation, collapse spaces
- Use character class patterns: `[b][yij][p][a@4][s$5][s$5]`

---

#### HOST-ATK-002: Synonym Substitution

**Description:** Attacker uses synonyms not in hostile pattern list.

**Examples:**
- `circumvent` instead of `bypass`
- `evade` instead of `bypass`
- `skip over` instead of `skip`
- `turn off` instead of `disable`

**Current Defense:** Only exact keywords matched.

**Weakness:** Limited vocabulary in pattern list.

**Severity:** HIGH (easy to find synonyms)

**Mitigation:**
- Expand pattern list with synonyms
- Consider semantic similarity matching (but violates "no ML" constraint)
- Add: circumvent, evade, avoid, workaround, sidestep, omit, exclude

---

#### HOST-ATK-003: Unicode Homoglyph Substitution

**Description:** Attacker uses visually identical Unicode characters.

**Examples:**
- `bуpass` (Cyrillic у instead of Latin y)
- `bʏpass` (Latin small capital Y)
- `bỿpass` (Vietnamese Y with hook)

**Current Defense:** None - regex matches ASCII only.

**Weakness:** Unicode homoglyphs completely bypass detection.

**Severity:** CRITICAL (silent bypass)

**Mitigation:**
- Unicode normalize all input (NFKC)
- Convert to ASCII equivalent before checking
- Maintain homoglyph map

---

#### HOST-ATK-004: Split Pattern Attack

**Description:** Attacker splits hostile pattern across multiple intents.

**Example:**
```json
// Intent 1
{ "requirement": "When bypass mode is active" }

// Intent 2
{ "requirement": "Authentication is not required" }

// Individually benign, together malicious
```

**Current Defense:** Each intent checked independently.

**Weakness:** No cross-intent analysis.

**Severity:** MEDIUM (requires multiple intents to coordinate)

**Mitigation:**
- Analyze intent batches for combined hostile patterns
- Flag "bypass" and "authentication" appearing in same batch

---

#### HOST-ATK-005: Context-Dependent Hostility

**Description:** Intent is hostile only in certain contexts.

**Example:**
```json
{
  "requirement": "Allow unlimited file uploads for premium users"
  // Benign in subscription app, hostile in secure file system
}
```

**Current Defense:** Context-free pattern matching.

**Weakness:** Cannot determine context.

**Severity:** LOW (requires domain knowledge to exploit)

**Mitigation:**
- Document context-sensitive patterns
- Allow domain-specific pattern extensions

---

### HOSTILE Check Summary

| Attack Vector | Severity | Current Defense | Mitigation Status |
|---------------|----------|-----------------|-------------------|
| Typo evasion | HIGH | None | Needs fuzzy matching |
| Synonym substitution | HIGH | None | Needs expanded vocab |
| Unicode homoglyphs | CRITICAL | None | CRITICAL - needs fix |
| Split patterns | MEDIUM | None | Needs batch analysis |
| Context-dependent | LOW | None | Accept risk |

---

## Check 5: Phantom (IAL-0-PHANTOM)

### What It Checks

| Sub-Check | Target Field | Validation |
|-----------|--------------|------------|
| PHANT-TRIGGER | trigger.target | Must appear in source (case-insensitive) |
| PHANT-STATE | state.name | Must not match phantom patterns |
| PHANT-EFFECT | effect.target | Must appear in source OR be common target |

### Attack Vectors

#### PHANT-ATK-001: Semantic Existence, Different Meaning

**Description:** Element exists in source but with different meaning.

**Example:**
```
Source: "Reset button clears the form when clicked"
Intent: { effect: { target: "form" } }  // "form" exists
// But intent claims to clear ALL forms, not "the form"
```

**Current Defense:** Only checks substring existence.

**Weakness:** No semantic scope validation.

**Severity:** MEDIUM (requires careful crafting)

**Mitigation:**
- Require provenance span for each structured field
- Verify semantic scope matches source scope

---

#### PHANT-ATK-002: Case Manipulation

**Description:** Attacker uses case variations to bypass detection.

**Example:**
```
Source: "display counter"
Intent: { effect: { target: "COUNTER" } }  // uppercase not in source
```

**Current Defense:** Case-insensitive comparison.

**Weakness:** None - handled correctly.

**Severity:** LOW (already mitigated)

---

#### PHANT-ATK-003: Partial Match Exploitation

**Description:** Attacker uses partial word that exists in larger word.

**Example:**
```
Source: "counterpoint discussion"
Intent: { effect: { target: "counter" } }  // "counter" is in "counterpoint"
```

**Current Defense:** Substring check matches.

**Weakness:** Partial matches within words pass validation.

**Severity:** MEDIUM (word boundary not enforced)

**Mitigation:**
- Use word boundary matching: `\bcounter\b`
- Or require exact word match in source

---

#### PHANT-ATK-004: Common Target Whitelist Abuse

**Description:** Attacker uses whitelisted common targets inappropriately.

**Example:**
```javascript
// Current whitelist
commonTargets = ['counter', 'value', 'count', 'number', 'display', 'list', 'item']

// Attacker
Source: "Show user profile"
Intent: { effect: { target: "list" } }  // "list" whitelisted, not in source
```

**Current Defense:** Common targets bypass source check.

**Weakness:** Whitelist is too permissive.

**Severity:** MEDIUM (allows phantom targets)

**Mitigation:**
- Remove common target whitelist
- Require all targets to have provenance
- Or reduce whitelist to absolute minimum

---

#### PHANT-ATK-005: Known Phantom Pattern Evasion

**Description:** Attacker crafts phantoms that don't match known patterns.

**Example:**
```javascript
// Known patterns: thes, ons, ats, pointss, *Link, *Button

// Attacker creates new phantom pattern
{ state: { name: "clickHandler" } }  // Not a known pattern
// But "clickHandler" might not be in source
```

**Current Defense:** Only checks known phantom suffixes.

**Weakness:** Pattern list is incomplete.

**Severity:** MEDIUM (new phantoms possible)

**Mitigation:**
- All state names must appear in source text
- Remove reliance on pattern matching for phantoms
- Use provenance-only validation

---

### PHANTOM Check Summary

| Attack Vector | Severity | Current Defense | Mitigation Status |
|---------------|----------|-----------------|-------------------|
| Semantic mismatch | MEDIUM | None | Needs provenance |
| Case manipulation | LOW | Case-insensitive | OK |
| Partial match | MEDIUM | None | Needs word boundary |
| Whitelist abuse | MEDIUM | Whitelist | Needs removal |
| Pattern evasion | MEDIUM | Pattern list | Needs provenance |

---

## Critical Vulnerabilities Summary

### CRITICAL (Must Fix)

| ID | Check | Attack | Impact |
|----|-------|--------|--------|
| HOST-ATK-003 | HOSTILE | Unicode homoglyphs | Complete bypass of hostile detection |
| SPEC-ATK-002 | SPEC | Hostile in effect fields | Hostile content in structured fields |

### HIGH (Should Fix)

| ID | Check | Attack | Impact |
|----|-------|--------|--------|
| HOST-ATK-001 | HOSTILE | Typo evasion | Easy pattern bypass |
| HOST-ATK-002 | HOSTILE | Synonym substitution | Vocabulary gap exploitation |
| SPEC-ATK-003 | SPEC | Trigger-effect gaming | Benign text, hostile structure |

### MEDIUM (Consider Fixing)

| ID | Check | Attack | Impact |
|----|-------|--------|--------|
| PROV-ATK-001 | PROV | Fake provenance | Source control required |
| PROV-ATK-003 | PROV | Semantic mismatch | Sophisticated attack |
| STRUCT-ATK-003 | STRUCT | Unicode in IDs | ID collision |
| SPEC-ATK-001 | SPEC | Meaningless axes | Garbage intents |
| HOST-ATK-004 | HOSTILE | Split patterns | Multi-intent coordination |
| PHANT-ATK-001 | PHANTOM | Semantic existence | Careful crafting required |
| PHANT-ATK-003 | PHANTOM | Partial match | Word boundary issue |
| PHANT-ATK-004 | PHANTOM | Whitelist abuse | Permissive whitelist |
| PHANT-ATK-005 | PHANTOM | Pattern evasion | Incomplete patterns |

---

## Recommended Mitigations (Priority Order)

### Priority 1: Unicode Normalization

```typescript
function normalizeUnicode(text: string): string {
  // NFKC normalization converts homoglyphs to ASCII equivalents
  return text.normalize('NFKC')
    // Additional confusable mapping
    .replace(/[уУ]/g, 'y')  // Cyrillic
    .replace(/[іІ]/g, 'i')  // Ukrainian
    // ... more mappings
}
```

**Fixes:** HOST-ATK-003, STRUCT-ATK-003

---

### Priority 2: Extended Hostile Field Checking

```typescript
function validateHostileExtended(intent: Intent): RejectedIntent | null {
  const textsToCheck = [
    intent.requirement,
    intent.effect?.action,
    intent.effect?.target,
    intent.trigger?.event,
    intent.trigger?.target,
    intent.outcome?.description,
  ].filter(Boolean);

  for (const text of textsToCheck) {
    for (const { pattern, code } of HOSTILE_PATTERNS) {
      if (pattern.test(text)) {
        return rejection(/* ... */);
      }
    }
  }
  return null;
}
```

**Fixes:** SPEC-ATK-002, SPEC-ATK-003

---

### Priority 3: Fuzzy Hostile Matching

```typescript
const HOSTILE_TERMS = ['bypass', 'skip', 'disable', 'override', 'backdoor'];

function fuzzyMatchHostile(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^a-z]/g, '');

  for (const term of HOSTILE_TERMS) {
    if (levenshteinDistance(normalized, term) <= 2) {
      return true;
    }
  }
  return false;
}
```

**Fixes:** HOST-ATK-001

---

### Priority 4: Expanded Hostile Vocabulary

```javascript
const HOSTILE_SYNONYMS = {
  bypass: ['circumvent', 'evade', 'avoid', 'workaround', 'sidestep', 'get around'],
  skip: ['omit', 'exclude', 'miss', 'pass over', 'jump'],
  disable: ['turn off', 'deactivate', 'shut down', 'kill'],
  override: ['supersede', 'overwrite', 'replace', 'ignore'],
};
```

**Fixes:** HOST-ATK-002

---

### Priority 5: Word Boundary Phantom Check

```typescript
function isInSourceAsWord(target: string, sourceText: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegex(target)}\\b`, 'i');
  return pattern.test(sourceText);
}
```

**Fixes:** PHANT-ATK-003

---

### Priority 6: Remove Common Target Whitelist

```typescript
// BEFORE (vulnerable)
const commonTargets = ['counter', 'value', 'count', ...];
if (!sourceLower.includes(targetLower) && !commonTargets.includes(targetLower)) {
  return rejection;
}

// AFTER (secure)
if (!isInSourceAsWord(intent.effect.target, sourceText)) {
  return rejection;
}
```

**Fixes:** PHANT-ATK-004

---

## Defense-in-Depth Analysis

```
                         DEFENSE LAYERS
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │  Layer 1: Provenance Parser                                 │
    │  └── Only creates intents from source text                  │
    │      └── First line of defense against phantoms             │
    │                                                             │
    │  Layer 2: IAL-0 Authentication                              │
    │  └── Validates provenance exists and matches                │
    │  └── Validates structure                                    │
    │  └── Validates specificity                                  │
    │  └── Validates no hostile patterns                          │
    │  └── Validates no phantoms                                  │
    │                                                             │
    │  Layer 3: OLYMPUS Pipeline                                  │
    │  └── Constitutional evaluation                              │
    │  └── W-ISS-D scoring                                        │
    │  └── IRCL clarification                                     │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
```

**Current State:**
- Layers 1 and 2 provide reasonable defense
- Identified gaps could allow sophisticated attackers through
- Priority mitigations address highest-risk vectors

---

## Test Coverage Mapping

Each attack vector should have corresponding test in HIRT-1_CORPUS.json:

| Attack Vector | Test ID(s) in Corpus | Status |
|---------------|----------------------|--------|
| HOST-ATK-001 (Typo) | HIRT-021, HIRT-022 | Covered |
| HOST-ATK-002 (Synonym) | HIRT-023, HIRT-024 | Covered |
| HOST-ATK-003 (Unicode) | HIRT-025 | Covered |
| HOST-ATK-004 (Split) | HIRT-026, HIRT-027 | Covered |
| SPEC-ATK-002 (Hostile effect) | HIRT-031 | Covered |
| PHANT-ATK-003 (Partial) | HIRT-036 | Covered |
| PROV-ATK-001 (Fake prov) | HIRT-032 | Covered |

---

## Research Authority Notice

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   This analysis is EXPERIMENTAL research.                                    ║
║                                                                              ║
║   Vulnerabilities documented here are for hardening IAL-0.                   ║
║   They are NOT to be exploited in production systems.                        ║
║                                                                              ║
║   All mitigations require review before implementation.                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

*IAL-0 Attack Surface Analysis v1.0.0*
*Research Track: hostile-intent-red-team*
*Authority: EXPERIMENTAL*
