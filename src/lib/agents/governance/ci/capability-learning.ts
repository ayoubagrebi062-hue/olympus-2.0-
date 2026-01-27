import * as fs from 'fs';
import * as path from 'path';

interface DecisionSchema {
  decisions: Array<{
    id: string;
    decisionClass: 'A' | 'B' | 'C' | 'UNKNOWN';
    action?: {
      taken?: boolean;
      actionType?: string;
      success?: boolean;
    };
    outcome?: {
      result?: 'success' | 'failure' | 'partial' | 'blocked' | 'pending';
      actualImpact?: string;
      unintendedConsequences?: string[];
      reversible?: boolean;
    };
    escalation?: {
      escalated?: boolean;
      humanDecision?: {
        decision?: string;
      };
    };
    ethicalOversight?: {
      vetoes?: Array<{
        overridden?: boolean;
      }>;
    };
    learning?: {
      lessons?: string[];
      patterns?: string[];
    };
  }>;
}

interface CapabilitySchema {
  capabilities?: {
    current?: Array<{
      id: string;
      name: string;
      riskLevel?: string;
      qualityMetrics?: {
        accuracy?: number;
        latency?: number;
        successRate?: number;
      };
      alertThresholds?: {
        failureRate?: number;
        ethicalVetos?: number;
        humanEscalations?: number;
      };
      category?: string;
      tierClass?: string;
    }>;
  };
}

interface CapabilityLearningSignal {
  capabilityId: string;
  capabilityName: string;
  totalDecisions: number;
  outcomes: {
    success: number;
    failure: number;
    partial: number;
    blocked: number;
    pending: number;
    unknown: number;
  };
  successRate: number;
  patterns: {
    repeatedFailures: number;
    repeatedPartial: number;
    frequentEscalations: number;
    frequentEthicalVetos: number;
    performanceDegradation: boolean;
    unexpectedBehaviors: string[];
  };
  learningRecommendations: LearningRecommendation[];
  riskIndicators: RiskIndicator[];
  confidence: 'high' | 'medium' | 'low';
  evidenceLevel: 'L1' | 'L2' | 'L3' | 'L4';
}

interface LearningRecommendation {
  type: 'improvement' | 'deprecation' | 'upgrade' | 'monitoring' | 'rollback' | 'investigation';
  priority: 'high' | 'medium' | 'low';
  description: string;
  rationale: string;
  suggestedActions: string[];
  confidence: 'high' | 'medium' | 'low';
  requiresHumanReview: boolean;
}

interface RiskIndicator {
  type: 'safety' | 'ethical' | 'performance' | 'reliability' | 'governance';
  severity: 'high' | 'medium' | 'low';
  description: string;
  threshold: number;
  currentValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface CapabilityLearningArtifact {
  version: string;
  generatedAt: string;
  learningWindow: {
    start: string;
    end: string;
  };
  summary: {
    totalCapabilities: number;
    capabilitiesWithSignals: number;
    totalRecommendations: number;
    byType: {
      improvement: number;
      deprecation: number;
      upgrade: number;
      monitoring: number;
      rollback: number;
      investigation: number;
    };
    byPriority: {
      high: number;
      medium: number;
      low: number;
    };
  };
  signals: CapabilityLearningSignal[];
  crossCapabilityPatterns: CrossCapabilityPattern[];
  systemLevelInsights: SystemLevelInsight[];
}

interface CrossCapabilityPattern {
  pattern: string;
  capabilities: string[];
  frequency: number;
  firstObserved: string;
  lastObserved: string;
  recommendation: string;
}

interface SystemLevelInsight {
  category: string;
  insight: string;
  confidence: 'high' | 'medium' | 'low';
  evidenceCount: number;
  actionable: boolean;
  suggestedActions: string[];
}

export class CapabilityLearningExtractor {
  private decisionSchema: DecisionSchema;
  private capabilitySchema: CapabilitySchema;
  private readonly outputPath: string;
  private readonly version: string = '1.0.0';

  constructor(
    decisionSchemaPath: string = 'contracts/decision-schema.json',
    capabilitySchemaPath: string = 'contracts/agent-capability-schema.json',
    outputPath?: string
  ) {
    this.decisionSchema = this.loadDecisionSchema(decisionSchemaPath);
    this.capabilitySchema = this.loadCapabilitySchema(capabilitySchemaPath);
    this.outputPath = outputPath || 'governance-capability-learning.json';
  }

