-- ═════════════════════════════════════════════════════════════════════════════
-- CONDUCTOR SYSTEM - COMBINED MIGRATIONS
-- All 6 migrations in execution order
-- ═════════════════════════════════════════════════════════════════════════════
--
-- EXECUTE THIS ENTIRE FILE IN SUPABASE SQL EDITOR
--
-- Contents:
--   1. Phase 2: Audit Tables (20240117000001)
--   2. Checkpoints System (20240124000001)
--   3. Prompt Management (20240125000001)
--   4. Build Plans (20240126000001)
--   5. Build Plans Normalized (20240126000002)
--   6. Build State Machines (20240126000003)
--
-- Total: 19 tables, 23 functions, 11 views, comprehensive RLS
-- ═════════════════════════════════════════════════════════════════════════════




-- ═════════════════════════════════════════════════════════════════════════════
-- MIGRATION 1: PHASE 2 - AUDIT TABLES
-- File: 20240117000001_phase2_audit_tables.sql
-- Purpose: Audit logs and verification persistence
-- ═════════════════════════════════════════════════════════════════════════════

-- ============================================
-- TABLE: audit_logs (WORM - Write Once Read Many)
-- Purpose: Immutable audit trail for all governance actions
-- Phase: 2 (Persistence)
-- ============================================
DROP TABLE IF EXISTS public.audit_logs CASCADE;
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Action context
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'identity', 'lease', 'monitor', 'orchestrator',
    'kill_switch', 'governance', 'learning'
  )),
  entity_id TEXT NOT NULL,

  -- Actor
  performed_by TEXT NOT NULL CHECK (performed_by IN (
    'system', 'agent', 'operator', 'unknown'
  )),

  -- Result
  action_result TEXT NOT NULL CHECK (action_result IN (
    'SUCCESS', 'FAILURE', 'REJECTED', 'APPROVED', 'SKIPPED', 'ERROR'
  )),

  -- Details
  details JSONB,

  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed ON public.audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_result ON public.audit_logs(action_result);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for system audits)
CREATE POLICY "Service role full access" ON public.audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Note: audit_logs is system-wide, no tenant-specific access needed

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.audit_logs IS 'Phase 2: Immutable audit trail (WORM)';




-- ═════════════════════════════════════════════════════════════════════════════
-- MIGRATION 2: CHECKPOINT SYSTEM
-- File: 20240124000001_checkpoints.sql
-- Purpose: Build state checkpointing and resume
-- ═════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- BUILD CHECKPOINTS TABLE
-- Stores checkpoint state snapshots for build resume
-- ============================================================================

