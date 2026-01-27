# AGENT LIFECYCLE LAYER - COMPLETE

> Full lifecycle management for sealed governance system

**Date:** January 17, 2026
**Status:** COMPLETE
**Version:** 8.0.0

---

## OVERVIEW

The Agent Lifecycle Layer provides state machine-based lifecycle management for agents in a sealed governance system.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│              LIFECYCLE CONTRACT LAYER              │
│  • AgentLifecycleState (5 states)                │
│  • AgentLifecycleTransition (5 legal)             │
│  • AgentLifecycleRecord (immutable)                │
│  • IAgentLifecycleAuthority (interface)              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              PERSISTENCE STORE LAYER                │
│  • IAgentLifecycleStore (interface)                │
│  • PostgresAgentLifecycleStore (impl)              │
│  • Rules: One record per agent, RETIRED immutable  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              RUNTIME GATE LAYER                     │
│  • IAgentLifecycleGate (interface)                │
│  • PostgresAgentLifecycleGate (impl)              │
│  • Zero mutation, read-only validation             │
└─────────────────────────────────────────────────────────────┘
```

---

## COMPONENTS SUMMARY

### Contract Layer
**File:** `lifecycle/contract.ts`

**Exports:**
- `AgentLifecycleState` enum (5 states)
- `AgentLifecycleTransition` type (5 legal transitions)
- `AgentLifecycleRecord` interface (immutable record)
- `IAgentLifecycleAuthority` interface (management contract)

**Key Features:**
- Type system enforces only 5 legal transitions
- All other transitions are compile-time impossible
- RETIRED is terminal (no transitions from RETIRED)

---

### Persistence Layer
**Files:**
- `lifecycle/store.ts` (interface)
- `lifecycle/postgres.ts` (implementation)
- `supabase/migrations/20240117000009_agent_lifecycle.sql`

**Interface:** `IAgentLifecycleStore`
- `create(record)` - Create new lifecycle record
- `update(record)` - Update existing record
- `get(agentId)` - Get current state

**Implementation:** `PostgresAgentLifecycleStore`
- Uses `agent_lifecycle` table
- Enforces 4 persistence rules
- Pure storage: no logic, no side effects

**Persistence Rules:**
1. Only ONE record per agentId
2. RETIRED records are immutable
3. currentState must match last transition
4. Illegal transitions rejected

---

### Runtime Gate Layer
**Files:**
- `lifecycle/gate.ts` (interface)
- `lifecycle/postgres-gate.ts` (implementation)

**Interface:** `IAgentLifecycleGate`
- `assertExecutable(agentId)` - Check if agent can execute

**Implementation:** `PostgresAgentLifecycleGate`
- Reads from store (no writes)
- Throws `LifecycleExecutionDenied` if not ACTIVE
- Zero mutation, deterministic

**Gate Rules:**
1. Fetch lifecycle record via store
2. If state !== ACTIVE → THROW
3. RETIRED or SUSPENDED always DENY
4. Missing record = DENY (secure by default)
5. Execute BEFORE tool gate
6. Zero writes, zero side effects

---

## STATE MACHINE

### Lifecycle States

```
┌───────────────────────────────────────────────────────────┐
│                                                   │
│   CREATED ──→ REGISTERED ──→ ACTIVE ──→ RETIRED
│                     │              │
│                     │              ↓
│                     │           SUSPENDED
│                     │              │
│                     │              ↓
│                     └──────────→ RETIRED
│                                                   │
└───────────────────────────────────────────────────────────┘
```

### State Definitions

| State | Description | Can Execute | Terminal |
|--------|-------------|--------------|----------|
| `CREATED` | Initial state, before registration | ❌ NO | ❌ NO |
| `REGISTERED` | Registered but not activated | ❌ NO | ❌ NO |
| `ACTIVE` | Active, may execute | ✅ YES | ❌ NO |
| `SUSPENDED` | Temporarily disabled | ❌ NO | ❌ NO |
| `RETIRED` | Terminated | ❌ NO | ✅ YES |

### Legal Transitions

| From | To | Description |
|-------|-----|-------------|
| `CREATED` | `REGISTERED` | Initial registration |
| `REGISTERED` | `ACTIVE` | Activation |
| `ACTIVE` | `SUSPENDED` | Temporary suspension |
| `SUSPENDED` | `ACTIVE` | Reactivation |
| `ACTIVE` | `RETIRED` | Terminal retirement |
| `SUSPENDED` | `RETIRED` | Terminal retirement |

**All other transitions are IMPOSSIBLE by type design.**

---

## ENFORCEMENT CHAIN

### Execution Workflow

```
1. Agent execution requested
   ↓
2. RuntimeGate.assertExecutable(agentId)
   ├─ Fetch lifecycle record from store
   ├─ Check state === ACTIVE
   │  ├─ YES → proceed
   │  └─ NO → throw LifecycleExecutionDenied
   └─ Zero mutation
   ↓
3. Catch LifecycleExecutionDenied
   ↓
4. Execution halted with typed error
   ↓