  extract(): CapabilityLearningArtifact {
    const now = new Date().toISOString();

    const capabilityDecisions = this.mapDecisionsToCapabilities();
    const signals = this.generateLearningSignals(capabilityDecisions);
    const crossCapabilityPatterns = this.detectCrossCapabilityPatterns(
      capabilityDecisions,
      signals
    );
    const systemLevelInsights = this.generateSystemLevelInsights(signals, crossCapabilityPatterns);

    const artifact: CapabilityLearningArtifact = {
      version: this.version,
      generatedAt: now,
      learningWindow: {
        start: this.getEarliestTimestamp(),
        end: now,
      },
      summary: this.calculateSummary(signals),
      signals,
      crossCapabilityPatterns,
      systemLevelInsights,
    };

    this.validateArtifact(artifact);
    this.emitArtifact(artifact);

    this.printSummary(artifact);

    return artifact;
  }

  private mapDecisionsToCapabilities(): Map<string, Array<DecisionSchema['decisions'][number]>> {
    const capabilityDecisions = new Map<string, Array<DecisionSchema['decisions'][number]>>();

    const capabilities = this.capabilitySchema.capabilities?.current || [];

    for (const capability of capabilities) {
      capabilityDecisions.set(capability.id, []);

      for (const decision of this.decisionSchema.decisions) {
        if (this.decisionMatchesCapability(decision, capability.id)) {
          capabilityDecisions.get(capability.id)!.push(decision);
        }
      }
    }

    return capabilityDecisions;
  }

  private decisionMatchesCapability(
    decision: DecisionSchema['decisions'][number],
    capabilityId: string
  ): boolean {
    const decisionContent = JSON.stringify(decision);
    return decisionContent.includes(capabilityId);
  }

  private generateLearningSignals(
    capabilityDecisions: Map<string, Array<DecisionSchema['decisions'][number]>>
  ): CapabilityLearningSignal[] {
    const signals: CapabilityLearningSignal[] = [];

    for (const [capabilityId, decisions] of capabilityDecisions.entries()) {
      const capability = this.capabilitySchema.capabilities?.current?.find(
        c => c.id === capabilityId
      );

      if (!capability) {
        continue;
      }

      const signal = this.analyzeCapability(capabilityId, capability.name, decisions);
      signals.push(signal);
    }

    return signals;
  }

  private analyzeCapability(
    capabilityId: string,
    capabilityName: string,
    decisions: Array<DecisionSchema['decisions'][number]>
  ): CapabilityLearningSignal {
    const outcomes = {
      success: 0,
      failure: 0,
      partial: 0,
      blocked: 0,
      pending: 0,
      unknown: 0,
    };

    let repeatedFailures = 0;
    let repeatedPartial = 0;
    let frequentEscalations = 0;
    let frequentEthicalVetos = 0;
    const unexpectedBehaviors: string[] = [];

    for (const decision of decisions) {
      if (decision.outcome?.result) {
        outcomes[decision.outcome.result]++;

        if (decision.outcome.result === 'failure') {
          repeatedFailures++;
          if (
            decision.outcome.unintendedConsequences &&
            decision.outcome.unintendedConsequences.length > 0
          ) {
            unexpectedBehaviors.push(...decision.outcome.unintendedConsequences);
          }
        }

        if (decision.outcome.result === 'partial') {
          repeatedPartial++;
        }
      } else {
        outcomes.unknown++;
      }

      if (decision.escalation?.escalated) {
        frequentEscalations++;
      }

      if (decision.ethicalOversight?.vetoes && decision.ethicalOversight.vetoes.length > 0) {
        for (const veto of decision.ethicalOversight.vetoes) {
          if (!veto.overridden) {
            frequentEthicalVetos++;
          }
        }
      }

      if (decision.learning?.patterns) {
        unexpectedBehaviors.push(...decision.learning.patterns);
      }
    }

    const totalDecisions = decisions.length;
    const successRate = totalDecisions > 0 ? outcomes.success / totalDecisions : 0;

    const performanceDegradation = this.detectPerformanceDegradation(decisions);

    const patterns = {
      repeatedFailures,
      repeatedPartial,
      frequentEscalations,
      frequentEthicalVetos,
      performanceDegradation,
      unexpectedBehaviors: this.deduplicate(unexpectedBehaviors),
    };

    const learningRecommendations = this.generateRecommendations(
      capabilityId,
      capabilityName,
      decisions,
      outcomes,
      successRate,
      patterns
    );

    const riskIndicators = this.generateRiskIndicators(
      capabilityId,
      capabilityName,
      decisions,
      outcomes,
      successRate,
      patterns
    );

    const { confidence, evidenceLevel } = this.calculateConfidence(totalDecisions, outcomes);

    return {
      capabilityId,
      capabilityName,
      totalDecisions,
      outcomes,
      successRate,
      patterns,
      learningRecommendations,
      riskIndicators,
      confidence,
      evidenceLevel,
    };
  }

