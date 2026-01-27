# PHASE A+++++ — Governance Attention Index (Observation Only)

## What Is the Attention Index?

The attention index is a **risk prioritization system** that computes attention scores for acknowledged risks based on:

- Risk level (critical, high, medium, low)
- Staleness (fresh, aging, stale, fossil)
- Drift status (stable, drifted)
- Ownership status (owned, missing owner)

### Key Principles

1. **SCARCITY FOCUSED** - Top 5 risks only, not all
2. **SCORE-NORMALIZED** - 0-100 scale for easy comparison
3. **OBSERVATION-ONLY** - Never blocks CI, never enforces
4. **HUMAN-PRIORITIZED** - Developers decide attention allocation, not system

---

## Why Attention Is Scarce

### The Problem: Governance Fatigue

When a governance system shows **all** risks equally, developers experience:

1. **Cognitive Overload** - Too many risks to process at once
2. **Attention Fragmentation** - Energy spread across low-impact items
3. **Decision Paralysis** - Unable to prioritize what matters
4. **Fatigue** - "Another alert, another notification" → burnout
5. **Alert Blindness** - Constant warnings become background noise

### The Consequences

- Critical risks ignored amidst low-priority noise
- Developers disable governance to reduce fatigue
- False sense of "we have too many problems"
- Lost focus on what truly matters

### The Solution

**Attention Index = Signal Amplification**

Instead of showing all 50 risks equally:

- Show **top 5** most urgent items
- Compute **attention score** (0-100) to surface severity
- Recommend **action** based on risk factors
- Let developers **self-prioritize** vs. system-forcing

---

## Why This Is Not Enforcement

### ❌ It Does NOT Block CI

**Status:** `process.exit(0)` ALWAYS

The attention index runs in all phases:

- Never fails builds
- Never prevents merges
- Never forces reviews
- Only emits console output (top 5 only)

### ❌ It Does NOT Auto-Accept/Auto-Block

**Status:** Recommendations only

The system:

- Computes attention scores
- Suggests actions (e.g., "Review within 1 sprint")
- Does NOT automatically create tickets
- Does NOT auto-assign reviewers
- Does NOT block until action taken

**Human decides how to allocate attention.**

### ❌ It Does NOT Prioritize For Developers

**Status:** Information-only

The attention index:

- Shows scores and factors
- Sorts by attention score
- Does NOT auto-assign priorities
- Does NOT enforce SLAs or deadlines

**Developers set their own priorities based on context.**

---

## How This Prevents Governance Fatigue

### 1. Top 5 Focus

Instead of 50 risks, developers see 5:

```
=== PHASE A+++++ — GOVERNANCE ATTENTION INDEX (TOP 5) ===

Summary:
  Highest Attention Score: 92
  Fossil Critical Risks: 2
  Drifted High Risks:    1

=== TOP 5 RISKS REQUIRING ATTENTION ===

1. 🔴 92/100 - src/db/reset.ts (CRITICAL)
   🦴 FOSSIL | 🔄 DRIFTED | ❓ NO OWNER
   Action: CRITICAL: Immediate re-review required

2. 🔴 88/100 - src/services/cleanup.ts (CRITICAL)
   🦴 FOSSIL | ✅ STABLE | ✅ OWNED
   Action: AGE: Re-evaluate fossil risk

3. 🟠 75/100 - src/data/purge.ts (HIGH)
   ⏰ STALE | 🔄 DRIFTED | ✅ OWNED
   Action: DRIFT: Confirm acknowledgment validity

4. 🟡 62/100 - src/admin/reset.ts (MEDIUM)
   🦴 FOSSIL | ✅ STABLE | ✅ OWNED
   Action: AGE: Re-evaluate fossil risk

5. 🟡 58/100 - src/batch/delete.ts (MEDIUM)
   ⏰ STALE | ✅ STABLE | ✅ OWNED
   Action: AGE: Re-evaluate fossil risk

=== END OF TOP 5 ===
```

**Result:** Developer knows what needs attention first, without cognitive overload.

### 2. Score-Normalized Comparison

All risks on same 0-100 scale:

| Score  | Meaning                                |
| ------ | -------------------------------------- |
| 80-100 | CRITICAL: Immediate re-review required |
| 60-79  | HIGH: Review within 1 sprint           |
| 40-59  | MEDIUM: Periodic review recommended    |
| 0-39   | LOW: Monitor periodically              |

