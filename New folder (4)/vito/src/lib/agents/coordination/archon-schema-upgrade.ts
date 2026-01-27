/**
 * OLYMPUS 2.1 - ARCHON Schema Upgrade
 *
 * Enhanced output schema for ARCHON that enables structured propagation
 * of architectural decisions to downstream agents.
 *
 * THE PROBLEM:
 * Before: ARCHON outputs "architecture": "Monolith" (just a string)
 * After: ARCHON outputs structured patterns that DATUM, NEXUS, PIXEL can consume
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHITECTURE PATTERN TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Base architecture pattern */
export type ArchitecturePattern =
  | 'monolith'
  | 'microservices'
  | 'serverless'
  | 'modular-monolith'
  | 'event-driven';

/** Multi-tenancy isolation strategy */
export type TenantIsolation =
  | 'none'           // Single tenant
  | 'row-level'      // Shared DB, tenant_id column
  | 'schema-level'   // Separate schemas per tenant
  | 'database-level' // Separate databases per tenant
  | 'instance-level'; // Separate deployments

/** Data consistency model */
export type ConsistencyModel =
  | 'strong'         // ACID, immediate consistency
  | 'eventual'       // BASE, async propagation
  | 'causal';        // Order-preserving eventual

/** API versioning strategy */
export type ApiVersioning =
  | 'url-path'       // /api/v1/...
  | 'header'         // Accept-Version: v1
  | 'query-param';   // ?version=1

/** State management pattern */
export type StatePattern =
  | 'server-only'    // All state on server
  | 'client-heavy'   // Rich client state
  | 'hybrid';        // Optimistic updates + server sync

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURED ARCHITECTURE OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Multi-tenancy configuration
 * DATUM uses this to add tenant columns
 * NEXUS uses this for API filtering
 */
export interface MultiTenancyConfig {
  enabled: boolean;
  isolation: TenantIsolation;
  /** Tables that need tenant_id */
  tenantScopedTables: string[];
  /** Tables that are global (no tenant) */
  globalTables: string[];
  /** How to get current tenant */
  tenantResolution: 'subdomain' | 'header' | 'path' | 'session';
  /** Enforce RLS at database level */
  rowLevelSecurity: boolean;
}

/**
 * Database architecture decisions
 * DATUM uses this for schema design
 */
export interface DatabaseConfig {
  provider: 'supabase' | 'planetscale' | 'neon' | 'cockroachdb';
  /** Enable soft deletes (deletedAt column) */
  softDeletes: boolean;
  /** Enable audit timestamps (createdAt, updatedAt) */
  auditTimestamps: boolean;
  /** Use CUID vs UUID vs autoincrement */
  idStrategy: 'cuid' | 'uuid' | 'auto';
  /** Foreign key cascade rules */
  cascadeDeletes: boolean;
  /** JSON columns allowed */
  jsonColumns: boolean;
  /** Full-text search enabled */
  fullTextSearch: boolean;
  /** Tables that need audit logging */
  auditedTables: string[];
}

/**
 * API design decisions
 * NEXUS uses this for endpoint design
 */
export interface ApiConfig {
  style: 'rest' | 'graphql' | 'trpc';
  versioning: ApiVersioning;
  /** Base path for all routes */
  basePath: string;
  /** Pagination strategy */
  pagination: 'cursor' | 'offset' | 'page';
  /** Default page size */
  defaultPageSize: number;
  /** Max page size */
  maxPageSize: number;
  /** Response envelope */
  responseEnvelope: boolean;
  /** Error format */
  errorFormat: 'rfc7807' | 'custom' | 'simple';
  /** Rate limiting by tier */
  rateLimiting: {
    enabled: boolean;
    tiers: Record<string, { requestsPerHour: number }>;
  };
}

/**
 * Authentication decisions
 * SENTINEL uses this for auth implementation
 */
export interface AuthConfig {
  provider: 'supabase' | 'nextauth' | 'clerk' | 'custom';
  /** MFA required for which roles */
  mfaRequired: string[];
  /** Session storage */
  sessionStorage: 'cookie' | 'header' | 'both';
  /** Session duration in seconds */
  sessionDuration: number;
  /** Refresh token enabled */
  refreshTokens: boolean;
  /** OAuth providers */
  oauthProviders: string[];
  /** Role-based access control */
  rbac: {
    enabled: boolean;
    roles: string[];
    defaultRole: string;
  };
}

