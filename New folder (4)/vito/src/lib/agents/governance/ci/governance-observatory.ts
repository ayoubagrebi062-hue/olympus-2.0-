import * as fs from 'fs';
import * as path from 'path';

interface GovernanceSignals {
  summary: {
    totalSignals: number;
    byType: {
      tier_violation: number;
      ethical_veto: number;
      human_override: number;
      ambiguity_failure: number;
      repeated_pattern: number;
    };
    humanOverrideCount: number;
    tierViolationCount: number;
    ethicalVetoCount: number;
    ambiguityFailureCount: number;
    repeatedPatternCount: number;
  };
  signals?: Array<{
    signalType: string;
    timestamp: string;
  }>;
}

interface DeliberationAudit {
  summary: {
    totalFindings: number;
    byType: {
      missing_reasoning_artifact: number;
      missing_ethical_reasoning: number;
      uncertainty_without_precaution: number;
      uncertainty_without_escalation: number;
      missing_escalation: number;
      insufficient_evidence: number;
      undeclared_uncertainty: number;
      class_mismatch: number;
    };
    bySeverity: {
      info: number;
      warning: number;
      error: number;
    };
  };
  findings?: Array<{
    signalType: string;
    timestamp: string;
    decisionClass: string;
  }>;
}

interface CapabilityLearning {
  summary: {
    totalRecommendations: number;
    byPriority: {
      high: number;
      medium: number;
      low: number;
    };
  };
  signals?: Array<{
    capabilityId: string;
    successRate: number;
    confidence: string;
  }>;
}

interface GovernanceBaselines {
  baselines: {
    human_override: { expectedRange: { min: number; max: number } };
    ethical_veto: { expectedRange: { min: number; max: number } };
    tier_violation: { expectedRange: { min: number; max: number } };
    ambiguity_failure: { expectedRange: { min: number; max: number } };
    repeated_pattern: { expectedRange: { min: number; max: number } };
  };
  aggregateExpectations?: {
    totalSignalsPerWindow: { expectedRange: { min: number; max: number } };
  };
}

interface DecisionSchema {
  decisions: Array<{
    id: string;
    decisionClass: 'A' | 'B' | 'C' | 'UNKNOWN';
    outcome?: {
      result?: 'success' | 'failure' | 'partial' | 'blocked' | 'pending';
    };
  }>;
}

interface ObservatoryArtifact {
  version: string;
  generatedAt: string;
  observationWindow: {
    start: string;
    end: string;
  };
  systemHealth: {
    overallScore: number;
    governanceHealth: number;
    ethicalHealth: number;
    capabilityHealth: number;
    deliberationHealth: number;
  };
  baselineComparison: BaselineComparison;
  trends: Trend[];
  riskLevels: RiskLevels;
  governanceSummary: GovernanceSummary;
  capabilitySummary: CapabilitySummary;
  deliberationSummary: DeliberationSummary;
  systemInsights: SystemInsight[];
}

interface BaselineComparison {
  withinRange: BaselineStatus[];
  belowRange: BaselineStatus[];
  aboveRange: BaselineStatus[];
}

interface BaselineStatus {
  metric: string;
  currentValue: number;
  expectedMin: number;
  expectedMax: number;
  status: 'within' | 'below' | 'above';
  deviation: number;
  deviationPercent: number;
}

interface Trend {
  category: string;
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: number;
  confidence: 'high' | 'medium' | 'low';
  timeframe: string;
}

interface RiskLevels {
  overall: 'low' | 'medium' | 'high';
  governance: 'low' | 'medium' | 'high';
  ethical: 'low' | 'medium' | 'high';
  capability: 'low' | 'medium' | 'high';
  deliberation: 'low' | 'medium' | 'high';
  riskIndicators: RiskIndicator[];
}

interface RiskIndicator {
  category: string;
  risk: string;
  severity: 'low' | 'medium' | 'high';
  value: number;
  threshold: number;
  description: string;
}

interface GovernanceSummary {
  totalSignals: number;
  signalBreakdown: Record<string, number>;
  tierViolations: number;
  ethicalVetos: number;
  humanOverrides: number;
  complianceScore: number;
}

interface CapabilitySummary {
  totalCapabilities: number;
  capabilitiesWithRecommendations: number;
  highPriorityRecommendations: number;
  averageSuccessRate: number;
  healthScore: number;
}

interface DeliberationSummary {
  totalFindings: number;
  errorFindings: number;
  warningFindings: number;
  missingEthicalReasoning: number;
  missingEscalation: number;
  qualityScore: number;
}