**Result:** Easy triage at a glance, no manual calculation.

### 3. Action Recommendations

Each risk gets a **recommended action** based on factors:

- `CRITICAL: Immediate re-review required` (score ≥ 80)
- `HIGH: Review within 1 sprint` (score ≥ 60)
- `AGE: Re-evaluate fossil risk` (staleness = fossil)
- `DRIFT: Confirm acknowledgment validity` (drifted = true)
- `OWNER: Assign owner or re-acknowledge` (no owner)
- `RISK: Monitor critical code path` (risk level = critical)
- `NORMAL: Periodic review recommended` (default)

**Result:** Clear next steps, no ambiguity.

### 4. Deterministic Ordering

Top 5 always sorted by attention score (descending):

- Consistent order across runs
- Ties broken by staleness (fossil > stale > aging > fresh)
- Predictable for automation tools

**Result:** Developers know what to expect, no surprises.

---

## Attention Score Calculation

### Formula

```typescript
attentionScore =
  ((riskWeight * stalenessMultiplier * driftMultiplier * ownershipPenalty) / maxScore) * 100;
```

### Components

1. **Risk Weight** (how severe is the risk?)
   - critical: 5
   - high: 4
   - medium: 3
   - low: 2

2. **Staleness Multiplier** (how old is the acknowledgment?)
   - fresh (< 30d): 1
   - aging (30-90d): 2
   - stale (90-180d): 3
   - fossil (> 180d): 5

3. **Drift Multiplier** (has code changed since acknowledgment?)
   - drifted: 2 (file modified, new patterns detected)
   - stable: 1 (no changes detected)

4. **Ownership Penalty** (is someone responsible?)
   - missing owner: 2 (no one owns this risk)
   - has owner: 1 (clear ownership)

### Maximum Score

```
maxScore = 5 (critical) * 5 (fossil) * 2 (drifted) * 2 (no owner)
maxScore = 100
```

### Normalization

Raw scores (0-100) normalized to 0-100 scale:

```
normalizedScore = (rawScore / 100) * 100
```

### Example Calculations

| Risk     | Staleness | Drift   | Owner    | Raw Score           | Normalized    |
| -------- | --------- | ------- | -------- | ------------------- | ------------- |
| Critical | Fossil    | Drifted | No Owner | 5 × 5 × 2 × 2 = 100 | 100/100 = 100 |
| Critical | Fresh     | Stable  | Owned    | 5 × 1 × 1 × 1 = 5   | 5/100 = 5     |
| High     | Stale     | Drifted | Owned    | 4 × 3 × 2 × 1 = 24  | 24/100 = 24   |
| Medium   | Aging     | Stable  | Owned    | 3 × 2 × 1 × 1 = 6   | 6/100 = 6     |
| Low      | Fresh     | Stable  | Owned    | 2 × 1 × 1 × 1 = 2   | 2/100 = 2     |

---

## Output Format

### Console Output (Top 5 Only)

```
=== PHASE A+++++ — GOVERNANCE ATTENTION INDEX (TOP 5) ===

Governance Phase: OBSERVATION_ONLY
Timestamp: 2026-01-18T16:00:00Z

Summary:
  Highest Attention Score: 92
  Fossil Critical Risks: 2
  Drifted High Risks:    1
  Total Risks Tracked:    50

=== TOP 5 RISKS REQUIRING ATTENTION ===

1. 🔴 92/100 - src/db/reset.ts (CRITICAL)
   🦴 FOSSIL | 🔄 DRIFTED | ❓ NO OWNER
   Action: CRITICAL: Immediate re-review required
   Pattern ID: a1b2c3d4e5f6g7h8

2. 🔴 88/100 - src/services/cleanup.ts (CRITICAL)
   🦴 FOSSIL | ✅ STABLE | ✅ OWNED
   Action: AGE: Re-evaluate fossil risk
   Pattern ID: b2c3d4e5f6g7h8i9

3. 🟠 75/100 - src/data/purge.ts (HIGH)
   ⏰ STALE | 🔄 DRIFTED | ✅ OWNED
   Action: DRIFT: Confirm acknowledgment validity
   Pattern ID: c3d4e5f6g7h8i9j0

4. 🟡 62/100 - src/admin/reset.ts (MEDIUM)
   🦴 FOSSIL | ✅ STABLE | ✅ OWNED
   Action: AGE: Re-evaluate fossil risk
   Pattern ID: d4e5f6g7h8i9j0k1

5. 🟡 58/100 - src/batch/delete.ts (MEDIUM)
   ⏰ STALE | ✅ STABLE | ✅ OWNED
   Action: AGE: Re-evaluate fossil risk
   Pattern ID: e5f6g7h8i9j0k1l2

=== END OF TOP 5 ===

ℹ️  See data/governance/attention-index.json for full index.

=== OBSERVATION COMPLETE (NO CI BLOCKING) ===
```

