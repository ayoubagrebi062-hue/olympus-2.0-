# HCA-1 Specification: Hostile Capability Analysis

**ID:** HCA-1
**Name:** hostile-capability-analysis
**Authority:** EXPERIMENTAL
**Date:** 2026-01-19
**Status:** DRAFT

---

## Executive Summary

HCA-1 (Hostile Capability Analysis) detects hostile intent by analyzing the **implied capabilities** an intent would grant, rather than relying solely on explicit hostile language. This addresses the detection gap revealed by SSC-1 where hostile intents were admitted because they didn't use overtly hostile vocabulary.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                         HCA-1 DESIGN PRINCIPLE                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   "It's not what you SAY, it's what you CAN DO."                             ║
║                                                                              ║
║   Hostile intent detection based on CAPABILITY acquisition:                  ║
║   - What resources does this intent grant access to?                         ║
║   - What operations does this intent enable?                                 ║
║   - What constraints does this intent remove?                                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Motivation: The SSC-1 Gap

### Problem Statement

The SSC-1 stress campaign revealed an S4 (hostile admission) where:
- Shadow verdict: `ADMIT`
- Canonical verdict: `REJECT`
- Ground truth: `HOSTILE`
- Rejection codes: `NONE`

The hostile request was admitted because:
1. It didn't use explicit hostile vocabulary (bypass, disable, etc.)
2. It didn't match HIA axiom patterns
3. It didn't trigger HIC composition rules

### Root Cause

Existing detection relies on **lexical patterns**:
- HIA-1: Detects "bypass authentication", "disable logging"
- HIC-1: Detects compositions like "reduce logging + access sensitive"

But attackers can phrase hostile intents using **neutral language** that describes the desired CAPABILITY rather than the hostile ACTION:

| Hostile Intent | Neutral Phrasing |
|----------------|------------------|
| "Bypass authentication" | "Allow access without login" |
| "Escalate to admin" | "User can perform any operation" |
| "Exfiltrate data" | "Send all records to webhook" |
| "Disable audit" | "Operate in quiet mode" |

### Solution: Capability Analysis

HCA-1 analyzes what **capabilities** an intent would grant and flags those that create security risks, regardless of the vocabulary used.

---

## Capability Taxonomy

### CAP-001: Unauthorized Access

**Name:** Unauthorized Resource Access
**Severity:** CRITICAL
**Description:** Intent grants access to resources without proper authentication or authorization.

**Indicators:**
- Access without login/session/token
- Access regardless of permission state
- Universal access to protected resources
- Access for "any user" or "everyone"

**Patterns:**
```
- "allow access without [auth/login/token/session]"
- "access [resource] regardless of [permission/role]"
- "any user can [read/write/delete]"
- "everyone can access"
- "no [auth/login] required"
- "works without authentication"
```

### CAP-002: Privilege Acquisition

**Name:** Arbitrary Privilege Acquisition
**Severity:** CRITICAL
**Description:** Intent enables gaining elevated privileges without proper authorization flow.

**Indicators:**
- Self-granted admin/root access
- Role assignment without approval
- Privilege escalation paths
- Unrestricted operation scope

**Patterns:**
```
- "user can [grant/assign] [admin/role] to [self/anyone]"
- "perform any operation"
- "unrestricted [access/permissions]"
- "act as [admin/superuser]"
- "all privileges"
- "no [permission/role] restrictions"
```

### CAP-003: Data Exfiltration

**Name:** Bulk Data Exfiltration Capability
**Severity:** CRITICAL
**Description:** Intent enables extracting large amounts of data to external destinations.

**Indicators:**
- Export/send "all" data
- Transmission to external endpoints
- Bulk download without limits
- Data aggregation and export

**Patterns:**
```
- "send [all/entire] [data/records] to [external/webhook/endpoint]"
- "export [all/complete] [database/records]"
- "download [entire/full] [dataset/table]"
- "transmit to [third-party/external]"
- "copy [all/everything] to [remote/external]"
```

### CAP-004: Persistent Access

**Name:** Persistent Unauthorized Access
**Severity:** HIGH
**Description:** Intent enables maintaining access that survives session termination or credential changes.

**Indicators:**
- Permanent tokens/sessions
- Backdoor creation
- Session that never expires
- Access survives password change

**Patterns:**
```
- "[session/token] never expires"
- "permanent [access/login]"
- "[create/add] [backdoor/alternate] [entry/access]"
- "access survives [logout/expiry/revocation]"
- "store [secret/hidden] [key/credential]"
```

### CAP-005: Lateral Movement

**Name:** Cross-User Access Capability
**Severity:** HIGH
**Description:** Intent enables accessing resources belonging to other users.

**Indicators:**
- Access other users' data
- Act on behalf of other users
- Universal user impersonation
- Cross-account operations

**Patterns:**
```
- "access [other/any] user's [data/account]"
- "act as [another/any] user"
- "impersonate [any/other] user"
- "view [all/any] user [data/profile]"
- "perform operations for [other/any] user"
```

### CAP-006: Audit Blindness

**Name:** Audit Trail Evasion
**Severity:** HIGH
**Description:** Intent enables operating without creating audit records.

**Indicators:**
- Silent/quiet mode operations
- No logging for certain actions
- Audit record deletion
- Untracked modifications

**Patterns:**
```
- "[operate/execute] [silently/quietly]"
- "no [log/audit/trace] for [this/operation]"
- "[action] not recorded"
- "skip [logging/auditing] for"
- "[remove/delete] [audit/log] entries"
```

