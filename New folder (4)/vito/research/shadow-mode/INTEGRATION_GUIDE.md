# Shadow Mode Integration Guide

**Target:** intent-admissibility-frontier
**Mode:** PROVISIONAL
**Date:** 2026-01-19

---

## Overview

This guide documents how to integrate the shadow mode pipeline with an existing canonical pipeline without modifying the canonical code path.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INTEGRATION ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────────────────────────────────────────────────────┐     │
│    │                      CANONICAL PIPELINE                           │     │
│    │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────────────┐   │     │
│    │  │ Request │ → │ Parser  │ → │ Checks  │ → │ Verdict: ADMIT  │   │     │
│    │  │  Input  │   │         │   │         │   │         REJECT  │   │     │
│    │  └─────────┘   └─────────┘   └─────────┘   └─────────────────┘   │     │
│    └──────────────────────────────────────────────────────────────────┘     │
│              │                                          │                    │
│              │ (copy)                                   │ (canonical result) │
│              ▼                                          ▼                    │
│    ┌──────────────────────────────────────────────────────────────────┐     │
│    │                      SHADOW ADAPTER                               │     │
│    │                                                                   │     │
│    │  • Receives copy of request (non-blocking)                        │     │
│    │  • Waits for canonical verdict                                    │     │
│    │  • Invokes shadow pipeline                                        │     │
│    │  • Logs divergence                                                │     │
│    │                                                                   │     │
│    └──────────────────────────────────────────────────────────────────┘     │
│              │                                                               │
│              ▼                                                               │
│    ┌──────────────────────────────────────────────────────────────────┐     │
│    │                      SHADOW PIPELINE                              │     │
│    │  ┌────────────────┐  ┌──────────────┐  ┌──────────────────────┐  │     │
│    │  │ Provenance     │→ │ IAL-0 + HIA-1│→ │ HIC-1 Composition    │  │     │
│    │  │ Parser         │  │ + HIA-1      │  │ Check                │  │     │
│    │  └────────────────┘  └──────────────┘  └──────────────────────┘  │     │
│    │                                │                                  │     │
│    │                                ▼                                  │     │
│    │                    ┌────────────────────┐                         │     │
│    │                    │ Provisional Verdict│                         │     │
│    │                    └────────────────────┘                         │     │
│    └──────────────────────────────────────────────────────────────────┘     │
│              │                                                               │
│              ▼                                                               │
│    ┌──────────────────────────────────────────────────────────────────┐     │
│    │                      LOGGING LAYER                                │     │
│    │  ┌─────────────────┐       ┌─────────────────────┐               │     │
│    │  │ shadow-diff.json│       │ shadow-metrics.json │               │     │
│    │  │ (divergences)   │       │ (aggregates)        │               │     │
│    │  └─────────────────┘       └─────────────────────┘               │     │
│    └──────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### Option 1: Middleware Pattern (Recommended)

Insert shadow adapter as middleware that wraps the canonical pipeline:

```typescript
// shadow-adapter-middleware.ts

import { runShadowMode, ShadowPipelineInput } from './src/shadow-pipeline';

/**
 * Middleware that wraps canonical pipeline with shadow mode observation.
 * Does NOT modify canonical behavior.
 */
export function withShadowMode<T>(
  canonicalPipeline: (request: T) => Promise<{ verdict: 'ADMIT' | 'REJECT'; latencyMs: number }>
) {
  return async (request: T) => {
    const requestId = crypto.randomUUID();
    const timestamp = new Date();

    // Execute canonical pipeline (unchanged)
    const canonicalResult = await canonicalPipeline(request);

    // Fire shadow mode asynchronously (non-blocking)
    const shadowInput: ShadowPipelineInput = {
      requestId,
      timestamp,
      request: transformToShadowFormat(request),
      canonicalVerdict: canonicalResult.verdict,
    };

    // Don't await - fire and forget
    runShadowMode(shadowInput, canonicalResult.latencyMs).catch(() => {
      // Shadow errors are silent
    });

    // Return canonical result unchanged
    return canonicalResult;
  };
}

function transformToShadowFormat(request: unknown): ShadowPipelineInput['request'] {
  // Transform canonical request format to shadow format
  // Implementation depends on canonical request structure
  return {
    intents: [], // Extract intents from request
    context: {},
    rawInput: JSON.stringify(request),
  };
}
```

### Option 2: Event-Driven Pattern

Emit events that shadow mode subscribes to:

