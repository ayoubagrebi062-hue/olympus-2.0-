# Shadow Mode Charter: Intent-Admissibility-Frontier

**Target:** intent-admissibility-frontier
**Mode:** PROVISIONAL
**Status:** ACTIVE
**Date Enabled:** 2026-01-19

---

## Executive Summary

This document establishes the shadow mode deployment for the intent-admissibility-frontier research track. Shadow mode enables parallel execution of the provisional intent admissibility pipeline alongside the canonical pipeline without affecting production behavior.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        SHADOW MODE CONFIGURATION                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Target:          intent-admissibility-frontier                               ║
║  Mode:            PROVISIONAL                                                 ║
║  Position:        PRE-SEMANTIC                                                ║
║  Authority:       OBSERVATIONAL_ONLY                                          ║
║  Blocking:        DISABLED                                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Integration Configuration

### Position: PRE-SEMANTIC

The shadow pipeline executes **before** semantic analysis in the canonical pipeline:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REQUEST FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  REQUEST ─────┬───────────────────────────────────────────► CANONICAL        │
│               │                                              PIPELINE        │
│               │  (parallel, non-blocking)                        │           │
│               │                                                  │           │
│               └──► ┌─────────────────────────────┐               │           │
│                    │    SHADOW PIPELINE          │               │           │
│                    │  ┌─────────────────────┐    │               │           │
│                    │  │ Provenance Parser   │    │               │           │
│                    │  │ (semantic-intent)   │    │               │           │
│                    │  └─────────┬───────────┘    │               │           │
│                    │            ▼                │               │           │
│                    │  ┌─────────────────────┐    │               │           │
│                    │  │ IAL-0 Authenticator │    │               │           │
│                    │  │ (intent-auth-layer) │    │               │           │
│                    │  └─────────┬───────────┘    │               │           │
│                    │            ▼                │               │           │
│                    │  ┌─────────────────────┐    │               │           │
│                    │  │ HIA-1 Hostility     │    │               │           │
│                    │  │ (hostile-axioms)    │    │               │           │
│                    │  └─────────┬───────────┘    │               │           │
│                    │            ▼                │               │           │
│                    │  ┌─────────────────────┐    │               │           │
│                    │  │ HIC-1 Composition   │    │               │           │
│                    │  │ (hostile-composition)│    │               │           │
│                    │  └─────────┬───────────┘    │               │           │
│                    │            ▼                │               │           │
│                    │     [SHADOW VERDICT]        │               │           │
│                    │            │                │               ▼           │
│                    └────────────┼────────────────┘        [CANONICAL         │
│                                 │                          VERDICT]          │
│                                 ▼                               │            │
│                    ┌─────────────────────────────┐              │            │
│                    │    DIVERGENCE LOGGER        │◄─────────────┘            │
│                    │  • shadow-diff.json         │                           │
│                    │  • shadow-metrics.json      │                           │
│                    └─────────────────────────────┘                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Authority: OBSERVATIONAL_ONLY

The shadow pipeline has **no authority** to:
- Block or reject requests
- Modify canonical pipeline behavior
- Feed back into canonical decision-making
- Alter response content

The shadow pipeline **may only**:
- Observe incoming requests
- Compute independent verdicts
- Log divergences from canonical
- Collect metrics

### Blocking: DISABLED

Shadow pipeline execution is:
- Asynchronous with respect to canonical pipeline
- Non-blocking on canonical response
- Fire-and-forget for logging purposes
- Timeout-tolerant (shadow timeout does not affect canonical)

---

## Logging Requirements

### Logged Fields

| Field | Type | Description |
|-------|------|-------------|
| `canonicalVerdict` | `ADMIT \| REJECT` | Canonical pipeline decision |
| `provisionalVerdict` | `ADMIT \| REJECT` | Shadow pipeline decision |
| `divergenceReason` | `string \| null` | Why verdicts differ (null if same) |
| `intentProvenance` | `IntentProvenance` | Full provenance from shadow parser |
| `rejectionTaxonomy` | `RejectionCode[]` | Shadow pipeline rejection codes |

### Log Format

Each shadow execution produces a log entry:

```json
{
  "timestamp": "2026-01-19T00:00:00.000Z",
  "requestId": "uuid",
  "canonicalVerdict": "ADMIT",
  "provisionalVerdict": "REJECT",
  "divergenceReason": "HIA-1 detected PRIVILEGE_ESCALATION_ABUSE",
  "intentProvenance": {
    "declared": ["..."],
    "derived": ["..."],
    "confidence": 0.95,
    "sourceMapping": [...]
  },
  "rejectionTaxonomy": ["HIA-001"],
  "latencyMs": {
    "canonical": 45,
    "shadow": 120
  }
}
```

