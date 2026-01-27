-- ============================================
-- OLYMPUS 2.0 - BUG FIXES (For Existing Schema)
-- ============================================
-- This migration works with the SELF_BUILD_MINIMAL.sql schema
-- which uses 'builds' table instead of 'ai_builds'
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bxkrwzrisoqtojhpjdrw/sql
-- ============================================

-- ============================================
-- STEP 1: Detect which schema exists
-- ============================================

DO $$
DECLARE
  has_builds BOOLEAN;
  has_ai_builds BOOLEAN;
  target_table TEXT;
BEGIN
  -- Check which tables exist
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'builds') INTO has_builds;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_builds') INTO has_ai_builds;

  IF has_ai_builds THEN
    RAISE NOTICE 'Found ai_builds table - using full schema';
  ELSIF has_builds THEN
    RAISE NOTICE 'Found builds table - using simplified schema';
  ELSE
    RAISE EXCEPTION 'Neither builds nor ai_builds table found. Please apply base schema first (SELF_BUILD_MINIMAL.sql)';
  END IF;
END $$;

-- ============================================
-- STEP 2: Add columns to builds table (simplified schema)
-- ============================================

-- Add heartbeat columns if builds table exists
DO $$
BEGIN
  -- last_heartbeat column
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'builds') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'last_heartbeat') THEN
      ALTER TABLE builds ADD COLUMN last_heartbeat TIMESTAMPTZ DEFAULT NOW();
      RAISE NOTICE 'Added last_heartbeat to builds';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'stalled_at') THEN
      ALTER TABLE builds ADD COLUMN stalled_at TIMESTAMPTZ;
      RAISE NOTICE 'Added stalled_at to builds';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'total_agents') THEN
      ALTER TABLE builds ADD COLUMN total_agents INTEGER DEFAULT 0;
      RAISE NOTICE 'Added total_agents to builds';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'builds' AND column_name = 'metadata') THEN
      ALTER TABLE builds ADD COLUMN metadata JSONB DEFAULT '{}';
      RAISE NOTICE 'Added metadata to builds';
    END IF;
  END IF;
END $$;

-- Add columns to ai_builds table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_builds') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_builds' AND column_name = 'last_heartbeat') THEN
      ALTER TABLE ai_builds ADD COLUMN last_heartbeat TIMESTAMPTZ DEFAULT NOW();
      RAISE NOTICE 'Added last_heartbeat to ai_builds';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_builds' AND column_name = 'stalled_at') THEN
      ALTER TABLE ai_builds ADD COLUMN stalled_at TIMESTAMPTZ;
      RAISE NOTICE 'Added stalled_at to ai_builds';
    END IF;
  END IF;
END $$;

-- ============================================
-- STEP 3: Create build_agent_outputs table if not exists
-- ============================================

CREATE TABLE IF NOT EXISTS public.build_agent_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration INTEGER,
  artifacts JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  tokens_used INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  retries INTEGER DEFAULT 0,
  errors JSONB,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(build_id, agent_id)
);

-- Add foreign key if builds table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'builds') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'build_agent_outputs_build_id_fkey'
    ) THEN
      BEGIN
        ALTER TABLE build_agent_outputs
        ADD CONSTRAINT build_agent_outputs_build_id_fkey
        FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add FK constraint (may already exist or table structure differs)';
      END;
    END IF;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_build_agent_outputs_build ON build_agent_outputs(build_id);
CREATE INDEX IF NOT EXISTS idx_build_agent_outputs_agent ON build_agent_outputs(agent_id);
CREATE INDEX IF NOT EXISTS idx_build_agent_outputs_status ON build_agent_outputs(status);

-- ============================================
-- STEP 4: FIX #2 - Progress Calculation Fix
-- ============================================
-- Problem: Original trigger only counted 'completed' agents
-- Fix: Count ALL finished agents (completed + failed + skipped)

CREATE OR REPLACE FUNCTION update_build_progress()
RETURNS TRIGGER AS $$
DECLARE
  finished_count INTEGER;
  total_count INTEGER;
  completed_count INTEGER;
  failed_count INTEGER;
  skipped_count INTEGER;
  target_table TEXT;
BEGIN
  -- Count agents by status
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status = 'skipped'),
    COUNT(*)
  INTO completed_count, failed_count, skipped_count, finished_count
  FROM build_agent_outputs
  WHERE build_id = NEW.build_id;

  -- Get total expected agents from the build record
  -- Try builds table first, then ai_builds
  BEGIN
    SELECT total_agents INTO total_count
    FROM builds WHERE id = NEW.build_id;
  EXCEPTION WHEN undefined_table THEN
    SELECT total_agents INTO total_count
    FROM ai_builds WHERE id = NEW.build_id;
  END;

  -- Update progress based on FINISHED agents (not just completed)
  BEGIN
    UPDATE builds SET
      progress = COALESCE(
        ROUND((finished_count::NUMERIC / NULLIF(total_count, 0)) * 100),
        0
      ),
      status = CASE
        WHEN finished_count >= total_count AND failed_count > 0 THEN 'failed'
        WHEN finished_count >= total_count THEN 'completed'
        ELSE status
      END,
      updated_at = NOW(),
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{agent_status_summary}',
        jsonb_build_object(
          'completed', completed_count,
          'failed', failed_count,
          'skipped', skipped_count,
          'total', total_count,
          'updated_at', NOW()
        )
      )
    WHERE id = NEW.build_id;
  EXCEPTION WHEN undefined_table THEN
    -- Try ai_builds instead
    UPDATE ai_builds SET
      progress = COALESCE(
        ROUND((finished_count::NUMERIC / NULLIF(total_count, 0)) * 100),
        0
      ),
      status = CASE
        WHEN finished_count >= total_count AND failed_count > 0 THEN 'failed'::build_status
        WHEN finished_count >= total_count THEN 'completed'::build_status
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = NEW.build_id;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_build_progress() IS
'FIX #2: Progress now counts ALL finished agents (completed+failed+skipped), not just completed.';

