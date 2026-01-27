/**
 * ============================================================================
 * BUILD INTELLIGENCE - THE BRAIN OF THE 10X SYSTEM
 * ============================================================================
 *
 * "Intelligence is the ability to adapt to change." - Stephen Hawking
 *
 * This module is the cognitive center of the build system:
 * - Deep pattern recognition across build history
 * - Intelligent bottleneck identification
 * - Parallelization opportunity detection
 * - Code quality scoring with actionable insights
 * - Post-build analytics and reporting
 * - Continuous learning and optimization suggestions
 *
 * Inspired by: GitHub Copilot, SonarQube, DataDog APM
 * ============================================================================
 */

import { EventEmitter } from 'events';
import { EventStore, BuildEvent } from './event-sourcing';
import { QualityGate, GateSummary } from './quality-gates';

// ============================================================================
// TYPES
// ============================================================================

export interface BuildProfile {
  buildId: string;
  projectType: string;
  phases: PhaseProfile[];
  agents: AgentProfile[];
  metrics: BuildMetrics;
  patterns: DetectedPattern[];
  bottlenecks: Bottleneck[];
  opportunities: OptimizationOpportunity[];
  qualityProfile: QualityProfile;
  intelligence: IntelligenceInsights;
  timestamp: Date;
}

export interface PhaseProfile {
  name: string;
  duration: number;
  status: string;
  agents: string[];
  parallelizationScore: number; // 0-100
  criticalPath: boolean;
  dependencies: string[];
  metrics: {
    tokenUsage: number;
    apiCalls: number;
    retries: number;
    errorRate: number;
  };
}

export interface AgentProfile {
  id: string;
  type: string;
  performance: {
    avgDuration: number;
    successRate: number;
    tokenEfficiency: number;
    qualityScore: number;
  };
  patterns: {
    commonErrors: string[];
    strengths: string[];
    weaknesses: string[];
  };
  recommendations: string[];
}

export interface BuildMetrics {
  totalDuration: number;
  totalTokens: number;
  totalApiCalls: number;
  totalRetries: number;
  overallSuccessRate: number;
  parallelizationEfficiency: number;
  resourceUtilization: number;
  costEstimate: number;
}

export interface DetectedPattern {
  id: string;
  type: 'success' | 'failure' | 'performance' | 'quality' | 'resource';
  name: string;
  description: string;
  frequency: number;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  relatedBuilds: string[];
  firstSeen: Date;
  lastSeen: Date;
}

export interface Bottleneck {
  id: string;
  location: string; // phase/agent identifier
  type: 'sequential-dependency' | 'resource-contention' | 'api-limit' | 'retry-loop' | 'slow-agent';
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  impact: {
    timeWasted: number;
    tokensWasted: number;
    blockingOthers: boolean;
  };
  rootCause: string;
  resolution: string;
  automatable: boolean;
}

export interface OptimizationOpportunity {
  id: string;
  category: 'parallelization' | 'caching' | 'agent-selection' | 'prompt-optimization' | 'resource-allocation';
  title: string;
  description: string;
  estimatedGain: {
    timeReduction: number; // percentage
    tokenReduction: number; // percentage
    costReduction: number; // percentage
  };
  implementation: string;
  effort: 'trivial' | 'easy' | 'moderate' | 'hard';
  priority: number; // 1-10
}

export interface QualityProfile {
  overallScore: number;
  dimensions: {
    codeCompleteness: number;
    typeSafety: number;
    security: number;
    performance: number;
    accessibility: number;
    maintainability: number;
  };
  trends: {
    dimension: string;
    direction: 'improving' | 'stable' | 'degrading';
    velocity: number;
  }[];
  riskAreas: {
    area: string;
    risk: 'low' | 'medium' | 'high';
    recommendation: string;
  }[];
}

export interface IntelligenceInsights {
  buildHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  keyFindings: Finding[];
  predictions: Prediction[];
  recommendations: Recommendation[];
  learnings: Learning[];
}

export interface Finding {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  category: string;
  title: string;
  description: string;
  evidence: string[];
  actionable: boolean;
}

export interface Prediction {
  id: string;
  type: 'duration' | 'failure' | 'resource' | 'quality';
  description: string;
  probability: number;
  timeframe: string;
  basis: string[];
}

export interface Recommendation {
  id: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  expectedImpact: string;
  implementation: string[];
  resources?: string[];
}

export interface Learning {
  id: string;
  type: 'pattern' | 'correlation' | 'anomaly' | 'optimization';
  description: string;
  confidence: number;
  applicability: string[];
  storedAt: Date;
}

// ============================================================================
// BUILD INTELLIGENCE ENGINE
// ============================================================================

export class BuildIntelligenceEngine extends EventEmitter {
  private eventStore: EventStore;
  private buildProfiles: Map<string, BuildProfile> = new Map();
  private patternLibrary: Map<string, DetectedPattern> = new Map();
  private learningStore: Learning[] = [];
  private historicalMetrics: Map<string, BuildMetrics[]> = new Map(); // projectType -> metrics

  constructor(eventStore: EventStore) {
    super();
    this.eventStore = eventStore;
  }

  /**
   * Analyze a completed build and generate intelligence profile
   */
  async analyzeBuild(buildId: string): Promise<BuildProfile> {
    const events = await this.eventStore.getEvents(buildId);
    if (events.length === 0) {
      throw new Error(`No events found for build ${buildId}`);
    }

    const profile = await this.generateBuildProfile(buildId, events);
    this.buildProfiles.set(buildId, profile);

    // Learn from this build
    await this.learnFromBuild(profile);

    this.emit('build_analyzed', {
      buildId,
      health: profile.intelligence.buildHealth,
      findingsCount: profile.intelligence.keyFindings.length,
      opportunitiesCount: profile.opportunities.length,
    });

    return profile;
  }

