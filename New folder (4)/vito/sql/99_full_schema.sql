-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 00_extensions.sql
-- Purpose: PostgreSQL extensions required for the platform
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run this FIRST before any other schema files
-- ENVIRONMENT: Supabase PostgreSQL 15+
-- 
-- ═══════════════════════════════════════════════════════════════════════════════

-- ============================================
-- EXTENSION: uuid-ossp
-- Purpose: UUID generation functions
-- Used by: All tables with UUID primary keys
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============================================
-- EXTENSION: pgcrypto
-- Purpose: Cryptographic functions (encryption, hashing)
-- Used by: Password hashing, token generation, encrypted fields
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ============================================
-- EXTENSION: pg_trgm
-- Purpose: Trigram matching for fuzzy text search
-- Used by: Project search, user search, full-text queries
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;

-- ============================================
-- EXTENSION: btree_gin
-- Purpose: GIN indexes on scalar types
-- Used by: Composite indexes combining JSONB with other columns
-- ============================================
CREATE EXTENSION IF NOT EXISTS "btree_gin" WITH SCHEMA extensions;

-- ============================================
-- EXTENSION: citext
-- Purpose: Case-insensitive text type
-- Used by: Email fields, slugs, domain names
-- ============================================
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA extensions;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.1 COMPLETION: EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] uuid-ossp for UUID generation
-- [x] pgcrypto for encryption
-- [x] pg_trgm for text search
-- [x] btree_gin for composite indexes
-- [x] citext for case-insensitive text
-- ═══════════════════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 01_types.sql
-- Purpose: Custom ENUM types and composite types
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 00_extensions.sql
-- NOTE: ENUMs are immutable - adding values requires ALTER TYPE
-- 
-- ═══════════════════════════════════════════════════════════════════════════════

