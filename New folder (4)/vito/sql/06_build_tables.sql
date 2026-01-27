-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 06_build_tables.sql
-- Purpose: Build execution tables (builds, logs, outputs, agents, costs)
-- Module: Build Module
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 05_project_tables.sql
-- DEPENDENCIES: tenants, profiles, projects, project_versions, ENUM types
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- TABLE: builds
-- Purpose: Build job records (AI code generation runs)
-- Module: Build
-- ============================================
CREATE TABLE public.builds (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Build identity
    build_number INTEGER NOT NULL,
    name TEXT, -- Optional friendly name
    
    -- Input
    prompt TEXT NOT NULL, -- User's build request
    prompt_tokens INTEGER, -- Token count of prompt
    context JSONB DEFAULT '{}'::jsonb, -- Additional context passed to agents
    
    -- Configuration
    tier TEXT DEFAULT 'standard' CHECK (tier IN (
        'quick',        -- Fast, fewer agents, lower quality
        'standard',     -- Balanced (default)
        'premium'       -- All agents, highest quality
    )),
    config JSONB DEFAULT '{}'::jsonb, -- Build configuration overrides
    
    -- Status
    status public.build_status NOT NULL DEFAULT 'pending',
    
    -- Progress tracking
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_phase TEXT,
    current_agent TEXT,
    
    -- Results
    output_version_id UUID, -- Created version (FK added after)
    
    -- Quality metrics
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    test_pass_rate REAL, -- 0.0 to 1.0
    lint_errors INTEGER DEFAULT 0,
    lint_warnings INTEGER DEFAULT 0,
    
    -- Performance metrics
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER, -- Total duration in milliseconds
    
    -- Agent metrics
    agents_total INTEGER DEFAULT 0,
    agents_completed INTEGER DEFAULT 0,
    agents_failed INTEGER DEFAULT 0,
    
    -- Cost tracking
    total_tokens_input BIGINT DEFAULT 0,
    total_tokens_output BIGINT DEFAULT 0,
    total_cost_cents INTEGER DEFAULT 0, -- Cost in cents
    
    -- Error handling
    error_message TEXT,
    error_code TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    canceled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    canceled_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_build_number UNIQUE (project_id, build_number)
);

-- Add FK from project_versions to builds
ALTER TABLE public.project_versions
    ADD CONSTRAINT fk_project_versions_source_build
    FOREIGN KEY (source_build_id)
    REFERENCES public.builds(id)
    ON DELETE SET NULL;

-- Indexes for builds
CREATE INDEX idx_builds_tenant ON public.builds(tenant_id);
CREATE INDEX idx_builds_project ON public.builds(project_id);
CREATE INDEX idx_builds_status ON public.builds(project_id, status);
CREATE INDEX idx_builds_number ON public.builds(project_id, build_number DESC);
CREATE INDEX idx_builds_created ON public.builds(tenant_id, created_at DESC);
CREATE INDEX idx_builds_active ON public.builds(status) WHERE status IN ('pending', 'initializing', 'running', 'validating');
CREATE INDEX idx_builds_quality ON public.builds(project_id, quality_score DESC) WHERE quality_score IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER trigger_builds_updated_at
    BEFORE UPDATE ON public.builds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-increment build number
CREATE OR REPLACE FUNCTION public.increment_build_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.build_number IS NULL THEN
        SELECT COALESCE(MAX(build_number), 0) + 1 INTO NEW.build_number
        FROM public.builds
        WHERE project_id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_builds_number
    BEFORE INSERT ON public.builds
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_build_number();

-- Trigger to update project stats
CREATE OR REPLACE FUNCTION public.update_project_build_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.projects
        SET build_count = build_count + 1
        WHERE id = NEW.project_id;
    END IF;
    
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        UPDATE public.projects
        SET 
            quality_score = NEW.quality_score,
            last_build_at = NEW.completed_at,
            total_tokens_used = total_tokens_used + COALESCE(NEW.total_tokens_input, 0) + COALESCE(NEW.total_tokens_output, 0),
            status = 'ready'
        WHERE id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_builds_project_stats
    AFTER INSERT OR UPDATE ON public.builds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_project_build_stats();

-- RLS for builds
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;

-- Members can view builds in their tenant
CREATE POLICY "builds_select" ON public.builds
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

-- Developers+ can create builds
CREATE POLICY "builds_insert" ON public.builds
    FOR INSERT
    WITH CHECK (
        public.user_has_tenant_role(tenant_id, 'developer')
        AND public.user_can_edit_project(project_id)
    );

