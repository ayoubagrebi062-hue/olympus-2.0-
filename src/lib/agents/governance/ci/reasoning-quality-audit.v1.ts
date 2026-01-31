import * as fs from 'fs';
import * as path from 'path';

interface DecisionSchema {
  decisions: Array<{
    id: string;
    decisionClass: 'A' | 'B' | 'C' | 'UNKNOWN';
    decisionContext?: {
      intent?: string;
      constraints?: string[];
      stakeholders?: string[];
    };
    evidence?: {
      level?: 'L1' | 'L2' | 'L3' | 'L4';
      sources?: Array<{
        type?: string;
        reliability?: string;
        freshness?: string;
      }>;
      gaps?: string[];
      contradictions?: string[];
    };
    reasoningArtifacts?: {
      decisionBrief?: {
        present?: boolean;
        summary?: string;
      };
      reasoningChain?: {
        present?: boolean;
        steps?: Array<{
          step?: number;
          description?: string;
          evidence?: string;
          confidence?: string;
          uncertainties?: string[];
        }>;
        conclusion?: string;
        overallConfidence?: number;
        keyAssumptions?: string[];
      };
      evidenceSummary?: {
        present?: boolean;
        evidencePresented?: string[];
        contradictionsIdentified?: string[];
        gapsIdentified?: string[];
        overallEvidenceLevel?: string;
      };
      ethicalAssessment?: {
        present?: boolean;
        principlesEvaluated?: Record<
          string,
          {
            rating?: number;
            explanation?: string;
          }
        >;
        stakeholderAnalysis?: Array<{
          stakeholder?: string;
          role?: string;
          impact?: string;
          fairnessAssessment?: string;
        }>;
        ethicalConflicts?: string[];
        conflictResolution?: string;
        ethicalVerdict?: string;
        ethicalJustification?: string;
      };
      actionRecommendation?: {
        present?: boolean;
        recommendedAction?: string;
        decisionClass?: string;
        confidenceLevel?: string;
        riskLevel?: string;
        reversibility?: string;
        expectedOutcome?: string;
        unintendedConsequences?: string[];
      };
    };
    uncertainty?: {
      declared?: boolean;
      type?: string;
      certaintyLevel?: string;
      resolutionMethod?: string;
    };
    outcome?: {
      result?: string;
    };
  }>;
}

interface DimensionScore {
  score: number;
  maxScore: number;
  factors: string[];
}

interface DecisionQualityAssessment {
  decisionId: string;
  decisionClass: string;
  totalScore: number;
  dimensionScores: {
    evidenceIntegrity: DimensionScore;
    logicalCoherence: DimensionScore;
    uncertaintyHonesty: DimensionScore;
    ethicalDepth: DimensionScore;
    actionJustificationQuality: DimensionScore;
  };
  flags: string[];
  notes: string[];
}

interface QualityPattern {
  pattern: string;
  frequency: number;
  firstSeen: string;
  lastSeen: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

interface ReasoningQualityArtifact {
  version: string;
  generatedAt: string;
  observationWindow: {
    start: string;
    end: string;
  };
  summary: {
    averageScore: number;
    byDecisionClass: {
      A: { count: number; averageScore: number };
      B: { count: number; averageScore: number };
      C: { count: number; averageScore: number };
      UNKNOWN: { count: number; averageScore: number };
    };
    lowQualityDecisions: Array<{ decisionId: string; score: number }>;
    highRiskPatterns: QualityPattern[];
  };
  decisions: DecisionQualityAssessment[];
  patterns: {
    commonWeaknesses: QualityPattern[];
    ethicalShallowness: QualityPattern[];
    overconfidenceSignals: QualityPattern[];
    reasoningGaps: QualityPattern[];
  };
}

export class ReasoningQualityAuditor {
  private decisionSchema: DecisionSchema;
  private readonly outputPath: string;
  private readonly version: string = '1.0.0';

  constructor(decisionSchemaPath: string = 'contracts/decision-schema.json', outputPath?: string) {
    this.decisionSchema = this.loadDecisionSchema(decisionSchemaPath);
    this.outputPath = outputPath || 'governance-reasoning-quality.json';
  }

