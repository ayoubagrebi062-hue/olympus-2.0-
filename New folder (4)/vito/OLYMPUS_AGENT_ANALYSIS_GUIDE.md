# OLYMPUS Agent System Analysis Guide (vito repo)
Location analyzed: C:\Users\SBS\Desktop\New folder (4)\vito
Date: 2026-01-24

## Purpose
This guide is the single source of truth for analyzing, fixing, and upgrading the OLYMPUS agent engine. It defines the goal, scope, protocol, and evidence required for every change so the system is consistent, verifiable, and future‑proof.

---

## 1) Agent System Snapshot (Source of Truth)
Primary source: src/lib/agents/registry/index.ts

- Total agents in registry: 39
- Phases in order: discovery → conversion → design → architecture → frontend → backend → integration → testing → deployment
- Tier mapping defines which agents execute at each product tier (starter/professional/ultimate/enterprise).
- ARTIST is part of the design phase and must execute when design is enabled.

### Non‑Negotiable Goal
Fix and upgrade the agent engine only. Do not change product UI, marketing pages, or unrelated features.

### Scope
- Registry: agent definitions, phases, tiers, dependencies.
- Orchestrator/planner: execution plan correctness.
- Validation: lint/type-check evidence after changes.

### Out of Scope
- Marketing pages and product features.
- Auth flows and UI polish.
- External integrations not tied to agent execution.

---

## 2) “Right Why” (Risk-Reduction Logic by Phase)

1) Discovery
Why: prevent building the wrong product or wrong MVP.
Risk reduced: market mismatch, unclear scope, wasted build time.

2) Conversion
Why: prevent weak messaging/CTA that kills adoption.
Risk reduced: low activation, poor signup rate, bad landing page performance.

3) Design
Why: prevent inconsistent UI/UX and low trust.
Risk reduced: churn due to bad UX, brand mismatch, accessibility risk.

4) Architecture
Why: prevent rework, scaling failures, and security holes.
Risk reduced: technical debt, unstable API, auth vulnerabilities.

5) Frontend
Why: deliver real pages/components with quality and responsiveness.
Risk reduced: unusable UI, broken interactions, failed QA.

6) Backend
Why: deliver real data workflows and services.
Risk reduced: fake CRUD, missing persistence, logic bugs.

7) Integration
Why: connect frontend/backend and external services reliably.
Risk reduced: broken API integrations, data desync, stale UI.

8) Testing
Why: avoid regressions before release.
Risk reduced: production bugs, broken user flows.

9) Deployment
Why: scale reliably in real environments.
Risk reduced: broken deploys, downtime, poor observability.

---

## 3) Full Agent Inventory (Role, Dependencies, Output)

### Discovery (5 agents)
- ORACLE — market research, competitor analysis. Depends on: none. Output: market_analysis, competitors, opportunities.
- EMPATHY — personas, pain points, user needs. Depends on: oracle. Output: personas, pain_points, user_goals.
- VENTURE — business model, pricing, unit economics. Depends on: oracle, empathy. Output: business_model, pricing, metrics.
- STRATEGOS — MVP scope, feature prioritization, roadmap. Depends on: oracle, empathy, venture. Output: featureChecklist + roadmap.
- SCOPE — in/out boundaries, constraints, assumptions. Depends on: strategos. Output: in_scope, out_of_scope, constraints, risks.

### Conversion (3 agents)
- PSYCHE — psychological triggers + WIIFM. Depends on: empathy. Output: psychology_profile, content_guidance.
- SCRIBE — copywriting using PAS/HSO/AIDA/CJN. Depends on: psyche, strategos. Output: headlines, body_copy, CTAs, sequences.
- ARCHITECT_CONVERSION — funnels + page structures. Depends on: scribe, venture. Output: page_blueprint, funnel_flow, urgency_plan.

