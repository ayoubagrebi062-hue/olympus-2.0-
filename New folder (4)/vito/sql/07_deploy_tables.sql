-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 07_deploy_tables.sql
-- Purpose: Deployment tables (deployments, logs, domains, ssl)
-- Module: Deploy Module
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 06_build_tables.sql
-- DEPENDENCIES: tenants, profiles, projects, project_versions, builds, ENUM types
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- TABLE: deployments
-- Purpose: Deployment records to various targets
-- Module: Deploy
-- ============================================
CREATE TABLE public.deployments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.project_versions(id) ON DELETE CASCADE,
    build_id UUID REFERENCES public.builds(id) ON DELETE SET NULL,
    
    -- Deployment identity
    deployment_number INTEGER NOT NULL,
    name TEXT, -- Optional friendly name
    
    -- Target
    target public.deployment_target NOT NULL DEFAULT 'olympus',
    environment public.environment_type NOT NULL DEFAULT 'production',
    
    -- Target-specific config
    target_config JSONB DEFAULT '{}'::jsonb, -- Provider-specific settings
    
    -- Status
    status public.deployment_status NOT NULL DEFAULT 'pending',
    
    -- URLs
    url TEXT, -- Primary deployment URL
    preview_url TEXT, -- Preview/staging URL
    internal_url TEXT, -- Internal URL (e.g., Railway internal)
    
    -- Provider references
    provider_deployment_id TEXT, -- Vercel/Railway deployment ID
    provider_project_id TEXT, -- Vercel/Railway project ID
    
    -- Performance
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Health
    health_status TEXT DEFAULT 'unknown' CHECK (health_status IN (
        'unknown',      -- Not checked yet
        'healthy',      -- All checks passing
        'degraded',     -- Some checks failing
        'unhealthy',    -- Critical checks failing
        'unreachable'   -- Cannot reach deployment
    )),
    last_health_check_at TIMESTAMPTZ,
    health_check_details JSONB,
    
    -- Rollback info
    previous_deployment_id UUID REFERENCES public.deployments(id),
    is_rollback BOOLEAN DEFAULT FALSE,
    rolled_back_at TIMESTAMPTZ,
    rolled_back_by UUID REFERENCES public.profiles(id),
    rollback_reason TEXT,
    
    -- Error handling
    error_message TEXT,
    error_code TEXT,
    error_details JSONB,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_deployment_number UNIQUE (project_id, deployment_number)
);

-- Indexes for deployments
CREATE INDEX idx_deployments_tenant ON public.deployments(tenant_id);
CREATE INDEX idx_deployments_project ON public.deployments(project_id);
CREATE INDEX idx_deployments_version ON public.deployments(version_id);
CREATE INDEX idx_deployments_status ON public.deployments(project_id, status);
CREATE INDEX idx_deployments_target ON public.deployments(project_id, target);
CREATE INDEX idx_deployments_environment ON public.deployments(project_id, environment);
CREATE INDEX idx_deployments_number ON public.deployments(project_id, deployment_number DESC);
CREATE INDEX idx_deployments_live ON public.deployments(project_id, environment) 
    WHERE status = 'live';
CREATE INDEX idx_deployments_health ON public.deployments(health_status) 
    WHERE status = 'live' AND health_status != 'healthy';

-- Trigger for updated_at
CREATE TRIGGER trigger_deployments_updated_at
    BEFORE UPDATE ON public.deployments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-increment deployment number
CREATE OR REPLACE FUNCTION public.increment_deployment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deployment_number IS NULL THEN
        SELECT COALESCE(MAX(deployment_number), 0) + 1 INTO NEW.deployment_number
        FROM public.deployments
        WHERE project_id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deployments_number
    BEFORE INSERT ON public.deployments
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_deployment_number();

-- Trigger to update project stats
CREATE OR REPLACE FUNCTION public.update_project_deploy_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.projects
        SET deployment_count = deployment_count + 1
        WHERE id = NEW.project_id;
    END IF;
    
    IF NEW.status = 'live' AND (OLD IS NULL OR OLD.status != 'live') THEN
        UPDATE public.projects
        SET 
            last_deploy_at = NEW.completed_at,
            status = 'deployed'
        WHERE id = NEW.project_id;
        
        -- Mark version as deployed
        UPDATE public.project_versions
        SET 
            is_deployed = TRUE,
            deployed_at = NEW.completed_at,
            deployment_url = NEW.url
        WHERE id = NEW.version_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deployments_project_stats
    AFTER INSERT OR UPDATE ON public.deployments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_project_deploy_stats();