  audit(): ReasoningQualityArtifact {
    const now = new Date().toISOString();
    const assessments = this.assessDecisions();
    const summary = this.calculateSummary(assessments);
    const patterns = this.analyzePatterns(assessments);

    const artifact: ReasoningQualityArtifact = {
      version: this.version,
      generatedAt: now,
      observationWindow: {
        start: this.getObservationStart(),
        end: now,
      },
      summary,
      decisions: assessments,
      patterns,
    };

    this.validateArtifact(artifact);
    this.emitArtifact(artifact);

    this.printSummary(artifact);

    return artifact;
  }

  private assessDecisions(): DecisionQualityAssessment[] {
    const assessments: DecisionQualityAssessment[] = [];

    for (const decision of this.decisionSchema.decisions) {
      const assessment = this.assessDecision(decision);
      assessments.push(assessment);
    }

    return assessments;
  }

  private assessDecision(decision: DecisionSchema['decisions'][number]): DecisionQualityAssessment {
    const evidenceIntegrity = this.scoreEvidenceIntegrity(decision);
    const logicalCoherence = this.scoreLogicalCoherence(decision);
    const uncertaintyHonesty = this.scoreUncertaintyHonesty(decision);
    const ethicalDepth = this.scoreEthicalDepth(decision);
    const actionJustificationQuality = this.scoreActionJustification(decision);

    const totalScore =
      evidenceIntegrity.score +
      logicalCoherence.score +
      uncertaintyHonesty.score +
      ethicalDepth.score +
      actionJustificationQuality.score;

    const flags = this.detectFlags(decision, {
      evidenceIntegrity,
      logicalCoherence,
      uncertaintyHonesty,
      ethicalDepth,
      actionJustificationQuality,
    });

    const notes = this.generateNotes(decision, {
      evidenceIntegrity,
      logicalCoherence,
      uncertaintyHonesty,
      ethicalDepth,
      actionJustificationQuality,
    });

    return {
      decisionId: decision.id,
      decisionClass: decision.decisionClass,
      totalScore,
      dimensionScores: {
        evidenceIntegrity,
        logicalCoherence,
        uncertaintyHonesty,
        ethicalDepth,
        actionJustificationQuality,
      },
      flags,
      notes,
    };
  }

  private scoreEvidenceIntegrity(decision: DecisionSchema['decisions'][number]): DimensionScore {
    const factors: string[] = [];
    let score = 0;

    const evidence = decision.evidence;
    const evidenceSummary = decision.reasoningArtifacts?.evidenceSummary;

    if (evidenceSummary?.present) {
      score += 5;
      factors.push('Evidence summary present');
    }

    if (evidence?.sources && evidence.sources.length > 0) {
      score += 5;
      factors.push(`${evidence.sources.length} evidence source(s)`);
    }

    if (evidence?.level === 'L1' || evidence?.level === 'L2') {
      score += 5;
      factors.push(`Evidence level ${evidence.level} (high quality)`);
    } else if (evidence?.level) {
      score += 2;
      factors.push(`Evidence level ${evidence.level} (lower quality)`);
    }

    const hasContradictions = evidence?.contradictions && evidence.contradictions.length > 0;
    const hasGaps = evidence?.gaps && evidence.gaps.length > 0;

    if (!hasContradictions) {
      score += 5;
      factors.push('No evidence contradictions');
    } else {
      factors.push(`${evidence?.contradictions?.length || 0} contradiction(s) identified`);
    }

    return { score: Math.min(20, score), maxScore: 20, factors };
  }