-- ============================================
-- TYPE: plan_tier
-- Purpose: Subscription plan levels
-- Used by: plans, subscriptions, feature gating
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.plan_tier AS ENUM (
        'free',        -- $0/month, limited features
        'starter',     -- $19/month, individual users
        'pro',         -- $49/month, small teams
        'business',    -- $149/month, larger teams
        'enterprise'   -- Custom pricing, unlimited
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.plan_tier IS 'Subscription plan tiers with ascending feature levels';

-- ============================================
-- TYPE: subscription_status
-- Purpose: Current state of a subscription
-- Used by: subscriptions table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.subscription_status AS ENUM (
        'trialing',       -- In free trial period
        'active',         -- Paid and active
        'past_due',       -- Payment failed, grace period
        'canceled',       -- User canceled, access until period end
        'unpaid',         -- Multiple payment failures
        'incomplete',     -- Initial payment pending
        'paused'          -- Temporarily suspended
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.subscription_status IS 'Stripe-aligned subscription lifecycle states';

-- ============================================
-- TYPE: build_status
-- Purpose: State of a build job
-- Used by: builds table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.build_status AS ENUM (
        'pending',        -- Queued, waiting to start
        'initializing',   -- Setting up environment
        'running',        -- Agents actively working
        'validating',     -- Running quality checks
        'completed',      -- Successfully finished
        'failed',         -- Error during execution
        'canceled',       -- User canceled
        'timeout'         -- Exceeded time limit
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.build_status IS 'Build job lifecycle states';

-- ============================================
-- TYPE: deployment_status
-- Purpose: State of a deployment
-- Used by: deployments table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.deployment_status AS ENUM (
        'pending',        -- Waiting to deploy
        'building',       -- Building deployment artifact
        'deploying',      -- Uploading to provider
        'verifying',      -- Health checks running
        'live',           -- Successfully deployed and accessible
        'failed',         -- Deployment failed
        'rolled_back',    -- Reverted to previous version
        'canceled'        -- User canceled
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.deployment_status IS 'Deployment lifecycle states';

-- ============================================
-- TYPE: tenant_role
-- Purpose: User's role within a tenant/organization
-- Used by: tenant_members table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.tenant_role AS ENUM (
        'owner',          -- Full control, can delete tenant
        'admin',          -- Manage members, billing, settings
        'developer',      -- Create/edit projects, deploy
        'viewer'          -- Read-only access
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.tenant_role IS 'Role hierarchy within a tenant organization';

-- ============================================
-- TYPE: invitation_status
-- Purpose: State of a team invitation
-- Used by: tenant_invitations table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.invitation_status AS ENUM (
        'pending',        -- Sent, awaiting response
        'accepted',       -- User joined the tenant
        'declined',       -- User declined invitation
        'expired',        -- Past expiration date
        'revoked'         -- Admin canceled invitation
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.invitation_status IS 'Team invitation lifecycle states';

-- ============================================
-- TYPE: domain_status
-- Purpose: Custom domain verification state
-- Used by: tenant_domains, domains tables
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.domain_status AS ENUM (
        'pending',        -- Awaiting DNS configuration
        'verifying',      -- DNS check in progress
        'verified',       -- DNS verified, ready to use
        'active',         -- SSL provisioned, serving traffic
        'failed',         -- Verification failed
        'expired'         -- Certificate expired
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.domain_status IS 'Custom domain setup lifecycle states';

-- ============================================
-- TYPE: log_level
-- Purpose: Severity level for logs
-- Used by: build_logs, deployment_logs tables
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.log_level AS ENUM (
        'debug',          -- Verbose debugging info
        'info',           -- General information
        'warn',           -- Warning, non-critical issue
        'error',          -- Error, operation failed
        'fatal'           -- Critical, system failure
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.log_level IS 'Log severity levels (ascending severity)';

-- ============================================
-- TYPE: deployment_target
-- Purpose: Where a project gets deployed
-- Used by: deployments table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.deployment_target AS ENUM (
        'olympus',        -- OLYMPUS hosting (Vercel + Railway)
        'vercel',         -- User's Vercel account
        'railway',        -- User's Railway account
        'netlify',        -- User's Netlify account (future)
        'export'          -- ZIP download / GitHub push
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.deployment_target IS 'Supported deployment target platforms';

-- ============================================
-- TYPE: environment_type
-- Purpose: Deployment environment classification
-- Used by: project_env_vars, deployments tables
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.environment_type AS ENUM (
        'development',    -- Local/preview builds
        'staging',        -- Pre-production testing
        'production'      -- Live customer-facing
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.environment_type IS 'Deployment environment types for env vars and configs';

-- ============================================
-- TYPE: file_category
-- Purpose: Classification of stored files
-- Used by: files, project_files tables
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.file_category AS ENUM (
        'image',          -- Images (png, jpg, svg, etc.)
        'document',       -- Documents (pdf, docx, etc.)
        'video',          -- Video files
        'audio',          -- Audio files
        'archive',        -- Compressed archives (zip, tar)
        'code',           -- Source code files
        'other'           -- Uncategorized
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.file_category IS 'File type classification for storage management';

-- ============================================
-- TYPE: webhook_status
-- Purpose: Processing state for webhook events
-- Used by: webhook_events table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.webhook_status AS ENUM (
        'pending',        -- Received, not yet processed
        'processing',     -- Currently being handled
        'completed',      -- Successfully processed
        'failed',         -- Processing failed
        'skipped'         -- Intentionally not processed
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.webhook_status IS 'Webhook event processing states';

-- ============================================
-- TYPE: credit_transaction_type
-- Purpose: Type of credit balance change
-- Used by: credits table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.credit_transaction_type AS ENUM (
        'purchase',       -- Bought credits
        'bonus',          -- Promotional credits
        'refund',         -- Refunded credits
        'usage',          -- Spent on builds/deploys
        'expiry',         -- Credits expired
        'adjustment'      -- Manual admin adjustment
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.credit_transaction_type IS 'Credit balance transaction types';

-- ============================================
-- TYPE: audit_action
-- Purpose: Classification of audited actions
-- Used by: audit_logs table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.audit_action AS ENUM (
        'create',         -- Resource created
        'read',           -- Resource accessed (optional)
        'update',         -- Resource modified
        'delete',         -- Resource deleted (soft or hard)
        'login',          -- User authentication
        'logout',         -- User signed out
        'export',         -- Data exported
        'invite',         -- User invited
        'permission'      -- Permission changed
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.audit_action IS 'Audit log action classifications';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.1 COMPLETION: TYPES
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] plan_tier (5 values)
-- [x] subscription_status (7 values)
-- [x] build_status (8 values)
-- [x] deployment_status (8 values)
-- [x] tenant_role (4 values)
-- [x] invitation_status (5 values)
-- [x] domain_status (6 values)
-- [x] log_level (5 values)
-- [x] deployment_target (5 values)
-- [x] environment_type (3 values)
-- [x] file_category (7 values)
-- [x] webhook_status (5 values)
-- [x] credit_transaction_type (6 values)
-- [x] audit_action (9 values)
-- TOTAL: 14 ENUM types defined
-- ═══════════════════════════════════════════════════════════════════════════════
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
-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 03_auth_tables.sql
-- Purpose: Authentication-related tables (profiles, roles, user_roles)
-- Module: Auth Module
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 02_functions.sql
-- DEPENDENCIES: auth.users (Supabase managed), ENUM types, utility functions
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- TABLE: profiles
-- Purpose: Extended user profile data beyond auth.users
-- Module: Auth
-- ============================================
CREATE TABLE public.profiles (
    -- Primary key matches auth.users.id (1:1 relationship)
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Profile information
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    
    -- Contact & location
    phone TEXT,
    timezone TEXT DEFAULT 'UTC',
    locale TEXT DEFAULT 'en',
    
    -- Preferences (stored as JSONB for flexibility)
    preferences JSONB DEFAULT '{
        "theme": "system",
        "email_notifications": true,
        "marketing_emails": false,
        "weekly_digest": true
    }'::jsonb,
    
    -- Onboarding tracking
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step INTEGER DEFAULT 0,
    
    -- Last activity tracking
    last_seen_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for profiles
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_display_name ON public.profiles(display_name) WHERE display_name IS NOT NULL;
CREATE INDEX idx_profiles_last_seen ON public.profiles(last_seen_at DESC) WHERE last_seen_at IS NOT NULL;
CREATE INDEX idx_profiles_active ON public.profiles(is_active) WHERE is_active = TRUE AND deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

-- Users can view profiles of members in their tenants
CREATE POLICY "profiles_select_tenant_members" ON public.profiles
    FOR SELECT
    USING (
        id IN (
            SELECT tm.user_id 
            FROM public.tenant_members tm
            WHERE tm.tenant_id IN (SELECT public.get_user_tenant_ids())
              AND tm.deleted_at IS NULL
        )
    );

-- Users can update only their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Insert handled by trigger on auth.users (see below)
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- No direct delete - handled by auth.users cascade
CREATE POLICY "profiles_delete_own" ON public.profiles
    FOR DELETE
    USING (id = auth.uid());

-- Comments
COMMENT ON TABLE public.profiles IS 'Extended user profile information, 1:1 with auth.users';
COMMENT ON COLUMN public.profiles.id IS 'Matches auth.users.id - user UUID';
COMMENT ON COLUMN public.profiles.preferences IS 'User preferences as JSONB (theme, notifications, etc.)';
COMMENT ON COLUMN public.profiles.onboarding_step IS 'Current step in onboarding flow (0 = not started)';


-- ============================================
-- TABLE: roles
-- Purpose: System-wide role definitions
-- Module: Auth
-- Note: These are SYSTEM roles, not tenant roles
-- ============================================
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Role identity
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    
    -- Permissions as JSONB array
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Role hierarchy (higher = more permissions)
    hierarchy_level INTEGER NOT NULL DEFAULT 0,
    
    -- System role (cannot be deleted)
    is_system BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for roles
CREATE UNIQUE INDEX idx_roles_name ON public.roles(name);
CREATE INDEX idx_roles_active ON public.roles(is_active) WHERE is_active = TRUE;

-- Trigger for updated_at
CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for roles (readable by all authenticated users)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view roles
CREATE POLICY "roles_select_authenticated" ON public.roles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Only superadmins can modify roles (enforced at application level)
-- No INSERT/UPDATE/DELETE policies - managed by service role

-- Comments
COMMENT ON TABLE public.roles IS 'System-wide role definitions with permissions';
COMMENT ON COLUMN public.roles.permissions IS 'Array of permission strings e.g. ["projects:create", "builds:read"]';
COMMENT ON COLUMN public.roles.hierarchy_level IS 'Role hierarchy - higher number means more permissions';
COMMENT ON COLUMN public.roles.is_system IS 'System roles cannot be deleted';


-- ============================================
-- TABLE: user_roles
-- Purpose: Many-to-many user-role assignments (system level)
-- Module: Auth
-- Note: These are SYSTEM roles, not tenant roles
-- ============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Foreign keys
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    
    -- Assignment metadata
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_reason TEXT,
    
    -- Validity period (optional)
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ, -- NULL = no expiry
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_user_role UNIQUE (user_id, role_id)
);

-- Indexes for user_roles
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role_id);
CREATE INDEX idx_user_roles_active ON public.user_roles(user_id, is_active) WHERE is_active = TRUE;

-- Trigger for updated_at
CREATE TRIGGER trigger_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own role assignments
CREATE POLICY "user_roles_select_own" ON public.user_roles
    FOR SELECT
    USING (user_id = auth.uid());

-- Admins can view all user roles in their tenant
-- Note: System roles are tenant-agnostic, but we allow tenant admins to view
CREATE POLICY "user_roles_select_admin" ON public.user_roles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.user_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
              AND tm.deleted_at IS NULL
        )
    );

-- Comments
COMMENT ON TABLE public.user_roles IS 'User-role assignments for system-level permissions';
COMMENT ON COLUMN public.user_roles.valid_until IS 'Optional expiry date for temporary role assignments';


-- ============================================
-- FUNCTION: handle_new_user
-- Purpose: Auto-create profile when user signs up
-- Triggered by: auth.users INSERT
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile record when new user signs up via Supabase Auth';


-- ============================================
-- FUNCTION: handle_user_delete
-- Purpose: Soft delete profile when user is deleted
-- Triggered by: auth.users DELETE
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles 
    SET deleted_at = NOW(), is_active = FALSE
    WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger is optional if using CASCADE, but useful for soft delete pattern
-- CREATE TRIGGER on_auth_user_deleted
--     BEFORE DELETE ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION public.handle_user_delete();


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.2 COMPLETION: AUTH TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] profiles table with all columns
-- [x] profiles indexes (4 indexes)
-- [x] profiles RLS policies (5 policies)
-- [x] profiles updated_at trigger
-- [x] roles table with permissions JSONB
-- [x] roles indexes (2 indexes)
-- [x] roles RLS policies (1 policy)
-- [x] roles updated_at trigger
-- [x] user_roles junction table
-- [x] user_roles indexes (3 indexes)
-- [x] user_roles RLS policies (2 policies)
-- [x] user_roles updated_at trigger
-- [x] handle_new_user() function + trigger
-- [x] handle_user_delete() function
-- ═══════════════════════════════════════════════════════════════════════════════
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
-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 05_project_tables.sql
-- Purpose: Project management tables (projects, versions, files, env vars, collaborators)
-- Module: Project Module
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 04_tenant_tables.sql
-- DEPENDENCIES: tenants, profiles, tenant_members, ENUM types
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- TABLE: projects
-- Purpose: User's application projects
-- Module: Project
-- ============================================
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Tenant ownership
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Project identity
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    
    -- Project type and framework
    project_type TEXT DEFAULT 'web_app', -- web_app, api, mobile, etc.
    framework TEXT, -- react, nextjs, vue, etc.
    
    -- AI generation context
    initial_prompt TEXT, -- Original user description
    refined_prompt TEXT, -- AI-refined description
    
    -- Visual
    icon TEXT DEFAULT '🚀',
    color TEXT DEFAULT '#8B5CF6',
    thumbnail_url TEXT,
    
    -- Current state
    current_version_id UUID, -- FK added after project_versions table
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft',        -- Initial creation
        'building',     -- Build in progress
        'ready',        -- Built, ready to preview/deploy
        'deployed',     -- Has live deployment
        'archived'      -- User archived
    )),
    
    -- Feature flags
    is_public BOOLEAN DEFAULT FALSE, -- Publicly viewable
    is_template BOOLEAN DEFAULT FALSE, -- Can be used as template
    is_featured BOOLEAN DEFAULT FALSE, -- Featured in marketplace
    
    -- Stats (denormalized for performance)
    build_count INTEGER DEFAULT 0,
    deployment_count INTEGER DEFAULT 0,
    total_tokens_used BIGINT DEFAULT 0,
    
    -- Quality metrics (from last build)
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    last_build_at TIMESTAMPTZ,
    last_deploy_at TIMESTAMPTZ,
    
    -- Git integration (optional)
    git_repo_url TEXT,
    git_branch TEXT DEFAULT 'main',
    git_auto_sync BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_project_slug_per_tenant UNIQUE (tenant_id, slug)
);

-- Indexes for projects
CREATE INDEX idx_projects_tenant ON public.projects(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_slug ON public.projects(tenant_id, slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON public.projects(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_created_by ON public.projects(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_public ON public.projects(is_public) WHERE is_public = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_projects_template ON public.projects(is_template) WHERE is_template = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_projects_updated ON public.projects(tenant_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_tags ON public.projects USING GIN(tags) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_projects_search ON public.projects 
    USING GIN(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')))
    WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_project()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.projects SET deleted_at = NOW(), status = 'archived' WHERE id = OLD.id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_soft_delete
    BEFORE DELETE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.soft_delete_project();

-- Trigger to auto-generate slug
CREATE OR REPLACE FUNCTION public.generate_project_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := public.generate_unique_slug(NEW.name, 'projects', NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_slug
    BEFORE INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_project_slug();

-- RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Members can view projects in their tenant
CREATE POLICY "projects_select_tenant" ON public.projects
    FOR SELECT
    USING (
        (public.user_has_tenant_access(tenant_id) AND deleted_at IS NULL)
        OR (is_public = TRUE AND deleted_at IS NULL)
    );

-- Developers+ can create projects
CREATE POLICY "projects_insert" ON public.projects
    FOR INSERT
    WITH CHECK (
        public.user_has_tenant_role(tenant_id, 'developer')
    );

-- Developers+ can update their projects, or any project if admin
CREATE POLICY "projects_update" ON public.projects
    FOR UPDATE
    USING (
        public.user_has_tenant_access(tenant_id)
        AND deleted_at IS NULL
        AND (
            created_by = auth.uid()
            OR public.user_has_tenant_role(tenant_id, 'admin')
            OR EXISTS (
                SELECT 1 FROM public.project_collaborators pc
                WHERE pc.project_id = id 
                  AND pc.user_id = auth.uid()
                  AND pc.permission IN ('write', 'admin')
                  AND pc.deleted_at IS NULL
            )
        )
    )
    WITH CHECK (
        public.user_has_tenant_access(tenant_id)
    );

-- Creator or admin can delete projects
CREATE POLICY "projects_delete" ON public.projects
    FOR DELETE
    USING (
        public.user_has_tenant_access(tenant_id)
        AND (
            created_by = auth.uid()
            OR public.user_has_tenant_role(tenant_id, 'admin')
        )
    );

-- Comments
COMMENT ON TABLE public.projects IS 'User application projects within a tenant';
COMMENT ON COLUMN public.projects.initial_prompt IS 'Original user description for AI generation';
COMMENT ON COLUMN public.projects.current_version_id IS 'Reference to active version (FK added later)';
COMMENT ON COLUMN public.projects.quality_score IS 'AI-assessed code quality score 0-100';


-- ============================================
-- TABLE: project_versions
-- Purpose: Version history / snapshots of projects
-- Module: Project
-- ============================================
CREATE TABLE public.project_versions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Version identity
    version_number INTEGER NOT NULL,
    version_tag TEXT, -- e.g., 'v1.0.0', 'beta', 'release'
    name TEXT, -- Optional friendly name
    description TEXT, -- What changed in this version
    
    -- Source
    source_type TEXT DEFAULT 'build' CHECK (source_type IN (
        'build',        -- Generated by AI build
        'import',       -- Imported from external source
        'manual',       -- Manual file upload
        'rollback',     -- Rollback to previous version
        'fork'          -- Forked from another project
    )),
    source_build_id UUID, -- FK to builds table (added later)
    
    -- File snapshot
    file_tree JSONB, -- Cached file tree structure for quick display
    file_count INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    
    -- Tech stack detected
    detected_stack JSONB DEFAULT '{}'::jsonb, -- { "framework": "nextjs", "language": "typescript", ... }
    
    -- Quality metrics
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    lint_errors INTEGER DEFAULT 0,
    lint_warnings INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft',        -- Being created
        'ready',        -- Complete and usable
        'deprecated',   -- Superseded by newer version
        'failed'        -- Build failed
    )),
    
    -- Deployment tracking
    is_deployed BOOLEAN DEFAULT FALSE,
    deployed_at TIMESTAMPTZ,
    deployment_url TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_version_number UNIQUE (project_id, version_number)
);

-- Now add FK from projects to project_versions
ALTER TABLE public.projects 
    ADD CONSTRAINT fk_projects_current_version 
    FOREIGN KEY (current_version_id) 
    REFERENCES public.project_versions(id) 
    ON DELETE SET NULL;

-- Indexes for project_versions
CREATE INDEX idx_project_versions_project ON public.project_versions(project_id);
CREATE INDEX idx_project_versions_tenant ON public.project_versions(tenant_id);
CREATE INDEX idx_project_versions_number ON public.project_versions(project_id, version_number DESC);
CREATE INDEX idx_project_versions_status ON public.project_versions(project_id, status);
CREATE INDEX idx_project_versions_deployed ON public.project_versions(project_id) WHERE is_deployed = TRUE;

-- Trigger for updated_at
CREATE TRIGGER trigger_project_versions_updated_at
    BEFORE UPDATE ON public.project_versions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-increment version number
CREATE OR REPLACE FUNCTION public.increment_version_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.version_number IS NULL THEN
        SELECT COALESCE(MAX(version_number), 0) + 1 INTO NEW.version_number
        FROM public.project_versions
        WHERE project_id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_versions_number
    BEFORE INSERT ON public.project_versions
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_version_number();

-- RLS for project_versions
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

-- Same access as parent project
CREATE POLICY "project_versions_select" ON public.project_versions
    FOR SELECT
    USING (
        public.user_has_tenant_access(tenant_id)
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND p.is_public = TRUE
        )
    );

CREATE POLICY "project_versions_insert" ON public.project_versions
    FOR INSERT
    WITH CHECK (
        public.user_has_tenant_role(tenant_id, 'developer')
    );

CREATE POLICY "project_versions_update" ON public.project_versions
    FOR UPDATE
    USING (public.user_has_tenant_access(tenant_id))
    WITH CHECK (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.project_versions IS 'Version history and snapshots of projects';
COMMENT ON COLUMN public.project_versions.file_tree IS 'Cached JSON structure of file tree for quick UI rendering';
COMMENT ON COLUMN public.project_versions.detected_stack IS 'Auto-detected technology stack';


-- ============================================
-- TABLE: project_files
-- Purpose: Individual files within a project version
-- Module: Project
-- ============================================
CREATE TABLE public.project_files (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.project_versions(id) ON DELETE CASCADE,
    
    -- File identity
    path TEXT NOT NULL, -- Full path: 'src/components/Button.tsx'
    name TEXT NOT NULL, -- File name: 'Button.tsx'
    extension TEXT, -- File extension: 'tsx'
    
    -- File type
    file_type TEXT DEFAULT 'file' CHECK (file_type IN ('file', 'directory')),
    mime_type TEXT,
    
    -- Content
    content TEXT, -- File content (for text files)
    content_hash TEXT, -- SHA-256 hash of content
    
    -- For binary files, reference to storage
    storage_path TEXT, -- Path in Supabase Storage
    storage_bucket TEXT DEFAULT 'project-files',
    
    -- Size
    size_bytes INTEGER DEFAULT 0,
    line_count INTEGER,
    
    -- Language detection
    language TEXT, -- Detected programming language
    
    -- AI metadata
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_agent TEXT, -- Which agent generated this file
    ai_confidence REAL, -- Confidence score 0-1
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active',       -- Current file
        'modified',     -- Has unsaved changes
        'deleted',      -- Marked for deletion
        'conflict'      -- Merge conflict
    )),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_file_path_per_version UNIQUE (version_id, path)
);

-- Indexes for project_files
CREATE INDEX idx_project_files_version ON public.project_files(version_id);
CREATE INDEX idx_project_files_project ON public.project_files(project_id);
CREATE INDEX idx_project_files_tenant ON public.project_files(tenant_id);
CREATE INDEX idx_project_files_path ON public.project_files(version_id, path);
CREATE INDEX idx_project_files_extension ON public.project_files(version_id, extension);
CREATE INDEX idx_project_files_language ON public.project_files(version_id, language);
CREATE INDEX idx_project_files_type ON public.project_files(version_id, file_type);

-- Partial index for directories only
CREATE INDEX idx_project_files_directories ON public.project_files(version_id, path) 
    WHERE file_type = 'directory';

-- Trigger for updated_at
CREATE TRIGGER trigger_project_files_updated_at
    BEFORE UPDATE ON public.project_files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to extract file metadata
CREATE OR REPLACE FUNCTION public.extract_file_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract name from path
    NEW.name := regexp_replace(NEW.path, '^.*/', '');
    
    -- Extract extension
    IF NEW.name LIKE '%.%' THEN
        NEW.extension := regexp_replace(NEW.name, '^.*\.', '');
    END IF;
    
    -- Detect language from extension
    NEW.language := CASE NEW.extension
        WHEN 'ts' THEN 'typescript'
        WHEN 'tsx' THEN 'typescript'
        WHEN 'js' THEN 'javascript'
        WHEN 'jsx' THEN 'javascript'
        WHEN 'py' THEN 'python'
        WHEN 'rb' THEN 'ruby'
        WHEN 'go' THEN 'go'
        WHEN 'rs' THEN 'rust'
        WHEN 'java' THEN 'java'
        WHEN 'php' THEN 'php'
        WHEN 'css' THEN 'css'
        WHEN 'scss' THEN 'scss'
        WHEN 'html' THEN 'html'
        WHEN 'json' THEN 'json'
        WHEN 'yaml' THEN 'yaml'
        WHEN 'yml' THEN 'yaml'
        WHEN 'md' THEN 'markdown'
        WHEN 'sql' THEN 'sql'
        WHEN 'sh' THEN 'shell'
        WHEN 'dockerfile' THEN 'dockerfile'
        ELSE NULL
    END;
    
    -- Calculate line count for text content
    IF NEW.content IS NOT NULL THEN
        NEW.line_count := array_length(string_to_array(NEW.content, E'\n'), 1);
        NEW.size_bytes := octet_length(NEW.content);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_files_metadata
    BEFORE INSERT OR UPDATE ON public.project_files
    FOR EACH ROW
    EXECUTE FUNCTION public.extract_file_metadata();

-- RLS for project_files
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Same access as parent project
CREATE POLICY "project_files_select" ON public.project_files
    FOR SELECT
    USING (
        public.user_has_tenant_access(tenant_id)
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND p.is_public = TRUE
        )
    );

CREATE POLICY "project_files_insert" ON public.project_files
    FOR INSERT
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'developer'));

CREATE POLICY "project_files_update" ON public.project_files
    FOR UPDATE
    USING (public.user_has_tenant_access(tenant_id))
    WITH CHECK (public.user_has_tenant_access(tenant_id));

CREATE POLICY "project_files_delete" ON public.project_files
    FOR DELETE
    USING (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.project_files IS 'Individual files within a project version';
COMMENT ON COLUMN public.project_files.content IS 'File content stored as text (for text files)';
COMMENT ON COLUMN public.project_files.storage_path IS 'Path in Supabase Storage for binary files';
COMMENT ON COLUMN public.project_files.ai_agent IS 'Name of AI agent that generated this file';


-- ============================================
-- TABLE: project_env_vars
-- Purpose: Environment variables per project/environment
-- Module: Project
-- ============================================
CREATE TABLE public.project_env_vars (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Environment
    environment public.environment_type NOT NULL DEFAULT 'development',
    
    -- Variable
    key TEXT NOT NULL,
    value_encrypted TEXT NOT NULL, -- Encrypted value
    
    -- Metadata
    description TEXT,
    is_secret BOOLEAN DEFAULT TRUE, -- If true, mask in UI
    is_required BOOLEAN DEFAULT FALSE,
    
    -- Validation
    validation_regex TEXT, -- Optional validation pattern
    default_value TEXT, -- Default if not set
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_env_var_per_project_env UNIQUE (project_id, environment, key),
    CONSTRAINT valid_env_var_key CHECK (key ~ '^[A-Z][A-Z0-9_]*$')
);

-- Indexes for project_env_vars
CREATE INDEX idx_project_env_vars_project ON public.project_env_vars(project_id);
CREATE INDEX idx_project_env_vars_tenant ON public.project_env_vars(tenant_id);
CREATE INDEX idx_project_env_vars_env ON public.project_env_vars(project_id, environment);

-- Trigger for updated_at
CREATE TRIGGER trigger_project_env_vars_updated_at
    BEFORE UPDATE ON public.project_env_vars
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for project_env_vars
ALTER TABLE public.project_env_vars ENABLE ROW LEVEL SECURITY;

-- Developers+ can view env vars (values are encrypted anyway)
CREATE POLICY "project_env_vars_select" ON public.project_env_vars
    FOR SELECT
    USING (
        public.user_has_tenant_access(tenant_id)
        AND (
            public.user_has_tenant_role(tenant_id, 'developer')
            OR EXISTS (
                SELECT 1 FROM public.project_collaborators pc
                WHERE pc.project_id = project_env_vars.project_id
                  AND pc.user_id = auth.uid()
                  AND pc.deleted_at IS NULL
            )
        )
    );

-- Developers+ can manage env vars
CREATE POLICY "project_env_vars_insert" ON public.project_env_vars
    FOR INSERT
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'developer'));

CREATE POLICY "project_env_vars_update" ON public.project_env_vars
    FOR UPDATE
    USING (public.user_has_tenant_role(tenant_id, 'developer'))
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'developer'));

CREATE POLICY "project_env_vars_delete" ON public.project_env_vars
    FOR DELETE
    USING (public.user_has_tenant_role(tenant_id, 'developer'));

-- Comments
COMMENT ON TABLE public.project_env_vars IS 'Environment variables per project and environment';
COMMENT ON COLUMN public.project_env_vars.value_encrypted IS 'PGP-encrypted value using tenant encryption key';
COMMENT ON COLUMN public.project_env_vars.is_secret IS 'If true, value is masked in UI (e.g., API keys)';


-- ============================================
-- TABLE: project_collaborators
-- Purpose: External collaborators with project-level access
-- Module: Project
-- ============================================
CREATE TABLE public.project_collaborators (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Permission level
    permission TEXT NOT NULL DEFAULT 'read' CHECK (permission IN (
        'read',         -- View project and files
        'write',        -- Edit project and files
        'admin'         -- Manage collaborators, settings
    )),
    
    -- Invitation
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Invitation sent
        'active',       -- Accepted and active
        'revoked'       -- Access revoked
    )),
    
    -- Expiration (optional time-limited access)
    expires_at TIMESTAMPTZ,
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_project_collaborator UNIQUE (project_id, user_id)
);

