/**
 * OLYMPUS 2.1 - 10X UPGRADE: Agent Performance Dashboard
 *
 * KNOW EXACTLY WHERE YOUR TOKENS GO.
 *
 * What it shows:
 * - Cost breakdown per agent (pie chart ready)
 * - Token usage trends over time
 * - Efficiency metrics (output quality per token)
 * - Anomaly detection (3x normal usage? Flag it)
 * - Optimization recommendations
 * - Historical comparisons
 * - Budget forecasting
 */

import { logger } from '../observability/logger';
import { incCounter, observeHistogram, setGauge } from '../observability/metrics';

// ============================================================================
// TYPES
// ============================================================================

export interface AgentPerformanceData {
  /** Agent identifier */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** Agent role/description */
  role: string;
  /** Total tokens consumed (input + output) */
  totalTokens: number;
  /** Input tokens only */
  inputTokens: number;
  /** Output tokens only */
  outputTokens: number;
  /** Total cost in USD */
  totalCost: number;
  /** Number of executions */
  executions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** Average execution time (ms) */
  avgExecutionTime: number;
  /** Average quality score (0-100) */
  avgQualityScore: number;
  /** Tokens per successful output (efficiency) */
  tokensPerSuccess: number;
  /** Cost per successful output */
  costPerSuccess: number;
  /** Retry rate */
  retryRate: number;
  /** Historical data points */
  history: PerformanceSnapshot[];
  /** Anomalies detected */
  anomalies: PerformanceAnomaly[];
  /** Performance trend */
  trend: 'improving' | 'stable' | 'degrading';
}

export interface PerformanceSnapshot {
  timestamp: number;
  tokens: number;
  cost: number;
  executions: number;
  successRate: number;
  avgQuality: number;
  avgDuration: number;
}

export interface PerformanceAnomaly {
  id: string;
  type: 'high_tokens' | 'high_cost' | 'low_quality' | 'high_retries' | 'slow_execution';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value: number;
  expectedValue: number;
  deviation: number;
  timestamp: number;
  buildId?: string;
}

export interface BuildPerformance {
  buildId: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
  totalTokens: number;
  totalCost: number;
  agentBreakdown: Map<string, AgentBuildMetrics>;
  phaseBreakdown: Map<string, PhaseBuildMetrics>;
  efficiency: BuildEfficiency;
}

export interface AgentBuildMetrics {
  agentId: string;
  tokens: number;
  cost: number;
  duration: number;
  qualityScore: number;
  retries: number;
  status: 'pending' | 'running' | 'complete' | 'failed';
}

export interface PhaseBuildMetrics {
  phaseId: string;
  phaseName: string;
  tokens: number;
  cost: number;
  duration: number;
  agentCount: number;
  successRate: number;
}

export interface BuildEfficiency {
  /** Tokens per line of code generated */
  tokensPerLine: number;
  /** Tokens per component generated */
  tokensPerComponent: number;
  /** Cost per feature implemented */
  costPerFeature: number;
  /** Quality score per dollar spent */
  qualityPerDollar: number;
  /** Comparison to baseline */
  vsBaseline: number;
  /** Comparison to best build */
  vsBest: number;
}

export interface DashboardData {
  /** Summary metrics */
  summary: DashboardSummary;
  /** Per-agent data */
  agents: AgentPerformanceData[];
  /** Recent builds */
  recentBuilds: BuildPerformance[];
  /** Top cost drivers */
  topCostDrivers: CostDriver[];
  /** Optimization suggestions */
  suggestions: OptimizationSuggestion[];
  /** Budget status */
  budget: BudgetStatus;
  /** Time range */
  timeRange: { start: number; end: number };
}

export interface DashboardSummary {
  totalTokens: number;
  totalCost: number;
  totalBuilds: number;
  successfulBuilds: number;
  avgTokensPerBuild: number;
  avgCostPerBuild: number;
  avgQualityScore: number;
  tokenTrend: number; // % change from previous period
  costTrend: number;
  qualityTrend: number;
}

export interface CostDriver {
  agentId: string;
  agentName: string;
  cost: number;
  percentage: number;
  tokens: number;
  reason: string;
  optimizable: boolean;
}

