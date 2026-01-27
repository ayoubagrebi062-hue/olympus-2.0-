-- ============================================
-- OLYMPUS 2.0 - Preview & Share Tables
-- Migration: 20240104000001_preview_share_tables.sql
-- ============================================

-- Preview share links
CREATE TABLE preview_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES ai_builds(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),

  -- Share configuration
  password_hash TEXT, -- bcrypt hash if password protected
  expires_at TIMESTAMPTZ,
  allow_edit BOOLEAN DEFAULT false,
  hide_code BOOLEAN DEFAULT false,

  -- Analytics
  views INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_preview_shares_build ON preview_shares(build_id);
CREATE INDEX idx_preview_shares_tenant ON preview_shares(tenant_id);
CREATE INDEX idx_preview_shares_active ON preview_shares(is_active) WHERE is_active = true;
CREATE INDEX idx_preview_shares_expires ON preview_shares(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE preview_shares ENABLE ROW LEVEL SECURITY;

-- Tenant members can view
CREATE POLICY preview_shares_select ON preview_shares FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Members can create
CREATE POLICY preview_shares_insert ON preview_shares FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  ));

-- Owners/admins can update/delete
CREATE POLICY preview_shares_update ON preview_shares FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY preview_shares_delete ON preview_shares FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Preview sessions (for analytics)
CREATE TABLE preview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES preview_shares(id) ON DELETE CASCADE,
  build_id UUID REFERENCES ai_builds(id) ON DELETE CASCADE,

  -- Session info
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Interaction data
  files_viewed TEXT[],
  devices_tested TEXT[],
  console_errors INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_preview_sessions_share ON preview_sessions(share_id);
CREATE INDEX idx_preview_sessions_build ON preview_sessions(build_id);
CREATE INDEX idx_preview_sessions_token ON preview_sessions(session_token);

-- Updated at trigger
CREATE TRIGGER set_preview_shares_updated
  BEFORE UPDATE ON preview_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_share_views(share_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE preview_shares
  SET views = views + 1, last_viewed_at = NOW()
  WHERE id = share_uuid;
END;
$$ LANGUAGE plpgsql;

-- View for share analytics
CREATE OR REPLACE VIEW preview_share_analytics AS
SELECT
  ps.id,
  ps.build_id,
  ps.tenant_id,
  ps.views,
  ps.created_at,
  ps.expires_at,
  ps.is_active,
  ps.allow_edit,
  ps.hide_code,
  b.description as build_description,
  p.name as project_name,
  COUNT(DISTINCT sess.id) as unique_sessions,
  AVG(sess.duration_seconds) as avg_session_duration,
  SUM(sess.console_errors) as total_errors
FROM preview_shares ps
LEFT JOIN ai_builds b ON b.id = ps.build_id
LEFT JOIN projects p ON p.id = b.project_id
LEFT JOIN preview_sessions sess ON sess.share_id = ps.id
GROUP BY ps.id, b.id, p.id;