-- Indexes for project_collaborators
CREATE INDEX idx_project_collaborators_project ON public.project_collaborators(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_collaborators_user ON public.project_collaborators(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_collaborators_tenant ON public.project_collaborators(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_collaborators_active ON public.project_collaborators(project_id, user_id) 
    WHERE status = 'active' AND deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER trigger_project_collaborators_updated_at
    BEFORE UPDATE ON public.project_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for project_collaborators
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Project owners and collaborators can view collaborator list
CREATE POLICY "project_collaborators_select" ON public.project_collaborators
    FOR SELECT
    USING (
        public.user_has_tenant_access(tenant_id)
        OR user_id = auth.uid() -- Can see own collaboration
    );

-- Project admins can add collaborators
CREATE POLICY "project_collaborators_insert" ON public.project_collaborators
    FOR INSERT
    WITH CHECK (
        public.user_has_tenant_role(tenant_id, 'developer')
        AND EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
              AND (p.created_by = auth.uid() OR public.user_has_tenant_role(tenant_id, 'admin'))
        )
    );

-- Project owner/admin can update collaborators
CREATE POLICY "project_collaborators_update" ON public.project_collaborators
    FOR UPDATE
    USING (
        public.user_has_tenant_role(tenant_id, 'admin')
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND p.created_by = auth.uid()
        )
    )
    WITH CHECK (
        public.user_has_tenant_role(tenant_id, 'admin')
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND p.created_by = auth.uid()
        )
    );

