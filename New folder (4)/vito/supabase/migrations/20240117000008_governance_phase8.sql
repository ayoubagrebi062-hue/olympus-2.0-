-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - PHASE 8: GOVERNANCE CONTROL PLANE, EPOCHS, AND BLAST RADIUS
-- File: 20240117000008_governance_phase8.sql
-- Purpose: Control plane, epochs, and blast radius tables
-- Module: Governance - Phase 8
--
-- EXECUTION ORDER: Run AFTER Phase 0-7 migrations
-- DEPENDENCIES: governance_phase0.sql, governance_phase2_audit_tables.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- ============================================
-- TABLE: control_events
-- Purpose: Log all governance control plane actions
-- Phase: 8.1
-- ============================================
CREATE TABLE IF NOT EXISTS public.control_events (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Event details
  action TEXT NOT NULL CHECK (action IN (
    'HALT', 'RESUME', 'KILL_SWITCH',
    'PAUSE_BUILD', 'RESUME_BUILD',
    'FORCE_ROLLBACK', 'ESCALATE',
    'LOCK_TENANT', 'UNLOCK_TENANT'
  )),
  control_level TEXT NOT NULL CHECK (control_level IN (
    'none', 'monitor', 'warning', 'critical', 'emergency'
  )),

  -- Context
  triggered_by TEXT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  target TEXT,

  -- Approval
  requires_approval BOOLEAN DEFAULT false,
  approved BOOLEAN,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Details
  details JSONB,

  -- Constraints
  CONSTRAINT valid_approval CHECK (
    NOT requires_approval OR (approved IS NOT NULL AND approved_by IS NOT NULL)
  )
);

