# AUTHORITY REGISTRY

> OLYMPUS 2.0 - Constitutional Authority Registry
> **Status:** FINAL | **Effective:** 2026-01-18

---

## FOUNDATION LAYER

### Identity Authority

**Authority:** `IdentityAuthority`
**Location:** `src/lib/agents/governance/authority/identity/index.ts`
**Domain:** Agent identity verification

**Allowed Actions:**

- VERIFY: Check agent existence, version format, role enum, fingerprint format
- WRITE: Append verification results to `governance_ledger` table
- COMPUTE: Generate SHA-256 fingerprints

**Forbidden Actions:**

- WRITE to agent registry
- MODIFY verification records
- Bypass ledger audit trail

---

### Seal Authority

**Authority:** `GOVERNANCE_SEAL`
**Location:** `src/lib/agents/governance/governance-seal.ts`
**Domain:** Governance system immutability declaration

**Allowed Actions:**

- DECLARE: Expose seal status, version, authorized layers, modules
- READ: Provide seal hash and metadata

**Forbidden Actions:**

- MODIFY: Seal constant is `as const` (immutable)
- CHANGE: Version, layers, modules, or hash
- BYPASS: Seal invariant enforcement

---

## PERSISTENCE LAYER

### Verification Store Authority

**Authority:** `VerificationStore`
**Location:** `src/lib/agents/governance/persistence/verification-store.ts`
**Domain:** Verification records storage

**Allowed Actions:**

- WRITE: Insert records to `agent_verifications` table
- READ: Query verification metrics for agents
- PERSIST: Store verification attempts and results

**Forbidden Actions:**

- UPDATE: Modification of existing verification records
- DELETE: Removal of verification history

---

### Audit Trail Authority

**Authority:** `AuditStore` (governance)
**Location:** `src/lib/agents/governance/persistence/verification-store.ts`
**Domain:** Governance audit trail

**Allowed Actions:**

- WRITE: Insert records to `audit_logs` table
- READ: Query audit history for entities
- ENTITY TYPES: identity, lease, monitor, orchestrator, kill_switch, governance

**Forbidden Actions:**

- UPDATE: Modification of audit records
- DELETE: Removal of audit history
- ENTITY TYPES: Outside governance domain

---

## ENFORCEMENT LAYER

### Ledger Authority

**Authority:** `PostgresLedgerStore`
**Location:** `src/lib/agents/governance/ledger/postgres-store.ts`
**Domain:** Immutable governance ledger

**Allowed Actions:**

- APPEND: Write to `governance_ledger` table
- VERIFY: Hash chain consistency checks
- LOCK: Build-level lock operations
- READ: Query ledger entries

**Forbidden Actions:**

- UPDATE: Modification of ledger entries
- DELETE: Removal of ledger entries
- MODIFY: Hash chain tampering

---

### Invariant Authority

**Authority:** `MinimalInvariantEngine`
**Location:** `src/lib/agents/governance/invariant/core.ts`
**Domain:** Invariant rule enforcement

**Allowed Actions:**

- REGISTER: Add invariants to engine
- EXECUTE: Run all invariant checks
- AUTO-REGISTER: Seal invariant on construction

**Forbidden Actions:**

- SKIP: Bypass seal invariant registration
- MODIFY: Invariant behavior after seal

---

### Lifecycle Authority

**Authority:** `AgentLifecycleAuthority`
**Location:** `src/lib/agents/governance/lifecycle/authority/AgentLifecycleAuthority.ts`
**Domain:** Agent lifecycle state management

**Allowed Actions:**

- TRANSITION: Request lifecycle state changes
- VALIDATE: Check transition legality
- WRITE: Update lifecycle records in store
- AUDIT: Append lifecycle changes to ledger

**Forbidden Actions:**

- TRANSITION: From RETIRED state (terminal)
- MODIFY: Lifecycle record without ledger audit

---

## CONTROL LAYER

### Control Plane Authority

**Authority:** `GovernanceControlPlane`
**Location:** `src/lib/agents/governance/control-plane/control-plane.ts`
**Domain:** System-wide control operations

**Allowed Actions:**

- HALT: System halt/resume
- KILL_SWITCH: Activate/release kill switch
- BUILD_CONTROL: Pause/resume builds
- TENANT_CONTROL: Lock/unlock tenants
- ESCALATE: Control level escalation
- AUDIT: Log all control events to ledger

**Forbidden Actions:**

- BYPASS: Authorization matrix checks
- IGNORE: Halt state when system halted

---

### Epoch Authority

**Authority:** `EpochManager`
**Location:** `src/lib/agents/governance/epochs/epoch-manager.ts`
**Domain:** Time-based governance periods

**Allowed Actions:**

- CREATE: New epochs
- TRANSITION: Advance epoch phases
- RECORD: Build completion, action execution, violations
- METRICS: Calculate and store epoch metrics
- ROLLBACK: Automatic rollback on thresholds

**Forbidden Actions:**

