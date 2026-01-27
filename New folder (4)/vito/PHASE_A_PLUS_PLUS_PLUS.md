# PHASE A+++ — Risk Acknowledgment (Observation Only)

## What Is Risk Acknowledgment?

Risk acknowledgment is a **human-owned, observation-only mechanism** for documenting awareness of destructive code patterns detected by the governance system.

### Key Principles

1. **HUMAN-OWNED** - The acknowledgment file (`contracts/governance-risk-acknowledgment.json`) is maintained by developers, not the system
2. **OBSERVATION-ONLY** - Never blocks CI, never enforces decisions
3. **MERGE-SAFE** - Preserves human-entered fields across runs
4. **STABLE IDS** - Pattern IDs are deterministic hashes, ensuring consistency

---

## Why It Exists

### The Problem

Phase A++ destruction pattern detection reveals systemic risks:
- Scope underestimation (declaring "record" when impact is "global")
- Missing `@destruction` blocks for destructive operations
- Irreversible operations marked as "reversible"
- Global scope without proper justification

### The Gap

Detection alone isn't enough. Developers need a way to:
1. **Document awareness** - "Yes, we know this is risky"
2. **Provide context** - "This is a batch job, requires full reset"
3. **Track resolution** - "Acknowledged by X, reviewed by Y"
4. **Maintain history** - "This risk was discussed on DATE"

### The Solution

Risk acknowledgment creates a **persistent artifact** that:
- Captures high-risk destruction patterns
- Provides fields for human input (acknowledgment, rationale, decision)
- Tracks first/last detection timestamps
- Never auto-fills acknowledgments (prevents false compliance)

---

## What It Explicitly Does NOT Do

### ❌ It Does NOT Block CI

**Status:** `process.exit(0)` ALWAYS

The observer runs in all governance phases (`OBSERVATION_ONLY`, `SCOPED_ENFORCEMENT`, `FULL_ENFORCEMENT`) and:
- Never fails builds
- Never prevents merges
- Never enforces acknowledgments
- Only emits console warnings

### ❌ It Does NOT Auto-Fill Acknowledgments

**Status:** Human input ONLY

The system:
- Creates entries for detected risks
- Sets `acknowledged: false` by default
- Leaves `acknowledgedBy`, `decision`, `rationale`, `reviewBy` as `undefined`
- Requires manual edits to acknowledge

Example entry (system-generated):
```json
{
  "patternId": "a1b2c3d4e5f6",
  "file": "src/db/reset.ts",
  "riskLevel": "critical",
  "triggerType": "global_without_declaration",
  "description": "Global destructive operations without @destruction block declaration",
  "evidence": ["DROP TABLE", "TRUNCATE TABLE"],
  "firstDetected": "2026-01-18T10:00:00Z",
  "lastDetected": "2026-01-18T10:00:00Z",
  "acknowledged": false,
  "acknowledgedBy": undefined,
  "acknowledgedAt": undefined,
  "decision": undefined,
  "rationale": undefined,
  "reviewBy": undefined,
  "unresolved": true
}
```

Example entry (human-acknowledged):
```json
{
  "patternId": "a1b2c3d4e5f6",
  "file": "src/db/reset.ts",
  "riskLevel": "critical",
  "triggerType": "global_without_declaration",
  "description": "Global destructive operations without @destruction block declaration",
  "evidence": ["DROP TABLE", "TRUNCATE TABLE"],
  "firstDetected": "2026-01-18T10:00:00Z",
  "lastDetected": "2026-01-18T14:00:00Z",
  "acknowledged": true,
  "acknowledgedBy": "john.doe",
  "acknowledgedAt": "2026-01-18T12:00:00Z",
  "decision": "ACCEPTED - Required for staging environment reset",
  "rationale": "Used only in staging, production has safeguard checks",
  "reviewBy": "jane.smith",
  "unresolved": false
}
```

### ❌ It Does NOT Overwrite Human Data

**Status:** Merge-preserving

When the observer runs:
1. Loads existing acknowledgments
2. Detects new patterns (or updates existing)
3. **PRESERVES** all human-entered fields:
   - `acknowledged`
   - `acknowledgedBy`
   - `acknowledgedAt`
   - `decision`
   - `rationale`
   - `reviewBy`
4. **UPDATES** only:
   - `lastDetected` (timestamp)
   - `unresolved` (flag)
5. **ADDS** new entries for new patterns

**NO DATA LOSS ALLOWED.**

### ❌ It Does NOT Enforce Decisions

**Status:** Visibility-only

The system:
- Detects risks
- Reports acknowledgments status
- Does NOT require approval before code deployment
- Does NOT create GitHub issues or tickets
- Does NOT send notifications

---

## Trigger Rules

### Critical Risk (Requires Acknowledgment)

| Trigger Type | Condition | Description |
|--------------|-----------|-------------|
| `scope_underestimation_global` | Inferred: global, Declared: < global, Confidence: high, Consistency: mismatch | Declared scope is narrower than actual destructive impact |
| `global_without_declaration` | Inferred: global, No @destruction block | Global operations lack explicit documentation |
| `reversible_mismatch_global` | Inferred: global, Reversibility: reversible, Confidence: high | Global ops marked as reversible but difficult to restore |
| `hard_delete_global` | Inferred: global, Reversibility: hard_delete, No @destruction block | Global hard deletes without justification |

