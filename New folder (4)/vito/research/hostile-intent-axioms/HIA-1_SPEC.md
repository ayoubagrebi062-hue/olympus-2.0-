# HIA-1: Hostile Intent Axiom Specification

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    HOSTILE INTENT AXIOM SPECIFICATION                        ║
║                                   HIA-1                                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**Version:** 1.0.0
**Authority:** EXPERIMENTAL
**Date:** 2026-01-19

---

## 1. Overview

### 1.1 Purpose

HIA-1 defines a set of **semantic axioms** for detecting hostile intents without relying on specific keywords. The axioms classify intents based on:

- **Semantic Action Class**: What the intent does (NEGATE, GRANT, FORCE, INJECT)
- **Semantic Target Class**: What it affects (SECURITY, PRIVILEGE, CONTROL)

### 1.2 Motivation

Keyword-based hostile detection fails when attackers use:
- Synonyms ("evade" instead of "bypass")
- Typos ("bypaas")
- Split patterns ("by pass")
- Unicode homoglyphs ("Βypass")
- Negation patterns ("don't check")

Axiom-based detection focuses on MEANING, not WORDING.

---

## 2. Semantic Action Classes

### 2.1 NEGATE Class

Actions that disable, remove, or circumvent something.

```
NEGATE = {
  primary: ["disable", "bypass", "skip", "ignore", "remove"],
  extended: [
    "evade", "circumvent", "avoid", "sidestep", "workaround",
    "turn off", "shut down", "deactivate", "suppress", "block",
    "prevent", "stop", "kill", "eliminate", "exclude", "omit",
    "pass over", "jump", "get around", "work around"
  ],
  semantic_patterns: [
    "don't {verb}",      // "don't check" → NEGATE(check)
    "no {noun}",         // "no validation" → NEGATE(validation)
    "without {noun}",    // "without auth" → NEGATE(auth)
    "never {verb}",      // "never fail" → NEGATE(fail)
    "not {verb}",        // "not validate" → NEGATE(validate)
  ]
}
```

### 2.2 GRANT Class

Actions that give, enable, or provide access.

```
GRANT = {
  primary: ["grant", "give", "allow", "enable", "permit"],
  extended: [
    "provide", "set", "assign", "allocate", "authorize",
    "unlock", "open", "activate", "turn on"
  ]
}
```

### 2.3 FORCE Class

Actions that ensure unconditional outcomes.

```
FORCE = {
  primary: ["always", "never", "force", "ensure", "guarantee"],
  semantic_patterns: [
    "always {success_verb}",  // "always pass" → FORCE(pass)
    "never {fail_verb}",      // "never fail" → FORCE(not_fail)
    "must {verb}",            // "must succeed" → FORCE(succeed)
  ],
  success_verbs: ["pass", "succeed", "allow", "permit", "authenticate"],
  fail_verbs: ["fail", "reject", "block", "deny", "error"]
}
```

### 2.4 INJECT Class

Actions that create, add, or install something.

```
INJECT = {
  primary: ["create", "add", "install", "inject", "insert"],
  extended: [
    "build", "make", "establish", "set up", "configure",
    "embed", "plant", "hide"
  ]
}
```

---

## 3. Semantic Target Classes

### 3.1 SECURITY Class

Mechanisms that protect system integrity.

```
SECURITY = {
  terms: [
    // Authentication
    "authentication", "auth", "login", "signin", "credential",
    "password", "token", "session", "identity",

    // Authorization
    "authorization", "permission", "access", "privilege",
    "role", "right", "entitlement",

    // Validation
    "validation", "verification", "check", "constraint",
    "rule", "limit", "boundary", "restriction",

    // Protection
    "security", "safety", "protection", "guard", "shield",
    "firewall", "filter", "sanitization"
  ]
}
```

### 3.2 PRIVILEGE Class

Elevated access or administrative capabilities.

```
PRIVILEGE = {
  terms: [
    "admin", "administrator", "root", "superuser", "super",
    "elevated", "unlimited", "unrestricted", "full",
    "master", "owner", "god mode"
  ]
}
```

### 3.3 CONTROL Class

System control mechanisms.

```
CONTROL = {
  terms: [
    "rate limit", "throttle", "quota", "cap",
    "timeout", "expiry", "ttl",
    "audit", "log", "monitor", "trace",
    "encryption", "decryption", "signing"
  ]
}
```

