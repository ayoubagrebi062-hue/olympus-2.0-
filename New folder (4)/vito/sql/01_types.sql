-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 01_types.sql
-- Purpose: Custom ENUM types and composite types
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run AFTER 00_extensions.sql
-- NOTE: ENUMs are immutable - adding values requires ALTER TYPE
-- 
-- ═══════════════════════════════════════════════════════════════════════════════

-- ============================================
-- TYPE: plan_tier
-- Purpose: Subscription plan levels
-- Used by: plans, subscriptions, feature gating
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.plan_tier AS ENUM (
        'free',        -- $0/month, limited features
        'starter',     -- $19/month, individual users
        'pro',         -- $49/month, small teams
        'business',    -- $149/month, larger teams
        'enterprise'   -- Custom pricing, unlimited
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.plan_tier IS 'Subscription plan tiers with ascending feature levels';

-- ============================================
-- TYPE: subscription_status
-- Purpose: Current state of a subscription
-- Used by: subscriptions table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.subscription_status AS ENUM (
        'trialing',       -- In free trial period
        'active',         -- Paid and active
        'past_due',       -- Payment failed, grace period
        'canceled',       -- User canceled, access until period end
        'unpaid',         -- Multiple payment failures
        'incomplete',     -- Initial payment pending
        'paused'          -- Temporarily suspended
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.subscription_status IS 'Stripe-aligned subscription lifecycle states';

-- ============================================
-- TYPE: build_status
-- Purpose: State of a build job
-- Used by: builds table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.build_status AS ENUM (
        'pending',        -- Queued, waiting to start
        'initializing',   -- Setting up environment
        'running',        -- Agents actively working
        'validating',     -- Running quality checks
        'completed',      -- Successfully finished
        'failed',         -- Error during execution
        'canceled',       -- User canceled
        'timeout'         -- Exceeded time limit
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.build_status IS 'Build job lifecycle states';

-- ============================================
-- TYPE: deployment_status
-- Purpose: State of a deployment
-- Used by: deployments table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.deployment_status AS ENUM (
        'pending',        -- Waiting to deploy
        'building',       -- Building deployment artifact
        'deploying',      -- Uploading to provider
        'verifying',      -- Health checks running
        'live',           -- Successfully deployed and accessible
        'failed',         -- Deployment failed
        'rolled_back',    -- Reverted to previous version
        'canceled'        -- User canceled
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.deployment_status IS 'Deployment lifecycle states';

-- ============================================
-- TYPE: tenant_role
-- Purpose: User's role within a tenant/organization
-- Used by: tenant_members table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.tenant_role AS ENUM (
        'owner',          -- Full control, can delete tenant
        'admin',          -- Manage members, billing, settings
        'developer',      -- Create/edit projects, deploy
        'viewer'          -- Read-only access
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.tenant_role IS 'Role hierarchy within a tenant organization';

-- ============================================
-- TYPE: invitation_status
-- Purpose: State of a team invitation
-- Used by: tenant_invitations table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.invitation_status AS ENUM (
        'pending',        -- Sent, awaiting response
        'accepted',       -- User joined the tenant
        'declined',       -- User declined invitation
        'expired',        -- Past expiration date
        'revoked'         -- Admin canceled invitation
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.invitation_status IS 'Team invitation lifecycle states';

-- ============================================
-- TYPE: domain_status
-- Purpose: Custom domain verification state
-- Used by: tenant_domains, domains tables
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.domain_status AS ENUM (
        'pending',        -- Awaiting DNS configuration
        'verifying',      -- DNS check in progress
        'verified',       -- DNS verified, ready to use
        'active',         -- SSL provisioned, serving traffic
        'failed',         -- Verification failed
        'expired'         -- Certificate expired
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.domain_status IS 'Custom domain setup lifecycle states';

-- ============================================
-- TYPE: log_level
-- Purpose: Severity level for logs
-- Used by: build_logs, deployment_logs tables
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.log_level AS ENUM (
        'debug',          -- Verbose debugging info
        'info',           -- General information
        'warn',           -- Warning, non-critical issue
        'error',          -- Error, operation failed
        'fatal'           -- Critical, system failure
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.log_level IS 'Log severity levels (ascending severity)';

-- ============================================
-- TYPE: deployment_target
-- Purpose: Where a project gets deployed
-- Used by: deployments table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.deployment_target AS ENUM (
        'olympus',        -- OLYMPUS hosting (Vercel + Railway)
        'vercel',         -- User's Vercel account
        'railway',        -- User's Railway account
        'netlify',        -- User's Netlify account (future)
        'export'          -- ZIP download / GitHub push
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.deployment_target IS 'Supported deployment target platforms';

-- ============================================
-- TYPE: environment_type
-- Purpose: Deployment environment classification
-- Used by: project_env_vars, deployments tables
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.environment_type AS ENUM (
        'development',    -- Local/preview builds
        'staging',        -- Pre-production testing
        'production'      -- Live customer-facing
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.environment_type IS 'Deployment environment types for env vars and configs';

-- ============================================
-- TYPE: file_category
-- Purpose: Classification of stored files
-- Used by: files, project_files tables
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.file_category AS ENUM (
        'image',          -- Images (png, jpg, svg, etc.)
        'document',       -- Documents (pdf, docx, etc.)
        'video',          -- Video files
        'audio',          -- Audio files
        'archive',        -- Compressed archives (zip, tar)
        'code',           -- Source code files
        'other'           -- Uncategorized
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.file_category IS 'File type classification for storage management';

-- ============================================
-- TYPE: webhook_status
-- Purpose: Processing state for webhook events
-- Used by: webhook_events table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.webhook_status AS ENUM (
        'pending',        -- Received, not yet processed
        'processing',     -- Currently being handled
        'completed',      -- Successfully processed
        'failed',         -- Processing failed
        'skipped'         -- Intentionally not processed
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.webhook_status IS 'Webhook event processing states';

-- ============================================
-- TYPE: credit_transaction_type
-- Purpose: Type of credit balance change
-- Used by: credits table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.credit_transaction_type AS ENUM (
        'purchase',       -- Bought credits
        'bonus',          -- Promotional credits
        'refund',         -- Refunded credits
        'usage',          -- Spent on builds/deploys
        'expiry',         -- Credits expired
        'adjustment'      -- Manual admin adjustment
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.credit_transaction_type IS 'Credit balance transaction types';

-- ============================================
-- TYPE: audit_action
-- Purpose: Classification of audited actions
-- Used by: audit_logs table
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.audit_action AS ENUM (
        'create',         -- Resource created
        'read',           -- Resource accessed (optional)
        'update',         -- Resource modified
        'delete',         -- Resource deleted (soft or hard)
        'login',          -- User authentication
        'logout',         -- User signed out
        'export',         -- Data exported
        'invite',         -- User invited
        'permission'      -- Permission changed
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.audit_action IS 'Audit log action classifications';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.1 COMPLETION: TYPES
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] plan_tier (5 values)
-- [x] subscription_status (7 values)
-- [x] build_status (8 values)
-- [x] deployment_status (8 values)
-- [x] tenant_role (4 values)
-- [x] invitation_status (5 values)
-- [x] domain_status (6 values)
-- [x] log_level (5 values)
-- [x] deployment_target (5 values)
-- [x] environment_type (3 values)
-- [x] file_category (7 values)
-- [x] webhook_status (5 values)
-- [x] credit_transaction_type (6 values)
-- [x] audit_action (9 values)
-- TOTAL: 14 ENUM types defined
-- ═══════════════════════════════════════════════════════════════════════════════
