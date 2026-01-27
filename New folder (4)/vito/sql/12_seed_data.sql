-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 12_seed_data.sql
-- Purpose: Seed data for initial setup (roles, plans, settings, feature flags)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run LAST after all table definitions
-- NOTE: This file is idempotent - safe to run multiple times
-- 
-- ═══════════════════════════════════════════════════════════════════════════════


-- ============================================
-- SEED: Default System Roles
-- ============================================
INSERT INTO public.roles (name, display_name, description, permissions, hierarchy_level, is_system)
VALUES 
    (
        'super_admin',
        'Super Administrator',
        'Full platform access - Anthropic staff only',
        '["*"]'::jsonb,
        100,
        TRUE
    ),
    (
        'platform_admin',
        'Platform Administrator',
        'Platform administration without billing access',
        '["users:*", "tenants:*", "support:*", "analytics:read"]'::jsonb,
        90,
        TRUE
    ),
    (
        'support',
        'Support Agent',
        'Customer support access',
        '["users:read", "tenants:read", "support:*"]'::jsonb,
        50,
        TRUE
    ),
    (
        'user',
        'User',
        'Standard user role',
        '["profile:*", "projects:*", "builds:*", "deployments:*"]'::jsonb,
        10,
        TRUE
    )
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    hierarchy_level = EXCLUDED.hierarchy_level;