  private scoreLogicalCoherence(decision: DecisionSchema['decisions'][number]): DimensionScore {
    const factors: string[] = [];
    let score = 0;

    const reasoningChain = decision.reasoningArtifacts?.reasoningChain;

    if (reasoningChain?.present) {
      score += 5;
      factors.push('Reasoning chain present');
    }

    if (reasoningChain?.steps && reasoningChain.steps.length > 0) {
      score += 5;
      factors.push(`${reasoningChain.steps.length} reasoning step(s)`);
    }

    if (reasoningChain?.conclusion && reasoningChain.conclusion.length > 0) {
      score += 5;
      factors.push('Conclusion present');
    }

    const hasAssumptions =
      reasoningChain?.keyAssumptions && reasoningChain.keyAssumptions.length > 0;
    if (
      !hasAssumptions ||
      !reasoningChain?.keyAssumptions ||
      reasoningChain.keyAssumptions.length === 0
    ) {
      factors.push('No key assumptions stated');
    } else {
      score += 3;
      factors.push(`${reasoningChain.keyAssumptions.length} assumption(s) stated`);
    }

    const hasLogicalGaps = this.detectLogicalGaps(reasoningChain);
    if (!hasLogicalGaps) {
      score += 2;
      factors.push('No obvious logical gaps');
    } else {
      factors.push('Potential logical gaps detected');
    }

    return { score: Math.min(20, score), maxScore: 20, factors };
  }

  private detectLogicalGaps(reasoningChain?: {
    steps?: Array<{ evidence?: string; confidence?: string }>;
  }): boolean {
    if (!reasoningChain?.steps || reasoningChain.steps.length === 0) {
      return true;
    }

    const steps = reasoningChain.steps;
    for (let i = 0; i < steps.length - 1; i++) {
      const current = steps[i];
      const next = steps[i + 1];

      if (!current.evidence && !current.confidence) {
        return true;
      }

      if (!next.evidence && !next.confidence) {
        return true;
      }
    }

    return false;
  }

  private scoreUncertaintyHonesty(decision: DecisionSchema['decisions'][number]): DimensionScore {
    const factors: string[] = [];
    let score = 0;

    const uncertainty = decision.uncertainty;
    const evidence = decision.evidence;
    const reasoningChain = decision.reasoningArtifacts?.reasoningChain;

    const hasLowEvidence = !evidence?.level || evidence.level === 'L3' || evidence.level === 'L4';
    const hasUncertaintyInReasoning = reasoningChain?.steps?.some(
      (s: { uncertainties?: string[] }) => s.uncertainties && s.uncertainties.length > 0
    );

    if (hasLowEvidence && uncertainty?.declared) {
      score += 10;
      factors.push('Uncertainty appropriately declared for low evidence');
    } else if (hasLowEvidence && !uncertainty?.declared) {
      factors.push('Uncertainty not declared despite low evidence (overconfidence)');
    } else if (!hasLowEvidence && uncertainty?.declared) {
      score += 5;
      factors.push('Uncertainty declared despite sufficient evidence (caution)');
    } else {
      score += 5;
      factors.push('Confidence matches evidence level');
    }

    if (uncertainty?.resolutionMethod) {
      score += 5;
      factors.push('Uncertainty resolution method specified');
    }

    if (uncertainty?.certaintyLevel) {
      score += 5;
      factors.push(`Certainty level: ${uncertainty.certaintyLevel}`);
    }

    return { score: Math.min(20, score), maxScore: 20, factors };
  }

  private scoreEthicalDepth(decision: DecisionSchema['decisions'][number]): DimensionScore {
    const factors: string[] = [];
    let score = 0;

    const ethicalAssessment = decision.reasoningArtifacts?.ethicalAssessment;

    if (ethicalAssessment?.present) {
      score += 5;
      factors.push('Ethical assessment present');
    }

    if (decision.decisionClass === 'C' && !ethicalAssessment?.present) {
      factors.push('Class C decision missing ethical assessment (critical)');
    }

    if (ethicalAssessment?.principlesEvaluated) {
      const principleCount = Object.keys(ethicalAssessment.principlesEvaluated).length;
      if (principleCount >= 4) {
        score += 10;
        factors.push(`${principleCount} ethical principles evaluated`);
      } else if (principleCount >= 2) {
        score += 7;
        factors.push(`${principleCount} ethical principles evaluated`);
      } else if (principleCount > 0) {
        score += 4;
        factors.push(`${principleCount} ethical principle evaluated`);
      }
    }

    if (
      ethicalAssessment?.stakeholderAnalysis &&
      ethicalAssessment.stakeholderAnalysis.length > 0
    ) {
      score += 5;
      factors.push(`${ethicalAssessment.stakeholderAnalysis.length} stakeholder(s) analyzed`);
    }

    if (ethicalAssessment?.ethicalVerdict && ethicalAssessment.ethicalJustification) {
      score += 5;
      factors.push('Ethical verdict with justification');
    }

    const hasShallowEthics = this.detectShallowEthics(ethicalAssessment);
    if (hasShallowEthics) {
      factors.push('Ethical assessment appears shallow');
    }

    return { score: Math.min(20, score), maxScore: 20, factors };
  }

