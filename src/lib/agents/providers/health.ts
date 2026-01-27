/**
 * OLYMPUS Provider Health Monitor
 *
 * Continuous monitoring of AI provider health:
 * - Periodic health checks
 * - Latency tracking
 * - Success rate calculation
 * - Automatic status updates to Redis
 */

import { AIProviderType, ProviderHealth, ProviderStatus } from './types';

import { getOllamaProvider } from './ollama';
import { getGroqProvider } from './groq';
import { setProviderHealth, getProviderHealth as getRedisProviderHealth } from '../../db/redis';

/**
 * Health check result
 */
interface HealthCheckResult {
  provider: AIProviderType;
  healthy: boolean;
  latencyMs: number;
  error?: string;
  models?: string[];
}

/**
 * Health history entry
 */
interface HealthHistoryEntry {
  timestamp: number;
  healthy: boolean;
  latencyMs: number;
}

/**
 * Health Monitor Class
 */
export class HealthMonitor {
  private checkInterval: number;
  private intervalId: NodeJS.Timeout | null = null;
  private history: Map<AIProviderType, HealthHistoryEntry[]> = new Map();
  private readonly MAX_HISTORY_LENGTH = 100;

  constructor(checkIntervalMs: number = 30000) {
    this.checkInterval = checkIntervalMs;
  }

