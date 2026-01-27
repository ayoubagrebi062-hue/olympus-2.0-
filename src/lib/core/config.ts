/**
 * OLYMPUS 10X - Runtime Configuration
 *
 * Centralized configuration with environment overrides.
 * All config values can be overridden via environment variables.
 */

import { TIMEOUTS, LIMITS, THRESHOLDS, RETRY, GUARDRAIL_LAYERS } from './constants';
import type { GuardrailLayer, MCPTransport } from './types';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface GuardrailConfig {
  /** Whether guardrails are enabled */
  enabled: boolean;

  /** Which layers to run */
  enabledLayers: GuardrailLayer[];

  /** Run security checks in parallel */
  parallelSecurity: boolean;

  /** Stop on first block */
  failFast: boolean;

  /** Default timeout for guardrail checks */
  timeoutMs: number;

  /** Confidence threshold for blocking */
  blockThreshold: number;

  /** Confidence threshold for warning */
  warnThreshold: number;

  /** Roles that bypass guardrails */
  bypassRoles: string[];
}

export interface HandoffConfig {
  /** Whether handoffs are enabled */
  enabled: boolean;

  /** Maximum chain depth */
  maxChainDepth: number;

  /** Minimum confidence to trigger handoff */
  confidenceThreshold: number;

  /** Default context compression */
  defaultCompression: 'none' | 'semantic' | 'neural';

  /** Handoff decision timeout */
  timeoutMs: number;

  /** Circuit breaker configuration */
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    successThreshold: number;
    resetTimeoutMs: number;
  };
}

export interface MCPConfig {
  /** Whether MCP is enabled */
  enabled: boolean;

  /** Default transport */
  defaultTransport: MCPTransport;

  /** Connection timeout */
  connectionTimeoutMs: number;

  /** Tool execution timeout */
  executionTimeoutMs: number;

  /** Maximum servers per tenant */
  maxServersPerTenant: number;

  /** Retry configuration */
  retry: {
    maxRetries: number;
    backoffMs: number;
  };

  /** Health check interval */
  healthCheckIntervalMs: number;
}

export interface ContextConfig {
  /** Maximum baggage size in bytes */
  maxBaggageSizeBytes: number;

  /** Idempotency TTL */
  idempotencyTtlMs: number;

  /** Enable degradation strategies */
  enableDegradation: boolean;
}

export interface ObservabilityConfig {
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  /** Enable metrics collection */
  metricsEnabled: boolean;

  /** Enable event emission */
  eventsEnabled: boolean;

  /** Enable tracing */
  tracingEnabled: boolean;

  /** Sample rate for traces (0-1) */
  traceSampleRate: number;
}

