-- ============================================================================
-- OLYMPUS 2.0 - BILLING SCHEMA (Part 1: Plans & Subscriptions)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PLANS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_product_id TEXT UNIQUE,
    stripe_price_monthly_id TEXT,
    stripe_price_annual_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'business', 'enterprise')),
    
    -- Limits (stored as JSON for flexibility)
    limits JSONB NOT NULL DEFAULT '{
        "builds_per_month": 3,
        "deploys_per_month": 1,
        "projects": 1,
        "team_members": 1,
        "storage_gb": 0.1,
        "api_calls_per_day": 100,
        "ai_tokens_per_month": 10000
    }'::jsonb,
    
    -- Features array
    features TEXT[] NOT NULL DEFAULT '{}',
    
    -- Pricing in cents
    price_monthly INTEGER NOT NULL DEFAULT 0,
    price_annual INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_public BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plans indexes
CREATE INDEX IF NOT EXISTS idx_plans_tier ON public.plans(tier);
CREATE INDEX IF NOT EXISTS idx_plans_active ON public.plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_plans_stripe_product ON public.plans(stripe_product_id);

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    
    -- Stripe references
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    stripe_price_id TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'trialing', 'active', 'past_due', 'canceled', 
        'unpaid', 'incomplete', 'incomplete_expired', 'paused'
    )),
    billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual')),
    
    -- Period tracking
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    
    -- Cancellation
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancellation_feedback TEXT,
    
    -- Trial
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    trial_extended BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active subscription per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_tenant_active 
    ON public.subscriptions(tenant_id) 
    WHERE status NOT IN ('canceled', 'incomplete_expired');

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON public.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON public.subscriptions(trial_end) WHERE trial_end IS NOT NULL;
