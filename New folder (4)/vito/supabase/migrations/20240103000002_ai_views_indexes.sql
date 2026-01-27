-- ============================================
-- OLYMPUS 2.0 - AI Agent System Views & Indexes
-- Migration: 20240103000002_ai_views_indexes.sql
-- ============================================

-- ============================================
-- Build Summary View
-- ============================================
CREATE OR REPLACE VIEW ai_build_summary AS
SELECT
  b.id,
  b.project_id,
  b.tenant_id,
  b.tier,
  b.status,
  b.progress,
  b.iteration,
  b.description,
  b.created_at,
  b.started_at,
  b.completed_at,
  b.tokens_used,
  b.actual_cost,
  p.name as project_name,
  p.slug as project_slug,
  u.email as created_by_email,
  u.display_name as created_by_name,
  (SELECT COUNT(*) FROM ai_build_agent_outputs WHERE build_id = b.id) as agent_count,
  (SELECT COUNT(*) FROM ai_build_agent_outputs WHERE build_id = b.id AND status = 'completed') as completed_agents,
  (SELECT COUNT(*) FROM ai_build_artifacts WHERE build_id = b.id) as artifact_count,
  (SELECT COUNT(*) FROM ai_build_iterations WHERE build_id = b.id) as iteration_count,
  EXTRACT(EPOCH FROM (COALESCE(b.completed_at, NOW()) - b.started_at)) as duration_seconds
FROM ai_builds b
LEFT JOIN projects p ON p.id = b.project_id
LEFT JOIN users u ON u.id = b.created_by;

-- ============================================
-- Agent Performance View
-- ============================================
CREATE OR REPLACE VIEW ai_agent_performance AS
SELECT
  agent_id,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_runs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
  ROUND(AVG(duration)::numeric, 0) as avg_duration_ms,
  ROUND(AVG(tokens_used)::numeric, 0) as avg_tokens,
  SUM(tokens_used) as total_tokens,
  ROUND(AVG(retries)::numeric, 2) as avg_retries,
  MAX(completed_at) as last_run
FROM ai_build_agent_outputs
WHERE status IN ('completed', 'failed')
GROUP BY agent_id
ORDER BY total_runs DESC;

-- ============================================
-- Tenant AI Usage View
-- ============================================
CREATE OR REPLACE VIEW ai_tenant_usage AS
SELECT
  t.id as tenant_id,
  t.name as tenant_name,
  COUNT(DISTINCT b.id) as total_builds,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed') as completed_builds,
  SUM(b.tokens_used) as total_tokens,
  SUM(b.actual_cost) as total_cost,
  ROUND(AVG(b.tokens_used)::numeric, 0) as avg_tokens_per_build,
  ROUND(AVG(b.actual_cost)::numeric, 4) as avg_cost_per_build,
  MAX(b.created_at) as last_build_at
FROM tenants t
LEFT JOIN ai_builds b ON b.tenant_id = t.id
GROUP BY t.id, t.name;

-- ============================================
-- Daily AI Metrics View
-- ============================================
CREATE OR REPLACE VIEW ai_daily_metrics AS
SELECT
  date_trunc('day', created_at) as date,
  tenant_id,
  COUNT(*) as builds_started,
  COUNT(*) FILTER (WHERE status = 'completed') as builds_completed,
  COUNT(*) FILTER (WHERE status = 'failed') as builds_failed,
  SUM(tokens_used) as tokens_used,
  SUM(actual_cost) as cost,
  ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))::numeric, 0) as avg_duration_seconds
FROM ai_builds
WHERE created_at > NOW() - interval '90 days'
GROUP BY date_trunc('day', created_at), tenant_id
ORDER BY date DESC;

-- ============================================
-- Active Builds View
-- ============================================
CREATE OR REPLACE VIEW ai_active_builds AS
SELECT
  b.*,
  p.name as project_name,
  t.name as tenant_name,
  EXTRACT(EPOCH FROM (NOW() - b.started_at)) as running_seconds,
  (SELECT array_agg(agent_id) FROM ai_build_agent_outputs WHERE build_id = b.id AND status = 'running') as running_agents