  private detectPerformanceDegradation(
    decisions: Array<DecisionSchema['decisions'][number]>
  ): boolean {
    if (decisions.length < 3) {
      return false;
    }

    const recentDecisions = decisions.slice(-3);
    const olderDecisions = decisions.slice(0, -3);

    const recentSuccessRate = this.calculateSuccessRate(recentDecisions);
    const olderSuccessRate = this.calculateSuccessRate(olderDecisions);

    return recentSuccessRate < olderSuccessRate * 0.9;
  }

  private calculateSuccessRate(decisions: Array<DecisionSchema['decisions'][number]>): number {
    const successes = decisions.filter(d => d.outcome?.result === 'success').length;
    const total = decisions.filter(d => d.outcome?.result !== undefined).length;
    return total > 0 ? successes / total : 0;
  }

  private generateRecommendations(
    capabilityId: string,
    capabilityName: string,
    decisions: Array<DecisionSchema['decisions'][number]>,
    outcomes: CapabilityLearningSignal['outcomes'],
    successRate: number,
    patterns: CapabilityLearningSignal['patterns']
  ): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = [];

    const capability = this.capabilitySchema.capabilities?.current?.find(
      c => c.id === capabilityId
    );

    if (!capability) {
      return recommendations;
    }

    const alertThresholds = capability.alertThresholds;
    const qualityMetrics = capability.qualityMetrics;

    if (patterns.repeatedFailures >= 3) {
      recommendations.push({
        type: 'improvement',
        priority: 'high',
        description: `Capability "${capabilityName}" has ${patterns.repeatedFailures} repeated failures`,
        rationale:
          'Pattern of repeated failures indicates potential design or implementation issues',
        suggestedActions: [
          'Investigate root causes of failures',
          'Review error handling and edge cases',
          'Consider capability refactoring',
          'Evaluate alternative implementations',
        ],
        confidence: patterns.repeatedFailures >= 5 ? 'high' : 'medium',
        requiresHumanReview: true,
      });

      if (successRate < 0.7) {
        recommendations.push({
          type: 'deprecation',
          priority: 'medium',
          description: `Capability "${capabilityName}" success rate (${(successRate * 100).toFixed(1)}%) below 70%`,
          rationale: 'Low success rate may indicate fundamental capability issues',
          suggestedActions: [
            'Evaluate capability for deprecation',
            'Consider replacement capabilities',
            'Review if capability is still needed',
            'Prepare migration plan if deprecated',
          ],
          confidence: 'medium',
          requiresHumanReview: true,
        });
      }
    }

    if (patterns.repeatedPartial >= 5) {
      recommendations.push({
        type: 'improvement',
        priority: 'medium',
        description: `Capability "${capabilityName}" has ${patterns.repeatedPartial} partial success outcomes`,
        rationale: 'Frequent partial successes indicate reliability issues or edge case problems',
        suggestedActions: [
          'Analyze partial success patterns',
          'Review edge case handling',
          'Improve error recovery mechanisms',
          'Consider adding preconditions validation',
        ],
        confidence: 'medium',
        requiresHumanReview: false,
      });
    }

    if (patterns.frequentEscalations >= 5) {
      recommendations.push({
        type: 'improvement',
        priority: 'high',
        description: `Capability "${capabilityName}" has ${patterns.frequentEscalations} human escalations`,
        rationale:
          'High escalation rate suggests capability may be operating beyond designed authority',
        suggestedActions: [
          'Review escalation reasons',
          'Evaluate if capability scope needs adjustment',
          'Consider expanding authority if appropriate',
          'Review agent decision-making for this capability',
        ],
        confidence: 'high',
        requiresHumanReview: true,
      });
    }

