# OLYMPUS 10X - PRACTICAL IMPLEMENTATION GUIDE

## EXECUTIVE SUMMARY

**Goal:** Transform Build API from authenticated endpoint → Enterprise AI Platform
**Timeline:** 5 weeks (phased approach)
**Risk Level:** LOW (backward compatible, feature flags, progressive rollout)
**ROI:** High - Features competitors don't have

---

## PHASE 1: FOUNDATION (Week 1) - START HERE

### 1.1 Database Migrations

**Create:** `src/lib/db/migrations/001_10x_foundation.sql`

```sql
-- Build Queue (for guest mode and rate limiting)
CREATE TABLE IF NOT EXISTS build_queue (
  queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  request_data JSONB NOT NULL,
  preview_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  position INTEGER,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ
);

CREATE INDEX idx_queue_status ON build_queue(status, created_at);
CREATE INDEX idx_queue_expires ON build_queue(expires_at) WHERE status = 'pending';

-- Build Analytics
CREATE TABLE IF NOT EXISTS build_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID REFERENCES ai_builds(build_id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),

  -- Performance metrics
  total_duration_ms INTEGER,
  agent_count INTEGER,
  token_count INTEGER,
  cost_usd DECIMAL(10,4),

  -- Quality metrics
  success_rate DECIMAL(5,2),
  error_count INTEGER,
  retry_count INTEGER,

  -- Pattern data
  description_embedding VECTOR(768), -- For similarity search
  tech_stack TEXT[],
  features_detected TEXT[],
  complexity_score INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_tenant ON build_analytics(tenant_id, created_at DESC);
CREATE INDEX idx_analytics_embedding ON build_analytics USING ivfflat (description_embedding vector_cosine_ops);

-- Build Costs (real-time tracking)
CREATE TABLE IF NOT EXISTS build_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID REFERENCES ai_builds(build_id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),

  phase TEXT NOT NULL,
  agent_name TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,4) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_costs_build ON build_costs(build_id);
CREATE INDEX idx_costs_tenant ON build_costs(tenant_id, created_at DESC);

-- Tenant Usage Tracking
CREATE TABLE IF NOT EXISTS tenant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),

  -- Monthly stats
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,

  builds_created INTEGER DEFAULT 0,
  builds_completed INTEGER DEFAULT 0,
  builds_failed INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10,2) DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, year, month)
);

-- Webhooks
CREATE TABLE IF NOT EXISTS tenant_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),

  event_type TEXT NOT NULL, -- 'build.started', 'build.completed', etc.
  url TEXT NOT NULL,
  secret TEXT, -- For signature verification
  headers JSONB, -- Custom headers

  is_active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 3,
  timeout_ms INTEGER DEFAULT 5000,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_tenant ON tenant_webhooks(tenant_id, event_type) WHERE is_active = true;

-- Rate Limit Tracking
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),

  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  requests_count INTEGER DEFAULT 0,
  limit_exceeded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, window_start)
);

CREATE INDEX idx_ratelimit_window ON rate_limits(tenant_id, window_end DESC);

-- Build Memory (learning patterns)
CREATE TABLE IF NOT EXISTS build_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),

  pattern_type TEXT NOT NULL, -- 'tech_stack', 'feature', 'style', etc.
  pattern_value JSONB NOT NULL,
  confidence DECIMAL(5,2) DEFAULT 0, -- 0-100
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_tenant ON build_memory(tenant_id, pattern_type, confidence DESC);
```

**Run migration:**
```bash
# From vito directory
psql $DATABASE_URL -f src/lib/db/migrations/001_10x_foundation.sql
```

---

### 1.2 Redis Setup (Build Queue)

**Create:** `src/lib/queue/redis-client.ts`

```typescript
import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 50, 2000);
      },
    });

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
    });

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });
  }

  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
```

**Create:** `src/lib/queue/build-queue.ts`

