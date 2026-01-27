# Phase A+ Destruction Semantics - Examples

## Example 1: Missing @destruction Block

**File:** `src/lib/storage/cleanup-service.ts`

**Code:**

```typescript
/**
 * Delete all files from storage (no WHERE clause)
 */
async cleanupTenantFiles(tenantId: string) {
  await supabase
    .from('files')
    .delete()  // No WHERE clause - GLOBAL scope
    .eq('tenant_id', tenantId);  // Still GLOBAL because DELETE comes first
}
```

**Inference:**

- Scope: GLOBAL (confidence: high)
- Pattern: "DELETE without WHERE clause"

**Warning:**

```
[PHASE A+ DESTRUCTION ANALYSIS] MISSING @destruction BLOCK: Tier 3 file lacks @destruction block.
Inferred scope: global (confidence: high).
Consider adding @destruction block for better documentation.
Format: @destruction { scope: "scope", reversibility: "reversible|hard_delete|soft_delete", justification: "reason" }
```

## Example 2: Scope Underestimation

**File:** `src/app/api/tenants/[tenantId]/route.ts`

**Code with @destruction block:**

```typescript
/**
 * Delete tenant - UNDERESTIMATED scope declaration
 */
@destruction {
  scope: "record",  // WRONG - actually deletes all tenant data
  reversibility: "hard_delete",
  justification: "Delete tenant account"
}

export async function DELETE(req, params) {
  // Deletes ALL tenant files, not just one record
  await supabase.from('files').delete().eq('tenant_id', params.tenantId);
  await supabase.from('projects').delete().eq('tenant_id', params.tenantId);
  await supabase.from('users').delete().eq('tenant_id', params.tenantId);
}
```

**Inference:**

- Scope: GLOBAL (confidence: high)
- Pattern: "DELETE without WHERE clause" (on first delete)

**Warning:**

```
[PHASE A+ DESTRUCTION ANALYSIS] UNDERESTIMATED SCOPE: Declared scope "record" is narrower than inferred scope "global".
Code patterns suggest wider impact. Inferred confidence: high.
Patterns: DELETE without WHERE clause.
```

## Example 3: Proper @destruction Block (No Warnings)

**File:** `src/lib/storage/file-service.ts`

**Code:**

```typescript
/**
 * Delete single file - CORRECT scope declaration
 */
@destruction {
  scope: "record",  // CORRECT - deletes one file by ID
  reversibility: "hard_delete",
  justification: "User requested permanent file deletion"
}

async deleteFile(fileId: string) {
  const file = await this.getFile(fileId);

  await supabase
    .from('files')
    .delete()
    .eq('id', fileId);  // WHERE id = ... (RECORD scope)

  await this.storage.delete(file.bucket, file.path);
}
```

**Inference:**

- Scope: RECORD (confidence: high)
- Pattern: "Record ID filter: .eq('id')"

**Result:**

```
[PHASE A+ DESTRUCTION ANALYSIS]
  [EXEC] src/lib/storage/file-service.ts | Effect: DELETE without WHERE
    Declared: scope="record", reversibility="hard_delete"
    Justification: User requested permanent file deletion
    Inferred: scope="record" (confidence: high)
    Patterns: Record ID filter: .eq('id')
    Scope Match: ✓ MATCH
    Warning: (none - scope matches)
```

## Example 4: Overestimation (Safe but Conservative)

**File:** `src/app/api/projects/[projectId]/route.ts`

**Code:**

```typescript
/**
 * Delete project - CONSERVATIVE scope declaration
 */
@destruction {
  scope: "tenant",  // CONSERVATIVE - actually project scope
  reversibility: "soft_delete",
  justification: "Archive project data"
}

export async function DELETE(req, params) {
  // Only deletes project-specific data
  await supabase.from('project_files').delete().eq('project_id', params.projectId);
  await supabase.from('project_settings').delete().eq('project_id', params.projectId);
  await supabase.from('projects').delete().eq('id', params.projectId);
}
```

**Inference:**