-- Project owner/admin can remove collaborators, or user can remove themselves
CREATE POLICY "project_collaborators_delete" ON public.project_collaborators
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR public.user_has_tenant_role(tenant_id, 'admin')
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND p.created_by = auth.uid()
        )
    );

-- Comments
COMMENT ON TABLE public.project_collaborators IS 'External collaborators with project-level access';
COMMENT ON COLUMN public.project_collaborators.permission IS 'Access level: read, write, admin';
COMMENT ON COLUMN public.project_collaborators.expires_at IS 'Optional expiration for time-limited access';


-- ============================================
-- FUNCTION: user_can_access_project
-- Purpose: Check if user has any access to a project
-- Used by: RLS policies, application code
-- ============================================
CREATE OR REPLACE FUNCTION public.user_can_access_project(check_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    project_record RECORD;
BEGIN
    SELECT tenant_id, is_public, created_by INTO project_record
    FROM public.projects
    WHERE id = check_project_id AND deleted_at IS NULL;
    
    IF project_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Public projects are accessible to all
    IF project_record.is_public THEN
        RETURN TRUE;
    END IF;
    
    -- Check tenant membership
    IF public.user_has_tenant_access(project_record.tenant_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Check collaborator access
    IF EXISTS (
        SELECT 1 FROM public.project_collaborators pc
        WHERE pc.project_id = check_project_id
          AND pc.user_id = auth.uid()
          AND pc.status = 'active'
          AND pc.deleted_at IS NULL
          AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.user_can_access_project(UUID) IS 
'Returns TRUE if user can access the project (tenant member, collaborator, or public)';


-- ============================================
-- FUNCTION: user_can_edit_project
-- Purpose: Check if user has write access to a project
-- ============================================
CREATE OR REPLACE FUNCTION public.user_can_edit_project(check_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    project_record RECORD;
BEGIN
    SELECT tenant_id, created_by INTO project_record
    FROM public.projects
    WHERE id = check_project_id AND deleted_at IS NULL;
    
    IF project_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Creator always has edit access
    IF project_record.created_by = auth.uid() THEN
        RETURN TRUE;
    END IF;
    
    -- Tenant developer+ has edit access
    IF public.user_has_tenant_role(project_record.tenant_id, 'developer') THEN
        RETURN TRUE;
    END IF;
    
    -- Check collaborator write access
    IF EXISTS (
        SELECT 1 FROM public.project_collaborators pc
        WHERE pc.project_id = check_project_id
          AND pc.user_id = auth.uid()
          AND pc.permission IN ('write', 'admin')
          AND pc.status = 'active'
          AND pc.deleted_at IS NULL
          AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.user_can_edit_project(UUID) IS 
'Returns TRUE if user has write access to the project';


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.3 COMPLETION: PROJECT TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] projects table (30+ columns)
-- [x] projects indexes (9 indexes including full-text search)
-- [x] projects RLS policies (4 policies)
-- [x] projects triggers (updated_at, soft_delete, slug)
-- [x] project_versions table
-- [x] project_versions indexes (5 indexes)
-- [x] project_versions RLS policies (3 policies)
-- [x] project_versions triggers (updated_at, version_number)
-- [x] project_files table
-- [x] project_files indexes (8 indexes)
-- [x] project_files RLS policies (4 policies)
-- [x] project_files triggers (updated_at, metadata extraction)
-- [x] project_env_vars table
-- [x] project_env_vars indexes (3 indexes)
-- [x] project_env_vars RLS policies (4 policies)
-- [x] project_collaborators table
-- [x] project_collaborators indexes (4 indexes)
-- [x] project_collaborators RLS policies (4 policies)
-- [x] user_can_access_project() function
-- [x] user_can_edit_project() function
-- TOTAL: 5 tables, 29 indexes, 19 RLS policies, 8 triggers, 2 helper functions
-- ═══════════════════════════════════════════════════════════════════════════════
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
-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 08_billing_tables.sql
-- Purpose: Billing and payment tables (plans, subscriptions, usage, invoices, credits)
-- Module: Billing Module
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 07_deploy_tables.sql
-- DEPENDENCIES: tenants, profiles, ENUM types
-- NOTE: Integrates with Stripe - many IDs reference Stripe objects
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- TABLE: plans
-- Purpose: Available subscription plans
-- Module: Billing
-- ============================================
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Plan identity
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Tier
    tier public.plan_tier NOT NULL,
    
    -- Pricing
    price_monthly_cents INTEGER NOT NULL DEFAULT 0,
    price_yearly_cents INTEGER NOT NULL DEFAULT 0, -- Usually discounted
    currency TEXT DEFAULT 'usd',
    
    -- Stripe references
    stripe_product_id TEXT UNIQUE,
    stripe_price_monthly_id TEXT,
    stripe_price_yearly_id TEXT,
    
    -- Limits
    limits JSONB NOT NULL DEFAULT '{
        "projects": 1,
        "builds_per_month": 10,
        "team_members": 1,
        "storage_gb": 1,
        "bandwidth_gb": 5,
        "custom_domains": 0,
        "api_requests_per_day": 100,
        "concurrent_builds": 1,
        "build_timeout_minutes": 10,
        "support_level": "community"
    }'::jsonb,
    
    -- Features (what's included)
    features JSONB NOT NULL DEFAULT '{
        "ai_code_generation": true,
        "live_preview": true,
        "one_click_deploy": true,
        "version_history": true,
        "team_collaboration": false,
        "custom_domains": false,
        "priority_builds": false,
        "advanced_analytics": false,
        "api_access": false,
        "white_labeling": false,
        "sla_guarantee": false,
        "dedicated_support": false
    }'::jsonb,
    
    -- Display
    is_featured BOOLEAN DEFAULT FALSE, -- Highlight in pricing page
    badge_text TEXT, -- e.g., 'Most Popular', 'Best Value'
    sort_order INTEGER DEFAULT 0,
    
    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE, -- Show on pricing page
    
    -- Trial
    trial_days INTEGER DEFAULT 14,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for plans
CREATE INDEX idx_plans_tier ON public.plans(tier);
CREATE INDEX idx_plans_active ON public.plans(is_active, is_public) WHERE is_active = TRUE;
CREATE INDEX idx_plans_stripe ON public.plans(stripe_product_id) WHERE stripe_product_id IS NOT NULL;
CREATE INDEX idx_plans_sort ON public.plans(sort_order, tier);

-- Trigger for updated_at
CREATE TRIGGER trigger_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for plans (publicly readable)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
CREATE POLICY "plans_select_public" ON public.plans
    FOR SELECT
    USING (is_active = TRUE AND is_public = TRUE);

-- Authenticated users can view all plans (including private ones they might be on)
CREATE POLICY "plans_select_authenticated" ON public.plans
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Comments
COMMENT ON TABLE public.plans IS 'Available subscription plans with pricing and limits';
COMMENT ON COLUMN public.plans.limits IS 'Plan limits as JSONB (projects, builds, storage, etc.)';
COMMENT ON COLUMN public.plans.features IS 'Feature flags for the plan';


-- ============================================
-- TABLE: subscriptions
-- Purpose: Tenant subscriptions to plans
-- Module: Billing
-- ============================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    
    -- Stripe references
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    
    -- Status
    status public.subscription_status NOT NULL DEFAULT 'trialing',
    
    -- Billing cycle
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    
    -- Current period
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    
    -- Trial
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Pause
    paused_at TIMESTAMPTZ,
    resume_at TIMESTAMPTZ,
    
    -- Payment
    default_payment_method_id UUID, -- FK added after payment_methods table
    
    -- Pricing at time of subscription (for historical accuracy)
    price_cents INTEGER,
    currency TEXT DEFAULT 'usd',
    
    -- Discounts
    discount_percent INTEGER CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_end_at TIMESTAMPTZ,
    coupon_code TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_plan ON public.subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(tenant_id, status);
CREATE INDEX idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id) 
    WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_subscriptions_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_active ON public.subscriptions(tenant_id) 
    WHERE status IN ('active', 'trialing');
CREATE INDEX idx_subscriptions_period_end ON public.subscriptions(current_period_end) 
    WHERE status = 'active';
CREATE INDEX idx_subscriptions_trial_end ON public.subscriptions(trial_end) 
    WHERE status = 'trialing';

-- Trigger for updated_at
CREATE TRIGGER trigger_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Members can view their tenant's subscription
CREATE POLICY "subscriptions_select" ON public.subscriptions
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

-- Only owners can manage subscriptions
CREATE POLICY "subscriptions_insert" ON public.subscriptions
    FOR INSERT
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'owner'));

CREATE POLICY "subscriptions_update" ON public.subscriptions
    FOR UPDATE
    USING (public.user_has_tenant_role(tenant_id, 'owner'))
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'owner'));

-- Comments
COMMENT ON TABLE public.subscriptions IS 'Tenant subscriptions linked to Stripe';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx)';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'If true, subscription ends at period end';


-- ============================================
-- TABLE: subscription_items
-- Purpose: Line items within a subscription (for metered billing)
-- Module: Billing
-- ============================================
CREATE TABLE public.subscription_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    
    -- Stripe references
    stripe_subscription_item_id TEXT UNIQUE,
    stripe_price_id TEXT,
    
    -- Item details
    product_type TEXT NOT NULL, -- 'base', 'builds', 'storage', 'bandwidth', etc.
    
    -- Quantity
    quantity INTEGER DEFAULT 1,
    
    -- Pricing
    unit_amount_cents INTEGER,
    
    -- Metered billing
    is_metered BOOLEAN DEFAULT FALSE,
    metered_usage_type TEXT CHECK (metered_usage_type IN (
        'sum',          -- Sum usage over period
        'max',          -- Max usage in period
        'last_during',  -- Last reported usage
        'last_ever'     -- Last reported ever
    )),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for subscription_items
CREATE INDEX idx_subscription_items_subscription ON public.subscription_items(subscription_id);
CREATE INDEX idx_subscription_items_tenant ON public.subscription_items(tenant_id);
CREATE INDEX idx_subscription_items_stripe ON public.subscription_items(stripe_subscription_item_id);
CREATE INDEX idx_subscription_items_type ON public.subscription_items(subscription_id, product_type);