- EXCEED: Max builds or actions per epoch
- TRANSITION: Invalid phase transitions

---

### Blast Radius Authority

**Authority:** `BlastRadiusEngine`
**Location:** `src/lib/agents/governance/blast-radius/engine.ts`
**Domain:** Impact isolation and containment

**Allowed Actions:**

- ASSESS: Evaluate failure impact
- CONTAIN: Apply isolation/quarantine actions
- POLICY: Define and update containment policies
- QUARANTINE: Build and tenant quarantine operations

**Forbidden Actions:**

- BYPASS: Policy-based containment rules
- ESCALATE: Without proper authorization

---

## READ-ONLY ARTIFACTS

### Structural Identity Invariant

**Status:** READ-ONLY
**Location:** `src/lib/agents/governance/invariant/structural.ts`
**Reason:** Duplicate of IdentityAuthority checks. Used for runtime validation only.

---

### Security Audit Log

**Status:** READ-ONLY
**Location:** `src/lib/auth/security/audit.ts`
**Reason:** Auth-specific audit. Conflicts with governance AuditStore authority.

---

### OLYMPUS 3.0 Audit Log

**Status:** READ-ONLY
**Location:** `src/lib/security/audit-log.ts`
**Reason:** In-memory buffer. Commented database integration. Not production-ready.

---

### Governance Store Interface

**Status:** READ-ONLY
**Location:** `src/lib/agents/governance/store/types.ts`
**Reason:** Interface definition. Not used by governance code.

---

### Lifecycle Store Interface

**Status:** READ-ONLY
**Location:** `src/lib/agents/governance/lifecycle/store.ts`
**Reason:** Interface contract. Enforced by IAgentLifecycleStore implementation.

---

### Postgres Governance Store

**Status:** READ-ONLY
**Location:** `src/lib/agents/governance/store/postgres/store.ts`
**Reason:** Console.log stubs. Not production implementation.

---

### Lifecycle Gate Interface

**Status:** READ-ONLY
**Location:** `src/lib/agents/governance/lifecycle/gate.ts`
**Reason:** Read-only validation interface. No state mutation.

---

### Ledger Store Extension

**Status:** READ-ONLY
**Location:** `src/lib/agents/governance/ledger/types.ts`
**Reason:** Interface extension. Implemented by PostgresLedgerStore.

---

### Ledger Hashing Utilities

**Status:** READ-ONLY
**Location:** `src/lib/agents/governance/ledger/hashing.ts`
**Reason:** Utility functions. Called by PostgresLedgerStore.

---

### Runtime Startup Wrapper

**Status:** READ-ONLY
**Location:** `src/lib/agents/governance/runtime-startup.ts`
**Reason:** Validation wrapper. Delegates to invariant engine.

---

### Crypto Primitives

**Status:** READ-ONLY
**Location:** `src/lib/agents/governance/primitives/crypto.ts`
**Reason:** Utility functions. SHA-256 hashing.

---

### Version Primitives

**Status:** READ-ONLY
**Location:** `src/lib/agents/governance/primitives/version.ts`
**Reason:** Utility functions. Semantic version operations.

---

### Database Tables (All)

**Status:** READ-ONLY
**Locations:** `supabase/migrations/*.sql`
**Reason:** Data structures. Authorities write to these tables.

---

### Governance Index

**Status:** READ-ONLY
**Location:** `src/lib/agents/governance/index.ts`
**Reason:** Export aggregator. Contains LSP warnings (re-export conflicts).

---

## DEAD ARTIFACTS

**None identified.**

---

## CONFLICT RESOLUTION DECLARATIONS

### Audit Trail Conflict (AUDIT-001)

**Resolution:** AuditStore (governance) declared authoritative for `audit_logs` table.
**Rationale:** Schema-aligned (`entity_type` enum). Governance domain authority.

### Identity Verification Conflict (IDENTITY-001)

**Resolution:** IdentityAuthority declared authoritative.
**Rationale:** Full implementation with ledger integration. StructuralIdentityInvariant read-only.

### Build Locking Conflict (LOCK-001)

**Resolution:** CONFLICT - No single authority declared.
**Rationale:** Lock state in memory and database without synchronization.
**Status:** UNRESOLVED

### Storage Abstraction Conflict (STORE-001)

**Resolution:** Direct Supabase access declared authoritative.
**Rationale:** Production code uses VerificationStore, not IGovernanceStore interfaces.

### Seal Invariant Conflict (SEAL-001)

**Resolution:** MinimalInvariantEngine declared authoritative.
**Rationale:** Auto-registers seal invariant. Manual registration risk acknowledged but not prohibited.

---

## AUTHORITY COUNT SUMMARY

**Authoritative Authorities:** 10
**Read-Only Artifacts:** 14
**Dead Artifacts:** 0
**Unresolved Conflicts:** 1

---

**CONSTITUTIONAL STATUS:** FINAL
**MODIFICATION PROHIBITED:** TRUE