-- System can update builds (status changes), users can cancel
CREATE POLICY "builds_update" ON public.builds
    FOR UPDATE
    USING (public.user_has_tenant_access(tenant_id))
    WITH CHECK (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.builds IS 'AI code generation build jobs';
COMMENT ON COLUMN public.builds.tier IS 'Build tier: quick (fast), standard (balanced), premium (best quality)';
COMMENT ON COLUMN public.builds.quality_score IS 'AI-assessed code quality 0-100';
COMMENT ON COLUMN public.builds.total_cost_cents IS 'Total LLM API cost in cents';


-- ============================================
-- TABLE: build_logs
-- Purpose: Detailed log entries for builds
-- Module: Build
-- ============================================
CREATE TABLE public.build_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
    
    -- Log entry
    level public.log_level NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    
    -- Context
    phase TEXT, -- 'planning', 'generation', 'validation', etc.
    agent TEXT, -- Agent that produced this log
    step INTEGER, -- Step number within phase
    
    -- Structured data
    data JSONB, -- Additional structured data
    
    -- Timing
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    duration_ms INTEGER, -- Duration of operation being logged
    
    -- Sequence for ordering
    sequence SERIAL
);

-- Indexes for build_logs
CREATE INDEX idx_build_logs_build ON public.build_logs(build_id);
CREATE INDEX idx_build_logs_tenant ON public.build_logs(tenant_id);
CREATE INDEX idx_build_logs_level ON public.build_logs(build_id, level);
CREATE INDEX idx_build_logs_phase ON public.build_logs(build_id, phase);
CREATE INDEX idx_build_logs_timestamp ON public.build_logs(build_id, timestamp);
CREATE INDEX idx_build_logs_sequence ON public.build_logs(build_id, sequence);

-- RLS for build_logs
ALTER TABLE public.build_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "build_logs_select" ON public.build_logs
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "build_logs_insert" ON public.build_logs
    FOR INSERT
    WITH CHECK (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.build_logs IS 'Detailed log entries for build execution';
COMMENT ON COLUMN public.build_logs.sequence IS 'Auto-incrementing sequence for log ordering';


-- ============================================
-- TABLE: build_outputs
-- Purpose: Generated files before packaging into version
-- Module: Build
-- ============================================
CREATE TABLE public.build_outputs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
    
    -- File info
    path TEXT NOT NULL,
    content TEXT,
    content_hash TEXT,
    
    -- Binary storage
    storage_path TEXT,
    storage_bucket TEXT DEFAULT 'build-outputs',
    
    -- Metadata
    size_bytes INTEGER DEFAULT 0,
    mime_type TEXT,
    language TEXT,
    
    -- AI metadata
    generated_by_agent TEXT,
    generation_prompt TEXT, -- Prompt used to generate this file
    confidence_score REAL, -- 0.0 to 1.0
    
    -- Validation
    is_valid BOOLEAN,
    validation_errors JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_build_output_path UNIQUE (build_id, path)
);

-- Indexes for build_outputs
CREATE INDEX idx_build_outputs_build ON public.build_outputs(build_id);
CREATE INDEX idx_build_outputs_tenant ON public.build_outputs(tenant_id);
CREATE INDEX idx_build_outputs_path ON public.build_outputs(build_id, path);
CREATE INDEX idx_build_outputs_agent ON public.build_outputs(build_id, generated_by_agent);

-- RLS for build_outputs
ALTER TABLE public.build_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "build_outputs_select" ON public.build_outputs
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "build_outputs_insert" ON public.build_outputs
    FOR INSERT
    WITH CHECK (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.build_outputs IS 'Generated files from build before packaging into version';
COMMENT ON COLUMN public.build_outputs.generated_by_agent IS 'Name of AI agent that generated this file';


-- ============================================
-- TABLE: agent_executions
-- Purpose: Individual AI agent execution records
-- Module: Build
-- ============================================
CREATE TABLE public.agent_executions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
    
    -- Agent info
    agent_name TEXT NOT NULL, -- e.g., 'ProjectPlanner', 'ReactEngineer'
    agent_version TEXT, -- Agent version
    phase TEXT NOT NULL, -- 'planning', 'generation', 'validation', etc.
    
    -- Execution order
    sequence_number INTEGER NOT NULL, -- Order within build
    
    -- Input
    input_prompt TEXT,
    input_context JSONB,
    input_tokens INTEGER,
    
    -- Output
    output_text TEXT,
    output_structured JSONB, -- Parsed structured output
    output_tokens INTEGER,
    output_files TEXT[], -- Files generated by this agent
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Waiting to execute
        'running',      -- Currently executing
        'completed',    -- Successfully finished
        'failed',       -- Execution failed
        'skipped',      -- Skipped (dependency failed)
        'timeout'       -- Exceeded time limit
    )),
    
    -- Error handling
    error_message TEXT,
    error_type TEXT, -- 'api_error', 'timeout', 'validation', etc.
    retry_count INTEGER DEFAULT 0,
    
    -- Performance
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- LLM details
    llm_provider TEXT, -- 'anthropic', 'openai', 'google', etc.
    llm_model TEXT, -- 'claude-3-opus', 'gpt-4', etc.
    temperature REAL,
    
    -- Cost
    cost_cents INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for agent_executions
