/**
 * OLYMPUS 10X - Feature Flags System
 *
 * Controls gradual rollout of 10X features across 5 phases
 */

/**
 * Feature flags configuration
 * Set via environment variables (NEXT_PUBLIC_FEATURE_*)
 */
export const FEATURE_FLAGS = {
  // ===== PHASE 1: FOUNDATION =====
  GUEST_MODE: process.env.NEXT_PUBLIC_FEATURE_GUEST_MODE === 'true',
  SMART_QUEUEING: process.env.NEXT_PUBLIC_FEATURE_SMART_QUEUEING === 'true',

  // ===== PHASE 2: COST & ACCESS =====
  COST_TRACKING: process.env.NEXT_PUBLIC_FEATURE_COST_TRACKING === 'true',
  TIERED_ACCESS: process.env.NEXT_PUBLIC_FEATURE_TIERED_ACCESS === 'true',

  // ===== PHASE 3: INTELLIGENCE =====
  BUILD_ANALYTICS: process.env.NEXT_PUBLIC_FEATURE_BUILD_ANALYTICS === 'true',
  BUILD_MEMORY: process.env.NEXT_PUBLIC_FEATURE_BUILD_MEMORY === 'true',

  // ===== PHASE 4: COLLABORATION =====
  WEBHOOKS: process.env.NEXT_PUBLIC_FEATURE_WEBHOOKS === 'true',
  TEAM_COLLAB: process.env.NEXT_PUBLIC_FEATURE_TEAM_COLLAB === 'true',

  // ===== PHASE 5: ADVANCED =====
  AUTO_TENANT: process.env.NEXT_PUBLIC_FEATURE_AUTO_TENANT === 'true',
  INDUSTRY_DETECTION: process.env.NEXT_PUBLIC_FEATURE_INDUSTRY_DETECTION === 'true',
} as const;

/**
 * Check if a feature is enabled globally
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag] === true;
}

/**
 * Tier-based feature access control
 * Determines which features are available for each plan tier
 */
const TIER_FEATURES: Record<string, (keyof typeof FEATURE_FLAGS)[]> = {
  free: [
    'GUEST_MODE',
  ],
  starter: [
    'GUEST_MODE',
    'SMART_QUEUEING',
    'COST_TRACKING',
  ],
  professional: [
    'GUEST_MODE',
    'SMART_QUEUEING',
    'COST_TRACKING',
    'TIERED_ACCESS',
    'BUILD_ANALYTICS',
  ],
  ultimate: [
    'GUEST_MODE',
    'SMART_QUEUEING',
    'COST_TRACKING',
    'TIERED_ACCESS',
    'BUILD_ANALYTICS',
    'BUILD_MEMORY',
    'WEBHOOKS',
  ],
  enterprise: [
    'GUEST_MODE',
    'SMART_QUEUEING',
    'COST_TRACKING',
    'TIERED_ACCESS',
    'BUILD_ANALYTICS',
    'BUILD_MEMORY',
    'WEBHOOKS',
    'TEAM_COLLAB',
    'AUTO_TENANT',
    'INDUSTRY_DETECTION',
  ],
};

/**
 * Check if a tenant has access to a specific feature based on their plan tier
 */
export function hasFeatureAccess(
  planTier: string,
  feature: keyof typeof FEATURE_FLAGS
): boolean {
  // Feature must be globally enabled first
  if (!isFeatureEnabled(feature)) {
    return false;
  }

  // Check tier-based access
  const tierFeatures = TIER_FEATURES[planTier] || [];
  return tierFeatures.includes(feature);
}

/**
 * Get all available features for a plan tier
 */
export function getTierFeatures(planTier: string): string[] {
  const features = TIER_FEATURES[planTier] || [];
  return features.filter(f => isFeatureEnabled(f));
}

/**
 * Feature limits per tier
 */
