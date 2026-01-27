# Composition Rules Specification (HIC-1)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              HOSTILE INTENT COMPOSITION RULES                                ║
║                              HIC-1                                           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**Version:** 1.0.0
**Authority:** EXPERIMENTAL
**Date:** 2026-01-19

---

## 1. Overview

### 1.1 The Composition Problem

Individual intents may pass all single-intent checks but become hostile when combined:

```
Intent A: [ADMISSIBLE by HIA-1]
Intent B: [ADMISSIBLE by HIA-1]
Intent A + Intent B: [HOSTILE by HIC-1]
```

### 1.2 Key Insight

Hostility emerges from **relationships** between intents:
- One intent **enables** another
- One intent **covers** another
- One intent **exposes** another's data
- Multiple intents **accumulate** beyond threshold

---

## 2. Semantic Tags

Each admissible intent is tagged with semantic properties used for composition analysis.

### 2.1 Action Tags

| Tag | Description | Examples |
|-----|-------------|----------|
| `REDUCES_OBSERVABILITY` | Decreases logging, monitoring, or audit | "Log errors only", "Reduce trace level" |
| `ACCESSES_SENSITIVE` | Reads sensitive data | "Access user records", "Read financial data" |
| `MODIFIES_SENSITIVE` | Writes sensitive data | "Update user profile", "Change permissions" |
| `STORES_CREDENTIAL` | Handles credentials | "Save password", "Cache token" |
| `EXPORTS_DATA` | Sends data outside system | "Download report", "Export to file" |
| `TRANSMITS_DATA` | Sends data to external service | "Send to API", "Post to webhook" |
| `CHECKS_PERMISSION` | Validates access rights | "Check if user is admin", "Verify permission" |
| `CACHES_RESULT` | Stores computed result | "Cache auth result", "Store permission" |
| `USES_CACHED` | Uses previously stored result | "Use cached permission", "Read stored auth" |
| `SETS_MODE` | Changes system mode/state | "Enable debug mode", "Set environment" |
| `READS_MODE` | Reads system mode/state | "Check if debug", "Get environment" |
| `GRANTS_ACCESS` | Gives access to resource | "Allow read access", "Grant permission" |
| `ELEVATES_CONTEXT` | Increases privilege level | "Run as admin", "Use elevated context" |
| `CHECKS_ENVIRONMENT` | Reads environment variable | "Check if production", "Get NODE_ENV" |
| `CONDITIONAL_BEHAVIOR` | Behavior depends on condition | "If dev mode, then...", "When admin..." |

### 2.2 Resource Tags

| Tag | Description | Examples |
|-----|-------------|----------|
| `CREDENTIAL` | Authentication credentials | Passwords, tokens, API keys |
| `PII` | Personally identifiable information | Names, emails, addresses |
| `FINANCIAL` | Financial data | Account numbers, transactions |
| `HEALTH` | Health information | Medical records |
| `SECURITY_CONFIG` | Security configuration | Permissions, roles, policies |
| `SYSTEM_CONFIG` | System configuration | Environment, settings |
| `AUDIT_LOG` | Audit/logging data | Logs, traces, metrics |

---

## 3. Composition Rules

### HIC-001: Observability Reduction + Sensitive Access

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  RULE: Blind Spot Attack                                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  HOSTILE IF:                                                                  ║
║    Intent A has tag REDUCES_OBSERVABILITY                                     ║
║    AND Intent B has tag ACCESSES_SENSITIVE or MODIFIES_SENSITIVE              ║
║                                                                               ║
║  RATIONALE:                                                                   ║
║    Accessing sensitive data while observability is reduced creates            ║
║    conditions for undetected data theft or manipulation.                      ║
║                                                                               ║
║  EXAMPLES:                                                                    ║
║    A: "Reduce logging to errors only"                                         ║
║    B: "Export all customer records to CSV"                                    ║
║    → HOSTILE: Data exfiltration while logging reduced                         ║
║                                                                               ║
║  CODE: HIC-001                                                                ║
║  SEVERITY: CRITICAL                                                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