### High Risk (Requires Acknowledgment)

| Trigger Type | Condition | Description |
|--------------|-----------|-------------|
| `scope_underestimation_global` | Inferred: global, Warning: scope_underestimation | Any global scope underestimation |
| `hard_delete_global` | Inferred: global, Reversibility: hard_delete, No @destruction block | Global hard deletions |

### Medium Risk (Requires Acknowledgment)

| Trigger Type | Condition | Description |
|--------------|-----------|-------------|
| `scope_mismatch_tenant` | Inferred: tenant, Consistency: mismatch | Tenant scope mismatch between declared/inferred |
| `missing_destruction_block` | No @destruction block, Warning: missing_destruction_block | Any missing @destruction block warning |

### Low Risk (No Acknowledgment Required)

| Trigger Type | Condition |
|--------------|-----------|
| `scope_overestimation` | Declared wider than inferred (conservative, safe) |
| `scope_mismatch_project` | Project scope with mixed consistency |
| Other mismatches with lower risk factors |

---

## Risk Assessment Logic

```typescript
const riskRules = [
  {
    level: 'critical',
    condition: () =>
      pattern.inferredScope === 'global' &&
      pattern.scopeConsistency === 'always_mismatch' &&
      pattern.inferredConfidence === 'high'
  },
  {
    level: 'critical',
    condition: () =>
      pattern.inferredScope === 'global' &&
      pattern.reversibility === 'reversible' &&
      !pattern.hasDestructionBlock
  },
  {
    level: 'high',
    condition: () =>
      pattern.inferredScope === 'global' &&
      pattern.warningTypes.includes('scope_underestimation')
  },
  {
    level: 'high',
    condition: () =>
      pattern.inferredScope === 'global' &&
      pattern.reversibility === 'hard_delete' &&
      !pattern.hasDestructionBlock
  },
  {
    level: 'medium',
    condition: () =>
      pattern.inferredScope === 'tenant' &&
      pattern.scopeConsistency === 'always_mismatch'
  },
  {
    level: 'medium',
    condition: () =>
      pattern.warningTypes.includes('missing_destruction_block')
  },
  {
    level: 'low',
    condition: () =>
      pattern.inferredScope === 'project' &&
      pattern.scopeConsistency === 'mixed'
  },
  {
    level: 'low',
    condition: () =>
      pattern.warningTypes.includes('scope_overestimation')
  }
];
```

---

## Stable Pattern IDs

Pattern IDs are **deterministic hashes** generated from:

```typescript
const patternId = sha256(`${file}:${triggerType}`).substring(0, 16);
```

### Properties

- **Stable:** Same file + same trigger = same ID (always)
- **Unique:** Different file or trigger = different ID
- **Short:** 16-character hex string (`a1b2c3d4e5f6g7h8`)
- **Collision-resistant:** SHA-256 provides 2^256 possible values

### Why This Matters

- IDs don't change when system re-runs
- Allows tracking risk lifecycle over time
- Enables reliable file matching during merge operations

---

## Output Format

### Console Output

```
=== PHASE A+++ — RISK ACKNOWLEDGMENT STATUS (OBSERVATION ONLY) ===

Governance Phase: OBSERVATION_ONLY
Timestamp: 2026-01-18T14:30:00Z

Acknowledgment Summary:
  Total Patterns:              5
  Required Acknowledgments:     3
  Acknowledged:               2
  Unacknowledged:             3
  Highest Unresolved Risk:     CRITICAL

By Risk Level:
  Critical:  2
  High:      1
  Medium:    1
  Low:       1

=== UNACKNOWLEDGED RISKS ===

1. 🔴 CRITICAL - src/db/reset.ts
   Pattern ID:    a1b2c3d4e5f6g7h8
   Trigger:        global_without_declaration
   Description:    Global destructive operations without @destruction block declaration
   Evidence:       DROP TABLE, TRUNCATE TABLE
   First Detected: 2026-01-18T10:00:00Z
   Last Detected:  2026-01-18T14:00:00Z

2. 🔴 CRITICAL - src/services/cleanup.ts
   Pattern ID:    b2c3d4e5f6g7h8i9
   Trigger:        scope_underestimation_global
   Description:    Global scope underestimated - declared scope is narrower than actual destructive impact
   Evidence:       DELETE without WHERE clause
   First Detected: 2026-01-18T11:00:00Z
   Last Detected:  2026-01-18T13:00:00Z

=== ACTION REQUIRED ===

To acknowledge a risk, edit contracts/governance-risk-acknowledgment.json
Set acknowledged: true and add acknowledgedBy, rationale fields.
This file is HUMAN-OWNED. Auto-filling is disabled.

=== OBSERVATION COMPLETE (NO CI BLOCKING) ===
```

### JSON Artifact

`contracts/governance-risk-acknowledgment.json`