  private detectShallowEthics(ethicalAssessment?: {
    present?: boolean;
    principlesEvaluated?: Record<string, { explanation?: string }>;
  }): boolean {
    if (!ethicalAssessment?.present) {
      return false;
    }

    const principles = ethicalAssessment.principlesEvaluated;
    if (!principles || Object.keys(principles).length < 2) {
      return true;
    }

    for (const principle of Object.values(principles) as Array<{ explanation?: string }>) {
      if (!principle.explanation || principle.explanation.length < 10) {
        return true;
      }
    }

    return false;
  }

  private scoreActionJustification(decision: DecisionSchema['decisions'][number]): DimensionScore {
    const factors: string[] = [];
    let score = 0;

    const actionRec = decision.reasoningArtifacts?.actionRecommendation;

    if (actionRec?.present) {
      score += 5;
      factors.push('Action recommendation present');
    }

    if (actionRec?.recommendedAction && actionRec.recommendedAction.length > 0) {
      score += 5;
      factors.push('Recommended action specified');
    }

    if (actionRec?.expectedOutcome) {
      score += 5;
      factors.push('Expected outcome described');
    }

    if (actionRec?.riskLevel) {
      score += 5;
      factors.push(`Risk level: ${actionRec.riskLevel}`);
    }

    if (actionRec?.reversibility) {
      score += 5;
      factors.push(`Reversibility: ${actionRec.reversibility}`);
    }

    if (actionRec?.unintendedConsequences && actionRec.unintendedConsequences.length > 0) {
      score += 5;
      factors.push(
        `${actionRec.unintendedConsequences.length} unintended consequence(s) considered`
      );
    }

    if (actionRec?.confidenceLevel === 'L1' && !actionRec?.riskLevel) {
      factors.push('High confidence without risk assessment (overconfidence)');
    }

    return { score: Math.min(20, score), maxScore: 20, factors };
  }

  private detectFlags(
    decision: DecisionSchema['decisions'][number],
    scores: {
      evidenceIntegrity: DimensionScore;
      logicalCoherence: DimensionScore;
      uncertaintyHonesty: DimensionScore;
      ethicalDepth: DimensionScore;
      actionJustificationQuality: DimensionScore;
    }
  ): string[] {
    const flags: string[] = [];

    if (scores.evidenceIntegrity.score < 10) {
      flags.push('LOW_EVIDENCE_INTEGRITY');
    }

    if (scores.logicalCoherence.score < 10) {
      flags.push('LOGICAL_INCOHERENCE');
    }

    if (scores.uncertaintyHonesty.score < 10) {
      flags.push('UNCERTAINTY_DISHONESTY');
    }

    if (decision.decisionClass === 'C' && scores.ethicalDepth.score < 10) {
      flags.push('INSUFFICIENT_ETHICAL_DEPTH_CRITICAL');
    }

    if (
      decision.decisionClass === 'C' &&
      !decision.reasoningArtifacts?.ethicalAssessment?.present
    ) {
      flags.push('MISSING_ETHICAL_ASSESSMENT_CRITICAL');
    }

    if (decision.evidence?.level === 'L4' && !decision.uncertainty?.declared) {
      flags.push('OVERCONFIDENCE_SPECULATIVE');
    }

    if (decision.uncertainty?.declared && !decision.uncertainty?.resolutionMethod) {
      flags.push('UNCERTAINTY_WITHOUT_RESOLUTION');
    }

    if (
      !decision.reasoningArtifacts?.reasoningChain?.keyAssumptions ||
      decision.reasoningArtifacts?.reasoningChain?.keyAssumptions?.length === 0
    ) {
      flags.push('UNSTATED_ASSUMPTIONS');
    }

    if (scores.actionJustificationQuality.score < 10 && decision.decisionClass !== 'A') {
      flags.push('INSUFFICIENT_ACTION_JUSTIFICATION');
    }

    return flags;
  }

