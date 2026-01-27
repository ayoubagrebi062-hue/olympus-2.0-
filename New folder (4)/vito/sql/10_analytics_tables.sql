-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 10_analytics_tables.sql
-- Purpose: Analytics and metrics tables (events, metrics, reports)
-- Module: Analytics Module
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 09_storage_tables.sql
-- DEPENDENCIES: tenants, profiles, projects
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- TABLE: events
-- Purpose: Event log for analytics tracking
-- Module: Analytics
-- ============================================
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Context
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    
    -- Event identity
    event_name TEXT NOT NULL, -- e.g., 'build.started', 'project.created', 'user.login'
    event_category TEXT, -- 'build', 'deploy', 'user', 'billing', etc.
    
    -- Event data
    properties JSONB DEFAULT '{}'::jsonb, -- Event-specific data
    
    -- Session tracking
    session_id TEXT,
    
    -- Client info
    client_type TEXT, -- 'web', 'api', 'cli', 'mobile'
    client_version TEXT,
    
    -- User agent / device
    user_agent TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    browser TEXT,
    os TEXT,
    
    -- Location
    ip_address INET,
    country TEXT,
    city TEXT,
    
    -- Page/screen context
    page_url TEXT,
    page_title TEXT,
    referrer TEXT,
    
    -- UTM tracking
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    
    -- Timing
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ
);

-- Indexes for events
CREATE INDEX idx_events_tenant ON public.events(tenant_id, timestamp DESC);
CREATE INDEX idx_events_user ON public.events(user_id, timestamp DESC);
CREATE INDEX idx_events_project ON public.events(project_id, timestamp DESC);
CREATE INDEX idx_events_name ON public.events(event_name, timestamp DESC);
CREATE INDEX idx_events_category ON public.events(event_category, timestamp DESC);
CREATE INDEX idx_events_timestamp ON public.events(timestamp DESC);
CREATE INDEX idx_events_session ON public.events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_events_unprocessed ON public.events(processed, timestamp) WHERE processed = FALSE;

-- Partitioning hint: In production, partition by timestamp (monthly)
-- This table can grow very large

-- RLS for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Users can view events for their tenants
CREATE POLICY "events_select" ON public.events
    FOR SELECT
    USING (
        tenant_id IS NULL -- System events
        OR public.user_has_tenant_access(tenant_id)
    );

-- Events are inserted via service role or API
CREATE POLICY "events_insert" ON public.events
    FOR INSERT
    WITH CHECK (
        tenant_id IS NULL
        OR public.user_has_tenant_access(tenant_id)
    );

-- Comments
COMMENT ON TABLE public.events IS 'Event log for analytics and tracking';
COMMENT ON COLUMN public.events.event_name IS 'Event identifier (e.g., build.started, user.login)';
COMMENT ON COLUMN public.events.properties IS 'Event-specific data as JSONB';


-- ============================================
-- TABLE: metrics
-- Purpose: Aggregated metrics (daily rollups)
-- Module: Analytics
-- ============================================
CREATE TABLE public.metrics (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Scope
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Time period
    period_type TEXT NOT NULL CHECK (period_type IN ('hour', 'day', 'week', 'month')),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Metric identity
    metric_name TEXT NOT NULL, -- e.g., 'builds_completed', 'active_users', 'storage_used'
    metric_category TEXT, -- 'builds', 'deployments', 'usage', 'engagement'
    
    -- Values
    value_count BIGINT DEFAULT 0, -- Count of events
    value_sum NUMERIC, -- Sum (for numeric metrics)
    value_avg NUMERIC, -- Average
    value_min NUMERIC, -- Minimum
    value_max NUMERIC, -- Maximum
    value_p50 NUMERIC, -- 50th percentile (median)
    value_p95 NUMERIC, -- 95th percentile
    value_p99 NUMERIC, -- 99th percentile
    
    -- Dimensions (for drill-down)
    dimensions JSONB DEFAULT '{}'::jsonb, -- { "status": "completed", "tier": "pro" }
    
    -- Comparison
    previous_period_value NUMERIC, -- For trend calculation
    change_percent NUMERIC, -- Percentage change from previous period
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_metric UNIQUE (tenant_id, project_id, metric_name, period_type, period_start, dimensions)
);