/**
 * Caching decisions
 * FORGE and PIXEL use this for caching strategy
 */
export interface CacheConfig {
  provider: 'upstash' | 'redis' | 'vercel-kv' | 'none';
  /** Cache invalidation strategy */
  invalidation: 'manual' | 'ttl' | 'event-driven';
  /** Default TTL in seconds */
  defaultTtl: number;
  /** Cache-aside pattern enabled */
  cacheAside: boolean;
  /** Stale-while-revalidate */
  swr: boolean;
  /** Entities to cache */
  cachedEntities: string[];
}

/**
 * Frontend state decisions
 * PIXEL uses this for state management
 */
export interface StateConfig {
  pattern: StatePattern;
  /** State management library */
  library: 'zustand' | 'jotai' | 'recoil' | 'redux' | 'none';
  /** Server state library */
  serverState: 'tanstack-query' | 'swr' | 'rtk-query' | 'none';
  /** Optimistic updates enabled */
  optimisticUpdates: boolean;
  /** Offline support */
  offlineSupport: boolean;
  /** Hydration strategy */
  hydration: 'client' | 'server' | 'streaming';
}

/**
 * Error handling decisions
 * All agents use this for error patterns
 */
export interface ErrorConfig {
  /** Boundary strategy for frontend */
  boundaries: 'page' | 'component' | 'global';
  /** Error reporting service */
  reporting: 'sentry' | 'bugsnag' | 'custom' | 'none';
  /** Retry strategy */
  retries: {
    enabled: boolean;
    maxAttempts: number;
    backoff: 'linear' | 'exponential';
  };
  /** Graceful degradation enabled */
  gracefulDegradation: boolean;
}

/**
 * Code organization decisions
 * All code-generating agents use this
 */
export interface CodeOrganizationConfig {
  /** Feature-based vs layer-based */
  structure: 'feature-first' | 'layer-first' | 'hybrid';
  /** Naming conventions */
  naming: {
    components: 'PascalCase';
    files: 'kebab-case' | 'PascalCase' | 'camelCase';
    constants: 'SCREAMING_SNAKE_CASE';
    functions: 'camelCase';
  };
  /** Import alias */
  alias: string;
  /** Barrel exports */
  barrelExports: boolean;
  /** Colocation (tests, styles with components) */
  colocation: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED ARCHON OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete ARCHON output with structured architecture decisions
 * This replaces the simple { architecture: "Monolith" } output
 */
export interface ArchonEnhancedOutput {
  /** Basic tech stack (existing) */
  tech_stack: {
    framework: string;
    database: string;
    orm: string;
    auth: string;
    cache: string;
    state: string;
    hosting: string;
    styling: string;
  };

  /** Architecture pattern (enhanced) */
  architecture: {
    pattern: ArchitecturePattern;
    reasoning: string;
    /** Scale expectations */
    scalability: 'small' | 'medium' | 'large' | 'enterprise';
  };

  /** Multi-tenancy (NEW) */
  multiTenancy: MultiTenancyConfig;

  /** Database (NEW) */
  database: DatabaseConfig;

  /** API (NEW) */
  api: ApiConfig;

  /** Authentication (NEW) */
  auth: AuthConfig;

  /** Caching (NEW) */
  cache: CacheConfig;

  /** State management (NEW) */
  state: StateConfig;

  /** Error handling (NEW) */
  errors: ErrorConfig;

  /** Code organization (NEW) */
  codeOrganization: CodeOrganizationConfig;

