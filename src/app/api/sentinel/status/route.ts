/**
 * GET /api/sentinel/status
 *
 * Returns governance system health, adapter metrics, and circuit state.
 * No authentication (internal tool, localhost only).
 */

import { NextResponse } from 'next/server';
import { getDecisionStrategyLoader } from '@/lib/agents/governance/shared/loader-singleton';
import { withGuard } from '@/lib/agents/governance/shared/api-guard';

export const GET = withGuard(async () => {
  try {
    const loader = await getDecisionStrategyLoader();
    const healthStatus = loader.getHealthStatus();

    const strategy = await loader.getStrategy('production');
    const claudeHealth = strategy.getClaudeHealth();

    return NextResponse.json({
      status: 'ok',
      timestamp: Date.now(),
      governance: {
        state: healthStatus.state,
        reason: healthStatus.reason,
        configSource: healthStatus.configSource,
        uptimeMs: healthStatus.uptimeMs,
        recoveryActions: healthStatus.recoveryActions,
      },
      claude: {
        available: claudeHealth.available,
        errorCount: claudeHealth.errorCount,
        circuitOpen: claudeHealth.circuitOpen,
        lastError: claudeHealth.lastError ?? null,
        lastSuccessTime: claudeHealth.lastSuccessTime ?? null,
        cliInstalled: claudeHealth.cliInstalled ?? null,
        cliVersion: claudeHealth.cliVersion ?? null,
      },
      metrics: healthStatus.metricsSnapshot,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
});
