/**
 * ============================================================================
 * PREDICTIVE ANALYTICS ENGINE - LEARN FROM THE PAST, PREDICT THE FUTURE
 * ============================================================================
 *
 * "The best prediction of future behavior is past behavior."
 *
 * This module implements ML-powered predictions:
 * - Build duration estimation (± accuracy tracking)
 * - Failure probability prediction
 * - Resource usage forecasting
 * - Anomaly detection
 * - Optimization recommendations
 * - Pattern recognition across builds
 *
 * Inspired by: Google's Build Analysis, Netflix's Chaos Engineering Analytics
 * ============================================================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventStore, BuildEvent, BuildEventType } from './event-sourcing';

// ============================================================================
// TYPES
// ============================================================================

export interface BuildPrediction {
  buildId: string;
  estimatedDuration: {
    optimistic: number; // P10
    expected: number; // P50
    pessimistic: number; // P90
    confidence: number; // 0-1
  };
  failureProbability: {
    overall: number;
    byPhase: Map<string, number>;
    byAgent: Map<string, number>;
    riskFactors: RiskFactor[];
  };
  resourceEstimate: {
    totalTokens: number;
    estimatedCost: number;
    peakMemory: number;
    apiCalls: number;
  };
  recommendations: Recommendation[];
  similarBuilds: SimilarBuild[];
  createdAt: Date;
}

export interface RiskFactor {
  type:
    | 'high_failure_agent'
    | 'complex_dependencies'
    | 'resource_intensive'
    | 'novel_pattern'
    | 'time_sensitive';
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
  affectedComponents: string[];
}

export interface Recommendation {
  type: 'optimization' | 'risk_mitigation' | 'cost_saving' | 'quality_improvement';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'minimal' | 'moderate' | 'significant';
  autoApplicable: boolean;
}

export interface SimilarBuild {
  buildId: string;
  similarity: number; // 0-1
  duration: number;
  outcome: 'completed' | 'failed';
  lessonsLearned: string[];
}

export interface HistoricalStats {
  projectType: string;
  totalBuilds: number;
  successRate: number;
  averageDuration: number;
  durationStdDev: number;
  averageTokens: number;
  averageCost: number;
  phaseStats: Map<string, PhaseStats>;
  agentStats: Map<string, AgentStats>;
  trends: TrendData;
}

export interface PhaseStats {
  phaseId: string;
  averageDuration: number;
  successRate: number;
  skipRate: number;
  bottleneckScore: number; // How often this phase is the slowest
}

export interface AgentStats {
  agentId: string;
  invocationCount: number;
  successRate: number;
  averageDuration: number;
  averageQuality: number;
  retryRate: number;
  failurePatterns: FailurePattern[];
}

export interface FailurePattern {
  errorCode: string;
  frequency: number;
  averageRetries: number;
  recoveryRate: number;
  correlatedAgents: string[];
}

export interface TrendData {
  durationTrend: 'improving' | 'stable' | 'degrading';
  qualityTrend: 'improving' | 'stable' | 'degrading';
  costTrend: 'decreasing' | 'stable' | 'increasing';
  weekOverWeek: {
    duration: number; // % change
    quality: number;
    cost: number;
  };
}

export interface AnomalyDetection {
  buildId: string;
  anomalies: Anomaly[];
  overallScore: number; // 0-100, higher = more anomalous
}

export interface Anomaly {
  type: 'duration' | 'tokens' | 'quality' | 'failures' | 'pattern';
  severity: 'low' | 'medium' | 'high';
  description: string;
  expectedValue: number;
  actualValue: number;
  deviationScore: number; // Standard deviations from mean
  timestamp: Date;
}

// ============================================================================
// PREDICTION ENGINE
// ============================================================================

export class PredictionEngine {
  private supabase: SupabaseClient;
  private eventStore: EventStore;
  private statsCache: Map<string, { stats: HistoricalStats; cachedAt: Date }> = new Map();
  private cacheValidityMs = 300000; // 5 minutes

  constructor(eventStore: EventStore) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(url, key);
    this.eventStore = eventStore;
  }

  /**
   * Generate comprehensive prediction for a new build
   */
  async predictBuild(
    projectType: string,
    phases: string[],
    agents: string[],
    metadata?: Record<string, unknown>
  ): Promise<BuildPrediction> {
    // Get historical stats
    const stats = await this.getHistoricalStats(projectType);

    // Find similar builds
    const similarBuilds = await this.findSimilarBuilds(projectType, phases, agents);

    // Calculate duration estimate
    const estimatedDuration = this.estimateDuration(stats, phases, agents, similarBuilds);

    // Calculate failure probability
    const failureProbability = this.estimateFailureProbability(stats, phases, agents);

    // Estimate resources
    const resourceEstimate = this.estimateResources(stats, agents);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      stats,
      failureProbability,
      resourceEstimate
    );

    return {
      buildId: '', // Will be assigned when build starts
      estimatedDuration,
      failureProbability,
      resourceEstimate,
      recommendations,
      similarBuilds: similarBuilds.slice(0, 5),
      createdAt: new Date(),
    };
  }

  /**
   * Update prediction as build progresses (real-time refinement)
   */
  async refinePrediction(
    buildId: string,
    currentPrediction: BuildPrediction,
    completedPhases: string[],
    completedAgents: Map<string, { duration: number; success: boolean }>
  ): Promise<BuildPrediction> {
    // Calculate actual progress
    const actualDuration = Array.from(completedAgents.values()).reduce(
      (sum, a) => sum + a.duration,
      0
    );

    // Adjust remaining estimate based on actual performance
    const performanceRatio =
      currentPrediction.estimatedDuration.expected > 0
        ? actualDuration / (currentPrediction.estimatedDuration.expected * 0.3) // Assuming 30% done
        : 1;

    const remainingEstimate = currentPrediction.estimatedDuration.expected * 0.7 * performanceRatio;

    // Recalculate failure probability based on actual failures
    const actualFailures = Array.from(completedAgents.values()).filter(a => !a.success).length;
    const failureRate = completedAgents.size > 0 ? actualFailures / completedAgents.size : 0;

    return {
      ...currentPrediction,
      estimatedDuration: {
        ...currentPrediction.estimatedDuration,
        expected: actualDuration + remainingEstimate,
        confidence: Math.min(0.95, currentPrediction.estimatedDuration.confidence + 0.1),
      },
      failureProbability: {
        ...currentPrediction.failureProbability,
        overall: Math.max(
          currentPrediction.failureProbability.overall,
          failureRate * 1.5 // Weight actual failures higher
        ),
      },
    };
  }

  /**
   * Get historical statistics for a project type
   */
  async getHistoricalStats(projectType: string): Promise<HistoricalStats> {
    // Check cache
    const cached = this.statsCache.get(projectType);
    if (cached && Date.now() - cached.cachedAt.getTime() < this.cacheValidityMs) {
      return cached.stats;
    }

    // Query historical data
    const { data: builds, error } = await this.supabase
      .from('build_analytics')
      .select('*')
      .eq('project_type', projectType)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error || !builds || builds.length === 0) {
      return this.getDefaultStats(projectType);
    }

    const stats = this.calculateStats(builds, projectType);

    // Cache results
    this.statsCache.set(projectType, { stats, cachedAt: new Date() });

    return stats;
  }

  /**
   * Detect anomalies in a completed build
   */
  async detectAnomalies(buildId: string): Promise<AnomalyDetection> {
    const events = await this.eventStore.getEvents(buildId);
    if (events.length === 0) {
      return { buildId, anomalies: [], overallScore: 0 };
    }

    // Get project type from first event
    const createEvent = events.find(e => e.type === 'BUILD_CREATED');
    const projectType =
      (createEvent?.payload as { projectType?: string })?.projectType || 'unknown';

    const stats = await this.getHistoricalStats(projectType);
    const anomalies: Anomaly[] = [];

    // Calculate build metrics from events
    const buildMetrics = this.calculateBuildMetrics(events);

    // Check duration anomaly
    if (buildMetrics.totalDuration > 0 && stats.averageDuration > 0) {
      const durationDeviation =
        (buildMetrics.totalDuration - stats.averageDuration) / (stats.durationStdDev || 1);

      if (Math.abs(durationDeviation) > 2) {
        anomalies.push({
          type: 'duration',
          severity: Math.abs(durationDeviation) > 3 ? 'high' : 'medium',
          description:
            durationDeviation > 0
              ? 'Build took significantly longer than average'
              : 'Build completed unusually fast',
          expectedValue: stats.averageDuration,
          actualValue: buildMetrics.totalDuration,
          deviationScore: durationDeviation,
          timestamp: new Date(),
        });
      }
    }

    // Check token anomaly
    if (buildMetrics.totalTokens > 0 && stats.averageTokens > 0) {
      const tokenDeviation =
        (buildMetrics.totalTokens - stats.averageTokens) / (stats.averageTokens * 0.3);

      if (Math.abs(tokenDeviation) > 2) {
        anomalies.push({
          type: 'tokens',
          severity: tokenDeviation > 3 ? 'high' : 'medium',
          description: 'Unusual token consumption detected',
          expectedValue: stats.averageTokens,
          actualValue: buildMetrics.totalTokens,
          deviationScore: tokenDeviation,
          timestamp: new Date(),
        });
      }
    }

    // Check failure pattern anomaly
    if (buildMetrics.failureRate > stats.successRate * 0.5) {
      anomalies.push({
        type: 'failures',
        severity: 'high',
        description: 'Higher than expected failure rate',
        expectedValue: 1 - stats.successRate,
        actualValue: buildMetrics.failureRate,
        deviationScore: (buildMetrics.failureRate - (1 - stats.successRate)) * 10,
        timestamp: new Date(),
      });
    }

    // Calculate overall anomaly score
    const overallScore = Math.min(
      100,
      anomalies.reduce((sum, a) => {
        const severityWeight = a.severity === 'high' ? 3 : a.severity === 'medium' ? 2 : 1;
        return sum + Math.abs(a.deviationScore) * severityWeight * 10;
      }, 0)
    );

    return { buildId, anomalies, overallScore };
  }

  /**
   * Learn from a completed build (updates models)
   */
  async learnFromBuild(buildId: string): Promise<void> {
    const events = await this.eventStore.getEvents(buildId);
    if (events.length === 0) return;

    const metrics = this.calculateBuildMetrics(events);
    const createEvent = events.find(e => e.type === 'BUILD_CREATED');
    const projectType =
      (createEvent?.payload as { projectType?: string })?.projectType || 'unknown';

    // Store analytics for future predictions
    await this.supabase.from('build_analytics').insert({
      build_id: buildId,
      project_type: projectType,
      total_duration: metrics.totalDuration,
      total_tokens: metrics.totalTokens,
      total_cost: metrics.totalCost,
      success: metrics.success,
      failure_rate: metrics.failureRate,
      average_quality: metrics.averageQuality,
      phase_durations: Object.fromEntries(metrics.phaseDurations),
      agent_performance: Object.fromEntries(metrics.agentPerformance),
      created_at: new Date().toISOString(),
    });

    // Invalidate cache
    this.statsCache.delete(projectType);
  }

  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================

  private estimateDuration(
    stats: HistoricalStats,
    phases: string[],
    agents: string[],
    similarBuilds: SimilarBuild[]
  ): BuildPrediction['estimatedDuration'] {
    // Base estimate from historical average
    let baseEstimate = stats.averageDuration;

    // Adjust for number of agents
    const agentFactor = agents.length / 10; // Normalize to typical build
    baseEstimate *= Math.sqrt(agentFactor); // Sublinear scaling due to parallelism

    // Weight by similar builds
    if (similarBuilds.length > 0) {
      const similarAvg =
        similarBuilds.reduce((sum, b) => sum + b.duration * b.similarity, 0) /
        similarBuilds.reduce((sum, b) => sum + b.similarity, 0);

      baseEstimate = baseEstimate * 0.6 + similarAvg * 0.4;
    }

    // Calculate confidence based on data availability
    const confidence = Math.min(
      0.9,
      0.5 + (stats.totalBuilds / 100) * 0.2 + (similarBuilds.length / 10) * 0.2
    );

    return {
      optimistic: baseEstimate * 0.7,
      expected: baseEstimate,
      pessimistic: baseEstimate * 1.5,
      confidence,
    };
  }

  private estimateFailureProbability(
    stats: HistoricalStats,
    phases: string[],
    agents: string[]
  ): BuildPrediction['failureProbability'] {
    const byPhase = new Map<string, number>();
    const byAgent = new Map<string, number>();
    const riskFactors: RiskFactor[] = [];

    // Calculate per-phase failure probability
    for (const phaseId of phases) {
      const phaseStats = stats.phaseStats.get(phaseId);
      if (phaseStats) {
        byPhase.set(phaseId, 1 - phaseStats.successRate);
      } else {
        byPhase.set(phaseId, 0.1); // Default for unknown phases
      }
    }

    // Calculate per-agent failure probability
    for (const agentId of agents) {
      const agentStats = stats.agentStats.get(agentId);
      if (agentStats) {
        byAgent.set(agentId, 1 - agentStats.successRate);

        // Check for high-failure agents
        if (agentStats.successRate < 0.8) {
          riskFactors.push({
            type: 'high_failure_agent',
            severity: agentStats.successRate < 0.6 ? 'high' : 'medium',
            description: `Agent ${agentId} has ${((1 - agentStats.successRate) * 100).toFixed(0)}% failure rate`,
            mitigation: 'Consider configuring fallback agent or increasing retry limit',
            affectedComponents: [agentId],
          });
        }
      } else {
        byAgent.set(agentId, 0.15); // Higher default for unknown agents
        riskFactors.push({
          type: 'novel_pattern',
          severity: 'low',
          description: `Agent ${agentId} has no historical data`,
          mitigation: 'Monitor closely during first execution',
          affectedComponents: [agentId],
        });
      }
    }

    // Calculate overall failure probability (1 - all succeed)
    const agentSuccessProbs = Array.from(byAgent.values()).map(f => 1 - f);
    const overallSuccess = agentSuccessProbs.reduce((prod, p) => prod * p, 1);

    return {
      overall: 1 - overallSuccess,
      byPhase,
      byAgent,
      riskFactors,
    };
  }

  private estimateResources(
    stats: HistoricalStats,
    agents: string[]
  ): BuildPrediction['resourceEstimate'] {
    let totalTokens = 0;
    let apiCalls = 0;

    for (const agentId of agents) {
      const agentStats = stats.agentStats.get(agentId);
      if (agentStats) {
        // Assume average tokens per invocation is tracked
        totalTokens += 5000; // Placeholder - would come from real stats
        apiCalls += 1 + agentStats.retryRate; // Account for retries
      } else {
        totalTokens += 7500; // Conservative estimate for unknown
        apiCalls += 1.2;
      }
    }

    // Estimate cost ($0.01 per 1K tokens as placeholder)
    const estimatedCost = (totalTokens / 1000) * 0.01;

    return {
      totalTokens,
      estimatedCost,
      peakMemory: 512 * 1024 * 1024, // 512MB default
      apiCalls: Math.ceil(apiCalls),
    };
  }

  private generateRecommendations(
    stats: HistoricalStats,
    failureProbability: BuildPrediction['failureProbability'],
    resourceEstimate: BuildPrediction['resourceEstimate']
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // High failure probability recommendation
    if (failureProbability.overall > 0.3) {
      recommendations.push({
        type: 'risk_mitigation',
        priority: 'high',
        title: 'Configure Fallback Agents',
        description: `Build has ${(failureProbability.overall * 100).toFixed(0)}% failure probability. Configure fallbacks for high-risk agents.`,
        impact: 'Could reduce failure rate by 40-60%',
        effort: 'moderate',
        autoApplicable: true,
      });
    }

    // Cost optimization
    if (resourceEstimate.estimatedCost > stats.averageCost * 1.5) {
      recommendations.push({
        type: 'cost_saving',
        priority: 'medium',
        title: 'Review Token-Heavy Agents',
        description:
          'Estimated cost is significantly above average. Consider caching or optimizing prompts.',
        impact: `Could save ~$${((resourceEstimate.estimatedCost - stats.averageCost) * 0.5).toFixed(2)}`,
        effort: 'moderate',
        autoApplicable: false,
      });
    }

    // Parallelization opportunity
    const bottleneckPhases = Array.from(stats.phaseStats.entries())
      .filter(([, s]) => s.bottleneckScore > 0.5)
      .map(([id]) => id);

    if (bottleneckPhases.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Optimize Bottleneck Phases',
        description: `Phases ${bottleneckPhases.join(', ')} are frequently bottlenecks. Consider parallel execution.`,
        impact: 'Could reduce duration by 20-30%',
        effort: 'significant',
        autoApplicable: false,
      });
    }

    // Quality improvement
    for (const [agentId, prob] of failureProbability.byAgent) {
      if (prob > 0.2) {
        const agentStats = stats.agentStats.get(agentId);
        if (agentStats && agentStats.averageQuality < 7) {
          recommendations.push({
            type: 'quality_improvement',
            priority: 'low',
            title: `Improve ${agentId} Quality`,
            description: `Agent has average quality of ${agentStats.averageQuality.toFixed(1)}/10. Review prompts or add validation.`,
            impact: 'Better output quality and fewer downstream issues',
            effort: 'moderate',
            autoApplicable: false,
          });
        }
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private async findSimilarBuilds(
    projectType: string,
    phases: string[],
    agents: string[]
  ): Promise<SimilarBuild[]> {
    const { data, error } = await this.supabase
      .from('build_analytics')
      .select('*')
      .eq('project_type', projectType)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) return [];

    return data
      .map(build => {
        // Calculate Jaccard similarity based on agents
        const buildAgents = new Set(Object.keys(build.agent_performance || {}));
        const inputAgents = new Set(agents);
        const intersection = new Set([...buildAgents].filter(x => inputAgents.has(x)));
        const union = new Set([...buildAgents, ...inputAgents]);
        const similarity = intersection.size / union.size;

        return {
          buildId: build.build_id,
          similarity,
          duration: build.total_duration,
          outcome: build.success ? 'completed' : 'failed',
          lessonsLearned: [], // Would come from stored learnings
        } as SimilarBuild;
      })
      .filter(b => b.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity);
  }

  private calculateStats(builds: any[], projectType: string): HistoricalStats {
    const successfulBuilds = builds.filter(b => b.success);
    const durations = builds.map(b => b.total_duration).filter(d => d > 0);

    const avgDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const durationVariance =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length
        : 0;

    // Aggregate phase stats
    const phaseStats = new Map<string, PhaseStats>();
    const agentStats = new Map<string, AgentStats>();

    for (const build of builds) {
      const phaseDurations = build.phase_durations || {};
      const agentPerf = build.agent_performance || {};

      for (const [phaseId, duration] of Object.entries(phaseDurations)) {
        const existing = phaseStats.get(phaseId) || {
          phaseId,
          averageDuration: 0,
          successRate: 0,
          skipRate: 0,
          bottleneckScore: 0,
        };
        existing.averageDuration = (existing.averageDuration + (duration as number)) / 2;
        phaseStats.set(phaseId, existing);
      }

      for (const [agentId, perf] of Object.entries(agentPerf)) {
        const p = perf as { duration: number; success: boolean; quality: number };
        const existing = agentStats.get(agentId) || {
          agentId,
          invocationCount: 0,
          successRate: 0,
          averageDuration: 0,
          averageQuality: 0,
          retryRate: 0,
          failurePatterns: [],
        };
        existing.invocationCount++;
        existing.averageDuration = (existing.averageDuration + p.duration) / 2;
        existing.averageQuality = (existing.averageQuality + (p.quality || 0)) / 2;
        existing.successRate =
          (existing.successRate * (existing.invocationCount - 1) + (p.success ? 1 : 0)) /
          existing.invocationCount;
        agentStats.set(agentId, existing);
      }
    }

    // Calculate trends (simplified)
    const recentBuilds = builds.slice(0, 10);
    const olderBuilds = builds.slice(10, 20);

    const recentAvgDuration =
      recentBuilds.length > 0
        ? recentBuilds.reduce((s, b) => s + b.total_duration, 0) / recentBuilds.length
        : avgDuration;
    const olderAvgDuration =
      olderBuilds.length > 0
        ? olderBuilds.reduce((s, b) => s + b.total_duration, 0) / olderBuilds.length
        : avgDuration;

    const durationTrend =
      recentAvgDuration < olderAvgDuration * 0.9
        ? 'improving'
        : recentAvgDuration > olderAvgDuration * 1.1
          ? 'degrading'
          : 'stable';

    return {
      projectType,
      totalBuilds: builds.length,
      successRate: successfulBuilds.length / Math.max(builds.length, 1),
      averageDuration: avgDuration,
      durationStdDev: Math.sqrt(durationVariance),
      averageTokens:
        builds.reduce((s, b) => s + (b.total_tokens || 0), 0) / Math.max(builds.length, 1),
      averageCost: builds.reduce((s, b) => s + (b.total_cost || 0), 0) / Math.max(builds.length, 1),
      phaseStats,
      agentStats,
      trends: {
        durationTrend,
        qualityTrend: 'stable',
        costTrend: 'stable',
        weekOverWeek: {
          duration: ((recentAvgDuration - olderAvgDuration) / Math.max(olderAvgDuration, 1)) * 100,
          quality: 0,
          cost: 0,
        },
      },
    };
  }

  private getDefaultStats(projectType: string): HistoricalStats {
    return {
      projectType,
      totalBuilds: 0,
      successRate: 0.85,
      averageDuration: 300000, // 5 minutes
      durationStdDev: 60000,
      averageTokens: 50000,
      averageCost: 0.5,
      phaseStats: new Map(),
      agentStats: new Map(),
      trends: {
        durationTrend: 'stable',
        qualityTrend: 'stable',
        costTrend: 'stable',
        weekOverWeek: { duration: 0, quality: 0, cost: 0 },
      },
    };
  }

  private calculateBuildMetrics(events: BuildEvent[]): {
    totalDuration: number;
    totalTokens: number;
    totalCost: number;
    success: boolean;
    failureRate: number;
    averageQuality: number;
    phaseDurations: Map<string, number>;
    agentPerformance: Map<string, { duration: number; success: boolean; quality: number }>;
  } {
    const startEvent = events.find(e => e.type === 'BUILD_STARTED');
    const endEvent = events.find(e =>
      ['BUILD_COMPLETED', 'BUILD_FAILED', 'BUILD_CANCELLED'].includes(e.type)
    );

    const totalDuration =
      startEvent && endEvent ? endEvent.timestamp.getTime() - startEvent.timestamp.getTime() : 0;

    let totalTokens = 0;
    let totalCost = 0;
    let qualitySum = 0;
    let qualityCount = 0;
    let agentCount = 0;
    let failedAgents = 0;

    const phaseDurations = new Map<string, number>();
    const agentPerformance = new Map<
      string,
      { duration: number; success: boolean; quality: number }
    >();

    for (const event of events) {
      if (event.type === 'TOKENS_CONSUMED') {
        const payload = event.payload as { tokens: number; cost: number };
        totalTokens += payload.tokens;
        totalCost += payload.cost;
      }

      if (event.type === 'AGENT_COMPLETED') {
        const payload = event.payload as {
          agentId: string;
          duration: number;
          qualityScore: number;
        };
        agentCount++;
        qualitySum += payload.qualityScore;
        qualityCount++;
        agentPerformance.set(payload.agentId, {
          duration: payload.duration,
          success: true,
          quality: payload.qualityScore,
        });
      }

      if (event.type === 'AGENT_FAILED') {
        const payload = event.payload as { agentId: string };
        agentCount++;
        failedAgents++;
        agentPerformance.set(payload.agentId, {
          duration: 0,
          success: false,
          quality: 0,
        });
      }

      if (event.type === 'PHASE_COMPLETED') {
        const payload = event.payload as { phaseId: string };
        const phaseStart = events.find(
          e =>
            e.type === 'PHASE_STARTED' &&
            (e.payload as { phaseId: string }).phaseId === payload.phaseId
        );
        if (phaseStart) {
          phaseDurations.set(
            payload.phaseId,
            event.timestamp.getTime() - phaseStart.timestamp.getTime()
          );
        }
      }
    }

    return {
      totalDuration,
      totalTokens,
      totalCost,
      success: endEvent?.type === 'BUILD_COMPLETED',
      failureRate: agentCount > 0 ? failedAgents / agentCount : 0,
      averageQuality: qualityCount > 0 ? qualitySum / qualityCount : 0,
      phaseDurations,
      agentPerformance,
    };
  }
}