### JSON Artifact

`data/governance/attention-index.json`

```json
{
  "version": "1.0.0",
  "timestamp": "2026-01-18T16:00:00Z",
  "governancePhase": "OBSERVATION_ONLY",
  "topRisks": [
    {
      "patternId": "a1b2c3d4e5f6g7h8",
      "file": "src/db/reset.ts",
      "attentionScore": 92,
      "riskLevel": "critical",
      "stalenessLevel": "fossil",
      "driftDetected": true,
      "ownershipRisk": true,
      "recommendedAction": "CRITICAL: Immediate re-review required"
    },
    {
      "patternId": "b2c3d4e5f6g7h8i9",
      "file": "src/services/cleanup.ts",
      "attentionScore": 88,
      "riskLevel": "critical",
      "stalenessLevel": "fossil",
      "driftDetected": false,
      "ownershipRisk": false,
      "recommendedAction": "AGE: Re-evaluate fossil risk"
    }
  ],
  "summary": {
    "highestAttentionScore": 92,
    "fossilCriticalCount": 2,
    "driftedHighRiskCount": 1,
    "totalRisksTracked": 50
  }
}
```

---

## How Phase B Will Later Optionally Consume This Signal

### Phase B: SCOPED_ENFORCEMENT

In Phase B, enforcement blocks on **new/modified files** only.

### How Attention Index Helps Phase B

1. **Prioritizes Review**
   - Top 5 shows most urgent existing risks
   - Developers can address fossils before Phase B enforcement starts

2. **Informs Enforcement Strategy**
   - Attention index shows risk distribution
   - Teams can allocate review capacity to highest-attention items

3. **Optional Consumption**

Phase B **may** optionally:

- Auto-block PRs containing top-attention files (without recent acknowledgment)
- Auto-assign reviewers to fossil critical risks
- Send notifications when attention score exceeds threshold
- Create tickets for risks with no owner

**Key Point:** This is **OPTIONAL**, not required.

Phase B can implement selective blocking based on attention scores:

```
IF (attentionScore >= 80 AND staleness == 'fossil')
AND NOT (recentlyAcknowledged)
THEN
  Auto-block PR containing this file
  Require: "Re-acknowledge or resolve fossil before merge"
ELSE
  Proceed (standard Phase B enforcement)
END IF
```

4. **Gradual Transition Path**

```
Phase A (OBSERVATION_ONLY):
├─ Detection: Finds all risks
├─ Acknowledgment: Documents awareness
├─ Aging: Tracks time + drift
├─ Attention Index: Prioritizes top 5
└─ Visibility: No blocking, recommendations only

         ↓ (Team addresses top priorities)

Phase B (SCOPED_ENFORCEMENT):
├─ Enforcement: Blocks NEW files only
├─ Attention Index: Informs existing risk priorities
├─ Optional: Auto-block top-attention fossils
├─ Optional: Auto-assign reviewers
└─ Focus: Top 5 drives review allocation

         ↓ (Top priorities addressed)

Phase C (FULL_ENFORCEMENT):
├─ Enforcement: Blocks ALL files
├─ No fossils (all addressed)
├─ No drift (all re-confirmed)
├─ All risks: Fresh (<30d)
└─ Full compliance
```

---

## Why Attention Is Different From Enforcement

