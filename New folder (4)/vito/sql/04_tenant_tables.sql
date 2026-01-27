-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 04_tenant_tables.sql
-- Purpose: Multi-tenancy tables (tenants, members, invitations, settings, domains)
-- Module: Tenant Module
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 03_auth_tables.sql
-- DEPENDENCIES: profiles table, ENUM types (tenant_role, invitation_status, domain_status)
-- 
-- CRITICAL: These tables are the ROOT of multi-tenancy. All other tables
--           reference tenant_id and use RLS policies based on tenant_members.
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- TABLE: tenants
-- Purpose: Organizations/workspaces (multi-tenancy root)
-- Module: Tenant
-- ============================================
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Tenant identity
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    
    -- Branding
    logo_url TEXT,
    favicon_url TEXT,
    brand_color TEXT DEFAULT '#8B5CF6', -- Primary purple
    
    -- Contact
    billing_email TEXT,
    support_email TEXT,
    website_url TEXT,
    
    -- Settings
    settings JSONB DEFAULT '{
        "allow_signups": false,
        "require_2fa": false,
        "allowed_email_domains": [],
        "default_project_visibility": "private",
        "max_project_size_mb": 100
    }'::jsonb,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Owner reference (first admin)
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Subscription reference (set after subscription created)
    -- Note: Circular reference resolved by adding this after subscriptions table
    -- current_subscription_id UUID REFERENCES public.subscriptions(id),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    
    -- Trial tracking
    trial_ends_at TIMESTAMPTZ,
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT tenants_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR slug ~ '^[a-z0-9]$'),
    CONSTRAINT tenants_slug_length CHECK (char_length(slug) >= 2 AND char_length(slug) <= 63)
);

-- Indexes for tenants
CREATE UNIQUE INDEX idx_tenants_slug ON public.tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_created_by ON public.tenants(created_by);
CREATE INDEX idx_tenants_active ON public.tenants(is_active) WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_tenants_trial ON public.tenants(trial_ends_at) WHERE trial_ends_at IS NOT NULL AND deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER trigger_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for soft delete (convert DELETE to UPDATE deleted_at)
CREATE OR REPLACE FUNCTION public.soft_delete_tenant()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.tenants SET deleted_at = NOW(), is_active = FALSE WHERE id = OLD.id;
    RETURN NULL; -- Prevent actual delete
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenants_soft_delete
    BEFORE DELETE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.soft_delete_tenant();

-- RLS for tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Users can view tenants they are members of
CREATE POLICY "tenants_select_member" ON public.tenants
    FOR SELECT
    USING (
        id IN (SELECT public.get_user_tenant_ids())
        AND deleted_at IS NULL
    );

-- Users can create tenants (become owner)
CREATE POLICY "tenants_insert_authenticated" ON public.tenants
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Only owners can update tenant
CREATE POLICY "tenants_update_owner" ON public.tenants
    FOR UPDATE
    USING (public.user_has_tenant_role(id, 'owner'))
    WITH CHECK (public.user_has_tenant_role(id, 'owner'));

-- Only owners can delete (soft delete) tenant
CREATE POLICY "tenants_delete_owner" ON public.tenants
    FOR DELETE
    USING (public.user_has_tenant_role(id, 'owner'));

-- Comments
COMMENT ON TABLE public.tenants IS 'Organizations/workspaces - root of multi-tenancy';
COMMENT ON COLUMN public.tenants.slug IS 'URL-safe unique identifier (e.g., acme-corp)';
COMMENT ON COLUMN public.tenants.settings IS 'Tenant-specific settings as JSONB';
COMMENT ON COLUMN public.tenants.trial_ends_at IS 'When free trial expires (NULL = no trial or already converted)';


-- ============================================
-- TABLE: tenant_members
-- Purpose: User membership in tenants with roles
-- Module: Tenant
-- ============================================
CREATE TABLE public.tenant_members (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Foreign keys
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Role within tenant
    role public.tenant_role NOT NULL DEFAULT 'viewer',
    
    -- Custom permissions (override role defaults)
    custom_permissions JSONB DEFAULT NULL,
    
    -- Invitation tracking
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_tenant_member UNIQUE (tenant_id, user_id)
);

