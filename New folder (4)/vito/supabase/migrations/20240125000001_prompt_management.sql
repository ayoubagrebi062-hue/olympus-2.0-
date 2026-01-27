-- ============================================================================
-- PROMPT MANAGEMENT SYSTEM
-- Enables dynamic prompts, versioning, A/B testing, and performance tracking
-- Phase 5 of OLYMPUS 50X - CRITICAL for Level 5 (EVOLUTION MODULE)
-- ============================================================================

-- Main prompts table
CREATE TABLE IF NOT EXISTS agent_prompts (
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
CREATE TABLE IF NOT EXISTS prompt_history (
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
CREATE TABLE IF NOT EXISTS prompt_experiments (
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
CREATE TABLE IF NOT EXISTS prompt_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES agent_prompts(id) ON DELETE CASCADE,
  build_id UUID REFERENCES builds(id) ON DELETE CASCADE,

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