export interface OptimizationSuggestion {
  id: string;
  priority: 'low' | 'medium' | 'high';
  category: 'tokens' | 'cost' | 'quality' | 'speed';
  title: string;
  description: string;
  estimatedSavings: number;
  savingsType: 'tokens' | 'usd' | 'time' | 'percentage';
  actionable: boolean;
  action?: string;
}

export interface BudgetStatus {
  allocated: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  projectedTotal: number;
  projectedOverage: number;
  daysRemaining: number;
  avgDailySpend: number;
  onTrack: boolean;
}

// ============================================================================
// PRICING (Claude Models - Approximate)
// ============================================================================

const MODEL_PRICING: Record<string, { inputPer1K: number; outputPer1K: number }> = {
  'claude-3-opus': { inputPer1K: 0.015, outputPer1K: 0.075 },
  'claude-3-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-3-haiku': { inputPer1K: 0.00025, outputPer1K: 0.00125 },
  'claude-3.5-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-4-opus': { inputPer1K: 0.015, outputPer1K: 0.075 },
  'default': { inputPer1K: 0.003, outputPer1K: 0.015 },
};

function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model = 'default'
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['default'];
  return (inputTokens / 1000) * pricing.inputPer1K + (outputTokens / 1000) * pricing.outputPer1K;
}

// ============================================================================
// AGENT PERFORMANCE TRACKER
// ============================================================================

