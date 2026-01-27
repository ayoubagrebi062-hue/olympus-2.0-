# System Reality Declaration

> Ground truth contract for OLYMPUS/Vito codebase.
> Last updated: 2026-01-19
> **POST-DECOMMISSION STATE** - UI layer fully removed

## Current Architecture

OLYMPUS is now a **headless backend** with:
- 87 API routes (authentication, billing, builds, storage, monitoring)
- 35-agent orchestration pipeline
- Quality governance layer
- Multi-provider LLM support

## Implemented (Executable)

These systems are production-ready and actively used:

- **Build Orchestrator** (`src/lib/agents/orchestrator/`)
  - Agent pipeline execution
  - Phase coordination
  - Build lifecycle management

- **Agent Pipeline** (35 agents)
  - `src/lib/agents/` - Core agent infrastructure
  - Provider management, context handling, execution

- **Auth System**
  - `src/lib/auth/` - Authentication and authorization
  - Supabase integration, session management

- **Billing System**
  - `src/lib/billing/` - Stripe integration
  - Subscriptions, usage tracking, webhooks

- **Infrastructure**
  - `src/lib/api/` - API utilities, rate limiting, caching
  - `src/lib/supabase/` - Database client
  - `src/lib/storage/` - File storage
  - `src/lib/monitoring/` - Error tracking, metrics
  - `src/lib/jobs/` - Background job processing
  - `src/lib/security/` - Security utilities

- **Quality Layer**
  - `src/lib/quality/` - Constitutional tests, truth artifacts
  - Governance enforcement, architecture guards

## REMOVED (Post-Decommission)

The following were removed on 2026-01-19:

- **Dashboard UI** (`src/app/(dashboard)/`)
  - 17 page files removed
  - Onboarding, templates, projects, billing pages

- **UI Components** (`src/components/`)
  - 53 component files removed
  - All React components (auth, billing, quality, storage, ui)

- **Client Hooks** (`src/hooks/`)
  - 19 hook files removed
  - Billing, realtime, storage, feature flag hooks

- **Preview System** (`src/lib/preview/`)
  - Sandpack integration removed
  - Live preview renderer removed

- **Realtime System** (`src/lib/realtime/`)
  - SSE event streaming removed
  - Build progress subscriptions removed

- **Middleware** (`src/middleware.ts`)
  - Dashboard routing middleware removed

- **Broken APIs**
  - `src/app/api/debug/*` - Broken debug routes
  - `src/app/api/research/*` - Research APIs
  - `src/app/api/dashboard/*` - Dashboard-specific APIs
  - `src/app/api/orders/*`, `products/*`, `customers/*`, `store/*`, `newsletter/*` - Ecommerce APIs

## Frozen (Type-Correct but Inactive)

These systems exist but are not part of active runtime:

- **Intent Governance** (`src/lib/quality/intent-governance.ts`)
  - Schema exists, not enforced at runtime
  - May have type errors

- **Truth Artifacts** (`src/lib/quality/truth-artifact.ts`)
  - Generates "Why This Shipped" explanations
  - Not integrated with any frontend (UI removed)

## Not Implemented (Conceptual Only)

These exist ONLY in research documentation:

- **ICE** (Intent Collapse Engine) - `research/requirement-trace/`
- **CIN** (Canonical Intent Normalization) - `research/requirement-trace/`
- **IE** (Inevitability Engine) - `research/requirement-trace/`
- **NE** (Necessity Engine) - `research/requirement-trace/`
- **MCCS** (Minimal Causal Cut Sets) - `research/requirement-trace/`
- **AEC** (Architectural Entropy Control) - `research/requirement-trace/`
- **RLL** (Reality Lock-In Layer) - `research/requirement-trace/`
- **OCIC** (OLYMPUS Causal Intervention Computer) - `research/requirement-trace/`
- **ORIS** (OLYMPUS Runtime Immune System) - `research/requirement-trace/`
- **OFEL** (OLYMPUS Forensic Execution Layer) - `research/requirement-trace/`

## Rule

```
NO CONCEPTUAL SYSTEM MAY BE REFERENCED IN RUNTIME CODE
UNLESS LISTED AS "IMPLEMENTED" ABOVE.
```

Any import or reference to ICE, CIN, IE, NE, MCCS, etc.
in production code (`src/`) is a violation of this contract.

## Quarantined

These routes are disabled and moved to `src/_disabled/`:

- `src/_disabled/debug/` - Debug API routes (artifacts, build, test-agent)

## Verification

To verify system reality:

```bash
# Check for forbidden imports
grep -r "import.*from.*research" src/ --include="*.ts"
grep -r "ICE\|CIN\|NE\|IE\|MCCS" src/lib/ --include="*.ts"

# Should return empty (no violations)

# Verify no UI components exist
ls src/components/  # Should fail (directory doesn't exist)
ls src/hooks/       # Should fail (directory doesn't exist)
ls src/lib/preview/ # Should fail (directory doesn't exist)
```

---

*This document is the ground truth contract for the codebase.*
*Update this file when system status changes.*
