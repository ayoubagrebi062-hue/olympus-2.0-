-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 08_billing_tables.sql
-- Purpose: Billing and payment tables (plans, subscriptions, usage, invoices, credits)
-- Module: Billing Module
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 07_deploy_tables.sql
-- DEPENDENCIES: tenants, profiles, ENUM types
-- NOTE: Integrates with Stripe - many IDs reference Stripe objects
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- TABLE: plans
-- Purpose: Available subscription plans
-- Module: Billing
-- ============================================
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Plan identity
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Tier
    tier public.plan_tier NOT NULL,
    
    -- Pricing
    price_monthly_cents INTEGER NOT NULL DEFAULT 0,
    price_yearly_cents INTEGER NOT NULL DEFAULT 0, -- Usually discounted
    currency TEXT DEFAULT 'usd',
    
    -- Stripe references
    stripe_product_id TEXT UNIQUE,
    stripe_price_monthly_id TEXT,
    stripe_price_yearly_id TEXT,
    
    -- Limits
    limits JSONB NOT NULL DEFAULT '{
        "projects": 1,
        "builds_per_month": 10,
        "team_members": 1,
        "storage_gb": 1,
        "bandwidth_gb": 5,
        "custom_domains": 0,
        "api_requests_per_day": 100,
        "concurrent_builds": 1,
        "build_timeout_minutes": 10,
        "support_level": "community"
    }'::jsonb,
    
    -- Features (what's included)
    features JSONB NOT NULL DEFAULT '{
        "ai_code_generation": true,
        "live_preview": true,
        "one_click_deploy": true,
        "version_history": true,
        "team_collaboration": false,
        "custom_domains": false,
        "priority_builds": false,
        "advanced_analytics": false,
        "api_access": false,
        "white_labeling": false,
        "sla_guarantee": false,
        "dedicated_support": false
    }'::jsonb,
    
    -- Display
    is_featured BOOLEAN DEFAULT FALSE, -- Highlight in pricing page
    badge_text TEXT, -- e.g., 'Most Popular', 'Best Value'
    sort_order INTEGER DEFAULT 0,
    
    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE, -- Show on pricing page
    
    -- Trial
    trial_days INTEGER DEFAULT 14,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for plans
CREATE INDEX idx_plans_tier ON public.plans(tier);
CREATE INDEX idx_plans_active ON public.plans(is_active, is_public) WHERE is_active = TRUE;
CREATE INDEX idx_plans_stripe ON public.plans(stripe_product_id) WHERE stripe_product_id IS NOT NULL;
CREATE INDEX idx_plans_sort ON public.plans(sort_order, tier);

-- Trigger for updated_at
CREATE TRIGGER trigger_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for plans (publicly readable)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
CREATE POLICY "plans_select_public" ON public.plans
    FOR SELECT
    USING (is_active = TRUE AND is_public = TRUE);

-- Authenticated users can view all plans (including private ones they might be on)
CREATE POLICY "plans_select_authenticated" ON public.plans
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Comments
COMMENT ON TABLE public.plans IS 'Available subscription plans with pricing and limits';
COMMENT ON COLUMN public.plans.limits IS 'Plan limits as JSONB (projects, builds, storage, etc.)';
COMMENT ON COLUMN public.plans.features IS 'Feature flags for the plan';


-- ============================================
-- TABLE: subscriptions
-- Purpose: Tenant subscriptions to plans
-- Module: Billing
-- ============================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    
    -- Stripe references
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    
    -- Status
    status public.subscription_status NOT NULL DEFAULT 'trialing',
    
    -- Billing cycle
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    
    -- Current period
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    
    -- Trial
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Pause
    paused_at TIMESTAMPTZ,
    resume_at TIMESTAMPTZ,
    
    -- Payment
    default_payment_method_id UUID, -- FK added after payment_methods table
    
    -- Pricing at time of subscription (for historical accuracy)
    price_cents INTEGER,
    currency TEXT DEFAULT 'usd',
    
    -- Discounts
    discount_percent INTEGER CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_end_at TIMESTAMPTZ,
    coupon_code TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_plan ON public.subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(tenant_id, status);