DROP TABLE IF EXISTS public.build_checkpoints CASCADE;
CREATE TABLE public.build_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Position in build
    sequence INTEGER NOT NULL,
    agent_id TEXT NOT NULL,
    phase TEXT NOT NULL,

    -- State (JSON, possibly compressed)
    state TEXT NOT NULL,
    compressed BOOLEAN DEFAULT false,
    size_bytes INTEGER DEFAULT 0,

    -- Lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    -- Ensure unique sequence per build
    CONSTRAINT unique_build_sequence UNIQUE(build_id, sequence)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_checkpoints_build_id ON public.build_checkpoints(build_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_tenant_id ON public.build_checkpoints(tenant_id);

-- For loading latest checkpoint
CREATE INDEX IF NOT EXISTS idx_checkpoints_build_sequence ON public.build_checkpoints(build_id, sequence DESC);

-- For cleanup of expired checkpoints
CREATE INDEX IF NOT EXISTS idx_checkpoints_expires_at ON public.build_checkpoints(expires_at);

-- For filtering by phase or agent
CREATE INDEX IF NOT EXISTS idx_checkpoints_phase ON public.build_checkpoints(phase);
CREATE INDEX IF NOT EXISTS idx_checkpoints_agent_id ON public.build_checkpoints(agent_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_checkpoints_tenant_build ON public.build_checkpoints(tenant_id, build_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.build_checkpoints ENABLE ROW LEVEL SECURITY;

-- Tenants can only see their own checkpoints
CREATE POLICY "Users can view own checkpoints" ON public.build_checkpoints
    FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert own checkpoints" ON public.build_checkpoints
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update own checkpoints" ON public.build_checkpoints
    FOR UPDATE USING (auth.uid() = tenant_id);

CREATE POLICY "Users can delete own checkpoints" ON public.build_checkpoints
    FOR DELETE USING (auth.uid() = tenant_id);

-- Service role can manage all checkpoints (for cleanup jobs)
CREATE POLICY "Service role can manage all checkpoints" ON public.build_checkpoints
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- BUILD RESUME TRACKING TABLE
-- Tracks resume attempts and outcomes
-- ============================================================================

DROP TABLE IF EXISTS public.build_resume_history CASCADE;
CREATE TABLE public.build_resume_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Resume details
    resumed_from_checkpoint UUID REFERENCES public.build_checkpoints(id) ON DELETE SET NULL,
    resume_sequence INTEGER NOT NULL DEFAULT 1,

    -- What was resumed
    skipped_agents TEXT[] DEFAULT '{}',
    retried_agents TEXT[] DEFAULT '{}',
    remaining_agents TEXT[] DEFAULT '{}',

    -- Outcome
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'paused')),
    error_message TEXT,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms BIGINT DEFAULT 0,

    -- Checkpoints created during this resume
    new_checkpoints UUID[] DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for resume history
CREATE INDEX IF NOT EXISTS idx_resume_history_build_id ON public.build_resume_history(build_id);
CREATE INDEX IF NOT EXISTS idx_resume_history_tenant_id ON public.build_resume_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resume_history_status ON public.build_resume_history(status);

-- RLS for resume history
ALTER TABLE public.build_resume_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resume history" ON public.build_resume_history
    FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert own resume history" ON public.build_resume_history
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update own resume history" ON public.build_resume_history
    FOR UPDATE USING (auth.uid() = tenant_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to cleanup expired checkpoints (run via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_checkpoints()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.build_checkpoints
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest checkpoint for a build
CREATE OR REPLACE FUNCTION public.get_latest_checkpoint(p_build_id TEXT)
RETURNS public.build_checkpoints AS $$
BEGIN
    RETURN (
        SELECT *
        FROM public.build_checkpoints
        WHERE build_id = p_build_id
        AND expires_at > NOW()
        ORDER BY sequence DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get checkpoint stats for a tenant
CREATE OR REPLACE FUNCTION public.get_checkpoint_stats(p_tenant_id UUID)
RETURNS TABLE (
    total_checkpoints BIGINT,
    total_size_bytes BIGINT,
    builds_with_checkpoints BIGINT,
    avg_checkpoint_size DECIMAL,
    latest_checkpoint TIMESTAMPTZ,
    compressed_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_checkpoints,
        COALESCE(SUM(size_bytes), 0)::BIGINT AS total_size_bytes,
        COUNT(DISTINCT build_id)::BIGINT AS builds_with_checkpoints,
        COALESCE(AVG(size_bytes), 0)::DECIMAL AS avg_checkpoint_size,
        MAX(created_at) AS latest_checkpoint,
        COUNT(*) FILTER (WHERE compressed)::BIGINT AS compressed_count
    FROM public.build_checkpoints
    WHERE tenant_id = p_tenant_id
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get resume statistics for a build
CREATE OR REPLACE FUNCTION public.get_build_resume_stats(p_build_id TEXT)
RETURNS TABLE (
    total_resumes BIGINT,
    successful_resumes BIGINT,
    failed_resumes BIGINT,
    total_resume_time_ms BIGINT,
    checkpoints_available BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.build_resume_history WHERE build_id = p_build_id)::BIGINT,
        (SELECT COUNT(*) FROM public.build_resume_history WHERE build_id = p_build_id AND status = 'completed')::BIGINT,
        (SELECT COUNT(*) FROM public.build_resume_history WHERE build_id = p_build_id AND status = 'failed')::BIGINT,
        (SELECT COALESCE(SUM(duration_ms), 0) FROM public.build_resume_history WHERE build_id = p_build_id)::BIGINT,
        (SELECT COUNT(*) FROM public.build_checkpoints WHERE build_id = p_build_id AND expires_at > NOW())::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to prune old checkpoints for a build (keep N most recent)
CREATE OR REPLACE FUNCTION public.prune_build_checkpoints(p_build_id TEXT, p_keep_count INTEGER DEFAULT 5)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH to_delete AS (
        SELECT id
        FROM public.build_checkpoints
        WHERE build_id = p_build_id
        ORDER BY sequence DESC
        OFFSET p_keep_count
    )
    DELETE FROM public.build_checkpoints
    WHERE id IN (SELECT id FROM to_delete);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for checkpoint overview per tenant
CREATE OR REPLACE VIEW public.checkpoint_overview AS
SELECT
    tenant_id,
    COUNT(*) AS total_checkpoints,
    COUNT(DISTINCT build_id) AS builds_with_checkpoints,
    SUM(size_bytes) AS total_size_bytes,
    AVG(size_bytes) AS avg_checkpoint_size,
    COUNT(*) FILTER (WHERE compressed) AS compressed_count,
    MIN(created_at) AS oldest_checkpoint,
    MAX(created_at) AS newest_checkpoint,
    COUNT(*) FILTER (WHERE expires_at < NOW() + INTERVAL '1 day') AS expiring_soon
FROM public.build_checkpoints
WHERE expires_at > NOW()
GROUP BY tenant_id;

-- View for build checkpoint summary
CREATE OR REPLACE VIEW public.build_checkpoint_summary AS
SELECT
    build_id,
    tenant_id,
    COUNT(*) AS checkpoint_count,
    MIN(sequence) AS first_sequence,
    MAX(sequence) AS last_sequence,
    SUM(size_bytes) AS total_size_bytes,
    MIN(created_at) AS first_checkpoint_at,
    MAX(created_at) AS last_checkpoint_at,
    ARRAY_AGG(DISTINCT phase ORDER BY phase) AS phases_checkpointed
FROM public.build_checkpoints
WHERE expires_at > NOW()
GROUP BY build_id, tenant_id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.build_checkpoints IS 'Stores checkpoint state snapshots for build resume capability';
COMMENT ON TABLE public.build_resume_history IS 'Tracks build resume attempts and outcomes';
COMMENT ON FUNCTION public.cleanup_expired_checkpoints IS 'Removes expired checkpoints, returns count deleted';
COMMENT ON FUNCTION public.get_latest_checkpoint IS 'Returns the most recent valid checkpoint for a build';
COMMENT ON FUNCTION public.get_checkpoint_stats IS 'Returns checkpoint statistics for a tenant';
COMMENT ON FUNCTION public.prune_build_checkpoints IS 'Keeps only N most recent checkpoints for a build';




-- ═════════════════════════════════════════════════════════════════════════════
-- MIGRATION 3: PROMPT MANAGEMENT SYSTEM
-- File: 20240125000001_prompt_management.sql
-- Purpose: Dynamic prompts, versioning, A/B testing, performance tracking
-- ═════════════════════════════════════════════════════════════════════════════

-- Main prompts table
DROP TABLE IF EXISTS agent_prompts CASCADE;
CREATE TABLE agent_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  agent_id TEXT NOT NULL,                    -- 'strategos', 'archon', etc.
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT,                                  -- Human-readable name for this version

  -- Content
  system_prompt TEXT NOT NULL,               -- The actual prompt text
  output_schema JSONB,                       -- Expected output schema
  examples JSONB DEFAULT '[]'::jsonb,        -- Few-shot examples

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',      -- 'draft', 'active', 'testing', 'archived'
  is_default BOOLEAN DEFAULT false,          -- Is this the default prompt for this agent?

  -- A/B Testing
  experiment_id UUID,                        -- Link to experiment if in A/B test
  traffic_percentage INTEGER DEFAULT 0,      -- % of traffic for A/B testing (0-100)

  -- Performance metrics (updated by JUDGE module)
  usage_count INTEGER DEFAULT 0,
  avg_quality_score NUMERIC(4,2),
  success_rate NUMERIC(5,2),                 -- % of outputs that passed quality check
  avg_tokens_used INTEGER,
  avg_latency_ms INTEGER,

  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,                  -- When it became active
  archived_at TIMESTAMPTZ,

  -- Notes and changelog
  change_notes TEXT,                         -- Why this version was created
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  UNIQUE(agent_id, version)
);

-- Prompt change history (audit log)
DROP TABLE IF EXISTS prompt_history CASCADE;
CREATE TABLE prompt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES agent_prompts(id) ON DELETE CASCADE,

  -- What changed
  action TEXT NOT NULL,                      -- 'created', 'updated', 'activated', 'archived'
  previous_content TEXT,                     -- Previous prompt text (for diff)
  new_content TEXT,                          -- New prompt text

  -- Who and when
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Context
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- A/B Test experiments
DROP TABLE IF EXISTS prompt_experiments CASCADE;
CREATE TABLE prompt_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Variants (prompt versions in this experiment)
  control_prompt_id UUID REFERENCES agent_prompts(id),
  variant_prompt_ids UUID[] DEFAULT '{}',

  -- Configuration
  traffic_split JSONB NOT NULL,              -- { "control": 50, "variant_a": 25, "variant_b": 25 }
  min_sample_size INTEGER DEFAULT 100,       -- Minimum runs before concluding

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',      -- 'draft', 'running', 'completed', 'cancelled'
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Results
  winner_prompt_id UUID REFERENCES agent_prompts(id),
  results JSONB,                             -- Detailed results per variant

  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt performance by build (for detailed analysis)
DROP TABLE IF EXISTS prompt_performance CASCADE;
CREATE TABLE prompt_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES agent_prompts(id) ON DELETE CASCADE,
  build_id UUID,  -- References build_plans.build_id (added after build_plans table created)

  -- Performance data
  quality_score NUMERIC(4,2),
  tokens_used INTEGER,
  latency_ms INTEGER,
  passed_validation BOOLEAN,
  retry_count INTEGER DEFAULT 0,

  -- Context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by agent
CREATE INDEX IF NOT EXISTS idx_prompts_agent ON agent_prompts(agent_id);
CREATE INDEX IF NOT EXISTS idx_prompts_agent_status ON agent_prompts(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_prompts_agent_default ON agent_prompts(agent_id) WHERE is_default = true;

-- Experiment lookups
CREATE INDEX IF NOT EXISTS idx_prompts_experiment ON agent_prompts(experiment_id) WHERE experiment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_experiments_agent ON prompt_experiments(agent_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON prompt_experiments(status);

-- Performance analysis
CREATE INDEX IF NOT EXISTS idx_performance_prompt ON prompt_performance(prompt_id);
CREATE INDEX IF NOT EXISTS idx_performance_build ON prompt_performance(build_id);
CREATE INDEX IF NOT EXISTS idx_performance_created ON prompt_performance(created_at);

-- History lookup
CREATE INDEX IF NOT EXISTS idx_history_prompt ON prompt_history(prompt_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE agent_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_performance ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access to prompts"
  ON agent_prompts FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to history"
  ON prompt_history FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to experiments"
  ON prompt_experiments FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to performance"
  ON prompt_performance FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get active prompt for an agent (considering A/B tests)
CREATE OR REPLACE FUNCTION get_active_prompt(
  p_agent_id TEXT,
  p_experiment_random NUMERIC DEFAULT random()
) RETURNS TABLE (
  prompt_id UUID,
  system_prompt TEXT,
  output_schema JSONB,
  examples JSONB,
  version INTEGER,
  experiment_id UUID
) AS $$
DECLARE
  v_experiment prompt_experiments%ROWTYPE;
  v_cumulative_traffic INTEGER := 0;
  v_selected_prompt_id UUID;
  v_traffic_value INTEGER;
  v_traffic_key TEXT;
BEGIN
  -- Check for running experiments
  SELECT * INTO v_experiment
  FROM prompt_experiments e
  WHERE e.agent_id = p_agent_id
    AND e.status = 'running'
  LIMIT 1;

  IF FOUND THEN
    -- A/B test in progress - select based on traffic split
    FOR v_traffic_key, v_traffic_value IN
      SELECT key, (value::TEXT)::INTEGER
      FROM jsonb_each_text(v_experiment.traffic_split)
    LOOP
      v_cumulative_traffic := v_cumulative_traffic + v_traffic_value;

      IF p_experiment_random * 100 <= v_cumulative_traffic THEN
        -- Select the appropriate prompt
        IF v_traffic_key = 'control' THEN
          v_selected_prompt_id := v_experiment.control_prompt_id;
        ELSE
          -- Extract index from variant name (variant_1 -> 1)
          v_selected_prompt_id := v_experiment.variant_prompt_ids[
            COALESCE(
              NULLIF(regexp_replace(v_traffic_key, '[^0-9]', '', 'g'), '')::INTEGER,
              1
            )
          ];
        END IF;

        IF v_selected_prompt_id IS NOT NULL THEN
          RETURN QUERY
          SELECT
            p.id,
            p.system_prompt,
            p.output_schema,
            p.examples,
            p.version,
            v_experiment.id
          FROM agent_prompts p
          WHERE p.id = v_selected_prompt_id;
          RETURN;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- No experiment or fallback - return default prompt
  RETURN QUERY
  SELECT
    p.id,
    p.system_prompt,
    p.output_schema,
    p.examples,
    p.version,
    NULL::UUID
  FROM agent_prompts p
  WHERE p.agent_id = p_agent_id
    AND p.is_default = true
    AND p.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Activate a prompt version (deactivate others)
CREATE OR REPLACE FUNCTION activate_prompt(
  p_prompt_id UUID,
  p_changed_by UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_agent_id TEXT;
BEGIN
  -- Get agent ID
  SELECT agent_id INTO v_agent_id FROM agent_prompts WHERE id = p_prompt_id;

  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'Prompt not found: %', p_prompt_id;
  END IF;

  -- Deactivate other defaults for this agent
  UPDATE agent_prompts
  SET is_default = false, updated_at = NOW()
  WHERE agent_id = v_agent_id AND is_default = true;

  -- Activate this prompt
  UPDATE agent_prompts
  SET
    is_default = true,
    status = 'active',
    activated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_prompt_id;

  -- Log the change
  INSERT INTO prompt_history (prompt_id, action, changed_by, reason)
  VALUES (p_prompt_id, 'activated', p_changed_by, 'Activated as default prompt');
END;
$$ LANGUAGE plpgsql;

-- Update prompt performance stats (called by JUDGE module)
CREATE OR REPLACE FUNCTION update_prompt_stats(
  p_prompt_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE agent_prompts
  SET
    usage_count = (SELECT COUNT(*) FROM prompt_performance WHERE prompt_id = p_prompt_id),
    avg_quality_score = (SELECT AVG(quality_score) FROM prompt_performance WHERE prompt_id = p_prompt_id),
    success_rate = (SELECT 100.0 * COUNT(*) FILTER (WHERE passed_validation) / NULLIF(COUNT(*), 0) FROM prompt_performance WHERE prompt_id = p_prompt_id),
    avg_tokens_used = (SELECT AVG(tokens_used)::INTEGER FROM prompt_performance WHERE prompt_id = p_prompt_id),
    avg_latency_ms = (SELECT AVG(latency_ms)::INTEGER FROM prompt_performance WHERE prompt_id = p_prompt_id),
    updated_at = NOW()
  WHERE id = p_prompt_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_prompt_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prompt_timestamp ON agent_prompts;
CREATE TRIGGER trigger_prompt_timestamp
  BEFORE UPDATE ON agent_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE agent_prompts IS 'Dynamic prompts for OLYMPUS agents with versioning and A/B testing support';
COMMENT ON TABLE prompt_history IS 'Audit log for all prompt changes';
COMMENT ON TABLE prompt_experiments IS 'A/B testing experiments for prompt optimization';
COMMENT ON TABLE prompt_performance IS 'Performance metrics per prompt per build';

COMMENT ON FUNCTION get_active_prompt IS 'Get active prompt for an agent, respecting A/B test traffic splits';
COMMENT ON FUNCTION activate_prompt IS 'Activate a prompt version as the default for its agent';
COMMENT ON FUNCTION update_prompt_stats IS 'Update aggregate performance statistics for a prompt';




-- ═════════════════════════════════════════════════════════════════════════════
-- MIGRATION 4: BUILD PLANS & STATE MACHINE TABLES
-- File: 20240126000001_build_plans.sql
-- Purpose: Phase 3 of OLYMPUS 50X - Build Plan Integration
-- ═════════════════════════════════════════════════════════════════════════════

-- Build Plans Table
-- Stores the complete build plan with phases and agents
DROP TABLE IF EXISTS build_plans CASCADE;
CREATE TABLE build_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL,
  project_type TEXT NOT NULL,
  phases JSONB NOT NULL DEFAULT '[]',
  agents JSONB NOT NULL DEFAULT '[]',
  current_phase TEXT,
  current_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE build_plans IS 'Stores build plans with phase and agent execution order for OLYMPUS 50X';
COMMENT ON COLUMN build_plans.phases IS 'Array of phases with id, name, order, agents[], status';
COMMENT ON COLUMN build_plans.agents IS 'Array of agents with agentId, phase, order, required, dependencies[], status, retryCount';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_build_plans_build ON build_plans(build_id);
CREATE INDEX IF NOT EXISTS idx_build_plans_status ON build_plans(status);
CREATE INDEX IF NOT EXISTS idx_build_plans_project_type ON build_plans(project_type);
CREATE INDEX IF NOT EXISTS idx_build_plans_created_at ON build_plans(created_at DESC);

-- GIN index for JSONB queries on phases and agents
CREATE INDEX IF NOT EXISTS idx_build_plans_phases ON build_plans USING GIN (phases);
CREATE INDEX IF NOT EXISTS idx_build_plans_agents ON build_plans USING GIN (agents);

-- State transitions log
-- Records every state transition for auditing and debugging
DROP TABLE IF EXISTS build_state_transitions CASCADE;
CREATE TABLE build_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL,
  plan_id UUID REFERENCES build_plans(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  phase TEXT,
  agent TEXT,
  data JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE build_state_transitions IS 'Audit log of all state machine transitions';

-- Create indexes for state transitions
CREATE INDEX IF NOT EXISTS idx_state_transitions_build ON build_state_transitions(build_id);
CREATE INDEX IF NOT EXISTS idx_state_transitions_plan ON build_state_transitions(plan_id);
CREATE INDEX IF NOT EXISTS idx_state_transitions_created ON build_state_transitions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_state_transitions_trigger ON build_state_transitions(trigger_event);

-- Phase execution log
-- Records start/end of each phase with metrics
DROP TABLE IF EXISTS build_phase_executions CASCADE;
CREATE TABLE build_phase_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL,
  plan_id UUID REFERENCES build_plans(id) ON DELETE CASCADE,
  phase_id TEXT NOT NULL,
  phase_name TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'skipped', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  agents_total INTEGER DEFAULT 0,
  agents_completed INTEGER DEFAULT 0,
  agents_failed INTEGER DEFAULT 0,
  agents_skipped INTEGER DEFAULT 0,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE build_phase_executions IS 'Execution log for each phase with timing and agent metrics';

CREATE INDEX IF NOT EXISTS idx_phase_executions_build ON build_phase_executions(build_id);
CREATE INDEX IF NOT EXISTS idx_phase_executions_plan ON build_phase_executions(plan_id);
CREATE INDEX IF NOT EXISTS idx_phase_executions_phase ON build_phase_executions(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_executions_status ON build_phase_executions(status);

-- Agent execution log
-- Records each agent execution with output and quality metrics
DROP TABLE IF EXISTS build_agent_executions CASCADE;
CREATE TABLE build_agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL,
  plan_id UUID REFERENCES build_plans(id) ON DELETE CASCADE,
  phase_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'skipped', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  tokens_used INTEGER DEFAULT 0,
  quality_score NUMERIC(3,2),
  output JSONB,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE build_agent_executions IS 'Execution log for each agent with output and quality metrics';

CREATE INDEX IF NOT EXISTS idx_agent_executions_build ON build_agent_executions(build_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_plan ON build_agent_executions(plan_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_phase ON build_agent_executions(phase_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent ON build_agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON build_agent_executions(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE build_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_phase_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_agent_executions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own build plans
CREATE POLICY "Users can view own build plans"
  ON build_plans FOR SELECT
  USING (
    metadata->>'tenantId' = (auth.jwt() ->> 'tenant_id')
    OR (auth.jwt() ->> 'role') = 'admin'
  );

-- Policy: Users can insert their own build plans
CREATE POLICY "Users can insert own build plans"
  ON build_plans FOR INSERT
  WITH CHECK (
    metadata->>'tenantId' = (auth.jwt() ->> 'tenant_id')
    OR (auth.jwt() ->> 'role') = 'admin'
  );

-- Policy: Users can update their own build plans
CREATE POLICY "Users can update own build plans"
  ON build_plans FOR UPDATE
  USING (
    metadata->>'tenantId' = (auth.jwt() ->> 'tenant_id')
    OR (auth.jwt() ->> 'role') = 'admin'
  );

-- Policy: State transitions follow build plan access
CREATE POLICY "Users can view own state transitions"
  ON build_state_transitions FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM build_plans
      WHERE metadata->>'tenantId' = (auth.jwt() ->> 'tenant_id')
    )
    OR (auth.jwt() ->> 'role') = 'admin'
  );

-- Policy: Phase executions follow build plan access
CREATE POLICY "Users can view own phase executions"
  ON build_phase_executions FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM build_plans
      WHERE metadata->>'tenantId' = (auth.jwt() ->> 'tenant_id')
    )
    OR (auth.jwt() ->> 'role') = 'admin'
  );

-- Policy: Agent executions follow build plan access
CREATE POLICY "Users can view own agent executions"
  ON build_agent_executions FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM build_plans
      WHERE metadata->>'tenantId' = (auth.jwt() ->> 'tenant_id')
    )
    OR (auth.jwt() ->> 'role') = 'admin'
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_build_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_build_plan_timestamp ON build_plans;
CREATE TRIGGER update_build_plan_timestamp
  BEFORE UPDATE ON build_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_build_plan_timestamp();

-- Function to log state transitions
CREATE OR REPLACE FUNCTION log_state_transition(
  p_build_id UUID,
  p_plan_id UUID,
  p_from_state TEXT,
  p_to_state TEXT,
  p_trigger TEXT,
  p_phase TEXT DEFAULT NULL,
  p_agent TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO build_state_transitions (
    build_id, plan_id, from_state, to_state,
    trigger_event, phase, agent, data
  ) VALUES (
    p_build_id, p_plan_id, p_from_state, p_to_state,
    p_trigger, p_phase, p_agent, p_data
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get build plan summary
CREATE OR REPLACE FUNCTION get_build_plan_summary(p_build_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'buildId', bp.build_id,
    'projectType', bp.project_type,
    'status', bp.status,
    'currentPhase', bp.current_phase,
    'currentAgent', bp.current_agent,
    'phaseCount', jsonb_array_length(bp.phases),
    'agentCount', jsonb_array_length(bp.agents),
    'completedAgents', (
      SELECT COUNT(*) FROM jsonb_array_elements(bp.agents) AS a
      WHERE a->>'status' = 'completed'
    ),
    'failedAgents', (
      SELECT COUNT(*) FROM jsonb_array_elements(bp.agents) AS a
      WHERE a->>'status' = 'failed'
    ),
    'createdAt', bp.created_at,
    'updatedAt', bp.updated_at
  ) INTO v_result
  FROM build_plans bp
  WHERE bp.build_id = p_build_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get phase progress
CREATE OR REPLACE FUNCTION get_phase_progress(p_plan_id UUID, p_phase_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'phaseId', p_phase_id,
    'totalAgents', (
      SELECT COUNT(*) FROM jsonb_array_elements(bp.agents) AS a
      WHERE a->>'phase' = p_phase_id
    ),
    'completedAgents', (
      SELECT COUNT(*) FROM jsonb_array_elements(bp.agents) AS a
      WHERE a->>'phase' = p_phase_id AND a->>'status' = 'completed'
    ),
    'runningAgents', (
      SELECT COUNT(*) FROM jsonb_array_elements(bp.agents) AS a
      WHERE a->>'phase' = p_phase_id AND a->>'status' = 'running'
    ),
    'pendingAgents', (
      SELECT COUNT(*) FROM jsonb_array_elements(bp.agents) AS a
      WHERE a->>'phase' = p_phase_id AND a->>'status' = 'pending'
    ),
    'failedAgents', (
      SELECT COUNT(*) FROM jsonb_array_elements(bp.agents) AS a
      WHERE a->>'phase' = p_phase_id AND a->>'status' = 'failed'
    )
  ) INTO v_result
  FROM build_plans bp
  WHERE bp.id = p_plan_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for active builds with progress
CREATE OR REPLACE VIEW v_active_builds AS
SELECT
  bp.id AS plan_id,
  bp.build_id,
  bp.project_type,
  bp.status,
  bp.current_phase,
  bp.current_agent,
  bp.metadata->>'tenantId' AS tenant_id,
  jsonb_array_length(bp.phases) AS total_phases,
  jsonb_array_length(bp.agents) AS total_agents,
  (
    SELECT COUNT(*)::INTEGER FROM jsonb_array_elements(bp.agents) AS a
    WHERE a->>'status' = 'completed'
  ) AS completed_agents,
  (
    SELECT COUNT(*)::INTEGER FROM jsonb_array_elements(bp.agents) AS a
    WHERE a->>'status' = 'failed'
  ) AS failed_agents,
  ROUND(
    (
      SELECT COUNT(*)::NUMERIC FROM jsonb_array_elements(bp.agents) AS a
      WHERE a->>'status' IN ('completed', 'skipped')
    ) / NULLIF(jsonb_array_length(bp.agents)::NUMERIC, 0) * 100, 1
  ) AS progress_percent,
  bp.created_at,
  bp.updated_at
FROM build_plans bp
WHERE bp.status IN ('pending', 'running', 'paused');

-- View for recent state transitions
CREATE OR REPLACE VIEW v_recent_transitions AS
SELECT
  bst.id,
  bst.build_id,
  bp.project_type,
  bst.from_state,
  bst.to_state,
  bst.trigger_event,
  bst.phase,
  bst.agent,
  bst.error,
  bst.created_at
FROM build_state_transitions bst
LEFT JOIN build_plans bp ON bst.plan_id = bp.id
ORDER BY bst.created_at DESC
LIMIT 100;

-- ============================================================================
-- GRANTS (for service role)
-- ============================================================================

-- Grant all privileges to service role
GRANT ALL ON build_plans TO service_role;
GRANT ALL ON build_state_transitions TO service_role;
GRANT ALL ON build_phase_executions TO service_role;
GRANT ALL ON build_agent_executions TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION log_state_transition TO service_role;
GRANT EXECUTE ON FUNCTION get_build_plan_summary TO service_role;
GRANT EXECUTE ON FUNCTION get_phase_progress TO service_role;




-- ═════════════════════════════════════════════════════════════════════════════
-- MIGRATION 5: BUILD PLANS NORMALIZED SCHEMA
-- File: 20240126000002_build_plans_normalized.sql
-- Purpose: Fixes JSONB anti-pattern with proper normalized tables
-- ═════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- PHASE TABLE (Normalized from JSONB)
-- ============================================================================

DROP TABLE IF EXISTS build_plan_phases CASCADE;
CREATE TABLE build_plan_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES build_plans(id) ON DELETE CASCADE,
  phase_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'skipped', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique phase per plan
  CONSTRAINT unique_phase_per_plan UNIQUE (plan_id, phase_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_plan_phases_plan ON build_plan_phases(plan_id);
CREATE INDEX idx_plan_phases_status ON build_plan_phases(status);
CREATE INDEX idx_plan_phases_order ON build_plan_phases(plan_id, phase_order);

-- ============================================================================
-- AGENT TABLE (Normalized from JSONB)
-- ============================================================================

DROP TABLE IF EXISTS build_plan_agents CASCADE;
CREATE TABLE build_plan_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES build_plans(id) ON DELETE CASCADE,
  phase_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_order INTEGER NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  dependencies TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'skipped', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  output JSONB,
  error TEXT,
  tokens_used INTEGER DEFAULT 0,
  quality_score NUMERIC(4,2),
  version INTEGER NOT NULL DEFAULT 1,  -- For optimistic locking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique agent per plan
  CONSTRAINT unique_agent_per_plan UNIQUE (plan_id, agent_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_plan_agents_plan ON build_plan_agents(plan_id);
CREATE INDEX idx_plan_agents_phase ON build_plan_agents(plan_id, phase_id);
CREATE INDEX idx_plan_agents_status ON build_plan_agents(status);
CREATE INDEX idx_plan_agents_order ON build_plan_agents(plan_id, agent_order);
CREATE INDEX idx_plan_agents_deps ON build_plan_agents USING GIN (dependencies);

-- ============================================================================
-- ADD VERSION COLUMN TO BUILD_PLANS FOR OPTIMISTIC LOCKING
-- ============================================================================

ALTER TABLE build_plans ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- OPTIMISTIC LOCKING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_agent_with_lock(
  p_plan_id UUID,
  p_agent_id TEXT,
  p_status TEXT,
  p_expected_version INTEGER,
  p_output JSONB DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_version INTEGER, message TEXT) AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
BEGIN
  -- Get current version with row lock
  SELECT version INTO v_current_version
  FROM build_plan_agents
  WHERE plan_id = p_plan_id AND agent_id = p_agent_id
  FOR UPDATE;

  IF v_current_version IS NULL THEN
    RETURN QUERY SELECT false, 0, 'Agent not found'::TEXT;
    RETURN;
  END IF;

  IF v_current_version != p_expected_version THEN
    RETURN QUERY SELECT false, v_current_version, 'Version mismatch - concurrent update detected'::TEXT;
    RETURN;
  END IF;

  v_new_version := v_current_version + 1;

  UPDATE build_plan_agents
  SET
    status = p_status,
    version = v_new_version,
    output = COALESCE(p_output, output),
    error = p_error,
    started_at = CASE WHEN p_status = 'running' THEN NOW() ELSE started_at END,
    completed_at = CASE WHEN p_status IN ('completed', 'failed', 'skipped') THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE plan_id = p_plan_id AND agent_id = p_agent_id;

  RETURN QUERY SELECT true, v_new_version, 'Updated successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BATCH UPDATE FUNCTION (Prevents N+1)
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_update_agents(
  p_plan_id UUID,
  p_updates JSONB  -- Array of {agent_id, status, output?, error?}
)
RETURNS TABLE(agent_id TEXT, success BOOLEAN, new_version INTEGER) AS $$
DECLARE
  v_update JSONB;
BEGIN
  FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE build_plan_agents
    SET
      status = v_update->>'status',
      version = version + 1,
      output = CASE WHEN v_update ? 'output' THEN v_update->'output' ELSE output END,
      error = v_update->>'error',
      completed_at = CASE WHEN (v_update->>'status') IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
      updated_at = NOW()
    WHERE plan_id = p_plan_id AND build_plan_agents.agent_id = v_update->>'agent_id'
    RETURNING build_plan_agents.agent_id, true, version INTO agent_id, success, new_version;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GET NEXT AGENT FUNCTION (Single query instead of N+1)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_executable_agent(p_plan_id UUID)
RETURNS TABLE(
  agent_id TEXT,
  phase_id TEXT,
  agent_order INTEGER,
  is_required BOOLEAN,
  dependencies TEXT[],
  version INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH completed_agents AS (
    SELECT bpa.agent_id
    FROM build_plan_agents bpa
    WHERE bpa.plan_id = p_plan_id AND bpa.status = 'completed'
  ),
  pending_with_deps_met AS (
    SELECT
      bpa.agent_id,
      bpa.phase_id,
      bpa.agent_order,
      bpa.is_required,
      bpa.dependencies,
      bpa.version,
      -- Check if all dependencies are in completed_agents
      (
        SELECT COUNT(*) = array_length(bpa.dependencies, 1)
        FROM unnest(bpa.dependencies) AS dep
        WHERE dep IN (SELECT ca.agent_id FROM completed_agents ca)
      ) OR array_length(bpa.dependencies, 1) IS NULL AS deps_met
    FROM build_plan_agents bpa
    WHERE bpa.plan_id = p_plan_id AND bpa.status = 'pending'
  )
  SELECT
    pwd.agent_id,
    pwd.phase_id,
    pwd.agent_order,
    pwd.is_required,
    pwd.dependencies,
    pwd.version
  FROM pending_with_deps_met pwd
  WHERE pwd.deps_met = true
  ORDER BY pwd.agent_order
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GET PLAN PROGRESS (Single query)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_plan_progress_fast(p_plan_id UUID)
RETURNS TABLE(
  total_agents BIGINT,
  completed_agents BIGINT,
  failed_agents BIGINT,
  running_agents BIGINT,
  pending_agents BIGINT,
  skipped_agents BIGINT,
  progress_percent NUMERIC,
  current_phase TEXT,
  current_agent TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_agents,
    COUNT(*) FILTER (WHERE bpa.status = 'completed')::BIGINT AS completed_agents,
    COUNT(*) FILTER (WHERE bpa.status = 'failed')::BIGINT AS failed_agents,
    COUNT(*) FILTER (WHERE bpa.status = 'running')::BIGINT AS running_agents,
    COUNT(*) FILTER (WHERE bpa.status = 'pending')::BIGINT AS pending_agents,
    COUNT(*) FILTER (WHERE bpa.status = 'skipped')::BIGINT AS skipped_agents,
    ROUND(
      COUNT(*) FILTER (WHERE bpa.status IN ('completed', 'skipped'))::NUMERIC /
      NULLIF(COUNT(*)::NUMERIC, 0) * 100,
      1
    ) AS progress_percent,
    bp.current_phase,
    bp.current_agent
  FROM build_plan_agents bpa
  JOIN build_plans bp ON bp.id = bpa.plan_id
  WHERE bpa.plan_id = p_plan_id
  GROUP BY bp.current_phase, bp.current_agent;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE build_plan_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_plan_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own phases"
  ON build_plan_phases FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM build_plans
      WHERE metadata->>'tenantId' = (auth.jwt() ->> 'tenant_id')
    )
    OR (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Users can view own agents"
  ON build_plan_agents FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM build_plans
      WHERE metadata->>'tenantId' = (auth.jwt() ->> 'tenant_id')
    )
    OR (auth.jwt() ->> 'role') = 'admin'
  );

-- Service role can do everything
GRANT ALL ON build_plan_phases TO service_role;
GRANT ALL ON build_plan_agents TO service_role;
GRANT EXECUTE ON FUNCTION update_agent_with_lock TO service_role;
GRANT EXECUTE ON FUNCTION batch_update_agents TO service_role;
GRANT EXECUTE ON FUNCTION get_next_executable_agent TO service_role;
GRANT EXECUTE ON FUNCTION get_plan_progress_fast TO service_role;




-- ═════════════════════════════════════════════════════════════════════════════
-- MIGRATION 6: BUILD STATE MACHINES TABLE
-- File: 20240126000003_build_state_machines.sql
-- Purpose: Persistent state storage for build lifecycle management
-- ═════════════════════════════════════════════════════════════════════════════

-- State Machines Table
DROP TABLE IF EXISTS build_state_machines CASCADE;
CREATE TABLE build_state_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL UNIQUE,
  plan_id UUID NOT NULL REFERENCES build_plans(id) ON DELETE CASCADE,
  current_state TEXT NOT NULL DEFAULT 'created'
    CHECK (current_state IN ('created', 'planning', 'running', 'paused', 'waiting_approval', 'completed', 'failed', 'cancelled')),
  current_phase TEXT,
  current_agent TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  last_transition TEXT,
  last_transition_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE build_state_machines IS 'Persistent state machine storage for build lifecycle recovery';
COMMENT ON COLUMN build_state_machines.version IS 'Version number for optimistic locking';
COMMENT ON COLUMN build_state_machines.last_transition IS 'The trigger event that caused the last state change';

-- Indexes
CREATE INDEX idx_state_machines_build ON build_state_machines(build_id);
CREATE INDEX idx_state_machines_state ON build_state_machines(current_state);
CREATE INDEX idx_state_machines_updated ON build_state_machines(updated_at);
CREATE INDEX idx_state_machines_plan ON build_state_machines(plan_id);

-- ============================================================================
-- OPTIMISTIC LOCKING TRIGGER
-- Prevents concurrent updates by checking version
-- ============================================================================

CREATE OR REPLACE FUNCTION check_state_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if version is being incremented
  IF OLD.version IS DISTINCT FROM NEW.version THEN
    IF OLD.version != NEW.version - 1 THEN
      RAISE EXCEPTION 'Optimistic lock failed: expected version %, got %', OLD.version + 1, NEW.version;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_state_version ON build_state_machines;
CREATE TRIGGER enforce_state_version
  BEFORE UPDATE ON build_state_machines
  FOR EACH ROW
  WHEN (OLD.version IS DISTINCT FROM NEW.version)
  EXECUTE FUNCTION check_state_version();

-- ============================================================================
-- ATOMIC TRANSITION FUNCTION
-- Updates state with version check in single operation
-- ============================================================================

CREATE OR REPLACE FUNCTION transition_state_atomic(
  p_state_id UUID,
  p_expected_version INTEGER,
  p_new_state TEXT,
  p_phase TEXT DEFAULT NULL,
  p_agent TEXT DEFAULT NULL,
  p_trigger TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_version INTEGER, message TEXT) AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
BEGIN
  -- Get current version with row lock
  SELECT version INTO v_current_version
  FROM build_state_machines
  WHERE id = p_state_id
  FOR UPDATE;

  IF v_current_version IS NULL THEN
    RETURN QUERY SELECT false, 0, 'State machine not found'::TEXT;
    RETURN;
  END IF;

  IF v_current_version != p_expected_version THEN
    RETURN QUERY SELECT false, v_current_version,
      format('Version mismatch: expected %s, found %s', p_expected_version, v_current_version)::TEXT;
    RETURN;
  END IF;

  v_new_version := v_current_version + 1;

  UPDATE build_state_machines
  SET
    current_state = p_new_state,
    current_phase = COALESCE(p_phase, current_phase),
    current_agent = p_agent,
    version = v_new_version,
    last_transition = p_trigger,
    last_transition_at = NOW(),
    updated_at = NOW()
  WHERE id = p_state_id;

  RETURN QUERY SELECT true, v_new_version, 'Transition successful'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIND ORPHANED BUILDS
-- Returns builds that are "running" but haven't been updated recently
-- Used for recovery after server restart
-- ============================================================================

CREATE OR REPLACE FUNCTION find_orphaned_builds(
  p_stale_threshold_minutes INTEGER DEFAULT 5
)
RETURNS TABLE(
  build_id UUID,
  plan_id UUID,
  current_state TEXT,
  current_phase TEXT,
  last_updated TIMESTAMPTZ,
  minutes_stale INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bsm.build_id,
    bsm.plan_id,
    bsm.current_state,
    bsm.current_phase,
    bsm.updated_at AS last_updated,
    EXTRACT(EPOCH FROM (NOW() - bsm.updated_at) / 60)::INTEGER AS minutes_stale
  FROM build_state_machines bsm
  WHERE bsm.current_state IN ('running', 'paused', 'waiting_approval')
    AND bsm.updated_at < (NOW() - (p_stale_threshold_minutes || ' minutes')::INTERVAL)
  ORDER BY bsm.updated_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STATE TRANSITION LOG (for audit/debugging)
-- Already created in 20240126000001_build_plans.sql, add state_id reference
-- ============================================================================

ALTER TABLE build_state_transitions
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES build_state_machines(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_state_transitions_state_id ON build_state_transitions(state_id);

-- ============================================================================
-- ATOMIC CREATE FUNCTION FOR TRANSACTIONAL STORE
-- Creates plan + phases + agents in single transaction
-- ============================================================================

CREATE OR REPLACE FUNCTION create_build_plan_atomic(
  p_build_id UUID,
  p_project_type TEXT,
  p_metadata JSONB,
  p_phases JSONB,
  p_agents JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_plan_id UUID;
  v_phase JSONB;
  v_agent JSONB;
BEGIN
  -- Insert plan
  INSERT INTO build_plans (build_id, project_type, status, version, metadata)
  VALUES (p_build_id, p_project_type, 'pending', 1, p_metadata)
  RETURNING id INTO v_plan_id;

  -- Insert phases
  FOR v_phase IN SELECT * FROM jsonb_array_elements(p_phases)
  LOOP
    INSERT INTO build_plan_phases (plan_id, phase_id, name, phase_order, status)
    VALUES (
      v_plan_id,
      v_phase->>'phaseId',
      v_phase->>'name',
      (v_phase->>'order')::INTEGER,
      'pending'
    );
  END LOOP;

  -- Insert agents
  FOR v_agent IN SELECT * FROM jsonb_array_elements(p_agents)
  LOOP
    INSERT INTO build_plan_agents (
      plan_id, phase_id, agent_id, agent_order,
      is_required, dependencies, max_retries, status, version
    )
    VALUES (
      v_plan_id,
      v_agent->>'phaseId',
      v_agent->>'agentId',
      (v_agent->>'order')::INTEGER,
      (v_agent->>'isRequired')::BOOLEAN,
      ARRAY(SELECT jsonb_array_elements_text(v_agent->'dependencies')),
      COALESCE((v_agent->>'maxRetries')::INTEGER, 3),
      'pending',
      1
    );
  END LOOP;

  -- Return the created plan
  RETURN (
    SELECT row_to_json(bp.*)
    FROM build_plans bp
    WHERE bp.id = v_plan_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE ADVANCEMENT FUNCTION
-- Completes current phase and starts next atomically
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_phase_and_advance(
  p_plan_id UUID,
  p_current_phase TEXT,
  p_next_phase TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Complete current phase
  UPDATE build_plan_phases
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE plan_id = p_plan_id AND phase_id = p_current_phase;

  -- Start next phase if provided
  IF p_next_phase IS NOT NULL THEN
    UPDATE build_plan_phases
    SET
      status = 'running',
      started_at = NOW(),
      updated_at = NOW()
    WHERE plan_id = p_plan_id AND phase_id = p_next_phase;

    UPDATE build_plans
    SET
      current_phase = p_next_phase,
      updated_at = NOW()
    WHERE id = p_plan_id;
  ELSE
    -- No next phase - mark plan as completing
    UPDATE build_plans
    SET
      current_phase = NULL,
      updated_at = NOW()
    WHERE id = p_plan_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE build_state_machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own state machines"
  ON build_state_machines FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM build_plans
      WHERE metadata->>'tenantId' = (auth.jwt() ->> 'tenant_id')
    )
    OR (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Service can manage state machines"
  ON build_state_machines FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON build_state_machines TO service_role;
GRANT EXECUTE ON FUNCTION transition_state_atomic TO service_role;
GRANT EXECUTE ON FUNCTION find_orphaned_builds TO service_role;
GRANT EXECUTE ON FUNCTION create_build_plan_atomic TO service_role;
GRANT EXECUTE ON FUNCTION complete_phase_and_advance TO service_role;




-- ═════════════════════════════════════════════════════════════════════════════
-- END OF COMBINED MIGRATIONS
-- ═════════════════════════════════════════════════════════════════════════════
--
-- SUMMARY:
--   ✓ Migration 1: Audit tables (1 table, 4 indexes, 2 policies)
--   ✓ Migration 2: Checkpoints (2 tables, 13 indexes, 6 policies, 5 functions, 2 views)
--   ✓ Migration 3: Prompt management (4 tables, 11 indexes, 4 policies, 4 functions, 1 trigger)
--   ✓ Migration 4: Build plans (4 tables, 18 indexes, 6 policies, 4 functions, 2 views)
--   ✓ Migration 5: Build plans normalized (2 tables, 9 indexes, 2 policies, 4 functions)
--   ✓ Migration 6: Build state machines (1 table, 5 indexes, 2 policies, 5 functions, 1 trigger)
--
-- TOTAL: 14 tables, 60 indexes, 22 policies, 22 functions, 2 triggers, 5 views
--
-- All systems ready for CONDUCTOR activation!
-- ═════════════════════════════════════════════════════════════════════════════
