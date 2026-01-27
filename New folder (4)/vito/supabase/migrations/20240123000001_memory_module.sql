-- ============================================================================
-- MEMORY MODULE MIGRATION
-- Creates tables for CONDUCTOR's learning brain
-- ============================================================================

-- ============================================================================
-- BUILD RECORDS TABLE
-- Stores complete build history for learning
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.build_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    project_type TEXT NOT NULL CHECK (project_type IN (
        'landing-page', 'marketing-site', 'saas-app', 'e-commerce',
        'portfolio', 'blog', 'dashboard', 'mobile-app', 'api-service',
        'full-stack', 'unknown'
    )),
    complexity TEXT NOT NULL CHECK (complexity IN ('simple', 'moderate', 'complex', 'enterprise')),
    tier TEXT NOT NULL CHECK (tier IN ('basic', 'standard', 'premium', 'enterprise')),

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms BIGINT DEFAULT 0,

    -- Results
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'cancelled', 'timeout')),
    outputs JSONB DEFAULT '{}'::jsonb,
    errors JSONB DEFAULT '[]'::jsonb,

    -- Quality
    quality_scores JSONB DEFAULT '{}'::jsonb,
    overall_quality DECIMAL(4, 2) DEFAULT 0,

    -- Resources
    tokens_used BIGINT DEFAULT 0,
    cost_usd DECIMAL(10, 4) DEFAULT 0,

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- USER FEEDBACK TABLE
-- Stores feedback on build quality
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.build_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id UUID NOT NULL REFERENCES public.build_records(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    used_output BOOLEAN DEFAULT false,
    modified_output BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LEARNED PATTERNS TABLE
-- Stores patterns extracted from build history
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.learned_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN (
        'agent_selection', 'quality_threshold', 'retry_strategy',
        'prompt_enhancement', 'phase_ordering', 'parallel_execution',
        'error_recovery', 'cost_optimization', 'user_preference'
    )),

    -- Pattern definition
    trigger JSONB NOT NULL,
    action JSONB NOT NULL,

    -- Effectiveness metrics
    success_rate DECIMAL(4, 3) DEFAULT 0.5,
    times_applied INTEGER DEFAULT 0,
    last_applied TIMESTAMPTZ,

    -- Confidence
    confidence DECIMAL(4, 3) DEFAULT 0.5,
    min_samples INTEGER DEFAULT 5,
    actual_samples INTEGER DEFAULT 0,

    -- Source
    source TEXT NOT NULL CHECK (source IN ('automatic', 'manual', 'feedback')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- USER PREFERENCES TABLE
-- Stores learned user preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Build preferences
    preferred_tier TEXT CHECK (preferred_tier IN ('basic', 'standard', 'premium', 'enterprise')),
    preferred_strategy TEXT CHECK (preferred_strategy IN ('sequential', 'parallel-phases', 'adaptive', 'fast-track')),
    quality_over_speed DECIMAL(4, 3) DEFAULT 0,

    -- Style preferences (JSONB for flexibility)
    code_style JSONB DEFAULT '{}'::jsonb,
    design_style JSONB DEFAULT '{}'::jsonb,
    communication_style JSONB DEFAULT '{}'::jsonb,

    -- Thresholds
    custom_thresholds JSONB DEFAULT '{}'::jsonb,
    tolerance_for_retries DECIMAL(4, 3) DEFAULT 0.5,
    budget_sensitivity DECIMAL(4, 3) DEFAULT 0.5,

    -- Feedback history
    average_rating DECIMAL(4, 2) DEFAULT 0,
    total_feedbacks INTEGER DEFAULT 0,
    feedback_trend TEXT DEFAULT 'stable' CHECK (feedback_trend IN ('improving', 'stable', 'declining')),

    -- Confidence
    confidence DECIMAL(4, 3) DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- BUILD EMBEDDINGS TABLE
-- Stores vector embeddings for similarity search
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.build_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id UUID NOT NULL UNIQUE REFERENCES public.build_records(id) ON DELETE CASCADE,

    -- Embedding data
    vector vector(768), -- nomic-embed-text dimension
    text_content TEXT NOT NULL,

    -- Metadata for filtering
    project_type TEXT NOT NULL,
    complexity TEXT NOT NULL,
    tier TEXT NOT NULL,
    tenant_id UUID NOT NULL,
    quality DECIMAL(4, 2) DEFAULT 0,
    success BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Build records indexes
CREATE INDEX IF NOT EXISTS idx_build_records_tenant_id ON public.build_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_build_records_project_type ON public.build_records(project_type);
CREATE INDEX IF NOT EXISTS idx_build_records_status ON public.build_records(status);
CREATE INDEX IF NOT EXISTS idx_build_records_started_at ON public.build_records(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_build_records_overall_quality ON public.build_records(overall_quality DESC);
CREATE INDEX IF NOT EXISTS idx_build_records_tenant_status ON public.build_records(tenant_id, status);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_build_feedback_build_id ON public.build_feedback(build_id);
CREATE INDEX IF NOT EXISTS idx_build_feedback_tenant_id ON public.build_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_build_feedback_rating ON public.build_feedback(rating);

-- Patterns indexes
CREATE INDEX IF NOT EXISTS idx_learned_patterns_type ON public.learned_patterns(type);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_confidence ON public.learned_patterns(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_success_rate ON public.learned_patterns(success_rate DESC);

-- Preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant_id ON public.user_preferences(tenant_id);

-- Embeddings indexes (using pgvector)
CREATE INDEX IF NOT EXISTS idx_build_embeddings_build_id ON public.build_embeddings(build_id);
CREATE INDEX IF NOT EXISTS idx_build_embeddings_tenant_id ON public.build_embeddings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_build_embeddings_project_type ON public.build_embeddings(project_type);
CREATE INDEX IF NOT EXISTS idx_build_embeddings_quality ON public.build_embeddings(quality DESC);

-- Vector similarity index (cosine distance) - only if pgvector extension is available
-- Note: Run this separately after enabling pgvector extension
-- CREATE INDEX IF NOT EXISTS idx_build_embeddings_vector ON public.build_embeddings
--     USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.build_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_embeddings ENABLE ROW LEVEL SECURITY;

-- Build records: Users can only see their own builds
CREATE POLICY "Users can view own build records" ON public.build_records
    FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert own build records" ON public.build_records
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update own build records" ON public.build_records
    FOR UPDATE USING (auth.uid() = tenant_id);

CREATE POLICY "Users can delete own build records" ON public.build_records
    FOR DELETE USING (auth.uid() = tenant_id);

-- Build feedback: Users can only manage their own feedback
CREATE POLICY "Users can view own feedback" ON public.build_feedback
    FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert own feedback" ON public.build_feedback
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update own feedback" ON public.build_feedback
    FOR UPDATE USING (auth.uid() = tenant_id);

CREATE POLICY "Users can delete own feedback" ON public.build_feedback
    FOR DELETE USING (auth.uid() = tenant_id);

-- Learned patterns: Readable by all authenticated users (shared knowledge)
CREATE POLICY "Authenticated users can view patterns" ON public.learned_patterns
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only system can modify patterns (via service role)
CREATE POLICY "Service role can manage patterns" ON public.learned_patterns
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- User preferences: Users can only manage their own preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = tenant_id);

CREATE POLICY "Users can delete own preferences" ON public.user_preferences
    FOR DELETE USING (auth.uid() = tenant_id);

-- Build embeddings: Same as build records
CREATE POLICY "Users can view own embeddings" ON public.build_embeddings
    FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert own embeddings" ON public.build_embeddings
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can delete own embeddings" ON public.build_embeddings
    FOR DELETE USING (auth.uid() = tenant_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_build_records_updated_at ON public.build_records;
CREATE TRIGGER update_build_records_updated_at
    BEFORE UPDATE ON public.build_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_learned_patterns_updated_at ON public.learned_patterns;
CREATE TRIGGER update_learned_patterns_updated_at
    BEFORE UPDATE ON public.learned_patterns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get similar builds (requires pgvector)
-- CREATE OR REPLACE FUNCTION public.find_similar_builds(
--     query_vector vector(768),
--     match_threshold FLOAT DEFAULT 0.75,
--     match_count INT DEFAULT 10,
--     filter_project_type TEXT DEFAULT NULL,
--     filter_min_quality FLOAT DEFAULT 0
-- )
-- RETURNS TABLE (
--     build_id UUID,
--     similarity FLOAT,
--     project_type TEXT,
--     quality DECIMAL
-- )
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--     RETURN QUERY
--     SELECT
--         be.build_id,
--         1 - (be.vector <=> query_vector) AS similarity,
--         be.project_type,
--         be.quality
--     FROM public.build_embeddings be
--     WHERE
--         1 - (be.vector <=> query_vector) >= match_threshold
--         AND (filter_project_type IS NULL OR be.project_type = filter_project_type)
--         AND be.quality >= filter_min_quality
--     ORDER BY be.vector <=> query_vector
--     LIMIT match_count;
-- END;
-- $$;

-- Function to get build analytics for a tenant
CREATE OR REPLACE FUNCTION public.get_tenant_build_analytics(p_tenant_id UUID)
RETURNS TABLE (
    total_builds BIGINT,
    successful_builds BIGINT,
    failed_builds BIGINT,
    average_quality DECIMAL,
    average_duration DECIMAL,
    average_cost DECIMAL,
    success_rate DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_builds,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS successful_builds,
        COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_builds,
        COALESCE(AVG(overall_quality) FILTER (WHERE status = 'completed'), 0) AS average_quality,
        COALESCE(AVG(duration_ms) FILTER (WHERE status = 'completed'), 0) AS average_duration,
        COALESCE(AVG(cost_usd), 0) AS average_cost,
        COALESCE(
            COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0),
            0
        ) AS success_rate
    FROM public.build_records
    WHERE tenant_id = p_tenant_id;
END;
$$;

-- Function to get pattern effectiveness
CREATE OR REPLACE FUNCTION public.get_pattern_effectiveness(p_type TEXT DEFAULT NULL)
RETURNS TABLE (
    pattern_id UUID,
    pattern_type TEXT,
    success_rate DECIMAL,
    times_applied INTEGER,
    confidence DECIMAL,
    effectiveness_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        lp.id AS pattern_id,
        lp.type AS pattern_type,
        lp.success_rate,
        lp.times_applied,
        lp.confidence,
        (lp.success_rate * lp.confidence)::DECIMAL AS effectiveness_score
    FROM public.learned_patterns lp
    WHERE p_type IS NULL OR lp.type = p_type
    ORDER BY effectiveness_score DESC;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.build_records IS 'Stores complete build history for CONDUCTOR learning';
COMMENT ON TABLE public.build_feedback IS 'Stores user feedback on build quality';
COMMENT ON TABLE public.learned_patterns IS 'Stores patterns extracted from build history';
COMMENT ON TABLE public.user_preferences IS 'Stores learned user preferences';
COMMENT ON TABLE public.build_embeddings IS 'Stores vector embeddings for similarity search';

COMMENT ON FUNCTION public.get_tenant_build_analytics IS 'Returns analytics for a tenant build history';
COMMENT ON FUNCTION public.get_pattern_effectiveness IS 'Returns effectiveness metrics for learned patterns';
