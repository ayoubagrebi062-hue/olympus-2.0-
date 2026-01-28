/**
 * OpenTelemetry Tracing Provider
 *
 * Initializes and manages the OpenTelemetry SDK for OLYMPUS.
 * Supports multiple exporters: console, OTLP (Jaeger/Zipkin compatible).
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  SpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { trace, context } from '@opentelemetry/api';
import { TracingConfig, DEFAULT_TRACING_CONFIG } from './types';

let sdk: NodeSDK | null = null;
let initialized = false;
let currentConfig: TracingConfig | null = null;

// Track signal handlers to prevent memory leaks
let shutdownHandler: (() => Promise<void>) | null = null;

/**
 * Initialize OpenTelemetry tracing
 */
export function initTracing(config: Partial<TracingConfig> = {}): void {
  if (initialized) {
    console.warn('[Tracing] Already initialized, skipping');
    return;
  }

  const fullConfig: TracingConfig = { ...DEFAULT_TRACING_CONFIG, ...config };
  currentConfig = fullConfig;

  if (!fullConfig.enabled) {
    console.log('[Tracing] Disabled via configuration');
    return;
  }

  try {
    // Create resource with service info
    const resource = resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: fullConfig.serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: fullConfig.serviceVersion,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: fullConfig.environment,
    });

    // Create exporter based on config
    let exporter: SpanExporter;
    switch (fullConfig.exporter) {
      case 'otlp':
        exporter = new OTLPTraceExporter({
          url: fullConfig.exporterEndpoint,
        });
        console.log(`[Tracing] Using OTLP exporter: ${fullConfig.exporterEndpoint}`);
        break;

      case 'none':
        // No-op exporter for testing
        exporter = {
          export: (spans, callback) => callback({ code: 0 }),
          shutdown: () => Promise.resolve(),
        } as SpanExporter;
        console.log('[Tracing] Using no-op exporter');
        break;

      case 'console':
      default:
        exporter = new ConsoleSpanExporter();
        console.log('[Tracing] Using console exporter');
    }

    // Create span processor
    const spanProcessor =
      fullConfig.environment === 'development'
        ? new SimpleSpanProcessor(exporter) // Immediate export in dev
        : new BatchSpanProcessor(exporter, fullConfig.batchConfig);

    // Create SDK
    sdk = new NodeSDK({
      resource,
      spanProcessors: [spanProcessor],
    });

    // Start SDK
    sdk.start();
    initialized = true;

    console.log(
      `[Tracing] Initialized: ${fullConfig.serviceName} v${fullConfig.serviceVersion} (${fullConfig.environment})`
    );

    // Graceful shutdown handler (stored for cleanup)
    shutdownHandler = async () => {
      if (sdk) {
        await sdk.shutdown();
        console.log('[Tracing] Shutdown complete');
      }
    };

    // Only register once, track for removal
    process.once('SIGTERM', shutdownHandler);
    process.once('SIGINT', shutdownHandler);
  } catch (error) {
    console.error('[Tracing] Initialization failed:', error);
    // Don't throw - tracing failure shouldn't break the app
  }
}

/**
 * Get the tracer instance
 */
export function getTracer(name: string = 'olympus') {
  return trace.getTracer(name, currentConfig?.serviceVersion);
}

/**
 * Get current context
 */
export function getCurrentContext() {
  return context.active();
}

/**
 * Check if tracing is enabled and initialized
 */
export function isTracingEnabled(): boolean {
  return initialized && (currentConfig?.enabled ?? false);
}

/**
 * Get current tracing configuration
 */
export function getTracingConfig(): TracingConfig | null {
  return currentConfig;
}

/**
 * Shutdown tracing gracefully
 * Properly cleans up signal handlers to prevent memory leaks
 */
export async function shutdownTracing(): Promise<void> {
  // Remove signal handlers first to prevent memory leaks
  if (shutdownHandler) {
    process.removeListener('SIGTERM', shutdownHandler);
    process.removeListener('SIGINT', shutdownHandler);
    shutdownHandler = null;
  }

  if (sdk) {
    try {
      await sdk.shutdown();
      console.log('[Tracing] Shutdown complete');
    } catch (error) {
      console.error('[Tracing] Shutdown error:', error);
    } finally {
      sdk = null;
      initialized = false;
      currentConfig = null;
    }
  }
}
