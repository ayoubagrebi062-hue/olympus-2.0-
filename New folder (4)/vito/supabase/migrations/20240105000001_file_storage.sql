-- ============================================================
-- OLYMPUS 2.0 - FILE STORAGE SCHEMA
-- Migration: 20240105000001_file_storage.sql
-- ============================================================

-- ============================================================
-- FILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- File info
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  bucket TEXT NOT NULL,

  -- Type info
  mime_type TEXT NOT NULL,
  extension TEXT,
  category TEXT NOT NULL CHECK (category IN ('image', 'document', 'video', 'audio', 'archive', 'code', 'other')),

  -- Size info
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),

  -- Image-specific dimensions
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  processing_error TEXT,

  -- Variants (for images) - stores paths to generated variants
  variants JSONB DEFAULT '{}'::jsonb,

  -- Custom metadata (EXIF, user metadata, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Access control
  is_public BOOLEAN DEFAULT FALSE,
  public_url TEXT,

  -- Audit fields
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete

  -- Unique constraint on bucket + path
  UNIQUE(bucket, path)
);

-- Comments
COMMENT ON TABLE public.files IS 'File metadata and storage tracking';
COMMENT ON COLUMN public.files.variants IS 'JSON object mapping variant names to storage paths';
COMMENT ON COLUMN public.files.metadata IS 'Custom metadata including EXIF data for images';
COMMENT ON COLUMN public.files.deleted_at IS 'Soft delete timestamp - file retained for recovery period';

-- ============================================================
-- FILE VERSIONS TABLE (for version history)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,

  -- Version info
  version INTEGER NOT NULL CHECK (version > 0),
  path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),

  -- Metadata snapshot at time of version
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Unique version per file
  UNIQUE(file_id, version)
);

COMMENT ON TABLE public.file_versions IS 'Historical versions of files';

-- ============================================================
-- STORAGE USAGE TABLE (per tenant)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.storage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Current usage totals
  total_bytes BIGINT NOT NULL DEFAULT 0 CHECK (total_bytes >= 0),
  file_count INTEGER NOT NULL DEFAULT 0 CHECK (file_count >= 0),

  -- Usage by category
  images_bytes BIGINT NOT NULL DEFAULT 0 CHECK (images_bytes >= 0),
  documents_bytes BIGINT NOT NULL DEFAULT 0 CHECK (documents_bytes >= 0),
  videos_bytes BIGINT NOT NULL DEFAULT 0 CHECK (videos_bytes >= 0),
  audio_bytes BIGINT NOT NULL DEFAULT 0 CHECK (audio_bytes >= 0),
  archives_bytes BIGINT NOT NULL DEFAULT 0 CHECK (archives_bytes >= 0),
  code_bytes BIGINT NOT NULL DEFAULT 0 CHECK (code_bytes >= 0),
  other_bytes BIGINT NOT NULL DEFAULT 0 CHECK (other_bytes >= 0),

  -- Storage limits (in bytes)
  limit_bytes BIGINT NOT NULL DEFAULT 104857600, -- 100MB default (free tier)

  -- Bandwidth tracking
  bandwidth_used_bytes BIGINT NOT NULL DEFAULT 0 CHECK (bandwidth_used_bytes >= 0),
  bandwidth_limit_bytes BIGINT NOT NULL DEFAULT 1073741824, -- 1GB default (free tier)
  bandwidth_reset_at TIMESTAMPTZ,

  -- Last update
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One record per tenant
  UNIQUE(tenant_id)
);

COMMENT ON TABLE public.storage_usage IS 'Storage and bandwidth usage tracking per tenant';
COMMENT ON COLUMN public.storage_usage.bandwidth_reset_at IS 'When bandwidth usage resets (monthly)';

-- ============================================================
-- UPLOAD SESSIONS TABLE (for resumable uploads)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Upload info
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  total_size BIGINT NOT NULL CHECK (total_size > 0),
  chunk_size INTEGER NOT NULL CHECK (chunk_size > 0),

  -- Progress tracking
  uploaded_bytes BIGINT NOT NULL DEFAULT 0 CHECK (uploaded_bytes >= 0),
  uploaded_chunks INTEGER[] NOT NULL DEFAULT '{}',

  -- Target location
  target_bucket TEXT NOT NULL,
  target_path TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'canceled')),

  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.upload_sessions IS 'Resumable upload session tracking';
