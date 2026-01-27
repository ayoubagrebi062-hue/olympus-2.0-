-- ============================================
-- OLYMPUS 2.0 - AI Agent System Tables
-- Migration: 20240103000001_ai_agent_tables.sql
-- ============================================

-- Build tier enum
CREATE TYPE build_tier AS ENUM ('starter', 'professional', 'ultimate', 'enterprise');

-- Build status enum
CREATE TYPE build_status AS ENUM (
  'created', 'queued', 'running', 'paused',
  'completed', 'failed', 'canceled'
);

-- Agent status enum
CREATE TYPE agent_status AS ENUM (
  'idle', 'initializing', 'running', 'waiting',
  'completed', 'failed', 'skipped'
);

-- Build phase enum
CREATE TYPE build_phase AS ENUM (
  'discovery', 'design', 'architecture', 'frontend',
  'backend', 'integration', 'testing', 'deployment'
);

-- Artifact type enum
CREATE TYPE artifact_type AS ENUM (
  'code', 'schema', 'config', 'document',
  'design', 'test', 'asset'
);

-- ============================================
-- AI Builds Table
-- ============================================
CREATE TABLE ai_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),

  -- Build configuration
  tier build_tier NOT NULL DEFAULT 'starter',
  description TEXT NOT NULL,
  target_users TEXT,
  tech_constraints TEXT,
  business_requirements TEXT,
  design_preferences TEXT,
  integrations TEXT[],

  -- Execution state
  status build_status NOT NULL DEFAULT 'created',
  current_phase build_phase,
  current_agent TEXT,
  completed_phases build_phase[] DEFAULT '{}',
  completed_agents TEXT[] DEFAULT '{}',
  progress INTEGER DEFAULT 0,
  iteration INTEGER DEFAULT 1,

  -- Planning
  total_agents INTEGER DEFAULT 0,
  estimated_tokens INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10, 4) DEFAULT 0,
  estimated_duration INTEGER DEFAULT 0, -- ms

  -- Actual usage
  tokens_used INTEGER DEFAULT 0,
  actual_cost DECIMAL(10, 4) DEFAULT 0,

  -- Knowledge (accumulated context)
  knowledge JSONB DEFAULT '{}',

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Error tracking
  error TEXT,
  error_details JSONB,

  CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100)
);

-- Indexes
CREATE INDEX idx_ai_builds_project ON ai_builds(project_id);
CREATE INDEX idx_ai_builds_tenant ON ai_builds(tenant_id);
CREATE INDEX idx_ai_builds_status ON ai_builds(status);
CREATE INDEX idx_ai_builds_created_by ON ai_builds(created_by);
CREATE INDEX idx_ai_builds_created_at ON ai_builds(created_at DESC);

-- ============================================
-- Agent Outputs Table
-- ============================================
CREATE TABLE ai_build_agent_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES ai_builds(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,

  -- Execution
  status agent_status NOT NULL DEFAULT 'idle',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration INTEGER, -- ms

  -- Output
  artifacts JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',

  -- Metrics
  tokens_used INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  prompt_count INTEGER DEFAULT 1,
  retries INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,

  -- Errors
  errors JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(build_id, agent_id)
);

-- Indexes
CREATE INDEX idx_agent_outputs_build ON ai_build_agent_outputs(build_id);
CREATE INDEX idx_agent_outputs_agent ON ai_build_agent_outputs(agent_id);
CREATE INDEX idx_agent_outputs_status ON ai_build_agent_outputs(status);

-- ============================================
-- Build Iterations Table
-- ============================================
CREATE TABLE ai_build_iterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES ai_builds(id) ON DELETE CASCADE,
  iteration_number INTEGER NOT NULL,

  -- Feedback
  feedback TEXT NOT NULL,
  focus_areas TEXT[],
  rerun_agents TEXT[],
  rerun_phases build_phase[],

  -- Execution
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Results
  changes_made JSONB,
  tokens_used INTEGER DEFAULT 0,
  error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(build_id, iteration_number)
);

-- Indexes
CREATE INDEX idx_iterations_build ON ai_build_iterations(build_id);
CREATE INDEX idx_iterations_number ON ai_build_iterations(iteration_number);

-- ============================================
-- Build Snapshots Table (for recovery)
-- ============================================
CREATE TABLE ai_build_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES ai_builds(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,

  -- State snapshot
  state build_status NOT NULL,
  current_phase build_phase,
  current_agent TEXT,
  iteration INTEGER NOT NULL,

  -- Data snapshot
  knowledge JSONB NOT NULL,
  agent_output_ids TEXT[] NOT NULL,
  tokens_used INTEGER NOT NULL,

  -- Verification
  checksum TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(build_id, version)
);

