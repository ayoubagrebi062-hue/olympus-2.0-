-- ============================================================================
-- 10X BUILD INTELLIGENCE - THE BRAIN
-- ============================================================================
-- "Intelligence is the ability to adapt to change." - Stephen Hawking
-- ============================================================================

-- Build Profiles (analyzed build data)
CREATE TABLE IF NOT EXISTS build_profiles (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    project_type TEXT NOT NULL,
    health TEXT NOT NULL CHECK (health IN ('excellent', 'good', 'fair', 'poor', 'critical')),
    metrics JSONB NOT NULL DEFAULT '{
        "totalDuration": 0,
        "totalTokens": 0,
        "totalApiCalls": 0,
        "totalRetries": 0,
        "overallSuccessRate": 0,
        "parallelizationEfficiency": 0,
        "resourceUtilization": 0,
        "costEstimate": 0
    }',
    quality_profile JSONB NOT NULL DEFAULT '{
        "overallScore": 0,
        "dimensions": {},
        "trends": [],
        "riskAreas": []
    }',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_build_profile UNIQUE(build_id)
);

CREATE INDEX IF NOT EXISTS idx_build_profiles_type ON build_profiles(project_type);
CREATE INDEX IF NOT EXISTS idx_build_profiles_health ON build_profiles(health);

-- Phase Profiles
CREATE TABLE IF NOT EXISTS phase_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_profile_id TEXT NOT NULL REFERENCES build_profiles(id) ON DELETE CASCADE,
    phase_name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    status TEXT NOT NULL,
    agents TEXT[] NOT NULL DEFAULT '{}',
    parallelization_score INTEGER NOT NULL DEFAULT 0,
    critical_path BOOLEAN NOT NULL DEFAULT FALSE,
    dependencies TEXT[] DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phase_profiles_build ON phase_profiles(build_profile_id);

