-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 02_functions.sql
-- Purpose: Core utility functions and trigger functions
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 01_types.sql
-- NOTE: These functions are used by triggers across all tables
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- FUNCTION: update_updated_at_column
-- Purpose: Automatically set updated_at on row update
-- Used by: All tables with updated_at column
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column() IS 
'Trigger function to auto-update updated_at timestamp on row modification';


-- ============================================
-- FUNCTION: set_created_by
-- Purpose: Automatically set created_by from auth.uid()
-- Used by: Tables with created_by column
-- ============================================
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.set_created_by() IS 
'Trigger function to auto-set created_by from authenticated user';


-- ============================================
-- FUNCTION: get_current_user_id
-- Purpose: Safely get current authenticated user ID
-- Used by: RLS policies, functions
-- ============================================
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_current_user_id() IS 
'Safely returns auth.uid() or NULL if not authenticated';


-- ============================================
-- FUNCTION: get_user_tenant_ids
-- Purpose: Get all tenant IDs the current user belongs to
-- Used by: RLS policies for tenant isolation
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT tenant_id 
    FROM public.tenant_members 
    WHERE user_id = auth.uid()
      AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_tenant_ids() IS 
'Returns all tenant IDs where the current user is a member';


-- ============================================
-- FUNCTION: user_has_tenant_access
-- Purpose: Check if user has access to a specific tenant
-- Used by: RLS policies, authorization checks
-- ============================================
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.tenant_members 
        WHERE tenant_id = check_tenant_id 
          AND user_id = auth.uid()
          AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.user_has_tenant_access(UUID) IS 
'Returns TRUE if current user is a member of the specified tenant';


-- ============================================
-- FUNCTION: user_has_tenant_role
-- Purpose: Check if user has specific role (or higher) in tenant
-- Used by: Permission checks for admin/owner operations
-- ============================================
CREATE OR REPLACE FUNCTION public.user_has_tenant_role(
    check_tenant_id UUID, 
    required_role public.tenant_role
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role public.tenant_role;
    role_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    -- Get user's role in tenant
    SELECT tm.role INTO user_role
    FROM public.tenant_members tm
    WHERE tm.tenant_id = check_tenant_id 
      AND tm.user_id = auth.uid()
      AND tm.deleted_at IS NULL;
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Define hierarchy (higher number = more permissions)
    role_hierarchy := CASE user_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'developer' THEN 2
        WHEN 'viewer' THEN 1
    END;
    
    required_hierarchy := CASE required_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'developer' THEN 2
        WHEN 'viewer' THEN 1
    END;
    
    RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.user_has_tenant_role(UUID, public.tenant_role) IS 
'Returns TRUE if user has the specified role or higher in the tenant';


-- ============================================
-- FUNCTION: get_user_tenant_role
-- Purpose: Get user's role in a specific tenant
-- Used by: Authorization, UI display
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_tenant_role(check_tenant_id UUID)
RETURNS public.tenant_role AS $$
DECLARE
    user_role public.tenant_role;
BEGIN
    SELECT tm.role INTO user_role
    FROM public.tenant_members tm
    WHERE tm.tenant_id = check_tenant_id 
      AND tm.user_id = auth.uid()
      AND tm.deleted_at IS NULL;
    
    RETURN user_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_tenant_role(UUID) IS 
'Returns the current user role in the specified tenant, or NULL if not a member';


-- ============================================
-- FUNCTION: soft_delete
-- Purpose: Set deleted_at instead of hard delete
-- Used by: Soft-deletable tables
-- ============================================
CREATE OR REPLACE FUNCTION public.soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Instead of deleting, update deleted_at
    UPDATE public.tenants SET deleted_at = NOW() WHERE id = OLD.id;
    -- Return NULL to prevent actual delete
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.soft_delete() IS 
'Trigger function to convert DELETE into soft delete (set deleted_at)';


-- ============================================
-- FUNCTION: generate_slug
-- Purpose: Generate URL-safe slug from text
-- Used by: Tenant slugs, project slugs
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                TRIM(input_text),
                '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special chars
            ),
            '[\s]+', '-', 'g'  -- Replace spaces with hyphens
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.generate_slug(TEXT) IS 
'Generates a URL-safe slug from input text';


