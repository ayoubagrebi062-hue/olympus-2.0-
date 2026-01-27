# OLYMPUS Research Boundaries

**Status:** ENFORCED
**Violations:** ARCHITECTURE_BREACH

---

## Hard Boundaries

These boundaries are non-negotiable and enforced by the build system.

### Boundary 1: No Merge Without Graduation

**Rule:**
Research code CANNOT merge into canonical code under any circumstances except through the formal graduation protocol.

**Enforcement:**
- Build fails if canonical imports from `/research`
- Error: `ARCHITECTURE_BREACH: Canonical importing from research`

**Why:**
Research code has not proven:
- Determinism
- Hostile resistance
- Invariant compatibility
- Regression safety

Ungraduated code is unverified code.

---

### Boundary 2: No Shared Mutable Logic

**Rule:**
Research and canonical code CANNOT share mutable state, configuration, or logic paths.

**Prohibited:**
```typescript
// FORBIDDEN: Shared module with runtime switch
export function score(intent) {
  if (process.env.USE_RESEARCH) {
    return researchScore(intent);  // BREACH
  }
  return canonicalScore(intent);
}
```

**Permitted:**
```typescript
// ALLOWED: Complete separation
// canonical/score.ts
export function score(intent) { /* canonical logic */ }

// research/score.ts
export function score(intent) { /* research logic */ }
```

**Why:**
Shared logic creates:
- Implicit dependencies
- Hidden state pollution
- Non-deterministic behavior
- Graduation bypass

---

### Boundary 3: No Claiming Parity Without Proof

**Rule:**
Research code CANNOT claim equivalence with canonical without passing graduation requirements.

**Prohibited claims:**
- "This produces the same results"
- "This is just a faster version"
- "This passes all tests"
- "This is ready to replace canonical"

**Required proof:**
- Determinism proof (same input → same output)
- Hostile intent coverage (0% leaks)
- Invariant compatibility (all guarantees maintained)
- Zero regression proof (SSI, W-ISS-D, UVD, IAL unchanged)

---

### Boundary 4: No Bypassing Critical Gates

**Rule:**
Research code CANNOT bypass HITH, IRCL, or IGE when claiming parity with canonical.

**Enforcement:**
If research code claims to produce ship-eligible builds, it must:
- Run HITH and block 100% hostile intents
- Run IRCL and detect all contradictions
- Run IGE and apply all governance rules

**Violation:**
```typescript
// BREACH: Claiming parity while skipping gates
function researchBuild() {
  // Skip hostile testing "for performance"
  const result = runPipelineWithoutHITH();  // BREACH
  return { canShip: true };  // FALSE CLAIM
}
```

---

## Soft Boundaries

These boundaries are recommended but not automatically enforced.

### Boundary 5: Comparison Required

**Recommendation:**
Research code SHOULD compare its outputs to canonical for every test case.

**Why:**
- Identifies divergence early
- Measures improvement claims
- Documents trade-offs
- Supports graduation evidence

---

### Boundary 6: Failure Documentation

**Recommendation:**
Research code SHOULD document all hostile test failures.

**Why:**
- Honest assessment of readiness
- Identifies attack vectors
- Guides improvement efforts
- Required for graduation

---

### Boundary 7: Version Tagging

**Recommendation:**
Research code SHOULD tag all outputs with `governanceAuthority: EXPERIMENTAL`.

**Why:**
- Prevents confusion with canonical
- Enables audit trails
- Supports debugging
- Required for graduation comparison

---

## Enforcement Mechanisms

### Build-Time Checks

The canonical build will fail if:

```typescript
// In canonical build guard
function checkArchitectureBreach(): void {
  // Check 1: No research imports
  const imports = getImportGraph();
  for (const imp of imports) {
    if (isCanonicalModule(imp.source) && isResearchModule(imp.target)) {
      throw new ArchitectureBreachError(
        `ARCHITECTURE_BREACH: ${imp.source} imports from research: ${imp.target}`
      );
    }
  }

  // Check 2: No shared mutable state
  const sharedState = findSharedMutableState();
  if (sharedState.length > 0) {
    throw new ArchitectureBreachError(
      `ARCHITECTURE_BREACH: Shared mutable state detected: ${sharedState.join(', ')}`
    );
  }
}
```

### Runtime Checks

If research code claims parity:

```typescript
// In research parity claim
function validateParityClaim(): void {
  if (!hithWasExecuted) {
    throw new ArchitectureBreachError(
      'ARCHITECTURE_BREACH: Parity claim without HITH execution'
    );
  }
  if (!irclWasExecuted) {
    throw new ArchitectureBreachError(
      'ARCHITECTURE_BREACH: Parity claim without IRCL execution'
    );
  }
  if (!igeWasExecuted) {
    throw new ArchitectureBreachError(
      'ARCHITECTURE_BREACH: Parity claim without IGE execution'
    );
  }
}
```

---

## Violation Consequences

When an `ARCHITECTURE_BREACH` is detected:

1. **Build Fails Immediately**
   - No partial success
   - No warnings-only mode
   - No override option

2. **Explicit Logging**
   ```
   [ARCHITECTURE_BREACH] Canonical code attempted to import from research
   [ARCHITECTURE_BREACH] Source: src/lib/quality/intent-governance.ts
   [ARCHITECTURE_BREACH] Target: research/experimental-scoring.ts
   [ARCHITECTURE_BREACH] BUILD TERMINATED
   ```

3. **No Workaround**
   - Cannot be disabled
   - Cannot be skipped
   - Must fix the violation

---

## Summary

| Boundary | Type | Enforcement |
|----------|------|-------------|
| No merge without graduation | Hard | Build-time |
| No shared mutable logic | Hard | Build-time |
| No claiming parity without proof | Hard | Runtime |
| No bypassing critical gates | Hard | Runtime |
| Comparison required | Soft | Recommended |
| Failure documentation | Soft | Recommended |
| Version tagging | Soft | Recommended |

---

*OLYMPUS Research - Bounded experimentation, not reckless change.*