### Design (6 agents)
- PALETTE — brand system + color tokens (WCAG AAA). Depends on: strategos, empathy. Output: color system + design tokens.
- GRID — layout grid + responsive breakpoints. Depends on: palette. Output: grid, breakpoints, layout patterns.
- BLOCKS — component system + atomic design. Depends on: palette, grid. Output: component specs and states.
- CARTOGRAPHER — wireframes + sitemap. Depends on: blocks, strategos. Output: pages, navigation, sitemap.
- FLOW — user journeys + states/validation. Depends on: cartographer, empathy. Output: flows, states, validation rules.
- ARTIST — image prompt generation (Leonardo). Depends on: strategos, palette. Output: image requirements + prompts.

### Architecture (6 agents)
- ARCHON — stack + architecture decisions. Depends on: strategos, scope. Output: tech_stack, architecture, auth, cache rules.
- DATUM — database schema + relationships. Depends on: archon, strategos. Output: tables, relationships, indexes, mock_data.
- NEXUS — API design + contracts. Depends on: archon, datum. Output: endpoints, schemas, error codes.
- FORGE — backend services + API route code. Depends on: datum, nexus. Output: API files and services.
- SENTINEL — security/auth/permissions. Depends on: archon, nexus. Output: auth_config, permissions, security_rules.
- ATLAS — infra/DevOps plan. Depends on: archon. Output: infra, docker, CI/CD, env_config.

### Frontend (3 agents)
- PIXEL — component implementation (reference quality). Depends on: blocks, archon.
- WIRE — page assembly + routing + responsiveness. Depends on: pixel, cartographer, flow, archon.
- POLISH — audit + fixes for consistency/accessibility. Depends on: pixel, wire.

### Backend (4 agents)
- ENGINE — core business logic. Depends on: forge, datum.
- GATEWAY — external APIs/OAuth. Depends on: engine, sentinel.
- KEEPER — persistence/caching/storage. Depends on: datum, engine.
- CRON — scheduled tasks/queues. Depends on: engine.

### Integration (4 agents)
- BRIDGE — API client hooks + caching. Depends on: gateway, engine.
- SYNC — realtime/WebSockets. Depends on: bridge, keeper.
- NOTIFY — email + in-app notifications. Depends on: engine.
- SEARCH — indexing + search APIs. Depends on: keeper, datum.

### Testing (4 agents)
- JUNIT — unit/integration tests (mandatory). Depends on: engine, pixel.
- CYPRESS — E2E tests. Depends on: wire, flow.
- LOAD — performance testing. Depends on: nexus.
- A11Y — accessibility audits. Depends on: pixel.

### Deployment (4 agents)
- DOCKER — container configs. Depends on: atlas.
- PIPELINE — CI/CD workflows. Depends on: docker, junit.
- MONITOR — logging/observability. Depends on: atlas.
- SCALE — auto-scaling/capacity. Depends on: atlas, load.

---

## 4) System Reality Map (Agent Engine Only)

### Present Today
- Registry exists and defines phases, agents, and tiers.
- Orchestrator and planner exist and compute execution plans.
- Type system defines all 39 agents, phases, and dependencies.

### Current Gaps (Root‑Cause Focus)
- Tier agent lists and phase configs can drift from registry definitions.
- Optional agents can be treated as executed without explicit outputs.
- Dependency resolution treats optional deps as satisfied without validation.
- Execution logs are not enforced as phase gate evidence.

### Future Gaps (Likely to Appear)
- Silent agent omission if new agents added without tier updates.
- Output schemas evolving without validation updates.
- Phase order changes without migration of gating logic.
- Parallel execution hiding dependency failures without clear artifacts.

### Mitigation Strategy
- Add explicit registry integrity checks in code.
- Keep a single phase‑to‑agent truth table.
- Validate output schemas on every execution.
- Store phase completion evidence per agent.

---

## 5) Operating Protocol (Must Always Be Followed)

### 5.1) Non‑Negotiables
- Goal lock: only agent‑system analysis and fixes.
- Context lock: use repo files as source of truth only.
- No drift: every change must update guide + code together.
- No skip: each phase gate must be satisfied with evidence.
- No hallucination: if data is missing, stop and locate it.
- No ambiguity: write the exact file path for every change.
- Stop condition: if a step cannot be verified, do not proceed.

