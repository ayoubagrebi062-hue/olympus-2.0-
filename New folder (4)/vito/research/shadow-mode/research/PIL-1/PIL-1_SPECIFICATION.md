# PIL-1: Power Invariant Layer Specification

**Research Track ID:** PIL-1
**Name:** Power Invariant Layer
**Status:** INITIATED
**Date:** 2026-01-19
**Constitution:** SMC-1

---

## Executive Summary

PIL-1 defines and enforces **forbidden authority and power states** through graph-based reasoning. Unlike text-based heuristic layers (HIA-1, HCA-1), PIL-1 operates on **capability graphs** to detect structurally forbidden power configurations that may not be apparent from textual analysis alone.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                     PIL-1: POWER INVARIANT LAYER                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   Objective:     Define and enforce forbidden authority/power states         ║
║   Position:      POST-CAPABILITY (after HCA-1), PRE-COMPOSITION (before HIC)║
║   Reasoning:     Graph-based ONLY                                            ║
║   Constraints:   Deterministic, No ML, No text heuristics                   ║
║                                                                              ║
║   Inputs:        HCA-1 capability graphs, SSC-2 corpus, S4 failures         ║
║   Outputs:       Formal invariants, Machine-checkable rules, Proofs         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Research Objectives

### Primary Objective
Define a set of **power invariants** that must never be violated, regardless of how they are achieved. These invariants capture forbidden states of authority that represent fundamental security violations.

### Secondary Objectives
1. Express invariants in machine-checkable form
2. Prove non-interference with benign intents
3. Integrate with HCA-1 capability detection
4. Achieve zero false positives on benign graphs

---

## Theoretical Foundation

### Power as Graph Structure

Power is modeled as a directed graph where:
- **Nodes** represent entities (users, resources, systems)
- **Edges** represent authority relationships (access, control, ownership)
- **Paths** represent transitive authority chains

```
┌──────────────────────────────────────────────────────────────────┐
│                    POWER GRAPH MODEL                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Entity Types:                                                   │
│   ├── ACTOR: User, Service, Process                              │
│   ├── RESOURCE: Data, System, Capability                         │
│   └── BOUNDARY: Sandbox, Scope, Domain                           │
│                                                                   │
│   Edge Types:                                                     │
│   ├── CONTROLS: Direct authority over resource                   │
│   ├── ACCESSES: Read/write capability                            │
│   ├── ELEVATES_TO: Privilege escalation path                     │
│   ├── IMPERSONATES: Identity assumption                          │
│   ├── BYPASSES: Constraint circumvention                         │
│   └── PERSISTS_BEYOND: Temporal scope violation                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Invariant Classes

PIL-1 defines three classes of invariants:

| Class | Symbol | Description |
|-------|--------|-------------|
| **Authority Invariants** | α | Forbidden authority configurations |
| **Boundary Invariants** | β | Forbidden boundary crossings |
| **Temporal Invariants** | τ | Forbidden persistence states |

---

## Formal Invariant Definitions

### α-Invariants: Authority Violations

```
α₁: UNIVERSAL_AUTHORITY_PROHIBITION
    ∄ actor a: ∀ resource r ∈ R, CONTROLS(a, r)
    "No actor may control all resources"

α₂: SELF_ELEVATION_PROHIBITION
    ∄ actor a: ELEVATES_TO(a, a') ∧ PRIVILEGE(a') > PRIVILEGE(a) ∧ ¬AUTHORIZED(a, elevate)
    "No actor may elevate own privileges without authorization"

α₃: CIRCULAR_AUTHORITY_PROHIBITION
    ∄ path P: CONTROLS(a, b) ∧ CONTROLS(b, c) ∧ ... ∧ CONTROLS(z, a)
    "No circular authority chains"

α₄: AUTHORITY_ACCUMULATION_PROHIBITION
    ∄ actor a, actors A: ∀ b ∈ A, IMPERSONATES(a, b) ∧ |A| > 1
    "No actor may accumulate authority from multiple identities"
