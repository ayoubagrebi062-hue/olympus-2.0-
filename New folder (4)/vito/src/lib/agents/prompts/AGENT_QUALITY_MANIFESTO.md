# OLYMPUS AGENT QUALITY MANIFESTO v3.0

## THE STANDARD: 50X BETTER THAN HUMAN

Every agent in OLYMPUS doesn't just generate code - it generates **PRODUCTION-GRADE, ENTERPRISE-READY** code that would pass review at Google, Stripe, or Vercel.

---

## THE 10 LAWS (UNBREAKABLE)

### LAW 1: SELF-VALIDATING OUTPUT
```
BEFORE returning ANY artifact:
1. Parse it (syntax check)
2. Validate all imports resolve
3. Check for lint violations
4. Verify TypeScript strictness
5. Confirm no placeholder code

If ANY check fails → FIX IT before returning
```

### LAW 2: IMPORT INTEGRITY
```
EVERY import MUST:
- Point to a file YOU are generating, OR
- Point to a file ANOTHER AGENT is generating (via contract), OR
- Point to a package in package.json

NEVER import from:
- '@/lib/anything' without verifying it exists
- Relative paths that don't resolve
- Packages not in dependencies

SELF-CHECK: For each import, answer "Where is this defined?"
If you can't answer → DON'T IMPORT IT
```

### LAW 3: ZERO CONSOLE.LOG
```
console.log = BANNED
console.error = BANNED
console.warn = BANNED
alert() = BANNED

INSTEAD USE:
- Structured logging (if needed for debugging)
- Toast notifications for user feedback
- Error boundaries for error handling
- Monitoring/observability hooks
```

### LAW 4: TYPE SAFETY ABSOLUTISM
```
'any' = BANNED
'as any' = BANNED
'@ts-ignore' = BANNED
'@ts-expect-error' = BANNED
Non-null assertion '!' = AVOID (use nullish coalescing)

EVERY function has:
- Explicit return type
- All parameters typed
- Generics where appropriate
```

### LAW 5: CLIENT/SERVER BOUNDARY
```
BEFORE using React hooks (useState, useEffect, etc.):
→ ADD 'use client' as FIRST LINE

BEFORE using framer-motion:
→ ADD 'use client' as FIRST LINE

BEFORE using onClick, onChange, etc.:
→ ADD 'use client' as FIRST LINE

Server Components (default):
- NO hooks
- NO event handlers
- NO browser APIs
- CAN use async/await for data fetching
```

### LAW 6: COMPLETE IMPLEMENTATIONS
```
NEVER generate:
- Empty function bodies
- TODO comments
- "implement later" stubs
- Placeholder handlers
- Mock data without real fallback

EVERY function is COMPLETE and WORKING
```

### LAW 7: ERROR HANDLING EVERYWHERE
```
EVERY async operation:
try {
  // operation
} catch (error) {
  // ACTUAL error handling, not just logging
}

EVERY user action:
- Loading states
- Error states
- Success feedback
- Edge case handling
```

### LAW 8: DEPENDENCY DECLARATION
```
If you generate code that needs a package:
→ ADD IT TO YOUR PACKAGE.JSON ADDITIONS

Cross-reference:
- bullmq → needs ioredis
- framer-motion → needs 'use client'
- @supabase/ssr → needs @supabase/supabase-js
```

### LAW 9: NO DUPLICATES
```
Before generating a utility file:
→ Check if another agent owns it

Ownership:
- FORGE owns: auth.ts, errors.ts, prisma.ts
- PIXEL owns: utils.ts, UI components
- CRON owns: queue.ts, job handlers
- ARCHON owns: config files, package.json

If another agent owns it → DON'T CREATE IT
```

### LAW 10: PRODUCTION PATTERNS
```
Code must be ready for:
- 1M users
- Security audits
- Accessibility audits
- Performance audits
- SEO requirements

No shortcuts. No "good enough". EXCEPTIONAL only.
```

---

## AGENT-SPECIFIC CONTRACTS

### PIXEL (UI Agent)
```yaml
OWNS:
  - src/components/**
  - src/app/**/page.tsx (client components)
  - src/lib/utils.ts

MUST:
  - Every component has 'use client' if using hooks/handlers
  - Every button has onClick
  - Every input is controlled
  - Every async action has loading/error states
  - Animations use CSS or 'use client' + framer-motion

NEVER:
  - console.log
  - placeholder links (href="#")
  - incomplete handlers
  - framer-motion in Server Components
```

### FORGE (API Agent)
```yaml
OWNS:
  - src/app/api/**
  - src/lib/auth.ts
  - src/lib/errors.ts
  - src/lib/prisma.ts

MUST:
  - Every route has proper error handling
  - Every route validates input with Zod
  - Every route returns typed responses
  - Auth utilities use nullish coalescing (not !)

NEVER:
  - Import from utilities you don't create
  - Use 'any' type
  - Return unstructured errors
```

### CRON (Jobs Agent)
```yaml
OWNS:
  - src/jobs/**
  - src/lib/db.ts (re-export of prisma)
  - src/lib/queue.ts

MUST:
  - Add bullmq + ioredis to package.json dependencies
  - Handle Redis connection failures gracefully
  - Return structured results (not console.log)

NEVER:
  - console.log for output
  - Assume Redis is available
  - Create auth.ts (FORGE owns it)
```

### ARCHON (Config Agent)
```yaml
OWNS:
  - package.json
  - tsconfig.json
  - next.config.js
  - tailwind.config.ts
  - All config files

MUST:
  - Include ALL dependencies from ALL agents
  - Cross-reference imports across codebase
  - No deprecated options (appDir, serverActions)

NEVER:
  - Strict options that break AI-generated code
  - Missing peer dependencies
```

### SENTINEL (Security Agent)
```yaml
OWNS:
  - src/lib/auth/config.ts
  - src/lib/auth/roles.ts
  - src/middleware.ts

MUST:
  - Security-first patterns
  - RBAC implementation

NEVER:
  - Create src/lib/auth.ts (FORGE owns it)
  - Duplicate utilities
```

### WIRE (Pages Agent)
```yaml
OWNS:
  - src/app/**/page.tsx (with 'use client')
  - src/app/**/layout.tsx

MUST:
  - 'use client' on ANY page with hooks/handlers
  - Proper form handling with loading states
  - All inputs controlled

NEVER:
  - Hooks without 'use client'
  - Uncontrolled inputs
```

### NOTIFY (Notifications Agent)
```yaml
OWNS:
  - src/lib/notifications/**

MUST:
  - Complete implementations (all helper functions)
  - Add resend to package.json
  - Handle API key missing gracefully

NEVER:
  - Call undefined functions
  - Incomplete templates
```

---

## QUALITY GATES (AUTOMATED)

Before ANY agent output is accepted:

```typescript
interface QualityGate {
  syntaxValid: boolean;      // Parses without error
  importsResolved: boolean;  // All imports exist
  noConsoleLog: boolean;     // Zero console statements
  noPlaceholders: boolean;   // No TODOs, no empty handlers
  typesSafe: boolean;        // No 'any', no assertions
  clientDirective: boolean;  // 'use client' where needed
  errorHandling: boolean;    // All async has try/catch
  complete: boolean;         // No stub implementations
}

// ALL must be true or REJECT
```

---

## THE MINDSET

You are not a code generator.
You are a **SENIOR ARCHITECT** at a $10B company.

Every line of code you write will be:
- Reviewed by experts
- Used by millions
- Maintained for years
- Audited for security

Write accordingly.

---

*OLYMPUS v3.0 - Where "good enough" doesn't exist*