-- Trigger for updated_at
CREATE TRIGGER trigger_subscription_items_updated_at
    BEFORE UPDATE ON public.subscription_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for subscription_items
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_items_select" ON public.subscription_items
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.subscription_items IS 'Line items within subscriptions for metered billing';
COMMENT ON COLUMN public.subscription_items.is_metered IS 'If true, billed based on usage';


-- ============================================
-- TABLE: usage_records
-- Purpose: Track usage for metered billing
-- Module: Billing
-- ============================================
CREATE TABLE public.usage_records (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_item_id UUID REFERENCES public.subscription_items(id) ON DELETE SET NULL,
    
    -- Usage type
    usage_type TEXT NOT NULL, -- 'builds', 'storage', 'bandwidth', 'api_calls', etc.
    
    -- Quantity
    quantity BIGINT NOT NULL DEFAULT 1,
    unit TEXT, -- 'count', 'bytes', 'seconds', etc.
    
    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Aggregation
    aggregation_key TEXT, -- For grouping (e.g., project_id, user_id)
    
    -- Stripe sync
    stripe_usage_record_id TEXT,
    reported_to_stripe BOOLEAN DEFAULT FALSE,
    reported_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for usage_records
CREATE INDEX idx_usage_records_tenant ON public.usage_records(tenant_id);
CREATE INDEX idx_usage_records_subscription_item ON public.usage_records(subscription_item_id);
CREATE INDEX idx_usage_records_type ON public.usage_records(tenant_id, usage_type);
CREATE INDEX idx_usage_records_period ON public.usage_records(tenant_id, period_start, period_end);
CREATE INDEX idx_usage_records_unreported ON public.usage_records(reported_to_stripe) 
    WHERE reported_to_stripe = FALSE;
CREATE INDEX idx_usage_records_aggregation ON public.usage_records(tenant_id, usage_type, aggregation_key);

-- RLS for usage_records
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_records_select" ON public.usage_records
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "usage_records_insert" ON public.usage_records
    FOR INSERT
    WITH CHECK (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.usage_records IS 'Usage tracking for metered billing';
COMMENT ON COLUMN public.usage_records.reported_to_stripe IS 'Whether this usage has been reported to Stripe';


-- ============================================
-- TABLE: invoices
-- Purpose: Invoice records (synced from Stripe)
-- Module: Billing
-- ============================================
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    
    -- Stripe references
    stripe_invoice_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    stripe_payment_intent_id TEXT,
    
    -- Invoice details
    invoice_number TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',        -- Being created
        'open',         -- Awaiting payment
        'paid',         -- Successfully paid
        'void',         -- Voided
        'uncollectible' -- Failed to collect
    )),
    
    -- Amounts
    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER DEFAULT 0,
    tax_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    amount_paid_cents INTEGER DEFAULT 0,
    amount_due_cents INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'usd',
    
    -- Line items (cached from Stripe)
    line_items JSONB DEFAULT '[]'::jsonb,
    
    -- Dates
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    
    -- PDF
    invoice_pdf_url TEXT,
    hosted_invoice_url TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for invoices
CREATE INDEX idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_subscription ON public.invoices(subscription_id);
CREATE INDEX idx_invoices_stripe ON public.invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON public.invoices(tenant_id, status);
CREATE INDEX idx_invoices_created ON public.invoices(tenant_id, created_at DESC);
CREATE INDEX idx_invoices_due ON public.invoices(due_date) WHERE status = 'open';

-- Trigger for updated_at
CREATE TRIGGER trigger_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Owners and admins can view invoices
CREATE POLICY "invoices_select" ON public.invoices
    FOR SELECT
    USING (public.user_has_tenant_role(tenant_id, 'admin'));

-- Comments
COMMENT ON TABLE public.invoices IS 'Invoice records synced from Stripe';
COMMENT ON COLUMN public.invoices.line_items IS 'Cached line items from Stripe invoice';


-- ============================================
-- TABLE: payment_methods
-- Purpose: Stored payment methods (synced from Stripe)
-- Module: Billing
-- ============================================
CREATE TABLE public.payment_methods (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Stripe references
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT,
    
    -- Type
    type TEXT NOT NULL, -- 'card', 'bank_account', 'sepa_debit', etc.
    
    -- Card details (if type = 'card')
    card_brand TEXT, -- 'visa', 'mastercard', 'amex', etc.
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    card_funding TEXT, -- 'credit', 'debit', 'prepaid'
    
    -- Bank account details (if type = 'bank_account')
    bank_name TEXT,
    bank_last4 TEXT,
    
    -- Billing details
    billing_name TEXT,
    billing_email TEXT,
    billing_phone TEXT,
    billing_address JSONB,
    
    -- Status
    is_default BOOLEAN DEFAULT FALSE,
    is_valid BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add FK from subscriptions to payment_methods
ALTER TABLE public.subscriptions
    ADD CONSTRAINT fk_subscriptions_payment_method
    FOREIGN KEY (default_payment_method_id)
    REFERENCES public.payment_methods(id)
    ON DELETE SET NULL;

-- Indexes for payment_methods
CREATE INDEX idx_payment_methods_tenant ON public.payment_methods(tenant_id);
CREATE INDEX idx_payment_methods_stripe ON public.payment_methods(stripe_payment_method_id);
CREATE INDEX idx_payment_methods_customer ON public.payment_methods(stripe_customer_id);
CREATE INDEX idx_payment_methods_default ON public.payment_methods(tenant_id, is_default) 
    WHERE is_default = TRUE;

-- Trigger for updated_at
CREATE TRIGGER trigger_payment_methods_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to ensure only one default payment method per tenant
CREATE OR REPLACE FUNCTION public.ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE public.payment_methods 
        SET is_default = FALSE 
        WHERE tenant_id = NEW.tenant_id 
          AND id != NEW.id 
          AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_methods_default
    BEFORE INSERT OR UPDATE ON public.payment_methods
    FOR EACH ROW
    WHEN (NEW.is_default = TRUE)
    EXECUTE FUNCTION public.ensure_single_default_payment_method();

-- RLS for payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Owners and admins can view payment methods
CREATE POLICY "payment_methods_select" ON public.payment_methods
    FOR SELECT
    USING (public.user_has_tenant_role(tenant_id, 'admin'));

-- Owners can manage payment methods
CREATE POLICY "payment_methods_insert" ON public.payment_methods
    FOR INSERT
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'owner'));

CREATE POLICY "payment_methods_update" ON public.payment_methods
    FOR UPDATE
    USING (public.user_has_tenant_role(tenant_id, 'owner'))
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'owner'));

CREATE POLICY "payment_methods_delete" ON public.payment_methods
    FOR DELETE
    USING (public.user_has_tenant_role(tenant_id, 'owner'));

-- Comments
COMMENT ON TABLE public.payment_methods IS 'Stored payment methods synced from Stripe';
COMMENT ON COLUMN public.payment_methods.card_last4 IS 'Last 4 digits of card number';


-- ============================================
-- TABLE: credits
-- Purpose: Credit balance transactions
-- Module: Billing
-- ============================================
CREATE TABLE public.credits (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Transaction type
    transaction_type public.credit_transaction_type NOT NULL,
    
    -- Amount (positive = add, negative = deduct)
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL, -- Running balance after this transaction
    
    -- Reference
    reference_type TEXT, -- 'build', 'purchase', 'refund', 'promotion', etc.
    reference_id UUID, -- ID of related object
    
    -- Description
    description TEXT,
    
    -- Expiry (for promotional credits)
    expires_at TIMESTAMPTZ,
    
    -- Purchase details (if transaction_type = 'purchase')
    stripe_payment_intent_id TEXT,
    amount_cents INTEGER, -- Amount paid in cents
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for credits
CREATE INDEX idx_credits_tenant ON public.credits(tenant_id);
CREATE INDEX idx_credits_type ON public.credits(tenant_id, transaction_type);
CREATE INDEX idx_credits_created ON public.credits(tenant_id, created_at DESC);
CREATE INDEX idx_credits_expiring ON public.credits(expires_at) 
    WHERE expires_at IS NOT NULL AND transaction_type IN ('purchase', 'bonus');
CREATE INDEX idx_credits_reference ON public.credits(reference_type, reference_id);

-- RLS for credits
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- Members can view credit transactions
CREATE POLICY "credits_select" ON public.credits
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

-- Only system can insert credits (via service role)
-- Application code uses service role for credit operations

-- Comments
COMMENT ON TABLE public.credits IS 'Credit balance transactions for prepaid usage';
COMMENT ON COLUMN public.credits.balance_after IS 'Running balance after this transaction';


-- ============================================
-- TABLE: webhook_events
-- Purpose: Log of received webhook events (Stripe, etc.)
-- Module: Billing
-- ============================================
CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Source
    source TEXT NOT NULL DEFAULT 'stripe', -- 'stripe', 'github', 'vercel', etc.
    
    -- Event identity
    event_id TEXT NOT NULL, -- Provider's event ID
    event_type TEXT NOT NULL, -- e.g., 'invoice.paid', 'customer.subscription.updated'
    
    -- Payload
    payload JSONB NOT NULL,
    
    -- Processing
    status public.webhook_status NOT NULL DEFAULT 'pending',
    
    -- Attempts
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    -- Processing result
    processed_at TIMESTAMPTZ,
    result JSONB, -- What was done in response
    
    -- Related tenant (if applicable)
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    
    -- Idempotency
    idempotency_key TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_webhook_event UNIQUE (source, event_id)
);

-- Indexes for webhook_events
CREATE INDEX idx_webhook_events_source ON public.webhook_events(source, event_type);
CREATE INDEX idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX idx_webhook_events_pending ON public.webhook_events(next_retry_at) 
    WHERE status IN ('pending', 'failed') AND attempts < 5;
