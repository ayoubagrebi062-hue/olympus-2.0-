-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - API Keys Migration
-- File: supabase/migrations/20240107000001_api_keys.sql
--
-- API key management for programmatic access to OLYMPUS
-- ═══════════════════════════════════════════════════════════════════════════════

-- API Keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(8) NOT NULL, -- First 8 chars for identification
    key_hash VARCHAR(64) NOT NULL,  -- SHA256 hash of the full key
    scopes TEXT[] DEFAULT ARRAY['read']::TEXT[], -- Permissions: read, write, admin
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT api_keys_name_tenant_unique UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON public.api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's API keys"
    ON public.api_keys FOR SELECT
    USING (
        tenant_id IN (
            SELECT tm.tenant_id FROM public.tenant_members tm
            WHERE tm.user_id = auth.uid() AND tm.is_active = TRUE
        )
    );

CREATE POLICY "Users can create API keys for their tenant"
    ON public.api_keys FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tm.tenant_id FROM public.tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.is_active = TRUE
            AND tm.role IN ('owner', 'admin')
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own API keys"
    ON public.api_keys FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own API keys"
    ON public.api_keys FOR DELETE
    USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER set_api_keys_updated_at
    BEFORE UPDATE ON public.api_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Function to validate API key
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash VARCHAR)
RETURNS TABLE(
    api_key_id UUID,
    tenant_id UUID,
    user_id UUID,
    scopes TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT ak.id, ak.tenant_id, ak.user_id, ak.scopes
    FROM public.api_keys ak
    WHERE ak.key_hash = p_key_hash
    AND ak.revoked_at IS NULL
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW());

    -- Update last used
    UPDATE public.api_keys
    SET last_used_at = NOW()
    WHERE key_hash = p_key_hash;
END;
$$;
