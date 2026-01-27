-- ============================================================================
-- OLYMPUS 2.0 - BILLING SCHEMA (Part 2: Usage & Credits)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USAGE RECORDS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    
    -- Usage details
    metric TEXT NOT NULL CHECK (metric IN ('builds', 'deploys', 'storage', 'ai_tokens', 'api_calls')),
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Period (for aggregation)
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Stripe reporting
    reported_to_stripe BOOLEAN NOT NULL DEFAULT false,
    stripe_usage_record_id TEXT,
    reported_at TIMESTAMPTZ,
    
    -- Idempotency
    idempotency_key TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage indexes
CREATE INDEX IF NOT EXISTS idx_usage_tenant ON public.usage_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_metric ON public.usage_records(metric);
CREATE INDEX IF NOT EXISTS idx_usage_period ON public.usage_records(tenant_id, metric, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_unreported ON public.usage_records(reported_to_stripe) WHERE reported_to_stripe = false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_idempotency ON public.usage_records(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ----------------------------------------------------------------------------
-- USAGE AGGREGATES TABLE (for fast lookups)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    metric TEXT NOT NULL CHECK (metric IN ('builds', 'deploys', 'storage', 'ai_tokens', 'api_calls')),
    
    -- Period (monthly)
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Aggregated values
    total_quantity BIGINT NOT NULL DEFAULT 0,
    
    -- Timestamps
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(tenant_id, metric, period_start)
);

-- Aggregates indexes
CREATE INDEX IF NOT EXISTS idx_aggregates_tenant ON public.usage_aggregates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aggregates_lookup ON public.usage_aggregates(tenant_id, metric, period_start);

-- ----------------------------------------------------------------------------
-- CREDITS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Credit details
    type TEXT NOT NULL CHECK (type IN ('build', 'deploy', 'ai_token', 'storage')),
    amount INTEGER NOT NULL,
    remaining INTEGER NOT NULL,
    
    -- Purchase info
    stripe_payment_intent_id TEXT,
    price_paid INTEGER, -- cents
    
    -- Validity
    expires_at TIMESTAMPTZ,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT credits_remaining_check CHECK (remaining >= 0 AND remaining <= amount)
);

-- Credits indexes
CREATE INDEX IF NOT EXISTS idx_credits_tenant ON public.credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credits_active ON public.credits(tenant_id, type, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_credits_expiring ON public.credits(expires_at) WHERE expires_at IS NOT NULL AND is_active = true;