FROM ai_builds b
JOIN projects p ON p.id = b.project_id
JOIN tenants t ON t.id = b.tenant_id
WHERE b.status IN ('running', 'queued', 'paused');

-- ============================================
-- Artifact Search View
-- ============================================
CREATE OR REPLACE VIEW ai_artifact_search AS
SELECT
  a.id,
  a.build_id,
  a.agent_id,
  a.type,
  a.path,
  a.filename,
  a.content_hash,
  a.created_at,
  b.project_id,
  b.tenant_id,
  p.name as project_name,
  LENGTH(a.content) as content_length
FROM ai_build_artifacts a
JOIN ai_builds b ON b.id = a.build_id
JOIN projects p ON p.id = b.project_id;

-- ============================================
-- Full-Text Search Index for Artifacts
-- ============================================
CREATE INDEX IF NOT EXISTS idx_artifacts_content_search
ON ai_build_artifacts
USING gin(to_tsvector('english', COALESCE(content, '')));

-- ============================================
-- Composite Indexes for Common Queries
-- ============================================

-- Builds by tenant and status
CREATE INDEX IF NOT EXISTS idx_builds_tenant_status
ON ai_builds(tenant_id, status, created_at DESC);

-- Builds by project and status
CREATE INDEX IF NOT EXISTS idx_builds_project_status
ON ai_builds(project_id, status, created_at DESC);

-- Agent outputs by build and status
CREATE INDEX IF NOT EXISTS idx_outputs_build_status
ON ai_build_agent_outputs(build_id, status);

-- Token usage by tenant and date
CREATE INDEX IF NOT EXISTS idx_token_usage_tenant_date
ON ai_token_usage(tenant_id, created_at DESC);

-- Logs by build and time (for streaming)
CREATE INDEX IF NOT EXISTS idx_logs_build_time
ON ai_build_logs(build_id, created_at DESC);

-- ============================================
-- Materialized View for Dashboard Stats
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_dashboard_stats AS
SELECT
  tenant_id,
  COUNT(*) as total_builds,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_builds,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_builds,
  COUNT(*) FILTER (WHERE status = 'running') as active_builds,
  SUM(tokens_used) as total_tokens,
  SUM(actual_cost) as total_cost,
  COUNT(*) FILTER (WHERE created_at > NOW() - interval '7 days') as builds_last_7_days,
  COUNT(*) FILTER (WHERE created_at > NOW() - interval '30 days') as builds_last_30_days
FROM ai_builds
GROUP BY tenant_id;

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_ai_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ai_dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_dashboard_stats_tenant
ON ai_dashboard_stats(tenant_id);

-- ============================================
-- Helper Functions
-- ============================================

-- Get build artifacts as JSON
CREATE OR REPLACE FUNCTION get_build_artifacts_json(p_build_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'agent_id', agent_id,
        'type', type,
        'path', path,
        'filename', filename,
        'content_hash', content_hash,
        'metadata', metadata
      )
    ), '[]'::jsonb)
    FROM ai_build_artifacts
    WHERE build_id = p_build_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Get build timeline
CREATE OR REPLACE FUNCTION get_build_timeline(p_build_id UUID)
RETURNS TABLE (
  event_time TIMESTAMPTZ,
  event_type TEXT,
  agent_id TEXT,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.started_at as event_time,
    'agent_started' as event_type,
    o.agent_id,
    jsonb_build_object('status', o.status) as details
  FROM ai_build_agent_outputs o
  WHERE o.build_id = p_build_id AND o.started_at IS NOT NULL

  UNION ALL

  SELECT
    o.completed_at as event_time,
    CASE WHEN o.status = 'completed' THEN 'agent_completed' ELSE 'agent_failed' END as event_type,
    o.agent_id,
    jsonb_build_object('status', o.status, 'duration', o.duration, 'tokens', o.tokens_used) as details
  FROM ai_build_agent_outputs o
  WHERE o.build_id = p_build_id AND o.completed_at IS NOT NULL

  ORDER BY event_time;
END;
$$ LANGUAGE plpgsql STABLE;