```typescript
import { getRedisClient } from './redis-client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface QueuedBuild {
  queueId: string;
  userId?: string;
  tenantId?: string;
  requestData: any;
  preview: {
    estimatedAgents: number;
    estimatedCost: number;
    estimatedDuration: string;
    features: string[];
  };
  createdAt: string;
  expiresAt: string;
}

export class BuildQueue {
  private redis;

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Add guest build to queue (for unauthenticated users)
   */
  async enqueueGuest(requestData: any, preview: any): Promise<string> {
    const supabase = await createServerSupabaseClient();

    // Store in PostgreSQL
    const { data, error } = await supabase
      .from('build_queue')
      .insert({
        request_data: requestData,
        preview_data: preview,
        status: 'pending',
      })
      .select('queue_id')
      .single();

    if (error) throw error;

    const queueId = data.queue_id;

    // Cache in Redis for fast access (1 hour TTL)
    await this.redis.setex(
      `queue:${queueId}`,
      3600,
      JSON.stringify({ queueId, requestData, preview, createdAt: new Date().toISOString() })
    );

    return queueId;
  }

  /**
   * Claim queued build after signup
   */
  async claim(queueId: string, userId: string, tenantId: string): Promise<any> {
    const supabase = await createServerSupabaseClient();

    // Get from PostgreSQL
    const { data, error } = await supabase
      .from('build_queue')
      .select('*')
      .eq('queue_id', queueId)
      .eq('status', 'pending')
      .single();

    if (error || !data) {
      throw new Error('Queue entry not found or expired');
    }

    // Update status
    await supabase
      .from('build_queue')
      .update({
        status: 'claimed',
        user_id: userId,
        tenant_id: tenantId,
        claimed_at: new Date().toISOString(),
      })
      .eq('queue_id', queueId);

    // Remove from Redis
    await this.redis.del(`queue:${queueId}`);

    return data.request_data;
  }

  /**
   * Add to waitlist when rate limited
   */
  async addToWaitlist(tenantId: string, userId: string, buildData: any): Promise<number> {
    const key = `waitlist:${tenantId}`;
    const position = await this.redis.rpush(key, JSON.stringify({ userId, buildData, timestamp: Date.now() }));

    // Set TTL on waitlist (24 hours)
    await this.redis.expire(key, 86400);

    return position;
  }

  /**
   * Process waitlist after rate limit window
   */
  async processWaitlist(tenantId: string): Promise<void> {
    const key = `waitlist:${tenantId}`;
    const item = await this.redis.lpop(key);

    if (item) {
      const { userId, buildData } = JSON.parse(item);
      // Trigger build creation
      // TODO: Implement build trigger
    }
  }

  /**
   * Clean expired queue entries (run as cron job)
   */
  async cleanExpired(): Promise<number> {
    const supabase = await createServerSupabaseClient();

    const { data } = await supabase
      .from('build_queue')
      .update({ status: 'expired' })
      .lt('expires_at', new Date().toISOString())
      .eq('status', 'pending')
      .select('queue_id');

    return data?.length || 0;
  }
}

export const buildQueue = new BuildQueue();
```

**Add to `.env.local`:**
```env
# Redis (for build queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

### 1.3 Feature Flags System

**Create:** `src/lib/features/flags.ts`

```typescript
/**
 * Feature flags for gradual 10X rollout
 */
export const FEATURE_FLAGS = {
  // Phase 1
  GUEST_MODE: process.env.NEXT_PUBLIC_FEATURE_GUEST_MODE === 'true',
  SMART_QUEUEING: process.env.NEXT_PUBLIC_FEATURE_SMART_QUEUEING === 'true',

  // Phase 2
  COST_TRACKING: process.env.NEXT_PUBLIC_FEATURE_COST_TRACKING === 'true',
  TIERED_ACCESS: process.env.NEXT_PUBLIC_FEATURE_TIERED_ACCESS === 'true',

  // Phase 3
  BUILD_ANALYTICS: process.env.NEXT_PUBLIC_FEATURE_BUILD_ANALYTICS === 'true',
  BUILD_MEMORY: process.env.NEXT_PUBLIC_FEATURE_BUILD_MEMORY === 'true',

  // Phase 4
  WEBHOOKS: process.env.NEXT_PUBLIC_FEATURE_WEBHOOKS === 'true',
  TEAM_COLLAB: process.env.NEXT_PUBLIC_FEATURE_TEAM_COLLAB === 'true',

  // Phase 5
  AUTO_TENANT: process.env.NEXT_PUBLIC_FEATURE_AUTO_TENANT === 'true',
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag] === true;
}

/**
 * Check if tenant has access to a feature based on plan tier
 */