-- Indexes for metrics
CREATE INDEX idx_metrics_tenant ON public.metrics(tenant_id, period_start DESC);
CREATE INDEX idx_metrics_project ON public.metrics(project_id, period_start DESC);
CREATE INDEX idx_metrics_name ON public.metrics(metric_name, period_start DESC);
CREATE INDEX idx_metrics_period ON public.metrics(period_type, period_start DESC);
CREATE INDEX idx_metrics_category ON public.metrics(metric_category, period_start DESC);
CREATE INDEX idx_metrics_tenant_metric ON public.metrics(tenant_id, metric_name, period_type, period_start DESC);

-- RLS for metrics
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metrics_select" ON public.metrics
    FOR SELECT
    USING (
        tenant_id IS NULL -- Platform-wide metrics
        OR public.user_has_tenant_access(tenant_id)
    );

-- Metrics are calculated by background jobs (service role)

-- Comments
COMMENT ON TABLE public.metrics IS 'Aggregated metrics with time series data';
COMMENT ON COLUMN public.metrics.dimensions IS 'Additional dimensions for drill-down analysis';


-- ============================================
-- TABLE: reports
-- Purpose: Scheduled report definitions and history
-- Module: Analytics
-- ============================================
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Report identity
    name TEXT NOT NULL,
    description TEXT,
    report_type TEXT NOT NULL, -- 'usage', 'builds', 'costs', 'team_activity', 'custom'
    
    -- Configuration
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Report-specific configuration
    
    -- Filters
    filters JSONB DEFAULT '{}'::jsonb, -- { "project_id": "xxx", "date_range": "last_30_days" }
    
    -- Schedule
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_cron TEXT, -- Cron expression: '0 9 * * 1' (Mondays 9am)
    schedule_timezone TEXT DEFAULT 'UTC',
    
    -- Delivery
    delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'webhook', 'slack')),
    delivery_config JSONB DEFAULT '{}'::jsonb, -- { "emails": ["..."], "webhook_url": "..." }
    
    -- Recipients (for email delivery)
    recipients TEXT[], -- Email addresses
    
    -- Last execution
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'partial')),
    last_run_error TEXT,
    last_run_duration_ms INTEGER,
    
    -- Next scheduled run
    next_run_at TIMESTAMPTZ,
    
    -- Output
    last_output_url TEXT, -- URL to download last report
    last_output_expires_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for reports
CREATE INDEX idx_reports_tenant ON public.reports(tenant_id);
CREATE INDEX idx_reports_type ON public.reports(tenant_id, report_type);
CREATE INDEX idx_reports_scheduled ON public.reports(next_run_at) 
    WHERE is_scheduled = TRUE AND is_active = TRUE;
CREATE INDEX idx_reports_active ON public.reports(tenant_id, is_active) WHERE is_active = TRUE;

-- Trigger for updated_at
CREATE TRIGGER trigger_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select" ON public.reports
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "reports_insert" ON public.reports
    FOR INSERT
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'admin'));

CREATE POLICY "reports_update" ON public.reports
    FOR UPDATE
    USING (public.user_has_tenant_role(tenant_id, 'admin'))
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'admin'));

CREATE POLICY "reports_delete" ON public.reports
    FOR DELETE
    USING (public.user_has_tenant_role(tenant_id, 'admin'));

-- Comments
COMMENT ON TABLE public.reports IS 'Scheduled report definitions and execution history';
COMMENT ON COLUMN public.reports.schedule_cron IS 'Cron expression for scheduled reports';


-- ============================================
-- FUNCTION: track_event
-- Purpose: Helper to insert analytics events
-- ============================================
CREATE OR REPLACE FUNCTION public.track_event(
    p_event_name TEXT,
    p_properties JSONB DEFAULT '{}'::jsonb,
    p_tenant_id UUID DEFAULT NULL,
    p_project_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO public.events (
        event_name,
        event_category,
        properties,
        tenant_id,
        project_id,
        user_id,
        timestamp
    ) VALUES (
        p_event_name,
        split_part(p_event_name, '.', 1), -- Extract category from event name
        p_properties,
        p_tenant_id,
        p_project_id,
        auth.uid(),
        NOW()
    )
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.track_event IS 'Helper function to track analytics events';


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.6 PART 1 COMPLETION: ANALYTICS TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] events table with all columns
-- [x] events indexes (8 indexes)
-- [x] events RLS policies (2 policies)
-- [x] metrics table (aggregated time series)
-- [x] metrics indexes (6 indexes)
-- [x] metrics RLS policies (1 policy)
-- [x] reports table (scheduled reports)
-- [x] reports indexes (4 indexes)
-- [x] reports RLS policies (4 policies)
-- [x] track_event() helper function
-- ═══════════════════════════════════════════════════════════════════════════════
