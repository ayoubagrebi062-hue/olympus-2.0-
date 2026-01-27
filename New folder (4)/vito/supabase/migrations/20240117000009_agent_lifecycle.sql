-- ════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - AGENT LIFECYCLE TABLE
-- File: agent_lifecycle.sql
-- Purpose: Persistent storage for agent lifecycle state transitions
-- Module: Governance - Lifecycle Layer
--
-- VERSION: 8.0.0
-- ═════════════════════════════════════════════════════════════════════

-- ============================================
-- TABLE: agent_lifecycle
-- Purpose: Store immutable lifecycle state transitions
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_lifecycle (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Agent identifier
  agent_id TEXT NOT NULL,

  -- Current lifecycle state
  state TEXT NOT NULL CHECK (state IN (
    'CREATED',
    'REGISTERED',
    'ACTIVE',
    'SUSPENDED',
    'RETIRED'
  )),

  -- Timestamp when state became effective
  since TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Previous state (NULL for CREATED)
  previous_state TEXT CHECK (
    previous_state IN ('CREATED', 'REGISTERED', 'ACTIVE', 'SUSPENDED', 'RETIRED', NULL)
  ),

  -- Authority that caused transition
  changed_by TEXT NOT NULL,

  -- Optional reason for transition
  reason TEXT,

  -- Constraint: Only ONE active record per agent_id
  -- Enforced by application logic, not database constraint
  -- create() and update() handle this

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agent_lifecycle_agent_id
  ON public.agent_lifecycle(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_lifecycle_state
  ON public.agent_lifecycle(state);

CREATE INDEX IF NOT EXISTS idx_agent_lifecycle_since
  ON public.agent_lifecycle(since DESC);

CREATE INDEX IF NOT EXISTS idx_agent_lifecycle_changed_by
  ON public.agent_lifecycle(changed_by);

-- ============================================
-- COMPOSITE INDEX: Latest state per agent
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agent_lifecycle_latest_state
  ON public.agent_lifecycle(agent_id, since DESC);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.agent_lifecycle ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON public.agent_lifecycle
  FOR ALL USING (auth.role() = 'service_role');

-- Allow read access to tenant users (if agent is tenant-scoped)
CREATE POLICY "Tenant read access" ON public.agent_lifecycle
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.tenants
      JOIN public.builds ON builds.tenant_id = tenants.id
      WHERE builds.id = (SELECT build_id FROM agent_lifecycle LIMIT 1)
    )
  );

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.agent_lifecycle IS 'Version 8.0.0: Immutable agent lifecycle state transitions';
COMMENT ON COLUMN public.agent_lifecycle.agent_id IS 'Agent identifier from registry';
COMMENT ON COLUMN public.agent_lifecycle.state IS 'Current lifecycle state (CREATED/REGISTERED/ACTIVE/SUSPENDED/RETIRED)';
COMMENT ON COLUMN public.agent_lifecycle.since IS 'Timestamp when state became effective';
COMMENT ON COLUMN public.agent_lifecycle.previous_state IS 'Previous state before transition (NULL for CREATED)';
COMMENT ON COLUMN public.agent_lifecycle.changed_by IS 'Authority identifier that caused transition';
COMMENT ON COLUMN public.agent_lifecycle.reason IS 'Optional reason for state transition';