**Detection:**
```
IF any(intent.tags.REDUCES_OBSERVABILITY)
   AND any(intent.tags.ACCESSES_SENSITIVE OR intent.tags.MODIFIES_SENSITIVE):
   RETURN HOSTILE(HIC-001)
```

---

### HIC-002: State Elevation + Privilege-Dependent Action

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  RULE: Privilege Escalation Chain                                             ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  HOSTILE IF:                                                                  ║
║    Intent A sets a state variable representing privilege/mode                 ║
║    AND Intent B reads that state to enable privileged action                  ║
║    AND the state transition is user-controllable                              ║
║                                                                               ║
║  RATIONALE:                                                                   ║
║    User-controllable privilege flags create privilege escalation paths.       ║
║                                                                               ║
║  EXAMPLES:                                                                    ║
║    A: "When user clicks debug button, set debugMode to true"                  ║
║    B: "When debugMode is true, show all user data without filtering"          ║
║    → HOSTILE: User can enable debug mode to access unfiltered data            ║
║                                                                               ║
║  CODE: HIC-002                                                                ║
║  SEVERITY: CRITICAL                                                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

**Detection:**
```
IF intent_A.effect.target == state_variable
   AND intent_A.trigger.type == user_action (click, input, etc.)
   AND intent_B references state_variable
   AND intent_B.tags.ACCESSES_SENSITIVE OR intent_B.tags.ELEVATES_CONTEXT:
   RETURN HOSTILE(HIC-002)
```

---

### HIC-003: Credential Storage + Data Export

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  RULE: Credential Exfiltration Risk                                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  HOSTILE IF:                                                                  ║
║    Intent A stores credentials in accessible location                         ║
║    AND Intent B exports or transmits data from that location                  ║
║                                                                               ║
║  RATIONALE:                                                                   ║
║    Credentials stored where they can be exported creates exfiltration path.   ║
║                                                                               ║
║  EXAMPLES:                                                                    ║
║    A: "Store user password in localStorage for convenience"                   ║
║    B: "Export all localStorage to backup file"                                ║
║    → HOSTILE: Passwords exported to file                                      ║
║                                                                               ║
║  CODE: HIC-003                                                                ║
║  SEVERITY: CRITICAL                                                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

**Detection:**
```
IF intent_A.tags.STORES_CREDENTIAL
   AND intent_A.effect.target == storage_location
   AND intent_B.tags.EXPORTS_DATA OR intent_B.tags.TRANSMITS_DATA
   AND intent_B reads from storage_location or reads "all":
   RETURN HOSTILE(HIC-003)
```

---

### HIC-004: Temporal Permission Decoupling (TOCTOU)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  RULE: Time-of-Check-to-Time-of-Use                                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  HOSTILE IF:                                                                  ║
║    Intent A checks permission and stores result                               ║
║    AND Intent B uses stored result without re-checking                        ║
║    AND there is temporal separation between A and B                           ║
║                                                                               ║
║  RATIONALE:                                                                   ║
║    Cached permissions can become stale, allowing unauthorized access          ║
║    if permission is revoked between check and use.                            ║
║                                                                               ║
║  EXAMPLES:                                                                    ║
║    A: "On login, check if user is admin and store in userIsAdmin"             ║
║    B: "When accessing admin panel, use userIsAdmin without re-checking"       ║
║    → HOSTILE: Admin permission persists even if revoked                       ║
║                                                                               ║
║  CODE: HIC-004                                                                ║
║  SEVERITY: HIGH                                                               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

**Detection:**
```
IF intent_A.tags.CHECKS_PERMISSION AND intent_A.tags.CACHES_RESULT
   AND intent_A.effect.target == permission_variable
   AND intent_B.tags.USES_CACHED
   AND intent_B references permission_variable
   AND intent_B has different trigger than intent_A:
   RETURN HOSTILE(HIC-004)
```

---