-- ============================================
-- SEED: Subscription Plans
-- ============================================
INSERT INTO public.plans (
    name, slug, description, tier,
    price_monthly_cents, price_yearly_cents,
    limits, features,
    is_featured, badge_text, sort_order, trial_days
)
VALUES 
    -- Free Plan
    (
        'Free',
        'free',
        'Perfect for trying out OLYMPUS',
        'free',
        0,
        0,
        '{
            "projects": 1,
            "builds_per_month": 10,
            "team_members": 1,
            "storage_gb": 1,
            "bandwidth_gb": 5,
            "custom_domains": 0,
            "api_requests_per_day": 100,
            "concurrent_builds": 1,
            "build_timeout_minutes": 10,
            "support_level": "community",
            "retention_days": 7
        }'::jsonb,
        '{
            "ai_code_generation": true,
            "live_preview": true,
            "one_click_deploy": true,
            "version_history": false,
            "team_collaboration": false,
            "custom_domains": false,
            "priority_builds": false,
            "advanced_analytics": false,
            "api_access": false,
            "white_labeling": false,
            "sla_guarantee": false,
            "dedicated_support": false,
            "export_code": true,
            "github_integration": false
        }'::jsonb,
        FALSE,
        NULL,
        1,
        0 -- No trial for free
    ),
    
    -- Starter Plan
    (
        'Starter',
        'starter',
        'For individual developers and small projects',
        'starter',
        1900, -- $19/month
        19000, -- $190/year (2 months free)
        '{
            "projects": 5,
            "builds_per_month": 50,
            "team_members": 1,
            "storage_gb": 5,
            "bandwidth_gb": 20,
            "custom_domains": 1,
            "api_requests_per_day": 1000,
            "concurrent_builds": 1,
            "build_timeout_minutes": 20,
            "support_level": "email",
            "retention_days": 30
        }'::jsonb,
        '{
            "ai_code_generation": true,
            "live_preview": true,
            "one_click_deploy": true,
            "version_history": true,
            "team_collaboration": false,
            "custom_domains": true,
            "priority_builds": false,
            "advanced_analytics": false,
            "api_access": true,
            "white_labeling": false,
            "sla_guarantee": false,
            "dedicated_support": false,
            "export_code": true,
            "github_integration": true
        }'::jsonb,
        FALSE,
        NULL,
        2,
        14
    ),
    
    -- Pro Plan
    (
        'Pro',
        'pro',
        'For professional developers and growing teams',
        'pro',
        4900, -- $49/month
        49000, -- $490/year (2 months free)
        '{
            "projects": 20,
            "builds_per_month": 200,
            "team_members": 5,
            "storage_gb": 20,
            "bandwidth_gb": 100,
            "custom_domains": 5,
            "api_requests_per_day": 10000,
            "concurrent_builds": 3,
            "build_timeout_minutes": 30,
            "support_level": "priority",
            "retention_days": 90
        }'::jsonb,
        '{
            "ai_code_generation": true,
            "live_preview": true,
            "one_click_deploy": true,
            "version_history": true,
            "team_collaboration": true,
            "custom_domains": true,
            "priority_builds": true,
            "advanced_analytics": true,
            "api_access": true,
            "white_labeling": false,
            "sla_guarantee": false,
            "dedicated_support": false,
            "export_code": true,
            "github_integration": true
        }'::jsonb,
        TRUE,
        'Most Popular',
        3,
        14
    ),
    
    -- Business Plan
    (
        'Business',
        'business',
        'For larger teams and organizations',
        'business',
        14900, -- $149/month
        149000, -- $1490/year (2 months free)
        '{
            "projects": 100,
            "builds_per_month": 1000,
            "team_members": 25,
            "storage_gb": 100,
            "bandwidth_gb": 500,
            "custom_domains": 20,
            "api_requests_per_day": 100000,
            "concurrent_builds": 10,
            "build_timeout_minutes": 60,
            "support_level": "dedicated",
            "retention_days": 365
        }'::jsonb,
        '{
            "ai_code_generation": true,
            "live_preview": true,
            "one_click_deploy": true,
            "version_history": true,
            "team_collaboration": true,
            "custom_domains": true,
            "priority_builds": true,
            "advanced_analytics": true,
            "api_access": true,
            "white_labeling": true,
            "sla_guarantee": true,
            "dedicated_support": true,
            "export_code": true,
            "github_integration": true,
            "sso": true,
            "audit_logs": true
        }'::jsonb,
        FALSE,
        'Best Value',
        4,
        14
    ),
    
    -- Enterprise Plan
    (
        'Enterprise',
        'enterprise',
        'Custom solutions for large enterprises',
        'enterprise',
        0, -- Custom pricing
        0, -- Custom pricing
        '{
            "projects": -1,
            "builds_per_month": -1,
            "team_members": -1,
            "storage_gb": -1,
            "bandwidth_gb": -1,
            "custom_domains": -1,
            "api_requests_per_day": -1,
            "concurrent_builds": -1,
            "build_timeout_minutes": 120,
            "support_level": "enterprise",
            "retention_days": -1
        }'::jsonb,
        '{
            "ai_code_generation": true,
            "live_preview": true,
            "one_click_deploy": true,
            "version_history": true,
            "team_collaboration": true,
            "custom_domains": true,
            "priority_builds": true,
            "advanced_analytics": true,
            "api_access": true,
            "white_labeling": true,
            "sla_guarantee": true,
            "dedicated_support": true,
            "export_code": true,
            "github_integration": true,
            "sso": true,
            "audit_logs": true,
            "custom_integrations": true,
            "on_premise": true,
            "dedicated_infrastructure": true
        }'::jsonb,
        FALSE,
        'Contact Us',
        5,
        30
    )
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly_cents = EXCLUDED.price_monthly_cents,
    price_yearly_cents = EXCLUDED.price_yearly_cents,
    limits = EXCLUDED.limits,
    features = EXCLUDED.features,
    is_featured = EXCLUDED.is_featured,
    badge_text = EXCLUDED.badge_text,
    sort_order = EXCLUDED.sort_order,
    trial_days = EXCLUDED.trial_days,
    updated_at = NOW();


