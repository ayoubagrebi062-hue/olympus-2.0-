# Conversion Intelligence Engine - Architecture

> **Future You**: Read this first. It will save you hours.

## Quick Mental Model (10 seconds)

```
Content → [15 Dimension Analyzers] → Weighted Scores → Total Score + Verdict
              ↓
         Each returns: { score: 0-100, issues[], suggestions[] }
```

## File Map

```
intelligence/
├── index.ts           # Public API exports (start here for usage)
├── fluent.ts          # World-class fluent API (analyze().score())
├── engine.ts          # Core engine: orchestrates dimensions, calculates scores
├── funnel-analyzer.ts # Multi-page funnel analysis
├── types.ts           # All TypeScript interfaces
├── ARCHITECTURE.md    # You are here
│
└── dimensions/        # Individual scoring algorithms
    ├── narrative-flow.ts    # Story structure (hook → problem → solution)
    ├── emotional-journey.ts # Emotional progression tracking
    └── cognitive-load.ts    # Readability & complexity
```

## The 15 Dimensions (engine.ts)

| Dimension         | Weight | What It Measures                        |
| ----------------- | ------ | --------------------------------------- |
| clarity           | 0.12   | Readability, sentence length, jargon    |
| emotional         | 0.10   | Emotional triggers, sentiment arc       |
| specificity       | 0.10   | Concrete details vs vague claims        |
| credibility       | 0.10   | Trust signals, proof, social proof      |
| urgency           | 0.08   | Time pressure, scarcity                 |
| wiifm             | 0.10   | "What's in it for me?" - benefits focus |
| objectionHandling | 0.08   | Addresses concerns preemptively         |
| cta               | 0.08   | Call-to-action strength                 |
| scannable         | 0.06   | Headers, bullets, formatting            |
| uniqueValue       | 0.06   | Differentiation from competitors        |
| narrativeFlow     | 0.04   | Story arc quality                       |
| emotionalJourney  | 0.04   | Emotional progression                   |
| cognitiveLoad     | 0.04   | Mental effort required                  |
| _2 more_          | ...    | Check engine.ts for current list        |

**Weights are in `DEFAULT_ENGINE_CONFIG`** (engine.ts:~line 30)

## How Scoring Works

```typescript
// Simplified algorithm
let totalScore = 0;
for (const [dimension, analyzer] of dimensions) {
  const result = analyzer(content); // Each returns 0-100
  totalScore += result.score * weights[dimension];
}
// totalScore is already 0-100 (weights sum to 1.0)
```

## How to Add a New Dimension

**Step 1**: Create analyzer in `dimensions/`

```typescript
// dimensions/social-proof.ts
export interface SocialProofResult {
  score: number; // 0-100
  confidence: number; // 0-1
  issues: ScoringIssue[];
  suggestions: Suggestion[];
}

export function analyzeSocialProof(content: string): SocialProofResult {
  // Your scoring logic here
}
```

**Step 2**: Add to types.ts

```typescript
// In AdvancedScoreDimensions interface
socialProof: DimensionScore;
```

**Step 3**: Add to engine.ts

```typescript
// In DEFAULT_ENGINE_CONFIG.weights
socialProof: 0.05,  // Steal weight from others (must sum to 1.0)

// In analyze() method - add the analyzer call
const socialProofResult = analyzeSocialProof(content);
dimensions.socialProof = {
  score: socialProofResult.score,
  weight: weights.socialProof,
  // ...
};
```

**Step 4**: Add tests in `__tests__/`

## Key Design Decisions (and WHY)

### Why hardcoded dimensions instead of plugin system?

- **Simplicity**: 15 dimensions is manageable
- **Performance**: No dynamic dispatch overhead
- **Type safety**: Full TypeScript inference
- **Trade-off**: Adding dimensions requires code changes

**If Future You needs plugins**: Convert `analyze()` to accept a `dimensions[]` config.

### Why module-level cache instead of instance cache?

- Most use cases have one engine
- Simpler API (no cache injection)
- **Trade-off**: Can't have multiple engines with different caches

**If Future You needs multi-cache**: Add `engine.withCache(customCache)` builder method.

### Why weights sum to 1.0?

- Direct percentage output (no normalization needed)
- Easy to reason about: "clarity is 12% of total score"
- **Trade-off**: Adding dimension requires re-balancing others

## Assumptions That May Change

| Assumption            | Why It Might Break                      | Mitigation                                    |
| --------------------- | --------------------------------------- | --------------------------------------------- |
| Analysis is sync      | LLM-powered analysis needs async        | Already async, but dimensions are sync        |
| 15 dimensions forever | New use cases need different dimensions | Consider dimension config in v3               |
| English only          | International expansion                 | Extract text patterns to config               |
| Single content type   | Rich content (HTML, Markdown)           | Already strips tags, but parser could improve |

## Performance Notes

- **Hot path**: `analyze()` → 15 dimension calls → score aggregation
- **Caching**: 5-minute TTL, 100 entry max (fluent.ts)
- **Memory**: History pruned at 1000 entries (engine.ts)
- **Timeout**: 30 seconds default (engine.ts)

## Testing Strategy

```
136 tests total:
├── 85 core engine tests (dimensions, edge cases, validation)
└── 51 fluent API tests (builders, caching, errors, observability)
```

Run: `npm test -- intelligence`

## Common Tasks

### "Score is too low/high for this content"

1. Check which dimensions are dragging it down: `analyze(content).dimensions()`
2. Adjust weights in `DEFAULT_ENGINE_CONFIG`
3. Or fix the specific dimension analyzer

### "Need to analyze without dimension X"

Currently not supported. Options:

1. Set weight to 0 (still runs, doesn't affect score)
2. Add dimension filtering to engine config (v3 feature)

### "Need custom scoring for my niche"

Pass `niche` option - some dimensions adjust based on it:

```typescript
analyze(content).inNiche('saas').run();
```

## Contact

Built during OLYMPUS 2.0 project, January 2026.
If this doc is outdated, check git blame on engine.ts.
