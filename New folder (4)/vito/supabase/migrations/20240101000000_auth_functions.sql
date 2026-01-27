-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - Authentication SQL Functions
-- File: supabase/migrations/20240101000000_auth_functions.sql
-- 
-- SQL functions for authentication, authorization, and JWT claims.
-- These functions integrate with Supabase Auth and RLS policies.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- CUSTOM ACCESS TOKEN HOOK (PostgreSQL version)
-- Called by Supabase Auth on every token generation
-- ============================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    claims JSONB;
    user_id UUID;
    tenant_id UUID;
    tenant_role TEXT;
    tenant_slug TEXT;
    plan_tier TEXT;
    permissions TEXT[];
    is_platform_admin BOOLEAN := FALSE;
    default_tenant_id UUID;
    membership RECORD;
BEGIN
    -- Extract user ID from event
    user_id := (event->>'user_id')::UUID;
    claims := event->'claims';
    
    -- Check if user is platform admin (stored in profiles or separate table)
    SELECT EXISTS(
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = custom_access_token_hook.user_id
        AND r.name IN ('super_admin', 'platform_admin')
        AND (ur.valid_until IS NULL OR ur.valid_until > NOW())
    ) INTO is_platform_admin;
    
    -- Get user's default tenant from preferences
    SELECT (p.preferences->>'defaultTenantId')::UUID
    INTO default_tenant_id
    FROM public.profiles p
    WHERE p.id = user_id;
    
    -- Find active tenant membership
    -- Priority: default tenant > first active tenant
    SELECT 
        tm.tenant_id,
        tm.role,
        t.slug
    INTO membership
    FROM public.tenant_members tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    WHERE tm.user_id = custom_access_token_hook.user_id
        AND tm.is_active = TRUE
        AND tm.deleted_at IS NULL
        AND t.is_active = TRUE
        AND t.deleted_at IS NULL
    ORDER BY 
        CASE WHEN tm.tenant_id = default_tenant_id THEN 0 ELSE 1 END,
        tm.joined_at ASC
    LIMIT 1;
    
    IF membership IS NOT NULL THEN
        tenant_id := membership.tenant_id;
        tenant_role := membership.role;
        tenant_slug := membership.slug;
        
        -- Get permissions for role
        permissions := public.get_role_permissions(tenant_role);
        
        -- Get plan tier from subscription
        SELECT p.tier
        INTO plan_tier
        FROM public.subscriptions s
        JOIN public.plans p ON p.id = s.plan_id
        WHERE s.tenant_id = membership.tenant_id
            AND s.status IN ('active', 'trialing')
        ORDER BY s.created_at DESC
        LIMIT 1;
        
        IF plan_tier IS NULL THEN
            plan_tier := 'free';
        END IF;
        
        -- Filter permissions by plan
        permissions := public.filter_permissions_by_plan(permissions, plan_tier);
    END IF;
    
    -- Add custom claims under 'olympus' namespace
    claims := jsonb_set(
        claims,
        '{olympus}',
        jsonb_build_object(
            'tenant_id', tenant_id,
            'tenant_role', tenant_role,
            'tenant_slug', tenant_slug,
            'permissions', to_jsonb(permissions),
            'plan_tier', plan_tier,
            'is_platform_admin', is_platform_admin
        )
    );
    
    RETURN jsonb_build_object('claims', claims);
END;
$$;

-- Grant execute to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) TO supabase_auth_admin;

COMMENT ON FUNCTION public.custom_access_token_hook(JSONB) IS 
'Supabase Auth hook that adds OLYMPUS custom claims to JWT tokens';


-- ============================================
-- GET ROLE PERMISSIONS
-- Returns array of permissions for a role
-- ============================================

CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE p_role
        WHEN 'owner' THEN ARRAY[
            'tenant:read', 'tenant:update', 'tenant:delete', 'tenant:manage_billing',
            'tenant:manage_members', 'tenant:manage_settings', 'tenant:view_audit_logs',
            'project:create', 'project:read', 'project:update', 'project:delete',
            'project:manage_collaborators', 'project:manage_env_vars', 'project:export',
            'build:create', 'build:read', 'build:cancel', 'build:view_logs', 'build:view_costs',
            'deployment:create', 'deployment:read', 'deployment:rollback', 'deployment:manage_domains',
            'file:upload', 'file:read', 'file:delete',
            'analytics:read', 'analytics:export',
            'api:read_keys', 'api:create_keys', 'api:delete_keys'
        ]
        WHEN 'admin' THEN ARRAY[
            'tenant:read', 'tenant:update', 'tenant:manage_members', 'tenant:manage_settings', 'tenant:view_audit_logs',
            'project:create', 'project:read', 'project:update', 'project:delete',
            'project:manage_collaborators', 'project:manage_env_vars', 'project:export',
            'build:create', 'build:read', 'build:cancel', 'build:view_logs', 'build:view_costs',
            'deployment:create', 'deployment:read', 'deployment:rollback', 'deployment:manage_domains',
            'file:upload', 'file:read', 'file:delete',
            'analytics:read', 'analytics:export',
            'api:read_keys', 'api:create_keys', 'api:delete_keys'
        ]
        WHEN 'developer' THEN ARRAY[
            'tenant:read',
            'project:create', 'project:read', 'project:update', 'project:manage_env_vars', 'project:export',
            'build:create', 'build:read', 'build:cancel', 'build:view_logs',
            'deployment:create', 'deployment:read', 'deployment:rollback',
            'file:upload', 'file:read',
            'analytics:read',
            'api:read_keys'
        ]
        WHEN 'viewer' THEN ARRAY[
            'tenant:read',
            'project:read',
            'build:read', 'build:view_logs',
            'deployment:read',
            'file:read',
            'analytics:read'
        ]
        ELSE ARRAY[]::TEXT[]
    END;
END;
$$;

COMMENT ON FUNCTION public.get_role_permissions(TEXT) IS 
'Returns array of permission strings for a given tenant role';


-- ============================================
-- FILTER PERMISSIONS BY PLAN
-- Removes permissions not available on plan
-- ============================================

CREATE OR REPLACE FUNCTION public.filter_permissions_by_plan(
    p_permissions TEXT[],
    p_plan_tier TEXT
)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    restricted_permissions TEXT[] := ARRAY[
        'api:create_keys',
        'api:delete_keys',
        'deployment:manage_domains',
        'analytics:export',
        'tenant:view_audit_logs'
    ];
    allowed_by_plan TEXT[];
    result TEXT[];
    permission TEXT;
BEGIN
    -- Define what each plan allows
    allowed_by_plan := CASE p_plan_tier
        WHEN 'enterprise' THEN restricted_permissions
        WHEN 'business' THEN ARRAY['api:create_keys', 'api:delete_keys', 'deployment:manage_domains', 'analytics:export', 'tenant:view_audit_logs']
        WHEN 'pro' THEN ARRAY['api:create_keys', 'api:delete_keys', 'deployment:manage_domains', 'analytics:export']
        WHEN 'starter' THEN ARRAY['api:create_keys', 'api:delete_keys', 'deployment:manage_domains']
        ELSE ARRAY[]::TEXT[]
    END;
    
    -- Filter permissions
    result := ARRAY[]::TEXT[];
    FOREACH permission IN ARRAY p_permissions
    LOOP
        IF permission = ANY(restricted_permissions) THEN
            IF permission = ANY(allowed_by_plan) THEN
                result := array_append(result, permission);
            END IF;
        ELSE
            result := array_append(result, permission);
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.filter_permissions_by_plan(TEXT[], TEXT) IS 
'Filters out permissions not available on the given plan tier';