  /** Reasoning for decisions */
  reasoning: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default ARCHON output for starter tier
 */
export const DEFAULT_STARTER_CONFIG: Partial<ArchonEnhancedOutput> = {
  multiTenancy: {
    enabled: false,
    isolation: 'none',
    tenantScopedTables: [],
    globalTables: ['users', 'settings'],
    tenantResolution: 'session',
    rowLevelSecurity: false,
  },
  database: {
    provider: 'supabase',
    softDeletes: true,
    auditTimestamps: true,
    idStrategy: 'cuid',
    cascadeDeletes: true,
    jsonColumns: true,
    fullTextSearch: false,
    auditedTables: [],
  },
  api: {
    style: 'rest',
    versioning: 'url-path',
    basePath: '/api/v1',
    pagination: 'cursor',
    defaultPageSize: 20,
    maxPageSize: 100,
    responseEnvelope: true,
    errorFormat: 'custom',
    rateLimiting: {
      enabled: false,
      tiers: {},
    },
  },
  cache: {
    provider: 'none',
    invalidation: 'manual',
    defaultTtl: 3600,
    cacheAside: false,
    swr: false,
    cachedEntities: [],
  },
  state: {
    pattern: 'hybrid',
    library: 'zustand',
    serverState: 'tanstack-query',
    optimisticUpdates: false,
    offlineSupport: false,
    hydration: 'client',
  },
};

/**
 * Default ARCHON output for professional/enterprise tier
 */
export const DEFAULT_ENTERPRISE_CONFIG: Partial<ArchonEnhancedOutput> = {
  multiTenancy: {
    enabled: true,
    isolation: 'row-level',
    tenantScopedTables: [], // Will be populated based on schema
    globalTables: ['plans', 'features', 'system_settings'],
    tenantResolution: 'subdomain',
    rowLevelSecurity: true,
  },
  database: {
    provider: 'supabase',
    softDeletes: true,
    auditTimestamps: true,
    idStrategy: 'cuid',
    cascadeDeletes: false, // Restrict by default for safety
    jsonColumns: true,
    fullTextSearch: true,
    auditedTables: ['users', 'orders', 'payments'],
  },
  api: {
    style: 'rest',
    versioning: 'url-path',
    basePath: '/api/v1',
    pagination: 'cursor',
    defaultPageSize: 20,
    maxPageSize: 100,
    responseEnvelope: true,
    errorFormat: 'rfc7807',
    rateLimiting: {
      enabled: true,
      tiers: {
        free: { requestsPerHour: 100 },
        starter: { requestsPerHour: 1000 },
        pro: { requestsPerHour: 5000 },
        enterprise: { requestsPerHour: 100000 },
      },
    },
  },
  cache: {
    provider: 'upstash',
    invalidation: 'event-driven',
    defaultTtl: 3600,
    cacheAside: true,
    swr: true,
    cachedEntities: ['products', 'categories', 'settings'],
  },
  state: {
    pattern: 'hybrid',
    library: 'zustand',
    serverState: 'tanstack-query',
    optimisticUpdates: true,
    offlineSupport: false,
    hydration: 'streaming',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate ARCHON output has required fields
 */
export function validateArchonOutput(output: unknown): output is ArchonEnhancedOutput {
  if (!output || typeof output !== 'object') return false;

  const obj = output as Record<string, unknown>;

  // Required top-level fields
  if (!obj.tech_stack || typeof obj.tech_stack !== 'object') return false;
  if (!obj.architecture || typeof obj.architecture !== 'object') return false;

  // Architecture must have pattern
  const arch = obj.architecture as Record<string, unknown>;
  if (!arch.pattern || typeof arch.pattern !== 'string') return false;

  return true;
}

/**
 * Merge ARCHON output with defaults based on tier
 */
export function mergeWithDefaults(
  output: Partial<ArchonEnhancedOutput>,
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise'
): ArchonEnhancedOutput {
  const defaults = tier === 'starter' ? DEFAULT_STARTER_CONFIG : DEFAULT_ENTERPRISE_CONFIG;

  return {
    tech_stack: output.tech_stack || {
      framework: 'Next.js 14 App Router',
      database: 'Supabase PostgreSQL',
      orm: 'Prisma',
      auth: 'Supabase Auth',
      cache: 'Upstash Redis',
      state: 'Zustand',
      hosting: 'Vercel',
      styling: 'Tailwind CSS',
    },
    architecture: output.architecture || {
      pattern: 'monolith',
      reasoning: 'Default monolith for simplicity',
      scalability: 'medium',
    },
    multiTenancy: { ...defaults.multiTenancy!, ...output.multiTenancy },
    database: { ...defaults.database!, ...output.database },
    api: { ...defaults.api!, ...output.api },
    auth: output.auth || {
      provider: 'supabase',
      mfaRequired: ['admin'],
      sessionStorage: 'cookie',
      sessionDuration: 604800, // 7 days
      refreshTokens: true,
      oauthProviders: ['google', 'github'],
      rbac: {
        enabled: true,
        roles: ['user', 'admin'],
        defaultRole: 'user',
      },
    },
    cache: { ...defaults.cache!, ...output.cache },
    state: { ...defaults.state!, ...output.state },
    errors: output.errors || {
      boundaries: 'page',
      reporting: 'none',
      retries: {
        enabled: true,
        maxAttempts: 3,
        backoff: 'exponential',
      },
      gracefulDegradation: true,
    },
    codeOrganization: output.codeOrganization || {
      structure: 'feature-first',
      naming: {
        components: 'PascalCase',
        files: 'kebab-case',
        constants: 'SCREAMING_SNAKE_CASE',
        functions: 'camelCase',
      },
      alias: '@',
      barrelExports: true,
      colocation: true,
    },
    reasoning: output.reasoning || 'Using OLYMPUS defaults',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHON OUTPUT PARSER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse ARCHON output and extract enhanced configuration
 * Handles both old format and new enhanced format
 *
 * FIX #2: Now logs warnings instead of silently falling back
 */
export function parseArchonOutput(
  rawOutput: unknown,
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise'
): ArchonEnhancedOutput {
  // FIX #2: Warn on null/undefined input
  if (!rawOutput || typeof rawOutput !== 'object') {
    console.warn(
      `[ARCHON-PARSER] ⚠️ WARNING: ARCHON output is null/undefined. Using tier defaults.`,
      `\n  Tier: ${tier}`,
      `\n  This may indicate ARCHON failed to generate output.`
    );
    return mergeWithDefaults({}, tier);
  }

  const output = rawOutput as Record<string, unknown>;

  // FIX #2: Detect and WARN on old format
  if (typeof output.architecture === 'string') {
    console.warn(
      `[ARCHON-PARSER] ⚠️ WARNING: ARCHON using OLD FORMAT (architecture: "${output.architecture}")`,
      `\n  Expected: architecture: { pattern: "...", reasoning: "...", scalability: "..." }`,
      `\n  Impact: Multi-tenancy, database config, and API config will use DEFAULTS`,
      `\n  Defaults applied:`,
      `\n    - multiTenancy.enabled: ${tier === 'starter' ? 'false' : 'true (enterprise default)'}`,
      `\n    - database.softDeletes: true`,
      `\n    - database.idStrategy: "cuid"`,
      `\n  Action: Update ARCHON to output enhanced format for full control.`
    );

    // Convert old format to new format
    const pattern = output.architecture.toLowerCase() as ArchitecturePattern;
    return mergeWithDefaults({
      tech_stack: output.tech_stack as ArchonEnhancedOutput['tech_stack'],
      architecture: {
        pattern: pattern,
        reasoning: output.reasoning as string || 'Converted from legacy format',
        scalability: 'medium',
      },
    }, tier);
  }

  // New enhanced format
  if (validateArchonOutput(output)) {
    // Check for missing optional sections and warn
    const missing: string[] = [];
    if (!output.multiTenancy) missing.push('multiTenancy');
    if (!output.database) missing.push('database');
    if (!output.api) missing.push('api');
    if (!output.auth) missing.push('auth');
    if (!output.cache) missing.push('cache');
    if (!output.state) missing.push('state');

    if (missing.length > 0) {
      console.warn(
        `[ARCHON-PARSER] ⚠️ NOTICE: ARCHON output missing optional sections: ${missing.join(', ')}`,
        `\n  These will use tier-appropriate defaults.`
      );
    }

    return mergeWithDefaults(output, tier);
  }

  // FIX #2: Warn on invalid format fallback
  console.warn(
    `[ARCHON-PARSER] ⚠️ WARNING: ARCHON output failed validation. Using partial merge with defaults.`,
    `\n  Output keys: ${Object.keys(output).join(', ')}`,
    `\n  This may indicate a malformed ARCHON response.`
  );
  return mergeWithDefaults(output as Partial<ArchonEnhancedOutput>, tier);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Critical decisions that downstream agents need to know
 */
export interface CriticalArchitectureDecisions {
  /** Is this multi-tenant? */
  isMultiTenant: boolean;
  /** Tenant isolation strategy */
  tenantIsolation: TenantIsolation;
  /** Tables that need tenant_id */
  tenantScopedTables: string[];
  /** Use soft deletes? */
  softDeletes: boolean;
  /** ID generation strategy */
  idStrategy: 'cuid' | 'uuid' | 'auto';
  /** API base path */
  apiBasePath: string;
  /** Pagination style */
  paginationStyle: 'cursor' | 'offset' | 'page';
  /** Use response envelope? */
  responseEnvelope: boolean;
  /** Rate limiting enabled? */
  rateLimitingEnabled: boolean;
  /** Caching enabled? */
  cachingEnabled: boolean;
  /** Cached entities */
  cachedEntities: string[];
  /** Use optimistic updates? */
  optimisticUpdates: boolean;
  /** RBAC enabled? */
  rbacEnabled: boolean;
  /** Available roles */
  roles: string[];
  /** Error boundary strategy */
  errorBoundaries: 'page' | 'component' | 'global';
  /** Auth strategy (FIX #4) */
  authStrategy: string;
}

/**
 * Extract critical decisions from enhanced ARCHON output
 * This is what gets passed to downstream agents
 */
export function extractCriticalDecisions(config: ArchonEnhancedOutput): CriticalArchitectureDecisions {
  return {
    isMultiTenant: config.multiTenancy.enabled,
    tenantIsolation: config.multiTenancy.isolation,
    tenantScopedTables: config.multiTenancy.tenantScopedTables,
    softDeletes: config.database.softDeletes,
    idStrategy: config.database.idStrategy,
    apiBasePath: config.api.basePath,
    paginationStyle: config.api.pagination,
    responseEnvelope: config.api.responseEnvelope,
    rateLimitingEnabled: config.api.rateLimiting.enabled,
    cachingEnabled: config.cache.provider !== 'none',
    cachedEntities: config.cache.cachedEntities,
    optimisticUpdates: config.state.optimisticUpdates,
    rbacEnabled: config.auth.rbac.enabled,
    roles: config.auth.rbac.roles,
    errorBoundaries: config.errors.boundaries,
    authStrategy: config.auth.provider,
  };
}

/**
 * Format critical decisions as a prompt section
 */
export function formatDecisionsForPrompt(decisions: CriticalArchitectureDecisions): string {
  const lines: string[] = [
    '## ARCHITECTURAL CONSTRAINTS (from ARCHON)',
    '',
    'You MUST follow these architectural decisions:',
    '',
  ];

  if (decisions.isMultiTenant) {
    lines.push(`### Multi-Tenancy: ENABLED (${decisions.tenantIsolation})`);
    lines.push(`- Add \`tenantId: String\` to: ${decisions.tenantScopedTables.join(', ') || 'all user-facing tables'}`);
    lines.push(`- Add \`@@index([tenantId])\` to tenant-scoped tables`);
    if (decisions.tenantIsolation === 'row-level') {
      lines.push(`- Implement row-level security (RLS) policies`);
    }
    lines.push('');
  } else {
    lines.push('### Multi-Tenancy: DISABLED');
    lines.push('- Single-tenant application, no tenant_id columns needed');
    lines.push('');
  }

  lines.push('### Database Conventions:');
  lines.push(`- ID Strategy: \`@default(${decisions.idStrategy}())\``);
  lines.push(`- Soft Deletes: ${decisions.softDeletes ? 'YES - add `deletedAt DateTime?`' : 'NO - use hard deletes'}`);
  lines.push('');

  lines.push('### API Conventions:');
  lines.push(`- Base Path: \`${decisions.apiBasePath}\``);
  lines.push(`- Pagination: ${decisions.paginationStyle}-based`);
  lines.push(`- Response Format: ${decisions.responseEnvelope ? '`{ data: T, meta: {...} }`' : 'Direct T response'}`);
  if (decisions.rateLimitingEnabled) {
    lines.push(`- Rate Limiting: ENABLED - implement per-tier limits`);
  }
  lines.push('');

  if (decisions.cachingEnabled) {
    lines.push('### Caching:');
    lines.push(`- Cache these entities: ${decisions.cachedEntities.join(', ')}`);
    lines.push('');
  }

  if (decisions.rbacEnabled) {
    lines.push('### Authorization:');
    lines.push(`- RBAC: ENABLED with roles: ${decisions.roles.join(', ')}`);
    lines.push('- Check role permissions before data access');
    lines.push('');
  }

  lines.push('### Frontend:');
  lines.push(`- Optimistic Updates: ${decisions.optimisticUpdates ? 'YES' : 'NO'}`);
  lines.push(`- Error Boundaries: ${decisions.errorBoundaries}-level`);

  return lines.join('\n');
}

// Types are already exported at definition - no need for re-export
