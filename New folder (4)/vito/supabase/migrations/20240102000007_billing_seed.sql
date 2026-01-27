-- ============================================================================
-- OLYMPUS 2.0 - BILLING SCHEMA (Part 7: Seed Data)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SEED DEFAULT PLANS
-- ----------------------------------------------------------------------------
INSERT INTO public.plans (tier, name, description, price_monthly, price_annual, limits, features, sort_order)
VALUES 
    ('free', 'Free', 'Perfect for trying out OLYMPUS', 0, 0,
     '{"builds_per_month":3,"deploys_per_month":1,"projects":1,"team_members":1,"storage_gb":0.1,"api_calls_per_day":100,"ai_tokens_per_month":10000}',
     ARRAY['export_code'], 0),
     
    ('starter', 'Starter', 'For individuals and small projects', 1900, 19000,
     '{"builds_per_month":20,"deploys_per_month":10,"projects":5,"team_members":3,"storage_gb":1,"api_calls_per_day":1000,"ai_tokens_per_month":100000}',
     ARRAY['export_code','custom_domain','team_collaboration'], 1),
     
    ('pro', 'Pro', 'For growing teams and businesses', 4900, 49000,
     '{"builds_per_month":100,"deploys_per_month":50,"projects":20,"team_members":10,"storage_gb":10,"api_calls_per_day":10000,"ai_tokens_per_month":500000}',
     ARRAY['export_code','custom_domain','team_collaboration','white_label','advanced_analytics','api_access','multiple_environments'], 2),
     
    ('business', 'Business', 'For large teams with advanced needs', 14900, 149000,
     '{"builds_per_month":500,"deploys_per_month":200,"projects":-1,"team_members":25,"storage_gb":50,"api_calls_per_day":50000,"ai_tokens_per_month":2000000}',
     ARRAY['export_code','custom_domain','team_collaboration','white_label','advanced_analytics','api_access','multiple_environments','priority_support','sso','audit_logs','custom_branding'], 3),
     
    ('enterprise', 'Enterprise', 'Custom solutions for large organizations', 0, 0,
     '{"builds_per_month":-1,"deploys_per_month":-1,"projects":-1,"team_members":-1,"storage_gb":-1,"api_calls_per_day":-1,"ai_tokens_per_month":-1}',
     ARRAY['export_code','custom_domain','team_collaboration','white_label','advanced_analytics','api_access','multiple_environments','priority_support','sso','audit_logs','custom_branding','dedicated_support','sla_guarantee','custom_integrations'], 4)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- GRANT EXECUTE ON FUNCTIONS
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_tenant_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_for_period(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_usage_limit(UUID, TEXT, INTEGER) TO authenticated;
-- increment_usage is service_role only (called from backend)