    if (
      alertThresholds?.ethicalVetos &&
      patterns.frequentEthicalVetos >= alertThresholds.ethicalVetos
    ) {
      recommendations.push({
        type: 'investigation',
        priority: 'high',
        description: `Capability "${capabilityName}" has ${patterns.frequentEthicalVetos} ethical vetos`,
        rationale: 'Frequent ethical vetos suggest capability may conflict with ethical guidelines',
        suggestedActions: [
          'Investigate veto reasons',
          'Review capability ethical constraints',
          'Consider capability ethical redesign',
          'Update ethical review criteria',
        ],
        confidence: 'high',
        requiresHumanReview: true,
      });
    }

    if (qualityMetrics?.successRate && successRate < qualityMetrics.successRate * 0.9) {
      recommendations.push({
        type: 'monitoring',
        priority: 'medium',
        description: `Capability "${capabilityName}" success rate (${(successRate * 100).toFixed(1)}%) below expected (${(qualityMetrics.successRate * 100).toFixed(1)}%)`,
        rationale: 'Performance degradation detected',
        suggestedActions: [
          'Increase monitoring frequency',
          'Investigate performance decline',
          'Review recent changes',
          'Evaluate if capability degradation is temporary or permanent',
        ],
        confidence: 'medium',
        requiresHumanReview: false,
      });
    }

    if (patterns.performanceDegradation) {
      recommendations.push({
        type: 'investigation',
        priority: 'high',
        description: `Capability "${capabilityName}" shows performance degradation`,
        rationale: 'Recent success rate is declining',
        suggestedActions: [
          'Investigate cause of performance degradation',
          'Review recent changes or incidents',
          'Check for external factors',
          'Consider rollback if degradation is severe',
        ],
        confidence: 'high',
        requiresHumanReview: true,
      });
    }

    if (patterns.unexpectedBehaviors.length > 0) {
      recommendations.push({
        type: 'investigation',
        priority: 'medium',
        description: `Capability "${capabilityName}" exhibits ${patterns.unexpectedBehaviors.length} unexpected behaviors`,
        rationale:
          'Unexpected behaviors may indicate unhandled edge cases or incomplete requirements',
        suggestedActions: [
          'Investigate each unexpected behavior',
          'Determine if behaviors are bugs or features',
          'Update capability documentation',
          'Add tests for unexpected scenarios',
        ],
        confidence: 'medium',
        requiresHumanReview: false,
      });
    }

    return recommendations;
  }

  private generateRiskIndicators(
    capabilityId: string,
    capabilityName: string,
    decisions: Array<DecisionSchema['decisions'][number]>,
    outcomes: CapabilityLearningSignal['outcomes'],
    successRate: number,
    patterns: CapabilityLearningSignal['patterns']
  ): RiskIndicator[] {
    const riskIndicators: RiskIndicator[] = [];

    const capability = this.capabilitySchema.capabilities?.current?.find(
      c => c.id === capabilityId
    );

    if (!capability) {
      return riskIndicators;
    }

    const alertThresholds = capability.alertThresholds;
    const qualityMetrics = capability.qualityMetrics;

    if (outcomes.failure > 0 && outcomes.success > 0) {
      const failureRate = outcomes.failure / (outcomes.failure + outcomes.success);
      const threshold = alertThresholds?.failureRate || 0.05;

      riskIndicators.push({
        type: 'reliability',
        severity: failureRate > threshold * 2 ? 'high' : failureRate > threshold ? 'medium' : 'low',
        description: `Failure rate: ${(failureRate * 100).toFixed(2)}%`,
        threshold,
        currentValue: failureRate,
        trend: patterns.repeatedFailures > 3 ? 'increasing' : 'stable',
      });
    }

    if (patterns.frequentEthicalVetos > 0) {
      const threshold = alertThresholds?.ethicalVetos || 3;
      riskIndicators.push({
        type: 'ethical',
        severity:
          patterns.frequentEthicalVetos > threshold * 2
            ? 'high'
            : patterns.frequentEthicalVetos > threshold
              ? 'medium'
              : 'low',
        description: `Ethical vetos: ${patterns.frequentEthicalVetos}`,
        threshold,
        currentValue: patterns.frequentEthicalVetos,
        trend: 'stable',
      });
    }

    if (patterns.frequentEscalations > 0) {
      const threshold = alertThresholds?.humanEscalations || 5;
      riskIndicators.push({
        type: 'governance',
        severity:
          patterns.frequentEscalations > threshold * 2
            ? 'high'
            : patterns.frequentEscalations > threshold
              ? 'medium'
              : 'low',
        description: `Human escalations: ${patterns.frequentEscalations}`,
        threshold,
        currentValue: patterns.frequentEscalations,
        trend: patterns.frequentEscalations > 3 ? 'increasing' : 'stable',
      });
    }

    if (successRate < 0.8) {
      riskIndicators.push({
        type: 'performance',
        severity: successRate < 0.5 ? 'high' : 'medium',
        description: `Success rate: ${(successRate * 100).toFixed(1)}%`,
        threshold: 0.8,
        currentValue: successRate,
        trend: 'stable',
      });
    }

    return riskIndicators;
  }