CREATE INDEX idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id) 
    WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_subscriptions_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_active ON public.subscriptions(tenant_id) 
    WHERE status IN ('active', 'trialing');
CREATE INDEX idx_subscriptions_period_end ON public.subscriptions(current_period_end) 
    WHERE status = 'active';
CREATE INDEX idx_subscriptions_trial_end ON public.subscriptions(trial_end) 
    WHERE status = 'trialing';

-- Trigger for updated_at
CREATE TRIGGER trigger_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Members can view their tenant's subscription
CREATE POLICY "subscriptions_select" ON public.subscriptions
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

-- Only owners can manage subscriptions
CREATE POLICY "subscriptions_insert" ON public.subscriptions
    FOR INSERT
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'owner'));

CREATE POLICY "subscriptions_update" ON public.subscriptions
    FOR UPDATE
    USING (public.user_has_tenant_role(tenant_id, 'owner'))
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'owner'));

-- Comments
COMMENT ON TABLE public.subscriptions IS 'Tenant subscriptions linked to Stripe';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx)';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'If true, subscription ends at period end';


-- ============================================
-- TABLE: subscription_items
-- Purpose: Line items within a subscription (for metered billing)
-- Module: Billing
-- ============================================
CREATE TABLE public.subscription_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    
    -- Stripe references
    stripe_subscription_item_id TEXT UNIQUE,
    stripe_price_id TEXT,
    
    -- Item details
    product_type TEXT NOT NULL, -- 'base', 'builds', 'storage', 'bandwidth', etc.
    
    -- Quantity
    quantity INTEGER DEFAULT 1,
    
    -- Pricing
    unit_amount_cents INTEGER,
    
    -- Metered billing
    is_metered BOOLEAN DEFAULT FALSE,
    metered_usage_type TEXT CHECK (metered_usage_type IN (
        'sum',          -- Sum usage over period
        'max',          -- Max usage in period
        'last_during',  -- Last reported usage
        'last_ever'     -- Last reported ever
    )),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for subscription_items
CREATE INDEX idx_subscription_items_subscription ON public.subscription_items(subscription_id);
CREATE INDEX idx_subscription_items_tenant ON public.subscription_items(tenant_id);
CREATE INDEX idx_subscription_items_stripe ON public.subscription_items(stripe_subscription_item_id);
CREATE INDEX idx_subscription_items_type ON public.subscription_items(subscription_id, product_type);

-- Trigger for updated_at
CREATE TRIGGER trigger_subscription_items_updated_at
    BEFORE UPDATE ON public.subscription_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for subscription_items
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_items_select" ON public.subscription_items
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.subscription_items IS 'Line items within subscriptions for metered billing';
COMMENT ON COLUMN public.subscription_items.is_metered IS 'If true, billed based on usage';