export class AgentPerformanceTracker {
  private agentData = new Map<string, AgentPerformanceData>();
  private buildData = new Map<string, BuildPerformance>();
  private snapshotInterval: NodeJS.Timeout | null = null;
  private readonly historyMaxLength = 100;
  private budgetConfig = {
    allocated: 100, // $100 default
    startDate: Date.now(),
    endDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  constructor() {
    // Start periodic snapshots
    this.snapshotInterval = setInterval(() => {
      this.takeSnapshots();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Record agent execution metrics
   */
  recordExecution(data: {
    agentId: string;
    agentName: string;
    role: string;
    buildId: string;
    phaseId: string;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    qualityScore: number;
    success: boolean;
    retries: number;
    model?: string;
  }): void {
    const cost = calculateCost(data.inputTokens, data.outputTokens, data.model);
    const totalTokens = data.inputTokens + data.outputTokens;

    // Update agent data
    let agent = this.agentData.get(data.agentId);
    if (!agent) {
      agent = this.createAgentData(data.agentId, data.agentName, data.role);
      this.agentData.set(data.agentId, agent);
    }

    agent.totalTokens += totalTokens;
    agent.inputTokens += data.inputTokens;
    agent.outputTokens += data.outputTokens;
    agent.totalCost += cost;
    agent.executions++;

    if (data.success) {
      agent.successfulExecutions++;
    } else {
      agent.failedExecutions++;
    }

    // Rolling averages
    agent.avgExecutionTime = this.updateAverage(
      agent.avgExecutionTime,
      data.duration,
      agent.executions
    );
    agent.avgQualityScore = this.updateAverage(
      agent.avgQualityScore,
      data.qualityScore,
      agent.executions
    );

    // Efficiency metrics
    if (agent.successfulExecutions > 0) {
      agent.tokensPerSuccess = agent.totalTokens / agent.successfulExecutions;
      agent.costPerSuccess = agent.totalCost / agent.successfulExecutions;
    }

    agent.retryRate = agent.executions > 0
      ? (data.retries / agent.executions)
      : 0;

    // Check for anomalies
    this.detectAnomalies(agent, {
      tokens: totalTokens,
      cost,
      quality: data.qualityScore,
      duration: data.duration,
      retries: data.retries,
      buildId: data.buildId,
    });

    // Update build data
    this.updateBuildData(data.buildId, data.phaseId, {
      agentId: data.agentId,
      tokens: totalTokens,
      cost,
      duration: data.duration,
      qualityScore: data.qualityScore,
      retries: data.retries,
      status: data.success ? 'complete' : 'failed',
    });

    // Metrics
    incCounter('olympus_agent_executions', 1, {
      agentId: data.agentId,
      success: data.success ? 'true' : 'false',
    });
    observeHistogram(`olympus_agent_tokens_${data.agentId}`, totalTokens);
    observeHistogram(`olympus_agent_cost_${data.agentId}`, cost);
    setGauge('olympus_agent_quality', data.qualityScore, { agentId: data.agentId });

    logger.debug('Agent execution recorded', {
      agentId: data.agentId,
      buildId: data.buildId,
      tokens: totalTokens,
      cost: cost.toFixed(4),
      quality: data.qualityScore,
      success: data.success,
    });
  }

  /**
   * Start tracking a build
   */
  startBuild(buildId: string): void {
    const build: BuildPerformance = {
      buildId,
      startTime: Date.now(),
      status: 'running',
      totalTokens: 0,
      totalCost: 0,
      agentBreakdown: new Map(),
      phaseBreakdown: new Map(),
      efficiency: {
        tokensPerLine: 0,
        tokensPerComponent: 0,
        costPerFeature: 0,
        qualityPerDollar: 0,
        vsBaseline: 1,
        vsBest: 1,
      },
    };

    this.buildData.set(buildId, build);
    setGauge('olympus_builds_running', 1);
  }

  /**
   * Complete a build
   */
  completeBuild(
    buildId: string,
    success: boolean,
    outputs?: { linesOfCode: number; components: number; features: number }
  ): void {
    const build = this.buildData.get(buildId);
    if (!build) return;

    build.endTime = Date.now();
    build.status = success ? 'completed' : 'failed';

    // Calculate efficiency
    if (outputs) {
      build.efficiency.tokensPerLine = outputs.linesOfCode > 0
        ? build.totalTokens / outputs.linesOfCode
        : 0;
      build.efficiency.tokensPerComponent = outputs.components > 0
        ? build.totalTokens / outputs.components
        : 0;
      build.efficiency.costPerFeature = outputs.features > 0
        ? build.totalCost / outputs.features
        : 0;
    }

    // Calculate quality per dollar
    const avgQuality = this.calculateBuildAvgQuality(build);
    build.efficiency.qualityPerDollar = build.totalCost > 0
      ? avgQuality / build.totalCost
      : 0;

    // Compare to baseline and best
    const allBuilds = Array.from(this.buildData.values()).filter(
      b => b.status === 'completed'
    );
    if (allBuilds.length > 0) {
      const avgTokens = allBuilds.reduce((sum, b) => sum + b.totalTokens, 0) / allBuilds.length;
      build.efficiency.vsBaseline = avgTokens / Math.max(1, build.totalTokens);

      const bestBuild = allBuilds.reduce((best, b) =>
        b.efficiency.qualityPerDollar > best.efficiency.qualityPerDollar ? b : best
      );
      build.efficiency.vsBest = build.efficiency.qualityPerDollar /
        Math.max(0.01, bestBuild.efficiency.qualityPerDollar);
    }

    setGauge('olympus_builds_running', 0);
    incCounter('olympus_builds_completed', 1, { success: success ? 'true' : 'false' });

    logger.info('Build completed', {
      buildId,
      success,
      totalTokens: build.totalTokens,
      totalCost: build.totalCost.toFixed(4),
      duration: build.endTime - build.startTime,
    });
  }

  /**
   * Get dashboard data
   */
  getDashboard(timeRange?: { start: number; end: number }): DashboardData {
    const range = timeRange || {
      start: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
      end: Date.now(),
    };

    const agents = Array.from(this.agentData.values());
    const builds = Array.from(this.buildData.values()).filter(
      b => b.startTime >= range.start && b.startTime <= range.end
    );

    return {
      summary: this.calculateSummary(agents, builds),
      agents,
      recentBuilds: builds.slice(-10),
      topCostDrivers: this.getTopCostDrivers(agents),
      suggestions: this.generateSuggestions(agents, builds),
      budget: this.calculateBudgetStatus(agents),
      timeRange: range,
    };
  }

  /**
   * Get agent-specific data
   */
  getAgentData(agentId: string): AgentPerformanceData | undefined {
    return this.agentData.get(agentId);
  }

  /**
   * Get build-specific data
   */
  getBuildData(buildId: string): BuildPerformance | undefined {
    return this.buildData.get(buildId);
  }

  /**
   * Set budget configuration
   */
  setBudget(config: { allocated: number; startDate: number; endDate: number }): void {
    this.budgetConfig = config;
  }

  /**
   * Export data for external analysis
   */
  exportData(): ExportedData {
    return {
      agents: Array.from(this.agentData.values()),
      builds: Array.from(this.buildData.values()).map(b => ({
        ...b,
        agentBreakdown: Array.from(b.agentBreakdown.entries()),
        phaseBreakdown: Array.from(b.phaseBreakdown.entries()),
      })),
      exportedAt: Date.now(),
    };
  }

  /**
   * Reset all data
   */
  reset(): void {
    this.agentData.clear();
    this.buildData.clear();
    logger.info('Performance tracker reset');
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private createAgentData(
    agentId: string,
    agentName: string,
    role: string
  ): AgentPerformanceData {
    return {
      agentId,
      agentName,
      role,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      executions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      avgExecutionTime: 0,
      avgQualityScore: 0,
      tokensPerSuccess: 0,
      costPerSuccess: 0,
      retryRate: 0,
      history: [],
      anomalies: [],
      trend: 'stable',
    };
  }

  private updateAverage(
    currentAvg: number,
    newValue: number,
    count: number
  ): number {
    return currentAvg + (newValue - currentAvg) / count;
  }

  private updateBuildData(
    buildId: string,
    phaseId: string,
    metrics: AgentBuildMetrics
  ): void {
    let build = this.buildData.get(buildId);
    if (!build) {
      this.startBuild(buildId);
      build = this.buildData.get(buildId)!;
    }

    build.totalTokens += metrics.tokens;
    build.totalCost += metrics.cost;
    build.agentBreakdown.set(metrics.agentId, metrics);

    // Update phase breakdown
    let phase = build.phaseBreakdown.get(phaseId);
    if (!phase) {
      phase = {
        phaseId,
        phaseName: phaseId, // Would come from config
        tokens: 0,
        cost: 0,
        duration: 0,
        agentCount: 0,
        successRate: 0,
      };
      build.phaseBreakdown.set(phaseId, phase);
    }

    phase.tokens += metrics.tokens;
    phase.cost += metrics.cost;
    phase.duration += metrics.duration;
    phase.agentCount++;
    phase.successRate = metrics.status === 'complete'
      ? (phase.successRate * (phase.agentCount - 1) + 1) / phase.agentCount
      : (phase.successRate * (phase.agentCount - 1)) / phase.agentCount;
  }

  private detectAnomalies(
    agent: AgentPerformanceData,
    current: {
      tokens: number;
      cost: number;
      quality: number;
      duration: number;
      retries: number;
      buildId: string;
    }
  ): void {
    if (agent.executions < 5) return; // Need baseline data

    const anomalies: PerformanceAnomaly[] = [];

    // High token usage (3x average)
    const avgTokens = agent.totalTokens / agent.executions;
    if (current.tokens > avgTokens * 3) {
      anomalies.push({
        id: `anomaly_${Date.now()}_tokens`,
        type: 'high_tokens',
        severity: current.tokens > avgTokens * 5 ? 'critical' : 'warning',
        message: `Token usage ${(current.tokens / avgTokens).toFixed(1)}x higher than average`,
        value: current.tokens,
        expectedValue: avgTokens,
        deviation: (current.tokens - avgTokens) / avgTokens,
        timestamp: Date.now(),
        buildId: current.buildId,
      });
    }

    // Low quality (below 70% of average)
    if (current.quality < agent.avgQualityScore * 0.7 && agent.avgQualityScore > 0) {
      anomalies.push({
        id: `anomaly_${Date.now()}_quality`,
        type: 'low_quality',
        severity: current.quality < agent.avgQualityScore * 0.5 ? 'critical' : 'warning',
        message: `Quality score ${((1 - current.quality / agent.avgQualityScore) * 100).toFixed(0)}% below average`,
        value: current.quality,
        expectedValue: agent.avgQualityScore,
        deviation: (agent.avgQualityScore - current.quality) / agent.avgQualityScore,
        timestamp: Date.now(),
        buildId: current.buildId,
      });
    }

    // High retries
    if (current.retries >= 3) {
      anomalies.push({
        id: `anomaly_${Date.now()}_retries`,
        type: 'high_retries',
        severity: current.retries >= 5 ? 'critical' : 'warning',
        message: `Required ${current.retries} retries (max typically 3)`,
        value: current.retries,
        expectedValue: 1,
        deviation: current.retries - 1,
        timestamp: Date.now(),
        buildId: current.buildId,
      });
    }

    // Slow execution (3x average)
    if (current.duration > agent.avgExecutionTime * 3 && agent.avgExecutionTime > 0) {
      anomalies.push({
        id: `anomaly_${Date.now()}_slow`,
        type: 'slow_execution',
        severity: 'info',
        message: `Execution ${(current.duration / agent.avgExecutionTime).toFixed(1)}x slower than average`,
        value: current.duration,
        expectedValue: agent.avgExecutionTime,
        deviation: (current.duration - agent.avgExecutionTime) / agent.avgExecutionTime,
        timestamp: Date.now(),
        buildId: current.buildId,
      });
    }

    // Add to agent anomalies
    agent.anomalies.push(...anomalies);

    // Keep only recent anomalies
    if (agent.anomalies.length > 50) {
      agent.anomalies = agent.anomalies.slice(-50);
    }

    // Log critical anomalies
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'critical') {
        logger.warn('Critical performance anomaly detected', {
          agentId: agent.agentId,
          type: anomaly.type,
          message: anomaly.message,
          buildId: current.buildId,
        });
      }
    }
  }

  private takeSnapshots(): void {
    for (const agent of this.agentData.values()) {
      const snapshot: PerformanceSnapshot = {
        timestamp: Date.now(),
        tokens: agent.totalTokens,
        cost: agent.totalCost,
        executions: agent.executions,
        successRate: agent.executions > 0
          ? agent.successfulExecutions / agent.executions
          : 0,
        avgQuality: agent.avgQualityScore,
        avgDuration: agent.avgExecutionTime,
      };

      agent.history.push(snapshot);

      // Keep history bounded
      if (agent.history.length > this.historyMaxLength) {
        agent.history = agent.history.slice(-this.historyMaxLength);
      }

      // Update trend
      agent.trend = this.calculateTrend(agent.history);
    }
  }

  private calculateTrend(
    history: PerformanceSnapshot[]
  ): 'improving' | 'stable' | 'degrading' {
    if (history.length < 5) return 'stable';

    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

    if (older.length === 0) return 'stable';

    const recentAvgQuality = recent.reduce((s, h) => s + h.avgQuality, 0) / recent.length;
    const olderAvgQuality = older.reduce((s, h) => s + h.avgQuality, 0) / older.length;

    const qualityChange = (recentAvgQuality - olderAvgQuality) / Math.max(1, olderAvgQuality);

    if (qualityChange > 0.05) return 'improving';
    if (qualityChange < -0.05) return 'degrading';
    return 'stable';
  }

  private calculateSummary(
    agents: AgentPerformanceData[],
    builds: BuildPerformance[]
  ): DashboardSummary {
    const totalTokens = agents.reduce((s, a) => s + a.totalTokens, 0);
    const totalCost = agents.reduce((s, a) => s + a.totalCost, 0);
    const successfulBuilds = builds.filter(b => b.status === 'completed').length;

    return {
      totalTokens,
      totalCost,
      totalBuilds: builds.length,
      successfulBuilds,
      avgTokensPerBuild: builds.length > 0 ? totalTokens / builds.length : 0,
      avgCostPerBuild: builds.length > 0 ? totalCost / builds.length : 0,
      avgQualityScore: agents.length > 0
        ? agents.reduce((s, a) => s + a.avgQualityScore, 0) / agents.length
        : 0,
      tokenTrend: 0, // Would calculate from history
      costTrend: 0,
      qualityTrend: 0,
    };
  }

  private getTopCostDrivers(agents: AgentPerformanceData[]): CostDriver[] {
    const totalCost = agents.reduce((s, a) => s + a.totalCost, 0);

    return agents
      .map(a => ({
        agentId: a.agentId,
        agentName: a.agentName,
        cost: a.totalCost,
        percentage: totalCost > 0 ? (a.totalCost / totalCost) * 100 : 0,
        tokens: a.totalTokens,
        reason: this.getCostReason(a),
        optimizable: a.tokensPerSuccess > 5000 || a.retryRate > 0.2,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }

  private getCostReason(agent: AgentPerformanceData): string {
    if (agent.retryRate > 0.3) return 'High retry rate';
    if (agent.tokensPerSuccess > 10000) return 'Low token efficiency';
    if (agent.failedExecutions > agent.successfulExecutions) return 'High failure rate';
    if (agent.executions > 100) return 'High usage volume';
    return 'Standard usage';
  }

  private generateSuggestions(
    agents: AgentPerformanceData[],
    builds: BuildPerformance[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    for (const agent of agents) {
      // High retry rate
      if (agent.retryRate > 0.2) {
        suggestions.push({
          id: `sug_${agent.agentId}_retries`,
          priority: 'high',
          category: 'cost',
          title: `Reduce ${agent.agentName} retries`,
          description: `${agent.agentName} has ${(agent.retryRate * 100).toFixed(0)}% retry rate. Consider clearer prompts or pre-validation.`,
          estimatedSavings: agent.totalCost * agent.retryRate * 0.5,
          savingsType: 'usd',
          actionable: true,
          action: 'Review and improve prompt templates',
        });
      }

      // Low efficiency
      if (agent.tokensPerSuccess > 8000 && agent.executions > 5) {
        suggestions.push({
          id: `sug_${agent.agentId}_efficiency`,
          priority: 'medium',
          category: 'tokens',
          title: `Optimize ${agent.agentName} prompts`,
          description: `${agent.agentName} uses ${agent.tokensPerSuccess.toLocaleString()} tokens per success. Industry avg is ~5000.`,
          estimatedSavings: (agent.tokensPerSuccess - 5000) * agent.successfulExecutions,
          savingsType: 'tokens',
          actionable: true,
          action: 'Shorten system prompts and examples',
        });
      }

      // Low quality
      if (agent.avgQualityScore < 75 && agent.executions > 5) {
        suggestions.push({
          id: `sug_${agent.agentId}_quality`,
          priority: 'high',
          category: 'quality',
          title: `Improve ${agent.agentName} quality`,
          description: `${agent.agentName} avg quality is ${agent.avgQualityScore.toFixed(0)}%. Target is 85%.`,
          estimatedSavings: 15,
          savingsType: 'percentage',
          actionable: true,
          action: 'Add more specific constraints and examples',
        });
      }
    }

    // Build-level suggestions
    const avgBuildCost = builds.length > 0
      ? builds.reduce((s, b) => s + b.totalCost, 0) / builds.length
      : 0;

    if (avgBuildCost > 0.50) {
      suggestions.push({
        id: 'sug_build_cost',
        priority: 'medium',
        category: 'cost',
        title: 'Consider using Haiku for simple tasks',
        description: `Avg build costs $${avgBuildCost.toFixed(2)}. Haiku could reduce simple agent costs by 90%.`,
        estimatedSavings: avgBuildCost * 0.3,
        savingsType: 'usd',
        actionable: true,
        action: 'Route simple validations to Claude Haiku',
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private calculateBudgetStatus(agents: AgentPerformanceData[]): BudgetStatus {
    const spent = agents.reduce((s, a) => s + a.totalCost, 0);
    const remaining = Math.max(0, this.budgetConfig.allocated - spent);
    const percentUsed = this.budgetConfig.allocated > 0
      ? (spent / this.budgetConfig.allocated) * 100
      : 0;

    const daysElapsed = Math.max(1, (Date.now() - this.budgetConfig.startDate) / (24 * 60 * 60 * 1000));
    const daysTotal = Math.max(1, (this.budgetConfig.endDate - this.budgetConfig.startDate) / (24 * 60 * 60 * 1000));
    const daysRemaining = Math.max(0, daysTotal - daysElapsed);

    const avgDailySpend = spent / daysElapsed;
    const projectedTotal = avgDailySpend * daysTotal;
    const projectedOverage = Math.max(0, projectedTotal - this.budgetConfig.allocated);

    return {
      allocated: this.budgetConfig.allocated,
      spent,
      remaining,
      percentUsed,
      projectedTotal,
      projectedOverage,
      daysRemaining,
      avgDailySpend,
      onTrack: projectedTotal <= this.budgetConfig.allocated * 1.1,
    };
  }

  private calculateBuildAvgQuality(build: BuildPerformance): number {
    const agents = Array.from(build.agentBreakdown.values());
    if (agents.length === 0) return 0;
    return agents.reduce((s, a) => s + a.qualityScore, 0) / agents.length;
  }
}

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

export interface ExportedData {
  agents: AgentPerformanceData[];
  builds: Array<Omit<BuildPerformance, 'agentBreakdown' | 'phaseBreakdown'> & {
    agentBreakdown: [string, AgentBuildMetrics][];
    phaseBreakdown: [string, PhaseBuildMetrics][];
  }>;
  exportedAt: number;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const performanceTracker = new AgentPerformanceTracker();

export default performanceTracker;