-- Indexes for tenant_members
CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenant_members_role ON public.tenant_members(tenant_id, role) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenant_members_active ON public.tenant_members(tenant_id, is_active) 
    WHERE is_active = TRUE AND deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER trigger_tenant_members_updated_at
    BEFORE UPDATE ON public.tenant_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for tenant_members
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members in their tenants
CREATE POLICY "tenant_members_select" ON public.tenant_members
    FOR SELECT
    USING (
        tenant_id IN (SELECT public.get_user_tenant_ids())
        AND deleted_at IS NULL
    );

-- Admins/owners can add members
CREATE POLICY "tenant_members_insert" ON public.tenant_members
    FOR INSERT
    WITH CHECK (
        public.user_has_tenant_role(tenant_id, 'admin')
        OR (
            -- Allow self-insert when creating tenant (becomes owner)
            user_id = auth.uid() AND role = 'owner'
        )
    );

-- Admins/owners can update member roles
CREATE POLICY "tenant_members_update" ON public.tenant_members
    FOR UPDATE
    USING (
        public.user_has_tenant_role(tenant_id, 'admin')
        -- Owners cannot be demoted by admins
        AND NOT (role = 'owner' AND NOT public.user_has_tenant_role(tenant_id, 'owner'))
    )
    WITH CHECK (
        public.user_has_tenant_role(tenant_id, 'admin')
    );

-- Admins can remove members, users can remove themselves
CREATE POLICY "tenant_members_delete" ON public.tenant_members
    FOR DELETE
    USING (
        (public.user_has_tenant_role(tenant_id, 'admin') AND role != 'owner')
        OR (user_id = auth.uid() AND role != 'owner')
    );

-- Comments
COMMENT ON TABLE public.tenant_members IS 'User membership and roles within tenants';
COMMENT ON COLUMN public.tenant_members.role IS 'User role: owner, admin, developer, viewer';
COMMENT ON COLUMN public.tenant_members.custom_permissions IS 'Override default role permissions (optional)';


-- ============================================
-- TABLE: tenant_invitations
-- Purpose: Pending invitations to join a tenant
-- Module: Tenant
-- ============================================
CREATE TABLE public.tenant_invitations (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Foreign keys
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Invitation target
    email TEXT NOT NULL,
    
    -- Proposed role
    role public.tenant_role NOT NULL DEFAULT 'developer',
    
    -- Invitation token (for email link)
    token TEXT NOT NULL DEFAULT public.generate_invitation_token(),
    
    -- Status
    status public.invitation_status NOT NULL DEFAULT 'pending',
    
    -- Sender
    invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Personal message
    message TEXT,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Response tracking
    responded_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_pending_invitation UNIQUE (tenant_id, email, status)
);

-- Partial index for pending invitations only
CREATE UNIQUE INDEX idx_tenant_invitations_token ON public.tenant_invitations(token) 
    WHERE status = 'pending';
CREATE INDEX idx_tenant_invitations_tenant ON public.tenant_invitations(tenant_id);
CREATE INDEX idx_tenant_invitations_email ON public.tenant_invitations(email);
CREATE INDEX idx_tenant_invitations_expires ON public.tenant_invitations(expires_at) 
    WHERE status = 'pending';

-- Trigger for updated_at
CREATE TRIGGER trigger_tenant_invitations_updated_at
    BEFORE UPDATE ON public.tenant_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for tenant_invitations
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view invitations for their tenant
CREATE POLICY "tenant_invitations_select_admin" ON public.tenant_invitations
    FOR SELECT
    USING (public.user_has_tenant_role(tenant_id, 'admin'));

-- Invited user can view their own invitation (by email match)
CREATE POLICY "tenant_invitations_select_invitee" ON public.tenant_invitations
    FOR SELECT
    USING (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        AND status = 'pending'
    );

-- Admins can create invitations
CREATE POLICY "tenant_invitations_insert" ON public.tenant_invitations
    FOR INSERT
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'admin'));

-- Admins can update (revoke) invitations
CREATE POLICY "tenant_invitations_update_admin" ON public.tenant_invitations
    FOR UPDATE
    USING (public.user_has_tenant_role(tenant_id, 'admin'))
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'admin'));

-- Invitee can update (accept/decline) their invitation
CREATE POLICY "tenant_invitations_update_invitee" ON public.tenant_invitations
    FOR UPDATE
    USING (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        AND status = 'pending'
    )
    WITH CHECK (
        status IN ('accepted', 'declined')
    );

