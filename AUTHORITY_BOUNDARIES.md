# AUTHORITY BOUNDARIES

> Autonomous Governance Auditor Census
> **Generated:** 2026-01-18
> **Status:** READ-ONLY ANALYSIS

---

## AUTHORITY DOMAINS AND OWNERS

### FOUNDATION LAYER

#### Identity Verification Authority

**Claimed Owner:** `IdentityAuthority` class
**File:** `src/lib/agents/governance/authority/identity/index.ts`
**Declared Responsibility:**

- Verify agent existence
- Validate version format
- Validate role enum
- Validate fingerprint format
- Append verification results to ledger

**Actual Behavior:**

- Performs identity checks
- Writes to `governance_ledger` table
- Calls `getAgent()` from registry
- Uses crypto primitives for fingerprint computation

**Inputs Trusted:**

- `AgentIdentity` object from caller
- Agent registry (via `getAgent()`)
- Ledger store (injected constructor)

**Outputs Produced:**

- `VerificationResult` with pass/fail
- Ledger entries for each verification
- Verification metrics (success rate, duration)

**State Mutation:**

- YES: Writes to `governance_ledger` table

**Enforcement vs Observation:**

- ENFORCES: Rejects invalid identities

**Source of Truth:**

- CLAIMS to be sole identity verifier
- CONFLICT: `StructuralIdentityInvariant` performs same checks

---

#### Lifecycle Authority

**Claimed Owner:** `AgentLifecycleAuthority` class
**File:** `src/lib/agents/governance/lifecycle/authority/AgentLifecycleAuthority.ts`
**Declared Responsibility:**

- ONLY entity that may write lifecycle state in sealed system
- Enforces lifecycle state machine transitions
- Audits all lifecycle changes to ledger

**Actual Behavior:**

- Validates state transitions per contract
- Updates lifecycle records in store
- Appends ledger entries for each transition
- Prevents transitions from RETIRED (terminal state)

**Inputs Trusted:**

- `TransitionRequest` from caller
- `IAgentLifecycleStore` (injected constructor)
- `ILedgerStore` (injected constructor)

**Outputs Produced:**

- `TransitionResult` with new state
- Ledger entries for each transition
- Error thrown for illegal transitions

**State Mutation:**

- YES: Updates lifecycle records in store
- YES: Appends to ledger

**Enforcement vs Observation:**

- ENFORCES: Rejects illegal transitions
- ENFORCES: Throws error if RETIRED state

**Source of Truth:**

- CLAIMS to be sole lifecycle state writer
- DOCUMENTED: "ZERO RUNTIME LOGIC" - deterministic only
- RISK: In-memory build locks in `PostgresLedgerStore` bypass this authority

---

#### Seal Authority

**Claimed Owner:** `GOVERNANCE_SEAL` constant
**File:** `src/lib/agents/governance/governance-seal.ts`
**Declared Responsibility:**

- Immutable declaration of governance system completeness
- Version 8.0.0 sealed and immutable
- No modifications allowed without breaking seal

**Actual Behavior:**

- Exports constant object
- Contains version, layers, modules, hash
- Cannot be modified (marked as `as const`)

**Inputs Trusted:**

- None (hard-coded constant)

**Outputs Produced:**

- Seal status (true/false)
- Version (8.0.0)
- Authorized layers and modules
- Seal hash

**State Mutation:**

- NO: Read-only constant

**Enforcement vs Observation:**

- OBSERVES: Declares current state
- ENFORCED BY: `SealInvariant` class

**Source of Truth:**

- CLAIMS to be single source of truth for governance system
- CONFLICT: Multiple seal-related exports (`GOVERNANCE_SEAL_INVARIANT`)

---

### PERSISTENCE LAYER

#### Audit Trail Authority

**Claimed Owner:** UNRESOLVED (4 competing writers)
**Files:**

- `src/lib/agents/governance/persistence/verification-store.ts` (AuditStore class)
- `src/lib/security/audit-log.ts` (OLYMPUS 3.0 audit)
- `src/lib/auth/security/audit.ts` (OLYMPUS 2.0 auth audit)
- `supabase/migrations/20240117000001_phase2_audit_tables.sql` (table schema)

**Declared Responsibility (varies by implementation):**

- GovernanceAuditStore: Log governance actions (identity, lease, monitor, orchestrator, kill_switch)
- SecurityAuditLog: Log user auth events (login, logout, password change)
- OLYMPUS3Audit: Log all application events with in-memory buffer

**Actual Behavior:**