-- ============================================
-- TABLE: epochs
-- Purpose: Store epoch configuration and state
-- Phase: 8.2
-- ============================================
CREATE TABLE IF NOT EXISTS public.epochs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Configuration
  name TEXT NOT NULL,
  epoch_type TEXT NOT NULL CHECK (epoch_type IN ('daily', 'weekly', 'monthly', 'custom')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  current_phase TEXT NOT NULL DEFAULT 'preparation' CHECK (current_phase IN (
    'preparation', 'active', 'review', 'settlement', 'closed'
  )),

  -- Limits
  max_builds_per_epoch INTEGER DEFAULT 1000,
  max_actions_per_epoch INTEGER DEFAULT 10000,

  -- Settings
  auto_rollback_enabled BOOLEAN DEFAULT true,
  quorum_required BOOLEAN DEFAULT false,
  min_quorum_percentage NUMERIC(3, 2) DEFAULT 0.66 CHECK (min_quorum_percentage BETWEEN 0 AND 1),

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- TABLE: epoch_metrics
-- Purpose: Store epoch execution metrics
-- Phase: 8.2
-- ============================================
CREATE TABLE IF NOT EXISTS public.epoch_metrics (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Epoch reference
  epoch_id UUID NOT NULL REFERENCES public.epochs(id) ON DELETE CASCADE,

  -- Build metrics
  builds_completed INTEGER DEFAULT 0,
  builds_failed INTEGER DEFAULT 0,
  builds_rolled_back INTEGER DEFAULT 0,

  -- Action metrics
  actions_executed INTEGER DEFAULT 0,
  actions_blocked INTEGER DEFAULT 0,

  -- Violation metrics
  violations_reported INTEGER DEFAULT 0,

  -- Performance
  average_build_duration NUMERIC(10, 3),
  success_rate NUMERIC(3, 2) CHECK (success_rate BETWEEN 0 AND 1),

  -- Timing
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint
  CONSTRAINT positive_metrics CHECK (
    builds_completed >= 0 AND
    builds_failed >= 0 AND
    builds_rolled_back >= 0 AND
    actions_executed >= 0 AND
    actions_blocked >= 0 AND
    violations_reported >= 0
  )
);

-- ============================================
-- TABLE: epoch_transitions
-- Purpose: Log epoch phase transitions
-- Phase: 8.2
-- ============================================
CREATE TABLE IF NOT EXISTS public.epoch_transitions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Epoch reference
  epoch_id UUID NOT NULL REFERENCES public.epochs(id) ON DELETE CASCADE,

  -- Transition details
  from_phase TEXT NOT NULL,
  to_phase TEXT NOT NULL,

  -- Trigger
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  triggered_by TEXT NOT NULL,
  reason TEXT,

  -- Approval
  approved BOOLEAN DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- TABLE: violations
-- Purpose: Track governance violations
-- Phase: 8.2
-- ============================================
CREATE TABLE IF NOT EXISTS public.violations (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Context
  epoch_id UUID REFERENCES public.epochs(id) ON DELETE CASCADE,
  build_id UUID REFERENCES public.builds(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,

  -- Violation details
  violation_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,

  -- Timing
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT
);

-- ============================================
-- TABLE: impact_assessments
-- Purpose: Store blast radius impact assessments
-- Phase: 8.3
-- ============================================
CREATE TABLE IF NOT EXISTS public.impact_assessments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Context
  build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,

  -- Assessment
  estimated_zone TEXT NOT NULL CHECK (estimated_zone IN (
    'single_build', 'single_tenant', 'single_agent',
    'tenant_group', 'global'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Affected resources
  affected_resources JSONB DEFAULT '[]',
  affected_agents TEXT[] DEFAULT '{}',
  affected_tenants UUID[] DEFAULT '{}',

  -- Estimates
  estimated_duration INTEGER, -- milliseconds
  confidence NUMERIC(3, 2) CHECK (confidence BETWEEN 0 AND 1),

  -- Timing
  assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assessed_by TEXT NOT NULL
);

-- ============================================
-- TABLE: containment_actions
-- Purpose: Log blast radius containment actions
-- Phase: 8.3
-- ============================================
CREATE TABLE IF NOT EXISTS public.containment_actions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Assessment reference
  assessment_id UUID NOT NULL REFERENCES public.impact_assessments(id) ON DELETE CASCADE,

  -- Action details
  action TEXT NOT NULL CHECK (action IN ('ISOLATE', 'QUARANTINE', 'ROLLBACK', 'ESCALATE')),
  target TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN (
    'single_build', 'single_tenant', 'single_agent',
    'tenant_group', 'global'
  )),

  -- Trigger
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  triggered_by TEXT NOT NULL,

  -- Execution
  executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMP WITH TIME ZONE,
  result TEXT
);

-- ============================================
-- TABLE: containment_policies
-- Purpose: Define blast zone containment policies
-- Phase: 8.3
-- ============================================
CREATE TABLE IF NOT EXISTS public.containment_policies (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Policy identity
  name TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN (
    'single_build', 'single_tenant', 'single_agent',
    'tenant_group', 'global'
  )),
  UNIQUE (zone),

  -- Limits
  max_actions_per_minute INTEGER DEFAULT 10,
  max_concurrent_builds INTEGER DEFAULT 1,

  -- Settings
  require_approval BOOLEAN DEFAULT false,
  auto_rollback_on_failure BOOLEAN DEFAULT true,
  quarantine_on_critical_failure BOOLEAN DEFAULT true,
  isolation_level TEXT NOT NULL CHECK (isolation_level IN ('none', 'partial', 'full')),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: quarantined_builds
-- Purpose: Track quarantined builds
-- Phase: 8.3
-- ============================================
CREATE TABLE IF NOT EXISTS public.quarantined_builds (
  build_id UUID PRIMARY KEY REFERENCES public.builds(id) ON DELETE CASCADE,

  -- Quarantine details
  quarantined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  quarantined_by TEXT NOT NULL,
  reason TEXT NOT NULL,

  -- Release
  released_at TIMESTAMP WITH TIME ZONE,
  released_by TEXT,
  release_reason TEXT,

  -- Zone
  blast_zone TEXT NOT NULL CHECK (blast_zone IN (
    'single_build', 'single_tenant', 'tenant_group', 'global'
  ))
);

-- ============================================
-- TABLE: quarantined_tenants
-- Purpose: Track quarantined tenants
-- Phase: 8.3
-- ============================================
CREATE TABLE IF NOT EXISTS public.quarantined_tenants (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Quarantine details
  quarantined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  quarantined_by TEXT NOT NULL,
  reason TEXT NOT NULL,

  -- Release
  released_at TIMESTAMP WITH TIME ZONE,
  released_by TEXT,
  release_reason TEXT,

  -- Zone
  blast_zone TEXT NOT NULL CHECK (blast_zone IN (
    'single_tenant', 'tenant_group', 'global'
  ))
);

-- ============================================
-- INDEXES - CONTROL EVENTS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_control_events_action
  ON public.control_events(action);

CREATE INDEX IF NOT EXISTS idx_control_events_level
  ON public.control_events(control_level);

CREATE INDEX IF NOT EXISTS idx_control_events_target
  ON public.control_events(target);

CREATE INDEX IF NOT EXISTS idx_control_events_triggered_at
  ON public.control_events(triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_control_events_approved_by
  ON public.control_events(approved_by) WHERE approved IS NOT NULL;

-- ============================================
-- INDEXES - EPOCHS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_epochs_type
  ON public.epochs(epoch_type);

CREATE INDEX IF NOT EXISTS idx_epochs_phase
  ON public.epochs(current_phase);

CREATE INDEX IF NOT EXISTS idx_epochs_start_time
  ON public.epochs(start_time);

CREATE INDEX IF NOT EXISTS idx_epochs_end_time
  ON public.epochs(end_time);

-- ============================================
-- INDEXES - EPOCH METRICS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_epoch_metrics_epoch_id
  ON public.epoch_metrics(epoch_id);

CREATE INDEX IF NOT EXISTS idx_epoch_metrics_recorded_at
  ON public.epoch_metrics(recorded_at DESC);

-- ============================================
-- INDEXES - EPOCH TRANSITIONS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_epoch_transitions_epoch_id
  ON public.epoch_transitions(epoch_id);

CREATE INDEX IF NOT EXISTS idx_epoch_transitions_triggered_at
  ON public.epoch_transitions(triggered_at DESC);

-- ============================================
-- INDEXES - VIOLATIONS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_violations_epoch_id
  ON public.violations(epoch_id);

CREATE INDEX IF NOT EXISTS idx_violations_build_id
  ON public.violations(build_id);

CREATE INDEX IF NOT EXISTS idx_violations_agent_id
  ON public.violations(agent_id);

CREATE INDEX IF NOT EXISTS idx_violations_severity
  ON public.violations(severity);

CREATE INDEX IF NOT EXISTS idx_violations_reported_at
  ON public.violations(reported_at DESC);

CREATE INDEX IF NOT EXISTS idx_violations_resolved
  ON public.violations(resolved) WHERE resolved = false;

-- ============================================
-- INDEXES - IMPACT ASSESSMENTS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_impact_assessments_build_id
  ON public.impact_assessments(build_id);

CREATE INDEX IF NOT EXISTS idx_impact_assessments_tenant_id
  ON public.impact_assessments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_impact_assessments_zone
  ON public.impact_assessments(estimated_zone);

CREATE INDEX IF NOT EXISTS idx_impact_assessments_severity
  ON public.impact_assessments(severity);

CREATE INDEX IF NOT EXISTS idx_impact_assessments_assessed_at
  ON public.impact_assessments(assessed_at DESC);

-- ============================================
-- INDEXES - CONTAINMENT ACTIONS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_containment_actions_assessment_id
  ON public.containment_actions(assessment_id);

CREATE INDEX IF NOT EXISTS idx_containment_actions_action
  ON public.containment_actions(action);

CREATE INDEX IF NOT EXISTS idx_containment_actions_zone
  ON public.containment_actions(zone);

CREATE INDEX IF NOT EXISTS idx_containment_actions_triggered_at
  ON public.containment_actions(triggered_at DESC);

-- ============================================
-- INDEXES - QUARANTINED BUILDS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_quarantined_builds_quarantined_at
  ON public.quarantined_builds(quarantined_at DESC);

CREATE INDEX IF NOT EXISTS idx_quarantined_builds_blast_zone
  ON public.quarantined_builds(blast_zone);

CREATE INDEX IF NOT EXISTS idx_quarantined_builds_released
  ON public.quarantined_builds(released_at) WHERE released_at IS NULL;

-- ============================================
-- INDEXES - QUARANTINED TENANTS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_quarantined_tenants_quarantined_at
  ON public.quarantined_tenants(quarantined_at DESC);

CREATE INDEX IF NOT EXISTS idx_quarantined_tenants_blast_zone
  ON public.quarantined_tenants(blast_zone);

CREATE INDEX IF NOT EXISTS idx_quarantined_tenants_released
  ON public.quarantined_tenants(released_at) WHERE released_at IS NULL;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.control_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epochs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epoch_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epoch_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.containment_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.containment_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarantined_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarantined_tenants ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.control_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.epochs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.epoch_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.epoch_transitions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.violations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.impact_assessments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.containment_actions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.containment_policies
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.quarantined_builds
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.quarantined_tenants
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Insert default containment policies
CREATE OR REPLACE FUNCTION public.insert_default_containment_policies()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.containment_policies (name, zone, max_actions_per_minute, max_concurrent_builds, require_approval, auto_rollback_on_failure, quarantine_on_critical_failure, isolation_level)
  VALUES
    ('Single Build Containment', 'single_build', 10, 1, false, true, true, 'partial'),
    ('Single Tenant Containment', 'single_tenant', 5, 5, true, true, true, 'full'),
    ('Tenant Group Containment', 'tenant_group', 2, 10, true, true, true, 'full'),
    ('Global Emergency Containment', 'global', 1, 0, true, true, true, 'full')
  ON CONFLICT (zone) DO NOTHING;
END;
$$;

-- Function: Get current epoch
CREATE OR REPLACE FUNCTION public.get_current_epoch()
RETURNS TABLE (
  id UUID,
  name TEXT,
  current_phase TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id, e.name, e.current_phase, e.start_time, e.end_time
  FROM public.epochs e
  WHERE e.current_phase IN ('preparation', 'active', 'review')
    AND e.start_time <= NOW()
    AND e.end_time >= NOW()
  ORDER BY e.start_time DESC
  LIMIT 1;
END;
$$;

-- Function: Get active violations
CREATE OR REPLACE FUNCTION public.get_active_violations()
RETURNS TABLE (
  id UUID,
  violation_type TEXT,
  severity TEXT,
  reported_at TIMESTAMP WITH TIME ZONE,
  agent_id TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.violation_type, v.severity, v.reported_at, v.agent_id
  FROM public.violations v
  WHERE v.resolved = false
  ORDER BY v.reported_at DESC;
END;
$$;

-- Function: Get quarantined builds
CREATE OR REPLACE FUNCTION public.get_quarantined_builds()
RETURNS TABLE (
  build_id UUID,
  tenant_id UUID,
  quarantined_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  blast_zone TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    qb.build_id, b.tenant_id, qb.quarantined_at, qb.reason, qb.blast_zone
  FROM public.quarantined_builds qb
  JOIN public.builds b ON b.id = qb.build_id
  WHERE qb.released_at IS NULL
  ORDER BY qb.quarantined_at DESC;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at on containment_policies
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_containment_policies_updated_at
  BEFORE UPDATE ON public.containment_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default containment policies
SELECT public.insert_default_containment_policies();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.control_events IS 'Phase 8.1: Governance control plane event log';
COMMENT ON TABLE public.epochs IS 'Phase 8.2: Epoch configuration and state';
COMMENT ON TABLE public.epoch_metrics IS 'Phase 8.2: Epoch execution metrics';
COMMENT ON TABLE public.epoch_transitions IS 'Phase 8.2: Epoch phase transition log';
COMMENT ON TABLE public.violations IS 'Phase 8.2: Governance violation records';
COMMENT ON TABLE public.impact_assessments IS 'Phase 8.3: Blast radius impact assessments';
COMMENT ON TABLE public.containment_actions IS 'Phase 8.3: Blast radius containment actions';
COMMENT ON TABLE public.containment_policies IS 'Phase 8.3: Blast zone containment policies';
COMMENT ON TABLE public.quarantined_builds IS 'Phase 8.3: Quarantined builds';
COMMENT ON TABLE public.quarantined_tenants IS 'Phase 8.3: Quarantined tenants';
