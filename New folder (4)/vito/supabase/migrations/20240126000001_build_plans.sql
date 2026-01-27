-- ============================================================================
-- BUILD PLANS & STATE MACHINE TABLES
-- Phase 3 of OLYMPUS 50X - Build Plan Integration
-- ============================================================================

-- Build Plans Table
-- Stores the complete build plan with phases and agents
CREATE TABLE IF NOT EXISTS build_plans (
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
CREATE TABLE IF NOT EXISTS build_state_transitions (
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
CREATE TABLE IF NOT EXISTS build_phase_executions (
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
CREATE TABLE IF NOT EXISTS build_agent_executions (
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
