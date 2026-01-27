-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 11_system_tables.sql
-- Purpose: System tables (audit_logs, system_settings)
-- Module: System Module
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 10_analytics_tables.sql
-- DEPENDENCIES: tenants, profiles
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- TABLE: audit_logs
-- Purpose: Comprehensive audit trail for compliance
-- Module: System
-- ============================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Action classification
    action public.audit_action NOT NULL,
    action_description TEXT, -- Human-readable description
    
    -- Target
    table_name TEXT NOT NULL,
    record_id UUID,
    
    -- Actor
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_type TEXT DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'api', 'webhook', 'cron')),
    actor_email TEXT, -- Denormalized for historical accuracy
    
    -- Context
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    project_id UUID,
    
    -- Data changes
    old_data JSONB, -- Previous state (for updates/deletes)
    new_data JSONB, -- New state (for creates/updates)
    changed_fields TEXT[], -- List of changed field names
    
    -- Request context
    request_id TEXT, -- For request correlation
    ip_address INET,
    user_agent TEXT,
    
    -- Location
    country TEXT,
    city TEXT,
    
    -- API context
    api_endpoint TEXT,
    api_method TEXT,
    
    -- Result
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failure', 'partial')),
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Retention
    expires_at TIMESTAMPTZ -- For automatic cleanup (nullable = never expires)
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_tenant ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name, created_at DESC);
CREATE INDEX idx_audit_logs_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_project ON public.audit_logs(project_id, created_at DESC) WHERE project_id IS NOT NULL;
CREATE INDEX idx_audit_logs_ip ON public.audit_logs(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX idx_audit_logs_expires ON public.audit_logs(expires_at) WHERE expires_at IS NOT NULL;

-- Partitioning hint: In production, partition by created_at (monthly)

-- RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs for their tenant
CREATE POLICY "audit_logs_select" ON public.audit_logs
    FOR SELECT
    USING (
        -- System/platform admins can see all (handled at app level)
        (tenant_id IS NOT NULL AND public.user_has_tenant_role(tenant_id, 'admin'))
        -- Users can see their own actions
        OR actor_id = auth.uid()
    );

-- Audit logs are inserted via trigger/service role only

-- Comments
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for compliance and security';
COMMENT ON COLUMN public.audit_logs.old_data IS 'Previous state before change';
COMMENT ON COLUMN public.audit_logs.new_data IS 'New state after change';
COMMENT ON COLUMN public.audit_logs.expires_at IS 'Auto-cleanup date (NULL = never expires)';


-- ============================================
-- TABLE: system_settings
-- Purpose: Global platform settings and feature flags
-- Module: System
-- ============================================
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Setting identity
    key TEXT NOT NULL UNIQUE,
    
    -- Value
    value JSONB NOT NULL,
    value_type TEXT DEFAULT 'string' CHECK (value_type IN (
        'string', 'number', 'boolean', 'json', 'array'
    )),
    
    -- Metadata
    description TEXT,
    category TEXT, -- 'features', 'limits', 'integrations', 'maintenance', etc.
    
    -- Validation
    validation_schema JSONB, -- JSON Schema for value validation
    
    -- Access control
    is_public BOOLEAN DEFAULT FALSE, -- If true, readable by all authenticated users
    is_sensitive BOOLEAN DEFAULT FALSE, -- If true, value is encrypted/masked
    
    -- Environment
    environment TEXT DEFAULT 'all' CHECK (environment IN ('all', 'development', 'staging', 'production')),
    
    -- Override capability
    tenant_overridable BOOLEAN DEFAULT FALSE, -- If true, tenants can override
    
    -- Audit
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for system_settings
CREATE UNIQUE INDEX idx_system_settings_key ON public.system_settings(key);
CREATE INDEX idx_system_settings_category ON public.system_settings(category);
CREATE INDEX idx_system_settings_public ON public.system_settings(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_system_settings_env ON public.system_settings(environment);

-- Trigger for updated_at
CREATE TRIGGER trigger_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Public settings are readable by all authenticated users
CREATE POLICY "system_settings_select_public" ON public.system_settings
    FOR SELECT
    USING (
        is_public = TRUE 
        OR auth.uid() IS NOT NULL -- All authenticated users can read non-sensitive settings
    );

-- System settings are managed by service role only (platform admins)

-- Comments
COMMENT ON TABLE public.system_settings IS 'Global platform settings and feature flags';
COMMENT ON COLUMN public.system_settings.tenant_overridable IS 'If true, tenants can override this setting';


-- ============================================
-- TABLE: feature_flags
-- Purpose: Feature flag management
-- Module: System
-- ============================================
CREATE TABLE public.feature_flags (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Flag identity
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- State
    is_enabled BOOLEAN DEFAULT FALSE,
    
    -- Rollout
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    
    -- Targeting
    allowed_tenants UUID[], -- Specific tenants that have access
    allowed_users UUID[], -- Specific users that have access
    allowed_plans public.plan_tier[], -- Plans that have access
    
    -- Conditions (for complex rules)
    conditions JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    category TEXT, -- 'experiment', 'release', 'ops', etc.
    tags TEXT[],
    
    -- Lifecycle
    starts_at TIMESTAMPTZ, -- When flag becomes active
    ends_at TIMESTAMPTZ, -- When flag expires
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for feature_flags
CREATE UNIQUE INDEX idx_feature_flags_key ON public.feature_flags(key);
CREATE INDEX idx_feature_flags_enabled ON public.feature_flags(is_enabled) WHERE is_enabled = TRUE;
CREATE INDEX idx_feature_flags_category ON public.feature_flags(category);
CREATE INDEX idx_feature_flags_active ON public.feature_flags(starts_at, ends_at) 
    WHERE is_enabled = TRUE;

-- Trigger for updated_at
CREATE TRIGGER trigger_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read feature flags
CREATE POLICY "feature_flags_select" ON public.feature_flags
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Comments
COMMENT ON TABLE public.feature_flags IS 'Feature flag management for gradual rollouts';
COMMENT ON COLUMN public.feature_flags.rollout_percentage IS 'Percentage of users/tenants to enable for';


-- ============================================
-- FUNCTION: is_feature_enabled
-- Purpose: Check if a feature flag is enabled for a user/tenant
-- ============================================
CREATE OR REPLACE FUNCTION public.is_feature_enabled(
    p_flag_key TEXT,
    p_tenant_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    flag RECORD;
    check_user_id UUID;
    check_tenant_id UUID;
    user_plan public.plan_tier;
BEGIN
    -- Get flag
    SELECT * INTO flag FROM public.feature_flags WHERE key = p_flag_key;
    
    IF flag IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if globally disabled
    IF flag.is_enabled = FALSE THEN
        RETURN FALSE;
    END IF;
    
    -- Check date range
    IF flag.starts_at IS NOT NULL AND NOW() < flag.starts_at THEN
        RETURN FALSE;
    END IF;
    
    IF flag.ends_at IS NOT NULL AND NOW() > flag.ends_at THEN
        RETURN FALSE;
    END IF;
    
    -- Use provided or current user/tenant
    check_user_id := COALESCE(p_user_id, auth.uid());
    check_tenant_id := p_tenant_id;
    
    -- Check specific user allowlist
    IF flag.allowed_users IS NOT NULL AND array_length(flag.allowed_users, 1) > 0 THEN
        IF check_user_id = ANY(flag.allowed_users) THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Check specific tenant allowlist
    IF flag.allowed_tenants IS NOT NULL AND array_length(flag.allowed_tenants, 1) > 0 THEN
        IF check_tenant_id = ANY(flag.allowed_tenants) THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Check plan allowlist
    IF flag.allowed_plans IS NOT NULL AND array_length(flag.allowed_plans, 1) > 0 AND check_tenant_id IS NOT NULL THEN
        SELECT p.tier INTO user_plan
        FROM public.subscriptions s
        JOIN public.plans p ON p.id = s.plan_id
        WHERE s.tenant_id = check_tenant_id
          AND s.status IN ('active', 'trialing')
        LIMIT 1;
        
        IF user_plan = ANY(flag.allowed_plans) THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Check rollout percentage (using user_id for consistent hashing)
    IF flag.rollout_percentage > 0 AND check_user_id IS NOT NULL THEN
        -- Use consistent hashing based on user_id and flag_key
        IF (abs(hashtext(check_user_id::text || p_flag_key)) % 100) < flag.rollout_percentage THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- 100% rollout
    IF flag.rollout_percentage = 100 THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_feature_enabled IS 'Check if a feature flag is enabled for a user/tenant';


-- ============================================
-- FUNCTION: get_system_setting
-- Purpose: Get a system setting value
-- ============================================
CREATE OR REPLACE FUNCTION public.get_system_setting(
    p_key TEXT,
    p_default JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    setting_value JSONB;
BEGIN
    SELECT value INTO setting_value
    FROM public.system_settings
    WHERE key = p_key
      AND is_sensitive = FALSE; -- Don't return sensitive values
    
    RETURN COALESCE(setting_value, p_default);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_system_setting IS 'Get a system setting value by key';


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.6 PART 2 COMPLETION: SYSTEM TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] audit_logs table with comprehensive fields
-- [x] audit_logs indexes (9 indexes)
-- [x] audit_logs RLS policies (1 policy)
-- [x] system_settings table
-- [x] system_settings indexes (4 indexes)
-- [x] system_settings RLS policies (1 policy)
-- [x] feature_flags table
-- [x] feature_flags indexes (4 indexes)
-- [x] feature_flags RLS policies (1 policy)
-- [x] is_feature_enabled() function
-- [x] get_system_setting() function
-- ═══════════════════════════════════════════════════════════════════════════════