export function hasFeatureAccess(planTier: string, feature: string): boolean {
  const tierFeatures: Record<string, string[]> = {
    free: ['GUEST_MODE'],
    starter: ['GUEST_MODE', 'SMART_QUEUEING', 'COST_TRACKING'],
    professional: ['GUEST_MODE', 'SMART_QUEUEING', 'COST_TRACKING', 'TIERED_ACCESS', 'BUILD_ANALYTICS'],
    ultimate: ['GUEST_MODE', 'SMART_QUEUEING', 'COST_TRACKING', 'TIERED_ACCESS', 'BUILD_ANALYTICS', 'BUILD_MEMORY', 'WEBHOOKS'],
    enterprise: Object.keys(FEATURE_FLAGS), // All features
  };

  return tierFeatures[planTier]?.includes(feature) || false;
}
```

**Add to `.env.local`:**
```env
# Feature Flags (Phase 1)
NEXT_PUBLIC_FEATURE_GUEST_MODE=true
NEXT_PUBLIC_FEATURE_SMART_QUEUEING=true

# Feature Flags (Phase 2 - disabled for now)
NEXT_PUBLIC_FEATURE_COST_TRACKING=false
NEXT_PUBLIC_FEATURE_TIERED_ACCESS=false

# Feature Flags (Phase 3 - disabled)
NEXT_PUBLIC_FEATURE_BUILD_ANALYTICS=false
NEXT_PUBLIC_FEATURE_BUILD_MEMORY=false

# Feature Flags (Phase 4 - disabled)
NEXT_PUBLIC_FEATURE_WEBHOOKS=false
NEXT_PUBLIC_FEATURE_TEAM_COLLAB=false

# Feature Flags (Phase 5 - disabled)
NEXT_PUBLIC_FEATURE_AUTO_TENANT=false
```

---

### 1.4 Install Dependencies

```bash
cd "C:\Users\SBS\Desktop\New folder (4)\vito"

# Redis client
npm install ioredis
npm install -D @types/ioredis

# For embeddings (build analytics)
npm install @supabase/supabase-js

# Already have these (verify)
npm list next @supabase/ssr zustand
```

---

## PHASE 2: GUEST MODE (Week 2)

### 2.1 Update Build Route with Guest Support

**Create:** `src/app/api/v1/build/route.guest.ts`

```typescript
/**
 * OLYMPUS 10X - Build API with Guest Mode (Phase 1 Implementation)
 *
 * Features enabled:
 * - Guest build preview and queueing
 * - Smart rate limiting with waitlist
 * - Backward compatible with existing auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api/with-auth';
import { buildService } from '@/lib/agents/services/build-service';
import { buildQueue } from '@/lib/queue/build-queue';
import { isFeatureEnabled } from '@/lib/features/flags';
import { getAuthSession } from '@/lib/auth/session';

interface CreateBuildRequest {
  description: string;
  tier?: 'starter' | 'professional' | 'ultimate' | 'enterprise';
  targetUsers?: string;
  techConstraints?: string;
  useConductor?: boolean;
}

/**
 * POST /api/v1/build (with optional auth)
 *
 * Authenticated: Creates build immediately
 * Guest: Returns preview + queueId, prompts signup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateBuildRequest;

    // Validate input
    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'description is required' } },
        { status: 400 }
      );
    }

    if (body.description.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'description must be at least 10 characters' } },
        { status: 400 }
      );
    }

    const tier = body.tier || 'starter';

    // Check if user is authenticated
    const authSession = await getAuthSession();

    // GUEST MODE: No auth, queue the build
    if (!authSession && isFeatureEnabled('GUEST_MODE')) {
      return await handleGuestBuild(request, body);
    }

    // AUTHENTICATED MODE: Use withAuth wrapper
    if (!authSession) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_300', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Continue with authenticated flow (existing code)
    return await handleAuthenticatedBuild(request, authSession, body);

  } catch (error) {
    console.error('[Build API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Handle guest build (preview + queue)
 */
async function handleGuestBuild(request: NextRequest, body: CreateBuildRequest) {
  try {
    // Analyze build request to generate preview
    const preview = await analyzeBuildRequest(body);

    // Queue the build
    const queueId = await buildQueue.enqueueGuest(body, preview);

    return NextResponse.json({
      success: true,
      queued: true,
      queueId,
      preview: {
        estimatedAgents: preview.estimatedAgents,
        estimatedCost: preview.estimatedCost,
        estimatedDuration: preview.estimatedDuration,
        features: preview.features,
      },
      message: 'Sign up to start your build immediately',
      signupUrl: `/signup?queue=${queueId}`,
    });

  } catch (error) {
    console.error('[Build API] Guest build error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'QUEUE_FAILED', message: 'Failed to queue build' } },
      { status: 500 }
    );
  }
}

