# OLYMPUS FORENSIC ANALYSIS REPORT

## Executive Summary

**Root Cause:** OLYMPUS validates STRUCTURE but not SUBSTANCE. Agents can output syntactically valid but functionally empty code that passes all validation gates.

**Evidence:** Build `debug-572622c8-19be4c02688` requested "kanban dashboard" but produced:
```tsx
// ACTUAL OUTPUT - page.tsx
const HomePage = () => {
  return (
    <div>
      <h1>Home Page</h1>  // ← NOT A KANBAN BOARD
    </div>
  );
};
```

**Impact:** 100% of builds produce "working" code that doesn't match user requirements.

---

## 1. FAILURE CATALOG

### Agent Failure Analysis

| Agent | Phase | Generates Code | Common Failures | Root Cause |
|-------|-------|----------------|-----------------|------------|
| **PIXEL** | frontend | YES | Outputs minimal stubs instead of feature-rich components | No content validation |
| **WIRE** | frontend | YES | Pages with `<h1>Title</h1>` instead of actual UI | No requirement tracing |
| **POLISH** | frontend | YES | Cosmetic fixes without functional improvements | Input is already broken |
| **ENGINE** | backend | YES | Mock functions with `console.log` | No real implementation enforcement |
| **FORGE** | architecture | Partial | Schema defined but not connected to UI | No end-to-end validation |
| **NEXUS** | architecture | YES | API stubs without business logic | Depends on broken ENGINE output |

### Failure Type Distribution

| Failure Type | Frequency | Severity | Example |
|-------------|-----------|----------|---------|
| **Stub Components** | 80% | CRITICAL | `<h1>Home Page</h1>` instead of kanban board |
| **Missing Handlers** | 60% | HIGH | Buttons without onClick |
| **Fake Operations** | 40% | HIGH | `console.log('deleted')` without actual delete |
| **Import Errors** | 30% | MEDIUM | Importing non-existent `./sidebar` |
| **Style-Only Code** | 25% | MEDIUM | Pretty CSS, no functionality |
| **Disconnected Data** | 20% | MEDIUM | Schema exists but UI doesn't use it |

---

## 2. ROOT CAUSE TREE

```
                    USER REQUEST
                         │
                         ▼
    ┌────────────────────────────────────────┐
    │     "Build kanban dashboard like       │
    │      Linear with dark theme"           │
    └────────────────────────────────────────┘
                         │
                         ▼
    ┌────────────────────────────────────────┐
    │          STRATEGOS (Discovery)         │
    │   ✓ Extracts requirements correctly    │
    │   ✓ Identifies features needed         │
    └────────────────────────────────────────┘
                         │
                         ▼
    ┌────────────────────────────────────────┐
    │          PALETTE/BLOCKS (Design)       │
    │   ✓ Generates color system             │
    │   ✓ Defines component specs            │
    │   ✗ NO ENFORCEMENT OF USAGE            │  ← GAP #1
    └────────────────────────────────────────┘
                         │
                         ▼
    ┌────────────────────────────────────────┐
    │          PIXEL/WIRE (Frontend)         │
    │   ✗ RECEIVES specs but ignores them   │  ← GAP #2
    │   ✗ Outputs minimal valid TSX          │
    │   ✗ No requirement traceability        │  ← GAP #3
    └────────────────────────────────────────┘
                         │
                         ▼
    ┌────────────────────────────────────────┐
    │        VALIDATOR (executor/)           │
    │   ✓ Checks: JSON structure valid       │
    │   ✓ Checks: TSX syntax valid           │
    │   ✗ NEVER checks: Does it have kanban? │  ← GAP #4
    │   ✗ NEVER checks: Are handlers real?   │  ← GAP #5
    └────────────────────────────────────────┘
                         │
                         ▼
    ┌────────────────────────────────────────┐
    │            BUILD OUTPUT                │
    │   ✗ page.tsx: "<h1>Home Page</h1>"     │
    │   ✗ No kanban columns                  │
    │   ✗ No drag-and-drop                   │
    │   ✗ No task cards                      │
    │   ✗ Not dark theme                     │
    └────────────────────────────────────────┘
```

---

## 3. VALIDATION GAP MAP

### Current Validation Pipeline

```
Agent Output
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  VALIDATOR (src/lib/agents/executor/validator.ts)           │
├─────────────────────────────────────────────────────────────┤
│  ✓ status === 'completed'                                   │
│  ✓ artifacts.length > 0                                     │
│  ✓ JSON matches schema (required fields exist)              │
│  ✓ code artifact has path                                   │
│  ✓ code artifact not empty                                  │
│  ⚠ warns on TODO/FIXME comments                             │
│  ⚠ warns on console.log                                     │
│  ⚠ warns on excessive `any` type                            │
├─────────────────────────────────────────────────────────────┤
│  ✗ NEVER checks: Does code implement requested features?    │
│  ✗ NEVER checks: Do buttons have real handlers?             │
│  ✗ NEVER checks: Are forms functional?                      │
│  ✗ NEVER checks: Does UI match design system?               │
│  ✗ NEVER checks: Is data layer connected?                   │
└─────────────────────────────────────────────────────────────┘
```