### HIC-005: Access Accumulation

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  RULE: Scope Creep                                                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  HOSTILE IF:                                                                  ║
║    Multiple intents each grant access to resources                            ║
║    AND combined access exceeds reasonable threshold                           ║
║                                                                               ║
║  RATIONALE:                                                                   ║
║    Many small grants can accumulate to excessive access.                      ║
║                                                                               ║
║  EXAMPLES:                                                                    ║
║    A: "Allow user to read their own profile"                                  ║
║    B: "Allow user to read profiles of connections"                            ║
║    C: "Allow user to connect with anyone"                                     ║
║    → HOSTILE: User can read ANY profile through transitive access             ║
║                                                                               ║
║  THRESHOLDS:                                                                  ║
║    - 3+ intents granting access to same resource type: WARNING                ║
║    - Transitive access path to "all" or "*": HOSTILE                          ║
║                                                                               ║
║  CODE: HIC-005                                                                ║
║  SEVERITY: HIGH                                                               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

**Detection:**
```
access_grants = intents.filter(i => i.tags.GRANTS_ACCESS)
IF access_grants.length >= 3:
   combined_scope = union(access_grants.map(g => g.scope))
   IF combined_scope.includes("*") OR combined_scope.includes("all"):
      RETURN HOSTILE(HIC-005)
   IF forms_transitive_path(access_grants):
      RETURN HOSTILE(HIC-005)
```

---

### HIC-006: Environment-Conditional Security

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  RULE: Environment-Dependent Security Hole                                    ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  HOSTILE IF:                                                                  ║
║    Intent A checks environment (dev, test, production, etc.)                  ║
║    AND Intent B changes security-relevant behavior based on environment       ║
║                                                                               ║
║  RATIONALE:                                                                   ║
║    Security should not be conditional on environment. Development             ║
║    bypasses can leak to production.                                           ║
║                                                                               ║
║  EXAMPLES:                                                                    ║
║    A: "Check if environment is development"                                   ║
║    B: "If development, allow login without password"                          ║
║    → HOSTILE: Environment variable controls authentication                    ║
║                                                                               ║
║  CODE: HIC-006                                                                ║
║  SEVERITY: CRITICAL                                                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

**Detection:**
```
IF intent_A.tags.CHECKS_ENVIRONMENT
   AND intent_B.tags.CONDITIONAL_BEHAVIOR
   AND intent_B.condition references environment
   AND intent_B affects security-relevant resource:
   RETURN HOSTILE(HIC-006)
```

---

## 4. Tag Extraction Rules

### 4.1 REDUCES_OBSERVABILITY Detection

```javascript
const OBSERVABILITY_REDUCTION_PATTERNS = [
  /\b(reduce|decrease|lower|minimize)\s+(log|logging|trace|tracing|monitoring)/i,
  /\b(log|trace|monitor)\s+(only\s+)?(error|critical|warning)/i,
  /\b(disable|turn off)\s+(verbose|debug)\s+(log|logging|mode)/i,
  /\bsilent\s+mode/i,
  /\bquiet\s+(log|logging|output)/i,
];
```

**Not REDUCES_OBSERVABILITY:**
- "Log user actions" (increases observability)
- "Enable verbose logging" (increases)
- "Display error messages to user" (UI, not observability)

### 4.2 ACCESSES_SENSITIVE Detection

```javascript
const SENSITIVE_ACCESS_PATTERNS = [
  /\b(access|read|get|fetch|retrieve|query)\s+(all\s+)?(user|customer|patient|client)/i,
  /\b(access|read|get|fetch|retrieve|query)\s+(all\s+)?(record|data|information)/i,
  /\b(export|download)\s+(all\s+)?(user|customer|patient)/i,
  /\b(financial|medical|health|personal)\s+(record|data|information)/i,
];

const SENSITIVE_RESOURCE_TERMS = [
  'user', 'customer', 'patient', 'employee', 'member',
  'financial', 'medical', 'health', 'personal', 'private',
  'password', 'credential', 'token', 'secret', 'key',
  'ssn', 'social security', 'credit card', 'bank account',
];
```

### 4.3 STORES_CREDENTIAL Detection

```javascript
const CREDENTIAL_STORAGE_PATTERNS = [
  /\b(store|save|cache|keep|persist|remember)\s+.*(password|credential|token|secret|key)/i,
  /\b(password|credential|token|secret|key)\s+.*(store|save|cache|keep|persist)/i,
  /\blocalstorage\s*\[.*(password|token|credential)/i,
];
```

### 4.4 CHECKS_ENVIRONMENT Detection

