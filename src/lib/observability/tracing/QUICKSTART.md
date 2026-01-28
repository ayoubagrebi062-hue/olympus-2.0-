# OLYMPUS Tracing - Quick Start Guide

## 30-Second Setup

```typescript
// 1. Initialize once at app startup
import { initOlympusTracing } from '@/lib/observability/tracing';

initOlympusTracing(); // That's it!
```

## Basic Usage

```typescript
import { withObservability } from '@/lib/observability/tracing';

// Wrap any operation - traces, logs, and metrics just work
const result = await withObservability(
  'build:myapp',
  { buildId: 'b123', userId: 'u456' },
  async ctx => {
    // Logs auto-include trace_id, buildId, userId
    ctx.log.info('Build started');

    // Nested spans for sub-operations
    await ctx.span('phase:discovery', async () => {
      ctx.log.info('Discovering requirements');
      ctx.attr('requirements.count', 5);
    });

    await ctx.span('phase:execution', async () => {
      ctx.log.info('Executing build');
    });

    ctx.log.info('Build completed');
    return { success: true };
  }
);
```

## What You Get

Every log automatically includes:

```json
{
  "level": "info",
  "message": "Build started",
  "trace_id": "abc123...",
  "span_id": "def456...",
  "buildId": "b123",
  "userId": "u456",
  "timestamp": "2026-01-28T..."
}
```

## Environment-Specific Config

```typescript
import { initOlympusTracing, getRecommendedConfig } from '@/lib/observability/tracing';

// Development: Console output, trace everything
initOlympusTracing(getRecommendedConfig('development'));

// Staging: OTLP export to Jaeger, trace everything
initOlympusTracing(getRecommendedConfig('staging'));

// Production: OTLP export, 10% sampling
initOlympusTracing(getRecommendedConfig('production'));
```

## Custom Logger Backend

```typescript
import { setLoggerBackend, wrapLogger } from '@/lib/observability/tracing';
import pino from 'pino';

// Use Pino instead of console
const logger = pino({ level: 'info' });
setLoggerBackend(wrapLogger(logger));
```

## Health Check Endpoint

```typescript
import { getTracingHealth, isTracingEnabled } from '@/lib/observability/tracing';

// In your /health endpoint
app.get('/health/tracing', (req, res) => {
  const health = getTracingHealth(isTracingEnabled());
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Response:
// {
//   "status": "healthy",
//   "enabled": true,
//   "exporterHealthy": true,
//   "metrics": {
//     "spansCreated": 1250,
//     "spansCompleted": 1248,
//     "spansFailed": 2,
//     "avgSpanDurationMs": 45.2
//   },
//   "issues": []
// }
```

## View Traces in Jaeger

1. Start Jaeger:

   ```bash
   docker run -d --name jaeger \
     -p 16686:16686 \
     -p 4318:4318 \
     jaegertracing/all-in-one:latest
   ```

2. Configure OLYMPUS:

   ```typescript
   initOlympusTracing({
     exporter: 'otlp',
     exporterEndpoint: 'http://localhost:4318/v1/traces',
   });
   ```

3. Open http://localhost:16686 and search for service "olympus"

## Error Handling

Errors are automatically traced:

```typescript
await withObservability('risky-operation', {}, async ctx => {
  try {
    await riskyCall();
  } catch (err) {
    ctx.error(err as Error); // Marks span as error
    ctx.log.error('Operation failed', { reason: err.message });
    throw err; // Re-throw to propagate
  }
});
```

## Performance Tips

1. **Use span limits** to prevent OOM:

   ```typescript
   import { setSpanLimits } from '@/lib/observability/tracing';
   setSpanLimits({ maxEventsPerSpan: 50, maxAttributesPerSpan: 50 });
   ```

2. **Sample in production**:

   ```typescript
   initOlympusTracing({ samplingRatio: 0.1 }); // 10%
   ```

3. **Force trace important operations**:
   ```typescript
   await withObservability('critical-payment', {}, fn, { forceTrace: true });
   ```

## Full API Reference

See `index.ts` for all exports. Key functions:

| Function               | Purpose                 |
| ---------------------- | ----------------------- |
| `initOlympusTracing()` | Initialize tracing      |
| `withObservability()`  | Unified context wrapper |
| `setLoggerBackend()`   | Custom logging          |
| `getTracingHealth()`   | Health check            |
| `getTracingMetrics()`  | Self-diagnostics        |
| `setSpanLimits()`      | Configure limits        |