-- Agent Profiles
CREATE TABLE IF NOT EXISTS agent_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_profile_id TEXT NOT NULL REFERENCES build_profiles(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    performance JSONB NOT NULL DEFAULT '{
        "avgDuration": 0,
        "successRate": 0,
        "tokenEfficiency": 0,
        "qualityScore": 0
    }',
    patterns JSONB DEFAULT '{
        "commonErrors": [],
        "strengths": [],
        "weaknesses": []
    }',
    recommendations TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_build ON agent_profiles(build_profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_type ON agent_profiles(agent_type);

-- Detected Patterns
CREATE TABLE IF NOT EXISTS detected_patterns (
    id TEXT PRIMARY KEY,
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('success', 'failure', 'performance', 'quality', 'resource')),
    name TEXT NOT NULL,
    description TEXT,
    frequency INTEGER NOT NULL DEFAULT 1,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high', 'critical')),
    related_builds TEXT[] DEFAULT '{}',
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patterns_type ON detected_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_impact ON detected_patterns(impact);

-- Build-Pattern associations
CREATE TABLE IF NOT EXISTS build_pattern_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_profile_id TEXT NOT NULL REFERENCES build_profiles(id) ON DELETE CASCADE,
    pattern_id TEXT NOT NULL REFERENCES detected_patterns(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_build_pattern UNIQUE(build_profile_id, pattern_id)
);

-- Bottlenecks
CREATE TABLE IF NOT EXISTS build_bottlenecks (
    id TEXT PRIMARY KEY,
    build_profile_id TEXT NOT NULL REFERENCES build_profiles(id) ON DELETE CASCADE,
    location TEXT NOT NULL,
    bottleneck_type TEXT NOT NULL CHECK (bottleneck_type IN (
        'sequential-dependency', 'resource-contention', 'api-limit', 'retry-loop', 'slow-agent'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')),
    impact JSONB NOT NULL DEFAULT '{
        "timeWasted": 0,
        "tokensWasted": 0,
        "blockingOthers": false
    }',
    root_cause TEXT,
    resolution TEXT,
    automatable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bottlenecks_build ON build_bottlenecks(build_profile_id);
CREATE INDEX IF NOT EXISTS idx_bottlenecks_severity ON build_bottlenecks(severity);

-- Optimization Opportunities
CREATE TABLE IF NOT EXISTS optimization_opportunities (
    id TEXT PRIMARY KEY,
    build_profile_id TEXT NOT NULL REFERENCES build_profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN (
        'parallelization', 'caching', 'agent-selection', 'prompt-optimization', 'resource-allocation'
    )),
    title TEXT NOT NULL,
    description TEXT,
    estimated_gain JSONB NOT NULL DEFAULT '{
        "timeReduction": 0,
        "tokenReduction": 0,
        "costReduction": 0
    }',
    implementation TEXT,
    effort TEXT NOT NULL CHECK (effort IN ('trivial', 'easy', 'moderate', 'hard')),
    priority INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimizations_build ON optimization_opportunities(build_profile_id);
CREATE INDEX IF NOT EXISTS idx_optimizations_category ON optimization_opportunities(category);

-- Intelligence Insights
CREATE TABLE IF NOT EXISTS intelligence_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_profile_id TEXT NOT NULL REFERENCES build_profiles(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('finding', 'prediction', 'recommendation', 'learning')),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    details JSONB DEFAULT '{}',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('immediate', 'high', 'medium', 'low')),
    actionable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_build ON intelligence_insights(build_profile_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON intelligence_insights(insight_type);

-- Learnings (persistent knowledge)
CREATE TABLE IF NOT EXISTS build_learnings (
    id TEXT PRIMARY KEY,
    learning_type TEXT NOT NULL CHECK (learning_type IN ('pattern', 'correlation', 'anomaly', 'optimization')),
    description TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    applicability TEXT[] DEFAULT '{}',
    source_builds TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learnings_type ON build_learnings(learning_type);
CREATE INDEX IF NOT EXISTS idx_learnings_confidence ON build_learnings(confidence DESC);

-- Historical Metrics (for predictions)
CREATE TABLE IF NOT EXISTS historical_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_type TEXT NOT NULL,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL,
    tokens INTEGER NOT NULL,
    success_rate DECIMAL(5,2) NOT NULL,
    quality_score DECIMAL(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historical_metrics_type ON historical_metrics(project_type);
CREATE INDEX IF NOT EXISTS idx_historical_metrics_time ON historical_metrics(created_at DESC);

-- ============================================================================
-- FUNCTIONS FOR BUILD INTELLIGENCE
-- ============================================================================

-- Record build profile
CREATE OR REPLACE FUNCTION record_build_profile(
    p_build_id TEXT,
    p_project_type TEXT,
    p_health TEXT,
    p_metrics JSONB,
    p_quality_profile JSONB
) RETURNS build_profiles AS $$
DECLARE
    v_profile build_profiles;
    v_profile_id TEXT;
BEGIN
    v_profile_id := 'profile-' || p_build_id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;

    INSERT INTO build_profiles (id, build_id, project_type, health, metrics, quality_profile)
    VALUES (v_profile_id, p_build_id, p_project_type, p_health, p_metrics, p_quality_profile)
    ON CONFLICT (build_id) DO UPDATE SET
        health = EXCLUDED.health,
        metrics = EXCLUDED.metrics,
        quality_profile = EXCLUDED.quality_profile
    RETURNING * INTO v_profile;

    -- Record historical metrics
    INSERT INTO historical_metrics (project_type, build_id, duration, tokens, success_rate, quality_score)
    VALUES (
        p_project_type,
        p_build_id,
        (p_metrics->>'totalDuration')::INTEGER,
        (p_metrics->>'totalTokens')::INTEGER,
        (p_metrics->>'overallSuccessRate')::DECIMAL,
        (p_quality_profile->>'overallScore')::DECIMAL
    );

    RETURN v_profile;
END;
$$ LANGUAGE plpgsql;

-- Record detected pattern
CREATE OR REPLACE FUNCTION record_detected_pattern(
    p_pattern_id TEXT,
    p_type TEXT,
    p_name TEXT,
    p_description TEXT,
    p_confidence DECIMAL,
    p_impact TEXT,
    p_build_id TEXT
) RETURNS detected_patterns AS $$
DECLARE
    v_pattern detected_patterns;
BEGIN
    INSERT INTO detected_patterns (id, pattern_type, name, description, confidence, impact, related_builds)
    VALUES (p_pattern_id, p_type, p_name, p_description, p_confidence, p_impact, ARRAY[p_build_id])
    ON CONFLICT (id) DO UPDATE SET
        frequency = detected_patterns.frequency + 1,
        confidence = (detected_patterns.confidence + EXCLUDED.confidence) / 2,
        related_builds = array_append(detected_patterns.related_builds, p_build_id),
        last_seen = NOW()
    RETURNING * INTO v_pattern;

    RETURN v_pattern;
END;
$$ LANGUAGE plpgsql;

-- Store learning
CREATE OR REPLACE FUNCTION store_learning(
    p_type TEXT,
    p_description TEXT,
    p_confidence DECIMAL,
    p_applicability TEXT[],
    p_source_build TEXT
) RETURNS build_learnings AS $$
DECLARE
    v_learning build_learnings;
    v_learning_id TEXT;
BEGIN
    v_learning_id := 'learning-' || md5(p_description) || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;

    INSERT INTO build_learnings (id, learning_type, description, confidence, applicability, source_builds)
    VALUES (v_learning_id, p_type, p_description, p_confidence, p_applicability, ARRAY[p_source_build])
    ON CONFLICT (id) DO UPDATE SET
        confidence = (build_learnings.confidence + EXCLUDED.confidence) / 2,
        source_builds = array_append(build_learnings.source_builds, p_source_build),
        updated_at = NOW()
    RETURNING * INTO v_learning;

    RETURN v_learning;
END;
$$ LANGUAGE plpgsql;

-- Get aggregated insights for project type
CREATE OR REPLACE FUNCTION get_aggregated_insights(
    p_project_type TEXT,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    insight_type TEXT,
    category TEXT,
    count BIGINT,
    avg_priority DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ii.insight_type,
        ii.category,
        COUNT(*)::BIGINT as count,
        AVG(CASE ii.priority
            WHEN 'immediate' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END)::DECIMAL as avg_priority
    FROM intelligence_insights ii
    JOIN build_profiles bp ON bp.id = ii.build_profile_id
    WHERE bp.project_type = p_project_type
      AND ii.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY ii.insight_type, ii.category
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Get historical performance stats
CREATE OR REPLACE FUNCTION get_historical_stats(
    p_project_type TEXT,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    avg_duration DECIMAL,
    avg_tokens DECIMAL,
    avg_success_rate DECIMAL,
    avg_quality DECIMAL,
    build_count BIGINT,
    duration_trend TEXT,
    quality_trend TEXT
) AS $$
DECLARE
    v_avg_duration DECIMAL;
    v_avg_tokens DECIMAL;
    v_avg_success DECIMAL;
    v_avg_quality DECIMAL;
    v_count BIGINT;
    v_duration_trend TEXT;
    v_quality_trend TEXT;
    v_recent_duration DECIMAL;
    v_older_duration DECIMAL;
    v_recent_quality DECIMAL;
    v_older_quality DECIMAL;
BEGIN
    -- Get overall stats
    SELECT
        AVG(duration)::DECIMAL,
        AVG(tokens)::DECIMAL,
        AVG(success_rate)::DECIMAL,
        AVG(quality_score)::DECIMAL,
        COUNT(*)::BIGINT
    INTO v_avg_duration, v_avg_tokens, v_avg_success, v_avg_quality, v_count
    FROM historical_metrics
    WHERE project_type = p_project_type
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

    -- Calculate trends (recent half vs older half)
    SELECT AVG(duration)::DECIMAL, AVG(quality_score)::DECIMAL
    INTO v_recent_duration, v_recent_quality
    FROM historical_metrics
    WHERE project_type = p_project_type
      AND created_at >= NOW() - ((p_days / 2) || ' days')::INTERVAL;

    SELECT AVG(duration)::DECIMAL, AVG(quality_score)::DECIMAL
    INTO v_older_duration, v_older_quality
    FROM historical_metrics
    WHERE project_type = p_project_type
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL
      AND created_at < NOW() - ((p_days / 2) || ' days')::INTERVAL;

    -- Determine trends
    IF v_recent_duration < v_older_duration * 0.9 THEN
        v_duration_trend := 'improving';
    ELSIF v_recent_duration > v_older_duration * 1.1 THEN
        v_duration_trend := 'degrading';
    ELSE
        v_duration_trend := 'stable';
    END IF;

    IF v_recent_quality > v_older_quality * 1.05 THEN
        v_quality_trend := 'improving';
    ELSIF v_recent_quality < v_older_quality * 0.95 THEN
        v_quality_trend := 'degrading';
    ELSE
        v_quality_trend := 'stable';
    END IF;

    RETURN QUERY SELECT
        v_avg_duration, v_avg_tokens, v_avg_success, v_avg_quality, v_count,
        v_duration_trend, v_quality_trend;
END;
$$ LANGUAGE plpgsql;

-- Find common bottlenecks across builds
CREATE OR REPLACE FUNCTION find_common_bottlenecks(
    p_project_type TEXT,
    p_min_occurrences INTEGER DEFAULT 2
) RETURNS TABLE (
    bottleneck_type TEXT,
    location TEXT,
    occurrence_count BIGINT,
    avg_time_wasted DECIMAL,
    common_resolutions TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bb.bottleneck_type,
        bb.location,
        COUNT(*)::BIGINT as occurrence_count,
        AVG((bb.impact->>'timeWasted')::DECIMAL)::DECIMAL as avg_time_wasted,
        ARRAY_AGG(DISTINCT bb.resolution) FILTER (WHERE bb.resolution IS NOT NULL) as common_resolutions
    FROM build_bottlenecks bb
    JOIN build_profiles bp ON bp.id = bb.build_profile_id
    WHERE bp.project_type = p_project_type
    GROUP BY bb.bottleneck_type, bb.location
    HAVING COUNT(*) >= p_min_occurrences
    ORDER BY occurrence_count DESC, avg_time_wasted DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE build_profiles IS '10X: Analyzed build profiles with health and metrics';
COMMENT ON TABLE detected_patterns IS '10X: Detected patterns across builds';
COMMENT ON TABLE build_bottlenecks IS '10X: Identified bottlenecks with resolutions';
COMMENT ON TABLE optimization_opportunities IS '10X: Optimization opportunities with estimated gains';
COMMENT ON TABLE intelligence_insights IS '10X: AI-generated insights and recommendations';
COMMENT ON TABLE build_learnings IS '10X: Persistent learnings for continuous improvement';