-- RLS for deployments
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

-- Members can view deployments
CREATE POLICY "deployments_select" ON public.deployments
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

-- Developers+ can create deployments
CREATE POLICY "deployments_insert" ON public.deployments
    FOR INSERT
    WITH CHECK (
        public.user_has_tenant_role(tenant_id, 'developer')
        AND public.user_can_edit_project(project_id)
    );

-- Developers+ can update deployments (for rollback, etc.)
CREATE POLICY "deployments_update" ON public.deployments
    FOR UPDATE
    USING (
        public.user_has_tenant_access(tenant_id)
        AND public.user_can_edit_project(project_id)
    )
    WITH CHECK (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.deployments IS 'Deployment records to various hosting targets';
COMMENT ON COLUMN public.deployments.target IS 'Deployment target: olympus, vercel, railway, netlify, export';
COMMENT ON COLUMN public.deployments.provider_deployment_id IS 'External provider deployment ID for API calls';


-- ============================================
-- TABLE: deployment_logs
-- Purpose: Detailed log entries for deployments
-- Module: Deploy
-- ============================================
CREATE TABLE public.deployment_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    deployment_id UUID NOT NULL REFERENCES public.deployments(id) ON DELETE CASCADE,
    
    -- Log entry
    level public.log_level NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    
    -- Context
    step TEXT, -- 'prepare', 'build', 'upload', 'verify', etc.
    
    -- Structured data
    data JSONB,
    
    -- Timing
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    duration_ms INTEGER,
    
    -- Sequence for ordering
    sequence SERIAL
);

-- Indexes for deployment_logs
CREATE INDEX idx_deployment_logs_deployment ON public.deployment_logs(deployment_id);
CREATE INDEX idx_deployment_logs_tenant ON public.deployment_logs(tenant_id);
CREATE INDEX idx_deployment_logs_level ON public.deployment_logs(deployment_id, level);
CREATE INDEX idx_deployment_logs_timestamp ON public.deployment_logs(deployment_id, timestamp);
CREATE INDEX idx_deployment_logs_sequence ON public.deployment_logs(deployment_id, sequence);

-- RLS for deployment_logs
ALTER TABLE public.deployment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deployment_logs_select" ON public.deployment_logs
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "deployment_logs_insert" ON public.deployment_logs
    FOR INSERT
    WITH CHECK (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.deployment_logs IS 'Detailed log entries for deployment execution';


-- ============================================
-- TABLE: domains
-- Purpose: Custom domains for project deployments
-- Module: Deploy
-- ============================================
CREATE TABLE public.domains (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    deployment_id UUID REFERENCES public.deployments(id) ON DELETE SET NULL,
    
    -- Domain info
    domain TEXT NOT NULL,
    subdomain TEXT, -- If using subdomain of tenant domain
    
    -- Environment
    environment public.environment_type DEFAULT 'production',
    
    -- Verification
    verification_type TEXT DEFAULT 'cname' CHECK (verification_type IN (
        'cname',        -- CNAME record
        'a_record',     -- A record
        'txt'           -- TXT record verification
    )),
    verification_token TEXT DEFAULT public.generate_invitation_token(),
    verification_target TEXT, -- Expected DNS target
    
    -- Status
    status public.domain_status NOT NULL DEFAULT 'pending',
    
    -- Verification tracking
    verified_at TIMESTAMPTZ,
    last_check_at TIMESTAMPTZ,
    check_count INTEGER DEFAULT 0,
    next_check_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- SSL
    ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN (
        'pending',          -- SSL not configured
        'provisioning',     -- SSL being provisioned
        'active',           -- SSL active
        'expired',          -- SSL expired
        'failed'            -- SSL provisioning failed
    )),
    ssl_certificate_id UUID, -- FK to ssl_certificates
    
    -- Flags
    is_primary BOOLEAN DEFAULT FALSE,
    is_apex BOOLEAN DEFAULT FALSE, -- Root domain (no subdomain)
    redirect_to_primary BOOLEAN DEFAULT FALSE,
    force_https BOOLEAN DEFAULT TRUE,
    
    -- Provider info
    provider_domain_id TEXT, -- External provider domain ID
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_domain UNIQUE (domain)
);