/**
 * Handle authenticated build (original flow)
 */
async function handleAuthenticatedBuild(request: NextRequest, authSession: any, body: CreateBuildRequest) {
  const userId = authSession.user.id;
  const tenantId = authSession.tenant?.id || null;
  const projectId = `proj_${Date.now()}`;

  // Handle users without tenant (require onboarding)
  if (!tenantId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NO_TENANT',
          message: 'Please complete onboarding to create your workspace'
        }
      },
      { status: 403 }
    );
  }

  const tier = body.tier || 'starter';

  // Create the build
  const createResult = await buildService.create({
    projectId,
    tenantId,
    userId,
    tier: tier as 'starter' | 'professional' | 'ultimate' | 'enterprise',
    description: body.description.trim(),
    targetUsers: body.targetUsers,
    techConstraints: body.techConstraints,
    useConductor: body.useConductor !== false,
  });

  if (!createResult.success || !createResult.data) {
    return NextResponse.json(
      { success: false, error: createResult.error || { code: 'CREATE_FAILED', message: 'Failed to create build' } },
      { status: 400 }
    );
  }

  const { buildId, plan, conductor } = createResult.data;

  // Start the build
  const startResult = await buildService.start(buildId);

  if (!startResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: startResult.error || { code: 'START_FAILED', message: 'Failed to start build' },
        buildId
      },
      { status: 500 }
    );
  }

  // Success response
  return NextResponse.json({
    success: true,
    data: {
      buildId,
      status: 'running',
      conductor: conductor || false,
      plan: {
        totalAgents: plan.totalAgents,
        estimatedTokens: plan.estimatedTokens,
        estimatedCost: plan.estimatedCost,
        phases: plan.phases.map((p: any) => p.phase),
      },
      progress: startResult.data,
      streamUrl: `/api/v1/build/${buildId}/stream`,
    }
  });
}

/**
 * Analyze build request to generate preview
 */
async function analyzeBuildRequest(body: CreateBuildRequest) {
  const description = body.description.toLowerCase();
  const tier = body.tier || 'starter';

  // Simple heuristic analysis (can be replaced with AI)
  const features: string[] = [];
  let estimatedAgents = 5;
  let complexityMultiplier = 1;

  // Detect features
  if (description.includes('auth') || description.includes('login')) {
    features.push('Authentication');
    estimatedAgents += 2;
  }
  if (description.includes('payment') || description.includes('stripe')) {
    features.push('Payment integration');
    estimatedAgents += 3;
  }
  if (description.includes('dashboard') || description.includes('admin')) {
    features.push('Admin dashboard');
    estimatedAgents += 2;
  }
  if (description.includes('api') || description.includes('backend')) {
    features.push('REST API');
    estimatedAgents += 2;
  }
  if (description.includes('database') || description.includes('db')) {
    features.push('Database design');
    estimatedAgents += 1;
  }
  if (description.includes('real-time') || description.includes('websocket')) {
    features.push('Real-time features');
    estimatedAgents += 3;
    complexityMultiplier = 1.5;
  }

  // Tier-based estimation
  const tierMultipliers = {
    starter: 1,
    professional: 1.5,
    ultimate: 2,
    enterprise: 3,
  };

  const finalAgents = Math.ceil(estimatedAgents * tierMultipliers[tier] * complexityMultiplier);
  const avgTokensPerAgent = 50000;
  const estimatedTokens = finalAgents * avgTokensPerAgent;
  const costPerMillion = 3.0; // $3 per 1M tokens (example)
  const estimatedCost = (estimatedTokens / 1_000_000) * costPerMillion;

  const avgMinutesPerAgent = 3;
  const estimatedMinutes = finalAgents * avgMinutesPerAgent;
  const estimatedDuration = estimatedMinutes < 60
    ? `${estimatedMinutes} minutes`
    : `${Math.ceil(estimatedMinutes / 60)} hours`;

  return {
    estimatedAgents: finalAgents,
    estimatedTokens,
    estimatedCost: Number(estimatedCost.toFixed(2)),
    estimatedDuration,
    features: features.length > 0 ? features : ['Basic functionality'],
  };
}

