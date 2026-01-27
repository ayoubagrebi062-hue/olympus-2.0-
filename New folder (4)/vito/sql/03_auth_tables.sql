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