-- Indexes for domains
CREATE INDEX idx_domains_tenant ON public.domains(tenant_id);
CREATE INDEX idx_domains_project ON public.domains(project_id);
CREATE INDEX idx_domains_deployment ON public.domains(deployment_id);
CREATE INDEX idx_domains_domain ON public.domains(domain);
CREATE INDEX idx_domains_status ON public.domains(status);
CREATE INDEX idx_domains_primary ON public.domains(project_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_domains_pending_check ON public.domains(next_check_at) 
    WHERE status = 'pending' OR status = 'verifying';

-- Trigger for updated_at
CREATE TRIGGER trigger_domains_updated_at
    BEFORE UPDATE ON public.domains
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to ensure only one primary domain per project/environment
CREATE OR REPLACE FUNCTION public.ensure_single_primary_project_domain()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = TRUE THEN
        UPDATE public.domains 
        SET is_primary = FALSE 
        WHERE project_id = NEW.project_id 
          AND environment = NEW.environment
          AND id != NEW.id 
          AND is_primary = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_domains_primary
    BEFORE INSERT OR UPDATE ON public.domains
    FOR EACH ROW
    WHEN (NEW.is_primary = TRUE)
    EXECUTE FUNCTION public.ensure_single_primary_project_domain();

-- RLS for domains
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- Members can view domains
CREATE POLICY "domains_select" ON public.domains
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

-- Developers+ can manage domains
CREATE POLICY "domains_insert" ON public.domains
    FOR INSERT
    WITH CHECK (
        public.user_has_tenant_role(tenant_id, 'developer')
        AND public.user_can_edit_project(project_id)
    );

CREATE POLICY "domains_update" ON public.domains
    FOR UPDATE
    USING (
        public.user_has_tenant_access(tenant_id)
        AND public.user_can_edit_project(project_id)
    )
    WITH CHECK (public.user_has_tenant_access(tenant_id));

CREATE POLICY "domains_delete" ON public.domains
    FOR DELETE
    USING (
        public.user_has_tenant_role(tenant_id, 'admin')
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND p.created_by = auth.uid()
        )
    );

-- Comments
COMMENT ON TABLE public.domains IS 'Custom domains for project deployments';
COMMENT ON COLUMN public.domains.verification_token IS 'Token for DNS TXT record verification';
COMMENT ON COLUMN public.domains.is_apex IS 'True if this is a root domain (no subdomain)';


-- ============================================
-- TABLE: ssl_certificates
-- Purpose: SSL certificate tracking
-- Module: Deploy
-- ============================================
CREATE TABLE public.ssl_certificates (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
    
    -- Certificate info
    domain TEXT NOT NULL, -- Primary domain on cert
    alt_names TEXT[], -- Subject Alternative Names
    
    -- Provider
    provider TEXT DEFAULT 'letsencrypt' CHECK (provider IN (
        'letsencrypt',      -- Let's Encrypt (free)
        'cloudflare',       -- Cloudflare SSL
        'custom'            -- User-provided certificate
    )),
    provider_cert_id TEXT, -- Provider's certificate ID
    
    -- Certificate details
    issuer TEXT,
    serial_number TEXT,
    fingerprint TEXT, -- SHA-256 fingerprint
    
    -- Validity
    issued_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',          -- Not yet provisioned
        'provisioning',     -- Being provisioned
        'active',           -- Currently active
        'expiring_soon',    -- Expires within 30 days
        'expired',          -- Has expired
        'revoked',          -- Has been revoked
        'failed'            -- Provisioning failed
    )),
    
    -- Auto-renewal
    auto_renew BOOLEAN DEFAULT TRUE,
    last_renewal_at TIMESTAMPTZ,
    next_renewal_at TIMESTAMPTZ,
    renewal_attempts INTEGER DEFAULT 0,
    renewal_error TEXT,
    
    -- Custom certificate (if provider = 'custom')
    certificate_pem TEXT, -- Public certificate
    private_key_encrypted TEXT, -- Encrypted private key
    ca_bundle_pem TEXT, -- CA bundle
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add FK from domains to ssl_certificates
ALTER TABLE public.domains
    ADD CONSTRAINT fk_domains_ssl_certificate
    FOREIGN KEY (ssl_certificate_id)
    REFERENCES public.ssl_certificates(id)
    ON DELETE SET NULL;

