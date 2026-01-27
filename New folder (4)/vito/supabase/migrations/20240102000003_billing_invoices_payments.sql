-- ============================================================================
-- OLYMPUS 2.0 - BILLING SCHEMA (Part 3: Invoices & Payment Methods)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- INVOICES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    
    -- Stripe references
    stripe_invoice_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    
    -- Invoice details
    number TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    currency TEXT NOT NULL DEFAULT 'usd',
    
    -- Amounts (in cents)
    subtotal INTEGER NOT NULL DEFAULT 0,
    tax INTEGER DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    amount_due INTEGER NOT NULL DEFAULT 0,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    amount_remaining INTEGER NOT NULL DEFAULT 0,
    
    -- Period
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    
    -- URLs
    hosted_invoice_url TEXT,
    invoice_pdf TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON public.invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON public.invoices(created_at DESC);

-- ----------------------------------------------------------------------------
-- INVOICE LINE ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    
    -- Stripe reference
    stripe_line_item_id TEXT NOT NULL,
    
    -- Line item details
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_amount INTEGER NOT NULL DEFAULT 0,
    amount INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'usd',
    
    -- Period (for subscription items)
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- Type
    type TEXT CHECK (type IN ('subscription', 'invoiceitem')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Line items indexes
CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON public.invoice_line_items(invoice_id);

-- ----------------------------------------------------------------------------
-- PAYMENT METHODS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Stripe reference
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    
    -- Payment method details
    type TEXT NOT NULL CHECK (type IN ('card', 'bank_account', 'link', 'sepa_debit')),
    
    -- Card details (if type = card)
    brand TEXT,
    last4 TEXT NOT NULL,
    exp_month INTEGER,
    exp_year INTEGER,
    funding TEXT, -- credit, debit, prepaid
    
    -- Billing details
    billing_name TEXT,
    billing_email TEXT,
    billing_address JSONB,
    
    -- Status
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment methods indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON public.payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe ON public.payment_methods(stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON public.payment_methods(tenant_id, is_default) WHERE is_default = true;

-- Ensure only one default per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_one_default 
    ON public.payment_methods(tenant_id) 
    WHERE is_default = true AND is_active = true;