-- Admins can delete invitations
CREATE POLICY "tenant_invitations_delete" ON public.tenant_invitations
    FOR DELETE
    USING (public.user_has_tenant_role(tenant_id, 'admin'));

-- Comments
COMMENT ON TABLE public.tenant_invitations IS 'Pending invitations for users to join tenants';
COMMENT ON COLUMN public.tenant_invitations.token IS 'Secure token for invitation link';
COMMENT ON COLUMN public.tenant_invitations.expires_at IS 'Invitation expiration (default 7 days)';


-- ============================================
-- FUNCTION: accept_invitation
-- Purpose: Accept invitation and create membership
-- ============================================
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token TEXT)
RETURNS UUID AS $$
DECLARE
    inv RECORD;
    member_id UUID;
    current_user_email TEXT;
BEGIN
    -- Get current user email
    SELECT email INTO current_user_email FROM public.profiles WHERE id = auth.uid();
    
    -- Find valid invitation
    SELECT * INTO inv FROM public.tenant_invitations
    WHERE token = invitation_token
      AND status = 'pending'
      AND expires_at > NOW()
      AND email = current_user_email;
    
    IF inv IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;
    
    -- Create membership
    INSERT INTO public.tenant_members (tenant_id, user_id, role, invited_by, invited_at, joined_at)
    VALUES (inv.tenant_id, auth.uid(), inv.role, inv.invited_by, inv.created_at, NOW())
    RETURNING id INTO member_id;
    
    -- Update invitation status
    UPDATE public.tenant_invitations
    SET status = 'accepted', responded_at = NOW(), accepted_by = auth.uid()
    WHERE id = inv.id;
    
    RETURN member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.accept_invitation(TEXT) IS 'Accept invitation token and create tenant membership';


-- ============================================
-- TABLE: tenant_settings
-- Purpose: Key-value settings per tenant
-- Module: Tenant
-- ============================================
CREATE TABLE public.tenant_settings (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Foreign key
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Setting identity
    key TEXT NOT NULL,
    
    -- Value (stored as JSONB for flexibility)
    value JSONB NOT NULL,
    
    -- Metadata
    description TEXT,
    is_secret BOOLEAN DEFAULT FALSE, -- If true, value is encrypted
    
    -- Audit
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_tenant_setting UNIQUE (tenant_id, key)
);

-- Indexes for tenant_settings
CREATE INDEX idx_tenant_settings_tenant ON public.tenant_settings(tenant_id);
CREATE INDEX idx_tenant_settings_key ON public.tenant_settings(key);

-- Trigger for updated_at
CREATE TRIGGER trigger_tenant_settings_updated_at
    BEFORE UPDATE ON public.tenant_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for tenant_settings
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- Members can view non-secret settings
CREATE POLICY "tenant_settings_select_member" ON public.tenant_settings
    FOR SELECT
    USING (
        public.user_has_tenant_access(tenant_id)
        AND (is_secret = FALSE OR public.user_has_tenant_role(tenant_id, 'admin'))
    );

-- Admins can manage settings
CREATE POLICY "tenant_settings_insert" ON public.tenant_settings
    FOR INSERT
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'admin'));

CREATE POLICY "tenant_settings_update" ON public.tenant_settings
    FOR UPDATE
    USING (public.user_has_tenant_role(tenant_id, 'admin'))
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'admin'));

CREATE POLICY "tenant_settings_delete" ON public.tenant_settings
    FOR DELETE
    USING (public.user_has_tenant_role(tenant_id, 'admin'));

-- Comments
COMMENT ON TABLE public.tenant_settings IS 'Key-value settings storage per tenant';
COMMENT ON COLUMN public.tenant_settings.is_secret IS 'If true, only admins can read this setting';


-- ============================================
-- TABLE: tenant_domains
-- Purpose: Custom domains for tenant branding
-- Module: Tenant
-- ============================================
CREATE TABLE public.tenant_domains (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Foreign key
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Domain info
    domain TEXT NOT NULL,
    
    -- Verification
    verification_token TEXT DEFAULT public.generate_invitation_token(),
    verification_method TEXT DEFAULT 'dns_txt', -- dns_txt, dns_cname, file
    
    -- Status
    status public.domain_status NOT NULL DEFAULT 'pending',
    
    -- Verification tracking
    verified_at TIMESTAMPTZ,
    last_check_at TIMESTAMPTZ,
    check_count INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- SSL
    ssl_provisioned BOOLEAN DEFAULT FALSE,
    ssl_expires_at TIMESTAMPTZ,
    
    -- Primary domain flag
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_domain UNIQUE (domain)
);