-- Indexes for ssl_certificates
CREATE INDEX idx_ssl_certificates_tenant ON public.ssl_certificates(tenant_id);
CREATE INDEX idx_ssl_certificates_domain ON public.ssl_certificates(domain_id);
CREATE INDEX idx_ssl_certificates_expires ON public.ssl_certificates(expires_at);
CREATE INDEX idx_ssl_certificates_status ON public.ssl_certificates(status);
CREATE INDEX idx_ssl_certificates_renewal ON public.ssl_certificates(next_renewal_at) 
    WHERE auto_renew = TRUE AND status = 'active';
CREATE INDEX idx_ssl_certificates_expiring ON public.ssl_certificates(expires_at) 
    WHERE status = 'active' AND expires_at < NOW() + INTERVAL '30 days';

-- Trigger for updated_at
CREATE TRIGGER trigger_ssl_certificates_updated_at
    BEFORE UPDATE ON public.ssl_certificates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update certificate status based on expiry
CREATE OR REPLACE FUNCTION public.update_ssl_certificate_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at < NOW() THEN
        NEW.status := 'expired';
    ELSIF NEW.expires_at < NOW() + INTERVAL '30 days' THEN
        NEW.status := 'expiring_soon';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ssl_certificates_status
    BEFORE INSERT OR UPDATE ON public.ssl_certificates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ssl_certificate_status();

-- RLS for ssl_certificates
ALTER TABLE public.ssl_certificates ENABLE ROW LEVEL SECURITY;

-- Members can view SSL certificates
CREATE POLICY "ssl_certificates_select" ON public.ssl_certificates
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

-- Admins can manage SSL certificates
CREATE POLICY "ssl_certificates_insert" ON public.ssl_certificates
    FOR INSERT
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'admin'));

CREATE POLICY "ssl_certificates_update" ON public.ssl_certificates
    FOR UPDATE
    USING (public.user_has_tenant_role(tenant_id, 'admin'))
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'admin'));

CREATE POLICY "ssl_certificates_delete" ON public.ssl_certificates
    FOR DELETE
    USING (public.user_has_tenant_role(tenant_id, 'admin'));

-- Comments
COMMENT ON TABLE public.ssl_certificates IS 'SSL certificate tracking for custom domains';
COMMENT ON COLUMN public.ssl_certificates.alt_names IS 'Subject Alternative Names (SANs) on the certificate';
COMMENT ON COLUMN public.ssl_certificates.private_key_encrypted IS 'Encrypted private key for custom certificates';


-- ============================================
-- FUNCTION: get_live_deployment
-- Purpose: Get the current live deployment for a project/environment
-- ============================================
CREATE OR REPLACE FUNCTION public.get_live_deployment(
    p_project_id UUID,
    p_environment public.environment_type DEFAULT 'production'
)
RETURNS UUID AS $$
DECLARE
    deployment_id UUID;
BEGIN
    SELECT id INTO deployment_id
    FROM public.deployments
    WHERE project_id = p_project_id
      AND environment = p_environment
      AND status = 'live'
    ORDER BY completed_at DESC
    LIMIT 1;
    
    RETURN deployment_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_live_deployment(UUID, public.environment_type) IS 
'Returns the ID of the current live deployment for a project/environment';


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.4 PART 2 COMPLETION: DEPLOY TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] deployments table with all columns
-- [x] deployments indexes (9 indexes)
-- [x] deployments RLS policies (3 policies)
-- [x] deployments triggers (updated_at, deployment_number, project_stats)
-- [x] deployment_logs table
-- [x] deployment_logs indexes (5 indexes)
-- [x] deployment_logs RLS policies (2 policies)
-- [x] domains table
-- [x] domains indexes (7 indexes)
-- [x] domains RLS policies (4 policies)
-- [x] domains triggers (updated_at, primary_domain)
-- [x] ssl_certificates table
-- [x] ssl_certificates indexes (6 indexes)
-- [x] ssl_certificates RLS policies (4 policies)
-- [x] ssl_certificates triggers (updated_at, status)
-- [x] get_live_deployment() function
-- ═══════════════════════════════════════════════════════════════════════════════