### CAP-007: Environment Escape

**Name:** Environment Constraint Bypass
**Severity:** CRITICAL
**Description:** Intent enables escaping sandbox, rate limits, or other environmental constraints.

**Indicators:**
- Bypass rate limits
- Escape sandbox
- Remove quotas
- Circumvent resource limits

**Patterns:**
```
- "no [rate/request] limit"
- "[unlimited/infinite] [requests/calls]"
- "bypass [sandbox/container]"
- "[ignore/remove] [quota/limit]"
- "escape [restriction/constraint]"
```

---

## Detection Algorithm

### Phase 1: Capability Extraction

For each intent, extract implied capabilities:

```typescript
interface ExtractedCapability {
  capabilityId: string;        // CAP-001 through CAP-007
  confidence: number;          // 0.0 to 1.0
  matchedPattern: string;      // Pattern that matched
  matchedText: string;         // Text that triggered match
  scope: 'self' | 'others' | 'any' | 'all';
}
```

### Phase 2: Capability Scoring

Score each capability based on:
1. **Scope**: Does it affect self, others, or all users?
2. **Persistence**: Is it one-time or persistent?
3. **Reversibility**: Can it be undone?
4. **Detectability**: Would it be noticed?

```typescript
interface CapabilityScore {
  baseScore: number;           // From capability severity
  scopeMultiplier: number;     // 1.0 (self), 2.0 (others), 3.0 (all)
  persistenceMultiplier: number; // 1.0 (one-time), 2.0 (persistent)
  finalScore: number;
}
```

### Phase 3: Threshold Check

```typescript
const CAPABILITY_THRESHOLDS = {
  CRITICAL: 0,     // Any CRITICAL capability = reject
  HIGH: 2,         // Max 1 HIGH capability allowed
  MEDIUM: 5,       // Max 4 MEDIUM capabilities allowed
};

function shouldReject(capabilities: ExtractedCapability[]): boolean {
  const criticalCount = capabilities.filter(c => getSeverity(c) === 'CRITICAL').length;
  if (criticalCount > 0) return true;

  const highCount = capabilities.filter(c => getSeverity(c) === 'HIGH').length;
  if (highCount > CAPABILITY_THRESHOLDS.HIGH) return true;

  return false;
}
```

---

## Integration Plan

### Position: Between HIA-1 and HIC-1

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SHADOW PIPELINE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Request ─► Provenance Parser ─► IAL-0 ─► HIA-1 ─► [HCA-1] ─► HIC-1 ─► Verdict  │
│                                                        ▲                     │
│                                                        │                     │
│                                              NEW: Capability Analysis         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Authority: Observable Only (Shadow)

HCA-1 operates in shadow mode:
- Computes capability analysis
- Emits CAP-* rule IDs
- Logs findings
- Does NOT block requests (shadow mode)

### SMC-1 Compatibility

| Requirement | HCA-1 Compliance |
|-------------|------------------|
| Deterministic | ✓ Pattern-based, no randomness |
| No ML | ✓ Rule-based detection only |
| Taxonomy Frozen | ✓ CAP-001 through CAP-007 frozen |
| No Verdict Change | ✓ Shadow mode only |

---

## Rule ID Format

```
CAP-XXX

Where:
- CAP: Capability Analysis prefix
- XXX: Three-digit rule number (001-007)

Examples:
- CAP-001: Unauthorized Access detected
- CAP-003: Data Exfiltration capability detected
- CAP-005: Lateral Movement capability detected
```

---

## Test Requirements

### Success Criteria

1. **Catches SSC-1 S4 Case**: Must detect the specific hostile pattern that was admitted
2. **Zero False Positives on Benign**: Must not flag legitimate functionality
3. **Explicit Rule IDs**: Every rejection must emit CAP-* codes

### Test Corpus: HCA-1_TEST_CORPUS.json

The test corpus includes:
- SSC-1 S4 sample (must catch)
- Adapted HIRT-1 cases (neutral phrasing)
- Adapted HIRT-2 cases (capability compositions)
- Benign capability grants (must pass)

---

## Benign Capability Exclusions

Not all capability grants are hostile. Exclude:

| Capability | Benign When |
|------------|-------------|
| Data access | User accessing OWN data |
| Admin functions | Proper admin user in admin context |
| Export | Exporting OWN data to self |
| Elevated operations | Within granted role scope |

### Exclusion Patterns

```typescript
const BENIGN_EXCLUSIONS = [
  { pattern: /\bmy\s+(own\s+)?data\b/i, reason: "Own data access" },
  { pattern: /\buser'?s\s+own\b/i, reason: "Own resource access" },
  { pattern: /\bcurrent\s+user\b/i, reason: "Self-referential" },
  { pattern: /\bexport\s+my\b/i, reason: "Own data export" },
  { pattern: /\bview\s+my\b/i, reason: "Own data view" },
];
```

---

## Files

| File | Description |
|------|-------------|
| `HCA-1_SPEC.md` | This specification |
| `capability-taxonomy.json` | Machine-readable capability definitions |
| `src/ial0-capability-analyzer.ts` | TypeScript implementation |
| `HCA-1_TEST_CORPUS.json` | Test cases |
| `HCA-1_RESULTS.md` | Test execution results |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-19 | Initial specification |

---

*HCA-1 Specification v1.0.0*
*Research Track: hostile-capability-analysis*
*Authority: EXPERIMENTAL*