-- ============================================
-- TABLE: usage_records
-- Purpose: Track usage for metered billing
-- Module: Billing
-- ============================================
CREATE TABLE public.usage_records (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_item_id UUID REFERENCES public.subscription_items(id) ON DELETE SET NULL,
    
    -- Usage type
    usage_type TEXT NOT NULL, -- 'builds', 'storage', 'bandwidth', 'api_calls', etc.
    
    -- Quantity
    quantity BIGINT NOT NULL DEFAULT 1,
    unit TEXT, -- 'count', 'bytes', 'seconds', etc.
    
    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Aggregation
    aggregation_key TEXT, -- For grouping (e.g., project_id, user_id)
    
    -- Stripe sync
    stripe_usage_record_id TEXT,
    reported_to_stripe BOOLEAN DEFAULT FALSE,
    reported_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for usage_records
CREATE INDEX idx_usage_records_tenant ON public.usage_records(tenant_id);
CREATE INDEX idx_usage_records_subscription_item ON public.usage_records(subscription_item_id);
CREATE INDEX idx_usage_records_type ON public.usage_records(tenant_id, usage_type);
CREATE INDEX idx_usage_records_period ON public.usage_records(tenant_id, period_start, period_end);
CREATE INDEX idx_usage_records_unreported ON public.usage_records(reported_to_stripe) 
    WHERE reported_to_stripe = FALSE;
CREATE INDEX idx_usage_records_aggregation ON public.usage_records(tenant_id, usage_type, aggregation_key);

-- RLS for usage_records
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_records_select" ON public.usage_records
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "usage_records_insert" ON public.usage_records
    FOR INSERT
    WITH CHECK (public.user_has_tenant_access(tenant_id));

-- Comments
COMMENT ON TABLE public.usage_records IS 'Usage tracking for metered billing';
COMMENT ON COLUMN public.usage_records.reported_to_stripe IS 'Whether this usage has been reported to Stripe';


-- ============================================
-- TABLE: invoices
-- Purpose: Invoice records (synced from Stripe)
-- Module: Billing
-- ============================================
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    
    -- Stripe references
    stripe_invoice_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    stripe_payment_intent_id TEXT,
    
    -- Invoice details
    invoice_number TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',        -- Being created
        'open',         -- Awaiting payment
        'paid',         -- Successfully paid
        'void',         -- Voided
        'uncollectible' -- Failed to collect
    )),
    
    -- Amounts
    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER DEFAULT 0,
    tax_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    amount_paid_cents INTEGER DEFAULT 0,
    amount_due_cents INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'usd',
    
    -- Line items (cached from Stripe)
    line_items JSONB DEFAULT '[]'::jsonb,
    
    -- Dates
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    
    -- PDF
    invoice_pdf_url TEXT,
    hosted_invoice_url TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for invoices
CREATE INDEX idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_subscription ON public.invoices(subscription_id);
CREATE INDEX idx_invoices_stripe ON public.invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON public.invoices(tenant_id, status);
CREATE INDEX idx_invoices_created ON public.invoices(tenant_id, created_at DESC);
CREATE INDEX idx_invoices_due ON public.invoices(due_date) WHERE status = 'open';

-- Trigger for updated_at
CREATE TRIGGER trigger_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Owners and admins can view invoices
CREATE POLICY "invoices_select" ON public.invoices
    FOR SELECT
    USING (public.user_has_tenant_role(tenant_id, 'admin'));

-- Comments
COMMENT ON TABLE public.invoices IS 'Invoice records synced from Stripe';
COMMENT ON COLUMN public.invoices.line_items IS 'Cached line items from Stripe invoice';


-- ============================================
-- TABLE: payment_methods
-- Purpose: Stored payment methods (synced from Stripe)
-- Module: Billing
-- ============================================
CREATE TABLE public.payment_methods (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Stripe references
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT,
    
    -- Type
    type TEXT NOT NULL, -- 'card', 'bank_account', 'sepa_debit', etc.
    
    -- Card details (if type = 'card')
    card_brand TEXT, -- 'visa', 'mastercard', 'amex', etc.
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    card_funding TEXT, -- 'credit', 'debit', 'prepaid'
    
    -- Bank account details (if type = 'bank_account')
    bank_name TEXT,
    bank_last4 TEXT,
    
    -- Billing details
    billing_name TEXT,
    billing_email TEXT,
    billing_phone TEXT,
    billing_address JSONB,
    
    -- Status
    is_default BOOLEAN DEFAULT FALSE,
    is_valid BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add FK from subscriptions to payment_methods
ALTER TABLE public.subscriptions
    ADD CONSTRAINT fk_subscriptions_payment_method
    FOREIGN KEY (default_payment_method_id)
    REFERENCES public.payment_methods(id)
    ON DELETE SET NULL;

-- Indexes for payment_methods
CREATE INDEX idx_payment_methods_tenant ON public.payment_methods(tenant_id);
CREATE INDEX idx_payment_methods_stripe ON public.payment_methods(stripe_payment_method_id);
CREATE INDEX idx_payment_methods_customer ON public.payment_methods(stripe_customer_id);
CREATE INDEX idx_payment_methods_default ON public.payment_methods(tenant_id, is_default) 
    WHERE is_default = TRUE;

-- Trigger for updated_at
CREATE TRIGGER trigger_payment_methods_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to ensure only one default payment method per tenant
CREATE OR REPLACE FUNCTION public.ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE public.payment_methods 
        SET is_default = FALSE 
        WHERE tenant_id = NEW.tenant_id 
          AND id != NEW.id 
          AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_methods_default
    BEFORE INSERT OR UPDATE ON public.payment_methods
    FOR EACH ROW
    WHEN (NEW.is_default = TRUE)
    EXECUTE FUNCTION public.ensure_single_default_payment_method();

-- RLS for payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Owners and admins can view payment methods
CREATE POLICY "payment_methods_select" ON public.payment_methods
    FOR SELECT
    USING (public.user_has_tenant_role(tenant_id, 'admin'));

-- Owners can manage payment methods
CREATE POLICY "payment_methods_insert" ON public.payment_methods
    FOR INSERT
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'owner'));

