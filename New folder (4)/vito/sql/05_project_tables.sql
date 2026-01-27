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
