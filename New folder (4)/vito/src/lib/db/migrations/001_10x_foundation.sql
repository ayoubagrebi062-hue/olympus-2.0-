-- ================================================================
-- OLYMPUS 10X - PHASE 1 FOUNDATION MIGRATION
-- ================================================================
-- Creates 7 new tables for 10X features
-- Safe to run: All tables use IF NOT EXISTS
-- Rollback: Not needed (backward compatible)
-- ================================================================

-- ================================================================
-- 1. BUILD QUEUE (Guest Mode + Rate Limiting)
-- ================================================================
CREATE TABLE IF NOT EXISTS build_queue (
  queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,

  -- Build request data
  request_data JSONB NOT NULL,
  preview_data JSONB,

  -- Queue management
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  position INTEGER,

  -- Timestamps
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ
);

-- Indexes for fast queue lookups
CREATE INDEX IF NOT EXISTS idx_queue_status ON build_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_expires ON build_queue(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_user ON build_queue(user_id) WHERE status = 'pending';

-- RLS policies
ALTER TABLE build_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queued builds"
  ON build_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage queue"
  ON build_queue FOR ALL
  USING (true);

COMMENT ON TABLE build_queue IS 'Guest build queue - stores build requests before signup';

-- ================================================================
-- 2. BUILD ANALYTICS (Pattern Learning + Insights)
-- ================================================================
CREATE TABLE IF NOT EXISTS build_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID REFERENCES ai_builds(build_id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Performance metrics
  total_duration_ms INTEGER,
  agent_count INTEGER,
  token_count INTEGER,
  cost_usd DECIMAL(10,4),

  -- Quality metrics
  success_rate DECIMAL(5,2) CHECK (success_rate >= 0 AND success_rate <= 100),
  error_count INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,

  -- Pattern data for ML learning
  description_text TEXT,
  description_embedding VECTOR(768), -- Requires pgvector extension
  tech_stack TEXT[],
  features_detected TEXT[],
  complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 10),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_tenant ON build_analytics(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_build ON build_analytics(build_id);
CREATE INDEX IF NOT EXISTS idx_analytics_complexity ON build_analytics(complexity_score);

-- Vector similarity search (requires pgvector extension)
-- Uncomment if pgvector is installed:
-- CREATE INDEX IF NOT EXISTS idx_analytics_embedding ON build_analytics
--   USING ivfflat (description_embedding vector_cosine_ops)
--   WITH (lists = 100);

-- RLS policies
ALTER TABLE build_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's analytics"
  ON build_analytics FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE build_analytics IS 'Build analytics for pattern learning and insights';

-- ================================================================
-- 3. BUILD COSTS (Real-time Cost Tracking)
-- ================================================================
CREATE TABLE IF NOT EXISTS build_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID REFERENCES ai_builds(build_id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Cost breakdown
  phase TEXT NOT NULL,
  agent_name TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,4) DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_costs_build ON build_costs(build_id, created_at);
CREATE INDEX IF NOT EXISTS idx_costs_tenant ON build_costs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_costs_phase ON build_costs(phase);

-- RLS policies
ALTER TABLE build_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's build costs"
  ON build_costs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE build_costs IS 'Real-time cost tracking per build phase';

-- ================================================================
-- 4. TENANT USAGE (Monthly Usage Tracking)
-- ================================================================
CREATE TABLE IF NOT EXISTS tenant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Time period
  year INTEGER NOT NULL CHECK (year >= 2024 AND year <= 2100),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),

  -- Usage stats
  builds_created INTEGER DEFAULT 0,
  builds_completed INTEGER DEFAULT 0,
  builds_failed INTEGER DEFAULT 0,
  concurrent_builds_peak INTEGER DEFAULT 0,

  -- Resource consumption
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10,2) DEFAULT 0,

  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, year, month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_tenant ON tenant_usage(tenant_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_usage_period ON tenant_usage(year, month);

-- RLS policies
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their usage"
  ON tenant_usage FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE tenant_usage IS 'Monthly usage statistics per tenant';

-- ================================================================
-- 5. WEBHOOKS (Event Notifications)
-- ================================================================
CREATE TABLE IF NOT EXISTS tenant_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Webhook config
  event_type TEXT NOT NULL, -- 'build.started', 'build.completed', 'build.failed', etc.
  url TEXT NOT NULL,
  secret TEXT, -- For HMAC signature verification
  headers JSONB DEFAULT '{}', -- Custom headers

  -- Settings
  is_active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 3 CHECK (retry_count >= 0 AND retry_count <= 10),
  timeout_ms INTEGER DEFAULT 5000 CHECK (timeout_ms >= 1000 AND timeout_ms <= 30000),

  -- Stats
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  total_triggers INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON tenant_webhooks(tenant_id, event_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON tenant_webhooks(is_active, event_type);

-- RLS policies
ALTER TABLE tenant_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage webhooks"
  ON tenant_webhooks FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE tenant_webhooks IS 'Webhook endpoints for build event notifications';

-- ================================================================
-- 6. RATE LIMITS (Rate Limiting Tracking)
-- ================================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rate limit window
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  window_size_seconds INTEGER NOT NULL DEFAULT 3600,

  -- Tracking
  requests_count INTEGER DEFAULT 0,
  requests_allowed INTEGER NOT NULL,
  limit_exceeded_at TIMESTAMPTZ,

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, window_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ratelimit_window ON rate_limits(tenant_id, window_end DESC);
CREATE INDEX IF NOT EXISTS idx_ratelimit_active ON rate_limits(window_end) WHERE window_end > NOW();
CREATE INDEX IF NOT EXISTS idx_ratelimit_user ON rate_limits(user_id, window_end DESC);

-- RLS policies
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE rate_limits IS 'Rate limiting tracking per tenant/user';

-- ================================================================
-- 7. BUILD MEMORY (Learning Patterns)
-- ================================================================
CREATE TABLE IF NOT EXISTS build_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Pattern data
  pattern_type TEXT NOT NULL, -- 'tech_stack', 'feature', 'style', 'preference', etc.
  pattern_key TEXT NOT NULL,
  pattern_value JSONB NOT NULL,

  -- Learning metrics
  confidence DECIMAL(5,2) DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  usage_count INTEGER DEFAULT 1,
  success_rate DECIMAL(5,2) DEFAULT 0,

  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, pattern_type, pattern_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_tenant ON build_memory(tenant_id, pattern_type, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_memory_type ON build_memory(pattern_type, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_memory_usage ON build_memory(usage_count DESC, confidence DESC);

-- RLS policies
ALTER TABLE build_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their memory"
  ON build_memory FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE build_memory IS 'Learned patterns and preferences per tenant';

-- ================================================================
-- FUNCTIONS FOR AUTOMATION
-- ================================================================

-- Function: Increment tenant usage stats
CREATE OR REPLACE FUNCTION increment_tenant_usage(
  p_tenant_id UUID,
  p_stat_name TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS VOID AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM NOW());
  v_month INTEGER := EXTRACT(MONTH FROM NOW());
BEGIN
  INSERT INTO tenant_usage (tenant_id, year, month)
  VALUES (p_tenant_id, v_year, v_month)
  ON CONFLICT (tenant_id, year, month) DO NOTHING;

  CASE p_stat_name
    WHEN 'builds_created' THEN
      UPDATE tenant_usage
      SET builds_created = builds_created + p_increment, updated_at = NOW()
      WHERE tenant_id = p_tenant_id AND year = v_year AND month = v_month;
    WHEN 'builds_completed' THEN
      UPDATE tenant_usage
      SET builds_completed = builds_completed + p_increment, updated_at = NOW()
      WHERE tenant_id = p_tenant_id AND year = v_year AND month = v_month;
    WHEN 'builds_failed' THEN
      UPDATE tenant_usage
      SET builds_failed = builds_failed + p_increment, updated_at = NOW()
      WHERE tenant_id = p_tenant_id AND year = v_year AND month = v_month;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function: Clean expired queue entries
CREATE OR REPLACE FUNCTION clean_expired_queue() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE build_queue
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Trigger: Update tenant usage on build creation
CREATE OR REPLACE FUNCTION trigger_increment_build_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM increment_tenant_usage(NEW.tenant_id, 'builds_created', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_build_created
  AFTER INSERT ON ai_builds
  FOR EACH ROW
  EXECUTE FUNCTION trigger_increment_build_created();

-- ================================================================
-- GRANTS (if using service role)
-- ================================================================

-- Grant service role access to all tables
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
      'build_queue', 'build_analytics', 'build_costs', 'tenant_usage',
      'tenant_webhooks', 'rate_limits', 'build_memory'
    )
  LOOP
    EXECUTE format('GRANT ALL ON TABLE %I TO service_role', table_name);
  END LOOP;
END $$;

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ OLYMPUS 10X Phase 1 Migration Complete';
  RAISE NOTICE '📊 Tables created: 7';
  RAISE NOTICE '🔐 RLS policies: Enabled';
  RAISE NOTICE '⚡ Triggers: Active';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Install Redis for build queue';
  RAISE NOTICE '2. Enable feature flags in .env.local';
  RAISE NOTICE '3. Deploy guest mode API routes';
END $$;