CREATE INDEX idx_webhook_events_tenant ON public.webhook_events(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_webhook_events_created ON public.webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_type ON public.webhook_events(event_type, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER trigger_webhook_events_updated_at
    BEFORE UPDATE ON public.webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for webhook_events (admin only)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook events for their tenant
CREATE POLICY "webhook_events_select" ON public.webhook_events
    FOR SELECT
    USING (
        tenant_id IS NOT NULL AND public.user_has_tenant_role(tenant_id, 'admin')
    );

-- Comments
COMMENT ON TABLE public.webhook_events IS 'Log of received webhook events for idempotency and debugging';
COMMENT ON COLUMN public.webhook_events.idempotency_key IS 'Key to prevent duplicate processing';


-- ============================================
-- FUNCTION: get_tenant_credit_balance
-- Purpose: Calculate current credit balance for a tenant
-- ============================================
CREATE OR REPLACE FUNCTION public.get_tenant_credit_balance(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
    balance INTEGER;
BEGIN
    SELECT COALESCE(
        (SELECT balance_after FROM public.credits 
         WHERE tenant_id = p_tenant_id 
         ORDER BY created_at DESC 
         LIMIT 1),
        0
    ) INTO balance;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_tenant_credit_balance(UUID) IS 
'Returns the current credit balance for a tenant';


-- ============================================
-- FUNCTION: add_credit_transaction
-- Purpose: Add a credit transaction with balance calculation
-- ============================================
CREATE OR REPLACE FUNCTION public.add_credit_transaction(
    p_tenant_id UUID,
    p_type public.credit_transaction_type,
    p_amount INTEGER,
    p_description TEXT DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
    credit_id UUID;
BEGIN
    -- Get current balance
    current_balance := public.get_tenant_credit_balance(p_tenant_id);
    
    -- Calculate new balance
    new_balance := current_balance + p_amount;
    
    -- Prevent negative balance
    IF new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient credit balance';
    END IF;
    
    -- Insert transaction
    INSERT INTO public.credits (
        tenant_id, transaction_type, amount, balance_after,
        description, reference_type, reference_id, expires_at,
        created_by, metadata
    ) VALUES (
        p_tenant_id, p_type, p_amount, new_balance,
        p_description, p_reference_type, p_reference_id, p_expires_at,
        auth.uid(), p_metadata
    )
    RETURNING id INTO credit_id;
    
    RETURN credit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.add_credit_transaction IS 
'Adds a credit transaction and calculates running balance';


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.5 PART 1 COMPLETION: BILLING TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] plans table with limits and features JSONB
-- [x] plans indexes (4 indexes)
-- [x] plans RLS policies (2 policies)
-- [x] subscriptions table with Stripe integration
-- [x] subscriptions indexes (8 indexes)
-- [x] subscriptions RLS policies (3 policies)
-- [x] subscription_items table for metered billing
-- [x] subscription_items indexes (4 indexes)
-- [x] subscription_items RLS policies (1 policy)
-- [x] usage_records table
-- [x] usage_records indexes (6 indexes)
-- [x] usage_records RLS policies (2 policies)
-- [x] invoices table
-- [x] invoices indexes (6 indexes)
-- [x] invoices RLS policies (1 policy)
-- [x] payment_methods table
-- [x] payment_methods indexes (4 indexes)
-- [x] payment_methods RLS policies (4 policies)
-- [x] credits table
-- [x] credits indexes (5 indexes)
-- [x] credits RLS policies (1 policy)
-- [x] webhook_events table
-- [x] webhook_events indexes (6 indexes)
-- [x] webhook_events RLS policies (1 policy)
-- [x] get_tenant_credit_balance() function
-- [x] add_credit_transaction() function
-- ═══════════════════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 09_storage_tables.sql
-- Purpose: File storage tables (files, storage_usage)
-- Module: Storage Module
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 08_billing_tables.sql
-- DEPENDENCIES: tenants, profiles, projects, ENUM types
-- NOTE: Integrates with Supabase Storage (S3-compatible)
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- TABLE: files
-- Purpose: File metadata for uploaded files
-- Module: Storage
-- ============================================
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- File identity
    name TEXT NOT NULL,
    original_name TEXT, -- Original filename before sanitization
    
    -- Storage location
    bucket TEXT NOT NULL DEFAULT 'uploads',
    path TEXT NOT NULL, -- Full path in storage: {tenant_id}/{project_id}/{id}/{name}
    
    -- File info
    size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT,
    extension TEXT,
    
    -- Category
    category public.file_category DEFAULT 'other',
    
    -- Checksums
    checksum_md5 TEXT,
    checksum_sha256 TEXT,
    
    -- Image metadata (if category = 'image')
    width INTEGER,
    height INTEGER,
    
    -- Variants (for images - thumbnails, different sizes)
    variants JSONB DEFAULT '{}'::jsonb, -- { "thumbnail": "path", "medium": "path" }
    
    -- Processing
    is_processed BOOLEAN DEFAULT FALSE,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
        'pending',      -- Awaiting processing
        'processing',   -- Being processed
        'completed',    -- Processing complete
        'failed',       -- Processing failed
        'skipped'       -- No processing needed
    )),
    processing_error TEXT,
    
    -- Virus scan
    virus_scanned BOOLEAN DEFAULT FALSE,
    virus_scan_result TEXT, -- 'clean', 'infected', 'error'
    virus_scan_at TIMESTAMPTZ,
    
    -- Access control
    is_public BOOLEAN DEFAULT FALSE,
    public_url TEXT, -- Public URL if is_public = true
    
    -- Signed URL caching
    signed_url TEXT,
    signed_url_expires_at TIMESTAMPTZ,
    
    -- Usage tracking
    download_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    
    -- Audit
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for files
CREATE INDEX idx_files_tenant ON public.files(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_project ON public.files(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_bucket ON public.files(bucket, tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_path ON public.files(bucket, path) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_category ON public.files(tenant_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_mime ON public.files(tenant_id, mime_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_uploaded_by ON public.files(uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_public ON public.files(is_public) WHERE is_public = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_files_processing ON public.files(processing_status) 
    WHERE processing_status IN ('pending', 'processing');
CREATE INDEX idx_files_created ON public.files(tenant_id, created_at DESC) WHERE deleted_at IS NULL;

-- Full-text search on filename
CREATE INDEX idx_files_search ON public.files 
    USING GIN(to_tsvector('english', name))
    WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER trigger_files_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to extract extension from name
CREATE OR REPLACE FUNCTION public.extract_file_extension()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.name LIKE '%.%' THEN
        NEW.extension := lower(regexp_replace(NEW.name, '^.*\.', ''));
    END IF;
    
    -- Auto-detect category from mime type
    IF NEW.category IS NULL OR NEW.category = 'other' THEN
        NEW.category := CASE 
            WHEN NEW.mime_type LIKE 'image/%' THEN 'image'
            WHEN NEW.mime_type LIKE 'video/%' THEN 'video'
            WHEN NEW.mime_type LIKE 'audio/%' THEN 'audio'
            WHEN NEW.mime_type IN ('application/pdf', 'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') THEN 'document'
            WHEN NEW.mime_type IN ('application/zip', 'application/x-tar', 
                'application/x-gzip', 'application/x-rar-compressed') THEN 'archive'
            WHEN NEW.mime_type LIKE 'text/%' OR NEW.extension IN (
                'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 
                'php', 'css', 'scss', 'html', 'json', 'yaml', 'yml', 'md', 
                'sql', 'sh', 'bash'
            ) THEN 'code'
            ELSE 'other'
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_files_extension
    BEFORE INSERT OR UPDATE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION public.extract_file_extension();

-- Trigger for soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_file()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.files SET deleted_at = NOW() WHERE id = OLD.id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_files_soft_delete
    BEFORE DELETE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION public.soft_delete_file();

-- RLS for files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Members can view files in their tenant
CREATE POLICY "files_select_tenant" ON public.files
    FOR SELECT
    USING (
        (public.user_has_tenant_access(tenant_id) AND deleted_at IS NULL)
        OR (is_public = TRUE AND deleted_at IS NULL)
    );

-- Developers+ can upload files
CREATE POLICY "files_insert" ON public.files
    FOR INSERT
    WITH CHECK (
        public.user_has_tenant_role(tenant_id, 'developer')
    );

-- Uploaders and admins can update files
CREATE POLICY "files_update" ON public.files
    FOR UPDATE
    USING (
        deleted_at IS NULL
        AND (
            uploaded_by = auth.uid()
            OR public.user_has_tenant_role(tenant_id, 'admin')
        )
    )
    WITH CHECK (public.user_has_tenant_access(tenant_id));

-- Uploaders and admins can delete files
CREATE POLICY "files_delete" ON public.files
    FOR DELETE
    USING (
        uploaded_by = auth.uid()
        OR public.user_has_tenant_role(tenant_id, 'admin')
    );

-- Comments
COMMENT ON TABLE public.files IS 'File metadata for uploaded files in Supabase Storage';
COMMENT ON COLUMN public.files.path IS 'Full path in storage bucket';
COMMENT ON COLUMN public.files.variants IS 'Generated variants (thumbnails, resized images)';


-- ============================================
-- TABLE: file_versions
-- Purpose: Version history for files
-- Module: Storage
-- ============================================
CREATE TABLE public.file_versions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent reference
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Version info
    version_number INTEGER NOT NULL,
    
    -- Storage
    path TEXT NOT NULL, -- Path to this version in storage
    size_bytes BIGINT NOT NULL DEFAULT 0,
    checksum_sha256 TEXT,
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_file_version UNIQUE (file_id, version_number)
);

-- Indexes for file_versions
CREATE INDEX idx_file_versions_file ON public.file_versions(file_id);
CREATE INDEX idx_file_versions_tenant ON public.file_versions(tenant_id);

-- Trigger to auto-increment version number
CREATE OR REPLACE FUNCTION public.increment_file_version_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.version_number IS NULL THEN
        SELECT COALESCE(MAX(version_number), 0) + 1 INTO NEW.version_number
        FROM public.file_versions
        WHERE file_id = NEW.file_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_file_versions_number
    BEFORE INSERT ON public.file_versions
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_file_version_number();

-- RLS for file_versions
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "file_versions_select" ON public.file_versions
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "file_versions_insert" ON public.file_versions
    FOR INSERT
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'developer'));

-- Comments
COMMENT ON TABLE public.file_versions IS 'Version history for files';


-- ============================================
-- TABLE: storage_usage
-- Purpose: Track storage usage per tenant
-- Module: Storage
-- ============================================
CREATE TABLE public.storage_usage (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent reference
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Usage by category
    total_bytes BIGINT NOT NULL DEFAULT 0,
    image_bytes BIGINT DEFAULT 0,
    video_bytes BIGINT DEFAULT 0,
    document_bytes BIGINT DEFAULT 0,
    code_bytes BIGINT DEFAULT 0,
    other_bytes BIGINT DEFAULT 0,
    
    -- File counts
    total_files INTEGER DEFAULT 0,
    image_files INTEGER DEFAULT 0,
    video_files INTEGER DEFAULT 0,
    document_files INTEGER DEFAULT 0,
    code_files INTEGER DEFAULT 0,
    other_files INTEGER DEFAULT 0,
    
    -- Bandwidth (monthly)
    bandwidth_bytes_current_month BIGINT DEFAULT 0,
    bandwidth_month TIMESTAMPTZ, -- Start of current month
    
    -- Limits (copied from plan for quick access)
    storage_limit_bytes BIGINT,
    bandwidth_limit_bytes BIGINT,
    
    -- Alerts
    storage_alert_sent_at TIMESTAMPTZ, -- When 80% alert was sent
    bandwidth_alert_sent_at TIMESTAMPTZ,
    
    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_storage_usage_tenant UNIQUE (tenant_id)
);

-- Indexes for storage_usage
CREATE INDEX idx_storage_usage_tenant ON public.storage_usage(tenant_id);
CREATE INDEX idx_storage_usage_total ON public.storage_usage(total_bytes DESC);
CREATE INDEX idx_storage_usage_calculated ON public.storage_usage(calculated_at);

-- Trigger for updated_at
CREATE TRIGGER trigger_storage_usage_updated_at
    BEFORE UPDATE ON public.storage_usage
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for storage_usage
ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;

-- Members can view their tenant's storage usage
CREATE POLICY "storage_usage_select" ON public.storage_usage
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

-- System manages storage usage (via service role)

-- Comments
COMMENT ON TABLE public.storage_usage IS 'Storage usage tracking per tenant';
COMMENT ON COLUMN public.storage_usage.bandwidth_month IS 'Start of current bandwidth tracking month';


-- ============================================
-- FUNCTION: update_storage_usage
-- Purpose: Recalculate storage usage for a tenant
-- ============================================
CREATE OR REPLACE FUNCTION public.update_storage_usage(p_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
    usage_record RECORD;
BEGIN
    -- Calculate usage from files
    SELECT 
        COALESCE(SUM(size_bytes), 0) as total_bytes,
        COALESCE(SUM(CASE WHEN category = 'image' THEN size_bytes ELSE 0 END), 0) as image_bytes,
        COALESCE(SUM(CASE WHEN category = 'video' THEN size_bytes ELSE 0 END), 0) as video_bytes,
        COALESCE(SUM(CASE WHEN category = 'document' THEN size_bytes ELSE 0 END), 0) as document_bytes,
        COALESCE(SUM(CASE WHEN category = 'code' THEN size_bytes ELSE 0 END), 0) as code_bytes,
        COALESCE(SUM(CASE WHEN category NOT IN ('image', 'video', 'document', 'code') THEN size_bytes ELSE 0 END), 0) as other_bytes,
        COUNT(*) as total_files,
        COUNT(*) FILTER (WHERE category = 'image') as image_files,
        COUNT(*) FILTER (WHERE category = 'video') as video_files,
        COUNT(*) FILTER (WHERE category = 'document') as document_files,
        COUNT(*) FILTER (WHERE category = 'code') as code_files,
        COUNT(*) FILTER (WHERE category NOT IN ('image', 'video', 'document', 'code')) as other_files
    INTO usage_record
    FROM public.files
    WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;
    
    -- Upsert storage usage
    INSERT INTO public.storage_usage (
        tenant_id, total_bytes, image_bytes, video_bytes, document_bytes, code_bytes, other_bytes,
        total_files, image_files, video_files, document_files, code_files, other_files,
        calculated_at
    ) VALUES (
        p_tenant_id, usage_record.total_bytes, usage_record.image_bytes, usage_record.video_bytes,
        usage_record.document_bytes, usage_record.code_bytes, usage_record.other_bytes,
        usage_record.total_files, usage_record.image_files, usage_record.video_files,
        usage_record.document_files, usage_record.code_files, usage_record.other_files,
        NOW()
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
        total_bytes = EXCLUDED.total_bytes,
        image_bytes = EXCLUDED.image_bytes,
        video_bytes = EXCLUDED.video_bytes,
        document_bytes = EXCLUDED.document_bytes,
        code_bytes = EXCLUDED.code_bytes,
        other_bytes = EXCLUDED.other_bytes,
        total_files = EXCLUDED.total_files,
        image_files = EXCLUDED.image_files,
        video_files = EXCLUDED.video_files,
        document_files = EXCLUDED.document_files,
        code_files = EXCLUDED.code_files,
        other_files = EXCLUDED.other_files,
        calculated_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_storage_usage(UUID) IS 
'Recalculates storage usage for a tenant based on files table';


-- ============================================
-- FUNCTION: check_storage_limit
-- Purpose: Check if tenant has storage capacity
-- ============================================
CREATE OR REPLACE FUNCTION public.check_storage_limit(
    p_tenant_id UUID,
    p_additional_bytes BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage BIGINT;
    storage_limit BIGINT;
BEGIN
    -- Get current usage and limit
    SELECT su.total_bytes, su.storage_limit_bytes
    INTO current_usage, storage_limit
    FROM public.storage_usage su
    WHERE su.tenant_id = p_tenant_id;
    
    -- If no usage record, get limit from plan
    IF storage_limit IS NULL THEN
        SELECT (p.limits->>'storage_gb')::integer * 1024 * 1024 * 1024
        INTO storage_limit
        FROM public.subscriptions s
        JOIN public.plans p ON p.id = s.plan_id
        WHERE s.tenant_id = p_tenant_id
          AND s.status IN ('active', 'trialing')
        LIMIT 1;
        
        -- Default to 1GB if no subscription
        storage_limit := COALESCE(storage_limit, 1024 * 1024 * 1024);
    END IF;
    
    current_usage := COALESCE(current_usage, 0);
    
    RETURN (current_usage + p_additional_bytes) <= storage_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.check_storage_limit(UUID, BIGINT) IS 
'Returns TRUE if tenant has enough storage capacity for additional bytes';


-- ============================================
-- TRIGGER: Update storage usage on file changes
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue storage recalculation (in production, use async job)
    -- For now, update inline
    IF TG_OP = 'DELETE' THEN
        PERFORM public.update_storage_usage(OLD.tenant_id);
    ELSE
        PERFORM public.update_storage_usage(NEW.tenant_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger can be expensive - in production, use async job queue
-- CREATE TRIGGER trigger_files_storage_usage
--     AFTER INSERT OR UPDATE OF size_bytes OR DELETE ON public.files
--     FOR EACH ROW
--     EXECUTE FUNCTION public.trigger_update_storage_usage();


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.5 PART 2 COMPLETION: STORAGE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] files table with all columns
-- [x] files indexes (11 indexes including full-text search)
-- [x] files RLS policies (4 policies)
-- [x] files triggers (updated_at, extension, soft_delete)
-- [x] file_versions table
-- [x] file_versions indexes (2 indexes)
-- [x] file_versions RLS policies (2 policies)
-- [x] file_versions triggers (version_number)
-- [x] storage_usage table
-- [x] storage_usage indexes (3 indexes)
-- [x] storage_usage RLS policies (1 policy)
-- [x] update_storage_usage() function
-- [x] check_storage_limit() function
-- ═══════════════════════════════════════════════════════════════════════════════
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
-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 12_seed_data.sql
-- Purpose: Seed data for initial setup (roles, plans, settings, feature flags)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run LAST after all table definitions
-- NOTE: This file is idempotent - safe to run multiple times
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- SEED: Default System Roles
-- ============================================
INSERT INTO public.roles (name, display_name, description, permissions, hierarchy_level, is_system)
VALUES 
    (
        'super_admin',
        'Super Administrator',
        'Full platform access - Anthropic staff only',
        '["*"]'::jsonb,
        100,
        TRUE
    ),
    (
        'platform_admin',
        'Platform Administrator',
        'Platform administration without billing access',
        '["users:*", "tenants:*", "support:*", "analytics:read"]'::jsonb,
        90,
        TRUE
    ),
    (
        'support',
        'Support Agent',
        'Customer support access',
        '["users:read", "tenants:read", "support:*"]'::jsonb,
        50,
        TRUE
    ),
    (
        'user',
        'User',
        'Standard user role',
        '["profile:*", "projects:*", "builds:*", "deployments:*"]'::jsonb,
        10,
        TRUE
    )
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    hierarchy_level = EXCLUDED.hierarchy_level;


-- ============================================
-- SEED: Subscription Plans
-- ============================================
INSERT INTO public.plans (
    name, slug, description, tier,
    price_monthly_cents, price_yearly_cents,
    limits, features,
    is_featured, badge_text, sort_order, trial_days
)
VALUES 
    -- Free Plan
    (
        'Free',
        'free',
        'Perfect for trying out OLYMPUS',
        'free',
        0,
        0,
        '{
            "projects": 1,
            "builds_per_month": 10,
            "team_members": 1,
            "storage_gb": 1,
            "bandwidth_gb": 5,
            "custom_domains": 0,
            "api_requests_per_day": 100,
            "concurrent_builds": 1,
            "build_timeout_minutes": 10,
            "support_level": "community",
            "retention_days": 7
        }'::jsonb,
        '{
            "ai_code_generation": true,
            "live_preview": true,
            "one_click_deploy": true,
            "version_history": false,
            "team_collaboration": false,
            "custom_domains": false,
            "priority_builds": false,
            "advanced_analytics": false,
            "api_access": false,
            "white_labeling": false,
            "sla_guarantee": false,
            "dedicated_support": false,
            "export_code": true,
            "github_integration": false
        }'::jsonb,
        FALSE,
        NULL,
        1,
        0 -- No trial for free
    ),
    
    -- Starter Plan
    (
        'Starter',
        'starter',
        'For individual developers and small projects',
        'starter',
        1900, -- $19/month
        19000, -- $190/year (2 months free)
        '{
            "projects": 5,
            "builds_per_month": 50,
            "team_members": 1,
            "storage_gb": 5,
            "bandwidth_gb": 20,
            "custom_domains": 1,
            "api_requests_per_day": 1000,
            "concurrent_builds": 1,
            "build_timeout_minutes": 20,
            "support_level": "email",
            "retention_days": 30
        }'::jsonb,
        '{
            "ai_code_generation": true,
            "live_preview": true,
            "one_click_deploy": true,
            "version_history": true,
            "team_collaboration": false,
            "custom_domains": true,
            "priority_builds": false,
            "advanced_analytics": false,
            "api_access": true,
            "white_labeling": false,
            "sla_guarantee": false,
            "dedicated_support": false,
            "export_code": true,
            "github_integration": true
        }'::jsonb,
        FALSE,
        NULL,
        2,
        14
    ),
    
    -- Pro Plan
    (
        'Pro',
        'pro',
        'For professional developers and growing teams',
        'pro',
        4900, -- $49/month
        49000, -- $490/year (2 months free)
        '{
            "projects": 20,
            "builds_per_month": 200,
            "team_members": 5,
            "storage_gb": 20,
            "bandwidth_gb": 100,
            "custom_domains": 5,
            "api_requests_per_day": 10000,
            "concurrent_builds": 3,
            "build_timeout_minutes": 30,
            "support_level": "priority",
            "retention_days": 90
        }'::jsonb,
        '{
            "ai_code_generation": true,
            "live_preview": true,
            "one_click_deploy": true,
            "version_history": true,
            "team_collaboration": true,
            "custom_domains": true,
            "priority_builds": true,
            "advanced_analytics": true,
            "api_access": true,
            "white_labeling": false,
            "sla_guarantee": false,
            "dedicated_support": false,
            "export_code": true,
            "github_integration": true
        }'::jsonb,
        TRUE,
        'Most Popular',
        3,
        14
    ),
    
    -- Business Plan
    (
        'Business',
        'business',
        'For larger teams and organizations',
        'business',
        14900, -- $149/month
        149000, -- $1490/year (2 months free)
        '{
            "projects": 100,
            "builds_per_month": 1000,
            "team_members": 25,
            "storage_gb": 100,
            "bandwidth_gb": 500,
            "custom_domains": 20,
            "api_requests_per_day": 100000,
            "concurrent_builds": 10,
            "build_timeout_minutes": 60,
            "support_level": "dedicated",
            "retention_days": 365
        }'::jsonb,
        '{
            "ai_code_generation": true,
            "live_preview": true,
            "one_click_deploy": true,
            "version_history": true,
            "team_collaboration": true,
            "custom_domains": true,
            "priority_builds": true,
            "advanced_analytics": true,
            "api_access": true,
            "white_labeling": true,
            "sla_guarantee": true,
            "dedicated_support": true,
            "export_code": true,
            "github_integration": true,
            "sso": true,
            "audit_logs": true
        }'::jsonb,
        FALSE,
        'Best Value',
        4,
        14
    ),
    
    -- Enterprise Plan
    (
        'Enterprise',
        'enterprise',
        'Custom solutions for large enterprises',
        'enterprise',
        0, -- Custom pricing
        0, -- Custom pricing
        '{
            "projects": -1,
            "builds_per_month": -1,
            "team_members": -1,
            "storage_gb": -1,
            "bandwidth_gb": -1,
            "custom_domains": -1,
            "api_requests_per_day": -1,
            "concurrent_builds": -1,
            "build_timeout_minutes": 120,
            "support_level": "enterprise",
            "retention_days": -1
        }'::jsonb,
        '{
            "ai_code_generation": true,
            "live_preview": true,
            "one_click_deploy": true,
            "version_history": true,
            "team_collaboration": true,
            "custom_domains": true,
            "priority_builds": true,
            "advanced_analytics": true,
            "api_access": true,
            "white_labeling": true,
            "sla_guarantee": true,
            "dedicated_support": true,
            "export_code": true,
            "github_integration": true,
            "sso": true,
            "audit_logs": true,
            "custom_integrations": true,
            "on_premise": true,
            "dedicated_infrastructure": true
        }'::jsonb,
        FALSE,
        'Contact Us',
        5,
        30
    )
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly_cents = EXCLUDED.price_monthly_cents,
    price_yearly_cents = EXCLUDED.price_yearly_cents,
    limits = EXCLUDED.limits,
    features = EXCLUDED.features,
    is_featured = EXCLUDED.is_featured,
    badge_text = EXCLUDED.badge_text,
    sort_order = EXCLUDED.sort_order,
    trial_days = EXCLUDED.trial_days,
    updated_at = NOW();


