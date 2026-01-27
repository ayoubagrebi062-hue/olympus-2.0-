-- ============================================================================
-- OLYMPUS 2.0 - BILLING SCHEMA (Part 6: Functions & Seed Data)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- GET TENANT SUBSCRIPTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tenant_subscription(p_tenant_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_id UUID,
    plan_tier TEXT,
    plan_name TEXT,
    status TEXT,
    billing_period TEXT,
    current_period_end TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    limits JSONB,
    features TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.plan_id,
        p.tier,
        p.name,
        s.status,
        s.billing_period,
        s.current_period_end,
        s.trial_end,
        p.limits,
        p.features
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.tenant_id = p_tenant_id
    AND s.status NOT IN ('canceled', 'incomplete_expired')
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- GET USAGE FOR PERIOD
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_usage_for_period(
    p_tenant_id UUID,
    p_metric TEXT,
    p_period_start TIMESTAMPTZ DEFAULT date_trunc('month', now()),
    p_period_end TIMESTAMPTZ DEFAULT date_trunc('month', now()) + interval '1 month'
)
RETURNS BIGINT AS $$
DECLARE
    v_total BIGINT;
BEGIN
    SELECT COALESCE(SUM(quantity), 0) INTO v_total
    FROM public.usage_records
    WHERE tenant_id = p_tenant_id
    AND metric = p_metric
    AND period_start >= p_period_start
    AND period_end <= p_period_end;
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- INCREMENT USAGE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_usage(
    p_tenant_id UUID,
    p_metric TEXT,
    p_quantity INTEGER DEFAULT 1,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_record_id UUID;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- Check idempotency
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_record_id FROM public.usage_records 
        WHERE idempotency_key = p_idempotency_key;
        IF FOUND THEN RETURN v_record_id; END IF;
    END IF;
    
    -- Calculate period
    v_period_start := date_trunc('month', now());
    v_period_end := v_period_start + interval '1 month';
    
    -- Insert usage record
    INSERT INTO public.usage_records (tenant_id, metric, quantity, period_start, period_end, idempotency_key)
    VALUES (p_tenant_id, p_metric, p_quantity, v_period_start, v_period_end, p_idempotency_key)
    RETURNING id INTO v_record_id;
    
    -- Update aggregate
    INSERT INTO public.usage_aggregates (tenant_id, metric, period_start, period_end, total_quantity)
    VALUES (p_tenant_id, p_metric, v_period_start::date, v_period_end::date, p_quantity)
    ON CONFLICT (tenant_id, metric, period_start)
    DO UPDATE SET total_quantity = usage_aggregates.total_quantity + p_quantity, last_updated_at = now();
    
    RETURN v_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- CHECK USAGE LIMIT
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_usage_limit(
    p_tenant_id UUID,
    p_metric TEXT,
    p_quantity_to_add INTEGER DEFAULT 1
)
RETURNS TABLE (allowed BOOLEAN, current_usage BIGINT, limit_value BIGINT, remaining BIGINT) AS $$
DECLARE
    v_limits JSONB;
    v_limit BIGINT;
    v_current BIGINT;
BEGIN
    -- Get plan limits
    SELECT p.limits INTO v_limits
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.tenant_id = p_tenant_id AND s.status IN ('active', 'trialing')
    LIMIT 1;
    
    IF v_limits IS NULL THEN
        RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;
    
    -- Get limit for metric
    v_limit := COALESCE((v_limits ->> (p_metric || '_per_month'))::BIGINT, 0);
    IF v_limit = -1 THEN v_limit := 999999999; END IF; -- Unlimited
    
    -- Get current usage
    v_current := public.get_usage_for_period(p_tenant_id, p_metric);
    
    RETURN QUERY SELECT 
        (v_current + p_quantity_to_add) <= v_limit,
        v_current,
        v_limit,
        GREATEST(v_limit - v_current, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
