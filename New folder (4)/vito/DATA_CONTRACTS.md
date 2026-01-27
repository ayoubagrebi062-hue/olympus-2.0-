# DATA_CONTRACTS.md

## Persistence Strategy for Builds, Artifacts, and Gates

**Document Type:** Architecture Artifact
**Phase:** 3 - Architecture
**Created:** 2026-01-20
**Author:** OLYMPUS Self-Build

---

## Architectural Principle

Data is written **immediately and incrementally**, not at the end.

- Every agent output is persisted as it completes
- Build can crash at any point without losing prior work
- Recovery means resuming from last persisted state
- No in-memory-only data for anything important

---

## Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        STORAGE LAYERS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────┐                                         │
│  │   PostgreSQL      │  Structured data: builds, phases,       │
│  │   (Primary DB)    │  agents, gates, audit logs              │
│  └─────────┬─────────┘                                         │
│            │                                                    │
│  ┌─────────▼─────────┐                                         │
│  │   Object Storage  │  Artifact content: generated files,     │
│  │   (S3/R2/Minio)   │  output logs, exports                   │
│  └─────────┬─────────┘                                         │
│            │                                                    │
│  ┌─────────▼─────────┐                                         │
│  │   Redis           │  Ephemeral: WebSocket state, rate       │
│  │   (Cache)         │  limits, session data                   │
│  └───────────────────┘                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Schema: PostgreSQL

### builds

```sql
CREATE TABLE builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  operator_id UUID NOT NULL REFERENCES users(id),

  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),

  parameters JSONB NOT NULL,
  -- {
  --   "name": "olympus-dashboard",
  --   "description": "...",
  --   "model": "llama-3.3-70b",
  --   "fallbackModel": "gpt-4o-mini",
  --   ...
  -- }

  tokens_used INTEGER NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  error JSONB,
  -- {
  --   "code": "CRITICAL_COMPONENT_FAILED",
  --   "message": "...",
  --   "agentId": "pixel",
  --   "phase": "frontend"
  -- }

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_builds_tenant ON builds(tenant_id);
CREATE INDEX idx_builds_operator ON builds(operator_id);
CREATE INDEX idx_builds_status ON builds(status);
CREATE INDEX idx_builds_created ON builds(created_at DESC);
```

### phases

```sql
CREATE TABLE phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (name IN ('discovery', 'design', 'architecture', 'frontend', 'backend', 'integration')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),

  agent_count INTEGER NOT NULL,
  completed_agents INTEGER NOT NULL DEFAULT 0,

  tokens_used INTEGER NOT NULL DEFAULT 0,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  UNIQUE(build_id, name)
);

CREATE INDEX idx_phases_build ON phases(build_id);
```

### agents

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),

  tokens_used INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  error JSONB,
  -- {
  --   "code": "RATE_LIMIT_EXCEEDED",
  --   "message": "...",
  --   "provider": "groq",
  --   "recoverable": true
  -- }

  UNIQUE(build_id, name)
);

CREATE INDEX idx_agents_build ON agents(build_id);
CREATE INDEX idx_agents_phase ON agents(phase_id);
```

### artifacts

```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  type TEXT NOT NULL,
  -- 'document', 'schema', 'component', 'route', 'config', 'test', etc.

  name TEXT NOT NULL,
  -- 'oracle.md', 'palette.json', 'BuildList.tsx', etc.

  content_url TEXT NOT NULL,
  -- 's3://olympus-artifacts/build-123/oracle.md'

  size_bytes INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  -- SHA-256 for deduplication and integrity

  validation_status TEXT NOT NULL CHECK (validation_status IN ('valid', 'warning', 'invalid', 'pending')),
  validation_errors JSONB NOT NULL DEFAULT '[]',
  -- [{ "path": "$.competitors", "error": "expected array" }]

  metadata JSONB NOT NULL DEFAULT '{}',
  -- agent-specific metadata

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifacts_build ON artifacts(build_id);
CREATE INDEX idx_artifacts_agent ON artifacts(agent_id);
CREATE INDEX idx_artifacts_type ON artifacts(type);
```

### gates

```sql
CREATE TABLE gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('phase', 'critical', 'validation', 'ship')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'resolved')),

  context JSONB NOT NULL,
  -- Type-specific context:
  -- phase: { "phase": "design", "artifacts": [...] }
  -- critical: { "agent": "pixel", "error": {...} }
  -- validation: { "agent": "strategos", "errors": [...] }
  -- ship: { "artifactCount": 21, "totalCost": 0.47 }

  options JSONB NOT NULL,
  -- [{ "id": "approve", "label": "Approve", "description": "..." }, ...]

  decision TEXT,
  -- 'approve', 'reject', 'iterate', 'abort', 'retry', 'skip', 'accept'

  decision_metadata JSONB,
  -- {
  --   "artifactsInspected": ["artifact-1", "artifact-2"],
  --   "checklistCompleted": true,
  --   "timeAtGateMs": 45000
  -- }

  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gates_build ON gates(build_id);