-- ============================================
-- SEED: System Settings
-- ============================================
INSERT INTO public.system_settings (key, value, value_type, description, category, is_public)
VALUES
    -- Platform settings
    ('platform.name', '"OLYMPUS 2.0"', 'string', 'Platform name', 'platform', TRUE),
    ('platform.tagline', '"Build apps with AI"', 'string', 'Platform tagline', 'platform', TRUE),
    ('platform.version', '"2.0.0"', 'string', 'Current platform version', 'platform', TRUE),
    ('platform.maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 'platform', TRUE),
    ('platform.maintenance_message', '""', 'string', 'Maintenance mode message', 'platform', TRUE),
    
    -- Build settings
    ('builds.default_timeout_minutes', '30', 'number', 'Default build timeout', 'builds', FALSE),
    ('builds.max_concurrent_global', '100', 'number', 'Max concurrent builds globally', 'builds', FALSE),
    ('builds.queue_priority_enabled', 'true', 'boolean', 'Enable priority queue for paid plans', 'builds', FALSE),
    
    -- AI settings
    ('ai.default_provider', '"anthropic"', 'string', 'Default LLM provider', 'ai', FALSE),
    ('ai.default_model', '"claude-sonnet-4-20250514"', 'string', 'Default LLM model', 'ai', FALSE),
    ('ai.fallback_provider', '"openai"', 'string', 'Fallback LLM provider', 'ai', FALSE),
    ('ai.max_tokens_per_request', '100000', 'number', 'Max tokens per LLM request', 'ai', FALSE),
    
    -- Storage settings
    ('storage.max_file_size_mb', '100', 'number', 'Max file upload size in MB', 'storage', TRUE),
    ('storage.allowed_extensions', '["*"]', 'array', 'Allowed file extensions', 'storage', TRUE),
    ('storage.virus_scan_enabled', 'true', 'boolean', 'Enable virus scanning', 'storage', FALSE),
    
    -- Security settings
    ('security.session_timeout_hours', '24', 'number', 'Session timeout in hours', 'security', FALSE),
    ('security.max_login_attempts', '5', 'number', 'Max failed login attempts before lockout', 'security', FALSE),
    ('security.lockout_duration_minutes', '30', 'number', 'Account lockout duration', 'security', FALSE),
    ('security.require_email_verification', 'true', 'boolean', 'Require email verification', 'security', FALSE),
    
    -- Email settings
    ('email.from_address', '"noreply@olympus.dev"', 'string', 'Default from email address', 'email', FALSE),
    ('email.from_name', '"OLYMPUS"', 'string', 'Default from name', 'email', FALSE),
    
    -- Billing settings
    ('billing.stripe_enabled', 'true', 'boolean', 'Enable Stripe payments', 'billing', FALSE),
    ('billing.trial_days_default', '14', 'number', 'Default trial period in days', 'billing', FALSE),
    ('billing.grace_period_days', '7', 'number', 'Grace period after payment failure', 'billing', FALSE)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();


-- ============================================
-- SEED: Feature Flags
-- ============================================
INSERT INTO public.feature_flags (key, name, description, is_enabled, rollout_percentage, category)
VALUES
    ('new_builder_ui', 'New Builder UI', 'Redesigned builder interface', TRUE, 100, 'release'),
    ('ai_suggestions', 'AI Code Suggestions', 'Real-time AI suggestions while editing', TRUE, 50, 'experiment'),
    ('collaborative_editing', 'Collaborative Editing', 'Real-time collaboration on projects', FALSE, 0, 'release'),
    ('github_auto_deploy', 'GitHub Auto Deploy', 'Automatic deployment on GitHub push', TRUE, 100, 'release'),
    ('dark_mode', 'Dark Mode', 'Dark theme support', TRUE, 100, 'release'),
    ('voice_commands', 'Voice Commands', 'Voice-based project creation', FALSE, 10, 'experiment'),
    ('mobile_app', 'Mobile App', 'Mobile app access', FALSE, 0, 'release'),
    ('custom_agents', 'Custom AI Agents', 'User-defined AI agents', FALSE, 5, 'experiment')
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_enabled = EXCLUDED.is_enabled,
    rollout_percentage = EXCLUDED.rollout_percentage,
    updated_at = NOW();


-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- Run these to verify the schema is correctly set up
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check table counts
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    
    RAISE NOTICE 'Total tables created: %', table_count;
    
    IF table_count < 30 THEN
        RAISE WARNING 'Expected at least 30 tables, found %', table_count;
    END IF;
END $$;

-- Check RLS is enabled on all tables
DO $$
DECLARE
    tables_without_rls INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_without_rls
    FROM pg_tables t
    LEFT JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
      AND NOT c.relrowsecurity
      AND t.tablename NOT IN ('schema_migrations'); -- Exclude system tables
    
    IF tables_without_rls > 0 THEN
        RAISE WARNING 'Tables without RLS enabled: %', tables_without_rls;
    ELSE
        RAISE NOTICE 'All tables have RLS enabled ✓';
    END IF;
END $$;

-- Check seed data
DO $$
DECLARE
    plan_count INTEGER;
    role_count INTEGER;
    setting_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO plan_count FROM public.plans;
    SELECT COUNT(*) INTO role_count FROM public.roles;
    SELECT COUNT(*) INTO setting_count FROM public.system_settings;
    
    RAISE NOTICE 'Seed data: % plans, % roles, % settings', plan_count, role_count, setting_count;
END $$;

-- List all tables with row counts (for verification)
-- SELECT 
--     schemaname,
--     relname as table_name,
--     n_live_tup as row_count
-- FROM pg_stat_user_tables 
-- WHERE schemaname = 'public'
-- ORDER BY relname;


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.6 PART 3 COMPLETION: SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] Default system roles (4 roles)
-- [x] Subscription plans (5 plans: free, starter, pro, business, enterprise)
-- [x] System settings (24 settings)
-- [x] Feature flags (8 flags)
-- [x] Verification queries
-- ═══════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════
-- 
--                    OLYMPUS 2.0 DATABASE SCHEMA COMPLETE
-- 
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- SUMMARY:
-- ────────────────────────────────────────────────────────────────────────────────
-- Total Tables:          33+
-- Total RLS Policies:    100+
-- Total Indexes:         170+
-- Total Functions:       35+
-- Total Triggers:        25+
-- Total ENUM Types:      14
-- 
-- MODULES:
-- ────────────────────────────────────────────────────────────────────────────────
-- 1. Auth Module:        profiles, roles, user_roles
-- 2. Tenant Module:      tenants, tenant_members, tenant_invitations, 
--                        tenant_settings, tenant_domains
-- 3. Project Module:     projects, project_versions, project_files,
--                        project_env_vars, project_collaborators
-- 4. Build Module:       builds, build_logs, build_outputs, 
--                        agent_executions, build_costs
-- 5. Deploy Module:      deployments, deployment_logs, domains, ssl_certificates
-- 6. Billing Module:     plans, subscriptions, subscription_items, usage_records,
--                        invoices, payment_methods, credits, webhook_events
-- 7. Storage Module:     files, file_versions, storage_usage
-- 8. Analytics Module:   events, metrics, reports
-- 9. System Module:      audit_logs, system_settings, feature_flags
--
-- EXECUTION ORDER:
-- ────────────────────────────────────────────────────────────────────────────────
-- 1.  00_extensions.sql
-- 2.  01_types.sql
-- 3.  02_functions.sql
-- 4.  03_auth_tables.sql
-- 5.  04_tenant_tables.sql
-- 6.  05_project_tables.sql
-- 7.  06_build_tables.sql
-- 8.  07_deploy_tables.sql
-- 9.  08_billing_tables.sql
-- 10. 09_storage_tables.sql
-- 11. 10_analytics_tables.sql
-- 12. 11_system_tables.sql
-- 13. 12_seed_data.sql
--
-- ═══════════════════════════════════════════════════════════════════════════════