-- Indexes
CREATE INDEX idx_snapshots_build ON ai_build_snapshots(build_id);
CREATE INDEX idx_snapshots_version ON ai_build_snapshots(build_id, version DESC);

-- ============================================
-- Build Logs Table (for streaming)
-- ============================================
CREATE TABLE ai_build_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES ai_builds(id) ON DELETE CASCADE,
  agent_id TEXT,
  phase build_phase,

  level TEXT NOT NULL DEFAULT 'info', -- debug, info, warn, error
  message TEXT NOT NULL,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_build_logs_build ON ai_build_logs(build_id);
CREATE INDEX idx_build_logs_created ON ai_build_logs(build_id, created_at DESC);
CREATE INDEX idx_build_logs_level ON ai_build_logs(level);

-- Partitioning for logs (by month)
-- In production, consider partitioning this table

-- ============================================
-- Artifacts Table (extracted files)
-- ============================================
CREATE TABLE ai_build_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES ai_builds(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,

  type artifact_type NOT NULL,
  path TEXT,
  filename TEXT,
  content TEXT,
  content_hash TEXT,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_artifacts_build ON ai_build_artifacts(build_id);
CREATE INDEX idx_artifacts_type ON ai_build_artifacts(type);
CREATE INDEX idx_artifacts_path ON ai_build_artifacts(path);

-- ============================================
-- Token Usage Tracking Table
-- ============================================
CREATE TABLE ai_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES ai_builds(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,

  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_write_tokens INTEGER DEFAULT 0,

  cost DECIMAL(10, 6) NOT NULL,
  request_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_token_usage_build ON ai_token_usage(build_id);
CREATE INDEX idx_token_usage_tenant ON ai_token_usage(tenant_id);
CREATE INDEX idx_token_usage_created ON ai_token_usage(created_at DESC);
CREATE INDEX idx_token_usage_model ON ai_token_usage(model);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE ai_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_build_agent_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_build_iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_build_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_build_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_build_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Builds: tenant members can view, owners/admins can modify
CREATE POLICY builds_select ON ai_builds FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY builds_insert ON ai_builds FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  ));

CREATE POLICY builds_update ON ai_builds FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY builds_delete ON ai_builds FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Agent outputs: inherit from builds
CREATE POLICY agent_outputs_select ON ai_build_agent_outputs FOR SELECT
  USING (build_id IN (SELECT id FROM ai_builds WHERE tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  )));

CREATE POLICY agent_outputs_all ON ai_build_agent_outputs FOR ALL
  USING (build_id IN (SELECT id FROM ai_builds WHERE tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )));

-- Similar policies for other tables...
CREATE POLICY iterations_select ON ai_build_iterations FOR SELECT
  USING (build_id IN (SELECT id FROM ai_builds WHERE tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  )));

CREATE POLICY snapshots_select ON ai_build_snapshots FOR SELECT
  USING (build_id IN (SELECT id FROM ai_builds WHERE tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  )));

CREATE POLICY logs_select ON ai_build_logs FOR SELECT
  USING (build_id IN (SELECT id FROM ai_builds WHERE tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  )));

CREATE POLICY artifacts_select ON ai_build_artifacts FOR SELECT
  USING (build_id IN (SELECT id FROM ai_builds WHERE tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  )));

CREATE POLICY token_usage_select ON ai_token_usage FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- ============================================
-- Functions
-- ============================================

-- Update build progress automatically
CREATE OR REPLACE FUNCTION update_build_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_builds SET
    progress = (
      SELECT COALESCE(
        ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / NULLIF(total_agents, 0)) * 100),
        0
      )
      FROM ai_build_agent_outputs
      WHERE build_id = NEW.build_id
    ),
    updated_at = NOW()
  WHERE id = NEW.build_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_build_progress
  AFTER INSERT OR UPDATE ON ai_build_agent_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_build_progress();

-- Track token usage per tenant (for billing)
CREATE OR REPLACE FUNCTION track_tenant_ai_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update tenant's AI usage metrics
  INSERT INTO usage_records (
    tenant_id, metric, value, period_start, period_end
  ) VALUES (
    NEW.tenant_id,
    'ai_tokens',
    NEW.total_tokens,
    date_trunc('month', NOW()),
    date_trunc('month', NOW()) + interval '1 month'
  )
  ON CONFLICT (tenant_id, metric, period_start)
  DO UPDATE SET value = usage_records.value + NEW.total_tokens;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_ai_usage
  AFTER INSERT ON ai_token_usage
  FOR EACH ROW
  EXECUTE FUNCTION track_tenant_ai_usage();

-- ============================================
-- Updated at triggers
-- ============================================

CREATE TRIGGER set_ai_builds_updated
  BEFORE UPDATE ON ai_builds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_agent_outputs_updated
  BEFORE UPDATE ON ai_build_agent_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
