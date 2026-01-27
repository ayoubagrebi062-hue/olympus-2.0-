-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - Performance Optimization Functions
-- File: supabase/migrations/20240108000001_performance_functions.sql
--
-- Database functions for efficient aggregate queries
-- ═══════════════════════════════════════════════════════════════════════════════

-- Get total storage bytes for a tenant (using SUM aggregate)
CREATE OR REPLACE FUNCTION public.get_tenant_storage_bytes(p_tenant_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(size), 0)::BIGINT
    FROM public.files
    WHERE tenant_id = p_tenant_id;
$$;

-- Get build statistics for a tenant
CREATE OR REPLACE FUNCTION public.get_tenant_build_stats(p_tenant_id UUID)
RETURNS TABLE(
    total_builds BIGINT,
    successful_builds BIGINT,
    failed_builds BIGINT,
    pending_builds BIGINT,
    success_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COUNT(*)::BIGINT AS total_builds,
        COUNT(*) FILTER (WHERE status = 'success')::BIGINT AS successful_builds,
        COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_builds,
        COUNT(*) FILTER (WHERE status IN ('pending', 'running'))::BIGINT AS pending_builds,
        CASE
            WHEN COUNT(*) FILTER (WHERE status IN ('success', 'failed')) > 0 THEN
                ROUND(
                    COUNT(*) FILTER (WHERE status = 'success')::NUMERIC /
                    COUNT(*) FILTER (WHERE status IN ('success', 'failed'))::NUMERIC * 100,
                    1
                )
            ELSE 0
        END AS success_rate
    FROM public.builds
    WHERE tenant_id = p_tenant_id;
$$;

-- Get dashboard stats in one query (most efficient)
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_tenant_id UUID)
RETURNS TABLE(
    total_projects BIGINT,
    total_builds BIGINT,
    successful_builds BIGINT,
    failed_builds BIGINT,
    active_deployments BIGINT,
    storage_bytes BIGINT,
    success_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        (SELECT COUNT(*) FROM public.projects WHERE tenant_id = p_tenant_id)::BIGINT AS total_projects,
        (SELECT COUNT(*) FROM public.builds WHERE tenant_id = p_tenant_id)::BIGINT AS total_builds,
        (SELECT COUNT(*) FROM public.builds WHERE tenant_id = p_tenant_id AND status = 'success')::BIGINT AS successful_builds,
        (SELECT COUNT(*) FROM public.builds WHERE tenant_id = p_tenant_id AND status = 'failed')::BIGINT AS failed_builds,
        (SELECT COUNT(*) FROM public.deployments WHERE tenant_id = p_tenant_id AND status = 'active')::BIGINT AS active_deployments,
        (SELECT COALESCE(SUM(size), 0) FROM public.files WHERE tenant_id = p_tenant_id)::BIGINT AS storage_bytes,
        CASE
            WHEN (SELECT COUNT(*) FROM public.builds WHERE tenant_id = p_tenant_id AND status IN ('success', 'failed')) > 0 THEN
                ROUND(
                    (SELECT COUNT(*) FROM public.builds WHERE tenant_id = p_tenant_id AND status = 'success')::NUMERIC /
                    (SELECT COUNT(*) FROM public.builds WHERE tenant_id = p_tenant_id AND status IN ('success', 'failed'))::NUMERIC * 100,
                    1
                )
            ELSE 0
        END AS success_rate;
$$;

-- Batch feature check (avoid N+1)
CREATE OR REPLACE FUNCTION public.check_tenant_features(
    p_tenant_id UUID,
    p_features TEXT[]
)
RETURNS TABLE(feature TEXT, has_access BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_tier TEXT;
    v_plan_features TEXT[];
BEGIN
    -- Get tenant's plan tier
    SELECT COALESCE(plan_tier, 'free') INTO v_plan_tier
    FROM public.tenants
    WHERE id = p_tenant_id;

    -- Define features per plan (this should match your billing constants)
    v_plan_features := CASE v_plan_tier
        WHEN 'enterprise' THEN ARRAY['ai_builder', 'custom_domains', 'team_collaboration', 'api_access', 'priority_support', 'sso', 'audit_logs', 'custom_branding']
        WHEN 'professional' THEN ARRAY['ai_builder', 'custom_domains', 'team_collaboration', 'api_access', 'priority_support']
        WHEN 'starter' THEN ARRAY['ai_builder', 'custom_domains', 'team_collaboration']
        ELSE ARRAY['ai_builder']
    END;

    RETURN QUERY
    SELECT
        f AS feature,
        f = ANY(v_plan_features) AS has_access
    FROM unnest(p_features) AS f;
END;
$$;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_builds_tenant_status ON public.builds(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_deployments_tenant_status ON public.deployments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_files_tenant_id ON public.files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON public.projects(tenant_id);

-- Comments
COMMENT ON FUNCTION public.get_tenant_storage_bytes IS 'Get total storage bytes for tenant (efficient aggregate)';
COMMENT ON FUNCTION public.get_tenant_build_stats IS 'Get build statistics for tenant in one query';
COMMENT ON FUNCTION public.get_dashboard_stats IS 'Get all dashboard stats in single query';
COMMENT ON FUNCTION public.check_tenant_features IS 'Batch feature check to avoid N+1 queries';