-- ============================================
-- SEED: System Settings
-- ============================================
INSERT INTO public.system_settings (key, value, value_type, description, category, is_public)
VALUES
    -- Platform settings
    ('platform.name', '"OLYMPUS 2.0"', 'string', 'Platform name', 'platform', TRUE),
    ('platform.tagline', '"Build apps with AI"', 'string', 'Platform tagline', 'platform', TRUE),
    ('platform.version', '"2.0.0"', 'string', 'Current platform version', 'platform', TRUE),
    ('platform.maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 'platform', TRUE),
    ('platform.maintenance_message', '""', 'string', 'Maintenance mode message', 'platform', TRUE),
    
    -- Build settings
    ('builds.default_timeout_minutes', '30', 'number', 'Default build timeout', 'builds', FALSE),
    ('builds.max_concurrent_global', '100', 'number', 'Max concurrent builds globally', 'builds', FALSE),
    ('builds.queue_priority_enabled', 'true', 'boolean', 'Enable priority queue for paid plans', 'builds', FALSE),
    
    -- AI settings
    ('ai.default_provider', '"anthropic"', 'string', 'Default LLM provider', 'ai', FALSE),
    ('ai.default_model', '"claude-sonnet-4-20250514"', 'string', 'Default LLM model', 'ai', FALSE),
    ('ai.fallback_provider', '"openai"', 'string', 'Fallback LLM provider', 'ai', FALSE),
    ('ai.max_tokens_per_request', '100000', 'number', 'Max tokens per LLM request', 'ai', FALSE),
    
    -- Storage settings
    ('storage.max_file_size_mb', '100', 'number', 'Max file upload size in MB', 'storage', TRUE),
    ('storage.allowed_extensions', '["*"]', 'array', 'Allowed file extensions', 'storage', TRUE),
    ('storage.virus_scan_enabled', 'true', 'boolean', 'Enable virus scanning', 'storage', FALSE),
    
    -- Security settings
    ('security.session_timeout_hours', '24', 'number', 'Session timeout in hours', 'security', FALSE),
    ('security.max_login_attempts', '5', 'number', 'Max failed login attempts before lockout', 'security', FALSE),
    ('security.lockout_duration_minutes', '30', 'number', 'Account lockout duration', 'security', FALSE),
    ('security.require_email_verification', 'true', 'boolean', 'Require email verification', 'security', FALSE),
    
    -- Email settings
    ('email.from_address', '"noreply@olympus.dev"', 'string', 'Default from email address', 'email', FALSE),
    ('email.from_name', '"OLYMPUS"', 'string', 'Default from name', 'email', FALSE),
    
    -- Billing settings
    ('billing.stripe_enabled', 'true', 'boolean', 'Enable Stripe payments', 'billing', FALSE),
    ('billing.trial_days_default', '14', 'number', 'Default trial period in days', 'billing', FALSE),
    ('billing.grace_period_days', '7', 'number', 'Grace period after payment failure', 'billing', FALSE)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();


-- ============================================
-- SEED: Feature Flags
-- ============================================
INSERT INTO public.feature_flags (key, name, description, is_enabled, rollout_percentage, category)
VALUES
    ('new_builder_ui', 'New Builder UI', 'Redesigned builder interface', TRUE, 100, 'release'),
    ('ai_suggestions', 'AI Code Suggestions', 'Real-time AI suggestions while editing', TRUE, 50, 'experiment'),
    ('collaborative_editing', 'Collaborative Editing', 'Real-time collaboration on projects', FALSE, 0, 'release'),
    ('github_auto_deploy', 'GitHub Auto Deploy', 'Automatic deployment on GitHub push', TRUE, 100, 'release'),
    ('dark_mode', 'Dark Mode', 'Dark theme support', TRUE, 100, 'release'),
    ('voice_commands', 'Voice Commands', 'Voice-based project creation', FALSE, 10, 'experiment'),
    ('mobile_app', 'Mobile App', 'Mobile app access', FALSE, 0, 'release'),
    ('custom_agents', 'Custom AI Agents', 'User-defined AI agents', FALSE, 5, 'experiment')
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_enabled = EXCLUDED.is_enabled,
    rollout_percentage = EXCLUDED.rollout_percentage,
    updated_at = NOW();


-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- Run these to verify the schema is correctly set up
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check table counts
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    
    RAISE NOTICE 'Total tables created: %', table_count;
    
    IF table_count < 30 THEN
        RAISE WARNING 'Expected at least 30 tables, found %', table_count;
    END IF;
END $$;

-- Check RLS is enabled on all tables
DO $$
DECLARE
    tables_without_rls INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_without_rls
    FROM pg_tables t
    LEFT JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
      AND NOT c.relrowsecurity
      AND t.tablename NOT IN ('schema_migrations'); -- Exclude system tables
    
    IF tables_without_rls > 0 THEN
        RAISE WARNING 'Tables without RLS enabled: %', tables_without_rls;
    ELSE
        RAISE NOTICE 'All tables have RLS enabled ✓';
    END IF;
END $$;

-- Check seed data
DO $$
DECLARE
    plan_count INTEGER;
    role_count INTEGER;
    setting_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO plan_count FROM public.plans;
    SELECT COUNT(*) INTO role_count FROM public.roles;
    SELECT COUNT(*) INTO setting_count FROM public.system_settings;
    
    RAISE NOTICE 'Seed data: % plans, % roles, % settings', plan_count, role_count, setting_count;
END $$;

-- List all tables with row counts (for verification)
-- SELECT 
--     schemaname,
--     relname as table_name,
--     n_live_tup as row_count
-- FROM pg_stat_user_tables 
-- WHERE schemaname = 'public'
-- ORDER BY relname;


-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.6 PART 3 COMPLETION: SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] Default system roles (4 roles)
-- [x] Subscription plans (5 plans: free, starter, pro, business, enterprise)
-- [x] System settings (24 settings)
-- [x] Feature flags (8 flags)
-- [x] Verification queries
-- ═══════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════
-- 
--                    OLYMPUS 2.0 DATABASE SCHEMA COMPLETE
-- 
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- SUMMARY:
-- ────────────────────────────────────────────────────────────────────────────────
-- Total Tables:          33+
-- Total RLS Policies:    100+
-- Total Indexes:         170+
-- Total Functions:       35+
-- Total Triggers:        25+
-- Total ENUM Types:      14
-- 
-- MODULES:
-- ────────────────────────────────────────────────────────────────────────────────
-- 1. Auth Module:        profiles, roles, user_roles
-- 2. Tenant Module:      tenants, tenant_members, tenant_invitations, 
--                        tenant_settings, tenant_domains
-- 3. Project Module:     projects, project_versions, project_files,
--                        project_env_vars, project_collaborators
-- 4. Build Module:       builds, build_logs, build_outputs, 
--                        agent_executions, build_costs
-- 5. Deploy Module:      deployments, deployment_logs, domains, ssl_certificates
-- 6. Billing Module:     plans, subscriptions, subscription_items, usage_records,
--                        invoices, payment_methods, credits, webhook_events
-- 7. Storage Module:     files, file_versions, storage_usage
-- 8. Analytics Module:   events, metrics, reports
-- 9. System Module:      audit_logs, system_settings, feature_flags
--
-- EXECUTION ORDER:
-- ────────────────────────────────────────────────────────────────────────────────
-- 1.  00_extensions.sql
-- 2.  01_types.sql
-- 3.  02_functions.sql
-- 4.  03_auth_tables.sql
-- 5.  04_tenant_tables.sql
-- 6.  05_project_tables.sql
-- 7.  06_build_tables.sql
-- 8.  07_deploy_tables.sql
-- 9.  08_billing_tables.sql
-- 10. 09_storage_tables.sql
-- 11. 10_analytics_tables.sql
-- 12. 11_system_tables.sql
-- 13. 12_seed_data.sql
--
-- ═══════════════════════════════════════════════════════════════════════════════