CREATE POLICY "payment_methods_update" ON public.payment_methods
    FOR UPDATE
    USING (public.user_has_tenant_role(tenant_id, 'owner'))
    WITH CHECK (public.user_has_tenant_role(tenant_id, 'owner'));

CREATE POLICY "payment_methods_delete" ON public.payment_methods
    FOR DELETE
    USING (public.user_has_tenant_role(tenant_id, 'owner'));

-- Comments
COMMENT ON TABLE public.payment_methods IS 'Stored payment methods synced from Stripe';
COMMENT ON COLUMN public.payment_methods.card_last4 IS 'Last 4 digits of card number';


-- ============================================
-- TABLE: credits
-- Purpose: Credit balance transactions
-- Module: Billing
-- ============================================
CREATE TABLE public.credits (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Parent references
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Transaction type
    transaction_type public.credit_transaction_type NOT NULL,
    
    -- Amount (positive = add, negative = deduct)
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL, -- Running balance after this transaction
    
    -- Reference
    reference_type TEXT, -- 'build', 'purchase', 'refund', 'promotion', etc.
    reference_id UUID, -- ID of related object
    
    -- Description
    description TEXT,
    
    -- Expiry (for promotional credits)
    expires_at TIMESTAMPTZ,
    
    -- Purchase details (if transaction_type = 'purchase')
    stripe_payment_intent_id TEXT,
    amount_cents INTEGER, -- Amount paid in cents
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for credits
CREATE INDEX idx_credits_tenant ON public.credits(tenant_id);
CREATE INDEX idx_credits_type ON public.credits(tenant_id, transaction_type);
CREATE INDEX idx_credits_created ON public.credits(tenant_id, created_at DESC);
CREATE INDEX idx_credits_expiring ON public.credits(expires_at) 
    WHERE expires_at IS NOT NULL AND transaction_type IN ('purchase', 'bonus');
CREATE INDEX idx_credits_reference ON public.credits(reference_type, reference_id);

-- RLS for credits
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- Members can view credit transactions
CREATE POLICY "credits_select" ON public.credits
    FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

-- Only system can insert credits (via service role)
-- Application code uses service role for credit operations

-- Comments
COMMENT ON TABLE public.credits IS 'Credit balance transactions for prepaid usage';
COMMENT ON COLUMN public.credits.balance_after IS 'Running balance after this transaction';


-- ============================================
-- TABLE: webhook_events
-- Purpose: Log of received webhook events (Stripe, etc.)
-- Module: Billing
-- ============================================
CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Source
    source TEXT NOT NULL DEFAULT 'stripe', -- 'stripe', 'github', 'vercel', etc.
    
    -- Event identity
    event_id TEXT NOT NULL, -- Provider's event ID
    event_type TEXT NOT NULL, -- e.g., 'invoice.paid', 'customer.subscription.updated'
    
    -- Payload
    payload JSONB NOT NULL,
    
    -- Processing
    status public.webhook_status NOT NULL DEFAULT 'pending',
    
    -- Attempts
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    -- Processing result
    processed_at TIMESTAMPTZ,
    result JSONB, -- What was done in response
    
    -- Related tenant (if applicable)
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    
    -- Idempotency
    idempotency_key TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_webhook_event UNIQUE (source, event_id)
);