```javascript
const ENVIRONMENT_CHECK_PATTERNS = [
  /\b(check|get|read|if)\s+.*(environment|env|NODE_ENV|RAILS_ENV)/i,
  /\b(development|production|staging|test)\s+(mode|environment)/i,
  /\bprocess\.env\./i,
  /\bif\s+.*(dev|prod|staging|test)\s+(mode|environment|true|false)/i,
];
```

---

## 5. Composition Analysis Algorithm

### 5.1 Main Detection Function

```
FUNCTION analyzeComposition(intents: Intent[]): CompositionResult
  // Step 1: Tag each intent
  taggedIntents = intents.map(i => extractTags(i))

  // Step 2: Check each composition rule
  violations = []

  FOR rule IN [HIC-001, HIC-002, HIC-003, HIC-004, HIC-005, HIC-006]:
    result = checkRule(rule, taggedIntents)
    IF result.hostile:
      violations.push(result)

  // Step 3: Return result
  IF violations.length > 0:
    RETURN {
      hostile: true,
      violations: violations,
      explanation: generateExplanation(violations)
    }

  RETURN { hostile: false }
```

### 5.2 Tag Extraction

```
FUNCTION extractTags(intent: Intent): TaggedIntent
  tags = []
  text = intent.requirement

  // Check each tag pattern
  IF matchesAny(text, OBSERVABILITY_REDUCTION_PATTERNS):
    tags.push('REDUCES_OBSERVABILITY')

  IF matchesAny(text, SENSITIVE_ACCESS_PATTERNS):
    tags.push('ACCESSES_SENSITIVE')

  IF matchesAny(text, CREDENTIAL_STORAGE_PATTERNS):
    tags.push('STORES_CREDENTIAL')

  // ... check other patterns

  RETURN { ...intent, tags }
```

### 5.3 State Flow Analysis

```
FUNCTION buildStateFlowGraph(intents: TaggedIntent[]): StateGraph
  graph = new Graph()

  FOR intent IN intents:
    // Add state writes
    IF intent.effect?.action == 'set':
      graph.addNode(intent.effect.target, { writer: intent })

    // Add state reads (from conditions, requirements)
    FOR stateRef IN extractStateReferences(intent):
      graph.addEdge(stateRef, intent.id, { type: 'reads' })

  RETURN graph
```

---

## 6. Explanation Generation

Each rejection must include explicit explanation:

```
HOSTILE COMPOSITION DETECTED

Rule: HIC-001 (Blind Spot Attack)
Severity: CRITICAL

Contributing Intents:
  [1] INT-001: "Reduce logging to errors only for performance"
      Tags: [REDUCES_OBSERVABILITY]

  [2] INT-005: "Export all customer records to CSV for analysis"
      Tags: [ACCESSES_SENSITIVE, EXPORTS_DATA]

Explanation:
  Intent INT-001 reduces observability by limiting logging.
  Intent INT-005 accesses sensitive customer data and exports it.
  Combined: Sensitive data export while logging is reduced creates
  conditions for undetected data exfiltration.

Recommendation:
  - Do not reduce observability when sensitive data operations are present
  - Ensure full audit logging for all sensitive data access
  - Consider separating these intents into different operational contexts
```

---

## 7. Edge Cases

### 7.1 Order Independence

Composition rules are **order-independent**. Intent A before B is equivalent to B before A for detection purposes.

### 7.2 Same Intent Contributing to Multiple Rules

An intent may contribute to multiple rule violations. All violations are reported.

### 7.3 Benign Compositions

Not all combinations are hostile. Two intents accessing different non-sensitive resources are benign.

### 7.4 Legitimate Exceptions

Some apparent violations may be legitimate in context:
- Reducing logging + accessing logs (not sensitive data)
- Caching permission + using within same request lifecycle (no temporal gap)

---

## 8. Success Criteria

| Metric | Target |
|--------|--------|
| Hostile composition detection | 100% |
| False positive rate | 0% |
| Explanation quality | Every rejection has clear explanation |

---

*HIC-1 Composition Rules v1.0.0*
*Research Track: hostile-intent-composition*
*Authority: EXPERIMENTAL*