| Aspect           | Enforcement                | Attention Index                                |
| ---------------- | -------------------------- | ---------------------------------------------- |
| **Trigger**      | File changes               | Score calculation (risk + age + drift + owner) |
| **Action**       | Block CI, prevent merge    | Show top 5, recommend actions                  |
| **Control**      | System decides             | Developer decides                              |
| **Scope**        | All new/modified files     | All acknowledged risks (top 5 only)            |
| **Exit Code**    | 1 (block) or 0 (pass)      | 0 (always)                                     |
| **Human Agency** | Forced to fix before merge | Can prioritize based on context                |

**Attention Index = Signal, Enforcement = Force**

---

## How to Use

### For Developers

1. **Review Top 5**

   ```bash
   npx tsx src/lib/agents/governance/ci/attention-index.ts
   ```

2. **Check Attention Scores**
   - Score ≥ 80: CRITICAL priority
   - Score ≥ 60: HIGH priority
   - Score ≥ 40: MEDIUM priority
   - Score < 40: LOW priority

3. **Follow Recommended Actions**
   - "Immediate re-review required" → Review today
   - "Review within 1 sprint" → Review this week
   - "Re-evaluate fossil risk" → Update acknowledgment
   - "Confirm acknowledgment validity" → Re-review code

4. **Prioritize Your Time**
   - Focus on top 5 first
   - Address highest attention scores
   - Then move to next items
   - Work in priority order

### For Tech Leads

1. **Review Attention Distribution**
   - Count of critical risks: How many > 80?
   - Count of fossil risks: How many > 180 days?
   - Count of drifted risks: How many changed?
   - Count of missing owners: How many unowned?

2. **Assign Owners**
   - Risks with no owner: Assign someone
   - Risks with departed owners: Re-assign
   - Update `acknowledgedBy` field

3. **Schedule Reviews**
   - Critical fossils (> 80 score): Immediate review
   - High aging (≥ 60 score): Sprint planning
   - Medium stale (≥ 40 score): Backlog grooming

4. **Monitor Trends**
   - Run attention index weekly
   - Track if highest scores decrease (improvement)
   - Track if fossil count decreases (resolution progress)

### For Managers

1. **Use Attention Index for Capacity Planning**
   - Top 5 = urgent items requiring immediate attention
   - Score distribution = risk portfolio health
   - Fossil count = technical debt metric

2. **Allocate Review Resources**
   - Assign senior reviewers to critical fossils
   - Allocate sprint capacity to high-attention items
   - Schedule dedicated review time for top 5

3. **Measure Governance Effectiveness**
   - Decreasing attention scores = better risk management
   - Decreasing fossil count = better risk resolution
   - Increasing owner coverage = better accountability

---

## FAQs

### Q: Why show only top 5 instead of all 50?

**A:** Scarcity focus prevents governance fatigue. Showing all risks creates cognitive overload. Top 5 gives clear priorities without overwhelming developers.

### Q: What if I have a score of 85 but my code is safe?

**A:** Attention score suggests urgency, not danger. Review the risk, confirm it's still valid, and update the acknowledgment. If resolved, the risk can be closed.

### Q: Can I ignore high attention scores?

**A:** Yes, you can. The system doesn't block. However:

- High-attention items may indicate real issues
- Ignoring them increases risk exposure
- Reviewers may request attention during PR review

### Q: What if attention score is wrong?

**A:** Scores are deterministic based on risk, age, drift, owner. If score seems off, the risk factors may need updating (e.g., refresh acknowledgment timestamp to reset staleness).

### Q: How is this different from aging analysis?

**A: Aging analysis shows staleness and drift. Attention index **combines\*\* risk + staleness + drift + owner into a single score for prioritization.

### Q: Does Phase B enforcement use attention scores?

**A:** Optionally, yes. Phase B can choose to auto-block files with high attention scores (e.g., ≥ 80 + fossil) without recent acknowledgment. This is optional, not required.

---

## Compliance Note

This artifact is designed for **prioritization and focus**, not enforcement:

- ✅ Provides visibility into most urgent risks
- ✅ Normalizes scores (0-100) for easy comparison
- ✅ Shows top 5 only (prevents fatigue)
- ✅ Recommends actions (clear next steps)
- ✅ Enables optional Phase B enhancements

- ❌ Does NOT block CI
- ❌ Does NOT force priorities on developers
- ❌ Does NOT auto-create tickets or assign reviewers
- ❌ Does NOT replace human decision-making

**The governance system surfaces priorities. Developers decide how to allocate attention.**
