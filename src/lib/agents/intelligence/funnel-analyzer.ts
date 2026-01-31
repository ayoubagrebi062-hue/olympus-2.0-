/**
 * FUNNEL ANALYZER
 *
 * Scores ENTIRE FUNNELS, not just single pages.
 *
 * WHY THIS MATTERS:
 * - A great landing page with a weak checkout = lost sales
 * - Message disconnect between pages kills trust
 * - Emotional momentum must build across pages
 * - Each page should answer the question raised by the previous
 *
 * WHAT WE ANALYZE:
 * 1. Message Consistency - Do promises made get delivered?
 * 2. Emotional Flow - Does momentum build toward action?
 * 3. Trust Progression - Does trust build logically?
 * 4. Cognitive Load Balance - Is effort distributed well?
 * 5. Drop-off Risk - Where will people leave?
 * 6. Gap Detection - What's missing between stages?
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { ConversionIntelligenceEngine } from './engine';
import type {
  FunnelAnalysis,
  FunnelPage,
  FunnelStage,
  StageAnalysis,
  MessageConsistencyAnalysis,
  EmotionalFlowAnalysis,
  DropOffRisk,
  FunnelImprovement,
  EmotionalState,
} from './types';

// ============================================================================
// FUNNEL ANALYZER
// ============================================================================

export class FunnelAnalyzer {
  private engine: ConversionIntelligenceEngine;

  constructor(engine?: ConversionIntelligenceEngine) {
    this.engine = engine || new ConversionIntelligenceEngine();
  }

  /**
   * Analyze an entire funnel
   *
   * @throws Error if pages is empty or invalid
   */
  async analyzeFunnel(
    pages: { name: string; content: string; stage: FunnelStage }[]
  ): Promise<FunnelAnalysis> {
    // Input validation
    if (!pages || !Array.isArray(pages)) {
      throw new Error('Pages must be a non-null array');
    }

    if (pages.length === 0) {
      throw new Error('Pages array cannot be empty');
    }

    // Validate each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (!page.name || typeof page.name !== 'string') {
        throw new Error(`Page ${i}: name must be a non-empty string`);
      }
      if (page.content === null || page.content === undefined) {
        throw new Error(`Page ${i} (${page.name}): content cannot be null or undefined`);
      }
      if (!page.stage) {
        throw new Error(`Page ${i} (${page.name}): stage is required`);
      }
    }

    const id = `funnel-${Date.now()}`;

    // Analyze each page individually
    const analyzedPages: FunnelPage[] = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const analysis = await this.engine.analyze(page.content, {
        funnelStage: page.stage,
      });

      analyzedPages.push({
        id: `page-${i}`,
        name: page.name,
        stage: page.stage,
        content: page.content,
        analysis,
        previousPage: i > 0 ? `page-${i - 1}` : undefined,
        nextPage: i < pages.length - 1 ? `page-${i + 1}` : undefined,
      });
    }

    // Calculate stage analysis
    const stageAnalysis = this.analyzeStages(analyzedPages);

    // Analyze message consistency
    const messageConsistency = this.analyzeMessageConsistency(analyzedPages);

    // Analyze emotional flow
    const emotionalFlow = this.analyzeEmotionalFlow(analyzedPages);

    // Identify drop-off risks
    const dropOffRisks = this.identifyDropOffRisks(analyzedPages);

    // Generate funnel-wide improvements
    const funnelImprovements = this.generateFunnelImprovements(
      analyzedPages,
      messageConsistency,
      emotionalFlow,
      dropOffRisks
    );

    // Calculate overall funnel score
    const funnelScore = this.calculateFunnelScore(
      analyzedPages,
      messageConsistency,
      emotionalFlow,
      dropOffRisks
    );

    return {
      id,
      pages: analyzedPages,
      funnelScore,
      stageAnalysis,
      messageConsistency,
      emotionalFlow,
      dropOffRisks,
      funnelImprovements,
    };
  }

  // ==========================================================================
  // STAGE ANALYSIS
  // ==========================================================================

  private analyzeStages(pages: FunnelPage[]): Record<FunnelStage, StageAnalysis> {
    const stages: FunnelStage[] = [
      'awareness',
      'interest',
      'consideration',
      'intent',
      'purchase',
      'retention',
      'advocacy',
    ];
    const result: Partial<Record<FunnelStage, StageAnalysis>> = {};

    // Group pages by stage (properly typed initialization)
    const pagesByStage = stages.reduce<Record<FunnelStage, FunnelPage[]>>(
      (acc, stage) => {
        acc[stage] = pages.filter(p => p.stage === stage);
        return acc;
      },
      {} as Record<FunnelStage, FunnelPage[]>
    );

    // Find min/max scores
    let minScore = 100;
    let maxScore = 0;
    let weakestStage: FunnelStage = 'awareness';
    let strongestStage: FunnelStage = 'awareness';

    for (const stage of stages) {
      const stagePages = pagesByStage[stage];
      if (stagePages.length === 0) continue;

      const avgScore =
        stagePages.reduce((sum, p) => sum + p.analysis.totalScore, 0) / stagePages.length;

      if (avgScore < minScore) {
        minScore = avgScore;
        weakestStage = stage;
      }
      if (avgScore > maxScore) {
        maxScore = avgScore;
        strongestStage = stage;
      }
    }

    // Build analysis for each stage
    for (const stage of stages) {
      const stagePages = pagesByStage[stage];
      if (stagePages.length === 0) {
        result[stage] = {
          stage,
          score: 0,
          isWeakest: false,
          isStrongest: false,
          concerns: ['No content for this stage'],
          recommendations: ['Add content for this funnel stage'],
        };
        continue;
      }

      const avgScore =
        stagePages.reduce((sum, p) => sum + p.analysis.totalScore, 0) / stagePages.length;
      const concerns: string[] = [];
      const recommendations: string[] = [];

      // Collect concerns from individual pages
      for (const page of stagePages) {
        const criticalIssues = Object.values(page.analysis.dimensions)
          .flatMap(d => d.issues)
          .filter(i => i.severity === 'critical');

        for (const issue of criticalIssues) {
          concerns.push(`${page.name}: ${issue.description}`);
        }
      }

      // Stage-specific checks
      if (stage === 'awareness' && avgScore < 75) {
        concerns.push('Weak awareness stage reduces funnel entry');
        recommendations.push('Strengthen hooks and curiosity triggers');
      }

      if (stage === 'consideration' && avgScore < 70) {
        concerns.push('Weak consideration stage loses comparison shoppers');
        recommendations.push('Add comparison content, social proof');
      }

      if (stage === 'purchase' && avgScore < 80) {
        concerns.push('Weak purchase stage directly impacts revenue');
        recommendations.push('Simplify checkout, add trust signals, reduce friction');
      }

      result[stage] = {
        stage,
        score: avgScore,
        isWeakest: stage === weakestStage,
        isStrongest: stage === strongestStage,
        concerns,
        recommendations,
      };
    }

    return result as Record<FunnelStage, StageAnalysis>;
  }

  // ==========================================================================
  // MESSAGE CONSISTENCY
  // ==========================================================================

  private analyzeMessageConsistency(pages: FunnelPage[]): MessageConsistencyAnalysis {
    const keyMessages: MessageConsistencyAnalysis['keyMessages'] = [];
    const promiseDelivery: MessageConsistencyAnalysis['promiseDelivery'] = [];
    const disconnects: MessageConsistencyAnalysis['disconnects'] = [];

    // Extract key phrases from each page
    const pageKeyPhrases: Record<string, Set<string>> = {};

    for (const page of pages) {
      const phrases = this.extractKeyPhrases(page.content);
      pageKeyPhrases[page.id] = new Set(phrases);
    }

    // Track which phrases appear across pages
    const allPhrases = new Set<string>();
    for (const phrases of Object.values(pageKeyPhrases)) {
      phrases.forEach(p => allPhrases.add(p));
    }

    for (const phrase of allPhrases) {
      const appearsIn = Object.entries(pageKeyPhrases)
        .filter(([_, phrases]) => phrases.has(phrase))
        .map(([id, _]) => id);

      if (appearsIn.length > 1) {
        keyMessages.push({
          message: phrase,
          appearsIn,
          consistency: appearsIn.length / pages.length,
        });
      }
    }

    // Detect promises and check delivery
    for (const page of pages) {
      const promises = this.extractPromises(page.content);

      for (const promise of promises) {
        // Check if promise is delivered in subsequent pages
        const subsequentPages = pages.slice(pages.indexOf(page) + 1);
        let deliveredIn: string | undefined;

        for (const subPage of subsequentPages) {
          if (this.isPromiseDelivered(promise, subPage.content)) {
            deliveredIn = subPage.id;
            break;
          }
        }

        promiseDelivery.push({
          promise,
          madeIn: page.id,
          deliveredIn,
          isDelivered: !!deliveredIn,
        });
      }
    }

    // Detect disconnects between adjacent pages
    for (let i = 0; i < pages.length - 1; i++) {
      const current = pages[i];
      const next = pages[i + 1];

      const disconnect = this.detectDisconnect(current, next);
      if (disconnect) {
        disconnects.push({
          fromPage: current.id,
          toPage: next.id,
          issue: disconnect.issue,
          severity: disconnect.severity,
        });
      }
    }

    // Calculate consistency score
    const undeliveredPromises = promiseDelivery.filter(p => !p.isDelivered).length;
    const consistencyScore = Math.max(0, 100 - undeliveredPromises * 10 - disconnects.length * 15);

    return {
      score: consistencyScore,
      keyMessages,
      promiseDelivery,
      disconnects,
    };
  }

  private extractKeyPhrases(content: string): string[] {
    // Extract benefit-focused phrases
    const phrases: string[] = [];

    const benefitPatterns = [
      /you (will|can|get) [^.!?]+/gi,
      /helps? you [^.!?]+/gi,
      /save[s]? (time|money|effort) [^.!?]*/gi,
      /increase[s]? (your )?(sales|revenue|conversions?|traffic) [^.!?]*/gi,
    ];

    for (const pattern of benefitPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        phrases.push(...matches.map(m => m.toLowerCase().trim()));
      }
    }

    return [...new Set(phrases)]; // Remove duplicates
  }

  private extractPromises(content: string): string[] {
    const promises: string[] = [];

    const promisePatterns = [
      /(guarantee|promise|commit)[^.!?]+/gi,
      /you (will|'ll) (get|receive|have|see)[^.!?]+/gi,
      /we (will|'ll) (provide|deliver|give|send)[^.!?]+/gi,
    ];

    for (const pattern of promisePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        promises.push(...matches.map(m => m.trim()));
      }
    }

    return promises;
  }

  private isPromiseDelivered(promise: string, content: string): boolean {
    // Extract key nouns from promise
    const keyWords = promise
      .toLowerCase()
      .split(/\s+/)
      .filter(
        w => w.length > 4 && !['will', 'would', 'could', 'should', 'receive', 'provide'].includes(w)
      );

    // Check if key words appear in content
    const contentLower = content.toLowerCase();
    return keyWords.some(word => contentLower.includes(word));
  }

  private detectDisconnect(
    current: FunnelPage,
    next: FunnelPage
  ): { issue: string; severity: 'critical' | 'major' | 'minor' } | null {
    // Check for tonal disconnect
    const currentTone = this.detectTone(current.content);
    const nextTone = this.detectTone(next.content);

    if (currentTone === 'formal' && nextTone === 'casual') {
      return {
        issue: 'Tonal disconnect: formal → casual',
        severity: 'major',
      };
    }

    // Check for missing bridge
    const hasTransition = /(continue|next|now that|let's|ready to)/i.test(
      next.content.slice(0, 200)
    );
    if (!hasTransition && current.stage !== next.stage) {
      return {
        issue: 'No transition between stages',
        severity: 'minor',
      };
    }

    // Check for contradicting messages
    // (This would need more sophisticated NLP in production)

    return null;
  }

  private detectTone(content: string): 'formal' | 'casual' | 'neutral' {
    const formalIndicators = (
      content.match(/\b(therefore|furthermore|moreover|consequently|hereby)\b/gi) || []
    ).length;
    const casualIndicators = (
      content.match(/\b(hey|awesome|cool|yeah|gonna|wanna|super|totally)\b/gi) || []
    ).length;

    if (formalIndicators > casualIndicators + 2) return 'formal';
    if (casualIndicators > formalIndicators + 2) return 'casual';
    return 'neutral';
  }

  // ==========================================================================
  // EMOTIONAL FLOW
  // ==========================================================================

  private analyzeEmotionalFlow(pages: FunnelPage[]): EmotionalFlowAnalysis {
    const stateProgression: EmotionalFlowAnalysis['stateProgression'] = [];
    const momentumIssues: string[] = [];

    // Get primary emotion from each page
    for (const page of pages) {
      const emotionalDim = page.analysis.dimensions.emotionalJourney;

      // Extract primary emotion (from the analyzer's evidence or issues)
      const primaryEmotion = this.inferPrimaryEmotion(page.content);
      const intensity = emotionalDim.score / 100;

      stateProgression.push({
        stage: page.stage,
        primaryEmotion,
        intensity,
      });
    }

    // Check for proper arc
    const hasProperArc = this.validateEmotionalArc(stateProgression);

    // Detect momentum issues
    for (let i = 1; i < stateProgression.length; i++) {
      const prev = stateProgression[i - 1];
      const curr = stateProgression[i];

      // Check for intensity drops at critical moments
      if (curr.stage === 'intent' && curr.intensity < prev.intensity - 0.2) {
        momentumIssues.push('Emotional intensity drops before intent stage');
      }

      if (curr.stage === 'purchase' && curr.intensity < 0.6) {
        momentumIssues.push('Low emotional engagement at purchase stage');
      }

      // Check for wrong emotions at wrong times
      if (curr.stage === 'purchase' && curr.primaryEmotion === 'anxious') {
        momentumIssues.push('Anxiety at checkout - needs reassurance');
      }
    }

    return {
      stateProgression,
      hasProperArc,
      momentumIssues,
    };
  }

  private inferPrimaryEmotion(content: string): EmotionalState {
    const emotions: Record<EmotionalState, RegExp[]> = {
      curious: [/\?/, /discover/i, /secret/i, /hidden/i],
      skeptical: [/really\?/i, /too good/i, /skeptical/i],
      excited: [/amazing/i, /incredible/i, /!/g],
      anxious: [/worried/i, /concerned/i, /nervous/i],
      frustrated: [/frustrated/i, /tired of/i, /sick of/i],
      hopeful: [/imagine/i, /could be/i, /possible/i],
      fearful: [/miss out/i, /limited/i, /don't wait/i],
      confident: [/guarantee/i, /proven/i, /trusted/i],
    };

    let maxCount = 0;
    let primary: EmotionalState = 'curious';

    for (const [emotion, patterns] of Object.entries(emotions)) {
      let count = 0;
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) count += matches.length;
      }
      if (count > maxCount) {
        maxCount = count;
        primary = emotion as EmotionalState;
      }
    }

    return primary;
  }

  private validateEmotionalArc(progression: EmotionalFlowAnalysis['stateProgression']): boolean {
    // A proper arc should:
    // 1. Start with curiosity or frustration
    // 2. Build through hope/excitement
    // 3. End with confidence

    if (progression.length < 2) return false;

    const first = progression[0].primaryEmotion;
    const last = progression[progression.length - 1].primaryEmotion;

    const goodStarts: EmotionalState[] = ['curious', 'frustrated', 'anxious'];
    const goodEnds: EmotionalState[] = ['confident', 'excited', 'hopeful'];

    return goodStarts.includes(first) && goodEnds.includes(last);
  }

  // ==========================================================================
  // DROP-OFF RISK
  // ==========================================================================

  private identifyDropOffRisks(pages: FunnelPage[]): DropOffRisk[] {
    const risks: DropOffRisk[] = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const score = page.analysis.totalScore;

      // Low score = drop-off risk
      if (score < 60) {
        risks.push({
          location: page.id,
          riskLevel: 'high',
          reason: `Low conversion score (${score}/100)`,
          mitigation: 'Address critical issues in improvement plan',
          predictedDropOffRate: 60 + Math.round((60 - score) * 0.5),
        });
      } else if (score < 75) {
        risks.push({
          location: page.id,
          riskLevel: 'medium',
          reason: `Moderate conversion score (${score}/100)`,
          mitigation: 'Implement quick wins from improvement plan',
          predictedDropOffRate: 40 + Math.round((75 - score) * 0.5),
        });
      }

      // Stage-specific risks
      if (page.stage === 'awareness' && page.analysis.dimensions.narrativeFlow.score < 70) {
        risks.push({
          location: page.id,
          riskLevel: 'medium',
          reason: 'Weak hook at funnel entry point',
          mitigation: 'Strengthen opening with curiosity trigger',
          predictedDropOffRate: 50,
        });
      }

      if (page.stage === 'purchase') {
        const cogLoad = page.analysis.dimensions.cognitiveLoad.score;
        if (cogLoad < 70) {
          risks.push({
            location: page.id,
            riskLevel: 'high',
            reason: 'High cognitive load at checkout',
            mitigation: 'Simplify checkout process',
            predictedDropOffRate: 65,
          });
        }

        const trust = page.analysis.dimensions.trustArchitecture.score;
        if (trust < 70) {
          risks.push({
            location: page.id,
            riskLevel: 'high',
            reason: 'Insufficient trust signals at purchase',
            mitigation: 'Add guarantee, testimonials, security badges',
            predictedDropOffRate: 55,
          });
        }
      }

      // Transition risks
      if (i < pages.length - 1) {
        const next = pages[i + 1];
        const scoreDrop = page.analysis.totalScore - next.analysis.totalScore;

        if (scoreDrop > 15) {
          risks.push({
            location: `${page.id} → ${next.id}`,
            riskLevel: 'medium',
            reason: `Quality drops between pages (${scoreDrop} points)`,
            mitigation: 'Improve next page to maintain momentum',
            predictedDropOffRate: 30 + scoreDrop,
          });
        }
      }
    }

    // Sort by risk level
    const riskOrder = { high: 0, medium: 1, low: 2 };
    risks.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

    return risks;
  }

  // ==========================================================================
  // FUNNEL IMPROVEMENTS
  // ==========================================================================

  private generateFunnelImprovements(
    pages: FunnelPage[],
    messageConsistency: MessageConsistencyAnalysis,
    emotionalFlow: EmotionalFlowAnalysis,
    dropOffRisks: DropOffRisk[]
  ): FunnelImprovement[] {
    const improvements: FunnelImprovement[] = [];

    // Address undelivered promises
    for (const promise of messageConsistency.promiseDelivery.filter(p => !p.isDelivered)) {
      improvements.push({
        type: 'bridge_gap',
        description: `Deliver on promise: "${promise.promise}"`,
        from: promise.madeIn,
        predictedImpact: 'Reduces trust damage from broken promises',
      });
    }

    // Address disconnects
    for (const disconnect of messageConsistency.disconnects) {
      improvements.push({
        type: 'strengthen_transition',
        description: `Fix disconnect: ${disconnect.issue}`,
        from: disconnect.fromPage,
        to: disconnect.toPage,
        predictedImpact: 'Smoother journey increases completion rate',
      });
    }

    // Address emotional momentum issues
    for (const issue of emotionalFlow.momentumIssues) {
      improvements.push({
        type: 'bridge_gap',
        description: issue,
        predictedImpact: 'Better emotional momentum increases conversion',
      });
    }

    // Address high-risk drop-off points
    for (const risk of dropOffRisks.filter(r => r.riskLevel === 'high')) {
      improvements.push({
        type: 'strengthen_transition',
        description: `Address drop-off risk at ${risk.location}: ${risk.reason}`,
        predictedImpact: `Could reduce drop-off by ${risk.predictedDropOffRate * 0.3}%`,
      });
    }

    // Check for missing stages
    const presentStages = new Set(pages.map(p => p.stage));
    const criticalStages: FunnelStage[] = ['awareness', 'interest', 'intent', 'purchase'];

    for (const stage of criticalStages) {
      if (!presentStages.has(stage)) {
        improvements.push({
          type: 'add_page',
          description: `Add content for missing ${stage} stage`,
          predictedImpact: 'Complete funnel coverage increases conversions by 20-40%',
        });
      }
    }

    return improvements;
  }

  // ==========================================================================
  // FUNNEL SCORE
  // ==========================================================================

  private calculateFunnelScore(
    pages: FunnelPage[],
    messageConsistency: MessageConsistencyAnalysis,
    emotionalFlow: EmotionalFlowAnalysis,
    dropOffRisks: DropOffRisk[]
  ): number {
    // Base score: average of all pages
    const avgPageScore = pages.reduce((sum, p) => sum + p.analysis.totalScore, 0) / pages.length;

    // Adjust for funnel-level factors
    let adjustments = 0;

    // Message consistency bonus/penalty
    adjustments += (messageConsistency.score - 70) * 0.2;

    // Emotional arc bonus
    if (emotionalFlow.hasProperArc) {
      adjustments += 5;
    } else {
      adjustments -= 10;
    }

    // Momentum issues penalty
    adjustments -= emotionalFlow.momentumIssues.length * 3;

    // High-risk drop-offs penalty
    const highRisks = dropOffRisks.filter(r => r.riskLevel === 'high').length;
    adjustments -= highRisks * 5;

    return Math.max(0, Math.min(100, Math.round(avgPageScore + adjustments)));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { FunnelAnalysis, FunnelPage };