CREATE INDEX idx_gates_status ON gates(status);
```

### audit_log

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,
  -- 'BUILD_START', 'PHASE_START', 'AGENT_COMPLETE', 'GATE_RESOLVED', etc.

  actor_id UUID REFERENCES users(id),
  -- NULL for system events

  details JSONB NOT NULL,
  -- Event-specific payload

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_build ON audit_log(build_id);
CREATE INDEX idx_audit_type ON audit_log(event_type);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- Partition by month for large deployments
-- CREATE TABLE audit_log_2026_01 PARTITION OF audit_log FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

### output_buffer

```sql
CREATE TABLE output_buffer (
  id BIGSERIAL PRIMARY KEY,
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,

  sequence INTEGER NOT NULL,
  agent_name TEXT,
  line_type TEXT NOT NULL CHECK (line_type IN ('system', 'agent', 'error', 'warning')),
  content TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(build_id, sequence)
);

CREATE INDEX idx_output_build ON output_buffer(build_id);
CREATE INDEX idx_output_sequence ON output_buffer(build_id, sequence);

-- Capped at 10,000 lines per build
-- Older lines archived to object storage
```

---

## Object Storage Structure

```
olympus-artifacts/
├── builds/
│   └── {build_id}/
│       ├── manifest.json          # Build metadata snapshot
│       ├── artifacts/
│       │   ├── oracle.md
│       │   ├── palette.json
│       │   ├── BuildList.tsx
│       │   └── ...
│       ├── output/
│       │   └── full-output.log    # Complete output stream
│       └── export/
│           └── olympus-dashboard.zip  # Packaged export (if created)
```

### Artifact Content Format

```typescript
// Artifact content is stored as-is (raw text/json)
// Metadata is in PostgreSQL, content is in object storage

// Retrieval:
// 1. Query PostgreSQL for artifact metadata
// 2. Fetch content from object storage URL
// 3. Verify content_hash matches
```

---

## Write Patterns

### Build Start

```sql
BEGIN;

INSERT INTO builds (id, tenant_id, operator_id, status, parameters, started_at)
VALUES ($1, $2, $3, 'running', $4, NOW());

INSERT INTO phases (build_id, name, status, agent_count)
VALUES
  ($1, 'discovery', 'pending', 5),
  ($1, 'design', 'pending', 5),
  ($1, 'architecture', 'pending', 5),
  ($1, 'frontend', 'pending', 2),
  ($1, 'backend', 'pending', 2),
  ($1, 'integration', 'pending', 2);

INSERT INTO agents (build_id, phase_id, name, status)
SELECT $1, p.id, a.name, 'pending'
FROM phases p
CROSS JOIN (VALUES
  ('discovery', 'oracle'), ('discovery', 'empathy'), ...
) AS a(phase, name)
WHERE p.build_id = $1 AND p.name = a.phase;

INSERT INTO audit_log (build_id, event_type, actor_id, details)
VALUES ($1, 'BUILD_START', $2, $4);

COMMIT;
```

### Agent Complete

```sql
BEGIN;

-- Update agent
UPDATE agents
SET status = 'completed', tokens_used = $2, duration_ms = $3, completed_at = NOW()
WHERE build_id = $1 AND name = $4;

-- Insert artifact metadata
INSERT INTO artifacts (id, build_id, agent_id, type, name, content_url, size_bytes, content_hash, validation_status, validation_errors)
VALUES ($5, $1, (SELECT id FROM agents WHERE build_id = $1 AND name = $4), $6, $7, $8, $9, $10, $11, $12);

-- Update phase progress
UPDATE phases
SET completed_agents = completed_agents + 1, tokens_used = tokens_used + $2
WHERE build_id = $1 AND name = $13;

-- Update build tokens
UPDATE builds
SET tokens_used = tokens_used + $2, estimated_cost = estimated_cost + $14, updated_at = NOW()
WHERE id = $1;

-- Audit log
INSERT INTO audit_log (build_id, event_type, details)
VALUES ($1, 'AGENT_COMPLETE', $15);

COMMIT;

-- Separately: Upload artifact content to object storage
-- (async, but must complete before artifact is considered "available")
```

### Gate Resolution

```sql
BEGIN;