export interface OlympusConfig {
  guardrails: GuardrailConfig;
  handoffs: HandoffConfig;
  mcp: MCPConfig;
  context: ContextConfig;
  observability: ObservabilityConfig;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const defaultConfig: OlympusConfig = {
  guardrails: {
    enabled: true,
    enabledLayers: [
      GUARDRAIL_LAYERS.API,
      GUARDRAIL_LAYERS.SECURITY,
      GUARDRAIL_LAYERS.SEMANTIC,
      GUARDRAIL_LAYERS.AGENT,
    ],
    parallelSecurity: true,
    failFast: true,
    timeoutMs: TIMEOUTS.GUARDRAIL_MS,
    blockThreshold: THRESHOLDS.GUARDRAIL_BLOCK_CONFIDENCE,
    warnThreshold: THRESHOLDS.GUARDRAIL_WARN_CONFIDENCE,
    bypassRoles: ['admin', 'system'],
  },

  handoffs: {
    enabled: true,
    maxChainDepth: LIMITS.MAX_HANDOFF_DEPTH,
    confidenceThreshold: THRESHOLDS.HANDOFF_CONFIDENCE_MIN,
    defaultCompression: 'semantic',
    timeoutMs: TIMEOUTS.HANDOFF_DECISION_MS,
    circuitBreaker: {
      enabled: true,
      failureThreshold: THRESHOLDS.CIRCUIT_BREAKER_FAILURES,
      successThreshold: THRESHOLDS.CIRCUIT_BREAKER_SUCCESSES,
      resetTimeoutMs: TIMEOUTS.CIRCUIT_BREAKER_RESET_MS,
    },
  },

  mcp: {
    enabled: true,
    defaultTransport: 'stdio',
    connectionTimeoutMs: TIMEOUTS.MCP_CONNECTION_MS,
    executionTimeoutMs: TIMEOUTS.MCP_TOOL_EXECUTION_MS,
    maxServersPerTenant: LIMITS.MAX_MCP_SERVERS,
    retry: {
      maxRetries: LIMITS.MAX_MCP_RETRIES,
      backoffMs: RETRY.BASE_DELAY_MS,
    },
    healthCheckIntervalMs: 30_000,
  },

  context: {
    maxBaggageSizeBytes: LIMITS.MAX_BAGGAGE_SIZE_BYTES,
    idempotencyTtlMs: TIMEOUTS.IDEMPOTENCY_TTL_MS,
    enableDegradation: true,
  },

  observability: {
    logLevel: 'info',
    metricsEnabled: true,
    eventsEnabled: true,
    tracingEnabled: true,
    traceSampleRate: 1.0,
  },
};

// ============================================================================
// ENVIRONMENT VARIABLE PARSING
// ============================================================================

function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvFloat(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getEnvArray(key: string, defaultValue: string[]): string[] {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// ============================================================================
// CONFIGURATION LOADER
// ============================================================================

function loadConfigFromEnv(): Partial<OlympusConfig> {
  return {
    guardrails: {
      enabled: getEnvBoolean('OLYMPUS_GUARDRAILS_ENABLED', defaultConfig.guardrails.enabled),
      enabledLayers: getEnvArray(
        'OLYMPUS_GUARDRAILS_LAYERS',
        defaultConfig.guardrails.enabledLayers
      ) as GuardrailLayer[],
      parallelSecurity: getEnvBoolean(
        'OLYMPUS_GUARDRAILS_PARALLEL',
        defaultConfig.guardrails.parallelSecurity
      ),
      failFast: getEnvBoolean('OLYMPUS_GUARDRAILS_FAIL_FAST', defaultConfig.guardrails.failFast),
      timeoutMs: getEnvNumber('OLYMPUS_GUARDRAILS_TIMEOUT_MS', defaultConfig.guardrails.timeoutMs),
      blockThreshold: getEnvFloat(
        'OLYMPUS_GUARDRAILS_BLOCK_THRESHOLD',
        defaultConfig.guardrails.blockThreshold
      ),
      warnThreshold: getEnvFloat(
        'OLYMPUS_GUARDRAILS_WARN_THRESHOLD',
        defaultConfig.guardrails.warnThreshold
      ),
      bypassRoles: getEnvArray(
        'OLYMPUS_GUARDRAILS_BYPASS_ROLES',
        defaultConfig.guardrails.bypassRoles
      ),
    },

    handoffs: {
      enabled: getEnvBoolean('OLYMPUS_HANDOFFS_ENABLED', defaultConfig.handoffs.enabled),
      maxChainDepth: getEnvNumber(
        'OLYMPUS_HANDOFFS_MAX_DEPTH',
        defaultConfig.handoffs.maxChainDepth
      ),
      confidenceThreshold: getEnvFloat(
        'OLYMPUS_HANDOFFS_CONFIDENCE',
        defaultConfig.handoffs.confidenceThreshold
      ),
      defaultCompression: getEnvString(
        'OLYMPUS_HANDOFFS_COMPRESSION',
        defaultConfig.handoffs.defaultCompression
      ) as 'none' | 'semantic' | 'neural',
      timeoutMs: getEnvNumber('OLYMPUS_HANDOFFS_TIMEOUT_MS', defaultConfig.handoffs.timeoutMs),
      circuitBreaker: {
        enabled: getEnvBoolean(
          'OLYMPUS_CIRCUIT_BREAKER_ENABLED',
          defaultConfig.handoffs.circuitBreaker.enabled
        ),
        failureThreshold: getEnvNumber(
          'OLYMPUS_CIRCUIT_BREAKER_FAILURES',
          defaultConfig.handoffs.circuitBreaker.failureThreshold
        ),
        successThreshold: getEnvNumber(
          'OLYMPUS_CIRCUIT_BREAKER_SUCCESSES',
          defaultConfig.handoffs.circuitBreaker.successThreshold
        ),
        resetTimeoutMs: getEnvNumber(
          'OLYMPUS_CIRCUIT_BREAKER_RESET_MS',
          defaultConfig.handoffs.circuitBreaker.resetTimeoutMs
        ),
      },
    },

    mcp: {
      enabled: getEnvBoolean('OLYMPUS_MCP_ENABLED', defaultConfig.mcp.enabled),
      defaultTransport: getEnvString(
        'OLYMPUS_MCP_TRANSPORT',
        defaultConfig.mcp.defaultTransport
      ) as MCPTransport,
      connectionTimeoutMs: getEnvNumber(
        'OLYMPUS_MCP_CONNECT_TIMEOUT_MS',
        defaultConfig.mcp.connectionTimeoutMs
      ),
      executionTimeoutMs: getEnvNumber(
        'OLYMPUS_MCP_EXEC_TIMEOUT_MS',
        defaultConfig.mcp.executionTimeoutMs
      ),
      maxServersPerTenant: getEnvNumber(
        'OLYMPUS_MCP_MAX_SERVERS',
        defaultConfig.mcp.maxServersPerTenant
      ),
      retry: {
        maxRetries: getEnvNumber('OLYMPUS_MCP_MAX_RETRIES', defaultConfig.mcp.retry.maxRetries),
        backoffMs: getEnvNumber('OLYMPUS_MCP_BACKOFF_MS', defaultConfig.mcp.retry.backoffMs),
      },
      healthCheckIntervalMs: getEnvNumber(
        'OLYMPUS_MCP_HEALTH_INTERVAL_MS',
        defaultConfig.mcp.healthCheckIntervalMs
      ),
    },

    context: {
      maxBaggageSizeBytes: getEnvNumber(
        'OLYMPUS_MAX_BAGGAGE_BYTES',
        defaultConfig.context.maxBaggageSizeBytes
      ),
      idempotencyTtlMs: getEnvNumber(
        'OLYMPUS_IDEMPOTENCY_TTL_MS',
        defaultConfig.context.idempotencyTtlMs
      ),
      enableDegradation: getEnvBoolean(
        'OLYMPUS_ENABLE_DEGRADATION',
        defaultConfig.context.enableDegradation
      ),
    },

    observability: {
      logLevel: getEnvString('OLYMPUS_LOG_LEVEL', defaultConfig.observability.logLevel) as
        | 'debug'
        | 'info'
        | 'warn'
        | 'error',
      metricsEnabled: getEnvBoolean(
        'OLYMPUS_METRICS_ENABLED',
        defaultConfig.observability.metricsEnabled
      ),
      eventsEnabled: getEnvBoolean(
        'OLYMPUS_EVENTS_ENABLED',
        defaultConfig.observability.eventsEnabled
      ),
      tracingEnabled: getEnvBoolean(
        'OLYMPUS_TRACING_ENABLED',
        defaultConfig.observability.tracingEnabled
      ),
      traceSampleRate: getEnvFloat(
        'OLYMPUS_TRACE_SAMPLE_RATE',
        defaultConfig.observability.traceSampleRate
      ),
    },
  };
}

// ============================================================================
// CONFIGURATION SINGLETON
// ============================================================================

let configInstance: OlympusConfig | null = null;

/**
 * Get the current configuration.
 * Loads from environment on first access.
 */
export function getConfig(): OlympusConfig {
  if (!configInstance) {
    const envConfig = loadConfigFromEnv();
    configInstance = deepMerge(
      defaultConfig as unknown as Record<string, unknown>,
      envConfig as unknown as Record<string, unknown>
    ) as unknown as OlympusConfig;
  }
  return configInstance!;
}

/**
 * Override configuration at runtime.
 * Useful for testing or dynamic updates.
 */
export function setConfig(overrides: Partial<OlympusConfig>): void {
  const current = getConfig();
  configInstance = deepMerge(
    current as unknown as Record<string, unknown>,
    overrides as unknown as Record<string, unknown>
  ) as unknown as OlympusConfig;
}

/**
 * Reset configuration to defaults.
 * Reloads from environment.
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Get a specific configuration section.
 */
export function getGuardrailConfig(): GuardrailConfig {
  return getConfig().guardrails;
}

export function getHandoffConfig(): HandoffConfig {
  return getConfig().handoffs;
}

export function getMCPConfig(): MCPConfig {
  return getConfig().mcp;
}

export function getContextConfig(): ContextConfig {
  return getConfig().context;
}

export function getObservabilityConfig(): ObservabilityConfig {
  return getConfig().observability;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[Extract<keyof T, string>];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { defaultConfig };
