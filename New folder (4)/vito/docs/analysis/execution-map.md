# Execution Map

> The spine of OLYMPUS/Vito runtime execution.
> This is where future engines will attach.

## Primary Build Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                                 │
│  "Build me a task management app with filtering and pagination"     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API ROUTE LAYER                                 │
│  POST /api/ai/builds                                                │
│  └── Creates build, starts orchestration                            │
│                                                                      │
│  GET /api/ai/builds/[buildId]/stream                                │
│  └── SSE connection for real-time progress                          │
│                                                                      │
│  POST /api/ai/builds/[buildId]/iterate                              │
│  └── User feedback iteration                                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                                   │
│  src/lib/agents/services/                                           │
│  └── BuildService - Build lifecycle management                      │
│  └── ArtifactService - File storage/retrieval                       │
│  └── MemoryService - Context persistence                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BUILD ORCHESTRATOR                                │
│  src/lib/agents/orchestrator/                                       │
│  └── Planner - Phase planning and sequencing                        │
│  └── Executor - Agent execution coordination                        │
│  └── Context Manager - Build state management                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     AGENT PHASES (35 Agents)                         │
│                                                                      │
│  PHASE 1: UNDERSTANDING                                              │
│  ├── oracle (interpret requirements)                                │
│  ├── empathy (user needs analysis)                                  │
│  └── venture (market context)                                       │
│                                                                      │
│  PHASE 2: PLANNING                                                   │
│  ├── strategos (feature planning)                                   │
│  ├── scope (scope definition)                                       │
│  ├── cartographer (navigation/routing)                              │
│  └── schema (data modeling)                                         │
│                                                                      │
│  PHASE 3: DESIGN                                                     │
│  ├── fusion (UI/UX design)                                          │
│  ├── blocks (component library)                                     │
│  └── tokens (design system)                                         │
│                                                                      │
│  PHASE 4: IMPLEMENTATION                                             │
│  ├── wire (code scaffolding)                                        │
│  ├── pixel (styling)                                                │
│  ├── api (backend routes)                                           │
│  └── data (database setup)                                          │
│                                                                      │
│  PHASE 5: REFINEMENT                                                 │
│  ├── polish (code quality)                                          │
│  ├── test (test generation)                                         │
│  └── docs (documentation)                                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ARTIFACT STORE                                   │
│  src/lib/artifacts/                                                 │
│  └── File artifacts (generated code)                                │
│  └── Schema artifacts (data models)                                 │
│  └── Design artifacts (UI specs)                                    │
│                                                                      │
│  Storage: Supabase Storage + Database                               │
│  └── builds table - Build metadata                                  │
│  └── artifacts table - File tracking                                │
│  └── build_context table - Agent outputs                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PREVIEW UI                                      │
│  src/lib/preview/                                                   │
│  └── Sandpack integration - Live code preview                       │
│  └── Editor components - Code editing                               │
│  └── Share functionality - Preview sharing                          │
│                                                                      │
│  Components:                                                         │
│  └── PreviewPane - Rendered app preview                             │
│  └── CodeEditor - Monaco-based editor                               │
│  └── FileTree - Project structure                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Supporting Systems

### Authentication Flow
```
User → /api/auth/login → Supabase Auth → JWT Token → Protected Routes
```

### Billing Flow
```
User → /api/billing/checkout → Stripe → Webhook → /api/billing/webhooks/stripe → Database
```

### Real-time Updates
```
Build Start → SSE Stream → Client Updates → Progress UI
```

## Key Integration Points

| Component | Location | Purpose |
|-----------|----------|---------|
| **BuildOrchestrator** | `src/lib/agents/orchestrator/` | Core execution spine |
| **AgentRegistry** | `src/lib/agents/registry/` | Agent definitions |
| **ProviderManager** | `src/lib/agents/providers/` | LLM provider routing |
| **ArtifactStore** | `src/lib/artifacts/` | Output persistence |
| **PreviewEngine** | `src/lib/preview/` | Live rendering |

## Future Engine Attachment Points

When implementing new engines (post-research), they should attach to:

1. **Pre-Agent Gate** - Before agent execution begins
   - Location: `src/lib/agents/orchestrator/`
   - Purpose: Validate build intent before processing

2. **Inter-Phase Gate** - Between agent phases
   - Location: `src/lib/agents/orchestrator/`
   - Purpose: Validate phase outputs before next phase

3. **Pre-Artifact Gate** - Before artifact storage
   - Location: `src/lib/artifacts/`
   - Purpose: Validate generated code before persistence

4. **Post-Build Gate** - After build completion
   - Location: `src/lib/agents/services/`
   - Purpose: Final validation before delivery

---

*This map defines the actual execution spine.*
*Future engines integrate here, not in conceptual research code.*