-- Create trigger (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS trigger_update_build_progress ON build_agent_outputs;
CREATE TRIGGER trigger_update_build_progress
  AFTER INSERT OR UPDATE ON build_agent_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_build_progress();

-- ============================================
-- STEP 5: FIX #3 - Stalled Build Detection
-- ============================================

-- Update heartbeat when agent status changes
CREATE OR REPLACE FUNCTION update_build_heartbeat()
RETURNS TRIGGER AS $$
BEGIN
  -- Try updating builds table
  BEGIN
    UPDATE builds
    SET
      last_heartbeat = NOW(),
      stalled_at = CASE
        WHEN status IN ('running', 'queued', 'pending') THEN NULL
        ELSE stalled_at
      END
    WHERE id = NEW.build_id;
  EXCEPTION WHEN undefined_table THEN
    -- Try ai_builds instead
    UPDATE ai_builds
    SET
      last_heartbeat = NOW(),
      stalled_at = CASE
        WHEN status IN ('running', 'pending') THEN NULL
        ELSE stalled_at
      END
    WHERE id = NEW.build_id;
  END;

  NEW.last_heartbeat = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS trigger_update_heartbeat ON build_agent_outputs;
CREATE TRIGGER trigger_update_heartbeat
  BEFORE INSERT OR UPDATE ON build_agent_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_build_heartbeat();

-- Function to detect stalled builds
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
  -- Mark builds as stalled (try builds table)
  BEGIN
    UPDATE builds
    SET
      stalled_at = NOW(),
      status = 'failed',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{stall_info}',
        jsonb_build_object(
          'detected_at', NOW(),
          'last_heartbeat', builds.last_heartbeat,
          'threshold_minutes', stall_threshold_minutes,
          'reason', 'No heartbeat for ' || stall_threshold_minutes || ' minutes'
        )
      )
    WHERE
      status IN ('running', 'queued', 'pending')
      AND last_heartbeat < NOW() - (stall_threshold_minutes || ' minutes')::INTERVAL;
  EXCEPTION WHEN undefined_table THEN
    NULL; -- Table doesn't exist, skip
  END;

  -- Return stalled builds
  RETURN QUERY
  SELECT
    b.id AS build_id,
    b.last_heartbeat,
    EXTRACT(EPOCH FROM (NOW() - b.last_heartbeat)) / 60 AS minutes_stalled,
    b.current_phase,
    ARRAY_AGG(DISTINCT ao.agent_id) FILTER (WHERE ao.status = 'running') AS running_agents
  FROM builds b
  LEFT JOIN build_agent_outputs ao ON ao.build_id = b.id
  WHERE b.stalled_at IS NOT NULL
  GROUP BY b.id, b.last_heartbeat, b.current_phase;
END;
$$ LANGUAGE plpgsql;

-- Manual heartbeat function
CREATE OR REPLACE FUNCTION heartbeat_build(p_build_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  updated BOOLEAN := FALSE;
BEGIN
  -- Try builds table
  BEGIN
    UPDATE builds
    SET last_heartbeat = NOW()
    WHERE id = p_build_id AND status IN ('running', 'queued', 'pending');

    IF FOUND THEN
      updated := TRUE;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL; -- Table doesn't exist
  END;

  -- Try ai_builds table if builds didn't work
  IF NOT updated THEN
    BEGIN
      UPDATE ai_builds
      SET last_heartbeat = NOW()
      WHERE id = p_build_id AND status IN ('running', 'pending');

      IF FOUND THEN
        updated := TRUE;
      END IF;
    EXCEPTION WHEN undefined_table THEN
      NULL; -- Table doesn't exist
    END;
  END IF;

  RETURN updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_stalled_builds(INTEGER) IS 'FIX #3: Detects stalled builds and marks them as failed';
COMMENT ON FUNCTION heartbeat_build(UUID) IS 'FIX #3: Updates build heartbeat to prevent stall detection';

-- ============================================
-- STEP 6: Enable RLS on new table
-- ============================================

ALTER TABLE build_agent_outputs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "build_agent_outputs_service" ON build_agent_outputs;
DROP POLICY IF EXISTS "build_agent_outputs_select" ON build_agent_outputs;

-- Allow service role full access
CREATE POLICY "build_agent_outputs_service" ON build_agent_outputs
  FOR ALL USING (auth.role() = 'service_role');

-- Allow users to see their builds' agent outputs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    EXECUTE 'CREATE POLICY "build_agent_outputs_select" ON build_agent_outputs
      FOR SELECT USING (
        build_id IN (
          SELECT b.id FROM builds b
          WHERE b.tenant_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
          )
        )
      )';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create select policy (may already exist)';
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Migration complete! Summary:' as status;

SELECT 'Tables:' as category, table_name
FROM information_schema.tables
WHERE table_name IN ('builds', 'ai_builds', 'build_agent_outputs', 'ai_build_agent_outputs')
  AND table_schema = 'public';

SELECT 'Columns added:' as category, column_name, table_name
FROM information_schema.columns
WHERE table_name IN ('builds', 'ai_builds')
  AND column_name IN ('last_heartbeat', 'stalled_at', 'metadata')
  AND table_schema = 'public';

SELECT 'Functions created:' as category, proname as function_name
FROM pg_proc
WHERE proname IN ('update_build_progress', 'update_build_heartbeat', 'detect_stalled_builds', 'heartbeat_build');