  /**
   * Get comparative analysis between builds
   */
  async compareBulds(buildIdA: string, buildIdB: string): Promise<BuildComparison> {
    const profileA = this.buildProfiles.get(buildIdA);
    const profileB = this.buildProfiles.get(buildIdB);

    if (!profileA || !profileB) {
      throw new Error('One or both build profiles not found');
    }

    return {
      buildA: buildIdA,
      buildB: buildIdB,
      metricsDiff: {
        duration: profileB.metrics.totalDuration - profileA.metrics.totalDuration,
        tokens: profileB.metrics.totalTokens - profileA.metrics.totalTokens,
        successRate: profileB.metrics.overallSuccessRate - profileA.metrics.overallSuccessRate,
        qualityScore: profileB.qualityProfile.overallScore - profileA.qualityProfile.overallScore,
      },
      improvements: this.findImprovements(profileA, profileB),
      regressions: this.findRegressions(profileA, profileB),
      unchanged: this.findUnchanged(profileA, profileB),
      summary: this.generateComparisonSummary(profileA, profileB),
    };
  }

  /**
   * Get aggregated insights across multiple builds
   */
  async getAggregatedInsights(
    projectType: string,
    options: { timeRange?: { start: Date; end: Date }; limit?: number } = {}
  ): Promise<AggregatedInsights> {
    const profiles = Array.from(this.buildProfiles.values())
      .filter((p) => p.projectType === projectType)
      .filter((p) => {
        if (!options.timeRange) return true;
        return p.timestamp >= options.timeRange.start && p.timestamp <= options.timeRange.end;
      })
      .slice(0, options.limit || 100);

    if (profiles.length === 0) {
      return {
        projectType,
        buildCount: 0,
        patterns: [],
        commonBottlenecks: [],
        topOptimizations: [],
        healthTrend: [],
        qualityTrend: [],
        recommendations: [],
      };
    }

    return {
      projectType,
      buildCount: profiles.length,
      patterns: this.aggregatePatterns(profiles),
      commonBottlenecks: this.aggregateBottlenecks(profiles),
      topOptimizations: this.aggregateOptimizations(profiles),
      healthTrend: this.calculateHealthTrend(profiles),
      qualityTrend: this.calculateQualityTrend(profiles),
      recommendations: this.generateProjectRecommendations(profiles),
    };
  }

  /**
   * Get optimal agent configuration based on historical performance
   */
  getOptimalAgentConfig(
    projectType: string,
    phases: string[]
  ): Map<string, { agentType: string; confidence: number; reason: string }> {
    const config = new Map<string, { agentType: string; confidence: number; reason: string }>();

    for (const phase of phases) {
      const phasePerformance = this.analyzePhasePerformance(projectType, phase);
      if (phasePerformance.bestAgent) {
        config.set(phase, {
          agentType: phasePerformance.bestAgent,
          confidence: phasePerformance.confidence,
          reason: phasePerformance.reason,
        });
      }
    }

    return config;
  }

  /**
   * Generate detailed post-build report
   */
  async generateReport(buildId: string): Promise<BuildReport> {
    const profile = this.buildProfiles.get(buildId);
    if (!profile) {
      throw new Error(`Build profile not found for ${buildId}`);
    }

    return {
      buildId,
      generatedAt: new Date(),
      summary: {
        health: profile.intelligence.buildHealth,
        duration: profile.metrics.totalDuration,
        tokensUsed: profile.metrics.totalTokens,
        overallQuality: profile.qualityProfile.overallScore,
        successRate: profile.metrics.overallSuccessRate,
      },
      timeline: await this.buildTimeline(buildId),
      phaseBreakdown: profile.phases.map((p) => ({
        phase: p.name,
        duration: p.duration,
        status: p.status,
        agents: p.agents,
        criticalPath: p.criticalPath,
      })),
      agentPerformance: profile.agents.map((a) => ({
        agent: a.id,
        type: a.type,
        successRate: a.performance.successRate,
        duration: a.performance.avgDuration,
        quality: a.performance.qualityScore,
      })),
      qualityAnalysis: {
        overallScore: profile.qualityProfile.overallScore,
        dimensions: profile.qualityProfile.dimensions,
        riskAreas: profile.qualityProfile.riskAreas,
      },
      bottlenecks: profile.bottlenecks.slice(0, 5),
      optimizations: profile.opportunities.slice(0, 5),
      recommendations: profile.intelligence.recommendations,
      learnings: profile.intelligence.learnings,
    };
  }

  // =========================================================================
  // PRIVATE METHODS - PROFILE GENERATION
  // =========================================================================

  private async generateBuildProfile(buildId: string, events: BuildEvent[]): Promise<BuildProfile> {
    const projectType = this.extractProjectType(events);
    const phases = this.analyzePhases(events);
    const agents = this.analyzeAgents(events);
    const metrics = this.calculateMetrics(events);
    const patterns = this.detectPatterns(events);
    const bottlenecks = this.identifyBottlenecks(phases, agents, events);
    const opportunities = this.findOptimizations(phases, agents, bottlenecks, metrics);
    const qualityProfile = this.buildQualityProfile(events);
    const intelligence = this.generateIntelligence(
      phases,
      agents,
      metrics,
      patterns,
      bottlenecks,
      opportunities,
      qualityProfile
    );

    return {
      buildId,
      projectType,
      phases,
      agents,
      metrics,
      patterns,
      bottlenecks,
      opportunities,
      qualityProfile,
      intelligence,
      timestamp: new Date(),
    };
  }

  private extractProjectType(events: BuildEvent[]): string {
    const startEvent = events.find((e) => e.type === 'BUILD_STARTED');
    return (startEvent?.data as { projectType?: string })?.projectType || 'unknown';
  }