  private calculateConfidence(
    totalDecisions: number,
    outcomes: CapabilityLearningSignal['outcomes']
  ): {
    confidence: 'high' | 'medium' | 'low';
    evidenceLevel: 'L1' | 'L2' | 'L3' | 'L4';
  } {
    let confidence: 'high' | 'medium' | 'low';
    let evidenceLevel: 'L1' | 'L2' | 'L3' | 'L4';

    if (totalDecisions >= 10 && outcomes.success + outcomes.failure >= 8) {
      confidence = 'high';
      evidenceLevel = 'L1';
    } else if (totalDecisions >= 5 && outcomes.success + outcomes.failure >= 4) {
      confidence = 'medium';
      evidenceLevel = 'L2';
    } else if (totalDecisions >= 2) {
      confidence = 'low';
      evidenceLevel = 'L3';
    } else {
      confidence = 'low';
      evidenceLevel = 'L4';
    }

    return { confidence, evidenceLevel };
  }

  private detectCrossCapabilityPatterns(
    capabilityDecisions: Map<string, Array<DecisionSchema['decisions'][number]>>,
    signals: CapabilityLearningSignal[]
  ): CrossCapabilityPattern[] {
    const patterns: CrossCapabilityPattern[] = [];

    const allDecisions = Array.from(capabilityDecisions.values()).flat();

    const failureCapabilities = signals
      .filter(s => s.patterns.repeatedFailures >= 3)
      .map(s => s.capabilityId);
    if (failureCapabilities.length >= 2) {
      patterns.push({
        pattern: 'multiple-capability-failures',
        capabilities: failureCapabilities,
        frequency: failureCapabilities.reduce((sum, id) => {
          return sum + (capabilityDecisions.get(id)?.length || 0);
        }, 0),
        firstObserved: new Date().toISOString(),
        lastObserved: new Date().toISOString(),
        recommendation: 'System-level review of multiple capabilities showing failure patterns',
      });
    }

    const escalationCapabilities = signals
      .filter(s => s.patterns.frequentEscalations >= 5)
      .map(s => s.capabilityId);
    if (escalationCapabilities.length >= 2) {
      patterns.push({
        pattern: 'high-escalation-cluster',
        capabilities: escalationCapabilities,
        frequency: escalationCapabilities.reduce((sum, id) => {
          return sum + (capabilityDecisions.get(id)?.length || 0);
        }, 0),
        firstObserved: new Date().toISOString(),
        lastObserved: new Date().toISOString(),
        recommendation:
          'Review if capabilities are operating beyond designed authority or if agent training is needed',
      });
    }

    const ethicalVetoCapabilities = signals
      .filter(s => s.patterns.frequentEthicalVetos >= 2)
      .map(s => s.capabilityId);
    if (ethicalVetoCapabilities.length >= 2) {
      patterns.push({
        pattern: 'ethical-concern-cluster',
        capabilities: ethicalVetoCapabilities,
        frequency: ethicalVetoCapabilities.reduce((sum, id) => {
          return sum + (capabilityDecisions.get(id)?.length || 0);
        }, 0),
        firstObserved: new Date().toISOString(),
        lastObserved: new Date().toISOString(),
        recommendation: 'System-level ethical review of capability cluster with frequent vetos',
      });
    }

    return patterns;
  }