```json
{
  "version": "1.0.0",
  "timestamp": "2026-01-18T14:30:00Z",
  "governancePhase": "OBSERVATION_ONLY",
  "summary": {
    "totalPatterns": 5,
    "totalRequiredAcknowledgments": 3,
    "acknowledgedCount": 2,
    "unacknowledgedCount": 3,
    "highestUnresolvedRisk": "critical",
    "byRiskLevel": {
      "critical": 2,
      "high": 1,
      "medium": 1,
      "low": 1
    }
  },
  "acknowledgments": [
    {
      "patternId": "a1b2c3d4e5f6g7h8",
      "file": "src/db/reset.ts",
      "riskLevel": "critical",
      "triggerType": "global_without_declaration",
      "description": "Global destructive operations without @destruction block declaration",
      "evidence": ["DROP TABLE", "TRUNCATE TABLE"],
      "firstDetected": "2026-01-18T10:00:00Z",
      "lastDetected": "2026-01-18T14:00:00Z",
      "acknowledged": false,
      "acknowledgedBy": undefined,
      "acknowledgedAt": undefined,
      "decision": undefined,
      "rationale": undefined,
      "reviewBy": undefined,
      "unresolved": true
    }
  ]
}
```

---

## Integration with Governance Phases

### OBSERVATION_ONLY

**Status:** Runs as observer

- Detects risks
- Generates acknowledgments
- Emits console warnings
- Never blocks

### SCOPED_ENFORCEMENT

**Status:** Runs as observer

- Detects risks
- Generates acknowledgments
- Emits console warnings
- Never blocks (still observation-only)

### FULL_ENFORCEMENT

**Status:** Runs as observer

- Detects risks
- Generates acknowledgments
- Emits console warnings
- **Still never blocks** (observer module)

**Key Point:** Risk acknowledgment is **always observation-only**, regardless of governance phase.

---

## How to Use

### For Developers

1. **Review Console Output**
   ```bash
   npx tsx src/lib/agents/governance/ci/risk-acknowledgment.ts
   ```

2. **Check Unacknowledged Risks**
   - Look for 🔴 (critical) and 🟠 (high) risks
   - Review file paths and trigger types
   - Understand the destructive impact

3. **Edit Acknowledgment File**
   ```bash
   # Open contracts/governance-risk-acknowledgment.json
   # Find the patternId for the risk
   # Set acknowledged: true
   # Add your details:
   #   acknowledgedBy: "your.name"
   #   decision: "ACCEPTED - [reason]"
   #   rationale: "[why this risk is acceptable]"
   #   reviewBy: "reviewer.name"
   ```

4. **Commit Your Changes**
   ```bash
   git add contracts/governance-risk-acknowledgment.json
   git commit -m "Acknowledge risk: global reset requires @destruction block"
   ```

### For Reviewers

1. **Check Acknowledgment Completeness**
   - All critical risks acknowledged?
   - Rationale provides clear reasoning?
   - Reviewer field filled?

2. **Validate Decisions**
   - Is "ACCEPTED" decision justified?
   - Are mitigation steps documented?
   - Does rationale match business context?

3. **Request Updates If Needed**
   - Comment on PR if acknowledgment insufficient
   - Ask for more detail in rationale
   - Ensure reviewer approval is documented

---

## FAQ

### Q: Does this block my PR?

**A:** No. The observer always exits with code 0. It never blocks CI, regardless of the number or severity of unacknowledged risks.

### Q: Can I commit code without acknowledging risks?

**A:** Yes, you can. However:
- Console warnings will be visible
- The risk will remain unresolved in the artifact
- Reviewers can request acknowledgment during code review
- Unacknowledged critical risks will be tracked over time

### Q: What if the risk is acceptable?

**A:** Acknowledge it with a clear rationale:
```json
{
  "acknowledged": true,
  "acknowledgedBy": "developer",
  "decision": "ACCEPTED - Staging environment reset",
  "rationale": "Used only in staging, production has safeguards",
  "reviewBy": "tech-lead"
}
```

### Q: What happens if I edit the acknowledgment file incorrectly?

**A:** The observer will merge your changes:
- Human fields are preserved
- Timestamps are updated
- New patterns are added
- Malformed JSON will be rejected (file not saved)

### Q: Can I delete an acknowledgment entry?

**A:** No, entries are append-only. If a risk is truly resolved:
- Mark `acknowledged: true`
- Document resolution in `rationale`
- The risk will show as resolved in future runs

### Q: What if the file path changes?

**A:** A new pattern ID will be generated because the ID depends on the file path. The old entry remains (as a historical record), and a new entry is created.

---

## Compliance Note

This artifact is designed for **transparency and documentation**, not enforcement:

- ✅ Provides visibility into destructive code patterns
- ✅ Tracks developer awareness and review
- ✅ Maintains historical record of risk discussions
- ✅ Never blocks CI or prevents deployment

- ❌ Does not force approval workflows
- ❌ Does not create automated tickets
- ❌ Does not enforce acknowledgment before merge
- ❌ Does not replace human code review

**The governance system detects risks. Developers decide how to handle them.**
