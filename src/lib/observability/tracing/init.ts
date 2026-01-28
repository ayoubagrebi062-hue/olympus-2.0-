/**
 * OLYMPUS Tracing Initialization
 *
 * Simple initialization for OLYMPUS tracing.
 * Call initOlympusTracing() once at application startup.
 */

import { initTracing, shutdownTracing, isTracingEnabled } from './provider';
import { TracingConfig, DEFAULT_TRACING_CONFIG } from './types';

let olympusTracingInitialized = false;

/**
 * Initialize OLYMPUS tracing
 * Call this once at application startup (e.g., in instrumentation.ts or app entry)
 *
 * @example
 * // In src/instrumentation.ts (Next.js)
 * export async function register() {
 *   if (process.env.NEXT_RUNTIME === 'nodejs') {
 *     const { initOlympusTracing } = await import('@/lib/observability/tracing');
 *     initOlympusTracing();
 *   }
 * }
 */
export function initOlympusTracing(config?: Partial<TracingConfig>): void {
  if (olympusTracingInitialized) {
    console.warn('[OLYMPUS Tracing] Already initialized');
    return;
  }

  const olympusConfig: Partial<TracingConfig> = {
    serviceName: 'olympus',
    serviceVersion: process.env.npm_package_version || '2.0.0',
    environment: (process.env.NODE_ENV as TracingConfig['environment']) || 'development',
    ...config,
  };

  initTracing(olympusConfig);
  olympusTracingInitialized = true;

  if (isTracingEnabled()) {
    console.log('[OLYMPUS Tracing] Initialized successfully');
  }
}

/**
 * Shutdown OLYMPUS tracing gracefully
 * Call this before application exit
 */
export async function shutdownOlympusTracing(): Promise<void> {
  if (!olympusTracingInitialized) {
    return;
  }

  await shutdownTracing();
  olympusTracingInitialized = false;
  console.log('[OLYMPUS Tracing] Shutdown complete');
}

/**
 * Check if OLYMPUS tracing is initialized
 */
export function isOlympusTracingInitialized(): boolean {
  return olympusTracingInitialized;
}

/**
 * Get recommended tracing configuration for different environments
 */
export function getRecommendedConfig(
  environment: 'development' | 'staging' | 'production'
): Partial<TracingConfig> {
  switch (environment) {
    case 'development':
      return {
        enabled: true,
        exporter: 'console',
        samplingRatio: 1.0, // Trace everything in dev
        enrichWithCognitive: true,
      };

    case 'staging':
      return {
        enabled: true,
        exporter: 'otlp',
        exporterEndpoint: process.env.TRACING_ENDPOINT || 'http://localhost:4318/v1/traces',
        samplingRatio: 1.0, // Trace everything in staging
        enrichWithCognitive: true,
      };

    case 'production':
      return {
        enabled: true,
        exporter: 'otlp',
        exporterEndpoint: process.env.TRACING_ENDPOINT,
        samplingRatio: 0.1, // Sample 10% in production to reduce overhead
        enrichWithCognitive: false, // Disable for privacy in prod
        batchConfig: {
          maxQueueSize: 4096,
          maxExportBatchSize: 1024,
          scheduledDelayMillis: 1000,
        },
      };

    default:
      return DEFAULT_TRACING_CONFIG;
  }
}

// Auto-initialize if environment variable is set
if (typeof process !== 'undefined' && process.env?.TRACING_AUTO_INIT === 'true') {
  initOlympusTracing();
}