- ALL write to same `audit_logs` table
- Different schemas: governance uses `entity_type`, auth uses `action_description`
- No coordination between writers
- No conflict detection or resolution

**Inputs Trusted:**

- Caller-provided action data
- Supabase client credentials

**Outputs Produced:**

- Audit record IDs
- None (writes only)

**State Mutation:**

- YES: Inserts into `audit_logs` table

**Enforcement vs Observation:**

- OBSERVES: All writers append-only
- NO ENFORCEMENT: No one validates or restricts writes

**Source of Truth:**

- CONFLICT: 4 writers claim audit authority
- RISK: Schema mismatches, conflicting assumptions

---

#### Verification Store Authority

**Claimed Owner:** `VerificationStore` class
**File:** `src/lib/agents/governance/persistence/verification-store.ts`
**Declared Responsibility:**

- Log all verification attempts to `agent_verifications` table
- Provide verification metrics (success rate, duration)

**Actual Behavior:**

- Inserts verification records to Supabase
- Calculates metrics from historical data
- No enforcement - storage only

**Inputs Trusted:**

- `VerificationRecord` from caller
- Supabase client credentials

**Outputs Produced:**

- Verification record IDs
- Verification metrics

**State Mutation:**

- YES: Inserts into `agent_verifications` table

**Enforcement vs Observation:**

- OBSERVES: Storage only
- NO ENFORCEMENT

**Source of Truth:**

- CLAIMS to be verification storage
- CLEAR: Single writer for this table

---

### ENFORCEMENT LAYER

#### Ledger Authority

**Claimed Owner:** `PostgresLedgerStore` class
**File:** `src/lib/agents/governance/ledger/postgres-store.ts`
**Declared Responsibility:**

- Append-only immutable ledger
- Hash chain verification
- Build-level locking

**Actual Behavior:**

- Appends entries to `governance_ledger` table
- Computes SHA-256 hashes for chain integrity
- Maintains in-memory build locks with TTL
- Provides consistency verification

**Inputs Trusted:**

- `GovernanceLedgerEntry` from caller
- Supabase client credentials

**Outputs Produced:**

- Ledger entry IDs
- Latest ledger hash
- Consistency check results

**State Mutation:**

- YES: Inserts into `governance_ledger` table
- YES: Updates in-memory build lock map

**Enforcement vs Observation:**

- ENFORCES: Append-only pattern (no updates)
- ENFORCES: Build lock violations
- OBSERVES: Hash chain consistency check

**Source of Truth:**

- CLAIMS to be ledger authority
- RISK: In-memory locks not persisted
- RISK: `LedgerStoreExtended` interface allows other implementations

---

#### Invariant Authority

**Claimed Owner:** `MinimalInvariantEngine` class
**File:** `src/lib/agents/governance/invariant/core.ts`
**Declared Responsibility:**

- Execute all registered invariant checks
- Auto-register seal invariant (non-negotiable)

**Actual Behavior:**

- Runs all invariants sequentially
- Auto-registers `sealInvariant` in constructor
- Allows manual registration of additional invariants
- Collects results and metrics

**Inputs Trusted:**

- `AgentIdentity` from caller
- Registered invariants (from constructor or manual)

**Outputs Produced:**

- `VerificationEvent` with all invariant results
- Individual `InvariantResult` per invariant

**State Mutation:**

- NO: Read-only verification

**Enforcement vs Observation:**

- ENFORCES: All invariants must pass (caller rejects failures)
- OBSERVES: Only checks, does not reject itself

**Source of Truth:**

- CLAIMS to be invariant engine
- CONFLICT: Allows manual registration after seal

---

### CONTROL LAYER

#### Control Plane Authority

**Claimed Owner:** `GovernanceControlPlane` class
**File:** `src/lib/agents/governance/control-plane/control-plane.ts`
**Declared Responsibility:**

- Kill switch activation/release
- Build pause/resume
- Tenant lock/unlock
- Control level escalation

**Actual Behavior:**

- Maintains in-memory control state
- Logs all control events to ledger
- Enforces authorization matrix (role-based)
- Provides control history

**Inputs Trusted:**

- Control action requests from caller
- `ILedgerStore` (injected constructor)
- `IAuditLogStore` (injected constructor)

**Outputs Produced:**

- `ControlDecision` with authorization result
- Control event IDs
- Control history

**State Mutation:**

- YES: Updates in-memory control state
- YES: Appends to ledger
- YES: Updates in-memory sets (pausedBuilds, lockedTenants)

**Enforcement vs Observation:**