  private generateNotes(
    decision: DecisionSchema['decisions'][number],
    scores: {
      evidenceIntegrity: DimensionScore;
      logicalCoherence: DimensionScore;
      uncertaintyHonesty: DimensionScore;
      ethicalDepth: DimensionScore;
      actionJustificationQuality: DimensionScore;
    }
  ): string[] {
    const notes: string[] = [];

    if (scores.evidenceIntegrity.score < 12) {
      notes.push('Consider adding more evidence sources or addressing identified gaps');
    }

    if (scores.logicalCoherence.score < 12) {
      notes.push('Reasoning chain may benefit from clearer step-by-step progression');
    }

    if (scores.uncertaintyHonesty.score < 12) {
      notes.push('Review uncertainty declaration - ensure it reflects actual evidence quality');
    }

    if (decision.decisionClass === 'C' && scores.ethicalDepth.score < 15) {
      notes.push('Class C decisions should have comprehensive ethical assessment');
    }

    if (scores.actionJustificationQuality.score < 12 && decision.decisionClass !== 'A') {
      notes.push(
        'Action justification could be strengthened with risk assessment and unintended consequence analysis'
      );
    }

    return notes;
  }

  private calculateSummary(
    assessments: DecisionQualityAssessment[]
  ): ReasoningQualityArtifact['summary'] {
    const totalScores = assessments.map(a => a.totalScore);
    const averageScore =
      totalScores.length > 0
        ? totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length
        : 0;

    const byDecisionClass: ReasoningQualityArtifact['summary']['byDecisionClass'] = {
      A: { count: 0, averageScore: 0 },
      B: { count: 0, averageScore: 0 },
      C: { count: 0, averageScore: 0 },
      UNKNOWN: { count: 0, averageScore: 0 },
    };

    const classScores: Record<string, number[]> = {
      A: [],
      B: [],
      C: [],
      UNKNOWN: [],
    };

    for (const assessment of assessments) {
      byDecisionClass[assessment.decisionClass as keyof typeof byDecisionClass].count++;
      classScores[assessment.decisionClass].push(assessment.totalScore);
    }

    for (const [cls, scores] of Object.entries(classScores)) {
      if (scores.length > 0) {
        byDecisionClass[cls as keyof typeof byDecisionClass].averageScore =
          scores.reduce((sum, score) => sum + score, 0) / scores.length;
        byDecisionClass[cls as keyof typeof byDecisionClass].count = scores.length;
      }
    }

    const lowQualityDecisions = assessments
      .filter(a => a.totalScore < 60)
      .map(a => ({ decisionId: a.decisionId, score: a.totalScore }))
      .slice(0, 10);

    const highRiskPatterns = this.detectHighRiskPatterns(assessments);

    return {
      averageScore: Math.round(averageScore),
      byDecisionClass,
      lowQualityDecisions,
      highRiskPatterns,
    };
  }

