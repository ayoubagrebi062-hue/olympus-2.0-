-- ============================================
-- OLYMPUS 2.0 - Agent Execution Tracking
-- Migration: 20240110000001_agent_executions.sql
--
-- Tracks individual agent executions for the 35-agent system
-- ============================================

-- Create table for tracking agent executions
CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  phase TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Input/Output
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',

  -- Metrics
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_agent_executions_build ON agent_executions(build_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_phase ON agent_executions(phase);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);

-- Enable RLS
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can do everything
CREATE POLICY agent_executions_service ON agent_executions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Users can view executions for their builds
CREATE POLICY agent_executions_select ON agent_executions
  FOR SELECT
  USING (
    build_id IN (
      SELECT b.id FROM builds b
      JOIN projects p ON b.project_id = p.id
      WHERE p.tenant_id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
      )
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_agent_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_agent_executions_updated
  BEFORE UPDATE ON agent_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_executions_updated_at();

-- ============================================
-- Project Versions Table
-- ============================================

CREATE TABLE IF NOT EXISTS project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  build_id UUID REFERENCES builds(id) ON DELETE SET NULL,

  -- Version info
  version_number INTEGER NOT NULL DEFAULT 1,
  label TEXT,
  description TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,

  -- Files stored as JSON array of {path, content, type}
  files JSONB DEFAULT '[]',

  -- Metadata
  file_count INTEGER DEFAULT 0,
  total_size_bytes INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, version_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_versions_project ON project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_build ON project_versions(build_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_status ON project_versions(status);

-- Enable RLS
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY project_versions_service ON project_versions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY project_versions_select ON project_versions
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- Project Files Table (individual file storage)
-- ============================================

CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES project_versions(id) ON DELETE CASCADE,
  build_id UUID REFERENCES builds(id) ON DELETE SET NULL,

  -- File info
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  extension TEXT,
  content TEXT,

  -- Metadata
  size_bytes INTEGER DEFAULT 0,
  mime_type TEXT,
  language TEXT,

  -- Agent that created this file
  created_by_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(version_id, path)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_version ON project_files(version_id);
CREATE INDEX IF NOT EXISTS idx_project_files_build ON project_files(build_id);
CREATE INDEX IF NOT EXISTS idx_project_files_path ON project_files(path);

-- Enable RLS
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY project_files_service ON project_files
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY project_files_select ON project_files
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- Add missing columns to builds table
-- ============================================

-- Add columns if they don't exist
DO $$
BEGIN
  -- current_phase column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'current_phase') THEN
    ALTER TABLE builds ADD COLUMN current_phase TEXT;
  END IF;

  -- current_agent column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'current_agent') THEN
    ALTER TABLE builds ADD COLUMN current_agent TEXT;
  END IF;

  -- completed_phases column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'completed_phases') THEN
    ALTER TABLE builds ADD COLUMN completed_phases TEXT[] DEFAULT '{}';
  END IF;

  -- completed_agents column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'completed_agents') THEN
    ALTER TABLE builds ADD COLUMN completed_agents TEXT[] DEFAULT '{}';
  END IF;

  -- tokens_used column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'tokens_used') THEN
    ALTER TABLE builds ADD COLUMN tokens_used INTEGER DEFAULT 0;
  END IF;

  -- actual_cost column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'actual_cost') THEN
    ALTER TABLE builds ADD COLUMN actual_cost DECIMAL(10, 4) DEFAULT 0;
  END IF;

  -- error column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'error') THEN
    ALTER TABLE builds ADD COLUMN error TEXT;
  END IF;

  -- description column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'description') THEN
    ALTER TABLE builds ADD COLUMN description TEXT;
  END IF;

  -- started_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'started_at') THEN
    ALTER TABLE builds ADD COLUMN started_at TIMESTAMPTZ;
  END IF;
END $$;
