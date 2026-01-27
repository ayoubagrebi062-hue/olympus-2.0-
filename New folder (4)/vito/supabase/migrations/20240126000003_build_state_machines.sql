-- ============================================================================
-- BUILD STATE MACHINES TABLE
-- Persistent state storage for build lifecycle management
-- Fixes in-memory state loss on server restarts
-- ============================================================================

-- State Machines Table
CREATE TABLE IF NOT EXISTS build_state_machines (
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
