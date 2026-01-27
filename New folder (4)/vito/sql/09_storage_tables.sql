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