### 5.2) Evidence Pack (Required for Every Fix)
- Agent inventory diff (before/after).
- Phase config diff (before/after).
- Tier config diff (before/after).
- Dependency graph impact (what becomes executable earlier/later).
- Validation output (lint/type-check).

### 5.3) Phase Gates (Pass/Fail)
- Registry gate: ALL_AGENTS includes every agent in types.
- Phase gate: each phase lists all its phase agents.
- Tier gate: each tier includes all agents for its phases.
- Dependency gate: every dependency exists and is in a reachable phase.
- Validation gate: lint + type-check pass after any change.

### 5.4) Fix Template (Required)
1. Problem statement (one sentence).
2. Root cause (file and line).
3. Fix plan (phase alignment).
4. Code change list (paths).
5. Evidence pack.

### Step 0 — Inputs (Mandatory)
Collect and confirm:
- Goal: agent system analysis and fixes only.
- Scope: registry, phases, tiers, dependencies, execution plan.
- Constraints: no UI work, no product features.

### Step 1 — Phase 1: Registry Integrity
Goal: match code definitions to typed identities.
Steps:
1. Compare AgentId list with ALL_AGENTS.
2. Confirm each agent file exports an AgentDefinition.
3. Add missing agents to design/phase lists.
Gate:
- ALL_AGENTS includes all AgentId values.
- No orphan agent definitions.

### Step 2 — Phase 2: Phase Coverage
Goal: each phase lists all its agents.
Steps:
1. For every phase registry file, list agent IDs.
2. Compare with PHASE_CONFIGS entries.
3. Fix mismatches and missing agents.
Gate:
- PHASE_CONFIGS exactly reflect phase agents.

### Step 3 — Phase 3: Tier Coverage
Goal: tiers include all agents for their phases.
Steps:
1. For each tier, union all agents from its phases.
2. Compare against tier agent list.
3. Add missing agents and remove out‑of‑phase agents.
Gate:
- Tier agent list equals phase union for that tier.

### Step 4 — Phase 4: Dependency Safety
Goal: dependencies are reachable and non‑optional.
Steps:
1. Validate every dependency exists in registry.
2. Validate dependencies are in same or earlier phases.
3. If optional dependencies exist, document the rationale.
Gate:
- No dependency points to missing or future agents.

### Step 5 — Phase 5: Execution Plan Sanity
Goal: planner outputs align with registry and tiers.
Steps:
1. Build a plan for each tier.
2. Verify agent counts and token estimates are coherent.
3. Confirm phase order in execution plan.
Gate:
- Build plan includes all phase agents for the tier.

### Step 6 — Phase 6: Validation and Evidence
Goal: traceable proof for each fix.
Steps:
1. Record diffs for registry/phase/tier changes.
2. Run lint + type-check.
3. Update this guide with the fix summary.
Gate:
- Evidence pack complete.

---

## 6) Concrete Next Actions for This Repo (Agent Engine Only)

Phase 1: Registry Integrity
- Lock ALL_AGENTS to include every AgentId.
- Add ARTIST to design phase and phase config.

Phase 2: Phase Coverage
- Ensure PHASE_CONFIGS list every phase agent.

Phase 3: Tier Coverage
- Align tier agent lists to phase unions.

Phase 4: Dependency Safety
- Verify all dependencies are reachable and not missing.

Phase 5: Execution Plan Sanity
- Validate planner output matches registry and tiers.

---

## 7) If You Truly Have 39 Agents
Status: ARTIST is now part of the design phase and registry.
Requirement:
- Keep ARTIST in ALL_AGENTS, design phase, and tier lists.

## 8) Fix Log Template (Append for Every Change)
Date:
Change summary:
Files changed:
Phase gates passed:
Evidence pack location:


---

## 8) Source Files (Primary References)
- src/lib/agents/registry/index.ts
- src/lib/agents/registry/discovery.ts
- src/lib/agents/registry/conversion.ts
- src/lib/agents/registry/design.ts
- src/lib/agents/registry/architecture.ts
- src/lib/agents/registry/frontend.ts
- src/lib/agents/registry/backend.ts
- src/lib/agents/registry/integration.ts
- src/lib/agents/registry/testing-deployment.ts
- src/lib/agents/registry/artist.ts