CREATE INDEX idx_agent_executions_build ON public.agent_executions(build_id);
CREATE INDEX idx_agent_executions_tenant ON public.agent_executions(tenant_id);
CREATE INDEX idx_agent_executions_agent ON public.agent_executions(build_id, agent_name);
CREATE INDEX idx_agent_executions_phase ON public.agent_executions(build_id, phase);
CREATE INDEX idx_agent_executions_sequence ON public.agent_executions(build_id, sequence_number);
CREATE INDEX idx_agent_executions_status ON public.agent_executions(build_id, status);
CREATE INDEX idx_agent_executions_provider ON public.agent_executions(llm_provider, llm_model);

-- Trigger for updated_at
CREATE TRIGGER trigger_agent_executions_updated_at
    BEFORE UPDATE ON public.agent_executions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for agent_executions
ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_executions_select" ON public.agent_executions
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "agent_executions_insert" ON public.agent_executions
    FOR INSERT
    WITH CHECK (public.user_has_tenant_access(tenant_id));

CREATE POLICY "agent_executions_update" ON public.agent_executions
    FOR UPDATE
    USING (public.user_has_tenant_access(tenant_id))
    WITH CHECK (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.agent_executions IS 'Individual AI agent execution records within a build';
COMMENT ON COLUMN public.agent_executions.agent_name IS 'Name of the agent (e.g., ProjectPlanner, ReactEngineer)';
COMMENT ON COLUMN public.agent_executions.llm_provider IS 'LLM provider used (anthropic, openai, google, etc.)';


-- ============================================
-- TABLE: build_costs
-- Purpose: Detailed cost breakdown per build
-- Module: Build
-- ============================================
CREATE TABLE public.build_costs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
    
    -- Cost breakdown by provider
    provider TEXT NOT NULL, -- 'anthropic', 'openai', etc.
    model TEXT NOT NULL, -- 'claude-3-opus', 'gpt-4', etc.
    
    -- Token usage
    input_tokens BIGINT DEFAULT 0,
    output_tokens BIGINT DEFAULT 0,
    cached_tokens BIGINT DEFAULT 0, -- Prompt caching tokens
    
    -- Pricing
    input_cost_per_1k NUMERIC(10, 6), -- Cost per 1K input tokens
    output_cost_per_1k NUMERIC(10, 6), -- Cost per 1K output tokens
    
    -- Calculated cost
    total_cost_cents INTEGER DEFAULT 0,
    
    -- Request count
    request_count INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_build_cost_provider UNIQUE (build_id, provider, model)
);

-- Indexes for build_costs
CREATE INDEX idx_build_costs_build ON public.build_costs(build_id);
CREATE INDEX idx_build_costs_tenant ON public.build_costs(tenant_id);
CREATE INDEX idx_build_costs_provider ON public.build_costs(provider, model);

-- RLS for build_costs
ALTER TABLE public.build_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "build_costs_select" ON public.build_costs
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "build_costs_insert" ON public.build_costs
    FOR INSERT
    WITH CHECK (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.build_costs IS 'Detailed cost breakdown by LLM provider per build';
COMMENT ON COLUMN public.build_costs.cached_tokens IS 'Tokens served from prompt cache (reduced cost)';


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.4 PART 1 COMPLETION: BUILD TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] builds table with all columns
-- [x] builds indexes (7 indexes)
-- [x] builds RLS policies (3 policies)
-- [x] builds triggers (updated_at, build_number, project_stats)
-- [x] build_logs table
-- [x] build_logs indexes (6 indexes)
-- [x] build_logs RLS policies (2 policies)
-- [x] build_outputs table
-- [x] build_outputs indexes (4 indexes)
-- [x] build_outputs RLS policies (2 policies)
-- [x] agent_executions table
-- [x] agent_executions indexes (7 indexes)
-- [x] agent_executions RLS policies (3 policies)
-- [x] build_costs table
-- [x] build_costs indexes (3 indexes)
-- [x] build_costs RLS policies (2 policies)
-- ═══════════════════════════════════════════════════════════════════════════════