```typescript
// canonical-pipeline.ts (unchanged except event emission)

import { EventEmitter } from 'events';

export const pipelineEvents = new EventEmitter();

export async function canonicalPipeline(request: Request): Promise<Result> {
  const startTime = Date.now();

  // ... canonical processing ...

  const result = { verdict: 'ADMIT', ... };

  // Emit event for shadow mode (does not block)
  pipelineEvents.emit('verdict', {
    request,
    result,
    latencyMs: Date.now() - startTime,
  });

  return result;
}

// shadow-mode-subscriber.ts

import { pipelineEvents } from './canonical-pipeline';
import { runShadowMode } from './src/shadow-pipeline';

pipelineEvents.on('verdict', async (event) => {
  await runShadowMode({
    requestId: crypto.randomUUID(),
    timestamp: new Date(),
    request: transformRequest(event.request),
    canonicalVerdict: event.result.verdict,
  }, event.latencyMs);
});
```

### Option 3: Proxy Pattern

Proxy the canonical pipeline:

```typescript
// shadow-proxy.ts

import { runShadowMode } from './src/shadow-pipeline';

export function createShadowProxy<T extends object>(canonicalPipeline: T): T {
  return new Proxy(canonicalPipeline, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (typeof original === 'function' && prop === 'evaluate') {
        return async function(...args: unknown[]) {
          const startTime = Date.now();
          const result = await original.apply(target, args);

          // Shadow observation
          runShadowMode({
            requestId: crypto.randomUUID(),
            timestamp: new Date(),
            request: extractRequest(args),
            canonicalVerdict: result.verdict,
          }, Date.now() - startTime);

          return result;
        };
      }

      return original;
    },
  });
}
```

---

## Constraint Verification

### Constraint: canonicalPipelineUnmodified = true

**How to verify:**

```bash
# Before enabling shadow mode
git diff HEAD~1 -- path/to/canonical/pipeline

# Should show NO changes to canonical code
```

**Implementation pattern:**

- Shadow mode is purely additive (new files only)
- Canonical pipeline remains unchanged
- Integration happens at the adapter/middleware layer

### Constraint: noFeedbackIntoCanonical = true

**How to verify:**

```typescript
// Shadow pipeline MUST NOT:
// 1. Write to any canonical state
// 2. Modify canonical response
// 3. Throw errors that propagate to canonical
// 4. Share mutable state with canonical

// Shadow pipeline isolation:
const shadowState = new Map(); // Isolated state
const shadowLogs = [];         // Isolated logs

// NO references to canonical state
// NO modifications to request/response
// NO shared memory
```

---

## Configuration

### Environment Variables

```bash
# Shadow mode configuration
SHADOW_MODE_ENABLED=true
SHADOW_MODE_AUTHORITY=OBSERVATIONAL_ONLY
SHADOW_MODE_POSITION=PRE-SEMANTIC
SHADOW_MODE_TIMEOUT_MS=5000
SHADOW_MODE_LOG_DIR=/var/log/shadow-mode

# Review gate configuration
SHADOW_REVIEW_TRIALS=1000
SHADOW_REVIEW_HOURS=168
```

### Runtime Configuration

```typescript
// shadow-config.ts

export const SHADOW_CONFIG = {
  // Mode settings
  enabled: process.env.SHADOW_MODE_ENABLED === 'true',
  mode: 'PROVISIONAL' as const,
  position: 'PRE-SEMANTIC' as const,
  authority: 'OBSERVATIONAL_ONLY' as const,

  // Performance settings
  timeoutMs: parseInt(process.env.SHADOW_MODE_TIMEOUT_MS || '5000'),
  maxConcurrent: 10,

  // Logging settings
  logDir: process.env.SHADOW_MODE_LOG_DIR || './logs',
  rotateAfterMB: 100,

  // Review gate
  reviewAfterTrials: parseInt(process.env.SHADOW_REVIEW_TRIALS || '1000'),
  reviewAfterHours: parseInt(process.env.SHADOW_REVIEW_HOURS || '168'),
};
```

---

## Logging Output

### shadow-diff.json

Location: `research/shadow-mode/logs/shadow-diff.json`

```json
{
  "version": "1.0.0",
  "mode": "PROVISIONAL",
  "target": "intent-admissibility-frontier",
  "startTimestamp": "2026-01-19T00:00:00.000Z",
  "entries": [
    {
      "timestamp": "2026-01-19T00:01:00.000Z",
      "requestId": "550e8400-e29b-41d4-a716-446655440000",
      "canonicalVerdict": "ADMIT",
      "provisionalVerdict": "REJECT",
      "isDivergent": true,
      "divergenceType": "SHADOW_MORE_STRICT",
      "divergenceReason": "Shadow rejected with codes [HIC-001] but canonical admitted",
      "intentProvenance": {
        "declared": ["reduceLogging:system", "exportData:customers"],
        "derived": [],
        "confidence": 1.0,
        "semanticTags": ["REDUCES_OBSERVABILITY", "ACCESSES_SENSITIVE"]
      },
      "rejectionTaxonomy": ["HIC-001"],
      "latencyMs": {
        "canonical": 45,
        "shadow": 120
      }
    }
  ],
  "summary": {
    "totalEntries": 100,
    "divergentCount": 5,
    "divergenceRate": 0.05,
    "byType": {
      "shadowMoreStrict": 4,
      "shadowMorePermissive": 1,
      "sameVerdictDifferentReason": 0
    }
  }
}
```

