/**
 * 50X RELIABILITY: Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * Used for environment validation and startup checks.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on Node.js server (not Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[STARTUP] Initializing OLYMPUS 2.0...');

    try {
      // Validate environment variables
      const { validateEnvOrThrow } = await import('./lib/env-validation');
      validateEnvOrThrow();

      console.log('[STARTUP] Environment validation passed');
    } catch (error) {
      console.error('[STARTUP] Environment validation FAILED!');
      console.error(error);

      // In production, fail hard - don't start with missing config
      if (process.env.NODE_ENV === 'production') {
        console.error('[STARTUP] FATAL: Cannot start in production with invalid environment');
        process.exit(1);
      }

      // In development, warn but continue
      console.warn('[STARTUP] Development mode - continuing despite validation errors');
      console.warn('[STARTUP] Fix these issues before deploying to production!');
    }

    console.log('[STARTUP] OLYMPUS 2.0 ready');
  }
}

/**
 * Called when an error is captured by OpenTelemetry instrumentation
 */
export function onRequestError(
  error: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
    renderSource: 'react-server-components' | 'react-server-components-payload' | 'server-rendering';
    revalidateReason: 'on-demand' | 'stale' | undefined;
  }
): void | Promise<void> {
  // Log errors with context for debugging
  console.error('[REQUEST ERROR]', {
    error: error.message,
    digest: error.digest,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });
}