UPDATE gates
SET status = 'resolved', decision = $2, decision_metadata = $3, resolved_by = $4, resolved_at = NOW()
WHERE id = $1;

INSERT INTO audit_log (build_id, event_type, actor_id, details)
VALUES ((SELECT build_id FROM gates WHERE id = $1), 'GATE_RESOLVED', $4, $5);

COMMIT;
```

---

## Read Patterns

### Load Build State (for reconnection)

```sql
-- Single query with joins
SELECT
  b.*,
  json_agg(DISTINCT jsonb_build_object(
    'name', p.name, 'status', p.status, 'agent_count', p.agent_count,
    'completed_agents', p.completed_agents, 'started_at', p.started_at
  )) AS phases,
  json_agg(DISTINCT jsonb_build_object(
    'name', a.name, 'status', a.status, 'phase', p.name,
    'tokens_used', a.tokens_used, 'error', a.error
  )) AS agents,
  json_agg(DISTINCT jsonb_build_object(
    'id', ar.id, 'type', ar.type, 'name', ar.name,
    'size_bytes', ar.size_bytes, 'validation_status', ar.validation_status
  )) FILTER (WHERE ar.id IS NOT NULL) AS artifacts,
  (SELECT json_agg(g.*) FROM gates g WHERE g.build_id = b.id) AS gates
FROM builds b
JOIN phases p ON p.build_id = b.id
JOIN agents a ON a.phase_id = p.id
LEFT JOIN artifacts ar ON ar.agent_id = a.id
WHERE b.id = $1
GROUP BY b.id;
```

### Load Output Buffer

```sql
-- Last 1000 lines for initial load
SELECT sequence, agent_name, line_type, content, created_at
FROM output_buffer
WHERE build_id = $1
ORDER BY sequence DESC
LIMIT 1000;

-- Reverse in application layer for display order
```

### Load Artifact Content

```typescript
// 1. Get URL from PostgreSQL
const artifact = await db.artifacts.findById(artifactId);

// 2. Fetch from object storage
const content = await objectStorage.get(artifact.content_url);

// 3. Verify integrity
const hash = sha256(content);
if (hash !== artifact.content_hash) {
  throw new IntegrityError('Artifact content corrupted');
}

return content;
```

---

## Consistency Guarantees

### Within a Build

| Operation | Guarantee |
|-----------|-----------|
| Agent output → Artifact | Artifact visible only after output persisted |
| Gate created → Build paused | Build status updated atomically with gate creation |
| Gate resolved → Build resumes | Resume only after decision persisted |

### Across Systems

| From | To | Mechanism |
|------|-----|-----------|
| PostgreSQL | Object Storage | Write to object storage first, then insert metadata |
| PostgreSQL | WebSocket | Emit event only after transaction commits |
| Redis | PostgreSQL | Redis is cache; PostgreSQL is source of truth |

### Failure Scenarios

| Scenario | Behavior |
|----------|----------|
| Object storage write fails | Retry 3x, then mark artifact as "upload_failed" |
| PostgreSQL write fails | Transaction rolled back, retry with backoff |
| WebSocket emit fails | Event is lost, client will resync on reconnect |

---

## Retention Policy

| Data Type | Retention | After Expiry |
|-----------|-----------|--------------|
| Builds (completed) | 90 days | Archived to cold storage |
| Builds (failed) | 30 days | Deleted |
| Artifacts | Same as parent build | Deleted with build |
| Output buffer | 7 days | Archived to object storage |
| Audit log | 1 year | Archived |
| WebSocket events | Ephemeral (Redis) | Evicted after 24 hours |

---

## Export Contract

When user exports a build:

```typescript
interface BuildExport {
  format: 'zip';
  contents: {
    'manifest.json': BuildManifest;
    'artifacts/': Artifact[];
    'output.log': string;
    'audit.json': AuditEntry[];
  };
}

interface BuildManifest {
  buildId: string;
  exportedAt: string;
  exportedBy: string;
  parameters: BuildParameters;
  summary: {
    phases: number;
    agents: number;
    artifacts: number;
    tokensUsed: number;
    estimatedCost: number;
    duration: number;
  };
  artifacts: ArtifactManifestEntry[];
}
```

Export is generated on-demand, streamed to client, not stored permanently.

---

## Uncertainty Statement

**What remains uncertain:**

1. Whether to use PostgreSQL JSONB or separate tables for agent-specific metadata
2. Optimal output_buffer cap (10,000 lines may be too few for verbose builds)
3. Whether to use database-level partitioning for audit_log
4. Cold storage format for archived builds (Parquet? JSON lines?)

These are operational decisions. The schema contracts are stable.

---

*Data persists immediately. Crashes lose nothing. This is non-negotiable.*