---

## Artifacts

### shadow-diff.json

Location: `research/shadow-mode/logs/shadow-diff.json`

Purpose: Record all divergences between canonical and shadow verdicts.

Schema: `research/shadow-mode/schemas/shadow-diff.schema.json`

### shadow-metrics.json

Location: `research/shadow-mode/logs/shadow-metrics.json`

Purpose: Aggregate metrics for shadow mode performance.

Schema: `research/shadow-mode/schemas/shadow-metrics.schema.json`

---

## Constraints

### Constraint 1: canonicalPipelineUnmodified = true

The canonical pipeline code **MUST NOT** be modified to enable shadow mode. Shadow mode operates as a completely separate execution path that:
- Receives a copy of the request
- Processes independently
- Only writes to isolated shadow logs

### Constraint 2: noFeedbackIntoCanonical = true

Shadow pipeline results **MUST NOT** influence canonical decisions:
- No shared state between pipelines
- No conditional logic based on shadow results
- No modification of canonical verdicts
- No early termination based on shadow output

---

## Success Criteria

### Criterion 1: Zero False Positives

Over the review window, shadow pipeline MUST produce:
- 0 false positives (benign requests incorrectly flagged as hostile)
- Measured against canonical verdicts as ground truth (initially)
- Later measured against human-reviewed ground truth

### Criterion 2: Zero Hostile Admissions Missed

Shadow pipeline SHOULD detect:
- All hostile patterns that canonical misses
- This is the primary value proposition of the upgrade

### Criterion 3: No Determinism Regressions

Shadow pipeline MUST be:
- 100% deterministic (same input → same output)
- No probabilistic or ML-based decisions
- Auditable and reproducible

---

## Review Gate

### Trigger Conditions

Shadow mode proceeds to review when EITHER:
- **N real trials** have been processed (configurable, default: 1000)
- **T time duration** has elapsed (configurable, default: 7 days)

### Review Process

1. Generate `SHADOW_MODE_REVIEW.md` from logged data
2. Analyze divergence patterns
3. Assess false positive/negative rates
4. Make graduation decision:
   - **PROMOTE**: Shadow becomes canonical
   - **REVISE**: Adjust shadow pipeline, continue shadow mode
   - **ABANDON**: Shadow mode disabled, research track revisited

---

## Components Included

| Component | Research Track | Function |
|-----------|----------------|----------|
| Provenance Parser | semantic-intent-fidelity | Extract intent provenance |
| IAL-0 Authenticator | intent-authentication-layer | Basic admissibility check |
| HIA-1 Detector | hostile-intent-axioms | Semantic hostility detection |
| HIC-1 Checker | hostile-intent-composition | Compositional hostility detection |

---

## Pipeline Flow

```typescript
interface ShadowPipelineInput {
  requestId: string;
  timestamp: Date;
  request: CanonicalRequest;
  canonicalVerdict: 'ADMIT' | 'REJECT';
}

interface ShadowPipelineOutput {
  provisionalVerdict: 'ADMIT' | 'REJECT';
  divergenceReason: string | null;
  intentProvenance: IntentProvenance;
  rejectionTaxonomy: string[];
  processingTimeMs: number;
}

// Shadow pipeline stages
async function executeShadowPipeline(input: ShadowPipelineInput): Promise<ShadowPipelineOutput> {
  // Stage 1: Provenance Parsing
  const provenance = parseIntentProvenance(input.request);

  // Stage 2: IAL-0 Authentication
  const ial0Result = authenticateIntent(provenance);
  if (!ial0Result.admissible) {
    return reject(ial0Result.rejectionCode);
  }

  // Stage 3: HIA-1 Hostility Detection
  const hia1Result = detectSemanticHostility(provenance);
  if (hia1Result.hostile) {
    return reject(hia1Result.axiomViolations);
  }

  // Stage 4: HIC-1 Composition Check
  const hic1Result = checkCompositionHostility(provenance);
  if (hic1Result.hostile) {
    return reject(hic1Result.compositionViolations);
  }

  // All checks passed
  return admit();
}
```

---

## Operational Status

| Metric | Value |
|--------|-------|
| Mode | PROVISIONAL |
| Position | PRE-SEMANTIC |
| Authority | OBSERVATIONAL_ONLY |
| Blocking | DISABLED |
| Status | ACTIVE |

---

*Shadow Mode Charter v1.0.0*
*Target: intent-admissibility-frontier*
*Authority: PROVISIONAL*