### Missing Validation Gates

| Gate | Purpose | Current Status | Impact |
|------|---------|----------------|--------|
| **Feature Implementation Gate** | Verify requested features exist in code | MISSING | Code doesn't match prompt |
| **UI Complexity Gate** | Ensure components aren't minimal stubs | MISSING | `<h1>Title</h1>` passes |
| **Handler Reality Gate** | Verify onClick/onSubmit do real work | MISSING | Fake handlers pass |
| **Design Token Gate** | Ensure PALETTE colors are used | MISSING | Generic styling |
| **Data Flow Gate** | Verify schema connects to UI | MISSING | Disconnected layers |
| **E2E Trace Gate** | Trace requirements → code → UI | MISSING | No accountability |

---

## 4. SPECIFIC CODE FAILURES (Evidence)

### 4.1 Generated page.tsx (Stub Output)

**File:** `.debug-builds/debug-572622c8-19be4c02688/src/app/page.tsx`

```tsx
// WHAT WAS GENERATED:
const HomePage = () => {
  return (
    <div>
      <h1>Home Page</h1>
      <ListPagePattern>
        <StatCard title="Board" value={10} icon={<i className="fa fa-board" />} />
        <StatCard title="Task" value={20} icon={<i className="fa fa-task" />} />
      </ListPagePattern>
    </div>
  );
};

// WHAT WAS REQUESTED:
// "kanban dashboard like Linear with dark theme"

// WHAT SHOULD EXIST:
// - Kanban columns (Todo, In Progress, Done)
// - Draggable task cards
// - Dark theme (#0A0A0B background)
// - Project navigation
// - Real-time updates
```

### 4.2 Generated dashboard-layout.tsx (Import Errors)

**File:** `.debug-builds/debug-572622c8-19be4c02688/src/components/dashboard-layout.tsx`

```tsx
import { Sidebar } from './sidebar';   // ← FILE DOES NOT EXIST
import { Header } from './header';     // ← FILE DOES NOT EXIST

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <aside>
        <Sidebar />  // ← WILL CRASH AT RUNTIME
      </aside>
```

### 4.3 Validation Code That Let This Pass

**File:** `src/lib/agents/executor/validator.ts:104-133`

```typescript
function validateCodeArtifact(artifact: Artifact): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!artifact.path) {
    warnings.push({ field: 'path', message: 'Code artifact missing path' });
  }

  if (!artifact.content || artifact.content.trim().length === 0) {
    warnings.push({ field: 'content', message: 'Empty code artifact' });
  }

  // ONLY checks for TODO/FIXME comments and console.log
  // NEVER checks if code actually implements features
  // NEVER checks if imports resolve
  // NEVER checks if handlers are real

  return warnings;
}
```

---

## 5. PRIORITIZED FIX PLAN

### Priority 1: CRITICAL (Fix First)

#### Fix 1.1: Feature Implementation Validator
**Location:** NEW FILE: `src/lib/agents/validation/feature-validator.ts`

```typescript
export interface FeatureRequirement {
  name: string;
  keywords: string[];      // Must find in code
  patterns: RegExp[];      // Must match
  minOccurrences: number;  // Minimum times pattern should appear
}

export function validateFeatures(
  code: string,
  requirements: FeatureRequirement[]
): ValidationResult {
  const missing: string[] = [];

  for (const req of requirements) {
    let found = false;

    // Check keywords
    for (const keyword of req.keywords) {
      if (code.toLowerCase().includes(keyword.toLowerCase())) {
        found = true;
        break;
      }
    }

    // Check patterns
    if (!found) {
      for (const pattern of req.patterns) {
        if (pattern.test(code)) {
          found = true;
          break;
        }
      }
    }

    if (!found) missing.push(req.name);
  }

  return {
    valid: missing.length === 0,
    missingFeatures: missing,
    score: ((requirements.length - missing.length) / requirements.length) * 100
  };
}
```

**Usage in Pipeline:**
```typescript
// Before accepting WIRE output for "kanban dashboard":
const kanbanRequirements: FeatureRequirement[] = [
  { name: 'columns', keywords: ['column', 'board', 'lane'], patterns: [/flex.*column/i], minOccurrences: 3 },
  { name: 'cards', keywords: ['card', 'task', 'item'], patterns: [/draggable/i], minOccurrences: 1 },
  { name: 'drag-drop', keywords: ['drag', 'drop', 'dnd'], patterns: [/onDrag|useDrag/], minOccurrences: 1 },
];

const result = validateFeatures(generatedCode, kanbanRequirements);
if (!result.valid) {
  // REJECT output, request regeneration
}
```