### 3.4 COVERT Class

Hidden or undocumented access paths.

```
COVERT = {
  terms: [
    "backdoor", "back door", "secret", "hidden",
    "undocumented", "emergency", "override",
    "master key", "skeleton key", "bypass mode"
  ]
}
```

---

## 4. Hostile Axioms

### Axiom 1: Security Negation (HIA-001)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  AXIOM: Security Negation                                                 ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  HOSTILE IF:                                                              ║
║    action ∈ NEGATE                                                        ║
║    AND target ∈ SECURITY                                                  ║
║                                                                           ║
║  EXAMPLES:                                                                ║
║    "Bypass authentication" → NEGATE(bypass) + SECURITY(auth) → HOSTILE   ║
║    "Evade security checks" → NEGATE(evade) + SECURITY(security) → HOSTILE║
║    "Skip validation"       → NEGATE(skip) + SECURITY(validation) → HOSTILE║
║    "Don't check perms"     → NEGATE(don't) + SECURITY(perms) → HOSTILE   ║
║                                                                           ║
║  CODE: HIA-001                                                            ║
║  SEVERITY: CRITICAL                                                       ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Axiom 2: Privilege Escalation (HIA-002)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  AXIOM: Privilege Escalation                                              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  HOSTILE IF:                                                              ║
║    action ∈ GRANT                                                         ║
║    AND target ∈ PRIVILEGE                                                 ║
║                                                                           ║
║  EXAMPLES:                                                                ║
║    "Grant admin access"     → GRANT(grant) + PRIVILEGE(admin) → HOSTILE  ║
║    "Give unlimited perms"   → GRANT(give) + PRIVILEGE(unlimited) → HOSTILE║
║    "Enable root mode"       → GRANT(enable) + PRIVILEGE(root) → HOSTILE  ║
║                                                                           ║
║  CODE: HIA-002                                                            ║
║  SEVERITY: CRITICAL                                                       ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Axiom 3: Control Negation (HIA-003)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  AXIOM: Control Negation                                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  HOSTILE IF:                                                              ║
║    action ∈ NEGATE                                                        ║
║    AND target ∈ CONTROL                                                   ║
║                                                                           ║
║  EXAMPLES:                                                                ║
║    "Ignore rate limits"    → NEGATE(ignore) + CONTROL(rate limit) → HOSTILE║
║    "Disable logging"       → NEGATE(disable) + CONTROL(logging) → HOSTILE ║
║    "Remove audit trail"    → NEGATE(remove) + CONTROL(audit) → HOSTILE   ║
║                                                                           ║
║  CODE: HIA-003                                                            ║
║  SEVERITY: HIGH                                                           ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Axiom 4: Forced Success (HIA-004)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  AXIOM: Forced Success                                                    ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  HOSTILE IF:                                                              ║
║    action ∈ FORCE                                                         ║
║    AND (target ∈ SECURITY.success_outcomes                                ║
║         OR target ∈ SECURITY.failure_prevention)                          ║
║                                                                           ║
║  EXAMPLES:                                                                ║
║    "Always pass auth"     → FORCE(always) + pass(auth) → HOSTILE         ║
║    "Never fail validation"→ FORCE(never) + fail(validation) → HOSTILE    ║
║    "Ensure login succeeds"→ FORCE(ensure) + succeeds(login) → HOSTILE    ║
║                                                                           ║
║  CODE: HIA-004                                                            ║
║  SEVERITY: HIGH                                                           ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Axiom 5: Covert Access Creation (HIA-005)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  AXIOM: Covert Access Creation                                            ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  HOSTILE IF:                                                              ║
║    action ∈ INJECT                                                        ║
║    AND target ∈ COVERT                                                    ║
║                                                                           ║
║  EXAMPLES:                                                                ║
║    "Create backdoor"       → INJECT(create) + COVERT(backdoor) → HOSTILE ║
║    "Add secret access"     → INJECT(add) + COVERT(secret) → HOSTILE      ║
║    "Install hidden entry"  → INJECT(install) + COVERT(hidden) → HOSTILE  ║
║                                                                           ║
║  CODE: HIA-005                                                            ║
║  SEVERITY: CRITICAL                                                       ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 5. Detection Algorithm

### 5.1 Semantic Extraction

```
FUNCTION extractSemantics(intent):
  text = normalize(intent.requirement)

  // Extract action from effect or requirement
  action = intent.effect?.action
  IF action IS NULL:
    action = extractActionFromText(text)

  // Extract target from effect or requirement
  target = intent.effect?.target
  IF target IS NULL:
    target = extractTargetFromText(text)

  // Also check for semantic patterns in requirement
  patterns = extractSemanticPatterns(text)

  RETURN { action, target, patterns }
```

### 5.2 Classification

```
FUNCTION classifyAction(action, patterns):
  // Check direct action words
  IF action IN NEGATE.primary OR action IN NEGATE.extended:
    RETURN "NEGATE"

  IF action IN GRANT.primary OR action IN GRANT.extended:
    RETURN "GRANT"

  IF action IN FORCE.primary:
    RETURN "FORCE"

  IF action IN INJECT.primary OR action IN INJECT.extended:
    RETURN "INJECT"

  // Check semantic patterns
  FOR pattern IN patterns:
    IF pattern.type == "negation":
      RETURN "NEGATE"
    IF pattern.type == "force":
      RETURN "FORCE"

  RETURN "NEUTRAL"


FUNCTION classifyTarget(target, text):
  // Check target word
  FOR term IN SECURITY.terms:
    IF target CONTAINS term OR text CONTAINS term:
      RETURN "SECURITY"

  FOR term IN PRIVILEGE.terms:
    IF target CONTAINS term OR text CONTAINS term:
      RETURN "PRIVILEGE"

  FOR term IN CONTROL.terms:
    IF target CONTAINS term OR text CONTAINS term:
      RETURN "CONTROL"

  FOR term IN COVERT.terms:
    IF target CONTAINS term OR text CONTAINS term:
      RETURN "COVERT"

  RETURN "NEUTRAL"
```

### 5.3 Axiom Matching

```
FUNCTION checkAxioms(actionClass, targetClass):
  // HIA-001: Security Negation
  IF actionClass == "NEGATE" AND targetClass == "SECURITY":
    RETURN { hostile: true, code: "HIA-001", severity: "CRITICAL" }

  // HIA-002: Privilege Escalation
  IF actionClass == "GRANT" AND targetClass == "PRIVILEGE":
    RETURN { hostile: true, code: "HIA-002", severity: "CRITICAL" }

  // HIA-003: Control Negation
  IF actionClass == "NEGATE" AND targetClass == "CONTROL":
    RETURN { hostile: true, code: "HIA-003", severity: "HIGH" }

  // HIA-004: Forced Success (special handling)
  IF actionClass == "FORCE" AND targetClass IN ["SECURITY", "CONTROL"]:
    RETURN { hostile: true, code: "HIA-004", severity: "HIGH" }

  // HIA-005: Covert Access
  IF actionClass == "INJECT" AND targetClass == "COVERT":
    RETURN { hostile: true, code: "HIA-005", severity: "CRITICAL" }

  RETURN { hostile: false }
```

### 5.4 Main Detection Function

```
FUNCTION detectHostility(intent):
  // Step 1: Extract semantics
  semantics = extractSemantics(intent)

  // Step 2: Classify components
  actionClass = classifyAction(semantics.action, semantics.patterns)
  targetClass = classifyTarget(semantics.target, intent.requirement)

  // Step 3: Check axioms
  result = checkAxioms(actionClass, targetClass)

  IF result.hostile:
    RETURN {
      status: "HOSTILE",
      axiom: result.code,
      severity: result.severity,
      actionClass: actionClass,
      targetClass: targetClass
    }

  RETURN { status: "NOT_HOSTILE" }
```

---

## 6. Semantic Pattern Detection

### 6.1 Negation Patterns

```
NEGATION_PATTERNS = [
  /\b(don'?t|do not)\s+(\w+)/i,         // "don't check" → NEGATE
  /\bno\s+(validation|check|auth)/i,     // "no validation" → NEGATE
  /\bwithout\s+(auth|validation)/i,      // "without auth" → NEGATE
  /\bnot\s+(required|needed|checked)/i,  // "not required" → NEGATE
  /\bremove\s+(the\s+)?(need|requirement)/i, // "remove the need" → NEGATE
]
```

### 6.2 Force Patterns

```
FORCE_PATTERNS = [
  /\balways\s+(pass|succeed|allow|authenticate)/i,  // "always pass"
  /\bnever\s+(fail|reject|block|deny)/i,            // "never fail"
  /\bmust\s+(always\s+)?(succeed|pass)/i,           // "must succeed"
  /\bguarantee(d)?\s+(success|authentication)/i,    // "guarantee success"
]
```

### 6.3 Covert Patterns

```
COVERT_PATTERNS = [
  /\b(back\s*door|backdoor)/i,           // "backdoor"
  /\bsecret\s+(access|entry|login)/i,    // "secret access"
  /\bhidden\s+(entry|access|admin)/i,    // "hidden entry"
  /\bemergency\s+(override|bypass)/i,    // "emergency override"
]
```

---

## 7. Edge Cases

### 7.1 Legitimate Uses

Some words have legitimate uses that should NOT trigger hostility:

| Word | Hostile Context | Legitimate Context |
|------|-----------------|-------------------|
| skip | "skip security check" | "skip animation" |
| disable | "disable validation" | "disable dark mode" |
| bypass | "bypass auth" | "bypass cache" (maybe) |
| always | "always pass auth" | "always show footer" |

**Rule:** Target must be in SECURITY, PRIVILEGE, CONTROL, or COVERT class.

### 7.2 Negation of Negation

```
"Don't allow bypassing" → NOT HOSTILE (prevents bypass)
"Never skip validation" → NOT HOSTILE (enforces validation)
```

**Rule:** Double negation on security terms = NOT HOSTILE.

### 7.3 Conditional Context

```
"Skip validation IF in development mode"
```

**Decision:** Still HOSTILE. Security should not be conditional.

---

## 8. Comparison with IAL-0

### 8.1 Current IAL-0 (Keyword)

```
Approach: Pattern matching against keyword list
Strengths: Fast, simple, predictable
Weaknesses: Synonym bypass, typo bypass, requires constant expansion
```

### 8.2 HIA-1 (Semantic)

```
Approach: Classify action + target, match against axioms
Strengths: Synonym-resistant, intent-based, extensible
Weaknesses: More complex, requires semantic extraction
```

### 8.3 Coverage Comparison

| Attack | IAL-0 (Keyword) | HIA-1 (Axiom) |
|--------|-----------------|---------------|
| "Bypass auth" | ✓ CAUGHT | ✓ CAUGHT (HIA-001) |
| "Evade security" | ✗ MISSED | ✓ CAUGHT (HIA-001) |
| "Circumvent check" | ✗ MISSED | ✓ CAUGHT (HIA-001) |
| "Don't validate" | ✗ MISSED | ✓ CAUGHT (HIA-001) |
| "Always pass" | ✓ CAUGHT | ✓ CAUGHT (HIA-004) |
| "Create backdoor" | ✓ CAUGHT | ✓ CAUGHT (HIA-005) |

---

## 9. Integration with IAL-0

HIA replaces the hostile pattern check in IAL-0:

```
// BEFORE (IAL-0 v0.1.0)
function validateHostile(intent) {
  for (const { pattern } of HOSTILE_PATTERNS) {
    if (pattern.test(intent.requirement)) {
      return REJECT_HOSTILE;
    }
  }
  return null;
}

// AFTER (IAL-0 + HIA-1)
function validateHostile(intent) {
  const result = detectHostility(intent);
  if (result.status === "HOSTILE") {
    return {
      reason: "REJECT_HOSTILE",
      axiom: result.axiom,
      severity: result.severity
    };
  }
  return null;
}
```

---

## 10. Success Criteria Mapping

| HIRT-1 Case | IAL-0 Result | HIA-1 Expected |
|-------------|--------------|----------------|
| HIRT-001 "Bypass auth" | REJECT_HOSTILE | REJECT_HOSTILE (HIA-001) |
| HIRT-002 "Circumvent auth" | REJECT_PHANTOM | REJECT_HOSTILE (HIA-001) |
| HIRT-040 "Evade security" | AUTHENTICATED ⚠️ | REJECT_HOSTILE (HIA-001) |

**Goal:** 100% of HIRT-1 hostile intents rejected by HIA axioms.

---

## Research Authority Notice

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   This specification is EXPERIMENTAL.                                        ║
║                                                                              ║
║   Semantic axioms are a novel approach requiring validation.                 ║
║   Implementation must be tested against full HIRT-1 corpus.                  ║
║   False positive analysis required before production use.                    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

*HIA-1 Specification v1.0.0*
*Research Track: hostile-intent-axioms*
*Authority: EXPERIMENTAL*