- Scope: PROJECT (confidence: medium)
- Pattern: "Project ID filter: .eq('project_id')"

**Warning:**

```
[PHASE A+ DESTRUCTION ANALYSIS] OVERESTIMATED SCOPE: Declared scope "tenant" is wider than inferred scope "project".
This is conservative and safe. Inferred confidence: medium.
Patterns: Project ID filter: .eq('project_id').
```

## Example 5: Reversibility Warning

**File:** `src/app/api/tenants/[tenantId]/route.ts`

**Code:**

```typescript
/**
 * Delete tenant with claimed reversibility
 */
@destruction {
  scope: "global",
  reversibility: "reversible",  // DANGEROUS - hard to reverse
  justification: "Delete all tenant data"
}

export async function DELETE(req, params) {
  await supabase.from('files').delete().eq('tenant_id', params.tenantId);
  await supabase.from('projects').delete().eq('tenant_id', params.tenantId);
  await supabase.from('users').delete().eq('tenant_id', params.tenantId);
}
```

**Inference:**

- Scope: GLOBAL (confidence: high)
- Pattern: "DELETE without WHERE clause"

**Warning:**

```
[PHASE A+ DESTRUCTION ANALYSIS] UNDERESTIMATED SCOPE: Declared scope "tenant" is narrower than inferred scope "global".
Code patterns suggest wider impact. Inferred confidence: high.
Patterns: DELETE without WHERE clause.

[PHASE A+ DESTRUCTION ANALYSIS] REVERSIBILITY WARNING: Declared reversibility as "reversible" but code patterns suggest global deletion, which may be difficult to reverse.
Review justifications carefully.
```

## Report Output Example

```
=== Phase A+ DESTRUCTION SEMANTICS ANALYSIS (WARNINGS ONLY) ===

Destruction analysis helps developers understand why their code is dangerous.
These are WARNINGS ONLY and will NOT block builds.

  [EXEC] src/lib/storage/cleanup-service.ts | Effect: DELETE without WHERE
    Declared: NONE (add @destruction block for documentation)
    Inferred: scope="global" (confidence: high)
    Patterns: DELETE without WHERE clause
    Scope Match: ✗ MISMATCH
    Warning: MISSING @destruction BLOCK: Tier 3 file lacks @destruction block. Inferred scope: global (confidence: high). Consider adding @destruction block for better documentation.

  [EXEC] src/app/api/tenants/[tenantId]/route.ts | Effect: DELETE without WHERE
    Declared: scope="record", reversibility="hard_delete"
    Justification: Delete tenant account
    Inferred: scope="global" (confidence: high)
    Patterns: DELETE without WHERE clause
    Scope Match: ✗ MISMATCH
    Warning: UNDERESTIMATED SCOPE: Declared scope "record" is narrower than inferred scope "global". Code patterns suggest wider impact. Inferred confidence: high.

  [EXEC] src/lib/storage/file-service.ts | Effect: DELETE without WHERE
    Declared: scope="record", reversibility="hard_delete"
    Justification: User requested permanent file deletion
    Inferred: scope="record" (confidence: high)
    Patterns: Record ID filter: .eq('id')
    Scope Match: ✓ MATCH
    Warning: (none - scope matches correctly)

=== Enforcement Complete ===

Decision binding check PASSED.
(Note: Phase A+ warnings are informational and do not block builds)
```

## Key Takeaways

1. **Warnings Only**: Phase A+ never blocks builds
2. **Educational**: Helps developers understand blast radius
3. **Scope Comparison**: Detects over/underestimation
4. **Reversibility Checks**: Flags unsafe claims
5. **No Friction**: Optional @destruction block
6. **Confidence Scoring**: Indicates inference reliability

## Benefits for Developers

✅ See actual blast radius (declared vs inferred)
✅ Understand why code is dangerous
✅ Get suggestions for documentation
✅ No CI blocking or friction
✅ Learn best practices for destructive operations
✅ Catch accidental over/underestimation
✅ Verify reversibility claims