  private detectHighRiskPatterns(assessments: DecisionQualityAssessment[]): QualityPattern[] {
    const patterns: QualityPattern[] = [];
    const now = new Date().toISOString();

    const overconfidenceFlags = assessments.filter(a =>
      a.flags.includes('OVERCONFIDENCE_SPECULATIVE')
    );

    if (overconfidenceFlags.length >= 2) {
      patterns.push({
        pattern: 'systematic_overconfidence',
        frequency: overconfidenceFlags.length,
        firstSeen: now,
        lastSeen: now,
        severity: 'high' as 'high' | 'medium' | 'low',
        description: 'Multiple decisions show overconfidence in speculative evidence',
      });
    }

    const missingEthicalCritical = assessments.filter(a =>
      a.flags.includes('MISSING_ETHICAL_ASSESSMENT_CRITICAL')
    );

    if (missingEthicalCritical.length >= 1) {
      patterns.push({
        pattern: 'missing_ethical_assessment_critical',
        frequency: missingEthicalCritical.length,
        firstSeen: now,
        lastSeen: now,
        severity: 'high' as 'high' | 'medium' | 'low',
        description: 'Class C decisions missing ethical assessment',
      });
    }

    const unstatedAssumptions = assessments.filter(a => a.flags.includes('UNSTATED_ASSUMPTIONS'));

    if (unstatedAssumptions.length >= 3) {
      patterns.push({
        pattern: 'systematic_unstated_assumptions',
        frequency: unstatedAssumptions.length,
        firstSeen: now,
        lastSeen: now,
        severity: 'medium' as 'high' | 'medium' | 'low',
        description: 'Multiple decisions have unstated assumptions',
      });
    }

    return patterns;
  }

  private analyzePatterns(
    assessments: DecisionQualityAssessment[]
  ): ReasoningQualityArtifact['patterns'] {
    const commonWeaknesses = this.extractCommonWeaknesses(assessments);
    const ethicalShallowness = this.extractEthicalShallowness(assessments);
    const overconfidenceSignals = this.extractOverconfidenceSignals(assessments);
    const reasoningGaps = this.extractReasoningGaps(assessments);

    return {
      commonWeaknesses,
      ethicalShallowness,
      overconfidenceSignals,
      reasoningGaps,
    };
  }