export interface TierLimits {
  maxConcurrentBuilds: number; // -1 = unlimited
  maxMonthlyBuilds: number; // -1 = unlimited
  maxTeamMembers: number; // -1 = unlimited
  maxWebhooks: number;
  rateLimitPerHour: number;
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    maxConcurrentBuilds: 1,
    maxMonthlyBuilds: 5,
    maxTeamMembers: 1,
    maxWebhooks: 0,
    rateLimitPerHour: 10,
    supportLevel: 'community',
  },
  starter: {
    maxConcurrentBuilds: 2,
    maxMonthlyBuilds: 50,
    maxTeamMembers: 3,
    maxWebhooks: 2,
    rateLimitPerHour: 50,
    supportLevel: 'email',
  },
  professional: {
    maxConcurrentBuilds: 5,
    maxMonthlyBuilds: 200,
    maxTeamMembers: 10,
    maxWebhooks: 10,
    rateLimitPerHour: 200,
    supportLevel: 'priority',
  },
  ultimate: {
    maxConcurrentBuilds: 10,
    maxMonthlyBuilds: 1000,
    maxTeamMembers: 50,
    maxWebhooks: 50,
    rateLimitPerHour: 1000,
    supportLevel: 'priority',
  },
  enterprise: {
    maxConcurrentBuilds: -1, // unlimited
    maxMonthlyBuilds: -1, // unlimited
    maxTeamMembers: -1, // unlimited
    maxWebhooks: -1, // unlimited
    rateLimitPerHour: 10000,
    supportLevel: 'dedicated',
  },
};

/**
 * Get tier limits
 */
export function getTierLimits(planTier: string): TierLimits {
  return TIER_LIMITS[planTier] || TIER_LIMITS.free;
}

/**
 * Check if tenant can perform action based on usage
 */
export async function checkTierLimit(
  planTier: string,
  limitType: keyof TierLimits,
  currentUsage: number
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  const limits = getTierLimits(planTier);
  const limit = limits[limitType] as number;

  if (limit === -1) {
    // Unlimited
    return { allowed: true, limit: -1, remaining: -1 };
  }

  const allowed = currentUsage < limit;
  const remaining = Math.max(0, limit - currentUsage);

  return { allowed, limit, remaining };
}

/**
 * Feature rollout phases (for documentation)
 */
export const ROLLOUT_PHASES = {
  PHASE_1: {
    name: 'Foundation',
    week: 1,
    features: ['GUEST_MODE', 'SMART_QUEUEING'],
    description: 'Guest mode + smart queueing',
  },
  PHASE_2: {
    name: 'Cost & Access',
    week: 2,
    features: ['COST_TRACKING', 'TIERED_ACCESS'],
    description: 'Real-time cost tracking + tier-based access',
  },
  PHASE_3: {
    name: 'Intelligence',
    week: 3,
    features: ['BUILD_ANALYTICS', 'BUILD_MEMORY'],
    description: 'Analytics + pattern learning',
  },
  PHASE_4: {
    name: 'Collaboration',
    week: 4,
    features: ['WEBHOOKS', 'TEAM_COLLAB'],
    description: 'Webhooks + team features',
  },
  PHASE_5: {
    name: 'Advanced',
    week: 5,
    features: ['AUTO_TENANT', 'INDUSTRY_DETECTION'],
    description: 'Auto-tenant + industry detection',
  },
} as const;

/**
 * Get current active phase based on enabled features
 */
export function getCurrentPhase(): number {
  const phases = Object.values(ROLLOUT_PHASES);

  for (let i = phases.length - 1; i >= 0; i--) {
    const phase = phases[i];
    const allEnabled = phase.features.every(f =>
      isFeatureEnabled(f as keyof typeof FEATURE_FLAGS)
    );

    if (allEnabled) {
      return i + 1;
    }
  }

  return 0; // No phases enabled
}

/**
 * Development helper: Log feature flag status
 */
export function logFeatureStatus(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('\n🚀 OLYMPUS 10X Feature Flags Status:');
    console.log('━'.repeat(50));

    Object.entries(FEATURE_FLAGS).forEach(([key, value]) => {
      const status = value ? '✅ ENABLED' : '❌ DISABLED';
      console.log(`${status} ${key}`);
    });

    const currentPhase = getCurrentPhase();
    console.log('━'.repeat(50));
    console.log(`📍 Current Phase: ${currentPhase}/5`);

    if (currentPhase > 0) {
      const phase = Object.values(ROLLOUT_PHASES)[currentPhase - 1];
      console.log(`   ${phase.name} - ${phase.description}`);
    }

    console.log('━'.repeat(50));
    console.log('');
  }
}
