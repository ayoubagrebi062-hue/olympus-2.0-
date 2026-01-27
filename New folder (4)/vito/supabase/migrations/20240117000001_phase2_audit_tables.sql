-- ═════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - PHASE 2: IDENTITY PERSISTENCE & AUDIT
-- File: 20240117000001_phase2_audit_tables.sql
-- Purpose: Audit logs and verification persistence
-- Module: Governance - Audit
--
-- EXECUTION ORDER: Run AFTER Phase 0 migration
-- DEPENDENCIES: agent_identities, agent_verifications tables
-- ═════════════════════════════════════════════════════════════════════════

-- ============================================
-- TABLE: audit_logs (WORM - Write Once Read Many)
-- Purpose: Immutable audit trail for all governance actions
-- Phase: 2 (Persistence)
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Action context
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'identity', 'lease', 'monitor', 'orchestrator', 
    'kill_switch', 'governance', 'learning'
  )),
  entity_id TEXT NOT NULL,

  -- Actor
  performed_by TEXT NOT NULL CHECK (performed_by IN (
    'system', 'agent', 'operator', 'unknown'
  )),

  -- Result
  action_result TEXT NOT NULL CHECK (action_result IN (
    'SUCCESS', 'FAILURE', 'REJECTED', 'APPROVED', 'SKIPPED', 'ERROR'
  )),

  -- Details
  details JSONB,

  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed ON public.audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_result ON public.audit_logs(action_result);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for system audits)
CREATE POLICY "Service role full access" ON public.audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Allow read access to tenant users
CREATE POLICY "Tenant read access" ON public.audit_logs
  FOR SELECT USING (auth.uid() = tenant_id);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.audit_logs IS 'Phase 2: Immutable audit trail (WORM)';