  private analyzePhases(events: BuildEvent[]): PhaseProfile[] {
    const phases: Map<string, PhaseProfile> = new Map();

    for (const event of events) {
      if (event.type === 'PHASE_STARTED') {
        const data = event.data as { phase: string };
        phases.set(data.phase, {
          name: data.phase,
          duration: 0,
          status: 'running',
          agents: [],
          parallelizationScore: 0,
          criticalPath: false,
          dependencies: [],
          metrics: {
            tokenUsage: 0,
            apiCalls: 0,
            retries: 0,
            errorRate: 0,
          },
        });
      } else if (event.type === 'PHASE_COMPLETED') {
        const data = event.data as { phase: string; duration: number };
        const phase = phases.get(data.phase);
        if (phase) {
          phase.duration = data.duration;
          phase.status = 'completed';
        }
      } else if (event.type === 'AGENT_STARTED') {
        const data = event.data as { phase: string; agentId: string };
        const phase = phases.get(data.phase);
        if (phase) {
          phase.agents.push(data.agentId);
        }
      }
    }

    // Calculate parallelization scores
    const phaseArray = Array.from(phases.values());
    for (const phase of phaseArray) {
      phase.parallelizationScore = this.calculateParallelizationScore(phase);
      phase.criticalPath = this.isOnCriticalPath(phase, phaseArray);
    }

    return phaseArray;
  }

  private analyzeAgents(events: BuildEvent[]): AgentProfile[] {
    const agents: Map<string, AgentProfile> = new Map();

    for (const event of events) {
      if (event.type === 'AGENT_STARTED') {
        const data = event.data as { agentId: string; agentType: string };
        if (!agents.has(data.agentId)) {
          agents.set(data.agentId, {
            id: data.agentId,
            type: data.agentType,
            performance: {
              avgDuration: 0,
              successRate: 0,
              tokenEfficiency: 0,
              qualityScore: 0,
            },
            patterns: {
              commonErrors: [],
              strengths: [],
              weaknesses: [],
            },
            recommendations: [],
          });
        }
      } else if (event.type === 'AGENT_COMPLETED') {
        const data = event.data as {
          agentId: string;
          duration: number;
          success: boolean;
          tokensUsed: number;
        };
        const agent = agents.get(data.agentId);
        if (agent) {
          agent.performance.avgDuration = data.duration;
          agent.performance.successRate = data.success ? 100 : 0;
          agent.performance.tokenEfficiency = data.tokensUsed > 0 ? 100 / data.tokensUsed * 1000 : 0;
        }
      }
    }

    // Generate agent recommendations
    for (const agent of agents.values()) {
      agent.recommendations = this.generateAgentRecommendations(agent);
    }

    return Array.from(agents.values());
  }

  private calculateMetrics(events: BuildEvent[]): BuildMetrics {
    let totalDuration = 0;
    let totalTokens = 0;
    let totalApiCalls = 0;
    let totalRetries = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const event of events) {
      if (event.type === 'BUILD_COMPLETED') {
        const data = event.data as { duration: number };
        totalDuration = data.duration;
      }
      if (event.type === 'AGENT_COMPLETED') {
        const data = event.data as { tokensUsed: number; success: boolean };
        totalTokens += data.tokensUsed || 0;
        totalApiCalls++;
        if (data.success) successCount++;
        else failureCount++;
      }
      if (event.type === 'RETRY_ATTEMPTED') {
        totalRetries++;
      }
    }

    const totalOperations = successCount + failureCount;