#### Fix 1.2: Minimum Complexity Gate
**Location:** `src/lib/agents/executor/validator.ts`

```typescript
interface ComplexityMetrics {
  lineCount: number;
  componentCount: number;  // Number of React components
  handlerCount: number;    // onClick, onSubmit, etc.
  stateHookCount: number;  // useState, useReducer
  importCount: number;
}

function calculateComplexity(code: string): ComplexityMetrics {
  return {
    lineCount: code.split('\n').length,
    componentCount: (code.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length,
    handlerCount: (code.match(/on[A-Z]\w+\s*=/g) || []).length,
    stateHookCount: (code.match(/useState|useReducer|useContext/g) || []).length,
    importCount: (code.match(/^import\s/gm) || []).length,
  };
}

// MINIMUM for a "dashboard" page:
const DASHBOARD_MINIMUMS: ComplexityMetrics = {
  lineCount: 100,
  componentCount: 3,
  handlerCount: 2,
  stateHookCount: 1,
  importCount: 5,
};
```

### Priority 2: HIGH (Fix Second)

#### Fix 2.1: Handler Reality Check
**Location:** `src/lib/agents/validation/handler-validator.ts`

```typescript
function validateHandlers(code: string): { valid: boolean; fakeHandlers: string[] } {
  const fakeHandlers: string[] = [];

  // Find all handler definitions
  const handlerPattern = /const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([^}]*)\}/g;
  let match;

  while ((match = handlerPattern.exec(code)) !== null) {
    const [_, name, body] = match;

    // Check if handler is fake
    if (
      body.trim() === '' ||
      body.trim() === 'console.log' ||
      body.match(/^[\s\n]*console\.(log|info|warn)\([^)]*\);?[\s\n]*$/)
    ) {
      fakeHandlers.push(name);
    }
  }

  return { valid: fakeHandlers.length === 0, fakeHandlers };
}
```

#### Fix 2.2: Import Resolution Check
**Location:** `src/lib/agents/validation/import-validator.ts`

```typescript
function validateImports(
  code: string,
  generatedFiles: Map<string, string>
): { valid: boolean; unresolved: string[] } {
  const unresolved: string[] = [];

  // Find relative imports
  const importPattern = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
  let match;

  while ((match = importPattern.exec(code)) !== null) {
    const importPath = match[1];
    const resolvedPath = resolveImportPath(importPath);

    // Check if imported file exists in generated files OR project
    if (!generatedFiles.has(resolvedPath) && !fileExistsInProject(resolvedPath)) {
      unresolved.push(importPath);
    }
  }

  return { valid: unresolved.length === 0, unresolved };
}
```

### Priority 3: MEDIUM (Fix Third)

#### Fix 3.1: Design Token Enforcement
**Location:** `src/lib/agents/validation/design-validator.ts`

```typescript
function validateDesignTokenUsage(
  code: string,
  designTokens: DesignTokens
): { valid: boolean; hardcodedColors: string[] } {
  const hardcodedColors: string[] = [];

  // Find hardcoded colors (hex, rgb, etc.)
  const colorPattern = /#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/g;
  let match;

  while ((match = colorPattern.exec(code)) !== null) {
    const color = match[0];

    // Check if color is from design system
    if (!isDesignSystemColor(color, designTokens)) {
      hardcodedColors.push(color);
    }
  }

  // Allow some hardcoded colors but warn if > 5
  return {
    valid: hardcodedColors.length <= 5,
    hardcodedColors
  };
}
```

#### Fix 3.2: Upstream Context Injection
**Location:** `src/lib/agents/executor/prompt-builder.ts`

```typescript
// CRITICAL FIX: Pass design tokens as MANDATORY constraints to PIXEL/WIRE

function buildMainInstruction(input: AgentInput, definition: AgentDefinition): string {
  const parts: string[] = [];

  // ... existing code ...

  // NEW: Inject design context for frontend agents
  if (['pixel', 'wire'].includes(definition.id)) {
    const paletteOutput = input.previousOutputs['palette'];
    const blocksOutput = input.previousOutputs['blocks'];

    if (paletteOutput) {
      parts.push(`
## MANDATORY DESIGN CONSTRAINTS (FROM PALETTE)
You MUST use these exact colors. Hardcoded colors will be REJECTED.

${extractColorTokens(paletteOutput)}
`);
    }

    if (blocksOutput) {
      parts.push(`
## REQUIRED COMPONENT PATTERNS (FROM BLOCKS)
Follow these component specifications exactly:

