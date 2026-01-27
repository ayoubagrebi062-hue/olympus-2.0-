-- ============================================================================
-- BUILD PLANS NORMALIZED SCHEMA
-- Fixes JSONB anti-pattern with proper normalized tables
-- ============================================================================

-- Drop the JSONB columns and add proper foreign keys
-- This migration assumes 20240126000001_build_plans.sql already ran

-- ============================================================================
-- PHASE TABLE (Normalized from JSONB)
-- ============================================================================

CREATE TABLE IF NOT EXISTS build_plan_phases (
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

CREATE TABLE IF NOT EXISTS build_plan_agents (
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
