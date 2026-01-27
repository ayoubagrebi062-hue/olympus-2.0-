-- ============================================
-- FIX #3: Stalled Build Detection System
-- ============================================
-- Problem: Builds could hang forever with no status change.
--          No 'stalled' status existed, and no heartbeat system to detect hangs.
-- Fix: Add heartbeat tracking and stalled detection function.
-- ============================================

-- Add last_heartbeat column to track agent activity
ALTER TABLE ai_builds
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS stalled_at TIMESTAMPTZ;

-- Add heartbeat column to agent outputs
ALTER TABLE ai_build_agent_outputs
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ DEFAULT NOW();

-- Update heartbeat when agent status changes
CREATE OR REPLACE FUNCTION update_build_heartbeat()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the build's heartbeat timestamp
  UPDATE ai_builds
  SET
    last_heartbeat = NOW(),
    -- Clear stalled_at if build is still active
    stalled_at = CASE
      WHEN status IN ('running', 'pending') THEN NULL
      ELSE stalled_at
    END
  WHERE id = NEW.build_id;

  -- Also update the agent output's heartbeat
  NEW.last_heartbeat = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for heartbeat updates
DROP TRIGGER IF EXISTS trigger_update_heartbeat ON ai_build_agent_outputs;
CREATE TRIGGER trigger_update_heartbeat
  BEFORE INSERT OR UPDATE ON ai_build_agent_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_build_heartbeat();

-- Function to detect and mark stalled builds
-- Call this periodically (e.g., every minute via pg_cron or external scheduler)
CREATE OR REPLACE FUNCTION detect_stalled_builds(
  stall_threshold_minutes INTEGER DEFAULT 5
)
RETURNS TABLE(
  build_id UUID,
  last_heartbeat TIMESTAMPTZ,
  minutes_stalled NUMERIC,
  current_phase TEXT,
  running_agents TEXT[]
) AS $$
BEGIN
  -- Mark builds as stalled if no heartbeat for threshold
  UPDATE ai_builds
  SET
    stalled_at = NOW(),
    status = 'failed',
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{stall_info}',
      jsonb_build_object(
        'detected_at', NOW(),
        'last_heartbeat', ai_builds.last_heartbeat,
        'threshold_minutes', stall_threshold_minutes,
        'reason', 'No heartbeat for ' || stall_threshold_minutes || ' minutes'
      )
    )
  WHERE
    status IN ('running', 'pending')
    AND last_heartbeat < NOW() - (stall_threshold_minutes || ' minutes')::INTERVAL;

  -- Return info about stalled builds for logging/alerting
  RETURN QUERY
  SELECT
    b.id AS build_id,
    b.last_heartbeat,
    EXTRACT(EPOCH FROM (NOW() - b.last_heartbeat)) / 60 AS minutes_stalled,
    b.current_phase,
    ARRAY_AGG(DISTINCT ao.agent_id) FILTER (WHERE ao.status = 'running') AS running_agents
  FROM ai_builds b
  LEFT JOIN ai_build_agent_outputs ao ON ao.build_id = b.id
  WHERE b.stalled_at IS NOT NULL
  GROUP BY b.id, b.last_heartbeat, b.current_phase;
END;
$$ LANGUAGE plpgsql;

-- Function to manually heartbeat a build (call from application code)
CREATE OR REPLACE FUNCTION heartbeat_build(p_build_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ai_builds
  SET last_heartbeat = NOW()
  WHERE id = p_build_id AND status IN ('running', 'pending');

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION detect_stalled_builds(INTEGER) IS
'FIX #3: Detects builds with no activity for threshold minutes and marks them as failed. Call periodically.';

COMMENT ON FUNCTION heartbeat_build(UUID) IS
'FIX #3: Updates build heartbeat to prevent stall detection. Call from orchestrator during execution.';

COMMENT ON COLUMN ai_builds.last_heartbeat IS 'Last activity timestamp for stall detection';
COMMENT ON COLUMN ai_builds.stalled_at IS 'Timestamp when build was detected as stalled';