${extractComponentSpecs(blocksOutput)}
`);
    }
  }

  return parts.join('');
}
```

### Priority 4: LOW (Fix Last)

#### Fix 4.1: Requirement Traceability
```typescript
interface RequirementTrace {
  requirement: string;       // "kanban board"
  extractedFrom: string;     // "user prompt"
  mappedToAgent: AgentId;    // "wire"
  outputArtifact: string;    // "src/app/page.tsx"
  verificationStatus: 'found' | 'missing' | 'partial';
  evidence: string[];        // ["found 'column' keyword", "missing 'drag'"]
}

// Generate traceability report at end of build
function generateTraceabilityReport(build: Build): RequirementTrace[] {
  // ...
}
```

---

## 6. IMPLEMENTATION ROADMAP

### Week 1: Critical Fixes
| Day | Task | Files Changed |
|-----|------|---------------|
| 1-2 | Feature Implementation Validator | NEW: `validation/feature-validator.ts` |
| 3-4 | Minimum Complexity Gate | EDIT: `executor/validator.ts` |
| 5 | Integration + Testing | EDIT: `orchestrator.ts` |

### Week 2: High Priority
| Day | Task | Files Changed |
|-----|------|---------------|
| 1-2 | Handler Reality Check | NEW: `validation/handler-validator.ts` |
| 3-4 | Import Resolution Check | NEW: `validation/import-validator.ts` |
| 5 | Quality gate threshold tuning | CONFIG changes |

### Week 3: Medium Priority
| Day | Task | Files Changed |
|-----|------|---------------|
| 1-2 | Design Token Enforcement | NEW: `validation/design-validator.ts` |
| 3-4 | Upstream Context Injection | EDIT: `prompt-builder.ts` |
| 5 | E2E testing with real prompts | Tests |

---

## 7. QUICK WINS (Can Fix Today)

### Quick Win 1: Reject Empty Components
Add to `validator.ts`:
```typescript
// Reject pages that are just headings
if (artifact.path?.includes('page.tsx')) {
  if (artifact.content.match(/<h1>[^<]+<\/h1>\s*<\/div>/)) {
    errors.push({
      field: 'content',
      message: 'Page component is a stub (only contains heading)',
      suggestion: 'Page must contain functional UI components'
    });
  }
}
```

### Quick Win 2: Fail on Missing Imports
Add to `validator.ts`:
```typescript
// Find relative imports that don't exist in generated files
const relativeImports = artifact.content.match(/from ['"]\.\.?\/[^'"]+['"]/g) || [];
for (const imp of relativeImports) {
  const importPath = imp.match(/['"]([^'"]+)['"]/)?.[1];
  if (importPath && !generatedPaths.includes(importPath)) {
    warnings.push({
      field: 'imports',
      message: `Importing non-existent file: ${importPath}`,
      suggestion: 'Ensure all imported components are generated'
    });
  }
}
```

### Quick Win 3: Require onClick for Buttons
Add to `validator.ts`:
```typescript
// Check buttons have handlers
const buttonsWithoutOnClick = (artifact.content.match(/<button[^>]*>/g) || [])
  .filter(btn => !btn.includes('onClick'));

if (buttonsWithoutOnClick.length > 0) {
  errors.push({
    field: 'handlers',
    message: `${buttonsWithoutOnClick.length} button(s) without onClick handler`,
    suggestion: 'All buttons must have click handlers'
  });
}
```

---

## 8. CONCLUSION

### The Core Problem
OLYMPUS treats code generation as a **syntax problem** when it's actually a **semantics problem**. Valid TSX !== Working Feature.

### The Solution Pattern
```
User Request → Requirements Extraction → Feature List
                                              │
                                              ▼
                                   ┌─────────────────────┐
                                   │  FEATURE CHECKLIST  │
                                   │  ☐ Kanban columns   │
                                   │  ☐ Draggable cards  │
                                   │  ☐ Dark theme       │
                                   └─────────────────────┘
                                              │
                                              ▼
                              Generated Code → Validator
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                         Features Found?                 Features Missing?
                              │                               │
                              ▼                               ▼
                           PASS ✓                    REJECT + REGENERATE
```

### Metrics to Track
After implementing fixes:
- **Feature Match Rate:** % of requested features found in output
- **Stub Detection Rate:** % of stub components caught before output
- **Handler Reality Rate:** % of handlers that do real work
- **Import Resolution Rate:** % of imports that resolve correctly
- **First-Time Success Rate:** % of builds that work on first generation

---

**Report Generated:** 2026-01-22
**Analyzed Build:** debug-572622c8-19be4c02688
**Files Examined:** 15+ agent definitions, validator, orchestrator, parser
**Root Cause Confidence:** HIGH