  private generateSystemLevelInsights(
    signals: CapabilityLearningSignal[],
    crossCapabilityPatterns: CrossCapabilityPattern[]
  ): SystemLevelInsight[] {
    const insights: SystemLevelInsight[] = [];

    const totalRecommendations = signals.reduce(
      (sum, s) => sum + s.learningRecommendations.length,
      0
    );
    const highPriorityRecommendations = signals.reduce((sum, s) => {
      return sum + s.learningRecommendations.filter(r => r.priority === 'high').length;
    }, 0);

    if (highPriorityRecommendations > 0) {
      insights.push({
        category: 'risk-management',
        insight: `System has ${highPriorityRecommendations} high-priority recommendations`,
        confidence: 'high',
        evidenceCount: highPriorityRecommendations,
        actionable: true,
        suggestedActions: [
          'Review all high-priority recommendations',
          'Prioritize based on risk and impact',
          'Assign owners for each recommendation',
          'Set review and action deadlines',
        ],
      });
    }

    const degradedCapabilities = signals.filter(s => s.patterns.performanceDegradation).length;
    if (degradedCapabilities > 0) {
      insights.push({
        category: 'performance',
        insight: `${degradedCapabilities} capabilities show performance degradation`,
        confidence: 'medium',
        evidenceCount: degradedCapabilities,
        actionable: true,
        suggestedActions: [
          'Investigate causes of performance degradation',
          'Check for common factors (infrastructure, dependencies)',
          'Review recent system changes',
          'Consider system-level rollback if degradation is severe',
        ],
      });
    }

    const averageSuccessRate =
      signals.length > 0 ? signals.reduce((sum, s) => sum + s.successRate, 0) / signals.length : 0;

    if (averageSuccessRate < 0.8) {
      insights.push({
        category: 'reliability',
        insight: `Average system success rate is ${(averageSuccessRate * 100).toFixed(1)}%`,
        confidence: 'medium',
        evidenceCount: signals.length,
        actionable: true,
        suggestedActions: [
          'Review lowest-performing capabilities',
          'Investigate root causes of system-wide reliability issues',
          'Consider system-level reliability improvements',
          'Review if quality metrics are realistic',
        ],
      });
    }

    if (crossCapabilityPatterns.length > 0) {
      insights.push({
        category: 'governance',
        insight: `Detected ${crossCapabilityPatterns.length} cross-capability patterns`,
        confidence: 'medium',
        evidenceCount: crossCapabilityPatterns.length,
        actionable: true,
        suggestedActions: [
          'Review each cross-capability pattern',
          'Investigate common causes',
          'Address patterns at system level rather than per-capability',
          'Update agent training based on findings',
        ],
      });
    }

    return insights;
  }

  private calculateSummary(
    signals: CapabilityLearningSignal[]
  ): CapabilityLearningArtifact['summary'] {
    const summary: CapabilityLearningArtifact['summary'] = {
      totalCapabilities: signals.length,
      capabilitiesWithSignals: signals.filter(s => s.learningRecommendations.length > 0).length,
      totalRecommendations: signals.reduce((sum, s) => sum + s.learningRecommendations.length, 0),
      byType: {
        improvement: 0,
        deprecation: 0,
        upgrade: 0,
        monitoring: 0,
        rollback: 0,
        investigation: 0,
      },
      byPriority: {
        high: 0,
        medium: 0,
        low: 0,
      },
    };

    for (const signal of signals) {
      for (const rec of signal.learningRecommendations) {
        summary.byType[rec.type]++;
        summary.byPriority[rec.priority]++;
      }
    }

    return summary;
  }

  private getEarliestTimestamp(): string {
    return new Date().toISOString();
  }

  private deduplicate<T>(array: T[]): T[] {
    return Array.from(new Set(array));
  }