### shadow-metrics.json

Location: `research/shadow-mode/logs/shadow-metrics.json`

```json
{
  "version": "1.0.0",
  "mode": "PROVISIONAL",
  "target": "intent-admissibility-frontier",
  "window": {
    "startTimestamp": "2026-01-19T00:00:00.000Z",
    "endTimestamp": "2026-01-19T12:00:00.000Z",
    "durationHours": 12,
    "isRolling": true
  },
  "metrics": {
    "volume": {
      "totalRequests": 1000,
      "divergentRequests": 50
    },
    "verdicts": {
      "canonical": { "admitted": 900, "rejected": 100 },
      "provisional": { "admitted": 860, "rejected": 140 }
    },
    "divergence": {
      "byType": {
        "shadowMoreStrict": 40,
        "shadowMorePermissive": 10,
        "sameVerdictDifferentReason": 0
      }
    }
  },
  "successCriteria": {
    "zeroFalsePositives": { "status": "PASSING", "currentValue": 0 },
    "zeroHostileMisses": { "status": "PASSING", "currentValue": 0 },
    "determinismMaintained": { "status": "PASSING", "currentValue": 1.0 }
  },
  "reviewGate": {
    "trialsProcessed": 1000,
    "trialsRequired": 1000,
    "gateTriggered": true,
    "triggerReason": "TRIALS_REACHED"
  }
}
```

---

## Monitoring

### Health Check

```typescript
// shadow-health.ts

export function getShadowHealth(): ShadowHealthStatus {
  const metrics = metricsCollector.getMetrics();

  return {
    status: 'HEALTHY',
    mode: SHADOW_CONFIG.mode,
    authority: SHADOW_CONFIG.authority,
    trialsProcessed: metrics.volume.totalRequests,
    divergenceRate: metrics.volume.divergentRequests / metrics.volume.totalRequests,
    successCriteria: {
      falsePositives: metrics.successCriteria.falsePositives === 0,
      falseNegatives: metrics.successCriteria.falseNegatives === 0,
      determinism: metrics.successCriteria.determinismViolations === 0,
    },
    reviewGateTriggered: isReviewGateTriggered(),
  };
}
```

### Dashboard Queries

```sql
-- Divergence rate over time
SELECT
  date_trunc('hour', timestamp) as hour,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_divergent) as divergent,
  COUNT(*) FILTER (WHERE is_divergent)::float / COUNT(*) as rate
FROM shadow_entries
GROUP BY 1
ORDER BY 1;

-- Top divergence reasons
SELECT
  divergence_reason,
  COUNT(*) as count
FROM shadow_entries
WHERE is_divergent
GROUP BY 1
ORDER BY 2 DESC
LIMIT 10;
```

---

## Review Process

When review gate is triggered:

1. **Generate Review Report**
   ```bash
   node scripts/generate-shadow-review.js > SHADOW_MODE_REVIEW.md
   ```

2. **Analyze Divergences**
   - Review all `SHADOW_MORE_STRICT` cases (potential false positives)
   - Review all `SHADOW_MORE_PERMISSIVE` cases (potential hostile misses)
   - Verify determinism holds

3. **Make Decision**
   - `PROMOTE`: Shadow pipeline becomes canonical
   - `REVISE`: Adjust shadow pipeline, continue shadow mode
   - `ABANDON`: Disable shadow mode, revisit research

---

## Troubleshooting

### Shadow Mode Not Logging

```typescript
// Check if shadow mode is enabled
console.log('Shadow enabled:', SHADOW_CONFIG.enabled);

// Check log directory permissions
fs.accessSync(SHADOW_CONFIG.logDir, fs.constants.W_OK);

// Check for silent errors
runShadowMode(input, latency).catch(console.error);
```

### High Divergence Rate

If divergence rate > 10%:

1. Review recent divergent entries
2. Identify most common divergence reason
3. Verify shadow pipeline correctness
4. Consider adjusting sensitivity

### Shadow Mode Impacting Performance

If canonical latency increases:

1. Verify shadow mode is truly non-blocking
2. Check for shared resource contention
3. Reduce shadow timeout
4. Consider sampling instead of full coverage

---

*Integration Guide v1.0.0*
*Shadow Mode: PROVISIONAL*
*Authority: OBSERVATIONAL_ONLY*