/** GET /api/v1/build - Health check (unchanged) */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Build API is operational',
    features: {
      guestMode: isFeatureEnabled('GUEST_MODE'),
      authentication: true,
    },
    endpoints: {
      'POST /api/v1/build': 'Create build (guest mode supported)',
      'GET /api/v1/build/[buildId]': 'Get build status',
    },
  });
}
```

---

### 2.2 Signup Flow Integration

**Create:** `src/app/api/v1/build/claim/route.ts`

```typescript
/**
 * POST /api/v1/build/claim
 *
 * Claim queued build after signup
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api/with-auth';
import { buildQueue } from '@/lib/queue/build-queue';
import { buildService } from '@/lib/agents/services/build-service';

export const POST = withAuth(async (request, context) => {
  try {
    const { queueId } = await request.json();

    if (!queueId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'queueId is required' } },
        { status: 400 }
      );
    }

    const userId = context.userId;
    const tenantId = context.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_TENANT', message: 'Complete onboarding first' } },
        { status: 403 }
      );
    }

    // Claim the queued build
    const requestData = await buildQueue.claim(queueId, userId, tenantId);

    // Create and start the build
    const projectId = `proj_${Date.now()}`;
    const createResult = await buildService.create({
      projectId,
      tenantId,
      userId,
      tier: requestData.tier || 'starter',
      description: requestData.description,
      targetUsers: requestData.targetUsers,
      techConstraints: requestData.techConstraints,
      useConductor: requestData.useConductor !== false,
    });

    if (!createResult.success || !createResult.data) {
      return NextResponse.json(
        { success: false, error: createResult.error || { code: 'CREATE_FAILED', message: 'Failed to create build' } },
        { status: 400 }
      );
    }

    const { buildId } = createResult.data;
    const startResult = await buildService.start(buildId);

    return NextResponse.json({
      success: true,
      data: {
        buildId,
        status: 'running',
        streamUrl: `/api/v1/build/${buildId}/stream`,
      }
    });

  } catch (error) {
    console.error('[Build Claim API] Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'CLAIM_FAILED', message: 'Failed to claim build' } },
      { status: 500 }
    );
  }
});
```

---

## PHASE 1 DEPLOYMENT CHECKLIST

### Week 1: Infrastructure

- [ ] Run database migration (`001_10x_foundation.sql`)
- [ ] Install Redis (Docker or local)
- [ ] Install npm packages (`ioredis`)
- [ ] Add environment variables to `.env.local`
- [ ] Test Redis connection (`redis-cli ping`)
- [ ] Enable feature flags (GUEST_MODE, SMART_QUEUEING)

### Week 2: Guest Mode

- [ ] Deploy `route.guest.ts` (replace `route.ts` or feature flag)
- [ ] Deploy `/api/v1/build/claim` endpoint
- [ ] Test guest flow:
  - [ ] Unauthenticated POST → Returns queue preview
  - [ ] Signup with `?queue=xxx` → Auto-claims build
  - [ ] Build starts automatically after claim
- [ ] Monitor queue table for entries
- [ ] Set up cron job for expired queue cleanup

---

## SUCCESS METRICS (Phase 1)

**Week 1:**
- ✅ All database tables created
- ✅ Redis connected and operational
- ✅ Feature flags working

**Week 2:**
- 🎯 Guest builds queued successfully (>0 entries in build_queue)
- 🎯 Signup conversion rate >15% (queued → claimed)
- 🎯 Zero auth-related errors in production
- 🎯 Build API backward compatible (existing users unaffected)

---

## ROLLBACK PLAN

If issues occur:

```bash
# Disable guest mode
echo "NEXT_PUBLIC_FEATURE_GUEST_MODE=false" >> .env.local

# Restore original route
mv src/app/api/v1/build/route.ts.backup src/app/api/v1/build/route.ts

# Rebuild
npm run build

# No database changes needed (tables are additive)
```

---

## NEXT: PHASE 2-5 (Coming in next docs)

- **Phase 2:** Cost tracking, tiered access
- **Phase 3:** Build analytics, ML learning
- **Phase 4:** Webhooks, team collaboration
- **Phase 5:** Auto-tenant creation, advanced features

---

**Start with Phase 1. Get it working. Then move to Phase 2.**

**Estimated Time:** Week 1 (8 hours), Week 2 (12 hours) = **20 hours total for Phase 1**
