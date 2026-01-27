/**
 * OLYMPUS 2.0 - Cache Configuration
 */

/** Cache TTL in seconds */
export interface CacheTTL {
  /** Very short-lived (30s) */
  brief: 30;
  /** Short-lived (5m) */
  short: 300;
  /** Medium (15m) */
  medium: 900;
  /** Long (1h) */
  long: 3600;
  /** Very long (24h) */
  day: 86400;
}

export const CACHE_TTL: CacheTTL = {
  brief: 30,
  short: 300,
  medium: 900,
  long: 3600,
  day: 86400,
};

/** Cache key prefixes */
export const CACHE_PREFIX = {
  tenant: 'tenant',
  project: 'project',
  build: 'build',
  deploy: 'deploy',
  user: 'user',
  plan: 'plan',
  feature: 'feature',
  session: 'session',
} as const;

/** Build cache key */
export function buildCacheKey(...parts: (string | number)[]): string {
  return `olympus:${parts.join(':')}`;
}

/** Build tenant-scoped cache key */
export function tenantCacheKey(tenantId: string, ...parts: (string | number)[]): string {
  return buildCacheKey('t', tenantId, ...parts);
}

/** Build user-scoped cache key */
export function userCacheKey(userId: string, ...parts: (string | number)[]): string {
  return buildCacheKey('u', userId, ...parts);
}

/** Cache tags for invalidation */
export const CACHE_TAGS = {
  // Tenant-level tags
  tenant: (id: string) => `tenant:${id}`,
  tenantMembers: (id: string) => `tenant:${id}:members`,
  tenantSettings: (id: string) => `tenant:${id}:settings`,

  // Project-level tags
  project: (id: string) => `project:${id}`,
  projectFiles: (id: string) => `project:${id}:files`,
  projectEnv: (id: string) => `project:${id}:env`,
  projectVersions: (id: string) => `project:${id}:versions`,

  // Build tags
  build: (id: string) => `build:${id}`,
  buildLogs: (id: string) => `build:${id}:logs`,

  // Deploy tags
  deploy: (id: string) => `deploy:${id}`,
  deployLogs: (id: string) => `deploy:${id}:logs`,

  // User tags
  user: (id: string) => `user:${id}`,
  userTenants: (id: string) => `user:${id}:tenants`,

  // Plan/billing tags
  plans: () => 'plans',
  subscription: (tenantId: string) => `subscription:${tenantId}`,
} as const;

/** Endpoint cache config */
export interface EndpointCacheConfig {
  ttl: number;
  tags?: string[];
  private?: boolean;
  staleWhileRevalidate?: number;
}

/** Default cache config per endpoint pattern */
export const ENDPOINT_CACHE: Record<string, EndpointCacheConfig> = {
  // Public endpoints - can be edge cached
  'GET /api/plans': { ttl: CACHE_TTL.long, tags: ['plans'] },
  'GET /api/health': { ttl: CACHE_TTL.brief },

  // Tenant data - short cache, private
  'GET /api/tenants/:id': { ttl: CACHE_TTL.short, private: true },
  'GET /api/tenants/:id/members': { ttl: CACHE_TTL.short, private: true },

  // Projects - medium cache
  'GET /api/projects': { ttl: CACHE_TTL.medium, private: true },
  'GET /api/projects/:id': { ttl: CACHE_TTL.medium, private: true },
  'GET /api/projects/:id/files': { ttl: CACHE_TTL.short, private: true },

  // Builds - brief cache (status changes frequently)
  'GET /api/builds/:id': { ttl: CACHE_TTL.brief, private: true },

  // Deploys
  'GET /api/deploy/:id': { ttl: CACHE_TTL.short, private: true },
};
