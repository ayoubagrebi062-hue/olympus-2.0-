/**
 * OLYMPUS 2.1 - 10X UPGRADE: Health Check System
 *
 * Comprehensive health monitoring for:
 * - Database connections
 * - External services
 * - Memory usage
 * - Queue health
 */

import { logger } from './logger';

// ============================================================================
// TYPES
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latency?: number;
  message?: string;
  lastCheck: string;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  components: ComponentHealth[];
  metrics: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu?: {
      usage: number;
    };
  };
}

export interface HealthCheck {
  name: string;
  check: () => Promise<ComponentHealth>;
  critical?: boolean; // If true, failure marks system as unhealthy
  timeout?: number;
}

// ============================================================================
// HEALTH CHECK REGISTRY
// ============================================================================

const healthChecks: Map<string, HealthCheck> = new Map();
const startTime = Date.now();

/**
 * Register a health check
 */
export function registerHealthCheck(check: HealthCheck): void {
  healthChecks.set(check.name, check);
  logger.debug(`Health check registered: ${check.name}`);
}

/**
 * Remove a health check
 */
export function unregisterHealthCheck(name: string): void {
  healthChecks.delete(name);
}

// ============================================================================
// HEALTH CHECK EXECUTION
// ============================================================================

/**
 * Run a single health check with timeout
 */
async function runHealthCheck(check: HealthCheck): Promise<ComponentHealth> {
  const timeout = check.timeout || 5000;
  const start = Date.now();

  try {
    const result = await Promise.race([
      check.check(),
      new Promise<ComponentHealth>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      ),
    ]);

    return {
      ...result,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: check.name,
      status: 'unhealthy',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    };
  }
}

/**
 * Get memory usage
 */
function getMemoryMetrics() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const total = usage.heapTotal;
    const used = usage.heapUsed;
    return {
      used,
      total,
      percentage: Math.round((used / total) * 100),
    };
  }

  // Browser fallback
  return {
    used: 0,
    total: 0,
    percentage: 0,
  };
}

/**
 * Determine overall system status from component statuses
 */
function determineOverallStatus(
  components: ComponentHealth[],
  checks: Map<string, HealthCheck>
): HealthStatus {
  let hasUnhealthy = false;
  let hasDegraded = false;

  for (const component of components) {
    const check = checks.get(component.name);
    const isCritical = check?.critical ?? false;

    if (component.status === 'unhealthy') {
      if (isCritical) {
        return 'unhealthy';
      }
      hasUnhealthy = true;
    } else if (component.status === 'degraded') {
      hasDegraded = true;
    }
  }

  if (hasUnhealthy) return 'degraded';
  if (hasDegraded) return 'degraded';
  return 'healthy';
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Run all health checks and return system health
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const componentResults = await Promise.all(Array.from(healthChecks.values()).map(runHealthCheck));

  const status = determineOverallStatus(componentResults, healthChecks);

  return {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.1.0',
    uptime: Date.now() - startTime,
    components: componentResults,
    metrics: {
      memory: getMemoryMetrics(),
    },
  };
}

/**
 * Quick liveness check (for k8s probes)
 */
export function isAlive(): boolean {
  return true; // Process is running
}

/**
 * Readiness check (for k8s probes)
 */
export async function isReady(): Promise<boolean> {
  const criticalChecks = Array.from(healthChecks.values()).filter(c => c.critical);

  if (criticalChecks.length === 0) return true;

  const results = await Promise.all(criticalChecks.map(runHealthCheck));
  return results.every(r => r.status !== 'unhealthy');
}

// ============================================================================
// BUILT-IN HEALTH CHECKS
// ============================================================================

/**
 * Create a database health check
 */
export function createDatabaseHealthCheck(name: string, pingFn: () => Promise<void>): HealthCheck {
  return {
    name,
    critical: true,
    timeout: 5000,
    check: async () => {
      try {
        await pingFn();
        return {
          name,
          status: 'healthy',
          lastCheck: new Date().toISOString(),
        };
      } catch (error) {
        return {
          name,
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Connection failed',
          lastCheck: new Date().toISOString(),
        };
      }
    },
  };
}

/**
 * Create a Redis health check
 */
export function createRedisHealthCheck(pingFn: () => Promise<string>): HealthCheck {
  return {
    name: 'redis',
    critical: false, // Redis failure degrades but doesn't kill
    timeout: 3000,
    check: async () => {
      try {
        const result = await pingFn();
        return {
          name: 'redis',
          status: result === 'PONG' ? 'healthy' : 'degraded',
          lastCheck: new Date().toISOString(),
        };
      } catch (error) {
        return {
          name: 'redis',
          status: 'degraded',
          message: 'Redis unavailable, using memory fallback',
          lastCheck: new Date().toISOString(),
        };
      }
    },
  };
}

/**
 * Create an external API health check
 */
export function createApiHealthCheck(
  name: string,
  url: string,
  options?: { timeout?: number; critical?: boolean }
): HealthCheck {
  return {
    name,
    critical: options?.critical ?? false,
    timeout: options?.timeout ?? 10000,
    check: async () => {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(options?.timeout ?? 10000),
        });

        return {
          name,
          status: response.ok ? 'healthy' : 'degraded',
          metadata: { statusCode: response.status },
          lastCheck: new Date().toISOString(),
        };
      } catch (error) {
        return {
          name,
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'API unreachable',
          lastCheck: new Date().toISOString(),
        };
      }
    },
  };
}

/**
 * Memory threshold health check
 */
export function createMemoryHealthCheck(warnThreshold = 80, criticalThreshold = 95): HealthCheck {
  return {
    name: 'memory',
    critical: false,
    check: async () => {
      const memory = getMemoryMetrics();
      let status: HealthStatus = 'healthy';

      if (memory.percentage >= criticalThreshold) {
        status = 'unhealthy';
      } else if (memory.percentage >= warnThreshold) {
        status = 'degraded';
      }

      return {
        name: 'memory',
        status,
        metadata: memory,
        message: `${memory.percentage}% memory used`,
        lastCheck: new Date().toISOString(),
      };
    },
  };
}

export default {
  registerHealthCheck,
  unregisterHealthCheck,
  getSystemHealth,
  isAlive,
  isReady,
  createDatabaseHealthCheck,
  createRedisHealthCheck,
  createApiHealthCheck,
  createMemoryHealthCheck,
};
