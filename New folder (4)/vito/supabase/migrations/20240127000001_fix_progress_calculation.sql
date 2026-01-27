-- ============================================
-- FIX #2: Progress Calculation Fix
-- ============================================
-- Problem: Original trigger only counted 'completed' agents, showing 0%
--          progress even when 90% of agents had run (but failed).
-- Fix: Count ALL finished agents (completed + failed + skipped) for progress.
--      Also add status_summary for better debugging.
-- ============================================

-- Replace the progress calculation function with correct logic
CREATE OR REPLACE FUNCTION update_build_progress()
RETURNS TRIGGER AS $$
DECLARE
  finished_count INTEGER;
  total_count INTEGER;
  completed_count INTEGER;
  failed_count INTEGER;
  skipped_count INTEGER;
BEGIN
  -- Count agents by status
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status = 'skipped'),
    COUNT(*)
  INTO completed_count, failed_count, skipped_count, finished_count
  FROM ai_build_agent_outputs
  WHERE build_id = NEW.build_id;

  -- Get total expected agents from the build record
  SELECT total_agents INTO total_count
  FROM ai_builds WHERE id = NEW.build_id;

  -- Update progress based on FINISHED agents (not just completed)
  -- Progress = (finished / total) * 100
  -- Also update status if all agents are done
  UPDATE ai_builds SET
    progress = COALESCE(
      ROUND((finished_count::NUMERIC / NULLIF(total_count, 0)) * 100),
      0
    ),
    -- Update status to 'failed' if any critical agents failed
    status = CASE
      WHEN finished_count >= total_count AND failed_count > 0 THEN 'failed'
      WHEN finished_count >= total_count THEN 'completed'
      ELSE status  -- Keep current status if not finished
    END,
    updated_at = NOW(),
    -- Store status breakdown in metadata for debugging
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION update_build_progress() IS
'FIX #2 (Jan 2024): Progress now counts ALL finished agents (completed+failed+skipped), not just completed. Also auto-updates build status based on agent results.';
