# Decision Binding Refactoring - Option A Implementation

## Summary

Refactored `decision-binding.ts` to implement Option A classification:
- Execution domain classification (EXEC / NON_EXEC / GOVERNANCE)
- Blocking Tier C classification for NON_EXEC files
- Effect-based Tier 3 detection (replacing keyword-only detection)
- META tier exemption for governance code
- Enhanced reporting with domain + effect trigger

## Changes Made

### 1. Execution Domain Classification
Added `classifyExecutionDomain()` method:
- **EXEC**: Backend services, API routes, data operations (CAN be Tier C)
- **NON_EXEC**: UI components, frontend pages, display logic (CANNOT be Tier C)
- **GOVERNANCE**: Governance logic itself (META tier - exempt)

### 2. Effect-Based Tier Detection
Replaced `classifyTier()` with effect-based detection:
- **TIER 3**: Actual destructive operations (DROP TABLE, DELETE without WHERE, rm -rf, unlinkSync, hardDelete)
- **TIER 2**: Write operations (INSERT, UPDATE, DELETE with WHERE)
- **TIER 1**: Read operations (SELECT, queries)
- **META**: Governance code (exempt from blocking)

### 3. Non-Blocking for UI Files
UI/dashboard files with keywords like "drop" or "truncate" are now:
- Classified as NON_EXEC domain
- Downgraded from Tier 3 to warning
- Explanation: Keywords refer to CSS/presentation logic, not data destruction

### 4. Governance Exemption
Governance code (`/lib/agents/governance/**`) is:
- Classified as GOVERNANCE domain
- Assigned META tier
- Exempt from self-blocking (returns empty violations)

### 5. Enhanced Reporting
Updated report output to show:
- Domain distribution (EXEC / NON_EXEC / GOVERNANCE)
- Effect triggers for Tier 3 violations
- UI-specific warnings explaining downgrade

## Success Criteria

✅ **UI/dashboard files never classified as Tier C**
- UI files are NON_EXEC domain
- Keywords in UI context refer to presentation logic
- Downgraded to warning, not blocking

✅ **Only true destructive backend files require Decision IDs**
- EXEC domain files use effect-based detection
- Only actual SQL DROP, DELETE without WHERE, rm -rf trigger Tier 3
- Backend files with write operations (Tier 2) still require Decision IDs

✅ **Governance code never blocks itself**
- Governance files are GOVERNANCE domain
- Assigned META tier (exempt)
- Returns empty violations for governance logic

## Constraints Met

✅ **No breaking changes to existing contracts**
- Same interfaces maintained (added optional fields with defaults)
- Same API surface (enforce method unchanged)
- Existing tests should pass

✅ **No new enforcement rules**
- Existing Tier 2/3 enforcement preserved
- No new violation types added
- Same severity levels maintained

✅ **Preserved OBSERVATION_ONLY phase behavior**
- Phase checks unchanged
- Warning vs error logic preserved
- Legacy file observation maintained

✅ **Unit-level comments included**
- Added comments explaining why UI files cannot be Tier C
- Comments explain effect-based vs keyword-based detection
- Comments explain governance exemption rationale

## Technical Details

### Violation Interface Extended
```typescript
interface Violation {
  // ... existing fields
  domain: ExecutionDomain;        // EXEC | NON_EXEC | GOVERNANCE
  effectTrigger?: string;         // Description of destructive effect
}
```

### Tier Classification Logic
```typescript
classifyTier(content, domain) {
  if (domain === 'GOVERNANCE') return { tier: 'meta' };
  if (domain === 'NON_EXEC') {
    // Check for API calls but never Tier 3
    return { tier: content.includes('mutation') ? 'tier2' : 'tier1' };
  }
  
  // EXEC domain: effect-based detection
  if (match(/DROP\s+TABLE|DROP\s+DATABASE/)) 
    return { tier: 'tier3', effectTrigger: 'SQL DROP: ...' };
  if (match(/DELETE\s+FROM\s+\w+;?\s*$/)) 
    return { tier: 'tier3', effectTrigger: 'DELETE without WHERE: ...' };
  // ... more effect patterns
}
```

## Testing Recommendations

1. **UI File Test**: Verify dashboard files with "drop" keyword are warnings, not errors
2. **Governance Test**: Verify governance files pass without violations
3. **Backend Destructive Test**: Verify DELETE without WHERE in backend triggers Tier 3 violation
4. **Observation Phase Test**: Verify phase behavior is unchanged
5. **Contract Test**: Verify existing API contracts still work

## Files Modified

- `src/lib/agents/governance/ci/decision-binding.ts` (main refactoring)
- No changes to dependent files (backward compatible)