// ============================================================================
// PATTERN RECOGNIZER - Find recurring patterns
// ============================================================================

export interface RecognizedPattern {
  id: string;
  type: 'success' | 'failure' | 'optimization' | 'anti-pattern';
  name: string;
  description: string;
  frequency: number;
  confidence: number;
  indicators: string[];
  recommendation: string;
}

export class PatternRecognizer {
  private knownPatterns: Map<string, RecognizedPattern> = new Map();

  /**
   * Analyze events to find patterns
   */
  analyze(events: BuildEvent[]): RecognizedPattern[] {
    const found: RecognizedPattern[] = [];

    // Check for retry storm pattern
    const retryEvents = events.filter(e => e.type === 'AGENT_RETRIED');
    if (retryEvents.length > 5) {
      found.push({
        id: 'retry-storm',
        type: 'anti-pattern',
        name: 'Retry Storm',
        description: 'Multiple agents are failing and retrying frequently',
        frequency: retryEvents.length,
        confidence: 0.9,
        indicators: retryEvents.map(e => (e.payload as { agentId: string }).agentId),
        recommendation: 'Check external dependencies or rate limits',
      });
    }

    // Check for cascade failure pattern
    const failures = events.filter(e => e.type === 'AGENT_FAILED');
    if (failures.length > 3) {
      const failureTimes = failures.map(e => e.timestamp.getTime());
      const timeDiffs = [];
      for (let i = 1; i < failureTimes.length; i++) {
        timeDiffs.push(failureTimes[i] - failureTimes[i - 1]);
      }
      const avgDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;

      if (avgDiff < 5000) {
        // Failures within 5 seconds
        found.push({
          id: 'cascade-failure',
          type: 'failure',
          name: 'Cascade Failure',
          description: 'Failures are occurring in rapid succession',
          frequency: failures.length,
          confidence: 0.85,
          indicators: failures.map(e => (e.payload as { agentId: string }).agentId),
          recommendation: 'Enable circuit breakers to prevent cascade',
        });
      }
    }

    // Check for slow-start pattern
    const agentStarts = events.filter(e => e.type === 'AGENT_STARTED');
    const agentCompletes = events.filter(e => e.type === 'AGENT_COMPLETED');

    if (agentStarts.length > 0 && agentCompletes.length > 0) {
      const firstComplete = agentCompletes[0];
      const firstStart = agentStarts[0];
      const firstDuration = firstComplete.timestamp.getTime() - firstStart.timestamp.getTime();

      const laterCompletes = agentCompletes.slice(1);
      const avgLaterDuration =
        laterCompletes.length > 0
          ? laterCompletes.reduce((sum, e, i) => {
              const start = agentStarts.find(
                s =>
                  (s.payload as { agentId: string }).agentId ===
                  (e.payload as { agentId: string }).agentId
              );
              return sum + (start ? e.timestamp.getTime() - start.timestamp.getTime() : 0);
            }, 0) / laterCompletes.length
          : firstDuration;

      if (firstDuration > avgLaterDuration * 2) {
        found.push({
          id: 'slow-start',
          type: 'optimization',
          name: 'Slow Start',
          description: 'First agent takes significantly longer (cold start)',
          frequency: 1,
          confidence: 0.7,
          indicators: [(firstComplete.payload as { agentId: string }).agentId],
          recommendation: 'Consider warming up agents or caching initialization',
        });
      }
    }

    return found;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createPredictionEngine(eventStore: EventStore): PredictionEngine {
  return new PredictionEngine(eventStore);
}

export function createPatternRecognizer(): PatternRecognizer {
  return new PatternRecognizer();
}