- ENFORCES: Authorization matrix check
- ENFORCES: Halt state blocks other actions
- ENFORCES: Kill switch activation

**Source of Truth:**

- CLAIMS to be control plane authority
- CLEAR: Single component managing control state
- RISK: In-memory state not persisted

---

#### Epoch Authority

**Claimed Owner:** `EpochManager` class
**File:** `src/lib/agents/governance/epochs/epoch-manager.ts`
**Declared Responsibility:**

- Create and manage epochs
- Advance epoch phases
- Record metrics per epoch
- Execute auto-rollback if needed

**Actual Behavior:**

- Maintains in-memory epoch state
- Records metrics and violations
- Checks quorum requirements
- Provides epoch history

**Inputs Trusted:**

- Epoch configuration from caller
- Build completion notifications
- Violation records

**Outputs Produced:**

- `EpochState` objects
- `EpochTransition` records
- `EpochMetrics` objects

**State Mutation:**

- YES: Updates in-memory epoch state
- YES: Updates in-memory metrics

**Enforcement vs Observation:**

- ENFORCES: Max actions per epoch
- ENFORCES: Auto-rollback thresholds
- ENFORCES: Phase transition rules

**Source of Truth:**

- CLAIMS to be epoch authority
- CLEAR: Single epoch manager
- RISK: No database persistence (in-memory only)

---

#### Blast Radius Authority

**Claimed Owner:** `BlastRadiusEngine` class
**File:** `src/lib/agents/governance/blast-radius/engine.ts`
**Declared Responsibility:**

- Assess impact of failures
- Apply containment actions
- Manage blast zone policies
- Quarantine builds/tenants

**Actual Behavior:**

- Maintains in-memory assessments and policies
- Executes containment actions
- Updates quarantine sets
- Provides zone status

**Inputs Trusted:**

- Failure notifications (buildId, tenantId, agentId)
- Containment policy updates

**Outputs Produced:**

- `ImpactAssessment` objects
- `ContainmentAction` records
- `BlastZoneStatus` objects

**State Mutation:**

- YES: Updates in-memory quarantine sets
- YES: Updates in-memory zone status

**Enforcement vs Observation:**

- ENFORCES: Policy-based containment
- ENFORCES: Quarantine isolation

**Source of Truth:**

- CLAIMS to be blast radius authority
- CLEAR: Single blast radius engine
- RISK: No database persistence (in-memory only)

---

## UNRESOLVED AUTHORITY CONFLICTS

### 1. Audit Trail (CRITICAL)

**Conflict:** 4 writers to same `audit_logs` table

- `VerificationStore.AuditStore` (governance entities)
- `SecurityAuditLog` (auth events)
- `OLYMPUS3AuditLog` (all application events)
- Database schema (WORM constraint)

**Risk:**

- Schema mismatches (different column names)
- No coordination between writers
- Potential data corruption
- No single source of truth

**Status:** AMBIGUOUS - all 4 marked as AMBIGUOUS

---

### 2. Identity Verification

**Conflict:** 2 implementations perform same checks

- `IdentityAuthority` (verification with ledger)
- `StructuralIdentityInvariant` (runtime check)

**Risk:**

- Duplicate logic
- Inconsistent results if one changes
- Unclear which is authoritative

**Status:** AMBIGUOUS - both marked as AMBIGUOUS

---

### 3. Storage Abstraction

**Conflict:** 3 competing store interfaces

- `IGovernanceStore` (general governance)
- `IAgentLifecycleStore` (lifecycle specific)
- `PostgresGovernanceStore` (console.log stubs)

**Risk:**

- Unclear ownership
- Incomplete implementations
- Multiple layers of abstraction

**Status:** AMBIGUOUS - all marked as AMBIGUOUS

---

### 4. Build Locking

**Conflict:** Lock state in 2 locations

- `PostgresLedgerStore` (in-memory Map)
- `governance_ledger` table (BUILD_LEVEL_LOCK entries)

**Risk:**

- Inconsistent lock state
- No coordination between locations
- Lock bypass possible

**Status:** AMBIGUOUS - ledger marked as AMBIGUOUS

---

### 5. Seal Invariants

**Conflict:** Seal registered in 2 locations

- `MinimalInvariantEngine` constructor (auto-register)
- Manual registration allowed after construction

**Risk:**

- Seal check not truly non-negotiable
- Potential for seal bypass
- Unclear enforcement path

**Status:** AMBIGUOUS - invariant engine marked as AMBIGUOUS

---

_This document is a READ-ONLY analysis. No modifications were made._