    return {
      totalDuration,
      totalTokens,
      totalApiCalls,
      totalRetries,
      overallSuccessRate: totalOperations > 0 ? (successCount / totalOperations) * 100 : 0,
      parallelizationEfficiency: this.calculateParallelizationEfficiency(events),
      resourceUtilization: this.calculateResourceUtilization(events),
      costEstimate: this.estimateCost(totalTokens, totalApiCalls),
    };
  }

  private detectPatterns(events: BuildEvent[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Pattern: Sequential Bottleneck
    const sequentialPhases = this.findSequentialPhases(events);
    if (sequentialPhases.length > 3) {
      patterns.push({
        id: `pattern-sequential-${Date.now()}`,
        type: 'performance',
        name: 'Sequential Phase Execution',
        description: 'Multiple phases running sequentially that could potentially run in parallel',
        frequency: sequentialPhases.length,
        confidence: 0.85,
        impact: 'high',
        relatedBuilds: [],
        firstSeen: new Date(),
        lastSeen: new Date(),
      });
    }

    // Pattern: Retry Storms
    const retryEvents = events.filter((e) => e.type === 'RETRY_ATTEMPTED');
    if (retryEvents.length > 5) {
      patterns.push({
        id: `pattern-retry-storm-${Date.now()}`,
        type: 'failure',
        name: 'Retry Storm',
        description: 'High number of retries indicating underlying instability',
        frequency: retryEvents.length,
        confidence: 0.9,
        impact: retryEvents.length > 10 ? 'critical' : 'high',
        relatedBuilds: [],
        firstSeen: new Date(),
        lastSeen: new Date(),
      });
    }

    // Pattern: Quality Progression
    const qualityEvents = events.filter((e) => e.type === 'QUALITY_GATE_EVALUATED');
    if (qualityEvents.length > 0) {
      const scores = qualityEvents.map(
        (e) => ((e.data as { summary?: GateSummary })?.summary?.overallScore || 0)
      );
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgScore >= 90) {
        patterns.push({
          id: `pattern-high-quality-${Date.now()}`,
          type: 'quality',
          name: 'High Quality Build',
          description: 'Build maintains consistently high quality scores',
          frequency: qualityEvents.length,
          confidence: 0.95,
          impact: 'low',
          relatedBuilds: [],
          firstSeen: new Date(),
          lastSeen: new Date(),
        });
      }
    }

    return patterns;
  }

  private identifyBottlenecks(
    phases: PhaseProfile[],
    agents: AgentProfile[],
    events: BuildEvent[]
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Check for slow agents
    for (const agent of agents) {
      if (agent.performance.avgDuration > 60000) { // > 1 minute
        bottlenecks.push({
          id: `bottleneck-slow-${agent.id}`,
          location: agent.id,
          type: 'slow-agent',
          severity: agent.performance.avgDuration > 120000 ? 'severe' : 'moderate',
          impact: {
            timeWasted: agent.performance.avgDuration - 30000, // Assume 30s is normal
            tokensWasted: 0,
            blockingOthers: false,
          },
          rootCause: `Agent ${agent.type} taking longer than expected`,
          resolution: 'Consider optimizing agent prompts or using a faster model',
          automatable: true,
        });
      }
    }

    // Check for sequential dependencies
    const criticalPath = phases.filter((p) => p.criticalPath);
    if (criticalPath.length > 0) {
      const totalCriticalTime = criticalPath.reduce((sum, p) => sum + p.duration, 0);
      const totalTime = phases.reduce((sum, p) => sum + p.duration, 0);
      if (totalCriticalTime > totalTime * 0.7) {
        bottlenecks.push({
          id: `bottleneck-critical-path-${Date.now()}`,
          location: 'critical-path',
          type: 'sequential-dependency',
          severity: 'severe',
          impact: {
            timeWasted: totalCriticalTime - totalTime * 0.5,
            tokensWasted: 0,
            blockingOthers: true,
          },
          rootCause: 'Critical path dominates build time',
          resolution: 'Break up large phases or parallelize where possible',
          automatable: false,
        });
      }
    }

    // Check for retry loops
    const retrysByAgent = this.groupRetrysByAgent(events);
    for (const [agentId, retryCount] of retrysByAgent) {
      if (retryCount > 3) {
        bottlenecks.push({
          id: `bottleneck-retry-${agentId}`,
          location: agentId,
          type: 'retry-loop',
          severity: retryCount > 5 ? 'severe' : 'moderate',
          impact: {
            timeWasted: retryCount * 10000, // Estimate 10s per retry
            tokensWasted: retryCount * 1000, // Estimate 1k tokens per retry
            blockingOthers: false,
          },
          rootCause: `Agent ${agentId} experiencing repeated failures`,
          resolution: 'Investigate error patterns and improve prompts',
          automatable: true,
        });
      }
    }

    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, severe: 1, moderate: 2, minor: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private findOptimizations(
    phases: PhaseProfile[],
    agents: AgentProfile[],
    bottlenecks: Bottleneck[],
    metrics: BuildMetrics
  ): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Parallelization opportunities
    const parallelizablePhases = phases.filter((p) => p.parallelizationScore > 70);
    if (parallelizablePhases.length > 1) {
      const potentialTimeReduction = parallelizablePhases.reduce(
        (sum, p) => sum + p.duration * 0.5,
        0
      );
      opportunities.push({
        id: `opt-parallel-${Date.now()}`,
        category: 'parallelization',
        title: 'Increase Phase Parallelization',
        description: `${parallelizablePhases.length} phases can potentially run in parallel`,
        estimatedGain: {
          timeReduction: Math.min(50, (potentialTimeReduction / metrics.totalDuration) * 100),
          tokenReduction: 0,
          costReduction: 0,
        },
        implementation: 'Review phase dependencies and enable concurrent execution',
        effort: 'moderate',
        priority: 8,
      });
    }

    // Agent optimization opportunities
    const slowAgents = agents.filter((a) => a.performance.avgDuration > 45000);
    for (const agent of slowAgents) {
      opportunities.push({
        id: `opt-agent-${agent.id}`,
        category: 'agent-selection',
        title: `Optimize ${agent.type} Agent`,
        description: `Agent ${agent.type} is slower than average`,
        estimatedGain: {
          timeReduction: 20,
          tokenReduction: 15,
          costReduction: 15,
        },
        implementation: 'Consider using a faster model or optimizing prompts',
        effort: 'easy',
        priority: 6,
      });
    }

    // Token efficiency opportunities
    if (metrics.totalTokens > 100000) {
      opportunities.push({
        id: `opt-tokens-${Date.now()}`,
        category: 'prompt-optimization',
        title: 'Reduce Token Usage',
        description: 'High token consumption detected',
        estimatedGain: {
          timeReduction: 0,
          tokenReduction: 25,
          costReduction: 25,
        },
        implementation: 'Review prompts for verbosity, implement response caching',
        effort: 'moderate',
        priority: 7,
      });
    }

    // Bottleneck-based opportunities
    for (const bottleneck of bottlenecks.filter((b) => b.automatable)) {
      opportunities.push({
        id: `opt-fix-${bottleneck.id}`,
        category: 'resource-allocation',
        title: `Address ${bottleneck.type}`,
        description: bottleneck.rootCause,
        estimatedGain: {
          timeReduction: (bottleneck.impact.timeWasted / metrics.totalDuration) * 100,
          tokenReduction: (bottleneck.impact.tokensWasted / (metrics.totalTokens || 1)) * 100,
          costReduction: 0,
        },
        implementation: bottleneck.resolution,
        effort: 'easy',
        priority: bottleneck.severity === 'critical' ? 10 : bottleneck.severity === 'severe' ? 8 : 5,
      });
    }

    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  private buildQualityProfile(events: BuildEvent[]): QualityProfile {
    const qualityEvents = events.filter((e) => e.type === 'QUALITY_GATE_EVALUATED');

    // Default profile if no quality events
    if (qualityEvents.length === 0) {
      return {
        overallScore: 0,
        dimensions: {
          codeCompleteness: 0,
          typeSafety: 0,
          security: 0,
          performance: 0,
          accessibility: 0,
          maintainability: 0,
        },
        trends: [],
        riskAreas: [],
      };
    }

    // Aggregate quality scores
    const scores = qualityEvents.map((e) => {
      const data = e.data as { summary?: GateSummary };
      return data.summary?.overallScore || 0;
    });
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Extract dimension scores (simplified - would parse from gate results)
    const dimensions = {
      codeCompleteness: overallScore * 0.95,
      typeSafety: overallScore * 0.9,
      security: overallScore * 0.85,
      performance: overallScore * 0.92,
      accessibility: overallScore * 0.8,
      maintainability: overallScore * 0.88,
    };

    // Calculate trends
    const trends = Object.entries(dimensions).map(([dim, score]) => ({
      dimension: dim,
      direction: score >= overallScore ? 'improving' : 'degrading' as const,
      velocity: Math.abs(score - overallScore) / overallScore,
    }));

    // Identify risk areas
    const riskAreas = Object.entries(dimensions)
      .filter(([_, score]) => score < 70)
      .map(([dim, score]) => ({
        area: dim,
        risk: score < 50 ? 'high' : 'medium' as const,
        recommendation: `Improve ${dim} by focusing on related quality rules`,
      }));

    return {
      overallScore,
      dimensions,
      trends,
      riskAreas,
    };
  }

  private generateIntelligence(
    phases: PhaseProfile[],
    agents: AgentProfile[],
    metrics: BuildMetrics,
    patterns: DetectedPattern[],
    bottlenecks: Bottleneck[],
    opportunities: OptimizationOpportunity[],
    qualityProfile: QualityProfile
  ): IntelligenceInsights {
    // Determine overall health
    const buildHealth = this.determineBuildHealth(metrics, bottlenecks, qualityProfile);

    // Generate key findings
    const keyFindings = this.generateKeyFindings(phases, agents, metrics, patterns, bottlenecks);

    // Generate predictions
    const predictions = this.generatePredictions(patterns, metrics, qualityProfile);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      bottlenecks,
      opportunities,
      qualityProfile
    );

    // Generate learnings
    const learnings = this.generateLearnings(patterns, metrics);

    return {
      buildHealth,
      keyFindings,
      predictions,
      recommendations,
      learnings,
    };
  }

  private determineBuildHealth(
    metrics: BuildMetrics,
    bottlenecks: Bottleneck[],
    qualityProfile: QualityProfile
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const criticalBottlenecks = bottlenecks.filter((b) => b.severity === 'critical').length;
    const severeBottlenecks = bottlenecks.filter((b) => b.severity === 'severe').length;

    if (criticalBottlenecks > 0 || metrics.overallSuccessRate < 50) return 'critical';
    if (severeBottlenecks > 2 || metrics.overallSuccessRate < 70 || qualityProfile.overallScore < 50) return 'poor';
    if (severeBottlenecks > 0 || metrics.overallSuccessRate < 85 || qualityProfile.overallScore < 70) return 'fair';
    if (metrics.overallSuccessRate >= 95 && qualityProfile.overallScore >= 90) return 'excellent';
    return 'good';
  }

  private generateKeyFindings(
    phases: PhaseProfile[],
    agents: AgentProfile[],
    metrics: BuildMetrics,
    patterns: DetectedPattern[],
    bottlenecks: Bottleneck[]
  ): Finding[] {
    const findings: Finding[] = [];

    // Success rate finding
    if (metrics.overallSuccessRate >= 95) {
      findings.push({
        id: `finding-success-${Date.now()}`,
        type: 'positive',
        category: 'reliability',
        title: 'Excellent Success Rate',
        description: `Build achieved ${metrics.overallSuccessRate.toFixed(1)}% success rate`,
        evidence: ['All critical agents completed successfully'],
        actionable: false,
      });
    } else if (metrics.overallSuccessRate < 70) {
      findings.push({
        id: `finding-failures-${Date.now()}`,
        type: 'negative',
        category: 'reliability',
        title: 'High Failure Rate',
        description: `Build had only ${metrics.overallSuccessRate.toFixed(1)}% success rate`,
        evidence: bottlenecks.filter((b) => b.type === 'retry-loop').map((b) => b.rootCause),
        actionable: true,
      });
    }

    // Pattern-based findings
    for (const pattern of patterns) {
      findings.push({
        id: `finding-pattern-${pattern.id}`,
        type: pattern.impact === 'low' ? 'positive' : 'negative',
        category: pattern.type,
        title: pattern.name,
        description: pattern.description,
        evidence: [`Detected ${pattern.frequency} occurrences with ${(pattern.confidence * 100).toFixed(0)}% confidence`],
        actionable: pattern.impact !== 'low',
      });
    }

    return findings;
  }

  private generatePredictions(
    patterns: DetectedPattern[],
    metrics: BuildMetrics,
    qualityProfile: QualityProfile
  ): Prediction[] {
    const predictions: Prediction[] = [];

    // Duration prediction for next build
    predictions.push({
      id: `prediction-duration-${Date.now()}`,
      type: 'duration',
      description: `Next similar build likely to take ${this.formatDuration(metrics.totalDuration * 0.95)} to ${this.formatDuration(metrics.totalDuration * 1.05)}`,
      probability: 0.8,
      timeframe: 'next build',
      basis: ['Historical build duration', 'Current performance metrics'],
    });

    // Quality prediction
    if (qualityProfile.overallScore > 0) {
      const trend = qualityProfile.trends.find((t) => t.direction === 'degrading');
      if (trend) {
        predictions.push({
          id: `prediction-quality-${Date.now()}`,
          type: 'quality',
          description: `${trend.dimension} quality may degrade further if not addressed`,
          probability: 0.65,
          timeframe: 'next 3 builds',
          basis: ['Quality trend analysis', 'Pattern recognition'],
        });
      }
    }

    // Failure prediction based on patterns
    const failurePatterns = patterns.filter((p) => p.type === 'failure' && p.impact !== 'low');
    if (failurePatterns.length > 0) {
      predictions.push({
        id: `prediction-failure-${Date.now()}`,
        type: 'failure',
        description: 'Elevated risk of failures in upcoming builds due to detected instability patterns',
        probability: 0.55,
        timeframe: 'next 2 builds',
        basis: failurePatterns.map((p) => p.name),
      });
    }

    return predictions;
  }

  private generateRecommendations(
    bottlenecks: Bottleneck[],
    opportunities: OptimizationOpportunity[],
    qualityProfile: QualityProfile
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // High-priority: Address critical bottlenecks
    for (const bottleneck of bottlenecks.filter((b) => b.severity === 'critical' || b.severity === 'severe')) {
      recommendations.push({
        id: `rec-bottleneck-${bottleneck.id}`,
        priority: bottleneck.severity === 'critical' ? 'immediate' : 'high',
        category: 'performance',
        title: `Resolve ${bottleneck.type}`,
        description: bottleneck.rootCause,
        expectedImpact: `Reduce wasted time by ${this.formatDuration(bottleneck.impact.timeWasted)}`,
        implementation: [bottleneck.resolution],
      });
    }

    // Medium-priority: Quality improvements
    for (const risk of qualityProfile.riskAreas.filter((r) => r.risk === 'high')) {
      recommendations.push({
        id: `rec-quality-${risk.area}`,
        priority: 'high',
        category: 'quality',
        title: `Improve ${risk.area}`,
        description: `${risk.area} score is below acceptable threshold`,
        expectedImpact: 'Improved code quality and maintainability',
        implementation: [risk.recommendation],
      });
    }

    // Optimization opportunities
    for (const opportunity of opportunities.slice(0, 3)) {
      recommendations.push({
        id: `rec-optimize-${opportunity.id}`,
        priority: opportunity.priority >= 8 ? 'high' : 'medium',
        category: opportunity.category,
        title: opportunity.title,
        description: opportunity.description,
        expectedImpact: `Up to ${opportunity.estimatedGain.timeReduction.toFixed(0)}% time reduction`,
        implementation: [opportunity.implementation],
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { immediate: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private generateLearnings(patterns: DetectedPattern[], metrics: BuildMetrics): Learning[] {
    const learnings: Learning[] = [];

    for (const pattern of patterns) {
      learnings.push({
        id: `learning-${pattern.id}`,
        type: 'pattern',
        description: `Detected ${pattern.name}: ${pattern.description}`,
        confidence: pattern.confidence,
        applicability: ['similar-builds'],
        storedAt: new Date(),
      });
      this.learningStore.push(learnings[learnings.length - 1]);
    }

    // Performance learning
    if (metrics.parallelizationEfficiency < 50) {
      learnings.push({
        id: `learning-parallel-${Date.now()}`,
        type: 'optimization',
        description: 'Build has low parallelization efficiency - consider restructuring phase dependencies',
        confidence: 0.75,
        applicability: ['all-builds'],
        storedAt: new Date(),
      });
    }

    return learnings;
  }

  // =========================================================================
  // PRIVATE METHODS - UTILITIES
  // =========================================================================

  private calculateParallelizationScore(phase: PhaseProfile): number {
    // Heuristic based on agent count and dependencies
    const agentCount = phase.agents.length;
    const depCount = phase.dependencies.length;
    return Math.min(100, Math.max(0, agentCount * 20 - depCount * 30 + 50));
  }

  private isOnCriticalPath(phase: PhaseProfile, allPhases: PhaseProfile[]): boolean {
    // Simple heuristic: phases with most duration or most dependencies
    const avgDuration = allPhases.reduce((sum, p) => sum + p.duration, 0) / allPhases.length;
    return phase.duration > avgDuration * 1.5 || phase.dependencies.length > 2;
  }

  private calculateParallelizationEfficiency(events: BuildEvent[]): number {
    // Calculate how much parallelization was achieved
    const agentEvents = events.filter(
      (e) => e.type === 'AGENT_STARTED' || e.type === 'AGENT_COMPLETED'
    );

    // Track concurrent agents
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    for (const event of agentEvents) {
      if (event.type === 'AGENT_STARTED') {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      } else {
        currentConcurrent = Math.max(0, currentConcurrent - 1);
      }
    }

    // Score based on max concurrency (assume ideal is 5+ concurrent)
    return Math.min(100, (maxConcurrent / 5) * 100);
  }

  private calculateResourceUtilization(events: BuildEvent[]): number {
    // Simplified - would track actual resource usage in production
    const agentEvents = events.filter((e) => e.type.startsWith('AGENT_'));
    const totalAgents = agentEvents.filter((e) => e.type === 'AGENT_STARTED').length;
    const completedAgents = agentEvents.filter((e) => e.type === 'AGENT_COMPLETED').length;

    return totalAgents > 0 ? (completedAgents / totalAgents) * 100 : 0;
  }

  private estimateCost(tokens: number, apiCalls: number): number {
    // Rough cost estimate based on typical LLM pricing
    const tokenCost = (tokens / 1000) * 0.002; // $0.002 per 1K tokens
    const callCost = apiCalls * 0.001; // $0.001 per call overhead
    return tokenCost + callCost;
  }

  private findSequentialPhases(events: BuildEvent[]): string[] {
    const sequentialPhases: string[] = [];
    let lastPhaseEnd: Date | null = null;
    let lastPhase: string | null = null;

    for (const event of events) {
      if (event.type === 'PHASE_STARTED') {
        const data = event.data as { phase: string };
        if (lastPhaseEnd && event.timestamp.getTime() - lastPhaseEnd.getTime() < 1000) {
          // Started within 1 second of previous phase end - sequential
          if (lastPhase) sequentialPhases.push(lastPhase);
        }
        lastPhase = data.phase;
      } else if (event.type === 'PHASE_COMPLETED') {
        lastPhaseEnd = event.timestamp;
      }
    }

    return sequentialPhases;
  }

  private groupRetrysByAgent(events: BuildEvent[]): Map<string, number> {
    const retrysByAgent = new Map<string, number>();

    for (const event of events) {
      if (event.type === 'RETRY_ATTEMPTED') {
        const data = event.data as { agentId: string };
        retrysByAgent.set(data.agentId, (retrysByAgent.get(data.agentId) || 0) + 1);
      }
    }

    return retrysByAgent;
  }

  private generateAgentRecommendations(agent: AgentProfile): string[] {
    const recommendations: string[] = [];

    if (agent.performance.successRate < 80) {
      recommendations.push('Investigate frequent failures and improve error handling');
    }
    if (agent.performance.avgDuration > 60000) {
      recommendations.push('Consider using a faster model or optimizing prompts');
    }
    if (agent.performance.tokenEfficiency < 50) {
      recommendations.push('Reduce prompt verbosity to improve token efficiency');
    }

    return recommendations;
  }

  private async learnFromBuild(profile: BuildProfile): Promise<void> {
    // Store metrics for future analysis
    const metrics = this.historicalMetrics.get(profile.projectType) || [];
    metrics.push(profile.metrics);
    if (metrics.length > 100) metrics.shift(); // Keep last 100
    this.historicalMetrics.set(profile.projectType, metrics);

    // Update pattern library
    for (const pattern of profile.patterns) {
      const existing = this.patternLibrary.get(pattern.name);
      if (existing) {
        existing.frequency += pattern.frequency;
        existing.lastSeen = new Date();
        existing.relatedBuilds.push(profile.buildId);
        if (existing.relatedBuilds.length > 10) existing.relatedBuilds.shift();
      } else {
        this.patternLibrary.set(pattern.name, { ...pattern, relatedBuilds: [profile.buildId] });
      }
    }

    this.emit('learning_updated', {
      buildId: profile.buildId,
      patternsLearned: profile.patterns.length,
      totalPatterns: this.patternLibrary.size,
    });
  }

  private findImprovements(a: BuildProfile, b: BuildProfile): string[] {
    const improvements: string[] = [];
    if (b.metrics.totalDuration < a.metrics.totalDuration * 0.9) {
      improvements.push('Build duration improved significantly');
    }
    if (b.metrics.overallSuccessRate > a.metrics.overallSuccessRate + 5) {
      improvements.push('Success rate improved');
    }
    if (b.qualityProfile.overallScore > a.qualityProfile.overallScore + 5) {
      improvements.push('Quality score improved');
    }
    return improvements;
  }

  private findRegressions(a: BuildProfile, b: BuildProfile): string[] {
    const regressions: string[] = [];
    if (b.metrics.totalDuration > a.metrics.totalDuration * 1.1) {
      regressions.push('Build duration regressed');
    }
    if (b.metrics.overallSuccessRate < a.metrics.overallSuccessRate - 5) {
      regressions.push('Success rate decreased');
    }
    if (b.qualityProfile.overallScore < a.qualityProfile.overallScore - 5) {
      regressions.push('Quality score decreased');
    }
    return regressions;
  }

  private findUnchanged(a: BuildProfile, b: BuildProfile): string[] {
    const unchanged: string[] = [];
    if (Math.abs(b.metrics.totalDuration - a.metrics.totalDuration) < a.metrics.totalDuration * 0.1) {
      unchanged.push('Build duration stable');
    }
    if (Math.abs(b.metrics.overallSuccessRate - a.metrics.overallSuccessRate) < 5) {
      unchanged.push('Success rate stable');
    }
    return unchanged;
  }

  private generateComparisonSummary(a: BuildProfile, b: BuildProfile): string {
    const durationChange = ((b.metrics.totalDuration - a.metrics.totalDuration) / a.metrics.totalDuration) * 100;
    const qualityChange = b.qualityProfile.overallScore - a.qualityProfile.overallScore;

    if (durationChange < -10 && qualityChange > 0) {
      return 'Significant improvement: faster and better quality';
    }
    if (durationChange > 10 && qualityChange < 0) {
      return 'Regression detected: slower and lower quality';
    }
    if (durationChange < -10) {
      return 'Performance improvement: build is faster';
    }
    if (qualityChange > 5) {
      return 'Quality improvement: better code quality';
    }
    return 'Builds are comparable with minor variations';
  }

  private aggregatePatterns(profiles: BuildProfile[]): DetectedPattern[] {
    const patternCounts = new Map<string, { pattern: DetectedPattern; count: number }>();

    for (const profile of profiles) {
      for (const pattern of profile.patterns) {
        const existing = patternCounts.get(pattern.name);
        if (existing) {
          existing.count++;
        } else {
          patternCounts.set(pattern.name, { pattern, count: 1 });
        }
      }
    }

    return Array.from(patternCounts.values())
      .filter((p) => p.count > 1)
      .sort((a, b) => b.count - a.count)
      .map((p) => ({ ...p.pattern, frequency: p.count }));
  }

  private aggregateBottlenecks(profiles: BuildProfile[]): Bottleneck[] {
    const bottleneckCounts = new Map<string, { bottleneck: Bottleneck; count: number }>();

    for (const profile of profiles) {
      for (const bottleneck of profile.bottlenecks) {
        const key = `${bottleneck.type}-${bottleneck.location}`;
        const existing = bottleneckCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          bottleneckCounts.set(key, { bottleneck, count: 1 });
        }
      }
    }

    return Array.from(bottleneckCounts.values())
      .filter((b) => b.count > 1)
      .sort((a, b) => b.count - a.count)
      .map((b) => b.bottleneck)
      .slice(0, 10);
  }

  private aggregateOptimizations(profiles: BuildProfile[]): OptimizationOpportunity[] {
    const optimizationScores = new Map<string, { opt: OptimizationOpportunity; score: number }>();

    for (const profile of profiles) {
      for (const opt of profile.opportunities) {
        const existing = optimizationScores.get(opt.category);
        if (existing) {
          existing.score += opt.priority;
        } else {
          optimizationScores.set(opt.category, { opt, score: opt.priority });
        }
      }
    }

    return Array.from(optimizationScores.values())
      .sort((a, b) => b.score - a.score)
      .map((o) => o.opt)
      .slice(0, 5);
  }

  private calculateHealthTrend(profiles: BuildProfile[]): { date: Date; health: string }[] {
    return profiles.map((p) => ({
      date: p.timestamp,
      health: p.intelligence.buildHealth,
    }));
  }

  private calculateQualityTrend(profiles: BuildProfile[]): { date: Date; score: number }[] {
    return profiles.map((p) => ({
      date: p.timestamp,
      score: p.qualityProfile.overallScore,
    }));
  }

  private generateProjectRecommendations(profiles: BuildProfile[]): Recommendation[] {
    const allRecommendations: Map<string, { rec: Recommendation; count: number }> = new Map();

    for (const profile of profiles) {
      for (const rec of profile.intelligence.recommendations) {
        const existing = allRecommendations.get(rec.title);
        if (existing) {
          existing.count++;
        } else {
          allRecommendations.set(rec.title, { rec, count: 1 });
        }
      }
    }

    return Array.from(allRecommendations.values())
      .filter((r) => r.count > profiles.length * 0.3) // Appears in >30% of builds
      .sort((a, b) => b.count - a.count)
      .map((r) => r.rec)
      .slice(0, 5);
  }

  private analyzePhasePerformance(
    projectType: string,
    phase: string
  ): { bestAgent: string | null; confidence: number; reason: string } {
    const profiles = Array.from(this.buildProfiles.values()).filter(
      (p) => p.projectType === projectType
    );

    if (profiles.length === 0) {
      return { bestAgent: null, confidence: 0, reason: 'No historical data' };
    }

    // Aggregate agent performance for this phase
    const agentPerformance = new Map<string, { success: number; total: number; avgDuration: number }>();

    for (const profile of profiles) {
      const phaseProfile = profile.phases.find((p) => p.name === phase);
      if (phaseProfile) {
        for (const agentId of phaseProfile.agents) {
          const agent = profile.agents.find((a) => a.id === agentId);
          if (agent) {
            const existing = agentPerformance.get(agent.type) || { success: 0, total: 0, avgDuration: 0 };
            existing.total++;
            if (agent.performance.successRate > 90) existing.success++;
            existing.avgDuration = (existing.avgDuration + agent.performance.avgDuration) / 2;
            agentPerformance.set(agent.type, existing);
          }
        }
      }
    }

    // Find best performing agent
    let bestAgent: string | null = null;
    let bestScore = 0;

    for (const [agentType, perf] of agentPerformance) {
      const score = (perf.success / perf.total) * 100 - (perf.avgDuration / 60000) * 10;
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agentType;
      }
    }

    return {
      bestAgent,
      confidence: Math.min(0.95, profiles.length / 10), // More data = higher confidence
      reason: bestAgent
        ? `${bestAgent} has best success rate and speed for ${phase}`
        : 'Insufficient data to determine best agent',
    };
  }

  private async buildTimeline(buildId: string): Promise<TimelineEntry[]> {
    const events = await this.eventStore.getEvents(buildId);

    return events.slice(0, 50).map((e) => ({
      timestamp: e.timestamp,
      type: e.type,
      description: this.getEventDescription(e),
      details: e.data,
    }));
  }

  private getEventDescription(event: BuildEvent): string {
    const descriptions: Record<string, (data: unknown) => string> = {
      BUILD_STARTED: () => 'Build started',
      BUILD_COMPLETED: (d: unknown) => `Build completed in ${this.formatDuration((d as { duration: number }).duration)}`,
      PHASE_STARTED: (d: unknown) => `Phase "${(d as { phase: string }).phase}" started`,
      PHASE_COMPLETED: (d: unknown) => `Phase "${(d as { phase: string }).phase}" completed`,
      AGENT_STARTED: (d: unknown) => `Agent "${(d as { agentId: string }).agentId}" started`,
      AGENT_COMPLETED: (d: unknown) => `Agent "${(d as { agentId: string }).agentId}" completed`,
      RETRY_ATTEMPTED: (d: unknown) => `Retry #${(d as { attempt: number }).attempt} for agent`,
      QUALITY_GATE_EVALUATED: () => 'Quality gate evaluated',
    };

    const descFn = descriptions[event.type];
    return descFn ? descFn(event.data) : event.type;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

export interface BuildComparison {
  buildA: string;
  buildB: string;
  metricsDiff: {
    duration: number;
    tokens: number;
    successRate: number;
    qualityScore: number;
  };
  improvements: string[];
  regressions: string[];
  unchanged: string[];
  summary: string;
}

export interface AggregatedInsights {
  projectType: string;
  buildCount: number;
  patterns: DetectedPattern[];
  commonBottlenecks: Bottleneck[];
  topOptimizations: OptimizationOpportunity[];
  healthTrend: { date: Date; health: string }[];
  qualityTrend: { date: Date; score: number }[];
  recommendations: Recommendation[];
}

export interface BuildReport {
  buildId: string;
  generatedAt: Date;
  summary: {
    health: string;
    duration: number;
    tokensUsed: number;
    overallQuality: number;
    successRate: number;
  };
  timeline: TimelineEntry[];
  phaseBreakdown: {
    phase: string;
    duration: number;
    status: string;
    agents: string[];
    criticalPath: boolean;
  }[];
  agentPerformance: {
    agent: string;
    type: string;
    successRate: number;
    duration: number;
    quality: number;
  }[];
  qualityAnalysis: {
    overallScore: number;
    dimensions: QualityProfile['dimensions'];
    riskAreas: QualityProfile['riskAreas'];
  };
  bottlenecks: Bottleneck[];
  optimizations: OptimizationOpportunity[];
  recommendations: Recommendation[];
  learnings: Learning[];
}

export interface TimelineEntry {
  timestamp: Date;
  type: string;
  description: string;
  details: unknown;
}

// ============================================================================
// FACTORY
// ============================================================================

export function createBuildIntelligence(eventStore: EventStore): BuildIntelligenceEngine {
  return new BuildIntelligenceEngine(eventStore);
}