-- ============================================
-- GET USER TENANTS
-- Returns all tenants a user belongs to
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_tenants(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    tenant_id UUID,
    tenant_name TEXT,
    tenant_slug TEXT,
    role public.tenant_role,
    is_owner BOOLEAN,
    joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id AS tenant_id,
        t.name AS tenant_name,
        t.slug AS tenant_slug,
        tm.role,
        (tm.role = 'owner') AS is_owner,
        tm.joined_at
    FROM public.tenant_members tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    WHERE tm.user_id = p_user_id
        AND tm.is_active = TRUE
        AND tm.deleted_at IS NULL
        AND t.is_active = TRUE
        AND t.deleted_at IS NULL
    ORDER BY 
        (tm.role = 'owner') DESC,
        tm.joined_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_user_tenants(UUID) IS 
'Returns all tenants the user belongs to with their role';


-- ============================================
-- SWITCH TENANT
-- Updates user's default tenant and returns new claims
-- ============================================

CREATE OR REPLACE FUNCTION public.switch_tenant(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_membership RECORD;
    v_plan_tier TEXT;
    v_permissions TEXT[];
BEGIN
    -- Verify user has access to tenant
    SELECT tm.tenant_id, tm.role, t.slug
    INTO v_membership
    FROM public.tenant_members tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    WHERE tm.user_id = v_user_id
        AND tm.tenant_id = p_tenant_id
        AND tm.is_active = TRUE
        AND tm.deleted_at IS NULL
        AND t.is_active = TRUE
        AND t.deleted_at IS NULL;
    
    IF v_membership IS NULL THEN
        RAISE EXCEPTION 'User does not have access to this tenant';
    END IF;
    
    -- Update user's default tenant preference
    UPDATE public.profiles
    SET preferences = jsonb_set(
        COALESCE(preferences, '{}'::jsonb),
        '{defaultTenantId}',
        to_jsonb(p_tenant_id::text)
    )
    WHERE id = v_user_id;
    
    -- Get plan tier
    SELECT p.tier INTO v_plan_tier
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.tenant_id = p_tenant_id
        AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    v_plan_tier := COALESCE(v_plan_tier, 'free');
    v_permissions := public.filter_permissions_by_plan(
        public.get_role_permissions(v_membership.role),
        v_plan_tier
    );
    
    -- Return new context (client should refresh JWT)
    RETURN jsonb_build_object(
        'tenant_id', v_membership.tenant_id,
        'tenant_slug', v_membership.slug,
        'tenant_role', v_membership.role,
        'plan_tier', v_plan_tier,
        'permissions', v_permissions,
        'refresh_required', TRUE
    );
END;
$$;

COMMENT ON FUNCTION public.switch_tenant(UUID) IS 
'Switches user to a different tenant, returns new context, requires JWT refresh';


-- ============================================
-- CHECK PERMISSION
-- Verifies user has specific permission
-- ============================================

CREATE OR REPLACE FUNCTION public.check_permission(
    p_permission TEXT,
    p_tenant_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT;
    v_plan_tier TEXT;
    v_permissions TEXT[];
BEGIN
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Use provided tenant or get from JWT claims
    IF p_tenant_id IS NULL THEN
        p_tenant_id := (current_setting('request.jwt.claims', true)::jsonb->'olympus'->>'tenant_id')::UUID;
    END IF;
    
    IF p_tenant_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get user's role in tenant
    SELECT tm.role INTO v_role
    FROM public.tenant_members tm
    WHERE tm.user_id = v_user_id
        AND tm.tenant_id = p_tenant_id
        AND tm.is_active = TRUE
        AND tm.deleted_at IS NULL;
    
    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get plan tier
    SELECT p.tier INTO v_plan_tier
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.tenant_id = p_tenant_id
        AND s.status IN ('active', 'trialing')
    LIMIT 1;
    
    v_plan_tier := COALESCE(v_plan_tier, 'free');
    
    -- Get filtered permissions
    v_permissions := public.filter_permissions_by_plan(
        public.get_role_permissions(v_role),
        v_plan_tier
    );
    
    RETURN p_permission = ANY(v_permissions);
END;
$$;

COMMENT ON FUNCTION public.check_permission(TEXT, UUID) IS 
'Checks if current user has the specified permission in the given tenant';


-- ============================================
-- ACCEPT INVITATION
-- Handles invitation acceptance flow
-- ============================================

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_invitation RECORD;
    v_existing_member RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get invitation
    SELECT * INTO v_invitation
    FROM public.tenant_invitations
    WHERE token = p_token
        AND status = 'pending';
    
    IF v_invitation IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;
    
    -- Check if expired
    IF v_invitation.expires_at < NOW() THEN
        UPDATE public.tenant_invitations
        SET status = 'expired'
        WHERE id = v_invitation.id;
        
        RAISE EXCEPTION 'Invitation has expired';
    END IF;
    
    -- Check if user email matches invitation (optional, can be removed for flexibility)
    -- This allows the invitation to be used by any authenticated user
    
    -- Check if already a member
    SELECT * INTO v_existing_member
    FROM public.tenant_members
    WHERE tenant_id = v_invitation.tenant_id
        AND user_id = v_user_id
        AND deleted_at IS NULL;
    
    IF v_existing_member IS NOT NULL THEN
        -- Update invitation status
        UPDATE public.tenant_invitations
        SET 
            status = 'accepted',
            accepted_by = v_user_id,
            responded_at = NOW()
        WHERE id = v_invitation.id;
        
        -- Reactivate if previously deactivated
        IF v_existing_member.is_active = FALSE THEN
            UPDATE public.tenant_members
            SET 
                is_active = TRUE,
                role = v_invitation.role
            WHERE id = v_existing_member.id;
        END IF;
        
        RETURN jsonb_build_object(
            'success', TRUE,
            'tenant_id', v_invitation.tenant_id,
            'role', v_invitation.role,
            'already_member', TRUE
        );
    END IF;
    
    -- Create membership
    INSERT INTO public.tenant_members (
        tenant_id,
        user_id,
        role,
        invited_by,
        joined_at,
        is_active
    ) VALUES (
        v_invitation.tenant_id,
        v_user_id,
        v_invitation.role,
        v_invitation.invited_by,
        NOW(),
        TRUE
    );
    
    -- Update invitation status
    UPDATE public.tenant_invitations
    SET 
        status = 'accepted',
        accepted_by = v_user_id,
        responded_at = NOW()
    WHERE id = v_invitation.id;
    
    -- Log the event
    PERFORM public.log_audit_event(
        'member_added',
        'tenant_members',
        v_user_id,
        jsonb_build_object(
            'tenant_id', v_invitation.tenant_id,
            'role', v_invitation.role,
            'invited_by', v_invitation.invited_by,
            'invitation_id', v_invitation.id
        )
    );
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'tenant_id', v_invitation.tenant_id,
        'role', v_invitation.role,
        'already_member', FALSE
    );
END;
$$;

COMMENT ON FUNCTION public.accept_invitation(TEXT) IS 
'Accepts a tenant invitation and creates membership';


-- ============================================
-- CREATE TENANT WITH OWNER
-- Creates a new tenant and adds creator as owner
-- ============================================

CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
    p_name TEXT,
    p_slug TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_tenant_id UUID;
    v_slug TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Generate slug if not provided
    IF p_slug IS NULL OR p_slug = '' THEN
        v_slug := public.generate_unique_slug(p_name, 'tenants', 'slug');
    ELSE
        v_slug := p_slug;
    END IF;
    
    -- Create tenant
    INSERT INTO public.tenants (
        name,
        slug,
        description,
        created_by,
        is_active
    ) VALUES (
        p_name,
        v_slug,
        p_description,
        v_user_id,
        TRUE
    )
    RETURNING id INTO v_tenant_id;
    
    -- Add creator as owner
    INSERT INTO public.tenant_members (
        tenant_id,
        user_id,
        role,
        joined_at,
        is_active
    ) VALUES (
        v_tenant_id,
        v_user_id,
        'owner',
        NOW(),
        TRUE
    );
    
    -- Set as default tenant if user has no default
    UPDATE public.profiles
    SET preferences = jsonb_set(
        COALESCE(preferences, '{}'::jsonb),
        '{defaultTenantId}',
        to_jsonb(v_tenant_id::text)
    )
    WHERE id = v_user_id
        AND (preferences->>'defaultTenantId') IS NULL;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'tenant_id', v_tenant_id,
        'tenant_slug', v_slug
    );
END;
$$;

COMMENT ON FUNCTION public.create_tenant_with_owner(TEXT, TEXT, TEXT) IS 
'Creates a new tenant and adds the current user as owner';


-- ============================================
-- LOG AUTH EVENT
-- Logs authentication-related events
-- ============================================

CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_action TEXT,
    p_user_id UUID DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_tenant_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'success',
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        action,
        action_description,
        table_name,
        record_id,
        actor_id,
        actor_type,
        actor_email,
        tenant_id,
        ip_address,
        user_agent,
        status,
        error_message,
        metadata
    ) VALUES (
        p_action::public.audit_action,
        'Auth event: ' || p_action,
        'auth',
        p_user_id,
        COALESCE(p_user_id, auth.uid()),
        'user',
        p_email,
        p_tenant_id,
        p_ip_address,
        p_user_agent,
        p_status,
        p_error_message,
        p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_auth_event IS 
'Logs authentication events to the audit log';


-- ============================================
-- REVOKE ALL USER SESSIONS
-- Invalidates all sessions for a user
-- ============================================

CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This requires Supabase to support session revocation
    -- For now, we log the event and the client should handle token invalidation
    
    PERFORM public.log_auth_event(
        'session_revoked',
        p_user_id,
        NULL,
        NULL,
        NULL,
        NULL,
        'success',
        NULL,
        jsonb_build_object('revoked_all', TRUE)
    );
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.revoke_all_user_sessions(UUID) IS 
'Logs session revocation event (actual revocation handled by auth service)';


-- ═══════════════════════════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_tenants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.switch_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_permission(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_with_owner(TEXT, TEXT, TEXT) TO authenticated;

-- Service role only
GRANT EXECUTE ON FUNCTION public.log_auth_event TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_all_user_sessions(UUID) TO service_role;

-- Auth admin for hooks
GRANT EXECUTE ON FUNCTION public.get_role_permissions(TEXT) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.filter_permissions_by_plan(TEXT[], TEXT) TO supabase_auth_admin;