interface SystemInsight {
  category: string;
  insight: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export class GovernanceObservatory {
  private governanceSignals: GovernanceSignals | null;
  private deliberationAudit: DeliberationAudit | null;
  private capabilityLearning: CapabilityLearning | null;
  private governanceBaselines: GovernanceBaselines | null;
  private decisionSchema: DecisionSchema | null;
  private readonly outputPath: string;
  private readonly version: string = '1.0.0';

  constructor(
    governanceSignalsPath: string = 'governance-signals.json',
    deliberationAuditPath: string = 'governance-deliberation-audit.json',
    capabilityLearningPath: string = 'governance-capability-learning.json',
    governanceBaselinesPath: string = 'contracts/governance-baselines.json',
    decisionSchemaPath: string = 'contracts/decision-schema.json',
    outputPath?: string
  ) {
    this.governanceSignals = this.loadGovernanceSignals(governanceSignalsPath);
    this.deliberationAudit = this.loadDeliberationAudit(deliberationAuditPath);
    this.capabilityLearning = this.loadCapabilityLearning(capabilityLearningPath);
    this.governanceBaselines = this.loadGovernanceBaselines(governanceBaselinesPath);
    this.decisionSchema = this.loadDecisionSchema(decisionSchemaPath);
    this.outputPath = outputPath || 'governance-observatory.json';
  }

  observe(): ObservatoryArtifact {
    const now = new Date().toISOString();

    const systemHealth = this.calculateSystemHealth();
    const baselineComparison = this.compareBaselines();
    const trends = this.identifyTrends();
    const riskLevels = this.calculateRiskLevels();
    const governanceSummary = this.summarizeGovernance();
    const capabilitySummary = this.summarizeCapabilities();
    const deliberationSummary = this.summarizeDeliberation();
    const systemInsights = this.generateSystemInsights(systemHealth, riskLevels, baselineComparison);

    const artifact: ObservatoryArtifact = {
      version: this.version,
      generatedAt: now,
      observationWindow: {
        start: this.getObservationStart(),
        end: now
      },
      systemHealth,
      baselineComparison,
      trends,
      riskLevels,
      governanceSummary,
      capabilitySummary,
      deliberationSummary,
      systemInsights
    };

    this.validateArtifact(artifact);
    this.emitArtifact(artifact);

    this.printObservatory(artifact);

    return artifact;
  }

  private calculateSystemHealth(): ObservatoryArtifact['systemHealth'] {
    const governanceHealth = this.calculateGovernanceHealth();
    const ethicalHealth = this.calculateEthicalHealth();
    const capabilityHealth = this.calculateCapabilityHealth();
    const deliberationHealth = this.calculateDeliberationHealth();

    const overallScore = (governanceHealth + ethicalHealth + capabilityHealth + deliberationHealth) / 4;

    return {
      overallScore: Math.round(overallScore),
      governanceHealth: Math.round(governanceHealth),
      ethicalHealth: Math.round(ethicalHealth),
      capabilityHealth: Math.round(capabilityHealth),
      deliberationHealth: Math.round(deliberationHealth)
    };
  }

  private calculateGovernanceHealth(): number {
    if (!this.governanceSignals || !this.governanceBaselines) {
      return 75;
    }

    const signals = this.governanceSignals.summary;
    const baselines = this.governanceBaselines.baselines;

    let health = 100;

    const overrideDeviation = this.calculateDeviation(
      signals.humanOverrideCount,
      baselines.human_override.expectedRange
    );
    const vetoDeviation = this.calculateDeviation(
      signals.ethicalVetoCount,
      baselines.ethical_veto.expectedRange
    );
    const violationDeviation = this.calculateDeviation(
      signals.tierViolationCount,
      baselines.tier_violation.expectedRange
    );

    health -= overrideDeviation * 0.3;
    health -= vetoDeviation * 0.2;
    health -= violationDeviation * 0.3;

    const violationRatio = signals.tierViolationCount / Math.max(signals.totalSignals, 1);
    health -= violationRatio * 20;

    return Math.max(0, Math.min(100, health));
  }

  private calculateEthicalHealth(): number {
    if (!this.governanceSignals) {
      return 75;
    }

    const signals = this.governanceSignals.summary;
    const total = Math.max(signals.totalSignals, 1);

    const vetoRatio = signals.ethicalVetoCount / total;
    const overrideRatio = signals.humanOverrideCount / Math.max(signals.ethicalVetoCount, 1);

    let health = 100;

    if (signals.ethicalVetoCount > 0) {
      health -= vetoRatio * 20;
    }

    if (signals.humanOverrideCount > 0) {
      health -= overrideRatio * 30;
    }

    return Math.max(0, Math.min(100, health));
  }

  private calculateCapabilityHealth(): number {
    if (!this.capabilityLearning || !this.decisionSchema) {
      return 75;
    }

    const learning = this.capabilityLearning.summary;
    const highPriorityRatio = learning.byPriority.high / Math.max(learning.totalRecommendations, 1);

    let health = 100;

    health -= highPriorityRatio * 40;

    const successfulDecisions = this.decisionSchema.decisions.filter(
      d => d.outcome?.result === 'success'
    ).length;
    const totalOutcomes = this.decisionSchema.decisions.filter(
      d => d.outcome?.result !== undefined
    ).length;

    if (totalOutcomes > 0) {
      const successRate = successfulDecisions / totalOutcomes;
      health += (successRate - 0.8) * 50;
    }

    return Math.max(0, Math.min(100, health));
  }

  private calculateDeliberationHealth(): number {
    if (!this.deliberationAudit) {
      return 75;
    }

    const audit = this.deliberationAudit.summary;
    const total = Math.max(audit.totalFindings, 1);

    const errorRatio = audit.bySeverity.error / total;
    const missingEthicalRatio = audit.byType.missing_ethical_reasoning / total;

    let health = 100;

    health -= errorRatio * 50;
    health -= missingEthicalRatio * 30;

    return Math.max(0, Math.min(100, health));
  }

  private calculateDeviation(value: number, range: { min: number; max: number }): number {
    if (value >= range.min && value <= range.max) {
      return 0;
    }

    if (value < range.min) {
      return (range.min - value) / range.min;
    }

    return (value - range.max) / range.max;
  }

  private compareBaselines(): BaselineComparison {
    const withinRange: BaselineStatus[] = [];
    const belowRange: BaselineStatus[] = [];
    const aboveRange: BaselineStatus[] = [];

    if (!this.governanceSignals || !this.governanceBaselines) {
      return { withinRange, belowRange, aboveRange };
    }

    const signals = this.governanceSignals.summary;
    const baselines = this.governanceBaselines.baselines;

    const metrics = [
      { key: 'human_override', value: signals.humanOverrideCount },
      { key: 'ethical_veto', value: signals.ethicalVetoCount },
      { key: 'tier_violation', value: signals.tierViolationCount },
      { key: 'ambiguity_failure', value: signals.ambiguityFailureCount },
      { key: 'repeated_pattern', value: signals.repeatedPatternCount }
    ];

    for (const metric of metrics) {
      const baseline = baselines[metric.key as keyof typeof baselines];
      if (!baseline) continue;

      const expectedMin = baseline.expectedRange.min;
      const expectedMax = baseline.expectedRange.max;
      const deviation = this.calculateDeviation(metric.value, { min: expectedMin, max: expectedMax });
      const deviationPercent = Math.round(Math.abs(deviation) * 100);

      const status: BaselineStatus = {
        metric: metric.key,
        currentValue: metric.value,
        expectedMin,
        expectedMax,
        status: deviation === 0 ? 'within' : deviation < 0 ? 'below' : 'above',
        deviation,
        deviationPercent
      };

      if (deviation === 0) {
        withinRange.push(status);
      } else if (deviation < 0) {
        belowRange.push(status);
      } else {
        aboveRange.push(status);
      }
    }

    return { withinRange, belowRange, aboveRange };
  }

  private identifyTrends(): Trend[] {
    const trends: Trend[] = [];

    if (this.governanceSignals) {
      const signals = this.governanceSignals.summary;
      trends.push({
        category: 'governance',
        metric: 'tier_violations',
        direction: 'stable',
        magnitude: 0,
        confidence: 'low',
        timeframe: 'current'
      });

      trends.push({
        category: 'governance',
        metric: 'ethical_vetos',
        direction: 'stable',
        magnitude: 0,
        confidence: 'low',
        timeframe: 'current'
      });

      trends.push({
        category: 'governance',
        metric: 'human_overrides',
        direction: 'stable',
        magnitude: 0,
        confidence: 'low',
        timeframe: 'current'
      });
    }

    return trends;
  }

  private calculateRiskLevels(): RiskLevels {
    const riskIndicators: RiskIndicator[] = [];

    if (this.governanceSignals && this.governanceBaselines) {
      const signals = this.governanceSignals.summary;
      const baselines = this.governanceBaselines.baselines;

      const overrideDeviation = this.calculateDeviation(
        signals.humanOverrideCount,
        baselines.human_override.expectedRange
      );

      if (overrideDeviation > 0) {
        riskIndicators.push({
          category: 'governance',
          risk: 'excessive_human_overrides',
          severity: overrideDeviation > 1 ? 'high' : 'medium',
          value: signals.humanOverrideCount,
          threshold: baselines.human_override.expectedRange.max,
          description: `Human overrides (${signals.humanOverrideCount}) exceed baseline maximum (${baselines.human_override.expectedRange.max})`
        });
      }

      const vetoDeviation = this.calculateDeviation(
        signals.ethicalVetoCount,
        baselines.ethical_veto.expectedRange
      );

      if (vetoDeviation > 0.5) {
        riskIndicators.push({
          category: 'ethical',
          risk: 'high_ethical_veto_rate',
          severity: vetoDeviation > 1 ? 'high' : 'medium',
          value: signals.ethicalVetoCount,
          threshold: baselines.ethical_veto.expectedRange.max,
          description: `Ethical vetos (${signals.ethicalVetoCount}) approaching baseline maximum (${baselines.ethical_veto.expectedRange.max})`
        });
      }
    }

    if (this.deliberationAudit) {
      const audit = this.deliberationAudit.summary;
      const errorRatio = audit.bySeverity.error / Math.max(audit.totalFindings, 1);

      if (errorRatio > 0.3) {
        riskIndicators.push({
          category: 'deliberation',
          risk: 'high_error_rate',
          severity: errorRatio > 0.5 ? 'high' : 'medium',
          value: errorRatio * 100,
          threshold: 30,
          description: `Deliberation error rate (${(errorRatio * 100).toFixed(1)}%) exceeds acceptable threshold (30%)`
        });
      }
    }

    if (this.capabilityLearning) {
      const learning = this.capabilityLearning.summary;
      const highPriorityRatio = learning.byPriority.high / Math.max(learning.totalRecommendations, 1);

      if (highPriorityRatio > 0.5) {
        riskIndicators.push({
          category: 'capability',
          risk: 'excessive_high_priority_recommendations',
          severity: highPriorityRatio > 0.75 ? 'high' : 'medium',
          value: highPriorityRatio * 100,
          threshold: 50,
          description: `High-priority recommendations (${(highPriorityRatio * 100).toFixed(1)}%) exceed acceptable threshold (50%)`
        });
      }
    }

    const overall = this.calculateOverallRiskLevel(riskIndicators);
    const governance = this.calculateCategoryRisk('governance', riskIndicators);
    const ethical = this.calculateCategoryRisk('ethical', riskIndicators);
    const capability = this.calculateCategoryRisk('capability', riskIndicators);
    const deliberation = this.calculateCategoryRisk('deliberation', riskIndicators);

    return {
      overall,
      governance,
      ethical,
      capability,
      deliberation,
      riskIndicators
    };
  }

  private calculateOverallRiskLevel(riskIndicators: RiskIndicator[]): 'low' | 'medium' | 'high' {
    const highSeverity = riskIndicators.filter(r => r.severity === 'high').length;
    const mediumSeverity = riskIndicators.filter(r => r.severity === 'medium').length;

    if (highSeverity >= 2 || mediumSeverity >= 4) {
      return 'high';
    }

    if (highSeverity >= 1 || mediumSeverity >= 2) {
      return 'medium';
    }

    return 'low';
  }

  private calculateCategoryRisk(category: string, riskIndicators: RiskIndicator[]): 'low' | 'medium' | 'high' {
    const categoryRisks = riskIndicators.filter(r => r.category === category);

    if (categoryRisks.length === 0) {
      return 'low';
    }

    const highSeverity = categoryRisks.filter(r => r.severity === 'high').length;
    const mediumSeverity = categoryRisks.filter(r => r.severity === 'medium').length;

    if (highSeverity >= 1) {
      return 'high';
    }

    if (mediumSeverity >= 2) {
      return 'medium';
    }

    return 'low';
  }

  private summarizeGovernance(): GovernanceSummary {
    if (!this.governanceSignals) {
      return {
        totalSignals: 0,
        signalBreakdown: {},
        tierViolations: 0,
        ethicalVetos: 0,
        humanOverrides: 0,
        complianceScore: 75
      };
    }

    const signals = this.governanceSignals.summary;
    const total = Math.max(signals.totalSignals, 1);
    const violationRatio = signals.tierViolationCount / total;

    const complianceScore = Math.round(100 - (violationRatio * 100));

    return {
      totalSignals: signals.totalSignals,
      signalBreakdown: signals.byType,
      tierViolations: signals.tierViolationCount,
      ethicalVetos: signals.ethicalVetoCount,
      humanOverrides: signals.humanOverrideCount,
      complianceScore
    };
  }

  private summarizeCapabilities(): CapabilitySummary {
    if (!this.capabilityLearning || !this.decisionSchema) {
      return {
        totalCapabilities: 0,
        capabilitiesWithRecommendations: 0,
        highPriorityRecommendations: 0,
        averageSuccessRate: 0,
        healthScore: 75
      };
    }

    const learning = this.capabilityLearning.summary;
    const highPriorityRatio = learning.byPriority.high / Math.max(learning.totalRecommendations, 1);

    const successfulDecisions = this.decisionSchema.decisions.filter(
      d => d.outcome?.result === 'success'
    ).length;
    const totalOutcomes = this.decisionSchema.decisions.filter(
      d => d.outcome?.result !== undefined
    ).length;

    const averageSuccessRate = totalOutcomes > 0 ? successfulDecisions / totalOutcomes : 0;
    const healthScore = Math.round(100 - (highPriorityRatio * 40) + (averageSuccessRate - 0.8) * 50);

    return {
      totalCapabilities: learning.totalRecommendations,
      capabilitiesWithRecommendations: learning.totalRecommendations,
      highPriorityRecommendations: learning.byPriority.high,
      averageSuccessRate,
      healthScore: Math.max(0, Math.min(100, healthScore))
    };
  }

  private summarizeDeliberation(): DeliberationSummary {
    if (!this.deliberationAudit) {
      return {
        totalFindings: 0,
        errorFindings: 0,
        warningFindings: 0,
        missingEthicalReasoning: 0,
        missingEscalation: 0,
        qualityScore: 75
      };
    }

    const audit = this.deliberationAudit.summary;
    const total = Math.max(audit.totalFindings, 1);
    const errorRatio = audit.bySeverity.error / total;
    const missingEthicalRatio = audit.byType.missing_ethical_reasoning / total;

    const qualityScore = Math.round(100 - (errorRatio * 50) - (missingEthicalRatio * 30));

    return {
      totalFindings: audit.totalFindings,
      errorFindings: audit.bySeverity.error,
      warningFindings: audit.bySeverity.warning,
      missingEthicalReasoning: audit.byType.missing_ethical_reasoning,
      missingEscalation: audit.byType.missing_escalation,
      qualityScore
    };
  }

  private generateSystemInsights(
    systemHealth: ObservatoryArtifact['systemHealth'],
    riskLevels: RiskLevels,
    baselineComparison: BaselineComparison
  ): SystemInsight[] {
    const insights: SystemInsight[] = [];

    if (systemHealth.overallScore < 60) {
      insights.push({
        category: 'system-health',
        insight: `Overall system health score (${systemHealth.overallScore}) is below 60`,
        priority: 'high',
        actionable: true,
        confidence: 'high'
      });
    }

    if (riskLevels.overall === 'high') {
      insights.push({
        category: 'risk',
        insight: 'System overall risk level is HIGH',
        priority: 'high',
        actionable: true,
        confidence: 'high'
      });

      const highSeverityRisks = riskLevels.riskIndicators.filter(r => r.severity === 'high');
      for (const risk of highSeverityRisks) {
        insights.push({
          category: 'risk',
          insight: `${risk.category}: ${risk.description}`,
          priority: 'high',
          actionable: true,
          confidence: 'high'
        });
      }
    }

    if (baselineComparison.aboveRange.length > 0) {
      insights.push({
        category: 'baseline',
        insight: `${baselineComparison.aboveRange.length} metrics are above expected baselines`,
        priority: 'medium',
        actionable: true,
        confidence: 'high'
      });
    }

    if (baselineComparison.belowRange.length > 0) {
      insights.push({
        category: 'baseline',
        insight: `${baselineComparison.belowRange.length} metrics are below expected baselines`,
        priority: 'low',
        actionable: true,
        confidence: 'high'
      });
    }

    if (systemHealth.ethicalHealth < 60) {
      insights.push({
        category: 'ethical',
        insight: `Ethical health score (${systemHealth.ethicalHealth}) is below 60`,
        priority: 'high',
        actionable: true,
        confidence: 'high'
      });
    }

    return insights;
  }

  private getObservationStart(): string {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  private validateArtifact(artifact: ObservatoryArtifact): void {
    const errors: string[] = [];

    if (!artifact.version) {
      errors.push('Missing version');
    }

    if (!artifact.generatedAt) {
      errors.push('Missing generatedAt');
    }

    if (!artifact.systemHealth) {
      errors.push('Missing systemHealth');
    }

    if (!artifact.baselineComparison) {
      errors.push('Missing baselineComparison');
    }

    if (!artifact.riskLevels) {
      errors.push('Missing riskLevels');
    }

    if (errors.length > 0) {
      console.error('Governance observatory artifact validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
  }

  private emitArtifact(artifact: ObservatoryArtifact): void {
    fs.writeFileSync(
      this.outputPath,
      JSON.stringify(artifact, null, 2),
      'utf-8'
    );
  }

  private printObservatory(artifact: ObservatoryArtifact): void {
    console.log('\n=== Governance Observatory ===\n');

    console.log('System Health Scores (0-100):');
    console.log(`  Overall:       ${artifact.systemHealth.overallScore}`);
    console.log(`  Governance:    ${artifact.systemHealth.governanceHealth}`);
    console.log(`  Ethical:       ${artifact.systemHealth.ethicalHealth}`);
    console.log(`  Capability:    ${artifact.systemHealth.capabilityHealth}`);
    console.log(`  Deliberation:  ${artifact.systemHealth.deliberationHealth}`);

    console.log('\nRisk Levels:');
    console.log(`  Overall:       ${artifact.riskLevels.overall.toUpperCase()}`);
    console.log(`  Governance:    ${artifact.riskLevels.governance.toUpperCase()}`);
    console.log(`  Ethical:       ${artifact.riskLevels.ethical.toUpperCase()}`);
    console.log(`  Capability:    ${artifact.riskLevels.capability.toUpperCase()}`);
    console.log(`  Deliberation:  ${artifact.riskLevels.deliberation.toUpperCase()}`);

    console.log('\nBaseline Comparison:');
    console.log(`  Within Range:  ${artifact.baselineComparison.withinRange.length}`);
    console.log(`  Below Range:   ${artifact.baselineComparison.belowRange.length}`);
    console.log(`  Above Range:   ${artifact.baselineComparison.aboveRange.length}`);

    if (artifact.baselineComparison.aboveRange.length > 0) {
      console.log('\nMetrics Above Baseline:');
      for (const metric of artifact.baselineComparison.aboveRange) {
        console.log(`  ${metric.metric}: ${metric.currentValue} (expected: ${metric.expectedMin}-${metric.expectedMax})`);
      }
    }

    if (artifact.riskLevels.riskIndicators.length > 0) {
      console.log('\nRisk Indicators:');
      for (const indicator of artifact.riskLevels.riskIndicators) {
        console.log(`  [${indicator.severity.toUpperCase()}] ${indicator.category}: ${indicator.risk}`);
      }
    }

    if (artifact.systemInsights.length > 0) {
      console.log('\nSystem Insights:');
      for (const insight of artifact.systemInsights) {
        console.log(`  [${insight.priority.toUpperCase()}] [${insight.category}] ${insight.insight}`);
      }
    }

    console.log('\n=== Observatory Complete ===\n');
    console.log('Artifact emitted to:', path.resolve(process.cwd(), this.outputPath));
  }

  private loadGovernanceSignals(path: string): GovernanceSignals | null {
    return this.loadJSON<GovernanceSignals>(path);
  }

  private loadDeliberationAudit(path: string): DeliberationAudit | null {
    return this.loadJSON<DeliberationAudit>(path);
  }

  private loadCapabilityLearning(path: string): CapabilityLearning | null {
    return this.loadJSON<CapabilityLearning>(path);
  }

  private loadGovernanceBaselines(path: string): GovernanceBaselines | null {
    return this.loadJSON<GovernanceBaselines>(path);
  }

  private loadDecisionSchema(path: string): DecisionSchema | null {
    return this.loadJSON<DecisionSchema>(path);
  }

  private loadJSON<T>(path: string): T | null {
    if (!fs.existsSync(path)) {
      return null;
    }

    try {
      const content = fs.readFileSync(path, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const observatory = new GovernanceObservatory(
    args[0],
    args[1],
    args[2],
    args[3],
    args[4],
    args[5]
  );

  observatory.observe();
}