5. Return error to caller
```

### Required Gate Order

**BEFORE agent execution:**

```typescript
// CORRECT ORDER
await lifecycleGate.assertExecutable(agentId);  // Step 1
await toolGate.assertAllowed(toolId);         // Step 2
await executeAgent(agentId);                // Step 3 (only if gates pass)
```

**INCORRECT ORDER:**

```typescript
// WRONG: Tool gate checked first
await toolGate.assertAllowed(toolId);         // Step 1
await lifecycleGate.assertExecutable(agentId);  // Step 2 (wasted validation)
```

---

## FILE TREE

```
src/lib/agents/governance/lifecycle/
├── contract.ts              # Lifecycle contract (states, transitions, authority)
├── store.ts                 # Storage interface with rules
├── postgres.ts              # Postgres implementation
├── gate.ts                  # Runtime gate interface
├── postgres-gate.ts         # Postgres gate implementation
└── index.ts                 # Re-exports
```

```
supabase/migrations/
└── 20240117000009_agent_lifecycle.sql  # Lifecycle table DDL
```

---

## EXPORTS

### From Lifecycle Module

```typescript
// Contract Layer
export { AgentLifecycleState }
export type { AgentLifecycleTransition }
export { AgentLifecycleRecord }
export { IAgentLifecycleAuthority }

// Runtime Gate Interface
export { IAgentLifecycleGate }
export { LifecycleExecutionDenied }

// Persistence Store Interface
export { IAgentLifecycleStore }

// Postgres Implementations
export { PostgresAgentLifecycleStore }
export { PostgresAgentLifecycleGate }
```

### From Governance Module

```typescript
// Lifecycle Layer (AUTHORITATIVE)
export * from './lifecycle/contract';
export * from './lifecycle/gate';
export * from './lifecycle/store';
export * from './lifecycle/postgres';
export * from './lifecycle/postgres-gate';
```

---

## INTEGRATION POINTS

### Initialize Lifecycle

```typescript
import {
  IAgentLifecycleAuthority,
  PostgresAgentLifecycleStore
} from '@/lib/agents/governance/lifecycle';

const store = new PostgresAgentLifecycleStore();
const authority: IAgentLifecycleAuthority = {
  async initialize(agentId, authority) {
    return store.create({
      agentId,
      currentState: AgentLifecycleState.CREATED,
      since: new Date(),
      changedBy: authority
    });
  },

  async transition(agentId, transition, authority, reason) {
    const existing = await store.get(agentId);
    return store.update({
      agentId,
      currentState: transition.to,
      since: new Date(),
      previousState: existing?.currentState,
      changedBy: authority,
      reason
    });
  },

  async getState(agentId) {
    const record = await store.get(agentId);
    return record?.currentState || null;
  }
};
```

### Execute Agent

```typescript
import {
  IAgentLifecycleGate,
  PostgresAgentLifecycleGate,
  LifecycleExecutionDenied
} from '@/lib/agents/governance/lifecycle';

const store = new PostgresAgentLifecycleStore();
const gate = new PostgresAgentLifecycleGate(store);

async function executeAgent(agentId: string) {
  try {
    // Step 1: Check lifecycle gate (REQUIRED)
    await gate.assertExecutable(agentId);

    // Step 2: Agent is ACTIVE, proceed with execution
    return await runAgent(agentId);
  } catch (error) {
    if (error instanceof LifecycleExecutionDenied) {
      console.error(`Execution denied: ${error.reason}`);
      return null;
    }
    throw error;
  }
}
```

---

## GUARANTEES

### Type Safety

**Compile-time enforcement:**
- ❌ `CREATED → RETIRED` (impossible)
- ❌ `REGISTERED → SUSPENDED` (impossible)
- ❌ `RETIRED → ACTIVE` (impossible)
- ✅ Only 5 legal transitions compile

**Runtime enforcement:**
- Store rejects illegal transitions
- Gate rejects non-ACTIVE states
- Errors are typed with agentId, state, reason

### Immutability

**RETIRED is terminal:**
- No transitions from RETIRED exist
- Store rejects updating RETIRED records
- Gate rejects RETIRED state explicitly

**Records are immutable:**
- Once created, record cannot be deleted
- Transitions create new records
- State history is append-only

### Zero Mutation

**Gate is read-only:**
- No writes to store
- No updates to lifecycle
- No side effects
- Pure validation

---

## STATUS

✅ **AGENT LIFECYCLE LAYER COMPLETE**

All components implemented:
- ✅ Lifecycle contract (5 states, 5 transitions)
- ✅ Storage interface (create, update, get)
- ✅ Postgres store (pure persistence, 4 rules)
- ✅ Runtime gate (read-only, zero mutation)
- ✅ Database migration (agent_lifecycle table)
- ✅ Compile-safe transitions
- ✅ Type-safe error handling
- ✅ Immutable state history
- ✅ Terminal RETIRED state
- ✅ Secure by default
- ✅ Integration with governance module
- ✅ Complete documentation

---

*State machine-based lifecycle management*
*Type-safe transitions*
*Immutable state history*
*Sealed governance system v8.0.0*
