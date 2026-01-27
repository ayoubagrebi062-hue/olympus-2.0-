-- ============================================================================
-- CHECKPOINT SYSTEM MIGRATION
-- Creates tables for build state checkpointing and resume
-- ============================================================================

-- ============================================================================
-- BUILD CHECKPOINTS TABLE
-- Stores checkpoint state snapshots for build resume
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.build_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Position in build
    sequence INTEGER NOT NULL,
    agent_id TEXT NOT NULL,
    phase TEXT NOT NULL,

    -- State (JSON, possibly compressed)
    state TEXT NOT NULL,
    compressed BOOLEAN DEFAULT false,
    size_bytes INTEGER DEFAULT 0,

    -- Lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    -- Ensure unique sequence per build
    CONSTRAINT unique_build_sequence UNIQUE(build_id, sequence)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_checkpoints_build_id ON public.build_checkpoints(build_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_tenant_id ON public.build_checkpoints(tenant_id);

-- For loading latest checkpoint
CREATE INDEX IF NOT EXISTS idx_checkpoints_build_sequence ON public.build_checkpoints(build_id, sequence DESC);

-- For cleanup of expired checkpoints
CREATE INDEX IF NOT EXISTS idx_checkpoints_expires_at ON public.build_checkpoints(expires_at);

-- For filtering by phase or agent
CREATE INDEX IF NOT EXISTS idx_checkpoints_phase ON public.build_checkpoints(phase);
CREATE INDEX IF NOT EXISTS idx_checkpoints_agent_id ON public.build_checkpoints(agent_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_checkpoints_tenant_build ON public.build_checkpoints(tenant_id, build_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.build_checkpoints ENABLE ROW LEVEL SECURITY;

-- Tenants can only see their own checkpoints
CREATE POLICY "Users can view own checkpoints" ON public.build_checkpoints
    FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert own checkpoints" ON public.build_checkpoints
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update own checkpoints" ON public.build_checkpoints
    FOR UPDATE USING (auth.uid() = tenant_id);

CREATE POLICY "Users can delete own checkpoints" ON public.build_checkpoints
    FOR DELETE USING (auth.uid() = tenant_id);

-- Service role can manage all checkpoints (for cleanup jobs)
CREATE POLICY "Service role can manage all checkpoints" ON public.build_checkpoints
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- BUILD RESUME TRACKING TABLE
-- Tracks resume attempts and outcomes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.build_resume_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Resume details
    resumed_from_checkpoint UUID REFERENCES public.build_checkpoints(id) ON DELETE SET NULL,
    resume_sequence INTEGER NOT NULL DEFAULT 1,

    -- What was resumed
    skipped_agents TEXT[] DEFAULT '{}',
    retried_agents TEXT[] DEFAULT '{}',
    remaining_agents TEXT[] DEFAULT '{}',

    -- Outcome
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'paused')),
    error_message TEXT,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms BIGINT DEFAULT 0,

    -- Checkpoints created during this resume
    new_checkpoints UUID[] DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for resume history
CREATE INDEX IF NOT EXISTS idx_resume_history_build_id ON public.build_resume_history(build_id);
CREATE INDEX IF NOT EXISTS idx_resume_history_tenant_id ON public.build_resume_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resume_history_status ON public.build_resume_history(status);

-- RLS for resume history
ALTER TABLE public.build_resume_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resume history" ON public.build_resume_history
    FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert own resume history" ON public.build_resume_history
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update own resume history" ON public.build_resume_history
    FOR UPDATE USING (auth.uid() = tenant_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to cleanup expired checkpoints (run via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_checkpoints()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.build_checkpoints
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest checkpoint for a build
CREATE OR REPLACE FUNCTION public.get_latest_checkpoint(p_build_id TEXT)
RETURNS public.build_checkpoints AS $$
BEGIN
    RETURN (
        SELECT *
        FROM public.build_checkpoints
        WHERE build_id = p_build_id
        AND expires_at > NOW()
        ORDER BY sequence DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get checkpoint stats for a tenant
CREATE OR REPLACE FUNCTION public.get_checkpoint_stats(p_tenant_id UUID)
RETURNS TABLE (
    total_checkpoints BIGINT,
    total_size_bytes BIGINT,
    builds_with_checkpoints BIGINT,
    avg_checkpoint_size DECIMAL,
    latest_checkpoint TIMESTAMPTZ,
    compressed_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_checkpoints,
        COALESCE(SUM(size_bytes), 0)::BIGINT AS total_size_bytes,
        COUNT(DISTINCT build_id)::BIGINT AS builds_with_checkpoints,
        COALESCE(AVG(size_bytes), 0)::DECIMAL AS avg_checkpoint_size,
        MAX(created_at) AS latest_checkpoint,
        COUNT(*) FILTER (WHERE compressed)::BIGINT AS compressed_count
    FROM public.build_checkpoints
    WHERE tenant_id = p_tenant_id
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get resume statistics for a build
CREATE OR REPLACE FUNCTION public.get_build_resume_stats(p_build_id TEXT)
RETURNS TABLE (
    total_resumes BIGINT,
    successful_resumes BIGINT,
    failed_resumes BIGINT,
    total_resume_time_ms BIGINT,
    checkpoints_available BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.build_resume_history WHERE build_id = p_build_id)::BIGINT,
        (SELECT COUNT(*) FROM public.build_resume_history WHERE build_id = p_build_id AND status = 'completed')::BIGINT,
        (SELECT COUNT(*) FROM public.build_resume_history WHERE build_id = p_build_id AND status = 'failed')::BIGINT,
        (SELECT COALESCE(SUM(duration_ms), 0) FROM public.build_resume_history WHERE build_id = p_build_id)::BIGINT,
        (SELECT COUNT(*) FROM public.build_checkpoints WHERE build_id = p_build_id AND expires_at > NOW())::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to prune old checkpoints for a build (keep N most recent)
CREATE OR REPLACE FUNCTION public.prune_build_checkpoints(p_build_id TEXT, p_keep_count INTEGER DEFAULT 5)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH to_delete AS (
        SELECT id
        FROM public.build_checkpoints
        WHERE build_id = p_build_id
        ORDER BY sequence DESC
        OFFSET p_keep_count
    )
    DELETE FROM public.build_checkpoints
    WHERE id IN (SELECT id FROM to_delete);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for checkpoint overview per tenant
CREATE OR REPLACE VIEW public.checkpoint_overview AS
SELECT
    tenant_id,
    COUNT(*) AS total_checkpoints,
    COUNT(DISTINCT build_id) AS builds_with_checkpoints,
    SUM(size_bytes) AS total_size_bytes,
    AVG(size_bytes) AS avg_checkpoint_size,
    COUNT(*) FILTER (WHERE compressed) AS compressed_count,
    MIN(created_at) AS oldest_checkpoint,
    MAX(created_at) AS newest_checkpoint,
    COUNT(*) FILTER (WHERE expires_at < NOW() + INTERVAL '1 day') AS expiring_soon
FROM public.build_checkpoints
WHERE expires_at > NOW()
GROUP BY tenant_id;

-- View for build checkpoint summary
CREATE OR REPLACE VIEW public.build_checkpoint_summary AS
SELECT
    build_id,
    tenant_id,
    COUNT(*) AS checkpoint_count,
    MIN(sequence) AS first_sequence,
    MAX(sequence) AS last_sequence,
    SUM(size_bytes) AS total_size_bytes,
    MIN(created_at) AS first_checkpoint_at,
    MAX(created_at) AS last_checkpoint_at,
    ARRAY_AGG(DISTINCT phase ORDER BY phase) AS phases_checkpointed
FROM public.build_checkpoints
WHERE expires_at > NOW()
GROUP BY build_id, tenant_id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.build_checkpoints IS 'Stores checkpoint state snapshots for build resume capability';
COMMENT ON TABLE public.build_resume_history IS 'Tracks build resume attempts and outcomes';
COMMENT ON FUNCTION public.cleanup_expired_checkpoints IS 'Removes expired checkpoints, returns count deleted';
COMMENT ON FUNCTION public.get_latest_checkpoint IS 'Returns the most recent valid checkpoint for a build';
COMMENT ON FUNCTION public.get_checkpoint_stats IS 'Returns checkpoint statistics for a tenant';
COMMENT ON FUNCTION public.prune_build_checkpoints IS 'Keeps only N most recent checkpoints for a build';