-- Indexes for webhook_events
CREATE INDEX idx_webhook_events_source ON public.webhook_events(source, event_type);
CREATE INDEX idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX idx_webhook_events_pending ON public.webhook_events(next_retry_at) 
    WHERE status IN ('pending', 'failed') AND attempts < 5;
CREATE INDEX idx_webhook_events_tenant ON public.webhook_events(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_webhook_events_created ON public.webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_type ON public.webhook_events(event_type, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER trigger_webhook_events_updated_at
    BEFORE UPDATE ON public.webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for webhook_events (admin only)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook events for their tenant
CREATE POLICY "webhook_events_select" ON public.webhook_events
    FOR SELECT
    USING (
        tenant_id IS NOT NULL AND public.user_has_tenant_role(tenant_id, 'admin')
    );

-- Comments
COMMENT ON TABLE public.webhook_events IS 'Log of received webhook events for idempotency and debugging';
COMMENT ON COLUMN public.webhook_events.idempotency_key IS 'Key to prevent duplicate processing';


-- ============================================
-- FUNCTION: get_tenant_credit_balance
-- Purpose: Calculate current credit balance for a tenant
-- ============================================
CREATE OR REPLACE FUNCTION public.get_tenant_credit_balance(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
    balance INTEGER;
BEGIN
    SELECT COALESCE(
        (SELECT balance_after FROM public.credits 
         WHERE tenant_id = p_tenant_id 
         ORDER BY created_at DESC 
         LIMIT 1),
        0
    ) INTO balance;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_tenant_credit_balance(UUID) IS 
'Returns the current credit balance for a tenant';


-- ============================================
-- FUNCTION: add_credit_transaction
-- Purpose: Add a credit transaction with balance calculation
-- ============================================
CREATE OR REPLACE FUNCTION public.add_credit_transaction(
    p_tenant_id UUID,
    p_type public.credit_transaction_type,
    p_amount INTEGER,
    p_description TEXT DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
    credit_id UUID;
BEGIN
    -- Get current balance
    current_balance := public.get_tenant_credit_balance(p_tenant_id);
    
    -- Calculate new balance
    new_balance := current_balance + p_amount;
    
    -- Prevent negative balance
    IF new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient credit balance';
    END IF;
    
    -- Insert transaction
    INSERT INTO public.credits (
        tenant_id, transaction_type, amount, balance_after,
        description, reference_type, reference_id, expires_at,
        created_by, metadata
    ) VALUES (
        p_tenant_id, p_type, p_amount, new_balance,
        p_description, p_reference_type, p_reference_id, p_expires_at,
        auth.uid(), p_metadata
    )
    RETURNING id INTO credit_id;
    
    RETURN credit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.add_credit_transaction IS 
'Adds a credit transaction and calculates running balance';


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.5 PART 1 COMPLETION: BILLING TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] plans table with limits and features JSONB
-- [x] plans indexes (4 indexes)
-- [x] plans RLS policies (2 policies)
-- [x] subscriptions table with Stripe integration
-- [x] subscriptions indexes (8 indexes)
-- [x] subscriptions RLS policies (3 policies)
-- [x] subscription_items table for metered billing
-- [x] subscription_items indexes (4 indexes)
-- [x] subscription_items RLS policies (1 policy)
-- [x] usage_records table
-- [x] usage_records indexes (6 indexes)
-- [x] usage_records RLS policies (2 policies)
-- [x] invoices table
-- [x] invoices indexes (6 indexes)
-- [x] invoices RLS policies (1 policy)
-- [x] payment_methods table
-- [x] payment_methods indexes (4 indexes)
-- [x] payment_methods RLS policies (4 policies)
-- [x] credits table
-- [x] credits indexes (5 indexes)
-- [x] credits RLS policies (1 policy)
-- [x] webhook_events table
-- [x] webhook_events indexes (6 indexes)
-- [x] webhook_events RLS policies (1 policy)
-- [x] get_tenant_credit_balance() function
-- [x] add_credit_transaction() function
-- ═══════════════════════════════════════════════════════════════════════════════