```

### β-Invariants: Boundary Violations

```
β₁: SANDBOX_ESCAPE_PROHIBITION
    ∄ actor a, boundary b: INSIDE(a, b) ∧ CONTROLS(a, r) ∧ OUTSIDE(r, b)
    "No sandboxed actor may control external resources"

β₂: SCOPE_VIOLATION_PROHIBITION
    ∄ actor a: SCOPE(a) = S ∧ ACCESSES(a, r) ∧ SCOPE(r) ≠ S ∧ ¬PUBLIC(r)
    "No actor may access resources outside their scope"

β₃: CROSS_DOMAIN_LEAKAGE_PROHIBITION
    ∄ data d, domains D₁, D₂: ORIGIN(d) = D₁ ∧ DESTINATION(d) = D₂ ∧ ¬PERMITTED(D₁, D₂)
    "No data may cross unpermitted domain boundaries"
```

### τ-Invariants: Temporal Violations

```
τ₁: INFINITE_PERSISTENCE_PROHIBITION
    ∄ authority a: DURATION(a) = ∞ ∧ ¬REVOCABLE(a)
    "No irrevocable infinite authority"

τ₂: REVOCATION_ESCAPE_PROHIBITION
    ∄ actor a, authority auth: REVOKED(auth) ∧ STILL_HOLDS(a, auth)
    "No authority may survive revocation"

τ₃: SESSION_BOUNDARY_VIOLATION
    ∄ session s, authority auth: ENDS(s) ∧ PERSISTS(auth) ∧ BOUND_TO(auth, s)
    "Session-bound authority must not persist beyond session"
```

---

## Graph Representation

### Capability Graph Schema

```typescript
interface PowerGraph {
  nodes: PowerNode[];
  edges: PowerEdge[];
  boundaries: Boundary[];
  sessions: Session[];
}

interface PowerNode {
  id: string;
  type: 'ACTOR' | 'RESOURCE' | 'BOUNDARY';
  attributes: {
    privilege?: PrivilegeLevel;
    scope?: string;
    domain?: string;
  };
}

interface PowerEdge {
  source: string;
  target: string;
  type: EdgeType;
  attributes: {
    duration?: 'FINITE' | 'INFINITE';
    revocable?: boolean;
    authorized?: boolean;
  };
}

type EdgeType =
  | 'CONTROLS'
  | 'ACCESSES'
  | 'ELEVATES_TO'
  | 'IMPERSONATES'
  | 'BYPASSES'
  | 'PERSISTS_BEYOND';
```

### HCA-1 Integration

PIL-1 receives capability graphs derived from HCA-1 detections:

```
HCA-1 Capability Detection → Capability Graph → PIL-1 Invariant Check
```

Mapping from HCA-1 capabilities to graph edges:

| HCA-1 Capability | Graph Edge Type |
|------------------|-----------------|
| CAP-001 (Unauthorized Access) | ACCESSES (unauthorized=true) |
| CAP-002 (Privilege Acquisition) | ELEVATES_TO |
| CAP-003 (Data Exfiltration) | ACCESSES + boundary crossing |
| CAP-004 (Persistent Access) | PERSISTS_BEYOND |
| CAP-005 (Lateral Movement) | IMPERSONATES or cross-scope ACCESSES |
| CAP-006 (Audit Blindness) | BYPASSES (audit boundary) |
| CAP-007 (Environment Escape) | BYPASSES (sandbox boundary) |

---

## Machine-Checkable Rules

### Rule Format

Each invariant is expressed as a machine-checkable rule:

```typescript
interface InvariantRule {
  id: string;           // e.g., "PIL-α₁"
  class: 'α' | 'β' | 'τ';
  name: string;
  description: string;
  check: (graph: PowerGraph) => InvariantResult;
  severity: 'CRITICAL' | 'HIGH';
}

