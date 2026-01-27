-- ============================================================================
-- OLYMPUS 2.0 - BILLING SCHEMA (Part 4: Webhooks & Triggers)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- WEBHOOK EVENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Stripe event data
    stripe_event_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    api_version TEXT,
    data JSONB NOT NULL,
    
    -- Processing status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'skipped')),
    processed_at TIMESTAMPTZ,
    error TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_stripe_event ON public.webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_type ON public.webhook_events(type);
CREATE INDEX IF NOT EXISTS idx_webhooks_status ON public.webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhooks_pending ON public.webhook_events(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhooks_failed ON public.webhook_events(status, retry_count) WHERE status = 'failed';

-- ----------------------------------------------------------------------------
-- BILLING CUSTOMERS TABLE (maps tenants to Stripe customers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    
    -- Customer details (synced from Stripe)
    email TEXT,
    name TEXT,
    
    -- Tax info
    tax_exempt TEXT DEFAULT 'none' CHECK (tax_exempt IN ('none', 'exempt', 'reverse')),
    tax_ids JSONB DEFAULT '[]',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billing customers indexes
CREATE INDEX IF NOT EXISTS idx_billing_customers_tenant ON public.billing_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_customers_stripe ON public.billing_customers(stripe_customer_id);

-- ----------------------------------------------------------------------------
-- UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$ 
BEGIN
    -- Plans
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_plans_updated_at') THEN
        CREATE TRIGGER set_plans_updated_at BEFORE UPDATE ON public.plans
            FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();
    END IF;
    
    -- Subscriptions
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_subscriptions_updated_at') THEN
        CREATE TRIGGER set_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
            FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();
    END IF;
    
    -- Credits
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_credits_updated_at') THEN
        CREATE TRIGGER set_credits_updated_at BEFORE UPDATE ON public.credits
            FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();
    END IF;
    
    -- Invoices
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_invoices_updated_at') THEN
        CREATE TRIGGER set_invoices_updated_at BEFORE UPDATE ON public.invoices
            FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();
    END IF;
    
    -- Payment methods
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_payment_methods_updated_at') THEN
        CREATE TRIGGER set_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
            FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();
    END IF;
    
    -- Billing customers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_billing_customers_updated_at') THEN
        CREATE TRIGGER set_billing_customers_updated_at BEFORE UPDATE ON public.billing_customers
            FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();
    END IF;
END $$;