-- ============================================
-- FUNCTION: generate_unique_slug
-- Purpose: Generate unique slug with numeric suffix if needed
-- Used by: Creating tenants, projects
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_unique_slug(
    input_text TEXT,
    table_name TEXT,
    existing_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
    slug_exists BOOLEAN;
BEGIN
    base_slug := public.generate_slug(input_text);
    final_slug := base_slug;
    
    LOOP
        -- Check if slug exists (excluding current record if updating)
        EXECUTE format(
            'SELECT EXISTS(SELECT 1 FROM public.%I WHERE slug = $1 AND ($2 IS NULL OR id != $2) AND deleted_at IS NULL)',
            table_name
        ) INTO slug_exists USING final_slug, existing_id;
        
        EXIT WHEN NOT slug_exists;
        
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_unique_slug(TEXT, TEXT, UUID) IS 
'Generates a unique slug by appending numeric suffix if base slug exists';


-- ============================================
-- FUNCTION: generate_invitation_token
-- Purpose: Generate secure random token for invitations
-- Used by: tenant_invitations
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(extensions.gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_invitation_token() IS 
'Generates a cryptographically secure 64-character hex token';


-- ============================================
-- FUNCTION: generate_api_key
-- Purpose: Generate API key with prefix
-- Used by: API key creation
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_api_key(prefix TEXT DEFAULT 'sk_live_')
RETURNS TEXT AS $$
BEGIN
    RETURN prefix || encode(extensions.gen_random_bytes(24), 'hex');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_api_key(TEXT) IS 
'Generates an API key with specified prefix (default: sk_live_)';


-- ============================================
-- FUNCTION: encrypt_value
-- Purpose: Encrypt sensitive data using pgcrypto
-- Used by: Environment variables, secrets
-- ============================================
CREATE OR REPLACE FUNCTION public.encrypt_value(plain_text TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        extensions.pgp_sym_encrypt(plain_text, encryption_key),
        'base64'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.encrypt_value(TEXT, TEXT) IS 
'Encrypts text using PGP symmetric encryption, returns base64';


-- ============================================
-- FUNCTION: decrypt_value
-- Purpose: Decrypt sensitive data
-- Used by: Reading environment variables, secrets
-- ============================================
CREATE OR REPLACE FUNCTION public.decrypt_value(encrypted_text TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN extensions.pgp_sym_decrypt(
        decode(encrypted_text, 'base64'),
        encryption_key
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL; -- Return NULL if decryption fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.decrypt_value(TEXT, TEXT) IS 
'Decrypts PGP encrypted base64 text, returns NULL on failure';


-- ============================================
-- FUNCTION: check_tenant_limit
-- Purpose: Check if tenant has reached a specific limit
-- Used by: Feature gating, quota enforcement
-- ============================================
CREATE OR REPLACE FUNCTION public.check_tenant_limit(
    check_tenant_id UUID,
    limit_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_plan public.plan_tier;
    limit_value INTEGER;
    current_usage INTEGER;
BEGIN
    -- Get tenant's current plan
    SELECT p.tier INTO current_plan
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.tenant_id = check_tenant_id
      AND s.status IN ('active', 'trialing')
    LIMIT 1;
    
    -- If no active subscription, use free tier
    IF current_plan IS NULL THEN
        current_plan := 'free';
    END IF;
    
    -- Get limit value for plan (simplified - actual limits in plans table)
    limit_value := CASE 
        WHEN limit_name = 'projects' THEN
            CASE current_plan
                WHEN 'free' THEN 1
                WHEN 'starter' THEN 5
                WHEN 'pro' THEN 20
                WHEN 'business' THEN 100
                WHEN 'enterprise' THEN 999999
            END
        WHEN limit_name = 'builds_per_month' THEN
            CASE current_plan
                WHEN 'free' THEN 10
                WHEN 'starter' THEN 50
                WHEN 'pro' THEN 200
                WHEN 'business' THEN 1000
                WHEN 'enterprise' THEN 999999
            END
        WHEN limit_name = 'team_members' THEN
            CASE current_plan
                WHEN 'free' THEN 1
                WHEN 'starter' THEN 3
                WHEN 'pro' THEN 10
                WHEN 'business' THEN 50
                WHEN 'enterprise' THEN 999999
            END
        ELSE 0
    END;
    
    -- Get current usage
    current_usage := CASE limit_name
        WHEN 'projects' THEN (
            SELECT COUNT(*) FROM public.projects 
            WHERE tenant_id = check_tenant_id AND deleted_at IS NULL
        )
        WHEN 'builds_per_month' THEN (
            SELECT COUNT(*) FROM public.builds 
            WHERE tenant_id = check_tenant_id 
              AND created_at >= date_trunc('month', NOW())
        )
        WHEN 'team_members' THEN (
            SELECT COUNT(*) FROM public.tenant_members 
            WHERE tenant_id = check_tenant_id AND deleted_at IS NULL
        )
        ELSE 0
    END;
    
    -- Return TRUE if under limit
    RETURN current_usage < limit_value;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.check_tenant_limit(UUID, TEXT) IS 
'Checks if tenant is under the specified limit based on their plan';


-- ============================================
-- FUNCTION: log_audit_event
-- Purpose: Insert audit log entry
-- Used by: Audit triggers, application code
-- ============================================
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action public.audit_action,
    p_table_name TEXT,
    p_record_id UUID,
    p_tenant_id UUID DEFAULT NULL,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        action,
        table_name,
        record_id,
        tenant_id,
        actor_id,
        old_data,
        new_data,
        metadata,
        ip_address,
        user_agent
    ) VALUES (
        p_action,
        p_table_name,
        p_record_id,
        p_tenant_id,
        auth.uid(),
        p_old_data,
        p_new_data,
        p_metadata,
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        current_setting('request.headers', true)::json->>'user-agent'
    )
    RETURNING id INTO audit_id;
    
    RETURN audit_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail operations if audit logging fails
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_audit_event(public.audit_action, TEXT, UUID, UUID, JSONB, JSONB, JSONB) IS 
'Inserts an audit log entry with optional old/new data for change tracking';


-- ============================================
-- FUNCTION: create_audit_trigger
-- Purpose: Create standard audit trigger for a table
-- Used by: Setup script to add auditing to tables
-- ============================================
CREATE OR REPLACE FUNCTION public.create_audit_trigger_function(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE OR REPLACE FUNCTION public.audit_%I()
        RETURNS TRIGGER AS $func$
        BEGIN
            IF TG_OP = ''INSERT'' THEN
                PERFORM public.log_audit_event(
                    ''create''::public.audit_action,
                    TG_TABLE_NAME,
                    NEW.id,
                    NEW.tenant_id,
                    NULL,
                    to_jsonb(NEW),
                    NULL
                );
                RETURN NEW;
            ELSIF TG_OP = ''UPDATE'' THEN
                PERFORM public.log_audit_event(
                    ''update''::public.audit_action,
                    TG_TABLE_NAME,
                    NEW.id,
                    NEW.tenant_id,
                    to_jsonb(OLD),
                    to_jsonb(NEW),
                    NULL
                );
                RETURN NEW;
            ELSIF TG_OP = ''DELETE'' THEN
                PERFORM public.log_audit_event(
                    ''delete''::public.audit_action,
                    TG_TABLE_NAME,
                    OLD.id,
                    OLD.tenant_id,
                    to_jsonb(OLD),
                    NULL,
                    NULL
                );
                RETURN OLD;
            END IF;
            RETURN NULL;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ', table_name);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.create_audit_trigger_function(TEXT) IS 
'Dynamically creates an audit trigger function for the specified table';


-- ============================================
-- FUNCTION: notify_realtime
-- Purpose: Send realtime notification via Supabase
-- Used by: Triggers that need to push updates
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_realtime()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'type', TG_OP,
        'id', COALESCE(NEW.id, OLD.id),
        'tenant_id', COALESCE(NEW.tenant_id, OLD.tenant_id),
        'timestamp', NOW()
    );
    
    -- Add new data for INSERT/UPDATE
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        payload := payload || jsonb_build_object('new', to_jsonb(NEW));
    END IF;
    
    -- Add old data for UPDATE/DELETE
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        payload := payload || jsonb_build_object('old', to_jsonb(OLD));
    END IF;
    
    -- Notify on channel
    PERFORM pg_notify(
        'realtime:' || TG_TABLE_NAME,
        payload::text
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.notify_realtime() IS 
'Trigger function to send PostgreSQL notifications for realtime updates';


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.1 COMPLETION: FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] update_updated_at_column() - Auto-update timestamps
-- [x] set_created_by() - Auto-set creator
-- [x] get_current_user_id() - Safe auth.uid() wrapper
-- [x] get_user_tenant_ids() - Get user's tenants
-- [x] user_has_tenant_access() - Check tenant membership
-- [x] user_has_tenant_role() - Check role hierarchy
-- [x] get_user_tenant_role() - Get specific role
-- [x] soft_delete() - Soft delete trigger
-- [x] generate_slug() - URL-safe slug
-- [x] generate_unique_slug() - Unique slug with suffix
-- [x] generate_invitation_token() - Secure token
-- [x] generate_api_key() - API key with prefix
-- [x] encrypt_value() - PGP encryption
-- [x] decrypt_value() - PGP decryption
-- [x] check_tenant_limit() - Quota enforcement
-- [x] log_audit_event() - Audit logging
-- [x] create_audit_trigger_function() - Dynamic audit trigger
-- [x] notify_realtime() - Realtime notifications
-- TOTAL: 18 functions defined
-- ═══════════════════════════════════════════════════════════════════════════════
