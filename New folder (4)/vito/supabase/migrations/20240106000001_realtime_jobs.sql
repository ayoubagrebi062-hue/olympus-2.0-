-- ============================================================
-- OLYMPUS 2.0 - Real-Time & Background Jobs Schema
-- ============================================================
-- Migration: 20240106000001_realtime_jobs.sql
-- Description: Tables for background jobs, dead letter queue,
--              scheduled jobs, presence, and notifications.
-- ============================================================

-- ============================================================
-- BACKGROUND JOBS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Job identification
  type TEXT NOT NULL,
  name TEXT NOT NULL,

  -- Payload
  payload JSONB NOT NULL DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'queued', 'running', 'completed', 'failed', 'canceled', 'dead'
  )),

  -- Progress tracking
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_message TEXT,

  -- Timing
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Retry handling
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,

  -- External reference
  qstash_message_id TEXT,

  -- Result
  result JSONB,

  -- Metadata
  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 5),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status)
  WHERE status IN ('pending', 'queued', 'running');
CREATE INDEX IF NOT EXISTS idx_jobs_type ON public.jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON public.jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON public.jobs(scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON public.jobs(priority DESC, created_at ASC)
  WHERE status IN ('pending', 'queued');
CREATE INDEX IF NOT EXISTS idx_jobs_retry ON public.jobs(next_retry_at)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_qstash ON public.jobs(qstash_message_id)
  WHERE qstash_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_tags ON public.jobs USING GIN(tags);

-- ============================================================
-- DEAD LETTER QUEUE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,

  -- Original job info
  job_type TEXT NOT NULL,
  job_payload JSONB NOT NULL,

  -- Failure info
  error_message TEXT NOT NULL,
  error_stack TEXT,
  failed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Retry info
  attempts_made INTEGER NOT NULL,
  last_attempt_at TIMESTAMPTZ,

  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for DLQ
CREATE INDEX IF NOT EXISTS idx_dlq_resolved ON public.dead_letter_queue(resolved)
  WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_dlq_job_type ON public.dead_letter_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_dlq_failed_at ON public.dead_letter_queue(failed_at);

-- ============================================================
-- SCHEDULED JOBS (CRON)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Schedule info
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  cron_expression TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',

  -- Job template
  job_type TEXT NOT NULL,
  job_payload JSONB DEFAULT '{}',

  -- Status
  enabled BOOLEAN DEFAULT TRUE,

  -- Tracking
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_run_job_id UUID REFERENCES public.jobs(id),
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  -- External
  qstash_schedule_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for scheduled jobs
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_enabled ON public.scheduled_jobs(enabled)
  WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run ON public.scheduled_jobs(next_run_at)
  WHERE enabled = TRUE;

-- ============================================================
-- REAL-TIME PRESENCE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Location
  channel TEXT NOT NULL,

  -- State
  state JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),

  -- Timing
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique per user per channel
  UNIQUE(user_id, channel)
);

