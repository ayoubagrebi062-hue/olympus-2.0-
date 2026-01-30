/**
 * Decision Strategy Loader Singleton
 *
 * Single initialization point for DecisionStrategyLoader to prevent
 * multiple instances and ensure configuration is loaded once.
 *
 * @module governance/shared/loader-singleton
 * @version 1.0.0
 * @since 2026-01-30
 */

import { DecisionStrategyLoader } from '../autonomous/decision-strategy-loader';
import * as path from 'path';

let loaderInstance: DecisionStrategyLoader | null = null;
let initializationPromise: Promise<DecisionStrategyLoader> | null = null;

/**
 * Get or create the singleton DecisionStrategyLoader instance
 *
 * @returns Promise that resolves to the loader instance
 * @throws Error if loader fails to initialize within timeout
 *
 * @example
 * ```typescript
 * const loader = await getDecisionStrategyLoader();
 * const strategy = await loader.getStrategy('production');
 * ```
 */
export async function getDecisionStrategyLoader(): Promise<DecisionStrategyLoader> {
  // Return existing instance if available
  if (loaderInstance) {
    return loaderInstance;
  }

  // Wait for ongoing initialization if already started
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = (async () => {
    const configPath = path.join(process.cwd(), 'contracts', 'governance-decision-strategies.json');

    const loader = new DecisionStrategyLoader(configPath, {
      debug: process.env.NODE_ENV !== 'production',
      onProgress: status => {
        if (process.env.GOVERNANCE_DEBUG) {
          console.log(`[Governance] ${status.phase}: ${status.percentComplete}%`);
        }
      },
    });

    // Wait for loader to be ready (10 second timeout)
    await loader.waitUntilReady(10000);
    loaderInstance = loader;

    // Check health status
    const health = loader.getHealthStatus();
    if (health.state !== 'HEALTHY') {
      console.warn(
        `[Governance] Degraded state: ${health.state} - ${health.reason || 'Unknown reason'}`
      );
    } else if (process.env.GOVERNANCE_DEBUG) {
      console.log('[Governance] ✅ Strategy loader initialized successfully');
    }

    return loader;
  })();

  return initializationPromise;
}

/**
 * Get the current environment for strategy selection
 *
 * @returns Environment name: 'production', 'staging', or 'development'
 */
export function getCurrentEnvironment(): 'production' | 'staging' | 'development' {
  const env: string = process.env.NODE_ENV || 'development';
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
}

/**
 * Reset the loader singleton (for testing purposes only)
 *
 * WARNING: This should only be used in test environments to reset state
 * between test runs. DO NOT use in production code.
 */
export function resetLoaderForTesting(): void {
  loaderInstance = null;
  initializationPromise = null;
}