  /**
   * Start continuous monitoring
   */
  start(): void {
    if (this.intervalId) {
      console.warn('Health monitor already running');
      return;
    }

    console.log(`Health monitor started (interval: ${this.checkInterval}ms)`);

    // Initial check
    this.checkAll();

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.checkAll();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Health monitor stopped');
    }
  }

  /**
   * Check all providers
   */
  async checkAll(): Promise<HealthCheckResult[]> {
    const providers = [
      AIProviderType.OLLAMA,
      AIProviderType.GROQ,
      // Add more as they're implemented
    ];

    const results = await Promise.all(providers.map(p => this.checkProvider(p)));

    return results;
  }

  /**
   * Check a specific provider
   */
  async checkProvider(type: AIProviderType): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      let healthy = false;
      let models: string[] = [];

      switch (type) {
        case AIProviderType.OLLAMA:
          const ollama = getOllamaProvider();
          healthy = await ollama.isAvailable();
          if (healthy) {
            models = await ollama.getModels();
          }
          break;

        case AIProviderType.GROQ:
          const groq = getGroqProvider();
          healthy = await groq.isAvailable();
          if (healthy) {
            models = await groq.getModels();
          }
          break;

        // Add more providers here
        default:
          healthy = false;
      }

      const latencyMs = Date.now() - startTime;

      // Record history
      this.recordHistory(type, healthy, latencyMs);

      // Update Redis cache (non-blocking)
      setProviderHealth(type, healthy, latencyMs).catch(() => {
        // Redis might not be available
      });

      return {
        provider: type,
        healthy,
        latencyMs,
        models,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Record failure
      this.recordHistory(type, false, latencyMs);

      // Update Redis cache (non-blocking)
      setProviderHealth(type, false, latencyMs).catch(() => {
        // Redis might not be available
      });

      return {
        provider: type,
        healthy: false,
        latencyMs,
        error: errorMessage,
      };
    }
  }

  /**
   * Record health history
   */
  private recordHistory(type: AIProviderType, healthy: boolean, latencyMs: number): void {
    if (!this.history.has(type)) {
      this.history.set(type, []);
    }

    const history = this.history.get(type)!;
    history.push({
      timestamp: Date.now(),
      healthy,
      latencyMs,
    });

    // Keep only last N entries
    if (history.length > this.MAX_HISTORY_LENGTH) {
      history.shift();
    }
  }

  /**
   * Get provider health status
   */
  getProviderHealth(type: AIProviderType): ProviderHealth {
    const history = this.history.get(type) || [];
    const recentHistory = history.slice(-10); // Last 10 checks

    if (recentHistory.length === 0) {
      return {
        provider: type,
        status: ProviderStatus.UNKNOWN,
        healthy: false,
        latencyMs: 0,
        successRate: 0,
        lastCheck: new Date(0),
        availableModels: [],
      };
    }

    const lastCheck = recentHistory[recentHistory.length - 1];
    const successCount = recentHistory.filter(h => h.healthy).length;
    const successRate = successCount / recentHistory.length;
    const avgLatency =
      recentHistory.reduce((sum, h) => sum + h.latencyMs, 0) / recentHistory.length;

    // Determine status
    let status: ProviderStatus;
    if (successRate >= 0.9) {
      status = ProviderStatus.HEALTHY;
    } else if (successRate >= 0.5) {
      status = ProviderStatus.DEGRADED;
    } else {
      status = ProviderStatus.UNHEALTHY;
    }

    return {
      provider: type,
      status,
      healthy: lastCheck.healthy,
      latencyMs: Math.round(avgLatency),
      successRate,
      lastCheck: new Date(lastCheck.timestamp),
      availableModels: [],
    };
  }

  /**
   * Get all provider health statuses
   */
  getAllHealth(): ProviderHealth[] {
    const providers = [AIProviderType.OLLAMA, AIProviderType.GROQ];

    return providers.map(p => this.getProviderHealth(p));
  }

  /**
   * Check if provider is healthy (quick check from cache)
   */
  isHealthy(type: AIProviderType): boolean {
    const health = this.getProviderHealth(type);
    return health.status === ProviderStatus.HEALTHY || health.status === ProviderStatus.DEGRADED;
  }

  /**
   * Get best available provider
   */
  getBestProvider(preferLocal: boolean = true): AIProviderType | null {
    const health = this.getAllHealth();

    // Sort by preference
    const sorted = health
      .filter(h => h.status !== ProviderStatus.UNHEALTHY)
      .sort((a, b) => {
        // Prefer local if requested
        if (preferLocal) {
          const aLocal =
            a.provider === AIProviderType.OLLAMA || a.provider === AIProviderType.LM_STUDIO;
          const bLocal =
            b.provider === AIProviderType.OLLAMA || b.provider === AIProviderType.LM_STUDIO;
          if (aLocal && !bLocal) return -1;
          if (!aLocal && bLocal) return 1;
        }

        // Then by success rate
        if (b.successRate !== a.successRate) {
          return b.successRate - a.successRate;
        }

        // Then by latency
        return a.latencyMs - b.latencyMs;
      });

    return sorted[0]?.provider || null;
  }

  /**
   * Print health report
   */
  printReport(): void {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              AI PROVIDER HEALTH REPORT                  ║');
    console.log('╠════════════════════════════════════════════════════════╣');

    const health = this.getAllHealth();

    for (const h of health) {
      const statusIcon =
        h.status === ProviderStatus.HEALTHY
          ? '🟢'
          : h.status === ProviderStatus.DEGRADED
            ? '🟡'
            : h.status === ProviderStatus.UNHEALTHY
              ? '🔴'
              : '⚪';

      console.log(
        `║ ${statusIcon} ${h.provider.padEnd(12)} │ ${h.status.padEnd(10)} │ ${String(h.latencyMs).padEnd(4)}ms │ ${(h.successRate * 100).toFixed(0).padStart(3)}% ║`
      );
    }

    console.log('╚════════════════════════════════════════════════════════╝\n');
  }
}

// ============================================
// SINGLETON & CONVENIENCE
// ============================================

let monitorInstance: HealthMonitor | null = null;

/**
 * Get health monitor instance
 */
export function getHealthMonitor(): HealthMonitor {
  if (!monitorInstance) {
    monitorInstance = new HealthMonitor();
  }
  return monitorInstance;
}

/**
 * Start health monitoring
 */
export function startHealthMonitoring(intervalMs?: number): void {
  const monitor = intervalMs ? new HealthMonitor(intervalMs) : getHealthMonitor();
  monitorInstance = monitor;
  monitor.start();
}

/**
 * Stop health monitoring
 */
export function stopHealthMonitoring(): void {
  getHealthMonitor().stop();
}

/**
 * Check all providers now
 */
export async function checkAllProviders(): Promise<HealthCheckResult[]> {
  return await getHealthMonitor().checkAll();
}

/**
 * Get health report
 */
export function getHealthReport(): ProviderHealth[] {
  return getHealthMonitor().getAllHealth();
}

export default HealthMonitor;