-- Indexes for tenant_domains
CREATE INDEX idx_tenant_domains_tenant ON public.tenant_domains(tenant_id);
CREATE INDEX idx_tenant_domains_domain ON public.tenant_domains(domain);
CREATE INDEX idx_tenant_domains_status ON public.tenant_domains(status);
CREATE INDEX idx_tenant_domains_primary ON public.tenant_domains(tenant_id, is_primary) 
    WHERE is_primary = TRUE;

-- Trigger for updated_at
CREATE TRIGGER trigger_tenant_domains_updated_at
    BEFORE UPDATE ON public.tenant_domains
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to ensure only one primary domain per tenant
CREATE OR REPLACE FUNCTION public.ensure_single_primary_domain()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = TRUE THEN
        UPDATE public.tenant_domains 
        SET is_primary = FALSE 
        WHERE tenant_id = NEW.tenant_id AND id != NEW.id AND is_primary = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_domains_primary
    BEFORE INSERT OR UPDATE ON public.tenant_domains
    FOR EACH ROW
    WHEN (NEW.is_primary = TRUE)
    EXECUTE FUNCTION public.ensure_single_primary_domain();

-- RLS for tenant_domains
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- Members can view domains
CREATE POLICY "tenant_domains_select" ON public.tenant_domains
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

-- Admins can manage domains
CREATE POLICY "tenant_domains_insert" ON public.tenant_domains
    FOR INSERT
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'admin'));

CREATE POLICY "tenant_domains_update" ON public.tenant_domains
    FOR UPDATE
    USING (public.user_has_tenant_role(tenant_id, 'admin'))
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'admin'));

CREATE POLICY "tenant_domains_delete" ON public.tenant_domains
    FOR DELETE
    USING (public.user_has_tenant_role(tenant_id, 'admin'));

-- Comments
COMMENT ON TABLE public.tenant_domains IS 'Custom domains for tenant white-labeling';
COMMENT ON COLUMN public.tenant_domains.verification_token IS 'Token for DNS TXT verification';
COMMENT ON COLUMN public.tenant_domains.is_primary IS 'Primary domain used for tenant branding';


-- ============================================
-- FUNCTION: create_tenant_with_owner
-- Purpose: Create tenant and add creator as owner
-- ============================================
CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
    p_name TEXT,
    p_slug TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_tenant_id UUID;
    final_slug TEXT;
BEGIN
    -- Generate slug if not provided
    final_slug := COALESCE(p_slug, public.generate_unique_slug(p_name, 'tenants'));
    
    -- Create tenant
    INSERT INTO public.tenants (name, slug, created_by, trial_ends_at)
    VALUES (
        p_name, 
        final_slug, 
        auth.uid(),
        NOW() + INTERVAL '14 days' -- 14-day trial
    )
    RETURNING id INTO new_tenant_id;
    
    -- Add creator as owner
    INSERT INTO public.tenant_members (tenant_id, user_id, role, joined_at)
    VALUES (new_tenant_id, auth.uid(), 'owner', NOW());
    
    RETURN new_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_tenant_with_owner(TEXT, TEXT) IS 
'Creates a new tenant and adds the current user as owner';


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.2 COMPLETION: TENANT TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] tenants table with all columns
-- [x] tenants indexes (4 indexes)
-- [x] tenants RLS policies (4 policies)
-- [x] tenants soft delete trigger
-- [x] tenant_members table
-- [x] tenant_members indexes (4 indexes)
-- [x] tenant_members RLS policies (4 policies)
-- [x] tenant_invitations table
-- [x] tenant_invitations indexes (4 indexes)
-- [x] tenant_invitations RLS policies (6 policies)
-- [x] accept_invitation() function
-- [x] tenant_settings table
-- [x] tenant_settings indexes (2 indexes)
-- [x] tenant_settings RLS policies (4 policies)
-- [x] tenant_domains table
-- [x] tenant_domains indexes (4 indexes)
-- [x] tenant_domains RLS policies (4 policies)
-- [x] ensure_single_primary_domain() trigger
-- [x] create_tenant_with_owner() function
-- ═══════════════════════════════════════════════════════════════════════════════
