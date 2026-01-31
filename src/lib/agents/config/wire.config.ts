/**
 * OLYMPUS 2.0 - WIRE Agent Configuration
 *
 * FIX 1.2 (Jan 31, 2026): Extracted from hardcoded values in wire-adapter.ts
 *
 * Configuration is now:
 * - Externalized from source code
 * - Overridable via environment variables
 * - Runtime-configurable (no redeploy needed for changes)
 * - Validated with Zod schema
 */

import { z } from 'zod';

// ============================================================================
// CONFIGURATION SCHEMA
// ============================================================================

/**
 * Rate limit configuration schema.
 */
export const RateLimitConfigSchema = z.object({
  /** Maximum requests per minute */
  requestsPerMinute: z.number().min(1).max(100).default(10),

  /** Minimum delay between requests in milliseconds */
  minDelayMs: z.number().min(0).max(60000).default(6000),

  /** Burst allowance - extra requests allowed in burst */
  burstAllowance: z.number().min(0).max(20).default(3),

  /** Burst window in milliseconds */
  burstWindowMs: z.number().min(1000).max(60000).default(10000),
});

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

/**
 * WIRE agent configuration schema.
 */
export const WireConfigSchema = z.object({
  /** Maximum tokens for generation */
  maxTokens: z.number().min(1000).max(32000).default(8000),

  /** Temperature for generation (0 = deterministic, 2 = creative) */
  temperature: z.number().min(0).max(2).default(0.1),

  /** Rate limiting configuration */
  rateLimit: RateLimitConfigSchema.default({}),

  /** System prompt version (for A/B testing and rollback) */
  promptVersion: z.string().default('v1'),

  /** Maximum retries on failure */
  maxRetries: z.number().min(0).max(5).default(3),

  /** Timeout per request in milliseconds */
  timeoutMs: z.number().min(5000).max(300000).default(120000),

  /** Enable debug logging */
  debug: z.boolean().default(false),
});

export type WireConfig = z.infer<typeof WireConfigSchema>;

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_WIRE_CONFIG: WireConfig = {
  maxTokens: 8000,
  temperature: 0.1,
  rateLimit: {
    requestsPerMinute: 10,
    minDelayMs: 6000,
    burstAllowance: 3,
    burstWindowMs: 10000,
  },
  promptVersion: 'v1',
  maxRetries: 3,
  timeoutMs: 120000,
  debug: false,
};

// ============================================================================
// CONFIGURATION LOADER
// ============================================================================

/**
 * Load WIRE configuration from environment variables or defaults.
 * Environment variables take precedence over defaults.
 */
export function loadWireConfig(overrides?: Partial<WireConfig>): WireConfig {
  const envConfig: Partial<WireConfig> = {};

  // Load from environment variables
  if (process.env.WIRE_MAX_TOKENS) {
    envConfig.maxTokens = parseInt(process.env.WIRE_MAX_TOKENS, 10);
  }
  if (process.env.WIRE_TEMPERATURE) {
    envConfig.temperature = parseFloat(process.env.WIRE_TEMPERATURE);
  }
  if (process.env.WIRE_PROMPT_VERSION) {
    envConfig.promptVersion = process.env.WIRE_PROMPT_VERSION;
  }
  if (process.env.WIRE_MAX_RETRIES) {
    envConfig.maxRetries = parseInt(process.env.WIRE_MAX_RETRIES, 10);
  }
  if (process.env.WIRE_TIMEOUT_MS) {
    envConfig.timeoutMs = parseInt(process.env.WIRE_TIMEOUT_MS, 10);
  }
  if (process.env.WIRE_DEBUG) {
    envConfig.debug = process.env.WIRE_DEBUG === 'true';
  }

  // Load rate limit config from env
  const rateLimit: Partial<RateLimitConfig> = {};
  if (process.env.WIRE_RATE_LIMIT_RPM) {
    rateLimit.requestsPerMinute = parseInt(process.env.WIRE_RATE_LIMIT_RPM, 10);
  }
  if (process.env.WIRE_RATE_LIMIT_DELAY_MS) {
    rateLimit.minDelayMs = parseInt(process.env.WIRE_RATE_LIMIT_DELAY_MS, 10);
  }
  if (process.env.WIRE_RATE_LIMIT_BURST) {
    rateLimit.burstAllowance = parseInt(process.env.WIRE_RATE_LIMIT_BURST, 10);
  }
  if (Object.keys(rateLimit).length > 0) {
    envConfig.rateLimit = { ...DEFAULT_WIRE_CONFIG.rateLimit, ...rateLimit };
  }

  // Merge: defaults < env < overrides
  const merged = {
    ...DEFAULT_WIRE_CONFIG,
    ...envConfig,
    ...overrides,
  };

  // Validate and return
  return WireConfigSchema.parse(merged);
}

/**
 * Create a config loader that caches the configuration.
 * Supports runtime reload.
 */
export function createConfigLoader(): {
  getConfig: () => WireConfig;
  reload: () => WireConfig;
} {
  let cachedConfig: WireConfig | null = null;

  return {
    getConfig: () => {
      if (!cachedConfig) {
        cachedConfig = loadWireConfig();
      }
      return cachedConfig;
    },
    reload: () => {
      cachedConfig = loadWireConfig();
      return cachedConfig;
    },
  };
}

// ============================================================================
// SINGLETON CONFIG LOADER
// ============================================================================

let configLoader: ReturnType<typeof createConfigLoader> | null = null;

/**
 * Get the global config loader instance.
 */
export function getWireConfigLoader(): ReturnType<typeof createConfigLoader> {
  if (!configLoader) {
    configLoader = createConfigLoader();
  }
  return configLoader;
}

/**
 * Get current WIRE configuration.
 */
export function getWireConfig(): WireConfig {
  return getWireConfigLoader().getConfig();
}

/**
 * Reload WIRE configuration from environment.
 */
export function reloadWireConfig(): WireConfig {
  return getWireConfigLoader().reload();
}

// ============================================================================
// EXPORTS (All items exported inline above via 'export' keyword)
// ============================================================================
// WireConfigSchema, RateLimitConfigSchema, DEFAULT_WIRE_CONFIG,
// loadWireConfig, createConfigLoader, getWireConfigLoader,
// getWireConfig, reloadWireConfig are all exported at declaration