  private extractCommonWeaknesses(assessments: DecisionQualityAssessment[]): QualityPattern[] {
    const weaknessCounts = new Map<string, number>();

    for (const assessment of assessments) {
      for (const dimension of Object.values(assessment.dimensionScores)) {
        if (dimension.score < 10) {
          for (const factor of dimension.factors) {
            weaknessCounts.set(factor, (weaknessCounts.get(factor) || 0) + 1);
          }
        }
      }
    }

    return Array.from(weaknessCounts.entries())
      .filter(([_, count]) => count >= 2)
      .map(([pattern, frequency]) => ({
        pattern,
        frequency,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        severity: (frequency >= 5 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        description: `Common weakness: ${pattern}`,
      }))
      .slice(0, 10);
  }

  private extractEthicalShallowness(assessments: DecisionQualityAssessment[]): QualityPattern[] {
    const shallowCount = assessments.filter(a => {
      const hasShallowNote = a.notes.some(
        n => n.toLowerCase().includes('ethical') && n.toLowerCase().includes('comprehensive')
      );
      const lowEthicalScore = a.dimensionScores.ethicalDepth.score < 10;
      return hasShallowNote || lowEthicalScore;
    }).length;

    const patterns: QualityPattern[] = [];

    if (shallowCount > 0) {
      patterns.push({
        pattern: 'ethical_assessment_shallowness',
        frequency: shallowCount,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        severity: (shallowCount >= 3 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        description: 'Ethical assessments may be insufficiently deep',
      });
    }

    return patterns;
  }

  private extractOverconfidenceSignals(assessments: DecisionQualityAssessment[]): QualityPattern[] {
    const overconfidenceCount = assessments.filter(a =>
      a.flags.includes('OVERCONFIDENCE_SPECULATIVE')
    ).length;

    const patterns: QualityPattern[] = [];

    if (overconfidenceCount > 0) {
      patterns.push({
        pattern: 'overconfidence_in_speculative_evidence',
        frequency: overconfidenceCount,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        severity: (overconfidenceCount >= 3 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        description: 'Decisions show overconfidence with speculative evidence (L4)',
      });
    }

    return patterns;
  }

  private extractReasoningGaps(assessments: DecisionQualityAssessment[]): QualityPattern[] {
    const gapCount = assessments.filter(a => a.flags.includes('LOGICAL_INCOHERENCE')).length;

    const patterns: QualityPattern[] = [];

    if (gapCount > 0) {
      patterns.push({
        pattern: 'reasoning_chain_gaps',
        frequency: gapCount,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        severity: (gapCount >= 3 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        description: 'Reasoning chains contain logical gaps or incoherence',
      });
    }

    return patterns;
  }

  private getObservationStart(): string {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  private validateArtifact(artifact: ReasoningQualityArtifact): void {
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

    if (!Array.isArray(artifact.decisions)) {
      errors.push('decisions must be an array');
    }

    if (!artifact.patterns) {
      errors.push('Missing patterns');
    }

    if (errors.length > 0) {
      console.error('Reasoning quality artifact validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
  }

  private emitArtifact(artifact: ReasoningQualityArtifact): void {
    const existingArtifact = this.loadExistingArtifact();
    const newArtifact = this.appendAssessments(artifact, existingArtifact);

    fs.writeFileSync(this.outputPath, JSON.stringify(newArtifact, null, 2), 'utf-8');
  }

  private loadExistingArtifact(): ReasoningQualityArtifact | null {
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

  private appendAssessments(
    newArtifact: ReasoningQualityArtifact,
    existingArtifact: ReasoningQualityArtifact | null
  ): ReasoningQualityArtifact {
    if (!existingArtifact) {
      return newArtifact;
    }

    return {
      ...newArtifact,
      observationWindow: {
        start: existingArtifact.observationWindow.start,
        end: newArtifact.observationWindow.end,
      },
      summary: newArtifact.summary,
      decisions: newArtifact.decisions,
      patterns: newArtifact.patterns,
    };
  }

  private printSummary(artifact: ReasoningQualityArtifact): void {
    console.log('\n=== Reasoning Quality Audit Summary ===\n');

    console.log('Average Quality Score (0-100):');
    console.log(`  Overall:      ${artifact.summary.averageScore}`);

    console.log('\nBy Decision Class:');
    console.log(
      `  Class A:      ${artifact.summary.byDecisionClass.A.count} decisions, avg: ${artifact.summary.byDecisionClass.A.averageScore.toFixed(1)}`
    );
    console.log(
      `  Class B:      ${artifact.summary.byDecisionClass.B.count} decisions, avg: ${artifact.summary.byDecisionClass.B.averageScore.toFixed(1)}`
    );
    console.log(
      `  Class C:      ${artifact.summary.byDecisionClass.C.count} decisions, avg: ${artifact.summary.byDecisionClass.C.averageScore.toFixed(1)}`
    );
    console.log(
      `  Unknown:      ${artifact.summary.byDecisionClass.UNKNOWN.count} decisions, avg: ${artifact.summary.byDecisionClass.UNKNOWN.averageScore.toFixed(1)}`
    );

    if (artifact.summary.lowQualityDecisions.length > 0) {
      console.log('\nLow Quality Decisions (<60):');
      for (const decision of artifact.summary.lowQualityDecisions) {
        console.log(`  ${decision.decisionId}: ${decision.score}/100`);
      }
    }

    if (artifact.summary.highRiskPatterns.length > 0) {
      console.log('\nHigh Risk Patterns:');
      for (const pattern of artifact.summary.highRiskPatterns) {
        console.log(
          `  [${pattern.severity.toUpperCase()}] ${pattern.pattern}: ${pattern.description}`
        );
      }
    }

    if (artifact.patterns.commonWeaknesses.length > 0) {
      console.log('\nCommon Weaknesses:');
      for (const weakness of artifact.patterns.commonWeaknesses.slice(0, 5)) {
        console.log(`  ${weakness.pattern}: ${weakness.frequency} occurrences`);
      }
    }

    console.log('\n=== Reasoning Quality Audit Complete ===\n');
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
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const auditor = new ReasoningQualityAuditor(args[0], args[1]);

  auditor.audit();
}
