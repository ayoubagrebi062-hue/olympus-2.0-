# OLYMPUS Build Verification Script

End-to-end verification of the OLYMPUS build pipeline.

## Quick Start

```bash
# Full verification (5 minute timeout)
npm run build:verify

# Quick verification (2 minute timeout, skip smoke tests)
npm run build:verify:quick

# Verbose with output preserved
npm run build:verify:verbose
```

## What It Verifies

| Step | Description | Exit Code on Failure |
|------|-------------|---------------------|
| 1 | Create build via buildService.create() | 1 |
| 2 | Start build and wait for completion | 1 |
| 3 | Compile generated TypeScript (tsc --noEmit) | 2 |
| 4 | Run generated Vitest tests | 3 |
| 5 | Run smoke tests (HTTP 200, hydration) | 4 |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All verifications passed |
| 1 | Build creation or execution failed |
| 2 | TypeScript compilation failed |
| 3 | Generated tests failed |
| 4 | Smoke tests failed |
| 5 | Timeout exceeded |

## Options

```
--timeout=<ms>        Max wait time for build (default: 300000 = 5 min)
--description=<text>  Build description (default: simple todo app)
--tier=<tier>         Build tier: starter|professional|ultimate|enterprise
--skip-tests          Skip running generated tests
--skip-smoke          Skip smoke tests
--keep-output         Keep generated files after verification
--verbose, -v         Show detailed progress
--help, -h            Show help
```

## Expected Successful Output

```
🚀 OLYMPUS Build Verification

══════════════════════════════════════════════════
📋 Description: Simple todo app with add, delete, and complete functionality...
📋 Tier: starter
📋 Timeout: 300s

📋 Step 1: Creating build...
✅ Build created: bld_abc123xyz

📋 Step 2: Starting build and waiting for completion...
📋 Build started, waiting for completion...
✅ Build completed in 142.3s
📋 Phases completed: discovery → design → architecture → frontend → backend → integration → testing → deployment

📋 Step 3: Compiling generated code...
✅ TypeScript compilation passed

📋 Step 4: Running generated tests...
✅ All tests passed

📋 Step 5: Running smoke tests...
✅ Smoke tests passed

══════════════════════════════════════════════════
✅ BUILD VERIFICATION PASSED!
══════════════════════════════════════════════════
```

## Common Failure Modes

### 1. Build Timeout (Exit 5)
```
❌ BUILD VERIFICATION FAILED: Build timed out after 300000ms
```
**Cause:** Build took longer than timeout
**Fix:** Increase timeout with `--timeout=600000`

### 2. Build Failed (Exit 1)
```
❌ BUILD VERIFICATION FAILED: Build failed
```
**Causes:**
- Agent execution error
- Invalid prompt rejected by validation
- LLM API failure
- CONDUCTOR orchestration error

**Debug:**
- Check console logs for specific agent errors
- Verify API keys are configured
- Check CONDUCTOR logs

### 3. Compilation Failed (Exit 2)
```
❌ BUILD VERIFICATION FAILED: Compilation failed: Type error in src/components/Button.tsx
```
**Causes:**
- Generated code has TypeScript errors
- Missing type imports
- Invalid JSX syntax

**Fix:** Review agent output quality, check PIXEL agent prompts

### 4. Tests Failed (Exit 3)
```
❌ BUILD VERIFICATION FAILED: Tests failed: 3 test failures
```
**Causes:**
- Generated tests don't match generated code
- Missing test utilities
- Component rendering errors

**Debug:**
- Run `npm run build:verify:verbose` to see test output
- Check generated test files

### 5. Smoke Tests Failed (Exit 4)
```
❌ BUILD VERIFICATION FAILED: Smoke tests failed: 2 critical issues
```
**Causes:**
- App doesn't start (port conflict, missing deps)
- Routes return non-200 status
- React hydration errors
- Console errors on page load

**Debug:**
- Use `--keep-output` to preserve files
- Manually run `npm run dev` in output directory
- Check browser console

## CI Integration

```yaml
# GitHub Actions example
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build:verify:quick
        timeout-minutes: 10
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Interpreting Results

### Good Build
- All 5 steps pass
- Build completes in < 3 minutes for starter tier
- No warnings in output

### Acceptable Build
- Steps 1-3 pass
- Steps 4-5 have warnings but pass
- Build completes within timeout

### Failed Build
- Any step fails
- Requires investigation based on exit code
- Check verbose output for details

## Files Generated

During verification, the build generates files in the current working directory:
- `src/` - Generated React components, pages, hooks
- `prisma/` - Database schema (if backend enabled)
- `tests/` - Generated test files
- `public/` - Static assets

Use `--keep-output` to preserve these files for manual inspection.