  private validateArtifact(artifact: CapabilityLearningArtifact): void {
    const errors: string[] = [];

    if (!artifact.version) {
      errors.push('Missing version');
    }

    if (!artifact.generatedAt) {
      errors.push('Missing generatedAt');
    }

    if (!artifact.summary) {
      errors.push('Missing summary');
    }

    if (!Array.isArray(artifact.signals)) {
      errors.push('signals must be an array');
    }

    if (!Array.isArray(artifact.crossCapabilityPatterns)) {
      errors.push('crossCapabilityPatterns must be an array');
    }

    if (!Array.isArray(artifact.systemLevelInsights)) {
      errors.push('systemLevelInsights must be an array');
    }

    if (errors.length > 0) {
      console.error('Capability learning artifact validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
  }

  private emitArtifact(artifact: CapabilityLearningArtifact): void {
    const existingArtifact = this.loadExistingArtifact();
    const newArtifact = this.appendSignals(artifact, existingArtifact);

    fs.writeFileSync(this.outputPath, JSON.stringify(newArtifact, null, 2), 'utf-8');
  }

  private loadExistingArtifact(): CapabilityLearningArtifact | null {
    if (!fs.existsSync(this.outputPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.outputPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private appendSignals(
    newArtifact: CapabilityLearningArtifact,
    existingArtifact: CapabilityLearningArtifact | null
  ): CapabilityLearningArtifact {
    if (!existingArtifact) {
      return newArtifact;
    }

    return {
      ...newArtifact,
      learningWindow: {
        start: existingArtifact.learningWindow.start,
        end: newArtifact.learningWindow.end,
      },
      summary: newArtifact.summary,
      signals: newArtifact.signals,
      crossCapabilityPatterns: newArtifact.crossCapabilityPatterns,
      systemLevelInsights: newArtifact.systemLevelInsights,
    };
  }

  private printSummary(artifact: CapabilityLearningArtifact): void {
    console.log('\n=== Capability Learning Signal Summary ===\n');

    console.log('Summary:');
    console.log(`  Total Capabilities:      ${artifact.summary.totalCapabilities}`);
    console.log(`  Capabilities with Signals: ${artifact.summary.capabilitiesWithSignals}`);
    console.log(`  Total Recommendations:    ${artifact.summary.totalRecommendations}`);

    console.log('\nBy Type:');
    console.log(`  Improvement:      ${artifact.summary.byType.improvement}`);
    console.log(`  Deprecation:       ${artifact.summary.byType.deprecation}`);
    console.log(`  Upgrade:          ${artifact.summary.byType.upgrade}`);
    console.log(`  Monitoring:        ${artifact.summary.byType.monitoring}`);
    console.log(`  Rollback:          ${artifact.summary.byType.rollback}`);
    console.log(`  Investigation:     ${artifact.summary.byType.investigation}`);

    console.log('\nBy Priority:');
    console.log(`  High:    ${artifact.summary.byPriority.high}`);
    console.log(`  Medium:  ${artifact.summary.byPriority.medium}`);
    console.log(`  Low:     ${artifact.summary.byPriority.low}`);

    if (artifact.signals.length > 0) {
      const highPrioritySignals = artifact.signals.filter(s =>
        s.learningRecommendations.some(r => r.priority === 'high')
      );

      if (highPrioritySignals.length > 0) {
        console.log('\nHigh Priority Recommendations:');
        for (const signal of highPrioritySignals.slice(0, 5)) {
          const highRecs = signal.learningRecommendations.filter(r => r.priority === 'high');
          console.log(
            `  ${signal.capabilityName}: ${highRecs.length} high-priority recommendations`
          );
        }
      }
    }

    if (artifact.systemLevelInsights.length > 0) {
      console.log('\nSystem-Level Insights:');
      for (const insight of artifact.systemLevelInsights.slice(0, 5)) {
        console.log(`  [${insight.category}] ${insight.insight}`);
      }
    }

    console.log('\n=== Learning Signal Extraction Complete ===\n');
    console.log('Artifact emitted to:', path.resolve(process.cwd(), this.outputPath));
  }

  private loadDecisionSchema(decisionSchemaPath: string): DecisionSchema {
    if (!fs.existsSync(decisionSchemaPath)) {
      return { decisions: [] };
    }

    try {
      const content = fs.readFileSync(decisionSchemaPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { decisions: [] };
    }
  }

  private loadCapabilitySchema(capabilitySchemaPath: string): CapabilitySchema {
    if (!fs.existsSync(capabilitySchemaPath)) {
      return { capabilities: { current: [] } };
    }

    try {
      const content = fs.readFileSync(capabilitySchemaPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { capabilities: { current: [] } };
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const extractor = new CapabilityLearningExtractor(args[0], args[1], args[2]);

  extractor.extract();
}