-- Indexes for presence
CREATE INDEX IF NOT EXISTS idx_presence_channel ON public.presence(channel);
CREATE INDEX IF NOT EXISTS idx_presence_user ON public.presence(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON public.presence(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_presence_status ON public.presence(channel, status)
  WHERE status = 'online';

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Content
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,

  -- Link
  action_url TEXT,
  action_label TEXT,

  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Delivery
  channels TEXT[] DEFAULT '{in_app}',
  delivered_at JSONB DEFAULT '{}',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read)
  WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON public.notifications(expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================================
-- BUILD LOGS (for real-time streaming)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.build_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,

  -- Log content
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,

  -- Context
  agent TEXT,
  phase TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for build logs
CREATE INDEX IF NOT EXISTS idx_build_logs_build ON public.build_logs(build_id);
CREATE INDEX IF NOT EXISTS idx_build_logs_build_time ON public.build_logs(build_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_build_logs_level ON public.build_logs(build_id, level)
  WHERE level IN ('warn', 'error');

-- ============================================================
-- DEPLOYMENT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deployment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES public.deployments(id) ON DELETE CASCADE,

  -- Log content
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,

  -- Context
  step TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for deployment logs
CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment ON public.deployment_logs(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_time ON public.deployment_logs(deployment_id, timestamp ASC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_logs ENABLE ROW LEVEL SECURITY;

-- Jobs: Users see their tenant's jobs
CREATE POLICY "Users see tenant jobs" ON public.jobs
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members
      WHERE user_id = auth.uid()
    )
  );

-- Jobs: Service role can do everything
CREATE POLICY "Service role manages jobs" ON public.jobs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- DLQ: Admins only
CREATE POLICY "Admins manage DLQ" ON public.dead_letter_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Scheduled Jobs: Service role and admins
CREATE POLICY "Admins see scheduled jobs" ON public.scheduled_jobs
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins manage scheduled jobs" ON public.scheduled_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Presence: Users manage own presence
CREATE POLICY "Users manage own presence" ON public.presence
  FOR ALL USING (user_id = auth.uid());

-- Presence: Users see presence in their channels
CREATE POLICY "Users see channel presence" ON public.presence
  FOR SELECT USING (
    channel LIKE 'project:%' AND
    SPLIT_PART(channel, ':', 2)::UUID IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.projects WHERE tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

-- Notifications: Users see own notifications
CREATE POLICY "Users manage own notifications" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- Build Logs: Users see their tenant's build logs
CREATE POLICY "Users see tenant build logs" ON public.build_logs
  FOR SELECT USING (
    build_id IN (
      SELECT b.id FROM public.builds b
      JOIN public.projects p ON b.project_id = p.id
      WHERE p.tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

-- Deployment Logs: Users see their tenant's deployment logs
CREATE POLICY "Users see tenant deployment logs" ON public.deployment_logs
  FOR SELECT USING (
    deployment_id IN (
      SELECT d.id FROM public.deployments d
      JOIN public.projects p ON d.project_id = p.id
      WHERE p.tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Update updated_at on jobs
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();

-- Update updated_at on scheduled_jobs
CREATE TRIGGER trg_scheduled_jobs_updated_at
  BEFORE UPDATE ON public.scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();

-- Update presence last_seen_at
CREATE OR REPLACE FUNCTION update_presence_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_presence_last_seen
  BEFORE UPDATE ON public.presence
  FOR EACH ROW
  EXECUTE FUNCTION update_presence_last_seen();

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Cleanup expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup stale presence
CREATE OR REPLACE FUNCTION cleanup_stale_presence(timeout_minutes INTEGER DEFAULT 5)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.presence
  WHERE last_seen_at < NOW() - (timeout_minutes || ' minutes')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Get job stats
CREATE OR REPLACE FUNCTION get_job_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  avg_duration NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.status,
    COUNT(*)::BIGINT,
    AVG(
      EXTRACT(EPOCH FROM (COALESCE(j.completed_at, NOW()) - j.started_at))
    )::NUMERIC
  FROM public.jobs j
  WHERE (p_tenant_id IS NULL OR j.tenant_id = p_tenant_id)
    AND j.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY j.status;
END;
$$ LANGUAGE plpgsql;

-- Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = p_user_id AND read = FALSE
  );
END;
$$ LANGUAGE plpgsql;

-- Mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all as read
    UPDATE public.notifications
    SET read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id AND read = FALSE;
  ELSE
    -- Mark specific notifications
    UPDATE public.notifications
    SET read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id
      AND id = ANY(p_notification_ids)
      AND read = FALSE;
  END IF;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Move failed job to DLQ
CREATE OR REPLACE FUNCTION move_job_to_dlq(
  p_job_id UUID,
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_job RECORD;
  v_dlq_id UUID;
BEGIN
  -- Get job details
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;

  -- Insert into DLQ
  INSERT INTO public.dead_letter_queue (
    job_id,
    job_type,
    job_payload,
    error_message,
    error_stack,
    attempts_made,
    last_attempt_at
  ) VALUES (
    v_job.id,
    v_job.type,
    v_job.payload,
    p_error_message,
    p_error_stack,
    v_job.attempts,
    NOW()
  )
  RETURNING id INTO v_dlq_id;

  -- Update job status
  UPDATE public.jobs
  SET status = 'dead',
      last_error = p_error_message,
      completed_at = NOW()
  WHERE id = p_job_id;

  RETURN v_dlq_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.build_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deployment_logs;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE public.jobs IS 'Background job queue for async processing';
COMMENT ON TABLE public.dead_letter_queue IS 'Failed jobs that exceeded retry attempts';
COMMENT ON TABLE public.scheduled_jobs IS 'Cron-based scheduled job definitions';
COMMENT ON TABLE public.presence IS 'Real-time user presence tracking';
COMMENT ON TABLE public.notifications IS 'User notifications (in-app, email, push)';
COMMENT ON TABLE public.build_logs IS 'Build execution logs for real-time streaming';
COMMENT ON TABLE public.deployment_logs IS 'Deployment execution logs';

COMMENT ON FUNCTION move_job_to_dlq IS 'Move a failed job to dead letter queue';
COMMENT ON FUNCTION cleanup_expired_notifications IS 'Delete expired notifications';
COMMENT ON FUNCTION cleanup_stale_presence IS 'Remove stale presence records';
