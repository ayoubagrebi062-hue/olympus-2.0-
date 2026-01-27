-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - PHASE 0: GOVERNANCE FOUNDATIONS
-- File: 20240117000000_governance_phase0.sql
-- Purpose: Minimal tables for Identity Authority existence
-- Module: Governance - Foundation
--
-- EXECUTION ORDER: Run AFTER all existing migrations
-- DEPENDENCIES: None (self-contained)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ============================================
-- TABLE: agent_identities
-- Purpose: Store verified agent identity records
-- Phase: 0 (Foundation)
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_identities (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Identity claim
  agent_id TEXT NOT NULL,
  version TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'planner', 'architect', 'executor', 'monitor',
    'orchestrator', 'governance'
  )),

  -- Context
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,

  -- Tracking
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'revoked', 'expired'
  )),

  -- Constraints
  UNIQUE (agent_id, version, build_id)
);

-- ============================================
-- TABLE: agent_verifications
-- Purpose: Log all verification attempts (append-only)
-- Phase: 0 (Foundation)
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_verifications (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Verification context
  agent_id TEXT NOT NULL,
  build_id UUID REFERENCES public.builds(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Verification result
  passed BOOLEAN NOT NULL,
  reason TEXT,
  verification_type TEXT DEFAULT 'identity' CHECK (verification_type IN (
    'identity', 'fingerprint', 'role', 'phase', 'tenant'
  )),

  -- Timing
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_ms INTEGER
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agent_identities_agent_id
  ON public.agent_identities(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_identities_build_id
  ON public.agent_identities(build_id);

CREATE INDEX IF NOT EXISTS idx_agent_identities_fingerprint
  ON public.agent_identities(fingerprint);

CREATE INDEX IF NOT EXISTS idx_agent_verifications_agent_id
  ON public.agent_verifications(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_verifications_build_id
  ON public.agent_verifications(build_id);

-- ============================================
-- RLS POLICIES (Placeholder - not enforced in Phase 0)
-- ============================================
ALTER TABLE public.agent_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_verifications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON public.agent_identities
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.agent_verifications
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.agent_identities IS 'Phase 0: Verified agent identities';
COMMENT ON TABLE public.agent_verifications IS 'Phase 0: Verification attempt logs (append-only)';
