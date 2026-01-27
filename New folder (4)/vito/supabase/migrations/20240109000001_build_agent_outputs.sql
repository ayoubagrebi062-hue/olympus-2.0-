-- ============================================
-- OLYMPUS 2.0 - Build Agent Outputs Table
-- Migration: 20240109000001_build_agent_outputs.sql
--
-- This table stores generated code artifacts from builds
-- The code uses 'build_agent_outputs' (references builds table)
-- ============================================

-- Create table for storing build artifacts/outputs
CREATE TABLE IF NOT EXISTS build_agent_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',

  -- Output data
  artifacts JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  metrics JSONB DEFAULT '{}',
  errors JSONB,

  -- Metrics
  duration INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(build_id, agent_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_build_agent_outputs_build ON build_agent_outputs(build_id);
CREATE INDEX IF NOT EXISTS idx_build_agent_outputs_agent ON build_agent_outputs(agent_id);
CREATE INDEX IF NOT EXISTS idx_build_agent_outputs_status ON build_agent_outputs(status);

-- Enable RLS
ALTER TABLE build_agent_outputs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations for service role (used by backend)
CREATE POLICY build_agent_outputs_service_role ON build_agent_outputs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Users can view outputs for builds they have access to
CREATE POLICY build_agent_outputs_select ON build_agent_outputs
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
CREATE OR REPLACE FUNCTION update_build_agent_outputs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_build_agent_outputs_updated
  BEFORE UPDATE ON build_agent_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_build_agent_outputs_updated_at();