COMMENT ON COLUMN public.upload_sessions.uploaded_chunks IS 'Array of chunk indices that have been uploaded';

-- ============================================================
-- INDEXES
-- ============================================================

-- Files indexes
CREATE INDEX IF NOT EXISTS idx_files_tenant_id ON public.files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_category ON public.files(category);
CREATE INDEX IF NOT EXISTS idx_files_status ON public.files(status);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON public.files(mime_type);
CREATE INDEX IF NOT EXISTS idx_files_bucket ON public.files(bucket);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_deleted ON public.files(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_is_public ON public.files(is_public) WHERE is_public = TRUE;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_files_tenant_project ON public.files(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_files_tenant_category ON public.files(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_files_tenant_status ON public.files(tenant_id, status);

-- Full-text search on filename
CREATE INDEX IF NOT EXISTS idx_files_name_search ON public.files USING gin(to_tsvector('english', name));

-- File versions indexes
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON public.file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_created_at ON public.file_versions(created_at DESC);

-- Upload sessions indexes
CREATE INDEX IF NOT EXISTS idx_upload_sessions_tenant_id ON public.upload_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON public.upload_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires ON public.upload_sessions(expires_at) WHERE status = 'active';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

-- Files: Tenant isolation
CREATE POLICY "files_tenant_isolation" ON public.files
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

-- Files: Public files are readable by anyone
CREATE POLICY "files_public_read" ON public.files
  FOR SELECT
  USING (is_public = TRUE AND deleted_at IS NULL);

-- File versions: Same as files
CREATE POLICY "file_versions_tenant_isolation" ON public.file_versions
  FOR ALL
  USING (
    file_id IN (
      SELECT id FROM public.files WHERE tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

-- Storage usage: Tenant isolation
CREATE POLICY "storage_usage_tenant_isolation" ON public.storage_usage
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

-- Upload sessions: Tenant isolation
CREATE POLICY "upload_sessions_tenant_isolation" ON public.upload_sessions
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to update storage usage when file is created
CREATE OR REPLACE FUNCTION public.update_storage_usage_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  category_column TEXT;
BEGIN
  -- Determine category column
  category_column := CASE NEW.category
    WHEN 'image' THEN 'images_bytes'
    WHEN 'document' THEN 'documents_bytes'
    WHEN 'video' THEN 'videos_bytes'
    WHEN 'audio' THEN 'audio_bytes'
    WHEN 'archive' THEN 'archives_bytes'
    WHEN 'code' THEN 'code_bytes'
    ELSE 'other_bytes'
  END;

  -- Update or insert storage usage
  INSERT INTO public.storage_usage (tenant_id, total_bytes, file_count, limit_bytes, bandwidth_limit_bytes)
  VALUES (NEW.tenant_id, NEW.size_bytes, 1, 104857600, 1073741824)
  ON CONFLICT (tenant_id) DO UPDATE SET
    total_bytes = storage_usage.total_bytes + NEW.size_bytes,
    file_count = storage_usage.file_count + 1,
    updated_at = NOW();

  -- Update category-specific bytes using dynamic SQL
  EXECUTE format(
    'UPDATE public.storage_usage SET %I = %I + $1, updated_at = NOW() WHERE tenant_id = $2',
    category_column, category_column
  ) USING NEW.size_bytes, NEW.tenant_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update storage usage when file is deleted
CREATE OR REPLACE FUNCTION public.update_storage_usage_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  category_column TEXT;
BEGIN
  -- Only process if actually deleted (not soft delete)
  IF OLD.deleted_at IS NOT NULL THEN
    RETURN OLD;
  END IF;

  category_column := CASE OLD.category
    WHEN 'image' THEN 'images_bytes'
    WHEN 'document' THEN 'documents_bytes'
    WHEN 'video' THEN 'videos_bytes'
    WHEN 'audio' THEN 'audio_bytes'
    WHEN 'archive' THEN 'archives_bytes'
    WHEN 'code' THEN 'code_bytes'
    ELSE 'other_bytes'
  END;

  -- Update storage usage
  UPDATE public.storage_usage SET
    total_bytes = GREATEST(0, total_bytes - OLD.size_bytes),
    file_count = GREATEST(0, file_count - 1),
    updated_at = NOW()
  WHERE tenant_id = OLD.tenant_id;

  -- Update category-specific bytes
  EXECUTE format(
    'UPDATE public.storage_usage SET %I = GREATEST(0, %I - $1), updated_at = NOW() WHERE tenant_id = $2',
    category_column, category_column
  ) USING OLD.size_bytes, OLD.tenant_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check storage quota before upload
CREATE OR REPLACE FUNCTION public.check_storage_quota(
  p_tenant_id UUID,
  p_file_size BIGINT
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_usage BIGINT,
  storage_limit BIGINT,
  remaining BIGINT
) AS $$
DECLARE
  v_usage public.storage_usage%ROWTYPE;
BEGIN
  SELECT * INTO v_usage FROM public.storage_usage WHERE tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    -- New tenant, check against default limit
    RETURN QUERY SELECT
      TRUE,
      0::BIGINT,
      104857600::BIGINT,
      104857600::BIGINT;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    (v_usage.total_bytes + p_file_size) <= v_usage.limit_bytes,
    v_usage.total_bytes,
    v_usage.limit_bytes,
    GREATEST(0, v_usage.limit_bytes - v_usage.total_bytes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment bandwidth usage
CREATE OR REPLACE FUNCTION public.track_bandwidth_usage(
  p_tenant_id UUID,
  p_bytes BIGINT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.storage_usage SET
    bandwidth_used_bytes = bandwidth_used_bytes + p_bytes,
    updated_at = NOW()
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset bandwidth usage (called monthly)
CREATE OR REPLACE FUNCTION public.reset_bandwidth_usage()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.storage_usage SET
    bandwidth_used_bytes = 0,
    bandwidth_reset_at = NOW() + INTERVAL '30 days',
    updated_at = NOW()
  WHERE bandwidth_reset_at IS NULL OR bandwidth_reset_at <= NOW();

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired upload sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_upload_sessions()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.upload_sessions SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'active' AND expires_at < NOW();

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next file version number
CREATE OR REPLACE FUNCTION public.get_next_file_version(p_file_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO v_max_version
  FROM public.file_versions
  WHERE file_id = p_file_id;

  RETURN v_max_version + 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger to update storage usage on file insert
DROP TRIGGER IF EXISTS trg_files_insert_usage ON public.files;
CREATE TRIGGER trg_files_insert_usage
  AFTER INSERT ON public.files
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.update_storage_usage_on_insert();

-- Trigger to update storage usage on file hard delete
DROP TRIGGER IF EXISTS trg_files_delete_usage ON public.files;
CREATE TRIGGER trg_files_delete_usage
  BEFORE DELETE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_storage_usage_on_delete();

-- Trigger to update updated_at on files
DROP TRIGGER IF EXISTS trg_files_updated_at ON public.files;
CREATE TRIGGER trg_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Trigger to update updated_at on upload_sessions
DROP TRIGGER IF EXISTS trg_upload_sessions_updated_at ON public.upload_sessions;
CREATE TRIGGER trg_upload_sessions_updated_at
  BEFORE UPDATE ON public.upload_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- STORAGE BUCKETS SETUP (run in Supabase dashboard or via API)
-- ============================================================

-- Note: These need to be created via Supabase Storage API or dashboard
-- Included here for reference

/*
-- Create buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('uploads', 'uploads', false),
  ('assets', 'assets', true),
  ('builds', 'builds', false),
  ('exports', 'exports', false),
  ('avatars', 'avatars', true),
  ('templates', 'templates', true),
  ('temp', 'temp', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for uploads bucket
CREATE POLICY "uploads_tenant_access"
ON storage.objects FOR ALL
USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] IN (
  SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid()
));

-- Storage policies for assets bucket (public read)
CREATE POLICY "assets_tenant_write"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets' AND (storage.foldername(name))[1] IN (
  SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid()
));

CREATE POLICY "assets_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Storage policies for avatars bucket
CREATE POLICY "avatars_owner_write"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
*/

-- ============================================================
-- GRANTS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.storage_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upload_sessions TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_storage_quota TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_bandwidth_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_file_version TO authenticated;

-- Service role for cleanup functions
GRANT EXECUTE ON FUNCTION public.reset_bandwidth_usage TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_upload_sessions TO service_role;