interface InvariantResult {
  violated: boolean;
  violations: Violation[];
  proof?: ProofTrace;
}

interface Violation {
  invariantId: string;
  nodes: string[];
  edges: string[];
  explanation: string;
}
```

### Checking Algorithm

```
ALGORITHM: CheckPowerInvariants(G)
INPUT: PowerGraph G
OUTPUT: List of violations

1. violations ← []
2. FOR each invariant I in INVARIANTS:
3.     result ← I.check(G)
4.     IF result.violated:
5.         violations.append(result.violations)
6. RETURN violations
```

---

## Proof of Non-Interference

### Theorem: Benign Intent Preservation

```
THEOREM: For any benign intent graph G_b, PIL-1 invariant checking
         produces zero violations.

PROOF SKETCH:
1. Define "benign" as satisfying:
   - No unauthorized authority claims
   - All accesses within declared scope
   - All persistence bounded and revocable

2. Show each invariant class preserves benign graphs:
   - α-invariants: Benign graphs have no universal/self-elevation/circular authority
   - β-invariants: Benign graphs have no boundary crossings
   - τ-invariants: Benign graphs have bounded, revocable authority

3. Verify against SSC-2 benign corpus (4,000 samples)
```

### Formal Verification Approach

1. **Model Checking**: Enumerate all possible benign graph structures
2. **Invariant Satisfaction**: Prove each invariant holds for benign class
3. **Completeness**: Prove all hostile graphs violate at least one invariant

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SHADOW PIPELINE WITH PIL-1                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Stage 0: PROVENANCE_PARSER                                                 │
│            │                                                                 │
│            ▼                                                                 │
│   Stage 1: IAL0_AUTHENTICATOR                                               │
│            │                                                                 │
│            ▼                                                                 │
│   Stage 2: HIA1_DETECTOR (Semantic Hostility)                               │
│            │                                                                 │
│            ▼                                                                 │
│   Stage 3: HCA1_ANALYZER (Capability Detection)                             │
│            │                                                                 │
│            ├──────────────────────────────┐                                 │
│            ▼                              ▼                                 │
│   Stage 4: PIL1_CHECKER ◄──── NEW     HIC1_CHECKER                         │
│            │    (Power Invariants)    (Composition)                         │
│            │                              │                                 │
│            └──────────────┬───────────────┘                                 │
│                           ▼                                                 │
│                        VERDICT                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Research Phases

### Phase 1: Foundation (Current)
- [x] Define theoretical framework
- [x] Specify invariant classes
- [ ] Implement graph data structures
- [ ] Create HCA-1 → Graph transformation

### Phase 2: Implementation
- [ ] Implement α-invariant checkers
- [ ] Implement β-invariant checkers
- [ ] Implement τ-invariant checkers
- [ ] Build proof trace generator

### Phase 3: Validation
- [ ] Test against SSC-2 hostile corpus
- [ ] Verify against SSC-2 benign corpus
- [ ] Analyze historical S4 failures
- [ ] Generate non-interference proof

### Phase 4: Integration
- [ ] Integrate with shadow pipeline
- [ ] Run stress campaign (SSC-3)
- [ ] Validate in observation window
- [ ] Promote to ENFORCING

---

## Constraints Compliance

| Constraint | Implementation |
|------------|----------------|
| Deterministic | Graph algorithms are pure functions |
| No ML | Rule-based checking only |
| No text heuristics | Operates on graphs, not text |
| Graph-based only | All reasoning via graph traversal |

---

## Expected Outputs

### 1. Formal Invariant Specification
`PIL-1_INVARIANTS.json` - Machine-readable invariant definitions

### 2. Machine-Checkable Rules
`src/pil1-invariant-checker.ts` - Rule implementation

### 3. Proof of Non-Interference
`proofs/PIL-1_NON_INTERFERENCE.md` - Formal proof document

---

**Research Track:** PIL-1
**Constitution:** SMC-1
**Status:** INITIATED
**Next Phase:** Implementation
