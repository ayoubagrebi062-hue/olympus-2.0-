-- ============================================================================
-- OLYMPUS 2.0 - BILLING SCHEMA (Part 5: RLS Policies)
-- ============================================================================

-- Enable RLS on all billing tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PLANS POLICIES (public read, admin write)
-- ----------------------------------------------------------------------------
CREATE POLICY "Plans are viewable by everyone"
    ON public.plans FOR SELECT
    USING (is_active = true AND is_public = true);

CREATE POLICY "Service role can manage plans"
    ON public.plans FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own tenant subscriptions"
    ON public.subscriptions FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "Service role can manage subscriptions"
    ON public.subscriptions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- USAGE RECORDS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own tenant usage"
    ON public.usage_records FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "Service role can manage usage"
    ON public.usage_records FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- USAGE AGGREGATES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own tenant aggregates"
    ON public.usage_aggregates FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "Service role can manage aggregates"
    ON public.usage_aggregates FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- CREDITS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own tenant credits"
    ON public.credits FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "Service role can manage credits"
    ON public.credits FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- INVOICES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own tenant invoices"
    ON public.invoices FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "Service role can manage invoices"
    ON public.invoices FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- INVOICE LINE ITEMS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own invoice line items"
    ON public.invoice_line_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.invoices i 
        WHERE i.id = invoice_id 
        AND public.user_has_tenant_access(i.tenant_id)
    ));

CREATE POLICY "Service role can manage line items"
    ON public.invoice_line_items FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- PAYMENT METHODS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own tenant payment methods"
    ON public.payment_methods FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "Service role can manage payment methods"
    ON public.payment_methods FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- WEBHOOK EVENTS POLICIES (service role only)
-- ----------------------------------------------------------------------------
CREATE POLICY "Service role can manage webhooks"
    ON public.webhook_events FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- BILLING CUSTOMERS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own tenant billing customer"
    ON public.billing_customers FOR SELECT
    USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "Service role can manage billing customers"
    ON public.billing_customers FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
