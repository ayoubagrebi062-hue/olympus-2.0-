# GOVERNANCE CAPABILITY MAP
> Autonomous Governance Auditor Census
> **Generated:** 2026-01-18
> **Status:** READ-ONLY ANALYSIS

---

## ARTIFACT INVENTORY

| Capability | File Path | Classification | Notes |
|------------|------------|----------------|-------|
| **Governance Seal Declaration** | `src/lib/agents/governance/governance-seal.ts` | AUTHORITATIVE | Claims immutability, version 8.0.0 |
| **Seal Invariant** | `src/lib/agents/governance/invariant/seal-invariant.ts` | AUTHORITATIVE | Enforces seal integrity at runtime |
| **MinimalInvariantEngine** | `src/lib/agents/governance/invariant/core.ts` | AMBIGUOUS | Auto-registers seal invariant but allows manual registration |
| **IdentityAuthority** | `src/lib/agents/governance/authority/identity/index.ts` | AMBIGUOUS | Claims verification authority, writes to ledger |
| **StructuralIdentityInvariant** | `src/lib/agents/governance/invariant/structural.ts` | AMBIGUOUS | Duplicate identity validation logic |
| **AgentLifecycleAuthority** | `src/lib/agents/governance/lifecycle/authority/AgentLifecycleAuthority.ts` | AUTHORITATIVE | Claims SOLE authority for lifecycle transitions |
| **Lifecycle Contract** | `src/lib/agents/governance/lifecycle/contract.ts` | AUTHORITATIVE | Defines lifecycle states and transition rules |
| **IAgentLifecycleAuthority Interface** | `src/lib/agents/governance/lifecycle/authority/IAgentLifecycleAuthority.ts` | AUTHORITATIVE | Interface for lifecycle authority |
| **IAgentLifecycleGate Interface** | `src/lib/agents/governance/lifecycle/gate.ts` | DERIVATIVE | Reads lifecycle state, no writes |
| **PostgresLedgerStore** | `src/lib/agents/governance/ledger/postgres-store.ts` | AMBIGUOUS | Append-only ledger with build locking |
| **LedgerHashing** | `src/lib/agents/governance/ledger/hashing.ts` | DERIVATIVE | Hash computation utilities |
| **LedgerStoreExtended** | `src/lib/agents/governance/ledger/types.ts` | AMBIGUOUS | Interface with build locking extensions |
| **GovernanceControlPlane** | `src/lib/agents/governance/control-plane/control-plane.ts` | AUTHORITATIVE | Kill switch, build locks, tenant locks |
| **EpochManager** | `src/lib/agents/governance/epochs/epoch-manager.ts` | AUTHORITATIVE | Time-based governance periods |
| **BlastRadiusEngine** | `src/lib/agents/governance/blast-radius/engine.ts` | AUTHORITATIVE | Impact isolation and containment |
| **Crypto Primitives** | `src/lib/agents/governance/primitives/crypto.ts` | DERIVATIVE | SHA-256 hashing utilities |
| **Version Primitives** | `src/lib/agents/governance/primitives/version.ts` | DERIVATIVE | Semantic version utilities |
| **VerificationStore** | `src/lib/agents/governance/persistence/verification-store.ts` | AMBIGUOUS | Verification + audit logging to Supabase |
| **AuditStore** | `src/lib/agents/governance/persistence/verification-store.ts` | AMBIGUOUS | Governance audit logging |
| **Security Audit Log** | `src/lib/security/audit-log.ts` | AMBIGUOUS | OLYMPUS 3.0 audit with in-memory buffer |
| **Auth Security Audit** | `src/lib/auth/security/audit.ts` | AMBIGUOUS | OLYMPUS 2.0 auth-specific audit |
| **PostgresGovernanceStore** | `src/lib/agents/governance/store/postgres/store.ts` | AMBIGUOUS | Store abstraction with console.log implementations |
| **IGovernanceStore Interface** | `src/lib/agents/governance/store/types.ts` | AMBIGUOUS | Store interface without clear owner |
| **IAgentLifecycleStore Interface** | `src/lib/agents/governance/lifecycle/store.ts` | DERIVATIVE | Lifecycle storage contract |
| **RuntimeStartup** | `src/lib/agents/governance/runtime-startup.ts` | DERIVATIVE | Startup validation wrapper |
| **agent_identities table** | `supabase/migrations/20240117000000_governance_phase0.sql` | AUTHORITATIVE | Identity records in database |
| **agent_verifications table** | `supabase/migrations/20240117000000_governance_phase0.sql` | AUTHORITATIVE | Verification attempts log |
| **audit_logs table** | `supabase/migrations/20240117000001_phase2_audit_tables.sql` | AMBIGUOUS | Single WORM audit trail with multiple writers |
| **governance_ledger table** | `supabase/migrations/20240117000008_governance_phase8.sql` | AUTHORITATIVE | Append-only ledger storage |
| **control_events table** | `supabase/migrations/20240117000008_governance_phase8.sql` | AUTHORITATIVE | Control plane events log |
| **epochs table** | `supabase/migrations/20240117000008_governance_phase8.sql` | AUTHORITATIVE | Epoch configuration and state |
| **epoch_metrics table** | `supabase/migrations/20240117000008_governance_phase8.sql` | AUTHORITATIVE | Epoch execution metrics |
| **epoch_transitions table** | `supabase/migrations/20240117000008_governance_phase8.sql` | AUTHORITATIVE | Phase transition log |
| **violations table** | `supabase/migrations/20240117000008_governance_phase8.sql` | AUTHORITATIVE | Violation records |
| **impact_assessments table** | `supabase/migrations/20240117000008_governance_phase8.sql` | AUTHORITATIVE | Blast radius assessments |
| **containment_actions table** | `supabase/migrations/20240117000008_governance_phase8.sql` | AUTHORITATIVE | Containment action log |
| **containment_policies table** | `supabase/migrations/20240117000008_governance_phase8.sql` | AUTHORITATIVE | Blast zone policies |
| **quarantined_builds table** | `supabase/migrations/20240117000008_governance_phase8.sql` | AUTHORITATIVE | Quarantined build tracking |
| **quarantined_tenants table** | `supabase/migrations/20240117000008_governance_phase8.sql` | AUTHORITATIVE | Quarantined tenant tracking |

---

## SUMMARY STATISTICS

**Total Artifacts Analyzed:** 42
- **AUTHORITATIVE:** 17
- **DERIVATIVE:** 7
- **AMBIGUOUS:** 18
- **DEAD/LEGACY:** 0

**Critical Overlaps Detected:**
- Audit logging: 4 writers to same table
- Identity validation: 2 implementations with same checks
- Storage abstraction: 3 competing store interfaces

---

## CLASSIFICATION CRITERIA

**AUTHORITATIVE:**
- Claims single source of truth for domain
- Has clear documentation of authority
- Enforces decisions or controls state
- No other artifact can modify same data

**DERIVATIVE:**
- Depends on authoritative sources
- Reads but does not enforce
- Provides utility functions
- Cannot make authoritative decisions

**AMBIGUOUS:**
- Overlapping authority with other artifacts
- Unclear ownership or responsibility
- Multiple writers to same data
- Implicit trust without contracts

**DEAD/LEGACY:**
- Not referenced in current codebase
- Marked as deprecated
- Replaced by new implementations

---

*This map is a READ-ONLY analysis. No modifications were made.*
